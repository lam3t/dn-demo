import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- ĐANG CẬP NHẬT TÀI KHOẢN SYSTEM ADMIN TRÊN CSDL ---');
  
  // Tìm tài khoản System Admin hiện tại
  const existingSysAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { isSystemAdmin: true },
        { email: 'sysadmin@tnedu.vn' },
        { phone: '0900000001' }
      ]
    }
  });

  if (existingSysAdmin) {
    const updated = await prisma.user.update({
      where: { id: existingSysAdmin.id },
      data: {
        email: 'chunh@tringhiatech.vn',
        phone: '0913016667',
        fullName: 'Quản trị Nền tảng (System Admin)',
        isSystemAdmin: true,
      }
    });
    console.log('✓ Đã cập nhật thành công tài khoản System Admin:');
    console.log(`  - ID: ${updated.id}`);
    console.log(`  - Email: ${updated.email}`);
    console.log(`  - SĐT: ${updated.phone}`);
    console.log(`  - Họ tên: ${updated.fullName}`);
    console.log(`  - isSystemAdmin: ${updated.isSystemAdmin}`);
  } else {
    console.log('⚠ Không tìm thấy tài khoản System Admin cũ, kiểm tra theo email mới...');
    const sysAdminNew = await prisma.user.findFirst({
      where: { email: 'chunh@tringhiatech.vn' }
    });
    if (sysAdminNew) {
      console.log('✓ Tài khoản System Admin mới đã tồn tại:', sysAdminNew);
    } else {
      console.log('❌ Không tìm thấy user nào!');
    }
  }
}

main()
  .catch(e => {
    console.error('Lỗi khi cập nhật:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
