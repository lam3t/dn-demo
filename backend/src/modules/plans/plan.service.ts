import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { PlanLevel, TaskPriority, TaskStatus, TaskAssignmentRole } from '@prisma/client';

const PLAN_LEVEL_ORDER: Record<PlanLevel, number> = {
  NAM: 0,
  HOC_KY: 1,
  QUY: 2,
  THANG: 3,
  TUAN: 4,
};

export interface PlanTreeNode {
  id: string;
  title: string;
  description: string | null;
  level: PlanLevel;
  startDate: Date;
  endDate: Date;
  progressPercent: number;
  parentPlanId: string | null;
  taskCount: number;
  completedTaskCount: number;
  tasks: any[];
  children: PlanTreeNode[];
}

export class PlanService {
  /**
   * Validate tính hợp lệ của cấp kế hoạch theo thứ bậc
   */
  private async validatePlanHierarchy(level: PlanLevel, parentPlanId?: string | null) {
    if (!parentPlanId) {
      if (level !== PlanLevel.NAM && level !== PlanLevel.HOC_KY) {
        // Cho phép Kế hoạch Năm hoặc Học kỳ đứng độc lập ở cấp cao nhất
      }
      return;
    }

    const parent = await prisma.plan.findUnique({ where: { id: parentPlanId } });
    if (!parent) {
      throw new AppError('Kế hoạch cấp trên (cha) không tồn tại.', 400);
    }

    const parentOrder = PLAN_LEVEL_ORDER[parent.level];
    const childOrder = PLAN_LEVEL_ORDER[level];

    if (childOrder < parentOrder || (childOrder === parentOrder && level !== PlanLevel.THANG && level !== PlanLevel.TUAN)) {
      throw new AppError(
        `Cấp kế hoạch không hợp lệ! Kế hoạch "${level}" không thể là con của Kế hoạch "${parent.level}".`,
        400
      );
    }
  }

