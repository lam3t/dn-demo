import { prisma } from '../../../prisma';
import { ScoreCalculationService } from './score-calculation.service';
import { AxisApplicabilityService } from './axis-applicability.service';

export interface QuarterScoreItem {
  periodId: string;
  periodName: string;
  periodCode: string;
  quarterIndex: number; // 1, 2, 3, 4
  startDate: Date;
  endDate: Date;
  status: string; // 'closed' | 'open' | 'draft'
  scoreGeneral: number;
  scoreTask: number;
  scoreBonus: number;
  scoreFinal: number;
  classification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh' | 'chua_danh_gia';
  classificationLabel: string;
  isCarriedForward: boolean;
  hasEvaluatedScore: boolean;
  totalTasks: number;
  completedTasks: number;
}

export interface AnnualRollupResult {
  employeeId: string;
  employeeName: string;
  employeeTitle?: string | null;
  orgUnitName?: string | null;
  schoolYear: string;
  quarters: QuarterScoreItem[];
  avgScore: number;
  yearlyClassification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh';
  yearlyClassificationLabel: string;
  yearlyClassificationColor: string;
  hasFailedQuarter: boolean;
  consecutiveFailedCount: number;
  canBeExcellentYearly: boolean;
  requiresReplacementWarning: boolean;
  warningMessage?: string | null;
  note?: string | null;
}

export interface SchoolAnnualStaffItem {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  title?: string | null;
  orgUnitId?: string | null;
  orgUnitName?: string | null;
  q1Score: number | null;
  q1Class: string | null;
  q2Score: number | null;
  q2Class: string | null;
  q3Score: number | null;
  q3Class: string | null;
  q4Score: number | null;
  q4Class: string | null;
  avgScore: number;
  yearlyClassification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh';
  yearlyClassificationLabel: string;
  yearlyClassificationColor: string;
  warningMessage?: string | null;
}

export interface SchoolAnnualRollupResult {
  schoolYear: string;
  totalStaff: number;
  avgSchoolScore: number;
  quarterHeaders?: Array<{ index: number; id: string; name: string; code: string; startDate: Date; endDate: Date }>;
  classificationCounts: {
    xuat_sac: number;
    tot: number;
    hoan_thanh: number;
    khong_hoan_thanh: number;
  };
  staffList: SchoolAnnualStaffItem[];
}

