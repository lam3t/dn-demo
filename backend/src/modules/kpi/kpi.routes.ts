import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { KpiController } from './kpi.controller';

const router = Router();

// =========================================================================
// 1. QUẢN LÝ KỲ ĐÁNH GIÁ (PERIODS)
// =========================================================================
router.get('/periods', requireAuth, KpiController.getPeriods);
router.post('/periods', requireAuth, KpiController.createPeriod);

// =========================================================================
// 2. DANH MỤC TRỤC KẾT QUẢ & PHÂN QUYỀN
// =========================================================================
router.get('/axes', requireAuth, KpiController.getAxes);
router.post('/axes', requireAuth, KpiController.createOrUpdateAxis);
router.get('/axes/allowed', requireAuth, KpiController.getAllowedAxes);
router.get('/axes/applicability', requireAuth, KpiController.getUnitApplicability);
router.put('/axes/applicability', requireAuth, KpiController.setUnitApplicability);

// =========================================================================
// 3. NHIỆM VỤ KPI THEO TRỤC (CRUD + VALIDATION)
// =========================================================================
router.post('/tasks', requireAuth, KpiController.createKpiTask);
router.put('/tasks/:id', requireAuth, KpiController.updateKpiTask);

// =========================================================================
// 4. MÀN HÌNH "GIAO VIỆC" (TASK ASSIGNMENT LOG)
// =========================================================================
router.get('/assignment-logs', requireAuth, KpiController.getAssignmentLogs);
router.post('/assignment-logs', requireAuth, KpiController.createAssignmentLog);
router.delete('/assignment-logs/:id', requireAuth, KpiController.deleteAssignmentLog);

// =========================================================================
// 5. ĐỀ XUẤT & DUYỆT ĐIỂM THƯỞNG
// =========================================================================
router.get('/bonus-proposals', requireAuth, KpiController.getBonusProposals);
router.post('/bonus-proposals', requireAuth, KpiController.proposeBonus);
router.put('/bonus-proposals/:id/review', requireAuth, KpiController.reviewBonusProposal);

// =========================================================================
// 6. BẢNG ĐIỂM THANG 100 & XẾP LOẠI 4 MỨC
// =========================================================================
router.get('/scores/my', requireAuth, KpiController.getMyScoreSheet);
router.get('/scores/user/:userId', requireAuth, KpiController.getUserScoreSheet);
router.post('/scores/submit', requireAuth, KpiController.submitKpiScore);
router.post('/score-general', requireAuth, KpiController.updateScoreGeneral);
router.post('/scores/update-general', requireAuth, KpiController.updateScoreGeneral);
router.put('/scores/:recordId/approve', requireAuth, KpiController.approveKpiScore);

// =========================================================================
// 7. BÁO CÁO MA TRẬN TRỤC KẾT QUẢ & TỔNG HỢP TOÀN TRƯỜNG (BGH)
// =========================================================================
router.get('/school-overview', requireAuth, KpiController.getSchoolOverview);
router.get('/summary/unit-axis', requireAuth, KpiController.getUnitAxisSummary);
router.get('/summary/annual-school', requireAuth, KpiController.getSchoolAnnualRollup);
router.get('/summary/annual/:employeeId?', requireAuth, KpiController.getAnnualRollup);

// =========================================================================
// 8. TRƯỜNG HỢP ĐẶC BIỆT
// =========================================================================
router.get('/special-cases', requireAuth, KpiController.getSpecialCases);
router.post('/special-cases', requireAuth, KpiController.registerSpecialCase);

// =========================================================================
// 9. LEGACY ENDPOINTS (BACKWARDS COMPATIBILITY)
// =========================================================================
router.get('/my', requireAuth, KpiController.getMyKpi);
router.get('/user/:userId', requireAuth, KpiController.getUserKpi);
router.get('/summary/org/:orgUnitId', requireAuth, KpiController.getOrgUnitSummary);
router.get('/summary/school', requireAuth, KpiController.getSchoolSummary);
router.post('/recompute', requireAuth, KpiController.recomputeKpi);
router.get('/export-excel', requireAuth, KpiController.exportExcel);
router.post('/manual-score', requireAuth, KpiController.updateManualScore);

export default router;
