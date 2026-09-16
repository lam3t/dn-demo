import { prisma } from '../../../prisma';

export interface RegisterSpecialCaseDto {
  tenantId: string;
  employeeId: string;
  periodId: string;
  caseType: string;
  resolution: string;
  note?: string;
  attachments?: any;
  approvedById?: string;
}

export class SpecialCaseService {
  /**
   * Đăng ký trường hợp đặc biệt không tính điểm quý này
   */
  static async registerSpecialCase(dto: RegisterSpecialCaseDto) {
    const { tenantId, employeeId, periodId, caseType, resolution, note, attachments, approvedById } = dto;

    const record = await prisma.kpiSpecialCase.create({
      data: {
        tenantId,
        employeeId,
        periodId,
        caseType,
        resolution,
        note,
        attachments: attachments || null,
        approvedById: approvedById || null,
      },
    });

    // Cập nhật trạng thái isCarriedForward vào KpiScoreRecord nếu đã có
    await prisma.kpiScoreRecord.upsert({
      where: {
        tenantId_employeeId_periodId: {
          tenantId,
          employeeId,
          periodId,
        },
      },
      update: {
        isCarriedForward: true,
        overrideReason: `Trường hợp đặc biệt: ${caseType} (${resolution})`,
      },
      create: {
        tenantId,
        employeeId,
        periodId,
        groupType: 2,
        isCarriedForward: true,
        overrideReason: `Trường hợp đặc biệt: ${caseType} (${resolution})`,
      },
    });

    return record;
  }

  /**
   * Lấy danh sách các trường hợp đặc biệt trong kỳ
   */
  static async getSpecialCases(tenantId: string, periodId?: string) {
    return prisma.kpiSpecialCase.findMany({
      where: {
        tenantId,
        periodId: periodId || undefined,
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            title: true,
            primaryOrgUnit: { select: { name: true } },
          },
        },
        approvedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Kiểm tra xem nhân sự có thuộc trường hợp đặc biệt được dồn kỳ sau hay không
   */
  static async checkSpecialCase(tenantId: string, employeeId: string, periodId: string) {
    return prisma.kpiSpecialCase.findFirst({
      where: {
        tenantId,
        employeeId,
        periodId,
      },
    });
  }
}
