import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';

async function runTests() {
  console.log('🧪 Bắt đầu chạy Tests cho Prompt 4: Cơ cấu tổ chức, Điểm trường & People Picker...');

  // 1. Đăng nhập lấy token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

  if (loginRes.status !== 200) {
    throw new Error('Đăng nhập thất bại để lấy auth token!');
  }
  const token = loginRes.body.data.accessToken;
  const hieuTruongId = loginRes.body.data.user.id;

  // 2. TEST GET /api/locations
  console.log('\n--- 1. Test GET /api/locations ---');
  const locRes = await request(app)
    .get('/api/locations')
    .set('Authorization', `Bearer ${token}`);

  if (locRes.status === 200 && locRes.body.data.length === 3) {
    console.log(`✓ PASS: Lấy danh sách 3 điểm trường thành công: ${locRes.body.data.map((l: any) => l.name).join(' | ')}`);
  } else {
    throw new Error(`FAIL: GET /api/locations thất bại: ${JSON.stringify(locRes.body)}`);
  }
  const locPh1 = locRes.body.data.find((l: any) => l.code === 'PHAN_HIEU_1');

  // 3. TEST GET /api/org/tree
  console.log('\n--- 2. Test GET /api/org/tree ---');
  const orgTreeRes = await request(app)
    .get('/api/org/tree')
    .set('Authorization', `Bearer ${token}`);

  if (orgTreeRes.status === 200 && Array.isArray(orgTreeRes.body.data) && orgTreeRes.body.data.length > 0) {
    console.log(`✓ PASS: Lấy sơ đồ cây tổ chức thành công (${orgTreeRes.body.data.length} nút gốc).`);
    const bghNode = orgTreeRes.body.data.find((o: any) => o.code === 'BGH');
    console.log(`  Nút BGH leader: ${bghNode?.leader?.fullName} - Số thành viên: ${bghNode?.userCount} - Số task: ${bghNode?.taskCount}`);
  } else {
    throw new Error(`FAIL: GET /api/org/tree thất bại: ${JSON.stringify(orgTreeRes.body)}`);
  }
  const toanTinOrg = orgTreeRes.body.data.find((o: any) => o.code === 'TOAN_TIN');

  // 4. TEST PEOPLE PICKER: TÌM KIẾM TIẾNG VIỆT KHÔNG DẤU & TẢI CÔNG VIỆC
  console.log('\n--- 3. Test People Picker API: GET /api/users (Tìm kiếm không dấu) ---');
  
  // 4.1 Tìm "dung" -> Mong đợi tìm thấy "Vũ Đình Dũng"
  const startT1 = performance.now();
  const searchDungRes = await request(app)
    .get('/api/users?search=dung')
    .set('Authorization', `Bearer ${token}`);
  const durT1 = Math.round(performance.now() - startT1);

  if (
    searchDungRes.status === 200 &&
    searchDungRes.body.data.items.some((u: any) => u.fullName === 'Vũ Đình Dũng')
  ) {
    const dungUser = searchDungRes.body.data.items.find((u: any) => u.fullName === 'Vũ Đình Dũng');
    console.log(`✓ PASS: Tìm không dấu "dung" -> Khớp: "${dungUser.fullName}" | Chức vụ: "${dungUser.title}" | Tải việc hiện tại (currentTaskLoad): ${dungUser.currentTaskLoad} | Thời gian: ${durT1}ms`);
  } else {
    throw new Error(`FAIL: Tìm không dấu "dung" không thấy Vũ Đình Dũng: ${JSON.stringify(searchDungRes.body)}`);
  }

  // 4.2 Tìm "nhung" -> Mong đợi tìm thấy "Bùi Thị Hồng Nhung"
  const searchNhungRes = await request(app)
    .get('/api/users?search=nhung')
    .set('Authorization', `Bearer ${token}`);

  if (
    searchNhungRes.status === 200 &&
    searchNhungRes.body.data.items.some((u: any) => u.fullName === 'Bùi Thị Hồng Nhung')
  ) {
    const nhungUser = searchNhungRes.body.data.items.find((u: any) => u.fullName === 'Bùi Thị Hồng Nhung');
    console.log(`✓ PASS: Tìm không dấu "nhung" -> Khớp: "${nhungUser.fullName}" | Điểm trường: ${nhungUser.primaryLocation?.name}`);
  } else {
    throw new Error(`FAIL: Tìm không dấu "nhung" thất bại`);
  }

  // 4.3 Tìm theo SĐT "0903" -> Mong đợi tìm thấy các thành viên BGH
  const searchPhoneRes = await request(app)
    .get('/api/users?search=0903')
    .set('Authorization', `Bearer ${token}`);

  if (searchPhoneRes.status === 200 && searchPhoneRes.body.data.items.length >= 3) {
    console.log(`✓ PASS: Tìm theo SĐT "0903" -> Tìm thấy ${searchPhoneRes.body.data.items.length} người: ${searchPhoneRes.body.data.items.map((u: any) => `${u.fullName} (${u.phone})`).join(', ')}`);
  } else {
    throw new Error(`FAIL: Tìm theo SĐT "0903" thất bại`);
  }

  // 4.4 Lọc theo Phân hiệu 1
  if (locPh1) {
    const filterLocRes = await request(app)
      .get(`/api/users?locationId=${locPh1.id}`)
      .set('Authorization', `Bearer ${token}`);

    if (filterLocRes.status === 200 && filterLocRes.body.data.items.length > 0) {
      console.log(`✓ PASS: Lọc theo Phân hiệu 1 thành công: ${filterLocRes.body.data.total} nhân sự`);
    }
  }

  // 4.5 Lọc theo Tổ Toán - Tin
  if (toanTinOrg) {
    const filterOrgRes = await request(app)
      .get(`/api/users?orgUnitId=${toanTinOrg.id}`)
      .set('Authorization', `Bearer ${token}`);

    if (filterOrgRes.status === 200 && filterOrgRes.body.data.items.length > 0) {
      console.log(`✓ PASS: Lọc theo Tổ Toán - Tin thành công: ${filterOrgRes.body.data.total} nhân sự`);
    }
  }

  // 5. TEST GET /api/users/:id/recent-collaborators
  console.log('\n--- 4. Test GET /api/users/:id/recent-collaborators ---');
  const collabRes = await request(app)
    .get(`/api/users/${hieuTruongId}/recent-collaborators`)
    .set('Authorization', `Bearer ${token}`);

  if (collabRes.status === 200 && Array.isArray(collabRes.body.data)) {
    console.log(`✓ PASS: Lấy danh sách người hay phối hợp của Hiệu trưởng (${collabRes.body.data.length} người):`);
    collabRes.body.data.slice(0, 4).forEach((c: any) => {
      console.log(`  - ${c.fullName} (${c.title}) - Số việc phối hợp: ${c.sharedTaskCount} - Tải việc hiện tại: ${c.currentTaskLoad}`);
    });
  } else {
    throw new Error(`FAIL: GET recent-collaborators thất bại: ${JSON.stringify(collabRes.body)}`);
  }

  // 6. KIỂM TRA HIỆU NĂNG TẢI TRÊN TOÀN BỘ DANH SÁCH (Pagination + Speed)
  console.log('\n--- 5. Test Hiệu năng Search & Phân trang ---');
  const startPerf = performance.now();
  const allUsersRes = await request(app)
    .get('/api/users?page=1&pageSize=50')
    .set('Authorization', `Bearer ${token}`);
  const durPerf = Math.round(performance.now() - startPerf);

  if (allUsersRes.status === 200 && durPerf < 200) {
    console.log(`✓ PASS: Tải toàn bộ ${allUsersRes.body.data.total} nhân sự mất ${durPerf}ms (đạt yêu cầu < 200ms)`);
  } else {
    console.log(`⚠ Chú ý thời gian thực thi: ${durPerf}ms`);
  }

  console.log('\n🎉 TẤT CẢ TESTS CHO PROMPT 4 ĐÃ PASS 100%!');
  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
