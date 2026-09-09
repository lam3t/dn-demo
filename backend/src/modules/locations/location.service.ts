import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';

export class LocationService {
  async getAll(schoolId?: string) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;

    return prisma.location.findMany({
      where,
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      include: {
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
        users: {
          select: {
            id: true,
            fullName: true,
            title: true,
            phone: true,
            email: true,
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

    if (!location) {
      throw new AppError('Không tìm thấy thông tin điểm trường.', 404);
    }

    return location;
  }

  async create(data: {
    schoolId: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    isMain?: boolean;
  }) {
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
    }
  ) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin điểm trường.', 404);
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
      },
    });
  }

  async delete(id: string) {
    const existing = await prisma.location.findUnique({
      where: { id },
      include: { _count: { select: { users: true, tasks: true } } },
    });

    if (!existing) {
      throw new AppError('Không tìm thấy thông tin điểm trường.', 404);
    }

    if (existing._count.users > 0 || existing._count.tasks > 0) {
      throw new AppError(
        'Không thể xóa điểm trường đang có giáo viên trực thuộc hoặc công việc gắn kết.',
        400
      );
    }

    return prisma.location.delete({ where: { id } });
  }
}

export const locationService = new LocationService();
