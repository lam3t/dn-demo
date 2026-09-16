import { prisma } from '../../prisma';
import ExcelJS from 'exceljs';
import { AxisApplicabilityService } from './services/axis-applicability.service';
import { TaskAxisValidationService } from './services/task-axis-validation.service';
import { ScoreCalculationService, ScoreCalculationResult } from './services/score-calculation.service';
import { ClassificationService } from './services/classification.service';
import { SpecialCaseService } from './services/special-case.service';
import { AnnualRollupService } from './services/annual-rollup.service';
import { DEFAULT_KPI_AXES } from './kpi.constants';

export interface UserKpiDetail {
  record: any;
  manualScores?: any;
  calculatedSummary?: any;
  user: {
    id: string;
    fullName: string;
    title: string | null;
    email: string;
    phone: string;
    orgUnitName?: string;
    locationName?: string;
  };
  taskBreakdown: {
    total: number;
    completedBeforeDeadline: number;
    completedOnTime: number;
    completedLate: number;
    uncompleted: number;
  };
  scores: {
    scoreA_Quantity: number;
    scoreB_Quality: number;
    scoreC_Timeline: number;
    scoreD_Leadership: number;
    finalScore: number;
    rating: string;
    ratingCategory: string;
    ratingColor: string;
  };
  tasks: Array<{
    id: string;
    code: string | null;
    title: string;
    status: string;
    priority: string;
    progressPercent: number;
    dueDate: Date | null;
    completedAt: Date | null;
    evaluationRating: string | null;
    timingCategory: 'BEFORE_DEADLINE' | 'ON_TIME' | 'LATE' | 'UNCOMPLETED';
    weight: number;
  }>;
}

export class KpiService {
  // =========================================================================
  // 1. QUẢN LÝ KỲ ĐÁNH GIÁ (EVALUATION PERIODS)
  // =========================================================================

  /**
   * Parse chuỗi năm học (vd: "2026-2027", "2027-2028", "2026 - 2027") thành năm số
   */
  static parseSchoolYear(schoolYearStr: string = '2026-2027') {
    const clean = schoolYearStr.replace(/\s+/g, '');
    const match = clean.match(/^(\d{4})-(\d{4})$/);
    if (match) {
      return {
        startYear: parseInt(match[1], 10),
        endYear: parseInt(match[2], 10),
        code: `${match[1]}-${match[2]}`,
      };
    }
    const single = parseInt(clean, 10);
    if (!isNaN(single) && single >= 2000 && single <= 2100) {
      return {
        startYear: single,
        endYear: single + 1,
        code: `${single}-${single + 1}`,
      };
    }
    const currentYear = new Date().getFullYear();
    return {
      startYear: currentYear,
      endYear: currentYear + 1,
      code: `${currentYear}-${currentYear + 1}`,
    };
  }

  /**
   * Đảm bảo đủ 4 Quý đánh giá trong năm học theo quy định Sở GD&ĐT
   * Tự động sinh động 4 Quý cho BẤT KỲ năm học nào (vd: 2025-2026, 2026-2027, 2027-2028, 2028-2029, ...)
   * Tự động xác định trạng thái 'closed', 'open', 'draft' dựa trên thời gian thực tế.
   */
  static async ensureStandardQuarters(tenantId: string, schoolYear: string = '2026-2027') {
    const { startYear, endYear, code: yearCode } = this.parseSchoolYear(schoolYear);
    const now = new Date();

    // Chu kỳ 4 Quý theo Năm học tại Việt Nam (Bắt đầu từ tháng 7 năm trước đến tháng 6 năm sau):
    // 1. Quý III / startYear (01/07 - 30/09 năm trước): Quý đệm chuyển giao / Khởi động năm học mới
    // 2. Quý IV / startYear (01/10 - 31/12 năm trước): Giai đoạn Học kỳ 1
    // 3. Quý I / endYear (01/01 - 31/03 năm sau): Giai đoạn giữa Học kỳ 2
    // 4. Quý II / endYear (01/04 - 30/06 năm sau): Giai đoạn cuối Học kỳ 2, thi cử, tổng kết & xét thi đua
    const quarterDefinitions = [
      {
        quarterIndex: 1,
        name: `Quý III/${startYear}`,
        code: `QUY_3_${startYear}`,
        startDate: new Date(`${startYear}-07-01T00:00:00.000Z`),
        endDate: new Date(`${startYear}-09-30T23:59:59.999Z`),
        submissionDeadline: new Date(`${startYear}-09-25T23:59:59.999Z`),
      },
      {
        quarterIndex: 2,
        name: `Quý IV/${startYear}`,
        code: `QUY_4_${startYear}`,
        startDate: new Date(`${startYear}-10-01T00:00:00.000Z`),
        endDate: new Date(`${startYear}-12-31T23:59:59.999Z`),
        submissionDeadline: new Date(`${startYear}-12-25T23:59:59.999Z`),
      },
      {
        quarterIndex: 3,
        name: `Quý I/${endYear}`,
        code: `QUY_1_${endYear}`,
        startDate: new Date(`${endYear}-01-01T00:00:00.000Z`),
        endDate: new Date(`${endYear}-03-31T23:59:59.999Z`),
        submissionDeadline: new Date(`${endYear}-03-25T23:59:59.999Z`),
      },
      {
        quarterIndex: 4,
        name: `Quý II/${endYear}`,
        code: `QUY_2_${endYear}`,
        startDate: new Date(`${endYear}-04-01T00:00:00.000Z`),
        endDate: new Date(`${endYear}-06-30T23:59:59.999Z`),
        submissionDeadline: new Date(`${endYear}-06-25T23:59:59.999Z`),
      },
    ];

    for (const q of quarterDefinitions) {
      let status: 'closed' | 'open' | 'draft' = 'open';
      if (now > q.endDate) {
        status = 'closed';
      } else if (now >= q.startDate && now <= q.endDate) {
        status = 'open';
      } else {
        status = 'open';
      }

      const existing = await prisma.evaluationPeriod.findFirst({
        where: { tenantId, code: q.code },
      });

      if (!existing) {
        await prisma.evaluationPeriod.create({
          data: {
            tenantId,
            name: q.name,
            code: q.code,
            startDate: q.startDate,
            endDate: q.endDate,
            submissionDeadline: q.submissionDeadline,
            status,
            schoolYear: yearCode,
          },
        });
      } else {
        await prisma.evaluationPeriod.update({
          where: { id: existing.id },
          data: {
            name: q.name,
            startDate: q.startDate,
            endDate: q.endDate,
            submissionDeadline: q.submissionDeadline,
            status,
            schoolYear: yearCode,
          },
        });
      }
    }

    await AxisApplicabilityService.seedDefaultAxesForTenant(tenantId);
  }

