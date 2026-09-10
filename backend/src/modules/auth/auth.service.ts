import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { LoginResponse, TokenPayload, AuthUser } from './auth.types';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'tn_edu_super_secret_jwt_access_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tn_edu_super_secret_jwt_refresh_key_2026';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export class AuthService {
  /**
   * Đăng nhập bằng Email hoặc Số điện thoại + Mật khẩu
   */
  async login(identifier: string, password: string): Promise<LoginResponse> {
    if (!identifier || !password) {
      throw new AppError('Vui lòng nhập đầy đủ tài khoản (Email/SĐT) và mật khẩu.', 400);
    }

    const trimmed = identifier.trim();

    // Tìm kiếm user theo email hoặc số điện thoại
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: trimmed, mode: 'insensitive' } },
          { phone: { equals: trimmed } },
        ],
      },
      include: {
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

    // So khớp mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Tài khoản hoặc mật khẩu không chính xác.', 401);
    }

    // Tạo JWT Tokens
    const roleList = user.roles.map((r) => r.role);
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roles: roleList,
      schoolId: user.schoolId,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN as any });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });

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
        schoolName: user.school.name,
        primaryLocationId: user.primaryLocationId,
        primaryLocationName: user.primaryLocation?.name,
        primaryOrgUnitId: user.primaryOrgUnitId,
        primaryOrgUnitName: user.primaryOrgUnit?.name,
        roles: user.roles.map((r) => ({
          role: r.role,
          scopeLocationId: r.scopeLocationId,
          scopeLocationName: r.scopeLocation?.name,
          scopeOrgUnitId: r.scopeOrgUnitId,
          scopeOrgUnitName: r.scopeOrgUnit?.name,
        })),
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
      include: { roles: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('Người dùng không tồn tại hoặc đã bị khóa.', 401);
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
      schoolId: user.schoolId,
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

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      title: user.title,
      avatarUrl: user.avatarUrl,
      schoolId: user.schoolId,
      schoolName: user.school.name,
      primaryLocationId: user.primaryLocationId,
      primaryLocationName: user.primaryLocation?.name,
      primaryOrgUnitId: user.primaryOrgUnitId,
      primaryOrgUnitName: user.primaryOrgUnit?.name,
      roles: user.roles.map((r) => ({
        role: r.role,
        scopeLocationId: r.scopeLocationId,
        scopeLocationName: r.scopeLocation?.name,
        scopeOrgUnitId: r.scopeOrgUnitId,
        scopeOrgUnitName: r.scopeOrgUnit?.name,
      })),
    };
  }
}

export const authService = new AuthService();
