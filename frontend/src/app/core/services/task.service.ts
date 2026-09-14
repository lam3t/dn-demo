import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  TaskItem,
  TaskStatus,
  TaskPriority,
  TaskAssignmentRole,
  TaskEvaluationRating,
  TaskLogItem,
  TaskCommentItem,
} from '../models/task.models';

export interface TaskListResponse {
  items: TaskItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TaskFilterParams {
  search?: string;
  planId?: string;
  locationId?: string;
  orgUnitId?: string;
  assignedOrgUnitId?: string;
  status?: string;
  priority?: string;
  isOverdue?: boolean;
  myTasks?: boolean;
  isProposal?: boolean;
  proposalStatus?: string;
  assigneeId?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  planId?: string | null;
  locationId?: string | null;
  orgUnitId?: string | null;
  assignedOrgUnitId?: string | null;
  isOrgAssignment?: boolean;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  requireAttachment?: boolean;
  isProposal?: boolean;
  proposalNote?: string;
  assignments?: Array<{ userId: string; role: TaskAssignmentRole; note?: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private http = inject(HttpClient);

  getTasks(params: TaskFilterParams = {}): Observable<TaskListResponse> {
    let httpParams = new HttpParams();
    if (params.search?.trim()) httpParams = httpParams.set('search', params.search.trim());
    if (params.planId) httpParams = httpParams.set('planId', params.planId);
    if (params.locationId) httpParams = httpParams.set('locationId', params.locationId);
    if (params.orgUnitId) httpParams = httpParams.set('orgUnitId', params.orgUnitId);
    if (params.assignedOrgUnitId) httpParams = httpParams.set('assignedOrgUnitId', params.assignedOrgUnitId);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.priority) httpParams = httpParams.set('priority', params.priority);
    if (params.isOverdue !== undefined) httpParams = httpParams.set('isOverdue', params.isOverdue.toString());
    if (params.myTasks !== undefined) httpParams = httpParams.set('myTasks', params.myTasks.toString());
    if (params.isProposal !== undefined) httpParams = httpParams.set('isProposal', params.isProposal.toString());
    if (params.proposalStatus) httpParams = httpParams.set('proposalStatus', params.proposalStatus);
    if (params.assigneeId) httpParams = httpParams.set('assigneeId', params.assigneeId);
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http
      .get<{ success: boolean; data: TaskListResponse }>('/api/tasks', { params: httpParams })
      .pipe(map((res) => res.data));
  }

  getTaskById(id: string): Observable<TaskItem> {
    return this.http
      .get<{ success: boolean; data: TaskItem }>(`/api/tasks/${id}/full`)
      .pipe(map((res) => res.data));
  }

  createTask(data: CreateTaskPayload): Observable<TaskItem> {
    return this.http
      .post<{ success: boolean; data: TaskItem }>('/api/tasks', data)
      .pipe(map((res) => res.data));
  }

  updateTask(
    id: string,
    data: {
      title?: string;
      description?: string;
      locationId?: string | null;
      orgUnitId?: string | null;
      assignedOrgUnitId?: string | null;
      isOrgAssignment?: boolean;
      priority?: TaskPriority;
      startDate?: string | null;
      dueDate?: string | null;
      requireAttachment?: boolean;
    }
  ): Observable<TaskItem> {
    return this.http
      .put<{ success: boolean; data: TaskItem }>(`/api/tasks/${id}`, data)
      .pipe(map((res) => res.data));
  }

  updateStatus(id: string, status: TaskStatus, note?: string): Observable<TaskItem> {
    return this.http
      .patch<{ success: boolean; data: TaskItem }>(`/api/tasks/${id}/status`, { status, note })
      .pipe(map((res) => res.data));
  }

  updateProgress(id: string, progressPercent: number, note?: string): Observable<TaskItem> {
    return this.http
      .patch<{ success: boolean; data: TaskItem }>(`/api/tasks/${id}/progress`, {
        progressPercent,
        note,
      })
      .pipe(map((res) => res.data));
  }

  updateAssignments(
    id: string,
    assignments: Array<{ userId: string; role: TaskAssignmentRole; note?: string }>
  ): Observable<TaskItem> {
    return this.http
      .post<{ success: boolean; data: TaskItem }>(`/api/tasks/${id}/assignments`, { assignments })
      .pipe(map((res) => res.data));
  }

  evaluateTask(
    id: string,
    payload: { rating: TaskEvaluationRating; comment?: string }
  ): Observable<TaskItem> {
    return this.http
      .post<{ success: boolean; data: TaskItem }>(`/api/tasks/${id}/evaluate`, payload)
      .pipe(map((res) => res.data));
  }

  proposeTask(payload: CreateTaskPayload): Observable<TaskItem> {
    return this.http
      .post<{ success: boolean; data: TaskItem }>('/api/tasks/propose', payload)
      .pipe(map((res) => res.data));
  }

  approveProposal(id: string, note?: string): Observable<TaskItem> {
    return this.http
      .post<{ success: boolean; data: TaskItem }>(`/api/tasks/${id}/approve-proposal`, { note })
      .pipe(map((res) => res.data));
  }

  rejectProposal(id: string, reason?: string): Observable<TaskItem> {
    return this.http
      .post<{ success: boolean; data: TaskItem }>(`/api/tasks/${id}/reject-proposal`, { reason })
      .pipe(map((res) => res.data));
  }

  getTaskLogs(id: string): Observable<TaskLogItem[]> {
    return this.http
      .get<{ success: boolean; data: TaskLogItem[] }>(`/api/tasks/${id}/logs`)
      .pipe(map((res) => res.data));
  }

  addComment(
    taskId: string,
    payload: string | { content: string; mentions?: string[]; attachments?: any }
  ): Observable<TaskCommentItem> {
    const body = typeof payload === 'string' ? { content: payload } : payload;
    return this.http
      .post<{ success: boolean; data: TaskCommentItem }>(`/api/tasks/${taskId}/comments`, body)
      .pipe(map((res) => res.data));
  }

  deleteTask(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/tasks/${id}`);
  }
}
