import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { KpiService } from '../../core/services/kpi.service';
import { AuthService } from '../../core/services/auth.service';
import { KpiRowItem, KpiSummaryScores, KpiEvaluationSheet, KpiPeriod } from '../../core/models/kpi.models';

export type KpiViewTab = 'CA_NHAN' | 'TO_BO_PHAN' | 'TOAN_TRUONG';

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
            <span>Đánh Giá Hiệu Suất & KPI Đa Cấp</span>
          </div>
          <h1 class="page-title">Hệ Thống Đánh Giá & Tính Điểm KPI</h1>
          <p class="page-subtitle">
            Tính điểm KPI tự động theo công thức đa tiêu chí (Số lượng, Chất lượng, Tiến độ, Lãnh đạo điều hành) & Xuất Excel chuẩn Bộ GD&ĐT
          </p>
        </div>

        <div class="header-right-actions">
          <button
            type="button"
            class="btn-action btn-recompute tap-target"
            (click)="triggerBackendRecompute()"
            [disabled]="isLoading() || isRecomputing()"
            title="Kích hoạt tự động quét và tính toán lại toàn bộ KPI từ Nhật ký & Tiến độ Công việc"
          >
            <span class="material-symbols-outlined" [class.spinning]="isRecomputing()">bolt</span>
            <span>{{ isRecomputing() ? 'Đang tính toán...' : 'Tính lại KPI tự động' }}</span>
          </button>

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
            [disabled]="isLoading()"
            title="Kết xuất bảng tính ra file Excel (.xlsx / .xls) chuẩn mẫu 15 cột"
          >
            <span class="material-symbols-outlined excel-icon">table_view</span>
            <span>Xuất file Excel theo mẫu</span>
          </button>

          <button
            type="button"
            class="btn-action btn-print tap-target"
            (click)="printReport()"
            title="In hoặc xuất bảng điểm sang file PDF"
          >
            <span class="material-symbols-outlined">print</span>
            <span>In bảng điểm</span>
          </button>
        </div>
      </div>

      <!-- 2. VIEW TAB SWITCHER (CÁ NHÂN / TỔ CHUYÊN MÔN / TOÀN TRƯỜNG) -->
      <div class="view-tabs-card hide-on-print">
        <div class="view-tabs-list">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'CA_NHAN'"
            (click)="switchTab('CA_NHAN')"
          >
            <span class="material-symbols-outlined">person</span>
            <span>KPI Cá Nhân Của Tôi</span>
          </button>

          @if (canViewOrgUnit()) {
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'TO_BO_PHAN'"
              (click)="switchTab('TO_BO_PHAN')"
            >
              <span class="material-symbols-outlined">group_work</span>
              <span>KPI Tổ Chuyên Môn / Bộ Phận</span>
              <span class="tab-badge">{{ currentOrgUnitName() }}</span>
            </button>
          }

          @if (canViewSchool()) {
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'TOAN_TRUONG'"
              (click)="switchTab('TOAN_TRUONG')"
            >
              <span class="material-symbols-outlined">domain</span>
              <span>KPI Toàn Trường</span>
              <span class="tab-badge highlight">Ban Giám Hiệu</span>
            </button>
          }
        </div>

        <div class="tab-period-picker">
          <label class="period-label">
            <span class="material-symbols-outlined icon-sm">event</span>
            Kỳ đánh giá:
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
            <option value="HOC_KY_1">Học kỳ I (2026 - 2027)</option>
            <option value="HOC_KY_2">Học kỳ II (2026 - 2027)</option>
            <option value="NAM_HOC">Cả Năm học 2026 - 2027</option>
          </select>
        </div>
      </div>

      <!-- ================= TAB 1: KPI CÁ NHÂN ================= -->
      @if (activeTab() === 'CA_NHAN') {
        <!-- 3. AUTOMATED BACKEND KPI SCAN SUMMARY BANNER -->
        @if (backendKpiSummary()) {
          <div class="auto-kpi-banner hide-on-print">
            <div class="banner-icon-box">
              <span class="material-symbols-outlined">auto_awesome</span>
            </div>
            <div class="banner-content">
              <div class="banner-title">
                Kết Quả Quét Tự Động Từ Tiến Độ Công Việc
                <span class="badge-source">Dữ liệu nguồn tự động 100%</span>
              </div>
              <div class="banner-stats-row">
                <div class="stat-pill pill-total">
                  <span class="pill-label">Tổng việc:</span>
                  <strong>{{ backendKpiSummary()?.totalTasks || 0 }}</strong>
                </div>
                <div class="stat-pill pill-before">
                  <span class="pill-label">Sớm hạn:</span>
                  <strong>{{ backendKpiSummary()?.completedBeforeDeadline || 0 }}</strong>
                </div>
                <div class="stat-pill pill-ontime">
                  <span class="pill-label">Đúng hạn:</span>
                  <strong>{{ backendKpiSummary()?.completedOnTime || 0 }}</strong>
                </div>
                <div class="stat-pill pill-late">
                  <span class="pill-label">Trễ hạn:</span>
                  <strong>{{ backendKpiSummary()?.completedLate || 0 }}</strong>
                </div>
                <div class="stat-pill pill-uncompleted">
                  <span class="pill-label">Chưa xong:</span>
                  <strong>{{ backendKpiSummary()?.uncompletedTasks || 0 }}</strong>
                </div>
                <div class="stat-pill pill-grade" [style.color]="getGradeBadgeColor(backendKpiSummary()?.finalGrade)">
                  <span class="pill-label">Xếp loại tự động:</span>
                  <strong>{{ getGradeLabel(backendKpiSummary()?.finalGrade) }}</strong>
                </div>
              </div>
            </div>
          </div>
        }

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
            <div class="table-actions-right">
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

                    <!-- Nhiệm vụ -->
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

                    <!-- Số lượng (N) -->
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

                    <!-- Hệ số quy đổi (W) -->
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
                      />
                    </td>
                    <td class="cell-calc-result text-center font-bold grp-border-right">
                      {{ row.actualWeightedQuantity }}
                    </td>

                    <!-- 2. KPI Chất lượng -->
                    <td class="cell-quality-note">
                      <input
                        type="text"
                        class="inline-input quality-text-input"
                        [(ngModel)]="row.qualityNote"
                        (ngModelChange)="onDataChanged()"
                        placeholder="Đạt chuẩn / Phải sửa đổi..."
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

                    <!-- 4. KPI Lãnh đạo điều hành / Phối hợp -->
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

        <!-- 6. SUMMARY SCORES TABLE & SIGNATURES -->
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
      }

      <!-- ================= TAB 2: KPI TỔ CHUYÊN MÔN / BỘ PHẬN ================= -->
      @if (activeTab() === 'TO_BO_PHAN') {
        <div class="department-kpi-section">
          <!-- ORG UNIT SUMMARY CARDS -->
          <div class="dept-summary-cards">
            <div class="dept-card">
              <div class="dept-card-icon bg-blue">
                <span class="material-symbols-outlined">group</span>
              </div>
              <div class="dept-card-info">
                <div class="dept-card-label">Tổng số thành viên</div>
                <div class="dept-card-val">{{ orgSummary()?.totalMembers || 0 }} <span class="unit-sub">cán bộ</span></div>
              </div>
            </div>

            <div class="dept-card">
              <div class="dept-card-icon bg-emerald">
                <span class="material-symbols-outlined">grade</span>
              </div>
              <div class="dept-card-info">
                <div class="dept-card-label">Điểm TB Tổ chuyên môn</div>
                <div class="dept-card-val">{{ orgSummary()?.averageScore || 0 }} <span class="unit-sub">/100</span></div>
              </div>
            </div>

            <div class="dept-card">
              <div class="dept-card-icon bg-indigo">
                <span class="material-symbols-outlined">military_tech</span>
              </div>
              <div class="dept-card-info">
                <div class="dept-card-label">Xuất sắc & Tốt</div>
                <div class="dept-card-val">
                  {{ (orgSummary()?.distribution?.xuatSac || 0) + (orgSummary()?.distribution?.tot || 0) }}
                  <span class="unit-sub">thành viên</span>
                </div>
              </div>
            </div>

            <div class="dept-card">
              <div class="dept-card-icon bg-amber">
                <span class="material-symbols-outlined">pending_actions</span>
              </div>
              <div class="dept-card-info">
                <div class="dept-card-label">Cần đôn đốc / Chưa đạt</div>
                <div class="dept-card-val">{{ orgSummary()?.distribution?.chuaDat || 0 }} <span class="unit-sub">thành viên</span></div>
              </div>
            </div>
          </div>

          <!-- MEMBERS KPI SCORECARD TABLE -->
          <div class="dept-members-table-card">
            <div class="table-header-bar">
              <div class="table-header-title">
                <span class="material-symbols-outlined icon-navy">badge</span>
                <h2>Bảng Điểm KPI Thành Viên — {{ orgSummary()?.orgUnit?.name || currentOrgUnitName() }}</h2>
                <span class="badge-row-count">{{ orgSummary()?.members?.length || 0 }} cán bộ</span>
              </div>
            </div>

            <div class="table-responsive-wrapper">
              <table class="dept-members-table">
                <thead>
                  <tr>
                    <th class="col-stt">STT</th>
                    <th>Họ và tên</th>
                    <th>Chức vụ</th>
                    <th class="text-center">A (Số lượng)</th>
                    <th class="text-center">B (Chất lượng)</th>
                    <th class="text-center">C (Tiến độ)</th>
                    <th class="text-center">D (Điều hành)</th>
                    <th class="text-center font-bold">Điểm KPI (NV1)</th>
                    <th class="text-center">Xếp loại</th>
                    <th class="text-center hide-on-print">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  @for (mem of orgSummary()?.members; track mem.user.id; let idx = $index) {
                    <tr>
                      <td class="text-center font-bold">{{ idx + 1 }}</td>
                      <td>
                        <div class="member-user-cell">
                          <img [src]="mem.user.avatar || 'https://ui-avatars.com/api/?name=' + mem.user.fullName" class="user-avatar-sm" alt="Avatar" />
                          <div>
                            <strong>{{ mem.user.fullName }}</strong>
                            <div class="member-phone">{{ mem.user.phone || mem.user.email }}</div>
                          </div>
                        </div>
                      </td>
                      <td>{{ mem.user.title || 'Giáo viên' }}</td>
                      <td class="text-center font-bold">{{ mem.kpi?.scoreA ?? '-' }}</td>
                      <td class="text-center font-bold">{{ mem.kpi?.scoreB ?? '-' }}</td>
                      <td class="text-center font-bold">{{ mem.kpi?.scoreC ?? '-' }}</td>
                      <td class="text-center font-bold">{{ mem.kpi?.scoreD ?? '-' }}</td>
                      <td class="text-center font-bold score-final-cell">{{ mem.kpi?.finalScore ?? '-' }}</td>
                      <td class="text-center">
                        <span class="badge-grade" [style.background-color]="getGradeBadgeColor(mem.kpi?.finalGrade) + '20'" [style.color]="getGradeBadgeColor(mem.kpi?.finalGrade)">
                          {{ getGradeLabel(mem.kpi?.finalGrade) }}
                        </span>
                      </td>
                      <td class="text-center hide-on-print">
                        <button type="button" class="btn-table-action" (click)="viewMemberKpi(mem.user)" title="Xem chi tiết bảng tính của cán bộ này">
                          <span class="material-symbols-outlined">visibility</span>
                        </button>
                      </td>
                    </tr>
                  }
                  @if (!orgSummary()?.members?.length) {
                    <tr>
                      <td colspan="10" class="empty-row">Chưa có dữ liệu tính điểm KPI của tổ trong kỳ này. Nhấn nút <strong>"Tính lại KPI tự động"</strong> để quét ngay.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ================= TAB 3: KPI TOÀN TRƯỜNG ================= -->
      @if (activeTab() === 'TOAN_TRUONG') {
        <div class="school-kpi-section">
          <!-- SCHOOL SUMMARY TOP STATS -->
          <div class="school-top-stats-grid">
            <div class="school-stat-card">
              <div class="stat-icon-wrap bg-blue">
                <span class="material-symbols-outlined">school</span>
              </div>
              <div class="stat-meta">
                <div class="stat-title">Tổng số Cán bộ & Giáo viên</div>
                <div class="stat-num">{{ schoolSummary()?.totalStaff || 0 }} <span class="unit">nhân sự</span></div>
              </div>
            </div>

            <div class="school-stat-card">
              <div class="stat-icon-wrap bg-emerald">
                <span class="material-symbols-outlined">trending_up</span>
              </div>
              <div class="stat-meta">
                <div class="stat-title">Điểm Trung Bình Toàn Trường</div>
                <div class="stat-num">{{ schoolSummary()?.averageScore || 0 }} <span class="unit">/100</span></div>
              </div>
            </div>

            <div class="school-stat-card">
              <div class="stat-icon-wrap bg-indigo">
                <span class="material-symbols-outlined">workspace_premium</span>
              </div>
              <div class="stat-meta">
                <div class="stat-title">Tỷ Lệ Đạt Xuất Sắc & Tốt</div>
                <div class="stat-num">
                  {{ calculateHighPerformanceRate() }}%
                </div>
              </div>
            </div>

            <div class="school-stat-card">
              <div class="stat-icon-wrap bg-purple">
                <span class="material-symbols-outlined">hub</span>
              </div>
              <div class="stat-meta">
                <div class="stat-title">Số Tổ Chuyên Môn / Bộ Phận</div>
                <div class="stat-num">{{ schoolSummary()?.departmentBreakdown?.length || 0 }} <span class="unit">tổ/bộ phận</span></div>
              </div>
            </div>
          </div>

          <!-- DEPARTMENT BREAKDOWN RANKING -->
          <div class="school-dept-breakdown-card">
            <div class="table-header-bar">
              <div class="table-header-title">
                <span class="material-symbols-outlined icon-navy">equalizer</span>
                <h2>Xếp Hạng & Thống Kê KPI Theo Tổ Chuyên Môn / Bộ Phận</h2>
              </div>
            </div>

            <div class="table-responsive-wrapper">
              <table class="school-dept-table">
                <thead>
                  <tr>
                    <th class="col-stt">Hạng</th>
                    <th>Tổ chuyên môn / Bộ phận</th>
                    <th class="text-center">Số CBGV</th>
                    <th class="text-center">Điểm TB</th>
                    <th class="text-center">Xuất sắc</th>
                    <th class="text-center">Tốt</th>
                    <th class="text-center">Hoàn thành</th>
                    <th class="text-center">Chưa đạt</th>
                    <th class="text-center">Tỷ lệ hoàn thành</th>
                  </tr>
                </thead>
                <tbody>
                  @for (dept of schoolSummary()?.departmentBreakdown; track dept.id; let idx = $index) {
                    <tr>
                      <td class="text-center font-bold">
                        <span class="rank-badge" [class.rank-1]="idx === 0" [class.rank-2]="idx === 1" [class.rank-3]="idx === 2">{{ idx + 1 }}</span>
                      </td>
                      <td>
                        <strong>{{ dept.name }}</strong>
                        <span class="dept-code-tag">{{ dept.code }}</span>
                      </td>
                      <td class="text-center font-bold">{{ dept.memberCount }}</td>
                      <td class="text-center font-bold text-navy">{{ dept.averageScore }}</td>
                      <td class="text-center text-emerald font-bold">{{ dept.distribution?.xuatSac || 0 }}</td>
                      <td class="text-center text-blue font-bold">{{ dept.distribution?.tot || 0 }}</td>
                      <td class="text-center text-amber font-bold">{{ dept.distribution?.hoanThanh || 0 }}</td>
                      <td class="text-center text-rose font-bold">{{ dept.distribution?.chuaDat || 0 }}</td>
                      <td class="text-center">
                        <div class="progress-bar-wrap">
                          <div class="progress-fill" [style.width.%]="dept.averageScore"></div>
                          <span class="progress-text">{{ dept.averageScore }}%</span>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
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

            &.btn-recompute {
              background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
              color: #FFFFFF;
              box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);

              &:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
              }
            }

            &.btn-sync {
              background: #EEF4FC;
              color: #1F3864;
              border: 1px solid #BFDBFE;

              &:hover:not(:disabled) {
                background: #DBEAFE;
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

              &:hover:not(:disabled) {
                background: #0E6B37;
              }
            }

            &:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
          }
        }
      }

      .spinning {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        100% { transform: rotate(360deg); }
      }

      /* 2. VIEW TAB SWITCHER */
      .view-tabs-card {
        background: #FFFFFF;
        border: 1.5px solid #E2E8F0;
        border-radius: 14px;
        padding: 8px 16px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

        .view-tabs-list {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;

          .tab-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 10px;
            font-size: 0.88rem;
            font-weight: 700;
            color: #64748B;
            background: transparent;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;

            .material-symbols-outlined {
              font-size: 20px;
            }

            .tab-badge {
              font-size: 0.72rem;
              padding: 2px 8px;
              border-radius: 9999px;
              background: #E2E8F0;
              color: #475569;

              &.highlight {
                background: #FEF3C7;
                color: #92400E;
              }
            }

            &:hover {
              background: #F1F5F9;
              color: #1E293B;
            }

            &.active {
              background: #EEF4FC;
              color: #1F3864;
              font-weight: 800;

              .material-symbols-outlined {
                color: #2563EB;
              }
            }
          }
        }

        .tab-period-picker {
          display: flex;
          align-items: center;
          gap: 8px;

          .period-label {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.85rem;
            font-weight: 700;
            color: #1F3864;
          }

          .period-select {
            padding: 6px 12px;
            border-radius: 8px;
            border: 1.5px solid #CBD5E1;
            font-size: 0.85rem;
            font-weight: 600;
            color: #1E293B;
            background: #FFFFFF;
            outline: none;
            cursor: pointer;

            &:focus {
              border-color: #2563EB;
            }
          }
        }
      }

      /* 3. AUTO KPI BANNER */
      .auto-kpi-banner {
        background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
        border: 1.5px solid #BFDBFE;
        border-radius: 14px;
        padding: 14px 20px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 16px;

        .banner-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #2563EB;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .material-symbols-outlined {
            font-size: 24px;
          }
        }

        .banner-content {
          flex: 1;

          .banner-title {
            font-size: 0.95rem;
            font-weight: 800;
            color: #1E40AF;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;

            .badge-source {
              font-size: 0.72rem;
              font-weight: 700;
              background: #DBEAFE;
              color: #1E40AF;
              padding: 2px 8px;
              border-radius: 9999px;
              border: 1px solid #93C5FD;
            }
          }

          .banner-stats-row {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;

            .stat-pill {
              font-size: 0.82rem;
              background: #FFFFFF;
              padding: 4px 10px;
              border-radius: 8px;
              border: 1px solid #E2E8F0;
              display: inline-flex;
              align-items: center;
              gap: 4px;

              .pill-label {
                color: #64748B;
              }

              &.pill-before { border-color: #A7F3D0; color: #065F46; }
              &.pill-ontime { border-color: #BAE6FD; color: #0369A1; }
              &.pill-late { border-color: #FDE68A; color: #92400E; }
              &.pill-uncompleted { border-color: #FECDD3; color: #9F1239; }
              &.pill-grade { border-color: #C7D2FE; font-weight: 800; }
            }
          }
        }
      }

      /* 4. SCORE CARDS */
      .kpi-scores-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
        margin-bottom: 20px;

        .kpi-score-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          transition: transform 0.15s ease, box-shadow 0.15s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
          }

          .score-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;

            .score-code {
              font-size: 1.1rem;
              font-weight: 900;
              color: #1F3864;
            }

            .score-icon {
              font-size: 22px;
              color: #64748B;
            }
          }

          .score-label {
            font-size: 0.82rem;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }

          .score-value {
            font-size: 1.8rem;
            font-weight: 900;
            color: #1F3864;
            letter-spacing: -0.02em;

            .unit {
              font-size: 1rem;
              font-weight: 700;
              color: #64748B;
              margin-left: 2px;
            }
          }

          .score-desc {
            font-size: 0.78rem;
            color: #64748B;
            margin-top: 4px;
          }

          &.card-final-total {
            background: linear-gradient(135deg, #1F3864 0%, #172554 100%);
            border-color: #1E3A8A;
            color: #FFFFFF;

            .score-code-final {
              font-size: 1.1rem;
              font-weight: 900;
              color: #FCD34D;
            }

            .badge-final-rating {
              font-size: 0.75rem;
              font-weight: 800;
              padding: 2px 8px;
              border-radius: 9999px;
            }

            .score-label-final {
              font-size: 0.78rem;
              font-weight: 700;
              color: #93C5FD;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }

            .score-value-final {
              font-size: 2.1rem;
              font-weight: 900;
              color: #FFFFFF;

              .unit-final {
                font-size: 1rem;
                font-weight: 700;
                color: #93C5FD;
              }
            }

            .score-desc-final {
              font-size: 0.82rem;
              color: #E2E8F0;
              margin-top: 4px;
            }
          }
        }
      }

      /* 5. KPI TABLE SECTION */
      .kpi-table-section {
        background: #FFFFFF;
        border: 1.5px solid #E2E8F0;
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);

        .table-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 16px;
          flex-wrap: wrap;

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

          .table-actions-right {
            display: flex;
            align-items: center;
            gap: 8px;

            .btn-tool {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 7px 14px;
              border-radius: 8px;
              font-size: 0.82rem;
              font-weight: 700;
              cursor: pointer;
              border: none;
              transition: all 0.15s ease;

              .material-symbols-outlined {
                font-size: 18px;
              }

              &.btn-add-row {
                background: #EEF4FC;
                color: #1E40AF;
                border: 1px solid #BFDBFE;
                &:hover { background: #DBEAFE; }
              }

              &.btn-save {
                background: #0F172A;
                color: #FFFFFF;
                &:hover { background: #1E293B; }
              }
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

          .cell-stt { width: 40px; font-size: 0.82rem; color: #64748B; }
          .cell-task { min-width: 360px; }
          .cell-deliverable { width: 95px; }
          .cell-timeline { width: 90px; }
          .cell-qty, .cell-weight, .cell-input-num, .cell-score-num { width: 52px; min-width: 52px; max-width: 56px; }

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

      /* 7. DEPARTMENT TAB STYLES */
      .dept-summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 20px;

        .dept-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

          .dept-card-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;

            .material-symbols-outlined {
              font-size: 26px;
            }

            &.bg-blue { background: #2563EB; }
            &.bg-emerald { background: #059669; }
            &.bg-indigo { background: #4F46E5; }
            &.bg-amber { background: #D97706; }
          }

          .dept-card-info {
            .dept-card-label {
              font-size: 0.8rem;
              font-weight: 700;
              color: #64748B;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .dept-card-val {
              font-size: 1.5rem;
              font-weight: 900;
              color: #1E293B;

              .unit-sub {
                font-size: 0.85rem;
                font-weight: 600;
                color: #64748B;
              }
            }
          }
        }
      }

      .dept-members-table-card, .school-dept-breakdown-card {
        background: #FFFFFF;
        border: 1.5px solid #E2E8F0;
        border-radius: 14px;
        padding: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
      }

      .dept-members-table, .school-dept-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.88rem;

        th, td {
          border: 1px solid #E2E8F0;
          padding: 10px 12px;
          vertical-align: middle;
        }

        thead th {
          background: #F8FAFC;
          color: #1E293B;
          font-weight: 800;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        tbody tr:hover {
          background: #F8FAFC;
        }

        .member-user-cell {
          display: flex;
          align-items: center;
          gap: 10px;

          .user-avatar-sm {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
          }

          .member-phone {
            font-size: 0.78rem;
            color: #64748B;
          }
        }

        .score-final-cell {
          font-size: 1.05rem;
          color: #1E40AF;
        }

        .badge-grade {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .btn-table-action {
          background: #EEF4FC;
          border: 1px solid #BFDBFE;
          color: #1E40AF;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #DBEAFE;
          }
        }

        .empty-row {
          text-align: center;
          padding: 30px !important;
          color: #64748B;
          font-style: italic;
        }
      }

      /* 8. SCHOOL TAB STYLES */
      .school-top-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
        margin-bottom: 20px;

        .school-stat-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

          .stat-icon-wrap {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            flex-shrink: 0;

            .material-symbols-outlined {
              font-size: 28px;
            }

            &.bg-blue { background: #2563EB; }
            &.bg-emerald { background: #059669; }
            &.bg-indigo { background: #4F46E5; }
            &.bg-purple { background: #7C3AED; }
          }

          .stat-meta {
            .stat-title {
              font-size: 0.8rem;
              font-weight: 700;
              color: #64748B;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .stat-num {
              font-size: 1.6rem;
              font-weight: 900;
              color: #1E293B;

              .unit {
                font-size: 0.85rem;
                font-weight: 600;
                color: #64748B;
              }
            }
          }
        }
      }

      .school-dept-table {
        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #E2E8F0;
          color: #475569;
          font-size: 0.82rem;

          &.rank-1 { background: #FEF3C7; color: #B45309; font-weight: 900; }
          &.rank-2 { background: #E2E8F0; color: #475569; font-weight: 900; }
          &.rank-3 { background: #FFEDD5; color: #C2410C; font-weight: 900; }
        }

        .dept-code-tag {
          font-size: 0.72rem;
          font-weight: 700;
          background: #F1F5F9;
          color: #64748B;
          padding: 1px 6px;
          border-radius: 4px;
          margin-left: 6px;
        }

        .progress-bar-wrap {
          position: relative;
          background: #E2E8F0;
          border-radius: 9999px;
          height: 18px;
          min-width: 100px;
          overflow: hidden;

          .progress-fill {
            background: linear-gradient(90deg, #3B82F6 0%, #10B981 100%);
            height: 100%;
            border-radius: 9999px;
            transition: width 0.4s ease;
          }

          .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 0.68rem;
            font-weight: 800;
            color: #0F172A;
          }
        }

        .text-navy { color: #1E40AF; }
        .text-emerald { color: #059669; }
        .text-blue { color: #2563EB; }
        .text-amber { color: #D97706; }
        .text-rose { color: #E11D48; }
      }

      /* PRINT STYLES */
      @media print {
        .hide-on-print { display: none !important; }

        .my-kpi-container {
          background: #FFFFFF !important;
          padding: 0 !important;
          font-family: 'Times New Roman', Times, serif !important;
        }

        .kpi-scores-grid, .auto-kpi-banner, .view-tabs-card {
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
  isRecomputing = signal(false);
  activeTab = signal<KpiViewTab>('CA_NHAN');
  selectedPeriod = signal<KpiPeriod>('QUY_3');

  sheet = signal<KpiEvaluationSheet | null>(null);
  rows = signal<KpiRowItem[]>([]);
  backendKpiSummary = signal<any | null>(null);

  // Department & School Summaries
  orgSummary = signal<any | null>(null);
  schoolSummary = signal<any | null>(null);

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

  canViewOrgUnit = computed(() => {
    return this.authService.isToTruong() || this.authService.isBGH() || this.authService.isAdmin() || this.authService.isSystemAdmin();
  });

  canViewSchool = computed(() => {
    return this.authService.isBGH() || this.authService.isAdmin() || this.authService.isSystemAdmin();
  });

  currentOrgUnitName = computed(() => {
    const user = this.authService.currentUser();
    return user?.primaryOrgUnitName || 'Tổ Chuyên Môn';
  });

  get selectedPeriodLabel(): string {
    return this.kpiService.getPeriodLabel(this.selectedPeriod());
  }

  ngOnInit() {
    this.loadAllKpiData();
  }

  loadAllKpiData() {
    this.loadSheetData();
    this.loadBackendKpiSummary();
    if (this.canViewOrgUnit()) {
      this.loadOrgSummary();
    }
    if (this.canViewSchool()) {
      this.loadSchoolSummary();
    }
  }

  switchTab(tab: KpiViewTab) {
    this.activeTab.set(tab);
    if (tab === 'TO_BO_PHAN' && !this.orgSummary()) {
      this.loadOrgSummary();
    } else if (tab === 'TOAN_TRUONG' && !this.schoolSummary()) {
      this.loadSchoolSummary();
    }
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

  loadBackendKpiSummary() {
    this.kpiService.getMyKpi(this.selectedPeriod()).subscribe({
      next: (res) => {
        if (res && res.calculatedSummary) {
          this.backendKpiSummary.set(res.calculatedSummary);
        }
      },
      error: (err) => console.warn('Could not load backend KPI summary:', err),
    });
  }

  loadOrgSummary() {
    const user = this.authService.currentUser();
    const orgUnitId = user?.primaryOrgUnitId || 'org-bgh';
    this.kpiService.getOrgUnitKpiSummary(orgUnitId, this.selectedPeriod()).subscribe({
      next: (res) => this.orgSummary.set(res),
      error: (err) => console.warn('Could not load org KPI summary:', err),
    });
  }

  loadSchoolSummary() {
    this.kpiService.getSchoolKpiSummary(this.selectedPeriod()).subscribe({
      next: (res) => this.schoolSummary.set(res),
      error: (err) => console.warn('Could not load school KPI summary:', err),
    });
  }

  onPeriodChange(newPeriod: KpiPeriod) {
    this.selectedPeriod.set(newPeriod);
    this.loadAllKpiData();
  }

  triggerBackendRecompute() {
    this.isRecomputing.set(true);
    this.kpiService.recomputeKpi(this.selectedPeriod()).subscribe({
      next: () => {
        this.isRecomputing.set(false);
        this.loadAllKpiData();
        alert('Đã tính toán lại toàn bộ dữ liệu KPI tự động thành công!');
      },
      error: (err) => {
        this.isRecomputing.set(false);
        alert(err.message || 'Lỗi khi tính toán lại KPI');
      },
    });
  }

  onDataChanged() {
    const currentRows = this.rows();
    const recalculated = this.kpiService.recalculateSheet(currentRows);
    this.rows.set(recalculated.rows);
    this.summary.set(recalculated.summary);
  }

  onActualQuantityValChanged(row: KpiRowItem) {
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

    // First try backend excel export (generates rich ExcelJS workbook)
    this.kpiService.exportKpiExcelBlob(this.selectedPeriod()).subscribe({
      next: (blob) => {
        const filename = `Bang_Tinh_KPI_${this.selectedPeriod()}_${cur.userName.replace(/\s+/g, '_')}.xlsx`;
        this.kpiService.downloadExcelBlob(blob, filename);
      },
      error: () => {
        // Fallback to client-side HTML format
        const fullSheet: KpiEvaluationSheet = {
          ...cur,
          period: this.selectedPeriod(),
          periodLabel: this.selectedPeriodLabel,
          rows: this.rows(),
          summary: this.summary(),
          updatedAt: new Date().toISOString(),
        };
        this.kpiService.exportToExcel(fullSheet);
      },
    });
  }

  viewMemberKpi(user: any) {
    this.kpiService.getUserKpi(user.id, this.selectedPeriod()).subscribe({
      next: (res) => {
        if (res && res.calculatedSummary) {
          alert(`Điểm KPI của ${user.fullName}:\n• Điểm A (Số lượng): ${res.calculatedSummary.scoreA}\n• Điểm B (Chất lượng): ${res.calculatedSummary.scoreB}\n• Điểm C (Tiến độ): ${res.calculatedSummary.scoreC}\n• Điểm D (Điều hành): ${res.calculatedSummary.scoreD}\n• Điểm tổng hợp: ${res.calculatedSummary.finalScore} (${this.getGradeLabel(res.calculatedSummary.finalGrade)})`);
        }
      },
      error: (err) => alert('Không thể lấy chi tiết KPI của cán bộ này: ' + err.message),
    });
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

  getGradeLabel(grade?: string): string {
    switch (grade) {
      case 'XUAT_SAC': return 'Xuất sắc (Loại A)';
      case 'TOT': return 'Tốt (Loại B)';
      case 'HOAN_THANH': return 'Hoàn thành (Loại C)';
      case 'CHUA_DAT': return 'Chưa đạt (Loại D)';
      default: return 'Chưa xếp loại';
    }
  }

  getGradeBadgeColor(grade?: string): string {
    switch (grade) {
      case 'XUAT_SAC': return '#059669';
      case 'TOT': return '#2563EB';
      case 'HOAN_THANH': return '#D97706';
      case 'CHUA_DAT': return '#E11D48';
      default: return '#64748B';
    }
  }

  calculateHighPerformanceRate(): number {
    const dist = this.schoolSummary()?.distribution;
    const total = this.schoolSummary()?.totalStaff;
    if (!dist || !total || total === 0) return 0;
    const high = (dist.xuatSac || 0) + (dist.tot || 0);
    return Math.round((high / total) * 100);
  }
}
