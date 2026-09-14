import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { ReportController } from './report.controller';

const router = Router();

router.use(requireAuth);

router.get('/summary', ReportController.getSummary);
router.get('/export-excel', ReportController.exportExcel);

export default router;
