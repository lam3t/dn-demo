import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ReportSummaryData } from '../models/report.models';
import { TaskItem, TaskStatus } from '../models/task.models';

export interface ReportFilterCriteria {
  locationId?: string;
  orgUnitId?: string;
  planId?: string;
  status?: string;
  priority?: string;
  isOverdue?: boolean;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  inPlanOnly?: boolean;
  outOfPlanOnly?: boolean;
}

export interface ReportSummaryKpis {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  waitingReviewTasks: number;
  waitingConfirmTasks: number;
  overdueTasks: number;
  completionRate: number;
  inPlanCount: number;
  outOfPlanCount: number;
}

export interface BreakdownStatItem {
  id: string;
  name: string;
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

export interface ReportFilterDto {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  orgUnitId?: string;
  status?: string;
  planId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private http = inject(HttpClient);

  getSummary(filters?: ReportFilterDto): Observable<ReportSummaryData> {
    let params = new HttpParams();
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.locationId) params = params.set('locationId', filters.locationId);
    if (filters?.orgUnitId) params = params.set('orgUnitId', filters.orgUnitId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.planId) params = params.set('planId', filters.planId);

    return this.http
      .get<{ success: boolean; data: ReportSummaryData }>('/api/reports/summary', { params })
      .pipe(map((res) => res.data));
  }

  getReportTasks(filters?: ReportFilterCriteria): Observable<TaskItem[]> {
    let params = new HttpParams();
    if (filters?.locationId) params = params.set('locationId', filters.locationId);
    if (filters?.orgUnitId) params = params.set('orgUnitId', filters.orgUnitId);
    if (filters?.planId) params = params.set('planId', filters.planId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.priority) params = params.set('priority', filters.priority);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.search) params = params.set('search', filters.search);

    return this.http
      .get<{ success: boolean; data: any }>('/api/tasks', { params })
      .pipe(
        map((res) => {
          if (Array.isArray(res.data)) return res.data as TaskItem[];
          if (res.data && Array.isArray(res.data.tasks)) return res.data.tasks as TaskItem[];
          return [];
        })
      );
  }

  exportExcel(filters?: ReportFilterDto): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.locationId) params = params.set('locationId', filters.locationId);
    if (filters?.orgUnitId) params = params.set('orgUnitId', filters.orgUnitId);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.planId) params = params.set('planId', filters.planId);

    return this.http.get('/api/reports/export-excel', {
      params,
      responseType: 'blob',
    });
  }

  computeSummaryKpis(tasks: TaskItem[]): ReportSummaryKpis {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'HOAN_THANH' || t.status === 'DONG').length;
    const waitingReviewTasks = tasks.filter((t) => t.status === 'CHO_KIEM_TRA').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'DANG_THUC_HIEN' || t.status === 'DA_GIAO' || t.status === 'BO_SUNG').length;
    const overdueTasks = tasks.filter((t) => t.isOverdue).length;
    const inPlanCount = tasks.filter((t) => !!t.planId).length;
    const outOfPlanCount = totalTasks - inPlanCount;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      waitingReviewTasks,
      waitingConfirmTasks: waitingReviewTasks,
      overdueTasks,
      completionRate,
      inPlanCount,
      outOfPlanCount,
    };
  }

  computeLocationBreakdown(tasks: TaskItem[]): BreakdownStatItem[] {
    const map = new Map<string, BreakdownStatItem>();

    for (const t of tasks) {
      const locId = t.locationId || 'default';
      const locName = t.location?.name || 'Chung';
      const stat = map.get(locId) || {
        id: locId,
        name: locName,
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        completionRate: 0,
      };

      stat.total++;
      if (t.status === 'HOAN_THANH' || t.status === 'DONG') stat.completed++;
      else if (t.isOverdue) stat.overdue++;
      else stat.inProgress++;

      stat.completionRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
      map.set(locId, stat);
    }

    return Array.from(map.values());
  }

  computeOrgUnitBreakdown(tasks: TaskItem[]): BreakdownStatItem[] {
    const map = new Map<string, BreakdownStatItem>();

    for (const t of tasks) {
      const orgId = t.assignedOrgUnitId || t.orgUnitId || 'default';
      const orgName = t.assignedOrgUnit?.name || t.orgUnit?.name || 'Khác';
      const stat = map.get(orgId) || {
        id: orgId,
        name: orgName,
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        completionRate: 0,
      };

      stat.total++;
      if (t.status === 'HOAN_THANH' || t.status === 'DONG') stat.completed++;
      else if (t.isOverdue) stat.overdue++;
      else stat.inProgress++;

      stat.completionRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
      map.set(orgId, stat);
    }

    return Array.from(map.values());
  }

  exportToExcel(
    title: string,
    filterMeta: any,
    kpis: ReportSummaryKpis,
    tasks: TaskItem[],
    fileName = 'Bao_Cao.xls'
  ) {
    this.exportExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('.xls', '.xlsx');
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        // Fallback simple CSV / XML download if server stream fails
        const xmlContent = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="BaoCao"><Table><Row><Cell><Data ss:Type="String">${title}</Data></Cell></Row></Table></Worksheet></Workbook>`;
        const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
      },
    });
  }
}
