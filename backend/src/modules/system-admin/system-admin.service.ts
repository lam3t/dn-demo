import bcrypt from 'bcryptjs';
import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import {
  CreateTenantDto,
  UpdateTenantDto,
  CreatePackageDto,
  CreateSubscriptionDto,
} from './system-admin.types';
import { TenantStatus, Role, SubscriptionStatus } from '@prisma/client';

export class SystemAdminService {
  /**
   * Thống kê tổng quan nền tảng SaaS
   */
  async getDashboardStats() {
    const [totalTenants, activeTenants, suspendedTenants, totalUsers, packages, recentAuditLogs] =
      await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { status: 'ACTIVE' } }),
        prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
        prisma.user.count({ where: { isSystemAdmin: false } }),
        prisma.package.findMany({ include: { _count: { select: { subscriptions: true } } } }),
        prisma.systemAuditLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { actorUser: { select: { id: true, fullName: true, email: true } }, targetTenant: true },
        }),
      ]);

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      packages,
      recentAuditLogs,
    };
  }

  /**
   * Lấy danh sách Tenant kèm thông tin gói thuê và số user
   */
  async getTenants(options?: { search?: string; status?: TenantStatus; page?: number; pageSize?: number }) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.search) {
      const s = options.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          school: {
            select: {
              id: true,
              name: true,
              principalName: true,
              totalClasses: true,
              totalStudents: true,
              phone: true,
              email: true,
            },
          },
          subscriptions: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { package: true },
          },
          _count: {
            select: {
              users: true,
              locations: true,
              plans: true,
              tasks: true,
            },
          },
        },
      }),
    ]);

    const formatted = tenants.map((t) => {
      const activeSub = t.subscriptions[0];
      return {
        id: t.id,
        code: t.code,
        name: t.name,
        status: t.status,
        logoUrl: t.logoUrl,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        school: t.school,
        stats: {
          userCount: t._count.users,
          locationCount: t._count.locations,
          planCount: t._count.plans,
          taskCount: t._count.tasks,
        },
        activeSubscription: activeSub
          ? {
              id: activeSub.id,
              packageName: activeSub.package.name,
              packageCode: activeSub.package.code,
              maxAccounts: activeSub.package.maxAccounts,
              storageQuotaGB: activeSub.package.storageQuotaGB,
              startDate: activeSub.startDate,
              endDate: activeSub.endDate,
              status: activeSub.status,
              isNearExpiry:
                new Date(activeSub.endDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000,
            }
          : null,
      };
    });

    return {
      items: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Lấy chi tiết Tenant theo ID
   */
  async getTenantById(id: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        school: true,
        subscriptions: {
          include: { package: true },
          orderBy: { createdAt: 'desc' },
        },
        locations: {
          take: 10,
        },
        orgUnits: {
          take: 10,
        },
        _count: {
          select: {
            users: true,
            locations: true,
            orgUnits: true,
            plans: true,
            tasks: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new AppError('Không tìm thấy trường học (Tenant) này trong hệ thống.', 404);
    }

    return tenant;
  }

  /**
   * Tạo Tenant mới + Khởi tạo School + Seed cơ cấu ban đầu + Tạo Tenant Admin đầu tiên
   */
  async createTenantWithAdmin(dto: CreateTenantDto, actorUserId: string) {
    // 1. Kiểm tra code tenant duy nhất
    const existingCode = await prisma.tenant.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existingCode) {
      throw new AppError(`Mã trường (Tenant Code) "${dto.code}" đã tồn tại. Vui lòng chọn mã khác.`, 400);
    }

    // 2. Kiểm tra package hợp lệ
    const pkg = await prisma.package.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg) {
      throw new AppError('Gói thuê dịch vụ được chọn không tồn tại.', 400);
    }

    // 3. Kiểm tra email và phone của Admin duy nhất toàn hệ thống
    const existingAdminEmail = await prisma.user.findUnique({
      where: { email: dto.adminEmail.trim().toLowerCase() },
    });
    if (existingAdminEmail) {
      throw new AppError(`Email "${dto.adminEmail}" đã được sử dụng bởi một tài khoản khác trong hệ thống.`, 400);
    }

    const existingAdminPhone = await prisma.user.findUnique({
      where: { phone: dto.adminPhone.trim() },
    });
    if (existingAdminPhone) {
      throw new AppError(`Số điện thoại "${dto.adminPhone}" đã được sử dụng bởi một tài khoản khác.`, 400);
    }

    const defaultPasswordHash = await bcrypt.hash(dto.adminPassword || '123456', 10);
    const tenantCode = dto.code.trim().toUpperCase();

    // 4. Tạo Transaction để đảm bảo toàn vẹn
    const result = await prisma.$transaction(async (tx) => {
      // 4.1 Tạo Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name.trim(),
          code: tenantCode,
          status: 'ACTIVE',
        },
      });

      // 4.2 Tạo Subscription (mặc định 1 năm)
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      const subscription = await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          packageId: pkg.id,
          startDate: new Date(),
          endDate: oneYearLater,
          status: 'ACTIVE',
        },
      });

      // 4.3 Tạo School 1-1
      const school = await tx.school.create({
        data: {
          tenantId: tenant.id,
          name: dto.name.trim(),
          code: tenantCode,
          address: dto.address || 'Chưa cập nhật',
          phone: dto.phone || dto.adminPhone,
          email: dto.email || dto.adminEmail,
          principalName: dto.principalName || dto.adminName,
          schoolYear: '2026-2027',
          totalClasses: 0,
          totalStudents: 0,
          totalStaff: 1,
        },
      });

      // 4.4 Tạo Điểm trường chính mặc định
      const mainLocation = await tx.location.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          name: 'Điểm chính (Trung tâm)',
          code: 'DIEM_CHINH',
          isMain: true,
          address: dto.address || 'Chưa cập nhật',
          phone: dto.phone || dto.adminPhone,
        },
      });

      // 4.5 Tạo Tổ chuyên môn / bộ phận mặc định
      const defaultOrgUnit = await tx.orgUnit.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          name: 'Ban Giám hiệu & Văn phòng',
          code: 'BGH_VP',
          orderIndex: 1,
        },
      });

      // 4.6 Tạo tài khoản Tenant Admin đầu tiên
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          primaryLocationId: mainLocation.id,
          primaryOrgUnitId: defaultOrgUnit.id,
          fullName: dto.adminName.trim(),
          email: dto.adminEmail.trim().toLowerCase(),
          phone: dto.adminPhone.trim(),
          passwordHash: defaultPasswordHash,
          title: 'Quản trị hệ thống (Admin trường)',
          isActive: true,
          isSystemAdmin: false,
          roles: {
            create: [
              {
                role: Role.ADMIN,
                scopeLocationId: null,
                scopeOrgUnitId: null,
              },
            ],
          },
        },
        include: {
          roles: true,
        },
      });

      // 4.7 Ghi SystemAuditLog
      await tx.systemAuditLog.create({
        data: {
          actorUserId,
          action: 'CREATE_TENANT',
          targetTenantId: tenant.id,
          detail: `Khởi tạo tenant mới: ${tenant.name} (${tenant.code}), gói: ${pkg.name}, Admin: ${adminUser.fullName} (${adminUser.email})`,
        },
      });

      return {
        tenant,
        school,
        subscription,
        adminUser: {
          id: adminUser.id,
          fullName: adminUser.fullName,
          email: adminUser.email,
          phone: adminUser.phone,
          title: adminUser.title,
        },
      };
    });

    return result;
  }

  /**
   * Cập nhật thông tin Tenant
   */
  async updateTenant(id: string, dto: UpdateTenantDto, actorUserId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new AppError('Không tìm thấy trường học (Tenant).', 404);
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        status: dto.status || undefined,
        logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : undefined,
      },
    });

    if (dto.name && dto.name.trim() !== tenant.name) {
      await prisma.school.updateMany({
        where: { tenantId: id },
        data: { name: dto.name.trim() },
      });
    }

    await prisma.systemAuditLog.create({
      data: {
        actorUserId,
        action: 'UPDATE_TENANT',
        targetTenantId: id,
        detail: `Cập nhật thông tin Tenant ${tenant.code}: ${JSON.stringify(dto)}`,
      },
    });

    return updated;
  }

  /**
   * Khóa / Mở khóa Tenant (ACTIVE <-> SUSPENDED)
   */
  async toggleTenantStatus(id: string, status: TenantStatus, actorUserId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new AppError('Không tìm thấy trường học (Tenant).', 404);
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: { status },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorUserId,
        action: status === 'SUSPENDED' ? 'SUSPEND_TENANT' : 'ACTIVATE_TENANT',
        targetTenantId: id,
        detail: `Thay đổi trạng thái trường ${tenant.name} (${tenant.code}) sang: ${status}`,
      },
    });

    return updated;
  }

  /**
   * Danh sách các gói thuê dịch vụ (Packages)
   */
  async getPackages() {
    return await prisma.package.findMany({
      orderBy: { maxAccounts: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });
  }

  /**
   * Tạo gói thuê mới
   */
  async createPackage(dto: CreatePackageDto, actorUserId: string) {
    const existing = await prisma.package.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new AppError(`Mã gói "${dto.code}" đã tồn tại.`, 400);
    }

    const pkg = await prisma.package.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        maxAccounts: dto.maxAccounts,
        storageQuotaGB: dto.storageQuotaGB,
        enabledModules: dto.enabledModules ? JSON.stringify(dto.enabledModules) : '[]',
        price: dto.price || 0,
        description: dto.description || null,
      },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorUserId,
        action: 'CREATE_PACKAGE',
        detail: `Tạo mới gói dịch vụ: ${pkg.name} (${pkg.code}), Tối đa ${pkg.maxAccounts} tài khoản`,
      },
    });

    return pkg;
  }

  /**
   * Cập nhật gói thuê
   */
  async updatePackage(id: string, dto: Partial<CreatePackageDto>, actorUserId: string) {
    const pkg = await prisma.package.findUnique({ where: { id } });
    if (!pkg) {
      throw new AppError('Không tìm thấy gói thuê.', 404);
    }

    const updated = await prisma.package.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        maxAccounts: dto.maxAccounts || undefined,
        storageQuotaGB: dto.storageQuotaGB || undefined,
        enabledModules: dto.enabledModules ? JSON.stringify(dto.enabledModules) : undefined,
        price: dto.price !== undefined ? dto.price : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
      },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorUserId,
        action: 'UPDATE_PACKAGE',
        detail: `Cập nhật gói dịch vụ ${pkg.code}: ${JSON.stringify(dto)}`,
      },
    });

    return updated;
  }

  /**
   * Gán / Gia hạn gói thuê cho Tenant (Subscription)
   */
  async createSubscription(dto: CreateSubscriptionDto, actorUserId: string) {
    const [tenant, pkg] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: dto.tenantId } }),
      prisma.package.findUnique({ where: { id: dto.packageId } }),
    ]);

    if (!tenant) throw new AppError('Không tìm thấy Tenant.', 404);
    if (!pkg) throw new AppError('Không tìm thấy Package.', 404);

    // Hủy trạng thái ACTIVE của các subscription cũ
    await prisma.tenantSubscription.updateMany({
      where: { tenantId: dto.tenantId, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });

    const subscription = await prisma.tenantSubscription.create({
      data: {
        tenantId: dto.tenantId,
        packageId: dto.packageId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: new Date(dto.endDate),
        status: dto.status || 'ACTIVE',
      },
      include: {
        package: true,
      },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorUserId,
        action: 'CREATE_SUBSCRIPTION',
        targetTenantId: dto.tenantId,
        detail: `Gán gói thuê ${pkg.name} cho trường ${tenant.name}, hết hạn: ${dto.endDate}`,
      },
    });

    return subscription;
  }

  /**
   * Lấy danh sách nhật ký System Audit Log
   */
  async getAuditLogs(limit = 50) {
    return await prisma.systemAuditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        targetTenant: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }
}

export const systemAdminService = new SystemAdminService();
