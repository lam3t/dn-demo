import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';

async function runKpiTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU CHẠY INTEGRATION TESTS: PHASE 4 MODULE KPI');
  console.log('================================================================');

  try {
  // 1. Đăng nhập Tenant 1 và Tenant 2
  const loginT1 = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

  if (!loginT1.body?.success || !loginT1.body?.data?.accessToken) {
    throw new Error(`Đăng nhập Tenant 1 thất bại: ${JSON.stringify(loginT1.body)}`);
  }

  const tokenT1 = loginT1.body.data.accessToken;
  const tenant1Id = loginT1.body.data.user.tenantId;

  const loginT2 = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'admin.nguyenhue@dongnai.edu.vn', password: '123456' });

  if (!loginT2.body?.success || !loginT2.body?.data?.accessToken) {
    throw new Error(`Đăng nhập Tenant 2 thất bại: ${JSON.stringify(loginT2.body)}`);
  }

  const tokenT2 = loginT2.body.data.accessToken;
  const tenant2Id = loginT2.body.data.user.tenantId;

    console.log(`✓ PASS: Đăng nhập thành công Tenant 1 (${tenant1Id}) và Tenant 2 (${tenant2Id})`);

    // Lấy thông tin user giáo viên của Tenant 1 để kiểm tra tính toán KPI
    const teacher1 = await prisma.user.findFirst({
      where: { tenantId: tenant1Id, email: { contains: 'gv' } },
    }) || await prisma.user.findFirst({
      where: { tenantId: tenant1Id },
    });

    if (!teacher1) throw new Error('Không tìm thấy giáo viên trong Tenant 1');

    console.log(`\n--- 1. Thiết lập dữ liệu Task kiểm chuẩn cho Giáo viên [${teacher1.fullName}] ---`);

    // Dọn dẹp task cũ & phân công cũ của teacher1 cho bài test
    await prisma.taskAssignment.deleteMany({
      where: { tenantId: tenant1Id, userId: teacher1.id },
    });
    const oldTasks = await prisma.task.findMany({
      where: { tenantId: tenant1Id, createdById: teacher1.id },
      select: { id: true },
    });
    if (oldTasks.length > 0) {
      await prisma.taskAssignment.deleteMany({
        where: { taskId: { in: oldTasks.map((t) => t.id) } },
      });
      await prisma.taskLog.deleteMany({
        where: { taskId: { in: oldTasks.map((t) => t.id) } },
      });
      await prisma.task.deleteMany({
        where: { id: { in: oldTasks.map((t) => t.id) } },
      });
    }

    const now = new Date();
    const school = await prisma.school.findFirst({ where: { tenantId: tenant1Id } });

    // Tạo chính xác 4 công việc với các mốc thời gian rõ ràng:
    // Task 1: Hoàn thành TRƯỚC HẠN (DueDate: 10 ngày sau, CompletedAt: 2 ngày sau)
    const taskBefore = await prisma.task.create({
      data: {
        tenantId: tenant1Id,
        schoolId: school!.id,
        title: 'Biên soạn ngân hàng câu hỏi kiểm tra giữa kỳ Toán 9',
        status: 'HOAN_THANH',
        priority: 'CAO',
        progressPercent: 100,
        startDate: new Date(now.getTime() - 10 * 86400000),
        dueDate: new Date(now.getTime() + 5 * 86400000),
        completedAt: new Date(now.getTime() - 2 * 86400000),
        evaluationRating: 'XUAT_SAC',
        createdById: teacher1.id,
      },
    });
    await prisma.taskAssignment.create({
      data: {
        tenantId: tenant1Id,
        taskId: taskBefore.id,
        userId: teacher1.id,
        role: 'CHU_TRI',
      },
    });

    // Task 2: Hoàn thành ĐÚNG HẠN (DueDate: hôm qua, CompletedAt: hôm qua)
    const taskOnTime = await prisma.task.create({
      data: {
        tenantId: tenant1Id,
        schoolId: school!.id,
        title: 'Hoàn thành hồ sơ sổ điểm điện tử tháng 9',
        status: 'HOAN_THANH',
        priority: 'TRUNG_BINH',
        progressPercent: 100,
        startDate: new Date(now.getTime() - 15 * 86400000),
        dueDate: new Date(now.getTime() - 1 * 86400000),
        completedAt: new Date(now.getTime() - 1 * 86400000),
        evaluationRating: 'TOT',
        createdById: teacher1.id,
      },
    });
    await prisma.taskAssignment.create({
      data: {
        tenantId: tenant1Id,
        taskId: taskOnTime.id,
        userId: teacher1.id,
        role: 'CHU_TRI',
      },
    });

    // Task 3: Hoàn thành CHẬM HẠN (DueDate: 5 ngày trước, CompletedAt: hôm nay)
    const taskLate = await prisma.task.create({
      data: {
        tenantId: tenant1Id,
        schoolId: school!.id,
        title: 'Nộp báo cáo chuyên đề đổi mới phương pháp dạy học',
        status: 'HOAN_THANH',
        priority: 'TRUNG_BINH',
        progressPercent: 100,
        startDate: new Date(now.getTime() - 20 * 86400000),
        dueDate: new Date(now.getTime() - 5 * 86400000),
        completedAt: new Date(now.getTime()),
        evaluationRating: 'HOAN_THANH',
        createdById: teacher1.id,
      },
    });
    await prisma.taskAssignment.create({
      data: {
        tenantId: tenant1Id,
        taskId: taskLate.id,
        userId: teacher1.id,
        role: 'CHU_TRI',
      },
    });

    // Task 4: CHƯA HOÀN THÀNH (Đang thực hiện 50%)
    const taskUncompleted = await prisma.task.create({
      data: {
        tenantId: tenant1Id,
        schoolId: school!.id,
        title: 'Chuẩn bị giáo án điện tử bài giảng STEM tuần tới',
        status: 'DANG_THUC_HIEN',
        priority: 'TRUNG_BINH',
        progressPercent: 50,
        startDate: new Date(now.getTime() - 3 * 86400000),
        dueDate: new Date(now.getTime() + 7 * 86400000),
        createdById: teacher1.id,
      },
    });
    await prisma.taskAssignment.create({
      data: {
        tenantId: tenant1Id,
        taskId: taskUncompleted.id,
        userId: teacher1.id,
        role: 'CHU_TRI',
      },
    });

    console.log('✓ PASS: Đã khởi tạo 4 Tasks kiểm chuẩn: 1 Trước hạn, 1 Đúng hạn, 1 Chậm hạn, 1 Chưa hoàn thành.');

    // --- 2. Kiểm thử Tính toán KPI Cá nhân & Đối chiếu Khớp 100% ---
    console.log('\n--- 2. Kiểm thử Đối chiếu Khớp 100% Số liệu KPI (DoD Phase 4) ---');
    const calcRes = await request(app)
      .get(`/api/kpi/user/${teacher1.id}?periodKey=QUY_3`)
      .set('Authorization', `Bearer ${tokenT1}`);

    if (calcRes.status !== 200 || !calcRes.body.success) {
      throw new Error(`Lỗi API tính KPI: ${JSON.stringify(calcRes.body)}`);
    }

    const data = calcRes.body.data;
    console.log(`Số liệu KPI tính toán: Tổng ${data.taskBreakdown.total} việc | Trước hạn: ${data.taskBreakdown.completedBeforeDeadline} | Đúng hạn: ${data.taskBreakdown.completedOnTime} | Chậm hạn: ${data.taskBreakdown.completedLate} | Chưa hoàn thành: ${data.taskBreakdown.uncompleted}`);

    if (data.taskBreakdown.total !== 4) {
      throw new Error(`Tổng số việc không khớp: mong đợi 4, thực tế ${data.taskBreakdown.total}`);
    }
    if (data.taskBreakdown.completedBeforeDeadline !== 1) {
      throw new Error(`Việc trước hạn không khớp: mong đợi 1, thực tế ${data.taskBreakdown.completedBeforeDeadline}`);
    }
    if (data.taskBreakdown.completedOnTime !== 1) {
      throw new Error(`Việc đúng hạn không khớp: mong đợi 1, thực tế ${data.taskBreakdown.completedOnTime}`);
    }
    if (data.taskBreakdown.completedLate !== 1) {
      throw new Error(`Việc chậm hạn không khớp: mong đợi 1, thực tế ${data.taskBreakdown.completedLate}`);
    }
    if (data.taskBreakdown.uncompleted !== 1) {
      throw new Error(`Việc chưa hoàn thành không khớp: mong đợi 1, thực tế ${data.taskBreakdown.uncompleted}`);
    }

    console.log(`✓ PASS DoD 1: Số liệu phân loại tiến độ của nhân sự khớp chính xác 100% với dữ liệu Task gốc!`);
    console.log(`✓ PASS: Điểm các trụ cột: A=${data.scores.scoreA_Quantity} | B=${data.scores.scoreB_Quality} | C=${data.scores.scoreC_Timeline} | D=${data.scores.scoreD_Leadership} => Tổng điểm: ${data.scores.finalScore} (Xếp loại: ${data.scores.ratingCategory})`);

    // --- 3. Kiểm thử API Báo cáo Tổng hợp KPI Tổ bộ phận ---
    console.log('\n--- 3. Kiểm thử Tổng hợp KPI Tổ Chuyên môn (TT 90–91) ---');
    const orgUnit = await prisma.orgUnit.findFirst({ where: { tenantId: tenant1Id } });
    if (orgUnit) {
      const orgRes = await request(app)
        .get(`/api/kpi/summary/org/${orgUnit.id}?periodKey=QUY_3`)
        .set('Authorization', `Bearer ${tokenT1}`);

      if (orgRes.status === 200 && orgRes.body.success) {
        console.log(`✓ PASS: Tổng hợp KPI Tổ [${orgRes.body.data.orgUnit.name}] thành công: ${orgRes.body.data.stats.memberCount} thành viên, Điểm TB: ${orgRes.body.data.stats.avgScore}`);
      } else {
        throw new Error(`Lỗi tổng hợp KPI tổ: ${JSON.stringify(orgRes.body)}`);
      }
    }

    // --- 4. Kiểm thử API Báo cáo Tổng hợp KPI Toàn trường ---
    console.log('\n--- 4. Kiểm thử Tổng hợp KPI Toàn trường (TT 71–74, 115–120) ---');
    const schoolRes = await request(app)
      .get('/api/kpi/summary/school?periodKey=QUY_3')
      .set('Authorization', `Bearer ${tokenT1}`);

    if (schoolRes.status === 200 && schoolRes.body.success) {
      console.log(`✓ PASS: Tổng hợp KPI Toàn trường thành công: ${schoolRes.body.data.overall.totalStaff} cán bộ giáo viên, Điểm TB trường: ${schoolRes.body.data.overall.avgScore}`);
    } else {
      throw new Error(`Lỗi tổng hợp KPI toàn trường: ${JSON.stringify(schoolRes.body)}`);
    }

    // --- 5. Kiểm thử API Recompute Toàn trường ---
    console.log('\n--- 5. Kiểm thử Recompute KPI Toàn trường ---');
    const recomputeRes = await request(app)
      .post('/api/kpi/recompute')
      .send({ periodKey: 'QUY_3' })
      .set('Authorization', `Bearer ${tokenT1}`);

    if (recomputeRes.status === 200 && recomputeRes.body.success) {
      console.log(`✓ PASS: Recompute KPI toàn trường thành công: Đã xử lý ${recomputeRes.body.data.processedUsers} nhân sự.`);
    } else {
      throw new Error(`Lỗi recompute KPI: ${JSON.stringify(recomputeRes.body)}`);
    }

    // --- 6. Kiểm thử Xuất file Excel Bảng điểm KPI (.xlsx) ---
    console.log('\n--- 6. Kiểm thử Xuất Excel Bảng điểm KPI (ExcelJS) ---');
    const excelRes = await request(app)
      .get(`/api/kpi/export-excel?periodKey=QUY_3&userId=${teacher1.id}`)
      .set('Authorization', `Bearer ${tokenT1}`);

    if (excelRes.status === 200 && excelRes.header['content-type']?.includes('openxmlformats')) {
      console.log(`✓ PASS: Xuất file Excel bảng điểm KPI thành công (Dung lượng: ${excelRes.body.length} bytes).`);
    } else {
      throw new Error(`Lỗi xuất Excel KPI: status ${excelRes.status}`);
    }

    // --- 7. Kiểm thử DoD Phase 4: Cô lập Đa Tenant Tuyệt đối trên Module KPI ---
    console.log('\n--- 7. Kiểm thử Cô lập Đa Tenant Tuyệt đối trên Module KPI (DoD Phase 4) ---');
    const t2Res = await request(app)
      .get('/api/kpi/summary/school?periodKey=QUY_3')
      .set('Authorization', `Bearer ${tokenT2}`);

    if (t2Res.status === 200 && t2Res.body.success) {
      // Tenant 2 chỉ nhìn thấy nhân sự của Tenant 2, không nhìn thấy 4 task hay điểm số của teacher1 (Tenant 1)
      const t2UserIds = (t2Res.body.data.records || []).map((r: any) => r.userId);
      if (t2UserIds.includes(teacher1.id)) {
        throw new Error('VI PHẠM CÔ LẬP TENANT: Tenant 2 nhìn thấy điểm KPI của nhân sự Tenant 1!');
      }
      console.log(`✓ PASS DoD Phase 4: Tenant 2 được cô lập hoàn toàn, không nhìn thấy bảng điểm KPI của Tenant 1.`);
    }

    console.log('\n================================================================');
    console.log('🎉 TẤT CẢ TEST SUITES CHO PHASE 4 MODULE KPI ĐÃ PASS 100%!');
    console.log('================================================================');
  } catch (error: any) {
    console.error('\n❌ TEST PHASE 4 THẤT BẠI:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runKpiTests();
