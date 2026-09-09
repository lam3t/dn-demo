export type RoleType =
  | 'HIEU_TRUONG'
  | 'PHO_HIEU_TRUONG'
  | 'TO_TRUONG'
  | 'GIAO_VIEN'
  | 'NHAN_VIEN'
  | 'ADMIN';

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
  schoolId: string;
  schoolName?: string;
  primaryLocationId?: string | null;
  primaryLocationName?: string;
  primaryOrgUnitId?: string | null;
  primaryOrgUnitName?: string;
  roles: UserRoleItem[];
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
