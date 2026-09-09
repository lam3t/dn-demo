import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PlanItem, PlanTreeNode, PlanLevel } from '../models/plan.models';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private http = inject(HttpClient);

  getPlanTree(rootPlanId?: string): Observable<PlanTreeNode[]> {
    let params = new HttpParams();
    if (rootPlanId) params = params.set('rootPlanId', rootPlanId);

    return this.http
      .get<{ success: boolean; data: PlanTreeNode[] }>('/api/plans/tree', { params })
      .pipe(map((res) => res.data || []));
  }

  getAll(params: { level?: PlanLevel; parentPlanId?: string | null; search?: string } = {}): Observable<PlanItem[]> {
    let httpParams = new HttpParams();
    if (params.level) httpParams = httpParams.set('level', params.level);
    if (params.parentPlanId) httpParams = httpParams.set('parentPlanId', params.parentPlanId);
    if (params.search?.trim()) httpParams = httpParams.set('search', params.search.trim());

    return this.http
      .get<{ success: boolean; data: PlanItem[] }>('/api/plans', { params: httpParams })
      .pipe(map((res) => res.data || []));
  }

  getById(id: string): Observable<PlanItem> {
    return this.http
      .get<{ success: boolean; data: PlanItem }>(`/api/plans/${id}`)
      .pipe(map((res) => res.data));
  }

  create(data: {
    title: string;
    description?: string;
    level: PlanLevel;
    parentPlanId?: string | null;
    startDate: string;
    endDate: string;
  }): Observable<PlanItem> {
    return this.http
      .post<{ success: boolean; data: PlanItem }>('/api/plans', data)
      .pipe(map((res) => res.data));
  }

  update(
    id: string,
    data: {
      title?: string;
      description?: string;
      level?: PlanLevel;
      parentPlanId?: string | null;
      startDate?: string;
      endDate?: string;
    }
  ): Observable<PlanItem> {
    return this.http
      .put<{ success: boolean; data: PlanItem }>(`/api/plans/${id}`, data)
      .pipe(map((res) => res.data));
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/plans/${id}`);
  }

  generateTasks(
    planId: string,
    tasksData: Array<{
      title: string;
      description?: string;
      locationId?: string;
      orgUnitId?: string;
      priority?: string;
      startDate?: string;
      dueDate?: string;
      chuTriId: string;
      phoiHopIds?: string[];
      kiemTraId?: string;
    }>
  ): Observable<any[]> {
    return this.http
      .post<{ success: boolean; data: any[] }>(`/api/plans/${planId}/generate-tasks`, {
        tasks: tasksData,
      })
      .pipe(map((res) => res.data || []));
  }

  duplicate(
    planId: string,
    options: {
      newTitle?: string;
      newStartDate?: string;
      newEndDate?: string;
      includeTasks?: boolean;
    }
  ): Observable<PlanItem> {
    return this.http
      .post<{ success: boolean; data: PlanItem }>(`/api/plans/${planId}/duplicate`, options)
      .pipe(map((res) => res.data));
  }
}
