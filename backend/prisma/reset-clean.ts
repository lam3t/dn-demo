import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SYSTEM_PERMISSIONS } from '../src/constants/permissions.constant';

const prisma = new PrismaClient();

async function cleanReset() {
  console.log('🧹 Bắt đầu xóa sạch toàn bộ dữ liệu test...');

  // 1. Xóa dữ liệu theo thứ tự quan hệ khóa ngoại
  await prisma.systemAuditLog.deleteMany({});
  await prisma.adminAuditLog.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.taskLog.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.kPIDefinition.deleteMany({});
  await prisma.sharedCategory.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.roleModel.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.orgUnit.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.school.deleteMany({});
  await prisma.tenantSubscription.deleteMany({});
  await prisma.package.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('✓ Đã xóa sạch toàn bộ bảng dữ liệu!');

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // 2. Seed Permission Catalog cố định
  console.log('🌱 Khởi tạo danh mục Permission cố định...');
  await prisma.permission.createMany({
    data: SYSTEM_PERMISSIONS.map((p) => ({
      key: p.key,
      name: p.name,
      category: p.category,
      description: p.description,
    })),
  });
  const permCount = await prisma.permission.count();
  console.log(`✓ Đã tạo ${permCount} permissions cố định.`);

  // 3. Seed các gói dịch vụ SaaS chuẩn
  console.log('🌱 Khởi tạo 2 gói dịch vụ SaaS...');
  const pkgStandard = await prisma.package.create({
    data: {
      name: 'Gói Cơ bản (Standard)',
      code: 'STD',
      maxAccounts: 100,
      storageQuotaGB: 20,
      enabledModules: JSON.stringify(['PLANS', 'TASKS', 'REPORTS', 'ORG']),
      price: 15000000,
      description: 'Dành cho các trường quy mô vừa và nhỏ (dưới 100 cán bộ giáo viên).',
    },
  });

  const pkgEnterprise = await prisma.package.create({
    data: {
      name: 'Gói Nâng cao (Enterprise)',
      code: 'ENT',
      maxAccounts: 500,
      storageQuotaGB: 100,
      enabledModules: JSON.stringify(['PLANS', 'TASKS', 'KPI', 'REPORTS', 'ORG', 'ATTACHMENTS_S3']),
      price: 35000000,
      description: 'Dành cho trường liên cấp, nhiều điểm trường hoặc trên 100 cán bộ giáo viên.',
    },
  });
  console.log(`✓ Đã tạo gói Standard (${pkgStandard.id}) và Enterprise (${pkgEnterprise.id}).`);

  // 4. Seed tài khoản System Admin duy nhất
  console.log('🌱 Khởi tạo tài khoản System Admin...');
  const sysAdmin = await prisma.user.create({
    data: {
      fullName: 'Quản trị Nền tảng (System Admin)',
      email: 'chunh@tringhiatech.vn',
      phone: '0913016667',
      passwordHash: defaultPasswordHash,
      title: 'Platform System Administrator',
      isSystemAdmin: true,
      isActive: true,
      avatarUrl: 'https://ui-avatars.com/api/?name=System+Admin&background=0F172A&color=fff',
      roles: {
        create: {
          role: Role.SYSTEM_ADMIN,
        },
      },
    },
  });
  console.log(`✓ Đã tạo System Admin: ${sysAdmin.email} / ${sysAdmin.phone} (Mật khẩu: 123456)`);

  const tenantCount = await prisma.tenant.count();
  const userCount = await prisma.user.count();
  console.log(`\n🎉 Reset hoàn tất! Hiện trạng DB: ${tenantCount} Tenant, ${userCount} User (Chỉ còn System Admin).`);
}

cleanReset()
  .catch((e) => {
    console.error('❌ Lỗi khi reset dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
