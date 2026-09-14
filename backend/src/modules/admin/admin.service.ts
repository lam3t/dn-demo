import bcrypt from 'bcryptjs';
import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { Role, TaskAssignmentRole, TaskStatus } from '@prisma/client';
import { removeVietnameseAccents, calculateMatchScore } from '../../utils/vietnamese.utils';
import appCache from '../../utils/cache';
import {
  CreateAdminUserDto,
  UpdateAdminUserDto,
  InitialUserRoleDto,
  AddUserRoleDto,
  AdminUserFilterDto,
  PermissionMatrixItem,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
  CreateSharedCategoryDto,
  UpdateSharedCategoryDto,
  CreateKPIDefinitionDto,
  UpdateKPIDefinitionDto,
} from './admin.types';
import { resolveTenantId } from '../../utils/tenant.util';
import { invalidateUserPermissions } from '../../utils/permission.util';

export class AdminService {
  /**
   * Helper ghi log kiểm toán AdminAuditLog
   */
  async logAudit(
    actorUserId: string,
    action: string,
    targetType: string,
    targetId: string,
    detail?: string,
    tenantId?: string
  ) {
    try {
      let effectiveTenantId = tenantId;
      if (!effectiveTenantId) {
        const actor = await prisma.user.findUnique({
          where: { id: actorUserId },
          select: { tenantId: true, schoolId: true },
        });
        effectiveTenantId = (actor?.tenantId || (await resolveTenantId(actor?.schoolId))) as string;
      }

      await prisma.adminAuditLog.create({
        data: {
          tenantId: effectiveTenantId,
          actorUserId,
          action,
          targetType,
          targetId,
          detail: detail || null,
        },
      });
      appCache.invalidateTags(['users', 'locations', 'tasks', 'dashboard']);
    } catch (err) {
      console.error('Lỗi khi ghi AdminAuditLog:', err);
    }
  }

  /**
   * 1. GET /api/admin/users
   * Danh sách đầy đủ tài khoản cho Quản trị viên
   */
  async getUsers(filters: AdminUserFilterDto, schoolId?: string, tenantId?: string) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const searchQuery = (filters.search || '').trim();

    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    if (filters.locationId) {
      where.OR = [
        { primaryLocationId: filters.locationId },
        { roles: { some: { scopeLocationId: filters.locationId } } },
      ];
    }

    if (filters.orgUnitId) {
      where.OR = [
        { primaryOrgUnitId: filters.orgUnitId },
        { roles: { some: { scopeOrgUnitId: filters.orgUnitId } } },
      ];
    }

    if (filters.role) {
      where.roles = { some: { role: filters.role } };
    }

    if (filters.status) {
      if (filters.status === 'active' || filters.status === 'true') {
        where.isActive = true;
      } else if (filters.status === 'locked' || filters.status === 'false') {
        where.isActive = false;
      }
    }

