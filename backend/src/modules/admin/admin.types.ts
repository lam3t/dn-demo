import { Role } from '@prisma/client';

export interface InitialUserRoleDto {
  role: Role;
  scopeLocationId?: string | null;
  scopeOrgUnitId?: string | null;
}

export interface CreateAdminUserDto {
  fullName: string;
  phone: string;
  email: string;
  position?: string;
  locationId?: string | null;
  orgUnitId?: string | null;
  isToTruong?: boolean;
  roles?: InitialUserRoleDto[];
  avatarUrl?: string;
  password?: string;
}

export interface UpdateAdminUserDto {
  fullName?: string;
  phone?: string;
  email?: string;
  position?: string;
  locationId?: string | null;
  orgUnitId?: string | null;
  isToTruong?: boolean;
  avatarUrl?: string;
}

export interface AddUserRoleDto {
  role: Role;
  scopeLocationId?: string | null;
  scopeOrgUnitId?: string | null;
}

export interface AdminUserFilterDto {
  search?: string;
  locationId?: string;
  orgUnitId?: string;
  role?: Role;
  status?: 'active' | 'locked' | 'all' | string;
  page?: number;
  pageSize?: number;
}

export interface PermissionMatrixItem {
  role: Role;
  roleName: string;
  scope: string;
  description: string;
  capabilities: {
    category: string;
    details: string[];
  }[];
}

export interface LocationSummaryDto {
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
  } | null;
  userCount: number;
  inProgressTaskCount: number;
  overdueTaskCount: number;
  completedTaskCount: number;
  totalTaskCount: number;
}

// --------------------------------------------------------
// PHASE 2 DTOs
// --------------------------------------------------------

export interface CreateRoleDto {
  code: string;
  name: string;
  description?: string;
  permissionKeys?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
}

export interface UpdateRolePermissionsDto {
  permissionKeys: string[];
}

export interface CreateSharedCategoryDto {
  type: string;
  code: string;
  name: string;
  orderIndex?: number;
  isDefault?: boolean;
}

export interface UpdateSharedCategoryDto {
  name?: string;
  orderIndex?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CreateKPIDefinitionDto {
  code: string;
  name: string;
  description?: string;
  unit?: string;
  targetValue?: number;
  weight?: number;
  applicableRoles?: string[];
}

export interface UpdateKPIDefinitionDto {
  name?: string;
  description?: string;
  unit?: string;
  targetValue?: number;
  weight?: number;
  applicableRoles?: string[];
  isActive?: boolean;
}

