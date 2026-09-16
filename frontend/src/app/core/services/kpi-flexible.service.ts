import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  KpiAxis,
  EvaluationPeriod,
  UnitAxisApplicabilityItem,
  TaskAssignmentLogItem,
  KpiBonusProposalItem,
  ScoreCalculationSheet,
  SpecialCaseItem,
  SchoolKpiOverview,
  StaffKpiItem,
  AnnualRollupResult,
  SchoolAnnualRollupResult,
} from '../models/kpi-flexible.models';

@Injectable({
  providedIn: 'root',
})
export class KpiFlexibleService {
  private http = inject(HttpClient);

  // 1. Quản lý Kỳ đánh giá
  getPeriods(schoolYear?: string): Observable<EvaluationPeriod[]> {
    let params = new HttpParams();
    if (schoolYear) params = params.set('schoolYear', schoolYear);
    return this.http
      .get<{ success: boolean; data: EvaluationPeriod[] }>('/api/kpi/periods', { params })
      .pipe(map((res) => res.data || []));
  }

  createPeriod(data: any): Observable<EvaluationPeriod> {
    return this.http
      .post<{ success: boolean; data: EvaluationPeriod }>('/api/kpi/periods', data)
      .pipe(map((res) => res.data));
  }

  // 2. Danh mục Trục kết quả & Phân quyền trục
  getAxes(): Observable<KpiAxis[]> {
    return this.http
      .get<{ success: boolean; data: KpiAxis[] }>('/api/kpi/axes')
      .pipe(map((res) => res.data || []));
  }

  createOrUpdateAxis(data: Partial<KpiAxis>): Observable<KpiAxis> {
    return this.http
      .post<{ success: boolean; data: KpiAxis }>('/api/kpi/axes', data)
      .pipe(map((res) => res.data));
  }

  getAllowedAxes(): Observable<KpiAxis[]> {
    return this.http
      .get<{ success: boolean; data: KpiAxis[] }>('/api/kpi/axes/allowed')
      .pipe(map((res) => res.data || []));
  }

  getUnitApplicability(unitId: string, periodId: string): Observable<UnitAxisApplicabilityItem[]> {
    const params = new HttpParams().set('unitId', unitId).set('periodId', periodId);
    return this.http
      .get<{ success: boolean; data: UnitAxisApplicabilityItem[] }>('/api/kpi/axes/applicability', { params })
      .pipe(map((res) => res.data || []));
  }

  setUnitApplicability(data: {
    unitId: string;
    periodId: string;
    axisId: string;
    isApplicable: boolean;
    reason?: string;
  }): Observable<any> {
    return this.http
      .put<{ success: boolean; data: any }>('/api/kpi/axes/applicability', data)
      .pipe(map((res) => res.data));
  }

  // 3. Nhiệm vụ KPI (CRUD + Validation)
  createKpiTask(data: any): Observable<any> {
    return this.http
      .post<{ success: boolean; data: any }>('/api/kpi/tasks', data)
      .pipe(map((res) => res.data));
  }

  updateKpiTask(id: string, data: any): Observable<any> {
    return this.http
      .put<{ success: boolean; data: any }>(`/api/kpi/tasks/${id}`, data)
      .pipe(map((res) => res.data));
  }

  // 4. Màn hình "Giao việc" (Task Assignment Log)
  getAssignmentLogs(periodId?: string, unitId?: string): Observable<TaskAssignmentLogItem[]> {
    let params = new HttpParams();
    if (periodId) params = params.set('periodId', periodId);
    if (unitId) params = params.set('unitId', unitId);
    return this.http
      .get<{ success: boolean; data: TaskAssignmentLogItem[] }>('/api/kpi/assignment-logs', { params })
      .pipe(map((res) => res.data || []));
  }

  createAssignmentLog(data: any): Observable<TaskAssignmentLogItem> {
    return this.http
      .post<{ success: boolean; data: TaskAssignmentLogItem }>('/api/kpi/assignment-logs', data)
      .pipe(map((res) => res.data));
  }

  deleteAssignmentLog(id: string): Observable<any> {
    return this.http.delete(`/api/kpi/assignment-logs/${id}`);
  }

  // 5. Đề xuất & Duyệt điểm thưởng
  getBonusProposals(periodId?: string, status?: string): Observable<KpiBonusProposalItem[]> {
    let params = new HttpParams();
    if (periodId) params = params.set('periodId', periodId);
    if (status) params = params.set('status', status);
    return this.http
      .get<{ success: boolean; data: KpiBonusProposalItem[] }>('/api/kpi/bonus-proposals', { params })
      .pipe(map((res) => res.data || []));
  }

  proposeBonus(data: {
    taskId: string;
    periodId: string;
    reasonType: 'tien_do_vuot' | 'sang_kien_moi';
    reasonDescription?: string;
    proposedBonusPct?: number;
  }): Observable<KpiBonusProposalItem> {
    return this.http
      .post<{ success: boolean; data: KpiBonusProposalItem }>('/api/kpi/bonus-proposals', data)
      .pipe(map((res) => res.data));
  }

