import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { TaskItem, TaskStatus, TaskPriority, TaskAssignmentRole } from '../models/task.models';

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
  status?: string;
  priority?: string;
  isOverdue?: boolean;
  myTasks?: boolean;
  page?: number;
  pageSize?: number;
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
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.priority) httpParams = httpParams.set('priority', params.priority);
    if (params.isOverdue !== undefined) httpParams = httpParams.set('isOverdue', params.isOverdue.toString());
    if (params.myTasks !== undefined) httpParams = httpParams.set('myTasks', params.myTasks.toString());
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

  createTask(data: {
    title: string;
    description?: string;
    planId?: string;
    locationId?: string;
    orgUnitId?: string;
    priority?: TaskPriority;
    startDate?: string;
    dueDate?: string;
    requireAttachment?: boolean;
    assignments?: Array<{ userId: string; role: TaskAssignmentRole; note?: string }>;
  }): Observable<TaskItem> {
    return this.http
      .post<{ success: boolean; data: TaskItem }>('/api/tasks', data)
      .pipe(map((res) => res.data));
  }

  updateTask(
    id: string,
    data: {
      title?: string;
      description?: string;
      locationId?: string;
      orgUnitId?: string;
      priority?: TaskPriority;
      startDate?: string;
      dueDate?: string;
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

  deleteTask(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/tasks/${id}`);
  }

  addComment(taskId: string, content: string): Observable<any> {
    return this.http
      .post<{ success: boolean; data: any }>(`/api/tasks/${taskId}/comments`, { content })
      .pipe(map((res) => res.data));
  }
}
