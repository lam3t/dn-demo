import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';

export class DashboardController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, orgUnitId } = req.query;
      const schoolId = req.user?.schoolId;

      const overview = await dashboardService.getOverview({
        schoolId,
        locationId: locationId as string,
        orgUnitId: orgUnitId as string,
      });

      res.status(200).json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
