import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { NotificationType, TaskStatus, TaskAssignmentRole } from '@prisma/client';

export class NotificationService {
  /**
   * Tạo thông báo mới và lưu vào CSDL
   */
  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    content: string;
    link?: string;
  }) {
    return prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        content: params.content,
        link: params.link || null,
        isRead: false,
      },
    });
  }

  /**
   * Lấy danh sách thông báo của người dùng
   */
  async getUserNotifications(userId: string, unreadOnly = false, page = 1, pageSize = 20) {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [total, unreadCount, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Đánh dấu một thông báo đã đọc
   */
  async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new AppError('Không tìm thấy thông báo hoặc bạn không có quyền truy cập.', 404);
    }

    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Đánh dấu toàn bộ thông báo của người dùng là đã đọc
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Quét kiểm tra thời hạn và gửi thông báo nhắc việc / quá hạn
   */
  async checkDueDatesAndNotify() {
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const nonCompletedStatuses: TaskStatus[] = [
      TaskStatus.NHAP,
      TaskStatus.DA_GIAO,
      TaskStatus.DA_TIEP_NHAN,
      TaskStatus.DANG_THUC_HIEN,
      TaskStatus.CHO_KIEM_TRA,
      TaskStatus.BO_SUNG,
    ];

    // 1. Quét công việc sắp đến hạn (trong vòng 2 ngày)
    const upcomingTasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: now, lte: twoDaysLater },
        status: { in: nonCompletedStatuses },
      },
      include: {
        assignments: {
          where: { role: { in: [TaskAssignmentRole.CHU_TRI, TaskAssignmentRole.PHOI_HOP] } },
        },
      },
    });

    for (const task of upcomingTasks) {
      for (const a of task.assignments) {
        // Kiểm tra xem đã gửi thông báo nhắc việc cho task này hôm nay chưa
        const recentNotif = await prisma.notification.findFirst({
          where: {
            userId: a.userId,
            link: `/tasks/${task.id}`,
            type: NotificationType.NHAC_VIEC,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!recentNotif) {
          await this.createNotification({
            userId: a.userId,
            type: NotificationType.NHAC_VIEC,
            title: `Nhắc việc sắp đến hạn: ${task.title}`,
            content: `Công việc [${task.code || ''}] sắp đến hạn chót vào ${new Date(task.dueDate!).toLocaleDateString('vi-VN')}. Vui lòng kiểm tra và hoàn thành.`,
            link: `/tasks/${task.id}`,
          });
        }
      }
    }

    // 2. Quét công việc đã Quá hạn
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: nonCompletedStatuses },
      },
      include: {
        assignments: {
          where: { role: TaskAssignmentRole.CHU_TRI },
        },
      },
    });

    for (const task of overdueTasks) {
      for (const a of task.assignments) {
        const recentOverdueNotif = await prisma.notification.findFirst({
          where: {
            userId: a.userId,
            link: `/tasks/${task.id}`,
            type: NotificationType.HET_HAN,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!recentOverdueNotif) {
          await this.createNotification({
            userId: a.userId,
            type: NotificationType.HET_HAN,
            title: `Cảnh báo quá hạn: ${task.title}`,
            content: `Công việc [${task.code || ''}] đã quá hạn ngày ${new Date(task.dueDate!).toLocaleDateString('vi-VN')}. Yêu cầu cập nhật tiến độ ngay.`,
            link: `/tasks/${task.id}`,
          });
        }
      }
    }
  }
}

export const notificationService = new NotificationService();
