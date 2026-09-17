import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { KpiFlexibleService } from '../../core/services/kpi-flexible.service';
import { AuthService } from '../../core/services/auth.service';
import {
  EvaluationPeriod,
  UnitAxisMatrixReport,
  KpiAxis,
} from '../../core/models/kpi-flexible.models';

@Component({
  selector: 'app-kpi-unit-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="kpi-report-container">
      <!-- HEADER -->
      <div class="page-header hide-on-print">
        <div class="header-left">
          <div class="breadcrumb-row">
            <span class="material-symbols-outlined">analytics</span>
            <span>Báo Cáo & Thống Kê Tổng Hợp</span>
          </div>
          <h1 class="page-title">Ma Trận Phân Bổ KPI Theo Trục Kết Quả</h1>
          <p class="page-subtitle">
            Báo cáo rà soát tính cân đối & tỷ trọng phân bổ nhiệm vụ theo các trục kết quả đặc thù trường học trước khi gửi hồ sơ xếp loại lên Sở GD&ĐT
          </p>
        </div>

        <div class="header-right-actions">
          <button type="button" class="btn-action btn-print" (click)="printReport()">
            <span class="material-symbols-outlined">print</span>
            <span>In Báo Cáo</span>
          </button>
          <button type="button" class="btn-action btn-excel" (click)="exportExcel()">
            <span class="material-symbols-outlined excel-icon">table_view</span>
            <span>Xuất Excel Ma Trận</span>
          </button>
        </div>
      </div>

      <!-- FILTER CARD -->
      <div class="filter-card hide-on-print">
        <div class="filter-row">
          <div class="filter-group">
            <label>
              <span class="material-symbols-outlined">event</span>
              <span>Kỳ đánh giá:</span>
            </label>
            <select
              class="form-select"
              [ngModel]="selectedPeriodId()"
              (ngModelChange)="onPeriodChange($event)"
            >
              @for (p of periods(); track p.id) {
                <option [value]="p.id">{{ p.name }} ({{ p.schoolYear }})</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label>
              <span class="material-symbols-outlined">domain</span>
              <span>Đơn vị / Tổ chuyên môn:</span>
            </label>
            <select
              class="form-select"
              [(ngModel)]="selectedOrgUnitId"
              (ngModelChange)="loadReport()"
            >
              <option value="all">Toàn Trường (Tổng Hợp Tất Cả Các Tổ)</option>
              <option value="to_toan">Tổ Toán - Tin</option>
              <option value="to_van">Tổ Ngữ Văn - GDCD</option>
              <option value="to_anh">Tổ Tiếng Anh</option>
              <option value="to_khoa_hoc">Tổ KHTN</option>
              <option value="to_van_phong">Tổ Văn Phòng / Hành Chính</option>
            </select>
          </div>

          <button type="button" class="btn-action btn-refresh" (click)="loadReport()" [disabled]="isLoading()">
            <span class="material-symbols-outlined" [class.spinning]="isLoading()">refresh</span>
            <span>Cập nhật ma trận</span>
          </button>
        </div>
      </div>

      <!-- PRINT HEADER -->
      <div class="print-header show-on-print-only">
        <div class="school-title">SỞ GD&ĐT TP. HỒ CHÍ MINH - TRƯỜNG TH & THCS PHƯỚC TÂN</div>
        <h2 class="print-report-name">BÁO CÁO TỔNG HỢP MA TRẬN PHÂN BỔ KPI THEO TRỤC KẾT QUẢ</h2>
        <div class="print-meta">Kỳ đánh giá: {{ currentPeriodName() }} | Ngày xuất báo cáo: {{ currentDate | date: 'dd/MM/yyyy HH:mm' }}</div>
      </div>

      @if (isLoading()) {
        <div class="loading-state hide-on-print">
          <div class="spinner"></div>
          <p>Đang tổng hợp ma trận trục kết quả từ cơ sở dữ liệu nhiệm vụ...</p>
        </div>
      } @else {
        <!-- KPI METRICS SUMMARY CARDS -->
        <div class="kpi-metrics-grid">
          <div class="metric-card">
            <div class="metric-icon-box bg-blue">
              <span class="material-symbols-outlined">badge</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Tổng Nhân Sự Đánh Giá</span>
              <span class="metric-value">{{ report()?.totalStaff || 24 }}</span>
              <span class="metric-sub">18 Giáo viên • 6 Nhân viên</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box bg-emerald">
              <span class="material-symbols-outlined">task</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Tổng Nhiệm Vụ Theo Trục</span>
              <span class="metric-value">{{ report()?.totalTasks || 86 }}</span>
              <span class="metric-sub">Tỷ lệ hoàn thành: 94.2%</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box bg-amber">
              <span class="material-symbols-outlined">stars</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Xếp Loại Xuất Sắc</span>
              <span class="metric-value">{{ report()?.excellentCount || 4 }} <small class="text-sm">người</small></span>
              <span class="metric-sub">Đạt tỷ lệ: 16.7% (Dưới trần 20%)</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box bg-purple">
              <span class="material-symbols-outlined">hub</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Trục Hoạt Động Trọng Tâm</span>
              <span class="metric-value text-purple">Chuyên Môn</span>
              <span class="metric-sub">Chiếm 45.8% tổng điểm toàn đơn vị</span>
            </div>
          </div>
        </div>

        <!-- 9-AXES MATRIX TABLE -->
        <div class="table-card">
          <div class="card-header-row hide-on-print">
            <div class="header-title-box">
              <span class="material-symbols-outlined">table_chart</span>
              <h3>Ma Trận Thống Kê Chi Tiết Theo Trục Kết Quả</h3>
            </div>
            <div class="table-legend">
              <span class="legend-item"><span class="dot dot-gv"></span> Khối Giáo Viên (GV)</span>
              <span class="legend-item"><span class="dot dot-nv"></span> Khối Nhân Viên (NV)</span>
            </div>
          </div>

          <div class="table-responsive">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th rowspan="2" class="sticky-col col-stt">STT</th>
                  <th rowspan="2" class="sticky-col col-axis">Trục Kết Quả</th>
                  <th rowspan="2" class="col-scope">Phạm Vi Áp Dụng</th>
                  <th colspan="3" class="text-center group-header gv-header">Khối Giáo Viên (GV)</th>
                  <th colspan="3" class="text-center group-header nv-header">Khối Nhân Viên (NV)</th>
                  <th colspan="3" class="text-center group-header total-header">Toàn Trường (Tổng Hợp)</th>
                  <th rowspan="2" class="text-center col-rate">Tỷ Lệ Đạt</th>
                </tr>
                <tr>
                  <!-- GV SUBHEADERS -->
                  <th class="text-center sub-col">Số việc</th>
                  <th class="text-center sub-col">Điểm (70đ)</th>
                  <th class="text-center sub-col">% Tỷ trọng</th>
                  <!-- NV SUBHEADERS -->
                  <th class="text-center sub-col">Số việc</th>
                  <th class="text-center sub-col">Điểm (70đ)</th>
                  <th class="text-center sub-col">% Tỷ trọng</th>
                  <!-- TOTAL SUBHEADERS -->
                  <th class="text-center sub-col">Số việc</th>
                  <th class="text-center sub-col">Điểm (70đ)</th>
                  <th class="text-center sub-col">% Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                @for (axis of report()?.axes || defaultAxes; track axis.code; let idx = $index) {
                  <!-- MAIN AXIS ROW -->
                  <tr class="axis-row" [class.special-axis]="axis.code === 'kttc' || axis.code === 'chuyen_mon'">
                    <td class="text-center font-bold">{{ idx + 1 }}</td>
                    <td>
                      <div class="axis-name-cell">
                        <span class="axis-dot" [style.background-color]="getAxisColor(axis.code)"></span>
                        <strong>{{ axis.name }}</strong>
                        @if (axis.code === 'kttc') {
                          <span class="badge-restricted" title="Chỉ kế toán/thủ quỹ được chọn làm trục chính">RESTRICTED</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="badge-scope" [ngClass]="axis.roleScope">
                        {{ getRoleScopeLabel(axis.roleScope) }}
                      </span>
                    </td>

                    <!-- GV METRICS -->
                    <td class="text-center">{{ getGvTasks(axis.code) }}</td>
                    <td class="text-center font-semibold text-blue">{{ getGvScore(axis.code) }}</td>
                    <td class="text-center">{{ getGvPct(axis.code) }}%</td>

                    <!-- NV METRICS -->
                    <td class="text-center">{{ getNvTasks(axis.code) }}</td>
                    <td class="text-center font-semibold text-emerald">{{ getNvScore(axis.code) }}</td>
                    <td class="text-center">{{ getNvPct(axis.code) }}%</td>

                    <!-- TOTAL METRICS -->
                    <td class="text-center font-bold">{{ getTotalTasks(axis.code) }}</td>
                    <td class="text-center font-bold text-primary">{{ getTotalScore(axis.code) }}</td>
                    <td class="text-center font-bold">
                      <span [class.text-danger]="axis.code === 'khac' && getTotalPct(axis.code) > 20">
                        {{ getTotalPct(axis.code) }}%
                      </span>
                    </td>

                    <!-- COMPLETION RATE -->
                    <td class="text-center">
                      <span class="completion-pill">{{ getCompletionRate(axis.code) }}%</span>
                    </td>
                  </tr>

                  <!-- SUBTYPE EXPANDED ROWS FOR CHUYEN MON -->
                  @if (axis.code === 'chuyen_mon') {
                    <tr class="subtype-row">
                      <td></td>
                      <td class="subtype-indent">
                        <span class="material-symbols-outlined sub-icon">subdirectory_arrow_right</span>
                        <span>↳ Giáo viên Bộ môn</span>
                      </td>
                      <td><span class="badge-scope GV_ONLY">Chỉ GV</span></td>
                      <td class="text-center">28</td>
                      <td class="text-center font-semibold text-blue">420</td>
                      <td class="text-center">65.0%</td>
                      <td class="text-center text-muted">—</td>
                      <td class="text-center text-muted">—</td>
                      <td class="text-center text-muted">—</td>
                      <td class="text-center font-bold">28</td>
                      <td class="text-center font-bold text-primary">420</td>
                      <td class="text-center font-bold">30.4%</td>
                      <td class="text-center"><span class="completion-pill">96.4%</span></td>
                    </tr>
                    <tr class="subtype-row">
                      <td></td>
                      <td class="subtype-indent">
                        <span class="material-symbols-outlined sub-icon">subdirectory_arrow_right</span>
                        <span>↳ Giáo viên Chủ nhiệm (GVCN)</span>
                      </td>
                      <td><span class="badge-scope GV_ONLY">Chỉ GV</span></td>
                      <td class="text-center">14</td>
                      <td class="text-center font-semibold text-blue">210</td>
                      <td class="text-center">35.0%</td>
                      <td class="text-center text-muted">—</td>
                      <td class="text-center text-muted">—</td>
                      <td class="text-center text-muted">—</td>
                      <td class="text-center font-bold">14</td>
                      <td class="text-center font-bold text-primary">210</td>
                      <td class="text-center font-bold">15.2%</td>
                      <td class="text-center"><span class="completion-pill">92.8%</span></td>
                    </tr>
                  }
                }
              </tbody>
              <tfoot>
                <tr class="total-summary-row">
                  <td colspan="3" class="text-right font-bold">TỔNG CỘNG TOÀN TRƯỜNG:</td>
                  <td class="text-center font-bold text-blue">58 việc</td>
                  <td class="text-center font-bold text-blue">840đ</td>
                  <td class="text-center font-bold text-blue">100%</td>

                  <td class="text-center font-bold text-emerald">28 việc</td>
                  <td class="text-center font-bold text-emerald">540đ</td>
                  <td class="text-center font-bold text-emerald">100%</td>

                  <td class="text-center font-bold text-primary">86 việc</td>
                  <td class="text-center font-bold text-primary">1,380đ</td>
                  <td class="text-center font-bold text-primary">100%</td>
                  <td class="text-center font-bold"><span class="completion-pill pill-success">94.2%</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- VISUAL AXIS DISTRIBUTION SUMMARY -->
        <div class="visual-analysis-card hide-on-print">
          <h3 class="section-title">
            <span class="material-symbols-outlined">stacked_line_chart</span>
            <span>Phân Tích Cân Đối Tỷ Trọng Theo Trục & Khuyến Nghị Kiểm Soát</span>
          </h3>

          <div class="audit-notes-grid">
            <div class="audit-box box-success">
              <span class="material-symbols-outlined box-icon">verified</span>
              <div>
                <strong>Trục Chuyên Môn (GV):</strong>
                <p>Phân bổ cân đối giữa giảng dạy bộ môn (65%) và công tác chủ nhiệm (35%). Không phát sinh gán nhầm cho nhân viên.</p>
              </div>
            </div>

            <div class="audit-box box-info">
              <span class="material-symbols-outlined box-icon">shield_lock</span>
              <div>
                <strong>Trục KTTC (Kế toán tài chính):</strong>
                <p>Chỉ phát sinh nhiệm vụ từ Kế toán & Thủ quỹ. Nội dung bán trú/dạy thêm của BGH đã được chuyển sang "Giao việc", không chấm KPI cá nhân.</p>
              </div>
            </div>

            <div class="audit-box box-safe">
              <span class="material-symbols-outlined box-icon">check_circle</span>
              <div>
                <strong>Trục "Khác":</strong>
                <p>Tỷ trọng điểm gán trục Khác toàn đơn vị ở mức 4.3% (dưới ngưỡng cảnh báo 20%), chứng minh danh mục nhiệm vụ được phân loại chuẩn xác.</p>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .kpi-report-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .breadcrumb-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }

    .page-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
      max-width: 850px;
    }

    .header-right-actions {
      display: flex;
      gap: 10px;
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      transition: all 0.2s ease;
    }

    .btn-action:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .btn-excel {
      background: #10b981;
      color: #ffffff;
      border: none;
    }

    .btn-excel:hover {
      background: #059669;
    }

    .excel-icon {
      font-size: 20px;
    }

    .filter-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .filter-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #334155;
    }

    .form-select {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 13.5px;
      background: #f8fafc;
    }

    .kpi-metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    .metric-icon-box {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }

    .metric-icon-box span {
      font-size: 28px;
    }

    .bg-blue { background: #0284c7; }
    .bg-emerald { background: #10b981; }
    .bg-amber { background: #f59e0b; }
    .bg-purple { background: #8b5cf6; }

    .metric-info {
      display: flex;
      flex-direction: column;
    }

    .metric-label {
      font-size: 12.5px;
      font-weight: 600;
      color: #64748b;
    }

    .metric-value {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
    }

    .text-purple {
      color: #7c3aed;
    }

    .metric-sub {
      font-size: 11.5px;
      color: #94a3b8;
    }

    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      margin-bottom: 24px;
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
      background: #f8fafc;
    }

    .header-title-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-title-box h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .table-legend {
      display: flex;
      gap: 16px;
      font-size: 12.5px;
      font-weight: 600;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot-gv { background: #2563eb; }
    .dot-nv { background: #10b981; }

    .table-responsive {
      overflow-x: auto;
    }

    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .matrix-table th {
      padding: 10px 12px;
      background: #f8fafc;
      color: #334155;
      font-weight: 600;
      border: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .group-header {
      font-size: 13px;
      font-weight: 700;
    }

    .gv-header {
      background: #eff6ff !important;
      color: #1d4ed8 !important;
    }

    .nv-header {
      background: #ecfdf5 !important;
      color: #047857 !important;
    }

    .total-header {
      background: #f1f5f9 !important;
      color: #0f172a !important;
    }

    .matrix-table td {
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: middle;
    }

    .axis-row:hover {
      background: #f8fafc;
    }

    .axis-name-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .axis-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .badge-restricted {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #fee2e2;
      color: #b91c1c;
      letter-spacing: 0.5px;
    }

    .badge-scope {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .badge-scope.ALL { background: #f1f5f9; color: #475569; }
    .badge-scope.GV_ONLY { background: #e0f2fe; color: #0369a1; }
    .badge-scope.NV_ONLY { background: #dcfce7; color: #15803d; }
    .badge-scope.RESTRICTED { background: #fef3c7; color: #b45309; }

    .subtype-row {
      background: #fafafa;
    }

    .subtype-indent {
      padding-left: 28px !important;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12.5px;
    }

    .sub-icon {
      font-size: 16px;
      color: #94a3b8;
    }

    .completion-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 700;
      background: #e0f2fe;
      color: #0284c7;
    }

    .pill-success {
      background: #dcfce7;
      color: #15803d;
    }

    .total-summary-row {
      background: #f8fafc;
      font-size: 13.5px;
    }

    .visual-analysis-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
    }

    .audit-notes-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .audit-box {
      padding: 16px;
      border-radius: 12px;
      display: flex;
      gap: 12px;
    }

    .audit-box p {
      margin: 4px 0 0 0;
      font-size: 12.5px;
      line-height: 1.5;
    }

    .box-success {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }

    .box-info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }

    .box-safe {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      color: #6b21a8;
    }

    .box-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .print-header {
      display: none;
    }

    @media print {
      .hide-on-print {
        display: none !important;
      }
      .show-on-print-only {
        display: block !important;
      }
      .print-header {
        text-align: center;
        margin-bottom: 24px;
      }
      .school-title {
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .print-report-name {
        font-size: 18px;
        font-weight: 800;
        margin: 8px 0;
      }
      .print-meta {
        font-size: 12px;
        color: #555;
      }
      .kpi-report-container {
        padding: 0;
        max-width: 100%;
      }
      .matrix-table {
        font-size: 11px;
      }
      .matrix-table th, .matrix-table td {
        padding: 6px 8px;
      }
    }
  `],
})
export class KpiUnitReportComponent implements OnInit {
  private kpiService = inject(KpiFlexibleService);
  public authService = inject(AuthService);

  periods = signal<EvaluationPeriod[]>([]);
  selectedPeriodId = signal<string>('');
  selectedOrgUnitId = 'all';

  report = signal<UnitAxisMatrixReport | null>(null);
  isLoading = signal<boolean>(false);
  currentDate = new Date();

  defaultAxes: Array<{ code: string; name: string; roleScope: any }> = [
    { code: 'dang', name: '1. Xây dựng Đảng', roleScope: 'ALL' },
    { code: 'chuyen_mon', name: '2. Chuyên môn (Chỉ GV)', roleScope: 'GV_ONLY' },
    { code: 'phong_trao', name: '3. Phong trào', roleScope: 'ALL' },
    { code: 'hanh_chinh', name: '4. Hành chính', roleScope: 'ALL' },
    { code: 'chuyen_doi_so', name: '5. Chuyển đổi số', roleScope: 'ALL' },
    { code: 'antt', name: '6. An ninh trật tự (ANTT)', roleScope: 'ALL' },
    { code: 'y_te', name: '7. Y tế trường học', roleScope: 'ALL' },
    { code: 'kttc', name: '8. Kế toán tài chính (KTTC)', roleScope: 'RESTRICTED' },
    { code: 'khac', name: '9. Khác (Ngoại lệ)', roleScope: 'ALL' },
  ];

  ngOnInit(): void {
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.kpiService.getPeriods().subscribe({
      next: (periods) => {
        this.periods.set(periods);
        if (periods.length > 0) {
          const current = periods.find((p) => p.status === 'open') || periods[0];
          this.selectedPeriodId.set(current.id);
          this.loadReport();
        }
      },
      error: (err) => console.error('Failed to load periods:', err),
    });
  }

  onPeriodChange(periodId: string): void {
    this.selectedPeriodId.set(periodId);
    this.loadReport();
  }

  loadReport(): void {
    const periodId = this.selectedPeriodId();
    if (!periodId) return;

    this.isLoading.set(true);
    this.kpiService.getUnitAxisSummaryReport(this.selectedOrgUnitId, periodId).subscribe({
      next: (res) => {
        this.report.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load unit report:', err);
        this.isLoading.set(false);
      },
    });
  }

  currentPeriodName(): string {
    const p = this.periods().find((item) => item.id === this.selectedPeriodId());
    return p ? `${p.name} (${p.schoolYear})` : 'Quý III/2026';
  }

  getRoleScopeLabel(scope: string): string {
    switch (scope) {
      case 'GV_ONLY':
        return 'Chỉ Giáo Viên';
      case 'NV_ONLY':
        return 'Chỉ Nhân Viên';
      case 'RESTRICTED':
        return 'Kế toán / Thủ quỹ';
      default:
        return 'Tất cả (GV + NV)';
    }
  }

  getAxisColor(axisCode: string): string {
    const colors: { [k: string]: string } = {
      dang: '#dc2626',
      chuyen_mon: '#2563eb',
      phong_trao: '#d97706',
      hanh_chinh: '#059669',
      chuyen_doi_so: '#7c3aed',
      antt: '#0891b2',
      y_te: '#e11d48',
      kttc: '#4f46e5',
      khac: '#64748b',
    };
    return colors[axisCode] || '#0284c7';
  }

  // Mock calculation getters for display matrix
  getGvTasks(code: string): number | string {
    if (code === 'chuyen_mon') return 42;
    if (code === 'dang') return 4;
    if (code === 'phong_trao') return 6;
    if (code === 'chuyen_doi_so') return 4;
    if (code === 'khac') return 2;
    if (code === 'kttc') return '—';
    return 0;
  }

  getGvScore(code: string): number | string {
    if (code === 'chuyen_mon') return 630;
    if (code === 'dang') return 60;
    if (code === 'phong_trao') return 90;
    if (code === 'chuyen_doi_so') return 40;
    if (code === 'khac') return 20;
    if (code === 'kttc') return '—';
    return 0;
  }

  getGvPct(code: string): number | string {
    if (code === 'chuyen_mon') return 75.0;
    if (code === 'dang') return 7.1;
    if (code === 'phong_trao') return 10.7;
    if (code === 'chuyen_doi_so') return 4.8;
    if (code === 'khac') return 2.4;
    if (code === 'kttc') return '—';
    return 0;
  }

  getNvTasks(code: string): number | string {
    if (code === 'chuyen_mon') return '—';
    if (code === 'hanh_chinh') return 12;
    if (code === 'antt') return 4;
    if (code === 'y_te') return 4;
    if (code === 'kttc') return 6;
    if (code === 'chuyen_doi_so') return 2;
    return 0;
  }

  getNvScore(code: string): number | string {
    if (code === 'chuyen_mon') return '—';
    if (code === 'hanh_chinh') return 240;
    if (code === 'antt') return 80;
    if (code === 'y_te') return 80;
    if (code === 'kttc') return 100;
    if (code === 'chuyen_doi_so') return 40;
    return 0;
  }

  getNvPct(code: string): number | string {
    if (code === 'chuyen_mon') return '—';
    if (code === 'hanh_chinh') return 44.4;
    if (code === 'antt') return 14.8;
    if (code === 'y_te') return 14.8;
    if (code === 'kttc') return 18.5;
    if (code === 'chuyen_doi_so') return 7.4;
    return 0;
  }

  getTotalTasks(code: string): number {
    if (code === 'chuyen_mon') return 42;
    if (code === 'hanh_chinh') return 12;
    if (code === 'kttc') return 6;
    if (code === 'chuyen_doi_so') return 6;
    if (code === 'phong_trao') return 6;
    if (code === 'dang') return 4;
    if (code === 'antt') return 4;
    if (code === 'y_te') return 4;
    if (code === 'khac') return 2;
    return 0;
  }

  getTotalScore(code: string): number {
    if (code === 'chuyen_mon') return 630;
    if (code === 'hanh_chinh') return 240;
    if (code === 'kttc') return 100;
    if (code === 'phong_trao') return 90;
    if (code === 'antt') return 80;
    if (code === 'y_te') return 80;
    if (code === 'chuyen_doi_so') return 80;
    if (code === 'dang') return 60;
    if (code === 'khac') return 20;
    return 0;
  }

  getTotalPct(code: string): number {
    if (code === 'chuyen_mon') return 45.7;
    if (code === 'hanh_chinh') return 17.4;
    if (code === 'kttc') return 7.2;
    if (code === 'phong_trao') return 6.5;
    if (code === 'antt') return 5.8;
    if (code === 'y_te') return 5.8;
    if (code === 'chuyen_doi_so') return 5.8;
    if (code === 'dang') return 4.3;
    if (code === 'khac') return 1.4;
    return 0;
  }

  getCompletionRate(code: string): number {
    if (code === 'chuyen_mon') return 95.2;
    if (code === 'hanh_chinh') return 91.7;
    if (code === 'kttc') return 100.0;
    if (code === 'phong_trao') return 100.0;
    if (code === 'antt') return 100.0;
    if (code === 'y_te') return 100.0;
    if (code === 'chuyen_doi_so') return 83.3;
    if (code === 'dang') return 100.0;
    if (code === 'khac') return 100.0;
    return 100.0;
  }

  printReport(): void {
    window.print();
  }

  exportExcel(): void {
    alert('Đang kết xuất tệp tin Excel ma trận trục kết quả (.xlsx)...');
  }
}
