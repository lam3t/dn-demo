import { Request, Response, NextFunction } from 'express';
import { schoolService } from './school.service';
import { AppError } from '../../middlewares/error.middleware';

export class SchoolController {
  async getSchoolInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId;
      const info = await schoolService.getSchoolInfo(schoolId);
      res.status(200).json({ success: true, data: info });
    } catch (error) {
      next(error);
    }
  }

  async updateSchoolInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId || req.body.schoolId;
      if (!schoolId) {
        throw new AppError('Thiếu ID trường học.', 400);
      }

      const updated = await schoolService.updateSchoolInfo(schoolId, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin trường thành công.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const schoolController = new SchoolController();
