import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay, catchError, throwError } from 'rxjs';
import { UserPickerItem, LocationItem, OrgUnitItem, OrgTreeNode } from '../models/user.models';

export interface UserSearchResponse {
  items: UserPickerItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  private locationsCache$?: Observable<LocationItem[]>;
  private orgUnitsCache$?: Observable<OrgUnitItem[]>;

  searchUsers(params: {
    search?: string;
    orgUnitId?: string;
    locationId?: string;
    role?: string;
    page?: number;
    pageSize?: number;
  }): Observable<UserSearchResponse> {
    let httpParams = new HttpParams();
    if (params.search?.trim()) httpParams = httpParams.set('search', params.search.trim());
    if (params.orgUnitId) httpParams = httpParams.set('orgUnitId', params.orgUnitId);
    if (params.locationId) httpParams = httpParams.set('locationId', params.locationId);
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http
      .get<{ success: boolean; data: UserSearchResponse }>('/api/users', { params: httpParams })
      .pipe(map((res) => res.data));
  }

  getRecentCollaborators(userId: string, limit = 8): Observable<UserPickerItem[]> {
    return this.http
      .get<{ success: boolean; data: UserPickerItem[] }>(`/api/users/${userId}/recent-collaborators`, {
        params: { limit: limit.toString() },
      })
      .pipe(map((res) => res.data || []));
  }

  clearLocationsCache(): void {
    this.locationsCache$ = undefined;
  }

  clearOrgUnitsCache(): void {
    this.orgUnitsCache$ = undefined;
  }

  getLocations(forceRefresh: boolean = false): Observable<LocationItem[]> {
    if (forceRefresh || !this.locationsCache$) {
      this.locationsCache$ = this.http
        .get<{ success: boolean; data: LocationItem[] }>('/api/locations')
        .pipe(
          map((res) => res?.data || []),
          catchError((err) => {
            this.locationsCache$ = undefined;
            return throwError(() => err);
          }),
          shareReplay(1)
        );
    }
    return this.locationsCache$;
  }

  getOrgUnits(): Observable<OrgUnitItem[]> {
    if (!this.orgUnitsCache$) {
      this.orgUnitsCache$ = this.http
        .get<{ success: boolean; data: OrgUnitItem[] }>('/api/org/units')
        .pipe(
          map((res) => res?.data || []),
          catchError((err) => {
            this.orgUnitsCache$ = undefined;
            return throwError(() => err);
          }),
          shareReplay(1)
        );
    }
    return this.orgUnitsCache$;
  }

  createOrgUnit(data: { name: string; code: string; parentId?: string | null; orderIndex?: number }): Observable<OrgUnitItem> {
    return this.http
      .post<{ success: boolean; message: string; data: OrgUnitItem }>('/api/org/units', data)
      .pipe(
        map((res) => {
          this.clearOrgUnitsCache();
          return res.data;
        })
      );
  }

  updateOrgUnit(
    id: string,
    data: { name?: string; code?: string; parentId?: string | null; orderIndex?: number }
  ): Observable<OrgUnitItem> {
    return this.http
      .put<{ success: boolean; message: string; data: OrgUnitItem }>(`/api/org/units/${id}`, data)
      .pipe(
        map((res) => {
          this.clearOrgUnitsCache();
          return res.data;
        })
      );
  }

  deleteOrgUnit(id: string): Observable<void> {
    return this.http.delete<{ success: boolean; message: string }>(`/api/org/units/${id}`).pipe(
      map(() => {
        this.clearOrgUnitsCache();
      })
    );
  }

  getOrgTree(): Observable<OrgTreeNode[]> {
    return this.http
      .get<{ success: boolean; data: OrgTreeNode[] }>('/api/org/tree')
      .pipe(map((res) => res.data || []));
  }

  getUserById(id: string): Observable<UserPickerItem | null> {
    return this.http
      .get<{ success: boolean; data: UserPickerItem }>(`/api/users/${id}`)
      .pipe(map((res) => res?.data || null));
  }
}
