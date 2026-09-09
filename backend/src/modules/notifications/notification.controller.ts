import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';

export class NotificationController {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { unreadOnly, page, pageSize } = req.query;

      const result = await notificationService.getUserNotifications(
        userId,
        unreadOnly === 'true',
        page ? Number(page) : 1,
        pageSize ? Number(pageSize) : 20
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await notificationService.markAsRead(id, userId);
      res.status(200).json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc.', data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await notificationService.markAllAsRead(userId);

      res.status(200).json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
