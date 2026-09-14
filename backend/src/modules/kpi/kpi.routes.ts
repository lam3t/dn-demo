import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { KpiController } from './kpi.controller';

const router = Router();

// 1. KPI Cá nhân
router.get('/my', requireAuth, KpiController.getMyKpi);

// 2. KPI Nhân sự cụ thể (Tổ trưởng / Ban Giám hiệu)
router.get('/user/:userId', requireAuth, KpiController.getUserKpi);

// 3. Tổng hợp KPI Tổ chuyên môn / Bộ phận
router.get('/summary/org/:orgUnitId', requireAuth, KpiController.getOrgUnitSummary);

// 4. Tổng hợp KPI Toàn trường
router.get('/summary/school', requireAuth, KpiController.getSchoolSummary);

// 5. Kích hoạt tính lại KPI
router.post('/recompute', requireAuth, KpiController.recomputeKpi);

// 6. Xuất file Excel bảng điểm KPI (.xlsx)
router.get('/export-excel', requireAuth, KpiController.exportExcel);

export default router;
