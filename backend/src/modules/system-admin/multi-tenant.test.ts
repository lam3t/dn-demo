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
  console.log('🧪 BẮT ĐẦU CHẠY INTEGRATION TESTS: ĐA TENANT & CÔ LẬP DỮ LIỆU');
  console.log('================================================================');

  // Verify tenants exist in database
  const tenantA = await prisma.tenant.findUnique({ where: { code: 'PHUOC_TAN' } });
  const tenantB = await prisma.tenant.findUnique({ where: { code: 'NGUYEN_HUE' } });

  if (!tenantA || !tenantB) {
    throw new Error('Chưa có đủ 2 Tenant test trong CSDL. Vui lòng chạy npm run prisma:seed trước!');
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
  // 2. TEST CÔ LẬP DỮ LIỆU TÀI KHOẢN (GET /api/users)
  // -------------------------------------------------------------
  console.log('\n--- 2. Test Cô lập Dữ liệu Người dùng (GET /api/users) ---');

  // Tenant A gọi GET /api/users
  const usersResA = await request(testApp)
    .get('/api/users')
    .set('Authorization', `Bearer ${tenantAToken}`);

  if (usersResA.status !== 200) {
    throw new Error(`FAIL: Tenant A lấy danh sách users thất bại: ${JSON.stringify(usersResA.body)}`);
  }
  const usersA = usersResA.body.data.items || usersResA.body.data;
  console.log(`✓ Tenant A nhận được ${usersA.length} tài khoản.`);

  // Tenant B gọi GET /api/users
  const usersResB = await request(testApp)
    .get('/api/users')
    .set('Authorization', `Bearer ${tenantBToken}`);

  if (usersResB.status !== 200) {
    throw new Error(`FAIL: Tenant B lấy danh sách users thất bại: ${JSON.stringify(usersResB.body)}`);
  }
  const usersB = usersResB.body.data.items || usersResB.body.data;
  console.log(`✓ Tenant B nhận được ${usersB.length} tài khoản.`);

  // Kiểm tra giao thoa giữa Users của Tenant A và Tenant B
  const idsA = new Set(usersA.map((u: any) => u.id));
  const overlapUsers = usersB.filter((u: any) => idsA.has(u.id));

  if (overlapUsers.length > 0) {
    throw new Error(`FAIL: RÒ RỈ DỮ LIỆU! Tìm thấy ${overlapUsers.length} tài khoản bị lẫn giữa 2 tenant: ${JSON.stringify(overlapUsers)}`);
  }
  console.log('✓ PASS: Tuyệt đối không có tài khoản nào bị rò rỉ giữa Tenant A và Tenant B (Overlap = 0).');

  // -------------------------------------------------------------
  // 3. TEST CHỐNG CAN THIỆP PARAMETER (ANTI-TAMPERING)
  // -------------------------------------------------------------
  console.log('\n--- 3. Test Chống can thiệp Client (Anti-Tampering) ---');
  // Tenant A cố tình truyền tenantId hoặc schoolId của Tenant B vào query parameter
  const tamperedUsersRes = await request(testApp)
    .get(`/api/users?schoolId=${tenantB.id}&tenantId=${tenantB.id}`)
    .set('Authorization', `Bearer ${tenantAToken}`);

  if (tamperedUsersRes.status !== 200) {
    throw new Error(`FAIL: Request bị lỗi không mong muốn: ${tamperedUsersRes.status}`);
  }
  const tamperedUsers = tamperedUsersRes.body.data.items || tamperedUsersRes.body.data;
  const containsTenantBUser = tamperedUsers.some((u: any) => usersB.some((ub: any) => ub.id === u.id));

  if (containsTenantBUser) {
    throw new Error('FAIL: LỖ HỔNG BẢO MẬT! Truyền tenantId khác qua query param đã lấy được dữ liệu của tenant khác!');
  }
  console.log('✓ PASS: Backend bỏ qua tham số tenantId giả mạo từ client, chỉ trả dữ liệu thuộc Tenant của JWT đã xác thực.');

  // -------------------------------------------------------------
  // 4. TEST CÔ LẬP DỮ LIỆU CÔNG VIỆC & KẾ HOẠCH (TASKS & PLANS)
  // -------------------------------------------------------------
  console.log('\n--- 4. Test Cô lập Dữ liệu Công việc & Kế hoạch ---');

  // 4.1 Tasks Isolation
  const tasksResA = await request(testApp)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${tenantAToken}`);
  const tasksResB = await request(testApp)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${tenantBToken}`);

  if (tasksResA.status !== 200 || tasksResB.status !== 200) {
    throw new Error('FAIL: Lấy danh sách tasks thất bại');
  }
  const tasksA = tasksResA.body.data.items || tasksResA.body.data;
  const tasksB = tasksResB.body.data.items || tasksResB.body.data;

  const taskIdsA = new Set(tasksA.map((t: any) => t.id));
  const overlapTasks = tasksB.filter((t: any) => taskIdsA.has(t.id));

  if (overlapTasks.length > 0) {
    throw new Error(`FAIL: RÒ RỈ DỮ LIỆU! Có ${overlapTasks.length} task bị lẫn giữa 2 tenant.`);
  }
  console.log(`✓ PASS: Cô lập Task hoàn hảo: Tenant A có ${tasksA.length} tasks, Tenant B có ${tasksB.length} tasks, Overlap = 0.`);

  // 4.2 Plans Isolation
  const plansResA = await request(testApp)
    .get('/api/plans')
    .set('Authorization', `Bearer ${tenantAToken}`);
  const plansResB = await request(testApp)
    .get('/api/plans')
    .set('Authorization', `Bearer ${tenantBToken}`);

  if (plansResA.status !== 200 || plansResB.status !== 200) {
    throw new Error('FAIL: Lấy danh sách plans thất bại');
  }
  const plansA = plansResA.body.data;
  const plansB = plansResB.body.data;

  const planIdsA = new Set(plansA.map((p: any) => p.id));
  const overlapPlans = plansB.filter((p: any) => planIdsA.has(p.id));

  if (overlapPlans.length > 0) {
    throw new Error(`FAIL: RÒ RỈ DỮ LIỆU! Có ${overlapPlans.length} kế hoạch bị lẫn giữa 2 tenant.`);
  }
  console.log(`✓ PASS: Cô lập Kế hoạch hoàn hảo: Tenant A có ${plansA.length} plans, Tenant B có ${plansB.length} plans, Overlap = 0.`);

  // -------------------------------------------------------------
  // 5. TEST SYSTEM ADMIN API & RBAC GUARD
  // -------------------------------------------------------------
  console.log('\n--- 5. Test System Admin API & RBAC Guard ---');

  // 5.1 Tenant Admin gọi System Admin API -> BỊ CHẶN HTTP 403
  const forbiddenRes = await request(testApp)
    .get('/api/system-admin/tenants')
    .set('Authorization', `Bearer ${tenantAToken}`);

  if (forbiddenRes.status === 403) {
    console.log(`✓ PASS: Tenant Admin gọi /api/system-admin/tenants bị chặn với HTTP 403: "${forbiddenRes.body.message}"`);
  } else {
    throw new Error(`FAIL: Kỳ vọng HTTP 403 nhưng nhận được ${forbiddenRes.status}`);
  }

  // 5.2 System Admin gọi System Admin API -> THÀNH CÔNG HTTP 200
  const sysAdminTenantsRes = await request(testApp)
    .get('/api/system-admin/tenants')
    .set('Authorization', `Bearer ${sysAdminToken}`);

  const tenantItems = sysAdminTenantsRes.body.data?.items || sysAdminTenantsRes.body.data;
  if (sysAdminTenantsRes.status === 200 && Array.isArray(tenantItems)) {
    console.log(`✓ PASS: System Admin lấy danh sách tenants thành công (Tổng ${tenantItems.length} trường).`);
  } else {
    throw new Error(`FAIL: System Admin lấy danh sách tenants thất bại: ${JSON.stringify(sysAdminTenantsRes.body)}`);
  }

  // 5.3 System Admin lấy danh sách Gói thuê (Packages)
  const packagesRes = await request(testApp)
    .get('/api/system-admin/packages')
    .set('Authorization', `Bearer ${sysAdminToken}`);

  if (packagesRes.status === 200 && packagesRes.body.data.length >= 2) {
    console.log(`✓ PASS: System Admin lấy danh sách Gói thuê thành công (Có ${packagesRes.body.data.length} gói cước).`);
  } else {
    throw new Error(`FAIL: Lấy danh sách packages thất bại: ${JSON.stringify(packagesRes.body)}`);
  }

  // -------------------------------------------------------------
  // 6. TEST KHÓA TENANT & CHẶN ĐĂNG NHẬP (SUSPENDED TENANT)
  // -------------------------------------------------------------
  console.log('\n--- 6. Test Khóa Tenant & Kiểm soát Đăng nhập ---');

  // 6.1 System Admin khóa Tenant B
  const suspendRes = await request(testApp)
    .patch(`/api/system-admin/tenants/${tenantB.id}/status`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({ status: 'SUSPENDED' });

  if (suspendRes.status !== 200 || suspendRes.body.data.status !== 'SUSPENDED') {
    throw new Error(`FAIL: Khóa tenant thất bại: ${JSON.stringify(suspendRes.body)}`);
  }
  console.log('✓ PASS: System Admin đã tạm dừng (SUSPENDED) Tenant B thành công.');

  // 6.2 Người dùng Tenant B thử đăng nhập khi trường bị khóa -> BỊ CHẶN HTTP 403
  const blockedLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'admin.nguyenhue@dongnai.edu.vn', password: '123456' });

  if (blockedLoginRes.status === 403) {
    console.log(`✓ PASS: Chặn đăng nhập thành công khi Tenant bị khóa: "${blockedLoginRes.body.message}"`);
  } else {
    throw new Error(`FAIL: Kỳ vọng chặn HTTP 403 khi Tenant bị SUSPENDED nhưng nhận ${blockedLoginRes.status}`);
  }

  // 6.3 Mở khóa lại Tenant B để đảm bảo tính sẵn sàng
  const reactivateRes = await request(testApp)
    .patch(`/api/system-admin/tenants/${tenantB.id}/status`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({ status: 'ACTIVE' });

  if (reactivateRes.status === 200 && reactivateRes.body.data.status === 'ACTIVE') {
    console.log('✓ PASS: Kích hoạt lại (ACTIVE) Tenant B thành công.');
  } else {
    throw new Error(`FAIL: Mở khóa tenant thất bại: ${JSON.stringify(reactivateRes.body)}`);
  }

  // 6.4 Đăng nhập lại sau khi mở khóa -> THÀNH CÔNG HTTP 200
  const reLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'admin.nguyenhue@dongnai.edu.vn', password: '123456' });

  if (reLoginRes.status === 200 && reLoginRes.body.data?.accessToken) {
    console.log('✓ PASS: Người dùng Tenant B đăng nhập bình thường sau khi trường được mở khóa.');
  } else {
    throw new Error('FAIL: Đăng nhập lại sau khi mở khóa thất bại');
  }

  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ MULTI-TENANT INTEGRATION TESTS ĐÃ PASS 100%!');
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
