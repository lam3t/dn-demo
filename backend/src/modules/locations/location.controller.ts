import { Request, Response, NextFunction } from 'express';
import { locationService } from './location.service';
import { adminService } from '../admin/admin.service';
import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';

export class LocationController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId;
      const tenantId = req.user?.tenantId;
      const locations = await locationService.getAll(schoolId, tenantId);
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
      const tenantId = req.body.tenantId || req.user?.tenantId;
      const actorUserId = req.user?.id;
      const result = await locationService.create({ ...req.body, schoolId, tenantId });

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
      const userRoles = (req.user?.roles || []).map((r: any) => (typeof r === 'string' ? r : r.role));
      const isSysAdmin = Boolean(req.user?.isSystemAdmin || userRoles.includes('SYSTEM_ADMIN'));
      const isBGH =
        userRoles.includes('ADMIN') ||
        userRoles.includes('HIEU_TRUONG') ||
        userRoles.includes('PHO_HIEU_TRUONG');

      const existing = await prisma.location.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError('Không tìm thấy thông tin điểm trường.', 404);
      }

      const isManager = existing.managerId === actorUserId;
      const hasScopedRole = req.user?.roles?.some((r: any) => (typeof r === 'object' && r.scopeLocationId === id));
      const isPrimaryUser = req.user?.primaryLocationId === id;
      const hasPerm =
        req.user?.permissions?.includes('MANAGE_LOCATIONS') ||
        req.user?.permissions?.includes('UPDATE_LOCATION');

      if (!isSysAdmin && !isBGH && !isManager && !hasScopedRole && !isPrimaryUser && !hasPerm) {
        throw new AppError('Bạn không có quyền cập nhật thông tin điểm trường này.', 403);
      }

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
