export interface ReportSummaryData {
  summary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionRate: number;
  };
  byLocation: Array<{
    name: string;
    total: number;
    completed: number;
    overdue: number;
  }>;
  byOrgUnit: Array<{
    name: string;
    total: number;
    completed: number;
    overdue: number;
  }>;
  tasks: Array<{
    id: string;
    code: string | null;
    title: string;
    status: string;
    priority: string;
    progressPercent: number;
    dueDate: string | null;
    completedAt: string | null;
    evaluationRating: string | null;
    locationName: string;
    orgUnitName: string;
    planTitle: string;
    assigneeName: string;
  }>;
}
