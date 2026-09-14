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
  PermissionItem,
  RoleModelItem,
  SharedCategoryItem,
  KPIDefinitionItem,
  TenantQuotaInfo,
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

  // ==========================================
  // PHASE 2: DYNAMIC RBAC & SYSTEM CONFIGURATION
  // ==========================================

  /**
   * 14. GET /api/admin/permissions
   */
  getPermissions(): Observable<PermissionItem[]> {
    return this.http
      .get<{ success: boolean; data: PermissionItem[] }>('/api/admin/permissions')
      .pipe(map((res) => res.data || []));
  }

  /**
   * 15. GET /api/admin/roles
   */
  getRoles(): Observable<RoleModelItem[]> {
    return this.http
      .get<{ success: boolean; data: RoleModelItem[] }>('/api/admin/roles')
      .pipe(map((res) => res.data || []));
  }

  /**
   * 16. POST /api/admin/roles
   */
  createRole(payload: {
    code: string;
    name: string;
    description?: string;
    permissionKeys?: string[];
  }): Observable<RoleModelItem> {
    return this.http
      .post<{ success: boolean; message: string; data: RoleModelItem }>('/api/admin/roles', payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 17. PATCH /api/admin/roles/:id
   */
  updateRole(
    id: string,
    payload: {
      name?: string;
      description?: string;
    }
  ): Observable<RoleModelItem> {
    return this.http
      .patch<{ success: boolean; message: string; data: RoleModelItem }>(`/api/admin/roles/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 18. PUT /api/admin/roles/:id/permissions
   */
  updateRolePermissions(
    id: string,
    permissionKeys: string[]
  ): Observable<{ success: boolean; message: string; permissionCount?: number }> {
    return this.http
      .put<{ success: boolean; message: string; permissionCount?: number }>(
        `/api/admin/roles/${id}/permissions`,
        { permissionKeys }
      );
  }

  /**
   * 19. DELETE /api/admin/roles/:id
   */
  deleteRole(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`/api/admin/roles/${id}`)
      .pipe(map((res) => ({ success: res.success, message: res.message })));
  }

  /**
   * 20. GET /api/admin/categories
   */
  getCategories(type?: string): Observable<SharedCategoryItem[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http
      .get<{ success: boolean; data: SharedCategoryItem[] }>('/api/admin/categories', { params })
      .pipe(map((res) => res.data || []));
  }

  /**
   * 21. POST /api/admin/categories
   */
  createCategory(payload: {
    type: string;
    code: string;
    name: string;
    orderIndex?: number;
    isDefault?: boolean;
  }): Observable<SharedCategoryItem> {
    return this.http
      .post<{ success: boolean; message: string; data: SharedCategoryItem }>('/api/admin/categories', payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 22. PATCH /api/admin/categories/:id
   */
  updateCategory(
    id: string,
    payload: {
      name?: string;
      orderIndex?: number;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ): Observable<SharedCategoryItem> {
    return this.http
      .patch<{ success: boolean; message: string; data: SharedCategoryItem }>(`/api/admin/categories/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 23. DELETE /api/admin/categories/:id
   */
  deleteCategory(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`/api/admin/categories/${id}`)
      .pipe(map((res) => ({ success: res.success, message: res.message })));
  }

  /**
   * 24. GET /api/admin/kpi-definitions
   */
  getKPIDefinitions(): Observable<KPIDefinitionItem[]> {
    return this.http
      .get<{ success: boolean; data: KPIDefinitionItem[] }>('/api/admin/kpi-definitions')
      .pipe(map((res) => res.data || []));
  }

  /**
   * 25. POST /api/admin/kpi-definitions
   */
  createKPIDefinition(payload: {
    code: string;
    name: string;
    description?: string;
    unit?: string;
    targetValue?: number | null;
    weight?: number;
    applicableRoles?: string[];
  }): Observable<KPIDefinitionItem> {
    return this.http
      .post<{ success: boolean; message: string; data: KPIDefinitionItem }>('/api/admin/kpi-definitions', payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 26. PATCH /api/admin/kpi-definitions/:id
   */
  updateKPIDefinition(
    id: string,
    payload: {
      name?: string;
      description?: string;
      unit?: string;
      targetValue?: number | null;
      weight?: number;
      applicableRoles?: string[];
      isActive?: boolean;
    }
  ): Observable<KPIDefinitionItem> {
    return this.http
      .patch<{ success: boolean; message: string; data: KPIDefinitionItem }>(`/api/admin/kpi-definitions/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /**
   * 27. DELETE /api/admin/kpi-definitions/:id
   */
  deleteKPIDefinition(id: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`/api/admin/kpi-definitions/${id}`)
      .pipe(map((res) => ({ success: res.success, message: res.message })));
  }

  /**
   * 28. GET /api/admin/quota
   */
  getQuota(): Observable<TenantQuotaInfo> {
    return this.http
      .get<{ success: boolean; data: TenantQuotaInfo }>('/api/admin/quota')
      .pipe(map((res) => res.data));
  }
}
