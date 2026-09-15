import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';

export interface UpdateSchoolInfoDto {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  principalName?: string;
  totalStudents?: number;
  totalFemaleStudents?: number;
  totalClasses?: number;
  totalStaff?: number;
  schoolYear?: string;
  description?: string;
  statsJson?: string;
}

export class SchoolService {
  async getSchoolInfo(schoolId?: string, tenantId?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    else if (schoolId) where.id = schoolId;

    let school = await prisma.school.findFirst({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        locations: {
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
          orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            orgUnits: true,
            users: true,
            plans: true,
            tasks: true,
          },
        },
      },
    });

    if (!school) {
      throw new AppError('Không tìm thấy thông tin trường học.', 404);
    }

    let parsedStats: any[] = [];
    if (school.statsJson) {
      try {
        parsedStats = JSON.parse(school.statsJson);
      } catch (e) {
        parsedStats = [];
      }
    }

    return {
      id: school.id,
      name: school.name,
      code: school.code,
      address: school.address,
      phone: school.phone,
      email: school.email,
      website: school.website || null,
      principalName: school.principalName || null,
      totalStudents: school.totalStudents || 0,
      totalFemaleStudents: school.totalFemaleStudents || 0,
      totalClasses: school.totalClasses || 0,
      totalStaff: school.totalStaff || 0,
      schoolYear: school.schoolYear || '2026-2027',
      description: school.description,
      gradeMatrix: parsedStats,
      locations: school.locations,
      totalOrgUnits: school._count.orgUnits,
      totalPlans: school._count.plans,
      totalTasks: school._count.tasks,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };
  }

  async updateSchoolInfo(schoolId: string, data: UpdateSchoolInfoDto) {
    const existing = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin trường học.', 404);
    }

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.principalName !== undefined && { principalName: data.principalName }),
        ...(data.totalStudents !== undefined && { totalStudents: Number(data.totalStudents) }),
        ...(data.totalFemaleStudents !== undefined && { totalFemaleStudents: Number(data.totalFemaleStudents) }),
        ...(data.totalClasses !== undefined && { totalClasses: Number(data.totalClasses) }),
        ...(data.totalStaff !== undefined && { totalStaff: Number(data.totalStaff) }),
        ...(data.schoolYear !== undefined && { schoolYear: data.schoolYear }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.statsJson !== undefined && { statsJson: data.statsJson }),
      },
    });

    return updated;
  }
}

export const schoolService = new SchoolService();