  reviewBonusProposal(
    proposalId: string,
    status: 'approved' | 'rejected',
    reviewNote?: string
  ): Observable<KpiBonusProposalItem> {
    return this.http
      .put<{ success: boolean; data: KpiBonusProposalItem }>(`/api/kpi/bonus-proposals/${proposalId}/review`, {
        status,
        reviewNote,
      })
      .pipe(map((res) => res.data));
  }

  // 6. Bảng điểm 100 & Xếp loại
  getMyScoreSheet(periodId?: string): Observable<ScoreCalculationSheet> {
    let params = new HttpParams();
    if (periodId) params = params.set('periodId', periodId);
    return this.http
      .get<{ success: boolean; data: ScoreCalculationSheet }>('/api/kpi/scores/my', { params })
      .pipe(map((res) => res.data));
  }

  getUserScoreSheet(userId: string, periodId?: string): Observable<ScoreCalculationSheet> {
    let params = new HttpParams();
    if (periodId) params = params.set('periodId', periodId);
    return this.http
      .get<{ success: boolean; data: ScoreCalculationSheet }>(`/api/kpi/scores/user/${userId}`, { params })
      .pipe(map((res) => res.data));
  }

  submitKpiScore(periodId: string, scoreGeneral: number = 30, note?: string): Observable<any> {
    return this.http
      .post<{ success: boolean; data: any }>('/api/kpi/scores/submit', { periodId, scoreGeneral, note })
      .pipe(map((res) => res.data));
  }

  updateScoreGeneral(data: {
    employeeId: string;
    periodId: string;
    scoreGeneral: number;
    note?: string;
  }): Observable<any> {
    return this.http
      .post<{ success: boolean; data: any; message: string }>('/api/kpi/score-general', data)
      .pipe(map((res) => res.data));
  }

  approveKpiScore(
    recordId: string,
    finalClassification: 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh',
    meetsExtraConditions: boolean,
    overrideReason?: string
  ): Observable<any> {
    return this.http
      .put<{ success: boolean; data: any }>(`/api/kpi/scores/${recordId}/approve`, {
        finalClassification,
        meetsExtraConditions,
        overrideReason,
      })
      .pipe(map((res) => res.data));
  }

  // 7. Báo cáo Ma trận Trục kết quả Đơn vị
  getUnitAxisSummaryReport(orgUnitId: string, periodId?: string): Observable<any> {
    let params = new HttpParams().set('orgUnitId', orgUnitId);
    if (periodId) params = params.set('periodId', periodId);
    return this.http
      .get<{ success: boolean; data: any }>('/api/kpi/summary/unit-axis', { params })
      .pipe(map((res) => res.data));
  }

  // 7b. Tổng hợp KPI Toàn trường & Giám sát BGH (School KPI Overview)
  getSchoolOverview(filters?: {
    orgUnitId?: string;
    periodId?: string;
    search?: string;
    classification?: string;
  }): Observable<SchoolKpiOverview> {
    let params = new HttpParams();
    if (filters?.orgUnitId && filters.orgUnitId !== 'all') params = params.set('orgUnitId', filters.orgUnitId);
    if (filters?.periodId) params = params.set('periodId', filters.periodId);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.classification && filters.classification !== 'all') params = params.set('classification', filters.classification);

    return this.http
      .get<{ success: boolean; data: SchoolKpiOverview }>('/api/kpi/school-overview', { params })
      .pipe(map((res) => res.data));
  }

  // 8. Trường hợp đặc biệt
  getSpecialCases(periodId?: string): Observable<SpecialCaseItem[]> {
    let params = new HttpParams();
    if (periodId) params = params.set('periodId', periodId);
    return this.http
      .get<{ success: boolean; data: SpecialCaseItem[] }>('/api/kpi/special-cases', { params })
      .pipe(map((res) => res.data || []));
  }

  registerSpecialCase(data: any): Observable<SpecialCaseItem> {
    return this.http
      .post<{ success: boolean; data: SpecialCaseItem }>('/api/kpi/special-cases', data)
      .pipe(map((res) => res.data));
  }

  // 9. Tổng hợp cả năm (Annual Rollup)
  getAnnualRollup(employeeId?: string, schoolYear: string = '2026-2027'): Observable<AnnualRollupResult> {
    let params = new HttpParams().set('schoolYear', schoolYear);
    const url = employeeId ? `/api/kpi/summary/annual/${employeeId}` : '/api/kpi/summary/annual';
    return this.http
      .get<{ success: boolean; data: AnnualRollupResult }>(url, { params })
      .pipe(map((res) => res.data));
  }

  getSchoolAnnualRollup(schoolYear: string = '2026-2027', orgUnitId?: string): Observable<SchoolAnnualRollupResult> {
    let params = new HttpParams().set('schoolYear', schoolYear);
    if (orgUnitId && orgUnitId !== 'all') params = params.set('orgUnitId', orgUnitId);
    return this.http
      .get<{ success: boolean; data: SchoolAnnualRollupResult }>('/api/kpi/summary/annual-school', { params })
      .pipe(map((res) => res.data));
  }
}