    // Fetch all records matching structured filters
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        primaryLocation: {
          select: { id: true, name: true, code: true },
        },
        primaryOrgUnit: {
          select: { id: true, name: true, code: true },
        },
        roles: {
          include: {
            scopeLocation: { select: { id: true, name: true, code: true } },
            scopeOrgUnit: { select: { id: true, name: true, code: true } },
          },
        },
        taskAssignments: {
          where: {
            role: { in: [TaskAssignmentRole.CHU_TRI, TaskAssignmentRole.PHOI_HOP] },
            task: {
              status: {
                notIn: [TaskStatus.DONG, TaskStatus.HUY, TaskStatus.HOAN_THANH],
              },
            },
          },
          select: { id: true },
        },
      },
    });

    // Score & Vietnamese search matching
    let scoredUsers = users.map((u) => {
      let score = 1;
      if (searchQuery) {
        const nameScore = calculateMatchScore(u.fullName, searchQuery);
        const titleScore = u.title ? calculateMatchScore(u.title, searchQuery) : 0;
        const phoneScore = calculateMatchScore(u.phone, searchQuery);
        const emailScore = calculateMatchScore(u.email, searchQuery);

        score = Math.max(nameScore * 3, titleScore * 2, phoneScore * 2, emailScore);
      }

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        title: u.title,
        avatarUrl: u.avatarUrl,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        primaryLocation: u.primaryLocation,
        primaryOrgUnit: u.primaryOrgUnit,
        roles: u.roles.map((r) => ({
          id: r.id,
          role: r.role,
          scopeLocationId: r.scopeLocationId,
          scopeOrgUnitId: r.scopeOrgUnitId,
          scopeLocation: r.scopeLocation,
          scopeOrgUnit: r.scopeOrgUnit,
          createdAt: r.createdAt,
        })),
        currentTaskLoad: u.taskAssignments.length,
        score,
      };
    });

    if (searchQuery) {
      scoredUsers = scoredUsers.filter((u) => u.score > 0);
      scoredUsers.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.fullName.localeCompare(b.fullName, 'vi');
      });
    }

    const total = scoredUsers.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedItems = scoredUsers.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginatedItems.map(({ score, ...item }) => item),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 2. POST /api/admin/users
   * Tạo tài khoản mới với mật khẩu mặc định 123456
   */
  async createUser(actorUserId: string, schoolId: string, data: CreateAdminUserDto) {
    const email = data.email?.toLowerCase().trim();
    const phone = data.phone?.trim();

    if (!data.fullName || !data.fullName.trim()) {
      throw new AppError('Họ và tên không được để trống.', 400);
    }
    if (!phone) {
      throw new AppError('Số điện thoại không được để trống.', 400);
    }
    if (!email) {
      throw new AppError('Email không được để trống.', 400);
    }

    // Kiểm tra trùng SĐT
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new AppError('Số điện thoại này đã được sử dụng bởi một tài khoản khác.', 400);
    }

    // Kiểm tra trùng Email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AppError('Địa chỉ email này đã được sử dụng bởi một tài khoản khác.', 400);
    }

    const rawPassword = data.password || '123456';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    let initialRoles: InitialUserRoleDto[] = [];
    if (data.roles && data.roles.length > 0) {
      initialRoles = data.roles.map((r) => ({
        role: r.role,
        scopeLocationId: r.scopeLocationId || null,
        scopeOrgUnitId: r.scopeOrgUnitId || null,
      }));
    } else if (data.isToTruong && data.orgUnitId) {
      initialRoles = [
        { role: Role.TO_TRUONG, scopeLocationId: data.locationId || null, scopeOrgUnitId: data.orgUnitId || null },
        { role: Role.GIAO_VIEN, scopeLocationId: data.locationId || null, scopeOrgUnitId: data.orgUnitId || null },
      ];
    } else {
      initialRoles = [{ role: Role.GIAO_VIEN, scopeLocationId: data.locationId || null, scopeOrgUnitId: data.orgUnitId || null }];
    }

    // Nếu người này là Tổ trưởng: Overwrite tổ trưởng cũ của tổ này
    if (data.isToTruong && data.orgUnitId) {
      const oldLeaderRoles = await prisma.userRole.findMany({
        where: {
          role: Role.TO_TRUONG,
          OR: [
            { scopeOrgUnitId: data.orgUnitId },
            { user: { primaryOrgUnitId: data.orgUnitId } },
          ],
        },
        include: { user: true },
      });

      for (const oldRole of oldLeaderRoles) {
        await prisma.userRole.delete({ where: { id: oldRole.id } });
        const hasGiaoVien = await prisma.userRole.findFirst({
          where: { userId: oldRole.userId, role: Role.GIAO_VIEN },
        });
        if (!hasGiaoVien) {
          await prisma.userRole.create({
            data: {
              userId: oldRole.userId,
              role: Role.GIAO_VIEN,
              scopeOrgUnitId: data.orgUnitId,
              scopeLocationId: oldRole.user.primaryLocationId,
            },
          });
        }
        await this.logAudit(
          actorUserId,
          'OVERWRITE_TO_TRUONG',
          'USER',
          oldRole.userId,
          `Hạ vai trò Tổ trưởng của ${oldRole.user.fullName} về Giáo viên để bổ nhiệm ${data.fullName.trim()}`
        );
      }
    }

    const tenantId = await resolveTenantId(schoolId, (data as any).tenantId);

    // Kiểm tra hạn mức tài khoản (maxAccounts) theo Gói dịch vụ / Subscription
    if (tenantId) {
      const activeSubscription = await prisma.tenantSubscription.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        include: { package: true },
      });

      if (activeSubscription && activeSubscription.package) {
        const maxAccounts = activeSubscription.package.maxAccounts;
        const currentCount = await prisma.user.count({
          where: { tenantId, isActive: true },
        });

        if (currentCount >= maxAccounts) {
          throw new AppError(
            `Không thể tạo thêm tài khoản: Nhà trường đã đạt hạn mức tối đa (${currentCount}/${maxAccounts} tài khoản) của gói dịch vụ "${activeSubscription.package.name}". Vui lòng liên hệ Quản trị viên nền tảng để nâng cấp gói.`,
            400
          );
        }
      }
    }

    // Tra cứu roleId tương ứng theo RoleModel
    const rolesToCreate = await Promise.all(
      initialRoles.map(async (r) => {
        let roleId = (r as any).roleId || null;
        if (!roleId && tenantId) {
          const roleModel = await prisma.roleModel.findFirst({
            where: {
              OR: [
                { tenantId, code: r.role },
                { tenantId: null, code: r.role },
              ],
            },
          });
          roleId = roleModel?.id || null;
        }
        return {
          role: r.role,
          roleId,
          scopeLocationId: r.scopeLocationId,
          scopeOrgUnitId: r.scopeOrgUnitId,
        };
      })
    );

    const newUser = await prisma.user.create({
      data: {
        tenantId,
        schoolId,
        fullName: data.fullName.trim(),
        email,
        phone,
        passwordHash,
        title: data.position || null,
        primaryLocationId: data.locationId || null,
        primaryOrgUnitId: data.orgUnitId || null,
        avatarUrl:
          data.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=1F3864&color=fff`,
        isActive: true,
        roles: {
          create: rolesToCreate,
        },
      },
      include: {
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

    // Audit log
    await this.logAudit(
      actorUserId,
      'CREATE_USER',
      'USER',
      newUser.id,
      `Tạo tài khoản người dùng mới: ${newUser.fullName} (${newUser.email})`
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * 3. PATCH /api/admin/users/:id
   * Cập nhật thông tin cơ bản của người dùng
   */
  async updateUser(actorUserId: string, id: string, data: UpdateAdminUserDto) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    if (data.phone && data.phone.trim() !== existing.phone) {
      const duplicatePhone = await prisma.user.findUnique({ where: { phone: data.phone.trim() } });
      if (duplicatePhone) {
        throw new AppError('Số điện thoại mới đã được sử dụng bởi một tài khoản khác.', 400);
      }
    }

    if (data.email && data.email.toLowerCase().trim() !== existing.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (duplicateEmail) {
        throw new AppError('Địa chỉ email mới đã được sử dụng bởi một tài khoản khác.', 400);
      }
    }

    // Xử lý thay đổi cờ Tổ trưởng (isToTruong)
    if (data.isToTruong !== undefined) {
      const effectiveOrgUnitId = data.orgUnitId !== undefined ? data.orgUnitId : existing.primaryOrgUnitId;
      const effectiveLocationId = data.locationId !== undefined ? data.locationId : existing.primaryLocationId;

      if (data.isToTruong && effectiveOrgUnitId) {
        // 1. Quét tìm và overwrite các Tổ trưởng cũ khác trong cùng tổ
        const oldLeaderRoles = await prisma.userRole.findMany({
          where: {
            userId: { not: id },
            role: Role.TO_TRUONG,
            OR: [
              { scopeOrgUnitId: effectiveOrgUnitId },
              { user: { primaryOrgUnitId: effectiveOrgUnitId } },
            ],
          },
          include: { user: true },
        });

        for (const oldRole of oldLeaderRoles) {
          await prisma.userRole.delete({ where: { id: oldRole.id } });
          const hasGiaoVien = await prisma.userRole.findFirst({
            where: { userId: oldRole.userId, role: Role.GIAO_VIEN },
          });
          if (!hasGiaoVien) {
            await prisma.userRole.create({
              data: {
                userId: oldRole.userId,
                role: Role.GIAO_VIEN,
                scopeOrgUnitId: effectiveOrgUnitId,
                scopeLocationId: oldRole.user.primaryLocationId,
              },
            });
          }
          await this.logAudit(
            actorUserId,
            'OVERWRITE_TO_TRUONG',
            'USER',
            oldRole.userId,
            `Hạ vai trò Tổ trưởng của ${oldRole.user.fullName} về Giáo viên để bổ nhiệm ${existing.fullName}`
          );
        }

        // 2. Gán vai trò TO_TRUONG cho user hiện tại
        const existingToTruong = await prisma.userRole.findFirst({
          where: { userId: id, role: Role.TO_TRUONG },
        });
        if (!existingToTruong) {
          await prisma.userRole.create({
            data: {
              userId: id,
              role: Role.TO_TRUONG,
              scopeOrgUnitId: effectiveOrgUnitId,
              scopeLocationId: effectiveLocationId || null,
            },
          });
        } else {
          await prisma.userRole.update({
            where: { id: existingToTruong.id },
            data: {
              scopeOrgUnitId: effectiveOrgUnitId,
              scopeLocationId: effectiveLocationId || null,
            },
          });
        }
      } else if (data.isToTruong === false) {
        // Gỡ vai trò TO_TRUONG khỏi user hiện tại
        const existingToTruong = await prisma.userRole.findFirst({
          where: { userId: id, role: Role.TO_TRUONG },
        });
        if (existingToTruong) {
          // Đảm bảo còn ít nhất 1 role khác
          const otherRoles = await prisma.userRole.findMany({
            where: { userId: id, id: { not: existingToTruong.id } },
          });
          if (otherRoles.length === 0) {
            await prisma.userRole.create({
              data: {
                userId: id,
                role: Role.GIAO_VIEN,
                scopeOrgUnitId: effectiveOrgUnitId,
                scopeLocationId: effectiveLocationId || null,
              },
            });
          }
          await prisma.userRole.delete({ where: { id: existingToTruong.id } });
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName && { fullName: data.fullName.trim() }),
        ...(data.phone && { phone: data.phone.trim() }),
        ...(data.email && { email: data.email.toLowerCase().trim() }),
        ...(data.position !== undefined && { title: data.position }),
        ...(data.locationId !== undefined && { primaryLocationId: data.locationId }),
        ...(data.orgUnitId !== undefined && { primaryOrgUnitId: data.orgUnitId }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      include: {
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

    await this.logAudit(
      actorUserId,
      'UPDATE_USER',
      'USER',
      id,
      `Cập nhật thông tin tài khoản: ${updatedUser.fullName}`
    );

    const { passwordHash: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  /**
   * 4. PATCH /api/admin/users/:id/status
   * Khoá hoặc mở khoá tài khoản
   */
  async toggleUserStatus(actorUserId: string, id: string, isActive: boolean) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    // Không cho phép tự khoá tài khoản của chính mình
    if (id === actorUserId && !isActive) {
      throw new AppError('Không thể tự khoá tài khoản đang đăng nhập.', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    await this.logAudit(
      actorUserId,
      isActive ? 'UNLOCK_USER' : 'LOCK_USER',
      'USER',
      id,
      `${isActive ? 'Mở khoá' : 'Khoá'} tài khoản: ${updated.fullName} (${updated.email})`
    );

    return updated;
  }

  /**
   * 5. POST /api/admin/users/:id/reset-password
   * Đặt lại mật khẩu về mặc định 123456
   */
  async resetPassword(actorUserId: string, id: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    const passwordHash = await bcrypt.hash('123456', 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.logAudit(
      actorUserId,
      'RESET_PASSWORD',
      'USER',
      id,
      `Đặt lại mật khẩu mặc định "123456" cho tài khoản: ${existing.fullName} (${existing.email})`
    );

    return {
      success: true,
      message: 'Mật khẩu đã được đặt lại về mặc định "123456".',
    };
  }

  /**
   * 6. DELETE /api/admin/users/:id
   * Xoá tài khoản nếu chưa từng là CHU_TRI hoặc PHOI_HOP của bất kỳ Task nào
   */
  async deleteUser(actorUserId: string, id: string) {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        taskAssignments: {
          where: {
            role: { in: [TaskAssignmentRole.CHU_TRI, TaskAssignmentRole.PHOI_HOP] },
          },
          select: { id: true },
        },
        createdTasks: {
          select: { id: true },
        },
        createdPlans: {
          select: { id: true },
        },
      },
    });

    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    if (id === actorUserId) {
      throw new AppError('Không thể tự xoá tài khoản đang đăng nhập của chính mình.', 400);
    }

    const hasTasks = existing.taskAssignments.length > 0;
    const hasCreatedTasks = existing.createdTasks.length > 0;
    const hasCreatedPlans = existing.createdPlans.length > 0;

    if (hasTasks || hasCreatedTasks || hasCreatedPlans) {
      throw new AppError(
        'Không thể xoá tài khoản này vì đã có dữ liệu công việc/kế hoạch liên quan trong hệ thống. Vui lòng sử dụng tính năng "Khoá tài khoản" thay vì xoá.',
        400
      );
    }

    // Xoá an toàn
    await prisma.user.delete({ where: { id } });

    await this.logAudit(
      actorUserId,
      'DELETE_USER',
      'USER',
      id,
      `Xoá tài khoản người dùng: ${existing.fullName} (${existing.email})`
    );

    return {
      success: true,
      message: 'Xoá tài khoản thành công.',
    };
  }

  /**
   * 7. POST /api/admin/users/:id/roles
   * Thêm 1 dòng UserRole (role, scopeLocationId, scopeOrgUnitId)
   */
  async addUserRole(actorUserId: string, userId: string, data: AddUserRoleDto) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new AppError('Không tìm thấy thông tin người dùng.', 404);
    }

    const scopeLoc = data.scopeLocationId || null;
    const scopeOrg = data.scopeOrgUnitId || null;

    // Kiểm tra trùng lặp y hệt (cùng role + cùng scope)
    const isDuplicate = user.roles.some(
      (r) =>
        r.role === data.role &&
        r.scopeLocationId === scopeLoc &&
        r.scopeOrgUnitId === scopeOrg
    );

    if (isDuplicate) {
      throw new AppError('Vai trò và phạm vi này đã tồn tại cho người dùng.', 400);
    }

    const newRole = await prisma.userRole.create({
      data: {
        userId,
        role: data.role,
        scopeLocationId: scopeLoc,
        scopeOrgUnitId: scopeOrg,
      },
      include: {
        scopeLocation: { select: { id: true, name: true, code: true } },
        scopeOrgUnit: { select: { id: true, name: true, code: true } },
      },
    });

    await this.logAudit(
      actorUserId,
      'ADD_USER_ROLE',
      'ROLE',
      newRole.id,
      `Gán vai trò [${data.role}] cho người dùng ${user.fullName}`
    );

    return newRole;
  }

  /**
   * 8. DELETE /api/admin/users/:id/roles/:userRoleId
   * Gỡ 1 vai trò/phạm vi khỏi tài khoản (chặn nếu đây là vai trò cuối cùng)
   */
  async removeUserRole(actorUserId: string, userId: string, userRoleId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new AppError('Không tìm thấy thông tin người dùng.', 404);
    }

    const roleToDelete = user.roles.find((r) => r.id === userRoleId);
    if (!roleToDelete) {
      throw new AppError('Không tìm thấy vai trò cần gỡ của người dùng này.', 404);
    }

    if (user.roles.length <= 1) {
      throw new AppError(
        'Không thể gỡ vai trò cuối cùng của tài khoản. Mỗi tài khoản phải còn ít nhất 1 vai trò.',
        400
      );
    }

    await prisma.userRole.delete({ where: { id: userRoleId } });

    await this.logAudit(
      actorUserId,
      'REMOVE_USER_ROLE',
      'ROLE',
      userRoleId,
      `Gỡ vai trò [${roleToDelete.role}] khỏi người dùng ${user.fullName}`
    );

    return {
      success: true,
      message: 'Gỡ vai trò thành công.',
    };
  }

  /**
   * 9. GET /api/admin/permissions-matrix
   * Bảng ma trận phân quyền tĩnh mô tả 6 vai trò trong SRS
   */
  getPermissionsMatrix(): PermissionMatrixItem[] {
    return [
      {
        role: Role.HIEU_TRUONG,
        roleName: 'Hiệu trưởng',
        scope: 'Toàn trường (Tất cả điểm trường & tổ bộ phận)',
        description:
          'Lãnh đạo cao nhất của nhà trường, toàn quyền chỉ đạo điều hành, phê duyệt kế hoạch, giám sát và đóng việc.',
        capabilities: [
          {
            category: 'Kế hoạch & Chủ trương',
            details: [
              'Lập & duyệt kế hoạch năm học, học kỳ, quý, tháng, tuần toàn trường',
              'Xem tất cả kế hoạch của các tổ chuyên môn và điểm trường',
            ],
          },
          {
            category: 'Quản lý Công việc',
            details: [
              'Giao việc trực tiếp cho bất kỳ nhân sự nào thuộc nhà trường',
              'Chỉ đạo công việc phối hợp liên điểm trường / liên tổ',
              'Kiểm tra, phê duyệt kết quả hoàn thành và Đóng công việc',
            ],
          },
          {
            category: 'Giám sát & Báo cáo',
            details: [
              'Xem Dashboard tổng quan toàn trường thời gian thực',
              'Xem cảnh báo công việc quá hạn, nghẽn tiến độ',
              'Xem thống kê hiệu suất theo điểm trường và tổ chuyên môn',
            ],
          },
          {
            category: 'Quản trị hệ thống',
            details: [
              'Quản lý danh sách tài khoản toàn trường',
              'Phân quyền vai trò và phạm vi phụ trách cho cán bộ/giáo viên',
              'Quản lý danh mục điểm trường và cơ cấu tổ chức',
            ],
          },
        ],
      },
      {
        role: Role.PHO_HIEU_TRUONG,
        roleName: 'Phó Hiệu trưởng',
        scope: 'Toàn trường hoặc Điểm trường / Khối chuyên môn được phân công',
        description:
          'Phụ trách khối chuyên môn hoặc cơ sở/điểm trường theo phân công của Hiệu trưởng.',
        capabilities: [
          {
            category: 'Kế hoạch chuyên môn',
            details: [
              'Lập kế hoạch chuyên môn, kế hoạch tháng/tuần theo mảng phụ trách',
              'Tham mưu xây dựng kế hoạch năm học và học kỳ',
            ],
          },
          {
            category: 'Quản lý Công việc',
            details: [
              'Giao việc cho Tổ trưởng, Giáo viên thuộc phạm vi phụ trách',
              'Kiểm tra, đánh giá minh chứng và xác nhận kết quả công việc',
              'Theo dõi tiến độ phối hợp giữa các điểm trường',
            ],
          },
          {
            category: 'Giám sát & Thống kê',
            details: [
              'Xem Dashboard chuyên môn / điểm trường phụ trách',
              'Cảnh báo và đôn đốc các công việc sắp hoặc quá hạn',
            ],
          },
        ],
      },
      {
        role: Role.TO_TRUONG,
        roleName: 'Tổ trưởng chuyên môn / Trưởng bộ phận',
        scope: 'Tổ chuyên môn / Bộ phận trực thuộc',
        description:
          'Quản lý điều hành các hoạt động giảng dạy, sinh hoạt chuyên môn trong tổ.',
        capabilities: [
          {
            category: 'Kế hoạch Tổ',
            details: [
              'Xây dựng kế hoạch hoạt động tháng/tuần của tổ chuyên môn',
              'Cụ thể hoá kế hoạch nhà trường thành các đầu việc của tổ',
            ],
          },
          {
            category: 'Quản lý Công việc',
            details: [
              'Phân công nhiệm vụ (Chủ trì, Phối hợp) cho giáo viên trong tổ',
              'Theo dõi, đôn đốc tiến độ thực hiện nhiệm vụ của các thành viên',
              'Kiểm tra minh chứng, duyệt hoàn thành công việc cấp tổ',
            ],
          },
          {
            category: 'Báo cáo',
            details: [
              'Báo cáo tiến độ và chất lượng công việc của tổ cho Ban Giám hiệu',
            ],
          },
        ],
      },
      {
        role: Role.GIAO_VIEN,
        roleName: 'Giáo viên',
        scope: 'Điểm trường và Tổ chuyên môn đang công tác',
        description:
          'Trực tiếp thực hiện công tác giảng dạy, giáo dục và các nhiệm vụ chuyên môn được phân công.',
        capabilities: [
          {
            category: 'Thực hiện Công việc',
            details: [
              'Tiếp nhận công việc được giao (vai trò Chủ trì hoặc Phối hợp)',
              'Cập nhật tiến độ (% hoàn thành) và nhật ký thực hiện',
              'Tải lên minh chứng kết quả (hình ảnh, tài liệu, file đính kèm)',
              'Gửi yêu cầu kiểm tra khi hoàn thành công việc',
            ],
          },
          {
            category: 'Trao đổi & Phối hợp',
            details: [
              'Bình luận, trao đổi nhanh với người giao việc và người phối hợp',
              'Báo cáo khó khăn, vướng mắc trong quá trình thực hiện',
            ],
          },
        ],
      },
      {
        role: Role.NHAN_VIEN,
        roleName: 'Nhân viên (Văn thư, Kế toán, Y tế, Thư viện, Thiết bị...)',
        scope: 'Phòng ban / Bộ phận hành chính đang công tác',
        description:
          'Thực hiện các nghiệp vụ hỗ trợ giáo dục, quản trị cơ sở vật chất, hành chính văn thư.',
        capabilities: [
          {
            category: 'Thực hiện Nhiệm vụ',
            details: [
              'Tiếp nhận và xử lý các nhiệm vụ hành chính, phục vụ chuyên môn',
              'Cập nhật tiến độ và nộp chứng từ/hồ sơ minh chứng hoàn thành',
            ],
          },
          {
            category: 'Phối hợp công việc',
            details: [
              'Phối hợp với Ban Giám hiệu, Tổ trưởng và Giáo viên theo yêu cầu công tác',
            ],
          },
        ],
      },
      {
        role: Role.ADMIN,
        roleName: 'Quản trị hệ thống (System Administrator)',
        scope: 'Toàn bộ hệ thống kỹ thuật',
        description:
          'Quản trị tài khoản người dùng, cấu hình điểm trường, phân quyền vai trò và bảo trì hệ thống.',
        capabilities: [
          {
            category: 'Quản lý Tài khoản',
            details: [
              'Tạo mới, chỉnh sửa thông tin nhân sự',
              'Khoá / Mở khoá tài khoản người dùng',
              'Đặt lại mật khẩu về mặc định 123456',
              'Xoá tài khoản chưa phát sinh dữ liệu công việc',
            ],
          },
          {
            category: 'Phân quyền & Phạm vi',
            details: [
              'Gán vai trò và phạm vi phụ trách cho từng tài khoản',
              'Gỡ vai trò (đảm bảo mỗi tài khoản có ít nhất 1 vai trò)',
              'Xem ma trận phân quyền hệ thống',
            ],
          },
          {
            category: 'Quản lý Điểm trường & Danh mục',
            details: [
              'Tạo mới, sửa thông tin điểm trường, chỉ định người phụ trách',
              'Kiểm soát xoá điểm trường (chặn nếu còn nhân sự/công việc)',
              'Xem thống kê tổng quan điểm trường',
            ],
          },
          {
            category: 'Nhật ký Kiểm toán',
            details: [
              'Hệ thống tự động ghi vết toàn bộ thao tác quản trị vào AdminAuditLog',
            ],
          },
        ],
      },
    ];
  }

  // --------------------------------------------------------
  // PHASE 2: DYNAMIC PERMISSIONS & RBAC MATRIX
  // --------------------------------------------------------

  /**
   * 10. GET /api/admin/permissions
   * Danh mục tất cả Permission catalog (~60-70 keys) gom theo Category
   */
  async getPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    return permissions;
  }

  /**
   * 11. GET /api/admin/roles
   * Danh sách Roles của Tenant kèm Permission Matrix hiện hành
   */
  async getRoles(tenantId: string) {
    const roles = await prisma.roleModel.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });

    return roles.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      userCount: r._count.userRoles,
      permissionKeys: r.rolePermissions.map((rp) => rp.permission.key),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * 12. POST /api/admin/roles
   * Tạo Role tùy biến (Custom Role) cho Tenant
   */
  async createRole(actorUserId: string, tenantId: string, data: CreateRoleDto) {
    const code = data.code?.toUpperCase().trim();
    if (!code || !data.name?.trim()) {
      throw new AppError('Mã vai trò (code) và Tên vai trò (name) là bắt buộc.', 400);
    }

    // Kiểm tra trùng code trong tenant
    const existing = await prisma.roleModel.findFirst({
      where: { tenantId, code },
    });
    if (existing) {
      throw new AppError(`Mã vai trò [${code}] đã tồn tại trong trường này.`, 400);
    }

    const role = await prisma.roleModel.create({
      data: {
        tenantId,
        code,
        name: data.name.trim(),
        description: data.description || null,
        isSystem: false,
      },
    });

    if (data.permissionKeys && data.permissionKeys.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { key: { in: data.permissionKeys } },
      });
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      });
    }

    invalidateUserPermissions(undefined, tenantId);

    await this.logAudit(
      actorUserId,
      'CREATE_ROLE',
      'ROLE',
      role.id,
      `Tạo vai trò tùy biến [${role.code} - ${role.name}]`,
      tenantId
    );

    return role;
  }

  /**
   * 13. PATCH /api/admin/roles/:id
   * Cập nhật thông tin Role
   */
  async updateRole(actorUserId: string, tenantId: string, roleId: string, data: UpdateRoleDto) {
    const role = await prisma.roleModel.findFirst({
      where: {
        id: roleId,
        OR: [{ tenantId }, { tenantId: null }],
      },
    });

    if (!role) {
      throw new AppError('Không tìm thấy vai trò cần chỉnh sửa.', 404);
    }

    const updated = await prisma.roleModel.update({
      where: { id: roleId },
      data: {
        name: data.name?.trim() || role.name,
        description: data.description !== undefined ? data.description : role.description,
      },
    });

    await this.logAudit(
      actorUserId,
      'UPDATE_ROLE',
      'ROLE',
      roleId,
      `Cập nhật thông tin vai trò [${updated.code}]`,
      tenantId
    );

    return updated;
  }

  /**
   * 14. PUT /api/admin/roles/:id/permissions
   * Cấu hình lại ma trận Permission cho một Role
   */
  async updateRolePermissions(
    actorUserId: string,
    tenantId: string,
    roleId: string,
    data: UpdateRolePermissionsDto
  ) {
    const role = await prisma.roleModel.findFirst({
      where: {
        id: roleId,
        OR: [{ tenantId }, { tenantId: null }],
      },
    });

    if (!role) {
      throw new AppError('Không tìm thấy vai trò cần cấu hình quyền.', 404);
    }

    // Xóa permission cũ của role
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Thêm permission mới
    if (data.permissionKeys && data.permissionKeys.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { key: { in: data.permissionKeys } },
      });

      if (perms.length > 0) {
        await prisma.rolePermission.createMany({
          data: perms.map((p) => ({
            roleId,
            permissionId: p.id,
          })),
        });
      }
    }

    // Xóa cache permission
    invalidateUserPermissions(undefined, tenantId);

    await this.logAudit(
      actorUserId,
      'UPDATE_ROLE_PERMISSIONS',
      'ROLE',
      roleId,
      `Cập nhật tập quyền cho vai trò [${role.code}] (${data.permissionKeys.length} quyền)`,
      tenantId
    );

    return {
      success: true,
      message: `Cập nhật phân quyền cho vai trò [${role.name}] thành công.`,
      permissionCount: data.permissionKeys.length,
    };
  }

  /**
   * 15. DELETE /api/admin/roles/:id
   * Xóa vai trò tùy biến (Custom Role)
   */
  async deleteRole(actorUserId: string, tenantId: string, roleId: string) {
    const role = await prisma.roleModel.findFirst({
      where: { id: roleId, tenantId },
      include: {
        userRoles: true,
      },
    });

    if (!role) {
      throw new AppError('Không tìm thấy vai trò hoặc vai trò không thuộc quyền quản lý của trường.', 404);
    }

    if (role.isSystem) {
      throw new AppError('Không thể xóa vai trò mặc định của hệ thống.', 400);
    }

    if (role.userRoles.length > 0) {
      throw new AppError(
        `Không thể xóa vai trò này vì đang được gán cho ${role.userRoles.length} tài khoản người dùng. Vui lòng chuyển vai trò của họ trước khi xóa.`,
        400
      );
    }

    await prisma.roleModel.delete({ where: { id: roleId } });
    invalidateUserPermissions(undefined, tenantId);

    await this.logAudit(
      actorUserId,
      'DELETE_ROLE',
      'ROLE',
      roleId,
      `Xóa vai trò tùy biến [${role.code} - ${role.name}]`,
      tenantId
    );

    return {
      success: true,
      message: 'Xóa vai trò thành công.',
    };
  }

  // --------------------------------------------------------
  // PHASE 2: DANH MỤC DÙNG CHUNG (SHARED CATEGORIES)
  // --------------------------------------------------------

  /**
   * 16. GET /api/admin/categories
   */
  async getCategories(tenantId: string, type?: string) {
    const where: any = { tenantId };
    if (type) {
      where.type = type;
    }
    return prisma.sharedCategory.findMany({
      where,
      orderBy: [{ type: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * 17. POST /api/admin/categories
   */
  async createCategory(actorUserId: string, tenantId: string, data: CreateSharedCategoryDto) {
    if (!data.type || !data.code || !data.name) {
      throw new AppError('Loại danh mục (type), mã (code) và tên (name) là bắt buộc.', 400);
    }

    const existing = await prisma.sharedCategory.findUnique({
      where: {
        tenantId_type_code: {
          tenantId,
          type: data.type,
          code: data.code,
        },
      },
    });

    if (existing) {
      throw new AppError(`Mã danh mục [${data.code}] thuộc loại [${data.type}] đã tồn tại.`, 400);
    }

    if (data.isDefault) {
      await prisma.sharedCategory.updateMany({
        where: { tenantId, type: data.type },
        data: { isDefault: false },
      });
    }

    const category = await prisma.sharedCategory.create({
      data: {
        tenantId,
        type: data.type,
        code: data.code,
        name: data.name.trim(),
        orderIndex: data.orderIndex || 0,
        isDefault: !!data.isDefault,
      },
    });

    await this.logAudit(
      actorUserId,
      'CREATE_CATEGORY',
      'CATEGORY',
      category.id,
      `Thêm danh mục [${category.type} - ${category.name}]`,
      tenantId
    );

    return category;
  }

  /**
   * 18. PATCH /api/admin/categories/:id
   */
  async updateCategory(actorUserId: string, tenantId: string, id: string, data: UpdateSharedCategoryDto) {
    const existing = await prisma.sharedCategory.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new AppError('Không tìm thấy danh mục.', 404);
    }

    if (data.isDefault) {
      await prisma.sharedCategory.updateMany({
        where: { tenantId, type: existing.type },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.sharedCategory.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : existing.name,
        orderIndex: data.orderIndex !== undefined ? data.orderIndex : existing.orderIndex,
        isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
    });

    return updated;
  }

  /**
   * 19. DELETE /api/admin/categories/:id
   */
  async deleteCategory(actorUserId: string, tenantId: string, id: string) {
    const existing = await prisma.sharedCategory.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new AppError('Không tìm thấy danh mục.', 404);
    }

    await prisma.sharedCategory.delete({ where: { id } });
    return { success: true, message: 'Xóa danh mục thành công.' };
  }

  // --------------------------------------------------------
  // PHASE 2: CẤU HÌNH CHỈ SỐ KPI (KPI DEFINITIONS)
  // --------------------------------------------------------

  /**
   * 20. GET /api/admin/kpi-definitions
   */
  async getKPIDefinitions(tenantId: string) {
    return prisma.kPIDefinition.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 21. POST /api/admin/kpi-definitions
   */
  async createKPIDefinition(actorUserId: string, tenantId: string, data: CreateKPIDefinitionDto) {
    if (!data.code || !data.name) {
      throw new AppError('Mã chỉ số (code) và tên chỉ số (name) là bắt buộc.', 400);
    }

    const existing = await prisma.kPIDefinition.findFirst({
      where: { tenantId, code: data.code },
    });
    if (existing) {
      throw new AppError(`Mã chỉ số KPI [${data.code}] đã tồn tại trong trường này.`, 400);
    }

    const kpi = await prisma.kPIDefinition.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name.trim(),
        description: data.description || null,
        unit: data.unit || 'Điểm',
        targetValue: data.targetValue !== undefined ? data.targetValue : null,
        weight: data.weight !== undefined ? data.weight : 1.0,
        applicableRoles: data.applicableRoles ? JSON.stringify(data.applicableRoles) : null,
      },
    });

    await this.logAudit(
      actorUserId,
      'CREATE_KPI_DEF',
      'KPI_DEF',
      kpi.id,
      `Tạo cấu hình chỉ số KPI: ${kpi.name}`,
      tenantId
    );

    return kpi;
  }

  /**
   * 22. PATCH /api/admin/kpi-definitions/:id
   */
  async updateKPIDefinition(actorUserId: string, tenantId: string, id: string, data: UpdateKPIDefinitionDto) {
    const existing = await prisma.kPIDefinition.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new AppError('Không tìm thấy chỉ số KPI.', 404);
    }

    const updated = await prisma.kPIDefinition.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : existing.name,
        description: data.description !== undefined ? data.description : existing.description,
        unit: data.unit !== undefined ? data.unit : existing.unit,
        targetValue: data.targetValue !== undefined ? data.targetValue : existing.targetValue,
        weight: data.weight !== undefined ? data.weight : existing.weight,
        applicableRoles: data.applicableRoles !== undefined ? JSON.stringify(data.applicableRoles) : existing.applicableRoles,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
    });

    return updated;
  }

  /**
   * 23. DELETE /api/admin/kpi-definitions/:id
   */
  async deleteKPIDefinition(actorUserId: string, tenantId: string, id: string) {
    const existing = await prisma.kPIDefinition.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new AppError('Không tìm thấy chỉ số KPI.', 404);
    }

    await prisma.kPIDefinition.delete({ where: { id } });
    return { success: true, message: 'Xóa chỉ số KPI thành công.' };
  }

  // --------------------------------------------------------
  // PHASE 2: HẠN MỨC TÀI NGUYÊN (QUOTA & USAGE)
  // --------------------------------------------------------

  /**
   * 24. GET /api/admin/quota
   * Thông tin gói cước và hạn mức tài khoản sử dụng của Tenant
   */
  async getTenantQuota(tenantId: string) {
    const subscription = await prisma.tenantSubscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });

    const activeUsersCount = await prisma.user.count({
      where: { tenantId, isActive: true },
    });

    const totalUsersCount = await prisma.user.count({
      where: { tenantId },
    });

    const attachmentAggregate = await prisma.attachment.aggregate({
      where: { tenantId },
      _sum: { fileSize: true },
      _count: { id: true },
    });

    const usedBytes = attachmentAggregate._sum.fileSize || 0;
    const usedMB = Number((usedBytes / (1024 * 1024)).toFixed(2));
    const usedGB = Number((usedBytes / (1024 * 1024 * 1024)).toFixed(3));

    const maxAccounts = subscription?.package?.maxAccounts || 100;
    const storageQuotaGB = subscription?.package?.storageQuotaGB || 20;

    return {
      tenantId,
      package: subscription?.package
        ? {
            id: subscription.package.id,
            name: subscription.package.name,
            code: subscription.package.code,
            price: subscription.package.price,
            enabledModules: subscription.package.enabledModules
              ? JSON.parse(subscription.package.enabledModules)
              : [],
          }
        : null,
      subscription: subscription
        ? {
            id: subscription.id,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            status: subscription.status,
          }
        : null,
      quota: {
        maxAccounts,
        activeAccounts: activeUsersCount,
        totalAccounts: totalUsersCount,
        remainingAccounts: Math.max(0, maxAccounts - activeUsersCount),
        accountUsagePercent: Number(((activeUsersCount / maxAccounts) * 100).toFixed(1)),
        storageQuotaGB,
        usedStorageMB: usedMB,
        usedStorageGB: usedGB,
        storageUsagePercent: Number(((usedGB / storageQuotaGB) * 100).toFixed(1)),
      },
    };
  }
}

export const adminService = new AdminService();

