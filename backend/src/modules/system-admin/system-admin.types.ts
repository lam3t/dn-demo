import { TenantStatus, SubscriptionStatus } from '@prisma/client';

export interface CreateTenantDto {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  principalName?: string;
  schoolYear?: string;
  totalStudents?: number;
  totalFemaleStudents?: number;
  totalClasses?: number;
  totalStaff?: number;
  description?: string;
  logoUrl?: string;
  packageId: string;
  adminName?: string;
  adminFullName?: string; // Fallback for frontend compatibility
  adminPhone: string;
  adminEmail: string;
  adminPassword?: string;
  adminTitle?: string;
}

export interface UpdateTenantDto {
  name?: string;
  status?: TenantStatus;
  logoUrl?: string;
  // School profile properties
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

export interface UpdateTenantAdminDto {
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  isActive?: boolean;
  newPassword?: string;
}

export interface ReplaceTenantAdminDto {
  mode: 'EXISTING_USER' | 'NEW_USER';
  // Mode EXISTING_USER
  existingUserId?: string;
  // Mode NEW_USER
  newAdminName?: string;
  newAdminEmail?: string;
  newAdminPhone?: string;
  newAdminPassword?: string;
  newAdminTitle?: string;
  // Options
  archiveOldAdmin?: boolean; // If true, sets previous admin's role to GIAO_VIEN or deactivates
}

export interface InitializeTenantAdminDto {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  title?: string;
}

export interface CreatePackageDto {
  name: string;
  code: string;
  maxAccounts: number;
  storageQuotaGB: number;
  enabledModules?: string[];
  price?: number;
  description?: string;
}

export interface CreateSubscriptionDto {
  tenantId: string;
  packageId: string;
  startDate?: string | Date;
  endDate: string | Date;
  status?: SubscriptionStatus;
}
