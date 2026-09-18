import { PrismaClient, TenantStatus, SubscriptionStatus, Role, PlanLevel, TaskStatus, TaskPriority, TaskAssignmentRole, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SYSTEM_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../src/constants/permissions.constant';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu tạo dữ liệu mẫu TN EDU (Seed Data)...');

  // Xóa dữ liệu cũ theo thứ tự quan hệ
  await prisma.rolePermission.deleteMany({});
  await prisma.sharedCategory.deleteMany({});
  await prisma.kPIDefinition.deleteMany({});
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
  await prisma.roleModel.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.orgUnit.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.school.deleteMany({});
  await prisma.tenantSubscription.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.tenant.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // 0. SEED PERMISSION CATALOG (CỐ ĐỊNH, KHÔNG TENANT_ID)
  console.log('🌱 Seeding fixed permission catalog (~70 permissions)...');
  await prisma.permission.createMany({
    data: SYSTEM_PERMISSIONS.map(p => ({
      key: p.key,
      name: p.name,
      category: p.category,
      description: p.description,
    }))
  });
  const allPerms = await prisma.permission.findMany();
  const permMap: Record<string, string> = {};
  for (const p of allPerms) {
    permMap[p.key] = p.id;
  }
  console.log(`✓ Đã seed ${allPerms.length} Permission keys cố định`);

  // Helper hàm khởi tạo Roles & Config cho 1 Tenant
  async function seedTenantRolesAndConfig(tenantId: string) {
    const rolesDef = [
      { code: 'ADMIN', name: 'Quản trị viên trường', description: 'Toàn quyền quản trị trường học và phân quyền hệ thống' },
      { code: 'HIEU_TRUONG', name: 'Hiệu trưởng', description: 'Lãnh đạo toàn diện nhà trường, phê duyệt kế hoạch và phân công' },
      { code: 'PHO_HIEU_TRUONG', name: 'Phó Hiệu trưởng', description: 'Phụ trách chuyên môn, kiểm tra đánh giá và quản lý phân hiệu' },
      { code: 'TO_TRUONG', name: 'Tổ trưởng chuyên môn', description: 'Quản lý kế hoạch tổ, phân công nhiệm vụ và duyệt minh chứng tổ' },
      { code: 'GIAO_VIEN', name: 'Giáo viên', description: 'Thực hiện nhiệm vụ giảng dạy, nộp minh chứng và cập nhật tiến độ' },
      { code: 'NHAN_VIEN', name: 'Nhân viên', description: 'Thực hiện nhiệm vụ hành chính, phục vụ, kế toán, y tế' },
    ];

    const roleMap: Record<string, any> = {};
    const rolePermData: { roleId: string; permissionId: string }[] = [];

    for (const r of rolesDef) {
      const createdRole = await prisma.roleModel.create({
        data: {
          tenantId,
          code: r.code,
          name: r.name,
          description: r.description,
          isSystem: true,
        },
      });
      roleMap[r.code] = createdRole;

      // Prepare role permissions
      const permKeys = DEFAULT_ROLE_PERMISSIONS[r.code] || [];
      for (const key of permKeys) {
        const permId = permMap[key];
        if (permId) {
          rolePermData.push({
            roleId: createdRole.id,
            permissionId: permId,
          });
        }
      }
    }

    if (rolePermData.length > 0) {
      await prisma.rolePermission.createMany({ data: rolePermData });
    }

    // Seed SharedCategories
    const defaultCategories = [
      { type: 'NAM_HOC', code: '2026-2027', name: 'Năm học 2026 - 2027', orderIndex: 1, isDefault: true },
      { type: 'NAM_HOC', code: '2025-2026', name: 'Năm học 2025 - 2026', orderIndex: 2, isDefault: false },
      { type: 'HOC_KY', code: 'HK1', name: 'Học kỳ I', orderIndex: 1, isDefault: true },
      { type: 'HOC_KY', code: 'HK2', name: 'Học kỳ II', orderIndex: 2, isDefault: false },
      { type: 'LOAI_DANH_GIA', code: 'XUAT_SAC', name: 'Xuất sắc', orderIndex: 1, isDefault: false },
      { type: 'LOAI_DANH_GIA', code: 'TOT', name: 'Tốt', orderIndex: 2, isDefault: true },
      { type: 'LOAI_DANH_GIA', code: 'DAT', name: 'Đạt', orderIndex: 3, isDefault: false },
      { type: 'LOAI_DANH_GIA', code: 'CHUA_DAT', name: 'Chưa đạt', orderIndex: 4, isDefault: false },
      { type: 'CHUC_VU', code: 'HIEU_TRUONG', name: 'Hiệu trưởng', orderIndex: 1, isDefault: false },
      { type: 'CHUC_VU', code: 'PHO_HIEU_TRUONG', name: 'Phó Hiệu trưởng', orderIndex: 2, isDefault: false },
      { type: 'CHUC_VU', code: 'TO_TRUONG', name: 'Tổ trưởng chuyên môn', orderIndex: 3, isDefault: false },
      { type: 'CHUC_VU', code: 'GIAO_VIEN', name: 'Giáo viên', orderIndex: 4, isDefault: false },
      { type: 'CHUC_VU', code: 'NHAN_VIEN', name: 'Nhân viên', orderIndex: 5, isDefault: false },
    ];

    await prisma.sharedCategory.createMany({
      data: defaultCategories.map(cat => ({
        tenantId,
        type: cat.type,
        code: cat.code,
        name: cat.name,
        orderIndex: cat.orderIndex,
        isDefault: cat.isDefault,
      }))
    });

    // Seed KPIDefinitions
    const defaultKPIs = [
      { code: 'KPI_DUNG_HAN', name: 'Tỷ lệ hoàn thành công việc đúng hạn', unit: '%', targetValue: 95, weight: 1.5, description: 'Tỷ lệ % các công việc hoàn thành trước hoặc đúng ngày hết hạn (dueDate)' },
      { code: 'KPI_TRUOC_HAN', name: 'Tỷ lệ hoàn thành công việc trước hạn', unit: '%', targetValue: 30, weight: 1.0, description: 'Tỷ lệ % các công việc hoàn thành trước ngày dueDate ít nhất 1 ngày' },
      { code: 'KPI_MINH_CHUNG', name: 'Tỷ lệ đính kèm minh chứng hợp lệ', unit: '%', targetValue: 100, weight: 1.2, description: 'Tỷ lệ % công việc có đầy đủ tệp tin/hình ảnh minh chứng khi đề nghị nghiệm thu' },
      { code: 'KPI_DANH_GIA_TOT', name: 'Tỷ lệ xếp loại Tốt & Xuất sắc', unit: '%', targetValue: 85, weight: 1.0, description: 'Tỷ lệ % công việc được người phê duyệt đánh giá mức Tốt hoặc Xuất sắc' },
    ];

    await prisma.kPIDefinition.createMany({
      data: defaultKPIs.map(kpi => ({
        tenantId,
        code: kpi.code,
        name: kpi.name,
        unit: kpi.unit,
        targetValue: kpi.targetValue,
        weight: kpi.weight,
        description: kpi.description,
      }))
    });

    return roleMap;
  }

  // 0. TẠO GÓI DỊCH VỤ & SYSTEM ADMIN
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
      email: 'chunh@tringhiatech.vn',
      phone: '0913016667',
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
  console.log('✓ Đã tạo tài khoản System Admin: chunh@tringhiatech.vn (0913016667)');

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

  const roleMapT1 = await seedTenantRolesAndConfig(tenant1.id);
  console.log('✓ Đã cấu hình Roles, Permissions, Categories, KPIs cho Tenant 1');

  // 1.1 TẠO TRƯỜNG HỌC 1
  const school = await prisma.school.create({
    data: {
      tenantId: tenant1.id,
      name: 'Trường TH và THCS Phước Tân',
      code: 'TH_THCS_PHUOC_TAN',
      address: 'Phường Phước Tân, TP. Biên Hòa, Tỉnh Đồng Nai',
      phone: '02513888999',
      email: 'th_thcs_phuoctan@dongnai.edu.vn',
      website: 'https://th-thcsphuoctan.dongnai.edu.vn',
      principalName: 'Phạm Thị Nam',
      totalStudents: 5669,
      totalFemaleStudents: 2736,
      totalClasses: 122,
      totalStaff: 218,
      schoolYear: '2026 - 2027',
      description: 'Trường TH và THCS Phước Tân được thành lập sau khi sắp xếp, sáp nhập trên địa bàn phường Phước Tân. Nhà trường quản lý đồng bộ 3 điểm trường với 122 lớp, 5.669 học sinh và 218 cán bộ, giáo viên, nhân viên.',
      statsJson: JSON.stringify({
        grades: {
          g6: { classes: 31, students: 1438, female: 702 },
          g7: { classes: 27, students: 1338, female: 651 },
          g8: { classes: 31, students: 1345, female: 629 },
          g9: { classes: 33, students: 1548, female: 754 }
        },
        locationsBreakdown: {
          main: {
            name: 'Điểm chính (Trung tâm)',
            classes: 44,
            students: 2137,
            female: 1027,
            g6: { classes: 10, students: 494 },
            g7: { classes: 10, students: 527 },
            g8: { classes: 13, students: 565 },
            g9: { classes: 11, students: 551 }
          },
          ph1: {
            name: 'Phân hiệu 1 (Tân Lập)',
            classes: 59,
            students: 2688,
            female: 1339,
            g6: { classes: 16, students: 746 },
            g7: { classes: 12, students: 570 },
            g8: { classes: 14, students: 601 },
            g9: { classes: 17, students: 771 }
          },
          ph2: {
            name: 'Phân hiệu 2 (Vườn Dừa)',
            classes: 19,
            students: 844,
            female: 370,
            g6: { classes: 5, students: 198 },
            g7: { classes: 5, students: 241 },
            g8: { classes: 4, students: 179 },
            g9: { classes: 5, students: 226 }
          }
        }
      })
    },
  });
  console.log(`✓ Đã tạo trường: ${school.name} (Hiệu trưởng: ${school.principalName}, Quy mô: ${school.totalClasses} lớp, ${school.totalStudents} HS)`);

  // 2. TẠO 3 ĐIỂM TRƯỜNG
  const locMain = await prisma.location.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      name: 'Điểm chính (Trung tâm)',
      code: 'DIEM_CHINH',
      address: 'Số 10 đường Nguyễn Huệ, Phước Tân, TP. Biên Hòa',
      phone: '02513888001',
      studentCount: 2137,
      femaleStudentCount: 1027,
      classCount: 44,
      isMain: true,
    },
  });

  const locPh1 = await prisma.location.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      name: 'Phân hiệu 1 (Tân Lập)',
      code: 'PHAN_HIEU_1',
      address: 'Khu phố Tân Lập, Phước Tân, TP. Biên Hòa',
      phone: '02513888002',
      studentCount: 2688,
      femaleStudentCount: 1339,
      classCount: 59,
      isMain: false,
    },
  });

  const locPh2 = await prisma.location.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      name: 'Phân hiệu 2 (Vườn Dừa)',
      code: 'PHAN_HIEU_2',
      address: 'Ấp Vườn Dừa, Phước Tân, TP. Biên Hòa',
      phone: '02513888003',
      studentCount: 844,
      femaleStudentCount: 370,
      classCount: 19,
      isMain: false,
    },
  });
  console.log('✓ Đã tạo 3 điểm trường (Điểm chính: 44 lớp/2.137 HS, Phân hiệu 1: 59 lớp/2.688 HS, Phân hiệu 2: 19 lớp/844 HS)');

  // 3. TẠO 8 TỔ CHỨC / PHÒNG BAN
  const orgBGH = await prisma.orgUnit.create({
    data: { tenantId: tenant1.id,
      schoolId: school.id, name: 'Ban Giám hiệu', code: 'BGH', orderIndex: 1 },
  });
  const orgToanTin = await prisma.orgUnit.create({
    data: { tenantId: tenant1.id,
      schoolId: school.id, name: 'Tổ Toán - Tin học', code: 'TOAN_TIN', orderIndex: 2 },
  });
  const orgVanSuDia = await prisma.orgUnit.create({
    data: { tenantId: tenant1.id,
      schoolId: school.id, name: 'Tổ Ngữ văn - Lịch sử - Địa lý', code: 'VAN_SU_DIA', orderIndex: 3 },
  });
  const orgTiengAnh = await prisma.orgUnit.create({
    data: { tenantId: tenant1.id,
      schoolId: school.id, name: 'Tổ Tiếng Anh', code: 'TIENG_ANH', orderIndex: 4 },
  });
  const orgKHTN = await prisma.orgUnit.create({
    data: { tenantId: tenant1.id,
      schoolId: school.id, name: 'Tổ Khoa học Tự nhiên (Lý - Hóa - Sinh)', code: 'KHTN', orderIndex: 5 },
  });
  const orgTheNhacHoa = await prisma.orgUnit.create({
    data: { tenantId: tenant1.id,
      schoolId: school.id, name: 'Tổ Thể dục - Âm nhạc - Mỹ thuật', code: 'THE_NHAC_HOA', orderIndex: 6 },
  });
  const orgGDCD = await prisma.orgUnit.create({
    data: { tenantId: tenant1.id,
      schoolId: school.id, name: 'Tổ GDCD - Hoạt động trải nghiệm', code: 'GDCD_HDTN', orderIndex: 7 },
  });
  const orgVanPhong = await prisma.orgUnit.create({
    data: { tenantId: tenant1.id,
      schoolId: school.id, name: 'Tổ Văn phòng (Hành chính - Kế toán - Y tế)', code: 'VAN_PHONG', orderIndex: 8 },
  });
  console.log('✓ Đã tạo 8 tổ chuyên môn & văn phòng');

  // 4. TẠO NHÂN SỰ
  // Helper tạo user kèm role
  const createUser = async (
    fullName: string,
    email: string,
    phone: string,
    title: string,
    role: Role,
    primaryLocId: string,
    primaryOrgId: string,
    scopeLocId?: string,
    scopeOrgId?: string,
    avatarUrl?: string
  ) => {
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash: defaultPasswordHash,
        title,
        tenantId: tenant1.id,
        schoolId: school.id,
        primaryLocationId: primaryLocId,
        primaryOrgUnitId: primaryOrgId,
        avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1F3864&color=fff`,
        roles: {
          create: {
            role,
            roleId: roleMapT1[role]?.id || null,
            scopeLocationId: scopeLocId || null,
            scopeOrgUnitId: scopeOrgId || null,
          },
        },
      },
    });
    return user;
  };

  // 4.1 Ban Giám hiệu
  const uHieuTruong = await createUser(
    'Phạm Thị Nam',
    'hieutruong@phuoctan.edu.vn',
    '0903111222',
    'Hiệu trưởng',
    Role.HIEU_TRUONG,
    locMain.id,
    orgBGH.id
  );

  const uPHTChuyenMon = await createUser(
    'Trần Thị Bích Mai',
    'pht.chuyenmon@phuoctan.edu.vn',
    '0903222333',
    'Phó Hiệu trưởng (Phụ trách Chuyên môn)',
    Role.PHO_HIEU_TRUONG,
    locMain.id,
    orgBGH.id
  );

  const uPHTPhanHieu1 = await createUser(
    'Lê Hoàng Long',
    'pht.ph1@phuoctan.edu.vn',
    '0903333444',
    'Phó Hiệu trưởng (Phụ trách Phân hiệu 1)',
    Role.PHO_HIEU_TRUONG,
    locPh1.id,
    orgBGH.id,
    locPh1.id
  );

  const uPHTPhanHieu2 = await createUser(
    'Phạm Quốc Tuấn',
    'pht.ph2@phuoctan.edu.vn',
    '0903444555',
    'Phó Hiệu trưởng (Phụ trách Phân hiệu 2)',
    Role.PHO_HIEU_TRUONG,
    locPh2.id,
    orgBGH.id,
    locPh2.id
  );

  // 4.2 Quản trị hệ thống (Giáo viên Tin học kiêm Quản trị hệ thống)
  const uAdmin = await createUser(
    'Hoàng Thị Mai Anh',
    'admin@phuoctan.edu.vn',
    '0909999999',
    'Giáo viên Tin học (Kiêm Quản trị hệ thống)',
    Role.ADMIN,
    locMain.id,
    orgToanTin.id
  );

  // 4.3 Tổ trưởng chuyên môn
  const uTTToanTin = await createUser(
    'Vũ Đình Dũng',
    'dung.toantin@phuoctan.edu.vn',
    '0912111001',
    'Tổ trưởng Toán - Tin',
    Role.TO_TRUONG,
    locMain.id,
    orgToanTin.id,
    undefined,
    orgToanTin.id
  );

  const uTTVanSuDia = await createUser(
    'Nguyễn Thị Thu Hà',
    'ha.vansudia@phuoctan.edu.vn',
    '0912111002',
    'Tổ trưởng Văn - Sử - Địa',
    Role.TO_TRUONG,
    locMain.id,
    orgVanSuDia.id,
    undefined,
    orgVanSuDia.id
  );

  const uTTTiengAnh = await createUser(
    'Đỗ Mai Hương',
    'huong.tienganh@phuoctan.edu.vn',
    '0912111003',
    'Tổ trưởng Tiếng Anh',
    Role.TO_TRUONG,
    locPh1.id,
    orgTiengAnh.id,
    undefined,
    orgTiengAnh.id
  );

  const uTTKHTN = await createUser(
    'Hoàng Trọng Nghĩa',
    'nghia.khtn@phuoctan.edu.vn',
    '0912111004',
    'Tổ trưởng KHTN (Lý - Hóa - Sinh)',
    Role.TO_TRUONG,
    locPh2.id,
    orgKHTN.id,
    undefined,
    orgKHTN.id
  );

  const uTTTheNhacHoa = await createUser(
    'Đặng Văn Hùng',
    'hung.thenhachoa@phuoctan.edu.vn',
    '0912111005',
    'Tổ trưởng Thể-Nhạc-Họa',
    Role.TO_TRUONG,
    locMain.id,
    orgTheNhacHoa.id,
    undefined,
    orgTheNhacHoa.id
  );

  const uTTGDCD = await createUser(
    'Phan Thanh Trúc',
    'truc.gdcd@phuoctan.edu.vn',
    '0912111006',
    'Tổ trưởng GDCD - HĐTN',
    Role.TO_TRUONG,
    locPh1.id,
    orgGDCD.id,
    undefined,
    orgGDCD.id
  );

  const uTTVanPhong = await createUser(
    'Lâm Tuyết Mai',
    'mai.vanphong@phuoctan.edu.vn',
    '0912111007',
    'Tổ trưởng Văn phòng - Kế toán trưởng',
    Role.TO_TRUONG,
    locMain.id,
    orgVanPhong.id,
    undefined,
    orgVanPhong.id
  );

  // 4.4 Danh sách Giáo viên & Nhân viên tại 3 điểm trường
  const teachersData = [
    // Điểm chính
    { name: 'Nguyễn Văn Bình', email: 'binh.nv@phuoctan.edu.vn', phone: '0913101001', title: 'Giáo viên Toán', loc: locMain.id, org: orgToanTin.id },
    { name: 'Trần Minh Đức', email: 'duc.tm@phuoctan.edu.vn', phone: '0913101002', title: 'Giáo viên Tin học', loc: locMain.id, org: orgToanTin.id },
    { name: 'Lê Thị Cẩm Tú', email: 'tu.ltc@phuoctan.edu.vn', phone: '0913101003', title: 'Giáo viên Ngữ văn', loc: locMain.id, org: orgVanSuDia.id },
    { name: 'Phạm Thị Mỹ Linh', email: 'linh.ptm@phuoctan.edu.vn', phone: '0913101004', title: 'Giáo viên Lịch sử', loc: locMain.id, org: orgVanSuDia.id },
    { name: 'Hoàng Quốc Việt', email: 'viet.hq@phuoctan.edu.vn', phone: '0913101005', title: 'Giáo viên Tiếng Anh', loc: locMain.id, org: orgTiengAnh.id },
    { name: 'Vũ Thị Thanh Tâm', email: 'tam.vtt@phuoctan.edu.vn', phone: '0913101006', title: 'Giáo viên Vật lý', loc: locMain.id, org: orgKHTN.id },
    { name: 'Đặng Minh Quân', email: 'quan.dm@phuoctan.edu.vn', phone: '0913101007', title: 'Giáo viên Hóa học', loc: locMain.id, org: orgKHTN.id },
    { name: 'Trịnh Hoài Nam', email: 'nam.th@phuoctan.edu.vn', phone: '0913101008', title: 'Giáo viên Thể dục', loc: locMain.id, org: orgTheNhacHoa.id },
    { name: 'Nguyễn Thị Kim Loan', email: 'loan.ntk@phuoctan.edu.vn', phone: '0913101009', title: 'Cán bộ Văn thư - Lưu trữ', loc: locMain.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },
    { name: 'Phan Văn Hậu', email: 'hau.pv@phuoctan.edu.vn', phone: '0913101010', title: 'Cán bộ Thiết bị - Thư viện', loc: locMain.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },

    // Phân hiệu 1
    { name: 'Bùi Thị Hồng Nhung', email: 'nhung.bth@phuoctan.edu.vn', phone: '0914202001', title: 'Giáo viên Toán', loc: locPh1.id, org: orgToanTin.id },
    { name: 'Võ Minh Trí', email: 'tri.vm@phuoctan.edu.vn', phone: '0914202002', title: 'Giáo viên Tin học', loc: locPh1.id, org: orgToanTin.id },
    { name: 'Đoàn Kim Oanh', email: 'oanh.dk@phuoctan.edu.vn', phone: '0914202003', title: 'Giáo viên Ngữ văn', loc: locPh1.id, org: orgVanSuDia.id },
    { name: 'Lý Quốc Bảo', email: 'bao.lq@phuoctan.edu.vn', phone: '0914202004', title: 'Giáo viên Địa lý', loc: locPh1.id, org: orgVanSuDia.id },
    { name: 'Ngô Thanh Thảo', email: 'thao.nt@phuoctan.edu.vn', phone: '0914202005', title: 'Giáo viên Tiếng Anh', loc: locPh1.id, org: orgTiengAnh.id },
    { name: 'Dương Văn Phát', email: 'phat.dv@phuoctan.edu.vn', phone: '0914202006', title: 'Giáo viên Sinh học', loc: locPh1.id, org: orgKHTN.id },
    { name: 'Lê Minh Khang', email: 'khang.lm@phuoctan.edu.vn', phone: '0914202007', title: 'Giáo viên Âm nhạc', loc: locPh1.id, org: orgTheNhacHoa.id },
    { name: 'Nguyễn Thị Ngọc Ánh', email: 'anh.ntn@phuoctan.edu.vn', phone: '0914202008', title: 'Giáo viên GDCD', loc: locPh1.id, org: orgGDCD.id },
    { name: 'Trần Văn Kiên', email: 'kien.tv@phuoctan.edu.vn', phone: '0914202009', title: 'Cán bộ Y tế học đường', loc: locPh1.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },
    { name: 'Hồ Văn Lộc', email: 'loc.hv@phuoctan.edu.vn', phone: '0914202010', title: 'Nhân viên Bảo vệ - CSVC', loc: locPh1.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },

    // Phân hiệu 2
    { name: 'Lê Hữu Nghĩa', email: 'nghia.lh@phuoctan.edu.vn', phone: '0915303001', title: 'Giáo viên Toán', loc: locPh2.id, org: orgToanTin.id },
    { name: 'Phạm Thị Thúy Hằng', email: 'hang.ptt@phuoctan.edu.vn', phone: '0915303002', title: 'Giáo viên Ngữ văn', loc: locPh2.id, org: orgVanSuDia.id },
    { name: 'Nguyễn Hải Đăng', email: 'dang.nh@phuoctan.edu.vn', phone: '0915303003', title: 'Giáo viên Lịch sử', loc: locPh2.id, org: orgVanSuDia.id },
    { name: 'Vũ Ngọc Lan', email: 'lan.vn@phuoctan.edu.vn', phone: '0915303004', title: 'Giáo viên Tiếng Anh', loc: locPh2.id, org: orgTiengAnh.id },
    { name: 'Tô Văn Hải', email: 'hai.tv@phuoctan.edu.vn', phone: '0915303005', title: 'Giáo viên Vật lý', loc: locPh2.id, org: orgKHTN.id },
    { name: 'Mai Thị Quỳnh Như', email: 'nhu.mtq@phuoctan.edu.vn', phone: '0915303006', title: 'Giáo viên Mỹ thuật', loc: locPh2.id, org: orgTheNhacHoa.id },
    { name: 'Bùi Đức Trọng', email: 'trong.bd@phuoctan.edu.vn', phone: '0915303007', title: 'Giáo viên Thể dục', loc: locPh2.id, org: orgTheNhacHoa.id },
    { name: 'Chu Thị Bích Vân', email: 'van.ctb@phuoctan.edu.vn', phone: '0915303008', title: 'Giáo viên HĐTN', loc: locPh2.id, org: orgGDCD.id },
    { name: 'Đỗ Thị Minh Châu', email: 'chau.dtm@phuoctan.edu.vn', phone: '0915303009', title: 'Thủ quỹ - Kế toán viên', loc: locPh2.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },
    { name: 'Trần Quốc Bảo', email: 'bao.tq@phuoctan.edu.vn', phone: '0915303010', title: 'Nhân viên Bảo vệ - CSVC', loc: locPh2.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },
  ];

  const createdTeachers: any[] = [];
  for (const t of teachersData) {
    const user = await createUser(
      t.name,
      t.email,
      t.phone,
      t.title,
      t.role || Role.GIAO_VIEN,
      t.loc,
      t.org
    );
    createdTeachers.push(user);
  }
  console.log(`✓ Đã tạo tổng cộng 42 cán bộ, giáo viên, nhân viên với đầy đủ SĐT và điểm trường`);

  // 5. TẠO KẾ HOẠCH NHIỀU CẤP (Năm -> Học kỳ -> Tháng)
  const planYear = await prisma.plan.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: 'Kế hoạch Chiến lược & Hoạt động Năm học 2026 - 2027',
      description: 'Kế hoạch tổng thể vận hành trường TH và THCS Phước Tân sau sáp nhập 3 điểm trường',
      level: PlanLevel.NAM,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-05-31'),
      progressPercent: 35,
      createdById: uHieuTruong.id,
    },
  });

  const planTerm1 = await prisma.plan.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: 'Kế hoạch Học kỳ I (Năm học 2026 - 2027)',
      description: 'Trọng tâm ổn định bộ máy, chuẩn hóa cơ sở vật chất và đổi mới phương pháp giảng dạy',
      level: PlanLevel.HOC_KY,
      parentPlanId: planYear.id,
      startDate: new Date('2026-08-15'),
      endDate: new Date('2027-01-15'),
      progressPercent: 48,
      createdById: uPHTChuyenMon.id,
    },
  });

  const p1 = await prisma.plan.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: '1. Ổn định tổ chức bộ máy và nhân sự sau sáp nhập 3 điểm trường',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-08-15'),
      endDate: new Date('2026-09-15'),
      progressPercent: 90,
      createdById: uHieuTruong.id,
    },
  });

  const p2 = await prisma.plan.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: '2. Hoàn thiện và công khai Kế hoạch giáo dục nhà trường',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-08-20'),
      endDate: new Date('2026-09-20'),
      progressPercent: 75,
      createdById: uPHTChuyenMon.id,
    },
  });

  const p3 = await prisma.plan.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: '3. Trình UBND & Phòng GD&ĐT phê duyệt Đề án vị trí việc làm',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
      progressPercent: 40,
      createdById: uHieuTruong.id,
    },
  });

  const p4 = await prisma.plan.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: '4. Rà soát, phân loại học sinh khó khăn cần hỗ trợ tại 3 điểm trường',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-08-25'),
      endDate: new Date('2026-09-25'),
      progressPercent: 65,
      createdById: uPHTPhanHieu1.id,
    },
  });

  const p5 = await prisma.plan.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: '5. Tổ chức Hội nghị Cán bộ, Viên chức, Người lao động đầu năm',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-09-10'),
      endDate: new Date('2026-10-10'),
      progressPercent: 15,
      createdById: uHieuTruong.id,
    },
  });

  console.log('✓ Đã tạo Kế hoạch năm học 2026-2027 và các kế hoạch con chi tiết');

  // 6. TẠO 16 CÔNG VIỆC Ở NHIỀU TRẠNG THÁI VÀ GÁN RACI
  // Helper tạo Task + RACI + TaskLog
  const createTaskItem = async (data: {
    code: string;
    title: string;
    description: string;
    planId: string;
    locationId: string;
    orgUnitId: string;
    priority: TaskPriority;
    status: TaskStatus;
    progressPercent: number;
    startDate: Date;
    dueDate: Date;
    completedAt?: Date;
    createdById: string;
    chuTriId: string;
    phoiHopIds?: string[];
    kiemTraId?: string;
    pheDuyetId?: string;
    theoDoiIds?: string[];
    logNote?: string;
  }) => {
    const task = await prisma.task.create({
      data: {
        tenantId: tenant1.id,
      schoolId: school.id,
        code: data.code,
        title: data.title,
        description: data.description,
        planId: data.planId,
        locationId: data.locationId,
        orgUnitId: data.orgUnitId,
        priority: data.priority,
        status: data.status,
        progressPercent: data.progressPercent,
        startDate: data.startDate,
        dueDate: data.dueDate,
        completedAt: data.completedAt,
        createdById: data.createdById,
        assignments: {
          create: [
            { tenantId: tenant1.id, userId: data.chuTriId, role: TaskAssignmentRole.CHU_TRI, note: 'Chịu trách nhiệm chính' },
            ...(data.phoiHopIds || []).map((uid) => ({
              tenantId: tenant1.id,
              userId: uid,
              role: TaskAssignmentRole.PHOI_HOP,
              note: 'Đầu mối phối hợp',
            })),
            ...(data.kiemTraId ? [{ tenantId: tenant1.id, userId: data.kiemTraId, role: TaskAssignmentRole.KIEM_TRA, note: 'Kiểm tra chất lượng' }] : []),
            ...(data.pheDuyetId ? [{ tenantId: tenant1.id, userId: data.pheDuyetId, role: TaskAssignmentRole.PHE_DUYET, note: 'Ban Giám hiệu phê duyệt' }] : []),
            ...(data.theoDoiIds || []).map((uid) => ({
              tenantId: tenant1.id,
              userId: uid,
              role: TaskAssignmentRole.THEO_DOI,
              note: 'Theo dõi tiến độ',
            })),
          ],
        },
        logs: {
          create: [
            {
              tenantId: tenant1.id,
              userId: data.createdById,
              action: 'TAO_MOI',
              newStatus: data.status,
              newProgress: data.progressPercent,
              note: data.logNote || 'Tạo mới nhiệm vụ và giao phân công RACI',
            },
          ],
        },
      },
    });
    return task;
  };

  // 1. NHAP
  await createTaskItem({
    code: 'CV-001',
    title: 'Bản thảo Đề xuất cải tạo hệ thống thoát nước mùa mưa tại Phân hiệu 2',
    description: 'Khảo sát hiện trạng ngập cục bộ tại sân sau Phân hiệu 2 và đề xuất đơn vị thi công',
    planId: p1.id,
    locationId: locPh2.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.NHAP,
    progressPercent: 10,
    startDate: new Date('2026-09-08'),
    dueDate: new Date('2026-09-20'),
    createdById: uPHTPhanHieu2.id,
    chuTriId: createdTeachers[29].id, // Trần Quốc Bảo - CSVC
    phoiHopIds: [createdTeachers[28].id],
  });

  // 2. DA_GIAO
  await createTaskItem({
    code: 'CV-002',
    title: 'Rà soát trang thiết bị phòng thí nghiệm KHTN tại Phân hiệu 1',
    description: 'Kiểm tra số lượng ống nghiệm, hóa chất, kính hiển vi để phân bổ bổ sung từ Điểm chính',
    planId: p1.id,
    locationId: locPh1.id,
    orgUnitId: orgKHTN.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DA_GIAO,
    progressPercent: 0,
    startDate: new Date('2026-09-05'),
    dueDate: new Date('2026-09-18'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTKHTN.id,
    phoiHopIds: [createdTeachers[15].id], // Dương Văn Phát
    kiemTraId: uPHTPhanHieu1.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 3. DA_TIEP_NHAN
  await createTaskItem({
    code: 'CV-003',
    title: 'Thống kê tình trạng phòng máy tính tại cả 3 điểm trường',
    description: 'Ghi nhận số lượng máy còn hoạt động, máy hỏng cần thay linh kiện trước tuần học chính thức',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgToanTin.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DA_TIEP_NHAN,
    progressPercent: 20,
    startDate: new Date('2026-09-02'),
    dueDate: new Date('2026-09-12'),
    createdById: uAdmin.id,
    chuTriId: uTTToanTin.id,
    phoiHopIds: [createdTeachers[1].id, createdTeachers[11].id], // GV Tin học 2 điểm
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 4. DANG_THUC_HIEN (Đang làm - Đúng tiến độ)
  await createTaskItem({
    code: 'CV-004',
    title: 'Tổng hợp danh sách học sinh diện chính sách, hộ nghèo cần hỗ trợ SGK và bảo hiểm',
    description: 'Thu thập danh sách từ GV chủ nhiệm tại 3 điểm trường, rà soát hộ nghèo/cận nghèo để vận động học bổng',
    planId: p4.id,
    locationId: locMain.id,
    orgUnitId: orgGDCD.id,
    priority: TaskPriority.KHAN_CAP,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 60,
    startDate: new Date('2026-08-28'),
    dueDate: new Date('2026-09-15'),
    createdById: uPHTPhanHieu1.id,
    chuTriId: uTTGDCD.id,
    phoiHopIds: [createdTeachers[17].id, createdTeachers[27].id],
    kiemTraId: uPHTPhanHieu1.id,
    pheDuyetId: uHieuTruong.id,
    theoDoiIds: [uTTVanPhong.id],
  });

  // 5. DANG_THUC_HIEN (Xây dựng phân phối chương trình môn Tiếng Anh)
  await createTaskItem({
    code: 'CV-005',
    title: 'Xây dựng kế hoạch dạy học & Phân phối chương trình môn Tiếng Anh khối 6-9',
    description: 'Thống nhất giáo trình và tiến độ bài học đồng bộ giữa Điểm chính, Phân hiệu 1 và Phân hiệu 2',
    planId: p2.id,
    locationId: locPh1.id,
    orgUnitId: orgTiengAnh.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 70,
    startDate: new Date('2026-08-25'),
    dueDate: new Date('2026-09-16'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTTiengAnh.id,
    phoiHopIds: [createdTeachers[4].id, createdTeachers[14].id, createdTeachers[23].id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 6. CHO_KIEM_TRA (Đang chờ Tổ trưởng/PHT kiểm tra)
  await createTaskItem({
    code: 'CV-006',
    title: 'Dự thảo Báo cáo thực trạng CSVC và đề xuất trang thiết bị dạy học tối thiểu sau sáp nhập',
    description: 'Tổng hợp số liệu bàn ghế, bảng chiếu, quạt, đèn từ 3 điểm trường và lập bảng dự toán',
    planId: p3.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.CHO_KIEM_TRA,
    progressPercent: 90,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-09-10'),
    createdById: uHieuTruong.id,
    chuTriId: uTTVanPhong.id,
    phoiHopIds: [createdTeachers[8].id, createdTeachers[19].id],
    kiemTraId: uPHTPhanHieu1.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Đã nộp bản dự thảo kèm bảng Excel dự toán kinh phí cho Phó Hiệu trưởng kiểm tra',
  });

  // 7. CHO_KIEM_TRA (Lập thời khóa biểu tuần 2)
  await createTaskItem({
    code: 'CV-007',
    title: 'Lập và điều chỉnh Thời khóa biểu chính khóa áp dụng từ tuần thứ 2',
    description: 'Cân đối giáo viên dạy liên trường / chạy điểm giữa Điểm chính và Phân hiệu 1, 2',
    planId: p2.id,
    locationId: locMain.id,
    orgUnitId: orgToanTin.id,
    priority: TaskPriority.KHAN_CAP,
    status: TaskStatus.CHO_KIEM_TRA,
    progressPercent: 95,
    startDate: new Date('2026-09-01'),
    dueDate: new Date('2026-09-11'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTToanTin.id,
    phoiHopIds: [createdTeachers[0].id, createdTeachers[10].id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 8. BO_SUNG (Cần bổ sung / Bị trả lại)
  await createTaskItem({
    code: 'CV-008',
    title: 'Kế hoạch tổ chức Tuần sinh hoạt tập thể đầu năm học tại 3 điểm trường',
    description: 'Xây dựng chuỗi hoạt động ngoại khóa, nội quy trường lớp và phòng chống tai nạn thương tích',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgGDCD.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.BO_SUNG,
    progressPercent: 50,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-09-14'),
    createdById: uPHTPhanHieu1.id,
    chuTriId: uTTGDCD.id,
    phoiHopIds: [uTTTheNhacHoa.id, createdTeachers[7].id],
    kiemTraId: uPHTPhanHieu1.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Bị trả lại: Yêu cầu bổ sung phương án đưa đón giáo viên hỗ trợ và phân luồng phụ huynh tại Phân hiệu 2',
  });

  // 9. HOAN_THANH (Đã hoàn thành - Chờ BGH nghiệm thu đóng)
  await createTaskItem({
    code: 'CV-009',
    title: 'Bàn giao và tập trung hồ sơ học bạ, sổ điểm của 3 trường về văn thư Điểm chính',
    description: 'Niêm phong và số hóa hồ sơ học sinh các khối 6, 7, 8, 9 phục vụ tra cứu tập trung',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.HOAN_THANH,
    progressPercent: 100,
    startDate: new Date('2026-08-15'),
    dueDate: new Date('2026-09-05'),
    completedAt: new Date('2026-09-04'),
    createdById: uHieuTruong.id,
    chuTriId: createdTeachers[8].id, // Nguyễn Thị Kim Loan - Văn thư
    phoiHopIds: [createdTeachers[18].id, createdTeachers[28].id],
    kiemTraId: uTTVanPhong.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Đã hoàn tất bàn giao 1.450 bộ học bạ về kho lưu trữ Điểm chính có biên bản ký nhận đầy đủ',
  });

  // 10. XAC_NHAN
  await createTaskItem({
    code: 'CV-010',
    title: 'Kiểm kê tài sản bàn ghế, phòng học trước ngày tựu trường',
    description: 'Hoàn thành niêm yết danh mục tài sản từng phòng học và bàn giao chìa khóa cho GV chủ nhiệm',
    planId: p1.id,
    locationId: locPh1.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.XAC_NHAN,
    progressPercent: 100,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-08-30'),
    completedAt: new Date('2026-08-29'),
    createdById: uPHTPhanHieu1.id,
    chuTriId: createdTeachers[19].id, // Hồ Văn Lộc - Bảo vệ/CSVC
    phoiHopIds: [createdTeachers[9].id],
    kiemTraId: uTTVanPhong.id,
    pheDuyetId: uPHTPhanHieu1.id,
  });

  // 11. DONG (Đã đóng / Kết thúc chu trình)
  await createTaskItem({
    code: 'CV-011',
    title: 'Tổ chức Lễ Khai giảng năm học mới 2026-2027 đồng loạt tại 3 điểm trường',
    description: 'Tổ chức trang trọng, ngắn gọn, đảm bảo 100% học sinh 3 điểm trường được dự lễ an toàn',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgGDCD.id,
    priority: TaskPriority.KHAN_CAP,
    status: TaskStatus.DONG,
    progressPercent: 100,
    startDate: new Date('2026-08-28'),
    dueDate: new Date('2026-09-05'),
    completedAt: new Date('2026-09-05'),
    createdById: uHieuTruong.id,
    chuTriId: uTTGDCD.id,
    phoiHopIds: [uTTTheNhacHoa.id, uTTVanPhong.id, uTTToanTin.id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Lễ khai giảng diễn ra thành công tốt đẹp tại cả 3 điểm trường, có đại diện lãnh đạo địa phương tham dự',
  });

  // 12. TAM_DUNG
  await createTaskItem({
    code: 'CV-012',
    title: 'Khảo sát phương án mở rộng nhà ăn bán trú tại Phân hiệu 2',
    description: 'Khảo sát nhu cầu phụ huynh và diện tích mặt bằng phía đông Phân hiệu 2',
    planId: p3.id,
    locationId: locPh2.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.THAP,
    status: TaskStatus.TAM_DUNG,
    progressPercent: 30,
    startDate: new Date('2026-08-25'),
    dueDate: new Date('2026-09-25'),
    createdById: uPHTPhanHieu2.id,
    chuTriId: createdTeachers[29].id, // CSVC Phân hiệu 2
    kiemTraId: uPHTPhanHieu2.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Tạm dừng theo chỉ đạo của Hiệu trưởng để chờ văn bản hướng dẫn ngân sách của UBND Thành phố',
  });

  // 13. HUY
  await createTaskItem({
    code: 'CV-013',
    title: 'In ấn sổ theo dõi điểm cá nhân và sổ chủ nhiệm bằng giấy mẫu cũ',
    description: 'Chuyển đổi hoàn toàn sang hệ thống quản lý điểm điện tử, hủy việc in sổ giấy truyền thống',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.THAP,
    status: TaskStatus.HUY,
    progressPercent: 0,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-08-28'),
    createdById: uPHTChuyenMon.id,
    chuTriId: createdTeachers[8].id,
    kiemTraId: uTTVanPhong.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Hủy nhiệm vụ: Ban Giám hiệu quyết định chuyển 100% sang học bạ và sổ điểm điện tử',
  });

  // 14. DANG_THUC_HIEN (Quá hạn 1: Thu thập thông tin BHYT học sinh)
  await createTaskItem({
    code: 'CV-014',
    title: 'Thu thập thông tin mã định danh và thẻ BHYT học sinh đầu năm học',
    description: 'Nhập liệu danh sách BHYT học sinh khối 6 mới vào trường gửi Bảo hiểm xã hội thành phố',
    planId: p4.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 45,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-09-03'), // Quá hạn
    createdById: uTTVanPhong.id,
    chuTriId: createdTeachers[18].id, // Trần Văn Kiên - Y tế
    phoiHopIds: [createdTeachers[8].id, createdTeachers[28].id],
    kiemTraId: uTTVanPhong.id,
    pheDuyetId: uPHTPhanHieu1.id,
    logNote: 'Tiến độ bị chậm do một số phụ huynh chưa cung cấp mã định danh cá nhân',
  });

  // 15. CHO_KIEM_TRA (Quá hạn 2: Dự toán kinh phí Công đoàn)
  await createTaskItem({
    code: 'CV-015',
    title: 'Dự toán kinh phí hoạt động Công đoàn và thăm hỏi đầu năm học 2026 - 2027',
    description: 'Lập quỹ phúc lợi và danh sách đoàn viên công đoàn có hoàn cảnh khó khăn sau sáp nhập',
    planId: p5.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.CHO_KIEM_TRA,
    progressPercent: 85,
    startDate: new Date('2026-08-15'),
    dueDate: new Date('2026-09-02'), // Quá hạn
    createdById: uHieuTruong.id,
    chuTriId: uTTVanPhong.id,
    phoiHopIds: [createdTeachers[28].id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Đã hoàn thành bảng dự toán, gửi PHT kiểm tra từ ngày 01/09',
  });

  // 16. DANG_THUC_HIEN (Hội nghị viên chức)
  await createTaskItem({
    code: 'CV-016',
    title: 'Chuẩn bị tài liệu & Tham luận cho Hội nghị Cán bộ, Viên chức năm học mới',
    description: 'Các tổ chuyên môn chuẩn bị bài tham luận về nâng cao chất lượng dạy học phân hiệu xa',
    planId: p5.id,
    locationId: locMain.id,
    orgUnitId: orgVanSuDia.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 35,
    startDate: new Date('2026-09-05'),
    dueDate: new Date('2026-09-25'),
    createdById: uHieuTruong.id,
    chuTriId: uTTVanSuDia.id,
    phoiHopIds: [uTTToanTin.id, uTTTiengAnh.id, uTTKHTN.id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 17. CV-017: Ma trận đề kiểm tra Toán
  await createTaskItem({
    code: 'CV-017',
    title: 'Xây dựng ma trận & đề kiểm tra giữa kỳ I môn Toán Khối 6-9 dùng chung toàn trường',
    description: 'Thống nhất 1 ma trận, 1 chuẩn đề và hướng dẫn chấm cho cả 3 điểm trường (122 lớp)',
    planId: p2.id,
    locationId: locPh1.id,
    orgUnitId: orgToanTin.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.CHO_KIEM_TRA,
    progressPercent: 90,
    startDate: new Date('2026-09-01'),
    dueDate: new Date('2026-09-15'),
    createdById: uHieuTruong.id,
    chuTriId: createdTeachers[10].id, // Bùi Thị Hồng Nhung
    phoiHopIds: [createdTeachers[0].id, createdTeachers[20].id],
    kiemTraId: uTTToanTin.id,
    pheDuyetId: uPHTChuyenMon.id,
  });

  // 18. CV-018: Bồi dưỡng HS năng khiếu Toán
  await createTaskItem({
    code: 'CV-018',
    title: 'Bồi dưỡng học sinh năng khiếu Toán Khối 8 chuẩn bị thi chọn đội tuyển cấp trường',
    description: 'Lập danh sách 25 học sinh xuất sắc 3 cơ sở và biên soạn chuyên đề hình học nâng cao',
    planId: p2.id,
    locationId: locPh1.id,
    orgUnitId: orgToanTin.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 60,
    startDate: new Date('2026-09-02'),
    dueDate: new Date('2026-09-22'),
    createdById: uTTToanTin.id,
    chuTriId: createdTeachers[10].id, // Bùi Thị Hồng Nhung
    kiemTraId: uTTToanTin.id,
  });

  // 19. CV-019: Tiếng Anh Cambridge
  await createTaskItem({
    code: 'CV-019',
    title: 'Khảo sát trình độ đầu vào Tiếng Anh chuẩn Cambridge và tăng cường kỹ năng nói cho HS Khối 6',
    description: 'Hoàn tất khảo sát 31 lớp Khối 6 cả 3 cơ sở và xây dựng lộ trình tăng cường phát âm',
    planId: p2.id,
    locationId: locMain.id,
    orgUnitId: orgTiengAnh.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.HOAN_THANH,
    progressPercent: 100,
    completedAt: new Date('2026-09-06'),
    startDate: new Date('2026-08-28'),
    dueDate: new Date('2026-09-06'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTTiengAnh.id,
    kiemTraId: uPHTChuyenMon.id,
  });

  // 20. CV-020: English Speaking Club
  await createTaskItem({
    code: 'CV-020',
    title: 'Thành lập Câu lạc bộ Tiếng Anh (English Speaking Club) sinh hoạt trực tuyến kết nối 3 điểm trường',
    description: 'Tổ chức sinh hoạt chuyên đề Hello New Friends với hơn 150 học sinh 3 điểm trường tham gia',
    planId: p2.id,
    locationId: locPh1.id,
    orgUnitId: orgTiengAnh.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 55,
    startDate: new Date('2026-09-02'),
    dueDate: new Date('2026-09-22'),
    createdById: uTTTiengAnh.id,
    chuTriId: uTTTiengAnh.id,
    phoiHopIds: [createdTeachers[14].id, createdTeachers[23].id],
  });

  // 21. CV-021: Thiết bị KHTN
  await createTaskItem({
    code: 'CV-021',
    title: 'Phân loại và lập danh mục thiết bị hóa chất thực hành môn KHTN (Lý - Hóa - Sinh) 3 điểm trường',
    description: 'Kiểm kê toàn bộ hóa chất, dụng cụ thí nghiệm, tiêu hủy hóa chất hết hạn an toàn',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgKHTN.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.HOAN_THANH,
    progressPercent: 100,
    completedAt: new Date('2026-09-05'),
    startDate: new Date('2026-08-26'),
    dueDate: new Date('2026-09-05'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTKHTN.id,
    kiemTraId: uPHTChuyenMon.id,
  });

  // 22. CV-022: Ngày hội STEM
  await createTaskItem({
    code: 'CV-022',
    title: 'Tổ chức ngày hội STEM và cuộc thi Sáng tạo Khoa học Kỹ thuật thanh thiếu niên cấp trường',
    description: 'Phát động cuộc thi chế tạo mô hình STEM bảo vệ môi trường cho học sinh 3 phân hiệu',
    planId: p2.id,
    locationId: locPh1.id,
    orgUnitId: orgKHTN.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 45,
    startDate: new Date('2026-09-03'),
    dueDate: new Date('2026-09-27'),
    createdById: uTTKHTN.id,
    chuTriId: uTTKHTN.id,
    phoiHopIds: [createdTeachers[5].id, createdTeachers[15].id, createdTeachers[24].id],
  });

  // 23. CV-023: Bán trú PH1
  await createTaskItem({
    code: 'CV-023',
    title: 'Khảo sát nhu cầu học bán trú và lập danh sách đăng ký suất ăn dinh dưỡng Khối 6-7 Phân hiệu 1',
    description: 'Hoàn tất thủ tục hồ sơ 820 học sinh ăn bán trú trưa tại bếp ăn Phân hiệu 1',
    planId: p1.id,
    locationId: locPh1.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.HOAN_THANH,
    progressPercent: 100,
    completedAt: new Date('2026-09-05'),
    startDate: new Date('2026-08-28'),
    dueDate: new Date('2026-09-05'),
    createdById: uPHTPhanHieu1.id,
    chuTriId: uPHTPhanHieu1.id,
  });

  // 24. CV-024: Bàn ghế PH2
  await createTaskItem({
    code: 'CV-024',
    title: 'Tiếp nhận và phân bổ 30 bộ bàn ghế học sinh đạt chuẩn từ Điểm chính sang Phân hiệu 2',
    description: 'Bố trí bổ sung bàn ghế cho 2 phòng học mới sửa chữa phục vụ năm học mới',
    planId: p1.id,
    locationId: locPh2.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.HOAN_THANH,
    progressPercent: 100,
    completedAt: new Date('2026-09-04'),
    startDate: new Date('2026-08-27'),
    dueDate: new Date('2026-09-04'),
    createdById: uPHTPhanHieu2.id,
    chuTriId: uPHTPhanHieu2.id,
  });

  // 25. CV-025: Lọc nước RO PH2
  await createTaskItem({
    code: 'CV-025',
    title: 'Lắp đặt bổ sung hệ thống lọc nước sạch học đường và bình chữa cháy tại Phân hiệu 2',
    description: 'Nghiệm thu 04 bồn lọc nước RO và 12 bình chữa cháy bột trang bị cho các dãy phòng học Phân hiệu 2',
    planId: p1.id,
    locationId: locPh2.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.HOAN_THANH,
    progressPercent: 100,
    completedAt: new Date('2026-09-05'),
    startDate: new Date('2026-08-25'),
    dueDate: new Date('2026-09-05'),
    createdById: uHieuTruong.id,
    chuTriId: uPHTPhanHieu2.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 26. CV-026: Khám sức khỏe PH2
  await createTaskItem({
    code: 'CV-026',
    title: 'Tổ chức khám sức khỏe định kỳ và phân loại thể lực cho 844 học sinh Phân hiệu 2',
    description: 'Phối hợp Trạm Y tế Phường Phước Tân khám mắt, nha học đường và thể lực',
    planId: p1.id,
    locationId: locPh2.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.DA_GIAO,
    progressPercent: 20,
    startDate: new Date('2026-09-08'),
    dueDate: new Date('2026-09-29'),
    createdById: uPHTPhanHieu2.id,
    chuTriId: uPHTPhanHieu2.id,
  });

  // 27. CV-027: Ma trận đề Ngữ văn
  await createTaskItem({
    code: 'CV-027',
    title: 'Thống nhất khung ma trận đề kiểm tra đánh giá định kỳ môn Ngữ văn và Lịch sử - Địa lý Khối 6-9',
    description: 'Chuẩn hóa định dạng đề kiểm tra tự luận kết hợp trắc nghiệm theo Thông tư 22/BGDĐT',
    planId: p2.id,
    locationId: locMain.id,
    orgUnitId: orgVanSuDia.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.HOAN_THANH,
    progressPercent: 100,
    completedAt: new Date('2026-09-07'),
    startDate: new Date('2026-08-27'),
    dueDate: new Date('2026-09-07'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTVanSuDia.id,
    kiemTraId: uPHTChuyenMon.id,
  });

  // 28. CV-028: Hội khỏe Phù Đổng
  await createTaskItem({
    code: 'CV-028',
    title: 'Thành lập các đội tuyển Thể dục thể thao (Bóng đá, Bóng rổ, Cầu lông) chuẩn bị Hội khỏe Phù Đổng',
    description: 'Tổ chức tuyển chọn 60 vận động viên học sinh tiêu biểu từ cả 3 điểm trường và bắt đầu lịch tập huấn',
    planId: p2.id,
    locationId: locMain.id,
    orgUnitId: orgTheNhacHoa.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 55,
    startDate: new Date('2026-09-04'),
    dueDate: new Date('2026-09-26'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTTheNhacHoa.id,
    kiemTraId: uPHTChuyenMon.id,
  });

  // 29. CV-029: Tài chính Quý III
  await createTaskItem({
    code: 'CV-029',
    title: 'Lập dự toán thu chi ngân sách năm học 2026-2027 & Công khai tài chính quý III',
    description: 'Tổng hợp định mức chi tiêu nội bộ sau sáp nhập, phân bổ nguồn kinh phí hoạt động cho 3 điểm trường',
    planId: p3.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.CHO_KIEM_TRA,
    progressPercent: 85,
    startDate: new Date('2026-08-25'),
    dueDate: new Date('2026-09-15'),
    createdById: uHieuTruong.id,
    chuTriId: uTTVanPhong.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 30. CV-030: Bảo dưỡng máy tính PH1
  await createTaskItem({
    code: 'CV-030',
    title: 'Bảo dưỡng định kỳ, vệ sinh quạt tản nhiệt và cài đặt phần mềm học tập phòng Tin học Phân hiệu 1',
    description: 'Hoàn tất cài đặt phần mềm lập trình Scratch và ứng dụng văn phòng trên 42 máy tính phòng thực hành',
    planId: p1.id,
    locationId: locPh1.id,
    orgUnitId: orgToanTin.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.HOAN_THANH,
    progressPercent: 100,
    completedAt: new Date('2026-09-06'),
    startDate: new Date('2026-08-30'),
    dueDate: new Date('2026-09-06'),
    createdById: uTTToanTin.id,
    chuTriId: createdTeachers[11].id, // Võ Minh Trí
  });

  console.log('✓ Đã tạo 30 công việc đa dạng trạng thái (Quá hạn, Chờ kiểm tra, Bổ sung, Hoàn thành, Đóng...)');

  // 7. TẠO MỘT SỐ THÔNG BÁO VÀ BÌNH LUẬN MẪU
  await prisma.notification.createMany({
    data: [
      {
        tenantId: tenant1.id,
        userId: uTTGDCD.id,
        type: NotificationType.CAN_BO_SUNG,
        title: 'Yêu cầu bổ sung nội dung công việc CV-008',
        content: 'Phó Hiệu trưởng Lê Hoàng Long yêu cầu bổ sung phương án đưa đón giáo viên tại Phân hiệu 2.',
        link: '/tasks/CV-008',
      },
      {
        tenantId: tenant1.id,
        userId: uPHTChuyenMon.id,
        type: NotificationType.NHAC_VIEC,
        title: 'Công việc CV-007 đang chờ kiểm tra',
        content: 'Tổ trưởng Toán - Tin Vũ Đình Dũng đã hoàn thành dự thảo Thời khóa biểu tuần 2.',
        link: '/tasks/CV-007',
      },
      {
        tenantId: tenant1.id,
        userId: createdTeachers[18].id,
        type: NotificationType.HET_HAN,
        title: 'Cảnh báo quá hạn: Công việc CV-014',
        content: 'Nhiệm vụ Thu thập thông tin BHYT học sinh đã quá hạn ngày 03/09/2026.',
        link: '/tasks/CV-014',
      },
    ],
  });

  
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

  const roleMapT2 = await seedTenantRolesAndConfig(tenant2.id);
  console.log('✓ Đã cấu hình Roles, Permissions, Categories, KPIs cho Tenant 2');

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
      roles: { create: [{ role: Role.ADMIN, roleId: roleMapT2[Role.ADMIN]?.id }] },
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
      roles: { create: [{ role: Role.HIEU_TRUONG, roleId: roleMapT2[Role.HIEU_TRUONG]?.id }] },
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
      roles: { create: [{ role: Role.TO_TRUONG, roleId: roleMapT2[Role.TO_TRUONG]?.id, scopeOrgUnitId: orgNHTuNhien.id }] },
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
      roles: { create: [{ role: Role.GIAO_VIEN, roleId: roleMapT2[Role.GIAO_VIEN]?.id }] },
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

  // 7. SEED MODULE ĐÁNH GIÁ KPI THEO TRỤC KẾT QUẢ LINH HOẠT (SỞ GD&ĐT TP.HCM)
  console.log('🌱 Seeding Module KPI theo Trục kết quả linh hoạt (9 trục, Quý III/2026)...');

  // 7.1 Seed 9 trục mặc định cho Tenant 1 & Tenant 2
  const defaultAxesData = [
    { code: 'dang', name: 'Xây dựng Đảng', displayOrder: 1, roleScope: 'ALL' as const, requiresSubtype: false, description: 'Công tác phát triển Đảng, học tập chỉ thị, sinh hoạt chính trị tư tưởng' },
    {
      code: 'chuyen_mon',
      name: 'Chuyên môn',
      displayOrder: 2,
      roleScope: 'GV_ONLY' as const,
      requiresSubtype: true,
      subtypeOptions: [
        { code: 'gv_bo_mon', name: 'Giáo viên bộ môn' },
        { code: 'gvcn', name: 'Giáo viên chủ nhiệm (GVCN)' },
      ],
      description: 'Hoạt động giảng dạy bộ môn, công tác chủ nhiệm lớp, dự giờ, hội giảng',
    },
    { code: 'phong_trao', name: 'Phong trào', displayOrder: 3, roleScope: 'ALL' as const, requiresSubtype: false, description: 'Hội thi giáo viên, thi đua ngành, công đoàn, đoàn thanh niên, văn thể mỹ' },
    { code: 'hanh_chinh', name: 'Hành chính', displayOrder: 4, roleScope: 'ALL' as const, requiresSubtype: false, description: 'Văn thư - Lưu trữ, CSVC - Thiết bị, Thư viện, hỗ trợ hành chính văn phòng' },
    { code: 'chuyen_doi_so', name: 'Chuyển đổi số', displayOrder: 5, roleScope: 'ALL' as const, requiresSubtype: false, description: 'Ứng dụng CNTT, quản lý học bạ điện tử, bài giảng số STEM, website nhà trường' },
    { code: 'antt', name: 'ANTT', displayOrder: 6, roleScope: 'ALL' as const, requiresSubtype: false, description: 'An ninh trật tự trường học, cổng trường an toàn giao thông, PCCC, bảo vệ' },
    { code: 'y_te', name: 'Y tế', displayOrder: 7, roleScope: 'ALL' as const, requiresSubtype: false, description: 'Y tế học đường, khám sức khỏe định kỳ, phòng dịch, an toàn thực phẩm' },
    { code: 'kttc', name: 'KTTC (Kế toán tài chính)', displayOrder: 8, roleScope: 'RESTRICTED' as const, restrictedPositionCodes: ['ke_toan', 'thu_quy'], requiresSubtype: false, description: 'Công tác tài chính ngân sách, chế độ tiền lương, kiểm toán nội bộ (RESTRICTED)' },
    { code: 'khac', name: 'Khác', displayOrder: 9, roleScope: 'ALL' as const, requiresSubtype: false, warnOveruseThresholdPct: 20.0, description: 'Nhiệm vụ đột xuất ngoài 8 trục chính trên' },
  ];

  const axisMapT1: Record<string, any> = {};
  for (const item of defaultAxesData) {
    const axis = await prisma.kpiAxis.create({
      data: {
        tenantId: tenant1.id,
        code: item.code,
        name: item.name,
        description: item.description,
        displayOrder: item.displayOrder,
        roleScope: item.roleScope,
        restrictedPositionCodes: (item.restrictedPositionCodes as any) || undefined,
        requiresSubtype: item.requiresSubtype,
        subtypeOptions: (item.subtypeOptions as any) || undefined,
        warnOveruseThresholdPct: item.warnOveruseThresholdPct || null,
        isActive: true,
      },
    });
    axisMapT1[item.code] = axis;
  }

  // 7.2 Tạo Kỳ đánh giá Quý III/2026
  const periodQ3T1 = await prisma.evaluationPeriod.create({
    data: {
      tenantId: tenant1.id,
      name: 'Quý III/2026',
      code: 'QUY_3_2026',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-09-30'),
      submissionDeadline: new Date('2026-09-25'),
      status: 'open',
      schoolYear: '2026-2027',
      createdById: uHieuTruong.id,
    },
  });
  console.log('✓ Đã tạo Kỳ đánh giá: Quý III/2026 & 9 Trục kết quả linh hoạt');

  // 7.3 Cập nhật vị trí chức danh cho các nhân sự mẫu
  await prisma.user.update({
    where: { id: createdTeachers[0].id }, // Nguyễn Văn Bình (GV Toán)
    data: { positionGroup: 'GV', positionCode: 'gv_bo_mon' },
  });
  await prisma.user.update({
    where: { id: createdTeachers[2].id }, // Lê Thị Cẩm Tú (GV Văn kiêm GVCN)
    data: { positionGroup: 'GV', positionCode: 'gv_bo_mon', isConcurrent: true, secondaryPositionCodes: ['gvcn'] },
  });
  await prisma.user.update({
    where: { id: uTTVanPhong.id }, // Lâm Tuyết Mai (Kế toán trưởng)
    data: { positionGroup: 'NV', positionCode: 'ke_toan' },
  });
  await prisma.user.update({
    where: { id: createdTeachers[28].id }, // Đỗ Thị Minh Châu (Thủ quỹ)
    data: { positionGroup: 'NV', positionCode: 'thu_quy' },
  });
  await prisma.user.update({
    where: { id: createdTeachers[18].id }, // Trần Văn Kiên (Y tế)
    data: { positionGroup: 'NV', positionCode: 'y_te', positionGroup: 'NV' },
  });
  await prisma.user.update({
    where: { id: createdTeachers[29].id }, // Trần Quốc Bảo (Bảo vệ)
    data: { positionGroup: 'NV', positionCode: 'bao_ve' },
  });

  // 7.4 Tạo Tasks phân bổ theo 9 trục cho Giáo viên và Nhân viên
  const gvBinh = createdTeachers[0];
  const gvTu = createdTeachers[2];

  // Task GV 1: GV bộ môn
  const taskGVBinh1 = await prisma.task.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: 'Giảng dạy phân phối chương trình môn Toán 9 (3 lớp) và bồi dưỡng HSG',
      periodId: periodQ3T1.id,
      primaryAxisId: axisMapT1['chuyen_mon'].id,
      taskSubtype: 'gv_bo_mon',
      weightScore: 35,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      evaluationRating: TaskEvaluationRating.XUAT_SAC,
      evidenceFiles: [{ fileName: 'so_diem_toan9.xlsx', fileUrl: '/uploads/demo.xlsx', fileSize: 102400 }],
      startDate: new Date('2026-07-15'),
      dueDate: new Date('2026-09-20'),
      completedAt: new Date('2026-09-18'),
      createdById: gvBinh.id,
      orgUnitId: orgToanTin.id,
      assignments: { create: { tenantId: tenant1.id, userId: gvBinh.id, role: TaskAssignmentRole.CHU_TRI } },
    },
  });

  // Task GV 2: Chuyển đổi số
  const taskGVBinh2 = await prisma.task.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: 'Xây dựng ngân hàng đề kiểm tra trực tuyến trên nền tảng K12Online',
      periodId: periodQ3T1.id,
      primaryAxisId: axisMapT1['chuyen_doi_so'].id,
      weightScore: 25,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      evaluationRating: TaskEvaluationRating.XUAT_SAC,
      evidenceFiles: [{ fileName: 'ngan_hang_de_toan.pdf', fileUrl: '/uploads/demo.pdf', fileSize: 204800 }],
      startDate: new Date('2026-08-01'),
      dueDate: new Date('2026-09-15'),
      completedAt: new Date('2026-09-10'),
      createdById: gvBinh.id,
      orgUnitId: orgToanTin.id,
      assignments: { create: { tenantId: tenant1.id, userId: gvBinh.id, role: TaskAssignmentRole.CHU_TRI } },
    },
  });

  // Task GV 3: Phong trào
  const taskGVBinh3 = await prisma.task.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: 'Huấn luyện đội tuyển cờ vua học sinh tham gia Hội khỏe Phù Đổng cấp trường',
      periodId: periodQ3T1.id,
      primaryAxisId: axisMapT1['phong_trao'].id,
      weightScore: 10,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      evaluationRating: TaskEvaluationRating.TOT,
      startDate: new Date('2026-08-15'),
      dueDate: new Date('2026-09-22'),
      completedAt: new Date('2026-09-20'),
      createdById: gvBinh.id,
      orgUnitId: orgToanTin.id,
      assignments: { create: { tenantId: tenant1.id, userId: gvBinh.id, role: TaskAssignmentRole.CHU_TRI } },
    },
  });

  // Đề xuất thưởng cho GV Bình
  await prisma.kpiBonusProposal.create({
    data: {
      tenantId: tenant1.id,
      taskId: taskGVBinh1.id,
      periodId: periodQ3T1.id,
      proposedById: gvBinh.id,
      reasonType: 'tien_do_vuot',
      reasonDescription: 'Hoàn thành trước hạn và có 2 học sinh đạt giải Nhất giao lưu Toán cấp Thành phố',
      proposedBonusPct: 10,
      calculatedBonusScore: 3.5,
      status: 'approved',
      approvedById: uHieuTruong.id,
      approvedAt: new Date('2026-09-22'),
      reviewNote: 'Đồng ý duyệt thưởng thành tích xuất sắc',
    },
  });

  // Task GV Tú: Vừa dạy bộ môn vừa làm GVCN
  await prisma.task.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: 'Giảng dạy bộ môn Ngữ văn lớp 8A1, 8A2 và phụ đạo học sinh yếu',
      periodId: periodQ3T1.id,
      primaryAxisId: axisMapT1['chuyen_mon'].id,
      taskSubtype: 'gv_bo_mon',
      weightScore: 35,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      evaluationRating: TaskEvaluationRating.TOT,
      createdById: gvTu.id,
      orgUnitId: orgVanSuDia.id,
      assignments: { create: { tenantId: tenant1.id, userId: gvTu.id, role: TaskAssignmentRole.CHU_TRI } },
    },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: 'Công tác chủ nhiệm lớp 8A1: Quản lý sĩ số, nề nếp và họp phụ huynh đầu năm',
      periodId: periodQ3T1.id,
      primaryAxisId: axisMapT1['chuyen_mon'].id,
      taskSubtype: 'gvcn',
      weightScore: 35,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      evaluationRating: TaskEvaluationRating.XUAT_SAC,
      createdById: gvTu.id,
      orgUnitId: orgVanSuDia.id,
      assignments: { create: { tenantId: tenant1.id, userId: gvTu.id, role: TaskAssignmentRole.CHU_TRI } },
    },
  });

  // Task Kế toán: Trục KTTC
  await prisma.task.create({
    data: {
      tenantId: tenant1.id,
      schoolId: school.id,
      title: 'Lập bảng đối chiếu thanh quyết toán ngân sách quý III/2026 và chi trả phụ cấp giáo viên',
      periodId: periodQ3T1.id,
      primaryAxisId: axisMapT1['kttc'].id,
      weightScore: 40,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      evaluationRating: TaskEvaluationRating.XUAT_SAC,
      createdById: uTTVanPhong.id,
      orgUnitId: orgVanPhong.id,
      assignments: { create: { tenantId: tenant1.id, userId: uTTVanPhong.id, role: TaskAssignmentRole.CHU_TRI } },
    },
  });

  // 7.5 Tạo Bản ghi "Giao việc" của Hiệu trưởng (Quản lý bán trú, không tính điểm KPI cá nhân)
  await prisma.taskAssignmentLog.create({
    data: {
      tenantId: tenant1.id,
      periodId: periodQ3T1.id,
      assignedById: uHieuTruong.id,
      assignedToId: uPHTChuyenMon.id,
      title: 'Chỉ đạo và giám sát tổ chức bán trú, tăng cường kỹ năng sống học kỳ 1',
      description: 'Phân công đồng chí Phó Hiệu trưởng kiểm tra an toàn thực phẩm, phân luồng học sinh ăn trưa và quản lý nề nếp bán trú tại 3 điểm trường.',
      relatedAxisId: axisMapT1['kttc'].id,
      assignedDepartment: 'Ban Quản lý Bán trú',
      note: 'Lưu vết phân công trách nhiệm của Ban Giám hiệu (Không gắn vào KPI cá nhân)',
    },
  });

  await prisma.taskAssignmentLog.create({
    data: {
      tenantId: tenant1.id,
      periodId: periodQ3T1.id,
      assignedById: uHieuTruong.id,
      assignedToId: uPHTPhanHieu1.id,
      title: 'Điều hành kế hoạch dạy học 2 buổi/ngày và giữ trẻ ngoài giờ tại Phân hiệu 1',
      description: 'Khảo sát nhu cầu phụ huynh và bố trí giáo viên phụ trách các lớp bán trú chiều',
      relatedAxisId: axisMapT1['kttc'].id,
      assignedDepartment: 'Phân hiệu 1 - Tân Lập',
      note: 'Nhiệm vụ quản lý chung - lưu vết phân công',
    },
  });

  // 7.6 Tạo Trường hợp đặc biệt (Special Case: Nghỉ thai sản dồn kỳ sau)
  const nvYTe = createdTeachers[18];
  await prisma.kpiSpecialCase.create({
    data: {
      tenantId: tenant1.id,
      employeeId: nvYTe.id,
      periodId: periodQ3T1.id,
      caseType: 'sick_maternity_gte_2m',
      resolution: 'carried_to_next_period',
      note: 'Nghỉ chế độ thai sản 6 tháng theo Luật BHXH (từ tháng 06/2026 đến 12/2026). Dồn kết quả sang đánh giá năm học.',
      approvedById: uHieuTruong.id,
    },
  });

  console.log('✓ Đã khởi tạo hoàn chỉnh dữ liệu mẫu cho Module Đánh giá KPI theo Trục kết quả linh hoạt');

  console.log('🎉 Seed dữ liệu mẫu hoàn tất thành công 100%!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
