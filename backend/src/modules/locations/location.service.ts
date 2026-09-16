import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { TaskStatus } from '@prisma/client';
import appCache from '../../utils/cache';
import { resolveTenantId } from '../../utils/tenant.util';

export class LocationService {
  async getAll(schoolId?: string, tenantId?: string) {
    let effectiveTenantId = tenantId;
    if (!effectiveTenantId && schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { tenantId: true },
      });
      if (school) effectiveTenantId = school.tenantId;
    }

    const where: any = {};
    if (effectiveTenantId) {
      where.tenantId = effectiveTenantId;
    } else if (schoolId) {
      where.schoolId = schoolId;
    }

    const cacheKey = `locations:all:${effectiveTenantId || schoolId || 'all'}`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const locations = await prisma.location.findMany({
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

    const now = new Date();

    const summaries = await Promise.all(
      locations.map(async (loc) => {
        const [inProgressTaskCount, overdueTaskCount, completedTaskCount] = await Promise.all([
          prisma.task.count({
            where: {
              locationId: loc.id,
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
              locationId: loc.id,
              dueDate: { lt: now },
              status: {
                notIn: [TaskStatus.HOAN_THANH, TaskStatus.XAC_NHAN, TaskStatus.DONG, TaskStatus.HUY],
              },
            },
          }),
          prisma.task.count({
            where: {
              locationId: loc.id,
              status: {
                in: [TaskStatus.HOAN_THANH, TaskStatus.XAC_NHAN, TaskStatus.DONG],
              },
            },
          }),
        ]);

        return {
          id: loc.id,
          name: loc.name,
          code: loc.code,
          address: loc.address,
          phone: loc.phone,
          isMain: loc.isMain,
          managerId: loc.managerId,
          manager: loc.manager,
          studentCount: loc.studentCount || 0,
          femaleStudentCount: loc.femaleStudentCount || 0,
          classCount: loc.classCount || 0,
          userCount: loc._count.users,
          totalTaskCount: loc._count.tasks,
          inProgressTaskCount,
          overdueTaskCount,
          completedTaskCount,
        };
      })
    );

    appCache.set(cacheKey, summaries, 30, ['locations', 'tasks', 'school']);
    return summaries;
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

    return {
      ...location,
      userCount: location._count.users,
      totalTaskCount: location._count.tasks,
    };
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
          where: { primaryLocationId: id, isActive: true },
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
      managerId: location.managerId,
      manager: location.manager,
      studentCount: location.studentCount || 0,
      femaleStudentCount: location.femaleStudentCount || 0,
      classCount: location.classCount || 0,
      userCount,
      inProgressTaskCount,
      overdueTaskCount,
      completedTaskCount,
      totalTaskCount,
    };
  }

  async syncSchoolAggregates(schoolId: string) {
    if (!schoolId) return;
    try {
      const [locations, activeUsersCount] = await Promise.all([
        prisma.location.findMany({
          where: { schoolId },
          select: {
            studentCount: true,
            femaleStudentCount: true,
            classCount: true,
          },
        }),
        prisma.user.count({
          where: { schoolId, isActive: true },
        }),
      ]);

      const totalStudents = locations.reduce((sum, l) => sum + (l.studentCount || 0), 0);
      const totalFemaleStudents = locations.reduce((sum, l) => sum + (l.femaleStudentCount || 0), 0);
      const totalClasses = locations.reduce((sum, l) => sum + (l.classCount || 0), 0);

      await prisma.school.update({
        where: { id: schoolId },
        data: {
          totalStudents,
          totalFemaleStudents,
          totalClasses,
          totalStaff: activeUsersCount,
        },
      });
    } catch (e) {
      console.error('Error syncing school aggregates:', e);
    }
  }

  async create(data: {
    schoolId: string;
    tenantId?: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    isMain?: boolean;
    managerId?: string | null;
    studentCount?: number;
    femaleStudentCount?: number;
    classCount?: number;
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

    const tenantId = await resolveTenantId(data.schoolId, data.tenantId);

    const created = await prisma.location.create({
      data: {
        tenantId,
        schoolId: data.schoolId,
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        isMain: data.isMain ?? false,
        managerId: data.managerId || null,
        studentCount: data.studentCount !== undefined ? Math.max(0, Number(data.studentCount)) : 0,
        femaleStudentCount: data.femaleStudentCount !== undefined ? Math.max(0, Number(data.femaleStudentCount)) : 0,
        classCount: data.classCount !== undefined ? Math.max(0, Number(data.classCount)) : 0,
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
        _count: {
          select: {
            users: true,
            tasks: true,
          },
        },
      },
    });

    await this.syncSchoolAggregates(data.schoolId);
    appCache.invalidateTags(['locations', 'dashboard', 'users', 'school']);
    return {
      ...created,
      userCount: created._count?.users || 0,
      totalTaskCount: created._count?.tasks || 0,
    };
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
      studentCount?: number;
      femaleStudentCount?: number;
      classCount?: number;
      schoolYear?: string;
    }
  ) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin điểm trường.', 404);
    }

    if (data.managerId) {
      const mgr = await prisma.user.findUnique({ where: { id: data.managerId } });
      if (!mgr) {
        throw new AppError('Người phụ trách điểm trường không tồn tại.', 400);
      }
    }

    if (data.isMain === true) {
      await prisma.location.updateMany({
        where: { schoolId: existing.schoolId, isMain: true, id: { not: id } },
        data: { isMain: false },
      });
    }

    const normYear = (data.schoolYear || '2026-2027').replace(/\s+/g, '').replace(/Nămhọc/gi, '') || '2026-2027';
    const isCurrentYear = normYear === '2026-2027';

    // Update main Location DB record if current year or metadata changed
    const updated = await prisma.location.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code.toUpperCase().trim() }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.isMain !== undefined && { isMain: Boolean(data.isMain) }),
        ...(data.managerId !== undefined && { managerId: data.managerId ? data.managerId : null }),
        ...(isCurrentYear && data.studentCount !== undefined && { studentCount: Math.max(0, Number(data.studentCount)) }),
        ...(isCurrentYear && data.femaleStudentCount !== undefined && { femaleStudentCount: Math.max(0, Number(data.femaleStudentCount)) }),
        ...(isCurrentYear && data.classCount !== undefined && { classCount: Math.max(0, Number(data.classCount)) }),
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
        _count: {
          select: {
            users: true,
            tasks: true,
          },
        },
      },
    });

    // Update School.statsJson for year-specific breakdown
    try {
      const school = await prisma.school.findUnique({
        where: { id: existing.schoolId },
        include: { locations: true },
      });
      if (school) {
        let statsData: any = {};
        if (school.statsJson) {
          try {
            const parsed = JSON.parse(school.statsJson);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              statsData = parsed;
            }
          } catch (e) {}
        }
        if (!statsData.years) statsData.years = {};
        if (!statsData.years[normYear]) {
          const parts = normYear.split('-');
          statsData.years[normYear] = {
            schoolYear: parts.length === 2 ? `${parts[0]} - ${parts[1]}` : normYear,
            locations: {},
          };
          // Seed existing locations into this year
          school.locations.forEach((l) => {
            statsData.years[normYear].locations[l.id] = {
              studentCount: l.studentCount || 0,
              femaleStudentCount: l.femaleStudentCount || 0,
              classCount: l.classCount || 0,
            };
          });
        }
        if (!statsData.years[normYear].locations) {
          statsData.years[normYear].locations = {};
        }

        const existingLocData = statsData.years[normYear].locations[id] || {};
        statsData.years[normYear].locations[id] = {
          ...existingLocData,
          studentCount: data.studentCount !== undefined ? Math.max(0, Number(data.studentCount)) : (existingLocData.studentCount ?? updated.studentCount ?? 0),
          femaleStudentCount: data.femaleStudentCount !== undefined ? Math.max(0, Number(data.femaleStudentCount)) : (existingLocData.femaleStudentCount ?? updated.femaleStudentCount ?? 0),
          classCount: data.classCount !== undefined ? Math.max(0, Number(data.classCount)) : (existingLocData.classCount ?? updated.classCount ?? 0),
        };

        // Recalculate year aggregates
        const locVals = Object.values(statsData.years[normYear].locations) as any[];
        statsData.years[normYear].totalStudents = locVals.reduce((sum, l) => sum + (l.studentCount || 0), 0);
        statsData.years[normYear].totalFemaleStudents = locVals.reduce((sum, l) => sum + (l.femaleStudentCount || 0), 0);
        statsData.years[normYear].totalClasses = locVals.reduce((sum, l) => sum + (l.classCount || 0), 0);
        statsData.years[normYear].totalStaff = (school as any)?._count ? (school as any)._count.users : (updated as any)?._count?.users || 0;

        await prisma.school.update({
          where: { id: school.id },
          data: { statsJson: JSON.stringify(statsData) },
        });
      }
    } catch (e) {
      console.error('Error persisting year statsJson:', e);
    }

    if (isCurrentYear) {
      await this.syncSchoolAggregates(existing.schoolId);
    }

    appCache.invalidateTags(['locations', 'dashboard', 'users', 'school']);

    const yearLocData = (data.studentCount !== undefined || data.classCount !== undefined)
      ? {
          studentCount: data.studentCount !== undefined ? Math.max(0, Number(data.studentCount)) : updated.studentCount,
          femaleStudentCount: data.femaleStudentCount !== undefined ? Math.max(0, Number(data.femaleStudentCount)) : updated.femaleStudentCount,
          classCount: data.classCount !== undefined ? Math.max(0, Number(data.classCount)) : updated.classCount,
        }
      : {};

    return {
      ...updated,
      ...yearLocData,
      userCount: updated._count?.users || 0,
      totalTaskCount: updated._count?.tasks || 0,
    };
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

    const deleted = await prisma.location.delete({ where: { id } });
    await this.syncSchoolAggregates(existing.schoolId);
    appCache.invalidateTags(['locations', 'dashboard', 'users', 'school']);
    return deleted;
  }
}

export const locationService = new LocationService();

