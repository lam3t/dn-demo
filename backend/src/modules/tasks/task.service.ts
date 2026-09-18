import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { TaskStatus, TaskPriority, TaskAssignmentRole, Role, TaskEvaluationRating, NotificationType } from '@prisma/client';
import { planService } from '../plans/plan.service';
import appCache from '../../utils/cache';
import { resolveTenantId } from '../../utils/tenant.util';
import { QueueService } from '../../services/queue.service';
import { TaskAxisValidationService } from '../kpi/services/task-axis-validation.service';
import { decodeUtf8FileName } from '../../services/storage.service';

export interface TaskQueryParams {
  status?: TaskStatus;
  assigneeId?: string;
  role?: TaskAssignmentRole;
  locationId?: string;
  orgUnitId?: string;
  assignedOrgUnitId?: string;
  planId?: string;
  overdue?: boolean | string;
  isOverdue?: boolean | string;
  myTasks?: boolean | string;
  currentUserId?: string;
  search?: string;
  isProposal?: boolean | string;
  proposalStatus?: string;
  page?: number;
  pageSize?: number;
  schoolId?: string;
  tenantId?: string;
  schoolYear?: string;
  periodId?: string;
  primaryAxisId?: string;
  kpiOnly?: boolean | string;
  nonKpiOnly?: boolean | string;
}

export interface CreateTaskDto {
  schoolId: string;
  tenantId?: string;
  title: string;
  code?: string;
  description?: string;
  planId?: string | null;
  locationId?: string | null;
  orgUnitId?: string | null;
  assignedOrgUnitId?: string | null;
  isOrgAssignment?: boolean;
  priority?: TaskPriority;
  startDate?: Date | string | null;
  dueDate?: Date | string | null;
  requireAttachment?: boolean;
  createdById: string;
  isProposal?: boolean;
  proposalNote?: string;
  // Flexible KPI fields
  periodId?: string | null;
  primaryAxisId?: string | null;
  taskSubtype?: string | null;
  weightScore?: number | null;
  evidenceFiles?: any;
  secondaryAxisIds?: string[];
  assignments?: Array<{
    userId: string;
    role: TaskAssignmentRole;
    note?: string;
  }>;
}

