-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'ADMIN', 'HIEU_TRUONG', 'PHO_HIEU_TRUONG', 'TO_TRUONG', 'GIAO_VIEN', 'NHAN_VIEN');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlanLevel" AS ENUM ('NAM', 'HOC_KY', 'QUY', 'THANG', 'TUAN');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NHAP', 'DA_GIAO', 'DA_TIEP_NHAN', 'DANG_THUC_HIEN', 'CHO_KIEM_TRA', 'BO_SUNG', 'HOAN_THANH', 'XAC_NHAN', 'DONG', 'TAM_DUNG', 'HUY');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('THAP', 'TRUNG_BINH', 'CAO', 'KHAN_CAP');

-- CreateEnum
CREATE TYPE "TaskAssignmentRole" AS ENUM ('CHU_TRI', 'PHOI_HOP', 'KIEM_TRA', 'PHE_DUYET', 'THEO_DOI');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GIAO_VIEC', 'NHAC_VIEC', 'CAN_BO_SUNG', 'DA_HOAN_THANH', 'HET_HAN', 'HE_THONG');

-- CreateEnum
CREATE TYPE "TaskEvaluationRating" AS ENUM ('XUAT_SAC', 'TOT', 'HOAN_THANH', 'CHUA_DAT');

-- CreateEnum
CREATE TYPE "AxisRoleScope" AS ENUM ('ALL', 'GV_ONLY', 'NV_ONLY', 'RESTRICTED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "maxAccounts" INTEGER NOT NULL DEFAULT 100,
    "storageQuotaGB" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "enabledModules" TEXT,
    "price" DOUBLE PRECISION DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetTenantId" TEXT,
    "detail" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "principalName" TEXT,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalFemaleStudents" INTEGER NOT NULL DEFAULT 0,
    "totalClasses" INTEGER NOT NULL DEFAULT 0,
    "totalStaff" INTEGER NOT NULL DEFAULT 0,
    "schoolYear" TEXT NOT NULL DEFAULT '2026-2027',
    "statsJson" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "managerId" TEXT,
    "studentCount" INTEGER DEFAULT 0,
    "femaleStudentCount" INTEGER DEFAULT 0,
    "classCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "avatarUrl" TEXT,
    "schoolId" TEXT,
    "primaryLocationId" TEXT,
    "primaryOrgUnitId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false,
    "positionGroup" TEXT,
    "positionCode" TEXT,
    "isConcurrent" BOOLEAN NOT NULL DEFAULT false,
    "secondaryPositionCodes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "roleId" TEXT,
    "scopeLocationId" TEXT,
    "scopeOrgUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" "PlanLevel" NOT NULL,
    "parentPlanId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "planId" TEXT,
    "locationId" TEXT,
    "orgUnitId" TEXT,
    "assignedOrgUnitId" TEXT,
    "isOrgAssignment" BOOLEAN NOT NULL DEFAULT false,
    "priority" "TaskPriority" NOT NULL DEFAULT 'TRUNG_BINH',
    "status" "TaskStatus" NOT NULL DEFAULT 'DA_GIAO',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "requireAttachment" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "evaluationRating" "TaskEvaluationRating",
    "evaluationComment" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "evaluatedById" TEXT,
    "isProposal" BOOLEAN NOT NULL DEFAULT false,
    "proposalStatus" TEXT,
    "proposalNote" TEXT,
    "proposedById" TEXT,
    "periodId" TEXT,
    "primaryAxisId" TEXT,
    "taskSubtype" TEXT,
    "weightScore" DOUBLE PRECISION DEFAULT 1.0,
    "evidenceFiles" JSONB,
    "warningFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TaskAssignmentRole" NOT NULL,
    "note" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" "TaskStatus",
    "newStatus" "TaskStatus",
    "oldProgress" INTEGER,
    "newProgress" INTEGER,
    "oldValues" JSONB,
    "newValues" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT,
    "taskLogId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'HE_THONG',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" JSONB,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleModel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'Điểm',
    "targetValue" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION DEFAULT 1.0,
    "applicableRoles" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPIDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL DEFAULT '2026-2027',
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedBeforeDeadline" INTEGER NOT NULL DEFAULT 0,
    "completedOnTime" INTEGER NOT NULL DEFAULT 0,
    "completedLate" INTEGER NOT NULL DEFAULT 0,
    "uncompletedTasks" INTEGER NOT NULL DEFAULT 0,
    "scoreA_Quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreB_Quality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreC_Timeline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreD_Leadership" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" TEXT NOT NULL DEFAULT 'HOAN_THANH',
    "taskDetails" JSONB,
    "manualScores" JSONB,
    "calculatedBy" TEXT DEFAULT 'SYSTEM',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPIRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "submissionDeadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "schoolYear" TEXT NOT NULL DEFAULT '2026-2027',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiAxis" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roleScope" "AxisRoleScope" NOT NULL DEFAULT 'ALL',
    "restrictedPositionCodes" JSONB,
    "requiresSubtype" BOOLEAN NOT NULL DEFAULT false,
    "subtypeOptions" JSONB,
    "warnOveruseThresholdPct" DOUBLE PRECISION DEFAULT 20.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiAxis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitAxisApplicability" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "axisId" TEXT NOT NULL,
    "isApplicable" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitAxisApplicability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiTaskAxisTag" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "axisId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiTaskAxisTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignmentLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT,
    "periodId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "assignedDepartment" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "relatedAxisId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskAssignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiBonusProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "reasonType" TEXT NOT NULL,
    "reasonDescription" TEXT,
    "proposedBonusPct" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "calculatedBonusScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiBonusProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiScoreRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "groupType" INTEGER NOT NULL DEFAULT 2,
    "scoreGeneral" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreTask" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreBonusRaw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreBonusCapped" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreFinal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "classification" TEXT NOT NULL DEFAULT 'hoan_thanh',
    "meetsExtraConditions" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "axisBreakdown" JSONB,
    "isCarriedForward" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiScoreRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSpecialCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "note" TEXT,
    "attachments" JSONB,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiSpecialCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_code_idx" ON "Tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Package_code_key" ON "Package"("code");

-- CreateIndex
CREATE INDEX "Package_code_idx" ON "Package"("code");

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSubscription_packageId_idx" ON "TenantSubscription"("packageId");

-- CreateIndex
CREATE INDEX "TenantSubscription_status_idx" ON "TenantSubscription"("status");

-- CreateIndex
CREATE INDEX "SystemAuditLog_actorUserId_idx" ON "SystemAuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "SystemAuditLog_targetTenantId_idx" ON "SystemAuditLog"("targetTenantId");

-- CreateIndex
CREATE INDEX "SystemAuditLog_createdAt_idx" ON "SystemAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "School_tenantId_key" ON "School"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

-- CreateIndex
CREATE INDEX "Location_tenantId_idx" ON "Location"("tenantId");

-- CreateIndex
CREATE INDEX "Location_tenantId_isMain_idx" ON "Location"("tenantId", "isMain");

-- CreateIndex
CREATE INDEX "Location_schoolId_idx" ON "Location"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_schoolId_code_key" ON "Location"("schoolId", "code");

-- CreateIndex
CREATE INDEX "OrgUnit_tenantId_idx" ON "OrgUnit"("tenantId");

-- CreateIndex
CREATE INDEX "OrgUnit_tenantId_parentId_idx" ON "OrgUnit"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "OrgUnit_schoolId_idx" ON "OrgUnit"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnit_schoolId_code_key" ON "OrgUnit"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_isActive_idx" ON "User"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "User_tenantId_primaryLocationId_idx" ON "User"("tenantId", "primaryLocationId");

-- CreateIndex
CREATE INDEX "User_tenantId_primaryOrgUnitId_idx" ON "User"("tenantId", "primaryOrgUnitId");

-- CreateIndex
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "UserRole_scopeLocationId_idx" ON "UserRole"("scopeLocationId");

-- CreateIndex
CREATE INDEX "UserRole_scopeOrgUnitId_idx" ON "UserRole"("scopeOrgUnitId");

-- CreateIndex
CREATE INDEX "Plan_tenantId_idx" ON "Plan"("tenantId");

-- CreateIndex
CREATE INDEX "Plan_tenantId_level_idx" ON "Plan"("tenantId", "level");

-- CreateIndex
CREATE INDEX "Plan_tenantId_startDate_endDate_idx" ON "Plan"("tenantId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Plan_schoolId_idx" ON "Plan"("schoolId");

-- CreateIndex
CREATE INDEX "Plan_parentPlanId_idx" ON "Plan"("parentPlanId");

-- CreateIndex
CREATE INDEX "PlanLog_tenantId_idx" ON "PlanLog"("tenantId");

-- CreateIndex
CREATE INDEX "PlanLog_tenantId_planId_idx" ON "PlanLog"("tenantId", "planId");

-- CreateIndex
CREATE INDEX "PlanLog_planId_idx" ON "PlanLog"("planId");

-- CreateIndex
CREATE INDEX "PlanLog_createdAt_idx" ON "PlanLog"("createdAt");

-- CreateIndex
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");

-- CreateIndex
CREATE INDEX "Task_tenantId_status_idx" ON "Task"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_dueDate_idx" ON "Task"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_tenantId_planId_idx" ON "Task"("tenantId", "planId");

-- CreateIndex
CREATE INDEX "Task_tenantId_locationId_idx" ON "Task"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "Task_tenantId_orgUnitId_idx" ON "Task"("tenantId", "orgUnitId");

-- CreateIndex
CREATE INDEX "Task_tenantId_assignedOrgUnitId_idx" ON "Task"("tenantId", "assignedOrgUnitId");

-- CreateIndex
CREATE INDEX "Task_tenantId_isProposal_idx" ON "Task"("tenantId", "isProposal");

-- CreateIndex
CREATE INDEX "Task_tenantId_status_dueDate_idx" ON "Task"("tenantId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Task_schoolId_idx" ON "Task"("schoolId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

-- CreateIndex
CREATE INDEX "Task_periodId_idx" ON "Task"("periodId");

-- CreateIndex
CREATE INDEX "Task_primaryAxisId_idx" ON "Task"("primaryAxisId");

-- CreateIndex
CREATE INDEX "TaskAssignment_tenantId_idx" ON "TaskAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "TaskAssignment_tenantId_taskId_idx" ON "TaskAssignment"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "TaskAssignment_tenantId_userId_idx" ON "TaskAssignment"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "TaskAssignment_taskId_idx" ON "TaskAssignment"("taskId");

-- CreateIndex
CREATE INDEX "TaskAssignment_userId_idx" ON "TaskAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignment_taskId_userId_role_key" ON "TaskAssignment"("taskId", "userId", "role");

-- CreateIndex
CREATE INDEX "TaskLog_tenantId_idx" ON "TaskLog"("tenantId");

-- CreateIndex
CREATE INDEX "TaskLog_tenantId_taskId_idx" ON "TaskLog"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "TaskLog_taskId_idx" ON "TaskLog"("taskId");

-- CreateIndex
CREATE INDEX "TaskLog_createdAt_idx" ON "TaskLog"("createdAt");

-- CreateIndex
CREATE INDEX "Attachment_tenantId_idx" ON "Attachment"("tenantId");

-- CreateIndex
CREATE INDEX "Attachment_tenantId_taskId_idx" ON "Attachment"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "Attachment_taskId_idx" ON "Attachment"("taskId");

-- CreateIndex
CREATE INDEX "Attachment_taskLogId_idx" ON "Attachment"("taskLogId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_isRead_idx" ON "Notification"("tenantId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_tenantId_idx" ON "Comment"("tenantId");

-- CreateIndex
CREATE INDEX "Comment_tenantId_taskId_idx" ON "Comment"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "Comment_taskId_idx" ON "Comment"("taskId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_tenantId_idx" ON "AdminAuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_tenantId_actorUserId_idx" ON "AdminAuditLog"("tenantId", "actorUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUserId_idx" ON "AdminAuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "Permission"("category");

-- CreateIndex
CREATE INDEX "Permission_key_idx" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RoleModel_tenantId_code_idx" ON "RoleModel"("tenantId", "code");

-- CreateIndex
CREATE INDEX "RoleModel_tenantId_idx" ON "RoleModel"("tenantId");

-- CreateIndex
CREATE INDEX "RoleModel_code_idx" ON "RoleModel"("code");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "SharedCategory_tenantId_idx" ON "SharedCategory"("tenantId");

-- CreateIndex
CREATE INDEX "SharedCategory_tenantId_type_idx" ON "SharedCategory"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SharedCategory_tenantId_type_code_key" ON "SharedCategory"("tenantId", "type", "code");

-- CreateIndex
CREATE INDEX "KPIDefinition_tenantId_idx" ON "KPIDefinition"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "KPIDefinition_tenantId_code_key" ON "KPIDefinition"("tenantId", "code");

-- CreateIndex
CREATE INDEX "KPIRecord_tenantId_idx" ON "KPIRecord"("tenantId");

-- CreateIndex
CREATE INDEX "KPIRecord_tenantId_userId_idx" ON "KPIRecord"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "KPIRecord_tenantId_periodKey_idx" ON "KPIRecord"("tenantId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "KPIRecord_tenantId_userId_periodKey_key" ON "KPIRecord"("tenantId", "userId", "periodKey");

-- CreateIndex
CREATE INDEX "EvaluationPeriod_tenantId_idx" ON "EvaluationPeriod"("tenantId");

-- CreateIndex
CREATE INDEX "EvaluationPeriod_status_idx" ON "EvaluationPeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationPeriod_tenantId_code_key" ON "EvaluationPeriod"("tenantId", "code");

-- CreateIndex
CREATE INDEX "KpiAxis_tenantId_idx" ON "KpiAxis"("tenantId");

-- CreateIndex
CREATE INDEX "KpiAxis_code_idx" ON "KpiAxis"("code");

-- CreateIndex
CREATE UNIQUE INDEX "KpiAxis_tenantId_code_key" ON "KpiAxis"("tenantId", "code");

-- CreateIndex
CREATE INDEX "UnitAxisApplicability_tenantId_idx" ON "UnitAxisApplicability"("tenantId");

-- CreateIndex
CREATE INDEX "UnitAxisApplicability_unitId_periodId_idx" ON "UnitAxisApplicability"("unitId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitAxisApplicability_unitId_periodId_axisId_key" ON "UnitAxisApplicability"("unitId", "periodId", "axisId");

-- CreateIndex
CREATE INDEX "KpiTaskAxisTag_taskId_idx" ON "KpiTaskAxisTag"("taskId");

-- CreateIndex
CREATE INDEX "KpiTaskAxisTag_axisId_idx" ON "KpiTaskAxisTag"("axisId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiTaskAxisTag_taskId_axisId_key" ON "KpiTaskAxisTag"("taskId", "axisId");

-- CreateIndex
CREATE INDEX "TaskAssignmentLog_tenantId_idx" ON "TaskAssignmentLog"("tenantId");

-- CreateIndex
CREATE INDEX "TaskAssignmentLog_periodId_idx" ON "TaskAssignmentLog"("periodId");

-- CreateIndex
CREATE INDEX "TaskAssignmentLog_assignedById_idx" ON "TaskAssignmentLog"("assignedById");

-- CreateIndex
CREATE INDEX "TaskAssignmentLog_assignedToId_idx" ON "TaskAssignmentLog"("assignedToId");

-- CreateIndex
CREATE INDEX "KpiBonusProposal_tenantId_idx" ON "KpiBonusProposal"("tenantId");

-- CreateIndex
CREATE INDEX "KpiBonusProposal_taskId_idx" ON "KpiBonusProposal"("taskId");

-- CreateIndex
CREATE INDEX "KpiBonusProposal_periodId_idx" ON "KpiBonusProposal"("periodId");

-- CreateIndex
CREATE INDEX "KpiBonusProposal_status_idx" ON "KpiBonusProposal"("status");

-- CreateIndex
CREATE INDEX "KpiScoreRecord_tenantId_idx" ON "KpiScoreRecord"("tenantId");

-- CreateIndex
CREATE INDEX "KpiScoreRecord_periodId_idx" ON "KpiScoreRecord"("periodId");

-- CreateIndex
CREATE INDEX "KpiScoreRecord_employeeId_idx" ON "KpiScoreRecord"("employeeId");

-- CreateIndex
CREATE INDEX "KpiScoreRecord_classification_idx" ON "KpiScoreRecord"("classification");

-- CreateIndex
CREATE UNIQUE INDEX "KpiScoreRecord_tenantId_employeeId_periodId_key" ON "KpiScoreRecord"("tenantId", "employeeId", "periodId");

-- CreateIndex
CREATE INDEX "KpiSpecialCase_tenantId_idx" ON "KpiSpecialCase"("tenantId");

-- CreateIndex
CREATE INDEX "KpiSpecialCase_employeeId_idx" ON "KpiSpecialCase"("employeeId");

-- CreateIndex
CREATE INDEX "KpiSpecialCase_periodId_idx" ON "KpiSpecialCase"("periodId");

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAuditLog" ADD CONSTRAINT "SystemAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAuditLog" ADD CONSTRAINT "SystemAuditLog_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primaryOrgUnitId_fkey" FOREIGN KEY ("primaryOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_scopeLocationId_fkey" FOREIGN KEY ("scopeLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_parentPlanId_fkey" FOREIGN KEY ("parentPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanLog" ADD CONSTRAINT "PlanLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanLog" ADD CONSTRAINT "PlanLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanLog" ADD CONSTRAINT "PlanLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedOrgUnitId_fkey" FOREIGN KEY ("assignedOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_primaryAxisId_fkey" FOREIGN KEY ("primaryAxisId") REFERENCES "KpiAxis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLog" ADD CONSTRAINT "TaskLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLog" ADD CONSTRAINT "TaskLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLog" ADD CONSTRAINT "TaskLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskLogId_fkey" FOREIGN KEY ("taskLogId") REFERENCES "TaskLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleModel" ADD CONSTRAINT "RoleModel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedCategory" ADD CONSTRAINT "SharedCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIDefinition" ADD CONSTRAINT "KPIDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIRecord" ADD CONSTRAINT "KPIRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIRecord" ADD CONSTRAINT "KPIRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationPeriod" ADD CONSTRAINT "EvaluationPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationPeriod" ADD CONSTRAINT "EvaluationPeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiAxis" ADD CONSTRAINT "KpiAxis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitAxisApplicability" ADD CONSTRAINT "UnitAxisApplicability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitAxisApplicability" ADD CONSTRAINT "UnitAxisApplicability_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitAxisApplicability" ADD CONSTRAINT "UnitAxisApplicability_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitAxisApplicability" ADD CONSTRAINT "UnitAxisApplicability_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "KpiAxis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTaskAxisTag" ADD CONSTRAINT "KpiTaskAxisTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTaskAxisTag" ADD CONSTRAINT "KpiTaskAxisTag_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "KpiAxis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignmentLog" ADD CONSTRAINT "TaskAssignmentLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignmentLog" ADD CONSTRAINT "TaskAssignmentLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignmentLog" ADD CONSTRAINT "TaskAssignmentLog_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignmentLog" ADD CONSTRAINT "TaskAssignmentLog_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignmentLog" ADD CONSTRAINT "TaskAssignmentLog_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignmentLog" ADD CONSTRAINT "TaskAssignmentLog_relatedAxisId_fkey" FOREIGN KEY ("relatedAxisId") REFERENCES "KpiAxis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiBonusProposal" ADD CONSTRAINT "KpiBonusProposal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiBonusProposal" ADD CONSTRAINT "KpiBonusProposal_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiBonusProposal" ADD CONSTRAINT "KpiBonusProposal_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiBonusProposal" ADD CONSTRAINT "KpiBonusProposal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiBonusProposal" ADD CONSTRAINT "KpiBonusProposal_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiScoreRecord" ADD CONSTRAINT "KpiScoreRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiScoreRecord" ADD CONSTRAINT "KpiScoreRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiScoreRecord" ADD CONSTRAINT "KpiScoreRecord_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiScoreRecord" ADD CONSTRAINT "KpiScoreRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSpecialCase" ADD CONSTRAINT "KpiSpecialCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSpecialCase" ADD CONSTRAINT "KpiSpecialCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSpecialCase" ADD CONSTRAINT "KpiSpecialCase_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "EvaluationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSpecialCase" ADD CONSTRAINT "KpiSpecialCase_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ========================================================
-- TN EDU DATABASE BASELINE INITIALIZATION SCRIPT
-- 100% REAL PRODUCTION BASELINE (NO DEMO DATA)
-- ========================================================

-- 1. SEED SYSTEM PERMISSIONS (60 PERMISSIONS)
INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_view', 'plan.view', 'Xem kế hoạch', 'KE_HOACH', 'Xem danh sách và chi tiết kế hoạch theo phạm vi', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_view_all', 'plan.view_all', 'Xem toàn bộ kế hoạch trường', 'KE_HOACH', 'Xem tất cả kế hoạch mọi cấp trong toàn trường', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_create', 'plan.create', 'Tạo kế hoạch', 'KE_HOACH', 'Lập kế hoạch năm, học kỳ, quý, tháng, tuần', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_edit', 'plan.edit', 'Chỉnh sửa kế hoạch', 'KE_HOACH', 'Sửa nội dung, thời gian, cây kế hoạch trực thuộc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_delete', 'plan.delete', 'Xóa kế hoạch', 'KE_HOACH', 'Xóa kế hoạch chưa phát sinh công việc hoặc kế hoạch nháp', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_approve', 'plan.approve', 'Phê duyệt kế hoạch', 'KE_HOACH', 'Ban hành, phê duyệt kế hoạch trường/tổ', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_export', 'plan.export', 'Xuất kế hoạch', 'KE_HOACH', 'Xuất file dữ liệu kế hoạch ra Excel/PDF', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_plan_history', 'plan.history', 'Xem lịch sử kế hoạch', 'KE_HOACH', 'Xem nhật ký thay đổi và phiên bản kế hoạch', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_view', 'task.view', 'Xem công việc liên quan', 'CONG_VIEC', 'Xem công việc được giao hoặc có vai trò RACI', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_view_all', 'task.view_all', 'Xem toàn bộ công việc', 'CONG_VIEC', 'Xem mọi công việc trong phạm vi trường/tổ/phân hiệu', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_create', 'task.create', 'Tạo và giao việc', 'CONG_VIEC', 'Tạo công việc, giao cho cá nhân hoặc cả tổ/bộ phận', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_edit', 'task.edit', 'Sửa thông tin công việc', 'CONG_VIEC', 'Chỉnh sửa tiêu đề, mô tả, hạn chót, độ ưu tiên', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_delete', 'task.delete', 'Xóa công việc', 'CONG_VIEC', 'Xóa công việc nháp hoặc đã tạo nhầm', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_assign', 'task.assign', 'Phân công vai trò RACI', 'CONG_VIEC', 'Chỉ định Người chủ trì, Phối hợp, Kiểm tra, Duyệt', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_update_progress', 'task.update_progress', 'Cập nhật tiến độ', 'CONG_VIEC', 'Cập nhật % tiến độ và nhật ký xử lý công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_upload_evidence', 'task.upload_evidence', 'Tải lên minh chứng', 'CONG_VIEC', 'Đính kèm tệp tin, hình ảnh minh chứng kết quả', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_request_review', 'task.request_review', 'Yêu cầu kiểm tra', 'CONG_VIEC', 'Gửi yêu cầu kiểm tra nghiệm thu khi hoàn tất', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_review', 'task.review', 'Kiểm tra công việc', 'CONG_VIEC', 'Xác nhận đạt yêu cầu hoặc trả lại chỉnh sửa', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_approve', 'task.approve', 'Phê duyệt hoàn thành', 'CONG_VIEC', 'Duyệt hoàn thành và xác nhận kết quả công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_request_revision', 'task.request_revision', 'Yêu cầu bổ sung', 'CONG_VIEC', 'Trả lại yêu cầu bổ sung minh chứng/sửa đổi', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_close', 'task.close', 'Đóng công việc', 'CONG_VIEC', 'Đóng và lưu trữ công việc đã hoàn thành', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_cancel', 'task.cancel', 'Hủy công việc', 'CONG_VIEC', 'Hủy bỏ công việc không còn thực hiện', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_propose', 'task.propose', 'Đề xuất công việc', 'CONG_VIEC', 'Đề xuất công việc mới từ cấp dưới lên lãnh đạo', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_approve_proposal', 'task.approve_proposal', 'Duyệt công việc đề xuất', 'CONG_VIEC', 'Xem xét và phê duyệt các đề xuất công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_comment', 'task.comment', 'Bình luận & @mention', 'CONG_VIEC', 'Trao đổi, thảo luận và gắn thẻ thành viên trong công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_history', 'task.history', 'Xem nhật ký công việc', 'CONG_VIEC', 'Xem toàn bộ lịch sử chỉnh sửa và thay đổi trạng thái', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_task_export', 'task.export', 'Xuất danh sách công việc', 'CONG_VIEC', 'Xuất danh sách công việc theo bộ lọc ra Excel', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_view_personal', 'kpi.view_personal', 'Xem KPI cá nhân', 'KPI', 'Xem điểm số và thống kê hiệu suất bản thân', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_view_org', 'kpi.view_org', 'Xem KPI tổ/bộ phận', 'KPI', 'Xem bảng điểm và thống kê KPI của tổ chuyên môn', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_view_location', 'kpi.view_location', 'Xem KPI phân hiệu', 'KPI', 'Xem thống kê hiệu suất theo từng phân hiệu/điểm trường', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_view_all', 'kpi.view_all', 'Xem KPI toàn trường', 'KPI', 'Xem bảng tổng hợp KPI của toàn thể cán bộ giáo viên', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_rate_4level', 'kpi.rate_4level', 'Đánh giá xếp loại 4 mức', 'KPI', 'Đánh giá kết quả thực hiện theo 4 mức (Xuất sắc/Tốt/Đạt/Chưa đạt)', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_recompute', 'kpi.recompute', 'Tính toán lại KPI', 'KPI', 'Chạy lại job tính toán và đối soát KPI tự động theo kỳ', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_config', 'kpi.config', 'Cấu hình chỉ số KPI', 'KPI', 'Thiết lập các tiêu chí KPI bổ sung và trọng số đánh giá', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_kpi_export', 'kpi.export', 'Xuất báo cáo KPI', 'KPI', 'Xuất bảng điểm KPI và xếp loại ra Excel', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_view_dashboard', 'report.view_dashboard', 'Xem Dashboard tổng quan', 'BAO_CAO', 'Xem biểu đồ thống kê tiến độ, hạn chót, tải công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_view_personal', 'report.view_personal', 'Xem báo cáo cá nhân', 'BAO_CAO', 'Xem tổng hợp tiến độ và kết quả công việc cá nhân', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_view_org', 'report.view_org', 'Xem báo cáo tổ bộ phận', 'BAO_CAO', 'Xem báo cáo tổng hợp cấp tổ chuyên môn', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_view_school', 'report.view_school', 'Xem báo cáo toàn trường', 'BAO_CAO', 'Xem báo cáo tổng hợp toàn diện nhà trường', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_export_excel', 'report.export_excel', 'Xuất báo cáo Excel', 'BAO_CAO', 'Xuất các biểu mẫu báo cáo định kỳ ra file Excel', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_report_advanced_search', 'report.advanced_search', 'Tìm kiếm nâng cao', 'BAO_CAO', 'Tra cứu nhanh toàn hệ thống theo nhiều tiêu chí lọc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_view', 'org.view', 'Xem cơ cấu tổ chức', 'DANH_MUC_TO_CHUC', 'Xem sơ đồ tổ chức, danh sách phân hiệu và tổ bộ phận', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_school', 'org.manage_school', 'Quản lý thông tin trường', 'DANH_MUC_TO_CHUC', 'Cập nhật thông tin nhà trường, BGH và tổng số học sinh', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_locations', 'org.manage_locations', 'Quản lý phân hiệu/điểm trường', 'DANH_MUC_TO_CHUC', 'Thêm, sửa, xóa, chỉ định trưởng điểm trường', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_org_units', 'org.manage_org_units', 'Quản lý tổ chuyên môn', 'DANH_MUC_TO_CHUC', 'Thêm, sửa, xóa, sắp xếp tổ/bộ phận', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_classes', 'org.manage_classes', 'Quản lý lớp & số liệu học sinh', 'DANH_MUC_TO_CHUC', 'Cập nhật quy mô lớp học và phân bố học sinh', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_staff', 'org.manage_staff', 'Phân công nhân sự', 'DANH_MUC_TO_CHUC', 'Phân công nhân sự vào phân hiệu và tổ chuyên môn', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_org_manage_categories', 'org.manage_categories', 'Quản lý danh mục dùng chung', 'DANH_MUC_TO_CHUC', 'Cấu hình năm học, học kỳ, chức danh, loại công việc', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_view', 'account.view', 'Xem danh sách tài khoản', 'QUAN_TRI_HE_THONG', 'Xem danh sách nhân sự, trạng thái tài khoản và vai trò', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_create', 'account.create', 'Tạo tài khoản người dùng', 'QUAN_TRI_HE_THONG', 'Tạo tài khoản mới từ hồ sơ nhân sự theo hạn mức', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_update', 'account.update', 'Cập nhật tài khoản', 'QUAN_TRI_HE_THONG', 'Chỉnh sửa họ tên, email, số điện thoại, chức vụ', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_lock', 'account.lock', 'Khóa / Mở khóa tài khoản', 'QUAN_TRI_HE_THONG', 'Tạm khóa hoặc kích hoạt lại quyền đăng nhập', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_reset_password', 'account.reset_password', 'Đặt lại mật khẩu', 'QUAN_TRI_HE_THONG', 'Reset mật khẩu tài khoản về mặc định hoặc mật khẩu mới', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_account_assign_role', 'account.assign_role', 'Gán vai trò & phạm vi', 'QUAN_TRI_HE_THONG', 'Gán vai trò và phạm vi (phân hiệu, tổ bộ phận) cho tài khoản', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_role_view', 'role.view', 'Xem danh mục vai trò & ma trận quyền', 'QUAN_TRI_HE_THONG', 'Xem ma trận phân quyền của các vai trò', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_role_create', 'role.create', 'Tạo vai trò tùy biến', 'QUAN_TRI_HE_THONG', 'Thêm vai trò mới và thiết lập tập quyền tương ứng', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_role_update', 'role.update', 'Cấu hình quyền cho vai trò', 'QUAN_TRI_HE_THONG', 'Chỉnh sửa thông tin vai trò và ma trận checkbox quyền', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_role_delete', 'role.delete', 'Xóa vai trò tùy biến', 'QUAN_TRI_HE_THONG', 'Xóa vai trò tùy biến chưa gán cho tài khoản nào', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_audit_view', 'audit.view', 'Xem nhật ký quản trị', 'QUAN_TRI_HE_THONG', 'Xem lịch sử các thao tác quản trị tài khoản, phân quyền', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

INSERT INTO "Permission" ("id", "key", "name", "category", "description", "createdAt")
VALUES ('perm_system_view_quota', 'system.view_quota', 'Xem hạn mức gói thuê bao', 'QUAN_TRI_HE_THONG', 'Xem số lượng tài khoản đã dùng / tối đa, dung lượng lưu trữ', NOW())
ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "description" = EXCLUDED."description";

-- 2. SEED SAAS PACKAGES (STANDARD & ENTERPRISE)
INSERT INTO "Package" ("id", "code", "name", "maxAccounts", "storageQuotaGB", "enabledModules", "price", "description", "createdAt", "updatedAt")
VALUES ('pkg_standard_01', 'STD', 'Gói Cơ bản (Standard)', 100, 20, '["PLANS","TASKS","REPORTS","ORG"]', 15000000, 'Dành cho các trường quy mô vừa và nhỏ (dưới 100 cán bộ giáo viên).', NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "Package" ("id", "code", "name", "maxAccounts", "storageQuotaGB", "enabledModules", "price", "description", "createdAt", "updatedAt")
VALUES ('pkg_enterprise_02', 'ENT', 'Gói Nâng cao (Enterprise)', 500, 100, '["PLANS","TASKS","KPI","REPORTS","ORG","ATTACHMENTS_S3"]', 35000000, 'Dành cho trường liên cấp, nhiều điểm trường hoặc trên 100 cán bộ giáo viên.', NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- 3. SEED SYSTEM ADMIN ACCOUNT (chunh@tringhiatech.vn / 0913016667 / 123456)
INSERT INTO "User" ("id", "email", "phone", "fullName", "passwordHash", "title", "isSystemAdmin", "isActive", "createdAt", "updatedAt")
VALUES ('usr_system_admin_01', 'chunh@tringhiatech.vn', '0913016667', 'Quản trị Nền tảng (System Admin)', '$2a$10$qmW4QwGyZZKT.a//OJ2juelJnt43Y0OChWCnJ.xVtXF.QpLebJXz2', 'Platform System Administrator', true, true, NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "isSystemAdmin" = true, "isActive" = true;

-- 4. ASSIGN SYSTEM_ADMIN ROLE
INSERT INTO "UserRole" ("id", "userId", "role", "createdAt", "updatedAt")
VALUES ('urole_sysadmin_01', 'usr_system_admin_01', 'SYSTEM_ADMIN', NOW(), NOW())
ON CONFLICT DO NOTHING;

