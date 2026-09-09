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
  async getSchoolInfo(schoolId?: string) {
    let school = await prisma.school.findFirst({
      where: schoolId ? { id: schoolId } : undefined,
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

    // Default detailed grade matrix according to THCS Phuoc Tan spec
    const defaultGradeMatrix = [
      {
        locationId: 'main',
        locationName: 'Điểm chính (Trung tâm)',
        grade6: { classes: 10, students: 494, female: 240 },
        grade7: { classes: 10, students: 527, female: 255 },
        grade8: { classes: 13, students: 565, female: 270 },
        grade9: { classes: 11, students: 551, female: 262 },
        total: { classes: 44, students: 2137, female: 1027, avgPerClass: 48.6 },
      },
      {
        locationId: 'ph1',
        locationName: 'Phân hiệu 1 (Tân Lập)',
        grade6: { classes: 16, students: 746, female: 365 },
        grade7: { classes: 12, students: 570, female: 285 },
        grade8: { classes: 14, students: 601, female: 300 },
        grade9: { classes: 17, students: 771, female: 389 },
        total: { classes: 59, students: 2688, female: 1339, avgPerClass: 45.6 },
      },
      {
        locationId: 'ph2',
        locationName: 'Phân hiệu 2 (Vườn Dừa)',
        grade6: { classes: 5, students: 198, female: 97 },
        grade7: { classes: 5, students: 241, female: 111 },
        grade8: { classes: 4, students: 179, female: 59 },
        grade9: { classes: 5, students: 226, female: 103 },
        total: { classes: 19, students: 844, female: 370, avgPerClass: 44.4 },
      },
    ];

    let parsedStats = defaultGradeMatrix;
    if (school.statsJson) {
      try {
        parsedStats = JSON.parse(school.statsJson);
      } catch (e) {
        parsedStats = defaultGradeMatrix;
      }
    }

    return {
      id: school.id,
      name: school.name,
      code: school.code,
      address: school.address,
      phone: school.phone,
      email: school.email,
      website: school.website || 'http://thcsphuoctan.edu.vn',
      principalName: school.principalName || 'Phạm Thị Nam',
      totalStudents: school.totalStudents || 5669,
      totalFemaleStudents: school.totalFemaleStudents || 2736,
      totalClasses: school.totalClasses || 122,
      totalStaff: school.totalStaff || 218,
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
