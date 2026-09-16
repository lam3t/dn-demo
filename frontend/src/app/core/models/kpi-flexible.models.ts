export type AxisRoleScope = 'ALL' | 'GV_ONLY' | 'NV_ONLY' | 'RESTRICTED';

export interface KpiSubtypeOption {
  code: string;
  name: string;
}

export interface KpiAxis {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  roleScope: AxisRoleScope;
  restrictedPositionCodes?: string[] | null;
  requiresSubtype: boolean;
  subtypeOptions?: KpiSubtypeOption[] | null;
  warnOveruseThresholdPct?: number | null;
}

export interface EvaluationPeriod {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  submissionDeadline?: string | null;
  status: 'draft' | 'open' | 'closed';
  schoolYear: string;
}

export interface UnitAxisApplicabilityItem {
  axisId: string;
  axisCode: string;
  axisName: string;
  description?: string | null;
  roleScope: AxisRoleScope;
  restrictedPositionCodes?: string[] | null;
  requiresSubtype: boolean;
  subtypeOptions?: KpiSubtypeOption[] | null;
  displayOrder: number;
  isApplicable: boolean;
  reason?: string | null;
  applicabilityId?: string | null;
}

export interface TaskAssignmentLogItem {
  id: string;
  title: string;
  description?: string | null;
  assignedDepartment?: string | null;
  note?: string | null;
  createdAt: string;
  assignedBy: {
    id: string;
    fullName: string;
    title?: string | null;
  };
  assignedTo?: {
    id: string;
    fullName: string;
    title?: string | null;
  } | null;
  relatedAxis?: {
    id: string;
    code: string;
    name: string;
  } | null;
  orgUnit?: {
    id: string;
    name: string;
  } | null;
}

export interface KpiBonusProposalItem {
  id: string;
  taskId: string;
  reasonType: 'tien_do_vuot' | 'sang_kien_moi';
  reasonDescription?: string | null;
  proposedBonusPct: number;
  calculatedBonusScore: number;
  status: 'proposed' | 'approved' | 'rejected';
  approvedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  task: {
    id: string;
    title: string;
    weightScore?: number | null;
    status: string;
    progressPercent: number;
  };
  proposedBy: {
    id: string;
    fullName: string;
    title?: string | null;
    primaryOrgUnit?: { name: string } | null;
  };
  approvedBy?: {
    id: string;
    fullName: string;
  } | null;
}

export interface AxisBreakdownItem {
  axisId: string;
  axisCode: string;
  axisName: string;
  displayOrder: number;
  totalTasks: number;
  completedTasks: number;
  totalWeightScore: number;
  achievedScore: number;
  percentageOfTaskScore: number;
  subtypes?: {
    gv_bo_mon?: { totalTasks: number; achievedScore: number; weightScore: number };
    gvcn?: { totalTasks: number; achievedScore: number; weightScore: number };
  };
}

export interface ScoreCalculationSheet {
  employeeId: string;
  employeeName: string;
  periodId: string;
  periodName: string;
  scoreGeneral: number;       // 0 - 30 điểm
  scoreTask: number;          // 0 - 70 điểm
  scoreBonusRaw: number;      // Tổng thưởng trước trần
  scoreBonusCapped: number;   // Thưởng sau khi áp trần 7 điểm / 10%
  scoreFinal: number;         // Tổng điểm cuối cùng (0 - 100)
  tasksBreakdown: any[];
  axisBreakdown: AxisBreakdownItem[];
  bonusDetails: any[];
  classificationEvaluation: {
    suggestedClassification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh';
    classificationLabel: string;
    classificationColor: string;
    scoreFinal: number;
    hasUncompletedTasks: boolean;
    completionRatePct: number;
    exceededTasksCount: number;
    exceededTasksPct: number;
    leadershipQuotaWarning?: string | null;
    requiresExtraConditionsConfirmation: boolean;
  };
}

export interface SpecialCaseItem {
  id: string;
  employeeId: string;
  periodId: string;
  caseType: string;
  resolution: string;
  isCarriedForward?: boolean;
  note?: string | null;
  createdAt: string;
  employee: {
    id: string;
    fullName: string;
    email: string;
    title?: string | null;
    primaryOrgUnit?: { name: string } | null;
  };
  approvedBy?: {
    id: string;
    fullName: string;
  } | null;
}

export interface StaffKpiItem {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  title?: string | null;
  orgUnitId?: string | null;
  orgUnitName?: string | null;
  scoreGeneral: number;
  scoreTask: number;
  scoreBonus: number;
  scoreFinal: number;
  classification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh';
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
  axisBreakdown: AxisBreakdownItem[];
  tasks: Array<{
    id: string;
    code: string;
    title: string;
    status: string;
    priority: string;
    progressPercent: number;
    dueDate?: string | null;
    completedAt?: string | null;
    primaryAxisId?: string | null;
    axisName?: string | null;
    taskSubtype?: string | null;
    weightScore?: number | null;
    achievedScore?: number;
    hasEvidence?: boolean;
    evidenceCount?: number;
  }>;
}

export interface SchoolKpiOverview {
  periodId: string;
  totalStaff: number;
  schoolTotalTasks: number;
  schoolCompletedTasks: number;
  schoolCompletionRate: number;
  classificationCounts: {
    xuat_sac: number;
    tot: number;
    hoan_thanh: number;
    khong_hoan_thanh: number;
  };
  schoolAxisBreakdown: Array<{
    id: string;
    name: string;
    code: string;
    displayOrder: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalScore: number;
  }>;
  staffList: StaffKpiItem[];
}

export interface QuarterScoreItem {
  periodId: string;
  periodName: string;
  periodCode: string;
  quarterIndex: number;
  startDate: string;
  endDate: string;
  status: string;
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
  quarterHeaders?: Array<{ index: number; id: string; name: string; code: string; startDate: string; endDate: string }>;
  classificationCounts: {
    xuat_sac: number;
    tot: number;
    hoan_thanh: number;
    khong_hoan_thanh: number;
  };
  staffList: SchoolAnnualStaffItem[];
}

export interface UnitAxisMatrixReport {
  periodId: string;
  periodName: string;
  totalOrgUnits: number;
  totalEmployees: number;
  totalStaff?: number;
  excellentCount?: number;
  totalTasks: number;
  matrix: any[];
  axes: any[];
  [key: string]: any;
}


