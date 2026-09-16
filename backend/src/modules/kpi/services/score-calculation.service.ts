import { prisma } from '../../../prisma';

export interface AxisBreakdownItem {
  axisId: string;
  axisCode: string;
  axisName: string;
  displayOrder: number;
  totalTasks: number;
  completedTasks: number;
  totalWeightScore: number;
  achievedScore: number;
  percentageOfTaskScore: number;
  subtypes?: {
    gv_bo_mon?: { totalTasks: number; achievedScore: number; weightScore: number };
    gvcn?: { totalTasks: number; achievedScore: number; weightScore: number };
  };
}

export interface ScoreCalculationResult {
  employeeId: string;
  employeeName: string;
  periodId: string;
  periodName: string;
  scoreGeneral: number;       // 0 - 30 điểm
  scoreTask: number;          // 0 - 70 điểm
  scoreBonusRaw: number;      // Tổng điểm thưởng trước trần
  scoreBonusCapped: number;   // Điểm thưởng sau khi áp trần min(raw, 7, 10%*base)
  scoreFinal: number;         // Tổng điểm cuối cùng (capped tại 100)
  tasksBreakdown: any[];
  axisBreakdown: AxisBreakdownItem[];
  bonusDetails: any[];
}

export class ScoreCalculationService {
  /**
   * Tính toán bảng điểm KPI chi tiết cho nhân sự theo kỳ
   */
  static async calculateEmployeeKpi(
    tenantId: string,
    employeeId: string,
    periodId: string,
    customScoreGeneral?: number
  ): Promise<ScoreCalculationResult> {
    // 1. Lấy thông tin nhân sự & kỳ đánh giá
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, tenantId },
      include: { primaryOrgUnit: true },
    });

    if (!employee) {
      throw new Error('Nhân sự không tồn tại trong trường học');
    }

    const period = await prisma.evaluationPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) {
      throw new Error('Kỳ đánh giá không tồn tại');
    }

    // Xác định điểm Phần A: nếu có customScoreGeneral thì dùng, nếu không thì lấy từ KpiScoreRecord (hoặc mặc định 30)
    let scoreGeneral = 30;
    if (typeof customScoreGeneral === 'number' && !isNaN(customScoreGeneral)) {
      scoreGeneral = Math.min(30, Math.max(0, customScoreGeneral));
    } else {
      const existingScoreRecord = await prisma.kpiScoreRecord.findUnique({
        where: {
          tenantId_employeeId_periodId: {
            tenantId,
            employeeId,
            periodId,
          },
        },
      });
      if (existingScoreRecord && typeof existingScoreRecord.scoreGeneral === 'number') {
        scoreGeneral = Math.min(30, Math.max(0, existingScoreRecord.scoreGeneral));
      }
    }

    // 2. Lấy danh sách các trục của tenant
    const axes = await prisma.kpiAxis.findMany({
      where: { tenantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    const axisMap = new Map<string, typeof axes[0]>();
    for (const a of axes) {
      axisMap.set(a.id, a);
      axisMap.set(a.code, a);
    }

    // 3. Lấy tất cả các task của nhân sự trong kỳ đánh giá
    // Tự động gom các task có periodId tương ứng HOẶC nếu periodId null nhưng có primaryAxis và thời gian (dueDate / completedAt / createdAt) thuộc phạm vi của kỳ
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        OR: [
          { periodId },
          {
            periodId: null,
            primaryAxisId: { not: null },
            OR: [
              { dueDate: { gte: period.startDate, lte: period.endDate } },
              { completedAt: { gte: period.startDate, lte: period.endDate } },
              { createdAt: { gte: period.startDate, lte: period.endDate } },
            ],
          },
        ],
        assignments: {
          some: { userId: employeeId },
        },
      },
      include: {
        primaryAxis: true,
        secondaryAxisTags: {
          include: { axis: true },
        },
        attachments: true,
        bonusProposals: {
          where: { proposedById: employeeId },
        },
      },
    });

    // 4. Tính toán điểm từng task và phân bổ theo trục chính
    let totalAchievedTaskScore = 0;
    let scoreBonusRaw = 0;
    const bonusDetails: any[] = [];
    const taskDetails: any[] = [];
    const axisScoreMap = new Map<
      string,
      {
        totalTasks: number;
        completedTasks: number;
        totalWeightScore: number;
        achievedScore: number;
        subtypes: {
          gv_bo_mon: { totalTasks: number; achievedScore: number; weightScore: number };
          gvcn: { totalTasks: number; achievedScore: number; weightScore: number };
        };
      }
    >();

    // Khởi tạo map cho các trục
    for (const a of axes) {
      axisScoreMap.set(a.id, {
        totalTasks: 0,
        completedTasks: 0,
        totalWeightScore: 0,
        achievedScore: 0,
        subtypes: {
          gv_bo_mon: { totalTasks: 0, achievedScore: 0, weightScore: 0 },
          gvcn: { totalTasks: 0, achievedScore: 0, weightScore: 0 },
        },
      });
    }

    for (const t of tasks) {
      const weight = typeof t.weightScore === 'number' ? t.weightScore : 1.0;
      const isCompleted = t.status === 'HOAN_THANH' || t.status === 'XAC_NHAN' || t.status === 'DONG' || (t.progressPercent || 0) >= 100;
      const progressRatio = isCompleted ? 1.0 : (t.progressPercent || 0) / 100;
      const achievedScore = Math.round(weight * progressRatio * 100) / 100;

      totalAchievedTaskScore += achievedScore;

      const primaryAxisId = t.primaryAxisId;
      if (primaryAxisId && axisScoreMap.has(primaryAxisId)) {
        const axisStat = axisScoreMap.get(primaryAxisId)!;
        axisStat.totalTasks += 1;
        if (isCompleted) axisStat.completedTasks += 1;
        axisStat.totalWeightScore += weight;
        axisStat.achievedScore += achievedScore;

        if (t.taskSubtype === 'gv_bo_mon') {
          axisStat.subtypes.gv_bo_mon.totalTasks += 1;
          axisStat.subtypes.gv_bo_mon.weightScore += weight;
          axisStat.subtypes.gv_bo_mon.achievedScore += achievedScore;
        } else if (t.taskSubtype === 'gvcn') {
          axisStat.subtypes.gvcn.totalTasks += 1;
          axisStat.subtypes.gvcn.weightScore += weight;
          axisStat.subtypes.gvcn.achievedScore += achievedScore;
        }
      }

      // Đếm số lượng minh chứng
      const evidenceList = Array.isArray(t.evidenceFiles) ? t.evidenceFiles : [];
      const totalEvidenceCount = evidenceList.length + (t.attachments?.length || 0);
      const hasEvidence = totalEvidenceCount > 0;

      // Tính tự động Điểm thưởng (+5%) cho từng công việc hoàn thành đủ điều kiện
      let taskBonusScore = 0;
      let isTaskBonusApplied = false;

      // Kiểm tra nếu có đề xuất thưởng đã duyệt thủ công
      const approvedProposal = t.bonusProposals.find((bp) => bp.status === 'approved');
      if (approvedProposal) {
        const bonusPct = approvedProposal.proposedBonusPct || 5.0;
        taskBonusScore = Math.round(achievedScore * (bonusPct / 100) * 100) / 100;
        isTaskBonusApplied = true;
        scoreBonusRaw += taskBonusScore;
        bonusDetails.push({
          proposalId: approvedProposal.id,
          taskId: t.id,
          taskTitle: t.title,
          reasonType: approvedProposal.reasonType,
          reasonDescription: approvedProposal.reasonDescription || 'Đề xuất điểm thưởng đã duyệt',
          proposedBonusPct: bonusPct,
          bonusScore: taskBonusScore,
          approvedAt: approvedProposal.approvedAt,
          isAuto: false,
        });
      } else if (isCompleted && achievedScore > 0) {
        // Tự động tính thưởng nếu công việc hoàn thành đạt chất lượng:
        // 1. Hoàn thành trước hạn hoặc đúng hạn
        // 2. Hoặc có sản phẩm minh chứng đính kèm
        // 3. Hoặc có đánh giá cao
        const isBeforeOrOnDeadline = !!(t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate));
        const isHighRating = (t as any).evaluationRating === 'XUAT_SAC' || (t as any).evaluationRating === 'TOT';
        const isPriorityHigh = t.priority === 'KHAN_CAP' || t.priority === 'CAO';

        if (isBeforeOrOnDeadline || hasEvidence || isHighRating || isPriorityHigh) {
          const autoBonusPct = 5.0; // Thưởng 5% theo chuẩn Sở GD&ĐT
          taskBonusScore = Math.round(achievedScore * (autoBonusPct / 100) * 100) / 100;
          isTaskBonusApplied = true;
          scoreBonusRaw += taskBonusScore;

          let reason = 'Hoàn thành nhiệm vụ đạt chất lượng có sản phẩm minh chứng';
          if (isBeforeOrOnDeadline) reason = 'Hoàn thành trước hoặc đúng thời hạn giao việc';
          if (isHighRating) reason = 'Được đánh giá xếp loại xuất sắc';

          bonusDetails.push({
            taskId: t.id,
            taskTitle: t.title,
            reasonType: 'tu_dong_tinh',
            reasonDescription: reason,
            proposedBonusPct: autoBonusPct,
            bonusScore: taskBonusScore,
            approvedAt: t.completedAt || new Date(),
            isAuto: true,
          });
        }
      }

      taskDetails.push({
        id: t.id,
        code: t.code,
        title: t.title,
        status: t.status,
        priority: t.priority,
        progressPercent: t.progressPercent,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        weightScore: weight,
        achievedScore,
        bonusScore: taskBonusScore,
        hasBonus: isTaskBonusApplied,
        hasEvidence,
        evidenceCount: totalEvidenceCount,
        primaryAxisId: t.primaryAxisId,
        primaryAxisName: t.primaryAxis?.name,
        primaryAxisCode: t.primaryAxis?.code,
        taskSubtype: t.taskSubtype,
        secondaryAxes: t.secondaryAxisTags.map((tag) => ({ id: tag.axis.id, name: tag.axis.name, code: tag.axis.code })),
        warningFlags: t.warningFlags || [],
        bonusProposal: t.bonusProposals[0] || null,
      });
    }

    // Điểm kết quả nhiệm vụ tối đa 70 điểm
    const scoreTask = Math.min(70, Math.round(totalAchievedTaskScore * 100) / 100);

    // Áp trần điểm thưởng:
    // Trần 1: Tối đa 7 điểm tuyệt đối
    // Trần 2: Tối đa 10% tổng điểm cơ sở (scoreGeneral + scoreTask)
    const baseScore = scoreGeneral + scoreTask;
    const maxBonusFromBase = Math.round(baseScore * 0.1 * 100) / 100;
    const scoreBonusCapped = Math.min(scoreBonusRaw, 7.0, maxBonusFromBase);

    // 6. Tổng điểm cuối cùng (trần 100 điểm)
    const scoreFinal = Math.min(100, Math.round((scoreGeneral + scoreTask + scoreBonusCapped) * 100) / 100);

    // 7. Xây dựng danh sách breakdown theo trục kết quả
    const axisBreakdown: AxisBreakdownItem[] = axes
      .map((axis) => {
        const stat = axisScoreMap.get(axis.id) || {
          totalTasks: 0,
          completedTasks: 0,
          totalWeightScore: 0,
          achievedScore: 0,
          subtypes: {
            gv_bo_mon: { totalTasks: 0, achievedScore: 0, weightScore: 0 },
            gvcn: { totalTasks: 0, achievedScore: 0, weightScore: 0 },
          },
        };

        const pct = scoreTask > 0 ? Math.round((stat.achievedScore / scoreTask) * 1000) / 10 : 0;

        return {
          axisId: axis.id,
          axisCode: axis.code,
          axisName: axis.name,
          displayOrder: axis.displayOrder,
          totalTasks: stat.totalTasks,
          completedTasks: stat.completedTasks,
          totalWeightScore: Math.round(stat.totalWeightScore * 100) / 100,
          achievedScore: Math.round(stat.achievedScore * 100) / 100,
          percentageOfTaskScore: pct,
          subtypes: axis.code === 'chuyen_mon' ? stat.subtypes : undefined,
        };
      })
      .filter((item) => item.totalTasks > 0); // Chỉ giữ lại các trục phát sinh nhiệm vụ trong kỳ

    return {
      employeeId,
      employeeName: employee.fullName,
      periodId,
      periodName: period.name,
      scoreGeneral: Math.min(30, Math.max(0, scoreGeneral)),
      scoreTask,
      scoreBonusRaw: Math.round(scoreBonusRaw * 100) / 100,
      scoreBonusCapped: Math.round(scoreBonusCapped * 100) / 100,
      scoreFinal,
      tasksBreakdown: taskDetails,
      axisBreakdown,
      bonusDetails,
    };
  }
}
