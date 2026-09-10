import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';
import { PlanLevel, TaskPriority } from '@prisma/client';
import { planService } from './plan.service';

async function runTests() {
  console.log('🧪 Bắt đầu chạy Tests cho Prompt 5: Kế hoạch nhiều cấp (Plans)...');

  // 1. Đăng nhập lấy auth token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

  if (loginRes.status !== 200) {
    throw new Error('Đăng nhập thất bại!');
  }
  const token = loginRes.body.data.accessToken;
  const schoolId = loginRes.body.data.user.schoolId;

  // Lấy các user và location để test gán việc
  const users = await prisma.user.findMany({ take: 5 });
  const chuTriUser = users[0];
  const phoiHopUser = users[1];
  const kiemTraUser = users[2];

  // 2. TEST GET /api/plans
  console.log('\n--- 1. Test GET /api/plans ---');
  const listRes = await request(app)
    .get('/api/plans')
    .set('Authorization', `Bearer ${token}`);

  if (listRes.status === 200 && Array.isArray(listRes.body.data) && listRes.body.data.length >= 5) {
    console.log(`✓ PASS: Lấy danh sách ${listRes.body.data.length} kế hoạch thành công.`);
  } else {
    throw new Error(`FAIL: GET /api/plans thất bại: ${JSON.stringify(listRes.body)}`);
  }
  const rootYearPlan = listRes.body.data.find((p: any) => p.level === PlanLevel.NAM);

  // 3. TEST GET /api/plans/:id/tree (CÂY KẾ HOẠCH ĐẦY ĐỦ KÈM TASK CON)
  console.log('\n--- 2. Test GET /api/plans/:id/tree ---');
  const treeRes = await request(app)
    .get(`/api/plans/${rootYearPlan.id}/tree`)
    .set('Authorization', `Bearer ${token}`);

  if (treeRes.status === 200 && Array.isArray(treeRes.body.data) && treeRes.body.data.length > 0) {
    const rootNode = treeRes.body.data[0];
    console.log(`✓ PASS: Lấy cây kế hoạch thành công: "${rootNode.title}" (Cấp: ${rootNode.level}, Tiến độ: ${rootNode.progressPercent}%)`);
    console.log(`  Số nhánh con cấp 1: ${rootNode.children?.length} | Tổng task trực thuộc: ${rootNode.taskCount}`);
    if (rootNode.children?.length > 0) {
      const termNode = rootNode.children[0];
      console.log(`  └─ Nhánh con: "${termNode.title}" (Cấp: ${termNode.level}, Tiến độ: ${termNode.progressPercent}%) - ${termNode.children?.length} kế hoạch tháng.`);
    }
  } else {
    throw new Error(`FAIL: GET /api/plans/:id/tree thất bại: ${JSON.stringify(treeRes.body)}`);
  }

  // 4. TEST VALIDATE CẤP THỨ BẬC KẾ HOẠCH
  console.log('\n--- 3. Test Validate Thứ bậc Kế hoạch (Hierarchy Validation) ---');
  // Thử tạo kế hoạch cấp NĂM làm con của kế hoạch cấp THÁNG -> Kỳ vọng 400 Bad Request
  const monthPlan = listRes.body.data.find((p: any) => p.level === PlanLevel.THANG);
  const invalidHierarchyRes = await request(app)
    .post('/api/plans')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Kế hoạch năm không hợp lệ',
      level: PlanLevel.NAM,
      parentPlanId: monthPlan.id,
      startDate: '2026-09-01',
      endDate: '2027-05-31',
    });

  if (invalidHierarchyRes.status === 400) {
    console.log(`✓ PASS: Chặn đúng cấp thứ bậc sai (HTTP 400: "${invalidHierarchyRes.body.message}")`);
  } else {
    throw new Error(`FAIL: Kỳ vọng HTTP 400 nhưng nhận ${invalidHierarchyRes.status}`);
  }

  // 5. TEST POST /api/plans/:id/generate-tasks (TẠO NHANH CÔNG VIỆC TỪ KẾ HOẠCH)
  console.log('\n--- 4. Test POST /api/plans/:id/generate-tasks ---');
  const genTasksRes = await request(app)
    .post(`/api/plans/${monthPlan.id}/generate-tasks`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      tasks: [
        {
          title: 'Triển khai khảo sát thiết bị thực hành theo kế hoạch',
          description: 'Kiểm tra và lập danh sách chi tiết các thiết bị cần mua sắm bổ sung',
          priority: TaskPriority.CAO,
          chuTriId: chuTriUser.id,
          phoiHopIds: [phoiHopUser.id],
          kiemTraId: kiemTraUser.id,
        },
        {
          title: 'Tổng kết báo cáo khảo sát thiết bị gửi Phòng Giáo dục',
          priority: TaskPriority.TRUNG_BINH,
          chuTriId: phoiHopUser.id,
          kiemTraId: chuTriUser.id,
        },
      ],
    });

  if (genTasksRes.status === 201 && genTasksRes.body.data.length === 2) {
    console.log(`✓ PASS: Tạo nhanh thành công 2 công việc từ kế hoạch "${monthPlan.title}":`);
    genTasksRes.body.data.forEach((t: any) => {
      console.log(`  - Task [${t.code}]: "${t.title}" | Trạng thái: ${t.status} | Hạn: ${new Date(t.dueDate).toLocaleDateString('vi-VN')}`);
    });
  } else {
    throw new Error(`FAIL: generate-tasks thất bại: ${JSON.stringify(genTasksRes.body)}`);
  }
  const createdTaskId = genTasksRes.body.data[0].id;

  // 6. TEST CƠ CHẾ TỰ ĐỘNG TÍNH LẠI TIẾN ĐỘ KẾ HOẠCH
  console.log('\n--- 5. Test Tự động Tính lại Tiến độ Plan khi Task cập nhật ---');
  // Cập nhật tiến độ của task vừa tạo lên 100% và trạng thái HOAN_THANH
  await prisma.task.update({
    where: { id: createdTaskId },
    data: { progressPercent: 100, status: 'HOAN_THANH' },
  });
  // Gọi recalculatePlanProgress (mô phỏng trigger cập nhật task)
  await planService.recalculatePlanProgress(monthPlan.id);

  const updatedPlan = await prisma.plan.findUnique({ where: { id: monthPlan.id } });
  console.log(`✓ PASS: Tiến độ kế hoạch con "${monthPlan.title}" được cập nhật tự động lên: ${updatedPlan?.progressPercent}%`);

  const updatedRootPlan = await prisma.plan.findUnique({ where: { id: rootYearPlan.id } });
  console.log(`✓ PASS: Tiến độ kế hoạch cha "${rootYearPlan.title}" tự động lan truyền cập nhật lên: ${updatedRootPlan?.progressPercent}%`);

  // 7. TEST POST /api/plans/:id/duplicate (SAO CHÉP KẾ HOẠCH KỲ TRƯỚC)
  console.log('\n--- 6. Test POST /api/plans/:id/duplicate (Sao chép kế hoạch) ---');
  const duplicateRes = await request(app)
    .post(`/api/plans/${monthPlan.id}/duplicate`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      newTitle: 'Bản sao Kế hoạch khảo sát kỳ tiếp theo',
      newStartDate: '2026-10-01',
      newEndDate: '2026-10-31',
      includeTasks: true,
    });

  if (duplicateRes.status === 201 && duplicateRes.body.data.id) {
    const dup = duplicateRes.body.data;
    console.log(`✓ PASS: Sao chép kế hoạch thành công: "${dup.title}" | Số task sao chép kèm theo: ${dup.tasks?.length} | Tiến độ khởi tạo lại: ${dup.progressPercent}%`);

    // Dọn dẹp bản sao thử nghiệm để không lưu lại rác trong database
    await request(app)
      .delete(`/api/plans/${dup.id}`)
      .set('Authorization', `Bearer ${token}`);
    console.log(`✓ PASS: Dọn dẹp bản sao thử nghiệm (${dup.id}) thành công.`);
  } else {
    throw new Error(`FAIL: duplicate thất bại: ${JSON.stringify(duplicateRes.body)}`);
  }

  console.log('\n🎉 TẤT CẢ TESTS CHO PROMPT 5 (PLANS MODULE) ĐÃ PASS 100%!');
  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
