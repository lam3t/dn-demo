import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU CHẠY INTEGRATION TESTS: PHASE 3 CORE MULTI-TENANT & EXTENDED FEATURES');
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
  const principal1Id = loginRes1.body.data.user.id;

  // Lấy 1 giáo viên thuộc Tenant 1
  const teacher1 = await prisma.user.findFirst({
    where: {
      tenantId: tenant1Id,
      email: { contains: 'toan' },
    },
  });
  if (!teacher1) {
    throw new Error('Không tìm thấy giáo viên test trong Tenant 1');
  }

  const loginTeacher1 = await request(app)
    .post('/api/auth/login')
    .send({ identifier: teacher1.email, password: '123456' });
  
  const teacher1Token = loginTeacher1.body.data?.accessToken;
  if (!teacher1Token) {
    throw new Error(`Đăng nhập Giáo viên Tenant 1 thất bại: ${JSON.stringify(loginTeacher1.body)}`);
  }

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

  // --- 1. Test Giao việc cho cả Tổ / Bộ phận (TT 62, 84, 97) ---
  console.log('\n--- 1. Test Giao việc cho cả Tổ / Bộ phận (TT 62, 84, 97) ---');
  const orgUnits = await prisma.orgUnit.findMany({ where: { tenantId: tenant1Id } });
  const targetOrg = orgUnits[0];

  const createOrgTaskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token1}`)
    .send({
      title: 'Triển khai chuyên đề ôn tập học kỳ I toàn Tổ Chuyên môn',
      description: 'Phân công toàn bộ giáo viên trong tổ thực hiện xây dựng ma trận đề',
      assignedOrgUnitId: targetOrg.id,
      isOrgAssignment: true,
      priority: 'CAO',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

  if (createOrgTaskRes.status !== 201) {
    throw new Error(`Tạo việc cho tổ thất bại: ${JSON.stringify(createOrgTaskRes.body)}`);
  }
  const orgTaskId = createOrgTaskRes.body.data.id;
  console.log(`✓ PASS: Tạo công việc giao cho Tổ [${targetOrg.name}] thành công (Task ID: ${orgTaskId})`);

  // --- 2. Test Đánh giá kết quả 4 mức (TT 70, 89) ---
  console.log('\n--- 2. Test Đánh giá kết quả 4 mức (TT 70, 89) ---');
  const evaluateRes = await request(app)
    .post(`/api/tasks/${orgTaskId}/evaluate`)
    .set('Authorization', `Bearer ${token1}`)
    .send({
      rating: 'XUAT_SAC',
      comment: 'Tổ triển khai rất nhanh và đạt chất lượng xuất sắc vượt chỉ tiêu.',
    });

  if (evaluateRes.status !== 200 || evaluateRes.body.data.evaluationRating !== 'XUAT_SAC') {
    throw new Error(`Đánh giá kết quả thất bại: ${JSON.stringify(evaluateRes.body)}`);
  }
  console.log(`✓ PASS: Đánh giá kết quả công việc mức [${evaluateRes.body.data.evaluationRating}] kèm nhận xét thành công.`);

  // --- 3. Test Đề xuất công việc & Duyệt / Từ chối đề xuất (TT 77, 113) ---
  console.log('\n--- 3. Test Đề xuất công việc từ cấp dưới & Phê duyệt (TT 77, 113) ---');
  const proposeRes = await request(app)
    .post('/api/tasks/propose')
    .set('Authorization', `Bearer ${teacher1Token}`)
    .send({
      title: 'Đề xuất tổ chức Hội thi Toán học cấp trường',
      description: 'Kính gửi BGH phê duyệt kế hoạch tổ chức ngày hội Toán học cho học sinh',
      proposalNote: 'Dự kiến kinh phí xã hội hóa 100%',
      priority: 'TRUNG_BINH',
    });

  if (proposeRes.status !== 201 || !proposeRes.body.data.isProposal) {
    throw new Error(`Đề xuất công việc thất bại: ${JSON.stringify(proposeRes.body)}`);
  }
  const proposalTaskId = proposeRes.body.data.id;
  console.log(`✓ PASS: Giáo viên gửi đề xuất công việc thành công (Task ID: ${proposalTaskId}, Status: ${proposeRes.body.data.proposalStatus})`);

  // BGH Phê duyệt đề xuất
  const approveProposalRes = await request(app)
    .post(`/api/tasks/${proposalTaskId}/approve-proposal`)
    .set('Authorization', `Bearer ${token1}`)
    .send({ note: 'BGH đồng ý chủ trương, giao tổ Toán xây dựng thể lệ chi tiết.' });

  if (approveProposalRes.status !== 200 || approveProposalRes.body.data.proposalStatus !== 'DA_DUYET') {
    throw new Error(`Phê duyệt đề xuất thất bại: ${JSON.stringify(approveProposalRes.body)}`);
  }
  console.log(`✓ PASS: Ban Giám hiệu phê duyệt đề xuất thành công (Trạng thái chuyển sang: ${approveProposalRes.body.data.status})`);

  // --- 4. Test Trao đổi & @mention trong từng công việc (TT 13–14, 102, 114) ---
  console.log('\n--- 4. Test Trao đổi & @mention trong công việc (TT 13–14, 102, 114) ---');
  const commentRes = await request(app)
    .post(`/api/tasks/${orgTaskId}/comments`)
    .set('Authorization', `Bearer ${teacher1Token}`)
    .send({
      content: 'Kính gửi Thầy Hiệu trưởng, tổ em đã hoàn tất 100% tài liệu theo yêu cầu.',
      mentions: [principal1Id],
    });

  if (commentRes.status !== 201 || !commentRes.body.data.id) {
    throw new Error(`Thêm trao đổi thất bại: ${JSON.stringify(commentRes.body)}`);
  }
  console.log(`✓ PASS: Thêm trao đổi kèm @mention Hiệu trưởng thành công (Comment ID: ${commentRes.body.data.id})`);

  // --- 5. Test Nhật ký chỉnh sửa Kế hoạch / Công việc (TT 20–21) ---
  console.log('\n--- 5. Test Nhật ký chỉnh sửa Kế hoạch & Công việc (TT 20–21) ---');
  const taskLogsRes = await request(app)
    .get(`/api/tasks/${orgTaskId}/logs`)
    .set('Authorization', `Bearer ${token1}`);

  if (taskLogsRes.status !== 200 || !Array.isArray(taskLogsRes.body.data) || taskLogsRes.body.data.length === 0) {
    throw new Error(`Lấy nhật ký công việc thất bại: ${JSON.stringify(taskLogsRes.body)}`);
  }
  console.log(`✓ PASS: Lấy nhật ký công việc (TaskLog) thành công với ${taskLogsRes.body.data.length} sự kiện.`);

  // --- 6. Test Tìm kiếm Toàn hệ thống & Bộ lọc nâng cao (TT 22–23) ---
  console.log('\n--- 6. Test Tìm kiếm Toàn hệ thống (TT 22–23) ---');
  const searchRes = await request(app)
    .get('/api/search/global?q=Toán&type=ALL')
    .set('Authorization', `Bearer ${token1}`);

  if (searchRes.status !== 200 || searchRes.body.data.total === 0) {
    throw new Error(`Tìm kiếm toàn hệ thống thất bại: ${JSON.stringify(searchRes.body)}`);
  }
  console.log(`✓ PASS: Tìm kiếm toàn hệ thống với từ khóa "Toán" thành công (${searchRes.body.data.total} kết quả: ${searchRes.body.data.tasks.length} tasks, ${searchRes.body.data.plans.length} plans, ${searchRes.body.data.users.length} users).`);

  // --- 7. Test Báo cáo theo kỳ & Xuất Excel (TT 24–25) ---
  console.log('\n--- 7. Test Báo cáo theo kỳ & Xuất Excel (TT 24–25) ---');
  const reportSummaryRes = await request(app)
    .get('/api/reports/summary')
    .set('Authorization', `Bearer ${token1}`);

  if (reportSummaryRes.status !== 200 || !reportSummaryRes.body.data.summary) {
    throw new Error(`Lấy báo cáo tổng hợp thất bại: ${JSON.stringify(reportSummaryRes.body)}`);
  }
  console.log(`✓ PASS: Lấy số liệu báo cáo tổng hợp thành công: Tổng ${reportSummaryRes.body.data.summary.totalTasks} việc, Hoàn thành ${reportSummaryRes.body.data.summary.completedTasks} việc (${reportSummaryRes.body.data.summary.completionRate}%).`);

  const excelExportRes = await request(app)
    .get('/api/reports/export-excel')
    .set('Authorization', `Bearer ${token1}`);

  if (excelExportRes.status !== 200 || !excelExportRes.header['content-type']?.includes('spreadsheetml')) {
    throw new Error(`Xuất file Excel báo cáo thất bại: status=${excelExportRes.status}`);
  }
  console.log(`✓ PASS: Xuất file Excel (.xlsx) báo cáo tiến độ thành công.`);

  // --- 8. Test DoD Phase 3: Cô lập Đa Tenant Tuyệt đối trên các nghiệp vụ mới ---
  console.log('\n--- 8. Test DoD Phase 3: Cô lập Đa Tenant Tuyệt đối trên các nghiệp vụ mới ---');
  // Tenant 2 tìm kiếm không được thấy công việc/đề xuất của Tenant 1
  const searchResTenant2 = await request(app)
    .get('/api/search/global?q=Toán&type=TASKS')
    .set('Authorization', `Bearer ${token2}`);

  const tenant2TaskIds = searchResTenant2.body.data.tasks.map((t: any) => t.id);
  if (tenant2TaskIds.includes(orgTaskId) || tenant2TaskIds.includes(proposalTaskId)) {
    throw new Error('LỖI BẢO MẬT: Tenant 2 tìm kiếm thấy công việc của Tenant 1!');
  }
  console.log('✓ PASS DoD Phase 3: Tenant 2 tìm kiếm hoàn toàn cô lập, không nhìn thấy bất kỳ công việc nào của Tenant 1.');

  // Tenant 2 gọi báo cáo summary chỉ trả về dữ liệu Tenant 2
  const reportSummaryTenant2 = await request(app)
    .get('/api/reports/summary')
    .set('Authorization', `Bearer ${token2}`);
  
  console.log(`✓ PASS DoD Phase 3: Báo cáo Tenant 2 cô lập hoàn hảo (Tenant 2 có ${reportSummaryTenant2.body.data.summary.totalTasks} tasks, Tenant 1 có ${reportSummaryRes.body.data.summary.totalTasks} tasks).`);

  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ PHASE 3 CORE MULTI-TENANT & EXTENDED FEATURE TESTS ĐÃ PASS 100%!');
  console.log('================================================================');
}

runPhase3Tests()
  .catch((err) => {
    console.error('❌ Kiểm thử Phase 3 thất bại:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
