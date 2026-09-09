import { PrismaClient, Role, PlanLevel, TaskStatus, TaskPriority, TaskAssignmentRole, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu tạo dữ liệu mẫu TN EDU (Seed Data)...');

  // Xóa dữ liệu cũ theo thứ tự quan hệ
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.taskLog.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.orgUnit.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.school.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // 1. TẠO TRƯỜNG HỌC
  const school = await prisma.school.create({
    data: {
      name: 'Trường TH và THCS Phước Tân',
      code: 'TH_THCS_PHUOC_TAN',
      address: 'Phường Phước Tân, TP. Biên Hòa, Tỉnh Đồng Nai',
      phone: '02513888999',
      email: 'th_thcs_phuoctan@dongnai.edu.vn',
      website: 'https://th-thcsphuoctan.dongnai.edu.vn',
      principalName: 'Phạm Thị Nam',
      totalStudents: 5669,
      totalFemaleStudents: 2736,
      totalClasses: 122,
      totalStaff: 218,
      schoolYear: '2026 - 2027',
      description: 'Trường TH và THCS Phước Tân được thành lập sau khi sắp xếp, sáp nhập trên địa bàn phường Phước Tân. Nhà trường quản lý đồng bộ 3 điểm trường với 122 lớp, 5.669 học sinh và 218 cán bộ, giáo viên, nhân viên.',
      statsJson: JSON.stringify({
        grades: {
          g6: { classes: 31, students: 1438, female: 702 },
          g7: { classes: 27, students: 1338, female: 651 },
          g8: { classes: 31, students: 1345, female: 629 },
          g9: { classes: 33, students: 1548, female: 754 }
        },
        locationsBreakdown: {
          main: {
            name: 'Điểm chính (Trung tâm)',
            classes: 44,
            students: 2137,
            female: 1027,
            g6: { classes: 10, students: 494 },
            g7: { classes: 10, students: 527 },
            g8: { classes: 13, students: 565 },
            g9: { classes: 11, students: 551 }
          },
          ph1: {
            name: 'Phân hiệu 1 (Tân Lập)',
            classes: 59,
            students: 2688,
            female: 1339,
            g6: { classes: 16, students: 746 },
            g7: { classes: 12, students: 570 },
            g8: { classes: 14, students: 601 },
            g9: { classes: 17, students: 771 }
          },
          ph2: {
            name: 'Phân hiệu 2 (Vườn Dừa)',
            classes: 19,
            students: 844,
            female: 370,
            g6: { classes: 5, students: 198 },
            g7: { classes: 5, students: 241 },
            g8: { classes: 4, students: 179 },
            g9: { classes: 5, students: 226 }
          }
        }
      })
    },
  });
  console.log(`✓ Đã tạo trường: ${school.name} (Hiệu trưởng: ${school.principalName}, Quy mô: ${school.totalClasses} lớp, ${school.totalStudents} HS)`);

  // 2. TẠO 3 ĐIỂM TRƯỜNG
  const locMain = await prisma.location.create({
    data: {
      schoolId: school.id,
      name: 'Điểm chính (Trung tâm)',
      code: 'DIEM_CHINH',
      address: 'Số 10 đường Nguyễn Huệ, Phước Tân, TP. Biên Hòa',
      phone: '02513888001',
      studentCount: 2137,
      femaleStudentCount: 1027,
      classCount: 44,
      isMain: true,
    },
  });

  const locPh1 = await prisma.location.create({
    data: {
      schoolId: school.id,
      name: 'Phân hiệu 1 (Tân Lập)',
      code: 'PHAN_HIEU_1',
      address: 'Khu phố Tân Lập, Phước Tân, TP. Biên Hòa',
      phone: '02513888002',
      studentCount: 2688,
      femaleStudentCount: 1339,
      classCount: 59,
      isMain: false,
    },
  });

  const locPh2 = await prisma.location.create({
    data: {
      schoolId: school.id,
      name: 'Phân hiệu 2 (Vườn Dừa)',
      code: 'PHAN_HIEU_2',
      address: 'Ấp Vườn Dừa, Phước Tân, TP. Biên Hòa',
      phone: '02513888003',
      studentCount: 844,
      femaleStudentCount: 370,
      classCount: 19,
      isMain: false,
    },
  });
  console.log('✓ Đã tạo 3 điểm trường (Điểm chính: 44 lớp/2.137 HS, Phân hiệu 1: 59 lớp/2.688 HS, Phân hiệu 2: 19 lớp/844 HS)');

  // 3. TẠO 8 TỔ CHỨC / PHÒNG BAN
  const orgBGH = await prisma.orgUnit.create({
    data: { schoolId: school.id, name: 'Ban Giám hiệu', code: 'BGH', orderIndex: 1 },
  });
  const orgToanTin = await prisma.orgUnit.create({
    data: { schoolId: school.id, name: 'Tổ Toán - Tin học', code: 'TOAN_TIN', orderIndex: 2 },
  });
  const orgVanSuDia = await prisma.orgUnit.create({
    data: { schoolId: school.id, name: 'Tổ Ngữ văn - Lịch sử - Địa lý', code: 'VAN_SU_DIA', orderIndex: 3 },
  });
  const orgTiengAnh = await prisma.orgUnit.create({
    data: { schoolId: school.id, name: 'Tổ Tiếng Anh', code: 'TIENG_ANH', orderIndex: 4 },
  });
  const orgKHTN = await prisma.orgUnit.create({
    data: { schoolId: school.id, name: 'Tổ Khoa học Tự nhiên (Lý - Hóa - Sinh)', code: 'KHTN', orderIndex: 5 },
  });
  const orgTheNhacHoa = await prisma.orgUnit.create({
    data: { schoolId: school.id, name: 'Tổ Thể dục - Âm nhạc - Mỹ thuật', code: 'THE_NHAC_HOA', orderIndex: 6 },
  });
  const orgGDCD = await prisma.orgUnit.create({
    data: { schoolId: school.id, name: 'Tổ GDCD - Hoạt động trải nghiệm', code: 'GDCD_HDTN', orderIndex: 7 },
  });
  const orgVanPhong = await prisma.orgUnit.create({
    data: { schoolId: school.id, name: 'Tổ Văn phòng (Hành chính - Kế toán - Y tế)', code: 'VAN_PHONG', orderIndex: 8 },
  });
  console.log('✓ Đã tạo 8 tổ chuyên môn & văn phòng');

  // 4. TẠO NHÂN SỰ
  // Helper tạo user kèm role
  const createUser = async (
    fullName: string,
    email: string,
    phone: string,
    title: string,
    role: Role,
    primaryLocId: string,
    primaryOrgId: string,
    scopeLocId?: string,
    scopeOrgId?: string,
    avatarUrl?: string
  ) => {
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash: defaultPasswordHash,
        title,
        schoolId: school.id,
        primaryLocationId: primaryLocId,
        primaryOrgUnitId: primaryOrgId,
        avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1F3864&color=fff`,
        roles: {
          create: {
            role,
            scopeLocationId: scopeLocId || null,
            scopeOrgUnitId: scopeOrgId || null,
          },
        },
      },
    });
    return user;
  };

  // 4.1 Ban Giám hiệu
  const uHieuTruong = await createUser(
    'Phạm Thị Nam',
    'hieutruong@phuoctan.edu.vn',
    '0903111222',
    'Hiệu trưởng',
    Role.HIEU_TRUONG,
    locMain.id,
    orgBGH.id
  );

  const uPHTChuyenMon = await createUser(
    'Trần Thị Bích Mai',
    'pht.chuyenmon@phuoctan.edu.vn',
    '0903222333',
    'Phó Hiệu trưởng (Phụ trách Chuyên môn)',
    Role.PHO_HIEU_TRUONG,
    locMain.id,
    orgBGH.id
  );

  const uPHTPhanHieu1 = await createUser(
    'Lê Hoàng Long',
    'pht.ph1@phuoctan.edu.vn',
    '0903333444',
    'Phó Hiệu trưởng (Phụ trách Phân hiệu 1)',
    Role.PHO_HIEU_TRUONG,
    locPh1.id,
    orgBGH.id,
    locPh1.id
  );

  const uPHTPhanHieu2 = await createUser(
    'Phạm Quốc Tuấn',
    'pht.ph2@phuoctan.edu.vn',
    '0903444555',
    'Phó Hiệu trưởng (Phụ trách Phân hiệu 2)',
    Role.PHO_HIEU_TRUONG,
    locPh2.id,
    orgBGH.id,
    locPh2.id
  );

  // 4.2 Quản trị hệ thống
  const uAdmin = await createUser(
    'Bùi Thanh Tùng',
    'admin@phuoctan.edu.vn',
    '0909999999',
    'Quản trị hệ thống - GV Tin học',
    Role.ADMIN,
    locMain.id,
    orgToanTin.id
  );

  // 4.3 Tổ trưởng chuyên môn
  const uTTToanTin = await createUser(
    'Vũ Đình Dũng',
    'dung.toantin@phuoctan.edu.vn',
    '0912111001',
    'Tổ trưởng Toán - Tin',
    Role.TO_TRUONG,
    locMain.id,
    orgToanTin.id,
    undefined,
    orgToanTin.id
  );

  const uTTVanSuDia = await createUser(
    'Nguyễn Thị Thu Hà',
    'ha.vansudia@phuoctan.edu.vn',
    '0912111002',
    'Tổ trưởng Văn - Sử - Địa',
    Role.TO_TRUONG,
    locMain.id,
    orgVanSuDia.id,
    undefined,
    orgVanSuDia.id
  );

  const uTTTiengAnh = await createUser(
    'Đỗ Mai Hương',
    'huong.tienganh@phuoctan.edu.vn',
    '0912111003',
    'Tổ trưởng Tiếng Anh',
    Role.TO_TRUONG,
    locPh1.id,
    orgTiengAnh.id,
    undefined,
    orgTiengAnh.id
  );

  const uTTKHTN = await createUser(
    'Hoàng Trọng Nghĩa',
    'nghia.khtn@phuoctan.edu.vn',
    '0912111004',
    'Tổ trưởng KHTN (Lý - Hóa - Sinh)',
    Role.TO_TRUONG,
    locPh2.id,
    orgKHTN.id,
    undefined,
    orgKHTN.id
  );

  const uTTTheNhacHoa = await createUser(
    'Đặng Văn Hùng',
    'hung.thenhachoa@phuoctan.edu.vn',
    '0912111005',
    'Tổ trưởng Thể-Nhạc-Họa',
    Role.TO_TRUONG,
    locMain.id,
    orgTheNhacHoa.id,
    undefined,
    orgTheNhacHoa.id
  );

  const uTTGDCD = await createUser(
    'Phan Thanh Trúc',
    'truc.gdcd@phuoctan.edu.vn',
    '0912111006',
    'Tổ trưởng GDCD - HĐTN',
    Role.TO_TRUONG,
    locPh1.id,
    orgGDCD.id,
    undefined,
    orgGDCD.id
  );

  const uTTVanPhong = await createUser(
    'Lâm Tuyết Mai',
    'mai.vanphong@phuoctan.edu.vn',
    '0912111007',
    'Tổ trưởng Văn phòng - Kế toán trưởng',
    Role.TO_TRUONG,
    locMain.id,
    orgVanPhong.id,
    undefined,
    orgVanPhong.id
  );

  // 4.4 Danh sách Giáo viên & Nhân viên tại 3 điểm trường
  const teachersData = [
    // Điểm chính
    { name: 'Nguyễn Văn Bình', email: 'binh.nv@phuoctan.edu.vn', phone: '0913101001', title: 'Giáo viên Toán', loc: locMain.id, org: orgToanTin.id },
    { name: 'Trần Minh Đức', email: 'duc.tm@phuoctan.edu.vn', phone: '0913101002', title: 'Giáo viên Tin học', loc: locMain.id, org: orgToanTin.id },
    { name: 'Lê Thị Cẩm Tú', email: 'tu.ltc@phuoctan.edu.vn', phone: '0913101003', title: 'Giáo viên Ngữ văn', loc: locMain.id, org: orgVanSuDia.id },
    { name: 'Phạm Thị Mỹ Linh', email: 'linh.ptm@phuoctan.edu.vn', phone: '0913101004', title: 'Giáo viên Lịch sử', loc: locMain.id, org: orgVanSuDia.id },
    { name: 'Hoàng Quốc Việt', email: 'viet.hq@phuoctan.edu.vn', phone: '0913101005', title: 'Giáo viên Tiếng Anh', loc: locMain.id, org: orgTiengAnh.id },
    { name: 'Vũ Thị Thanh Tâm', email: 'tam.vtt@phuoctan.edu.vn', phone: '0913101006', title: 'Giáo viên Vật lý', loc: locMain.id, org: orgKHTN.id },
    { name: 'Đặng Minh Quân', email: 'quan.dm@phuoctan.edu.vn', phone: '0913101007', title: 'Giáo viên Hóa học', loc: locMain.id, org: orgKHTN.id },
    { name: 'Trịnh Hoài Nam', email: 'nam.th@phuoctan.edu.vn', phone: '0913101008', title: 'Giáo viên Thể dục', loc: locMain.id, org: orgTheNhacHoa.id },
    { name: 'Nguyễn Thị Kim Loan', email: 'loan.ntk@phuoctan.edu.vn', phone: '0913101009', title: 'Cán bộ Văn thư - Lưu trữ', loc: locMain.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },
    { name: 'Phan Văn Hậu', email: 'hau.pv@phuoctan.edu.vn', phone: '0913101010', title: 'Cán bộ Thiết bị - Thư viện', loc: locMain.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },

    // Phân hiệu 1
    { name: 'Bùi Thị Hồng Nhung', email: 'nhung.bth@phuoctan.edu.vn', phone: '0914202001', title: 'Giáo viên Toán', loc: locPh1.id, org: orgToanTin.id },
    { name: 'Võ Minh Trí', email: 'tri.vm@phuoctan.edu.vn', phone: '0914202002', title: 'Giáo viên Tin học', loc: locPh1.id, org: orgToanTin.id },
    { name: 'Đoàn Kim Oanh', email: 'oanh.dk@phuoctan.edu.vn', phone: '0914202003', title: 'Giáo viên Ngữ văn', loc: locPh1.id, org: orgVanSuDia.id },
    { name: 'Lý Quốc Bảo', email: 'bao.lq@phuoctan.edu.vn', phone: '0914202004', title: 'Giáo viên Địa lý', loc: locPh1.id, org: orgVanSuDia.id },
    { name: 'Ngô Thanh Thảo', email: 'thao.nt@phuoctan.edu.vn', phone: '0914202005', title: 'Giáo viên Tiếng Anh', loc: locPh1.id, org: orgTiengAnh.id },
    { name: 'Dương Văn Phát', email: 'phat.dv@phuoctan.edu.vn', phone: '0914202006', title: 'Giáo viên Sinh học', loc: locPh1.id, org: orgKHTN.id },
    { name: 'Lê Minh Khang', email: 'khang.lm@phuoctan.edu.vn', phone: '0914202007', title: 'Giáo viên Âm nhạc', loc: locPh1.id, org: orgTheNhacHoa.id },
    { name: 'Nguyễn Thị Ngọc Ánh', email: 'anh.ntn@phuoctan.edu.vn', phone: '0914202008', title: 'Giáo viên GDCD', loc: locPh1.id, org: orgGDCD.id },
    { name: 'Trần Văn Kiên', email: 'kien.tv@phuoctan.edu.vn', phone: '0914202009', title: 'Cán bộ Y tế học đường', loc: locPh1.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },
    { name: 'Hồ Văn Lộc', email: 'loc.hv@phuoctan.edu.vn', phone: '0914202010', title: 'Nhân viên Bảo vệ - CSVC', loc: locPh1.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },

    // Phân hiệu 2
    { name: 'Lê Hữu Nghĩa', email: 'nghia.lh@phuoctan.edu.vn', phone: '0915303001', title: 'Giáo viên Toán', loc: locPh2.id, org: orgToanTin.id },
    { name: 'Phạm Thị Thúy Hằng', email: 'hang.ptt@phuoctan.edu.vn', phone: '0915303002', title: 'Giáo viên Ngữ văn', loc: locPh2.id, org: orgVanSuDia.id },
    { name: 'Nguyễn Hải Đăng', email: 'dang.nh@phuoctan.edu.vn', phone: '0915303003', title: 'Giáo viên Lịch sử', loc: locPh2.id, org: orgVanSuDia.id },
    { name: 'Vũ Ngọc Lan', email: 'lan.vn@phuoctan.edu.vn', phone: '0915303004', title: 'Giáo viên Tiếng Anh', loc: locPh2.id, org: orgTiengAnh.id },
    { name: 'Tô Văn Hải', email: 'hai.tv@phuoctan.edu.vn', phone: '0915303005', title: 'Giáo viên Vật lý', loc: locPh2.id, org: orgKHTN.id },
    { name: 'Mai Thị Quỳnh Như', email: 'nhu.mtq@phuoctan.edu.vn', phone: '0915303006', title: 'Giáo viên Mỹ thuật', loc: locPh2.id, org: orgTheNhacHoa.id },
    { name: 'Bùi Đức Trọng', email: 'trong.bd@phuoctan.edu.vn', phone: '0915303007', title: 'Giáo viên Thể dục', loc: locPh2.id, org: orgTheNhacHoa.id },
    { name: 'Chu Thị Bích Vân', email: 'van.ctb@phuoctan.edu.vn', phone: '0915303008', title: 'Giáo viên HĐTN', loc: locPh2.id, org: orgGDCD.id },
    { name: 'Đỗ Thị Minh Châu', email: 'chau.dtm@phuoctan.edu.vn', phone: '0915303009', title: 'Thủ quỹ - Kế toán viên', loc: locPh2.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },
    { name: 'Trần Quốc Bảo', email: 'bao.tq@phuoctan.edu.vn', phone: '0915303010', title: 'Nhân viên Bảo vệ - CSVC', loc: locPh2.id, org: orgVanPhong.id, role: Role.NHAN_VIEN },
  ];

  const createdTeachers: any[] = [];
  for (const t of teachersData) {
    const user = await createUser(
      t.name,
      t.email,
      t.phone,
      t.title,
      t.role || Role.GIAO_VIEN,
      t.loc,
      t.org
    );
    createdTeachers.push(user);
  }
  console.log(`✓ Đã tạo tổng cộng 42 cán bộ, giáo viên, nhân viên với đầy đủ SĐT và điểm trường`);

  // 5. TẠO KẾ HOẠCH NHIỀU CẤP (Năm -> Học kỳ -> Tháng)
  const planYear = await prisma.plan.create({
    data: {
      schoolId: school.id,
      title: 'Kế hoạch Chiến lược & Hoạt động Năm học 2026 - 2027',
      description: 'Kế hoạch tổng thể vận hành trường TH và THCS Phước Tân sau sáp nhập 3 điểm trường',
      level: PlanLevel.NAM,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-05-31'),
      progressPercent: 35,
      createdById: uHieuTruong.id,
    },
  });

  const planTerm1 = await prisma.plan.create({
    data: {
      schoolId: school.id,
      title: 'Kế hoạch Học kỳ I (Năm học 2026 - 2027)',
      description: 'Trọng tâm ổn định bộ máy, chuẩn hóa cơ sở vật chất và đổi mới phương pháp giảng dạy',
      level: PlanLevel.HOC_KY,
      parentPlanId: planYear.id,
      startDate: new Date('2026-08-15'),
      endDate: new Date('2027-01-15'),
      progressPercent: 48,
      createdById: uPHTChuyenMon.id,
    },
  });

  const p1 = await prisma.plan.create({
    data: {
      schoolId: school.id,
      title: '1. Ổn định tổ chức bộ máy và nhân sự sau sáp nhập 3 điểm trường',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-08-15'),
      endDate: new Date('2026-09-15'),
      progressPercent: 90,
      createdById: uHieuTruong.id,
    },
  });

  const p2 = await prisma.plan.create({
    data: {
      schoolId: school.id,
      title: '2. Hoàn thiện và công khai Kế hoạch giáo dục nhà trường',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-08-20'),
      endDate: new Date('2026-09-20'),
      progressPercent: 75,
      createdById: uPHTChuyenMon.id,
    },
  });

  const p3 = await prisma.plan.create({
    data: {
      schoolId: school.id,
      title: '3. Trình UBND & Phòng GD&ĐT phê duyệt Đề án vị trí việc làm',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
      progressPercent: 40,
      createdById: uHieuTruong.id,
    },
  });

  const p4 = await prisma.plan.create({
    data: {
      schoolId: school.id,
      title: '4. Rà soát, phân loại học sinh khó khăn cần hỗ trợ tại 3 điểm trường',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-08-25'),
      endDate: new Date('2026-09-25'),
      progressPercent: 65,
      createdById: uPHTPhanHieu1.id,
    },
  });

  const p5 = await prisma.plan.create({
    data: {
      schoolId: school.id,
      title: '5. Tổ chức Hội nghị Cán bộ, Viên chức, Người lao động đầu năm',
      level: PlanLevel.THANG,
      parentPlanId: planTerm1.id,
      startDate: new Date('2026-09-10'),
      endDate: new Date('2026-10-10'),
      progressPercent: 15,
      createdById: uHieuTruong.id,
    },
  });

  console.log('✓ Đã tạo Kế hoạch năm học 2026-2027 và các kế hoạch con chi tiết');

  // 6. TẠO 16 CÔNG VIỆC Ở NHIỀU TRẠNG THÁI VÀ GÁN RACI
  // Helper tạo Task + RACI + TaskLog
  const createTaskItem = async (data: {
    code: string;
    title: string;
    description: string;
    planId: string;
    locationId: string;
    orgUnitId: string;
    priority: TaskPriority;
    status: TaskStatus;
    progressPercent: number;
    startDate: Date;
    dueDate: Date;
    completedAt?: Date;
    createdById: string;
    chuTriId: string;
    phoiHopIds?: string[];
    kiemTraId?: string;
    pheDuyetId?: string;
    theoDoiIds?: string[];
    logNote?: string;
  }) => {
    const task = await prisma.task.create({
      data: {
        schoolId: school.id,
        code: data.code,
        title: data.title,
        description: data.description,
        planId: data.planId,
        locationId: data.locationId,
        orgUnitId: data.orgUnitId,
        priority: data.priority,
        status: data.status,
        progressPercent: data.progressPercent,
        startDate: data.startDate,
        dueDate: data.dueDate,
        completedAt: data.completedAt,
        createdById: data.createdById,
        assignments: {
          create: [
            { userId: data.chuTriId, role: TaskAssignmentRole.CHU_TRI, note: 'Chịu trách nhiệm chính' },
            ...(data.phoiHopIds || []).map((uid) => ({
              userId: uid,
              role: TaskAssignmentRole.PHOI_HOP,
              note: 'Đầu mối phối hợp',
            })),
            ...(data.kiemTraId ? [{ userId: data.kiemTraId, role: TaskAssignmentRole.KIEM_TRA, note: 'Kiểm tra chất lượng' }] : []),
            ...(data.pheDuyetId ? [{ userId: data.pheDuyetId, role: TaskAssignmentRole.PHE_DUYET, note: 'Ban Giám hiệu phê duyệt' }] : []),
            ...(data.theoDoiIds || []).map((uid) => ({
              userId: uid,
              role: TaskAssignmentRole.THEO_DOI,
              note: 'Theo dõi tiến độ',
            })),
          ],
        },
        logs: {
          create: [
            {
              userId: data.createdById,
              action: 'TAO_MOI',
              newStatus: data.status,
              newProgress: data.progressPercent,
              note: data.logNote || 'Tạo mới nhiệm vụ và giao phân công RACI',
            },
          ],
        },
      },
    });
    return task;
  };

  // 1. NHAP
  await createTaskItem({
    code: 'CV-001',
    title: 'Bản thảo Đề xuất cải tạo hệ thống thoát nước mùa mưa tại Phân hiệu 2',
    description: 'Khảo sát hiện trạng ngập cục bộ tại sân sau Phân hiệu 2 và đề xuất đơn vị thi công',
    planId: p1.id,
    locationId: locPh2.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.NHAP,
    progressPercent: 10,
    startDate: new Date('2026-09-08'),
    dueDate: new Date('2026-09-20'),
    createdById: uPHTPhanHieu2.id,
    chuTriId: createdTeachers[29].id, // Trần Quốc Bảo - CSVC
    phoiHopIds: [createdTeachers[28].id],
  });

  // 2. DA_GIAO
  await createTaskItem({
    code: 'CV-002',
    title: 'Rà soát trang thiết bị phòng thí nghiệm KHTN tại Phân hiệu 1',
    description: 'Kiểm tra số lượng ống nghiệm, hóa chất, kính hiển vi để phân bổ bổ sung từ Điểm chính',
    planId: p1.id,
    locationId: locPh1.id,
    orgUnitId: orgKHTN.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DA_GIAO,
    progressPercent: 0,
    startDate: new Date('2026-09-05'),
    dueDate: new Date('2026-09-18'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTKHTN.id,
    phoiHopIds: [createdTeachers[15].id], // Dương Văn Phát
    kiemTraId: uPHTPhanHieu1.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 3. DA_TIEP_NHAN
  await createTaskItem({
    code: 'CV-003',
    title: 'Thống kê tình trạng phòng máy tính tại cả 3 điểm trường',
    description: 'Ghi nhận số lượng máy còn hoạt động, máy hỏng cần thay linh kiện trước tuần học chính thức',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgToanTin.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DA_TIEP_NHAN,
    progressPercent: 20,
    startDate: new Date('2026-09-02'),
    dueDate: new Date('2026-09-12'),
    createdById: uAdmin.id,
    chuTriId: uTTToanTin.id,
    phoiHopIds: [createdTeachers[1].id, createdTeachers[11].id], // GV Tin học 2 điểm
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 4. DANG_THUC_HIEN (Đang làm - Đúng tiến độ)
  await createTaskItem({
    code: 'CV-004',
    title: 'Tổng hợp danh sách học sinh diện chính sách, hộ nghèo cần hỗ trợ SGK và bảo hiểm',
    description: 'Thu thập danh sách từ GV chủ nhiệm tại 3 điểm trường, rà soát hộ nghèo/cận nghèo để vận động học bổng',
    planId: p4.id,
    locationId: locMain.id,
    orgUnitId: orgGDCD.id,
    priority: TaskPriority.KHAN_CAP,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 60,
    startDate: new Date('2026-08-28'),
    dueDate: new Date('2026-09-15'),
    createdById: uPHTPhanHieu1.id,
    chuTriId: uTTGDCD.id,
    phoiHopIds: [createdTeachers[17].id, createdTeachers[27].id],
    kiemTraId: uPHTPhanHieu1.id,
    pheDuyetId: uHieuTruong.id,
    theoDoiIds: [uTTVanPhong.id],
  });

  // 5. DANG_THUC_HIEN (Xây dựng phân phối chương trình môn Tiếng Anh)
  await createTaskItem({
    code: 'CV-005',
    title: 'Xây dựng kế hoạch dạy học & Phân phối chương trình môn Tiếng Anh khối 6-9',
    description: 'Thống nhất giáo trình và tiến độ bài học đồng bộ giữa Điểm chính, Phân hiệu 1 và Phân hiệu 2',
    planId: p2.id,
    locationId: locPh1.id,
    orgUnitId: orgTiengAnh.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 70,
    startDate: new Date('2026-08-25'),
    dueDate: new Date('2026-09-16'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTTiengAnh.id,
    phoiHopIds: [createdTeachers[4].id, createdTeachers[14].id, createdTeachers[23].id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 6. CHO_KIEM_TRA (Đang chờ Tổ trưởng/PHT kiểm tra)
  await createTaskItem({
    code: 'CV-006',
    title: 'Dự thảo Báo cáo thực trạng CSVC và đề xuất trang thiết bị dạy học tối thiểu sau sáp nhập',
    description: 'Tổng hợp số liệu bàn ghế, bảng chiếu, quạt, đèn từ 3 điểm trường và lập bảng dự toán',
    planId: p3.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.CHO_KIEM_TRA,
    progressPercent: 90,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-09-10'),
    createdById: uHieuTruong.id,
    chuTriId: uTTVanPhong.id,
    phoiHopIds: [createdTeachers[8].id, createdTeachers[19].id],
    kiemTraId: uPHTPhanHieu1.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Đã nộp bản dự thảo kèm bảng Excel dự toán kinh phí cho Phó Hiệu trưởng kiểm tra',
  });

  // 7. CHO_KIEM_TRA (Lập thời khóa biểu tuần 2)
  await createTaskItem({
    code: 'CV-007',
    title: 'Lập và điều chỉnh Thời khóa biểu chính khóa áp dụng từ tuần thứ 2',
    description: 'Cân đối giáo viên dạy liên trường / chạy điểm giữa Điểm chính và Phân hiệu 1, 2',
    planId: p2.id,
    locationId: locMain.id,
    orgUnitId: orgToanTin.id,
    priority: TaskPriority.KHAN_CAP,
    status: TaskStatus.CHO_KIEM_TRA,
    progressPercent: 95,
    startDate: new Date('2026-09-01'),
    dueDate: new Date('2026-09-11'),
    createdById: uPHTChuyenMon.id,
    chuTriId: uTTToanTin.id,
    phoiHopIds: [createdTeachers[0].id, createdTeachers[10].id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
  });

  // 8. BO_SUNG (Cần bổ sung / Bị trả lại)
  await createTaskItem({
    code: 'CV-008',
    title: 'Kế hoạch tổ chức Tuần sinh hoạt tập thể đầu năm học tại 3 điểm trường',
    description: 'Xây dựng chuỗi hoạt động ngoại khóa, nội quy trường lớp và phòng chống tai nạn thương tích',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgGDCD.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.BO_SUNG,
    progressPercent: 50,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-09-14'),
    createdById: uPHTPhanHieu1.id,
    chuTriId: uTTGDCD.id,
    phoiHopIds: [uTTTheNhacHoa.id, createdTeachers[7].id],
    kiemTraId: uPHTPhanHieu1.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Bị trả lại: Yêu cầu bổ sung phương án đưa đón giáo viên hỗ trợ và phân luồng phụ huynh tại Phân hiệu 2',
  });

  // 9. HOAN_THANH (Đã hoàn thành - Chờ BGH nghiệm thu đóng)
  await createTaskItem({
    code: 'CV-009',
    title: 'Bàn giao và tập trung hồ sơ học bạ, sổ điểm của 3 trường về văn thư Điểm chính',
    description: 'Niêm phong và số hóa hồ sơ học sinh các khối 6, 7, 8, 9 phục vụ tra cứu tập trung',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.HOAN_THANH,
    progressPercent: 100,
    startDate: new Date('2026-08-15'),
    dueDate: new Date('2026-09-05'),
    completedAt: new Date('2026-09-04'),
    createdById: uHieuTruong.id,
    chuTriId: createdTeachers[8].id, // Nguyễn Thị Kim Loan - Văn thư
    phoiHopIds: [createdTeachers[18].id, createdTeachers[28].id],
    kiemTraId: uTTVanPhong.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Đã hoàn tất bàn giao 1.450 bộ học bạ về kho lưu trữ Điểm chính có biên bản ký nhận đầy đủ',
  });

  // 10. XAC_NHAN
  await createTaskItem({
    code: 'CV-010',
    title: 'Kiểm kê tài sản bàn ghế, phòng học trước ngày tựu trường',
    description: 'Hoàn thành niêm yết danh mục tài sản từng phòng học và bàn giao chìa khóa cho GV chủ nhiệm',
    planId: p1.id,
    locationId: locPh1.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.XAC_NHAN,
    progressPercent: 100,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-08-30'),
    completedAt: new Date('2026-08-29'),
    createdById: uPHTPhanHieu1.id,
    chuTriId: createdTeachers[19].id, // Hồ Văn Lộc - Bảo vệ/CSVC
    phoiHopIds: [createdTeachers[9].id],
    kiemTraId: uTTVanPhong.id,
    pheDuyetId: uPHTPhanHieu1.id,
  });

  // 11. DONG (Đã đóng / Kết thúc chu trình)
  await createTaskItem({
    code: 'CV-011',
    title: 'Tổ chức Lễ Khai giảng năm học mới 2026-2027 đồng loạt tại 3 điểm trường',
    description: 'Tổ chức trang trọng, ngắn gọn, đảm bảo 100% học sinh 3 điểm trường được dự lễ an toàn',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgGDCD.id,
    priority: TaskPriority.KHAN_CAP,
    status: TaskStatus.DONG,
    progressPercent: 100,
    startDate: new Date('2026-08-28'),
    dueDate: new Date('2026-09-05'),
    completedAt: new Date('2026-09-05'),
    createdById: uHieuTruong.id,
    chuTriId: uTTGDCD.id,
    phoiHopIds: [uTTTheNhacHoa.id, uTTVanPhong.id, uTTToanTin.id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Lễ khai giảng diễn ra thành công tốt đẹp tại cả 3 điểm trường, có đại diện lãnh đạo địa phương tham dự',
  });

  // 12. TAM_DUNG
  await createTaskItem({
    code: 'CV-012',
    title: 'Khảo sát phương án mở rộng nhà ăn bán trú tại Phân hiệu 2',
    description: 'Khảo sát nhu cầu phụ huynh và diện tích mặt bằng phía đông Phân hiệu 2',
    planId: p3.id,
    locationId: locPh2.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.THAP,
    status: TaskStatus.TAM_DUNG,
    progressPercent: 30,
    startDate: new Date('2026-08-25'),
    dueDate: new Date('2026-09-25'),
    createdById: uPHTPhanHieu2.id,
    chuTriId: createdTeachers[29].id, // CSVC Phân hiệu 2
    kiemTraId: uPHTPhanHieu2.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Tạm dừng theo chỉ đạo của Hiệu trưởng để chờ văn bản hướng dẫn ngân sách của UBND Thành phố',
  });

  // 13. HUY
  await createTaskItem({
    code: 'CV-013',
    title: 'In ấn sổ theo dõi điểm cá nhân và sổ chủ nhiệm bằng giấy mẫu cũ',
    description: 'Chuyển đổi hoàn toàn sang hệ thống quản lý điểm điện tử, hủy việc in sổ giấy truyền thống',
    planId: p1.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.THAP,
    status: TaskStatus.HUY,
    progressPercent: 0,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-08-28'),
    createdById: uPHTChuyenMon.id,
    chuTriId: createdTeachers[8].id,
    kiemTraId: uTTVanPhong.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Hủy nhiệm vụ: Ban Giám hiệu quyết định chuyển 100% sang học bạ và sổ điểm điện tử',
  });

  // 14. DANG_THUC_HIEN (Quá hạn 1: Thu thập thông tin BHYT học sinh)
  await createTaskItem({
    code: 'CV-014',
    title: 'Thu thập thông tin mã định danh và thẻ BHYT học sinh đầu năm học',
    description: 'Nhập liệu danh sách BHYT học sinh khối 6 mới vào trường gửi Bảo hiểm xã hội thành phố',
    planId: p4.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 45,
    startDate: new Date('2026-08-20'),
    dueDate: new Date('2026-09-03'), // Quá hạn
    createdById: uTTVanPhong.id,
    chuTriId: createdTeachers[18].id, // Trần Văn Kiên - Y tế
    phoiHopIds: [createdTeachers[8].id, createdTeachers[28].id],
    kiemTraId: uTTVanPhong.id,
    pheDuyetId: uPHTPhanHieu1.id,
    logNote: 'Tiến độ bị chậm do một số phụ huynh chưa cung cấp mã định danh cá nhân',
  });

  // 15. CHO_KIEM_TRA (Quá hạn 2: Dự toán kinh phí Công đoàn)
  await createTaskItem({
    code: 'CV-015',
    title: 'Dự toán kinh phí hoạt động Công đoàn và thăm hỏi đầu năm học 2026 - 2027',
    description: 'Lập quỹ phúc lợi và danh sách đoàn viên công đoàn có hoàn cảnh khó khăn sau sáp nhập',
    planId: p5.id,
    locationId: locMain.id,
    orgUnitId: orgVanPhong.id,
    priority: TaskPriority.TRUNG_BINH,
    status: TaskStatus.CHO_KIEM_TRA,
    progressPercent: 85,
    startDate: new Date('2026-08-15'),
    dueDate: new Date('2026-09-02'), // Quá hạn
    createdById: uHieuTruong.id,
    chuTriId: uTTVanPhong.id,
    phoiHopIds: [createdTeachers[28].id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
    logNote: 'Đã hoàn thành bảng dự toán, gửi PHT kiểm tra từ ngày 01/09',
  });

  // 16. DANG_THUC_HIEN (Hội nghị viên chức)
  await createTaskItem({
    code: 'CV-016',
    title: 'Chuẩn bị tài liệu & Tham luận cho Hội nghị Cán bộ, Viên chức năm học mới',
    description: 'Các tổ chuyên môn chuẩn bị bài tham luận về nâng cao chất lượng dạy học phân hiệu xa',
    planId: p5.id,
    locationId: locMain.id,
    orgUnitId: orgVanSuDia.id,
    priority: TaskPriority.CAO,
    status: TaskStatus.DANG_THUC_HIEN,
    progressPercent: 35,
    startDate: new Date('2026-09-05'),
    dueDate: new Date('2026-09-25'),
    createdById: uHieuTruong.id,
    chuTriId: uTTVanSuDia.id,
    phoiHopIds: [uTTToanTin.id, uTTTiengAnh.id, uTTKHTN.id],
    kiemTraId: uPHTChuyenMon.id,
    pheDuyetId: uHieuTruong.id,
  });

  console.log('✓ Đã tạo 16 công việc đa dạng trạng thái (Quá hạn, Chờ kiểm tra, Bổ sung, Hoàn thành, Đóng...)');

  // 7. TẠO MỘT SỐ THÔNG BÁO VÀ BÌNH LUẬN MẪU
  await prisma.notification.createMany({
    data: [
      {
        userId: uTTGDCD.id,
        type: NotificationType.CAN_BO_SUNG,
        title: 'Yêu cầu bổ sung nội dung công việc CV-008',
        content: 'Phó Hiệu trưởng Lê Hoàng Long yêu cầu bổ sung phương án đưa đón giáo viên tại Phân hiệu 2.',
        link: '/tasks/CV-008',
      },
      {
        userId: uPHTChuyenMon.id,
        type: NotificationType.NHAC_VIEC,
        title: 'Công việc CV-007 đang chờ kiểm tra',
        content: 'Tổ trưởng Toán - Tin Vũ Đình Dũng đã hoàn thành dự thảo Thời khóa biểu tuần 2.',
        link: '/tasks/CV-007',
      },
      {
        userId: createdTeachers[18].id,
        type: NotificationType.HET_HAN,
        title: 'Cảnh báo quá hạn: Công việc CV-014',
        content: 'Nhiệm vụ Thu thập thông tin BHYT học sinh đã quá hạn ngày 03/09/2026.',
        link: '/tasks/CV-014',
      },
    ],
  });

  console.log('🎉 Seed dữ liệu mẫu hoàn tất thành công 100%!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
