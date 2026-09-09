import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SchoolInfo } from '../models/school.models';

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

  getSchoolInfo(): Observable<SchoolInfo> {
    return this.http.get<ApiResponse<SchoolInfo>>(`${this.apiUrl}/info`).pipe(
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
}
