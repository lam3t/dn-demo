import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, forkJoin, of, switchMap } from 'rxjs';
import {
  AdminUserItem,
  AdminUserListResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  AddUserRolePayload,
  AdminUserRole,
  PermissionMatrixItem,
  LocationSummaryItem,
} from '../models/admin.models';
import { LocationItem } from '../models/user.models';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);

  /**
   * 1. GET /api/admin/users
   */
  getUsers(params: {
    search?: string;
    locationId?: string;
    orgUnitId?: string;
    role?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Observable<AdminUserListResponse> {
    let httpParams = new HttpParams();
    if (params.search?.trim()) httpParams = httpParams.set('search', params.search.trim());
    if (params.locationId) httpParams = httpParams.set('locationId', params.locationId);
    if (params.orgUnitId) httpParams = httpParams.set('orgUnitId', params.orgUnitId);
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.status && params.status !== 'all') httpParams = httpParams.set('status', params.status);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http
      .get<{ success: boolean; data: AdminUserListResponse }>('/api/admin/users', { params: httpParams })
      .pipe(map((res) => res.data));
  }

  /**
   * 2. POST /api/admin/users
   */
  createUser(payload: CreateAdminUserPayload): Observable<{ user: AdminUserItem; message: string }> {
    return this.http
      .post<{ success: boolean; message: string; data: AdminUserItem }>('/api/admin/users', payload)
      .pipe(map((res) => ({ user: res.data, message: res.message })));
  }

  /**
   * 3. PATCH /api/admin/users/:id
   */
  updateUser(id: string, payload: UpdateAdminUserPayload): Observable<AdminUserItem> {
    return this.http
      .patch<{ success: boolean; message: string; data: AdminUserItem }>(`/api/admin/users/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 4. PATCH /api/admin/users/:id/status
   */
  toggleUserStatus(id: string, isActive: boolean): Observable<{ id: string; isActive: boolean }> {
    return this.http
      .patch<{ success: boolean; message: string; data: { id: string; isActive: boolean } }>(
        `/api/admin/users/${id}/status`,
        { isActive }
      )
      .pipe(map((res) => res.data));
  }

  /**
   * 5. POST /api/admin/users/:id/reset-password
   */
  resetPassword(id: string): Observable<{ message: string }> {
    return this.http
      .post<{ success: boolean; message: string }>(`/api/admin/users/${id}/reset-password`, {})
      .pipe(map((res) => ({ message: res.message })));
  }

  /**
   * 6. DELETE /api/admin/users/:id
   */
  deleteUser(id: string): Observable<{ message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`/api/admin/users/${id}`)
      .pipe(map((res) => ({ message: res.message })));
  }

  /**
   * 7. POST /api/admin/users/:id/roles
   */
  addUserRole(userId: string, payload: AddUserRolePayload): Observable<AdminUserRole> {
    return this.http
      .post<{ success: boolean; message: string; data: AdminUserRole }>(`/api/admin/users/${userId}/roles`, payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 8. DELETE /api/admin/users/:id/roles/:userRoleId
   */
  removeUserRole(userId: string, userRoleId: string): Observable<{ message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`/api/admin/users/${userId}/roles/${userRoleId}`)
      .pipe(map((res) => ({ message: res.message })));
  }

  /**
   * 9. GET /api/admin/permissions-matrix
   */
  getPermissionsMatrix(): Observable<PermissionMatrixItem[]> {
    return this.http
      .get<{ success: boolean; data: PermissionMatrixItem[] }>('/api/admin/permissions-matrix')
      .pipe(map((res) => res.data || []));
  }

  /**
   * 10. GET /api/locations/:id/summary for all locations
   */
  getLocationsWithSummary(): Observable<LocationSummaryItem[]> {
    return this.http
      .get<{ success: boolean; data: LocationSummaryItem[] }>('/api/locations')
      .pipe(map((res) => res.data || []));
  }

  /**
   * 11. POST /api/locations
   */
  createLocation(payload: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
    isMain?: boolean;
    managerId?: string | null;
  }): Observable<any> {
    return this.http
      .post<{ success: boolean; message: string; data: any }>('/api/locations', payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 12. PATCH /api/locations/:id
   */
  updateLocation(
    id: string,
    payload: {
      name?: string;
      code?: string;
      address?: string;
      phone?: string;
      isMain?: boolean;
      managerId?: string | null;
    }
  ): Observable<any> {
    return this.http
      .patch<{ success: boolean; message: string; data: any }>(`/api/locations/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 13. DELETE /api/locations/:id
   */
  deleteLocation(id: string): Observable<{ message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`/api/locations/${id}`)
      .pipe(map((res) => ({ message: res.message })));
  }
}
