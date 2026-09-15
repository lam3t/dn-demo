import prisma from '../../prisma';
import bcrypt from 'bcryptjs';
import { AppError } from '../../middlewares/error.middleware';
import { removeVietnameseAccents, calculateMatchScore } from '../../utils/vietnamese.utils';
import { Role, TaskAssignmentRole, TaskStatus } from '@prisma/client';
import appCache from '../../utils/cache';
import { resolveTenantId } from '../../utils/tenant.util';

export interface UserSearchParams {
  search?: string;
  orgUnitId?: string;
  locationId?: string;
  schoolId?: string;
  tenantId?: string;
  isSystemAdmin?: boolean;
  role?: Role;
  page?: number;
  pageSize?: number;
}

export class UserService {
  /**
   * API Cốt lõi cho People Picker:
   * - Tìm kiếm không phân biệt dấu tiếng Việt
   * - Tính tải công việc hiện tại (currentTaskLoad)
   * - Sắp xếp theo độ liên quan và phân trang
   */
  async searchUsers(params: UserSearchParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const searchQuery = (params.search || '').trim();

    let effectiveTenantId = params.tenantId;
    if (!effectiveTenantId && params.schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: params.schoolId },
        select: { tenantId: true },
      });
      if (school) effectiveTenantId = school.tenantId;
    }

    // Nếu không phải System Admin, bắt buộc phải có tenantId/schoolId
    if (!params.isSystemAdmin && !effectiveTenantId && !params.schoolId) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }

    // Cache toàn bộ user directory cho People Picker trong 30s
    const tenantScope = effectiveTenantId || params.schoolId || 'all';
    const dirCacheKey = `users:directory:${tenantScope}`;
    let allUsers = appCache.get<any[]>(dirCacheKey);

    if (!allUsers) {
      const where: any = {
        isActive: true,
      };
      if (effectiveTenantId) {
        where.tenantId = effectiveTenantId;
      } else if (params.schoolId) {
        where.schoolId = params.schoolId;
      }

      if (!params.isSystemAdmin) {
        where.isSystemAdmin = false;
      }

      allUsers = await prisma.user.findMany({
        where,
        include: {
          primaryLocation: { select: { id: true, name: true, code: true } },
          primaryOrgUnit: { select: { id: true, name: true, code: true } },
          roles: {
            select: {
              role: true,
              scopeLocationId: true,
              scopeOrgUnitId: true,
              scopeLocation: { select: { id: true, name: true } },
              scopeOrgUnit: { select: { id: true, name: true } },
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
      appCache.set(dirCacheKey, allUsers, 30, ['users', 'tasks']);
    }

    // Lọc theo locationId, orgUnitId, role trong bộ nhớ
    let filteredUsers = allUsers;
    if (params.locationId) {
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.primaryLocationId === params.locationId ||
          u.roles.some((r: any) => r.scopeLocationId === params.locationId)
      );
    }

    if (params.orgUnitId) {
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.primaryOrgUnitId === params.orgUnitId ||
          u.roles.some((r: any) => r.scopeOrgUnitId === params.orgUnitId)
      );
    }

    if (params.role) {
      filteredUsers = filteredUsers.filter((u) => u.roles.some((r: any) => r.role === params.role));
    }

    // Tính điểm và lọc theo tiếng Việt không dấu nếu có searchQuery
    let scoredUsers = allUsers.map((u) => {
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
        primaryLocation: u.primaryLocation,
        primaryOrgUnit: u.primaryOrgUnit,
        roles: u.roles,
        currentTaskLoad: u.taskAssignments.length,
        score,
      };
    });

    // Lọc bỏ những user không khớp tìm kiếm nếu có query
    if (searchQuery) {
      scoredUsers = scoredUsers.filter((u) => u.score > 0);
    }

    // Sắp xếp: Độ khớp cao nhất -> Tải công việc ít nhất -> Tên A-Z
    scoredUsers.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.currentTaskLoad !== b.currentTaskLoad) {
        return a.currentTaskLoad - b.currentTaskLoad;
      }
      return a.fullName.localeCompare(b.fullName, 'vi');
    });

    const total = scoredUsers.length;
    const totalPages = Math.ceil(total / pageSize);
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
   * Lấy danh sách người hay phối hợp gần đây với user hiện tại
   */
  async getRecentCollaborators(userId: string, limit = 8) {
    // Tìm các task mà userId này từng tham gia
    const userTasks = await prisma.taskAssignment.findMany({
      where: { userId },
      select: { taskId: true },
    });

    const taskIds = userTasks.map((t) => t.taskId);

    if (taskIds.length === 0) {
      // Nếu chưa có task, lấy mặc định vài đồng nghiệp cùng tổ / điểm trường trong cùng tenant
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      const fallbackUsers = await prisma.user.findMany({
        where: {
          id: { not: userId },
          isActive: true,
          isSystemAdmin: false,
          ...(currentUser?.tenantId ? { tenantId: currentUser.tenantId } : {}),
          OR: [
            { primaryOrgUnitId: currentUser?.primaryOrgUnitId },
            { primaryLocationId: currentUser?.primaryLocationId },
          ],
        },
        take: limit,
        include: {
          primaryLocation: { select: { id: true, name: true, code: true } },
          primaryOrgUnit: { select: { id: true, name: true, code: true } },
          roles: true,
          taskAssignments: {
            where: {
              role: { in: [TaskAssignmentRole.CHU_TRI, TaskAssignmentRole.PHOI_HOP] },
              task: { status: { notIn: [TaskStatus.DONG, TaskStatus.HUY, TaskStatus.HOAN_THANH] } },
            },
          },
        },
      });

      return fallbackUsers.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        title: u.title,
        avatarUrl: u.avatarUrl,
        primaryLocation: u.primaryLocation,
        primaryOrgUnit: u.primaryOrgUnit,
        roles: u.roles,
        currentTaskLoad: u.taskAssignments.length,
        sharedTaskCount: 0,
      }));
    }

    // Tìm các TaskAssignment khác cùng các taskId này
    const sharedAssignments = await prisma.taskAssignment.findMany({
      where: {
        taskId: { in: taskIds },
        userId: { not: userId },
      },
      include: {
        user: {
          include: {
            primaryLocation: { select: { id: true, name: true, code: true } },
            primaryOrgUnit: { select: { id: true, name: true, code: true } },
            roles: true,
            taskAssignments: {
              where: {
                role: { in: [TaskAssignmentRole.CHU_TRI, TaskAssignmentRole.PHOI_HOP] },
                task: { status: { notIn: [TaskStatus.DONG, TaskStatus.HUY, TaskStatus.HOAN_THANH] } },
              },
            },
          },
        },
      },
    });

    // Thống kê số lượng task dùng chung
    const collaboratorMap = new Map<string, { user: any; count: number }>();
    sharedAssignments.forEach((sa) => {
      if (!sa.user || !sa.user.isActive) return;
      const existing = collaboratorMap.get(sa.userId);
      if (existing) {
        existing.count += 1;
      } else {
        collaboratorMap.set(sa.userId, { user: sa.user, count: 1 });
      }
    });

    const sorted = Array.from(collaboratorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sorted.map(({ user: u, count }) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      title: u.title,
      avatarUrl: u.avatarUrl,
      primaryLocation: u.primaryLocation,
      primaryOrgUnit: u.primaryOrgUnit,
      roles: u.roles,
      currentTaskLoad: u.taskAssignments.length,
      sharedTaskCount: count,
    }));
  }

  async getById(id: string, tenantId?: string, isSystemAdmin?: boolean) {
    const user = await prisma.user.findUnique({
      where: { id },
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
        taskAssignments: {
          include: {
            task: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Không tìm thấy thông tin nhân sự.', 404);
    }

    if (!isSystemAdmin) {
      if (user.isSystemAdmin) {
        throw new AppError('Không thể xem tài khoản Quản trị viên nền tảng (System Admin).', 403);
      }
      if (tenantId && user.tenantId && user.tenantId !== tenantId) {
        throw new AppError('Bạn không có quyền xem tài khoản của trường/đơn vị khác.', 403);
      }
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async create(data: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
    title?: string;
    avatarUrl?: string;
    schoolId: string;
    tenantId?: string;
    primaryLocationId?: string;
    primaryOrgUnitId?: string;
    role: Role;
    scopeLocationId?: string;
    scopeOrgUnitId?: string;
  }) {
    const defaultPassword = data.password || '123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const tenantId = await resolveTenantId(data.schoolId, data.tenantId);

    const user = await prisma.user.create({
      data: {
        tenantId,
        fullName: data.fullName,
        email: data.email.toLowerCase().trim(),
        phone: data.phone.trim(),
        passwordHash,
        title: data.title,
        avatarUrl:
          data.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=1F3864&color=fff`,
        schoolId: data.schoolId,
        primaryLocationId: data.primaryLocationId,
        primaryOrgUnitId: data.primaryOrgUnitId,
        roles: {
          create: {
            role: data.role,
            scopeLocationId: data.scopeLocationId || null,
            scopeOrgUnitId: data.scopeOrgUnitId || null,
          },
        },
      },
      include: {
        primaryLocation: true,
        primaryOrgUnit: true,
        roles: true,
      },
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async update(
    id: string,
    data: {
      fullName?: string;
      phone?: string;
      title?: string;
      avatarUrl?: string;
      primaryLocationId?: string;
      primaryOrgUnitId?: string;
      isActive?: boolean;
    },
    tenantId?: string,
    isSystemAdmin?: boolean
  ) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin nhân sự.', 404);
    }

    if (!isSystemAdmin) {
      if (existing.isSystemAdmin) {
        throw new AppError('Không thể thao tác trên tài khoản Quản trị viên nền tảng (System Admin).', 403);
      }
      if (tenantId && existing.tenantId && existing.tenantId !== tenantId) {
        throw new AppError('Bạn không có quyền thao tác trên tài khoản của trường/đơn vị khác.', 403);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.phone && { phone: data.phone.trim() }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.primaryLocationId !== undefined && { primaryLocationId: data.primaryLocationId }),
        ...(data.primaryOrgUnitId !== undefined && { primaryOrgUnitId: data.primaryOrgUnitId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        primaryLocation: true,
        primaryOrgUnit: true,
        roles: true,
      },
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async delete(id: string, tenantId?: string, isSystemAdmin?: boolean) {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { taskAssignments: true, createdTasks: true },
        },
      },
    });

    if (!existing) {
      throw new AppError('Không tìm thấy thông tin nhân sự.', 404);
    }

    if (!isSystemAdmin) {
      if (existing.isSystemAdmin) {
        throw new AppError('Không thể thao tác trên tài khoản Quản trị viên nền tảng (System Admin).', 403);
      }
      if (tenantId && existing.tenantId && existing.tenantId !== tenantId) {
        throw new AppError('Bạn không có quyền thao tác trên tài khoản của trường/đơn vị khác.', 403);
      }
    }

    if (existing._count.taskAssignments > 0 || existing._count.createdTasks > 0) {
      // Đổi trạng thái isActive = false thay vì xóa cứng
      return prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.user.delete({ where: { id } });
  }
}

export const userService = new UserService();
