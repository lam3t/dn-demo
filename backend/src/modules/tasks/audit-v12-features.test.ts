import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';
import bcrypt from 'bcryptjs';

async function runAuditV12Tests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU CHẠY INTEGRATION TESTS: SRS v1.2 AUDIT GAPS & BUSINESS LOGIC');
  console.log('================================================================');

  // 1. Đăng nhập lấy Token cho Tenant 1 (Trường TH và THCS Phước Tân)
  const loginRes1 = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

  if (!loginRes1.body.success || !loginRes1.body.data?.accessToken) {
    throw new Error(`Đăng nhập Hiệu trưởng Tenant 1 thất bại: ${JSON.stringify(loginRes1.body)}`);
  }
  const token1 = loginRes1.body.data.accessToken;
  const tenant1Id = loginRes1.body.data.user.tenantId;

  // Đăng nhập Tenant 2 (Trường THCS Nguyễn Huệ)
  const loginRes2 = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'admin.nguyenhue@dongnai.edu.vn', password: '123456' });

  if (!loginRes2.body.success || !loginRes2.body.data?.accessToken) {
    throw new Error(`Đăng nhập Tenant 2 thất bại: ${JSON.stringify(loginRes2.body)}`);
  }
  const token2 = loginRes2.body.data.accessToken;
  const tenant2Id = loginRes2.body.data.user.tenantId;

  console.log(`✓ PASS: Đăng nhập thành công Tenant 1 (${tenant1Id}) và Tenant 2 (${tenant2Id})`);

  // --- TEST 1: TT 003 - Đổi mật khẩu (auth.change_password) ---
  console.log('\n--- 1. Test TT 003: Đổi mật khẩu cá nhân (changePassword) ---');
  
  // 1.1 Thử đổi mật khẩu với mật khẩu hiện tại sai -> Phải 400
  const wrongOldPwdRes = await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${token1}`)
    .send({ currentPassword: 'sai_mat_khau_123', newPassword: 'newpassword123' });

  if (wrongOldPwdRes.status !== 400) {
    throw new Error(`Kỳ vọng HTTP 400 khi sai mật khẩu hiện tại nhưng nhận ${wrongOldPwdRes.status}`);
  }
  console.log('✓ PASS: Từ chối đổi mật khẩu khi sai mật khẩu cũ');

  // 1.2 Đổi mật khẩu hợp lệ: 123456 -> 654321
  const changeValidRes = await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${token1}`)
    .send({ currentPassword: '123456', newPassword: 'newPassword123' });

  if (changeValidRes.status !== 200 || !changeValidRes.body.success) {
    throw new Error(`Đổi mật khẩu hợp lệ thất bại: ${JSON.stringify(changeValidRes.body)}`);
  }
  console.log('✓ PASS: Đổi mật khẩu thành công sang newPassword123');

  // 1.3 Đăng nhập thử với mật khẩu mới
  const loginNewPwdRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: 'newPassword123' });

  if (loginNewPwdRes.status !== 200) {
    throw new Error('Không thể đăng nhập bằng mật khẩu mới vừa đổi');
  }

  // 1.4 Trả lại mật khẩu gốc 123456
  const resetBackRes = await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${loginNewPwdRes.body.data.accessToken}`)
    .send({ currentPassword: 'newPassword123', newPassword: '123456' });

  if (resetBackRes.status !== 200) {
    throw new Error('Không thể khôi phục lại mật khẩu mặc định 123456');
  }
  console.log('✓ PASS: Khôi phục mật khẩu về mặc định 123456 thành công');

  // --- TEST 2: TT 011, 012, 075, 093 - Kho minh chứng & Tìm kiếm minh chứng ---
  console.log('\n--- 2. Test TT 011, 012, 075, 093: Kho minh chứng & Lọc tài liệu (getEvidenceRepository) ---');
  
  const principal1Id = loginRes1.body.data.user.id;
  const task1 = await prisma.task.findFirst({ where: { tenantId: tenant1Id } });
  if (task1) {
    await prisma.attachment.create({
      data: {
        tenantId: tenant1Id,
        taskId: task1.id,
        uploadedById: principal1Id,
        fileName: 'Minh_Chung_Kiem_Tra_Chuyen_Mon_T1.pdf',
        originalName: 'Minh_Chung_Kiem_Tra_Chuyen_Mon_T1.pdf',
        fileUrl: '/uploads/demo-evidence-t1.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
      },
    });
  }

  const evidenceRes1 = await request(app)
    .get('/api/attachments/repository?search=Minh_Chung')
    .set('Authorization', `Bearer ${token1}`);

  if (evidenceRes1.status !== 200 || !evidenceRes1.body.success) {
    throw new Error(`Lấy kho minh chứng Tenant 1 thất bại: ${JSON.stringify(evidenceRes1.body)}`);
  }
  const items1 = evidenceRes1.body.data.items;
  if (!items1 || items1.length === 0) {
    throw new Error('Kho minh chứng không trả về tài liệu vừa tạo');
  }
  console.log(`✓ PASS: Tìm thấy ${items1.length} minh chứng trong Kho minh chứng Tenant 1`);

  // Kiểm tra cách ly: Tenant 2 không được nhìn thấy minh chứng của Tenant 1
  const evidenceRes2 = await request(app)
    .get('/api/attachments/repository?search=Minh_Chung_Kiem_Tra_Chuyen_Mon_T1')
    .set('Authorization', `Bearer ${token2}`);

  if (evidenceRes2.status !== 200 || evidenceRes2.body.data.items.length !== 0) {
    throw new Error(`Rò rỉ dữ liệu kho minh chứng qua Tenant 2! Nhận ${evidenceRes2.body.data.items.length} items`);
  }
  console.log('✓ PASS: Cô lập tenant kho minh chứng hoàn hảo (Tenant 2 nhận 0 items của Tenant 1)');

  // --- TEST 3: TT 021 - Nhật ký chỉnh sửa kế hoạch (plan.log.view) ---
  console.log('\n--- 3. Test TT 021: Nhật ký chỉnh sửa kế hoạch (getPlanLogs) ---');
  const plan1 = await prisma.plan.findFirst({ where: { tenantId: tenant1Id } });
  if (!plan1) throw new Error('Không tìm thấy kế hoạch trong Tenant 1');

  // Update plan để sinh PlanLog
  await request(app)
    .put(`/api/plans/${plan1.id}`)
    .set('Authorization', `Bearer ${token1}`)
    .send({ description: `Cập nhật mô tả kế hoạch lúc ${Date.now()}` });

  const planLogsRes = await request(app)
    .get(`/api/plans/${plan1.id}/logs`)
    .set('Authorization', `Bearer ${token1}`);

  if (planLogsRes.status !== 200 || !planLogsRes.body.success) {
    throw new Error(`Lấy nhật ký kế hoạch thất bại: ${JSON.stringify(planLogsRes.body)}`);
  }
  console.log(`✓ PASS: Lấy thành công ${planLogsRes.body.data.length} nhật ký chỉnh sửa kế hoạch (PlanLog)`);

  // --- TEST 4: TT 022 - Tìm kiếm toàn hệ thống bao gồm Attachments (search.global) ---
  console.log('\n--- 4. Test TT 022: Tìm kiếm toàn hệ thống gồm cả Minh chứng (searchGlobal) ---');
  const globalSearchRes = await request(app)
    .get('/api/search/global?q=Minh_Chung')
    .set('Authorization', `Bearer ${token1}`);

  if (globalSearchRes.status !== 200 || !globalSearchRes.body.success) {
    throw new Error(`Tìm kiếm toàn hệ thống thất bại: ${JSON.stringify(globalSearchRes.body)}`);
  }
  const searchAttachments = globalSearchRes.body.data.attachments;
  if (!Array.isArray(searchAttachments) || searchAttachments.length === 0) {
    throw new Error('Global search không bao gồm attachments');
  }
  console.log(`✓ PASS: Global search trả về ${searchAttachments.length} attachments khớp từ khóa`);

  // --- TEST 5: TT 120 - Cập nhật KPI khác & Tự đánh giá ngoài luồng (kpi.self_eval) ---
  console.log('\n--- 5. Test TT 120: Cập nhật chỉ số KPI khác (updateManualScore) ---');
  const manualKpiRes = await request(app)
    .post('/api/kpi/manual-score')
    .set('Authorization', `Bearer ${token1}`)
    .send({
      periodKey: 'QUY_3',
      kpiCode: 'KPI_NCKH',
      score: 95,
      note: 'Đạt giải Nhất sáng kiến kinh nghiệm cấp tỉnh năm học 2026-2027',
    });

  if (manualKpiRes.status !== 200 || !manualKpiRes.body.success) {
    throw new Error(`Cập nhật điểm KPI thủ công thất bại: ${JSON.stringify(manualKpiRes.body)}`);
  }

  // Lấy lại My KPI để xác nhận điểm đã lưu
  const myKpiRes = await request(app)
    .get('/api/kpi/my?periodKey=QUY_3')
    .set('Authorization', `Bearer ${token1}`);

  if (myKpiRes.status !== 200 || myKpiRes.body.data.manualScores?.KPI_NCKH?.score !== 95) {
    throw new Error(`Điểm KPI thủ công không được lưu chính xác: ${JSON.stringify(myKpiRes.body.data.manualScores)}`);
  }
  console.log('✓ PASS: Lưu và đọc chỉ số KPI tự đánh giá ngoài luồng (KPI_NCKH = 95) thành công');

  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ TEST INTEGRATION AUDIT v1.2 ĐÃ PASS 100%!');
  console.log('================================================================\n');
}

runAuditV12Tests()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ TEST FAILED:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