  /**
   * Tính toán lại tiến độ phần trăm của Kế hoạch (và lan truyền lên các kế hoạch cha)
   */
  async recalculatePlanProgress(planId: string) {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        childrenPlans: { select: { progressPercent: true } },
        tasks: {
          where: { status: { notIn: [TaskStatus.HUY] } },
          select: { progressPercent: true },
        },
      },
    });

    if (!plan) return;

    const childPlanProgresses = plan.childrenPlans.map((p) => p.progressPercent);
    const taskProgresses = plan.tasks.map((t) => t.progressPercent);

    const allProgresses = [...childPlanProgresses, ...taskProgresses];

    let newProgress = 0;
    if (allProgresses.length > 0) {
      const sum = allProgresses.reduce((acc, curr) => acc + curr, 0);
      newProgress = Math.round((sum / allProgresses.length) * 10) / 10; // làm tròn 1 chữ số thập phân
    }

    await prisma.plan.update({
      where: { id: planId },
      data: { progressPercent: newProgress },
    });

    // Lan truyền đệ quy lên kế hoạch cha nếu có
    if (plan.parentPlanId) {
      await this.recalculatePlanProgress(plan.parentPlanId);
    }
  }

  /**
   * Lấy danh sách kế hoạch
   */
  async getAll(params: {
    schoolId?: string;
    level?: PlanLevel;
    parentPlanId?: string | null;
    search?: string;
  }) {
    const where: any = {};
    if (params.schoolId) where.schoolId = params.schoolId;
    if (params.level) where.level = params.level;
    if (params.parentPlanId !== undefined) where.parentPlanId = params.parentPlanId;
    if (params.search) {
      where.title = { contains: params.search, mode: 'insensitive' };
    }

    return prisma.plan.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        parentPlan: { select: { id: true, title: true, level: true } },
        createdBy: { select: { id: true, fullName: true, title: true, avatarUrl: true } },
        _count: {
          select: {
            childrenPlans: true,
            tasks: true,
          },
        },
      },
    });
  }

  /**
   * Lấy cây kế hoạch đầy đủ lồng nhau kèm danh sách Task con ở mỗi cấp
   */
  async getTree(rootPlanId?: string, schoolId?: string): Promise<PlanTreeNode[]> {
    let whereCondition: any = {};
    if (schoolId) whereCondition.schoolId = schoolId;

    if (rootPlanId) {
      // Kiểm tra plan tồn tại
      const rootExists = await prisma.plan.findUnique({ where: { id: rootPlanId } });
      if (!rootExists) {
        throw new AppError('Không tìm thấy kế hoạch.', 404);
      }
    }

    const allPlans = await prisma.plan.findMany({
      where: whereCondition,
      orderBy: [{ startDate: 'asc' }],
      include: {
        tasks: {
          where: { status: { notIn: [TaskStatus.HUY] } },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
          include: {
            location: { select: { id: true, name: true, code: true } },
            orgUnit: { select: { id: true, name: true, code: true } },
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    title: true,
                    phone: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const nodesMap = new Map<string, PlanTreeNode>();

    allPlans.forEach((p) => {
      const completedTasks = p.tasks.filter(
        (t) => t.status === TaskStatus.HOAN_THANH || t.status === TaskStatus.XAC_NHAN || t.status === TaskStatus.DONG
      ).length;

      nodesMap.set(p.id, {
        id: p.id,
        title: p.title,
        description: p.description,
        level: p.level,
        startDate: p.startDate,
        endDate: p.endDate,
        progressPercent: p.progressPercent,
        parentPlanId: p.parentPlanId,
        taskCount: p.tasks.length,
        completedTaskCount: completedTasks,
        tasks: p.tasks,
        children: [],
      });
    });

    const tree: PlanTreeNode[] = [];

    nodesMap.forEach((node) => {
      if (node.parentPlanId && nodesMap.has(node.parentPlanId)) {
        nodesMap.get(node.parentPlanId)!.children.push(node);
      } else {
        if (!rootPlanId || node.id === rootPlanId) {
          tree.push(node);
        }
      }
    });

    if (rootPlanId && nodesMap.has(rootPlanId)) {
      return [nodesMap.get(rootPlanId)!];
    }

    return tree;
  }

  /**
   * Lấy chi tiết một kế hoạch
   */
  async getById(id: string) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        parentPlan: true,
        childrenPlans: {
          include: {
            _count: { select: { tasks: true, childrenPlans: true } },
          },
        },
        createdBy: {
          select: { id: true, fullName: true, title: true, phone: true, avatarUrl: true },
        },
        tasks: {
          include: {
            location: true,
            orgUnit: true,
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    title: true,
                    phone: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new AppError('Không tìm thấy thông tin kế hoạch.', 404);
    }

    return plan;
  }

  /**
   * Tạo kế hoạch mới
   */
  async create(data: {
    schoolId: string;
    title: string;
    description?: string;
    level: PlanLevel;
    parentPlanId?: string | null;
    startDate: Date | string;
    endDate: Date | string;
    createdById: string;
  }) {
    await this.validatePlanHierarchy(data.level, data.parentPlanId);

    const plan = await prisma.plan.create({
      data: {
        schoolId: data.schoolId,
        title: data.title,
        description: data.description,
        level: data.level,
        parentPlanId: data.parentPlanId || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        createdById: data.createdById,
        progressPercent: 0,
      },
      include: {
        parentPlan: true,
        createdBy: { select: { id: true, fullName: true, title: true } },
      },
    });

    if (plan.parentPlanId) {
      await this.recalculatePlanProgress(plan.parentPlanId);
    }

    return plan;
  }

  /**
   * Cập nhật kế hoạch
   */
  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      level?: PlanLevel;
      parentPlanId?: string | null;
      startDate?: Date | string;
      endDate?: Date | string;
      progressPercent?: number;
    }
  ) {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy kế hoạch.', 404);
    }

    if (data.level || data.parentPlanId !== undefined) {
      const targetLevel = data.level || existing.level;
      const targetParent = data.parentPlanId !== undefined ? data.parentPlanId : existing.parentPlanId;
      if (targetParent === id) {
        throw new AppError('Kế hoạch không thể làm cha của chính nó.', 400);
      }
      await this.validatePlanHierarchy(targetLevel, targetParent);
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.level && { level: data.level }),
        ...(data.parentPlanId !== undefined && { parentPlanId: data.parentPlanId }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.progressPercent !== undefined && { progressPercent: data.progressPercent }),
      },
    });

    if (updated.parentPlanId) {
      await this.recalculatePlanProgress(updated.parentPlanId);
    }

    return updated;
  }

  /**
   * Xóa kế hoạch
   */
  async delete(id: string) {
    const existing = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { childrenPlans: true, tasks: true } },
      },
    });

    if (!existing) {
      throw new AppError('Không tìm thấy kế hoạch.', 404);
    }

    if (existing._count.childrenPlans > 0 || existing._count.tasks > 0) {
      throw new AppError(
        'Không thể xóa kế hoạch đang có kế hoạch con hoặc công việc trực thuộc.',
        400
      );
    }

    const parentId = existing.parentPlanId;
    await prisma.plan.delete({ where: { id } });

    if (parentId) {
      await this.recalculatePlanProgress(parentId);
    }

    return { success: true };
  }

  /**
   * Tạo nhanh 1..n Task con từ 1 dòng kế hoạch
   * Task tự động kế thừa timeRange & mô tả từ Plan nếu không ghi đè
   */
  async generateTasks(
    planId: string,
    createdById: string,
    tasksData: Array<{
      title: string;
      code?: string;
      description?: string;
      locationId?: string;
      orgUnitId?: string;
      priority?: TaskPriority;
      startDate?: Date | string;
      dueDate?: Date | string;
      chuTriId: string;
      phoiHopIds?: string[];
      kiemTraId?: string;
      pheDuyetId?: string;
      theoDoiIds?: string[];
    }>
  ) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new AppError('Không tìm thấy kế hoạch.', 404);
    }

    if (!tasksData || tasksData.length === 0) {
      throw new AppError('Danh sách công việc tạo mới không được để trống.', 400);
    }

    const createdTasks = [];

    for (let i = 0; i < tasksData.length; i++) {
      const item = tasksData[i];
      if (!item.title || !item.chuTriId) {
        throw new AppError(`Dòng thứ ${i + 1}: Vui lòng nhập tiêu đề và chọn người Chủ trì.`, 400);
      }

      // Tạo code mặc định nếu chưa có
      const taskCode = item.code || `CV-${Date.now().toString().slice(-4)}${i + 1}`;

      const task = await prisma.task.create({
        data: {
          schoolId: plan.schoolId,
          planId: plan.id,
          code: taskCode,
          title: item.title,
          description: item.description || plan.description || plan.title,
          locationId: item.locationId || null,
          orgUnitId: item.orgUnitId || null,
          priority: item.priority || TaskPriority.TRUNG_BINH,
          status: TaskStatus.DA_GIAO,
          progressPercent: 0,
          startDate: item.startDate ? new Date(item.startDate) : plan.startDate,
          dueDate: item.dueDate ? new Date(item.dueDate) : plan.endDate,
          createdById,
          assignments: {
            create: [
              { userId: item.chuTriId, role: TaskAssignmentRole.CHU_TRI, note: 'Chịu trách nhiệm chính' },
              ...(item.phoiHopIds || []).map((uid) => ({
                userId: uid,
                role: TaskAssignmentRole.PHOI_HOP,
                note: 'Đầu mối phối hợp',
              })),
              ...(item.kiemTraId ? [{ userId: item.kiemTraId, role: TaskAssignmentRole.KIEM_TRA, note: 'Kiểm tra chất lượng' }] : []),
              ...(item.pheDuyetId ? [{ userId: item.pheDuyetId, role: TaskAssignmentRole.PHE_DUYET, note: 'Ban Giám hiệu phê duyệt' }] : []),
              ...(item.theoDoiIds || []).map((uid) => ({
                userId: uid,
                role: TaskAssignmentRole.THEO_DOI,
                note: 'Theo dõi tiến độ',
              })),
            ],
          },
          logs: {
            create: {
              userId: createdById,
              action: 'TAO_MOI_TU_KE_HOACH',
              newStatus: TaskStatus.DA_GIAO,
              newProgress: 0,
              note: `Tạo nhanh từ kế hoạch: "${plan.title}"`,
            },
          },
        },
        include: {
          assignments: { include: { user: true } },
        },
      });

      createdTasks.push(task);
    }

    // Cập nhật lại tiến độ kế hoạch
    await this.recalculatePlanProgress(planId);

    return createdTasks;
  }

  /**
   * Sao chép một kế hoạch (Dùng cho tính năng "Sao chép kỳ trước")
   */
  async duplicate(
    planId: string,
    createdById: string,
    options: {
      newTitle?: string;
      newStartDate?: Date | string;
      newEndDate?: Date | string;
      includeTasks?: boolean;
    }
  ) {
    const sourcePlan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        childrenPlans: {
          include: {
            tasks: {
              include: { assignments: true },
            },
          },
        },
        tasks: {
          include: { assignments: true },
        },
      },
    });

    if (!sourcePlan) {
      throw new AppError('Không tìm thấy kế hoạch nguồn để sao chép.', 404);
    }

    const startDate = options.newStartDate ? new Date(options.newStartDate) : sourcePlan.startDate;
    const endDate = options.newEndDate ? new Date(options.newEndDate) : sourcePlan.endDate;
    const title = options.newTitle || `${sourcePlan.title} (Bản sao)`;

    // 1. Tạo Plan gốc mới
    const newRootPlan = await prisma.plan.create({
      data: {
        schoolId: sourcePlan.schoolId,
        title,
        description: sourcePlan.description,
        level: sourcePlan.level,
        startDate,
        endDate,
        progressPercent: 0,
        createdById,
      },
    });

    // 2. Sao chép các Task trực thuộc nếu có yêu cầu
    if (options.includeTasks && sourcePlan.tasks.length > 0) {
      for (const t of sourcePlan.tasks) {
        await prisma.task.create({
          data: {
            schoolId: t.schoolId,
            planId: newRootPlan.id,
            code: `${t.code || 'CV'}-CP`,
            title: t.title,
            description: t.description,
            locationId: t.locationId,
            orgUnitId: t.orgUnitId,
            priority: t.priority,
            status: TaskStatus.NHAP,
            progressPercent: 0,
            startDate,
            dueDate: endDate,
            createdById,
            assignments: {
              create: t.assignments.map((a) => ({
                userId: a.userId,
                role: a.role,
                note: a.note,
              })),
            },
          },
        });
      }
    }

    // 3. Sao chép các Plan con
    for (const child of sourcePlan.childrenPlans) {
      const newChildPlan = await prisma.plan.create({
        data: {
          schoolId: child.schoolId,
          title: child.title,
          description: child.description,
          level: child.level,
          parentPlanId: newRootPlan.id,
          startDate,
          endDate,
          progressPercent: 0,
          createdById,
        },
      });

      if (options.includeTasks && child.tasks.length > 0) {
        for (const t of child.tasks) {
          await prisma.task.create({
            data: {
              schoolId: t.schoolId,
              planId: newChildPlan.id,
              code: `${t.code || 'CV'}-CP`,
              title: t.title,
              description: t.description,
              locationId: t.locationId,
              orgUnitId: t.orgUnitId,
              priority: t.priority,
              status: TaskStatus.NHAP,
              progressPercent: 0,
              startDate,
              dueDate: endDate,
              createdById,
              assignments: {
                create: t.assignments.map((a) => ({
                  userId: a.userId,
                  role: a.role,
                  note: a.note,
                })),
              },
            },
          });
        }
      }
    }

    return this.getById(newRootPlan.id);
  }
}

export const planService = new PlanService();
