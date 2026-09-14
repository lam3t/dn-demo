import { TenantStatus, SubscriptionStatus } from '@prisma/client';

export interface CreateTenantDto {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  principalName?: string;
  packageId: string;
  adminName: string;
  adminPhone: string;
  adminEmail: string;
  adminPassword?: string;
}

export interface UpdateTenantDto {
  name?: string;
  status?: TenantStatus;
  logoUrl?: string;
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
