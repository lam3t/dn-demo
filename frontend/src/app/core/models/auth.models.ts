export type RoleType =
  | 'HIEU_TRUONG'
  | 'PHO_HIEU_TRUONG'
  | 'TO_TRUONG'
  | 'GIAO_VIEN'
  | 'NHAN_VIEN'
  | 'ADMIN'
  | 'SYSTEM_ADMIN';

export interface UserRoleItem {
  role: RoleType;
  scopeLocationId?: string | null;
  scopeLocationName?: string;
  scopeOrgUnitId?: string | null;
  scopeOrgUnitName?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  title?: string | null;
  avatarUrl?: string | null;
  tenantId?: string | null;
  tenantName?: string;
  tenantCode?: string;
  isSystemAdmin?: boolean;
  schoolId?: string | null;
  schoolName?: string;
  primaryLocationId?: string | null;
  primaryLocationName?: string;
  primaryOrgUnitId?: string | null;
  primaryOrgUnitName?: string;
  roles: UserRoleItem[];
  permissions?: string[];
}

export interface ActiveContextRole {
  role: RoleType;
  roleTitle: string;
  scopeName?: string;
  scopeLocationId?: string | null;
  scopeOrgUnitId?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}
