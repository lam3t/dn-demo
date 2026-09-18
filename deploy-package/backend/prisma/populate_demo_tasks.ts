import { PrismaClient, PlanLevel, TaskPriority, TaskStatus, TaskAssignmentRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu tạo 40 công việc mẫu chuẩn chỉnh (Kế hoạch & Việc đột xuất ngoài kế hoạch)...');

  const school = await prisma.school.findFirst();
  if (!school) {
    throw new Error('Chưa có trường học trong CSDL.');
  }

  // 1. Lấy dữ liệu Điểm trường & Tổ ban
  const [locations, orgUnits, users, plans] = await Promise.all([
    prisma.location.findMany({ where: { schoolId: school.id } }),
    prisma.orgUnit.findMany({ where: { schoolId: school.id } }),
    prisma.user.findMany({ where: { schoolId: school.id } }),
    prisma.plan.findMany({ where: { schoolId: school.id } }),
  ]);

  const locMain = locations.find((l) => l.isMain) || locations[0];
  const locPh1 = locations.find((l) => l.code === 'PHAN_HIEU_1') || locations[1] || locMain;
  const locPh2 = locations.find((l) => l.code === 'PHAN_HIEU_2') || locations[2] || locMain;

  const orgBGH = orgUnits.find((o) => o.code === 'BGH') || orgUnits[0];
  const orgToanTin = orgUnits.find((o) => o.code === 'TOAN_TIN') || orgUnits[0];
  const orgVanSuDia = orgUnits.find((o) => o.code === 'VAN_SU_DIA') || orgUnits[0];
  const orgTiengAnh = orgUnits.find((o) => o.code === 'TIENG_ANH') || orgUnits[0];
  const orgKHTN = orgUnits.find((o) => o.code === 'KHTN') || orgUnits[0];
  const orgTheNhacHoa = orgUnits.find((o) => o.code === 'THE_NHAC_HOA') || orgUnits[0];
  const orgGDCD = orgUnits.find((o) => o.code === 'GDCD_HDTN') || orgUnits[0];
  const orgVanPhong = orgUnits.find((o) => o.code === 'VAN_PHONG') || orgUnits[0];

  // Helper tìm User theo SĐT hoặc Email
  const getUserByPhone = (phone: string) => users.find((u) => u.phone === phone) || users[0];
  const uHieuTruong = getUserByPhone('0903111222'); // Phạm Thị Nam
  const uPHTChuyenMon = getUserByPhone('0903222333'); // Trần Thị Bích Mai
  const uPHTPh1 = getUserByPhone('0903333444'); // Lê Hoàng Long
  const uPHTPh2 = getUserByPhone('0903444555'); // Phạm Quốc Tuấn
  const uAdmin = getUserByPhone('0909999999'); // Hoàng Thị Mai Anh
  const uTTToan = getUserByPhone('0912111001'); // Vũ Đình Dũng
  const uTTTiengAnh = getUserByPhone('0912111003'); // Đỗ Mai Hương
  const uTTKHTN = getUserByPhone('0912111004'); // Nguyễn Hoàng Anh
  const uTTVanPhong = getUserByPhone('0912111007'); // Lâm Tuyết Mai (Kế toán trưởng)

  // Danh sách các giáo viên khác để phân công phong phú
  const gvList = users.filter((u) => u.id !== uHieuTruong.id);
  const getGv = (idx: number) => gvList[idx % gvList.length];

  // 2. Kế hoạch tham chiếu
  const planThang9_1 = plans.find((p) => p.title.includes('Ổn định tổ chức bộ máy')) || plans[0];
  const planThang9_2 = plans.find((p) => p.title.includes('Kế hoạch giáo dục nhà trường')) || plans[1] || plans[0];
  const planThang9_3 = plans.find((p) => p.title.includes('vị trí việc làm')) || plans[2] || plans[0];
  const planThang9_4 = plans.find((p) => p.title.includes('học sinh khó khăn')) || plans[3] || plans[0];
  const planThang9_5 = plans.find((p) => p.title.includes('Hội nghị Cán bộ')) || plans[4] || plans[0];

  // 3. Xóa các Task cũ để nạp bộ 40 công việc đồng bộ, chuẩn chỉnh
  console.log('🧹 Đang dọn dẹp các công việc cũ để nạp bộ 40 task quy chuẩn...');
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.taskLog.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.task.deleteMany({});

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // 4. DANH SÁCH 40 CÔNG VIỆC MẪU
  const taskDefinitions = [
    // --- KHỐI 1: CÔNG VIỆC THEO KẾ HOẠCH NĂM HỌC (25 Tasks) ---
    {
      code: 'CV-001',
      title: 'Rà soát và kiện toàn bộ máy tổ chuyên môn sau sáp nhập',
      description: 'Lập danh sách phân công nhiệm vụ Tổ trưởng, Tổ phó chuyên môn tại cả 3 điểm trường và trình Hiệu trưởng phê duyệt.',
      planId: planThang9_1?.id,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      startDate: new Date(now.getTime() - 12 * dayMs),
      dueDate: new Date(now.getTime() - 5 * dayMs),
      completedAt: new Date(now.getTime() - 5 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uPHTChuyenMon,
      phoiHop: [uTTToan, uTTTiengAnh],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-002',
      title: 'Bàn giao và tập trung hồ sơ học bạ, sổ điểm của 3 trường về văn thư Điểm chính',
      description: 'Tiếp nhận bàn giao học bạ học sinh từ 2 phân hiệu, kiểm đếm niêm phong và nhập mã số lưu trữ tập trung tại văn phòng Điểm chính.',
      planId: planThang9_1?.id,
      locationId: locMain.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      startDate: new Date(now.getTime() - 10 * dayMs),
      dueDate: new Date(now.getTime() - 3 * dayMs),
      completedAt: new Date(now.getTime() - 3 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uTTVanPhong,
      phoiHop: [getGv(1), getGv(2)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-003',
      title: 'Thống kê tình trạng phòng máy tính tại cả 3 điểm trường',
      description: 'Kiểm tra 45 máy tính Điểm chính, 30 máy Phân hiệu 1 và 20 máy Phân hiệu 2; lập danh mục máy hỏng cần thay thế linh kiện.',
      planId: planThang9_1?.id,
      locationId: locMain.id,
      orgUnitId: orgToanTin.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DA_TIEP_NHAN,
      progressPercent: 20,
      startDate: new Date(now.getTime() - 4 * dayMs),
      dueDate: new Date(now.getTime() + 4 * dayMs),
      createdById: uPHTChuyenMon.id,
      chuTri: uAdmin,
      phoiHop: [uTTToan, getGv(3)],
      kiemTra: uPHTChuyenMon,
    },
    {
      code: 'CV-004',
      title: 'Xây dựng kế hoạch dạy học & Phân phối chương trình môn Tiếng Anh khối 6-9',
      description: 'Thống nhất chương trình giảng dạy theo SGK mới Global Success cho 122 lớp của toàn trường, đồng bộ giữa các phân hiệu.',
      planId: planThang9_2?.id,
      locationId: locMain.id,
      orgUnitId: orgTiengAnh.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 70,
      startDate: new Date(now.getTime() - 6 * dayMs),
      dueDate: new Date(now.getTime() + 2 * dayMs),
      createdById: uPHTChuyenMon.id,
      chuTri: uTTTiengAnh,
      phoiHop: [getGv(4), getGv(5)],
      kiemTra: uPHTChuyenMon,
    },
    {
      code: 'CV-005',
      title: 'Rà soát trang thiết bị phòng thí nghiệm KHTN tại Phân hiệu 1',
      description: 'Kiểm kê hóa chất, kính hiển vi, dụng cụ thực hành môn Khoa học tự nhiên tại cơ sở Tân Lập.',
      planId: planThang9_1?.id,
      locationId: locPh1.id,
      orgUnitId: orgKHTN.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DA_GIAO,
      progressPercent: 0,
      startDate: new Date(now.getTime() - 1 * dayMs),
      dueDate: new Date(now.getTime() + 6 * dayMs),
      createdById: uPHTPh1.id,
      chuTri: uTTKHTN,
      phoiHop: [getGv(6), getGv(7)],
      kiemTra: uPHTPh1,
    },
    {
      code: 'CV-006',
      title: 'Dự thảo Báo cáo thực trạng CSVC và đề xuất trang thiết bị dạy học tối thiểu',
      description: 'Tổng hợp nhu cầu mua sắm bổ sung bàn ghế, máy chiếu và bảng chống lóa tại 3 điểm trường gửi Phòng GD&ĐT Biên Hòa.',
      planId: planThang9_3?.id,
      locationId: locMain.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.KHAN_CAP,
      status: TaskStatus.CHO_KIEM_TRA,
      progressPercent: 90,
      requireAttachment: true,
      startDate: new Date(now.getTime() - 8 * dayMs),
      dueDate: new Date(now.getTime() + 1 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uPHTPh2,
      phoiHop: [uTTVanPhong, uPHTPh1],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-007',
      title: 'Lập và điều chỉnh Thời khóa biểu chính khóa áp dụng từ tuần thứ 2',
      description: 'Sắp xếp lịch dạy không trùng giờ cho giáo viên dạy liên phân hiệu (Toán, Ngoại ngữ, GDTC).',
      planId: planThang9_2?.id,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.KHAN_CAP,
      status: TaskStatus.CHO_KIEM_TRA,
      progressPercent: 95,
      requireAttachment: true,
      startDate: new Date(now.getTime() - 5 * dayMs),
      dueDate: new Date(now.getTime() + 1 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uPHTChuyenMon,
      phoiHop: [uTTToan, uAdmin],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-008',
      title: 'Kế hoạch tổ chức Tuần sinh hoạt tập thể đầu năm học tại 3 điểm trường',
      description: 'Xây dựng chuỗi hoạt động làm quen trường lớp, giáo dục truyền thống nhà trường và nội quy học sinh.',
      planId: planThang9_2?.id,
      locationId: locPh1.id,
      orgUnitId: orgGDCD.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.BO_SUNG,
      progressPercent: 40,
      startDate: new Date(now.getTime() - 7 * dayMs),
      dueDate: new Date(now.getTime() + 3 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uPHTPh1,
      phoiHop: [getGv(8), getGv(9)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-009',
      title: 'Kiểm kê tài sản bàn ghế, phòng học trước ngày tựu trường',
      description: 'Kiểm kê 122 phòng học chính khóa và các phòng bộ môn, dán nhãn quản lý tài sản theo quy định mới.',
      planId: planThang9_1?.id,
      locationId: locMain.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.XAC_NHAN,
      progressPercent: 100,
      startDate: new Date(now.getTime() - 14 * dayMs),
      dueDate: new Date(now.getTime() - 6 * dayMs),
      completedAt: new Date(now.getTime() - 6 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: getGv(10),
      phoiHop: [uTTVanPhong],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-010',
      title: 'Tổ chức Lễ Khai giảng năm học mới 2026-2027 đồng loạt tại 3 điểm trường',
      description: 'Chuẩn bị khánh tiết, âm thanh ánh sáng, đón tiếp đại biểu UBND và phụ huynh tại Điểm chính, Phân hiệu 1 và Phân hiệu 2.',
      planId: planThang9_2?.id,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.KHAN_CAP,
      status: TaskStatus.DONG,
      progressPercent: 100,
      startDate: new Date(now.getTime() - 15 * dayMs),
      dueDate: new Date(now.getTime() - 5 * dayMs),
      completedAt: new Date(now.getTime() - 5 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uHieuTruong,
      phoiHop: [uPHTChuyenMon, uPHTPh1, uPHTPh2],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-011',
      title: 'Thu thập thông tin mã định danh và thẻ BHYT học sinh đầu năm học',
      description: 'GVCN thu phiếu thông tin của 5.669 học sinh, tổng hợp dữ liệu bảo hiểm y tế nộp về Bảo hiểm Xã hội.',
      planId: planThang9_4?.id,
      locationId: locPh1.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 65,
      startDate: new Date(now.getTime() - 5 * dayMs),
      dueDate: new Date(now.getTime() + 4 * dayMs),
      createdById: uTTVanPhong.id,
      chuTri: getGv(11),
      phoiHop: [uTTVanPhong, getGv(12)],
      kiemTra: uPHTPh1,
    },
    {
      code: 'CV-012',
      title: 'Dự toán kinh phí hoạt động Công đoàn và thăm hỏi đầu năm học 2026 - 2027',
      description: 'Lập dự toán chi quà tặng đầu năm học, kinh phí hỗ trợ công đoàn viên có hoàn cảnh khó khăn tại 3 cơ sở.',
      planId: planThang9_5?.id,
      locationId: locMain.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.CHO_KIEM_TRA,
      progressPercent: 85,
      requireAttachment: true,
      startDate: new Date(now.getTime() - 9 * dayMs),
      dueDate: new Date(now.getTime() - 2 * dayMs), // Quá hạn 2 ngày để demo Quá hạn
      createdById: uHieuTruong.id,
      chuTri: uTTVanPhong,
      phoiHop: [getGv(13)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-013',
      title: 'Chuẩn bị tài liệu & Tham luận cho Hội nghị Cán bộ, Viên chức năm học mới',
      description: 'Biên soạn dự thảo Nghị quyết Hội nghị CBVC, báo cáo tổng kết năm học cũ và phương hướng nhiệm vụ năm học mới.',
      planId: planThang9_5?.id,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 45,
      startDate: new Date(now.getTime() - 4 * dayMs),
      dueDate: new Date(now.getTime() + 3 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uPHTChuyenMon,
      phoiHop: [uTTVanPhong, uTTToan],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-014',
      title: 'Tổ chức Hội thi Giáo viên dạy giỏi cấp trường chào mừng 20/11',
      description: 'Ban hành thể lệ thi đua, lập danh sách Ban giám khảo chấm thi thực hành tiết dạy và bài thi thuyết trình.',
      planId: planThang9_2?.id,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DA_GIAO,
      progressPercent: 0,
      startDate: new Date(now.getTime() + 2 * dayMs),
      dueDate: new Date(now.getTime() + 15 * dayMs),
      createdById: uPHTChuyenMon.id,
      chuTri: uPHTChuyenMon,
      phoiHop: [uTTToan, uTTTiengAnh, uTTKHTN],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-015',
      title: 'Thao giảng cụm chuyên môn liên trường môn Ngữ văn và Lịch sử',
      description: 'Xây dựng 02 tiết thao giảng mẫu ứng dụng công nghệ số và phương pháp dạy học theo dự án tại Phân hiệu 1.',
      planId: planThang9_2?.id,
      locationId: locPh1.id,
      orgUnitId: orgVanSuDia.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 30,
      startDate: new Date(now.getTime() - 3 * dayMs),
      dueDate: new Date(now.getTime() + 7 * dayMs),
      createdById: uPHTChuyenMon.id,
      chuTri: getGv(14),
      phoiHop: [getGv(15), getGv(16)],
      kiemTra: uPHTChuyenMon,
    },
    {
      code: 'CV-016',
      title: 'Khảo sát chất lượng học tập đầu năm môn Toán & Tiếng Anh khối 6, 9',
      description: 'Tổ chức làm bài khảo sát đánh giá năng lực đầu vào lớp 6 và rà soát kiến thức lớp 9 phục vụ phân hóa dạy học.',
      planId: planThang9_2?.id,
      locationId: locMain.id,
      orgUnitId: orgToanTin.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 50,
      startDate: new Date(now.getTime() - 5 * dayMs),
      dueDate: new Date(now.getTime() + 5 * dayMs),
      createdById: uPHTChuyenMon.id,
      chuTri: uTTToan,
      phoiHop: [uTTTiengAnh, getGv(17)],
      kiemTra: uPHTChuyenMon,
    },
    {
      code: 'CV-017',
      title: 'Tổ chức chuyên đề Đổi mới phương pháp dạy học STEM/STEAM tích hợp KHTN',
      description: 'Thiết kế 3 chủ đề dạy học STEM liên môn Vật lý - Hóa học - Sinh học áp dụng thử nghiệm tại Phân hiệu 2.',
      planId: planThang9_2?.id,
      locationId: locPh2.id,
      orgUnitId: orgKHTN.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DA_TIEP_NHAN,
      progressPercent: 15,
      startDate: new Date(now.getTime() - 2 * dayMs),
      dueDate: new Date(now.getTime() + 10 * dayMs),
      createdById: uPHTPh2.id,
      chuTri: uTTKHTN,
      phoiHop: [getGv(18), getGv(19)],
      kiemTra: uPHTPh2,
    },
    {
      code: 'CV-018',
      title: 'Xây dựng ngân hàng câu hỏi kiểm tra đánh giá định kỳ trên hệ thống số',
      description: 'Số hóa 500 câu hỏi trắc nghiệm và ma trận đề thi các môn tự nhiên - xã hội lên phần mềm thi trắc nghiệm.',
      planId: planThang9_2?.id,
      locationId: locMain.id,
      orgUnitId: orgToanTin.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 80,
      startDate: new Date(now.getTime() - 7 * dayMs),
      dueDate: new Date(now.getTime() + 6 * dayMs),
      createdById: uPHTChuyenMon.id,
      chuTri: uAdmin,
      phoiHop: [uTTToan, uTTKHTN],
      kiemTra: uPHTChuyenMon,
    },
    {
      code: 'CV-019',
      title: 'Tổ chức khám sức khỏe định kỳ và kiểm tra nha học đường cho học sinh khối 6',
      description: 'Phối hợp Trạm Y tế phường Phước Tân kiểm tra chiều cao, cân nặng, thị lực và răng miệng cho 1.438 học sinh lớp 6.',
      planId: planThang9_4?.id,
      locationId: locMain.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DA_GIAO,
      progressPercent: 0,
      startDate: new Date(now.getTime() + 3 * dayMs),
      dueDate: new Date(now.getTime() + 14 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: getGv(20),
      phoiHop: [uTTVanPhong, getGv(21)],
      kiemTra: uPHTPh1,
    },
    {
      code: 'CV-020',
      title: 'Phát động phong trào làm đồ dùng dạy học tự làm cấp trường',
      description: 'Mỗi tổ chuyên môn đăng ký ít nhất 02 thiết bị dạy học số hoặc mô hình trực quan tự sáng tạo.',
      planId: planThang9_2?.id,
      locationId: locPh1.id,
      orgUnitId: orgTheNhacHoa.id,
      priority: TaskPriority.THAP,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 25,
      startDate: new Date(now.getTime() - 3 * dayMs),
      dueDate: new Date(now.getTime() + 12 * dayMs),
      createdById: uPHTPh1.id,
      chuTri: getGv(22),
      phoiHop: [uTTKHTN, getGv(23)],
      kiemTra: uPHTPh1,
    },
    {
      code: 'CV-021',
      title: 'Tổ chức Giải bóng đá học sinh truyền thống THCS Phước Tân tại Phân hiệu 1',
      description: 'Bốc thăm chia bảng 32 đội bóng nam khối 8-9, chuẩn bị sân bãi và tổ chức khai mạc giải.',
      planId: planThang9_2?.id,
      locationId: locPh1.id,
      orgUnitId: orgTheNhacHoa.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 40,
      startDate: new Date(now.getTime() - 4 * dayMs),
      dueDate: new Date(now.getTime() + 8 * dayMs),
      createdById: uPHTPh1.id,
      chuTri: getGv(24),
      phoiHop: [getGv(25)],
      kiemTra: uPHTPh1,
    },
    {
      code: 'CV-022',
      title: 'Tổng kết đợt thi đua Dạy tốt - Học tốt chào mừng ngày 20/11',
      description: 'Xét khen thưởng các tập thể lớp xuất sắc và cá nhân giáo viên đạt tiết dạy giỏi.',
      planId: planThang9_2?.id,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DA_GIAO,
      progressPercent: 0,
      startDate: new Date(now.getTime() + 5 * dayMs),
      dueDate: new Date(now.getTime() + 20 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uPHTChuyenMon,
      phoiHop: [uTTVanPhong],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-023',
      title: 'Tập huấn sử dụng học liệu số và sổ điểm điện tử cho toàn thể giáo viên',
      description: 'Hướng dẫn 100% giáo viên nhập điểm, nhận xét học bạ điện tử và gửi thông báo cho phụ huynh qua ứng dụng di động.',
      planId: planThang9_1?.id,
      locationId: locMain.id,
      orgUnitId: orgToanTin.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      startDate: new Date(now.getTime() - 14 * dayMs),
      dueDate: new Date(now.getTime() - 4 * dayMs),
      completedAt: new Date(now.getTime() - 4 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uAdmin,
      phoiHop: [uTTToan],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-024',
      title: 'Kiểm tra chuyên đề hồ sơ giáo án và đổi mới kiểm tra đánh giá đợt 1',
      description: 'BGH và Tổ trưởng duyệt giáo án điện tử của 50 giáo viên, đánh giá sự phù hợp với khung chương trình mới.',
      planId: planThang9_2?.id,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 60,
      startDate: new Date(now.getTime() - 3 * dayMs),
      dueDate: new Date(now.getTime() + 5 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uPHTChuyenMon,
      phoiHop: [uTTToan, uTTTiengAnh, uTTKHTN],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-025',
      title: 'Lập danh sách học sinh bồi dưỡng học sinh giỏi lớp 9 môn Toán, Văn, Anh',
      description: 'Chọn lọc 45 học sinh có thành tích xuất sắc, phân công giáo viên ôn luyện các buổi chiều trong tuần.',
      planId: planThang9_2?.id,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.CHO_KIEM_TRA,
      progressPercent: 90,
      requireAttachment: true,
      startDate: new Date(now.getTime() - 6 * dayMs),
      dueDate: new Date(now.getTime() + 2 * dayMs),
      createdById: uPHTChuyenMon.id,
      chuTri: uTTToan,
      phoiHop: [uTTTiengAnh, getGv(14)],
      kiemTra: uPHTChuyenMon,
    },

    // --- KHỐI 2: VIỆC PHÁT SINH ĐỘT XUẤT / NGOÀI KẾ HOẠCH (15 Tasks - planId: null) ---
    {
      code: 'CV-026',
      title: 'Kiểm tra đột xuất công tác An toàn vệ sinh thực phẩm bếp ăn bán trú Phân hiệu 2',
      description: 'Đột xuất kiểm tra nguồn gốc thực phẩm tươi sống, quy trình lưu mẫu thức ăn 24h và vệ sinh khu chế biến tại bếp ăn Vườn Dừa.',
      planId: null, // Việc đột xuất ngoài kế hoạch
      locationId: locPh2.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.KHAN_CAP,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 80,
      startDate: new Date(now.getTime() - 1 * dayMs),
      dueDate: new Date(now.getTime() + 1 * dayMs), // Hạn trong hôm nay/ngày mai
      createdById: uHieuTruong.id,
      chuTri: uPHTPh2,
      phoiHop: [getGv(20), uTTVanPhong],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-027',
      title: 'Khắc phục sự cố sạt lở một đoạn bờ rào Phân hiệu 2 do mưa bão lớn',
      description: 'Gia cố tạm thời bằng cọc bê tông và lưới thép B40, căng dây cảnh báo nguy hiểm không cho học sinh lại gần.',
      planId: null,
      locationId: locPh2.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.KHAN_CAP,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 85,
      startDate: new Date(now.getTime() - 2 * dayMs),
      dueDate: new Date(now.getTime() + 1 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uPHTPh2,
      phoiHop: [getGv(10)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-028',
      title: 'Xử lý sự cố đứt cáp quang Internet tại phòng máy Điểm chính',
      description: 'Liên hệ nhà mạng VNPT hàn nối đường truyền cáp quang phục vụ giảng dạy môn Tin học và họp trực tuyến BGH.',
      planId: null,
      locationId: locMain.id,
      orgUnitId: orgToanTin.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      startDate: new Date(now.getTime() - 3 * dayMs),
      dueDate: new Date(now.getTime() - 1 * dayMs),
      completedAt: new Date(now.getTime() - 1 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uAdmin,
      phoiHop: [uTTToan],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-029',
      title: 'Sửa chữa khẩn cấp hệ thống máy bơm nước và nhà vệ sinh học sinh Phân hiệu 1',
      description: 'Thay thế rơ-le máy bơm áp lực và sửa chữa 4 van xả nước tự động phục vụ khu vệ sinh học sinh Tân Lập.',
      planId: null,
      locationId: locPh1.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.KHAN_CAP,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 50,
      startDate: new Date(now.getTime() - 1 * dayMs),
      dueDate: new Date(now.getTime() + 2 * dayMs),
      createdById: uPHTPh1.id,
      chuTri: uPHTPh1,
      phoiHop: [getGv(10)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-030',
      title: 'Đón và làm việc với Đoàn Kiểm tra Liên ngành TP. Biên Hòa về phòng cháy chữa cháy',
      description: 'Chuẩn bị hồ sơ thẩm duyệt PCCC, sơ đồ thoát hiểm, nhật ký bảo dưỡng bình chữa cháy và phương án diễn tập.',
      planId: null,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.CHO_KIEM_TRA,
      progressPercent: 90,
      requireAttachment: true,
      startDate: new Date(now.getTime() - 4 * dayMs),
      dueDate: new Date(now.getTime() + 1 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uHieuTruong,
      phoiHop: [uPHTPh1, uPHTPh2, getGv(10)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-031',
      title: 'Vận động hỗ trợ viện phí đột xuất cho học sinh lớp 7A2 Phân hiệu 1 bị tai nạn',
      description: 'Công đoàn và Chi đoàn trường kêu gọi quyên góp giúp đỡ gia đình em Nguyễn Văn A điều trị tại Bệnh viện Nhi Đồng Đồng Nai.',
      planId: null,
      locationId: locPh1.id,
      orgUnitId: orgGDCD.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      startDate: new Date(now.getTime() - 7 * dayMs),
      dueDate: new Date(now.getTime() - 2 * dayMs),
      completedAt: new Date(now.getTime() - 2 * dayMs),
      createdById: uPHTPh1.id,
      chuTri: uPHTPh1,
      phoiHop: [uTTVanPhong, getGv(8)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-032',
      title: 'Cử giáo viên tham dự Hội nghị Tập huấn Chương trình GDPT 2018 tại Sở GD&ĐT',
      description: 'Cử 04 giáo viên cốt cán tham dự tập huấn phương pháp dạy học phân hóa tại Hội trường Sở GD&ĐT Đồng Nai.',
      planId: null,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 70,
      startDate: new Date(now.getTime() - 2 * dayMs),
      dueDate: new Date(now.getTime() + 3 * dayMs),
      createdById: uPHTChuyenMon.id,
      chuTri: uPHTChuyenMon,
      phoiHop: [uTTTiengAnh, uTTKHTN],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-033',
      title: 'Báo cáo nhanh số liệu tiêm chủng vắc xin và phòng chống dịch sốt xuất huyết',
      description: 'Tổng hợp tỷ lệ tiêm vắc xin sởi - rubella và lập báo cáo đột xuất theo công văn hỏa tốc của Trung tâm Y tế Biên Hòa.',
      planId: null,
      locationId: locMain.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.CHO_KIEM_TRA,
      progressPercent: 95,
      requireAttachment: true,
      startDate: new Date(now.getTime() - 5 * dayMs),
      dueDate: new Date(now.getTime() - 1 * dayMs), // Quá hạn 1 ngày
      createdById: uHieuTruong.id,
      chuTri: getGv(20),
      phoiHop: [uTTVanPhong],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-034',
      title: 'Lắp đặt bổ sung hệ thống quạt thông gió và đèn chiếu sáng tại 4 phòng học mới',
      description: 'Nghiệm thu lắp đặt 16 quạt trần và 32 bóng đèn LED chống cận thị tại khu phòng học mới Phân hiệu 2.',
      planId: null,
      locationId: locPh2.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 40,
      startDate: new Date(now.getTime() - 3 * dayMs),
      dueDate: new Date(now.getTime() + 6 * dayMs),
      createdById: uPHTPh2.id,
      chuTri: getGv(10),
      phoiHop: [uPHTPh2],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-035',
      title: 'Tiếp nhận và đối chiếu 150 bộ sách giáo khoa tài trợ cho học sinh nghèo',
      description: 'Tiếp nhận sách từ Hội Khuyến học Tỉnh, phân loại theo khối 6-9 và lập danh sách cấp phát tận tay học sinh.',
      planId: null,
      locationId: locMain.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      startDate: new Date(now.getTime() - 8 * dayMs),
      dueDate: new Date(now.getTime() - 3 * dayMs),
      completedAt: new Date(now.getTime() - 3 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uTTVanPhong,
      phoiHop: [getGv(1)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-036',
      title: 'Khảo sát ý kiến phụ huynh về phương án xe buýt đưa đón học sinh liên phân hiệu',
      description: 'Phát phiếu lấy ý kiến phụ huynh học sinh khu vực Tân Lập và Vườn Dừa về nhu cầu tuyến xe buýt học đường an toàn.',
      planId: null,
      locationId: locPh1.id,
      orgUnitId: orgGDCD.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 35,
      startDate: new Date(now.getTime() - 2 * dayMs),
      dueDate: new Date(now.getTime() + 7 * dayMs),
      createdById: uPHTPh1.id,
      chuTri: uPHTPh1,
      phoiHop: [uPHTPh2, getGv(8)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-037',
      title: 'Rà soát chứng chỉ chức danh nghề nghiệp giáo viên phục vụ thăng hạng',
      description: 'Kiểm tra hồ sơ chứng chỉ chức danh nghề nghiệp hạng II, hạng I của 156 giáo viên phục vụ kỳ thi thăng hạng năm 2026.',
      planId: null,
      locationId: locMain.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.TRUNG_BINH,
      status: TaskStatus.DA_GIAO,
      progressPercent: 0,
      startDate: new Date(now.getTime() + 1 * dayMs),
      dueDate: new Date(now.getTime() + 18 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uTTVanPhong,
      phoiHop: [getGv(2)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-038',
      title: 'Phun khử khuẩn và diệt lăng quăng toàn bộ khuôn viên 3 điểm trường',
      description: 'Phối hợp Đội Y tế dự phòng phun thuốc muỗi phòng chống sốt xuất huyết tại toàn bộ lớp học và sân trường.',
      planId: null,
      locationId: locMain.id,
      orgUnitId: orgVanPhong.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.HOAN_THANH,
      progressPercent: 100,
      startDate: new Date(now.getTime() - 6 * dayMs),
      dueDate: new Date(now.getTime() - 1 * dayMs),
      completedAt: new Date(now.getTime() - 1 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: getGv(20),
      phoiHop: [getGv(10)],
      kiemTra: uHieuTruong,
    },
    {
      code: 'CV-039',
      title: 'Tổ chức buổi sinh hoạt chuyên đề Kỹ năng phòng chống bạo lực học đường và an toàn mạng',
      description: 'Mời báo cáo viên Công an Phường Phước Tân tuyên truyền kỹ năng sử dụng mạng xã hội văn minh cho học sinh khối 8-9.',
      planId: null,
      locationId: locPh1.id,
      orgUnitId: orgGDCD.id,
      priority: TaskPriority.CAO,
      status: TaskStatus.DANG_THUC_HIEN,
      progressPercent: 60,
      startDate: new Date(now.getTime() - 3 * dayMs),
      dueDate: new Date(now.getTime() + 5 * dayMs),
      createdById: uPHTPh1.id,
      chuTri: getGv(8),
      phoiHop: [getGv(9)],
      kiemTra: uPHTPh1,
    },
    {
      code: 'CV-040',
      title: 'Báo cáo đột xuất tình hình an ninh trật tự khu vực cổng trường giờ tan học gửi Công an Phường',
      description: 'Lập biên bản phối hợp điều tiết giao thông và xử lý các trường hợp lấn chiếm vỉa hè trước cổng trường Điểm chính.',
      planId: null,
      locationId: locMain.id,
      orgUnitId: orgBGH.id,
      priority: TaskPriority.KHAN_CAP,
      status: TaskStatus.CHO_KIEM_TRA,
      progressPercent: 95,
      requireAttachment: true,
      startDate: new Date(now.getTime() - 2 * dayMs),
      dueDate: new Date(now.getTime() + 1 * dayMs),
      createdById: uHieuTruong.id,
      chuTri: uPHTPh2,
      phoiHop: [getGv(10)],
      kiemTra: uHieuTruong,
    },
  ];

  console.log(`Bắt đầu tạo ${taskDefinitions.length} công việc vào CSDL Supabase...`);

  for (const def of taskDefinitions) {
    const rawAssignments = [
      {
        userId: def.chuTri.id,
        role: TaskAssignmentRole.CHU_TRI,
        note: 'Chịu trách nhiệm chính thực hiện',
      },
      ...(def.phoiHop || [])
        .filter((u) => u.id !== def.chuTri.id)
        .map((u) => ({
          userId: u.id,
          role: TaskAssignmentRole.PHOI_HOP,
          note: 'Đầu mối phối hợp thực hiện',
        })),
      ...(def.kiemTra.id !== def.chuTri.id
        ? [
            {
              userId: def.kiemTra.id,
              role: TaskAssignmentRole.KIEM_TRA,
              note: 'Kiểm tra & nghiệm thu chất lượng',
            },
          ]
        : []),
    ];

    // Lọc trùng lặp taskId + userId + role
    const seen = new Set<string>();
    const assignmentList = rawAssignments.filter((a) => {
      const k = `${a.userId}_${a.role}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const task = await prisma.task.create({
      data: {
        schoolId: school.id,
        code: def.code,
        title: def.title,
        description: def.description,
        planId: def.planId || null,
        locationId: def.locationId,
        orgUnitId: def.orgUnitId,
        priority: def.priority,
        status: def.status,
        progressPercent: def.progressPercent,
        requireAttachment: def.requireAttachment ?? false,
        startDate: def.startDate,
        dueDate: def.dueDate,
        completedAt: def.completedAt || null,
        createdById: def.createdById,
        assignments: {
          create: assignmentList,
        },
        logs: {
          create: [
            {
              userId: def.createdById,
              action: 'TAO_MOI',
              newStatus: TaskStatus.DA_GIAO,
              newProgress: 0,
              note: def.planId ? 'Giao việc theo kế hoạch giáo dục' : 'Giao nhiệm vụ phát sinh đột xuất',
            },
            ...(def.status !== TaskStatus.DA_GIAO
              ? [
                  {
                    userId: def.chuTri.id,
                    action: `CHUYEN_TRANG_THAI_${def.status}`,
                    oldStatus: TaskStatus.DA_GIAO,
                    newStatus: def.status,
                    oldProgress: 0,
                    newProgress: def.progressPercent,
                    note: `Cập nhật tiến độ lên ${def.progressPercent}%`,
                  },
                ]
              : []),
          ],
        },
        comments: {
          create: [
            {
              userId: def.chuTri.id,
              content: `Đã tiếp nhận nhiệm vụ [${def.code}]. Đang khẩn trương phối hợp với các bộ phận liên quan để hoàn thành đúng hạn.`,
            },
          ],
        },
      },
    });

    // Nếu task có requireAttachment, tạo 1 attachment mẫu
    if (def.requireAttachment) {
      await prisma.attachment.create({
        data: {
          taskId: task.id,
          uploadedById: def.chuTri.id,
          fileName: `minh_chung_${def.code.toLowerCase()}.pdf`,
          originalName: `Báo cáo kết quả - ${def.title}.pdf`,
          fileUrl: `/uploads/tasks/${task.id}/minh_chung.pdf`,
          fileSize: 1024 * 350,
          mimeType: 'application/pdf',
        },
      });
    }
  }

  // 5. Tính toán lại tiến độ các Kế hoạch
  console.log('🔄 Đang tính toán lại tiến độ toàn bộ các cấp kế hoạch...');
  for (const p of plans) {
    const tasksInPlan = await prisma.task.findMany({
      where: { planId: p.id, status: { notIn: [TaskStatus.HUY] } },
      select: { progressPercent: true },
    });
    if (tasksInPlan.length > 0) {
      const avg = Math.round(tasksInPlan.reduce((a, b) => a + b.progressPercent, 0) / tasksInPlan.length);
      await prisma.plan.update({
        where: { id: p.id },
        data: { progressPercent: avg },
      });
    }
  }

  const finalCount = await prisma.task.count();
  const inPlanCount = await prisma.task.count({ where: { planId: { not: null } } });
  const outPlanCount = await prisma.task.count({ where: { planId: null } });

  console.log('================================================================');
  console.log(`🎉 TẠO DỮ LIỆU DEMO THÀNH CÔNG RỰC RỠ!`);
  console.log(`📊 Tổng số công việc: ${finalCount}`);
  console.log(`   - Công việc theo Kế hoạch: ${inPlanCount} việc`);
  console.log(`   - Việc phát sinh đột xuất: ${outPlanCount} việc`);
  console.log('================================================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
