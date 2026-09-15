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
    totalStaff?: number;
    phone: string | null;
    email: string | null;
    address?: string | null;
    schoolYear?: string | null;
    description?: string | null;
  } | null;
  adminUser?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    title: string | null;
    isActive: boolean;
  } | null;
  stats?: {
    userCount: number;
    locationCount: number;
    orgUnitCount?: number;
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

export interface TenantAdminItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  title: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  primaryLocation: string | null;
  primaryOrgUnit: string | null;
  createdAt: string;
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
  totalStaff?: number;
  description?: string;
  adminFullName?: string;
  adminName?: string;
  adminPhone?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminTitle?: string;
  packageId?: string;
}

export interface UpdateTenantPayload {
  name?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  principalName?: string;
  schoolYear?: string;
  totalStudents?: number;
  totalFemaleStudents?: number;
  totalClasses?: number;
  totalStaff?: number;
  description?: string;
}

export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  totalPlans: number;
  totalAllocatedAccounts: number;
  totalAllocatedStorageGB: number;
  packages: PackageItem[];
  expiringSubscriptions: {
    id: string;
    tenantId: string;
    tenantName: string;
    tenantCode: string;
    packageName: string;
    packageCode: string;
    endDate: string;
    daysRemaining: number;
  }[];
  recentAuditLogs: any[];
}

export interface TenantReportItem {
  id: string;
  code: string;
  name: string;
  status: string;
  principalName: string;
  phone: string;
  email: string;
  packageName: string;
  maxAccounts: number;
  userCount: number;
  utilizationRate: number;
  storageQuotaGB: number;
  locationsCount: number;
  orgUnitsCount: number;
  plansCount: number;
  tasksCount: number;
  adminFullName: string;
  adminEmail: string;
  subscriptionEndDate: string | null;
  createdAt: string;
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

  getDashboardStats(): Observable<{ success: boolean; data: DashboardStats }> {
    return this.http.get<{ success: boolean; data: DashboardStats }>(`${this.apiUrl}/dashboard`);
  }

  getTenants(
    page = 1,
    pageSize = 20,
    search?: string,
    status?: string
  ): Observable<{
    success: boolean;
    data: { items: TenantListItem[]; total: number; page: number; pageSize: number; totalPages: number };
  }> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);

    return this.http.get<{
      success: boolean;
      data: { items: TenantListItem[]; total: number; page: number; pageSize: number; totalPages: number };
    }>(`${this.apiUrl}/tenants`, { params });
  }

  getTenantById(id: string): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/tenants/${id}`);
  }

  createTenant(payload: CreateTenantPayload): Observable<{ success: boolean; data: any; message?: string }> {
    return this.http.post<{ success: boolean; data: any; message?: string }>(`${this.apiUrl}/tenants`, payload);
  }

  updateTenant(id: string, payload: UpdateTenantPayload): Observable<{ success: boolean; data: any; message?: string }> {
    return this.http.patch<{ success: boolean; data: any; message?: string }>(`${this.apiUrl}/tenants/${id}`, payload);
  }

  updateTenantStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED'
  ): Observable<{ success: boolean; data: any; message?: string }> {
    return this.http.patch<{ success: boolean; data: any; message?: string }>(`${this.apiUrl}/tenants/${id}/status`, {
      status,
    });
  }

  // Tenant Admin APIs
  getTenantAdmins(tenantId: string): Observable<{ success: boolean; data: TenantAdminItem[] }> {
    return this.http.get<{ success: boolean; data: TenantAdminItem[] }>(`${this.apiUrl}/tenants/${tenantId}/admins`);
  }

  updateTenantAdmin(
    tenantId: string,
    userId: string,
    payload: { fullName?: string; email?: string; phone?: string; title?: string; isActive?: boolean; newPassword?: string }
  ): Observable<{ success: boolean; data: any; message?: string }> {
    return this.http.patch<{ success: boolean; data: any; message?: string }>(
      `${this.apiUrl}/tenants/${tenantId}/admins/${userId}`,
      payload
    );
  }

  resetTenantAdminPassword(
    tenantId: string,
    userId: string,
    newPassword = '123456'
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/tenants/${tenantId}/admins/${userId}/reset-password`,
      { newPassword }
    );
  }

  replaceTenantAdmin(
    tenantId: string,
    payload: {
      mode: 'EXISTING_USER' | 'NEW_USER';
      existingUserId?: string;
      newAdminName?: string;
      newAdminEmail?: string;
      newAdminPhone?: string;
      newAdminPassword?: string;
      newAdminTitle?: string;
      archiveOldAdmin?: boolean;
    }
  ): Observable<{ success: boolean; message: string; admin?: any }> {
    return this.http.post<{ success: boolean; message: string; admin?: any }>(
      `${this.apiUrl}/tenants/${tenantId}/admins/replace`,
      payload
    );
  }

  initializeTenantAdmin(
    tenantId: string,
    payload: { fullName: string; email: string; phone: string; password?: string; title?: string }
  ): Observable<{ success: boolean; data: any; message?: string }> {
    return this.http.post<{ success: boolean; data: any; message?: string }>(
      `${this.apiUrl}/tenants/${tenantId}/admins/initialize`,
      payload
    );
  }

  // Packages & Subscriptions
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

  // Reports
  getTenantReports(): Observable<{ success: boolean; data: TenantReportItem[] }> {
    return this.http.get<{ success: boolean; data: TenantReportItem[] }>(`${this.apiUrl}/reports`);
  }

  // Audit Logs
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
