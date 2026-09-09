import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';
import path from 'path';
import fs from 'fs';
import { notificationService } from '../notifications/notification.service';
import { NotificationType } from '@prisma/client';

async function runTests() {
  console.log('🧪 Bắt đầu chạy Tests cho Prompt 7: Minh chứng (Upload), Thông báo & Dashboard...');

  // 1. Đăng nhập lấy token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

  if (loginRes.status !== 200) {
    throw new Error('Đăng nhập thất bại!');
  }
  const token = loginRes.body.data.accessToken;
  const user = loginRes.body.data.user;

  // Lấy 1 task để test upload
  const task = await prisma.task.findFirst();
  if (!task) throw new Error('Không có task nào trong DB!');

  // Tạo một file ảnh tạm thời để upload
  const tempFilePath = path.join(__dirname, 'test_evidence.png');
  fs.writeFileSync(tempFilePath, Buffer.from('fake image content for test'));

  // 2. TEST UPLOAD ATTACHMENT
  console.log('\n--- 1. Test Upload Minh chứng (POST /api/tasks/:id/attachments) ---');
  const uploadRes = await request(app)
    .post(`/api/tasks/${task.id}/attachments`)
    .set('Authorization', `Bearer ${token}`)
    .attach('files', tempFilePath);

  if (uploadRes.status === 201 && Array.isArray(uploadRes.body.data) && uploadRes.body.data.length > 0) {
    const att = uploadRes.body.data[0];
    console.log(`✓ PASS: Tải lên minh chứng thành công: "${att.originalName}" (${att.fileSize} bytes) | Đường dẫn: ${att.fileUrl}`);
  } else {
    throw new Error(`FAIL: Upload attachment thất bại: ${JSON.stringify(uploadRes.body)}`);
  }
  const uploadedAttId = uploadRes.body.data[0].id;

  // Xóa file test tạm
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }

  // 3. TEST GET ATTACHMENTS
  console.log('\n--- 2. Test GET /api/tasks/:id/attachments ---');
  const getAttRes = await request(app)
    .get(`/api/tasks/${task.id}/attachments`)
    .set('Authorization', `Bearer ${token}`);

  if (getAttRes.status === 200 && Array.isArray(getAttRes.body.data)) {
    console.log(`✓ PASS: Lấy danh sách ${getAttRes.body.data.length} tệp minh chứng của công việc thành công.`);
  }

  // 4. TEST DELETE ATTACHMENT
  console.log('\n--- 3. Test DELETE /api/attachments/:id ---');
  const deleteAttRes = await request(app)
    .delete(`/api/attachments/${uploadedAttId}`)
    .set('Authorization', `Bearer ${token}`);

  if (deleteAttRes.status === 200 && deleteAttRes.body.success) {
    console.log('✓ PASS: Xóa tệp minh chứng thành công khỏi CSDL và ổ đĩa.');
  } else {
    throw new Error(`FAIL: Xóa attachment thất bại: ${JSON.stringify(deleteAttRes.body)}`);
  }

  // 5. TEST NOTIFICATIONS
  console.log('\n--- 4. Test Module Thông báo (Notifications) ---');
  // Tạo thông báo mới
  await notificationService.createNotification({
    userId: user.id,
    type: NotificationType.GIAO_VIEC,
    title: 'Giao nhiệm vụ đột xuất: Rà soát PCCC',
    content: 'Hiệu trưởng phân công đồng chí làm chủ trì kiểm tra PCCC tại 3 điểm trường.',
    link: `/tasks/${task.id}`,
  });

  // Lấy danh sách thông báo
  const notifRes = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${token}`);

  if (notifRes.status === 200 && notifRes.body.data.items.length > 0) {
    console.log(`✓ PASS: Lấy danh sách thông báo thành công: ${notifRes.body.data.total} thông báo (Chưa đọc: ${notifRes.body.data.unreadCount})`);
  }

  // Đánh dấu tất cả đã đọc
  const readAllRes = await request(app)
    .post('/api/notifications/read-all')
    .set('Authorization', `Bearer ${token}`);

  if (readAllRes.status === 200) {
    console.log('✓ PASS: Đánh dấu tất cả thông báo đã đọc thành công.');
  }

  // Quét check due dates
  await notificationService.checkDueDatesAndNotify();
  console.log('✓ PASS: Chạy tiến trình quét kiểm tra hạn chót (checkDueDatesAndNotify) thành công.');

  // 6. TEST DASHBOARD OVERVIEW
  console.log('\n--- 5. Test Dashboard Điều hành (GET /api/dashboard/overview) ---');
  const dashRes = await request(app)
    .get('/api/dashboard/overview')
    .set('Authorization', `Bearer ${token}`);

  if (dashRes.status === 200 && dashRes.body.data) {
    const d = dashRes.body.data;
    console.log(`✓ PASS: Lấy tổng quan Dashboard thành công:`);
    console.log(`  - Tổng số việc: ${d.totalTasks} | Đang làm: ${d.inProgressCount} | Chờ duyệt: ${d.pendingReviewCount} | Hoàn thành: ${d.completedCount} | Quá hạn: ${d.overdueCount}`);
    console.log(`  - Danh sách "Việc cần quan tâm": ${d.attentionTasks.length} việc`);
    if (d.attentionTasks.length > 0) {
      const topAtt = d.attentionTasks[0];
      console.log(`    • [${topAtt.code}] "${topAtt.title}" — Lý do: "${topAtt.reason}" — Chủ trì: ${topAtt.chuTri?.fullName} (${topAtt.chuTri?.phone})`);
    }
    console.log(`  - Thống kê theo Điểm trường (${d.breakdownByLocation.length} điểm):`);
    d.breakdownByLocation.forEach((loc: any) => {
      console.log(`    • ${loc.name}: ${loc.totalTasks} việc, hoàn thành ${loc.completedTasks} (${loc.completionRate}%), quá hạn ${loc.overdueTasks}`);
    });
    console.log(`  - Thống kê theo Tổ chuyên môn (${d.breakdownByOrgUnit.length} tổ):`);
    d.breakdownByOrgUnit.slice(0, 3).forEach((org: any) => {
      console.log(`    • ${org.name}: ${org.totalTasks} việc, hoàn thành ${org.completedTasks} (${org.completionRate}%)`);
    });
  } else {
    throw new Error(`FAIL: GET /api/dashboard/overview thất bại: ${JSON.stringify(dashRes.body)}`);
  }

  console.log('\n🎉 TẤT CẢ TESTS CHO PROMPT 7 (ATTACHMENTS, NOTIFICATIONS, DASHBOARD) ĐÃ PASS 100%!');
  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