export class TaskService {
  /**
   * Lấy danh sách công việc theo bộ lọc đa năng
   */
  async getAll(params: TaskQueryParams) {
    const cacheKey = `tasks:query:${JSON.stringify(params)}`;
    const cached = appCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));

    const conditions: any[] = [];

    if (params.tenantId) {
      conditions.push({ tenantId: params.tenantId });
    } else if (params.schoolId) {
      conditions.push({ schoolId: params.schoolId });
    }

    if (params.status) {
      conditions.push({ status: params.status });
    }

    if (params.locationId) {
      conditions.push({ locationId: params.locationId });
    }

    if (params.orgUnitId) {
      conditions.push({ orgUnitId: params.orgUnitId });
    }

    if (params.assignedOrgUnitId) {
      conditions.push({ assignedOrgUnitId: params.assignedOrgUnitId });
    }

    if (params.planId) {
      conditions.push({ planId: params.planId });
    }

    if (params.schoolYear) {
      const parts = params.schoolYear.split('-');
      if (parts.length === 2) {
        const startY = parseInt(parts[0].trim(), 10);
        const endY = parseInt(parts[1].trim(), 10);
        if (!isNaN(startY) && !isNaN(endY)) {
          const startDate = new Date(Date.UTC(startY, 7, 15, 0, 0, 0));
          const endDate = new Date(Date.UTC(endY, 7, 31, 23, 59, 59, 999));
          conditions.push({
            OR: [
              { createdAt: { gte: startDate, lte: endDate } },
              { startDate: { gte: startDate, lte: endDate } },
              { dueDate: { gte: startDate, lte: endDate } },
            ],
          });
        }
      }
    }

    if (params.isProposal !== undefined) {
      const isProp = params.isProposal === true || params.isProposal === 'true';
      conditions.push({ isProposal: isProp });
    }

    if (params.proposalStatus) {
      conditions.push({ proposalStatus: params.proposalStatus });
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      conditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    // Lọc Việc của tôi / Phân công RACI
    const isMyTasks = params.myTasks === true || params.myTasks === 'true';
    const targetUserId = params.assigneeId || (isMyTasks ? params.currentUserId : undefined);

    if (targetUserId) {
      const assignmentCondition: any = { userId: targetUserId };
      if (params.role) {
        assignmentCondition.role = params.role;
      }
      conditions.push({
        assignments: {
          some: assignmentCondition,
        },
      });
    }

    // Lọc quá hạn (overdue)
    const isOverdueQuery =
      params.overdue === true ||
      params.overdue === 'true' ||
      params.isOverdue === true ||
      params.isOverdue === 'true';

    if (isOverdueQuery) {
      conditions.push({
        dueDate: { lt: new Date() },
        status: {
          notIn: [TaskStatus.HOAN_THANH, TaskStatus.XAC_NHAN, TaskStatus.DONG, TaskStatus.HUY],
        },
      });
    }

    // Lọc theo Trục kết quả & Kỳ KPI
    if (params.periodId) {
      conditions.push({ periodId: params.periodId });
    }
    if (params.primaryAxisId) {
      conditions.push({ primaryAxisId: params.primaryAxisId });
    }
    if (params.kpiOnly === true || params.kpiOnly === 'true') {
      conditions.push({ primaryAxisId: { not: null } });
    }
    if (params.nonKpiOnly === true || params.nonKpiOnly === 'true') {
      conditions.push({ primaryAxisId: null });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [total, rawTasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          plan: {
            select: {
              id: true,
              title: true,
              level: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          orgUnit: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          assignedOrgUnit: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          primaryAxis: {
            select: {
              id: true,
              code: true,
              name: true,
              displayOrder: true,
              requiresSubtype: true,
            },
          },
          period: {
            select: {
              id: true,
              name: true,
              code: true,
              schoolYear: true,
            },
          },
          secondaryAxisTags: {
            include: {
              axis: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          evaluatedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          proposedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  title: true,
                  phone: true,
                  email: true,
                  avatarUrl: true,
                  primaryLocation: { select: { id: true, name: true, code: true } },
                  primaryOrgUnit: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
          _count: {
            select: {
              attachments: true,
              comments: true,
              logs: true,
            },
          },
        },
      }),
    ]);

    const now = new Date();
    const completedStatuses: TaskStatus[] = [
      TaskStatus.HOAN_THANH,
      TaskStatus.XAC_NHAN,
      TaskStatus.DONG,
      TaskStatus.HUY,
    ];

    const tasks = rawTasks.map((task) => {
      const isOverdue =
        Boolean(task.dueDate && new Date(task.dueDate) < now) &&
        !completedStatuses.includes(task.status);

      const chuTriAssignment = task.assignments.find(
        (a) => a.role === TaskAssignmentRole.CHU_TRI
      );

      return {
        ...task,
        isOverdue,
        assignee: chuTriAssignment?.user || null,
        attachmentCount: task._count.attachments,
        commentCount: task._count.comments,
        logCount: task._count.logs,
      };
    });

    const totalPages = Math.ceil(total / pageSize);
    const result = {
      items: tasks,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    appCache.set(cacheKey, result, 10, ['tasks']);
    return result;
  }

  /**
   * Lấy chi tiết đầy đủ 1 Task
   */
  async getByIdFull(id: string, tenantId?: string) {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const task = await prisma.task.findFirst({
      where,
      include: {
        plan: true,
        location: true,
        orgUnit: true,
        assignedOrgUnit: true,
        primaryAxis: {
          select: {
            id: true,
            code: true,
            name: true,
            displayOrder: true,
            requiresSubtype: true,
          },
        },
        period: {
          select: {
            id: true,
            name: true,
            code: true,
            schoolYear: true,
          },
        },
        secondaryAxisTags: {
          include: {
            axis: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        bonusProposals: {
          include: {
            approvedBy: {
              select: { id: true, fullName: true },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            title: true,
            phone: true,
            avatarUrl: true,
            email: true,
          },
        },
        evaluatedBy: {
          select: {
            id: true,
            fullName: true,
            title: true,
          },
        },
        proposedBy: {
          select: {
            id: true,
            fullName: true,
            title: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                title: true,
                phone: true,
                email: true,
                avatarUrl: true,
                primaryLocation: { select: { id: true, name: true, code: true } },
                primaryOrgUnit: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                title: true,
                avatarUrl: true,
                phone: true,
              },
            },
            attachments: true,
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                title: true,
                avatarUrl: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new AppError('Không tìm thấy thông tin công việc.', 404);
    }

    const now = new Date();
    const completedStatuses: TaskStatus[] = [
      TaskStatus.HOAN_THANH,
      TaskStatus.XAC_NHAN,
      TaskStatus.DONG,
      TaskStatus.HUY,
    ];
    const isOverdue =
      Boolean(task.dueDate && new Date(task.dueDate) < now) &&
      !completedStatuses.includes(task.status);

    const sanitizedAttachments = (task.attachments || []).map((att) => ({
      ...att,
      fileName: decodeUtf8FileName(att.fileName || att.originalName),
      originalName: decodeUtf8FileName(att.originalName || att.fileName),
    }));

    return {
      ...task,
      attachments: sanitizedAttachments,
      isOverdue,
    };
  }

  /**
   * Tạo công việc mới (hỗ trợ giao cho cá nhân hoặc cả tổ/bộ phận TT 62, 84, 97)
   */
  async create(data: CreateTaskDto) {
    if (!data.title) {
      throw new AppError('Tiêu đề công việc không được để trống.', 400);
    }

    const code = data.code || `CV-${Date.now().toString().slice(-6)}`;
    const tenantId = await resolveTenantId(data.schoolId, data.tenantId);

    // Validate RACI nếu giao cho cá nhân
    if (data.assignments && data.assignments.length > 0) {
      const chuTriCount = data.assignments.filter((a) => a.role === TaskAssignmentRole.CHU_TRI).length;
      if (chuTriCount !== 1 && !data.isOrgAssignment) {
        throw new AppError('Bắt buộc phải có đúng 1 người chịu trách nhiệm CHỦ TRÌ công việc.', 400);
      }
    }

    // Validate & evaluate Flexible KPI Primary Axis if provided
    let warningFlags: string[] | null = null;
    if (data.primaryAxisId) {
      const targetUserId =
        data.assignments?.find((a) => a.role === TaskAssignmentRole.CHU_TRI)?.userId ||
        data.createdById;

      // 1. Validate role scope & restricted axis rules
      await TaskAxisValidationService.validateTaskPrimaryAxis({
        tenantId,
        employeeId: targetUserId,
        orgUnitId: data.orgUnitId || undefined,
        periodId: data.periodId || undefined,
        primaryAxisId: data.primaryAxisId,
        taskSubtype: data.taskSubtype || undefined,
      });

      // 2. Run anti-fraud heuristics
      const period = data.periodId
        ? await prisma.evaluationPeriod.findUnique({ where: { id: data.periodId } })
        : null;

      const detected = await TaskAxisValidationService.detectTaskWarningFlags({
        tenantId,
        employeeId: targetUserId,
        periodId: data.periodId || undefined,
        primaryAxisId: data.primaryAxisId,
        weightScore: data.weightScore ?? 1.0,
        evidenceFiles: data.evidenceFiles,
        periodEndDate: period?.endDate,
        taskCreatedAt: new Date(),
      });
      if (detected.length > 0) {
        warningFlags = detected;
      }
    }

    // Kiểm tra quyền giao việc trực tiếp (Chỉ BGH, Tổ trưởng và Admin mới giao việc trực tiếp; Giáo viên tạo đề xuất)
    const creatorRoles = await prisma.userRole.findMany({
      where: { userId: data.createdById },
    });
    const roles = creatorRoles.map((r) => r.role);
    const canDirectAssign = roles.some((r) =>
      r === Role.ADMIN || r === Role.HIEU_TRUONG || r === Role.PHO_HIEU_TRUONG || r === Role.TO_TRUONG
    );
    const isProposal = Boolean(data.isProposal || !canDirectAssign);

    const task = await prisma.task.create({
      data: {
        tenantId,
        schoolId: data.schoolId,
        code,
        title: data.title,
        description: data.description,
        planId: data.planId || null,
        locationId: data.locationId || null,
        orgUnitId: data.orgUnitId || null,
        assignedOrgUnitId: data.assignedOrgUnitId || null,
        isOrgAssignment: Boolean(data.isOrgAssignment || data.assignedOrgUnitId),
        priority: data.priority || TaskPriority.TRUNG_BINH,
        status: isProposal
          ? TaskStatus.NHAP
          : (data.assignments && data.assignments.length > 0) || data.assignedOrgUnitId
          ? TaskStatus.DA_GIAO
          : TaskStatus.NHAP,
        progressPercent: 0,
        requireAttachment: data.requireAttachment ?? false,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: data.createdById,
        isProposal: isProposal,
        proposalStatus: isProposal ? 'CHO_DUYET' : null,
        proposalNote: data.proposalNote || null,
        proposedById: isProposal ? data.createdById : null,
        // Flexible KPI fields
        periodId: data.primaryAxisId ? (data.periodId || null) : null,
        primaryAxisId: data.primaryAxisId || null,
        taskSubtype: data.primaryAxisId ? (data.taskSubtype || null) : null,
        weightScore: data.primaryAxisId ? (data.weightScore ?? 1.0) : null,
        evidenceFiles: (data.evidenceFiles as any) || undefined,
        warningFlags: warningFlags && warningFlags.length > 0 ? (warningFlags as any) : undefined,
        ...(data.secondaryAxisIds && data.secondaryAxisIds.length > 0
          ? {
              secondaryAxisTags: {
                create: data.secondaryAxisIds.map((axisId) => ({ axisId })),
              },
            }
          : {}),
        assignments: {
          create: (data.assignments || []).map((a) => ({
            tenantId,
            userId: a.userId,
            role: a.role,
            note: a.note || null,
          })),
        },
        logs: {
          create: {
            tenantId,
            userId: data.createdById,
            action: data.isProposal ? 'DE_XUAT_CONG_VIEC' : 'TAO_MOI',
            newStatus: data.isProposal ? TaskStatus.NHAP : TaskStatus.DA_GIAO,
            newProgress: 0,
            note: data.isProposal
              ? `Đề xuất công việc: ${data.proposalNote || data.title}`
              : data.assignedOrgUnitId
              ? 'Giao việc cho Tổ / Bộ phận'
              : data.planId
              ? 'Tạo mới công việc theo kế hoạch'
              : 'Tạo mới công việc phát sinh/đột xuất',
          },
        },
      },
      include: {
        assignments: { include: { user: true } },
        assignedOrgUnit: true,
      },
    });

    // Bắn thông báo ngầm qua QueueService
    if (data.assignments && data.assignments.length > 0) {
      for (const a of data.assignments) {
        if (a.userId !== data.createdById) {
          await QueueService.pushNotification({
            tenantId,
            userId: a.userId,
            type: NotificationType.GIAO_VIEC,
            title: `Bạn được phân công công việc: ${task.title}`,
            content: `Vai trò: ${a.role} | Hạn hoàn thành: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : 'Không có'}`,
            link: `/tasks/${task.id}`,
          });
        }
      }
    }

    if (task.planId) {
      await planService.recalculatePlanProgress(task.planId);
    }

    appCache.invalidateTags(['tasks', 'dashboard', 'plans']);
    return task;
  }

  /**
   * Đánh giá kết quả công việc 4 mức (TT 70, 89)
   */
  async evaluateTask(
    taskId: string,
    currentUserId: string,
    userRoles: Role[],
    payload: { rating: TaskEvaluationRating; comment?: string }
  ) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Không tìm thấy công việc.', 404);
    }

    const allowedRoles: Role[] = [
      Role.ADMIN,
      Role.HIEU_TRUONG,
      Role.PHO_HIEU_TRUONG,
      Role.TO_TRUONG,
    ];
    const canEvaluate = userRoles.some((r) => allowedRoles.includes(r));
    if (!canEvaluate) {
      throw new AppError('Bạn không có thẩm quyền đánh giá kết quả công việc này.', 403);
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        evaluationRating: payload.rating,
        evaluationComment: payload.comment || null,
        evaluatedAt: new Date(),
        evaluatedById: currentUserId,
      },
      include: { evaluatedBy: true },
    });

    await prisma.taskLog.create({
      data: {
        tenantId: task.tenantId,
        taskId,
        userId: currentUserId,
        action: 'DANH_GIA_KET_QUA',
        note: `Đánh giá kết quả: [${payload.rating}] ${payload.comment ? '— ' + payload.comment : ''}`,
      },
    });

    // Gửi thông báo kết quả đánh giá cho người phụ trách
    const taskAssignees = await prisma.taskAssignment.findMany({ where: { taskId } });
    for (const a of taskAssignees) {
      if (a.userId !== currentUserId) {
        await QueueService.pushNotification({
          tenantId: task.tenantId,
          userId: a.userId,
          type: NotificationType.DA_HOAN_THANH,
          title: `Đánh giá kết quả: ${task.title}`,
          content: `Xếp loại: [${payload.rating}] ${payload.comment ? '— Nhận xét: ' + payload.comment : ''}`,
          link: `/tasks/${taskId}`,
        });
      }
    }

    appCache.invalidateTags(['tasks', 'dashboard']);
    return updatedTask;
  }

  /**
   * Đề xuất công việc từ cấp dưới (TT 77, 113)
   */
  async proposeTask(data: CreateTaskDto & { proposalNote?: string }) {
    return this.create({
      ...data,
      isProposal: true,
    });
  }

  /**
   * Duyệt đề xuất công việc (TT 77, 113)
   */
  async approveProposal(taskId: string, currentUserId: string, note?: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Không tìm thấy công việc đề xuất.', 404);
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        proposalStatus: 'DA_DUYET',
        status: TaskStatus.DA_GIAO,
      },
    });

    await prisma.taskLog.create({
      data: {
        tenantId: task.tenantId,
        taskId,
        userId: currentUserId,
        action: 'DUYET_DE_XUAT',
        oldStatus: task.status,
        newStatus: TaskStatus.DA_GIAO,
        note: note || 'Phê duyệt đề xuất công việc',
      },
    });

    if (task.proposedById) {
      await QueueService.pushNotification({
        tenantId: task.tenantId,
        userId: task.proposedById,
        type: NotificationType.HE_THONG,
        title: `Đề xuất công việc đã được duyệt: ${task.title}`,
        content: `Đề xuất của bạn đã được phê duyệt và chuyển sang trạng thái Đang thực hiện.`,
        link: `/tasks/${task.id}`,
      });
    }

    appCache.invalidateTags(['tasks', 'dashboard']);
    return updatedTask;
  }

  /**
   * Từ chối đề xuất công việc (TT 77, 113)
   */
  async rejectProposal(taskId: string, currentUserId: string, reason?: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Không tìm thấy công việc đề xuất.', 404);
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        proposalStatus: 'TU_CHOI',
        status: TaskStatus.HUY,
      },
    });

    await prisma.taskLog.create({
      data: {
        tenantId: task.tenantId,
        taskId,
        userId: currentUserId,
        action: 'TU_CHOI_DE_XUAT',
        oldStatus: task.status,
        newStatus: TaskStatus.HUY,
        note: reason || 'Từ chối đề xuất công việc',
      },
    });

    if (task.proposedById) {
      await QueueService.pushNotification({
        tenantId: task.tenantId,
        userId: task.proposedById,
        type: NotificationType.CAN_BO_SUNG,
        title: `Đề xuất công việc bị từ chối: ${task.title}`,
        content: `Lý do: ${reason || 'Không phù hợp với kế hoạch hiện tại.'}`,
        link: `/tasks/${task.id}`,
      });
    }

    appCache.invalidateTags(['tasks', 'dashboard']);
    return updatedTask;
  }

  /**
   * Gán người theo mô hình RACI
   */
  async updateAssignments(
    taskId: string,
    currentUserId: string,
    assignments: Array<{ userId: string; role: TaskAssignmentRole; note?: string }>
  ) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Không tìm thấy công việc.', 404);
    }

    if (!assignments || assignments.length === 0) {
      throw new AppError('Danh sách phân công không được để trống.', 400);
    }

    const chuTriCount = assignments.filter((a) => a.role === TaskAssignmentRole.CHU_TRI).length;
    if (chuTriCount !== 1) {
      throw new AppError('Bắt buộc phải có đúng 1 người chịu trách nhiệm CHỦ TRÌ công việc.', 400);
    }

    await prisma.$transaction([
      prisma.taskAssignment.deleteMany({ where: { taskId } }),
      prisma.taskAssignment.createMany({
        data: assignments.map((a) => ({
          tenantId: task.tenantId,
          taskId,
          userId: a.userId,
          role: a.role,
          note: a.note || null,
        })),
      }),
      ...(task.status === TaskStatus.NHAP
        ? [
            prisma.task.update({
              where: { id: taskId },
              data: { status: TaskStatus.DA_GIAO },
            }),
          ]
        : []),
      prisma.taskLog.create({
        data: {
          tenantId: task.tenantId,
          taskId,
          userId: currentUserId,
          action: 'CAP_NHAT_PHAN_CONG_RACI',
          note: `Cập nhật phân công RACI (${assignments.length} người)`,
        },
      }),
    ]);

    // Bắn thông báo cập nhật phân công RACI
    for (const a of assignments) {
      if (a.userId !== currentUserId) {
        const roleLabel =
          a.role === TaskAssignmentRole.CHU_TRI
            ? 'Chủ trì'
            : a.role === TaskAssignmentRole.PHOI_HOP
            ? 'Phối hợp'
            : a.role === TaskAssignmentRole.KIEM_TRA
            ? 'Kiểm tra'
            : a.role === TaskAssignmentRole.PHE_DUYET
            ? 'Phê duyệt'
            : 'Theo dõi';
        await QueueService.pushNotification({
          tenantId: task.tenantId,
          userId: a.userId,
          type: NotificationType.GIAO_VIEC,
          title: `Phân công nhiệm vụ: ${task.title}`,
          content: `Bạn được phân công vai trò [${roleLabel}] trong công việc [${task.code || ''}].`,
          link: `/tasks/${taskId}`,
        });
      }
    }

    appCache.invalidateTags(['tasks', 'dashboard', 'users']);
    return this.getByIdFull(taskId);
  }

  /**
   * Chuyển trạng thái theo Workflow quy chuẩn
   */
  async updateStatus(
    taskId: string,
    targetStatus: TaskStatus,
    userId: string,
    userRoles: Role[],
    note?: string
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: true,
        attachments: true,
      },
    });

    if (!task) {
      throw new AppError('Không tìm thấy công việc.', 404);
    }

    const oldStatus = task.status;
    if (oldStatus === targetStatus) {
      return task;
    }

    const isHieuTruongOrAdmin = userRoles.includes(Role.ADMIN) || userRoles.includes(Role.HIEU_TRUONG);
    const isPHT = userRoles.includes(Role.PHO_HIEU_TRUONG);
    const isCreator = task.createdById === userId;

    const userAssignment = task.assignments.find((a) => a.userId === userId);
    const userRoleInTask = userAssignment?.role;

    // 1. Kiểm tra điều kiện khi chuyển sang CHO_KIEM_TRA
    if (targetStatus === TaskStatus.CHO_KIEM_TRA) {
      const canSubmitForReview =
        isHieuTruongOrAdmin ||
        isPHT ||
        isCreator ||
        userRoleInTask === TaskAssignmentRole.CHU_TRI ||
        userRoleInTask === TaskAssignmentRole.PHOI_HOP ||
        task.assignments.length === 0;

      if (!canSubmitForReview) {
        throw new AppError('Chỉ người được phân công hoặc phụ trách công việc mới có quyền gửi yêu cầu kiểm tra.', 403);
      }

      if (task.requireAttachment && task.attachments.length === 0) {
        throw new AppError(
          'Công việc này bắt buộc phải có tệp/ảnh minh chứng kết quả trước khi gửi kiểm tra.',
          400
        );
      }
    }

    // 2. Kiểm tra quyền yêu cầu BỔ SUNG hoặc DUYỆT HOÀN THÀNH
    if (targetStatus === TaskStatus.BO_SUNG) {
      const canReject =
        isHieuTruongOrAdmin ||
        isPHT ||
        userRoleInTask === TaskAssignmentRole.KIEM_TRA ||
        userRoleInTask === TaskAssignmentRole.PHE_DUYET;

      if (!canReject) {
        throw new AppError('Chỉ người Kiểm tra hoặc Phê duyệt mới có quyền yêu cầu bổ sung.', 403);
      }
    }

    if (targetStatus === TaskStatus.HOAN_THANH) {
      const hasKiemTraRole = task.assignments.some((a) => a.role === TaskAssignmentRole.KIEM_TRA);
      const canApproveComplete =
        isHieuTruongOrAdmin ||
        isPHT ||
        userRoleInTask === TaskAssignmentRole.KIEM_TRA ||
        (!hasKiemTraRole && (isCreator || userRoleInTask === TaskAssignmentRole.CHU_TRI));

      if (!canApproveComplete) {
        throw new AppError('Chỉ người Kiểm tra hoặc Ban Giám hiệu mới có quyền xác nhận Hoàn thành.', 403);
      }
    }

    // 3. Kiểm tra quyền XÁC NHẬN / ĐÓNG CÔNG VIỆC
    if (targetStatus === TaskStatus.XAC_NHAN || targetStatus === TaskStatus.DONG) {
      const canClose =
        isHieuTruongOrAdmin ||
        isPHT ||
        isCreator ||
        userRoleInTask === TaskAssignmentRole.PHE_DUYET;

      if (!canClose) {
        throw new AppError('Chỉ Ban Giám hiệu hoặc người Phê duyệt mới có quyền Đóng/Xác nhận công việc.', 403);
      }
    }

    const completedAt =
      targetStatus === TaskStatus.HOAN_THANH || targetStatus === TaskStatus.XAC_NHAN || targetStatus === TaskStatus.DONG
        ? task.completedAt || new Date()
        : null;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: targetStatus,
        completedAt,
        ...(targetStatus === TaskStatus.HOAN_THANH && task.progressPercent < 100
          ? { progressPercent: 100 }
          : {}),
      },
    });

    await prisma.taskLog.create({
      data: {
        tenantId: task.tenantId,
        taskId,
        userId,
        action: `CHUYEN_TRANG_THAI_${targetStatus}`,
        oldStatus,
        newStatus: targetStatus,
        oldProgress: task.progressPercent,
        newProgress: updatedTask.progressPercent,
        note: note || `Chuyển trạng thái từ ${oldStatus} sang ${targetStatus}`,
      },
    });

    // Gửi thông báo chuyển trạng thái phù hợp từng ngữ cảnh
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    const actorName = actor?.fullName || 'Người xử lý';

    if (targetStatus === TaskStatus.CHO_KIEM_TRA) {
      const targets = new Set<string>();
      task.assignments
        .filter((a) => a.role === TaskAssignmentRole.KIEM_TRA || a.role === TaskAssignmentRole.PHE_DUYET)
        .forEach((a) => targets.add(a.userId));
      if (task.createdById) targets.add(task.createdById);
      targets.delete(userId);

      for (const tId of targets) {
        await QueueService.pushNotification({
          tenantId: task.tenantId,
          userId: tId,
          type: NotificationType.HE_THONG,
          title: `Yêu cầu kiểm tra kết quả: ${task.title}`,
          content: `${actorName} đã hoàn thành và gửi yêu cầu kiểm tra/nghiệm thu.`,
          link: `/tasks/${task.id}`,
        });
      }
    } else if (targetStatus === TaskStatus.BO_SUNG) {
      const targets = new Set<string>();
      task.assignments
        .filter((a) => a.role === TaskAssignmentRole.CHU_TRI || a.role === TaskAssignmentRole.PHOI_HOP)
        .forEach((a) => targets.add(a.userId));
      targets.delete(userId);

      for (const tId of targets) {
        await QueueService.pushNotification({
          tenantId: task.tenantId,
          userId: tId,
          type: NotificationType.CAN_BO_SUNG,
          title: `Yêu cầu bổ sung: ${task.title}`,
          content: `${actorName} yêu cầu bổ sung thông tin/minh chứng: ${note || 'Vui lòng kiểm tra lại kết quả.'}`,
          link: `/tasks/${task.id}`,
        });
      }
    } else if (targetStatus === TaskStatus.HOAN_THANH || targetStatus === TaskStatus.XAC_NHAN || targetStatus === TaskStatus.DONG) {
      const targets = new Set<string>();
      task.assignments.forEach((a) => targets.add(a.userId));
      if (task.createdById) targets.add(task.createdById);
      targets.delete(userId);

      for (const tId of targets) {
        await QueueService.pushNotification({
          tenantId: task.tenantId,
          userId: tId,
          type: NotificationType.DA_HOAN_THANH,
          title: `Công việc đã hoàn thành: ${task.title}`,
          content: `${actorName} đã xác nhận nghiệm thu hoàn thành 100% công việc.`,
          link: `/tasks/${task.id}`,
        });
      }
    } else if (targetStatus === TaskStatus.DA_TIEP_NHAN || targetStatus === TaskStatus.DANG_THUC_HIEN) {
      if (task.createdById && task.createdById !== userId) {
        await QueueService.pushNotification({
          tenantId: task.tenantId,
          userId: task.createdById,
          type: NotificationType.HE_THONG,
          title: `Tiếp nhận công việc: ${task.title}`,
          content: `${actorName} đã tiếp nhận và đang tiến hành thực hiện.`,
          link: `/tasks/${task.id}`,
        });
      }
    }

    if (task.planId) {
      await planService.recalculatePlanProgress(task.planId);
    }

    appCache.invalidateTags(['tasks', 'dashboard', 'plans']);
    return this.getByIdFull(taskId);
  }

  /**
   * Cập nhật phần trăm tiến độ (% progress) + Ghi TaskLog
   */
  async updateProgress(taskId: string, progressPercent: number, userId: string, note?: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: true },
    });
    if (!task) {
      throw new AppError('Không tìm thấy công việc.', 404);
    }

    const sanitizedProgress = Math.min(100, Math.max(0, Math.round(progressPercent)));
    const oldProgress = task.progressPercent;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { progressPercent: sanitizedProgress },
    });

    await prisma.taskLog.create({
      data: {
        tenantId: task.tenantId,
        taskId,
        userId,
        action: 'CAP_NHAT_TIEN_DO',
        oldStatus: task.status,
        newStatus: task.status,
        oldProgress,
        newProgress: sanitizedProgress,
        note: note || `Cập nhật tiến độ từ ${oldProgress}% lên ${sanitizedProgress}%`,
      },
    });

    // Gửi thông báo cập nhật tiến độ cho người giao việc / kiểm tra
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    const actorName = actor?.fullName || 'Người thực hiện';

    const notifyTargets = new Set<string>();
    if (task.createdById) notifyTargets.add(task.createdById);
    task.assignments
      .filter((a) => a.role === TaskAssignmentRole.KIEM_TRA || a.role === TaskAssignmentRole.PHE_DUYET)
      .forEach((a) => notifyTargets.add(a.userId));
    notifyTargets.delete(userId);

    for (const targetUserId of notifyTargets) {
      await QueueService.pushNotification({
        tenantId: task.tenantId,
        userId: targetUserId,
        type: NotificationType.HE_THONG,
        title: `Tiến độ [${sanitizedProgress}%]: ${task.title}`,
        content: `${actorName} đã cập nhật tiến độ lên ${sanitizedProgress}%. ${note ? 'Ghi chú: ' + note : ''}`,
        link: `/tasks/${taskId}`,
      });
    }

    if (task.planId) {
      await planService.recalculatePlanProgress(task.planId);
    }

    appCache.invalidateTags(['tasks', 'dashboard', 'plans']);
    return updatedTask;
  }

  /**
   * Cập nhật thông tin công việc chung
   */
  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      locationId?: string | null;
      orgUnitId?: string | null;
      assignedOrgUnitId?: string | null;
      isOrgAssignment?: boolean;
      priority?: TaskPriority;
      startDate?: Date | string | null;
      dueDate?: Date | string | null;
      requireAttachment?: boolean;
      periodId?: string | null;
      primaryAxisId?: string | null;
      taskSubtype?: string | null;
      weightScore?: number | null;
      evidenceFiles?: any;
      secondaryAxisIds?: string[];
    },
    tenantId?: string,
    userId?: string,
    userRoles?: Role[]
  ) {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const existing = await prisma.task.findFirst({
      where,
      include: { assignments: true },
    });
    if (!existing) {
      throw new AppError('Không tìm thấy công việc.', 404);
    }

    // Kiểm tra thẩm quyền điều chỉnh Hạn hoàn thành / Thông tin công việc
    if (userId && data.dueDate !== undefined) {
      const isCreator = existing.createdById === userId;
      const isBGH = userRoles?.some((r) => r === Role.ADMIN || r === Role.HIEU_TRUONG || r === Role.PHO_HIEU_TRUONG);
      if (!isCreator && !isBGH) {
        throw new AppError('Chỉ Người giao việc hoặc Ban Giám hiệu mới có quyền điều chỉnh hạn hoàn thành.', 403);
      }
    }

    if (data.primaryAxisId) {
      const targetUserId =
        existing.assignments?.find((a) => a.role === TaskAssignmentRole.CHU_TRI)?.userId ||
        existing.createdById;

      await TaskAxisValidationService.validateTaskPrimaryAxis({
        tenantId: existing.tenantId,
        employeeId: targetUserId,
        orgUnitId: data.orgUnitId || existing.orgUnitId || undefined,
        periodId: data.periodId || existing.periodId || undefined,
        primaryAxisId: data.primaryAxisId,
        taskSubtype: data.taskSubtype || existing.taskSubtype || undefined,
      });
    }

    if (data.secondaryAxisIds) {
      await prisma.kpiTaskAxisTag.deleteMany({ where: { taskId: id } });
      if (data.secondaryAxisIds.length > 0) {
        await prisma.kpiTaskAxisTag.createMany({
          data: data.secondaryAxisIds.map((axisId) => ({ taskId: id, axisId })),
        });
      }
    }

    const result = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
        ...(data.orgUnitId !== undefined && { orgUnitId: data.orgUnitId }),
        ...(data.assignedOrgUnitId !== undefined && { assignedOrgUnitId: data.assignedOrgUnitId }),
        ...(data.isOrgAssignment !== undefined && { isOrgAssignment: data.isOrgAssignment }),
        ...(data.priority && { priority: data.priority }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.requireAttachment !== undefined && { requireAttachment: data.requireAttachment }),
        ...(data.primaryAxisId !== undefined && {
          primaryAxisId: data.primaryAxisId || null,
          periodId: data.primaryAxisId ? (data.periodId !== undefined ? data.periodId : existing.periodId) : null,
          taskSubtype: data.primaryAxisId ? (data.taskSubtype !== undefined ? data.taskSubtype : existing.taskSubtype) : null,
          weightScore: data.primaryAxisId ? (data.weightScore !== undefined ? data.weightScore : existing.weightScore) : null,
        }),
        ...(data.evidenceFiles !== undefined && { evidenceFiles: data.evidenceFiles }),
      },
    });

    // Nếu điều chỉnh hạn hoàn thành, gửi thông báo cho các bên liên quan
    if (data.dueDate !== undefined && userId) {
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
      const actorName = actor?.fullName || 'Người quản trị';
      const newDueDateStr = data.dueDate ? new Date(data.dueDate).toLocaleDateString('vi-VN') : 'Không giới hạn';

      for (const a of existing.assignments) {
        if (a.userId !== userId) {
          await QueueService.pushNotification({
            tenantId: existing.tenantId,
            userId: a.userId,
            type: NotificationType.NHAC_VIEC,
            title: `Điều chỉnh hạn hoàn thành: ${existing.title}`,
            content: `${actorName} đã điều chỉnh hạn hoàn thành công việc đến ngày ${newDueDateStr}.`,
            link: `/tasks/${id}`,
          });
        }
      }
    }

    appCache.invalidateTags(['tasks', 'dashboard', 'plans']);
    return result;
  }

  /**
   * Thêm bình luận / trao đổi nội bộ trong công việc kèm @mention (TT 13–14, 102, 114)
   */
  async addComment(
    taskId: string,
    userId: string,
    content: string,
    mentions?: string[],
    attachments?: any
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { createdBy: true, assignments: true },
    });
    if (!task) {
      throw new AppError('Không tìm thấy công việc.', 404);
    }
    if (!content || !content.trim()) {
      throw new AppError('Nội dung trao đổi không được để trống.', 400);
    }

    const comment = await prisma.comment.create({
      data: {
        tenantId: task.tenantId,
        taskId,
        userId,
        content: content.trim(),
        mentions: mentions || [],
        attachments: attachments || null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            title: true,
            avatarUrl: true,
            phone: true,
          },
        },
      },
    });

    // Gửi thông báo đến tất cả thành viên liên quan và người được @mention
    const commenterName = comment.user?.fullName || 'Thành viên';
    const notifyUserIds = new Set<string>();

    if (task.createdById) notifyUserIds.add(task.createdById);
    (task.assignments || []).forEach((a) => notifyUserIds.add(a.userId));
    (mentions || []).forEach((m) => notifyUserIds.add(m));
    notifyUserIds.delete(userId); // Không gửi thông báo cho chính người bình luận

    for (const targetUserId of notifyUserIds) {
      const isMentioned = (mentions || []).includes(targetUserId);
      await QueueService.pushNotification({
        tenantId: task.tenantId,
        userId: targetUserId,
        type: NotificationType.HE_THONG,
        title: isMentioned
          ? `${commenterName} đã nhắc đến bạn trong [${task.title}]`
          : `${commenterName} đã bình luận trong [${task.title}]`,
        content: content.slice(0, 140),
        link: `/tasks/${taskId}`,
      });
    }

    appCache.invalidateTags(['tasks']);
    return comment;
  }

  /**
   * Lấy lịch sử nhật ký công việc (Task Logs timeline TT 20–21)
   */
  async getTaskLogs(taskId: string) {
    return prisma.taskLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            title: true,
            avatarUrl: true,
          },
        },
        attachments: true,
      },
    });
  }

  /**
   * Xóa công việc
   */
  async delete(id: string, tenantId?: string) {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const existing = await prisma.task.findFirst({ where });
    if (!existing) {
      throw new AppError('Không tìm thấy công việc.', 404);
    }

    const planId = existing.planId;
    await prisma.task.delete({ where: { id } });

    if (planId) {
      await planService.recalculatePlanProgress(planId);
    }

    appCache.invalidateTags(['tasks', 'dashboard', 'plans']);
    return { success: true };
  }
}

export const taskService = new TaskService();
