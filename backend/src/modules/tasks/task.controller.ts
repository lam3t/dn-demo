import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service';
import { TaskStatus, TaskPriority, TaskAssignmentRole, TaskEvaluationRating } from '@prisma/client';

export class TaskController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        status,
        assigneeId,
        role,
        locationId,
        orgUnitId,
        assignedOrgUnitId,
        planId,
        overdue,
        isOverdue,
        myTasks,
        isProposal,
        proposalStatus,
        search,
        page,
        pageSize,
        schoolYear,
        periodId,
        primaryAxisId,
        kpiOnly,
        nonKpiOnly,
      } = req.query;

      const headerYear = req.headers['x-academic-year'] as string | undefined;
      const activeSchoolYear = (schoolYear as string) || headerYear;

      const tenantId = req.user?.tenantId;
      const schoolId = req.user?.schoolId;
      const currentUserId = req.user?.id;

      const result = await taskService.getAll({
        tenantId,
        schoolId,
        status: status as TaskStatus,
        assigneeId: assigneeId as string,
        role: role as TaskAssignmentRole,
        locationId: locationId as string,
        orgUnitId: orgUnitId as string,
        assignedOrgUnitId: assignedOrgUnitId as string,
        planId: planId as string,
        overdue: overdue as any,
        isOverdue: isOverdue as any,
        myTasks: myTasks as any,
        isProposal: isProposal as any,
        proposalStatus: proposalStatus as string,
        currentUserId,
        search: search as string,
        schoolYear: activeSchoolYear,
        periodId: periodId as string,
        primaryAxisId: primaryAxisId as string,
        kpiOnly: kpiOnly as any,
        nonKpiOnly: nonKpiOnly as any,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getByIdFull(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId;
      const task = await taskService.getByIdFull(id, tenantId);
      res.status(200).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.body.schoolId || req.user!.schoolId;
      const tenantId = req.user?.tenantId;
      const createdById = req.user!.id;

      const task = await taskService.create({
        ...req.body,
        tenantId,
        schoolId,
        createdById,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo mới công việc thành công.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async evaluate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user!.id;
      const userRoles = req.user!.roles.map((r) => r.role);

      const task = await taskService.evaluateTask(id, userId, userRoles, {
        rating: rating as TaskEvaluationRating,
        comment,
      });

      res.status(200).json({
        success: true,
        message: 'Đánh giá kết quả công việc thành công.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async propose(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.body.schoolId || req.user!.schoolId;
      const tenantId = req.user?.tenantId;
      const createdById = req.user!.id;

      const task = await taskService.proposeTask({
        ...req.body,
        tenantId,
        schoolId,
        createdById,
      });

      res.status(201).json({
        success: true,
        message: 'Gửi đề xuất công việc thành công.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const currentUserId = req.user!.id;

      const task = await taskService.approveProposal(id, currentUserId, note);

      res.status(200).json({
        success: true,
        message: 'Phê duyệt đề xuất công việc thành công.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const currentUserId = req.user!.id;

      const task = await taskService.rejectProposal(id, currentUserId, reason);

      res.status(200).json({
        success: true,
        message: 'Từ chối đề xuất công việc thành công.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { assignments } = req.body;
      const currentUserId = req.user!.id;

      const task = await taskService.updateAssignments(id, currentUserId, assignments);

      res.status(200).json({
        success: true,
        message: 'Cập nhật phân công RACI thành công.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const userId = req.user!.id;
      const userRoles = req.user!.roles.map((r) => r.role);

      const task = await taskService.updateStatus(id, status, userId, userRoles, note);

      res.status(200).json({
        success: true,
        message: `Chuyển trạng thái công việc sang "${status}" thành công.`,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { progressPercent, note } = req.body;
      const userId = req.user!.id;

      const task = await taskService.updateProgress(id, Number(progressPercent), userId, note);

      res.status(200).json({
        success: true,
        message: 'Cập nhật tiến độ công việc thành công.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId;
      const userId = req.user!.id;
      const userRoles = req.user!.roles.map((r) => r.role);
      const task = await taskService.update(id, req.body, tenantId, userId, userRoles);

      res.status(200).json({
        success: true,
        message: 'Cập nhật công việc thành công.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content, mentions, attachments } = req.body;
      const userId = req.user!.id;

      const comment = await taskService.addComment(id, userId, content, mentions, attachments);

      res.status(201).json({
        success: true,
        message: 'Thêm trao đổi thành công.',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const logs = await taskService.getTaskLogs(id);

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId;
      await taskService.delete(id, tenantId);

      res.status(200).json({
        success: true,
        message: 'Xóa công việc thành công.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
