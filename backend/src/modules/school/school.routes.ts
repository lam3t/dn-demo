import { Router } from 'express';
import { schoolController } from './school.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/info', (req, res, next) => schoolController.getSchoolInfo(req, res, next));
router.patch(
  '/info',
  requireRole(Role.ADMIN, Role.HIEU_TRUONG),
  (req, res, next) => schoolController.updateSchoolInfo(req, res, next)
);

export default router;
