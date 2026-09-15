import bcrypt from 'bcryptjs';
import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import {
  CreateTenantDto,
  UpdateTenantDto,
  CreatePackageDto,
  CreateSubscriptionDto,
  UpdateTenantAdminDto,
  ReplaceTenantAdminDto,
  InitializeTenantAdminDto,
} from './system-admin.types';
import { TenantStatus, Role } from '@prisma/client';
import { SYSTEM_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../../constants/permissions.constant';

export class SystemAdminService {
  /**
   * Helper gieo cấu hình RoleModel, RolePermission và SharedCategory cho một Tenant mới
   */
  private async seedTenantRolesAndCategories(tx: any, tenantId: string) {
    // 1. Lấy danh sách permission catalog (hoặc tạo nếu chưa có)
    let allPerms = await tx.permission.findMany();
    if (allPerms.length === 0) {
      await tx.permission.createMany({
        data: SYSTEM_PERMISSIONS.map((p) => ({
          key: p.key,
          name: p.name,
          category: p.category,
          description: p.description,
        })),
        skipDuplicates: true,
      });
      allPerms = await tx.permission.findMany();
    }

    const permMap: Record<string, string> = {};
    for (const p of allPerms) {
      permMap[p.key] = p.id;
    }

    // 2. Tạo RoleModel cho Tenant
    const rolesDef = [
      { code: 'ADMIN', name: 'Quản trị viên trường', description: 'Toàn quyền quản trị trường học và phân quyền hệ thống' },
      { code: 'HIEU_TRUONG', name: 'Hiệu trưởng', description: 'Lãnh đạo toàn diện nhà trường, phê duyệt kế hoạch và phân công' },
      { code: 'PHO_HIEU_TRUONG', name: 'Phó Hiệu trưởng', description: 'Phụ trách chuyên môn, kiểm tra đánh giá và quản lý phân hiệu' },
      { code: 'TO_TRUONG', name: 'Tổ trưởng chuyên môn', description: 'Quản lý kế hoạch tổ, phân công nhiệm vụ và duyệt minh chứng tổ' },
      { code: 'GIAO_VIEN', name: 'Giáo viên', description: 'Thực hiện nhiệm vụ giảng dạy, nộp minh chứng và cập nhật tiến độ' },
      { code: 'NHAN_VIEN', name: 'Nhân viên', description: 'Thực hiện nhiệm vụ hành chính, phục vụ, kế toán, y tế' },
    ];

    const roleMap: Record<string, any> = {};
    for (const r of rolesDef) {
      const createdRole = await tx.roleModel.create({
        data: {
          tenantId,
          code: r.code,
          name: r.name,
          description: r.description,
          isSystem: true,
        },
      });
      roleMap[r.code] = createdRole;

      // Gán RolePermission
      const permKeys = DEFAULT_ROLE_PERMISSIONS[r.code] || [];
      const rolePermData: { roleId: string; permissionId: string }[] = [];
      for (const key of permKeys) {
        const permId = permMap[key];
        if (permId) {
          rolePermData.push({
            roleId: createdRole.id,
            permissionId: permId,
          });
        }
      }
      if (rolePermData.length > 0) {
        await tx.rolePermission.createMany({ data: rolePermData });
      }
    }

    // 3. Tạo SharedCategory mặc định bằng createMany
    const defaultCategories = [
      { type: 'NAM_HOC', code: '2026-2027', name: 'Năm học 2026 - 2027', orderIndex: 1, isDefault: true },
      { type: 'NAM_HOC', code: '2025-2026', name: 'Năm học 2025 - 2026', orderIndex: 2, isDefault: false },
      { type: 'HOC_KY', code: 'HK1', name: 'Học kỳ I', orderIndex: 1, isDefault: true },
      { type: 'HOC_KY', code: 'HK2', name: 'Học kỳ II', orderIndex: 2, isDefault: false },
      { type: 'CHUC_VU', code: 'HT', name: 'Hiệu trưởng', orderIndex: 1, isDefault: false },
      { type: 'CHUC_VU', code: 'PHT', name: 'Phó Hiệu trưởng', orderIndex: 2, isDefault: false },
      { type: 'CHUC_VU', code: 'TT', name: 'Tổ trưởng chuyên môn', orderIndex: 3, isDefault: false },
      { type: 'CHUC_VU', code: 'GV', name: 'Giáo viên bộ môn', orderIndex: 4, isDefault: true },
    ];

    await tx.sharedCategory.createMany({
      data: defaultCategories.map((cat) => ({
        tenantId,
        ...cat,
      })),
    });

    return roleMap;
  }

  /**
   * Thống kê tổng quan nền tảng SaaS & Báo cáo điều hành
   */
  async getDashboardStats() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      activeUsers,
      totalTasks,
      totalPlans,
      packages,
      expiringSubscriptions,
      recentAuditLogs,
      tenantsWithSubs,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { isSystemAdmin: false } }),
      prisma.user.count({ where: { isSystemAdmin: false, isActive: true } }),
      prisma.task.count(),
      prisma.plan.count(),
      prisma.package.findMany({
        include: {
          _count: { select: { subscriptions: true } },
        },
      }),
      prisma.tenantSubscription.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { lte: thirtyDaysFromNow },
        },
        include: {
          tenant: true,
          package: true,
        },
      }),
      prisma.systemAuditLog.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
          targetTenant: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.tenant.findMany({
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            take: 1,
            include: { package: true },
          },
          _count: {
            select: { users: true },
          },
        },
      }),
    ]);

    // Tính toán tổng dung lượng và tài khoản phân bổ
    let totalAllocatedAccounts = 0;
    let totalAllocatedStorageGB = 0;
    for (const t of tenantsWithSubs) {
      const activeSub = t.subscriptions[0];
      if (activeSub?.package) {
        totalAllocatedAccounts += activeSub.package.maxAccounts || 100;
        totalAllocatedStorageGB += activeSub.package.storageQuotaGB || 20;
      }
    }

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      activeUsers,
      totalTasks,
      totalPlans,
      totalAllocatedAccounts,
      totalAllocatedStorageGB,
      packages,
      expiringSubscriptions: expiringSubscriptions.map((sub) => ({
        id: sub.id,
        tenantId: sub.tenantId,
        tenantName: sub.tenant.name,
        tenantCode: sub.tenant.code,
        packageName: sub.package.name,
        packageCode: sub.package.code,
        endDate: sub.endDate,
        daysRemaining: Math.ceil(
          (new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      })),
      recentAuditLogs,
    };
  }

  /**
   * Lấy danh sách Tenant kèm thông tin trường, gói thuê, admins và số liệu
   */
  async getTenants(options?: {
    search?: string;
    status?: TenantStatus;
    page?: number;
    pageSize?: number;
  }) {
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
        { school: { name: { contains: s, mode: 'insensitive' } } },
        { school: { principalName: { contains: s, mode: 'insensitive' } } },
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
          school: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { package: true },
          },
          users: {
            where: {
              roles: {
                some: {
                  role: Role.ADMIN,
                },
              },
            },
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              title: true,
              isActive: true,
            },
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
      }),
    ]);

    const formatted = tenants.map((t) => {
      const activeSub = t.subscriptions[0];
      const adminUser = t.users[0] || null;
      return {
        id: t.id,
        code: t.code,
        name: t.name,
        status: t.status,
        logoUrl: t.logoUrl,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        school: t.school,
        adminUser: adminUser
          ? {
              id: adminUser.id,
              fullName: adminUser.fullName,
              email: adminUser.email,
              phone: adminUser.phone,
              title: adminUser.title,
              isActive: adminUser.isActive,
            }
          : null,
        stats: {
          userCount: t._count.users,
          locationCount: t._count.locations,
          orgUnitCount: t._count.orgUnits,
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
                new Date(activeSub.endDate).getTime() - Date.now() <
                30 * 24 * 60 * 60 * 1000,
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
   * Lấy chi tiết toàn diện 360 độ về Tenant theo ID
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
          orderBy: { isMain: 'desc' },
        },
        orgUnits: {
          orderBy: { orderIndex: 'asc' },
        },
        users: {
          where: {
            roles: {
              some: {
                role: Role.ADMIN,
              },
            },
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            title: true,
            isActive: true,
            createdAt: true,
            roles: {
              include: {
                scopeLocation: true,
                scopeOrgUnit: true,
              },
            },
          },
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
   * Tạo Tenant mới + Khởi tạo School + Seed Role/Permission/Category + Tạo Tenant Admin đầu tiên
   */
  async createTenantWithAdmin(dto: CreateTenantDto, actorUserId: string) {
    const adminName = (dto.adminName || dto.adminFullName || '').trim();
    const adminEmail = dto.adminEmail.trim().toLowerCase();
    const adminPhone = dto.adminPhone.trim();
    const tenantCode = dto.code.trim().toUpperCase();

    if (!adminName) {
      throw new AppError('Vui lòng nhập họ tên Quản trị viên trường (Tenant Admin).', 400);
    }
    if (!adminEmail || !adminPhone) {
      throw new AppError('Vui lòng nhập đầy đủ Email và Số điện thoại của Quản trị viên trường.', 400);
    }

    // 1. Kiểm tra code tenant duy nhất
    const existingCode = await prisma.tenant.findUnique({
      where: { code: tenantCode },
    });
    if (existingCode) {
      throw new AppError(`Mã trường (Tenant Code) "${tenantCode}" đã tồn tại. Vui lòng chọn mã khác.`, 400);
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
      where: { email: adminEmail },
    });
    if (existingAdminEmail) {
      throw new AppError(`Email "${adminEmail}" đã được sử dụng bởi một tài khoản khác trong hệ thống.`, 400);
    }

    const existingAdminPhone = await prisma.user.findUnique({
      where: { phone: adminPhone },
    });
    if (existingAdminPhone) {
      throw new AppError(`Số điện thoại "${adminPhone}" đã được sử dụng bởi một tài khoản khác.`, 400);
    }

    const defaultPasswordHash = await bcrypt.hash(dto.adminPassword || '123456', 10);

    // 4. Tạo Transaction để đảm bảo toàn vẹn
    const result = await prisma.$transaction(async (tx) => {
      // 4.1 Tạo Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name.trim(),
          code: tenantCode,
          status: 'ACTIVE',
          logoUrl: dto.logoUrl || null,
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
          phone: dto.phone || adminPhone,
          email: dto.email || adminEmail,
          principalName: dto.principalName || adminName,
          schoolYear: dto.schoolYear || '2026-2027',
          totalClasses: dto.totalClasses || 0,
          totalStudents: dto.totalStudents || 0,
          totalStaff: dto.totalStaff || 1,
          description: dto.description || null,
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
          phone: dto.phone || adminPhone,
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

      // 4.6 Gieo đầy đủ Roles, Permissions và Categories cho Tenant
      const roleMap = await this.seedTenantRolesAndCategories(tx, tenant.id);
      const adminRoleModel = roleMap['ADMIN'];

      // 4.7 Tạo tài khoản Tenant Admin đầu tiên
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          primaryLocationId: mainLocation.id,
          primaryOrgUnitId: defaultOrgUnit.id,
          fullName: adminName,
          email: adminEmail,
          phone: adminPhone,
          passwordHash: defaultPasswordHash,
          title: dto.adminTitle || 'Quản trị hệ thống (Admin trường)',
          isActive: true,
          isSystemAdmin: false,
          roles: {
            create: [
              {
                tenantId: tenant.id,
                role: Role.ADMIN,
                roleId: adminRoleModel ? adminRoleModel.id : null,
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

      // 4.8 Ghi SystemAuditLog
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
    }, { maxWait: 15000, timeout: 30000 });

    return result;
  }

  /**
   * Cập nhật thông tin chi tiết của Tenant và School Profile
   */
  async updateTenant(id: string, dto: UpdateTenantDto, actorUserId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { school: true },
    });
    if (!tenant) {
      throw new AppError('Không tìm thấy trường học (Tenant).', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật Tenant
      const updatedTenant = await tx.tenant.update({
        where: { id },
        data: {
          name: dto.name ? dto.name.trim() : undefined,
          status: dto.status || undefined,
          logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : undefined,
        },
      });

      // 2. Cập nhật School Profile nếu có
      let updatedSchool = null;
      if (tenant.school) {
        updatedSchool = await tx.school.update({
          where: { id: tenant.school.id },
          data: {
            name: dto.name ? dto.name.trim() : undefined,
            phone: dto.phone !== undefined ? dto.phone : undefined,
            email: dto.email !== undefined ? dto.email : undefined,
            website: dto.website !== undefined ? dto.website : undefined,
            address: dto.address !== undefined ? dto.address : undefined,
            principalName: dto.principalName !== undefined ? dto.principalName : undefined,
            schoolYear: dto.schoolYear !== undefined ? dto.schoolYear : undefined,
            totalStudents: dto.totalStudents !== undefined ? Number(dto.totalStudents) : undefined,
            totalFemaleStudents: dto.totalFemaleStudents !== undefined ? Number(dto.totalFemaleStudents) : undefined,
            totalClasses: dto.totalClasses !== undefined ? Number(dto.totalClasses) : undefined,
            totalStaff: dto.totalStaff !== undefined ? Number(dto.totalStaff) : undefined,
            description: dto.description !== undefined ? dto.description : undefined,
          },
        });
      }

      // 3. Ghi log kiểm toán
      await tx.systemAuditLog.create({
        data: {
          actorUserId,
          action: 'UPDATE_TENANT',
          targetTenantId: id,
          detail: `Cập nhật thông tin chi tiết trường ${tenant.name} (${tenant.code}): ${JSON.stringify(dto)}`,
        },
      });

      return {
        ...updatedTenant,
        school: updatedSchool,
      };
    });

    return result;
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
   * Lấy danh sách tài khoản Quản trị viên (Admin) của một Tenant
   */
  async getTenantAdmins(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Không tìm thấy Tenant.', 404);

    const admins = await prisma.user.findMany({
      where: {
        tenantId,
        roles: {
          some: {
            role: Role.ADMIN,
          },
        },
      },
      include: {
        primaryLocation: true,
        primaryOrgUnit: true,
        roles: {
          include: {
            scopeLocation: true,
            scopeOrgUnit: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return admins.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      title: u.title,
      avatarUrl: u.avatarUrl,
      isActive: u.isActive,
      primaryLocation: u.primaryLocation?.name || null,
      primaryOrgUnit: u.primaryOrgUnit?.name || null,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Chỉnh sửa thông tin tài khoản Quản trị viên Tenant (Tenant Admin)
   */
  async updateTenantAdmin(
    tenantId: string,
    adminUserId: string,
    dto: UpdateTenantAdminDto,
    actorUserId: string
  ) {
    const user = await prisma.user.findFirst({
      where: { id: adminUserId, tenantId },
    });

    if (!user) {
      throw new AppError('Không tìm thấy tài khoản quản trị viên trong trường học này.', 404);
    }

    // Kiểm tra trùng email nếu đổi email
    if (dto.email && dto.email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const emailExists = await prisma.user.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (emailExists) {
        throw new AppError(`Email "${dto.email}" đã được sử dụng bởi tài khoản khác.`, 400);
      }
    }

    // Kiểm tra trùng số điện thoại nếu đổi SĐT
    if (dto.phone && dto.phone.trim() !== user.phone) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone: dto.phone.trim() },
      });
      if (phoneExists) {
        throw new AppError(`Số điện thoại "${dto.phone}" đã được sử dụng bởi tài khoản khác.`, 400);
      }
    }

    let passwordHash: string | undefined = undefined;
    if (dto.newPassword && dto.newPassword.trim()) {
      if (dto.newPassword.trim().length < 6) {
        throw new AppError('Mật khẩu mới phải có tối thiểu 6 ký tự.', 400);
      }
      passwordHash = await bcrypt.hash(dto.newPassword.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id: adminUserId },
      data: {
        fullName: dto.fullName ? dto.fullName.trim() : undefined,
        email: dto.email ? dto.email.trim().toLowerCase() : undefined,
        phone: dto.phone ? dto.phone.trim() : undefined,
        title: dto.title !== undefined ? dto.title : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        passwordHash: passwordHash || undefined,
      },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorUserId,
        action: 'UPDATE_TENANT_ADMIN',
        targetTenantId: tenantId,
        detail: `Cập nhật thông tin Admin ${user.fullName} (${user.email}): ${JSON.stringify(dto)}`,
      },
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      title: updated.title,
      isActive: updated.isActive,
    };
  }

  /**
   * Đặt lại mật khẩu tài khoản Quản trị viên Tenant
   */
  async resetTenantAdminPassword(
    tenantId: string,
    adminUserId: string,
    newPassword = '123456',
    actorUserId: string
  ) {
    const user = await prisma.user.findFirst({
      where: { id: adminUserId, tenantId },
    });
    if (!user) {
      throw new AppError('Không tìm thấy tài khoản quản trị viên trong trường học này.', 404);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: adminUserId },
      data: { passwordHash: hash },
    });

    await prisma.systemAuditLog.create({
      data: {
        actorUserId,
        action: 'RESET_ADMIN_PASSWORD',
        targetTenantId: tenantId,
        detail: `Đặt lại mật khẩu cho Admin ${user.fullName} (${user.email})`,
      },
    });

    return { success: true, message: `Đã đặt lại mật khẩu cho ${user.fullName} thành công.` };
  }

  /**
   * Thay thế / Chuyển giao Quản trị viên trường (Tenant Admin)
   */
  async replaceTenantAdmin(tenantId: string, dto: ReplaceTenantAdminDto, actorUserId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { school: true, locations: true, orgUnits: true },
    });
    if (!tenant) throw new AppError('Không tìm thấy Tenant.', 404);

    let adminRoleModel = await prisma.roleModel.findFirst({
      where: { tenantId, code: 'ADMIN' },
    });
    if (!adminRoleModel) {
      adminRoleModel = await prisma.roleModel.create({
        data: {
          tenantId,
          code: 'ADMIN',
          name: 'Quản trị viên trường',
          isSystem: true,
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let newAdminUser: any;

      if (dto.mode === 'EXISTING_USER') {
        if (!dto.existingUserId) {
          throw new AppError('Vui lòng chọn tài khoản cán bộ để chuyển giao quyền Admin.', 400);
        }
        const existingUser = await tx.user.findFirst({
          where: { id: dto.existingUserId, tenantId },
        });
        if (!existingUser) {
          throw new AppError('Không tìm thấy cán bộ được chọn trong trường học này.', 404);
        }

        // Kiểm tra xem user đã có role ADMIN chưa
        const hasAdminRole = await tx.userRole.findFirst({
          where: { userId: existingUser.id, role: Role.ADMIN },
        });

        if (!hasAdminRole) {
          await tx.userRole.create({
            data: {
              tenantId,
              userId: existingUser.id,
              role: Role.ADMIN,
              roleId: adminRoleModel.id,
            },
          });
        }

        newAdminUser = existingUser;
      } else {
        // Mode NEW_USER
        const newName = (dto.newAdminName || '').trim();
        const newEmail = (dto.newAdminEmail || '').trim().toLowerCase();
        const newPhone = (dto.newAdminPhone || '').trim();

        if (!newName || !newEmail || !newPhone) {
          throw new AppError('Vui lòng điền đầy đủ Họ tên, Email và SĐT cho Admin mới.', 400);
        }

        const emailExists = await tx.user.findUnique({ where: { email: newEmail } });
        if (emailExists) {
          throw new AppError(`Email "${newEmail}" đã tồn tại trong hệ thống.`, 400);
        }
        const phoneExists = await tx.user.findUnique({ where: { phone: newPhone } });
        if (phoneExists) {
          throw new AppError(`Số điện thoại "${newPhone}" đã tồn tại trong hệ thống.`, 400);
        }

        const mainLoc = tenant.locations.find((l) => l.isMain) || tenant.locations[0];
        const defaultOrg = tenant.orgUnits[0];
        const passwordHash = await bcrypt.hash(dto.newAdminPassword || '123456', 10);

        newAdminUser = await tx.user.create({
          data: {
            tenantId,
            schoolId: tenant.school?.id || null,
            primaryLocationId: mainLoc?.id || null,
            primaryOrgUnitId: defaultOrg?.id || null,
            fullName: newName,
            email: newEmail,
            phone: newPhone,
            passwordHash,
            title: dto.newAdminTitle || 'Quản trị hệ thống (Admin trường)',
            isActive: true,
            roles: {
              create: [
                {
                  tenantId,
                  role: Role.ADMIN,
                  roleId: adminRoleModel.id,
                },
              ],
            },
          },
        });
      }

      // Xử lý admin cũ nếu có yêu cầu gỡ quyền (archiveOldAdmin)
      if (dto.archiveOldAdmin) {
        const oldAdmins = await tx.userRole.findMany({
          where: {
            tenantId,
            role: Role.ADMIN,
            userId: { not: newAdminUser.id },
          },
        });

        for (const old of oldAdmins) {
          await tx.userRole.delete({ where: { id: old.id } });
        }
      }

      // Ghi SystemAuditLog
      await tx.systemAuditLog.create({
        data: {
          actorUserId,
          action: 'REPLACE_TENANT_ADMIN',
          targetTenantId: tenantId,
          detail: `Chuyển giao quyền Admin trường ${tenant.name} cho: ${newAdminUser.fullName} (${newAdminUser.email}). Archive admin cũ: ${dto.archiveOldAdmin ? 'Có' : 'Không'}`,
        },
      });

      return newAdminUser;
    });

    return {
      success: true,
      message: `Đã chuyển giao quyền Quản trị viên trường cho ${result.fullName} (${result.email}) thành công.`,
      admin: {
        id: result.id,
        fullName: result.fullName,
        email: result.email,
        phone: result.phone,
      },
    };
  }

  /**
   * Khởi tạo tài khoản Admin cho Tenant chưa có admin
   */
  async initializeTenantAdmin(tenantId: string, dto: InitializeTenantAdminDto, actorUserId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { school: true, locations: true, orgUnits: true },
    });
    if (!tenant) throw new AppError('Không tìm thấy Tenant.', 404);

    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    const name = dto.fullName.trim();

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) throw new AppError(`Email "${email}" đã tồn tại.`, 400);

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) throw new AppError(`Số điện thoại "${phone}" đã tồn tại.`, 400);

    const passwordHash = await bcrypt.hash(dto.password || '123456', 10);

    const result = await prisma.$transaction(async (tx) => {
      let adminRoleModel = await tx.roleModel.findFirst({
        where: { tenantId, code: 'ADMIN' },
      });
      if (!adminRoleModel) {
        const roleMap = await this.seedTenantRolesAndCategories(tx, tenantId);
        adminRoleModel = roleMap['ADMIN'];
      }

      const mainLoc = tenant.locations.find((l) => l.isMain) || tenant.locations[0];
      const defaultOrg = tenant.orgUnits[0];

      const user = await tx.user.create({
        data: {
          tenantId,
          schoolId: tenant.school?.id || null,
          primaryLocationId: mainLoc?.id || null,
          primaryOrgUnitId: defaultOrg?.id || null,
          fullName: name,
          email,
          phone,
          passwordHash,
          title: dto.title || 'Quản trị hệ thống (Admin trường)',
          isActive: true,
          roles: {
            create: [
              {
                tenantId,
                role: Role.ADMIN,
                roleId: adminRoleModel ? adminRoleModel.id : null,
              },
            ],
          },
        },
      });

      await tx.systemAuditLog.create({
        data: {
          actorUserId,
          action: 'INITIALIZE_TENANT_ADMIN',
          targetTenantId: tenantId,
          detail: `Khởi tạo Admin mới cho trường ${tenant.name}: ${user.fullName} (${user.email})`,
        },
      });

      return user;
    });

    return result;
  }

  /**
   * Báo cáo khai thác tài nguyên và quy mô toàn bộ các trường (SaaS Commercial Reporting)
   */
  async getTenantReports() {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        school: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { package: true },
        },
        users: {
          where: {
            roles: {
              some: { role: Role.ADMIN },
            },
          },
          select: { fullName: true, email: true, phone: true },
        },
        _count: {
          select: {
            users: true,
            locations: true,
            orgUnits: true,
            plans: true,
            tasks: true,
            attachments: true,
          },
        },
      },
    });

    const reportItems = tenants.map((t) => {
      const sub = t.subscriptions[0];
      const maxAccounts = sub?.package?.maxAccounts || 100;
      const userCount = t._count.users;
      const utilizationRate = Math.round((userCount / maxAccounts) * 100);
      const admin = t.users[0] || null;

      return {
        id: t.id,
        code: t.code,
        name: t.name,
        status: t.status,
        principalName: t.school?.principalName || 'Chưa cập nhật',
        phone: t.school?.phone || '-',
        email: t.school?.email || '-',
        packageName: sub?.package?.name || 'Chưa có gói',
        maxAccounts,
        userCount,
        utilizationRate,
        storageQuotaGB: sub?.package?.storageQuotaGB || 20,
        locationsCount: t._count.locations,
        orgUnitsCount: t._count.orgUnits,
        plansCount: t._count.plans,
        tasksCount: t._count.tasks,
        adminFullName: admin?.fullName || 'Chưa thiết lập',
        adminEmail: admin?.email || '-',
        subscriptionEndDate: sub ? sub.endDate : null,
        createdAt: t.createdAt,
      };
    });

    return reportItems;
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
