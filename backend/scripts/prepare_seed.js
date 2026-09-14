const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../prisma/seed.ts');
let src = fs.readFileSync(seedPath, 'utf8');

// 1. Update imports
if (!src.includes('TenantStatus')) {
  src = src.replace("import { PrismaClient,", "import { PrismaClient, TenantStatus, SubscriptionStatus,");
}

// 2. Update delete sequence
const oldDelete = `  // Xóa dữ liệu cũ theo thứ tự quan hệ
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.taskLog.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.orgUnit.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.school.deleteMany({});`;

const newDelete = `  // Xóa dữ liệu cũ theo thứ tự quan hệ
  await prisma.systemAuditLog.deleteMany({});
  await prisma.adminAuditLog.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.taskLog.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.orgUnit.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.school.deleteMany({});
  await prisma.tenantSubscription.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.tenant.deleteMany({});`;

src = src.replace(oldDelete, newDelete);

// 3. Add packages, System Admin, and Tenant 1 before School
const oldSchoolStart = `  // 1. TẠO TRƯỜNG HỌC
  const school = await prisma.school.create({`;

const newSchoolStart = `  // 0. TẠO GÓI DỊCH VỤ & SYSTEM ADMIN
  const pkgStandard = await prisma.package.create({
    data: {
      name: 'Gói Cơ bản (Standard)',
      code: 'STD',
      maxAccounts: 100,
      storageQuotaGB: 20,
      enabledModules: JSON.stringify(['PLANS', 'TASKS', 'REPORTS', 'ORG']),
      price: 15000000,
      description: 'Dành cho các trường quy mô vừa và nhỏ (dưới 100 cán bộ giáo viên).',
    },
  });

  const pkgEnterprise = await prisma.package.create({
    data: {
      name: 'Gói Nâng cao (Enterprise)',
      code: 'ENT',
      maxAccounts: 500,
      storageQuotaGB: 100,
      enabledModules: JSON.stringify(['PLANS', 'TASKS', 'KPI', 'REPORTS', 'ORG', 'ATTACHMENTS_S3']),
      price: 35000000,
      description: 'Dành cho trường liên cấp, nhiều điểm trường hoặc trên 100 cán bộ giáo viên.',
    },
  });
  console.log('✓ Đã tạo 2 gói thuê: Standard (100 user) & Enterprise (500 user)');

  const sysAdmin = await prisma.user.create({
    data: {
      fullName: 'Quản trị Nền tảng (System Admin)',
      email: 'sysadmin@tnedu.vn',
      phone: '0900000001',
      passwordHash: defaultPasswordHash,
      title: 'Platform System Administrator',
      isSystemAdmin: true,
      isActive: true,
      avatarUrl: 'https://ui-avatars.com/api/?name=System+Admin&background=0F172A&color=fff',
      roles: {
        create: {
          role: Role.SYSTEM_ADMIN,
        },
      },
    },
  });
  console.log('✓ Đã tạo tài khoản System Admin: sysadmin@tnedu.vn (0900000001)');

  // 1. TẠO TENANT 1: TH & THCS PHƯỚC TÂN
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'Trường TH và THCS Phước Tân',
      code: 'PHUOC_TAN',
      status: 'ACTIVE',
    },
  });

  await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant1.id,
      packageId: pkgEnterprise.id,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-07-31'),
      status: 'ACTIVE',
    },
  });
  console.log('✓ Đã tạo Tenant 1: TH & THCS Phước Tân (Gói Enterprise)');

  // 1.1 TẠO TRƯỜNG HỌC 1
  const school = await prisma.school.create({
    data: {
      tenantId: tenant1.id,`;

src = src.replace(oldSchoolStart, newSchoolStart);

// 4. Inject tenantId: tenant1.id into schoolId references
src = src.replace(/schoolId: school\.id,/g, 'tenantId: tenant1.id,\n      schoolId: school.id,');

// 5. Update Task assignments and logs creation in createTaskItem
src = src.replace(
  "{ userId: data.chuTriId, role: TaskAssignmentRole.CHU_TRI, note: 'Chịu trách nhiệm chính' }",
  "{ tenantId: tenant1.id, userId: data.chuTriId, role: TaskAssignmentRole.CHU_TRI, note: 'Chịu trách nhiệm chính' }"
);
src = src.replace(
  "{ userId: data.kiemTraId, role: TaskAssignmentRole.KIEM_TRA, note: 'Kiểm tra chất lượng' }",
  "{ tenantId: tenant1.id, userId: data.kiemTraId, role: TaskAssignmentRole.KIEM_TRA, note: 'Kiểm tra chất lượng' }"
);
src = src.replace(
  "{ userId: data.pheDuyetId, role: TaskAssignmentRole.PHE_DUYET, note: 'Ban Giám hiệu phê duyệt' }",
  "{ tenantId: tenant1.id, userId: data.pheDuyetId, role: TaskAssignmentRole.PHE_DUYET, note: 'Ban Giám hiệu phê duyệt' }"
);

