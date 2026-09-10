export type TaskStatus =
  | 'NHAP'
  | 'DA_GIAO'
  | 'DA_TIEP_NHAN'
  | 'DANG_THUC_HIEN'
  | 'CHO_KIEM_TRA'
  | 'BO_SUNG'
  | 'HOAN_THANH'
  | 'XAC_NHAN'
  | 'DONG'
  | 'TAM_DUNG'
  | 'HUY';

export type TaskPriority = 'THAP' | 'TRUNG_BINH' | 'CAO' | 'KHAN_CAP';

export type TaskAssignmentRole =
  | 'CHU_TRI'
  | 'PHOI_HOP'
  | 'KIEM_TRA'
  | 'PHE_DUYET'
  | 'THEO_DOI';

export interface TaskAssignmentItem {
  id: string;
  taskId: string;
  userId: string;
  role: TaskAssignmentRole;
  note?: string | null;
  assignedAt: string;
  user: {
    id: string;
    fullName: string;
    title?: string | null;
    phone: string;
    email: string;
    avatarUrl?: string | null;
    primaryLocation?: { id: string; name: string } | null;
    primaryOrgUnit?: { id: string; name: string } | null;
  };
}

export interface TaskLogItem {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  oldStatus?: TaskStatus | null;
  newStatus?: TaskStatus | null;
  oldProgress?: number | null;
  newProgress?: number | null;
  note?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    title?: string | null;
    avatarUrl?: string | null;
    phone?: string;
  };
  attachments?: TaskAttachmentItem[];
}

export interface TaskAttachmentItem {
  id: string;
  taskId?: string;
  taskLogId?: string | null;
  uploadedById: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

export interface TaskCommentItem {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    title?: string | null;
    avatarUrl?: string | null;
    phone?: string;
  };
}

export interface TaskItem {
  id: string;
  schoolId: string;
  code?: string | null;
  title: string;
  description?: string | null;
  planId?: string | null;
  locationId?: string | null;
  orgUnitId?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  progressPercent: number;
  requireAttachment?: boolean;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
  isOverdue?: boolean;
  plan?: { id: string; title: string; level: string } | null;
  location?: { id: string; name: string; code: string; phone?: string } | null;
  orgUnit?: { id: string; name: string; code: string } | null;
  createdBy?: {
    id: string;
    fullName: string;
    title?: string | null;
    avatarUrl?: string | null;
    phone?: string;
  };
  assignments: TaskAssignmentItem[];
  logs?: TaskLogItem[];
  attachments?: TaskAttachmentItem[];
  comments?: TaskCommentItem[];
  _count?: {
    attachments: number;
    comments: number;
    logs: number;
  };
}
