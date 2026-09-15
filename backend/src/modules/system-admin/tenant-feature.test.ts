import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import request from 'supertest';
import authRoutes from '../auth/auth.routes';
import userRoutes from '../users/user.routes';
import systemAdminRoutes from './system-admin.routes';
import { errorHandler } from '../../middlewares/error.middleware';
import prisma from '../../prisma';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/auth', authRoutes);
testApp.use('/api/users', userRoutes);
testApp.use('/api/system-admin', systemAdminRoutes);
testApp.use(errorHandler);

async function runTenantCreationAndIsolationTest() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU TEST: KHỞI TẠO 2 TENANT VÀ 2 TÀI KHOẢN ADMIN TRƯỜNG');
  console.log('================================================================\n');

  // 0. Xóa sạch dữ liệu test cũ để bắt đầu từ trạng thái sạch 100%
  await prisma.systemAuditLog.deleteMany({});
  await prisma.adminAuditLog.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.taskLog.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.kPIDefinition.deleteMany({});
  await prisma.sharedCategory.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.roleModel.deleteMany({});
  await prisma.user.deleteMany({ where: { isSystemAdmin: false } });
  await prisma.orgUnit.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.school.deleteMany({});
  await prisma.tenantSubscription.deleteMany({});
  await prisma.tenant.deleteMany({});
  console.log('🧹 Đã dọn dẹp sạch toàn bộ dữ liệu tenant cũ.\n');

  // 1. Kiểm tra System Admin đăng nhập
  console.log('1️⃣ Đăng nhập System Admin:');
  const sysAdminLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'chunh@tringhiatech.vn', password: '123456' });

  if (sysAdminLoginRes.status !== 200 || !sysAdminLoginRes.body.data?.accessToken) {
    throw new Error(`FAIL: System Admin đăng nhập thất bại: ${JSON.stringify(sysAdminLoginRes.body)}`);
  }
  const sysAdminToken = sysAdminLoginRes.body.data.accessToken;
  console.log('✓ System Admin đăng nhập thành công.\n');

  // Lấy danh sách gói thuê
  const packages = await prisma.package.findMany();
  const pkgEnterprise = packages.find((p) => p.code === 'ENT') || packages[0];
  const pkgStandard = packages.find((p) => p.code === 'STD') || packages[0];

  // 2. Tạo Tenant 1: TH & THCS Phước Tân
  console.log('2️⃣ System Admin tạo Tenant 1 (TH & THCS Phước Tân) + Admin 1:');
  const tenant1Res = await request(testApp)
    .post('/api/system-admin/tenants')
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({
      name: 'Trường TH và THCS Phước Tân',
      code: 'TH_THCS_PHUOC_TAN',
      address: 'Phường Phước Tân, TP. Biên Hòa, Tỉnh Đồng Nai',
      phone: '02513888999',
      email: 'th_thcs_phuoctan@dongnai.edu.vn',
      principalName: 'Phạm Thị Nam',
      packageId: pkgEnterprise.id,
      adminFullName: 'Hoàng Thị Mai Anh',
      adminEmail: 'admin@phuoctan.edu.vn',
      adminPhone: '0909999999',
      adminPassword: 'password123',
      adminTitle: 'Quản trị hệ thống (Admin trường Phước Tân)',
    });

  if (tenant1Res.status !== 201) {
    throw new Error(`FAIL: Tạo Tenant 1 thất bại: ${JSON.stringify(tenant1Res.body)}`);
  }
  const tenant1Data = tenant1Res.body.data.tenant;
  const admin1Created = tenant1Res.body.data.adminUser;
  console.log(`✓ Tạo Tenant 1 thành công: ${tenant1Data.name} (Code: ${tenant1Data.code})`);
  console.log(`✓ Đã tự động tạo Admin 1: ${admin1Created.fullName} (${admin1Created.phone})\n`);

  // 3. Tạo Tenant 2: THCS Nguyễn Huệ
  console.log('3️⃣ System Admin tạo Tenant 2 (THCS Nguyễn Huệ) + Admin 2:');
  const tenant2Res = await request(testApp)
    .post('/api/system-admin/tenants')
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({
      name: 'Trường THCS Nguyễn Huệ',
      code: 'THCS_NGUYEN_HUE',
      address: 'Số 45 đường Hùng Vương, TP. Biên Hòa, Tỉnh Đồng Nai',
      phone: '02513999888',
      email: 'thcs_nguyenhue@dongnai.edu.vn',
      principalName: 'Nguyễn Văn Hùng',
      packageId: pkgStandard.id,
      adminFullName: 'Đặng Thị Thu Hà',
      adminEmail: 'admin.nguyenhue@dongnai.edu.vn',
      adminPhone: '0905555666',
      adminPassword: 'password123',
      adminTitle: 'Quản trị hệ thống (Admin trường Nguyễn Huệ)',
    });

  if (tenant2Res.status !== 201) {
    throw new Error(`FAIL: Tạo Tenant 2 thất bại: ${JSON.stringify(tenant2Res.body)}`);
  }
  const tenant2Data = tenant2Res.body.data.tenant;
  const admin2Created = tenant2Res.body.data.adminUser;
  console.log(`✓ Tạo Tenant 2 thành công: ${tenant2Data.name} (Code: ${tenant2Data.code})`);
  console.log(`✓ Đã tự động tạo Admin 2: ${admin2Created.fullName} (${admin2Created.phone})\n`);

  // 4. Kiểm tra danh sách Tenant trong System Admin
  console.log('4️⃣ Lấy danh sách Tenant qua System Admin API:');
  const listTenantsRes = await request(testApp)
    .get('/api/system-admin/tenants')
    .set('Authorization', `Bearer ${sysAdminToken}`);

  if (listTenantsRes.status !== 200 || listTenantsRes.body.data?.items?.length !== 2) {
    throw new Error(`FAIL: Danh sách Tenant không khớp 2: ${JSON.stringify(listTenantsRes.body)}`);
  }
  console.log(`✓ Đã xác nhận hệ thống có chính xác 2 Tenant:`);
  for (const t of listTenantsRes.body.data.items) {
    console.log(`   - [${t.code}] ${t.name} | Gói: ${t.activeSubscription?.packageName} | Admin: ${t.adminUser?.fullName} (${t.adminUser?.phone})`);
  }
  console.log('');

  // 5. Kiểm tra Đăng nhập của Admin 1 (Phước Tân)
  console.log('5️⃣ Kiểm tra Đăng nhập Tenant Admin 1 (0909999999 / password123):');
  const admin1LoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: '0909999999', password: 'password123' });

  if (admin1LoginRes.status !== 200 || !admin1LoginRes.body.data?.accessToken) {
    throw new Error(`FAIL: Admin 1 đăng nhập thất bại: ${JSON.stringify(admin1LoginRes.body)}`);
  }
  const admin1Token = admin1LoginRes.body.data.accessToken;
  const admin1User = admin1LoginRes.body.data.user;
  if (admin1User.tenantId !== tenant1Data.id) {
    throw new Error(`FAIL: Admin 1 tenantId không khớp: ${admin1User.tenantId} !== ${tenant1Data.id}`);
  }
  console.log(`✓ Admin 1 đăng nhập thành công! Tenant: ${admin1User.tenantName} (${admin1User.tenantId})\n`);

  // 6. Kiểm tra Đăng nhập của Admin 2 (Nguyễn Huệ)
  console.log('6️⃣ Kiểm tra Đăng nhập Tenant Admin 2 (0905555666 / password123):');
  const admin2LoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: '0905555666', password: 'password123' });

  if (admin2LoginRes.status !== 200 || !admin2LoginRes.body.data?.accessToken) {
    throw new Error(`FAIL: Admin 2 đăng nhập thất bại: ${JSON.stringify(admin2LoginRes.body)}`);
  }
  const admin2Token = admin2LoginRes.body.data.accessToken;
  const admin2User = admin2LoginRes.body.data.user;
  if (admin2User.tenantId !== tenant2Data.id) {
    throw new Error(`FAIL: Admin 2 tenantId không khớp: ${admin2User.tenantId} !== ${tenant2Data.id}`);
  }
  console.log(`✓ Admin 2 đăng nhập thành công! Tenant: ${admin2User.tenantName} (${admin2User.tenantId})\n`);

  // 7. Kiểm tra tính cô lập dữ liệu (Tenant Isolation)
  console.log('7️⃣ Kiểm tra Cô lập Dữ liệu giữa 2 Tenant:');
  const usersT1Res = await request(testApp)
    .get('/api/users')
    .set('Authorization', `Bearer ${admin1Token}`);
  const usersT2Res = await request(testApp)
    .get('/api/users')
    .set('Authorization', `Bearer ${admin2Token}`);

  const userListT1 = usersT1Res.body.data?.users || usersT1Res.body.data?.items || [];
  const userListT2 = usersT2Res.body.data?.users || usersT2Res.body.data?.items || [];
  const userIdsT1 = userListT1.map((u: any) => u.id);
  const userIdsT2 = userListT2.map((u: any) => u.id);
  const hasOverlap = userIdsT1.some((id: string) => userIdsT2.includes(id));
  if (hasOverlap) {
    throw new Error('FAIL: Phát hiện rò rỉ dữ liệu tài khoản giữa 2 tenant!');
  }
  console.log(`✓ Dữ liệu hoàn toàn cô lập: Tenant 1 có ${userIdsT1.length} tài khoản, Tenant 2 có ${userIdsT2.length} tài khoản (0 overlap).\n`);

  // 8. Kiểm tra tính năng Khóa Tenant (SUSPEND) và Chặn Đăng nhập
  console.log('8️⃣ Kiểm tra Tính năng Khóa Tenant & Bảo mật Đăng nhập:');
  // Khóa Tenant 2
  const suspendRes = await request(testApp)
    .patch(`/api/system-admin/tenants/${tenant2Data.id}/status`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({ status: 'SUSPENDED' });

  if (suspendRes.status !== 200) {
    throw new Error(`FAIL: Khóa Tenant 2 thất bại: ${JSON.stringify(suspendRes.body)}`);
  }
  console.log('✓ Đã chuyển trạng thái Tenant 2 -> SUSPENDED.');

  // Thử đăng nhập bằng tài khoản Admin của Tenant 2 đã bị khóa -> Phải bị từ chối 403
  const blockedLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: '0905555666', password: 'password123' });

  if (blockedLoginRes.status !== 403) {
    throw new Error(`FAIL: Tenant bị khóa nhưng vẫn đăng nhập thành công (HTTP ${blockedLoginRes.status})!`);
  }
  console.log(`✓ PASS: Tài khoản thuộc trường bị khóa bị từ chối đăng nhập với HTTP 403: "${blockedLoginRes.body.message}".`);

  // Mở khóa lại Tenant 2
  const activeRes = await request(testApp)
    .patch(`/api/system-admin/tenants/${tenant2Data.id}/status`)
    .set('Authorization', `Bearer ${sysAdminToken}`)
    .send({ status: 'ACTIVE' });

  if (activeRes.status !== 200) {
    throw new Error(`FAIL: Mở khóa Tenant 2 thất bại`);
  }
  console.log('✓ Đã mở khóa Tenant 2 -> ACTIVE.');

  // Thử đăng nhập lại sau khi mở khóa -> Phải thành công 200
  const unblockedLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: '0905555666', password: 'password123' });

  if (unblockedLoginRes.status !== 200) {
    throw new Error(`FAIL: Tenant đã mở khóa nhưng không đăng nhập được!`);
  }
  console.log('✓ PASS: Tài khoản trường sau khi mở khóa đăng nhập bình thường (HTTP 200).\n');

  console.log('================================================================');
  console.log('🎉 TẤT CẢ CÁC BƯỚC TEST TÍNH NĂNG TENANT & ADMIN ĐÃ THÀNH CÔNG 100%!');
  console.log('================================================================');
}

runTenantCreationAndIsolationTest()
  .catch((err) => {
    console.error('❌ TEST ERROR:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
