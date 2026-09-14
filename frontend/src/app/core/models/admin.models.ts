export interface AdminUserRole {
  id: string;
  role: string;
  scopeLocationId?: string | null;
  scopeOrgUnitId?: string | null;
  scopeLocation?: { id: string; name: string; code?: string } | null;
  scopeOrgUnit?: { id: string; name: string; code?: string } | null;
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  title?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  primaryLocation?: { id: string; name: string; code?: string } | null;
  primaryOrgUnit?: { id: string; name: string; code?: string } | null;
  roles: AdminUserRole[];
  currentTaskLoad: number;
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateAdminUserPayload {
  fullName: string;
  phone: string;
  email: string;
  position?: string;
  locationId?: string | null;
  orgUnitId?: string | null;
  isToTruong?: boolean;
  roles?: {
    role: string;
    scopeLocationId?: string | null;
    scopeOrgUnitId?: string | null;
  }[];
  avatarUrl?: string;
  password?: string;
}

export interface UpdateAdminUserPayload {
  fullName?: string;
  phone?: string;
  email?: string;
  position?: string;
  locationId?: string | null;
  orgUnitId?: string | null;
  isToTruong?: boolean;
  avatarUrl?: string;
}

export interface AddUserRolePayload {
  role: string;
  scopeLocationId?: string | null;
  scopeOrgUnitId?: string | null;
}

export interface PermissionMatrixItem {
  role: string;
  roleName: string;
  scope: string;
  description: string;
  capabilities: {
    category: string;
    details: string[];
  }[];
}

export interface LocationSummaryItem {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isMain: boolean;
  manager: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    title: string | null;
    avatarUrl?: string | null;
  } | null;
  userCount: number;
  inProgressTaskCount: number;
  overdueTaskCount: number;
  completedTaskCount: number;
  totalTaskCount: number;
}

export interface PermissionItem {
  id: string;
  key: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface RoleModelItem {
  id: string;
  tenantId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissionKeys: string[];
  permissionsCount?: number;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SharedCategoryItem {
  id: string;
  tenantId: string;
  type: string;
  code: string;
  name: string;
  orderIndex: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KPIDefinitionItem {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  unit: string;
  targetValue?: number | null;
  weight: number;
  applicableRoles?: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantQuotaInfo {
  tenantId: string;
  package: {
    id: string;
    name: string;
    code: string;
    price: number;
    enabledModules: string[];
  } | null;
  subscription: {
    id: string;
    startDate: string;
    endDate: string;
    status: string;
  } | null;
  quota: {
    maxAccounts: number;
    activeAccounts: number;
    totalAccounts: number;
    remainingAccounts: number;
    accountUsagePercent: number;
    storageQuotaGB: number;
    usedStorageMB: number;
    usedStorageGB: number;
    storageUsagePercent: number;
  };
}
