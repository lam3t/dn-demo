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

  // --------------------------------------------------------
  // PHASE 2: DYNAMIC PERMISSIONS & ROLES
  // --------------------------------------------------------

  async getPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = await adminService.getPermissions();
      res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const roles = await adminService.getRoles(tenantId);
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.createRole(actorUserId, tenantId, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo vai trò tùy biến thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.updateRole(actorUserId, tenantId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin vai trò thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRolePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.updateRolePermissions(actorUserId, tenantId, id, req.body);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.deleteRole(actorUserId, tenantId, id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------
  // PHASE 2: CATEGORIES
  // --------------------------------------------------------

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const { type } = req.query;
      const categories = await adminService.getCategories(tenantId, type as string);
      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.createCategory(actorUserId, tenantId, req.body);
      res.status(201).json({
        success: true,
        message: 'Thêm danh mục dùng chung thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.updateCategory(actorUserId, tenantId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật danh mục thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.deleteCategory(actorUserId, tenantId, id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------
  // PHASE 2: KPI DEFINITIONS
  // --------------------------------------------------------

  async getKPIDefinitions(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const kpis = await adminService.getKPIDefinitions(tenantId);
      res.status(200).json({
        success: true,
        data: kpis,
      });
    } catch (error) {
      next(error);
    }
  }

  async createKPIDefinition(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.createKPIDefinition(actorUserId, tenantId, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo cấu hình chỉ số KPI thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateKPIDefinition(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.updateKPIDefinition(actorUserId, tenantId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật chỉ số KPI thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteKPIDefinition(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const result = await adminService.deleteKPIDefinition(actorUserId, tenantId, id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------
  // PHASE 2: QUOTA & USAGE
  // --------------------------------------------------------

  async getTenantQuota(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Không tìm thấy thông tin trường (tenantId).', 400);
      }
      const quota = await adminService.getTenantQuota(tenantId);
      res.status(200).json({
        success: true,
        data: quota,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();

