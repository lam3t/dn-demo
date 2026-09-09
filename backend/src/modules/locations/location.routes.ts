import { Router } from 'express';
import { locationController } from './location.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => locationController.getAll(req, res, next));
router.get('/:id/summary', (req, res, next) => locationController.getSummary(req, res, next));
router.get('/:id', (req, res, next) => locationController.getById(req, res, next));

router.post(
  '/',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => locationController.create(req, res, next)
);

router.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => locationController.update(req, res, next)
);

router.put(
  '/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => locationController.update(req, res, next)
);

router.delete(
  '/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => locationController.delete(req, res, next)
);

export default router;
