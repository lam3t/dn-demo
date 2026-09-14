import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { TokenPayload, AuthUser } from './auth.types';
import { getTenantUserPermissions, hasPermission } from '../../utils/permission.util';

const JWT_SECRET = process.env.JWT_SECRET || 'tn_edu_super_secret_jwt_access_key_2026';

/**
 * Middleware bắt buộc phải đăng nhập (Xác thực JWT Access Token)
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục thao tác.', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Phiên đăng nhập đã hết hạn (Token expired). Vui lòng làm mới token.', 401);
      }
      throw new AppError('Mã xác thực không hợp lệ.', 401);
    }

    // Tải thông tin người dùng từ DB để đảm bảo trạng thái tài khoản mới nhất
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: true,
        school: true,
        roles: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Tài khoản người dùng không tồn tại hoặc đã bị vô hiệu hóa.', 401);
    }

    // Kiểm tra trạng thái Tenant (nếu không phải System Admin)
    if (!user.isSystemAdmin && user.tenant && user.tenant.status === 'SUSPENDED') {
      throw new AppError(
        'Trường của bạn hiện đang bị tạm khóa hoặc hết hạn dịch vụ. Vui lòng liên hệ Quản trị viên hệ thống.',
        403
      );
    }

    const tenantId = user.tenantId || user.school?.tenantId || null;

    // Lấy tập quyền động theo Tenant RBAC
    const permissions = await getTenantUserPermissions(user.id, tenantId, user.isSystemAdmin);

    req.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      title: user.title,
      avatarUrl: user.avatarUrl,
      schoolId: user.schoolId || undefined,
      tenantId: tenantId || undefined,
      tenantName: user.tenant?.name || undefined,
      tenantCode: user.tenant?.code || undefined,
      isSystemAdmin: user.isSystemAdmin,
      primaryLocationId: user.primaryLocationId,
      primaryOrgUnitId: user.primaryOrgUnitId,
      roles: user.roles.map((r) => ({
        role: r.role,
        roleId: r.roleId,
        scopeLocationId: r.scopeLocationId,
        scopeOrgUnitId: r.scopeOrgUnitId,
      })),
      permissions,
    };

    req.tenantId = user.isSystemAdmin ? 'system_bypass' : (tenantId || undefined);

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra vai trò System Admin (requireSystemAdmin)
 */
export const requireSystemAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Yêu cầu xác thực trước khi kiểm tra quyền System Admin.', 401));
  }

  const isSysAdmin =
    req.user.isSystemAdmin || req.user.roles.some((r) => r.role === Role.SYSTEM_ADMIN);

  if (!isSysAdmin) {
    return next(
      new AppError('Quyền truy cập bị từ chối. Chức năng này chỉ dành cho Quản trị viên nền tảng (System Admin).', 403)
    );
  }

  next();
};

/**
 * Middleware kiểm tra quyền động (Permission-Based Guard theo Tenant RBAC Matrix)
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Yêu cầu xác thực trước khi kiểm tra quyền.', 401));
    }

    if (req.user.isSystemAdmin) {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    const hasPerm = hasPermission(userPermissions, requiredPermissions, req.user.isSystemAdmin);

    if (!hasPerm) {
      return next(
        new AppError(
          `Bạn không có quyền thực hiện chức năng này. Yêu cầu quyền: [${requiredPermissions.join(', ')}]`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Middleware kiểm tra vai trò người dùng (requireRole - tương thích ngược)
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Yêu cầu xác thực trước khi kiểm tra quyền.', 401));
    }

    // System Admin có toàn quyền bypass
    if (req.user.isSystemAdmin) {
      return next();
    }

    const userRoles = req.user.roles.map((r) => r.role);

    const hasPermission = allowedRoles.some((role) => userRoles.includes(role));
    if (!hasPermission) {
      return next(
        new AppError('Bạn không có quyền thực hiện chức năng này.', 403)
      );
    }

    next();
  };
};

/**
 * Middleware kiểm tra phạm vi dữ liệu theo Điểm trường & Tổ chức (requireScope)
 */
export const requireScope = (options?: { checkLocation?: boolean; checkOrgUnit?: boolean }) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Yêu cầu xác thực trước khi kiểm tra phạm vi.', 401));
    }

    if (req.user.isSystemAdmin) {
      return next();
    }

    const userRoles = req.user.roles;
    const userRoleTypes = userRoles.map((r) => r.role);

    // ADMIN và HIEU_TRUONG có quyền xem toàn trường (toàn bộ điểm trường và tổ)
    if (userRoleTypes.includes(Role.ADMIN) || userRoleTypes.includes(Role.HIEU_TRUONG)) {
      return next();
    }

    // 1. Kiểm tra phạm vi Điểm trường (Location)
    const targetLocationId =
      (req.params.locationId as string) ||
      (req.query.locationId as string) ||
      (req.body.locationId as string);

    if (targetLocationId && (options?.checkLocation ?? true)) {
      const isPrimaryLoc = req.user.primaryLocationId === targetLocationId;
      
      const hasScopedRole = userRoles.some((r) => {
        if (r.role === Role.PHO_HIEU_TRUONG && !r.scopeLocationId) return true;
        return r.scopeLocationId === targetLocationId;
      });

      if (!isPrimaryLoc && !hasScopedRole) {
        return next(
          new AppError('Bạn không có quyền truy cập dữ liệu của điểm trường này.', 403)
        );
      }
    }

    // 2. Kiểm tra phạm vi Tổ chức (OrgUnit)
    const targetOrgUnitId =
      (req.params.orgUnitId as string) ||
      (req.query.orgUnitId as string) ||
      (req.body.orgUnitId as string);

    if (targetOrgUnitId && (options?.checkOrgUnit ?? true)) {
      const isPrimaryOrg = req.user.primaryOrgUnitId === targetOrgUnitId;
      const isBGH = userRoleTypes.includes(Role.PHO_HIEU_TRUONG);
      const hasScopedOrgRole = userRoles.some((r) => r.scopeOrgUnitId === targetOrgUnitId);

      if (!isPrimaryOrg && !isBGH && !hasScopedOrgRole) {
        return next(
          new AppError('Bạn không có quyền truy cập dữ liệu của tổ/phòng ban này.', 403)
        );
      }
    }

    next();
  };
};
