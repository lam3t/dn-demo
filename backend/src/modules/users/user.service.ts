import prisma from '../../prisma';
import bcrypt from 'bcryptjs';
import { AppError } from '../../middlewares/error.middleware';
import { removeVietnameseAccents, calculateMatchScore } from '../../utils/vietnamese.utils';
import { Role, TaskAssignmentRole, TaskStatus } from '@prisma/client';

export interface UserSearchParams {
  search?: string;
  orgUnitId?: string;
  locationId?: string;
  schoolId?: string;
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

    const where: any = {
      isActive: true,
    };

    if (params.schoolId) {
      where.schoolId = params.schoolId;
    }

    if (params.locationId) {
      where.OR = [
        { primaryLocationId: params.locationId },
        { roles: { some: { scopeLocationId: params.locationId } } },
      ];
    }

    if (params.orgUnitId) {
      where.OR = [
        { primaryOrgUnitId: params.orgUnitId },
        { roles: { some: { scopeOrgUnitId: params.orgUnitId } } },
      ];
    }

    if (params.role) {
      where.roles = { some: { role: params.role } };
    }

    // Lấy tất cả user phù hợp với filter ban đầu
    const allUsers = await prisma.user.findMany({
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
      // Nếu chưa có task, lấy mặc định vài đồng nghiệp cùng tổ / điểm trường
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      const fallbackUsers = await prisma.user.findMany({
        where: {
          id: { not: userId },
          isActive: true,
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

  async getById(id: string) {
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
    primaryLocationId?: string;
    primaryOrgUnitId?: string;
    role: Role;
    scopeLocationId?: string;
    scopeOrgUnitId?: string;
  }) {
    const defaultPassword = data.password || '123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
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
    }
  ) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin nhân sự.', 404);
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

  async delete(id: string) {
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
