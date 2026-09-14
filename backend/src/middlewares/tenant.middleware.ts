import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import prisma from '../prisma';

/**
 * TenantResolutionMiddleware:
 * Đảm bảo tenantId được trích xuất an toàn từ JWT (req.user),
 * kiểm tra trạng thái hoạt động của Tenant (ACTIVE / SUSPENDED)
 * và thiết lập req.tenantId cho request context.
 */
export const resolveTenantContext = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    // Nếu là System Admin, cấp quyền bypass phạm vi tenant
    if (req.user.isSystemAdmin) {
      req.tenantId = 'system_bypass';
      return next();
    }

    const tenantId = req.user.tenantId;
    if (!tenantId) {
      // Trường hợp tài khoản cũ chưa có tenantId (fallback an toàn theo schoolId)
      if (req.user.schoolId) {
        const school = await prisma.school.findUnique({
          where: { id: req.user.schoolId },
          select: { tenantId: true },
        });
        if (school && school.tenantId) {
          req.tenantId = school.tenantId;
        }
      }
    } else {
      req.tenantId = tenantId;
    }

    // Kiểm tra trạng thái của Tenant nếu có tenantId
    if (req.tenantId && req.tenantId !== 'system_bypass') {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId },
        select: { status: true, name: true },
      });

      if (!tenant) {
        throw new AppError('Không tìm thấy thông tin đơn vị trường học (Tenant).', 404);
      }

      if (tenant.status === 'SUSPENDED') {
        throw new AppError(
          'Trường của bạn hiện đang bị tạm khóa hoặc hết hạn dịch vụ. Vui lòng liên hệ Quản trị viên hệ thống.',
          403
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Helper thực thi query trong Transaction với PostgreSQL Row-Level Security
 * Gọi SET LOCAL app.current_tenant = '<tenantId>' trước khi chạy câu lệnh
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    if (tenantId) {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`);
    }
    return await fn(tx as typeof prisma);
  });
}
