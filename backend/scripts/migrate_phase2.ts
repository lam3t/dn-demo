import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- Starting Phase 2 Migration: Dynamic RBAC & Tenant Admin Models ---');
  const res = await prisma.$queryRawUnsafe('SELECT 1 as test');
  console.log('Connected to DB successfully:', res);

  // 1. Create Permission table (Fixed catalog, no tenantId)
  console.log('Creating Permission table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Permission" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Permission_category_idx" ON "Permission"("category");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Permission_key_idx" ON "Permission"("key");`);

  // 2. Create RoleModel table (Tenant-scoped or System fallback)
  console.log('Creating RoleModel table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RoleModel" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT REFERENCES "Tenant"("id") ON DELETE CASCADE,
      "code" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "isSystem" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RoleModel_tenantId_idx" ON "RoleModel"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RoleModel_code_idx" ON "RoleModel"("code");`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RoleModel_tenantId_code_key" ON "RoleModel"("tenantId", "code") WHERE "tenantId" IS NOT NULL;`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RoleModel_null_tenantId_code_key" ON "RoleModel"("code") WHERE "tenantId" IS NULL;`);

  // 3. Create RolePermission table (N-N)
  console.log('Creating RolePermission table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RolePermission" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "roleId" TEXT NOT NULL REFERENCES "RoleModel"("id") ON DELETE CASCADE,
      "permissionId" TEXT NOT NULL REFERENCES "Permission"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RolePermission_roleId_idx" ON "RolePermission"("roleId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");`);

  // 4. Update UserRole to support roleId & tenantId
  console.log('Adding roleId & tenantId to UserRole if not exists...');
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "UserRole" ADD COLUMN "roleId" TEXT REFERENCES "RoleModel"("id") ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "UserRole" ADD COLUMN "tenantId" TEXT REFERENCES "Tenant"("id") ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserRole_roleId_idx" ON "UserRole"("roleId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserRole_tenantId_idx" ON "UserRole"("tenantId");`);

  // 5. Create SharedCategory table
  console.log('Creating SharedCategory table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SharedCategory" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
      "type" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "orderIndex" INTEGER NOT NULL DEFAULT 0,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SharedCategory_tenantId_type_code_key" ON "SharedCategory"("tenantId", "type", "code");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SharedCategory_tenantId_idx" ON "SharedCategory"("tenantId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SharedCategory_tenantId_type_idx" ON "SharedCategory"("tenantId", "type");`);

  // 6. Create KPIDefinition table
  console.log('Creating KPIDefinition table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "KPIDefinition" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
      "code" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "unit" TEXT NOT NULL DEFAULT 'Điểm',
      "targetValue" DOUBLE PRECISION,
      "weight" DOUBLE PRECISION DEFAULT 1.0,
      "applicableRoles" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "KPIDefinition_tenantId_code_key" ON "KPIDefinition"("tenantId", "code");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "KPIDefinition_tenantId_idx" ON "KPIDefinition"("tenantId");`);

  // 7. Enable RLS on Tenant-scoped tables
  console.log('Configuring Row-Level Security policies...');
  const rlsTables = ['RoleModel', 'SharedCategory', 'KPIDefinition'];
  for (const table of rlsTables) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
  }

  // Drop existing policies if any
  const policies = [
    { table: 'RoleModel', name: 'tenant_isolation_role_select' },
    { table: 'RoleModel', name: 'tenant_isolation_role_write' },
    { table: 'SharedCategory', name: 'tenant_isolation_shared_category' },
    { table: 'KPIDefinition', name: 'tenant_isolation_kpi_definition' },
  ];

  for (const p of policies) {
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${p.name}" ON "${p.table}";`);
  }

  // RoleModel: can select if tenantId matches OR is system role (tenantId is null) OR is_system_admin
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "tenant_isolation_role_select" ON "RoleModel"
      FOR SELECT
      USING (
        "tenantId" = current_setting('app.current_tenant_id', true)
        OR "tenantId" IS NULL
        OR current_setting('app.is_system_admin', true) = 'true'
      );
  `);

  // RoleModel: can insert/update/delete only for current tenant or system admin
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "tenant_isolation_role_write" ON "RoleModel"
      FOR ALL
      USING (
        "tenantId" = current_setting('app.current_tenant_id', true)
        OR current_setting('app.is_system_admin', true) = 'true'
      );
  `);

  // SharedCategory isolation
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "tenant_isolation_shared_category" ON "SharedCategory"
      FOR ALL
      USING (
        "tenantId" = current_setting('app.current_tenant_id', true)
        OR current_setting('app.is_system_admin', true) = 'true'
      );
  `);

  // KPIDefinition isolation
  await prisma.$executeRawUnsafe(`
    CREATE POLICY "tenant_isolation_kpi_definition" ON "KPIDefinition"
      FOR ALL
      USING (
        "tenantId" = current_setting('app.current_tenant_id', true)
        OR current_setting('app.is_system_admin', true) = 'true'
      );
  `);

  console.log('--- Phase 2 Migration completed successfully! ---');
}

run()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
