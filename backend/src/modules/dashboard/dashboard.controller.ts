import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';

export class DashboardController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, orgUnitId, schoolYear } = req.query;
      const headerYear = req.headers['x-academic-year'] as string | undefined;
      const activeSchoolYear = (schoolYear as string) || headerYear;
      const schoolId = req.user?.schoolId;
      const tenantId = req.user?.tenantId;

      const overview = await dashboardService.getOverview({
        schoolId,
        tenantId,
        locationId: locationId as string,
        orgUnitId: orgUnitId as string,
        schoolYear: activeSchoolYear,
      });

      res.status(200).json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
