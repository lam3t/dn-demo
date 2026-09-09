import { Router } from 'express';
import { orgUnitController } from './orgunit.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/tree', (req, res, next) => orgUnitController.getTree(req, res, next));
router.get('/units', (req, res, next) => orgUnitController.getAll(req, res, next));
router.get('/units/:id', (req, res, next) => orgUnitController.getById(req, res, next));
router.post(
  '/units',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => orgUnitController.create(req, res, next)
);
router.put(
  '/units/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => orgUnitController.update(req, res, next)
);
router.delete(
  '/units/:id',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => orgUnitController.delete(req, res, next)
);

export default router;
