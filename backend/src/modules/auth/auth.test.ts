import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import request from 'supertest';
import { requireAuth, requireScope, requireRole } from './auth.middleware';
import authRoutes from './auth.routes';
import { errorHandler } from '../../middlewares/error.middleware';
import prisma from '../../prisma';
import { Role } from '@prisma/client';

// Tạo test app độc lập
const testApp = express();
testApp.use(express.json());
testApp.use('/api/auth', authRoutes);

// Route thử nghiệm kiểm tra phạm vi điểm trường
testApp.get(
  '/api/test/location-scope',
  requireAuth,
  requireScope({ checkLocation: true }),
  (req, res) => {
    res.status(200).json({ success: true, message: 'Truy cập thành công dữ liệu điểm trường!' });
  }
);

// Route thử nghiệm kiểm tra vai trò BGH
testApp.get(
  '/api/test/bgh-only',
  requireAuth,
  requireRole(Role.HIEU_TRUONG, Role.PHO_HIEU_TRUONG),
  (req, res) => {
    res.status(200).json({ success: true, message: 'Dành riêng cho Ban Giám hiệu!' });
  }
);

testApp.use(errorHandler);

async function runTests() {
  console.log('🧪 Bắt đầu chạy Unit/Integration Tests cho Module Auth...');

  // Lấy ID các điểm trường từ DB
  const locPh1 = await prisma.location.findFirst({ where: { code: 'PHAN_HIEU_1' } });
  const locPh2 = await prisma.location.findFirst({ where: { code: 'PHAN_HIEU_2' } });

  if (!locPh1 || !locPh2) {
    throw new Error('Chưa có dữ liệu điểm trường trong DB. Vui lòng seed trước!');
  }

  // 1. TEST ĐĂNG NHẬP BẰNG EMAIL
  console.log('\n--- 1. Test Đăng nhập bằng Email ---');
  const loginEmailRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

  if (loginEmailRes.status === 200 && loginEmailRes.body.data.accessToken) {
    console.log('✓ PASS: Đăng nhập bằng Email thành công (HTTP 200, nhận accessToken & refreshToken)');
  } else {
    throw new Error(`FAIL: Đăng nhập email thất bại: ${JSON.stringify(loginEmailRes.body)}`);
  }
  const hieuTruongToken = loginEmailRes.body.data.accessToken;
  const refreshToken = loginEmailRes.body.data.refreshToken;

  // 2. TEST ĐĂNG NHẬP BẰNG SỐ ĐIỆN THOẠI
  console.log('\n--- 2. Test Đăng nhập bằng SĐT ---');
  const loginPhoneRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: '0903111222', password: '123456' });

  if (loginPhoneRes.status === 200 && loginPhoneRes.body.data.accessToken) {
    console.log('✓ PASS: Đăng nhập bằng Số điện thoại thành công (HTTP 200)');
  } else {
    throw new Error(`FAIL: Đăng nhập SĐT thất bại: ${JSON.stringify(loginPhoneRes.body)}`);
  }

  // 3. TEST GET /api/auth/me
  console.log('\n--- 3. Test GET /api/auth/me ---');
  const meRes = await request(testApp)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${hieuTruongToken}`);

  if (meRes.status === 200 && meRes.body.data.fullName === 'Nguyễn Văn An') {
    console.log(`✓ PASS: Lấy thông tin user thành công: ${meRes.body.data.fullName} (${meRes.body.data.title})`);
  } else {
    throw new Error(`FAIL: GET /me thất bại: ${JSON.stringify(meRes.body)}`);
  }

  // 4. TEST REFRESH TOKEN
  console.log('\n--- 4. Test POST /api/auth/refresh ---');
  const refreshRes = await request(testApp)
    .post('/api/auth/refresh')
    .send({ refreshToken });

  if (refreshRes.status === 200 && refreshRes.body.data.accessToken) {
    console.log('✓ PASS: Cấp mới Access Token thành công từ Refresh Token');
  } else {
    throw new Error(`FAIL: Refresh token thất bại: ${JSON.stringify(refreshRes.body)}`);
  }

  // 5. TEST PHÂN QUYỀN SCOPE (GIÁO VIÊN PHÂN HIỆU 1 TRUY CẬP PHÂN HIỆU 2)
  console.log('\n--- 5. Test Phân quyền Scope Điểm trường ---');
  // Đăng nhập tài khoản Giáo viên Phân hiệu 1: Bùi Thị Hồng Nhung
  const teacherLoginRes = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: 'nhung.bth@phuoctan.edu.vn', password: '123456' });
  const teacherToken = teacherLoginRes.body.data.accessToken;

  // 5.1 Giáo viên Phân hiệu 1 gọi API dữ liệu của Phân hiệu 2 -> Kỳ vọng nhận 403 Forbidden
  const forbiddenRes = await request(testApp)
    .get(`/api/test/location-scope?locationId=${locPh2.id}`)
    .set('Authorization', `Bearer ${teacherToken}`);

  if (forbiddenRes.status === 403) {
    console.log(`✓ PASS: Giáo viên Phân hiệu 1 truy cập Phân hiệu 2 bị chặn với HTTP 403: "${forbiddenRes.body.message}"`);
  } else {
    throw new Error(`FAIL: Kỳ vọng HTTP 403 nhưng nhận ${forbiddenRes.status}: ${JSON.stringify(forbiddenRes.body)}`);
  }

  // 5.2 Giáo viên Phân hiệu 1 gọi API dữ liệu của chính Phân hiệu 1 -> Kỳ vọng nhận 200 OK
  const allowedTeacherRes = await request(testApp)
    .get(`/api/test/location-scope?locationId=${locPh1.id}`)
    .set('Authorization', `Bearer ${teacherToken}`);

  if (allowedTeacherRes.status === 200) {
    console.log('✓ PASS: Giáo viên Phân hiệu 1 truy cập dữ liệu Phân hiệu 1 thành công (HTTP 200)');
  } else {
    throw new Error(`FAIL: Kỳ vọng HTTP 200 nhưng nhận ${allowedTeacherRes.status}`);
  }

  // 5.3 Hiệu trưởng gọi API dữ liệu của Phân hiệu 2 -> Kỳ vọng nhận 200 OK (toàn quyền)
  const allowedPrincipalRes = await request(testApp)
    .get(`/api/test/location-scope?locationId=${locPh2.id}`)
    .set('Authorization', `Bearer ${hieuTruongToken}`);

  if (allowedPrincipalRes.status === 200) {
    console.log('✓ PASS: Hiệu trưởng có quyền xem dữ liệu của bất kỳ điểm trường nào (HTTP 200)');
  } else {
    throw new Error(`FAIL: Hiệu trưởng bị chặn truy cập: ${JSON.stringify(allowedPrincipalRes.body)}`);
  }

  // 6. TEST REQUIRE ROLE (GIÁO VIÊN GỌI ENDPOINT DÀNH RIÊNG CHO BGH)
  console.log('\n--- 6. Test requireRole ---');
  const bghRes = await request(testApp)
    .get('/api/test/bgh-only')
    .set('Authorization', `Bearer ${teacherToken}`);

  if (bghRes.status === 403) {
    console.log(`✓ PASS: Giáo viên không có quyền BGH bị chặn với HTTP 403: "${bghRes.body.message}"`);
  } else {
    throw new Error(`FAIL: Kỳ vọng HTTP 403 nhưng nhận ${bghRes.status}`);
  }

  console.log('\n🎉 TẤT CẢ UNIT / INTEGRATION TESTS CỦA MODULE AUTH ĐÃ PASS 100%!');
  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
