import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SchoolInfo, LocationInfo } from '../models/school.models';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SchoolService {
  private http = inject(HttpClient);
  private apiUrl = '/api/school';

  getSchoolInfo(schoolYear?: string): Observable<SchoolInfo> {
    const params: any = {};
    if (schoolYear) {
      params.schoolYear = schoolYear;
    }
    return this.http.get<ApiResponse<SchoolInfo>>(`${this.apiUrl}/info`, { params }).pipe(
      map((res) => {
        const data = res.data;
        if (data.statsJson && typeof data.statsJson === 'string') {
          try {
            data.statsJson = JSON.parse(data.statsJson);
          } catch (e) {
            console.error('Failed to parse statsJson', e);
          }
        }
        return data;
      })
    );
  }

  updateSchoolInfo(payload: Partial<SchoolInfo>): Observable<SchoolInfo> {
    return this.http.patch<ApiResponse<SchoolInfo>>(`${this.apiUrl}/info`, payload).pipe(
      map((res) => res.data)
    );
  }

  createLocation(payload: Partial<LocationInfo>, schoolYear?: string): Observable<LocationInfo> {
    const body = schoolYear ? { ...payload, schoolYear } : payload;
    return this.http.post<ApiResponse<LocationInfo>>('/api/locations', body).pipe(
      map((res) => res.data)
    );
  }

  updateLocation(id: string, payload: Partial<LocationInfo>, schoolYear?: string): Observable<LocationInfo> {
    const body = schoolYear ? { ...payload, schoolYear } : payload;
    return this.http.patch<ApiResponse<LocationInfo>>(`/api/locations/${id}`, body).pipe(
      map((res) => res.data)
    );
  }

  deleteLocation(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`/api/locations/${id}`).pipe(
      map(() => undefined)
    );
  }
}
