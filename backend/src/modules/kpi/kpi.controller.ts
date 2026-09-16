import { Request, Response } from 'express';
import { KpiService } from './kpi.service';
import { AxisApplicabilityService } from './services/axis-applicability.service';
import { SpecialCaseService } from './services/special-case.service';
import { AnnualRollupService } from './services/annual-rollup.service';

export class KpiController {
  // 1. Quản lý Kỳ đánh giá
  static async getPeriods(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const schoolYear = req.query.schoolYear as string | undefined;
      const periods = await KpiService.getPeriods(tenantId, schoolYear);
      return res.json({ success: true, data: periods });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async createPeriod(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = (req as any).user.id;
      const period = await KpiService.createPeriod(tenantId, { ...req.body, createdById: userId });
      return res.status(201).json({ success: true, data: period });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 2. Danh mục Trục kết quả
  static async getAxes(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const axes = await KpiService.getAxes(tenantId);
      return res.json({ success: true, data: axes });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async createOrUpdateAxis(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const axis = await KpiService.createOrUpdateAxis(tenantId, req.body);
      return res.json({ success: true, data: axis });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getAllowedAxes(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = (req as any).user.id;
      const axes = await KpiService.getAllowedPrimaryAxesForUser(tenantId, userId);
      return res.json({ success: true, data: axes });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 3. Áp dụng trục theo Đơn vị + Kỳ
  static async getUnitApplicability(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const unitId = req.query.unitId as string;
      const periodId = req.query.periodId as string;

      if (!unitId || !periodId) {
        return res.status(400).json({ success: false, message: 'Thiếu unitId hoặc periodId' });
      }

      const list = await AxisApplicabilityService.getUnitApplicability(tenantId, unitId, periodId);
      return res.json({ success: true, data: list });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async setUnitApplicability(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const { unitId, periodId, axisId, isApplicable, reason } = req.body;

      const record = await AxisApplicabilityService.setUnitApplicability(
        tenantId,
        unitId,
        periodId,
        axisId,
        isApplicable,
        reason
      );
      return res.json({ success: true, data: record });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 4. Nhiệm vụ KPI
  static async createKpiTask(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const creatorId = (req as any).user.id;
      const task = await KpiService.createKpiTask(tenantId, creatorId, req.body);
      return res.status(201).json({ success: true, data: task });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async updateKpiTask(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = (req as any).user.id;
      const taskId = req.params.id;
      const task = await KpiService.updateKpiTask(tenantId, taskId, userId, req.body);
      return res.json({ success: true, data: task });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 5. Giao việc (Task Assignment Log)
  static async createAssignmentLog(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const assignedById = (req as any).user.id;
      const log = await KpiService.createAssignmentLog(tenantId, assignedById, req.body);
      return res.status(201).json({ success: true, data: log });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getAssignmentLogs(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const periodId = req.query.periodId as string;
      const unitId = req.query.unitId as string;
      const logs = await KpiService.getAssignmentLogs(tenantId, periodId, unitId);
      return res.json({ success: true, data: logs });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async deleteAssignmentLog(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const id = req.params.id;
      await KpiService.deleteAssignmentLog(tenantId, id);
      return res.json({ success: true, message: 'Đã xóa bản ghi phân công' });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 6. Điểm thưởng
  static async proposeBonus(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const proposedById = (req as any).user.id;
      const proposal = await KpiService.proposeBonus(tenantId, proposedById, req.body);
      return res.status(201).json({ success: true, data: proposal });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getBonusProposals(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const periodId = req.query.periodId as string;
      const status = req.query.status as string;
      const list = await KpiService.getBonusProposals(tenantId, periodId, status);
      return res.json({ success: true, data: list });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async reviewBonusProposal(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const approvedById = (req as any).user.id;
      const proposalId = req.params.id;
      const { status, reviewNote } = req.body;

      const updated = await KpiService.reviewBonusProposal(tenantId, proposalId, approvedById, status, reviewNote);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 7. Bảng điểm 100 điểm & Xếp loại
  static async getMyScoreSheet(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = (req as any).user.id;
      let periodId = req.query.periodId as string;

      if (!periodId) {
        const period = await KpiService.getOrCreateDefaultPeriod(tenantId);
        periodId = period.id;
      }

      const result = await KpiService.getCalculatedScore(tenantId, userId, periodId);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getUserScoreSheet(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const targetUserId = req.params.userId;
      let periodId = req.query.periodId as string;

      if (!periodId) {
        const period = await KpiService.getOrCreateDefaultPeriod(tenantId);
        periodId = period.id;
      }

      const result = await KpiService.getCalculatedScore(tenantId, targetUserId, periodId);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async submitKpiScore(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const employeeId = (req as any).user.id;
      const { periodId, scoreGeneral, note } = req.body;

      const submitted = await KpiService.submitKpiScore(tenantId, employeeId, periodId, { scoreGeneral, note });
      return res.json({ success: true, data: submitted });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async updateScoreGeneral(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const currentUserId = (req as any).user.id;
      const { employeeId, periodId, scoreGeneral } = req.body;

      const targetEmployeeId = employeeId || currentUserId;
      if (!periodId) {
        return res.status(400).json({ success: false, message: 'Thiếu periodId kỳ đánh giá' });
      }

      const result = await KpiService.updateScoreGeneral(
        tenantId,
        targetEmployeeId,
        periodId,
        scoreGeneral,
        currentUserId
      );

      return res.json({ success: true, message: 'Cập nhật điểm Phần A thành công', data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async approveKpiScore(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const approvedById = (req as any).user.id;
      const recordId = req.params.recordId;
      const { finalClassification, meetsExtraConditions, overrideReason } = req.body;

      const approved = await KpiService.approveKpiScore(tenantId, recordId, approvedById, {
        finalClassification,
        meetsExtraConditions,
        overrideReason,
      });
      return res.json({ success: true, data: approved });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 8. Báo cáo Ma trận Trục kết quả Toàn đơn vị
  static async getUnitAxisSummary(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const orgUnitId = req.query.orgUnitId as string;
      let periodId = req.query.periodId as string;

      if (!periodId) {
        const period = await KpiService.getOrCreateDefaultPeriod(tenantId);
        periodId = period.id;
      }

      if (!orgUnitId) {
        return res.status(400).json({ success: false, message: 'Thiếu orgUnitId' });
      }

      const report = await KpiService.getUnitAxisSummaryReport(tenantId, orgUnitId, periodId);
      return res.json({ success: true, data: report });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 8b. Tổng hợp KPI Toàn trường (School KPI Overview for Principal / Vice Principal / Admin)
  static async getSchoolOverview(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const { orgUnitId, periodId, search, classification } = req.query;

      const data = await KpiService.getSchoolKpiOverview(tenantId, {
        orgUnitId: orgUnitId as string,
        periodId: periodId as string,
        search: search as string,
        classification: classification as string,
      });

      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 9. Trường hợp đặc biệt
  static async registerSpecialCase(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const approvedById = (req as any).user.id;
      const record = await SpecialCaseService.registerSpecialCase({
        tenantId,
        ...req.body,
        approvedById,
      });
      return res.status(201).json({ success: true, data: record });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getSpecialCases(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const periodId = req.query.periodId as string;
      const records = await SpecialCaseService.getSpecialCases(tenantId, periodId);
      return res.json({ success: true, data: records });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // =========================================================================
  // LEGACY CONTROLLERS
  // =========================================================================

  static async getMyKpi(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = (req as any).user.id;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';
      const kpi = await KpiService.calculateUserKpi(tenantId, userId, periodKey);
      return res.json({ success: true, data: kpi });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getUserKpi(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = req.params.userId;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';
      const kpi = await KpiService.calculateUserKpi(tenantId, userId, periodKey);
      return res.json({ success: true, data: kpi });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getOrgUnitSummary(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const orgUnitId = req.params.orgUnitId;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';
      const summary = await KpiService.getOrgUnitKpiSummary(tenantId, orgUnitId, periodKey);
      return res.json({ success: true, data: summary });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getSchoolSummary(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';
      const summary = await KpiService.getSchoolKpiSummary(tenantId, periodKey);
      return res.json({ success: true, data: summary });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async recomputeKpi(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const periodKey = (req.body.periodKey as string) || 'QUY_3';
      const summary = await KpiService.recomputeTenantKpi(tenantId, periodKey);
      return res.json({ success: true, message: 'Tính lại KPI thành công', data: summary });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async exportExcel(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const periodKey = (req.query.periodKey as string) || 'QUY_3';
      const userId = req.query.userId as string | undefined;
      const buffer = await KpiService.exportKpiExcel(tenantId, periodKey, userId);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Bang_Tinh_KPI_${periodKey}.xlsx`);
      return res.send(buffer);
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async updateManualScore(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = req.body.userId || (req as any).user.id;
      const updated = await KpiService.updateManualScore(tenantId, userId, req.body);
      return res.json({ success: true, message: 'Cập nhật điểm thành công', data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  // 9. Tổng kết & Xếp loại Cả Năm (Tích lũy 4 Quý)
  static async getAnnualRollup(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const currentUserId = (req as any).user.id;
      const targetEmployeeId = req.params.employeeId || (req.query.employeeId as string) || currentUserId;
      const schoolYear = (req.query.schoolYear as string) || '2026-2027';

      const rollup = await AnnualRollupService.getEmployeeAnnualRollup(tenantId, targetEmployeeId, schoolYear);
      return res.json({ success: true, data: rollup });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getSchoolAnnualRollup(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const schoolYear = (req.query.schoolYear as string) || '2026-2027';
      const orgUnitId = req.query.orgUnitId as string;

      const rollup = await AnnualRollupService.getSchoolAnnualRollup(tenantId, schoolYear, orgUnitId);
      return res.json({ success: true, data: rollup });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}