src = src.replace(
  "userId: uid,\n              role: TaskAssignmentRole.PHOI_HOP,",
  "tenantId: tenant1.id,\n              userId: uid,\n              role: TaskAssignmentRole.PHOI_HOP,"
);

src = src.replace(
  "userId: uid,\n              role: TaskAssignmentRole.THEO_DOI,",
  "tenantId: tenant1.id,\n              userId: uid,\n              role: TaskAssignmentRole.THEO_DOI,"
);

src = src.replace(
  "userId: data.createdById,\n              action: 'TAO_MOI',",
  "tenantId: tenant1.id,\n              userId: data.createdById,\n              action: 'TAO_MOI',"
);

// 6. Update Notification creation
src = src.replace(
  "userId: uTTGDCD.id,",
  "tenantId: tenant1.id,\n        userId: uTTGDCD.id,"
);
src = src.replace(
  "userId: uPHTChuyenMon.id,",
  "tenantId: tenant1.id,\n        userId: uPHTChuyenMon.id,"
);
src = src.replace(
  "userId: createdTeachers[18].id,",
  "tenantId: tenant1.id,\n        userId: createdTeachers[18].id,"
);

// 7. Add Tenant 2 creation at the end of seed function before console.log completion
const tenant2Seed = `
  // =========================================================================
  // 8. TẠO TENANT 2 (TRƯỜNG THCS NGUYỄN HUỆ) - ĐỘC LẬP HOÀN TOÀN
  // =========================================================================
  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Trường THCS Nguyễn Huệ',
      code: 'NGUYEN_HUE',
      status: 'ACTIVE',
    },
  });

  await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant2.id,
      packageId: pkgStandard.id,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-08-31'),
      status: 'ACTIVE',
    },
  });

  const school2 = await prisma.school.create({
    data: {
      tenantId: tenant2.id,
      name: 'Trường THCS Nguyễn Huệ',
      code: 'THCS_NGUYEN_HUE',
      address: 'Số 45 đường Hùng Vương, TP. Biên Hòa, Tỉnh Đồng Nai',
      phone: '02513999888',
      email: 'thcs_nguyenhue@dongnai.edu.vn',
      principalName: 'Nguyễn Văn Hùng',
      totalStudents: 1850,
      totalClasses: 42,
      totalStaff: 75,
      schoolYear: '2026 - 2027',
    },
  });

  const locNHMain = await prisma.location.create({
    data: {
      tenantId: tenant2.id,
      schoolId: school2.id,
      name: 'Điểm chính (Hùng Vương)',
      code: 'NH_MAIN',
      isMain: true,
      studentCount: 1200,
      classCount: 28,
    },
  });

  const locNHPh1 = await prisma.location.create({
    data: {
      tenantId: tenant2.id,
      schoolId: school2.id,
      name: 'Phân hiệu Bến Cá',
      code: 'NH_PH1',
      isMain: false,
      studentCount: 650,
      classCount: 14,
    },
  });

  const orgNHBGH = await prisma.orgUnit.create({
    data: { tenantId: tenant2.id, schoolId: school2.id, name: 'Ban Giám hiệu & Văn phòng', code: 'NH_BGH', orderIndex: 1 },
  });
  const orgNHTuNhien = await prisma.orgUnit.create({
    data: { tenantId: tenant2.id, schoolId: school2.id, name: 'Tổ Tự nhiên (Toán - KHTN - Tin)', code: 'NH_TUNHIEN', orderIndex: 2 },
  });
  const orgNHXaHoi = await prisma.orgUnit.create({
    data: { tenantId: tenant2.id, schoolId: school2.id, name: 'Tổ Xã hội (Văn - Sử - Địa - Ngoại ngữ)', code: 'NH_XAHOI', orderIndex: 3 },
  });

  // Admin Tenant 2
  const uAdminTenant2 = await prisma.user.create({
    data: {
      tenantId: tenant2.id,
      schoolId: school2.id,
      fullName: 'Đặng Thị Thu Hà',
      email: 'admin.nguyenhue@dongnai.edu.vn',
      phone: '0905555666',
      passwordHash: defaultPasswordHash,
      title: 'Quản trị hệ thống (THCS Nguyễn Huệ)',
      primaryLocationId: locNHMain.id,
      primaryOrgUnitId: orgNHBGH.id,
      roles: { create: [{ role: Role.ADMIN }] },
    },
  });

  // Hiệu trưởng Tenant 2
  const uHieuTruongTenant2 = await prisma.user.create({
    data: {
      tenantId: tenant2.id,
      schoolId: school2.id,
      fullName: 'Nguyễn Văn Hùng',
      email: 'hieutruong.nguyenhue@dongnai.edu.vn',
      phone: '0905555777',
      passwordHash: defaultPasswordHash,
      title: 'Hiệu trưởng THCS Nguyễn Huệ',
      primaryLocationId: locNHMain.id,
      primaryOrgUnitId: orgNHBGH.id,
      roles: { create: [{ role: Role.HIEU_TRUONG }] },
    },
  });

  // Giáo viên 1 Tenant 2
  const uGV1Tenant2 = await prisma.user.create({
    data: {
      tenantId: tenant2.id,
      schoolId: school2.id,
      fullName: 'Trần Minh Quang',
      email: 'quang.tm@nguyenhue.edu.vn',
      phone: '0905555888',
      passwordHash: defaultPasswordHash,
      title: 'Tổ trưởng Tự nhiên (Toán)',
      primaryLocationId: locNHMain.id,
      primaryOrgUnitId: orgNHTuNhien.id,
      roles: { create: [{ role: Role.TO_TRUONG, scopeOrgUnitId: orgNHTuNhien.id }] },
    },
  });

  // Giáo viên 2 Tenant 2
  const uGV2Tenant2 = await prisma.user.create({
    data: {
      tenantId: tenant2.id,
      schoolId: school2.id,
      fullName: 'Phan Thị Lan',
      email: 'lan.pt@nguyenhue.edu.vn',
      phone: '0905555999',
      passwordHash: defaultPasswordHash,
      title: 'Giáo viên Ngữ văn',
      primaryLocationId: locNHPh1.id,
      primaryOrgUnitId: orgNHXaHoi.id,
      roles: { create: [{ role: Role.GIAO_VIEN }] },
    },
  });

  // Plan Tenant 2
  const planNH = await prisma.plan.create({
    data: {
      tenantId: tenant2.id,
      schoolId: school2.id,
      title: 'Kế hoạch Giáo dục & Chuyên môn Năm học 2026-2027 (THCS Nguyễn Huệ)',
      level: PlanLevel.NAM,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-05-31'),
      progressPercent: 40,
      createdById: uHieuTruongTenant2.id,
    },
  });

  // Tasks Tenant 2
  await prisma.task.create({
    data: {
      tenantId: tenant2.id,
      schoolId: school2.id,
      code: 'CV-NH-01',
      title: 'Khai mạc tuần lễ hưởng ứng học tập suốt đời năm 2026 (THCS Nguyễn Huệ)',
      description: 'Tổ chức lễ phát động và giao lưu đọc sách tại Điểm chính',
      planId: planNH.id,
      locationId: locNHMain.id,
      orgUnitId: orgNHXaHoi.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 60,
      startDate: new Date('2026-09-10'),
      dueDate: new Date('2026-09-25'),
      createdById: uHieuTruongTenant2.id,
      assignments: {
        create: [
          { tenantId: tenant2.id, userId: uGV2Tenant2.id, role: TaskAssignmentRole.CHU_TRI },
          { tenantId: tenant2.id, userId: uHieuTruongTenant2.id, role: TaskAssignmentRole.PHE_DUYET },
        ],
      },
      logs: {
        create: [
          { tenantId: tenant2.id, userId: uHieuTruongTenant2.id, action: 'TAO_MOI', newStatus: TaskStatus.DANG_THUC_HIEN, newProgress: 60, note: 'Khởi tạo công việc' },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant2.id,
      schoolId: school2.id,
      code: 'CV-NH-02',
      title: 'Khảo sát cơ sở vật chất phòng Tin học Phân hiệu Bến Cá',
      description: 'Kiểm tra đường truyền Internet và số lượng máy tính phục vụ học tập',
      planId: planNH.id,
      locationId: locNHPh1.id,
      orgUnitId: orgNHTuNhien.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DA_GIAO,
      progressPercent: 0,
      startDate: new Date('2026-09-12'),
      dueDate: new Date('2026-09-28'),
      createdById: uHieuTruongTenant2.id,
      assignments: {
        create: [
          { tenantId: tenant2.id, userId: uGV1Tenant2.id, role: TaskAssignmentRole.CHU_TRI },
        ],
      },
      logs: {
        create: [
          { tenantId: tenant2.id, userId: uHieuTruongTenant2.id, action: 'TAO_MOI', newStatus: TaskStatus.DA_GIAO, newProgress: 0, note: 'Giao việc rà soát' },
        ],
      },
    },
  });

  console.log('✓ Đã tạo Tenant 2: THCS Nguyễn Huệ (Gói Standard, 4 Nhân sự, 2 Điểm trường, 3 Tổ, 2 Task)');
`;

src = src.replace("console.log('🎉 Seed dữ liệu mẫu hoàn tất thành công 100%!');", tenant2Seed + "\n  console.log('🎉 Seed dữ liệu mẫu hoàn tất thành công 100%!');");

fs.writeFileSync(seedPath, src);
console.log('✅ Seed script updated successfully! Total lines:', src.split('\n').length);
