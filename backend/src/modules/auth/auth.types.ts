import { Role } from '@prisma/client';

export interface UserRolePayload {
  role: Role;
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
  schoolId: string;
  primaryLocationId?: string | null;
  primaryOrgUnitId?: string | null;
  roles: UserRolePayload[];
}

export interface TokenPayload {
  userId: string;
  email: string;
  roles: Role[];
  schoolId: string;
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
    schoolId: string;
    schoolName?: string;
    primaryLocationId?: string | null;
    primaryLocationName?: string;
    primaryOrgUnitId?: string | null;
    primaryOrgUnitName?: string;
    roles: {
      role: Role;
      scopeLocationId?: string | null;
      scopeLocationName?: string;
      scopeOrgUnitId?: string | null;
      scopeOrgUnitName?: string;
    }[];
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
