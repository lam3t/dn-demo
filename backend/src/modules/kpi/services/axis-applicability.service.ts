import { prisma } from '../../../prisma';
import { DEFAULT_KPI_AXES } from '../kpi.constants';

export class AxisApplicabilityService {
  /**
   * Khởi tạo hoặc cập nhật 9 trục mặc định cho Tenant
   */
  static async seedDefaultAxesForTenant(tenantId: string) {
    for (const item of DEFAULT_KPI_AXES) {
      await prisma.kpiAxis.upsert({
        where: {
          tenantId_code: {
            tenantId,
            code: item.code,
          },
        },
        update: {
          name: item.name,
          description: item.description,
          displayOrder: item.displayOrder,
          roleScope: item.roleScope,
          restrictedPositionCodes: (item.restrictedPositionCodes as any) || undefined,
          requiresSubtype: item.requiresSubtype,
          subtypeOptions: (item.subtypeOptions as any) || undefined,
          warnOveruseThresholdPct: item.warnOveruseThresholdPct || null,
          isActive: true,
        },
        create: {
          tenantId,
          code: item.code,
          name: item.name,
          description: item.description,
          displayOrder: item.displayOrder,
          roleScope: item.roleScope,
          restrictedPositionCodes: (item.restrictedPositionCodes as any) || undefined,
          requiresSubtype: item.requiresSubtype,
          subtypeOptions: (item.subtypeOptions as any) || undefined,
          warnOveruseThresholdPct: item.warnOveruseThresholdPct || null,
          isActive: true,
        },
      });
    }

    return prisma.kpiAxis.findMany({
      where: { tenantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Lấy danh sách toàn bộ các trục của Tenant
   */
  static async getTenantAxes(tenantId: string) {
    let axes = await prisma.kpiAxis.findMany({
      where: { tenantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    if (axes.length === 0) {
      axes = await this.seedDefaultAxesForTenant(tenantId);
    }

    return axes;
  }

  /**
   * Lấy cấu hình Áp dụng trục cho Đơn vị + Kỳ
   */
  static async getUnitApplicability(tenantId: string, unitId: string, periodId: string) {
    const axes = await this.getTenantAxes(tenantId);

    // Lấy các bản ghi đã lưu
    const existing = await prisma.unitAxisApplicability.findMany({
      where: {
        tenantId,
        unitId,
        periodId,
      },
      include: {
        axis: true,
      },
    });

    const existingMap = new Map<string, typeof existing[0]>();
    for (const item of existing) {
      existingMap.set(item.axisId, item);
    }

    // Ghép với danh sách trục đầy đủ (nếu chưa có thì mặc định isApplicable = true)
    return axes.map((axis) => {
      const saved = existingMap.get(axis.id);
      return {
        axisId: axis.id,
        axisCode: axis.code,
        axisName: axis.name,
        description: axis.description,
        roleScope: axis.roleScope,
        restrictedPositionCodes: axis.restrictedPositionCodes,
        requiresSubtype: axis.requiresSubtype,
        subtypeOptions: axis.subtypeOptions,
        displayOrder: axis.displayOrder,
        isApplicable: saved ? saved.isApplicable : true,
        reason: saved ? saved.reason : null,
        applicabilityId: saved ? saved.id : null,
      };
    });
  }

  /**
   * Cập nhật trạng thái Áp dụng / Không áp dụng trục cho Đơn vị + Kỳ
   */
  static async setUnitApplicability(
    tenantId: string,
    unitId: string,
    periodId: string,
    axisId: string,
    isApplicable: boolean,
    reason?: string
  ) {
    if (!isApplicable && (!reason || reason.trim() === '')) {
      throw new Error('Vui lòng nhập lý do giải trình khi chuyển trạng thái sang Không áp dụng');
    }

    // Nếu chuyển sang Không áp dụng, kiểm tra xem có task nào đang dùng trục này làm primary_axis hay không
    if (!isApplicable) {
      const activeTasksCount = await prisma.task.count({
        where: {
          tenantId,
          periodId,
          orgUnitId: unitId,
          primaryAxisId: axisId,
        },
      });

      if (activeTasksCount > 0) {
        throw new Error(
          `Không thể tắt áp dụng trục này: Đang có ${activeTasksCount} công việc trong đơn vị sử dụng trục này làm Trục chính. Vui lòng chuyển trục cho các công việc trước!`
        );
      }
    }

    const record = await prisma.unitAxisApplicability.upsert({
      where: {
        unitId_periodId_axisId: {
          unitId,
          periodId,
          axisId,
        },
      },
      update: {
        isApplicable,
        reason: isApplicable ? null : reason?.trim(),
      },
      create: {
        tenantId,
        unitId,
        periodId,
        axisId,
        isApplicable,
        reason: isApplicable ? null : reason?.trim(),
      },
    });

    return record;
  }
}