  /**
   * Lấy hoặc tự động tạo kỳ đánh giá mặc định
   */
  static async getOrCreateDefaultPeriod(tenantId: string, name?: string, code?: string) {
    await this.ensureStandardQuarters(tenantId, '2026-2027');

    if (code) {
      const p = await prisma.evaluationPeriod.findFirst({
        where: { tenantId, code },
      });
      if (p) return p;
    }

    let period = await prisma.evaluationPeriod.findFirst({
      where: { tenantId, status: 'open' },
      orderBy: { startDate: 'desc' },
    });

    if (!period) {
      period = await prisma.evaluationPeriod.findFirst({
        where: { tenantId },
        orderBy: { startDate: 'desc' },
      });
    }

    return period!;
  }

  static async getPeriods(tenantId: string, schoolYear?: string) {
    if (schoolYear) {
      await this.ensureStandardQuarters(tenantId, schoolYear);
    } else {
      const yearCategories = await prisma.sharedCategory.findMany({
        where: { tenantId, type: 'NAM_HOC' },
      });
      if (yearCategories.length > 0) {
        for (const yc of yearCategories) {
          await this.ensureStandardQuarters(tenantId, yc.code);
        }
      } else {
        await this.ensureStandardQuarters(tenantId, '2026-2027');
      }
    }

    const whereCondition: any = { tenantId };
    if (schoolYear) {
      const { code } = this.parseSchoolYear(schoolYear);
      whereCondition.schoolYear = code;
    }

    const periods = await prisma.evaluationPeriod.findMany({
      where: whereCondition,
      orderBy: { startDate: 'asc' },
    });

    return periods;
  }

