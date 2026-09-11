export interface KpiRowItem {
  id: string;
  stt: number;
  taskId?: string; // Liên kết với Task ID nếu lấy từ hệ thống
  taskCode?: string;
  taskTitle: string; // Nhiệm vụ theo quý / kỳ
  deliverable: string; // Sản phẩm (Báo cáo, Kế hoạch, Công văn...)
  targetQuantity: number; // Số lượng kế hoạch (N)
  timeline: string; // Tiến độ / Chu kỳ (Hàng tháng, Quý II, Hằng quý, Theo yêu cầu...)
  weightCoefficient: number; // Hệ số quy đổi (W)
  targetWeightedQuantity: number; // Số lượng quy đổi = N * W

  // 1. KPI (Số lượng)
  actualQuantityNote: string; // Thực tế hoàn thành (số lượng hoặc mô tả)
  actualQuantityVal: number; // Số lượng thực tế
  actualWeightedQuantity: number; // Quy đổi số lượng = actualQuantityVal * W

  // 2. KPI (Chất lượng)
  qualityNote: string; // Thực tế hoàn thành chất lượng (ví dụ: "3 (sửa đổi 1- 2 lần)")
  qualityWeightedScore: number; // Điểm quy đổi chất lượng

  // 3. KPI (Tiến độ)
  timelineNote: string; // Thực tế hoàn thành tiến độ (ví dụ: "3", "Đúng hạn", "Sớm hạn")
  timelineWeightedScore: number; // Điểm quy đổi tiến độ

  // 4. KPI (Lãnh đạo, chỉ đạo, điều hành / Phối hợp)
  leadershipNote: string; // Thực tế hoàn thành điều hành/phối hợp
  leadershipWeightedScore: number; // Điểm quy đổi điều hành/phối hợp
}

export interface KpiSummaryScores {
  totalTargetWeighted: number; // Tổng số lượng quy đổi (18.5)
  totalActualQuantityWeighted: number; // Tổng quy đổi số lượng (18.5)
  totalQualityWeighted: number; // Tổng quy đổi chất lượng (14.5)
  totalTimelineWeighted: number; // Tổng quy đổi tiến độ (15.5)
  totalLeadershipWeighted: number; // Tổng quy đổi lãnh đạo (15.5)

  scoreA_Quantity: number; // A = (totalActualQuantityWeighted / totalTargetWeighted) * 100
  scoreB_Quality: number; // B = (totalQualityWeighted / totalTargetWeighted) * 100
  scoreC_Timeline: number; // C = (totalTimelineWeighted / totalTargetWeighted) * 100
  scoreD_Leadership: number; // D = (totalLeadershipWeighted / totalTargetWeighted) * 100

  finalScore: number; // KPI NV1 = (A + B + C + D) / 4
  ratingCategory: string; // Xuất sắc, Tốt, Hoàn thành, Chưa hoàn thành
  ratingColor: string;
}

export type KpiPeriod = 'QUY_1' | 'QUY_2' | 'QUY_3' | 'QUY_4' | 'HOC_KY_1' | 'HOC_KY_2' | 'NAM_HOC';

export interface KpiEvaluationSheet {
  id: string;
  userId: string;
  userName: string;
  userTitle?: string;
  period: KpiPeriod;
  periodLabel: string;
  schoolYear: string;
  locationName: string;
  orgUnitName: string;
  evaluatorRole: string; // T/M BAN THƯỜNG VỤ, HIỆU TRƯỞNG, TỔ TRƯỞNG...
  rows: KpiRowItem[];
  summary: KpiSummaryScores;
  updatedAt: string;
}
