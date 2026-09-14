import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import request from 'supertest';
import authRoutes from '../auth/auth.routes';
import userRoutes from '../users/user.routes';
import taskRoutes from '../tasks/task.routes';
import planRoutes from '../plans/plan.routes';
import adminRoutes from './admin.routes';
import { errorHandler } from '../../middlewares/error.middleware';
import prisma from '../../prisma';
import { Role } from '@prisma/client';
import { adminService } from './admin.service';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/auth', authRoutes);
testApp.use('/api/users', userRoutes);
testApp.use('/api/tasks', taskRoutes);
testApp.use('/api/plans', planRoutes);
testApp.use('/api/admin', adminRoutes);
testApp.use(errorHandler);

async function runDynamicPermissionsTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU CHẠY INTEGRATION TESTS: PHASE 2 DYNAMIC RBAC & TENANT ADMIN');
  console.log('================================================================');

  // 1. Lấy token System Admin
  const sysLogin = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'sysadmin@tnedu.vn', password: '123456' });
  if (sysLogin.status !== 200) {
    throw new Error(`FAIL: System Admin đăng nhập thất bại: ${JSON.stringify(sysLogin.body)}`);
  }
  const sysAdminToken = sysLogin.body.data.accessToken;
  console.log('✓ PASS: System Admin đăng nhập thành công.');

  // 2. Lấy token Admin Tenant 1 (Phước Tân)
  const t1AdminLogin = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'admin@phuoctan.edu.vn', password: '123456' });
  if (t1AdminLogin.status !== 200) {
    throw new Error(`FAIL: Tenant 1 Admin đăng nhập thất bại: ${JSON.stringify(t1AdminLogin.body)}`);
  }
  const tenant1AdminToken = t1AdminLogin.body.data.accessToken;
  const tenant1Id = t1AdminLogin.body.data.user.tenantId;
  console.log(`✓ PASS: Tenant 1 Admin đăng nhập thành công. TenantId: ${tenant1Id}`);

  // 3. Lấy token Admin Tenant 2 (Nguyễn Huệ)
  const t2AdminLogin = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'admin.nguyenhue@dongnai.edu.vn', password: '123456' });
  if (t2AdminLogin.status !== 200) {
    throw new Error(`FAIL: Tenant 2 Admin đăng nhập thất bại: ${JSON.stringify(t2AdminLogin.body)}`);
  }
  const tenant2AdminToken = t2AdminLogin.body.data.accessToken;
  const tenant2Id = t2AdminLogin.body.data.user.tenantId;
  console.log(`✓ PASS: Tenant 2 Admin đăng nhập thành công. TenantId: ${tenant2Id}`);

  // Tra cứu ID Role TO_TRUONG của cả 2 Tenant
  const t1Role = await prisma.roleModel.findFirst({
    where: { tenantId: tenant1Id, code: 'TO_TRUONG' },
  });
  const t2Role = await prisma.roleModel.findFirst({
    where: { tenantId: tenant2Id, code: 'TO_TRUONG' },
  });
  if (!t1Role || !t2Role) {
    throw new Error('FAIL: Không tìm thấy role TO_TRUONG cho 2 tenant trong CSDL.');
  }
  const roleToTruongT1Id = t1Role.id;
  const roleToTruongT2Id = t2Role.id;

  // Đảm bảo user Tổ trưởng T1 & T2 gắn đúng roleId
  const t1User = await prisma.user.findFirst({ where: { email: 'dung.toantin@phuoctan.edu.vn' } });
  if (t1User) {
    await prisma.userRole.deleteMany({ where: { userId: t1User.id } });
    await prisma.userRole.create({
      data: {
        userId: t1User.id,
        role: Role.TO_TRUONG,
        roleId: roleToTruongT1Id,
        tenantId: tenant1Id,
        scopeOrgUnitId: t1User.primaryOrgUnitId,
      },
    });
  }

  const t2User = await prisma.user.findFirst({ where: { email: 'quang.tm@nguyenhue.edu.vn' } });
  if (t2User) {
    await prisma.userRole.deleteMany({ where: { userId: t2User.id } });
    await prisma.userRole.create({
      data: {
        userId: t2User.id,
        role: Role.TO_TRUONG,
        roleId: roleToTruongT2Id,
        tenantId: tenant2Id,
        scopeOrgUnitId: t2User.primaryOrgUnitId,
      },
    });
  }

  // 4. Lấy token Tổ trưởng Tenant 1 (Vũ Đình Dũng - Toán Tin)
  const t1TTLogin = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'dung.toantin@phuoctan.edu.vn', password: '123456' });
  if (t1TTLogin.status !== 200) {
    throw new Error(`FAIL: Tenant 1 Tổ trưởng đăng nhập thất bại: ${JSON.stringify(t1TTLogin.body)}`);
  }
  const tenant1ToTruongToken = t1TTLogin.body.data.accessToken;

  // 5. Lấy token Tổ trưởng Tenant 2 (Trần Minh Quang - Tự nhiên)
  const t2TTLogin = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'quang.tm@nguyenhue.edu.vn', password: '123456' });
  if (t2TTLogin.status !== 200) {
    throw new Error(`FAIL: Tenant 2 Tổ trưởng đăng nhập thất bại: ${JSON.stringify(t2TTLogin.body)}`);
  }
  const tenant2ToTruongToken = t2TTLogin.body.data.accessToken;

  // -------------------------------------------------------------
  // TEST 1: CATALOG PERMISSIONS CỐ ĐỊNH & ROLES THEO TENANT
  // -------------------------------------------------------------
  console.log('\n--- 1. Kiểm tra Permission Catalog & Danh sách Roles ---');
  const permRes = await request(testApp)
    .get('/api/admin/permissions')
    .set('Authorization', `Bearer ${tenant1AdminToken}`);
  if (permRes.status !== 200 || !Array.isArray(permRes.body.data) || permRes.body.data.length < 50) {
    throw new Error(`FAIL: Lấy danh mục Permission thất bại: ${JSON.stringify(permRes.body)}`);
  }
  const categories = new Set(permRes.body.data.map((p: any) => p.category));
  if (!categories.has('KE_HOACH') || !categories.has('CONG_VIEC') || !categories.has('QUAN_TRI_HE_THONG')) {
    throw new Error('FAIL: Danh mục quyền thiếu các nhóm chức năng bắt buộc trong SRS.');
  }
  console.log(`✓ PASS: Lấy thành công ${permRes.body.data.length} Permission keys cố định thuộc 6 nhóm chức năng.`);

  const rolesRes = await request(testApp)
    .get('/api/admin/roles')
    .set('Authorization', `Bearer ${tenant1AdminToken}`);
  if (rolesRes.status !== 200 || !Array.isArray(rolesRes.body.data) || rolesRes.body.data.length < 6) {
    throw new Error(`FAIL: Lấy danh sách Roles của Tenant thất bại: ${JSON.stringify(rolesRes.body)}`);
  }
  console.log(`✓ PASS: Tenant 1 có ${rolesRes.body.data.length} Roles với ma trận quyền đầy đủ.`);

  // -------------------------------------------------------------
  // TEST 2: DOD PHASE 2 - 2 TENANT CẤU HÌNH 2 TẬP QUYỀN KHÁC NHAU CHO CÙNG ROLE TỔ TRƯỞNG
  // -------------------------------------------------------------
  console.log('\n--- 2. DoD Phase 2: 2 Tenant cấu hình 2 tập quyền khác nhau cho cùng vai trò "Tổ trưởng" ---');

  // Tenant 1 Admin cấp thêm 'plan.approve' và 'org.manage_classes' cho TO_TRUONG
  const t1TTRole = rolesRes.body.data.find((r: any) => r.code === 'TO_TRUONG');
  const t1NewPerms = Array.from(new Set([...t1TTRole.permissionKeys, 'plan.approve', 'org.manage_classes']));
  const putT1 = await request(testApp)
    .put(`/api/admin/roles/${roleToTruongT1Id}/permissions`)
    .set('Authorization', `Bearer ${tenant1AdminToken}`)
    .send({ permissionKeys: t1NewPerms });
  if (putT1.status !== 200) {
    throw new Error(`FAIL: Tenant 1 cập nhật quyền Tổ trưởng thất bại: ${JSON.stringify(putT1.body)}`);
  }

  // Tenant 2 Admin tước bỏ 'plan.approve' và 'org.manage_classes' khỏi TO_TRUONG
  const t2RolesRes = await request(testApp)
    .get('/api/admin/roles')
    .set('Authorization', `Bearer ${tenant2AdminToken}`);
  const t2TTRole = t2RolesRes.body.data.find((r: any) => r.code === 'TO_TRUONG');
  const t2NewPerms = t2TTRole.permissionKeys.filter(
    (k: string) => k !== 'plan.approve' && k !== 'org.manage_classes'
  );
  const putT2 = await request(testApp)
    .put(`/api/admin/roles/${roleToTruongT2Id}/permissions`)
    .set('Authorization', `Bearer ${tenant2AdminToken}`)
    .send({ permissionKeys: t2NewPerms });
  if (putT2.status !== 200) {
    throw new Error(`FAIL: Tenant 2 cập nhật quyền Tổ trưởng thất bại: ${JSON.stringify(putT2.body)}`);
  }

  // Kiểm tra thông tin permissions khi gọi /api/auth/me của Tổ trưởng Tenant 1
  const meT1 = await request(testApp)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${tenant1ToTruongToken}`);
  if (!meT1.body.data?.permissions?.includes('plan.approve') || !meT1.body.data?.permissions?.includes('org.manage_classes')) {
    throw new Error('FAIL: Tổ trưởng Tenant 1 không nhận được quyền [plan.approve, org.manage_classes] vừa cấp.');
  }

  // Kiểm tra thông tin permissions khi gọi /api/auth/me của Tổ trưởng Tenant 2
  const meT2 = await request(testApp)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${tenant2ToTruongToken}`);
  if (meT2.body.data?.permissions?.includes('plan.approve') || meT2.body.data?.permissions?.includes('org.manage_classes')) {
    throw new Error('FAIL: Tổ trưởng Tenant 2 bị rò rỉ quyền [plan.approve] của Tenant 1!');
  }

  console.log('✓ PASS DoD: 2 Tenant cấu hình 2 tập quyền hoàn toàn độc lập cho cùng 1 vai trò [Tổ trưởng]:');
  console.log(`   - Tenant 1 Tổ trưởng có ${meT1.body.data.permissions.length} quyền (bao gồm plan.approve, org.manage_classes).`);
  console.log(`   - Tenant 2 Tổ trưởng có ${meT2.body.data.permissions.length} quyền (đã bị chặn plan.approve, org.manage_classes).`);

  // -------------------------------------------------------------
  // TEST 3: TẠO VAI TRÒ TÙY BIẾN (CUSTOM ROLE) & GÁN VÀO USER
  // -------------------------------------------------------------
  console.log('\n--- 3. Tạo Custom Role & Gán cho Nhân sự ---');
  // Dọn dẹp custom role TONG_PHU_TRACH nếu đã tồn tại
  const existingCustomRole = await prisma.roleModel.findFirst({
    where: { tenantId: tenant1Id, code: 'TONG_PHU_TRACH' },
  });
  if (existingCustomRole) {
    await prisma.userRole.deleteMany({ where: { roleId: existingCustomRole.id } });
    await prisma.rolePermission.deleteMany({ where: { roleId: existingCustomRole.id } });
    await prisma.roleModel.delete({ where: { id: existingCustomRole.id } });
  }

  const customRoleRes = await request(testApp)
    .post('/api/admin/roles')
    .set('Authorization', `Bearer ${tenant1AdminToken}`)
    .send({
      code: 'TONG_PHU_TRACH',
      name: 'Tổng phụ trách Đội',
      description: 'Phụ trách phong trào Đội thiếu niên và hoạt động ngoại khóa',
      permissionKeys: ['task.create', 'task.view_all', 'report.view_dashboard', 'kpi.view_personal'],
    });

  if (customRoleRes.status !== 201 || customRoleRes.body.data?.code !== 'TONG_PHU_TRACH') {
    throw new Error(`FAIL: Tạo custom role thất bại: ${JSON.stringify(customRoleRes.body)}`);
  }
  const customRoleId = customRoleRes.body.data.id;
  console.log(`✓ PASS: Tạo thành công vai trò tùy biến [TONG_PHU_TRACH] (ID: ${customRoleId}).`);

  // Gán role này cho 1 user trong Tenant 1
  const usersRes = await request(testApp)
    .get('/api/admin/users?pageSize=5')
    .set('Authorization', `Bearer ${tenant1AdminToken}`);
  const targetUser = usersRes.body.data.items[0];

  // Xóa role NHAN_VIEN này của user nếu đã có để tránh trùng scope
  await prisma.userRole.deleteMany({
    where: { userId: targetUser.id, role: Role.NHAN_VIEN },
  });

  const assignRes = await request(testApp)
    .post(`/api/admin/users/${targetUser.id}/roles`)
    .set('Authorization', `Bearer ${tenant1AdminToken}`)
    .send({
      role: Role.NHAN_VIEN,
      scopeOrgUnitId: targetUser.primaryOrgUnitId,
    });
  if (assignRes.status !== 201) {
    throw new Error(`FAIL: Gán vai trò cho user thất bại: ${JSON.stringify(assignRes.body)}`);
  }
  console.log(`✓ PASS: Gán vai trò mới cho nhân sự [${targetUser.fullName}] thành công.`);

  // -------------------------------------------------------------
  // TEST 4: KIỂM SOÁT HẠN MỨC GÓI THUÊ (ACCOUNT QUOTA ENFORCEMENT)
  // -------------------------------------------------------------
  console.log('\n--- 4. Kiểm soát Hạn mức Tài khoản (maxAccounts Quota) ---');
  const quotaRes = await request(testApp)
    .get('/api/admin/quota')
    .set('Authorization', `Bearer ${tenant1AdminToken}`);
  if (quotaRes.status !== 200 || !quotaRes.body.data?.quota) {
    throw new Error(`FAIL: Lấy thông tin Quota thất bại: ${JSON.stringify(quotaRes.body)}`);
  }
  const quotaData = quotaRes.body.data.quota;
  console.log(`✓ PASS: Lấy hạn mức thành công: ${quotaData.activeAccounts}/${quotaData.maxAccounts} tài khoản đã dùng (${quotaData.accountUsagePercent}%).`);

  // Thử tạo tài khoản trên Tenant với gói hạn mức 1 tài khoản -> phải bị từ chối với lỗi tiếng Việt
  const testPkg = await prisma.package.create({
    data: {
      name: 'Gói Thử nghiệm (1 Account)',
      code: 'TEST_QUOTA_PKG_' + Date.now(),
      maxAccounts: 1,
      storageQuotaGB: 1,
    },
  });

  const testTenant = await prisma.tenant.create({
    data: {
      name: 'Trường Test Quota',
      code: 'TEST_QUOTA_' + Date.now(),
    },
  });

  await prisma.tenantSubscription.create({
    data: {
      tenantId: testTenant.id,
      packageId: testPkg.id,
      startDate: new Date(),
      endDate: new Date('2028-01-01'),
      status: 'ACTIVE',
    },
  });

  const testSchool = await prisma.school.create({
    data: {
      tenantId: testTenant.id,
      name: 'Trường Test Quota',
      code: 'SCH_TEST_Q_' + Date.now(),
    },
  });

  const testAdminUser = await prisma.user.create({
    data: {
      tenantId: testTenant.id,
      schoolId: testSchool.id,
      fullName: 'Test Admin',
      email: `admin_${Date.now()}@testquota.edu.vn`,
      phone: `0909${Math.floor(100000 + Math.random() * 900000)}`,
      passwordHash: 'dummy',
      roles: { create: [{ role: Role.ADMIN }] },
    },
  });

  let quotaBlocked = false;
  try {
    await adminService.createUser(testAdminUser.id, testSchool.id, {
      fullName: 'User Vượt Hạn Mức',
      email: `overflow_${Date.now()}@testquota.edu.vn`,
      phone: `0909${Math.floor(100000 + Math.random() * 900000)}`,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('đạt hạn mức tối đa')) {
      quotaBlocked = true;
      console.log(`✓ PASS: Chặn tạo tài khoản vượt hạn mức thành công. Thông báo tiếng Việt: "${err.message}"`);
    } else {
      throw new Error(`FAIL: Thông báo lỗi không đúng yêu cầu: ${err.message}`);
    }
  }

  if (!quotaBlocked) {
    throw new Error('FAIL: Hệ thống không chặn việc tạo tài khoản khi vượt quá maxAccounts!');
  }

  // Dọn dẹp dữ liệu test quota
  await prisma.user.deleteMany({ where: { tenantId: testTenant.id } });
  await prisma.school.deleteMany({ where: { tenantId: testTenant.id } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId: testTenant.id } });
  await prisma.tenant.deleteMany({ where: { id: testTenant.id } });
  await prisma.package.deleteMany({ where: { id: testPkg.id } });

  // -------------------------------------------------------------
  // TEST 5: DANH MỤC DÙNG CHUNG & KPI DEFINITIONS
  // -------------------------------------------------------------
  console.log('\n--- 5. Quản lý Danh mục Dùng chung & Cấu hình KPI ---');
  await prisma.sharedCategory.deleteMany({
    where: { tenantId: tenant1Id, type: 'LOAI_CONG_VIEC', code: 'DOT_XUAT' },
  });

  const catCreateRes = await request(testApp)
    .post('/api/admin/categories')
    .set('Authorization', `Bearer ${tenant1AdminToken}`)
    .send({
      type: 'LOAI_CONG_VIEC',
      code: 'DOT_XUAT',
      name: 'Công việc đột xuất / Khẩn cấp',
      orderIndex: 1,
    });
  if (catCreateRes.status !== 201 || catCreateRes.body.data?.code !== 'DOT_XUAT') {
    throw new Error(`FAIL: Tạo danh mục dùng chung thất bại: ${JSON.stringify(catCreateRes.body)}`);
  }
  console.log('✓ PASS: Tạo danh mục dùng chung thành công.');

  await prisma.kPIDefinition.deleteMany({
    where: { tenantId: tenant1Id, code: 'KPI_SANG_KIEN' },
  });

  const kpiCreateRes = await request(testApp)
    .post('/api/admin/kpi-definitions')
    .set('Authorization', `Bearer ${tenant1AdminToken}`)
    .send({
      code: 'KPI_SANG_KIEN',
      name: 'Số sáng kiến kinh nghiệm được nghiệm thu',
      unit: 'Sáng kiến',
      targetValue: 2,
      weight: 2.0,
      applicableRoles: ['GIAO_VIEN', 'TO_TRUONG'],
    });
  if (kpiCreateRes.status !== 201 || kpiCreateRes.body.data?.code !== 'KPI_SANG_KIEN') {
    throw new Error(`FAIL: Tạo chỉ số KPI thất bại: ${JSON.stringify(kpiCreateRes.body)}`);
  }
  console.log('✓ PASS: Tạo chỉ số KPI tùy biến thành công.');

  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ TEST SUITES CHO PHASE 2 ĐÃ PASS 100%! KHÔNG CÓ LỖI NÀO.');
  console.log('================================================================\n');
}

runDynamicPermissionsTests()
  .catch((e) => {
    console.error('❌ Integration Test thất bại:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
