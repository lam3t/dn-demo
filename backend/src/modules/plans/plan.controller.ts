import { Request, Response, NextFunction } from 'express';
import { planService } from './plan.service';
import { PlanLevel } from '@prisma/client';

export class PlanController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { level, parentPlanId, search } = req.query;
      const schoolId = req.user?.schoolId;

      const plans = await planService.getAll({
        schoolId,
        level: level as PlanLevel,
        parentPlanId: parentPlanId as string,
        search: search as string,
      });

      res.status(200).json({ success: true, data: plans });
    } catch (error) {
      next(error);
    }
  }

  async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      const rootPlanId = (req.params.id && req.params.id !== 'tree' ? req.params.id : (req.query.rootPlanId as string)) || undefined;
      const schoolId = req.user?.schoolId;
      const tree = await planService.getTree(rootPlanId, schoolId);

      res.status(200).json({ success: true, data: tree });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const plan = await planService.getById(id);
      res.status(200).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.body.schoolId || req.user!.schoolId;
      const createdById = req.user!.id;

      const plan = await planService.create({
        ...req.body,
        schoolId,
        createdById,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo kế hoạch mới thành công.',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const plan = await planService.update(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Cập nhật kế hoạch thành công.',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await planService.delete(id);

      res.status(200).json({
        success: true,
        message: 'Xóa kế hoạch thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  async generateTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const createdById = req.user!.id;
      const { tasks } = req.body;

      const createdTasks = await planService.generateTasks(id, createdById, tasks);

      res.status(201).json({
        success: true,
        message: `Đã tạo nhanh thành công ${createdTasks.length} công việc từ kế hoạch.`,
        data: createdTasks,
      });
    } catch (error) {
      next(error);
    }
  }

  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const createdById = req.user!.id;

      const duplicatedPlan = await planService.duplicate(id, createdById, req.body);

      res.status(201).json({
        success: true,
        message: 'Sao chép kế hoạch thành công.',
        data: duplicatedPlan,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const planController = new PlanController();
