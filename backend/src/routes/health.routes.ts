import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    app: 'TN EDU - Quản lý Kế hoạch & Công việc Trường Phổ thông',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
