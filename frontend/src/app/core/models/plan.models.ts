export type PlanLevel = 'NAM' | 'HOC_KY' | 'QUY' | 'THANG' | 'TUAN';

export interface PlanItem {
  id: string;
  schoolId: string;
  title: string;
  description?: string | null;
  level: PlanLevel;
  parentPlanId?: string | null;
  startDate: string;
  endDate: string;
  progressPercent: number;
  createdById: string;
  createdAt: string;
  parentPlan?: { id: string; title: string; level: PlanLevel } | null;
  createdBy?: { id: string; fullName: string; title?: string | null; avatarUrl?: string | null };
  _count?: { childrenPlans: number; tasks: number };
}

export interface PlanTreeNode {
  id: string;
  title: string;
  description?: string | null;
  level: PlanLevel;
  startDate: string;
  endDate: string;
  progressPercent: number;
  parentPlanId?: string | null;
  taskCount: number;
  completedTaskCount: number;
  tasks: any[];
  children: PlanTreeNode[];
}
