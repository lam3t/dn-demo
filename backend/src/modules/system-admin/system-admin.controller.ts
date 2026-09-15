import { Request, Response, NextFunction } from 'express';
import { systemAdminService } from './system-admin.service';
import { TenantStatus } from '@prisma/client';

export class SystemAdminController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await systemAdminService.getDashboardStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getTenants(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, page, pageSize } = req.query;
      const result = await systemAdminService.getTenants({
        search: search as string,
        status: status as TenantStatus,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTenantById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenant = await systemAdminService.getTenantById(id);
      res.status(200).json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async createTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const result = await systemAdminService.createTenantWithAdmin(req.body, actorUserId);
      res.status(201).json({
        success: true,
        message: 'Khởi tạo trường học (Tenant) và tài khoản Admin thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user!.id;
      const tenant = await systemAdminService.updateTenant(id, req.body, actorUserId);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin trường học thành công.',
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleTenantStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const actorUserId = req.user!.id;
      const tenant = await systemAdminService.toggleTenantStatus(id, status, actorUserId);
      res.status(200).json({
        success: true,
        message: `Đã chuyển trạng thái trường sang: ${status}`,
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const admins = await systemAdminService.getTenantAdmins(id);
      res.status(200).json({ success: true, data: admins });
    } catch (error) {
      next(error);
    }
  }

  async updateTenantAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const actorUserId = req.user!.id;
      const updated = await systemAdminService.updateTenantAdmin(id, userId, req.body, actorUserId);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin Quản trị viên trường thành công.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetTenantAdminPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const { newPassword } = req.body;
      const actorUserId = req.user!.id;
      const result = await systemAdminService.resetTenantAdminPassword(
        id,
        userId,
        newPassword,
        actorUserId
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async replaceTenantAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user!.id;
      const result = await systemAdminService.replaceTenantAdmin(id, req.body, actorUserId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async initializeTenantAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user!.id;
      const result = await systemAdminService.initializeTenantAdmin(id, req.body, actorUserId);
      res.status(201).json({
        success: true,
        message: 'Khởi tạo tài khoản Quản trị viên trường thành công.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await systemAdminService.getTenantReports();
      res.status(200).json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  }

  async getPackages(req: Request, res: Response, next: NextFunction) {
    try {
      const packages = await systemAdminService.getPackages();
      res.status(200).json({ success: true, data: packages });
    } catch (error) {
      next(error);
    }
  }

  async createPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const pkg = await systemAdminService.createPackage(req.body, actorUserId);
      res.status(201).json({
        success: true,
        message: 'Tạo gói thuê dịch vụ thành công.',
        data: pkg,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user!.id;
      const pkg = await systemAdminService.updatePackage(id, req.body, actorUserId);
      res.status(200).json({
        success: true,
        message: 'Cập nhật gói thuê dịch vụ thành công.',
        data: pkg,
      });
    } catch (error) {
      next(error);
    }
  }

  async createSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user!.id;
      const subscription = await systemAdminService.createSubscription(req.body, actorUserId);
      res.status(201).json({
        success: true,
        message: 'Gán / Gia hạn gói thuê thành công.',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const logs = await systemAdminService.getAuditLogs(limit);
      res.status(200).json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  }
}

export const systemAdminController = new SystemAdminController();
