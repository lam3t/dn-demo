import { Request, Response } from 'express';
import { KpiService } from './kpi.service';

export class KpiController {
  /**
   * GET /api/kpi/my
   */
  static async getMyKpi(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';

      if (!tenantId || !userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng hoặc trường học' });
        return;
      }

      const data = await KpiService.calculateUserKpi(tenantId, userId, periodKey);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Lỗi khi tính điểm KPI cá nhân' });
    }
  }

  /**
   * GET /api/kpi/user/:userId
   */
  static async getUserKpi(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { userId } = req.params;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';

      if (!tenantId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực trường học' });
        return;
      }

      const data = await KpiService.calculateUserKpi(tenantId, userId, periodKey);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy điểm KPI người dùng' });
    }
  }

  /**
   * GET /api/kpi/summary/org/:orgUnitId
   */
  static async getOrgUnitSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { orgUnitId } = req.params;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';

      if (!tenantId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực trường học' });
        return;
      }

      const data = await KpiService.getOrgUnitKpiSummary(tenantId, orgUnitId, periodKey);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Lỗi khi tổng hợp KPI tổ bộ phận' });
    }
  }

  /**
   * GET /api/kpi/summary/school
   */
  static async getSchoolSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';

      if (!tenantId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực trường học' });
        return;
      }

      const data = await KpiService.getSchoolKpiSummary(tenantId, periodKey);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Lỗi khi tổng hợp KPI toàn trường' });
    }
  }

  /**
   * POST /api/kpi/recompute
   */
  static async recomputeKpi(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const periodKey = req.body?.periodKey || (req.query.periodKey as string) || 'QUY_3';
      const userId = req.body?.userId;

      if (!tenantId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực trường học' });
        return;
      }

      if (userId) {
        const data = await KpiService.calculateUserKpi(tenantId, userId, periodKey);
        res.json({ success: true, message: 'Tính lại KPI cá nhân thành công', data });
        return;
      }

      const result = await KpiService.recomputeTenantKpi(tenantId, periodKey);
      res.json({ success: true, message: `Đã tính lại KPI cho ${result.processedUsers} cán bộ giáo viên`, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Lỗi khi tính lại KPI' });
    }
  }

  /**
   * GET /api/kpi/export-excel
   */
  static async exportExcel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';
      const userId = (req.query.userId as string) || req.user?.id;

      if (!tenantId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực trường học' });
        return;
      }

      const buffer = await KpiService.exportKpiExcel(tenantId, periodKey, userId);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Bang_Tinh_KPI_${periodKey}.xlsx`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Lỗi khi xuất file Excel KPI' });
    }
  }
}
