import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { Role } from '@prisma/client';

export class UserController {
  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, orgUnitId, locationId, role, page, pageSize } = req.query;
      const schoolId = req.user?.schoolId;

      const result = await userService.searchUsers({
        search: search as string,
        orgUnitId: orgUnitId as string,
        locationId: locationId as string,
        role: role as Role,
        schoolId,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecentCollaborators(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id || req.user!.id;
      const limit = req.query.limit ? Number(req.query.limit) : 8;

      const collaborators = await userService.getRecentCollaborators(targetUserId, limit);
      res.status(200).json({
        success: true,
        data: collaborators,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.getById(id);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId;
      const user = await userService.create({ ...req.body, schoolId });
      res.status(201).json({
        success: true,
        message: 'Thêm mới nhân sự thành công.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.update(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin nhân sự thành công.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await userService.delete(id);
      res.status(200).json({
        success: true,
        message: 'Xóa / Vô hiệu hóa nhân sự thành công.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
