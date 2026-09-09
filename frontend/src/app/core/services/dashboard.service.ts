import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { DashboardOverviewData } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  getOverview(params?: { locationId?: string; orgUnitId?: string }): Observable<DashboardOverviewData> {
    let httpParams = new HttpParams();
    if (params?.locationId) httpParams = httpParams.set('locationId', params.locationId);
    if (params?.orgUnitId) httpParams = httpParams.set('orgUnitId', params.orgUnitId);

    return this.http
      .get<{ success: boolean; data: DashboardOverviewData }>('/api/dashboard/overview', {
        params: httpParams,
      })
      .pipe(map((res) => res.data));
  }
}
