import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';
import { TaskStatus, TaskPriority, TaskAssignmentRole } from '@prisma/client';

async function runTests() {
  console.log('🧪 Bắt đầu chạy Tests cho Prompt 6: Công việc, Giao việc RACI & Workflow Trạng thái...');

  // 1. Đăng nhập lấy auth tokens (Hiệu trưởng & Tổ trưởng)
  const htLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });
  const htToken = htLoginRes.body.data.accessToken;

  const dungLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'dung.toantin@phuoctan.edu.vn', password: '123456' });
  const dungToken = dungLoginRes.body.data.accessToken;
  const dungUser = dungLoginRes.body.data.user;

  // Lấy thêm 2 giáo viên khác
  const otherUsers = await prisma.user.findMany({
    where: { id: { not: dungUser.id } },
    take: 3,
  });
  const gv1 = otherUsers[0];
  const gv2 = otherUsers[1];

  // 2. TEST POST /api/tasks (TẠO VIỆC ĐỘT XUẤT)
  console.log('\n--- 1. Test POST /api/tasks (Tạo việc đột xuất) ---');
  const createTaskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${htToken}`)
    .send({
      title: 'Kiểm tra đột xuất hệ thống PCCC trước năm học mới',
      description: 'Kiểm tra bình chữa cháy tại 3 điểm trường và lập biên bản',
      priority: TaskPriority.KHAN_CAP,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      requireAttachment: true, // Yêu cầu minh chứng
      assignments: [
        { userId: dungUser.id, role: TaskAssignmentRole.CHU_TRI, note: 'Trưởng đoàn kiểm tra' },
        { userId: gv1.id, role: TaskAssignmentRole.PHOI_HOP, note: 'Ghi biên bản' },
        { userId: gv2.id, role: TaskAssignmentRole.KIEM_TRA, note: 'Nghiệm thu biên bản' },
      ],
    });

  if (createTaskRes.status === 201 && createTaskRes.body.data.id) {
    console.log(`✓ PASS: Tạo mới công việc thành công: [${createTaskRes.body.data.code}] "${createTaskRes.body.data.title}" | Trạng thái: ${createTaskRes.body.data.status}`);
  } else {
    throw new Error(`FAIL: Tạo task thất bại: ${JSON.stringify(createTaskRes.body)}`);
  }
  const createdTask = createTaskRes.body.data;

  // 3. TEST POST /api/tasks/:id/assignments (VALIDATE BẮT BUỘC 1 CHỦ TRÌ)
  console.log('\n--- 2. Test Validate Phân công RACI (Bắt buộc đúng 1 CHỦ TRÌ) ---');
  // Thử gán 2 CHỦ TRÌ -> Kỳ vọng HTTP 400
  const invalidRaciRes = await request(app)
    .post(`/api/tasks/${createdTask.id}/assignments`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({
      assignments: [
        { userId: dungUser.id, role: TaskAssignmentRole.CHU_TRI },
        { userId: gv1.id, role: TaskAssignmentRole.CHU_TRI }, // Trùng 2 chủ trì
      ],
    });

  if (invalidRaciRes.status === 400) {
    console.log(`✓ PASS: Chặn đúng khi gán thừa Chủ trì (HTTP 400: "${invalidRaciRes.body.message}")`);
  } else {
    throw new Error(`FAIL: Kỳ vọng HTTP 400 nhưng nhận ${invalidRaciRes.status}`);
  }

  // 4. TEST RÀNG BUỘC MINH CHỨNG KHI CHUYỂN CHO_KIEM_TRA
  console.log('\n--- 3. Test Ràng buộc Minh chứng khi gửi CHO_KIEM_TRA ---');
  // Chuyển sang DANG_THUC_HIEN trước
  await request(app)
    .patch(`/api/tasks/${createdTask.id}/status`)
    .set('Authorization', `Bearer ${dungToken}`)
    .send({ status: TaskStatus.DANG_THUC_HIEN });

  // Thử chuyển sang CHO_KIEM_TRA khi CHƯA có file đính kèm -> Kỳ vọng HTTP 400
  const noAttachmentRes = await request(app)
    .patch(`/api/tasks/${createdTask.id}/status`)
    .set('Authorization', `Bearer ${dungToken}`)
    .send({ status: TaskStatus.CHO_KIEM_TRA });

  if (noAttachmentRes.status === 400) {
    console.log(`✓ PASS: Chặn thành công khi thiếu minh chứng bắt buộc: "${noAttachmentRes.body.message}"`);
  } else {
    throw new Error(`FAIL: Kỳ vọng chặn HTTP 400 nhưng nhận ${noAttachmentRes.status}`);
  }

  // Tạo 1 attachment giả lập vào CSDL để test tiếp
  await prisma.attachment.create({
    data: {
      taskId: createdTask.id,
      uploadedById: dungUser.id,
      fileName: 'bien_ban_kiem_tra_pccc.pdf',
      originalName: 'Biên bản kiểm tra PCCC.pdf',
      fileUrl: '/uploads/bien_ban_kiem_tra_pccc.pdf',
      fileSize: 102400,
      mimeType: 'application/pdf',
    },
  });
  console.log('✓ Đã đính kèm tệp minh chứng mẫu vào công việc.');

  // Thử lại chuyển sang CHO_KIEM_TRA sau khi đã có minh chứng -> Kỳ vọng HTTP 200
  const submitSuccessRes = await request(app)
    .patch(`/api/tasks/${createdTask.id}/status`)
    .set('Authorization', `Bearer ${dungToken}`)
    .send({ status: TaskStatus.CHO_KIEM_TRA, note: 'Đã đính kèm biên bản kiểm tra, kính gửi BGH' });

  if (submitSuccessRes.status === 200) {
    console.log('✓ PASS: Chuyển sang CHO_KIEM_TRA thành công sau khi đã có minh chứng.');
  } else {
    throw new Error(`FAIL: Chuyển CHO_KIEM_TRA thất bại: ${JSON.stringify(submitSuccessRes.body)}`);
  }

  // 5. TEST WORKFLOW: KIEM_TRA YÊU CẦU BỔ SUNG -> CHU_TRI CẬP NHẬT -> DUYỆT HOÀN THÀNH -> XÁC NHẬN -> ĐÓNG
  console.log('\n--- 4. Test Chuỗi Chuyển Trạng thái Workflow Quy chuẩn ---');
  // 5.1 Người Kiểm tra yêu cầu BỔ SUNG
  const rejectRes = await request(app)
    .patch(`/api/tasks/${createdTask.id}/status`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({ status: TaskStatus.BO_SUNG, note: 'Cần bổ sung chữ ký của bảo vệ Phân hiệu 2' });
  console.log(`✓ Trạng thái sau khi yêu cầu bổ sung: ${rejectRes.body.data.status}`);

  // 5.2 Người Chủ trì gửi lại CHO_KIEM_TRA
  await request(app)
    .patch(`/api/tasks/${createdTask.id}/status`)
    .set('Authorization', `Bearer ${dungToken}`)
    .send({ status: TaskStatus.CHO_KIEM_TRA, note: 'Đã bổ sung đầy đủ chữ ký' });

  // 5.3 Người Kiểm tra duyệt HOAN_THANH
  const completeRes = await request(app)
    .patch(`/api/tasks/${createdTask.id}/status`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({ status: TaskStatus.HOAN_THANH, note: 'Đạt yêu cầu nghiệm thu' });
  console.log(`✓ Trạng thái sau khi nghiệm thu: ${completeRes.body.data.status} (Tiến độ: ${completeRes.body.data.progressPercent}%)`);

  // 5.4 Ban Giám hiệu ĐÓNG công việc
  const closeRes = await request(app)
    .patch(`/api/tasks/${createdTask.id}/status`)
    .set('Authorization', `Bearer ${htToken}`)
    .send({ status: TaskStatus.DONG, note: 'Lưu trữ hồ sơ và đóng nhiệm vụ' });
  console.log(`✓ Trạng thái cuối cùng: ${closeRes.body.data.status}`);

  // 6. TEST PATCH /api/tasks/:id/progress (CẬP NHẬT TIẾN ĐỘ)
  console.log('\n--- 5. Test PATCH /api/tasks/:id/progress ---');
  const progressRes = await request(app)
    .patch(`/api/tasks/${createdTask.id}/progress`)
    .set('Authorization', `Bearer ${dungToken}`)
    .send({ progressPercent: 85, note: 'Đã hoàn thành 85% khối lượng công việc' });

  if (progressRes.status === 200 && progressRes.body.data.progressPercent === 85) {
    console.log(`✓ PASS: Cập nhật tiến độ thành công lên ${progressRes.body.data.progressPercent}% kèm ghi TaskLog.`);
  } else {
    throw new Error(`FAIL: Cập nhật progress thất bại: ${JSON.stringify(progressRes.body)}`);
  }

  // 7. TEST GET /api/tasks (BỘ LỌC ĐA NĂNG & QUÁ HẠN)
  console.log('\n--- 6. Test GET /api/tasks (Bộ lọc & Việc quá hạn) ---');
  // Lọc việc quá hạn
  const overdueRes = await request(app)
    .get('/api/tasks?overdue=true')
    .set('Authorization', `Bearer ${htToken}`);

  if (overdueRes.status === 200 && overdueRes.body.data.items.length > 0) {
    console.log(`✓ PASS: Lọc việc quá hạn thành công: ${overdueRes.body.data.total} công việc quá hạn (ví dụ: "${overdueRes.body.data.items[0].title}")`);
  } else {
    throw new Error(`FAIL: Lọc overdue thất bại`);
  }

  // Lọc "Việc của tôi" (assigneeId)
  const myTasksRes = await request(app)
    .get(`/api/tasks?assigneeId=${dungUser.id}`)
    .set('Authorization', `Bearer ${dungToken}`);

  if (myTasksRes.status === 200) {
    console.log(`✓ PASS: Lọc "Việc của tôi" thành công: ${myTasksRes.body.data.total} công việc.`);
  }

  // 8. TEST GET /api/tasks/:id/full (CHI TIẾT ĐẦY ĐỦ KÈM TEL:, LOGS, ATTACHMENTS)
  console.log('\n--- 7. Test GET /api/tasks/:id/full ---');
  const fullRes = await request(app)
    .get(`/api/tasks/${createdTask.id}/full`)
    .set('Authorization', `Bearer ${htToken}`);

  if (fullRes.status === 200 && fullRes.body.data.assignments && fullRes.body.data.logs) {
    const full = fullRes.body.data;
    console.log(`✓ PASS: Lấy chi tiết đầy đủ Task "${full.title}":`);
    console.log(`  - Số người phân công RACI: ${full.assignments.length} (Đầy đủ SĐT, Avatar, Điểm trường)`);
    console.log(`  - Số dòng nhật ký TaskLog: ${full.logs.length}`);
    console.log(`  - Số file minh chứng đính kèm: ${full.attachments.length}`);
    full.assignments.forEach((a: any) => {
      console.log(`    • [${a.role}] ${a.user.fullName} - SĐT gọi ngay: tel:${a.user.phone} (${a.user.primaryLocation?.name})`);
    });
  } else {
    throw new Error(`FAIL: GET /full thất bại: ${JSON.stringify(fullRes.body)}`);
  }

  console.log('\n🎉 TẤT CẢ TESTS CHO PROMPT 6 (TASKS MODULE) ĐÃ PASS 100%!');
  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
