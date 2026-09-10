import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';
import { Role } from '@prisma/client';

async function runTests() {
  console.log('🧪 Bắt đầu chạy Tests cho Module Quản trị (Admin Module & Location Extensions)...');

  // 1. Đăng nhập tài khoản Hiệu trưởng (Có quyền Admin)
  const htLogin = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

  if (htLogin.status !== 200) {
    throw new Error('Đăng nhập Hiệu trưởng thất bại!');
  }
  const htToken = htLogin.body.data.accessToken;
  const htUser = htLogin.body.data.user;
  const schoolId = htUser.schoolId;

  // 2. Đăng nhập tài khoản Giáo viên (KHÔNG có quyền Admin)
  const gvLogin = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'binh.nv@phuoctan.edu.vn', password: '123456' });

  if (gvLogin.status !== 200) {
    throw new Error('Đăng nhập Giáo viên thất bại!');
  }
  const gvToken = gvLogin.body.data.accessToken;

  // ==========================================
  // PHẦN 1: TEST KIỂM SOÁT TRUY CẬP (RBAC)
  // ==========================================
  console.log('\n--- 1. Test Quyền truy cập Admin (requireRole: ADMIN, HIEU_TRUONG) ---');

  // 1.1 Giáo viên gọi GET /api/admin/users -> 403 Forbidden
  const gvForbiddenRes = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${gvToken}`);

  if (gvForbiddenRes.status === 403) {
    console.log('✓ PASS: Giáo viên bị chặn 403 Forbidden khi truy cập /api/admin/users.');
  } else {
    throw new Error(`FAIL: Mong đợi 403 nhưng nhận ${gvForbiddenRes.status}: ${JSON.stringify(gvForbiddenRes.body)}`);
  }

  // 1.2 Hiệu trưởng gọi GET /api/admin/users -> 200 OK
  const htUsersRes = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${htToken}`);

  if (htUsersRes.status === 200 && Array.isArray(htUsersRes.body.data.items)) {
    console.log(`✓ PASS: Hiệu trưởng truy cập thành công danh sách ${htUsersRes.body.data.total} tài khoản.`);
  } else {
    throw new Error(`FAIL: Hiệu trưởng không lấy được danh sách user: ${JSON.stringify(htUsersRes.body)}`);
  }

  // ==========================================
  // PHẦN 2: TEST QUẢN LÝ TÀI KHOẢN (USER MANAGEMENT)
  // ==========================================
  console.log('\n--- 2. Test Quản lý Tài khoản (CRUD, Status, Reset Password) ---');

  // 2.1 GET /api/admin/users với filter & search
  const filterRes = await request(app)
    .get('/api/admin/users?role=GIAO_VIEN&status=active&page=1&pageSize=10')
    .set('Authorization', `Bearer ${htToken}`);

  if (filterRes.status === 200 && filterRes.body.data.items.length > 0) {
    const firstItem = filterRes.body.data.items[0];
    if (firstItem.email && firstItem.isActive !== undefined && Array.isArray(firstItem.roles) && firstItem.createdAt) {
      console.log(`✓ PASS: GET /api/admin/users trả đầy đủ email, isActive, roles, createdAt (${filterRes.body.data.total} users).`);
    } else {
      throw new Error('FAIL: Dữ liệu user trả về thiếu các trường mở rộng.');
    }
  } else {
    throw new Error(`FAIL: Lọc user theo role/status thất bại: ${JSON.stringify(filterRes.body)}`);
  }

  // 2.2 POST /api/admin/users - Tạo tài khoản mới
  const testPhone = '0988776655';
  const testEmail = 'canbo.test@phuoctan.edu.vn';

  // Dọn dẹp nếu đã tồn tại từ trước
  await prisma.user.deleteMany({ where: { phone: testPhone } });

  const createRes = await request(app)
    .post('/api/admin/users')
    .set('Authorization', `Bearer ${htToken}`)
    .send({
      fullName: 'Nguyễn Văn Kiểm Thử',
      phone: testPhone,
      email: testEmail,
      position: 'Cán bộ CNTT',
      roles: [{ role: Role.NHAN_VIEN }],
    });

  if (createRes.status === 201 && createRes.body.data.id) {
    console.log(`✓ PASS: Tạo tài khoản mới thành công (ID: ${createRes.body.data.id}, Mật khẩu mặc định 123456).`);
  } else {
    throw new Error(`FAIL: Tạo user thất bại: ${JSON.stringify(createRes.body)}`);
  }
  const createdUserId = createRes.body.data.id;

  // 2.3 Validate không cho trùng SĐT hoặc Email
  const dupPhoneRes = await request(app)
    .post('/api/admin/users')
    .set('Authorization', `Bearer ${htToken}`)
    .send({
      fullName: 'Người Trùng SĐT',
      phone: testPhone,
      email: 'khac.email@phuoctan.edu.vn',
    });

  if (dupPhoneRes.status === 400 && dupPhoneRes.body.message?.includes('Số điện thoại')) {
    console.log('✓ PASS: Chặn tạo tài khoản trùng số điện thoại.');
  } else {
    throw new Error(`FAIL: Không chặn trùng số điện thoại: ${JSON.stringify(dupPhoneRes.body)}`);
  }

  // 2.4 PATCH /api/admin/users/:id - Sửa thông tin cơ bản
  const patchUserRes = await request(app)
    .patch(`/api/admin/users/${createdUserId}`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({
      fullName: 'Nguyễn Văn Kiểm Thử Đã Sửa',
      position: 'Chuyên viên Công nghệ',
    });

  if (patchUserRes.status === 200 && patchUserRes.body.data.fullName === 'Nguyễn Văn Kiểm Thử Đã Sửa') {
    console.log('✓ PASS: Sửa thông tin cơ bản tài khoản thành công.');
  } else {
    throw new Error(`FAIL: Sửa thông tin user thất bại: ${JSON.stringify(patchUserRes.body)}`);
  }

  // 2.5 PATCH /api/admin/users/:id/status - Khoá tài khoản & test chặn login
  const lockRes = await request(app)
    .patch(`/api/admin/users/${createdUserId}/status`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({ isActive: false });

  if (lockRes.status === 200 && lockRes.body.data.isActive === false) {
    console.log('✓ PASS: Khoá tài khoản thành công (isActive = false).');
  } else {
    throw new Error(`FAIL: Khoá tài khoản thất bại: ${JSON.stringify(lockRes.body)}`);
  }

  // Test đăng nhập bằng tài khoản vừa bị khoá
  const lockedLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: testEmail, password: '123456' });

  if (lockedLoginRes.status === 403 && lockedLoginRes.body.message?.includes('khóa')) {
    console.log(`✓ PASS: Chặn đăng nhập tài khoản đã bị khoá với thông báo: "${lockedLoginRes.body.message}"`);
  } else {
    throw new Error(`FAIL: Tài khoản bị khoá vẫn đăng nhập được hoặc sai mã lỗi: ${JSON.stringify(lockedLoginRes.body)}`);
  }

  // Mở khoá lại tài khoản
  const unlockRes = await request(app)
    .patch(`/api/admin/users/${createdUserId}/status`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({ isActive: true });

  if (unlockRes.status === 200 && unlockRes.body.data.isActive === true) {
    console.log('✓ PASS: Mở khoá lại tài khoản thành công.');
  }

  // 2.6 POST /api/admin/users/:id/reset-password - Đặt lại mật khẩu
  const resetPassRes = await request(app)
    .post(`/api/admin/users/${createdUserId}/reset-password`)
    .set('Authorization', `Bearer ${htToken}`);

  if (resetPassRes.status === 200) {
    // Đăng nhập lại với mật khẩu 123456 xem thành công không
    const reLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: testEmail, password: '123456' });

    if (reLoginRes.status === 200) {
      console.log('✓ PASS: Đặt lại mật khẩu về mặc định 123456 thành công và đăng nhập được.');
    } else {
      throw new Error(`FAIL: Đăng nhập sau reset password thất bại: ${JSON.stringify(reLoginRes.body)}`);
    }
  } else {
    throw new Error(`FAIL: Reset password thất bại: ${JSON.stringify(resetPassRes.body)}`);
  }

  // ==========================================
  // PHẦN 3: TEST CẤU HÌNH PHÂN QUYỀN (ROLES)
  // ==========================================
  console.log('\n--- 3. Test Cấu hình Phân quyền (Roles & Permissions Matrix) ---');

  // 3.1 POST /api/admin/users/:id/roles - Thêm vai trò
  const addRoleRes = await request(app)
    .post(`/api/admin/users/${createdUserId}/roles`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({ role: Role.TO_TRUONG });

  if (addRoleRes.status === 201 && addRoleRes.body.data.role === Role.TO_TRUONG) {
    console.log('✓ PASS: Thêm vai trò mới (TO_TRUONG) cho tài khoản thành công.');
  } else {
    throw new Error(`FAIL: Thêm role thất bại: ${JSON.stringify(addRoleRes.body)}`);
  }
  const addedRoleId = addRoleRes.body.data.id;

  // 3.2 Test chặn trùng lặp vai trò y hệt
  const dupRoleRes = await request(app)
    .post(`/api/admin/users/${createdUserId}/roles`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({ role: Role.TO_TRUONG });

  if (dupRoleRes.status === 400 && dupRoleRes.body.message?.includes('đã tồn tại')) {
    console.log('✓ PASS: Chặn thêm vai trò + phạm vi trùng lặp.');
  } else {
    throw new Error(`FAIL: Không chặn trùng role: ${JSON.stringify(dupRoleRes.body)}`);
  }

  // 3.3 DELETE /api/admin/users/:id/roles/:userRoleId - Gỡ vai trò
  const deleteRoleRes = await request(app)
    .delete(`/api/admin/users/${createdUserId}/roles/${addedRoleId}`)
    .set('Authorization', `Bearer ${htToken}`);

  if (deleteRoleRes.status === 200) {
    console.log('✓ PASS: Gỡ 1 vai trò thành công.');
  } else {
    throw new Error(`FAIL: Gỡ role thất bại: ${JSON.stringify(deleteRoleRes.body)}`);
  }

  // 3.4 Test chặn gỡ vai trò cuối cùng của tài khoản
  const userAfterDel = await prisma.user.findUnique({
    where: { id: createdUserId },
    include: { roles: true },
  });
  const lastRoleId = userAfterDel?.roles[0].id;

  if (lastRoleId) {
    const delLastRoleRes = await request(app)
      .delete(`/api/admin/users/${createdUserId}/roles/${lastRoleId}`)
      .set('Authorization', `Bearer ${htToken}`);

    if (delLastRoleRes.status === 400 && delLastRoleRes.body.message?.includes('vai trò cuối cùng')) {
      console.log('✓ PASS: Chặn không cho gỡ vai trò cuối cùng của tài khoản.');
    } else {
      throw new Error(`FAIL: Không chặn gỡ vai trò cuối: ${JSON.stringify(delLastRoleRes.body)}`);
    }
  }

  // 3.5 GET /api/admin/permissions-matrix
  const matrixRes = await request(app)
    .get('/api/admin/permissions-matrix')
    .set('Authorization', `Bearer ${htToken}`);

  if (matrixRes.status === 200 && Array.isArray(matrixRes.body.data) && matrixRes.body.data.length === 6) {
    console.log(`✓ PASS: GET /api/admin/permissions-matrix trả về đúng bảng ma trận 6 vai trò (${matrixRes.body.data.map((m: any) => m.role).join(', ')}).`);
  } else {
    throw new Error(`FAIL: permissions-matrix thất bại: ${JSON.stringify(matrixRes.body)}`);
  }

  // 3.6 TEST TỔ TRƯỞNG & OVERWRITE TỔ TRƯỞNG CŨ
  console.log('\n--- 3.6 Test Đánh dấu Tổ trưởng & Tự động Overwrite Tổ trưởng cũ ---');
  const toanTinOrg = await prisma.orgUnit.findFirst({ where: { code: 'TOAN_TIN' } });
  if (toanTinOrg) {
    const dungOldLeader = await prisma.user.findUnique({
      where: { email: 'dung.vd@phuoctan.edu.vn' },
      include: { roles: true },
    });

    // Tạo mới 1 giáo viên và đánh dấu là Tổ trưởng Tổ Toán - Tin
    const newLeaderEmail = `totruong.test.${Date.now()}@phuoctan.edu.vn`;
    const newLeaderPhone = `0988${Math.floor(100000 + Math.random() * 900000)}`;
    const createNewLeaderRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${htToken}`)
      .send({
        fullName: 'Trần Văn Tổ Trưởng Mới',
        phone: newLeaderPhone,
        email: newLeaderEmail,
        position: 'Giáo viên Toán',
        orgUnitId: toanTinOrg.id,
        isToTruong: true,
      });

    if (createNewLeaderRes.status === 201) {
      const createdLeader = createNewLeaderRes.body.data;
      const hasToTruong = createdLeader.roles.some((r: any) => r.role === Role.TO_TRUONG);
      if (hasToTruong) {
        console.log(`✓ PASS: Tạo mới nhân sự với cờ isToTruong: true thành công (Vai trò: TO_TRUONG, Tổ: ${toanTinOrg.name}).`);
      } else {
        throw new Error('FAIL: User mới không có vai trò TO_TRUONG');
      }

      // Kiểm tra Thầy Dũng cũ đã bị overwrite gỡ TO_TRUONG chưa
      const dungAfterOverwrite = await prisma.user.findUnique({
        where: { email: 'dung.vd@phuoctan.edu.vn' },
        include: { roles: true },
      });
      const dungStillHasToTruong = dungAfterOverwrite?.roles.some((r) => r.role === Role.TO_TRUONG);
      if (!dungStillHasToTruong) {
        console.log('✓ PASS: Tự động overwrite: Tổ trưởng cũ (Vũ Đình Dũng) đã được chuyển giao và hạ về Giáo viên.');
      } else {
        throw new Error('FAIL: Tổ trưởng cũ không bị gỡ vai trò TO_TRUONG');
      }

      // Khôi phục lại Thầy Dũng làm Tổ trưởng qua PATCH /api/admin/users/:id
      if (dungOldLeader) {
        const restoreDungRes = await request(app)
          .patch(`/api/admin/users/${dungOldLeader.id}`)
          .set('Authorization', `Bearer ${htToken}`)
          .send({ isToTruong: true, orgUnitId: toanTinOrg.id });

        if (restoreDungRes.status === 200) {
          console.log('✓ PASS: Khôi phục lại Tổ trưởng cũ qua PATCH updateUser(isToTruong: true) thành công.');
        }
      }

      // Dọn dẹp tài khoản test
      await prisma.user.delete({ where: { id: createdLeader.id } });
    }
  }

  // 2.7 DELETE /api/admin/users/:id - Xoá tài khoản chưa gắn dữ liệu
  const deleteCleanUserRes = await request(app)
    .delete(`/api/admin/users/${createdUserId}`)
    .set('Authorization', `Bearer ${htToken}`);

  if (deleteCleanUserRes.status === 200) {
    console.log('✓ PASS: Xoá tài khoản sạch (chưa phát sinh Task) thành công.');
  } else {
    throw new Error(`FAIL: Xoá user sạch thất bại: ${JSON.stringify(deleteCleanUserRes.body)}`);
  }

  // 2.8 Test chặn xoá tài khoản ĐÃ có Task (ví dụ Giáo viên Nguyễn Văn Bình)
  const gvUserInDb = await prisma.user.findUnique({ where: { email: 'binh.nv@phuoctan.edu.vn' } });
  if (gvUserInDb) {
    const deleteGvRes = await request(app)
      .delete(`/api/admin/users/${gvUserInDb.id}`)
      .set('Authorization', `Bearer ${htToken}`);

    if (deleteGvRes.status === 400 && deleteGvRes.body.message?.includes('Khoá tài khoản')) {
      console.log(`✓ PASS: Chặn xoá tài khoản đã có dữ liệu công việc với thông báo: "${deleteGvRes.body.message}"`);
    } else {
      throw new Error(`FAIL: Không chặn xoá tài khoản có dữ liệu task: ${JSON.stringify(deleteGvRes.body)}`);
    }
  }

  // ==========================================
  // PHẦN 4: TEST MỞ RỘNG ĐIỂM TRƯỜNG (LOCATIONS)
  // ==========================================
  console.log('\n--- 4. Test Mở rộng API Điểm trường (Location PATCH, Summary, DELETE Guard) ---');

  const locs = await prisma.location.findMany({ where: { schoolId } });
  const locPh2 = locs.find((l) => l.code === 'PHAN_HIEU_2') || locs[0];

  // 4.1 PATCH /api/locations/:id - Cập nhật người phụ trách (managerId) và thông tin
  const patchLocRes = await request(app)
    .patch(`/api/locations/${locPh2.id}`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({
      phone: '0251.3888.999',
      managerId: htUser.id,
    });

  if (patchLocRes.status === 200 && patchLocRes.body.data.manager?.id === htUser.id) {
    console.log(`✓ PASS: PATCH /api/locations/:id cập nhật người phụ trách (${patchLocRes.body.data.manager.fullName}) và SĐT thành công.`);
  } else {
    throw new Error(`FAIL: PATCH /api/locations/:id thất bại: ${JSON.stringify(patchLocRes.body)}`);
  }

  // 4.2 GET /api/locations/:id/summary - Thẻ tổng quan điểm trường
  const summaryRes = await request(app)
    .get(`/api/locations/${locPh2.id}/summary`)
    .set('Authorization', `Bearer ${htToken}`);

  if (
    summaryRes.status === 200 &&
    typeof summaryRes.body.data.userCount === 'number' &&
    typeof summaryRes.body.data.inProgressTaskCount === 'number' &&
    typeof summaryRes.body.data.overdueTaskCount === 'number'
  ) {
    console.log(`✓ PASS: GET /api/locations/:id/summary: Nhân sự=${summaryRes.body.data.userCount}, Đang thực hiện=${summaryRes.body.data.inProgressTaskCount}, Quá hạn=${summaryRes.body.data.overdueTaskCount}, Tổng việc=${summaryRes.body.data.totalTaskCount}`);
  } else {
    throw new Error(`FAIL: GET /api/locations/:id/summary thất bại: ${JSON.stringify(summaryRes.body)}`);
  }

  // 4.3 DELETE /api/locations/:id - Chặn xoá điểm trường đang có nhân sự/công việc
  const delLocRes = await request(app)
    .delete(`/api/locations/${locPh2.id}`)
    .set('Authorization', `Bearer ${htToken}`);

  if (delLocRes.status === 400 && delLocRes.body.message?.includes('nhân sự')) {
    console.log(`✓ PASS: Chặn xoá điểm trường có nhân sự/công việc: "${delLocRes.body.message}"`);
  } else {
    throw new Error(`FAIL: Không chặn xoá điểm trường có dữ liệu: ${JSON.stringify(delLocRes.body)}`);
  }

  // ==========================================
  // PHẦN 5: TEST NHẬT KÝ KIỂM TOÁN (ADMIN AUDIT LOG)
  // ==========================================
  console.log('\n--- 5. Test Nhật ký kiểm toán Admin (AdminAuditLog) ---');

  const auditLogs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { actorUser: { select: { fullName: true } } },
  });

  if (auditLogs.length > 0) {
    console.log(`✓ PASS: Đã ghi nhận ${auditLogs.length} dòng log kiểm toán gần nhất:`);
    auditLogs.slice(0, 5).forEach((log) => {
      console.log(`  - [${log.action}] ${log.targetType} (#${log.targetId.slice(0, 8)}) bởi ${log.actorUser?.fullName}: ${log.detail}`);
    });
  } else {
    throw new Error('FAIL: Không tìm thấy bản ghi AdminAuditLog nào được tạo!');
  }

  console.log('\n🎉 TẤT CẢ TESTS CHO MODULE QUẢN TRỊ (ADMIN MODULE) ĐÃ PASS 100%!');
  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
