import { prisma } from '../../../prisma';

export interface TaskValidationParams {
  tenantId: string;
  employeeId: string;
  orgUnitId?: string | null;
  periodId?: string | null;
  primaryAxisId: string;
  taskSubtype?: string | null;
}

export interface TaskHeuristicParams {
  tenantId: string;
  employeeId: string;
  periodId?: string | null;
  primaryAxisId: string;
  weightScore?: number | null;
  evidenceFiles?: any;
  periodEndDate?: Date | null;
  taskCreatedAt?: Date | null;
}

export class TaskAxisValidationService {
  /**
   * Kiểm tra tính hợp lệ của Trục chính (Primary Axis) khi tạo hoặc cập nhật nhiệm vụ
   */
  static async validateTaskPrimaryAxis(params: TaskValidationParams) {
    const { tenantId, employeeId, primaryAxisId, taskSubtype } = params;

    // 1. Lấy thông tin nhân sự
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        roles: true,
        primaryOrgUnit: true,
      },
    });

    if (!employee) {
      throw new Error('Nhân sự không tồn tại trong hệ thống trường học hiện tại');
    }

    const orgUnitId = params.orgUnitId || employee.primaryOrgUnitId;

    // 2. Lấy thông tin Trục kết quả
    const axis = await prisma.kpiAxis.findFirst({
      where: { id: primaryAxisId, tenantId },
    });

    if (!axis) {
      throw new Error('Trục kết quả không tồn tại hoặc đã bị xóa');
    }

    if (!axis.isActive) {
      throw new Error(`Trục "${axis.name}" hiện đang bị tạm khóa (is_active = false)`);
    }

    // 3. Kiểm tra tính Áp dụng (is_applicable) của Trục tại Đơn vị + Kỳ (nếu có periodId và orgUnitId)
    if (orgUnitId && params.periodId) {
      const applicability = await prisma.unitAxisApplicability.findUnique({
        where: {
          unitId_periodId_axisId: {
            unitId: orgUnitId,
            periodId: params.periodId,
            axisId: axis.id,
          },
        },
      });

      if (applicability && !applicability.isApplicable) {
        throw new Error(
          `Trục "${axis.name}" đang được thiết lập "Không áp dụng" tại đơn vị trong kỳ này (Lý do: ${applicability.reason || 'N/A'}). Không thể gán làm Trục chính!`
        );
      }
    }

    // 4. Kiểm tra Role Scope
    const userRoleNames = employee.roles.map((r) => r.role.toString());
    const positionGroup = employee.positionGroup || (userRoleNames.includes('GIAO_VIEN') || userRoleNames.includes('TO_TRUONG') ? 'GV' : 'NV');
    const positionCode = (employee.positionCode || '').toLowerCase();
    const secondaryCodes: string[] = Array.isArray(employee.secondaryPositionCodes)
      ? (employee.secondaryPositionCodes as string[])
      : [];

    // 4.1 Quy tắc trục Chuyên môn (chỉ dành cho GV)
    if (axis.roleScope === 'GV_ONLY') {
      if (positionGroup !== 'GV' && !userRoleNames.includes('GIAO_VIEN') && !userRoleNames.includes('TO_TRUONG') && !userRoleNames.includes('PHO_HIEU_TRUONG')) {
        throw new Error(`Trục "${axis.name}" chỉ áp dụng cho Giáo viên. Nhân viên khối văn phòng không được chọn trục này làm Trục chính.`);
      }
    }

    // 4.2 Quy tắc trục KTTC (Kế toán tài chính) - RESTRICTED
    if (axis.roleScope === 'RESTRICTED') {
      const allowedCodes: string[] = Array.isArray(axis.restrictedPositionCodes)
        ? (axis.restrictedPositionCodes as string[])
        : ['ke_toan', 'thu_quy'];

      const isAllowed =
        allowedCodes.includes(positionCode) ||
        secondaryCodes.some((code) => allowedCodes.includes(code)) ||
        employee.title?.toLowerCase().includes('kế toán') ||
        employee.title?.toLowerCase().includes('thủ quỹ');

      if (!isAllowed) {
        throw new Error(
          `Trục "${axis.name}" chỉ dành riêng cho nhân sự Kế toán / Thủ quỹ. Các nội dung quản lý bán trú, dạy thêm, tăng cường của Ban Giám hiệu vui lòng ghi nhận tại mục "Giao việc" thay vì tạo KPI cá nhân.`
        );
      }
    }

    // 4.3 Quy tắc Subtype bắt buộc (Trục Chuyên môn: GV bộ môn / GVCN)
    if (axis.requiresSubtype) {
      if (!taskSubtype || taskSubtype.trim() === '') {
        throw new Error(`Đối với trục "${axis.name}", bắt buộc phải phân loại loại nhiệm vụ con: "Giáo viên bộ môn" (gv_bo_mon) hoặc "Giáo viên chủ nhiệm" (gvcn).`);
      }
    }

    return { isValid: true, axis, employee };
  }

  /**
   * Phát hiện & sinh các cảnh báo heuristic chống "nhiệm vụ hình thức"
   */
  static async detectTaskWarningFlags(params: TaskHeuristicParams): Promise<string[]> {
    const flags: string[] = [];
    const { tenantId, employeeId, periodId, primaryAxisId, weightScore, evidenceFiles, periodEndDate, taskCreatedAt } = params;

    // 1. Cảnh báo tạo sát ngày chốt kỳ
    if (periodEndDate) {
      const createdDate = taskCreatedAt ? new Date(taskCreatedAt) : new Date();
      const endDate = new Date(periodEndDate);
      const diffDays = (endDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);

      if (diffDays <= 3 && diffDays >= 0) {
        flags.push('Tạo rất sát ngày kết thúc kỳ đánh giá (dưới 3 ngày)');
      } else if (diffDays < 0) {
        flags.push('Tạo sau ngày kết thúc kỳ đánh giá');
      }
    }

    // 2. Cảnh báo không có minh chứng đính kèm
    const hasEvidence = Array.isArray(evidenceFiles) && evidenceFiles.length > 0;
    if (!hasEvidence) {
      flags.push('Chưa đính kèm tệp minh chứng sản phẩm');
    }

    // 3. Cảnh báo trọng số điểm quá nhỏ so với thang 70
    if (typeof weightScore === 'number' && weightScore < 1.0) {
      flags.push(`Trọng số điểm nhỏ (${weightScore} điểm)`);
    }

    // 4. Cảnh báo lạm dụng trục "Khác" nếu tỷ lệ vượt ngưỡng cấu hình (ví dụ >20%)
    if (periodId) {
      const axis = await prisma.kpiAxis.findUnique({ where: { id: primaryAxisId } });
      if (axis && axis.code === 'khac' && axis.warnOveruseThresholdPct) {
        const threshold = axis.warnOveruseThresholdPct;

        // Tính tổng điểm các task của cá nhân trong kỳ này
        const userTasks = await prisma.task.findMany({
          where: {
            tenantId,
            periodId,
            assignments: {
              some: { userId: employeeId },
            },
          },
          select: {
            primaryAxisId: true,
            weightScore: true,
          },
        });

        let totalScore = 0;
        let khacScore = (weightScore || 0);

        for (const t of userTasks) {
          const score = t.weightScore || 1.0;
          totalScore += score;
          if (t.primaryAxisId === primaryAxisId) {
            khacScore += score;
          }
        }

        if (totalScore > 0) {
          const khacPct = Math.round((khacScore / (totalScore + (weightScore || 0))) * 100);
          if (khacPct > threshold) {
            flags.push(`Tỷ lệ điểm gán trục "Khác" (${khacPct}%) vượt ngưỡng cảnh báo ${threshold}%`);
          }
        }
      }
    }

    return flags;
  }
}
