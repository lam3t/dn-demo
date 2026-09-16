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

      const { startDate, endDate, locationId, orgUnitId, status, planId, schoolYear } = req.query;
      const headerYear = req.headers['x-academic-year'] as string | undefined;
      const activeSchoolYear = (schoolYear as string) || headerYear;

      let parsedStartDate: Date | undefined = startDate ? new Date(String(startDate)) : undefined;
      let parsedEndDate: Date | undefined = endDate ? new Date(String(endDate)) : undefined;

      if (!parsedStartDate && !parsedEndDate && activeSchoolYear) {
        const parts = activeSchoolYear.split('-');
        if (parts.length === 2) {
          const startY = parseInt(parts[0].trim(), 10);
          const endY = parseInt(parts[1].trim(), 10);
          if (!isNaN(startY) && !isNaN(endY)) {
            parsedStartDate = new Date(Date.UTC(startY, 7, 15, 0, 0, 0));
            parsedEndDate = new Date(Date.UTC(endY, 7, 31, 23, 59, 59, 999));
          }
        }
      }

      const data = await ReportService.getPeriodSummary({
        tenantId,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
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

      const { startDate, endDate, locationId, orgUnitId, status, planId, schoolYear } = req.query;
      const headerYear = req.headers['x-academic-year'] as string | undefined;
      const activeSchoolYear = (schoolYear as string) || headerYear;

      let parsedStartDate: Date | undefined = startDate ? new Date(String(startDate)) : undefined;
      let parsedEndDate: Date | undefined = endDate ? new Date(String(endDate)) : undefined;

      if (!parsedStartDate && !parsedEndDate && activeSchoolYear) {
        const parts = activeSchoolYear.split('-');
        if (parts.length === 2) {
          const startY = parseInt(parts[0].trim(), 10);
          const endY = parseInt(parts[1].trim(), 10);
          if (!isNaN(startY) && !isNaN(endY)) {
            parsedStartDate = new Date(Date.UTC(startY, 7, 15, 0, 0, 0));
            parsedEndDate = new Date(Date.UTC(endY, 7, 31, 23, 59, 59, 999));
          }
        }
      }

      const buffer = await ReportService.generateExcelReport({
        tenantId,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
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
