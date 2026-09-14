import { Role } from '@prisma/client';

export interface UserRolePayload {
  role: Role;
  roleId?: string | null;
  roleName?: string;
  scopeLocationId?: string | null;
  scopeOrgUnitId?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  title?: string | null;
  avatarUrl?: string | null;
  schoolId?: string;
  tenantId?: string;
  tenantName?: string;
  tenantCode?: string;
  isSystemAdmin?: boolean;
  primaryLocationId?: string | null;
  primaryOrgUnitId?: string | null;
  roles: UserRolePayload[];
  permissions: string[];
}

export interface TokenPayload {
  userId: string;
  email: string;
  roles: Role[];
  schoolId?: string;
  tenantId?: string;
  isSystemAdmin?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    title?: string | null;
    avatarUrl?: string | null;
    schoolId?: string | null;
    schoolName?: string;
    tenantId?: string | null;
    tenantName?: string;
    tenantCode?: string;
    isSystemAdmin?: boolean;
    primaryLocationId?: string | null;
    primaryLocationName?: string;
    primaryOrgUnitId?: string | null;
    primaryOrgUnitName?: string;
    roles: {
      role: Role;
      roleId?: string | null;
      roleName?: string;
      scopeLocationId?: string | null;
      scopeLocationName?: string;
      scopeOrgUnitId?: string | null;
      scopeOrgUnitName?: string;
    }[];
    permissions: string[];
  };
}


declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string;
    }
  }
}
