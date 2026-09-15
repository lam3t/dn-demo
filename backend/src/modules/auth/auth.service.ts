import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { LoginResponse, TokenPayload } from './auth.types';
import { Role } from '@prisma/client';
import { getTenantUserPermissions } from '../../utils/permission.util';

const JWT_SECRET = process.env.JWT_SECRET || 'tn_edu_super_secret_jwt_access_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tn_edu_super_secret_jwt_refresh_key_2026';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export class AuthService {
  /**
   * Đăng nhập bằng Email hoặc Số điện thoại + Mật khẩu (1 link duy nhất, tự động tra cứu tenant)
   */
  async login(identifier: string, password: string): Promise<LoginResponse> {
    if (!identifier || !password) {
      throw new AppError('Vui lòng nhập đầy đủ tài khoản (Email/SĐT) và mật khẩu.', 400);
    }

    const trimmed = identifier.trim();

    // Tìm kiếm user theo email hoặc số điện thoại trên phạm vi toàn hệ thống
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: trimmed, mode: 'insensitive' } },
          { phone: { equals: trimmed } },
        ],
      },
      include: {
        tenant: true,
        school: true,
        primaryLocation: true,
        primaryOrgUnit: true,
        roles: {
          include: {
            scopeLocation: true,
            scopeOrgUnit: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Tài khoản hoặc mật khẩu không chính xác.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.', 403);
    }

    // Kiểm tra trạng thái Tenant bắt buộc phải ACTIVE (nếu không phải System Admin)
    const effectiveTenantId = user.tenantId || user.school?.tenantId || null;
    if (!user.isSystemAdmin && effectiveTenantId) {
      let tenantObj = user.tenant;
      if (!tenantObj) {
        tenantObj = await prisma.tenant.findUnique({ where: { id: effectiveTenantId } });
      }
      if (!tenantObj || tenantObj.status !== 'ACTIVE') {
        throw new AppError(
          'Trường học/Đơn vị của bạn hiện đang bị tạm khóa hoặc ngừng hoạt động. Vui lòng liên hệ Quản trị viên hệ thống.',
          403
        );
      }
    }

    // So khớp mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Tài khoản hoặc mật khẩu không chính xác.', 401);
    }

    // Tạo JWT Tokens
    const roleList = user.roles.map((r) => r.role);
    if (user.isSystemAdmin && !roleList.includes(Role.SYSTEM_ADMIN)) {
      roleList.push(Role.SYSTEM_ADMIN);
    }

    const tenantId = user.tenantId || user.school?.tenantId || null;

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roles: roleList,
      schoolId: user.schoolId || undefined,
      tenantId: tenantId || undefined,
      isSystemAdmin: user.isSystemAdmin,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN as any });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });

    const permissions = await getTenantUserPermissions(user.id, tenantId, user.isSystemAdmin);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        title: user.title,
        avatarUrl: user.avatarUrl,
        schoolId: user.schoolId,
        schoolName: user.school?.name || (user.isSystemAdmin ? 'Hệ thống Quản trị Nền tảng TN EDU' : undefined),
        tenantId: tenantId,
        tenantName: user.tenant?.name,
        tenantCode: user.tenant?.code,
        isSystemAdmin: user.isSystemAdmin,
        primaryLocationId: user.primaryLocationId,
        primaryLocationName: user.primaryLocation?.name,
        primaryOrgUnitId: user.primaryOrgUnitId,
        primaryOrgUnitName: user.primaryOrgUnit?.name,
        roles: user.roles.map((r) => ({
          role: r.role,
          roleId: r.roleId,
          scopeLocationId: r.scopeLocationId,
          scopeLocationName: r.scopeLocation?.name,
          scopeOrgUnitId: r.scopeOrgUnitId,
          scopeOrgUnitName: r.scopeOrgUnit?.name,
        })),
        permissions,
      },
    };
  }

  /**
   * Cấp lại Access Token từ Refresh Token
   */
  async refresh(refreshTokenString: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshTokenString) {
      throw new AppError('Refresh token không hợp lệ hoặc thiếu.', 400);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshTokenString, JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AppError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: true,
        school: true,
        roles: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Người dùng không tồn tại hoặc đã bị khóa.', 401);
    }

    const effectiveTenantId = user.tenantId || user.school?.tenantId || null;
    if (!user.isSystemAdmin && effectiveTenantId) {
      let tenantObj = user.tenant;
      if (!tenantObj) {
        tenantObj = await prisma.tenant.findUnique({ where: { id: effectiveTenantId } });
      }
      if (!tenantObj || tenantObj.status !== 'ACTIVE') {
        throw new AppError(
          'Trường học/Đơn vị của bạn hiện đang bị tạm khóa hoặc ngừng hoạt động. Vui lòng liên hệ Quản trị viên hệ thống.',
          403
        );
      }
    }

    const roleList = user.roles.map((r) => r.role);
    if (user.isSystemAdmin && !roleList.includes(Role.SYSTEM_ADMIN)) {
      roleList.push(Role.SYSTEM_ADMIN);
    }

    const tenantId = user.tenantId || user.school?.tenantId || null;

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roles: roleList,
      schoolId: user.schoolId || undefined,
      tenantId: tenantId || undefined,
      isSystemAdmin: user.isSystemAdmin,
    };

    const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN as any });
    const newRefreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Lấy thông tin chi tiết người dùng đang đăng nhập
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        school: true,
        primaryLocation: true,
        primaryOrgUnit: true,
        roles: {
          include: {
            scopeLocation: true,
            scopeOrgUnit: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    const tenantId = user.tenantId || user.school?.tenantId || null;
    if (!user.isSystemAdmin && tenantId) {
      let tenantObj = user.tenant;
      if (!tenantObj) {
        tenantObj = await prisma.tenant.findUnique({ where: { id: tenantId } });
      }
      if (!tenantObj || tenantObj.status !== 'ACTIVE') {
        throw new AppError(
          'Trường học/Đơn vị của bạn hiện đang bị tạm khóa hoặc ngừng hoạt động. Vui lòng liên hệ Quản trị viên hệ thống.',
          403
        );
      }
    }

    const permissions = await getTenantUserPermissions(user.id, tenantId, user.isSystemAdmin);

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      title: user.title,
      avatarUrl: user.avatarUrl,
      schoolId: user.schoolId,
      schoolName: user.school?.name || (user.isSystemAdmin ? 'Hệ thống Quản trị Nền tảng TN EDU' : undefined),
      tenantId: tenantId,
      tenantName: user.tenant?.name,
      tenantCode: user.tenant?.code,
      isSystemAdmin: user.isSystemAdmin,
      primaryLocationId: user.primaryLocationId,
      primaryLocationName: user.primaryLocation?.name,
      primaryOrgUnitId: user.primaryOrgUnitId,
      primaryOrgUnitName: user.primaryOrgUnit?.name,
      roles: user.roles.map((r) => ({
        role: r.role,
        roleId: r.roleId,
        scopeLocationId: r.scopeLocationId,
        scopeLocationName: r.scopeLocation?.name,
        scopeOrgUnitId: r.scopeOrgUnitId,
        scopeOrgUnitName: r.scopeOrgUnit?.name,
      })),
      permissions,
    };
  }

  /**
   * Đổi mật khẩu cá nhân (TT 003)
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!oldPassword || !newPassword) {
      throw new AppError('Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới.', 400);
    }
    if (newPassword.length < 6) {
      throw new AppError('Mật khẩu mới phải có tối thiểu 6 ký tự.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Mật khẩu hiện tại không chính xác.', 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return {
      success: true,
      message: 'Đổi mật khẩu thành công.',
    };
  }
}

export const authService = new AuthService();

