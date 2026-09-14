import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service';
import { AppError } from '../../middlewares/error.middleware';

export class ReportController {
  public static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Yêu cầu định danh tenant không hợp lệ.', 403);
      }

      const { startDate, endDate, locationId, orgUnitId, status, planId } = req.query;

      const data = await ReportService.getPeriodSummary({
        tenantId,
        startDate: startDate ? new Date(String(startDate)) : undefined,
        endDate: endDate ? new Date(String(endDate)) : undefined,
        locationId: locationId ? String(locationId) : undefined,
        orgUnitId: orgUnitId ? String(orgUnitId) : undefined,
        status: status ? String(status) : undefined,
        planId: planId ? String(planId) : undefined,
      });

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Yêu cầu định danh tenant không hợp lệ.', 403);
      }

      const { startDate, endDate, locationId, orgUnitId, status, planId } = req.query;

      const buffer = await ReportService.generateExcelReport({
        tenantId,
        startDate: startDate ? new Date(String(startDate)) : undefined,
        endDate: endDate ? new Date(String(endDate)) : undefined,
        locationId: locationId ? String(locationId) : undefined,
        orgUnitId: orgUnitId ? String(orgUnitId) : undefined,
        status: status ? String(status) : undefined,
        planId: planId ? String(planId) : undefined,
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Bao_cao_tien_do_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}
