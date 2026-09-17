import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import prisma from '../prisma';
import { NotificationType } from '@prisma/client';

export interface NotificationJobData {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
}

export interface ReportJobData {
  tenantId: string;
  reportType: 'WEEKLY' | 'MONTHLY' | 'SEMESTER';
  requestedById: string;
  filters?: any;
}

export class QueueService {
  private static redisConnection: Redis | null = null;
  private static notificationQueue: Queue | null = null;
  private static reportQueue: Queue | null = null;
  private static isRedisAvailable = false;

  public static initialize() {
    // Only attempt Redis connection if REDIS_HOST or REDIS_URL is explicitly set
    if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
      this.isRedisAvailable = false;
      return;
    }

    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    try {
      this.redisConnection = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: null,
        lazyConnect: true,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 2) return null; // Don't spam retries if Redis is down
          return 1000;
        },
      });

      this.redisConnection.on('connect', () => {
        this.isRedisAvailable = true;
        console.log('✓ Kết nối Redis cho BullMQ thành công.');
      });

      this.redisConnection.on('error', () => {
        this.isRedisAvailable = false;
      });

      // Try connecting
      this.redisConnection.connect().then(() => {
        this.isRedisAvailable = true;
        this.notificationQueue = new Queue('notifications-queue', { connection: this.redisConnection! });
        this.reportQueue = new Queue('reports-queue', { connection: this.redisConnection! });

        // Worker for Notifications
        new Worker(
          'notifications-queue',
          async (job: Job<NotificationJobData>) => {
            await this.processNotification(job.data);
          },
          { connection: this.redisConnection! }
        );

        console.log('✓ BullMQ Queue Workers đã được khởi tạo.');
      }).catch(() => {
        this.isRedisAvailable = false;
      });
    } catch (e) {
      this.isRedisAvailable = false;
    }
  }

  /**
   * Đẩy job gửi thông báo vào hàng đợi
   */
  public static async pushNotification(data: NotificationJobData): Promise<void> {
    if (this.isRedisAvailable && this.notificationQueue) {
      try {
        await this.notificationQueue.add('send-notification', data, {
          removeOnComplete: true,
          removeOnFail: 50,
        });
        return;
      } catch (_) {
        // Fallback to in-memory
      }
    }

    // Async in-memory processing
    setImmediate(async () => {
      await this.processNotification(data);
    });
  }

  /**
   * Xử lý tạo thông báo vào CSDL
   */
  private static async processNotification(data: NotificationJobData) {
    try {
      await prisma.notification.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          content: data.content,
          link: data.link,
          isRead: false,
        },
      });
    } catch (err) {
      console.error('Lỗi khi xử lý thông báo ngầm:', err);
    }
  }

  /**
   * Đẩy job xuất báo cáo vào hàng đợi
   */
  public static async pushReportGeneration(data: ReportJobData): Promise<string> {
    const jobId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    if (this.isRedisAvailable && this.reportQueue) {
      try {
        await this.reportQueue.add('generate-report', data, { jobId });
        return jobId;
      } catch (_) {
        // Fallback
      }
    }

    return jobId;
  }
}

// Tự động khởi tạo khi import
QueueService.initialize();
