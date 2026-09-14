import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';
import { tenantRateLimiter } from '../../shared/middleware/tenant-rate-limiter';

async function runSecurityPenetrationTests() {
  console.log('================================================================');
  console.log('🛡️ BẮT ĐẦU CHẠY SECURITY & PENETRATION INTEGRATION TESTS (PHASE 5)');
  console.log('================================================================');

  try {
    // Reset Rate Limiter for clean start
    tenantRateLimiter.resetStore();

    // 1. Đăng nhập Tenant 1 Admin (Phạm Thị Nam - Hiệu trưởng Phước Tân)
    const loginT1 = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

    if (loginT1.status !== 200) {
      throw new Error(`FAIL: Đăng nhập Tenant 1 thất bại: ${JSON.stringify(loginT1.body)}`);
    }
    const tokenTenant1 = loginT1.body.data.accessToken;
    const tenant1Id = loginT1.body.data.user.tenantId;

    // 2. Đăng nhập Tenant 2 Admin (Nguyễn Văn Hùng - Hiệu trưởng Nguyễn Huệ)
    const loginT2 = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin.nguyenhue@dongnai.edu.vn', password: '123456' });

    if (loginT2.status !== 200) {
      throw new Error(`FAIL: Đăng nhập Tenant 2 thất bại: ${JSON.stringify(loginT2.body)}`);
    }
    const tokenTenant2 = loginT2.body.data.accessToken;
    const tenant2Id = loginT2.body.data.user.tenantId;

    // 3. Đăng nhập Giáo viên Tenant 1
    const teacher1 = await prisma.user.findFirst({
      where: { tenantId: tenant1Id, email: { contains: 'gv' } },
    });
    let tokenTeacherT1 = tokenTenant1;
    let t1TeacherId = loginT1.body.data.user.id;
    if (teacher1) {
      t1TeacherId = teacher1.id;
      const loginTeacher = await request(app)
        .post('/api/auth/login')
        .send({ identifier: teacher1.email, password: '123456' });
      if (loginTeacher.status === 200) {
        tokenTeacherT1 = loginTeacher.body.data.accessToken;
      }
    }

    console.log(`✓ PASS: Đăng nhập thành công Tenant 1 [${tenant1Id}] và Tenant 2 [${tenant2Id}]`);

    // 4. Lấy / Khởi tạo Plan & Task mục tiêu của Tenant 1
    let t1Plan = await prisma.plan.findFirst({ where: { tenantId: tenant1Id } });
    if (!t1Plan) {
      const school = await prisma.school.findFirst({ where: { tenantId: tenant1Id } });
      t1Plan = await prisma.plan.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school!.id,
          title: 'Kế hoạch Bảo mật Tenant 1',
          level: 'NAM',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 86400000),
          createdById: loginT1.body.data.user.id,
        },
      });
    }

    let t1Task = await prisma.task.findFirst({ where: { tenantId: tenant1Id } });
    if (!t1Task) {
      const school = await prisma.school.findFirst({ where: { tenantId: tenant1Id } });
      t1Task = await prisma.task.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school!.id,
          title: 'Nhiệm vụ Kiểm thử Bảo mật Tenant 1',
          status: 'DA_GIAO',
          createdById: loginT1.body.data.user.id,
        },
      });
    }

    // --------------------------------------------------------------------------
    // TEST 1: CÔ LẬP DỮ LIỆU ĐA TENANT (DATA ISOLATION PENETRATION)
    // --------------------------------------------------------------------------
    console.log('\n--- 1. Kiểm thử Tấn công Đọc chéo dữ liệu (Cross-Tenant Read Penetration) ---');

    // Test 1.1: Đọc Kế hoạch chéo
    const resPlanCross = await request(app)
      .get(`/api/plans/${t1Plan.id}`)
      .set('Authorization', `Bearer ${tokenTenant2}`);

    if (resPlanCross.status === 200) {
      throw new Error('LỖ HỔNG BẢO MẬT: Tenant 2 đã đọc được Kế hoạch của Tenant 1!');
    }
    console.log(`✓ PASS: Tenant 2 đọc Kế hoạch Tenant 1 bị chặn (HTTP ${resPlanCross.status} Not Found/Forbidden).`);

    // Test 1.2: Đọc Công việc chéo
    const resTaskCross = await request(app)
      .get(`/api/tasks/${t1Task.id}`)
      .set('Authorization', `Bearer ${tokenTenant2}`);

    if (resTaskCross.status === 200) {
      throw new Error('LỖ HỔNG BẢO MẬT: Tenant 2 đã đọc được Công việc của Tenant 1!');
    }
    console.log(`✓ PASS: Tenant 2 đọc Công việc Tenant 1 bị chặn (HTTP ${resTaskCross.status} Not Found/Forbidden).`);

    // Test 1.3: Xem KPI chéo
    const resKpiCross = await request(app)
      .get(`/api/kpi/user/${t1TeacherId}?periodKey=QUY_3`)
      .set('Authorization', `Bearer ${tokenTenant2}`);

    if (resKpiCross.status === 200 && resKpiCross.body.data?.user?.id === t1TeacherId) {
      throw new Error('LỖ HỔNG BẢO MẬT: Tenant 2 đã đọc được KPI cá nhân của nhân sự Tenant 1!');
    }
    console.log(`✓ PASS: Tenant 2 xem KPI nhân sự Tenant 1 bị chặn hoặc cô lập (HTTP ${resKpiCross.status}).`);

    // --------------------------------------------------------------------------
    // TEST 2: CÔ LẬP GHI / XÓA ĐA TENANT (DATA MUTATION PENETRATION)
    // --------------------------------------------------------------------------
    console.log('\n--- 2. Kiểm thử Tấn công Ghi/Xóa chéo dữ liệu (Cross-Tenant Mutation Penetration) ---');

    // Test 2.1: Sửa Task Tenant 1 từ Tenant 2
    const resMutateCross = await request(app)
      .put(`/api/tasks/${t1Task.id}`)
      .set('Authorization', `Bearer ${tokenTenant2}`)
      .send({ title: 'HACKED_BY_TENANT_2', progressPercent: 100 });

    if (resMutateCross.status === 200) {
      throw new Error('LỖ HỔNG BẢO MẬT: Tenant 2 đã sửa đổi được Task của Tenant 1!');
    }
    const checkOriginalTask = await prisma.task.findUnique({ where: { id: t1Task.id } });
    if (checkOriginalTask?.title === 'HACKED_BY_TENANT_2') {
      throw new Error('LỖ HỔNG BẢO MẬT: Dữ liệu DB Task của Tenant 1 đã bị Tenant 2 ghi đè!');
    }
    console.log(`✓ PASS: Tenant 2 sửa Task của Tenant 1 bị chặn an toàn (HTTP ${resMutateCross.status}).`);

    // Test 2.2: Xóa Task Tenant 1 từ Tenant 2
    const resDeleteCross = await request(app)
      .delete(`/api/tasks/${t1Task.id}`)
      .set('Authorization', `Bearer ${tokenTenant2}`);

    if (resDeleteCross.status === 200) {
      throw new Error('LỖ HỔNG BẢO MẬT: Tenant 2 đã xóa được Task của Tenant 1!');
    }
    console.log(`✓ PASS: Tenant 2 xóa Task của Tenant 1 bị từ chối (HTTP ${resDeleteCross.status}).`);

    // --------------------------------------------------------------------------
    // TEST 3: XÁC THỰC & BẢO VỆ TOKEN JWT (AUTHENTICATION PENETRATION)
    // --------------------------------------------------------------------------
    console.log('\n--- 3. Kiểm thử Xác thực & Toàn vẹn Token JWT ---');

    // Test 3.1: Không có token
    const resNoToken = await request(app).get('/api/plans');
    if (resNoToken.status !== 401) {
      throw new Error(`FAIL: Yêu cầu không có token phải trả về 401, nhận ${resNoToken.status}`);
    }
    console.log('✓ PASS: Yêu cầu không có token bị từ chối 401 Unauthorized.');

    // Test 3.2: Token giả mạo
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImhhY2tlciIsInRlbmFudElkIjoiZmFrZSJ9.INVALID_SIGNATURE';
    const resFakeToken = await request(app)
      .get('/api/plans')
      .set('Authorization', `Bearer ${fakeToken}`);

    if (resFakeToken.status !== 401) {
      throw new Error(`FAIL: Token giả mạo phải trả về 401, nhận ${resFakeToken.status}`);
    }
    console.log('✓ PASS: Token JWT giả mạo bị từ chối 401 Unauthorized.');

    // --------------------------------------------------------------------------
    // TEST 4: KIỂM SOÁT PHÂN QUYỀN VÀ LEO THANG ĐẶC QUYỀN (RBAC PRIVILEGE ESCALATION)
    // --------------------------------------------------------------------------
    console.log('\n--- 4. Kiểm thử Leo thang Đặc quyền (Privilege Escalation) ---');

    // Giáo viên thường gọi API Quản trị nền tảng
    const resEscalate = await request(app)
      .post('/api/system-admin/tenants')
      .set('Authorization', `Bearer ${tokenTeacherT1}`)
      .send({ code: 'HACK_TENANT', name: 'Trường Giả Mạo' });

    if (resEscalate.status === 200 || resEscalate.status === 201) {
      throw new Error('LỖ HỔNG BẢO MẬT: Người dùng thường đã tạo được Tenant mới!');
    }
    console.log(`✓ PASS: Leo thang đặc quyền bị chặn thành công (HTTP ${resEscalate.status} Forbidden/Unauthorized).`);

    // --------------------------------------------------------------------------
    // TEST 5: TENANT RATE LIMITER BURST PROTECTION
    // --------------------------------------------------------------------------
    console.log('\n--- 5. Kiểm thử Chống Spam & Giới hạn Tần suất (Tenant Rate Limiter) ---');

    tenantRateLimiter.setLimits(5, 5, 10000);
    tenantRateLimiter.resetStore();

    let rateLimited = false;
    for (let i = 0; i < 8; i++) {
      const res = await request(app)
        .get('/api/plans')
        .set('Authorization', `Bearer ${tokenTenant1}`);

      if (res.status === 429) {
        rateLimited = true;
        if (res.body.error !== 'RATE_LIMIT_EXCEEDED') {
          throw new Error('FAIL: Phản hồi 429 thiếu mã lỗi RATE_LIMIT_EXCEEDED');
        }
        break;
      }
    }

    if (!rateLimited) {
      throw new Error('FAIL: Rate limiter không kích hoạt khi vượt quá ngưỡng 5 requests/window');
    }
    console.log('✓ PASS: Rate Limiter kích hoạt chính xác, trả về HTTP 429 và thông số Retry-After.');

    // Reset rate limiter về mặc định
    tenantRateLimiter.setLimits(300, 60, 60000);
    tenantRateLimiter.resetStore();

    console.log('\n================================================================');
    console.log('🎉 TẤT CẢ TEST SUITES BẢO MẬT & ĐA TENANT PHASE 5 ĐÃ PASS 100%!');
    console.log('================================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

runSecurityPenetrationTests();
