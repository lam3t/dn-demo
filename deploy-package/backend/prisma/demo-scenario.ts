import { PrismaClient, PlanLevel, TaskPriority, TaskStatus, TaskAssignmentRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🎬 BẮT ĐẦU THIẾT LẬP KỊCH BẢN DEMO TRÌNH DIỄN (PROMPT 20)...');
  console.log('================================================================');

  const school = await prisma.school.findFirst();
  if (!school) {
    throw new Error('Chưa có trường học trong CSDL. Vui lòng chạy `npm run db:seed` trước.');
  }

  // 1. Tìm các nhân sự chủ chốt
  const hieuTruong = await prisma.user.findFirst({ where: { phone: '0903111222' } }); // Cô Phạm Thị Nam (Hiệu trưởng)
  const toTruongToan = await prisma.user.findFirst({ where: { phone: '0912111001' } }); // Vũ Đình Dũng (Tổ trưởng Toán - Tin)
  const gvPhanHieu2 = await prisma.user.findFirst({ where: { phone: '0915303001' } }); // Lê Hữu Nghĩa (GV Toán - Phân hiệu 2)
  const gvPhanHieu1 = await prisma.user.findFirst({ where: { phone: '0914202001' } }); // Bùi Thị Hồng Nhung (GV Toán - Phân hiệu 1)

  const phanHieu1 = await prisma.location.findFirst({ where: { code: 'PHAN_HIEU_1' } });
  const phanHieu2 = await prisma.location.findFirst({ where: { code: 'PHAN_HIEU_2' } });
  const toToan = await prisma.orgUnit.findFirst({ where: { code: 'TOAN_TIN' } });

  if (!hieuTruong || !toTruongToan || !gvPhanHieu2 || !gvPhanHieu1 || !phanHieu1 || !phanHieu2 || !toToan) {
    throw new Error('Không tìm thấy dữ liệu mẫu nhân sự. Vui lòng kiểm tra seed database.');
  }

  // 2. Tạo Kế hoạch "Kiểm tra học kỳ I (Năm học 2026 - 2027)" với 3 dòng mốc
  const demoPlan = await prisma.plan.create({
    data: {
      schoolId: school.id,
      createdById: hieuTruong.id,
      title: 'Kế hoạch Tổ chức Kiểm tra Đánh giá Học kỳ I (2026 - 2027)',
      description: 'Thống nhất ngân hàng đề, tổ chức thi tập trung liên phân hiệu và tổng hợp báo cáo điểm số.',
      level: PlanLevel.HOC_KY,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-12-30'),
      progressPercent: 65,
    },
  });

  const week1Plan = await prisma.plan.create({
    data: {
      schoolId: school.id,
      createdById: hieuTruong.id,
      parentPlanId: demoPlan.id,
      title: 'Tuần 1: Xây dựng ma trận & Ngân hàng đề thi',
      level: PlanLevel.TUAN,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-07'),
      progressPercent: 100,
    },
  });

  const week2Plan = await prisma.plan.create({
    data: {
      schoolId: school.id,
      createdById: hieuTruong.id,
      parentPlanId: demoPlan.id,
      title: 'Tuần 2: In sao đề thi & Niêm phong chuyển về 2 Phân hiệu',
      level: PlanLevel.TUAN,
      startDate: new Date('2026-11-08'),
      endDate: new Date('2026-11-14'),
      progressPercent: 50,
    },
  });

  const week3Plan = await prisma.plan.create({
    data: {
      schoolId: school.id,
      createdById: hieuTruong.id,
      parentPlanId: demoPlan.id,
      title: 'Tuần 3: Chấm thi tập trung & Báo cáo kết quả kiểm tra',
      level: PlanLevel.TUAN,
      startDate: new Date('2026-11-15'),
      endDate: new Date('2026-11-21'),
      progressPercent: 0,
    },
  });

  // 3. TASK 1: Công việc liên phân hiệu ĐANG CHỜ KIỂM TRA (Demo "Biết việc đang tắc ở ai")
  const taskChoKiemTra = await prisma.task.create({
    data: {
      schoolId: school.id,
      createdById: hieuTruong.id,
      planId: week2Plan.id,
      locationId: phanHieu2.id,
      orgUnitId: toToan.id,
      code: 'CV-DEMO-01',
      title: 'Bàn giao và niêm phong túi đề kiểm tra HK1 tại Phân hiệu 2 (Vườn Dừa)',
      description: 'Kiểm đếm số lượng đề thi theo danh sách phòng thi Phân hiệu 2, lập biên bản niêm phong tủ bảo mật có chữ ký đại diện BGH và GV coi thi.',
      priority: TaskPriority.CAO,
      status: TaskStatus.CHO_KIEM_TRA,
      progressPercent: 90,
      requireAttachment: true,
      startDate: new Date('2026-11-08'),
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Hạn còn 2 ngày
    },
  });

  // Gán RACI cho Task 1
  await prisma.taskAssignment.createMany({
    data: [
      {
        taskId: taskChoKiemTra.id,
        userId: gvPhanHieu2.id, // Chủ trì ở Phân hiệu 2
        role: TaskAssignmentRole.CHU_TRI,
        note: 'Tiếp nhận túi đề tại Phân hiệu 2 và bảo mật tủ đề thi',
      },
      {
        taskId: taskChoKiemTra.id,
        userId: gvPhanHieu1.id, // Phối hợp ở Phân hiệu 1
        role: TaskAssignmentRole.PHOI_HOP,
        note: 'Đối chiếu số lượng đề chéo giữa 2 phân hiệu',
      },
      {
        taskId: taskChoKiemTra.id,
        userId: toTruongToan.id, // Kiểm tra (Tổ trưởng)
        role: TaskAssignmentRole.KIEM_TRA,
        note: 'Nghiệm thu biên bản niêm phong và báo cáo BGH',
      },
    ],
  });

  // TaskLog cho Task 1
  await prisma.taskLog.createMany({
    data: [
      {
        taskId: taskChoKiemTra.id,
        userId: hieuTruong.id,
        action: 'CREATE_TASK',
        newStatus: TaskStatus.DA_GIAO,
        newProgress: 0,
        note: 'Hiệu trưởng giao nhiệm vụ bàn giao đề thi HK1 cho cụm phân hiệu',
      },
      {
        taskId: taskChoKiemTra.id,
        userId: gvPhanHieu2.id,
        action: 'UPDATE_STATUS',
        oldStatus: TaskStatus.DA_GIAO,
        newStatus: TaskStatus.DANG_THUC_HIEN,
        newProgress: 30,
        note: 'Đã nhận túi đề thi từ Điểm chính vận chuyển sang Phân hiệu 2',
      },
      {
        taskId: taskChoKiemTra.id,
        userId: gvPhanHieu2.id,
        action: 'UPDATE_PROGRESS',
        oldProgress: 30,
        newProgress: 90,
        note: 'Đã niêm phong tủ đề thi tại phòng Hội đồng Phân hiệu 2',
      },
      {
        taskId: taskChoKiemTra.id,
        userId: gvPhanHieu2.id,
        action: 'UPDATE_STATUS',
        oldStatus: TaskStatus.DANG_THUC_HIEN,
        newStatus: TaskStatus.CHO_KIEM_TRA,
        newProgress: 90,
        note: 'Đã tải lên ảnh chụp niêm phong và gửi Tổ trưởng kiểm tra',
      },
    ],
  });

  // Đính kèm minh chứng cho Task 1
  await prisma.attachment.create({
    data: {
      taskId: taskChoKiemTra.id,
      uploadedById: gvPhanHieu2.id,
      fileName: 'bien_ban_niem_phong_de_thi_ph2.pdf',
      originalName: 'Biên bản niêm phong tủ đề thi HK1 - Phân hiệu 2.pdf',
      fileUrl: '/uploads/sample_evidence_doc.pdf',
      fileSize: 524288,
      mimeType: 'application/pdf',
    },
  });

  // 4. TASK 2: Công việc QUÁ HẠN 3 NGÀY (Demo Dashboard cảnh báo đỏ + Gọi điện ngay)
  const taskQuaHan = await prisma.task.create({
    data: {
      schoolId: school.id,
      createdById: hieuTruong.id,
      locationId: phanHieu1.id,
      orgUnitId: toToan.id,
      code: 'CV-DEMO-02',
      title: 'Tổng hợp danh sách học sinh cần phụ đạo yếu kém trước thi HK1',
      description: 'Lập danh sách học sinh có nguy cơ chưa đạt chuẩn môn Toán tại Phân hiệu 1 và xây dựng lịch kèm đôi.',
      priority: TaskPriority.KHAN_CAP,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 40,
      requireAttachment: true,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Đã quá hạn 3 ngày!
    },
  });

  await prisma.taskAssignment.create({
    data: {
      taskId: taskQuaHan.id,
      userId: gvPhanHieu1.id,
      role: TaskAssignmentRole.CHU_TRI,
      note: 'Chủ trì lập danh sách học sinh phụ đạo Phân hiệu 1',
    },
  });

  // 5. TASK 3: Công việc ĐÃ ĐÓNG HOÀN CHỈNH (Demo Xem lại lịch sử & minh chứng)
  const taskDaDong = await prisma.task.create({
    data: {
      schoolId: school.id,
      createdById: hieuTruong.id,
      locationId: phanHieu1.id,
      orgUnitId: toToan.id,
      code: 'CV-DEMO-03',
      title: 'Tập huấn trực tuyến sử dụng phần mềm quản lý công việc TN EDU',
      description: 'Toàn bộ 42 giáo viên 3 điểm trường tham dự hướng dẫn sử dụng tính năng giao việc RACI và báo cáo minh chứng.',
      priority: TaskPriority.CAO,
      status: TaskStatus.DONG,
      progressPercent: 100,
      requireAttachment: true,
      startDate: new Date('2026-09-01'),
      dueDate: new Date('2026-09-05'),
      completedAt: new Date('2026-09-05'),
    },
  });

  await prisma.taskAssignment.createMany({
    data: [
      {
        taskId: taskDaDong.id,
        userId: toTruongToan.id,
        role: TaskAssignmentRole.CHU_TRI,
      },
      {
        taskId: taskDaDong.id,
        userId: hieuTruong.id,
        role: TaskAssignmentRole.PHE_DUYET,
      },
    ],
  });

  await prisma.attachment.create({
    data: {
      taskId: taskDaDong.id,
      uploadedById: toTruongToan.id,
      fileName: 'anh_chup_buoi_tap_huan_tn_edu.jpg',
      originalName: 'Hình ảnh điểm danh tập huấn trực tuyến 3 điểm trường.jpg',
      fileUrl: '/uploads/sample_evidence_img.jpg',
      fileSize: 1048576,
      mimeType: 'image/jpeg',
    },
  });

  // 6. THÔNG BÁO CHO TỔNG THỂ
  await prisma.notification.createMany({
    data: [
      {
        userId: toTruongToan.id,
        link: `/tasks?taskId=${taskChoKiemTra.id}`,
        type: 'NHAC_VIEC',
        title: 'Công việc chờ kiểm tra: Bàn giao túi đề thi HK1',
        content: `Thầy/Cô Trương Quốc Dũng (Phân hiệu 2) đã gửi kết quả nghiệm thu công việc "${taskChoKiemTra.title}".`,
        isRead: false,
      },
      {
        userId: hieuTruong.id,
        link: `/tasks?taskId=${taskQuaHan.id}`,
        type: 'HET_HAN',
        title: 'Cảnh báo quá hạn 3 ngày: Lập danh sách phụ đạo HK1',
        content: `Công việc "${taskQuaHan.title}" tại Phân hiệu 1 đã quá hạn 3 ngày nhưng tiến độ mới đạt 40%.`,
        isRead: false,
      },
    ],
  });

  console.log('✅ THIẾT LẬP KỊCH BẢN DEMO THÀNH CÔNG!');
  console.log('');
  console.log('================================================================');
  console.log('📋 HƯỚNG DẪN 5 BƯỚC TRÌNH DIỄN CHO BAN GIÁM HIỆU (5 PHÚT)');
  console.log('================================================================');
  console.log('🔹 BƯỚC 1: Đăng nhập vai trò Hiệu trưởng (0903111222 / 123456 - Cô Phạm Thị Nam)');
  console.log('   - Xem Dashboard: Thẻ số việc quá hạn (màu đỏ) & Danh sách "Việc cần quan tâm".');
  console.log('   - Thấy ngay việc [CV-DEMO-02] bị quá hạn 3 ngày tại Phân hiệu 1.');
  console.log('   - Bấm nút GỌI ĐIỆN NGAY trên thẻ để gọi thẳng cho cô Bùi Thị Hồng Nhung (0914202001).');
  console.log('');
  console.log('🔹 BƯỚC 2: Vào trang "Theo dõi & Phê duyệt" (/tasks)');
  console.log('   - Bấm tab "Chờ kiểm tra": Thấy ngay việc [CV-DEMO-01] "Đang giữ việc: Tổ trưởng Vũ Đình Dũng".');
  console.log('   - Cột "Thời gian ở trạng thái" thể hiện rõ việc đang tắc ở ai để giải quyết điểm nghẽn.');
  console.log('');
  console.log('🔹 BƯỚC 3: Vào trang "Kế hoạch" (/plans)');
  console.log('   - Xem cây Kế hoạch Học kỳ I mở rộng 3 tuần.');
  console.log('   - Chuyển sang tab "2. Số hóa kế hoạch (Bảng giấy 3 cột)": Nhập nhanh 3 cột và bấm nút:');
  console.log('     "Tạo công việc từ dòng này →" mở thẳng wizard giao việc với thông tin điền sẵn.');
  console.log('');
  console.log('🔹 BƯỚC 4: Thử tạo và giao việc bằng Wizard 3 bước (/tasks -> + Giao việc)');
  console.log('   - Chọn mẫu "Kiểm tra CSVC & PCCC" -> Bước 2: Dùng PeoplePicker chọn Chủ trì.');
  console.log('   - Thấy chấm màu tải việc (xanh/vàng/đỏ) giúp giao đúng người không bị quá tải.');
  console.log('   - Bước 3: Bấm "Giao việc" -> Gửi thông báo tự động và gán RACI tức thì.');
  console.log('');
  console.log('🔹 BƯỚC 5: Đăng nhập vai trò Tổ trưởng (0912111001 / 123456 - Thầy Vũ Đình Dũng)');
  console.log('   - Vào "Việc của tôi" -> Mở việc [CV-DEMO-01] -> Xem tệp minh chứng niêm phong vừa nộp.');
  console.log('   - Bấm nút "Xác nhận đạt / Hoàn thành" -> Trạng thái chuyển HOAN_THANH, tiến độ 100%.');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('Lỗi thiết lập kịch bản demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
