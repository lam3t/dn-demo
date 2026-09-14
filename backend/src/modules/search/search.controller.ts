import { Request, Response, NextFunction } from 'express';
import { SearchService } from './search.service';
import { AppError } from '../../middlewares/error.middleware';

export class SearchController {
  public static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new AppError('Yêu cầu định danh tenant không hợp lệ.', 403);
      }

      const query = String(req.query.q || '');
      const type = (req.query.type as any) || 'ALL';
      const status = (req.query.status as any) || undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 15;

      const data = await SearchService.searchGlobal({
        tenantId,
        query,
        type,
        status,
        limit,
      });

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
