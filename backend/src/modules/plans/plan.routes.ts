import { Router } from 'express';
import { planController } from './plan.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => planController.getAll(req, res, next));
router.get('/tree', (req, res, next) => planController.getTree(req, res, next));
router.get('/:id/tree', (req, res, next) => planController.getTree(req, res, next));
router.get('/:id', (req, res, next) => planController.getById(req, res, next));

// Tạo/sửa/xóa kế hoạch
router.post(
  '/',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG, Role.PHO_HIEU_TRUONG, Role.TO_TRUONG),
  (req, res, next) => planController.create(req, res, next)
);

router.put(
  '/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG, Role.PHO_HIEU_TRUONG, Role.TO_TRUONG),
  (req, res, next) => planController.update(req, res, next)
);

router.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG, Role.PHO_HIEU_TRUONG, Role.TO_TRUONG),
  (req, res, next) => planController.update(req, res, next)
);

router.delete(
  '/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG, Role.PHO_HIEU_TRUONG),
  (req, res, next) => planController.delete(req, res, next)
);

// Tạo nhanh công việc từ kế hoạch & Sao chép kế hoạch
router.post(
  '/:id/generate-tasks',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG, Role.PHO_HIEU_TRUONG, Role.TO_TRUONG),
  (req, res, next) => planController.generateTasks(req, res, next)
);

router.post(
  '/:id/duplicate',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG, Role.PHO_HIEU_TRUONG, Role.TO_TRUONG),
  (req, res, next) => planController.duplicate(req, res, next)
);

export default router;
