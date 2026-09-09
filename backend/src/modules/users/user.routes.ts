import { Router } from 'express';
import { userController } from './user.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

// People Picker Core API & Recent Collaborators
router.get('/', (req, res, next) => userController.searchUsers(req, res, next));
router.get('/:id/recent-collaborators', (req, res, next) =>
  userController.getRecentCollaborators(req, res, next)
);
router.get('/:id', (req, res, next) => userController.getById(req, res, next));

// Admin / Hiệu trưởng quản lý nhân sự
router.post(
  '/',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => userController.create(req, res, next)
);
router.put(
  '/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => userController.update(req, res, next)
);
router.delete(
  '/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => userController.delete(req, res, next)
);

export default router;
