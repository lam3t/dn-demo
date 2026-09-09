import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { TaskStatus, TaskPriority, TaskAssignmentRole, Role } from '@prisma/client';
import { planService } from '../plans/plan.service';

export interface TaskQueryParams {
  status?: TaskStatus;
  assigneeId?: string;
  role?: TaskAssignmentRole;
  locationId?: string;
  orgUnitId?: string;
  planId?: string;
  overdue?: boolean | string;
  search?: string;
  page?: number;
  pageSize?: number;
  schoolId?: string;
}

export interface CreateTaskDto {
  schoolId: string;
  title: string;
  code?: string;
  description?: string;
  planId?: string | null;
  locationId?: string | null;
  orgUnitId?: string | null;
  priority?: TaskPriority;
  startDate?: Date | string | null;
  dueDate?: Date | string | null;
  requireAttachment?: boolean;
  createdById: string;
  assignments?: Array<{
    userId: string;
    role: TaskAssignmentRole;
    note?: string;
  }>;
}

export class TaskService {
  /**
   * Lấy danh sách công việc theo bộ lọc đa năng (Việc của tôi, trạng thái, quá hạn...)
   */
  async getAll(params: TaskQueryParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));

    const where: any = {};

    if (params.schoolId) {
      where.schoolId = params.schoolId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.locationId) {
      where.locationId = params.locationId;
    }

    if (params.orgUnitId) {
      where.orgUnitId = params.orgUnitId;
    }

    if (params.planId) {
      where.planId = params.planId;
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Lọc theo người được phân công (assigneeId & role)
    if (params.assigneeId) {
      where.assignments = {
        some: {
          userId: params.assigneeId,
          ...(params.role && { role: params.role }),
        },
      };
    }

    // Lọc công việc Quá hạn: dueDate < now và status chưa hoàn thành/đóng
    if (params.overdue === true || params.overdue === 'true') {
      const now = new Date();
      where.dueDate = { lt: now };
      where.status = {
        notIn: [TaskStatus.HOAN_THANH, TaskStatus.XAC_NHAN, TaskStatus.DONG, TaskStatus.HUY],
      };
    }

    const [total, items] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          plan: { select: { id: true, title: true, level: true } },
          location: { select: { id: true, name: true, code: true, phone: true } },
          orgUnit: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, fullName: true, title: true, avatarUrl: true, phone: true } },
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  title: true,
                  phone: true,
                  avatarUrl: true,
                  primaryLocation: { select: { id: true, name: true } },
                  primaryOrgUnit: { select: { id: true, name: true } },
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

    // Thêm cờ isOverdue tính toán theo thời gian thực
    const now = new Date();
    const completedStatuses: TaskStatus[] = [
      TaskStatus.HOAN_THANH,
      TaskStatus.XAC_NHAN,
      TaskStatus.DONG,
      TaskStatus.HUY,
    ];
    const enrichedItems = items.map((task) => {
      const isOverdue =
        Boolean(task.dueDate && new Date(task.dueDate) < now) &&
        !completedStatuses.includes(task.status);

      return {
        ...task,
        isOverdue,
      };
    });

    return {
      items: enrichedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Lấy chi tiết đầy đủ 1 Task: assignments, logs, attachments, comments
   */
  async getByIdFull(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        plan: true,
        location: true,
        orgUnit: true,
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

    return {
      ...task,
      isOverdue,
    };
  }

  /**
   * Tạo công việc mới (có thể gắn planId hoặc để trống = việc đột xuất)
   */
  async create(data: CreateTaskDto) {
    if (!data.title) {
      throw new AppError('Tiêu đề công việc không được để trống.', 400);
    }

    // Tự sinh mã công việc nếu chưa có
    const code = data.code || `CV-${Date.now().toString().slice(-6)}`;

    // Validate RACI nếu có truyền assignments
    if (data.assignments && data.assignments.length > 0) {
      const chuTriCount = data.assignments.filter((a) => a.role === TaskAssignmentRole.CHU_TRI).length;
      if (chuTriCount !== 1) {
        throw new AppError('Bắt buộc phải có đúng 1 người chịu trách nhiệm CHỦ TRÌ công việc.', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        schoolId: data.schoolId,
        code,
        title: data.title,
        description: data.description,
        planId: data.planId || null,
        locationId: data.locationId || null,
        orgUnitId: data.orgUnitId || null,
        priority: data.priority || TaskPriority.TRUNG_BINH,
        status: data.assignments && data.assignments.length > 0 ? TaskStatus.DA_GIAO : TaskStatus.NHAP,
        progressPercent: 0,
        requireAttachment: data.requireAttachment ?? false,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: data.createdById,
        assignments: {
          create: (data.assignments || []).map((a) => ({
            userId: a.userId,
            role: a.role,
            note: a.note || null,
          })),
        },
        logs: {
          create: {
            userId: data.createdById,
            action: 'TAO_MOI',
            newStatus: data.assignments && data.assignments.length > 0 ? TaskStatus.DA_GIAO : TaskStatus.NHAP,
            newProgress: 0,
            note: data.planId ? 'Tạo mới công việc theo kế hoạch' : 'Tạo mới công việc phát sinh/đột xuất',
          },
        },
      },
      include: {
        assignments: { include: { user: true } },
      },
    });

    if (task.planId) {
      await planService.recalculatePlanProgress(task.planId);
    }

    return task;
  }

  /**
   * Gán người theo mô hình RACI: CHU_TRI bắt buộc đúng 1 người
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

    // Xóa phân công cũ và tạo phân công mới trong transaction
    await prisma.$transaction([
      prisma.taskAssignment.deleteMany({ where: { taskId } }),
      prisma.taskAssignment.createMany({
        data: assignments.map((a) => ({
          taskId,
          userId: a.userId,
          role: a.role,
          note: a.note || null,
        })),
      }),
      // Nếu task đang ở trạng thái NHAP, chuyển sang DA_GIAO
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
          taskId,
          userId: currentUserId,
          action: 'CAP_NHAT_PHAN_CONG_RACI',
          note: `Cập nhật phân công RACI (${assignments.length} người)`,
        },
      }),
    ]);

    return this.getByIdFull(taskId);
  }

  /**
   * Chuyển trạng thái theo Workflow quy chuẩn và kiểm tra quyền hạn chặt chẽ
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
        isHieuTruongOrAdmin || isCreator || userRoleInTask === TaskAssignmentRole.CHU_TRI;

      if (!canSubmitForReview) {
        throw new AppError('Chỉ người Chủ trì công việc mới có quyền gửi yêu cầu kiểm tra.', 403);
      }

      // RÀNG BUỘC MINH CHỨNG: Nếu yêu cầu minh chứng mà chưa đính kèm tệp nào -> Chặn
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

    // Cập nhật trạng thái và ngày hoàn thành
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

    // Ghi nhật ký TaskLog
    await prisma.taskLog.create({
      data: {
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

    // Cập nhật lại tiến độ Kế hoạch cha nếu có
    if (task.planId) {
      await planService.recalculatePlanProgress(task.planId);
    }

    return this.getByIdFull(taskId);
  }

  /**
   * Cập nhật phần trăm tiến độ (% progress) + Ghi TaskLog
   */
  async updateProgress(taskId: string, progressPercent: number, userId: string, note?: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
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

    if (task.planId) {
      await planService.recalculatePlanProgress(task.planId);
    }

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
      priority?: TaskPriority;
      startDate?: Date | string | null;
      dueDate?: Date | string | null;
      requireAttachment?: boolean;
    }
  ) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy công việc.', 404);
    }

    return prisma.task.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
        ...(data.orgUnitId !== undefined && { orgUnitId: data.orgUnitId }),
        ...(data.priority && { priority: data.priority }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.requireAttachment !== undefined && { requireAttachment: data.requireAttachment }),
      },
    });
  }

  /**
   * Xóa công việc
   */
  async delete(id: string) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy công việc.', 404);
    }

    const planId = existing.planId;
    await prisma.task.delete({ where: { id } });

    if (planId) {
      await planService.recalculatePlanProgress(planId);
    }

    return { success: true };
  }
}

export const taskService = new TaskService();
