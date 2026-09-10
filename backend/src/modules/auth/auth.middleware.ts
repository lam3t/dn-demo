import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { TokenPayload, AuthUser } from './auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'tn_edu_super_secret_jwt_access_key_2026';

/**
 * Middleware bắt buộc phải đăng nhập (Xác thực JWT Access Token)
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
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
        roles: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Tài khoản người dùng không tồn tại hoặc đã bị vô hiệu hóa.', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      title: user.title,
      avatarUrl: user.avatarUrl,
      schoolId: user.schoolId,
      primaryLocationId: user.primaryLocationId,
      primaryOrgUnitId: user.primaryOrgUnitId,
      roles: user.roles.map((r) => ({
        role: r.role,
        scopeLocationId: r.scopeLocationId,
        scopeOrgUnitId: r.scopeOrgUnitId,
      })),
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra vai trò người dùng (requireRole)
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Yêu cầu xác thực trước khi kiểm tra quyền.', 401));
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
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Yêu cầu xác thực trước khi kiểm tra phạm vi.', 401));
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
      // Cho phép nếu là điểm trường chính của user
      const isPrimaryLoc = req.user.primaryLocationId === targetLocationId;
      
      // Hoặc nếu user có vai trò phụ trách điểm trường đó hoặc vai trò cấp trường không giới hạn scopeLocation
      const hasScopedRole = userRoles.some((r) => {
        if (r.role === Role.PHO_HIEU_TRUONG && !r.scopeLocationId) return true; // PHT chuyên môn chung
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
      const isBGH = userRoleTypes.includes(Role.PHO_HIEU_TRUONG); // Ban Giám hiệu phụ trách liên tổ
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
