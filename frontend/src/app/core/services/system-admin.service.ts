import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TenantListItem {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TRIAL';
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  school?: {
    id: string;
    name: string;
    principalName: string | null;
    totalClasses: number;
    totalStudents: number;
    phone: string | null;
    email: string | null;
  } | null;
  stats?: {
    userCount: number;
    locationCount: number;
    planCount: number;
    taskCount: number;
  };
  activeSubscription?: {
    id: string;
    packageName: string;
    packageCode: string;
    maxAccounts: number;
    storageQuotaGB: number;
    startDate: string;
    endDate: string;
    status: string;
    isNearExpiry: boolean;
  } | null;
}

export interface PackageItem {
  id: string;
  name: string;
  code: string;
  maxAccounts: number;
  storageQuotaGB: number;
  enabledModules: string | null;
  price: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subscriptions: number;
  };
}

export interface CreateTenantPayload {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  principalName?: string;
  schoolYear?: string;
  totalStudents?: number;
  totalClasses?: number;
  adminFullName?: string;
  adminPhone?: string;
  adminEmail?: string;
  adminPassword?: string;
  packageId?: string;
}

export interface SystemAuditLogItem {
  id: string;
  action: string;
  actorUserId: string;
  targetTenantId?: string | null;
  detail?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  actorUser?: {
    fullName: string;
    email: string;
    phone: string;
  };
  targetTenant?: {
    name: string;
    code: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SystemAdminService {
  private apiUrl = '/api/system-admin';

  constructor(private http: HttpClient) {}

  getTenants(
    page = 1,
    pageSize = 20,
    search?: string,
    status?: string
  ): Observable<{ success: boolean; data: { items: TenantListItem[]; total: number; page: number; pageSize: number; totalPages: number } }> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);

    return this.http.get<{ success: boolean; data: { items: TenantListItem[]; total: number; page: number; pageSize: number; totalPages: number } }>(
      `${this.apiUrl}/tenants`,
      { params }
    );
  }

  getTenantById(id: string): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/tenants/${id}`);
  }

  createTenant(payload: CreateTenantPayload): Observable<{ success: boolean; data: any; message?: string }> {
    return this.http.post<{ success: boolean; data: any; message?: string }>(`${this.apiUrl}/tenants`, payload);
  }

  updateTenant(id: string, payload: Partial<CreateTenantPayload>): Observable<{ success: boolean; data: any; message?: string }> {
    return this.http.patch<{ success: boolean; data: any; message?: string }>(`${this.apiUrl}/tenants/${id}`, payload);
  }

  updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TRIAL'): Observable<{ success: boolean; data: any; message?: string }> {
    return this.http.patch<{ success: boolean; data: any; message?: string }>(`${this.apiUrl}/tenants/${id}/status`, { status });
  }

  getPackages(): Observable<{ success: boolean; data: PackageItem[] }> {
    return this.http.get<{ success: boolean; data: PackageItem[] }>(`${this.apiUrl}/packages`);
  }

  createPackage(payload: Partial<PackageItem>): Observable<{ success: boolean; data: PackageItem; message?: string }> {
    return this.http.post<{ success: boolean; data: PackageItem; message?: string }>(`${this.apiUrl}/packages`, payload);
  }

  updatePackage(id: string, payload: Partial<PackageItem>): Observable<{ success: boolean; data: PackageItem; message?: string }> {
    return this.http.patch<{ success: boolean; data: PackageItem; message?: string }>(`${this.apiUrl}/packages/${id}`, payload);
  }

  assignSubscription(payload: {
    tenantId: string;
    packageId: string;
    startDate?: string;
    endDate: string;
  }): Observable<{ success: boolean; data: any; message?: string }> {
    return this.http.post<{ success: boolean; data: any; message?: string }>(`${this.apiUrl}/subscriptions`, payload);
  }

  getAuditLogs(
    page = 1,
    pageSize = 50
  ): Observable<{ success: boolean; data: { items: SystemAuditLogItem[]; total: number; page: number; pageSize: number; totalPages: number } }> {
    const params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    return this.http.get<{ success: boolean; data: { items: SystemAuditLogItem[]; total: number; page: number; pageSize: number; totalPages: number } }>(
      `${this.apiUrl}/audit-logs`,
      { params }
    );
  }
}
