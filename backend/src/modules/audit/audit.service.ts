import prisma from '../../prisma';

export class AuditService {
  /**
   * Ghi log hành động quản trị trong tenant (AdminAuditLog)
   */
  static async logAdminAction(params: {
    tenantId: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    detail?: string;
  }): Promise<void> {
    try {
      await prisma.adminAuditLog.create({
        data: {
          tenantId: params.tenantId,
          actorUserId: params.actorUserId,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId,
          detail: params.detail,
        },
      });
    } catch (e) {
      console.error('AuditLog Error (AdminAction):', e);
    }
  }

  /**
   * Ghi log hành động nền tảng SaaS / Cross-Tenant (SystemAuditLog)
   */
  static async logSystemAction(params: {
    actorUserId: string;
    action: string;
    targetTenantId?: string;
    detail?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await prisma.systemAuditLog.create({
        data: {
          actorUserId: params.actorUserId,
          action: params.action,
          targetTenantId: params.targetTenantId,
          detail: params.detail,
          ipAddress: params.ipAddress,
        },
      });
    } catch (e) {
      console.error('AuditLog Error (SystemAction):', e);
    }
  }

  /**
   * Lấy danh sách nhật ký quản trị của một trường
   */
  static async getTenantAuditLogs(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      action?: string;
      actorUserId?: string;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options.action) where.action = options.action;
    if (options.actorUserId) where.actorUserId = options.actorUserId;

    const [items, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: {
            select: { id: true, fullName: true, email: true, phone: true, title: true },
          },
        },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
