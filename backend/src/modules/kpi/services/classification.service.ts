import { prisma } from '../../../prisma';

export interface ProposedClassificationResult {
  suggestedClassification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh';
  classificationLabel: string;
  classificationColor: string;
  scoreFinal: number;
  hasUncompletedTasks: boolean;
  completionRatePct: number;
  exceededTasksCount: number;
  exceededTasksPct: number;
  leadershipQuotaWarning?: string | null;
  requiresExtraConditionsConfirmation: boolean;
}

export class ClassificationService {
  /**
   * Tính hạng xếp loại đề xuất dựa trên điểm số và các điều kiện kèm theo
   */
  static async evaluateClassification(
    tenantId: string,
    employeeId: string,
    periodId: string,
    scoreFinal: number
  ): Promise<ProposedClassificationResult> {
    // 1. Lấy thông tin nhân sự và nhóm đối tượng
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        roles: true,
        primaryOrgUnit: true,
      },
    });

    if (!employee) {
      throw new Error('Nhân sự không tồn tại');
    }

    // 2. Kiểm tra xem nhân sự có thuộc Trường hợp đặc biệt (Special Case) được miễn trừ hay không
    const specialCase = await prisma.kpiSpecialCase.findFirst({
      where: {
        tenantId,
        employeeId,
        periodId,
      },
    });

    // 3. Lấy danh sách task của nhân sự trong kỳ
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        periodId,
        assignments: {
          some: { userId: employeeId },
        },
      },
    });

    const totalTasks = tasks.length;
    let completedTasks = 0;
    let exceededTasks = 0; // Hoàn thành vượt mức (rating = 'XUAT_SAC' hoặc có duyệt thưởng)

    for (const t of tasks) {
      const isCompleted = t.status === 'HOAN_THANH' || t.status === 'XAC_NHAN' || t.status === 'DONG';
      if (isCompleted) {
        completedTasks++;
        if (t.evaluationRating === 'XUAT_SAC') {
          exceededTasks++;
        }
      }
    }

    const completionRatePct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
    const exceededTasksPct = totalTasks > 0 ? Math.round((exceededTasks / totalTasks) * 100) : 0;
    const hasUncompletedTasks = completedTasks < totalTasks && totalTasks > 0;

    let suggestedClassification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh' = 'hoan_thanh';

    // Áp dụng quy tắc: Hoàn thành < 100% nhiệm vụ trong quý => Mặc định Không hoàn thành (trừ khi có special case)
    if (hasUncompletedTasks && !specialCase) {
      suggestedClassification = 'khong_hoan_thanh';
    } else if (scoreFinal >= 90) {
      suggestedClassification = 'xuat_sac';
    } else if (scoreFinal >= 70) {
      suggestedClassification = 'tot';
    } else if (scoreFinal >= 50) {
      suggestedClassification = 'hoan_thanh';
    } else {
      suggestedClassification = 'khong_hoan_thanh';
    }

    // 4. Kiểm tra trần 20% Xuất sắc cho nhóm cán bộ lãnh đạo/quản lý (Nhóm 1)
    let leadershipQuotaWarning: string | null = null;
    const isLeadership =
      employee.roles.some((r) => ['HIEU_TRUONG', 'PHO_HIEU_TRUONG', 'TO_TRUONG'].includes(r.role.toString())) ||
      employee.title?.toLowerCase().includes('hiệu trưởng') ||
      employee.title?.toLowerCase().includes('tổ trưởng');

    if (isLeadership && suggestedClassification === 'xuat_sac') {
      const quotaCheck = await this.checkLeadershipExcellentQuota(tenantId, employee.primaryOrgUnitId || '', periodId, employeeId);
      if (!quotaCheck.isWithinQuota) {
        leadershipQuotaWarning = `Đơn vị đã có ${quotaCheck.currentExcellentCount}/${quotaCheck.maxAllowed} cán bộ quản lý xếp loại Xuất sắc (vượt trần 20% theo quy định).`;
      }
    }

    const labels = {
      xuat_sac: 'Hoàn thành xuất sắc nhiệm vụ',
      tot: 'Hoàn thành tốt nhiệm vụ',
      hoan_thanh: 'Hoàn thành nhiệm vụ',
      khong_hoan_thanh: 'Không hoàn thành nhiệm vụ',
    };

    const colors = {
      xuat_sac: '#16A34A', // Green
      tot: '#2563EB',      // Blue
      hoan_thanh: '#D97706', // Amber
      khong_hoan_thanh: '#DC2626', // Red
    };

    return {
      suggestedClassification,
      classificationLabel: labels[suggestedClassification],
      classificationColor: colors[suggestedClassification],
      scoreFinal,
      hasUncompletedTasks,
      completionRatePct,
      exceededTasksCount: exceededTasks,
      exceededTasksPct,
      leadershipQuotaWarning,
      requiresExtraConditionsConfirmation: suggestedClassification === 'xuat_sac' || suggestedClassification === 'tot',
    };
  }

  /**
   * Kiểm tra trần 20% Xuất sắc cho nhóm cán bộ lãnh đạo tại đơn vị
   */
  static async checkLeadershipExcellentQuota(
    tenantId: string,
    orgUnitId: string,
    periodId: string,
    currentUserId?: string
  ) {
    // Đếm tổng số cán bộ quản lý (trừ Hiệu trưởng là người đứng đầu do cấp trên chấm)
    const leadershipUsers = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        primaryOrgUnitId: orgUnitId || undefined,
        roles: {
          some: {
            role: { in: ['PHO_HIEU_TRUONG', 'TO_TRUONG'] },
          },
        },
      },
      select: { id: true },
    });

    const totalLeaders = leadershipUsers.length;
    // Làm tròn tỷ lệ từ 0.5 trở lên làm tròn lên 1 (e.g. 3 * 0.2 = 0.6 => 1)
    const rawQuota = totalLeaders * 0.2;
    const maxAllowed = Math.max(1, Math.round(rawQuota));

    // Đếm số cán bộ quản lý đã được xếp loại Xuất sắc trong kỳ
    const currentExcellentScores = await prisma.kpiScoreRecord.count({
      where: {
        tenantId,
        periodId,
        employeeId: {
          in: leadershipUsers.map((u) => u.id).filter((id) => id !== currentUserId),
        },
        classification: 'xuat_sac',
        status: 'approved',
      },
    });

    const currentExcellentCount = currentExcellentScores + 1; // Tính cả người đang xét
    const isWithinQuota = currentExcellentCount <= maxAllowed;

    return {
      totalLeaders,
      maxAllowed,
      currentExcellentCount,
      isWithinQuota,
    };
  }
}
