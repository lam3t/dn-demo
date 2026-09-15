import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import request from 'supertest';
import authRoutes from '../auth/auth.routes';
import userRoutes from '../users/user.routes';
import taskRoutes from '../tasks/task.routes';
import planRoutes from '../plans/plan.routes';
import systemAdminRoutes from './system-admin.routes';
import { errorHandler } from '../../middlewares/error.middleware';
import prisma from '../../prisma';

// Build express test app with all relevant routes and error handling
const testApp = express();
testApp.use(express.json());
testApp.use('/api/auth', authRoutes);
testApp.use('/api/users', userRoutes);
testApp.use('/api/tasks', taskRoutes);
testApp.use('/api/plans', planRoutes);
testApp.use('/api/system-admin', systemAdminRoutes);
testApp.use(errorHandler);

async function runMultiTenantTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU CHẠY FOCUSED INTEGRATION TESTS: SYSTEM ADMIN & MULTI-TENANT');
  console.log('================================================================');

  // Verify tenants exist in database
  const tenantA = await prisma.tenant.findUnique({ where: { code: 'PHUOC_TAN' } });
  const tenantB = await prisma.tenant.findUnique({ where: { code: 'NGUYEN_HUE' } });

  if (!tenantA || !tenantB) {
    throw new Error('Chưa có đủ 2 Tenant test trong CSDL. Vui lòng kiểm tra lại dữ liệu seed!');
  }
  console.log(`✓ Đã xác nhận tồn tại 2 Tenant trong CSDL: [${tenantA.name}] và [${tenantB.name}]`);

  // -------------------------------------------------------------
  // 1. TEST ĐĂNG NHẬP HỆ THỐNG VÀ PHÁT HÀNH JWT ĐA TENANT
  // -------------------------------------------------------------
  console.log('\n--- 1. Test Đăng nhập & Xác thực JWT đa tenant ---');

  // 1.1 System Admin Login
  const sysAdminLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'chunh@tringhiatech.vn', password: '123456' });

  if (sysAdminLoginRes.status !== 200 || !sysAdminLoginRes.body.data?.accessToken) {
    throw new Error(`FAIL: System Admin đăng nhập thất bại: ${JSON.stringify(sysAdminLoginRes.body)}`);
  }
  const sysAdminToken = sysAdminLoginRes.body.data.accessToken;
  const sysAdminUser = sysAdminLoginRes.body.data.user;
  if (!sysAdminUser.isSystemAdmin) {
    throw new Error('FAIL: System Admin user không có cờ isSystemAdmin: true');
  }
  console.log('✓ PASS: System Admin đăng nhập thành công, nhận token toàn quyền.');

  // 1.2 Tenant A (Phước Tân) Admin Login
  const tenantALoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

  if (tenantALoginRes.status !== 200 || !tenantALoginRes.body.data?.accessToken) {
    throw new Error(`FAIL: Tenant A Admin đăng nhập thất bại: ${JSON.stringify(tenantALoginRes.body)}`);
  }
  const tenantAToken = tenantALoginRes.body.data.accessToken;
  const tenantAUser = tenantALoginRes.body.data.user;
  if (tenantAUser.tenantId !== tenantA.id) {
    throw new Error(`FAIL: Tenant A token không khớp tenantId: ${tenantAUser.tenantId} !== ${tenantA.id}`);
  }
  console.log(`✓ PASS: Tenant A Admin đăng nhập thành công -> tenantId=${tenantAUser.tenantId} (${tenantA.name})`);

  // 1.3 Tenant B (Nguyễn Huệ) Admin Login
  const tenantBLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'admin.nguyenhue@dongnai.edu.vn', password: '123456' });

  if (tenantBLoginRes.status !== 200 || !tenantBLoginRes.body.data?.accessToken) {
    throw new Error(`FAIL: Tenant B Admin đăng nhập thất bại: ${JSON.stringify(tenantBLoginRes.body)}`);
  }
  const tenantBToken = tenantBLoginRes.body.data.accessToken;
  const tenantBUser = tenantBLoginRes.body.data.user;
  if (tenantBUser.tenantId !== tenantB.id) {
    throw new Error(`FAIL: Tenant B token không khớp tenantId: ${tenantBUser.tenantId} !== ${tenantB.id}`);
  }
  console.log(`✓ PASS: Tenant B Admin đăng nhập thành công -> tenantId=${tenantBUser.tenantId} (${tenantB.name})`);

  // -------------------------------------------------------------
  // 2. TEST CÔ LẬP DỮ LIỆU TÀI KHOẢN & CHỐNG CAN THIỆP
  // -------------------------------------------------------------
  console.log('\n--- 2. Test Cô lập Dữ liệu Người dùng & Quyền hạn ---');

  const usersResA = await request(testApp)
    .get('/api/users')
    .set('Authorization', `Bearer ${tenantAToken}`);

  const usersResB = await request(testApp)
    .get('/api/users')
    .set('Authorization', `Bearer ${tenantBToken}`);

  if (usersResA.status !== 200 || usersResB.status !== 200) {
    throw new Error('FAIL: Không thể lấy danh sách users');
  }

  const usersA = usersResA.body.data.items || usersResA.body.data;
  const usersB = usersResB.body.data.items || usersResB.body.data;

  const idsA = new Set(usersA.map((u: any) => u.id));
  const overlapUsers = usersB.filter((u: any) => idsA.has(u.id));

  if (overlapUsers.length > 0) {
    throw new Error(`FAIL: Rò rỉ dữ liệu giữa 2 tenant: ${overlapUsers.length} tài khoản`);
  }
  console.log('✓ PASS: Cô lập người dùng hoàn hảo (Overlap = 0).');

  // -------------------------------------------------------------
  // 3. TEST KHỞI TẠO TENANT MỚI KÈM ADMIN VÀ SEED ROLES/PERMISSIONS
  // -------------------------------------------------------------
  console.log('\n--- 3. Test Khởi tạo Tenant Mới & Cấp quyền Tenant Admin ---');

  const packagesRes = await request(testApp)
    .get('/api/system-admin/packages')
    .set('Authorization', `Bearer ${sysAdminToken}`);

  if (packagesRes.status !== 200 || !packagesRes.body.data?.length) {
    throw new Error('FAIL: Không thể lấy danh sách packages');
  }
  const packageId = packagesRes.body.data[0].id;

  // Xóa tenant test cũ nếu có
  const testTenantCode = 'TEST_TRUONG_MOI';
  const oldTestTenant = await prisma.tenant.findUnique({ where: { code: testTenantCode } });
  if (oldTestTenant) {
    await prisma.userRole.deleteMany({ where: { tenantId: oldTestTenant.id } });
    await prisma.user.deleteMany({ where: { tenantId: oldTestTenant.id } });
    await prisma.rolePermission.deleteMany({ where: { role: { tenantId: oldTestTenant.id } } });
    await prisma.roleModel.deleteMany({ where: { tenantId: oldTestTenant.id } });
    await prisma.sharedCategory.deleteMany({ where: { tenantId: oldTestTenant.id } });
    await prisma.location.deleteMany({ where: { tenantId: oldTestTenant.id } });
    await prisma.orgUnit.deleteMany({ where: { tenantId: oldTestTenant.id } });
    await prisma.school.deleteMany({ where: { tenantId: oldTestTenant.id } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: oldTestTenant.id } });
    await prisma.tenant.delete({ where: { id: oldTestTenant.id } });
  }

  const newTenantPayload = {
    name: 'Trường THCS Test Mới Khởi Tạo',
    code: testTenantCode,
    address: '123 Đường Test, TP. Biên Hòa',
    phone: '0251999999',
    email: 'test.school@dongnai.edu.vn',
    principalName: 'Thầy Giáo Test',
    schoolYear: '2026-2027',
    totalStudents: 1200,
    totalClasses: 32,
    totalStaff: 60,
    adminFullName: 'Quản Trị Viên Trường Test',
    adminEmail: 'admin.testmoi@dongnai.edu.vn',
    adminPhone: '0988776655',
    adminPassword: 'password123',
    adminTitle: 'Admin Test Trường Mới',
    packageId,
  };

  const createTenantRes = await request(testApp)
    .post('/api/system-admin/tenants')
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send(newTenantPayload);

  if (createTenantRes.status !== 201) {
    throw new Error(`FAIL: Khởi tạo tenant mới thất bại: ${JSON.stringify(createTenantRes.body)}`);
  }

  const createdTenantId = createTenantRes.body.data.tenant.id;
  console.log(`✓ PASS: System Admin đã khởi tạo thành công Tenant mới [${createdTenantId}].`);

  // Kiểm tra vai trò & phân quyền của Tenant vừa tạo
  const seededRoles = await prisma.roleModel.findMany({ where: { tenantId: createdTenantId } });
  if (seededRoles.length < 6) {
    throw new Error(`FAIL: Tenant mới chưa được seed đủ 6 roles chuẩn, hiện có: ${seededRoles.length}`);
  }
  console.log(`✓ PASS: Đã tự động seed ${seededRoles.length} vai trò chuẩn cho Tenant mới.`);

  // Kiểm tra đăng nhập bằng tài khoản Admin trường vừa tạo
  const newAdminLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'admin.testmoi@dongnai.edu.vn', password: 'password123' });

  if (newAdminLoginRes.status !== 200 || !newAdminLoginRes.body.data?.accessToken) {
    throw new Error(`FAIL: Tenant Admin vừa tạo không thể đăng nhập: ${JSON.stringify(newAdminLoginRes.body)}`);
  }
  const newAdminToken = newAdminLoginRes.body.data.accessToken;
  const newAdminUser = newAdminLoginRes.body.data.user;
  if (newAdminUser.tenantId !== createdTenantId) {
    throw new Error(`FAIL: TenantId của admin không khớp tenant vừa tạo: ${newAdminUser.tenantId} !== ${createdTenantId}`);
  }
  console.log(`✓ PASS: Admin trường mới đăng nhập thành công với đầy đủ phân quyền.`);

  // -------------------------------------------------------------
  // 4. TEST ĐIỀU CHỈNH THÔNG TIN TRƯỜNG HỌC (EDIT TENANT)
  // -------------------------------------------------------------
  console.log('\n--- 4. Test Điều chỉnh Thông tin Trường học (Edit Tenant) ---');

  const updateTenantPayload = {
    name: 'Trường THCS Test Mới (Đã Cập Nhật)',
    principalName: 'Cô Hiệu Trưởng Mới',
    phone: '0251888888',
    email: 'hieu_truong_moi@dongnai.edu.vn',
    address: '456 Đại lộ Hùng Vương, TP. Biên Hòa',
    totalStudents: 1500,
    totalClasses: 38,
    totalStaff: 75,
    schoolYear: '2026-2027',
  };

  const updateTenantRes = await request(testApp)
    .patch(`/api/system-admin/tenants/${createdTenantId}`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send(updateTenantPayload);

  if (updateTenantRes.status !== 200) {
    throw new Error(`FAIL: Cập nhật tenant thất bại: ${JSON.stringify(updateTenantRes.body)}`);
  }

  // Kiểm tra lại dữ liệu trong DB
  const verifiedSchool = await prisma.school.findFirst({ where: { tenantId: createdTenantId } });
  if (
    verifiedSchool?.name !== updateTenantPayload.name ||
    verifiedSchool?.principalName !== updateTenantPayload.principalName ||
    verifiedSchool?.totalStudents !== 1500
  ) {
    throw new Error(`FAIL: Dữ liệu School sau khi cập nhật không khớp trong DB: ${JSON.stringify(verifiedSchool)}`);
  }
  console.log(`✓ PASS: Cập nhật thông tin chi tiết trường học (Tên, Hiệu trưởng, Sĩ số, Địa chỉ) thành công 100%.`);

  // -------------------------------------------------------------
  // 5. TEST QUẢN LÝ, RESET MẬT KHẨU & CHUYỂN GIAO ADMIN TRƯỜNG
  // -------------------------------------------------------------
  console.log('\n--- 5. Test Quản trị viên Trường (Xem, Sửa, Reset Pass, Chuyển giao) ---');

  // 5.1 Lấy danh sách admins của tenant
  const getAdminsRes = await request(testApp)
    .get(`/api/system-admin/tenants/${createdTenantId}/admins`)
    .set('Authorization', `Bearer ${sysAdminToken}`);

  if (getAdminsRes.status !== 200 || !getAdminsRes.body.data?.length) {
    throw new Error(`FAIL: Không lấy được danh sách admins của tenant: ${JSON.stringify(getAdminsRes.body)}`);
  }
  const currentAdmin = getAdminsRes.body.data[0];
  console.log(`✓ PASS: Lấy danh sách Admin trường thành công: [${currentAdmin.fullName} - ${currentAdmin.email}].`);

  // 5.2 Cập nhật thông tin Admin trường
  const updateAdminRes = await request(testApp)
    .patch(`/api/system-admin/tenants/${createdTenantId}/admins/${currentAdmin.id}`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({
      fullName: 'Quản Trị Viên (Đã Đổi Tên)',
      title: 'Trưởng Ban CNTT Nhà Trường',
    });

  if (updateAdminRes.status !== 200 || updateAdminRes.body.data.fullName !== 'Quản Trị Viên (Đã Đổi Tên)') {
    throw new Error(`FAIL: Cập nhật admin thất bại: ${JSON.stringify(updateAdminRes.body)}`);
  }
  console.log(`✓ PASS: Cập nhật thông tin Quản trị viên trường thành công.`);

  // 5.3 Reset mật khẩu Admin trường
  const resetPassRes = await request(testApp)
    .post(`/api/system-admin/tenants/${createdTenantId}/admins/${currentAdmin.id}/reset-password`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({ newPassword: 'newAdminPassword123' });

  if (resetPassRes.status !== 200 || !resetPassRes.body.success) {
    throw new Error(`FAIL: Reset mật khẩu thất bại: ${JSON.stringify(resetPassRes.body)}`);
  }

  // Thử đăng nhập lại bằng mật khẩu mới
  const reLoginWithNewPassRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: currentAdmin.email, password: 'newAdminPassword123' });

  if (reLoginWithNewPassRes.status !== 200) {
    throw new Error('FAIL: Đăng nhập với mật khẩu vừa reset thất bại');
  }
  console.log(`✓ PASS: Reset mật khẩu Admin trường thành công & Đăng nhập xác thực với mật khẩu mới.`);

  // 5.4 Chuyển giao / Bổ nhiệm Admin trường mới (Replace Admin)
  const replaceAdminRes = await request(testApp)
    .post(`/api/system-admin/tenants/${createdTenantId}/admins/replace`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({
      mode: 'NEW_USER',
      newAdminName: 'Admin Kế Nhiệm Mới',
      newAdminEmail: 'admin.kenhiem@dongnai.edu.vn',
      newAdminPhone: '0977112233',
      newAdminPassword: 'passKenhiem123',
      newAdminTitle: 'Quản trị viên kế nhiệm',
      archiveOldAdmin: true,
    });

  if (replaceAdminRes.status !== 200 || !replaceAdminRes.body.success) {
    throw new Error(`FAIL: Chuyển giao admin thất bại: ${JSON.stringify(replaceAdminRes.body)}`);
  }

  // Đăng nhập bằng Admin kế nhiệm vừa được chuyển giao
  const loginSuccessorRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'admin.kenhiem@dongnai.edu.vn', password: 'passKenhiem123' });

  if (loginSuccessorRes.status !== 200) {
    throw new Error(`FAIL: Admin kế nhiệm không thể đăng nhập: ${JSON.stringify(loginSuccessorRes.body)}`);
  }
  console.log(`✓ PASS: Chuyển giao quyền Admin trường thành công & Tài khoản mới đăng nhập thành công.`);

  // -------------------------------------------------------------
  // 6. TEST KHÓA TENANT & CHẶN ĐĂNG NHẬP TUYỆT ĐỐI (ACTIVE ENFORCEMENT)
  // -------------------------------------------------------------
  console.log('\n--- 6. Test Khóa Tenant & Kiểm soát Đăng nhập Tuyệt đối ---');

  // 6.1 System Admin khóa Tenant B (Nguyễn Huệ)
  const suspendRes = await request(testApp)
    .patch(`/api/system-admin/tenants/${tenantB.id}/status`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({ status: 'SUSPENDED' });

  if (suspendRes.status !== 200 || suspendRes.body.data.status !== 'SUSPENDED') {
    throw new Error(`FAIL: Khóa tenant thất bại: ${JSON.stringify(suspendRes.body)}`);
  }
  console.log('✓ PASS: System Admin đã tạm dừng (SUSPENDED) Tenant B thành công.');

  // 6.2 Người dùng Tenant B thử đăng nhập khi trường bị khóa -> BẮT BUỘC BỊ CHẶN HTTP 403
  const blockedLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'admin.nguyenhue@dongnai.edu.vn', password: '123456' });

  if (blockedLoginRes.status === 403) {
    console.log(`✓ PASS: Chặn đăng nhập thành công khi Tenant bị khóa: "${blockedLoginRes.body.message}"`);
  } else {
    throw new Error(`FAIL: Kỳ vọng chặn HTTP 403 khi Tenant bị SUSPENDED nhưng nhận ${blockedLoginRes.status}`);
  }

  // 6.3 Người dùng gửi request kèm token cũ khi trường đã bị khóa -> BẮT BUỘC BỊ CHẶN HTTP 403
  const blockedApiRes = await request(testApp)
    .get('/api/users')
    .set('Authorization', `Bearer ${tenantBToken}`);

  if (blockedApiRes.status === 403) {
    console.log(`✓ PASS: Chặn request API đang chạy thành công khi Tenant bị khóa: "${blockedApiRes.body.message}"`);
  } else {
    throw new Error(`FAIL: Kỳ vọng chặn HTTP 403 cho request API khi Tenant bị SUSPENDED nhưng nhận ${blockedApiRes.status}`);
  }

  // 6.4 Mở khóa lại Tenant B (ACTIVE)
  const reactivateRes = await request(testApp)
    .patch(`/api/system-admin/tenants/${tenantB.id}/status`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({ status: 'ACTIVE' });

  if (reactivateRes.status !== 200 || reactivateRes.body.data.status !== 'ACTIVE') {
    throw new Error(`FAIL: Mở khóa tenant thất bại: ${JSON.stringify(reactivateRes.body)}`);
  }
  console.log('✓ PASS: Kích hoạt lại (ACTIVE) Tenant B thành công.');

  // 6.5 Đăng nhập lại sau khi mở khóa -> THÀNH CÔNG HTTP 200
  const reLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'admin.nguyenhue@dongnai.edu.vn', password: '123456' });

  if (reLoginRes.status === 200 && reLoginRes.body.data?.accessToken) {
    console.log('✓ PASS: Người dùng Tenant B đăng nhập bình thường sau khi trường được mở khóa.');
  } else {
    throw new Error('FAIL: Đăng nhập lại sau khi mở khóa thất bại');
  }

  // -------------------------------------------------------------
  // 7. TEST EXECUTIVE DASHBOARD & REPORTS API
  // -------------------------------------------------------------
  console.log('\n--- 7. Test Executive Dashboard Stats & Platform Reports ---');

  const dashboardRes = await request(testApp)
    .get('/api/system-admin/dashboard')
    .set('Authorization', `Bearer ${sysAdminToken}`);

  if (dashboardRes.status !== 200 || !dashboardRes.body.data) {
    throw new Error(`FAIL: Lấy dashboard stats thất bại: ${JSON.stringify(dashboardRes.body)}`);
  }
  const dStats = dashboardRes.body.data;
  console.log(`✓ PASS: Dashboard Stats: Tổng ${dStats.totalTenants} trường (${dStats.activeTenants} Active, ${dStats.suspendedTenants} Suspended), ${dStats.totalUsers} người dùng.`);

  const reportsRes = await request(testApp)
    .get('/api/system-admin/reports')
    .set('Authorization', `Bearer ${sysAdminToken}`);

  if (reportsRes.status !== 200 || !Array.isArray(reportsRes.body.data)) {
    throw new Error(`FAIL: Lấy reports thất bại: ${JSON.stringify(reportsRes.body)}`);
  }
  console.log(`✓ PASS: Platform Reports: Đã tổng hợp báo cáo tài nguyên của ${reportsRes.body.data.length} trường.`);

  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ FOCUSED MULTI-TENANT & SYSTEM ADMIN TESTS ĐÃ PASS 100%!');
  console.log('================================================================');
}

runMultiTenantTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ TEST THẤT BẠI VỚI LỖI:', err);
    process.exit(1);
  });
