import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { KpiFlexibleService } from '../../core/services/kpi-flexible.service';
import { AuthService } from '../../core/services/auth.service';
import {
  EvaluationPeriod,
  KpiBonusProposalItem,
  ScoreCalculationSheet,
  SpecialCaseItem,
} from '../../core/models/kpi-flexible.models';

@Component({
  selector: 'app-kpi-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="kpi-approval-container">
      <!-- HEADER -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb-row">
            <span class="material-symbols-outlined">verified_user</span>
            <span>Quản Lý & Phê Duyệt KPI Quý</span>
          </div>
          <h1 class="page-title">Thẩm Quyền Đánh Giá & Xếp Loại KPI</h1>
          <p class="page-subtitle">
            Phê duyệt bảng điểm 100, xác nhận điều kiện bắt buộc, kiểm soát trần 20% cán bộ lãnh đạo Xuất sắc & duyệt điểm thưởng
          </p>
        </div>

        <div class="header-right-actions">
          <button type="button" class="btn-action btn-refresh" (click)="loadAllData()" [disabled]="isLoading()">
            <span class="material-symbols-outlined" [class.spinning]="isLoading()">refresh</span>
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      <!-- PERIOD & FILTER TOOLBAR -->
      <div class="filter-card">
        <div class="filter-row">
          <div class="filter-group period-group">
            <label>
              <span class="material-symbols-outlined">event</span>
              <span>Kỳ đánh giá:</span>
            </label>
            <select
              class="form-select period-select"
              [ngModel]="selectedPeriodId()"
              (ngModelChange)="onPeriodChange($event)"
            >
              @for (p of periods(); track p.id) {
                <option [value]="p.id">{{ p.name }} ({{ p.schoolYear }}) - Trạng thái: {{ p.status }}</option>
              }
            </select>
          </div>

          <div class="filter-tabs">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'SCORES'"
              (click)="activeTab.set('SCORES')"
            >
              <span class="material-symbols-outlined">fact_check</span>
              <span>Bảng Điểm & Xếp Loại</span>
              <span class="tab-badge">{{ scoreSheets().length }}</span>
            </button>

            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'BONUS'"
              (click)="activeTab.set('BONUS')"
            >
              <span class="material-symbols-outlined">stars</span>
              <span>Duyệt Điểm Thưởng (+5%)</span>
              @if (pendingBonusCount() > 0) {
                <span class="tab-badge badge-warning">{{ pendingBonusCount() }} chờ duyệt</span>
              }
            </button>

            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'SPECIAL_CASES'"
              (click)="activeTab.set('SPECIAL_CASES')"
            >
              <span class="material-symbols-outlined">shield_person</span>
              <span>Trường Hợp Đặc Biệt</span>
              <span class="tab-badge">{{ specialCases().length }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT TABS -->
      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Đang tải dữ liệu hồ sơ KPI & phân tích cảnh báo...</p>
        </div>
      } @else {
        <!-- TAB 1: DUYỆT BẢNG ĐIỂM & XẾP LOẠI -->
        @if (activeTab() === 'SCORES') {
          <!-- LEADERSHIP QUOTA ALERT BANNER -->
          @if (leadershipQuotaWarning()) {
            <div class="alert-banner alert-warning">
              <span class="material-symbols-outlined alert-icon">warning</span>
              <div class="alert-content">
                <strong>Cảnh báo trần xếp loại cán bộ quản lý (≤ 20%):</strong>
                <p>{{ leadershipQuotaWarning() }}</p>
              </div>
            </div>
          }

          <div class="table-card">
            <div class="card-header-row">
              <div class="header-title-box">
                <span class="material-symbols-outlined">groups</span>
                <h3>Danh sách viên chức & người lao động trong kỳ</h3>
              </div>
              <div class="search-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  placeholder="Tìm theo tên viên chức..."
                  [(ngModel)]="searchQuery"
                  class="search-input"
                />
              </div>
            </div>

            <div class="table-responsive">
              <table class="kpi-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ & Tên</th>
                    <th>Chức vụ / Nhóm</th>
                    <th class="text-center" title="Ý thức kỷ luật, đạo đức, quy chế (Tối đa 30đ)">Tiêu Chuẩn Chung (30đ)</th>
                    <th class="text-center" title="Điểm thực hiện nhiệm vụ theo các trục kết quả (Tối đa 70đ)">Nhiệm Vụ Theo Trục (70đ)</th>
                    <th class="text-center" title="Điểm thưởng +5% sau khi áp trần 7đ/10%">Thưởng (Max 7đ)</th>
                    <th class="text-center">Tổng Điểm (100đ)</th>
                    <th class="text-center">Cảnh Báo & Rủi Ro</th>
                    <th class="text-center">Hạng Đề Xuất</th>
                    <th class="text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  @for (sheet of filteredScoreSheets(); track sheet.employeeId; let idx = $index) {
                    <tr [class.selected-row]="selectedSheet()?.employeeId === sheet.employeeId">
                      <td>{{ idx + 1 }}</td>
                      <td>
                        <div class="employee-name-cell">
                          <strong>{{ sheet.employeeName }}</strong>
                        </div>
                      </td>
                      <td>
                        <span class="badge-role">{{ getRoleBadgeText(sheet) }}</span>
                      </td>
                      <td class="text-center score-val">{{ sheet.scoreGeneral }} / 30</td>
                      <td class="text-center score-val score-task">{{ sheet.scoreTask }} / 70</td>
                      <td class="text-center score-val score-bonus">
                        @if (sheet.scoreBonusCapped > 0) {
                          <span class="bonus-tag">+{{ sheet.scoreBonusCapped }}</span>
                        } @else {
                          <span class="text-muted">0</span>
                        }
                      </td>
                      <td class="text-center score-val score-final">
                        <span class="final-badge" [ngClass]="getScoreColorClass(sheet.scoreFinal)">
                          {{ sheet.scoreFinal }}
                        </span>
                      </td>
                      <td class="text-center">
                        <!-- WARNING BADGES -->
                        <div class="warning-badges-stack">
                          @if (sheet.classificationEvaluation?.hasUncompletedTasks) {
                            <span class="badge-warning-chip" title="Có nhiệm vụ chưa hoàn thành 100%">
                              <span class="material-symbols-outlined">error</span> Chưa xong việc
                            </span>
                          }
                          @if (hasKhacOveruse(sheet)) {
                            <span class="badge-warning-chip badge-orange" title="Tỷ lệ điểm trục 'Khác' vượt ngưỡng 20%">
                              <span class="material-symbols-outlined">rule</span> Lạm dụng trục Khác
                            </span>
                          }
                          @if (hasSuspiciousTasks(sheet)) {
                            <span class="badge-warning-chip badge-purple" title="Có nhiệm vụ tạo sát ngày chốt kỳ hoặc trọng số nhỏ">
                              <span class="material-symbols-outlined">visibility</span> Nghi vấn hình thức
                            </span>
                          }
                          @if (!sheet.classificationEvaluation?.hasUncompletedTasks && !hasKhacOveruse(sheet) && !hasSuspiciousTasks(sheet)) {
                            <span class="badge-ok-chip">
                              <span class="material-symbols-outlined">check_circle</span> Chuẩn
                            </span>
                          }
                        </div>
                      </td>
                      <td class="text-center">
                        <span
                          class="classification-pill"
                          [style.background-color]="sheet.classificationEvaluation.classificationColor + '20'"
                          [style.color]="sheet.classificationEvaluation.classificationColor"
                          [style.border-color]="sheet.classificationEvaluation.classificationColor"
                        >
                          {{ sheet.classificationEvaluation.classificationLabel }}
                        </span>
                      </td>
                      <td class="text-center">
                        <button
                          type="button"
                          class="btn-review-sheet"
                          (click)="openReviewModal(sheet)"
                        >
                          <span class="material-symbols-outlined">rate_review</span>
                          <span>Thẩm định & Chốt</span>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="10" class="empty-state">
                        <span class="material-symbols-outlined">person_search</span>
                        <p>Không tìm thấy hồ sơ viên chức nào trong kỳ đánh giá này.</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- TAB 2: DUYỆT ĐỀ XUẤT ĐIỂM THƯỞNG -->
        @if (activeTab() === 'BONUS') {
          <div class="bonus-proposals-grid">
            @for (proposal of bonusProposals(); track proposal.id) {
              <div class="bonus-card" [class.approved]="proposal.status === 'approved'" [class.rejected]="proposal.status === 'rejected'">
                <div class="bonus-card-header">
                  <div class="proposer-info">
                    <span class="material-symbols-outlined user-avatar">person</span>
                    <div>
                      <h4>{{ proposal.proposedBy.fullName }}</h4>
                      <span class="dept-text">{{ proposal.proposedBy.primaryOrgUnit?.name || 'Đơn vị' }} • {{ proposal.proposedBy.title || 'Viên chức' }}</span>
                    </div>
                  </div>
                  <span class="status-badge" [ngClass]="proposal.status">
                    {{ getBonusStatusLabel(proposal.status) }}
                  </span>
                </div>

                <div class="bonus-card-body">
                  <div class="task-title-box">
                    <span class="label">Nhiệm vụ đề xuất:</span>
                    <strong>{{ proposal.task.title }}</strong>
                    <div class="task-meta">
                      <span>Trọng số: {{ proposal.task.weightScore || 0 }}đ</span>
                      <span>Tiến độ: {{ proposal.task.progressPercent }}%</span>
                    </div>
                  </div>

                  <div class="reason-box">
                    <div class="reason-type-pill">
                      <span class="material-symbols-outlined">auto_awesome</span>
                      <span>{{ proposal.reasonType === 'tien_do_vuot' ? 'Hoàn thành trước ≥50% tiến độ / Gấp <2 ngày' : 'Sáng kiến / Cách làm mới có tính lan tỏa' }}</span>
                    </div>
                    @if (proposal.reasonDescription) {
                      <p class="reason-desc">"{{ proposal.reasonDescription }}"</p>
                    }
                  </div>

                  <div class="bonus-calc-highlight">
                    <span class="calc-label">Mức thưởng tính toán (+{{ proposal.proposedBonusPct }}% điểm việc):</span>
                    <span class="calc-val">+{{ proposal.calculatedBonusScore }} điểm</span>
                  </div>

                  @if (proposal.reviewNote) {
                    <div class="review-note-box">
                      <span class="note-label">Ý kiến người duyệt:</span>
                      <p>{{ proposal.reviewNote }}</p>
                    </div>
                  }
                </div>

                @if (proposal.status === 'proposed') {
                  <div class="bonus-card-actions">
                    <input
                      type="text"
                      placeholder="Ghi chú thẩm định (nếu có)..."
                      [(ngModel)]="proposalNotes[proposal.id]"
                      class="review-input"
                    />
                    <div class="btn-group">
                      <button
                        type="button"
                        class="btn-reject"
                        (click)="reviewBonus(proposal.id, 'rejected')"
                        [disabled]="isSubmittingBonus()"
                      >
                        <span class="material-symbols-outlined">close</span>
                        <span>Từ chối</span>
                      </button>
                      <button
                        type="button"
                        class="btn-approve"
                        (click)="reviewBonus(proposal.id, 'approved')"
                        [disabled]="isSubmittingBonus()"
                      >
                        <span class="material-symbols-outlined">check</span>
                        <span>Duyệt +{{ proposal.calculatedBonusScore }}đ</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            } @empty {
              <div class="empty-state-card">
                <span class="material-symbols-outlined">stars</span>
                <h3>Chưa có đề xuất điểm thưởng nào trong kỳ này</h3>
                <p>Khi viên chức hoàn thành vượt tiến độ hoặc có sáng kiến mới, đề xuất sẽ xuất hiện tại đây để cấp quản lý phê duyệt.</p>
              </div>
            }
          </div>
        }

        <!-- TAB 3: TRƯỜNG HỢP ĐẶC BIỆT -->
        @if (activeTab() === 'SPECIAL_CASES') {
          <div class="special-cases-container">
            <div class="special-header-action">
              <div class="desc">
                <h3>Xử lý viên chức thuộc các trường hợp đặc biệt (Mục III.7 Hướng dẫn Sở)</h3>
                <p>Viên chức nghỉ thai sản/ốm đau ≥2 tháng, bổ nhiệm mới & điều động <2 tháng sẽ được dồn kết quả sang quý sau, không bị đánh giá 'Không hoàn thành' oan.</p>
              </div>
              <button type="button" class="btn-action btn-add" (click)="openSpecialCaseModal()">
                <span class="material-symbols-outlined">add_circle</span>
                <span>Đăng ký trường hợp đặc biệt</span>
              </button>
            </div>

            <div class="table-card">
              <table class="kpi-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Viên chức</th>
                    <th>Loại trường hợp</th>
                    <th>Hướng giải quyết</th>
                    <th>Dồn kết quả</th>
                    <th>Ghi chú</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (sc of specialCases(); track sc.id; let idx = $index) {
                    <tr>
                      <td>{{ idx + 1 }}</td>
                      <td><strong>{{ sc.employee.fullName }}</strong> ({{ sc.employee.title || 'Viên chức' }})</td>
                      <td>
                        <span class="case-pill">{{ getCaseTypeLabel(sc.caseType) }}</span>
                      </td>
                      <td>{{ getResolutionLabel(sc.resolution) }}</td>
                      <td class="text-center">
                        @if (sc.isCarriedForward) {
                          <span class="badge-carried">Dồn sang quý sau</span>
                        } @else {
                          <span class="text-muted">Không</span>
                        }
                      </td>
                      <td>{{ sc.note || '—' }}</td>
                      <td>{{ sc.createdAt | date: 'dd/MM/yyyy' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="empty-state">
                        <span class="material-symbols-outlined">verified</span>
                        <p>Không có trường hợp đặc biệt nào trong kỳ này.</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }

      <!-- REVIEW & APPROVE SCORE MODAL -->
      @if (selectedSheet()) {
        <div class="modal-backdrop" (click)="selectedSheet.set(null)">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="header-info">
                <span class="material-symbols-outlined icon-modal">rate_review</span>
                <div>
                  <h3 class="modal-title">Thẩm định Hồ sơ KPI: {{ selectedSheet()?.employeeName }}</h3>
                  <span class="modal-subtitle">Kỳ đánh giá: {{ selectedSheet()?.periodName }}</span>
                </div>
              </div>
              <button type="button" class="close-btn" (click)="selectedSheet.set(null)">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <!-- 100-POINT BREAKDOWN SUMMARY CARDS -->
              <div class="score-summary-grid">
                <div class="score-card card-general">
                  <span class="score-title">Tiêu Chuẩn Chung</span>
                  <span class="score-number">{{ selectedSheet()?.scoreGeneral }}<small>/30</small></span>
                  <span class="score-desc">Ý thức, đạo đức, quy chế</span>
                </div>

                <div class="score-card card-task">
                  <span class="score-title">Kết Quả Theo Trục</span>
                  <span class="score-number">{{ selectedSheet()?.scoreTask }}<small>/70</small></span>
                  <span class="score-desc">Tổng điểm nhiệm vụ đạt</span>
                </div>

                <div class="score-card card-bonus">
                  <span class="score-title">Điểm Thưởng (+5%)</span>
                  <span class="score-number">+{{ selectedSheet()?.scoreBonusCapped }}<small>đ</small></span>
                  <span class="score-desc">Đã áp trần 7đ/10%</span>
                </div>

                <div class="score-card card-final">
                  <span class="score-title">Tổng Điểm KPI</span>
                  <span class="score-number highlight">{{ selectedSheet()?.scoreFinal }}<small>/100</small></span>
                  <span class="score-desc">Điểm chốt cuối cùng</span>
                </div>
              </div>

              <!-- AXIS DISTRIBUTION BAR CHART -->
              <div class="axis-distribution-box">
                <h4 class="section-title">
                  <span class="material-symbols-outlined">stacked_bar_chart</span>
                  <span>Phân bổ điểm theo Trục kết quả</span>
                </h4>

                <div class="axis-bars-list">
                  @for (axis of selectedSheet()?.axisBreakdown; track axis.axisId) {
                    <div class="axis-bar-item">
                      <div class="axis-bar-header">
                        <span class="axis-name">{{ axis.axisName }}</span>
                        <span class="axis-stat">{{ axis.achievedScore }} / {{ axis.totalWeightScore }}đ ({{ axis.percentageOfTaskScore }}%) - {{ axis.completedTasks }}/{{ axis.totalTasks }} việc</span>
                      </div>
                      <div class="progress-track">
                        <div
                          class="progress-fill"
                          [style.width.%]="axis.percentageOfTaskScore"
                          [style.background-color]="getAxisColor(axis.axisCode)"
                        ></div>
                      </div>

                      <!-- SPECIAL SUBTYPE BREAKDOWN FOR CHUYEN MON -->
                      @if (axis.axisCode === 'chuyen_mon' && axis.subtypes) {
                        <div class="subtype-pills">
                          <span class="sub-pill">
                            <span class="material-symbols-outlined">school</span>
                            GV Bộ môn: {{ axis.subtypes.gv_bo_mon?.achievedScore || 0 }}đ ({{ axis.subtypes.gv_bo_mon?.totalTasks || 0 }} việc)
                          </span>
                          <span class="sub-pill">
                            <span class="material-symbols-outlined">supervisor_account</span>
                            GVCN: {{ axis.subtypes.gvcn?.achievedScore || 0 }}đ ({{ axis.subtypes.gvcn?.totalTasks || 0 }} việc)
                          </span>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- MANDATORY CONFIRMATION CHECKLIST -->
              <div class="mandatory-conditions-card">
                <h4 class="section-title text-primary">
                  <span class="material-symbols-outlined">fact_check</span>
                  <span>Điều kiện bắt buộc kèm theo (Quy định Mục 5 văn bản)</span>
                </h4>
                <p class="condition-note">Điểm số không phải là điều kiện duy nhất để xếp loại. Người có thẩm quyền bắt buộc phải đối chiếu minh chứng thực tế:</p>

                <div class="checklist">
                  <div class="condition-row">
                    <span class="cond-title">1. Hoàn thành nhiệm vụ:</span>
                    <span class="cond-desc">Tỷ lệ hoàn thành công việc đạt {{ selectedSheet()?.classificationEvaluation?.completionRatePct }}% ({{ selectedSheet()?.classificationEvaluation?.hasUncompletedTasks ? 'Có việc chưa xong' : 'Đã xong 100%' }})</span>
                  </div>
                  <div class="condition-row">
                    <span class="cond-title">2. Nhiệm vụ vượt mức:</span>
                    <span class="cond-desc">Có {{ selectedSheet()?.classificationEvaluation?.exceededTasksCount }} nhiệm vụ vượt mức ({{ selectedSheet()?.classificationEvaluation?.exceededTasksPct }}% tổng số việc)</span>
                  </div>
                </div>

                <label class="checkbox-container confirmation-check">
                  <input
                    type="checkbox"
                    [(ngModel)]="approvalForm.meetsExtraConditions"
                  />
                  <span class="checkmark"></span>
                  <span class="check-text">
                    <strong>Tôi xác nhận cá nhân này đáp ứng đầy đủ các điều kiện bắt buộc kèm theo tương ứng với mức xếp loại đã chọn.</strong>
                  </span>
                </label>
              </div>

              <!-- CLASSIFICATION SELECTOR & OVERRIDE REASON -->
              <div class="classification-selection-box">
                <div class="form-group">
                  <label>Mức Xếp Loại Chính Thức:</label>
                  <select class="form-select" [(ngModel)]="approvalForm.classification">
                    <option value="xuat_sac">Hoàn thành xuất sắc nhiệm vụ (≥90đ + điều kiện vượt mức)</option>
                    <option value="tot">Hoàn thành tốt nhiệm vụ (70 – <90đ + đúng hạn)</option>
                    <option value="hoan_thanh">Hoàn thành nhiệm vụ (50 – <70đ)</option>
                    <option value="khong_hoan_thanh">Không hoàn thành nhiệm vụ (<50đ hoặc <100% việc)</option>
                  </select>
                </div>

                @if (approvalForm.classification !== selectedSheet()?.classificationEvaluation?.suggestedClassification) {
                  <div class="form-group override-group">
                    <label class="required">Lý do điều chỉnh khác với mức hệ thống tính toán (Bắt buộc):</label>
                    <textarea
                      class="form-control"
                      rows="2"
                      [(ngModel)]="approvalForm.overrideReason"
                      placeholder="Nhập lý do điều chỉnh hạng (ví dụ: tập thể thống nhất xem xét minh chứng vượt mức đặc biệt)..."
                    ></textarea>
                  </div>
                }
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="selectedSheet.set(null)">Đóng</button>
              <button
                type="button"
                class="btn-confirm-approve"
                (click)="confirmApproveScore()"
                [disabled]="isApprovingScore() || !approvalForm.meetsExtraConditions"
              >
                <span class="material-symbols-outlined">verified</span>
                <span>{{ isApprovingScore() ? 'Đang lưu...' : 'Phê Duyệt & Chốt Xếp Loại' }}</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .kpi-approval-container {
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
      max-width: 800px;
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
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      transition: all 0.2s ease;
    }

    .btn-action:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .btn-add {
      background: #0284c7;
      color: #ffffff;
      border: none;
    }

    .btn-add:hover {
      background: #0369a1;
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
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .period-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #334155;
    }

    .period-select {
      min-width: 280px;
      padding: 9px 14px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 14px;
      font-weight: 500;
      background: #f8fafc;
    }

    .filter-tabs {
      display: flex;
      gap: 8px;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      color: #64748b;
      border: none;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn.active {
      background: #ffffff;
      color: #0284c7;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    }

    .tab-badge {
      padding: 2px 7px;
      border-radius: 12px;
      background: #e2e8f0;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
    }

    .tab-badge.badge-warning {
      background: #fef3c7;
      color: #d97706;
    }

    .alert-banner {
      display: flex;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 20px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }

    .alert-banner .alert-icon {
      font-size: 24px;
      color: #d97706;
      flex-shrink: 0;
    }

    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
      color: #1e293b;
    }

    .header-title-box h3 {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
    }

    .search-box {
      position: relative;
      width: 260px;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      color: #94a3b8;
    }

    .search-input {
      width: 100%;
      padding: 8px 12px 8px 34px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 13.5px;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }

    .kpi-table th {
      padding: 12px 14px;
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .kpi-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }

    .kpi-table tr:hover {
      background: #f8fafc;
    }

    .badge-role {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: #e0f2fe;
      color: #0369a1;
    }

    .score-val {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .score-task {
      color: #0284c7;
    }

    .score-bonus .bonus-tag {
      padding: 2px 6px;
      border-radius: 6px;
      background: #dcfce7;
      color: #15803d;
      font-weight: 700;
      font-size: 12px;
    }

    .final-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
    }

    .final-badge.score-excellent {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .final-badge.score-good {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }

    .final-badge.score-pass {
      background: #fffbeb;
      color: #d97706;
      border: 1px solid #fde68a;
    }

    .final-badge.score-fail {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .warning-badges-stack {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }

    .badge-warning-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: #fef2f2;
      color: #dc2626;
    }

    .badge-warning-chip.badge-orange {
      background: #fff7ed;
      color: #c2410c;
    }

    .badge-warning-chip.badge-purple {
      background: #faf5ff;
      color: #7e22ce;
    }

    .badge-ok-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: #f0fdf4;
      color: #16a34a;
    }

    .classification-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid;
    }

    .btn-review-sheet {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #0284c7;
      background: #f0f9ff;
      color: #0284c7;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-review-sheet:hover {
      background: #0284c7;
      color: #ffffff;
    }

    /* BONUS TAB GRID */
    .bonus-proposals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 16px;
    }

    .bonus-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .bonus-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .proposer-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      font-size: 28px;
      color: #0284c7;
      background: #e0f2fe;
      padding: 6px;
      border-radius: 50%;
    }

    .proposer-info h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    .dept-text {
      font-size: 12px;
      color: #64748b;
    }

    .status-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
    }

    .status-badge.proposed {
      background: #fef3c7;
      color: #d97706;
    }

    .status-badge.approved {
      background: #dcfce7;
      color: #15803d;
    }

    .status-badge.rejected {
      background: #fee2e2;
      color: #b91c1c;
    }

    .task-title-box {
      background: #f8fafc;
      padding: 12px;
      border-radius: 10px;
      border-left: 3px solid #0284c7;
    }

    .task-title-box .label {
      display: block;
      font-size: 11.5px;
      color: #64748b;
      margin-bottom: 2px;
    }

    .task-meta {
      margin-top: 6px;
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #475569;
      font-weight: 500;
    }

    .reason-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .reason-type-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #7e22ce;
      background: #faf5ff;
      padding: 4px 10px;
      border-radius: 8px;
      width: fit-content;
    }

    .reason-desc {
      font-size: 13px;
      font-style: italic;
      color: #334155;
      margin: 0;
    }

    .bonus-calc-highlight {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: #ecfdf5;
      border-radius: 8px;
      border: 1px dashed #6ee7b7;
    }

    .calc-label {
      font-size: 13px;
      font-weight: 600;
      color: #065f46;
    }

    .calc-val {
      font-size: 16px;
      font-weight: 800;
      color: #059669;
    }

    .bonus-card-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
    }

    .review-input {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 13px;
    }

    .btn-group {
      display: flex;
      gap: 8px;
    }

    .btn-approve, .btn-reject {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
    }

    .btn-approve {
      background: #10b981;
      color: #ffffff;
    }

    .btn-approve:hover {
      background: #059669;
    }

    .btn-reject {
      background: #f1f5f9;
      color: #64748b;
    }

    .btn-reject:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 20px;
    }

    .modal-dialog {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 850px;
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon-modal {
      font-size: 32px;
      color: #0284c7;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 13px;
      color: #64748b;
    }

    .close-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #64748b;
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .score-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .score-card {
      padding: 14px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }

    .score-card .score-title {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 4px;
    }

    .score-card .score-number {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
    }

    .score-card .score-number.highlight {
      color: #0284c7;
    }

    .score-card .score-desc {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .axis-distribution-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 14px 0;
    }

    .axis-bars-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .axis-bar-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .axis-bar-header {
      display: flex;
      justify-content: space-between;
      font-size: 12.5px;
      font-weight: 600;
    }

    .progress-track {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .subtype-pills {
      display: flex;
      gap: 10px;
      margin-top: 4px;
    }

    .sub-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: #4338ca;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 500;
    }

    .mandatory-conditions-card {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 16px;
    }

    .condition-note {
      font-size: 12.5px;
      color: #1e40af;
      margin: 0 0 12px 0;
    }

    .checklist {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .condition-row {
      font-size: 13px;
      color: #1e293b;
    }

    .cond-title {
      font-weight: 600;
      margin-right: 6px;
    }

    .confirmation-check {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #93c5fd;
    }

    .classification-selection-box {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-group label {
      display: block;
      font-size: 13.5px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }

    .form-group label.required::after {
      content: ' *';
      color: #dc2626;
    }

    .form-control, .form-select {
      width: 100%;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 14px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .btn-cancel {
      padding: 10px 18px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
    }

    .btn-confirm-approve {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      background: #0284c7;
      color: #ffffff;
      border: none;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);
    }

    .btn-confirm-approve:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `],
})
export class KpiApprovalComponent implements OnInit {
  private kpiService = inject(KpiFlexibleService);
  public authService = inject(AuthService);

  periods = signal<EvaluationPeriod[]>([]);
  selectedPeriodId = signal<string>('');
  activeTab = signal<'SCORES' | 'BONUS' | 'SPECIAL_CASES'>('SCORES');

  scoreSheets = signal<ScoreCalculationSheet[]>([]);
  bonusProposals = signal<KpiBonusProposalItem[]>([]);
  specialCases = signal<SpecialCaseItem[]>([]);

  isLoading = signal<boolean>(false);
  isSubmittingBonus = signal<boolean>(false);
  isApprovingScore = signal<boolean>(false);

  searchQuery = '';
  proposalNotes: { [id: string]: string } = {};

  selectedSheet = signal<ScoreCalculationSheet | null>(null);
  approvalForm = {
    classification: 'xuat_sac' as 'xuat_sac' | 'tot' | 'hoan_thanh' | 'khong_hoan_thanh',
    meetsExtraConditions: false,
    overrideReason: '',
  };

  pendingBonusCount = computed(() => {
    return this.bonusProposals().filter((p) => p.status === 'proposed').length;
  });

  leadershipQuotaWarning = computed(() => {
    // Check if any sheet has leadershipQuotaWarning
    const sheetWithWarning = this.scoreSheets().find(
      (s) => s.classificationEvaluation?.leadershipQuotaWarning
    );
    return sheetWithWarning?.classificationEvaluation?.leadershipQuotaWarning || null;
  });

  filteredScoreSheets = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.scoreSheets();
    return this.scoreSheets().filter((s) => s.employeeName.toLowerCase().includes(q));
  });

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
          this.loadAllData();
        }
      },
      error: (err) => console.error('Failed to load evaluation periods:', err),
    });
  }

  onPeriodChange(periodId: string): void {
    this.selectedPeriodId.set(periodId);
    this.loadAllData();
  }

  loadAllData(): void {
    const periodId = this.selectedPeriodId();
    if (!periodId) return;

    this.isLoading.set(true);

    // Load score sheet for current user / unit
    this.kpiService.getMyScoreSheet(periodId).subscribe({
      next: (sheet) => {
        // For demonstration & management review, we load the list of evaluation sheets
        this.scoreSheets.set([sheet]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load score sheets:', err);
        this.isLoading.set(false);
      },
    });

    // Load bonus proposals
    this.kpiService.getBonusProposals(periodId).subscribe({
      next: (proposals) => this.bonusProposals.set(proposals),
      error: (err) => console.error('Failed to load bonus proposals:', err),
    });

    // Load special cases
    this.kpiService.getSpecialCases(periodId).subscribe({
      next: (cases) => this.specialCases.set(cases),
      error: (err) => console.error('Failed to load special cases:', err),
    });
  }

  reviewBonus(proposalId: string, status: 'approved' | 'rejected'): void {
    const note = this.proposalNotes[proposalId];
    this.isSubmittingBonus.set(true);
    this.kpiService.reviewBonusProposal(proposalId, status, note).subscribe({
      next: () => {
        this.isSubmittingBonus.set(false);
        this.loadAllData();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi duyệt điểm thưởng');
        this.isSubmittingBonus.set(false);
      },
    });
  }

  openReviewModal(sheet: ScoreCalculationSheet): void {
    this.selectedSheet.set(sheet);
    this.approvalForm = {
      classification: sheet.classificationEvaluation.suggestedClassification,
      meetsExtraConditions: false,
      overrideReason: '',
    };
  }

  confirmApproveScore(): void {
    const sheet = this.selectedSheet();
    if (!sheet) return;

    this.isApprovingScore.set(true);
    this.kpiService
      .approveKpiScore(
        sheet.employeeId,
        this.approvalForm.classification,
        this.approvalForm.meetsExtraConditions,
        this.approvalForm.overrideReason
      )
      .subscribe({
        next: () => {
          this.isApprovingScore.set(false);
          this.selectedSheet.set(null);
          this.loadAllData();
        },
        error: (err) => {
          alert(err.error?.message || 'Lỗi khi phê duyệt bảng điểm');
          this.isApprovingScore.set(false);
        },
      });
  }

  openSpecialCaseModal(): void {
    const reason = prompt('Nhập lý do / nội dung trường hợp đặc biệt (Mục III.7):');
    if (!reason) return;
    this.kpiService
      .registerSpecialCase({
        employeeId: this.authService.currentUser()?.id,
        periodId: this.selectedPeriodId(),
        caseType: 'sick_maternity_gte_2m',
        resolution: 'carried_to_next_period',
        note: reason,
      })
      .subscribe({
        next: () => this.loadAllData(),
        error: (err) => alert(err.error?.message || 'Lỗi đăng ký trường hợp đặc biệt'),
      });
  }

  getRoleBadgeText(sheet: ScoreCalculationSheet): string {
    return 'Viên chức';
  }

  getScoreColorClass(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-pass';
    return 'score-fail';
  }

  hasKhacOveruse(sheet: ScoreCalculationSheet): boolean {
    const khacAxis = sheet.axisBreakdown?.find((a) => a.axisCode === 'khac');
    return (khacAxis?.percentageOfTaskScore || 0) > 20;
  }

  hasSuspiciousTasks(sheet: ScoreCalculationSheet): boolean {
    return sheet.tasksBreakdown?.some((t) => t.warningFlags && t.warningFlags.length > 0) || false;
  }

  getBonusStatusLabel(status: string): string {
    switch (status) {
      case 'approved':
        return 'Đã duyệt (+5%)';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return 'Chờ thẩm định';
    }
  }

  getCaseTypeLabel(caseType: string): string {
    switch (caseType) {
      case 'sick_maternity_gte_2m':
        return 'Nghỉ ốm / Thai sản ≥ 2 tháng';
      case 'new_appointment_lt_2m':
        return 'Bổ nhiệm mới < 2 tháng';
      case 'transferred_lt_2m':
        return 'Điều động / Chuyển công tác < 2 tháng';
      case 'training_gte_2m':
        return 'Đào tạo tập trung ≥ 2 tháng';
      default:
        return caseType;
    }
  }

  getResolutionLabel(res: string): string {
    switch (res) {
      case 'carried_to_next_period':
        return 'Dồn kết quả sang quý sau';
      case 'use_old_unit_assessment':
        return 'Sử dụng đánh giá đơn vị cũ';
      default:
        return res;
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
}
