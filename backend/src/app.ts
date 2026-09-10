import express, { Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import healthRoutes from './routes/health.routes';
import authRoutes from './modules/auth/auth.routes';
import locationRoutes from './modules/locations/location.routes';
import orgUnitRoutes from './modules/orgunits/orgunit.routes';
import userRoutes from './modules/users/user.routes';
import planRoutes from './modules/plans/plan.routes';
import taskRoutes from './modules/tasks/task.routes';
import attachmentRoutes from './modules/attachments/attachment.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import adminRoutes from './modules/admin/admin.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import schoolRoutes from './modules/school/school.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app: Express = express();

// Gzip/Deflate compression for fast network throughput
app.use(compression());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or matching frontend
      if (!origin || origin === corsOrigin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for demo
      }
    },
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploaded evidence / files
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/org', orgUnitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks/:id/attachments', attachmentRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
