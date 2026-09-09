import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/overview', (req, res, next) => dashboardController.getOverview(req, res, next));

export default router;
