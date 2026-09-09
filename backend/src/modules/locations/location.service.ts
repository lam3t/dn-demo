import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { TaskStatus } from '@prisma/client';

export class LocationService {
  async getAll(schoolId?: string) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;

    return prisma.location.findMany({
      where,
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            title: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            users: true,
            tasks: true,
          },
        },
      },
    });
  }

  async getById(id: string) {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            title: true,
            avatarUrl: true,
          },
        },
        users: {
          select: {
            id: true,
            fullName: true,
            title: true,
            phone: true,
            email: true,
            avatarUrl: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            users: true,
            tasks: true,
          },
        },
      },
    });

    if (!location) {
      throw new AppError('Không tìm thấy thông tin điểm trường.', 404);
    }

    return location;
  }

  async getSummary(id: string) {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            title: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!location) {
      throw new AppError('Không tìm thấy thông tin điểm trường.', 404);
    }

    const now = new Date();

    const [userCount, inProgressTaskCount, completedTaskCount, overdueTaskCount, totalTaskCount] =
      await Promise.all([
        prisma.user.count({
          where: { primaryLocationId: id },
        }),
        prisma.task.count({
          where: {
            locationId: id,
            status: {
              in: [
                TaskStatus.DA_GIAO,
                TaskStatus.DA_TIEP_NHAN,
                TaskStatus.DANG_THUC_HIEN,
                TaskStatus.CHO_KIEM_TRA,
                TaskStatus.BO_SUNG,
              ],
            },
          },
        }),
        prisma.task.count({
          where: {
            locationId: id,
            status: {
              in: [TaskStatus.HOAN_THANH, TaskStatus.XAC_NHAN, TaskStatus.DONG],
            },
          },
        }),
        prisma.task.count({
          where: {
            locationId: id,
            dueDate: { lt: now },
            status: {
              notIn: [TaskStatus.HOAN_THANH, TaskStatus.XAC_NHAN, TaskStatus.DONG, TaskStatus.HUY],
            },
          },
        }),
        prisma.task.count({
          where: { locationId: id },
        }),
      ]);

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      address: location.address,
      phone: location.phone,
      isMain: location.isMain,
      manager: location.manager,
      userCount,
      inProgressTaskCount,
      overdueTaskCount,
      completedTaskCount,
      totalTaskCount,
    };
  }

  async create(data: {
    schoolId: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    isMain?: boolean;
    managerId?: string | null;
  }) {
    if (data.managerId) {
      const mgr = await prisma.user.findUnique({ where: { id: data.managerId } });
      if (!mgr) {
        throw new AppError('Người phụ trách điểm trường không tồn tại.', 400);
      }
    }

    // Nếu điểm trường này là điểm chính, bỏ cờ isMain ở các điểm khác
    if (data.isMain) {
      await prisma.location.updateMany({
        where: { schoolId: data.schoolId, isMain: true },
        data: { isMain: false },
      });
    }

    return prisma.location.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        code: data.code.toUpperCase().trim(),
        address: data.address,
        phone: data.phone,
        isMain: data.isMain ?? false,
        managerId: data.managerId || null,
      },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            title: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      code?: string;
      address?: string;
      phone?: string;
      isMain?: boolean;
      managerId?: string | null;
    }
  ) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin điểm trường.', 404);
    }

    if (data.managerId !== undefined && data.managerId !== null) {
      const mgr = await prisma.user.findUnique({ where: { id: data.managerId } });
      if (!mgr) {
        throw new AppError('Người phụ trách điểm trường không tồn tại.', 400);
      }
    }

    if (data.isMain) {
      await prisma.location.updateMany({
        where: { schoolId: existing.schoolId, isMain: true, id: { not: id } },
        data: { isMain: false },
      });
    }

    return prisma.location.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code.toUpperCase().trim() }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.isMain !== undefined && { isMain: data.isMain }),
        ...(data.managerId !== undefined && { managerId: data.managerId }),
      },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            title: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const existing = await prisma.location.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Không tìm thấy thông tin điểm trường.', 404);
    }

    const [userCount, taskCount] = await Promise.all([
      prisma.user.count({ where: { primaryLocationId: id } }),
      prisma.task.count({ where: { locationId: id } }),
    ]);

    if (userCount > 0 || taskCount > 0) {
      throw new AppError(
        `Không thể xoá điểm trường vì đang có ${userCount} nhân sự và ${taskCount} công việc đang gắn kết.`,
        400
      );
    }

    return prisma.location.delete({ where: { id } });
  }
}

export const locationService = new LocationService();
