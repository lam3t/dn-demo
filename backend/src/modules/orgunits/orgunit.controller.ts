import { Request, Response, NextFunction } from 'express';
import { orgUnitService } from './orgunit.service';

export class OrgUnitController {
  async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId;
      const tree = await orgUnitService.getTree(schoolId);
      res.status(200).json({ success: true, data: tree });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId;
      const list = await orgUnitService.getAll(schoolId);
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const org = await orgUnitService.getById(id);
      res.status(200).json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId;
      const result = await orgUnitService.create({ ...req.body, schoolId });
      res.status(201).json({
        success: true,
        message: 'Tạo mới tổ/phòng ban thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await orgUnitService.update(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật tổ/phòng ban thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await orgUnitService.delete(id);
      res.status(200).json({
        success: true,
        message: 'Xóa tổ/phòng ban thành công.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orgUnitController = new OrgUnitController();
