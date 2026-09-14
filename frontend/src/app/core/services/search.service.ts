import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { GlobalSearchResult } from '../models/search.models';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private http = inject(HttpClient);

  searchGlobal(
    query: string,
    type: 'ALL' | 'TASKS' | 'PLANS' | 'USERS' = 'ALL',
    status?: string,
    limit = 15
  ): Observable<GlobalSearchResult> {
    let params = new HttpParams()
      .set('q', query)
      .set('type', type)
      .set('limit', limit.toString());

    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }

    return this.http
      .get<{ success: boolean; data: GlobalSearchResult }>('/api/search/global', { params })
      .pipe(map((res) => res.data));
  }
}