export class AnnualRollupService {
  /**
   * Tổng hợp kết quả 4 quý trong năm học để phục vụ xếp loại cuối năm & cảnh báo HR
   */
  static async getEmployeeAnnualRollup(
    tenantId: string,
    employeeId: string,
    schoolYear: string = '2026-2027'
  ): Promise<AnnualRollupResult> {
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, tenantId },
      include: { primaryOrgUnit: true },
    });

    if (!employee) {
      throw new Error('Nhân sự không tồn tại');
    }

    // Lấy tất cả 4 kỳ đánh giá trong năm học
    const periods = await prisma.evaluationPeriod.findMany({
      where: {
        tenantId,
        schoolYear,
      },
      orderBy: { startDate: 'asc' },
    });

    // Lấy các bảng điểm đã lưu trong DB
    const periodIds = periods.map((p) => p.id);
    const scoreRecords = await prisma.kpiScoreRecord.findMany({
      where: {
        tenantId,
        employeeId,
        periodId: { in: periodIds },
      },
    });
    const recordMap = new Map<string, typeof scoreRecords[0]>();
    for (const r of scoreRecords) {
      recordMap.set(r.periodId, r);
    }

    const quarters: QuarterScoreItem[] = [];
    let sumScore = 0;
    let quartersWithScoreCount = 0;

    for (let idx = 0; idx < periods.length; idx++) {
      const p = periods[idx];
      const r = recordMap.get(p.id);

      let scoreGeneral = 30;
      let scoreTask = 0;
      let scoreBonus = 0;
      let scoreFinal = 30;
      let classification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh' | 'chua_danh_gia' = 'chua_danh_gia';
      let isCarriedForward = false;
      let hasEvaluatedScore = false;
      let totalTasks = 0;
      let completedTasks = 0;

      if (r) {
        scoreGeneral = r.scoreGeneral ?? 30;
        scoreTask = r.scoreTask ?? 0;
        scoreBonus = r.scoreBonusCapped ?? 0;
        scoreFinal = r.scoreFinal;
        classification = r.classification as any;
        isCarriedForward = r.isCarriedForward;
        hasEvaluatedScore = true;
      } else {
        // Tự động tính toán nếu có việc hoặc kỳ hiện hành
        try {
          const calc = await ScoreCalculationService.calculateEmployeeKpi(tenantId, employeeId, p.id);
          scoreGeneral = calc.scoreGeneral;
          scoreTask = calc.scoreTask;
          scoreBonus = calc.scoreBonusCapped;
          scoreFinal = calc.scoreFinal;
          totalTasks = calc.tasksBreakdown?.length || 0;
          completedTasks = calc.tasksBreakdown?.filter((t) => t.status === 'HOAN_THANH' || t.status === 'XAC_NHAN' || t.status === 'DONG').length || 0;

          if (scoreFinal >= 90) classification = 'xuat_sac';
          else if (scoreFinal >= 70) classification = 'tot';
          else if (scoreFinal >= 50) classification = 'hoan_thanh';
          else classification = 'khong_hoan_thanh';

          hasEvaluatedScore = totalTasks > 0 || p.status === 'open' || p.status === 'closed';
        } catch (e) {
          // default
        }
      }

      if (hasEvaluatedScore && !isCarriedForward) {
        sumScore += scoreFinal;
        quartersWithScoreCount++;
      }

      const labels: Record<string, string> = {
        xuat_sac: 'Xuất sắc',
        tot: 'Tốt',
        hoan_thanh: 'Hoàn thành',
        khong_hoan_thanh: 'Chưa đạt',
        chua_danh_gia: 'Chưa đánh giá',
      };

      quarters.push({
        periodId: p.id,
        periodName: p.name,
        periodCode: p.code,
        quarterIndex: idx + 1,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        scoreGeneral,
        scoreTask,
        scoreBonus,
        scoreFinal,
        classification,
        classificationLabel: labels[classification] || 'Chưa đánh giá',
        isCarriedForward,
        hasEvaluatedScore,
        totalTasks,
        completedTasks,
      });
    }

    const avgScore = quartersWithScoreCount > 0 ? Math.round((sumScore / quartersWithScoreCount) * 10) / 10 : 0;

    // Kiểm tra quy tắc tích lũy đánh giá cuối năm (Nghị định 90/2020/NĐ-CP)
    let hasFailedQuarter = false;
    let consecutiveFailedCount = 0;
    let maxConsecutiveFailed = 0;
    let allQuartersAtLeastGood = true;

    for (const q of quarters) {
      if (q.isCarriedForward || !q.hasEvaluatedScore) continue;

      if (q.classification === 'khong_hoan_thanh') {
        hasFailedQuarter = true;
        allQuartersAtLeastGood = false;
        consecutiveFailedCount++;
        if (consecutiveFailedCount > maxConsecutiveFailed) {
          maxConsecutiveFailed = consecutiveFailedCount;
        }
      } else {
        consecutiveFailedCount = 0;
        if (q.classification === 'hoan_thanh') {
          allQuartersAtLeastGood = false;
        }
      }
    }

    const canBeExcellentYearly = !hasFailedQuarter && allQuartersAtLeastGood;
    const requiresReplacementWarning = maxConsecutiveFailed >= 2;

    let yearlyClassification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh' = 'khong_hoan_thanh';
    let yearlyClassificationLabel = 'Không hoàn thành nhiệm vụ';
    let yearlyClassificationColor = '#DC2626';

    if (quartersWithScoreCount > 0) {
      if (avgScore >= 90 && canBeExcellentYearly) {
        yearlyClassification = 'xuat_sac';
        yearlyClassificationLabel = 'Hoàn thành Xuất sắc nhiệm vụ';
        yearlyClassificationColor = '#16A34A';
      } else if (avgScore >= 70 && !hasFailedQuarter) {
        yearlyClassification = 'tot';
        yearlyClassificationLabel = 'Hoàn thành Tốt nhiệm vụ';
        yearlyClassificationColor = '#2563EB';
      } else if (avgScore >= 50 && !requiresReplacementWarning) {
        yearlyClassification = 'hoan_thanh';
        yearlyClassificationLabel = 'Hoàn thành nhiệm vụ';
        yearlyClassificationColor = '#D97706';
      } else {
        yearlyClassification = 'khong_hoan_thanh';
        yearlyClassificationLabel = 'Không hoàn thành nhiệm vụ';
        yearlyClassificationColor = '#DC2626';
      }
    }

    let warningMessage: string | null = null;
    if (requiresReplacementWarning) {
      warningMessage = 'CẢNH BÁO NHÂN SỰ: Có 2 quý liên tiếp bị xếp "Không hoàn thành nhiệm vụ" — Cần báo cáo cấp ủy/BGH xem xét thay thế hoặc bố trí công tác khác.';
    } else if (hasFailedQuarter) {
      warningMessage = 'Lưu ý: Có quý bị xếp "Không hoàn thành nhiệm vụ" — Khóa điều kiện xét "Hoàn thành xuất sắc nhiệm vụ" cả năm.';
    } else if (!allQuartersAtLeastGood && avgScore >= 90) {
      warningMessage = 'Lưu ý: Điểm TB ≥ 90đ nhưng có quý xếp loại "Hoàn thành nhiệm vụ" nên xếp loại cả năm ở mức "Hoàn thành Tốt".';
    }

    return {
      employeeId,
      employeeName: employee.fullName,
      employeeTitle: employee.title || 'Cán bộ giáo viên',
      orgUnitName: employee.primaryOrgUnit?.name || 'Chưa phân tổ',
      schoolYear,
      quarters,
      avgScore,
      yearlyClassification,
      yearlyClassificationLabel,
      yearlyClassificationColor,
      hasFailedQuarter,
      consecutiveFailedCount: maxConsecutiveFailed,
      canBeExcellentYearly,
      requiresReplacementWarning,
      warningMessage,
    };
  }

  /**
   * Báo cáo Tổng kết KPI Cả năm cho toàn trường (Dành cho Ban Giám hiệu)
   */
  static async getSchoolAnnualRollup(
    tenantId: string,
    schoolYear: string = '2026-2027',
    orgUnitId?: string
  ): Promise<SchoolAnnualRollupResult> {
    const whereUser: any = {
      tenantId,
      isActive: true,
      roles: { none: { role: 'SYSTEM_ADMIN' } },
    };

    if (orgUnitId && orgUnitId !== 'all') {
      whereUser.primaryOrgUnitId = orgUnitId;
    }

    const [users, periods] = await Promise.all([
      prisma.user.findMany({
        where: whereUser,
        include: { primaryOrgUnit: true },
        orderBy: [{ primaryOrgUnitId: 'asc' }, { fullName: 'asc' }],
      }),
      prisma.evaluationPeriod.findMany({
        where: { tenantId, schoolYear },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    const periodIds = periods.map((p) => p.id);

    // Batch fetch all score records
    const allScoreRecords = await prisma.kpiScoreRecord.findMany({
      where: {
        tenantId,
        periodId: { in: periodIds },
      },
    });

    const scoreMap = new Map<string, typeof allScoreRecords[0]>();
    for (const r of allScoreRecords) {
      scoreMap.set(`${r.employeeId}_${r.periodId}`, r);
    }

    // Batch fetch all axes & weights
    const allAxes = await prisma.kpiAxis.findMany({
      where: { tenantId, isActive: true },
    });
    const axisMap = new Map<string, typeof allAxes[0]>();
    for (const a of allAxes) {
      axisMap.set(a.id, a);
    }

    // Batch fetch all tasks with primaryAxisId
    const allTasks = await prisma.task.findMany({
      where: {
        tenantId,
        primaryAxisId: { not: null },
      },
      select: {
        id: true,
        periodId: true,
        primaryAxisId: true,
        weightScore: true,
        status: true,
        progressPercent: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
        assignments: {
          select: { userId: true },
        },
      },
    });

    // Helper to evaluate one user's quarters
    const evaluateStaffQuarter = (
      userId: string,
      period: typeof periods[0],
      qIdx: number
    ) => {
      const recordKey = `${userId}_${period.id}`;
      const r = scoreMap.get(recordKey);

      let scoreGeneral = 30;
      let scoreTask = 0;
      let scoreBonus = 0;
      let scoreFinal = 30;
      let classification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh' | 'chua_danh_gia' = 'chua_danh_gia';
      let hasEvaluatedScore = false;
      let isCarriedForward = false;

      if (r) {
        scoreGeneral = r.scoreGeneral ?? 30;
        scoreTask = r.scoreTask ?? 0;
        scoreBonus = r.scoreBonusCapped ?? 0;
        scoreFinal = r.scoreFinal;
        classification = r.classification as any;
        hasEvaluatedScore = true;
        isCarriedForward = r.isCarriedForward;
      } else {
        // Fast in-memory calculate from tasks
        const userTasks = allTasks.filter((t) => {
          const isAssigned = t.assignments?.some((a) => a.userId === userId);
          if (!isAssigned) return false;
          if (t.periodId === period.id) return true;
          const taskDate = t.dueDate || t.completedAt || t.createdAt;
          if (taskDate && period.startDate && period.endDate) {
            const d = new Date(taskDate);
            return d >= new Date(period.startDate) && d <= new Date(period.endDate);
          }
          return false;
        });

        if (userTasks.length > 0) {
          hasEvaluatedScore = true;
          let sumAchievedWeight = 0;
          let sumTargetWeight = 0;

          for (const t of userTasks) {
            const axis = t.primaryAxisId ? axisMap.get(t.primaryAxisId) : null;
            const w = t.weightScore ?? (axis as any)?.defaultWeightScore ?? 10;
            sumTargetWeight += w;

            const isDone = t.status === 'HOAN_THANH' || t.status === 'XAC_NHAN' || t.status === 'DONG';
            if (isDone) {
              sumAchievedWeight += w;
            } else if (t.status === 'DANG_THUC_HIEN') {
              const prog = (t.progressPercent || 0) / 100;
              sumAchievedWeight += w * prog * 0.7;
            }
          }

          scoreTask = sumTargetWeight > 0 ? Math.min(70, Math.round((sumAchievedWeight / sumTargetWeight) * 70 * 10) / 10) : 0;
          scoreFinal = Math.min(100, Math.round((scoreGeneral + scoreTask + scoreBonus) * 10) / 10);
        } else {
          hasEvaluatedScore = period.status === 'open' || period.status === 'closed';
          scoreFinal = 30;
        }

        if (scoreFinal >= 90) classification = 'xuat_sac';
        else if (scoreFinal >= 70) classification = 'tot';
        else if (scoreFinal >= 50) classification = 'hoan_thanh';
        else classification = 'khong_hoan_thanh';
      }

      return {
        scoreFinal,
        classification,
        hasEvaluatedScore,
        isCarriedForward,
      };
    };

    const staffList: SchoolAnnualStaffItem[] = [];
    const classificationCounts = {
      xuat_sac: 0,
      tot: 0,
      hoan_thanh: 0,
      khong_hoan_thanh: 0,
    };

    let totalScoreSum = 0;
    let countEvaluated = 0;

    for (const u of users) {
      const qResults = periods.map((p, idx) => evaluateStaffQuarter(u.id, p, idx + 1));

      let sumScore = 0;
      let quartersCount = 0;
      let hasFailed = false;
      let consecutiveFailed = 0;
      let maxConsecutiveFailed = 0;
      let allAtLeastGood = true;

      for (const qr of qResults) {
        if (qr.hasEvaluatedScore && !qr.isCarriedForward) {
          sumScore += qr.scoreFinal;
          quartersCount++;

          if (qr.classification === 'khong_hoan_thanh') {
            hasFailed = true;
            consecutiveFailed++;
            if (consecutiveFailed > maxConsecutiveFailed) maxConsecutiveFailed = consecutiveFailed;
          } else {
            consecutiveFailed = 0;
          }

          if (qr.classification !== 'xuat_sac' && qr.classification !== 'tot') {
            allAtLeastGood = false;
          }
        }
      }

      const avgScore = quartersCount > 0 ? Math.round((sumScore / quartersCount) * 10) / 10 : 0;

      let yearlyClassification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh' = 'khong_hoan_thanh';
      let yearlyClassificationLabel = 'Chưa hoàn thành nhiệm vụ';
      let yearlyClassificationColor = '#DC2626';

      if (avgScore >= 90 && allAtLeastGood && !hasFailed) {
        yearlyClassification = 'xuat_sac';
        yearlyClassificationLabel = 'Hoàn thành xuất sắc nhiệm vụ';
        yearlyClassificationColor = '#D97706';
      } else if (avgScore >= 70 && !hasFailed) {
        yearlyClassification = 'tot';
        yearlyClassificationLabel = 'Hoàn thành tốt nhiệm vụ';
        yearlyClassificationColor = '#059669';
      } else if (avgScore >= 50 && maxConsecutiveFailed < 2) {
        yearlyClassification = 'hoan_thanh';
        yearlyClassificationLabel = 'Hoàn thành nhiệm vụ';
        yearlyClassificationColor = '#2563EB';
      } else {
        yearlyClassification = 'khong_hoan_thanh';
        yearlyClassificationLabel = 'Không hoàn thành nhiệm vụ';
        yearlyClassificationColor = '#DC2626';
      }

      classificationCounts[yearlyClassification]++;
      if (avgScore > 0) {
        totalScoreSum += avgScore;
        countEvaluated++;
      }

      let warningMessage: string | null = null;
      if (maxConsecutiveFailed >= 2) {
        warningMessage = 'CẢNH BÁO NHÂN SỰ: Có 2 quý liên tiếp bị xếp "Không hoàn thành nhiệm vụ" — Cần báo cáo cấp ủy/BGH xem xét thay thế hoặc bố trí công tác khác.';
      } else if (hasFailed) {
        warningMessage = 'Lưu ý: Có quý bị xếp "Không hoàn thành nhiệm vụ" — Khóa điều kiện xét "Hoàn thành xuất sắc nhiệm vụ" cả năm.';
      } else if (!allAtLeastGood && avgScore >= 90) {
        warningMessage = 'Lưu ý: Điểm TB ≥ 90đ nhưng có quý xếp loại "Hoàn thành nhiệm vụ" nên xếp loại cả năm ở mức "Hoàn thành Tốt".';
      }

      const q1 = qResults[0];
      const q2 = qResults[1];
      const q3 = qResults[2];
      const q4 = qResults[3];

      staffList.push({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        title: u.title || 'Cán bộ giáo viên',
        orgUnitId: u.primaryOrgUnitId,
        orgUnitName: u.primaryOrgUnit?.name || 'Chưa phân tổ',
        q1Score: q1?.hasEvaluatedScore ? q1.scoreFinal : null,
        q1Class: q1?.hasEvaluatedScore ? q1.classification : null,
        q2Score: q2?.hasEvaluatedScore ? q2.scoreFinal : null,
        q2Class: q2?.hasEvaluatedScore ? q2.classification : null,
        q3Score: q3?.hasEvaluatedScore ? q3.scoreFinal : null,
        q3Class: q3?.hasEvaluatedScore ? q3.classification : null,
        q4Score: q4?.hasEvaluatedScore ? q4.scoreFinal : null,
        q4Class: q4?.hasEvaluatedScore ? q4.classification : null,
        avgScore,
        yearlyClassification,
        yearlyClassificationLabel,
        yearlyClassificationColor,
        warningMessage,
      });
    }

    const avgSchoolScore = countEvaluated > 0 ? Math.round((totalScoreSum / countEvaluated) * 10) / 10 : 0;

    const quarterHeaders = periods.map((p, idx) => ({
      index: idx + 1,
      id: p.id,
      name: p.name,
      code: p.code,
      startDate: p.startDate,
      endDate: p.endDate,
    }));

    return {
      schoolYear,
      totalStaff: users.length,
      avgSchoolScore,
      quarterHeaders,
      classificationCounts,
      staffList,
    };
  }
}

