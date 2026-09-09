import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service';
import { TaskStatus, TaskPriority, TaskAssignmentRole } from '@prisma/client';

export class TaskController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        status,
        assigneeId,
        role,
        locationId,
        orgUnitId,
        planId,
        overdue,
        search,
        page,
        pageSize,
      } = req.query;

      const schoolId = req.user?.schoolId;

      const result = await taskService.getAll({
        schoolId,
        status: status as TaskStatus,
        assigneeId: assigneeId as string,
        role: role as TaskAssignmentRole,
        locationId: locationId as string,
        orgUnitId: orgUnitId as string,
        planId: planId as string,
        overdue: overdue as any,
        search: search as string,
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
      const task = await taskService.getByIdFull(id);
      res.status(200).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.body.schoolId || req.user!.schoolId;
      const createdById = req.user!.id;

      const task = await taskService.create({
        ...req.body,
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
      const task = await taskService.update(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Cập nhật công việc thành công.',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await taskService.delete(id);

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
