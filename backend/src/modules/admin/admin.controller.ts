import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { AppError } from '../../middlewares/error.middleware';

export class AdminController {
  /**
   * GET /api/admin/users
   */
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = req.user?.schoolId;
      const { search, locationId, orgUnitId, role, status, page, pageSize } = req.query;

      const result = await adminService.getUsers(
        {
          search: search as string,
          locationId: locationId as string,
          orgUnitId: orgUnitId as string,
          role: role as any,
          status: status as string,
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
        },
        schoolId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const schoolId = req.body.schoolId || req.user?.schoolId;

      if (!schoolId) {
        throw new AppError('Không tìm thấy trường học tương ứng.', 400);
      }

      const result = await adminService.createUser(actorUserId, schoolId, req.body);

      res.status(201).json({
        success: true,
        message: 'Tạo mới tài khoản thành công. Mật khẩu mặc định là "123456".',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/users/:id
   */
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { id } = req.params;

      const result = await adminService.updateUser(actorUserId, id, req.body);

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin tài khoản thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/users/:id/status
   */
  async toggleUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { id } = req.params;
      const { isActive } = req.body;

      if (isActive === undefined) {
        throw new AppError('Thiếu trường trạng thái isActive (true/false).', 400);
      }

      const result = await adminService.toggleUserStatus(actorUserId, id, Boolean(isActive));

      res.status(200).json({
        success: true,
        message: result.isActive ? 'Mở khoá tài khoản thành công.' : 'Khoá tài khoản thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { id } = req.params;

      const result = await adminService.resetPassword(actorUserId, id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/users/:id
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { id } = req.params;

      const result = await adminService.deleteUser(actorUserId, id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/roles
   */
  async addUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { id } = req.params;
      const { role, scopeLocationId, scopeOrgUnitId } = req.body;

      if (!role) {
        throw new AppError('Thiếu vai trò cần gán (role).', 400);
      }

      const result = await adminService.addUserRole(actorUserId, id, {
        role,
        scopeLocationId,
        scopeOrgUnitId,
      });

      res.status(201).json({
        success: true,
        message: 'Gán vai trò thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/users/:id/roles/:userRoleId
   */
  async removeUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const { id, userRoleId } = req.params;

      const result = await adminService.removeUserRole(actorUserId, id, userRoleId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/permissions-matrix
   */
  async getPermissionsMatrix(req: Request, res: Response, next: NextFunction) {
    try {
      const matrix = adminService.getPermissionsMatrix();
      res.status(200).json({
        success: true,
        data: matrix,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
