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
