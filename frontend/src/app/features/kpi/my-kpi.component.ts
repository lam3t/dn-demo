import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { KpiService } from '../../core/services/kpi.service';
import { AuthService } from '../../core/services/auth.service';
import { KpiRowItem, KpiSummaryScores, KpiEvaluationSheet, KpiPeriod } from '../../core/models/kpi.models';

@Component({
  selector: 'app-my-kpi',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="my-kpi-container">
      <!-- 1. PAGE HEADER -->
      <div class="page-header hide-on-print">
        <div class="header-left">
          <div class="breadcrumb-row">
            <span class="material-symbols-outlined">monitoring</span>
            <span>Đánh Giá Hiệu Suất & KPI Cá Nhân</span>
          </div>
          <h1 class="page-title">Bảng Tính & Đánh Giá KPI Của Tôi</h1>
          <p class="page-subtitle">
            Tính điểm KPI tự động theo công thức đa tiêu chí (Số lượng, Chất lượng, Tiến độ, Lãnh đạo điều hành) và xuất file Excel chuẩn mẫu
          </p>
        </div>

        <div class="header-right-actions">
          <button
            type="button"
            class="btn-action btn-sync tap-target"
            (click)="importFromMyTasks()"
            [disabled]="isLoading()"
            title="Tự động đồng bộ các nhiệm vụ từ danh sách công việc được giao của bạn"
          >
            <span class="material-symbols-outlined">sync</span>
            <span>Lấy từ việc được giao</span>
          </button>

          <button
            type="button"
            class="btn-action btn-excel tap-target"
            (click)="exportToExcel()"
            [disabled]="isLoading() || rows().length === 0"
            title="Kết xuất bảng tính ra file Excel (.xls) chuẩn từng ô và công thức"
          >
            <span class="material-symbols-outlined excel-icon">table_view</span>
            <span>Xuất file Excel theo mẫu</span>
          </button>
        </div>
      </div>

      <!-- 2. PRINT-ONLY HEADER -->
      <div class="print-header show-on-print-only">
        <div class="print-header-top">
          <div class="print-unit-left">
            <strong>TRƯỜNG TH & THCS PHƯỚC TÂN</strong><br/>
            <span>Đơn vị / Tổ: {{ sheet()?.orgUnitName }}</span>
          </div>
          <div class="print-unit-right">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
            <u>Độc lập - Tự do - Hạnh phúc</u>
          </div>
        </div>
        <h2 class="print-main-title">BẢNG ĐÁNH GIÁ VÀ TÍNH ĐIỂM KPI CÁ NHÂN</h2>
        <p class="print-subtitle">
          Kỳ đánh giá: {{ selectedPeriodLabel }} • Năm học 2026 - 2027 • Họ tên: <strong>{{ sheet()?.userName }}</strong> ({{ sheet()?.userTitle }})
        </p>
      </div>

      <!-- 3. PERIOD SELECTOR & CONTROL BAR -->
      <div class="control-bar-card hide-on-print">
        <div class="control-left">
          <div class="period-select-box">
            <label class="control-label">
              <span class="material-symbols-outlined icon-sm">event</span>
              Kỳ đánh giá KPI:
            </label>
            <select
              class="form-select period-select"
              [ngModel]="selectedPeriod()"
              (ngModelChange)="onPeriodChange($event)"
            >
              <option value="QUY_1">Quý I (Tháng 1 - 3)</option>
              <option value="QUY_2">Quý II (Tháng 4 - 6)</option>
              <option value="QUY_3">Quý III (Tháng 7 - 9)</option>
              <option value="QUY_4">Quý IV (Tháng 10 - 12)</option>
              <option value="HOC_KY_1">Học kỳ I (Năm học 2026 - 2027)</option>
              <option value="HOC_KY_2">Học kỳ II (Năm học 2026 - 2027)</option>
              <option value="NAM_HOC">Cả Năm học 2026 - 2027</option>
            </select>
          </div>

          <div class="user-kpi-badge">
            <span class="material-symbols-outlined user-icon">account_circle</span>
            <span class="user-text">
              <strong>{{ sheet()?.userName }}</strong> ({{ sheet()?.userTitle || 'Cán bộ' }})
            </span>
          </div>
        </div>

        <div class="control-right">
          <button type="button" class="btn-tool btn-add-row" (click)="addNewRow()">
            <span class="material-symbols-outlined">add</span>
            <span>Thêm nhiệm vụ</span>
          </button>

          <button type="button" class="btn-tool btn-save" (click)="saveSheet()">
            <span class="material-symbols-outlined">save</span>
            <span>Lưu bảng tính</span>
          </button>
        </div>
      </div>

      <!-- 4. HIGHLIGHT KPI SCORE CARDS -->
      <div class="kpi-scores-grid">
        <div class="kpi-score-card card-quantity">
          <div class="score-card-top">
            <span class="score-code">A</span>
            <span class="material-symbols-outlined score-icon">format_list_numbered</span>
          </div>
          <div class="score-label">KPI (Số lượng)</div>
          <div class="score-value">{{ summary().scoreA_Quantity }}<span class="unit">%</span></div>
          <div class="score-desc">Quy đổi: {{ summary().totalActualQuantityWeighted }} / {{ summary().totalTargetWeighted }}</div>
        </div>

        <div class="kpi-score-card card-quality">
          <div class="score-card-top">
            <span class="score-code">B</span>
            <span class="material-symbols-outlined score-icon">verified</span>
          </div>
          <div class="score-label">KPI (Chất lượng)</div>
          <div class="score-value">{{ summary().scoreB_Quality }}<span class="unit">%</span></div>
          <div class="score-desc">Tổng điểm: {{ summary().totalQualityWeighted }} / {{ summary().totalTargetWeighted }}</div>
        </div>

        <div class="kpi-score-card card-timeline">
          <div class="score-card-top">
            <span class="score-code">C</span>
            <span class="material-symbols-outlined score-icon">schedule</span>
          </div>
          <div class="score-label">KPI (Tiến độ)</div>
          <div class="score-value">{{ summary().scoreC_Timeline }}<span class="unit">%</span></div>
          <div class="score-desc">Tổng điểm: {{ summary().totalTimelineWeighted }} / {{ summary().totalTargetWeighted }}</div>
        </div>

        <div class="kpi-score-card card-leadership">
          <div class="score-card-top">
            <span class="score-code">D</span>
            <span class="material-symbols-outlined score-icon">diversity_3</span>
          </div>
          <div class="score-label">KPI (Điều hành / Phối hợp)</div>
          <div class="score-value">{{ summary().scoreD_Leadership }}<span class="unit">%</span></div>
          <div class="score-desc">Tổng điểm: {{ summary().totalLeadershipWeighted }} / {{ summary().totalTargetWeighted }}</div>
        </div>

        <div class="kpi-score-card card-final-total">
          <div class="score-card-top">
            <span class="score-code-final">KPI NV1</span>
            <span class="badge-final-rating" [style.background-color]="summary().ratingColor + '20'" [style.color]="summary().ratingColor">
              {{ getRatingBadgeText() }}
            </span>
          </div>
          <div class="score-label-final">ĐIỂM KPI TỔNG HỢP = (A+B+C+D)/4</div>
          <div class="score-value-final">{{ summary().finalScore }}<span class="unit-final">/100</span></div>
          <div class="score-desc-final">{{ summary().ratingCategory }}</div>
        </div>
      </div>

      <!-- 5. MAIN 15-COLUMN KPI EVALUATION TABLE -->
      <div class="kpi-table-section">
        <div class="table-header-bar hide-on-print">
          <div class="table-header-title">
            <span class="material-symbols-outlined icon-navy">table_chart</span>
            <h2>Bảng Chi Tiết Nhiệm Vụ & Điểm Quy Đổi</h2>
            <span class="badge-row-count">{{ rows().length }} nhiệm vụ</span>
          </div>
          <div class="table-helper-tip">
            <span class="material-symbols-outlined tip-icon">edit_note</span>
            <span>Bạn có thể chỉnh sửa trực tiếp số liệu trên từng ô bên dưới, hệ thống sẽ tự động tính toán lại tức thì</span>
          </div>
        </div>

        <div class="table-responsive-wrapper">
          <table class="kpi-data-table">
            <thead>
              <!-- LEVEL 1 HEADERS -->
              <tr>
                <th rowspan="2" class="col-stt">STT</th>
                <th rowspan="2" class="col-task">Nhiệm vụ theo quý / kỳ</th>
                <th rowspan="2" class="col-deliverable">Sản phẩm</th>
                <th rowspan="2" class="col-num col-qty">Số lượng<br/>(N)</th>
                <th rowspan="2" class="col-timeline">Tiến độ</th>
                <th rowspan="2" class="col-num col-weight">Hệ số<br/>quy đổi (W)</th>
                <th rowspan="2" class="col-num col-weighted-qty grp-border-right">Số lượng<br/>quy đổi</th>
                
                <th colspan="2" class="col-group-header header-grp-qty">KPI (Số lượng)</th>
                <th colspan="2" class="col-group-header header-grp-quality">KPI (Chất lượng)</th>
                <th colspan="2" class="col-group-header header-grp-timeline">KPI (Tiến độ)</th>
                <th colspan="2" class="col-group-header header-grp-leadership">KPI (Lãnh đạo, chỉ đạo, điều hành)</th>
                
                <th rowspan="2" class="col-actions hide-on-print">Thao tác</th>
              </tr>

              <!-- LEVEL 2 HEADERS -->
              <tr>
                <th class="sub-header col-num">Thực tế<br/>hoàn thành</th>
                <th class="sub-header col-num col-calc grp-border-right">Quy đổi</th>

                <th class="sub-header col-quality-text">Thực tế hoàn thành</th>
                <th class="sub-header col-num col-calc grp-border-right">Quy đổi</th>

                <th class="sub-header col-timeline-text">Thực tế hoàn thành</th>
                <th class="sub-header col-num col-calc grp-border-right">Quy đổi</th>

                <th class="sub-header col-leadership-text">Thực tế hoàn thành</th>
                <th class="sub-header col-num col-calc grp-border-right">Quy đổi</th>
              </tr>
            </thead>

            <tbody>
              @for (row of rows(); track row.id; let idx = $index) {
                <tr class="kpi-row-item">
                  <!-- STT -->
                  <td class="text-center font-bold cell-stt">{{ idx + 1 }}</td>

                  <!-- Nhiệm vụ (RỘNG RÃI, DỄ ĐỌC) -->
                  <td class="cell-task">
                    <textarea
                      class="inline-textarea task-textarea"
                      rows="2"
                      [(ngModel)]="row.taskTitle"
                      (ngModelChange)="onDataChanged()"
                      placeholder="Nhập tên nhiệm vụ cụ thể..."
                    ></textarea>
                    @if (row.taskCode) {
                      <span class="task-code-tag">{{ row.taskCode }}</span>
                    }
                  </td>

                  <!-- Sản phẩm -->
                  <td class="cell-deliverable">
                    <input
                      type="text"
                      class="inline-input text-center deliverable-input"
                      [(ngModel)]="row.deliverable"
                      (ngModelChange)="onDataChanged()"
                      placeholder="Báo cáo/Kế hoạch"
                    />
                  </td>

                  <!-- Số lượng (N) - GỌN GÀNG -->
                  <td class="cell-qty text-center">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      class="inline-input num-input font-bold"
                      [(ngModel)]="row.targetQuantity"
                      (ngModelChange)="onDataChanged()"
                    />
                  </td>

                  <!-- Tiến độ -->
                  <td class="cell-timeline text-center">
                    <input
                      type="text"
                      class="inline-input text-center timeline-input"
                      [(ngModel)]="row.timeline"
                      (ngModelChange)="onDataChanged()"
                      placeholder="Hàng tháng/Quý"
                    />
                  </td>

                  <!-- Hệ số quy đổi (W) - GỌN GÀNG -->
                  <td class="cell-weight text-center">
                    <input
                      type="number"
                      min="0.5"
                      max="5"
                      step="0.5"
                      class="inline-input num-input font-bold highlight-coeff"
                      [(ngModel)]="row.weightCoefficient"
                      (ngModelChange)="onDataChanged()"
                    />
                  </td>

                  <!-- Số lượng quy đổi (N * W) -->
                  <td class="text-center font-bold cell-calc-result grp-border-right">
                    {{ row.targetWeightedQuantity }}
                  </td>

                  <!-- 1. KPI Số lượng -->
                  <td class="cell-input-num text-center">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      class="inline-input num-input"
                      [(ngModel)]="row.actualQuantityVal"
                      (ngModelChange)="onActualQuantityValChanged(row)"
                      placeholder="SL"
                    />
                  </td>
                  <td class="text-center font-bold cell-calc-result grp-border-right">
                    {{ row.actualWeightedQuantity }}
                  </td>

                  <!-- 2. KPI Chất lượng -->
                  <td class="cell-quality-note">
                    <input
                      type="text"
                      class="inline-input text-left quality-text-input"
                      [(ngModel)]="row.qualityNote"
                      (ngModelChange)="onDataChanged()"
                      placeholder="Ghi chú chất lượng (ví dụ: sửa đổi 1-2 lần)..."
                    />
                  </td>
                  <td class="cell-score-num text-center grp-border-right">
                    <input
                      type="number"
                      step="0.5"
                      class="inline-input num-input font-bold score-input"
                      [(ngModel)]="row.qualityWeightedScore"
                      (ngModelChange)="onDataChanged()"
                    />
                  </td>

                  <!-- 3. KPI Tiến độ -->
                  <td class="cell-timeline-note text-center">
                    <input
                      type="text"
                      class="inline-input text-center timeline-text-input"
                      [(ngModel)]="row.timelineNote"
                      (ngModelChange)="onDataChanged()"
                      placeholder="Đúng hạn"
                    />
                  </td>
                  <td class="cell-score-num text-center grp-border-right">
                    <input
                      type="number"
                      step="0.5"
                      class="inline-input num-input font-bold score-input"
                      [(ngModel)]="row.timelineWeightedScore"
                      (ngModelChange)="onDataChanged()"
                    />
                  </td>

                  <!-- 4. KPI Lãnh đạo điều hành -->
                  <td class="cell-leadership-note text-center">
                    <input
                      type="text"
                      class="inline-input text-center leadership-text-input"
                      [(ngModel)]="row.leadershipNote"
                      (ngModelChange)="onDataChanged()"
                      placeholder="Chủ động"
                    />
                  </td>
                  <td class="cell-score-num text-center grp-border-right">
                    <input
                      type="number"
                      step="0.5"
                      class="inline-input num-input font-bold score-input"
                      [(ngModel)]="row.leadershipWeightedScore"
                      (ngModelChange)="onDataChanged()"
                    />
                  </td>

                  <!-- Actions -->
                  <td class="cell-actions text-center hide-on-print">
                    <div class="row-action-buttons">
                      <button
                        type="button"
                        class="btn-row-action btn-dup"
                        (click)="duplicateRow(idx)"
                        title="Nhân bản dòng này"
                      >
                        <span class="material-symbols-outlined">content_copy</span>
                      </button>
                      <button
                        type="button"
                        class="btn-row-action btn-del"
                        (click)="deleteRow(idx)"
                        title="Xóa nhiệm vụ này"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }

              <!-- DÒNG TỔNG CỘNG CHÂN TRANG (RED HIGHLIGHTED SUM) -->
              <tr class="kpi-footer-sum-row">
                <td colspan="6" class="text-center font-bold footer-label">TỔNG CỘNG</td>
                <td class="text-center font-bold sum-target-red grp-border-right">{{ summary().totalTargetWeighted }}</td>
                <td class="text-center text-muted">-</td>
                <td class="text-center font-bold sum-val grp-border-right">{{ summary().totalActualQuantityWeighted }}</td>
                <td class="text-center text-muted">-</td>
                <td class="text-center font-bold sum-val grp-border-right">{{ summary().totalQualityWeighted }}</td>
                <td class="text-center text-muted">-</td>
                <td class="text-center font-bold sum-val grp-border-right">{{ summary().totalTimelineWeighted }}</td>
                <td class="text-center text-muted">-</td>
                <td class="text-center font-bold sum-val grp-border-right">{{ summary().totalLeadershipWeighted }}</td>
                <td class="hide-on-print"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 6. SUMMARY SCORES TABLE & SIGNATURES (MATCHING EXACT PHOTO FORMAT) -->
      <div class="summary-bottom-section">
        <!-- LEFT: KPI FORMULA & RESULTS TABLE -->
        <div class="summary-box-card">
          <h3 class="summary-card-title">
            <span class="material-symbols-outlined">calculate</span>
            Bảng Tổng Hợp Điểm KPI & Công Thức Tính
          </h3>

          <table class="summary-results-table">
            <tbody>
              <tr>
                <td class="col-metric-name font-bold">KPI (SỐ LƯỢNG)</td>
                <td class="col-metric-code text-center font-bold">A</td>
                <td class="col-metric-val text-right font-bold">{{ summary().scoreA_Quantity }}</td>
              </tr>
              <tr>
                <td class="col-metric-name font-bold">KPI (CHẤT LƯỢNG)</td>
                <td class="col-metric-code text-center font-bold">B</td>
                <td class="col-metric-val text-right font-bold">{{ summary().scoreB_Quality }}</td>
              </tr>
              <tr>
                <td class="col-metric-name font-bold">KPI (TIẾN ĐỘ)</td>
                <td class="col-metric-code text-center font-bold">C</td>
                <td class="col-metric-val text-right font-bold">{{ summary().scoreC_Timeline }}</td>
              </tr>
              <tr>
                <td class="col-metric-name font-bold">KPI LÃNH ĐẠO ĐIỀU HÀNH</td>
                <td class="col-metric-code text-center font-bold">D</td>
                <td class="col-metric-val text-right font-bold">{{ summary().scoreD_Leadership }}</td>
              </tr>
              <tr class="row-final-kpi">
                <td class="col-metric-name font-bold highlight-kpi-text">KPI TỔNG HỢP (KPI NV1)</td>
                <td class="col-metric-code text-center font-bold highlight-kpi-text">KPI NV1</td>
                <td class="col-metric-val text-right font-bold highlight-kpi-text font-lg">{{ summary().finalScore }}</td>
              </tr>
              <tr class="row-rating-cat">
                <td colspan="2" class="col-metric-name font-bold">XẾP LOẠI HOÀN THÀNH</td>
                <td class="col-metric-val text-right font-bold" [style.color]="summary().ratingColor">
                  {{ summary().ratingCategory }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="formula-instruction-box">
            <span class="material-symbols-outlined info-icon">info</span>
            <span class="formula-text"><strong>Công thức tính điểm KPI theo hướng dẫn:</strong> (A + B + C + D) / 4</span>
          </div>
        </div>

        <!-- RIGHT: SIGNATURES BLOCK -->
        <div class="signatures-box-card">
          <div class="sign-column">
            <div class="sign-title">NGƯỜI TỰ ĐÁNH GIÁ</div>
            <div class="sign-subtitle">(Ký và ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name"><strong>{{ sheet()?.userName }}</strong></div>
            <div class="sign-role">{{ sheet()?.userTitle }}</div>
          </div>

          <div class="sign-column">
            <div class="sign-title">T/M BAN THƯỜNG VỤ / THỦ TRƯỞNG ĐƠN VỊ</div>
            <div class="sign-subtitle">(Ký, đóng dấu và ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name"><strong>Cô Phạm Thị Nam</strong></div>
            <div class="sign-role">Hiệu trưởng</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .my-kpi-container {
        padding: 24px;
        background: #F8FAFC;
        min-height: calc(100vh - 64px);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #1E293B;

        @media (max-width: 768px) {
          padding: 14px;
        }
      }

      /* 1. PAGE HEADER */
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 20px;
        flex-wrap: wrap;

        .header-left {
          flex: 1;
          min-width: 280px;

          .breadcrumb-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.82rem;
            font-weight: 700;
            color: #1F3864;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;

            .material-symbols-outlined {
              font-size: 18px;
              color: #2563EB;
            }
          }

          .page-title {
            font-size: 1.6rem;
            font-weight: 800;
            color: #1F3864;
            margin: 0 0 6px 0;
            letter-spacing: -0.02em;
          }

          .page-subtitle {
            font-size: 0.9rem;
            color: #64748B;
            margin: 0;
            line-height: 1.45;
          }
        }

        .header-right-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;

          .btn-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 9px 16px;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);

            .material-symbols-outlined {
              font-size: 19px;
            }

            &.btn-sync {
              background: #EEF4FC;
              color: #1F3864;
              border: 1px solid #BFDBFE;

              &:hover {
                background: #DBEAFE;
              }
            }

            &.btn-sample {
              background: #FEF3C7;
              color: #92400E;
              border: 1px solid #FDE68A;

              &:hover {
                background: #FDE68A;
              }
            }

            &.btn-print {
              background: #F1F5F9;
              color: #334155;
              border: 1px solid #CBD5E1;

              &:hover {
                background: #E2E8F0;
              }
            }

            &.btn-excel {
              background: #107C41;
              color: #FFFFFF;

              &:hover {
                background: #0E6B37;
                box-shadow: 0 4px 12px rgba(16, 124, 65, 0.25);
              }
            }
          }
        }
      }

      /* 2. PRINT-ONLY HEADER */
      .print-header {
        display: none;
      }

      /* 3. CONTROL BAR */
      .control-bar-card {
        background: #FFFFFF;
        border: 1.5px solid #E2E8F0;
        border-radius: 14px;
        padding: 12px 18px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        flex-wrap: wrap;

        .control-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;

          .period-select-box {
            display: flex;
            align-items: center;
            gap: 8px;

            .control-label {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 0.85rem;
              font-weight: 700;
              color: #1F3864;
              white-space: nowrap;

              .icon-sm {
                font-size: 18px;
                color: #2563EB;
              }
            }

            .period-select {
              padding: 7px 14px;
              border-radius: 8px;
              border: 1.5px solid #CBD5E1;
              background: #F8FAFC;
              font-size: 0.88rem;
              font-weight: 700;
              color: #0F172A;
              cursor: pointer;
              outline: none;

              &:focus {
                border-color: #1F3864;
                background: #FFFFFF;
              }
            }
          }

          .user-kpi-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: #F1F5F9;
            border-radius: 9999px;
            font-size: 0.82rem;
            color: #475569;

            .user-icon {
              font-size: 18px;
              color: #1F3864;
            }
          }
        }

        .control-right {
          display: flex;
          align-items: center;
          gap: 10px;

          .btn-tool {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;

            .material-symbols-outlined {
              font-size: 18px;
            }

            &.btn-add-row {
              background: #EEF4FC;
              color: #1E40AF;
              border: 1px solid #BFDBFE;

              &:hover {
                background: #DBEAFE;
              }
            }

            &.btn-save {
              background: #1F3864;
              color: #FFFFFF;
              border: none;

              &:hover {
                background: #152747;
              }
            }
          }
        }
      }

      /* 4. KPI SCORES GRID */
      .kpi-scores-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr) 1.4fr;
        gap: 14px;
        margin-bottom: 22px;

        @media (max-width: 1200px) {
          grid-template-columns: repeat(2, 1fr) 1fr;
        }

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }

        .kpi-score-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;

          .score-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;

            .score-code {
              width: 28px;
              height: 28px;
              border-radius: 8px;
              background: #EEF4FC;
              color: #1F3864;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.85rem;
              font-weight: 800;
            }

            .score-icon {
              font-size: 22px;
              color: #94A3B8;
            }
          }

          .score-label {
            font-size: 0.8rem;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 4px;
          }

          .score-value {
            font-size: 1.7rem;
            font-weight: 800;
            color: #0F172A;
            line-height: 1.2;
            margin-bottom: 6px;

            .unit {
              font-size: 1rem;
              color: #64748B;
              font-weight: 600;
              margin-left: 2px;
            }
          }

          .score-desc {
            font-size: 0.76rem;
            color: #94A3B8;
            font-weight: 500;
          }

          /* Theme variations */
          &.card-quantity { border-top: 4px solid #2563EB; }
          &.card-quality { border-top: 4px solid #10B981; }
          &.card-timeline { border-top: 4px solid #F59E0B; }
          &.card-leadership { border-top: 4px solid #8B5CF6; }

          &.card-final-total {
            background: linear-gradient(135deg, #1F3864 0%, #152747 100%);
            color: #FFFFFF;
            border: none;
            box-shadow: 0 4px 20px rgba(31, 56, 100, 0.2);

            .score-code-final {
              font-size: 0.8rem;
              font-weight: 800;
              color: #93C5FD;
              letter-spacing: 0.5px;
            }

            .badge-final-rating {
              font-size: 0.72rem;
              font-weight: 800;
              padding: 3px 9px;
              border-radius: 9999px;
              background: rgba(255, 255, 255, 0.15) !important;
              color: #FFFFFF !important;
            }

            .score-label-final {
              font-size: 0.72rem;
              font-weight: 700;
              color: #BFDBFE;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }

            .score-value-final {
              font-size: 2.1rem;
              font-weight: 900;
              color: #F8FAFC;
              line-height: 1.1;
              margin-bottom: 4px;

              .unit-final {
                font-size: 1rem;
                color: #94A3B8;
                font-weight: 600;
                margin-left: 3px;
              }
            }

            .score-desc-final {
              font-size: 0.8rem;
              color: #93C5FD;
              font-weight: 600;
            }
          }
        }
      }

      /* 5. MAIN 15-COLUMN TABLE */
      .kpi-table-section {
        background: #FFFFFF;
        border: 1.5px solid #E2E8F0;
        border-radius: 14px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        overflow: hidden;
        margin-bottom: 22px;

        .table-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: #F8FAFC;
          border-bottom: 1.5px solid #E2E8F0;
          flex-wrap: wrap;
          gap: 10px;

          .table-header-title {
            display: flex;
            align-items: center;
            gap: 8px;

            .icon-navy {
              font-size: 22px;
              color: #1F3864;
            }

            h2 {
              font-size: 1.05rem;
              font-weight: 800;
              color: #1E293B;
              margin: 0;
            }

            .badge-row-count {
              font-size: 0.75rem;
              font-weight: 700;
              background: #EEF4FC;
              color: #1E40AF;
              padding: 2px 8px;
              border-radius: 9999px;
            }
          }

          .table-helper-tip {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.78rem;
            color: #64748B;

            .tip-icon {
              font-size: 16px;
              color: #2563EB;
            }
          }
        }

        .table-responsive-wrapper {
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .kpi-data-table {
          width: 100%;
          min-width: 1280px;
          border-collapse: collapse;
          font-size: 0.84rem;

          th, td {
            border: 1px solid #CBD5E1;
            padding: 6px 8px;
            vertical-align: middle;
          }

          /* Visual Group Separators */
          .grp-border-right {
            border-right: 2px solid #94A3B8 !important;
          }

          thead th {
            background: #F1F5F9;
            color: #1E293B;
            font-weight: 800;
            text-align: center;
            font-size: 0.78rem;
            line-height: 1.3;
            padding: 6px 4px;

            &.col-stt { width: 40px; min-width: 40px; }
            &.col-task { width: 34%; min-width: 360px; max-width: 500px; text-align: left; padding-left: 12px; }
            &.col-deliverable { width: 95px; min-width: 95px; }
            &.col-timeline { width: 90px; min-width: 90px; }
            &.col-num { width: 52px; min-width: 52px; max-width: 56px; }
            &.col-quality-text { min-width: 140px; }
            &.col-timeline-text { width: 85px; min-width: 85px; }
            &.col-leadership-text { width: 85px; min-width: 85px; }
            &.col-actions { width: 65px; min-width: 65px; }

            &.col-group-header {
              font-size: 0.82rem;
              padding: 6px;
            }
            &.header-grp-qty { background: #EEF4FC; color: #1E40AF; }
            &.header-grp-quality { background: #ECFDF5; color: #065F46; }
            &.header-grp-timeline { background: #FFFBEB; color: #92400E; }
            &.header-grp-leadership { background: #F5F3FF; color: #5B21B6; }

            &.sub-header {
              font-size: 0.72rem;
              font-weight: 700;
              padding: 4px;
            }

            &.col-calc {
              background: #E2E8F0;
              color: #0F172A;
            }
          }

          tbody tr {
            transition: background-color 0.12s ease;

            &:nth-child(even) {
              background-color: #F8FAFC;
            }

            &:hover {
              background-color: #EFF6FF !important;
            }
          }

          /* CELL SPECIFIC STYLES */
          .cell-stt { width: 40px; font-size: 0.82rem; color: #64748B; }
          .cell-task { min-width: 360px; }
          .cell-deliverable { width: 95px; }
          .cell-timeline { width: 90px; }
          .cell-qty, .cell-weight, .cell-input-num, .cell-score-num { width: 52px; min-width: 52px; max-width: 56px; }
          .cell-quality-note { min-width: 140px; }
          .cell-timeline-note { width: 85px; min-width: 85px; }
          .cell-leadership-note { width: 85px; min-width: 85px; }

          .inline-input, .inline-textarea {
            border: 1px solid transparent;
            background: transparent;
            border-radius: 6px;
            padding: 4px 6px;
            font-size: 0.83rem;
            font-family: inherit;
            color: #1E293B;
            outline: none;
            transition: all 0.15s ease;

            &:hover {
              border-color: #CBD5E1;
              background: #FFFFFF;
            }

            &:focus {
              border-color: #2563EB;
              background: #FFFFFF;
              box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
            }
          }

          .task-textarea {
            width: 100%;
            min-height: 48px;
            font-size: 0.86rem;
            font-weight: 600;
            line-height: 1.4;
            resize: vertical;
            padding: 6px 8px;
          }

          /* COMPACT NUMBER INPUTS */
          .num-input {
            width: 44px;
            max-width: 44px;
            padding: 3px 2px;
            text-align: center;
            font-size: 0.82rem;
            font-weight: 700;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            background: #FFFFFF;
            display: block;
            margin: 0 auto;

            /* Hide number spinners for compactness */
            &::-webkit-inner-spin-button,
            &::-webkit-outer-spin-button {
              opacity: 0.3;
            }

            &.highlight-coeff {
              background: #FEF3C7;
              color: #92400E;
              border: 1px solid #FDE68A;
            }

            &.score-input {
              background: #F8FAFC;
              border: 1px solid #CBD5E1;
              color: #1E40AF;
            }
          }

          .deliverable-input, .timeline-input, .timeline-text-input, .leadership-text-input {
            width: 100%;
            font-size: 0.8rem;
          }

          .quality-text-input {
            width: 100%;
            font-size: 0.82rem;
          }

          .task-code-tag {
            display: inline-block;
            font-size: 0.68rem;
            font-weight: 700;
            background: #E2E8F0;
            color: #475569;
            padding: 1px 5px;
            border-radius: 4px;
            margin-top: 2px;
          }

          .cell-calc-result {
            background: #F1F5F9;
            color: #0F172A;
            font-size: 0.85rem;
            font-weight: 800;
          }

          .row-action-buttons {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;

            .btn-row-action {
              background: transparent;
              border: none;
              cursor: pointer;
              padding: 3px;
              border-radius: 5px;
              color: #64748B;
              transition: all 0.15s ease;

              .material-symbols-outlined {
                font-size: 16px;
              }

              &.btn-dup:hover {
                background: #EEF4FC;
                color: #2563EB;
              }

              &.btn-del:hover {
                background: #FEE2E2;
                color: #DC2626;
              }
            }
          }

          /* FOOTER SUM ROW */
          .kpi-footer-sum-row {
            background: #E2E8F0;
            border-top: 2.5px solid #64748B;

            td {
              padding: 8px 6px;
              font-size: 0.88rem;
            }

            .footer-label {
              font-size: 0.9rem;
              color: #1F3864;
              letter-spacing: 0.5px;
            }

            .sum-target-red {
              color: #DC2626 !important;
              font-size: 1.05rem !important;
              font-weight: 900 !important;
              background: #FEF2F2 !important;
            }

            .sum-val {
              color: #1F3864;
              font-size: 0.92rem;
              font-weight: 800;
            }

            .text-muted {
              color: #94A3B8;
            }
          }
        }
      }

      /* 6. SUMMARY RESULTS & SIGNATURES SECTION */
      .summary-bottom-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;

        @media (max-width: 900px) {
          grid-template-columns: 1fr;
        }

        .summary-box-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);

          .summary-card-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.05rem;
            font-weight: 800;
            color: #1F3864;
            margin: 0 0 16px 0;

            .material-symbols-outlined {
              font-size: 22px;
              color: #2563EB;
            }
          }

          .summary-results-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
            margin-bottom: 14px;

            td {
              border: 1px solid #CBD5E1;
              padding: 8px 12px;
            }

            .col-metric-name { color: #1E293B; }
            .col-metric-code { width: 60px; color: #1F3864; }
            .col-metric-val { width: 100px; color: #0F172A; }

            .row-final-kpi {
              background: #F8FAFC;

              .highlight-kpi-text {
                color: #DC2626 !important;
                font-weight: 900;
              }

              .font-lg {
                font-size: 1.15rem;
              }
            }

            .row-rating-cat {
              background: #FFFFFF;
            }
          }

          .formula-instruction-box {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            background: #EEF4FC;
            border-radius: 8px;
            font-size: 0.85rem;
            color: #1F3864;

            .info-icon {
              font-size: 20px;
              color: #2563EB;
            }
          }
        }

        .signatures-box-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          display: flex;
          justify-content: space-around;
          text-align: center;

          .sign-column {
            flex: 1;

            .sign-title {
              font-size: 0.9rem;
              font-weight: 800;
              color: #1E293B;
              text-transform: uppercase;
              margin-bottom: 4px;
            }

            .sign-subtitle {
              font-size: 0.78rem;
              font-style: italic;
              color: #64748B;
            }

            .sign-space {
              height: 70px;
            }

            .sign-name {
              font-size: 0.95rem;
              color: #1F3864;
            }

            .sign-role {
              font-size: 0.8rem;
              color: #64748B;
            }
          }
        }
      }

      /* PRINT STYLES */
      @media print {
        .hide-on-print { display: none !important; }
        .show-on-print-only { display: block !important; }

        .my-kpi-container {
          background: #FFFFFF !important;
          padding: 0 !important;
          font-family: 'Times New Roman', Times, serif !important;
        }

        .print-header {
          margin-bottom: 15px;

          .print-header-top {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            margin-bottom: 10px;
          }

          .print-main-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 10px 0 4px 0;
          }

          .print-subtitle {
            text-align: center;
            font-size: 10pt;
            font-style: italic;
            margin: 0;
          }
        }

        .kpi-scores-grid {
          display: none !important;
        }

        .kpi-table-section {
          border: none !important;
          box-shadow: none !important;

          .kpi-data-table {
            font-size: 8.5pt !important;

            th, td {
              border: 1px solid #000000 !important;
              padding: 4px !important;
            }

            thead th {
              background: #F1F5F9 !important;
              color: #000000 !important;
            }

            .inline-input, .inline-textarea {
              font-size: 8.5pt !important;
              padding: 0 !important;
            }
          }
        }

        .summary-bottom-section {
          display: flex !important;
          justify-content: space-between !important;
          border: none !important;

          .summary-box-card {
            width: 50% !important;
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;

            .summary-results-table {
              font-size: 9pt !important;
              td { border: 1px solid #000000 !important; padding: 3px 6px !important; }
            }
          }

          .signatures-box-card {
            width: 45% !important;
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      }
    `,
  ],
})
export class MyKpiComponent implements OnInit {
  private kpiService = inject(KpiService);
  private authService = inject(AuthService);

  isLoading = signal(true);
  selectedPeriod = signal<KpiPeriod>('QUY_3');
  sheet = signal<KpiEvaluationSheet | null>(null);
  rows = signal<KpiRowItem[]>([]);
  summary = signal<KpiSummaryScores>({
    totalTargetWeighted: 0,
    totalActualQuantityWeighted: 0,
    totalQualityWeighted: 0,
    totalTimelineWeighted: 0,
    totalLeadershipWeighted: 0,
    scoreA_Quantity: 0,
    scoreB_Quality: 0,
    scoreC_Timeline: 0,
    scoreD_Leadership: 0,
    finalScore: 0,
    ratingCategory: '',
    ratingColor: '#16A34A',
  });

  get selectedPeriodLabel(): string {
    return this.kpiService.getPeriodLabel(this.selectedPeriod());
  }

  ngOnInit() {
    this.loadSheetData();
  }

  loadSheetData() {
    this.isLoading.set(true);
    this.kpiService.loadEvaluationSheet(this.selectedPeriod()).subscribe({
      next: (data) => {
        this.sheet.set(data);
        this.rows.set(data.rows);
        this.summary.set(data.summary);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onPeriodChange(newPeriod: KpiPeriod) {
    this.selectedPeriod.set(newPeriod);
    this.loadSheetData();
  }

  onDataChanged() {
    const currentRows = this.rows();
    const recalculated = this.kpiService.recalculateSheet(currentRows);
    this.rows.set(recalculated.rows);
    this.summary.set(recalculated.summary);
  }

  onActualQuantityValChanged(row: KpiRowItem) {
    // Tự động gán điểm quy đổi mặc định nếu chưa chỉnh sửa
    row.actualQuantityNote = `${row.actualQuantityVal}`;
    this.onDataChanged();
  }

  addNewRow() {
    const newRow: KpiRowItem = {
      id: `kpi-row-custom-${Date.now()}`,
      stt: this.rows().length + 1,
      taskTitle: 'Nhiệm vụ mới',
      deliverable: 'Báo cáo',
      targetQuantity: 1,
      timeline: 'Hàng tháng',
      weightCoefficient: 1.0,
      targetWeightedQuantity: 1.0,
      actualQuantityNote: '1',
      actualQuantityVal: 1,
      actualWeightedQuantity: 1.0,
      qualityNote: 'Đạt chuẩn',
      qualityWeightedScore: 1.0,
      timelineNote: 'Đúng hạn',
      timelineWeightedScore: 1.0,
      leadershipNote: 'Chủ động',
      leadershipWeightedScore: 1.0,
    };

    this.rows.update((r) => [...r, newRow]);
    this.onDataChanged();
  }

  duplicateRow(index: number) {
    const target = this.rows()[index];
    if (!target) return;

    const copy: KpiRowItem = {
      ...target,
      id: `kpi-row-copy-${Date.now()}`,
      taskTitle: `${target.taskTitle} (Bản sao)`,
    };

    this.rows.update((r) => {
      const next = [...r];
      next.splice(index + 1, 0, copy);
      return next;
    });
    this.onDataChanged();
  }

  deleteRow(index: number) {
    if (this.rows().length <= 1) {
      alert('Bảng đánh giá cần có tối thiểu 1 nhiệm vụ.');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này khỏi bảng đánh giá KPI?')) {
      this.rows.update((r) => r.filter((_, i) => i !== index));
      this.onDataChanged();
    }
  }

  loadSampleFromImage() {
    const sampleRows = this.kpiService.getSampleDataFromImage();
    const recalculated = this.kpiService.recalculateSheet(sampleRows);
    this.rows.set(recalculated.rows);
    this.summary.set(recalculated.summary);
  }

  importFromMyTasks() {
    this.isLoading.set(true);
    this.kpiService.importFromAssignedTasks(this.selectedPeriod()).subscribe({
      next: (importedRows) => {
        const recalculated = this.kpiService.recalculateSheet(importedRows);
        this.rows.set(recalculated.rows);
        this.summary.set(recalculated.summary);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  saveSheet() {
    const cur = this.sheet();
    if (!cur) return;

    const updatedSheet: KpiEvaluationSheet = {
      ...cur,
      period: this.selectedPeriod(),
      periodLabel: this.selectedPeriodLabel,
      rows: this.rows(),
      summary: this.summary(),
      updatedAt: new Date().toISOString(),
    };

    this.kpiService.saveEvaluationSheet(updatedSheet);
    this.sheet.set(updatedSheet);
    alert('Đã lưu bảng tính KPI thành công!');
  }

  exportToExcel() {
    const cur = this.sheet();
    if (!cur) return;

    const fullSheet: KpiEvaluationSheet = {
      ...cur,
      period: this.selectedPeriod(),
      periodLabel: this.selectedPeriodLabel,
      rows: this.rows(),
      summary: this.summary(),
      updatedAt: new Date().toISOString(),
    };

    this.kpiService.exportToExcel(fullSheet);
  }

  printReport() {
    window.print();
  }

  getRatingBadgeText(): string {
    const s = this.summary().finalScore;
    if (s >= 90) return 'Loại A (Xuất sắc)';
    if (s >= 80) return 'Loại B (Tốt)';
    if (s >= 65) return 'Loại C (Hoàn thành)';
    return 'Loại D';
  }
}
