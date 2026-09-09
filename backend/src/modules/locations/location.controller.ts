import { Request, Response, NextFunction } from 'express';
import { locationService } from './location.service';
import { adminService } from '../admin/admin.service';

export class LocationController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId;
      const locations = await locationService.getAll(schoolId);
      res.status(200).json({ success: true, data: locations });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const location = await locationService.getById(id);
      res.status(200).json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const summary = await locationService.getSummary(id);
      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId;
      const actorUserId = req.user?.id;
      const result = await locationService.create({ ...req.body, schoolId });

      if (actorUserId) {
        await adminService.logAudit(
          actorUserId,
          'CREATE_LOCATION',
          'LOCATION',
          result.id,
          `Tạo điểm trường mới: ${result.name} (${result.code})`
        );
      }

      res.status(201).json({
        success: true,
        message: 'Tạo mới điểm trường thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user?.id;
      const result = await locationService.update(id, req.body);

      if (actorUserId) {
        await adminService.logAudit(
          actorUserId,
          'UPDATE_LOCATION',
          'LOCATION',
          id,
          `Cập nhật điểm trường: ${result.name} (${result.code})`
        );
      }

      res.status(200).json({
        success: true,
        message: 'Cập nhật điểm trường thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user?.id;
      await locationService.delete(id);

      if (actorUserId) {
        await adminService.logAudit(
          actorUserId,
          'DELETE_LOCATION',
          'LOCATION',
          id,
          `Xoá điểm trường ID: ${id}`
        );
      }

      res.status(200).json({
        success: true,
        message: 'Xóa điểm trường thành công.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const locationController = new LocationController();
