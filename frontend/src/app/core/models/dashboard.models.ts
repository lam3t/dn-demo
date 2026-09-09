import { TaskStatus, TaskPriority } from './task.models';

export interface AttentionTaskItem {
  id: string;
  code?: string | null;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  progressPercent: number;
  dueDate?: string | null;
  isOverdue?: boolean;
  reason: string;
  priorityLevel: number;
  locationName?: string;
  orgUnitName?: string;
  chuTri?: {
    id: string;
    fullName: string;
    title?: string | null;
    phone: string;
    avatarUrl?: string | null;
    locationName?: string;
  } | null;
}

export interface LocationBreakdownItem {
  id: string;
  name: string;
  code: string;
  isMain: boolean;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingReviewTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface OrgUnitBreakdownItem {
  id: string;
  name: string;
  code: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingReviewTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface DashboardOverviewData {
  totalTasks: number;
  byStatus: Record<TaskStatus, number>;
  overdueCount: number;
  completedCount: number;
  inProgressCount: number;
  pendingReviewCount: number;
  attentionTasks: AttentionTaskItem[];
  breakdownByLocation: LocationBreakdownItem[];
  breakdownByOrgUnit: OrgUnitBreakdownItem[];
}