  static async createPeriod(tenantId: string, data: { name: string; code: string; startDate: Date; endDate: Date; submissionDeadline?: Date; schoolYear?: string; createdById?: string }) {
    const period = await prisma.evaluationPeriod.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        submissionDeadline: data.submissionDeadline ? new Date(data.submissionDeadline) : null,
        schoolYear: data.schoolYear || '2026-2027',
        status: 'open',
        createdById: data.createdById,
      },
    });

    // Seed 9 trục
    await AxisApplicabilityService.seedDefaultAxesForTenant(tenantId);
    return period;
  }

  // =========================================================================
  // 2. TRỤC KẾT QUẢ & PHÂN QUYỀN TRỤC (AXES & APPLICABILITY)
  // =========================================================================

  static async getAxes(tenantId: string) {
    return AxisApplicabilityService.getTenantAxes(tenantId);
  }

  static async createOrUpdateAxis(tenantId: string, axisData: any) {
    if (axisData.id) {
      return prisma.kpiAxis.update({
        where: { id: axisData.id },
        data: {
          name: axisData.name,
          description: axisData.description,
          displayOrder: axisData.displayOrder,
          roleScope: axisData.roleScope,
          restrictedPositionCodes: (axisData.restrictedPositionCodes as any) || undefined,
          requiresSubtype: axisData.requiresSubtype || false,
          subtypeOptions: (axisData.subtypeOptions as any) || undefined,
          warnOveruseThresholdPct: axisData.warnOveruseThresholdPct || null,
          isActive: axisData.isActive !== undefined ? axisData.isActive : true,
        },
      });
    }

    return prisma.kpiAxis.create({
      data: {
        tenantId,
        code: axisData.code,
        name: axisData.name,
        description: axisData.description,
        displayOrder: axisData.displayOrder || 0,
        roleScope: axisData.roleScope || 'ALL',
        restrictedPositionCodes: (axisData.restrictedPositionCodes as any) || undefined,
        requiresSubtype: axisData.requiresSubtype || false,
        subtypeOptions: (axisData.subtypeOptions as any) || undefined,
        warnOveruseThresholdPct: axisData.warnOveruseThresholdPct || null,
        isActive: true,
      },
    });
  }

  /**
   * Lấy danh sách các trục mà một nhân sự cụ thể ĐƯỢC PHÉP chọn làm trục chính
   */
  static async getAllowedPrimaryAxesForUser(tenantId: string, userId: string, periodId?: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { roles: true },
    });

    if (!user) throw new Error('Người dùng không tồn tại');

    const allAxes = await AxisApplicabilityService.getTenantAxes(tenantId);
    const userRoleNames = user.roles.map((r) => r.role.toString());
    const positionGroup = user.positionGroup || (userRoleNames.includes('GIAO_VIEN') || userRoleNames.includes('TO_TRUONG') ? 'GV' : 'NV');
    const positionCode = (user.positionCode || '').toLowerCase();
    const secondaryCodes: string[] = Array.isArray(user.secondaryPositionCodes)
      ? (user.secondaryPositionCodes as string[])
      : [];

    return allAxes.filter((axis) => {
      // 1. GV_ONLY
      if (axis.roleScope === 'GV_ONLY') {
        const isGV = positionGroup === 'GV' || userRoleNames.includes('GIAO_VIEN') || userRoleNames.includes('TO_TRUONG') || userRoleNames.includes('PHO_HIEU_TRUONG');
        if (!isGV) return false;
      }

      // 2. RESTRICTED (KTTC)
      if (axis.roleScope === 'RESTRICTED') {
        const allowed: string[] = Array.isArray(axis.restrictedPositionCodes)
          ? (axis.restrictedPositionCodes as string[])
          : ['ke_toan', 'thu_quy'];
        const isAllowed =
          allowed.includes(positionCode) ||
          secondaryCodes.some((c) => allowed.includes(c)) ||
          user.title?.toLowerCase().includes('kế toán') ||
          user.title?.toLowerCase().includes('thủ quỹ');
        if (!isAllowed) return false;
      }

      return true;
    });
  }

  // =========================================================================
  // 3. NHIỆM VỤ KPI (KPI TASKS CRUD + VALIDATION)
  // =========================================================================

  static async createKpiTask(
    tenantId: string,
    creatorId: string,
    data: {
      title: string;
      description?: string;
      periodId: string;
      primaryAxisId: string;
      taskSubtype?: string;
      secondaryAxisIds?: string[];
      weightScore?: number;
      priority?: 'THAP' | 'TRUNG_BINH' | 'CAO' | 'KHAN_CAP';
      startDate?: Date;
      dueDate?: Date;
      assignedUserId?: string;
      orgUnitId?: string;
      evidenceFiles?: any[];
    }
  ) {
    const targetUserId = data.assignedUserId || creatorId;

    // 1. Chạy Engine Validation kiểm tra Trục chính
    await TaskAxisValidationService.validateTaskPrimaryAxis({
      tenantId,
      employeeId: targetUserId,
      orgUnitId: data.orgUnitId,
      periodId: data.periodId,
      primaryAxisId: data.primaryAxisId,
      taskSubtype: data.taskSubtype,
    });

    // 2. Chạy Heuristics Anti-fraud
    const period = await prisma.evaluationPeriod.findUnique({ where: { id: data.periodId } });
    const warningFlags = await TaskAxisValidationService.detectTaskWarningFlags({
      tenantId,
      employeeId: targetUserId,
      periodId: data.periodId,
      primaryAxisId: data.primaryAxisId,
      weightScore: data.weightScore,
      evidenceFiles: data.evidenceFiles,
      periodEndDate: period?.endDate,
      taskCreatedAt: new Date(),
    });

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    const school = await prisma.school.findFirst({ where: { tenantId } });

    // 3. Tạo Task trong CSDL
    const task = await prisma.task.create({
      data: {
        tenantId,
        schoolId: school?.id || '',
        title: data.title,
        description: data.description,
        periodId: data.periodId,
        primaryAxisId: data.primaryAxisId,
        taskSubtype: data.taskSubtype,
        weightScore: typeof data.weightScore === 'number' ? data.weightScore : 1.0,
        evidenceFiles: data.evidenceFiles ? (data.evidenceFiles as any) : null,
        warningFlags: warningFlags.length > 0 ? (warningFlags as any) : null,
        priority: (data.priority as any) || 'TRUNG_BINH',
        status: 'DA_GIAO',
        progressPercent: 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: creatorId,
        orgUnitId: data.orgUnitId || user?.primaryOrgUnitId,
        locationId: user?.primaryLocationId,
        assignments: {
          create: {
            tenantId,
            userId: targetUserId,
            role: 'CHU_TRI',
          },
        },
        secondaryAxisTags: {
          create: (data.secondaryAxisIds || []).map((axisId) => ({
            axisId,
          })),
        },
        logs: {
          create: {
            tenantId,
            userId: creatorId,
            action: 'TAO_MOI',
            note: 'Tạo mới nhiệm vụ KPI theo Trục kết quả linh hoạt',
          },
        },
      },
      include: {
        primaryAxis: true,
        secondaryAxisTags: { include: { axis: true } },
        assignments: { include: { user: true } },
      },
    });

    return task;
  }

  static async updateKpiTask(
    tenantId: string,
    taskId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      primaryAxisId?: string;
      taskSubtype?: string;
      secondaryAxisIds?: string[];
      weightScore?: number;
      progressPercent?: number;
      status?: any;
      evaluationRating?: any;
      evidenceFiles?: any[];
      dueDate?: Date;
    }
  ) {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, tenantId },
      include: { assignments: true },
    });

    if (!existing) throw new Error('Công việc không tồn tại');

    const assignedUserId = existing.assignments[0]?.userId || userId;

    if (data.primaryAxisId) {
      await TaskAxisValidationService.validateTaskPrimaryAxis({
        tenantId,
        employeeId: assignedUserId,
        orgUnitId: existing.orgUnitId,
        periodId: existing.periodId,
        primaryAxisId: data.primaryAxisId,
        taskSubtype: data.taskSubtype !== undefined ? data.taskSubtype : existing.taskSubtype,
      });
    }

    // Cập nhật secondary tags nếu có
    if (data.secondaryAxisIds) {
      await prisma.kpiTaskAxisTag.deleteMany({ where: { taskId } });
      await prisma.kpiTaskAxisTag.createMany({
        data: data.secondaryAxisIds.map((axisId) => ({
          taskId,
          axisId,
        })),
      });
    }

    const isCompleted = data.status === 'HOAN_THANH' || data.status === 'XAC_NHAN' || data.status === 'DONG';

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        primaryAxisId: data.primaryAxisId,
        taskSubtype: data.taskSubtype,
        weightScore: data.weightScore,
        progressPercent: data.progressPercent,
        status: data.status,
        evaluationRating: data.evaluationRating,
        evidenceFiles: data.evidenceFiles ? (data.evidenceFiles as any) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completedAt: isCompleted && !existing.completedAt ? new Date() : undefined,
      },
      include: {
        primaryAxis: true,
        secondaryAxisTags: { include: { axis: true } },
        assignments: { include: { user: true } },
      },
    });

    return updated;
  }

  // =========================================================================
  // 4. MÀN HÌNH "GIAO VIỆC" (TASK ASSIGNMENT LOG - KHÔNG TÍNH ĐIỂM CÁ NHÂN)
  // =========================================================================

  static async createAssignmentLog(
    tenantId: string,
    assignedById: string,
    data: {
      periodId: string;
      title: string;
      description?: string;
      assignedToId?: string;
      assignedDepartment?: string;
      unitId?: string;
      relatedAxisId?: string;
      note?: string;
    }
  ) {
    return prisma.taskAssignmentLog.create({
      data: {
        tenantId,
        periodId: data.periodId,
        title: data.title,
        description: data.description,
        assignedById,
        assignedToId: data.assignedToId || null,
        assignedDepartment: data.assignedDepartment || null,
        unitId: data.unitId || null,
        relatedAxisId: data.relatedAxisId || null,
        note: data.note || 'Lưu vết phân công công tác (Không tính điểm KPI cá nhân)',
      },
      include: {
        assignedBy: { select: { id: true, fullName: true, title: true } },
        assignedTo: { select: { id: true, fullName: true, title: true } },
        relatedAxis: true,
        orgUnit: true,
      },
    });
  }

  static async getAssignmentLogs(tenantId: string, periodId?: string, unitId?: string) {
    return prisma.taskAssignmentLog.findMany({
      where: {
        tenantId,
        periodId: periodId || undefined,
        unitId: unitId || undefined,
      },
      include: {
        assignedBy: { select: { id: true, fullName: true, title: true } },
        assignedTo: { select: { id: true, fullName: true, title: true } },
        relatedAxis: true,
        orgUnit: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deleteAssignmentLog(tenantId: string, id: string) {
    return prisma.taskAssignmentLog.delete({
      where: { id },
    });
  }

  // =========================================================================
  // 5. QUY TRÌNH ĐIỂM THƯỞNG (BONUS PROPOSALS 2 BƯỚC)
  // =========================================================================

  static async proposeBonus(
    tenantId: string,
    proposedById: string,
    data: {
      taskId: string;
      periodId: string;
      reasonType: 'tien_do_vuot' | 'sang_kien_moi';
      reasonDescription?: string;
      proposedBonusPct?: number;
    }
  ) {
    const task = await prisma.task.findFirst({
      where: { id: data.taskId, tenantId },
    });

    if (!task) throw new Error('Công việc không tồn tại');

    // Kiểm tra điều kiện: có minh chứng đính kèm
    const hasEvidence = Array.isArray(task.evidenceFiles) && task.evidenceFiles.length > 0;
    if (!hasEvidence && !data.reasonDescription) {
      throw new Error('Đề xuất điểm thưởng bắt buộc phải có sản phẩm minh chứng đính kèm hoặc mô tả sáng kiến rõ ràng.');
    }

    const taskWeight = typeof task.weightScore === 'number' ? task.weightScore : 1.0;
    const bonusPct = data.proposedBonusPct || 5.0;
    const calculatedBonusScore = Math.round(taskWeight * (bonusPct / 100) * 100) / 100;

    const proposal = await prisma.kpiBonusProposal.create({
      data: {
        tenantId,
        taskId: data.taskId,
        periodId: data.periodId,
        proposedById,
        reasonType: data.reasonType,
        reasonDescription: data.reasonDescription,
        proposedBonusPct: bonusPct,
        calculatedBonusScore,
        status: 'proposed',
      },
      include: {
        task: true,
        proposedBy: { select: { id: true, fullName: true } },
      },
    });

    return proposal;
  }

  static async getBonusProposals(tenantId: string, periodId?: string, status?: string) {
    return prisma.kpiBonusProposal.findMany({
      where: {
        tenantId,
        periodId: periodId || undefined,
        status: status || undefined,
      },
      include: {
        task: true,
        proposedBy: { select: { id: true, fullName: true, title: true, primaryOrgUnit: { select: { name: true } } } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async reviewBonusProposal(
    tenantId: string,
    proposalId: string,
    approvedById: string,
    status: 'approved' | 'rejected',
    reviewNote?: string
  ) {
    return prisma.kpiBonusProposal.update({
      where: { id: proposalId },
      data: {
        status,
        approvedById,
        approvedAt: new Date(),
        reviewNote,
      },
      include: {
        task: true,
        proposedBy: true,
      },
    });
  }

  // =========================================================================
  // 6. BẢNG ĐIỂM TỔNG HỢP & XẾP LOẠI 4 MỨC (SCORES & CLASSIFICATION)
  // =========================================================================

  static async getCalculatedScore(tenantId: string, employeeId: string, periodId: string, scoreGeneral?: number) {
    const calc = await ScoreCalculationService.calculateEmployeeKpi(tenantId, employeeId, periodId, scoreGeneral);
    const classificationEval = await ClassificationService.evaluateClassification(tenantId, employeeId, periodId, calc.scoreFinal);

    return {
      ...calc,
      classificationEvaluation: classificationEval,
    };
  }

  static async submitKpiScore(
    tenantId: string,
    employeeId: string,
    periodId: string,
    data: { scoreGeneral?: number; note?: string }
  ) {
    const scoreGen = typeof data.scoreGeneral === 'number' ? data.scoreGeneral : 30;
    const calc = await ScoreCalculationService.calculateEmployeeKpi(tenantId, employeeId, periodId, scoreGen);
    const classificationEval = await ClassificationService.evaluateClassification(tenantId, employeeId, periodId, calc.scoreFinal);

    const record = await prisma.kpiScoreRecord.upsert({
      where: {
        tenantId_employeeId_periodId: {
          tenantId,
          employeeId,
          periodId,
        },
      },
      update: {
        scoreGeneral: calc.scoreGeneral,
        scoreTask: calc.scoreTask,
        scoreBonusRaw: calc.scoreBonusRaw,
        scoreBonusCapped: calc.scoreBonusCapped,
        scoreFinal: calc.scoreFinal,
        classification: classificationEval.suggestedClassification,
        status: 'submitted',
        axisBreakdown: calc.axisBreakdown as any,
      },
      create: {
        tenantId,
        employeeId,
        periodId,
        groupType: 2,
        scoreGeneral: calc.scoreGeneral,
        scoreTask: calc.scoreTask,
        scoreBonusRaw: calc.scoreBonusRaw,
        scoreBonusCapped: calc.scoreBonusCapped,
        scoreFinal: calc.scoreFinal,
        classification: classificationEval.suggestedClassification,
        status: 'submitted',
        axisBreakdown: calc.axisBreakdown as any,
      },
    });

    return { record, calc, classificationEval };
  }

  static async updateScoreGeneral(
    tenantId: string,
    employeeId: string,
    periodId: string,
    scoreGeneral: number,
    updatedById?: string
  ) {
    const validScoreGeneral = Math.min(30, Math.max(0, Number(scoreGeneral) || 0));
    const calc = await ScoreCalculationService.calculateEmployeeKpi(tenantId, employeeId, periodId, validScoreGeneral);
    const classificationEval = await ClassificationService.evaluateClassification(tenantId, employeeId, periodId, calc.scoreFinal);

    const record = await prisma.kpiScoreRecord.upsert({
      where: {
        tenantId_employeeId_periodId: {
          tenantId,
          employeeId,
          periodId,
        },
      },
      update: {
        scoreGeneral: validScoreGeneral,
        scoreTask: calc.scoreTask,
        scoreBonusRaw: calc.scoreBonusRaw,
        scoreBonusCapped: calc.scoreBonusCapped,
        scoreFinal: calc.scoreFinal,
        classification: classificationEval.suggestedClassification,
        axisBreakdown: calc.axisBreakdown as any,
      },
      create: {
        tenantId,
        employeeId,
        periodId,
        groupType: 2,
        scoreGeneral: validScoreGeneral,
        scoreTask: calc.scoreTask,
        scoreBonusRaw: calc.scoreBonusRaw,
        scoreBonusCapped: calc.scoreBonusCapped,
        scoreFinal: calc.scoreFinal,
        classification: classificationEval.suggestedClassification,
        status: 'draft',
        axisBreakdown: calc.axisBreakdown as any,
      },
    });

    return { record, calc, classificationEval };
  }

  static async approveKpiScore(
    tenantId: string,
    recordId: string,
    approvedById: string,
    data: {
      finalClassification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh';
      meetsExtraConditions: boolean;
      overrideReason?: string;
    }
  ) {
    return prisma.kpiScoreRecord.update({
      where: { id: recordId },
      data: {
        classification: data.finalClassification,
        meetsExtraConditions: data.meetsExtraConditions,
        overrideReason: data.overrideReason,
        status: 'approved',
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        employee: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  // =========================================================================
  // 7. BÁO CÁO TỔNG HỢP ĐƠN VỊ THEO 9 TRỤC (UNIT MATRIX REPORT)
  // =========================================================================

  static async getUnitAxisSummaryReport(tenantId: string, orgUnitId: string, periodId: string) {
    const orgUnit = await prisma.orgUnit.findFirst({
      where: { id: orgUnitId, tenantId },
      include: {
        users: { where: { isActive: true } },
      },
    });

    if (!orgUnit) throw new Error('Đơn vị không tồn tại');

    const axes = await AxisApplicabilityService.getTenantAxes(tenantId);
    const membersSummary: any[] = [];

    let totalUnitScore = 0;
    const axisMatrix: Record<string, { totalTasks: number; totalScore: number; gvBoMonTasks?: number; gvcnTasks?: number }> = {};

    for (const a of axes) {
      axisMatrix[a.code] = { totalTasks: 0, totalScore: 0, gvBoMonTasks: 0, gvcnTasks: 0 };
    }

    for (const member of orgUnit.users) {
      const calc = await ScoreCalculationService.calculateEmployeeKpi(tenantId, member.id, periodId);
      const isGV = member.positionGroup === 'GV' || member.title?.toLowerCase().includes('giáo viên');

      totalUnitScore += calc.scoreFinal;

      for (const ab of calc.axisBreakdown) {
        if (axisMatrix[ab.axisCode]) {
          axisMatrix[ab.axisCode].totalTasks += ab.totalTasks;
          axisMatrix[ab.axisCode].totalScore += ab.achievedScore;

          if (ab.axisCode === 'chuyen_mon' && ab.subtypes) {
            axisMatrix[ab.axisCode].gvBoMonTasks! += ab.subtypes.gv_bo_mon?.totalTasks || 0;
            axisMatrix[ab.axisCode].gvcnTasks! += ab.subtypes.gvcn?.totalTasks || 0;
          }
        }
      }

      membersSummary.push({
        id: member.id,
        fullName: member.fullName,
        title: member.title,
        positionGroup: isGV ? 'GV' : 'NV',
        scoreFinal: calc.scoreFinal,
        scoreTask: calc.scoreTask,
        scoreBonusCapped: calc.scoreBonusCapped,
        axisBreakdown: calc.axisBreakdown,
      });
    }

    const memberCount = orgUnit.users.length;
    const avgScore = memberCount > 0 ? Math.round((totalUnitScore / memberCount) * 100) / 100 : 0;

    return {
      orgUnit: { id: orgUnit.id, name: orgUnit.name, code: orgUnit.code },
      periodId,
      memberCount,
      avgScore,
      axesList: axes.map((a) => ({ id: a.id, code: a.code, name: a.name })),
      axisMatrix,
      members: membersSummary,
    };
  }

  // =========================================================================
  // 7b. TỔNG HỢP KPI TOÀN TRƯỜNG & GIÁM SÁT BGH (SCHOOL KPI OVERVIEW)
  // =========================================================================

  static async getSchoolKpiOverview(
    tenantId: string,
    options?: {
      orgUnitId?: string;
      periodId?: string;
      search?: string;
      classification?: string;
    }
  ) {
    let periodId = options?.periodId;
    if (!periodId) {
      const activePeriod = await prisma.evaluationPeriod.findFirst({
        where: { tenantId, status: 'active' },
        orderBy: { startDate: 'desc' },
      });
      if (activePeriod) {
        periodId = activePeriod.id;
      } else {
        const anyPeriod = await prisma.evaluationPeriod.findFirst({
          where: { tenantId },
          orderBy: { startDate: 'desc' },
        });
        periodId = anyPeriod?.id || 'default';
      }
    }

    const whereUser: any = {
      tenantId,
      isActive: true,
      roles: { none: { role: 'SYSTEM_ADMIN' } },
    };

    if (options?.orgUnitId && options.orgUnitId !== 'all') {
      whereUser.primaryOrgUnitId = options.orgUnitId;
    }

    if (options?.search && options.search.trim()) {
      whereUser.OR = [
        { fullName: { contains: options.search.trim(), mode: 'insensitive' } },
        { email: { contains: options.search.trim(), mode: 'insensitive' } },
        { title: { contains: options.search.trim(), mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereUser,
      include: {
        primaryOrgUnit: true,
      },
      orderBy: [{ primaryOrgUnitId: 'asc' }, { fullName: 'asc' }],
    });

    const axes = await AxisApplicabilityService.getTenantAxes(tenantId);
    const axisMap = new Map<string, { id: string; name: string; code: string; displayOrder: number; totalTasks: number; completedTasks: number; totalScore: number }>();
    for (const a of axes) {
      axisMap.set(a.id, {
        id: a.id,
        name: a.name,
        code: a.code,
        displayOrder: a.displayOrder,
        totalTasks: 0,
        completedTasks: 0,
        totalScore: 0,
      });
    }

    const staffList: any[] = [];
    const classificationCounts = {
      xuat_sac: 0,
      tot: 0,
      hoan_thanh: 0,
      khong_hoan_thanh: 0,
    };

    let schoolTotalTasks = 0;
    let schoolCompletedTasks = 0;

    const userCalcResults = await Promise.all(
      users.map(async (user) => {
        try {
          const calc = await ScoreCalculationService.calculateEmployeeKpi(tenantId, user.id, periodId);
          return { user, calc };
        } catch (e) {
          return null;
        }
      })
    );

    for (const item of userCalcResults) {
      if (!item) continue;
      const { user, calc } = item;
      const userTasks = calc.tasksBreakdown || [];

      const userTotalTasks = userTasks.length;
      const userCompletedTasks = userTasks.filter((t: any) => t.status === 'HOAN_THANH' || t.status === 'XAC_NHAN' || t.status === 'DONG').length;
      const userInprogressTasks = userTasks.filter((t: any) => t.status === 'DANG_THUC_HIEN' || t.status === 'CHO_DUYET').length;
      const userCompletionRate = userTotalTasks > 0 ? Math.round((userCompletedTasks / userTotalTasks) * 100) : 0;

      schoolTotalTasks += userTotalTasks;
      schoolCompletedTasks += userCompletedTasks;

      // Determine classification
      let cls: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh' = 'khong_hoan_thanh';
      if (calc.scoreFinal >= 90) {
        cls = 'xuat_sac';
      } else if (calc.scoreFinal >= 70) {
        cls = 'tot';
      } else if (calc.scoreFinal >= 50) {
        cls = 'hoan_thanh';
      } else {
        cls = 'khong_hoan_thanh';
      }

      if (classificationCounts[cls] !== undefined) {
        classificationCounts[cls]++;
      }

      // Aggregate into axisMap
      for (const ab of calc.axisBreakdown || []) {
        if (axisMap.has(ab.axisId)) {
          const am = axisMap.get(ab.axisId)!;
          am.totalTasks += ab.totalTasks;
          am.completedTasks += ab.completedTasks;
          am.totalScore += ab.achievedScore;
        }
      }

      if (!options?.classification || options.classification === 'all' || options.classification === cls) {
        staffList.push({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          title: user.title || 'Cán bộ giáo viên',
          orgUnitId: user.primaryOrgUnitId,
          orgUnitName: user.primaryOrgUnit?.name || 'Chưa phân tổ',
          scoreGeneral: calc.scoreGeneral,
          scoreTask: calc.scoreTask,
          scoreBonus: calc.scoreBonusCapped,
          scoreFinal: calc.scoreFinal,
          classification: cls,
          totalTasks: userTotalTasks,
          completedTasks: userCompletedTasks,
          inProgressTasks: userInprogressTasks,
          completionRate: userCompletionRate,
          axisBreakdown: calc.axisBreakdown || [],
          tasks: userTasks,
        });
      }
    }

    const schoolCompletionRate = schoolTotalTasks > 0 ? Math.round((schoolCompletedTasks / schoolTotalTasks) * 100) : 0;

    const schoolAxisBreakdown = Array.from(axisMap.values()).map((a) => ({
      ...a,
      completionRate: a.totalTasks > 0 ? Math.round((a.completedTasks / a.totalTasks) * 100) : 0,
      totalScore: Math.round(a.totalScore * 10) / 10,
    }));

    return {
      periodId,
      totalStaff: users.length,
      schoolTotalTasks,
      schoolCompletedTasks,
      schoolCompletionRate,
      classificationCounts,
      schoolAxisBreakdown,
      staffList,
    };
  }

  // =========================================================================
  // 8. TƯƠNG THÍCH NGƯỢC (LEGACY METHODS FOR PREVIOUS TESTS)
  // =========================================================================

  static async calculateUserKpi(
    tenantId: string,
    userId: string,
    periodKey: string = 'QUY_3',
    periodType: string = 'QUY',
    schoolYear: string = '2026-2027'
  ): Promise<UserKpiDetail> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        primaryOrgUnit: true,
        primaryLocation: true,
      },
    });

    if (!user) {
      throw new Error('Người dùng không tồn tại trong trường học hiện hành');
    }

    const assignments = await prisma.taskAssignment.findMany({
      where: { tenantId, userId },
      include: {
        task: {
          include: { plan: true, orgUnit: true, location: true },
        },
      },
    });

    const tasksFromAssignments = assignments.map((a) => a.task).filter(Boolean);

    const unassignedTasks = await prisma.task.findMany({
      where: {
        tenantId,
        createdById: userId,
        assignments: { none: {} },
      },
      include: { plan: true, orgUnit: true, location: true },
    });

    const taskMap = new Map<string, typeof unassignedTasks[0]>();
    for (const t of [...tasksFromAssignments, ...unassignedTasks]) {
      taskMap.set(t.id, t);
    }
    const allTasks = Array.from(taskMap.values());

    let completedBeforeDeadline = 0;
    let completedOnTime = 0;
    let completedLate = 0;
    let uncompleted = 0;

    let totalWeight = 0;
    let totalActualWeighted = 0;
    let totalQualityWeighted = 0;
    let totalTimelineWeighted = 0;
    let totalLeadershipWeighted = 0;

    const taskItems = allTasks.map((t) => {
      let weight = 1.0;
      if (t.priority === 'KHAN_CAP') weight = 2.0;
      else if (t.priority === 'CAO') weight = 1.5;

      totalWeight += weight;

      const isCompleted = t.status === 'HOAN_THANH' || t.status === 'DONG' || t.status === 'XAC_NHAN';
      let timingCategory: 'BEFORE_DEADLINE' | 'ON_TIME' | 'LATE' | 'UNCOMPLETED' = 'UNCOMPLETED';

      let actualVal = 0.5;
      let qualityScore = 75;
      let timelineScore = 70;
      const leadershipScore = 95;

      if (isCompleted) {
        actualVal = 1.0;
        if (t.completedAt && t.dueDate) {
          const compTime = new Date(t.completedAt).getTime();
          const dueTime = new Date(t.dueDate).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;

          if (compTime < dueTime - oneDayMs) {
            timingCategory = 'BEFORE_DEADLINE';
            completedBeforeDeadline++;
            timelineScore = 100;
          } else if (compTime <= dueTime + oneDayMs) {
            timingCategory = 'ON_TIME';
            completedOnTime++;
            timelineScore = 95;
          } else {
            timingCategory = 'LATE';
            completedLate++;
            timelineScore = 65;
          }
        } else {
          timingCategory = 'ON_TIME';
          completedOnTime++;
          timelineScore = 95;
        }

        if (t.evaluationRating === 'XUAT_SAC') qualityScore = 100;
        else if (t.evaluationRating === 'TOT') qualityScore = 90;
        else if (t.evaluationRating === 'HOAN_THANH') qualityScore = 80;
        else if (t.evaluationRating === 'CHUA_DAT') qualityScore = 50;
        else qualityScore = 88;
      } else {
        timingCategory = 'UNCOMPLETED';
        uncompleted++;
        actualVal = t.progressPercent >= 50 ? t.progressPercent / 100 : 0.4;
        qualityScore = 70;
        const now = new Date().getTime();
        const dueTime = t.dueDate ? new Date(t.dueDate).getTime() : now + 10000;
        timelineScore = now > dueTime ? 45 : 75;
      }

      const actualWeighted = actualVal * weight;
      const qualityWeighted = (qualityScore / 100) * weight;
      const timelineWeighted = (timelineScore / 100) * weight;
      const leadershipWeighted = (leadershipScore / 100) * weight;

      totalActualWeighted += actualWeighted;
      totalQualityWeighted += qualityWeighted;
      totalTimelineWeighted += timelineWeighted;
      totalLeadershipWeighted += leadershipWeighted;

      return {
        id: t.id,
        code: t.code,
        title: t.title,
        status: t.status,
        priority: t.priority,
        progressPercent: t.progressPercent,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        evaluationRating: t.evaluationRating,
        timingCategory,
        weight,
      };
    });

    const totalTasks = allTasks.length;

    const scoreA_Quantity = totalWeight > 0 ? Math.min(100, Math.round((totalActualWeighted / totalWeight) * 10000) / 100) : 100;
    const scoreB_Quality = totalWeight > 0 ? Math.min(100, Math.round((totalQualityWeighted / totalWeight) * 10000) / 100) : 90;
    const scoreC_Timeline = totalWeight > 0 ? Math.min(100, Math.round((totalTimelineWeighted / totalWeight) * 10000) / 100) : 95;
    const scoreD_Leadership = totalWeight > 0 ? Math.min(100, Math.round((totalLeadershipWeighted / totalWeight) * 10000) / 100) : 95;

    const finalScore = Math.round(((scoreA_Quantity + scoreB_Quality + scoreC_Timeline + scoreD_Leadership) / 4) * 100) / 100;

    let rating = 'HOAN_THANH';
    let ratingCategory = 'Hoàn thành nhiệm vụ (Loại C)';
    let ratingColor = '#D97706';

    if (finalScore >= 90) {
      rating = 'XUAT_SAC';
      ratingCategory = 'Hoàn thành xuất sắc nhiệm vụ (Loại A)';
      ratingColor = '#16A34A';
    } else if (finalScore >= 80) {
      rating = 'TOT';
      ratingCategory = 'Hoàn thành tốt nhiệm vụ (Loại B)';
      ratingColor = '#2563EB';
    } else if (finalScore < 65) {
      rating = 'CHUA_DAT';
      ratingCategory = 'Không hoàn thành nhiệm vụ (Loại D)';
      ratingColor = '#DC2626';
    }

    const record = await prisma.kPIRecord.upsert({
      where: {
        tenantId_userId_periodKey: {
          tenantId,
          userId,
          periodKey,
        },
      },
      create: {
        tenantId,
        userId,
        periodType,
        periodKey,
        schoolYear,
        totalTasks,
        completedBeforeDeadline,
        completedOnTime,
        completedLate,
        uncompletedTasks: uncompleted,
        scoreA_Quantity,
        scoreB_Quality,
        scoreC_Timeline,
        scoreD_Leadership,
        finalScore,
        rating,
        taskDetails: taskItems as any,
        calculatedBy: 'SYSTEM',
        calculatedAt: new Date(),
      },
      update: {
        totalTasks,
        completedBeforeDeadline,
        completedOnTime,
        completedLate,
        uncompletedTasks: uncompleted,
        scoreA_Quantity,
        scoreB_Quality,
        scoreC_Timeline,
        scoreD_Leadership,
        finalScore,
        rating,
        taskDetails: taskItems as any,
        calculatedBy: 'SYSTEM',
        calculatedAt: new Date(),
      },
    });

    return {
      record,
      manualScores: record.manualScores || {},
      calculatedSummary: {
        totalTasks,
        completedBeforeDeadline,
        completedOnTime,
        completedLate,
        uncompletedTasks: uncompleted,
        scoreA: scoreA_Quantity,
        scoreB: scoreB_Quality,
        scoreC: scoreC_Timeline,
        scoreD: scoreD_Leadership,
        finalScore,
        finalGrade: rating,
        ratingCategory,
      },
      user: {
        id: user.id,
        fullName: user.fullName,
        title: user.title,
        email: user.email,
        phone: user.phone,
        orgUnitName: user.primaryOrgUnit?.name,
        locationName: user.primaryLocation?.name,
      },
      taskBreakdown: {
        total: totalTasks,
        completedBeforeDeadline,
        completedOnTime,
        completedLate,
        uncompleted,
      },
      scores: {
        scoreA_Quantity,
        scoreB_Quality,
        scoreC_Timeline,
        scoreD_Leadership,
        finalScore,
        rating,
        ratingCategory,
        ratingColor,
      },
      tasks: taskItems,
    };
  }

  static async recomputeTenantKpi(
    tenantId: string,
    periodKey: string = 'QUY_3',
    periodType: string = 'QUY',
    schoolYear: string = '2026-2027'
  ) {
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, fullName: true },
    });

    let totalScore = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let completeCount = 0;
    let failedCount = 0;

    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchRes = await Promise.all(
        batch.map((u) => this.calculateUserKpi(tenantId, u.id, periodKey, periodType, schoolYear))
      );

      for (const res of batchRes) {
        totalScore += res.scores.finalScore;
        if (res.scores.rating === 'XUAT_SAC') excellentCount++;
        else if (res.scores.rating === 'TOT') goodCount++;
        else if (res.scores.rating === 'HOAN_THANH') completeCount++;
        else failedCount++;
      }
    }

    const processedUsers = users.length;
    const avgScore = processedUsers > 0 ? Math.round((totalScore / processedUsers) * 100) / 100 : 0;

    return {
      processedUsers,
      summary: {
        periodKey,
        avgScore,
        excellentCount,
        goodCount,
        completeCount,
        failedCount,
      },
    };
  }

  static async getOrgUnitKpiSummary(tenantId: string, orgUnitId: string, periodKey: string = 'QUY_3') {
    const orgUnit = await prisma.orgUnit.findFirst({
      where: { id: orgUnitId, tenantId },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, fullName: true, title: true, avatarUrl: true },
        },
      },
    });

    if (!orgUnit) {
      throw new Error('Tổ chuyên môn không tồn tại');
    }

    const memberKpis: any[] = [];
    let totalScore = 0;
    let totalTasks = 0;
    let totalCompleted = 0;

    for (const u of orgUnit.users) {
      let record = await prisma.kPIRecord.findUnique({
        where: {
          tenantId_userId_periodKey: {
            tenantId,
            userId: u.id,
            periodKey,
          },
        },
      });

      if (!record) {
        const calc = await this.calculateUserKpi(tenantId, u.id, periodKey);
        record = calc.record;
      }

      if (record) {
        totalScore += record.finalScore;
        totalTasks += record.totalTasks;
        totalCompleted += record.completedBeforeDeadline + record.completedOnTime + record.completedLate;

        memberKpis.push({
          userId: u.id,
          fullName: u.fullName,
          title: u.title,
          avatarUrl: u.avatarUrl,
          finalScore: record.finalScore,
          rating: record.rating,
          totalTasks: record.totalTasks,
          completed: record.completedBeforeDeadline + record.completedOnTime + record.completedLate,
          uncompleted: record.uncompletedTasks,
        });
      }
    }

    const memberCount = orgUnit.users.length;
    const avgScore = memberCount > 0 ? Math.round((totalScore / memberCount) * 100) / 100 : 0;

    return {
      orgUnit: { id: orgUnit.id, name: orgUnit.name, code: orgUnit.code },
      periodKey,
      stats: {
        memberCount,
        avgScore,
        totalTasks,
        totalCompleted,
        completionRate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
      },
      members: memberKpis,
    };
  }

  static async getSchoolKpiSummary(tenantId: string, periodKey: string = 'QUY_3') {
    const school = await prisma.school.findFirst({
      where: { tenantId },
      include: { locations: true, orgUnits: true },
    });

    const records = await prisma.kPIRecord.findMany({
      where: { tenantId, periodKey },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            title: true,
            primaryLocationId: true,
            primaryOrgUnitId: true,
          },
        },
      },
    });

    let totalScore = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let completeCount = 0;
    let failedCount = 0;

    for (const r of records) {
      totalScore += r.finalScore;
      if (r.rating === 'XUAT_SAC') excellentCount++;
      else if (r.rating === 'TOT') goodCount++;
      else if (r.rating === 'HOAN_THANH') completeCount++;
      else failedCount++;
    }

    const totalStaff = records.length;
    const avgScore = totalStaff > 0 ? Math.round((totalScore / totalStaff) * 100) / 100 : 0;

    return {
      schoolName: school?.name || 'Trường học',
      periodKey,
      overall: {
        totalStaff,
        avgScore,
        ratingDistribution: {
          excellent: excellentCount,
          good: goodCount,
          complete: completeCount,
          failed: failedCount,
        },
      },
      records: records.map((r) => ({
        userId: r.userId,
        fullName: r.user?.fullName,
        title: r.user?.title,
        locationId: r.user?.primaryLocationId,
        orgUnitId: r.user?.primaryOrgUnitId,
        finalScore: r.finalScore,
        rating: r.rating,
        totalTasks: r.totalTasks,
        scoreA: r.scoreA_Quantity,
        scoreB: r.scoreB_Quality,
        scoreC: r.scoreC_Timeline,
        scoreD: r.scoreD_Leadership,
      })),
    };
  }

  static async exportKpiExcel(tenantId: string, periodKey: string = 'QUY_3', userId?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TN EDU SaaS Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bảng tính KPI Cá nhân');

    sheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    let kpiData: UserKpiDetail;
    if (userId) {
      kpiData = await this.calculateUserKpi(tenantId, userId, periodKey);
    } else {
      const firstUser = await prisma.user.findFirst({ where: { tenantId, isActive: true } });
      if (!firstUser) throw new Error('Không tìm thấy người dùng');
      kpiData = await this.calculateUserKpi(tenantId, firstUser.id, periodKey);
    }

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = 'TRƯỜNG TH & THCS PHƯỚC TÂN';
    sheet.getCell('A1').font = { bold: true, size: 10 };

    sheet.mergeCells('A2:E2');
    sheet.getCell('A2').value = `Tổ chuyên môn: ${kpiData.user.orgUnitName || 'Ban Giám hiệu'}`;
    sheet.getCell('A2').font = { italic: true, size: 9 };

    sheet.mergeCells('I1:O1');
    sheet.getCell('I1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    sheet.getCell('I1').font = { bold: true, size: 10 };
    sheet.getCell('I1').alignment = { horizontal: 'center' };

    sheet.mergeCells('I2:O2');
    sheet.getCell('I2').value = 'Độc lập - Tự do - Hạnh phúc';
    sheet.getCell('I2').font = { bold: true, underline: true, size: 10 };
    sheet.getCell('I2').alignment = { horizontal: 'center' };

    sheet.mergeCells('A4:O4');
    sheet.getCell('A4').value = 'BẢNG ĐÁNH GIÁ VÀ TÍNH ĐIỂM KPI CÁ NHÂN';
    sheet.getCell('A4').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
    sheet.getCell('A4').alignment = { horizontal: 'center' };

    sheet.mergeCells('A5:O5');
    sheet.getCell('A5').value = `Kỳ đánh giá: ${periodKey} • Họ và tên: ${kpiData.user.fullName} (${kpiData.user.title || 'Cán bộ'})`;
    sheet.getCell('A5').font = { italic: true, size: 10 };
    sheet.getCell('A5').alignment = { horizontal: 'center' };

    sheet.getRow(7).values = [
      'STT',
      'Nhiệm vụ theo kỳ',
      'Độ ưu tiên',
      'Trạng thái',
      'Hạn chót',
      'Hệ số',
      'Quy đổi KH',
      'Thực tế',
      'Quy đổi SL',
      'Chất lượng',
      'Quy đổi CL',
      'Tiến độ',
      'Quy đổi TĐ',
      'Điều hành',
      'Quy đổi ĐH',
    ];

    sheet.getRow(7).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(7).alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 1; c <= 15; c++) {
      const cell = sheet.getRow(7).getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F3864' },
      };
    }

    let rowIndex = 8;
    kpiData.tasks.forEach((t, idx) => {
      const row = sheet.getRow(rowIndex);
      row.values = [
        idx + 1,
        t.title,
        t.priority,
        t.status,
        t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : 'Trong kỳ',
        t.weight,
        t.weight,
        t.status === 'HOAN_THANH' ? '1' : `${t.progressPercent}%`,
        t.status === 'HOAN_THANH' ? t.weight : Math.round(t.weight * (t.progressPercent / 100) * 10) / 10,
        t.evaluationRating || 'Đạt chuẩn',
        t.weight,
        t.timingCategory,
        t.weight,
        'Tốt',
        t.weight,
      ];
      row.alignment = { vertical: 'middle' };
      rowIndex++;
    });

    rowIndex += 2;
    sheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
    sheet.getCell(`A${rowIndex}`).value = 'KẾT QUẢ ĐÁNH GIÁ KPI TỔNG HỢP';
    sheet.getCell(`A${rowIndex}`).font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };

    const scoreRows = [
      ['KPI Số lượng (A)', kpiData.scores.scoreA_Quantity],
      ['KPI Chất lượng (B)', kpiData.scores.scoreB_Quality],
      ['KPI Tiến độ (C)', kpiData.scores.scoreC_Timeline],
      ['KPI Điều hành / Phối hợp (D)', kpiData.scores.scoreD_Leadership],
      ['TỔNG ĐIỂM KPI (NV1)', kpiData.scores.finalScore],
      ['XẾP LOẠI', kpiData.scores.ratingCategory],
    ];

    scoreRows.forEach(([label, val]) => {
      rowIndex++;
      sheet.getCell(`A${rowIndex}`).value = label;
      sheet.getCell(`A${rowIndex}`).font = { bold: true };
      sheet.getCell(`E${rowIndex}`).value = val;
      sheet.getCell(`E${rowIndex}`).font = { bold: true };
      sheet.getCell(`E${rowIndex}`).alignment = { horizontal: 'right' };
    });

    sheet.columns = [
      { width: 6 },
      { width: 35 },
      { width: 14 },
      { width: 15 },
      { width: 13 },
      { width: 8 },
      { width: 12 },
      { width: 10 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 16 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
    ];

    const rawBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(rawBuffer);
  }

  static async updateManualScore(
    tenantId: string,
    userId: string,
    payload: {
      periodKey?: string;
      kpiCode: string;
      score: number;
      note?: string;
    }
  ) {
    const periodKey = payload.periodKey || 'QUY_3';
    let record = await prisma.kPIRecord.findUnique({
      where: {
        tenantId_userId_periodKey: {
          tenantId,
          userId,
          periodKey,
        },
      },
    });

    if (!record) {
      await this.calculateUserKpi(tenantId, userId, periodKey);
      record = await prisma.kPIRecord.findUnique({
        where: {
          tenantId_userId_periodKey: {
            tenantId,
            userId,
            periodKey,
          },
        },
      });
    }

    const currentManualScores: any = (record?.manualScores as any) || {};
    currentManualScores[payload.kpiCode] = {
      score: Number(payload.score),
      note: payload.note || '',
      updatedAt: new Date(),
    };

    const updated = await prisma.kPIRecord.update({
      where: { id: record!.id },
      data: {
        manualScores: currentManualScores,
      },
    });

    return updated;
  }
}
