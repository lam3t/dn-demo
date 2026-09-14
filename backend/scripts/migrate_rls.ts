import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- Checking connection and applying DDL ---');
  const res = await prisma.$queryRawUnsafe('SELECT 1 as test');
  console.log('Connected to DB successfully:', res);

  // 1. Create Enums if not exist
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SYSTEM_ADMIN';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 2. Create Platform tables if not exist
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Tenant" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
      "logoUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Tenant_status_idx" ON "Tenant"("status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Tenant_code_idx" ON "Tenant"("code");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Package" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL UNIQUE,
      "maxAccounts" INTEGER NOT NULL DEFAULT 100,
      "storageQuotaGB" DOUBLE PRECISION NOT NULL DEFAULT 20,
      "enabledModules" TEXT,
      "price" DOUBLE PRECISION DEFAULT 0,
      "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Package_code_idx" ON "Package"("code");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TenantSubscription" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
      "packageId" TEXT NOT NULL REFERENCES "Package"("id") ON DELETE CASCADE,
      "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endDate" TIMESTAMP(3) NOT NULL,
      "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TenantSubscription_packageId_idx" ON "TenantSubscription"("packageId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TenantSubscription_status_idx" ON "TenantSubscription"("status");`);

  // 3. Add tenantId column to existing business tables if not exist
  const businessTables = [
    'School', 'Location', 'OrgUnit', 'User', 'Plan', 'Task',
    'TaskAssignment', 'TaskLog', 'Attachment', 'Notification',
    'Comment', 'AdminAuditLog'
  ];

  for (const table of businessTables) {
    console.log(`Checking tenantId on ${table}...`);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
    `);
  }

  // Add isSystemAdmin on User and make schoolId nullable
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ALTER COLUMN "schoolId" DROP NOT NULL;
  `);

  // Create SystemAuditLog table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SystemAuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "actorUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "action" TEXT NOT NULL,
      "targetTenantId" TEXT REFERENCES "Tenant"("id") ON DELETE SET NULL,
      "detail" TEXT,
      "ipAddress" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SystemAuditLog_actorUserId_idx" ON "SystemAuditLog"("actorUserId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SystemAuditLog_targetTenantId_idx" ON "SystemAuditLog"("targetTenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SystemAuditLog_createdAt_idx" ON "SystemAuditLog"("createdAt");`);

  // 4. Create composite indexes for performance and multi-tenancy
  console.log('Creating composite indexes...');
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "School_tenantId_idx" ON "School"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Location_tenantId_idx" ON "Location"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Location_tenantId_isMain_idx" ON "Location"("tenantId", "isMain");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrgUnit_tenantId_idx" ON "OrgUnit"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrgUnit_tenantId_parentId_idx" ON "OrgUnit"("tenantId", "parentId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_tenantId_isActive_idx" ON "User"("tenantId", "isActive");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_tenantId_primaryLocationId_idx" ON "User"("tenantId", "primaryLocationId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_tenantId_primaryOrgUnitId_idx" ON "User"("tenantId", "primaryOrgUnitId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Plan_tenantId_idx" ON "Plan"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Plan_tenantId_level_idx" ON "Plan"("tenantId", "level");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Plan_tenantId_startDate_endDate_idx" ON "Plan"("tenantId", "startDate", "endDate");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_tenantId_idx" ON "Task"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_tenantId_status_idx" ON "Task"("tenantId", "status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_tenantId_dueDate_idx" ON "Task"("tenantId", "dueDate");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_tenantId_planId_idx" ON "Task"("tenantId", "planId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_tenantId_locationId_idx" ON "Task"("tenantId", "locationId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_tenantId_orgUnitId_idx" ON "Task"("tenantId", "orgUnitId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_tenantId_status_dueDate_idx" ON "Task"("tenantId", "status", "dueDate");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TaskAssignment_tenantId_idx" ON "TaskAssignment"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TaskAssignment_tenantId_taskId_idx" ON "TaskAssignment"("tenantId", "taskId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TaskAssignment_tenantId_userId_idx" ON "TaskAssignment"("tenantId", "userId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TaskLog_tenantId_idx" ON "TaskLog"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TaskLog_tenantId_taskId_idx" ON "TaskLog"("tenantId", "taskId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Attachment_tenantId_idx" ON "Attachment"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Attachment_tenantId_taskId_idx" ON "Attachment"("tenantId", "taskId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_tenantId_idx" ON "Notification"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_tenantId_userId_isRead_idx" ON "Notification"("tenantId", "userId", "isRead");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Comment_tenantId_idx" ON "Comment"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Comment_tenantId_taskId_idx" ON "Comment"("tenantId", "taskId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AdminAuditLog_tenantId_idx" ON "AdminAuditLog"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AdminAuditLog_tenantId_actorUserId_idx" ON "AdminAuditLog"("tenantId", "actorUserId");`);

  // 5. Enable Row-Level Security (RLS) on all tenant-scoped tables
  console.log('Enabling Row-Level Security (RLS)...');
  for (const table of businessTables) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${table.toLowerCase()}_tenant_isolation" ON "${table}";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "${table.toLowerCase()}_tenant_isolation" ON "${table}"
      FOR ALL
      USING (
        "tenantId"::text = current_setting('app.current_tenant', true)
        OR current_setting('app.current_tenant', true) = 'system_bypass'
        OR current_setting('app.current_tenant', true) = ''
        OR current_setting('app.current_tenant', true) IS NULL
      );
    `);
  }

  console.log('✅ CSDL Multi-Tenant & RLS đã được cấu hình thành công 100%!');
}

run()
  .catch((e) => {
    console.error('Error in migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
