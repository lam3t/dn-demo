import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../../app';
import prisma from '../../prisma';

async function runTests() {
  console.log('🧪 BẮT ĐẦU CHẠY TESTS: LOCATION CRUD & SCHOOL STATS AGGREGATION');

  // 1. Đăng nhập Hiệu trưởng
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'hieutruong@phuoctan.edu.vn', password: '123456' });

  if (loginRes.status !== 200) {
    throw new Error('Đăng nhập Hiệu trưởng thất bại!');
  }
  const token = loginRes.body.data.accessToken;
  const hieuTruongUser = loginRes.body.data.user;

  // 2. Kiểm tra GET /api/school/info
  console.log('\n--- 1. Kiểm tra GET /api/school/info & Tổng hợp tự động ---');
  const infoRes = await request(app)
    .get('/api/school/info')
    .set('Authorization', `Bearer ${token}`);

  if (infoRes.status !== 200) {
    throw new Error(`GET /api/school/info thất bại: ${JSON.stringify(infoRes.body)}`);
  }

  const school = infoRes.body.data;
  console.log(`✓ PASS: Tải thông tin trường "${school.name}"`);
  console.log(`  - Tổng số học sinh: ${school.totalStudents} (Nữ: ${school.totalFemaleStudents})`);
  console.log(`  - Tổng số lớp học: ${school.totalClasses}`);
  console.log(`  - Tổng số Cán bộ GV: ${school.totalStaff} (Tổng hợp từ danh sách tài khoản)`);
  console.log(`  - Số điểm trường: ${school.locations.length}`);

  const locMain = school.locations.find((l: any) => l.code === 'DIEM_CHINH');
  const locPh1 = school.locations.find((l: any) => l.code === 'PHAN_HIEU_1');
  const locPh2 = school.locations.find((l: any) => l.code === 'PHAN_HIEU_2');

  const expectedStudents = (locMain.studentCount || 0) + (locPh1.studentCount || 0) + (locPh2.studentCount || 0);
  const expectedClasses = (locMain.classCount || 0) + (locPh1.classCount || 0) + (locPh2.classCount || 0);
  const expectedFemale = (locMain.femaleStudentCount || 0) + (locPh1.femaleStudentCount || 0) + (locPh2.femaleStudentCount || 0);

  if (
    school.totalStudents === expectedStudents &&
    school.totalClasses === expectedClasses &&
    school.totalFemaleStudents === expectedFemale
  ) {
    console.log('✓ PASS: Tổng số học sinh, lớp học, học sinh nữ khớp 100% với tổng các điểm trường.');
  } else {
    throw new Error(`Tổng số không khớp! Expected: HS=${expectedStudents}, Lớp=${expectedClasses}, Nữ=${expectedFemale}. Actual: HS=${school.totalStudents}, Lớp=${school.totalClasses}, Nữ=${school.totalFemaleStudents}`);
  }

  // 3. Test Cập nhật số liệu Điểm trường (PATCH /api/locations/:id)
  console.log('\n--- 2. Test Cập nhật số liệu Phân hiệu 1 ---');
  const oldStudentsPh1 = locPh1.studentCount;
  const newStudentsPh1 = oldStudentsPh1 + 50; // Tăng thêm 50 học sinh
  const newFemalePh1 = locPh1.femaleStudentCount + 25;
  const newClassPh1 = locPh1.classCount + 1;

  const updateLocRes = await request(app)
    .patch(`/api/locations/${locPh1.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      studentCount: newStudentsPh1,
      femaleStudentCount: newFemalePh1,
      classCount: newClassPh1,
      address: 'Khu phố Tân Lập mở rộng, Phường Phước Tân, TP. Biên Hòa',
    });

  if (updateLocRes.status !== 200) {
    throw new Error(`PATCH /api/locations/:id thất bại: ${JSON.stringify(updateLocRes.body)}`);
  }
  console.log(`✓ PASS: Cập nhật thành công Phân hiệu 1 lên ${newStudentsPh1} HS, ${newClassPh1} lớp, ${newFemalePh1} nữ.`);

  // Kiểm tra lại GET /api/school/info để xác nhận tự động tổng hợp cập nhật
  const updatedInfoRes = await request(app)
    .get('/api/school/info')
    .set('Authorization', `Bearer ${token}`);

  const updatedSchool = updatedInfoRes.body.data;
  if (
    updatedSchool.totalStudents === school.totalStudents + 50 &&
    updatedSchool.totalClasses === school.totalClasses + 1 &&
    updatedSchool.totalFemaleStudents === school.totalFemaleStudents + 25
  ) {
    console.log(`✓ PASS: Quy mô toàn trường đã tự động tăng (+50 HS, +1 Lớp, +25 Nữ) thành công!`);
  } else {
    throw new Error(`Tổng hợp sau khi cập nhật sai lệch! ${JSON.stringify(updatedSchool)}`);
  }

  // Hoàn trả lại số liệu Phân hiệu 1
  await request(app)
    .patch(`/api/locations/${locPh1.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      studentCount: locPh1.studentCount,
      femaleStudentCount: locPh1.femaleStudentCount,
      classCount: locPh1.classCount,
      address: locPh1.address,
    });

  // 4. Test Phân quyền: Cán bộ phụ trách điểm trường
  console.log('\n--- 3. Test Phân quyền Cán bộ phụ trách Điểm trường ---');
  // Lấy 1 tài khoản giáo viên thông thường
  const teacherUser = await prisma.user.findFirst({
    where: { email: 'tranminhduc@phuoctan.edu.vn' },
  });

  if (teacherUser) {
    // Đăng nhập tài khoản giáo viên
    const teacherLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'tranminhduc@phuoctan.edu.vn', password: '123456' });

    if (teacherLoginRes.status === 200) {
      const teacherToken = teacherLoginRes.body.data.accessToken;

      // 4.1 Thử cập nhật khi KHÔNG phải người phụ trách -> Bị 403 Forbidden
      const unauthorizedRes = await request(app)
        .patch(`/api/locations/${locPh2.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ studentCount: 900 });

      if (unauthorizedRes.status === 403) {
        console.log('✓ PASS: Chặn đúng quyền (HTTP 403) khi giáo viên không được phân công phụ trách điểm trường.');
      } else {
        throw new Error(`Kỳ vọng 403 nhưng nhận được: ${unauthorizedRes.status}`);
      }

      // 4.2 Gán giáo viên làm người phụ trách (managerId) của Phân hiệu 2
      await prisma.location.update({
        where: { id: locPh2.id },
        data: { managerId: teacherUser.id },
      });

      // Thử cập nhật lại khi ĐÃ ĐƯỢC GÁN PHỤ TRÁCH -> Thành công 200
      const authorizedRes = await request(app)
        .patch(`/api/locations/${locPh2.id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ studentCount: 844, femaleStudentCount: 370, classCount: 19 });

      if (authorizedRes.status === 200) {
        console.log('✓ PASS: Cán bộ phụ trách được gán quyền cập nhật thành công số liệu điểm trường của mình.');
      } else {
        throw new Error(`Cán bộ phụ trách cập nhật thất bại: ${JSON.stringify(authorizedRes.body)}`);
      }
    }
  }

  // 5. Test CRUD: Thêm Điểm trường mới & Tự động tăng tổng hợp quy mô
  console.log('\n--- 4. Test POST & DELETE /api/locations (Thêm / Xóa điểm trường) ---');
  const createLocRes = await request(app)
    .post('/api/locations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Phân hiệu Mầm non - Tiểu học Vệ tinh 3',
      code: 'PHAN_HIEU_TEST',
      address: 'Số 99 đường Võ Nguyên Giáp, Phước Tân, TP. Biên Hòa',
      phone: '02513888009',
      classCount: 10,
      studentCount: 300,
      femaleStudentCount: 150,
      isMain: false,
    });

  if (createLocRes.status !== 201) {
    throw new Error(`POST /api/locations thất bại: ${JSON.stringify(createLocRes.body)}`);
  }
  const createdLoc = createLocRes.body.data;
  console.log(`✓ PASS: Tạo thành công điểm trường mới "${createdLoc.name}" (${createdLoc.code})`);

  // Kiểm tra quy mô toàn trường tăng thêm 300 HS, 10 lớp
  const afterCreateSchoolRes = await request(app)
    .get('/api/school/info')
    .set('Authorization', `Bearer ${token}`);

  const afterCreateSchool = afterCreateSchoolRes.body.data;
  if (
    afterCreateSchool.totalStudents === school.totalStudents + 300 &&
    afterCreateSchool.totalClasses === school.totalClasses + 10 &&
    afterCreateSchool.locations.length === school.locations.length + 1
  ) {
    console.log(`✓ PASS: Toàn trường đã tự động cộng thêm 300 HS và 10 lớp từ cơ sở mới!`);
  } else {
    throw new Error(`Tổng hợp sau khi thêm điểm trường sai lệch: ${JSON.stringify(afterCreateSchool)}`);
  }

  // Xóa điểm trường vừa tạo
  const deleteLocRes = await request(app)
    .delete(`/api/locations/${createdLoc.id}`)
    .set('Authorization', `Bearer ${token}`);

  if (deleteLocRes.status !== 200) {
    throw new Error(`DELETE /api/locations/:id thất bại: ${JSON.stringify(deleteLocRes.body)}`);
  }
  console.log(`✓ PASS: Xóa thành công điểm trường tạm.`);

  // Kiểm tra quy mô toàn trường giảm về ban đầu
  const afterDeleteSchoolRes = await request(app)
    .get('/api/school/info')
    .set('Authorization', `Bearer ${token}`);

  const afterDeleteSchool = afterDeleteSchoolRes.body.data;
  if (
    afterDeleteSchool.totalStudents === school.totalStudents &&
    afterDeleteSchool.totalClasses === school.totalClasses &&
    afterDeleteSchool.locations.length === school.locations.length
  ) {
    console.log(`✓ PASS: Quy mô toàn trường đã tự động khôi phục chuẩn xác sau khi xóa điểm trường.`);
  } else {
    throw new Error(`Tổng hợp sau khi xóa sai lệch: ${JSON.stringify(afterDeleteSchool)}`);
  }

  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ TESTS CHO LOCATION CRUD & AGGREGATION ĐÃ PASS 100%!');
  console.log('================================================================\n');
}

runTests()
  .catch((err) => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
