export interface GlobalSearchResult {
  tasks: Array<{
    id: string;
    code: string | null;
    title: string;
    status: string;
    priority: string;
    progressPercent: number;
    dueDate: string | null;
    plan?: { id: string; title: string } | null;
    assignedOrgUnit?: { id: string; name: string } | null;
    assignee?: { id: string; fullName: string; avatarUrl?: string | null } | null;
    type: 'TASK';
  }>;
  plans: Array<{
    id: string;
    title: string;
    level: string;
    progressPercent: number;
    startDate: string;
    endDate: string;
    createdBy?: { id: string; fullName: string } | null;
    type: 'PLAN';
  }>;
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    title?: string | null;
    avatarUrl?: string | null;
    primaryOrgUnit?: { id: string; name: string } | null;
    primaryLocation?: { id: string; name: string } | null;
    type: 'USER';
  }>;
  total: number;
}
