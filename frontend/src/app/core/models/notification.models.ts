export type NotificationType =
  | 'GIAO_VIEC'
  | 'NHAC_VIEC'
  | 'CAN_BO_SUNG'
  | 'DA_HOAN_THANH'
  | 'HET_HAN'
  | 'HE_THONG'
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'TASK_REJECTED'
  | 'TASK_APPROVED'
  | 'STATUS_CHANGED'
  | 'GENERAL';

export interface NotificationItem {
  id: string;
  userId?: string;
  taskId?: string | null;
  taskCode?: string | null;
  planId?: string | null;
  link?: string | null;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  readAt?: string | null;
  senderName?: string | null;
  senderAvatar?: string | null;
  createdAt: string;
}

export interface NotificationFilterParams {
  unreadOnly?: boolean;
  search?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
