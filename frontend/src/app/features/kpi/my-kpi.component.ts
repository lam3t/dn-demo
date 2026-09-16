import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KpiFlexibleService } from '../../core/services/kpi-flexible.service';
import { AuthService } from '../../core/services/auth.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
import {
  EvaluationPeriod,
  ScoreCalculationSheet,
  AxisBreakdownItem,
  KpiBonusProposalItem,
  AnnualRollupResult,
} from '../../core/models/kpi-flexible.models';
import { KpiTaskDialogComponent } from './kpi-task-dialog.component';

@Component({
  selector: 'app-my-kpi',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, KpiTaskDialogComponent],
  template: `
    <div class="my-kpi-container">
      <!-- 1. PAGE HEADER -->
      <div class="page-header hide-on-print">
        <div class="header-left">
          <div class="breadcrumb-row">
            <span class="material-symbols-outlined">analytics</span>
            <span>Đánh Giá KPI Theo Trục Kết Quả Linh Hoạt (Sở GD&ĐT TP.HCM)</span>
          </div>
          <h1 class="page-title">Bảng Điểm KPI Cá Nhân & Phân Bổ Trục Kết Quả</h1>
          <p class="page-subtitle">
            Theo dõi điểm đánh giá định kỳ 4 quý trong năm và tổng kết tích lũy xếp loại chất lượng cả năm theo quy định.
          </p>
        </div>

        <div class="header-right-actions">
          <button
            type="button"
            class="btn-action btn-add-task"
            (click)="openCreateTaskDialog()"
          >
            <span class="material-symbols-outlined">add_task</span>
            <span>+ Tạo Nhiệm Vụ KPI</span>
          </button>

          <button
            type="button"
            class="btn-action btn-print"
            (click)="printScorecard()"
          >
            <span class="material-symbols-outlined">print</span>
            <span>In Bảng Điểm</span>
          </button>
        </div>
      </div>

      <!-- 2. PERIOD & STATUS BAR -->
      <div class="period-toolbar hide-on-print">
        <div class="period-picker">
          <label>
            <span class="material-symbols-outlined">event_note</span>
            <span>Kỳ / Năm đánh giá:</span>
          </label>
          <select
            class="form-select period-select"
            [ngModel]="selectedPeriodId()"
            (ngModelChange)="onPeriodChange($event)"
          >
            <optgroup [label]="'Đánh Giá 4 Quý Trong Năm Học ' + academicYearService.currentAcademicYear()">
              @for (p of (periods() || []); track p.id) {
                <option [value]="p.id">{{ p.name }} ({{ p.startDate | date: 'dd/MM' }} - {{ p.endDate | date: 'dd/MM/yyyy' }})</option>
              }
            </optgroup>
            <optgroup label="Đánh Giá Tổng Kết Cuối Năm">
              <option value="annual_rollup">📊 [TỔNG KẾT] Đánh Giá & Xếp Loại Cả Năm ({{ academicYearService.currentAcademicYear() }})</option>
            </optgroup>
          </select>
        </div>

        <div class="user-kpi-badge">
          <span class="material-symbols-outlined">account_circle</span>
          <div class="user-meta">
            <strong>{{ authService.currentUser()?.fullName || 'Viên chức' }}</strong>
            <span class="role-desc">{{ authService.currentUser()?.title || 'Giáo viên' }} • {{ authService.currentUser()?.primaryOrgUnitName || 'Tổ Chuyên môn' }}</span>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- A. ANNUAL ROLLUP VIEW (KHI CHỌN TỔNG KẾT CẢ NĂM) -->
      <!-- ========================================================================= -->
      @if (selectedPeriodId() === 'annual_rollup') {
        @if (isLoadingAnnual()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tổng hợp dữ liệu tích lũy 4 quý trong năm học...</p>
          </div>
        } @else {
          <!-- 1. 4 QUARTERS PROGRESS CARDS -->
          <div class="annual-quarters-grid">
            @for (q of (annualRollupData()?.quarters || []); track q.periodId) {
              <div class="quarter-card" [class.evaluated]="q.hasEvaluatedScore">
                <div class="q-top">
                  <span class="q-badge">QUÝ {{ q.quarterIndex }}</span>
                  <span class="q-status-tag" [ngClass]="getQuarterStatusClass(q.status)">
                    {{ q.status === 'closed' ? 'Đã chốt' : (q.status === 'open' ? 'Đang mở' : 'Dự thảo') }}
                  </span>
                </div>
                <h4 class="q-title">{{ q.periodName }}</h4>
                <span class="q-date-sub">{{ q.startDate | date: 'dd/MM' }} - {{ q.endDate | date: 'dd/MM/yyyy' }}</span>

                <div class="q-score-row">
                  <span class="q-score-num">{{ q.scoreFinal }} <small>/100đ</small></span>
                  <span class="classification-pill-sm" [ngClass]="getClassificationBadgeClass(q.classification)">
                    {{ getClassificationLabel(q.classification) }}
                  </span>
                </div>

                <div class="q-parts-row">
                  <span>Phần A: <strong>{{ q.scoreGeneral }}đ</strong></span>
                  <span class="sep">•</span>
                  <span>Phần B: <strong>{{ q.scoreTask }}đ</strong></span>
                  @if (q.scoreBonus > 0) {
                    <span class="sep">•</span>
                    <span class="text-emerald-700">Thưởng: <strong>+{{ q.scoreBonus }}đ</strong></span>
                  }
                </div>

                <div class="q-tasks-info">
                  <span class="material-symbols-outlined icon-tasks">task_alt</span>
                  <span>{{ q.completedTasks }} / {{ q.totalTasks }} việc hoàn thành</span>
                </div>
              </div>
            }
          </div>

          <!-- 2. ANNUAL RESULT CARD -->
          <div class="annual-result-card">
            <div class="annual-main-stats">
              <div class="annual-stat-box">
                <span class="stat-label">ĐIỂM TRUNG BÌNH CẢ NĂM</span>
                <span class="stat-score-val">{{ annualRollupData()?.avgScore || 0 }} <small>/ 100đ</small></span>
                <span class="stat-formula">Điểm TB tích lũy các quý trong năm học</span>
              </div>

              <div class="annual-classification-box">
                <span class="stat-label">XẾP LOẠI CHẤT LƯỢNG CUỐI NĂM ĐỀ XUẤT</span>
                <div
                  class="yearly-class-badge"
                  [style.background-color]="(annualRollupData()?.yearlyClassificationColor || '#2563eb') + '20'"
                  [style.color]="annualRollupData()?.yearlyClassificationColor || '#2563eb'"
                  [style.border-color]="annualRollupData()?.yearlyClassificationColor || '#2563eb'"
                >
                  <span class="material-symbols-outlined">military_tech</span>
                  <strong>{{ annualRollupData()?.yearlyClassificationLabel || 'Chưa đánh giá' }}</strong>
                </div>
                <span class="stat-desc">Căn cứ theo Nghị định 90/2020/NĐ-CP & Quy định Sở GD&ĐT</span>
              </div>
            </div>

            @if (annualRollupData()?.warningMessage) {
              <div class="annual-warning-banner" [class.danger]="annualRollupData()?.requiresReplacementWarning">
                <span class="material-symbols-outlined">warning</span>
                <span>{{ annualRollupData()?.warningMessage }}</span>
              </div>
            }
          </div>

          <!-- 3. DETAILED QUARTERS TABLE -->
          <div class="section-card">
            <div class="section-header">
              <div class="header-left">
                <span class="material-symbols-outlined header-icon">table_chart</span>
                <div>
                  <h3 class="section-title">Bảng Tổng Hợp Điểm Tích Lũy 4 Quý Trong Năm Học {{ annualRollupData()?.schoolYear }}</h3>
                  <span class="section-subtitle">Tổng hợp chi tiết thành phần điểm và kết quả phân loại từng quý làm cơ sở xếp loại cuối năm</span>
                </div>
              </div>
            </div>

            <div class="table-responsive">
              <table class="quarter-table">
                <thead>
                  <tr>
                    <th>Kỳ Đánh Giá</th>
                    <th>Khoảng Thời Gian</th>
                    <th class="text-center">Phần A: Tiêu Chuẩn Chung (30đ)</th>
                    <th class="text-center">Phần B: Nhiệm Vụ Theo Trục (70đ)</th>
                    <th class="text-center">Điểm Thưởng (+5%)</th>
                    <th class="text-center">Tổng Điểm Quý</th>
                    <th class="text-center">Xếp Loại Quý</th>
                    <th class="text-center">Khối Lượng Việc</th>
                    <th class="text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  @for (q of (annualRollupData()?.quarters || []); track q.periodId) {
                    <tr>
                      <td><strong>{{ q.periodName }}</strong></td>
                      <td class="text-slate-600 font-mono">{{ q.startDate | date: 'dd/MM/yyyy' }} - {{ q.endDate | date: 'dd/MM/yyyy' }}</td>
                      <td class="text-center font-bold text-blue-700">{{ q.scoreGeneral }}đ</td>
                      <td class="text-center font-bold text-slate-800">{{ q.scoreTask }}đ</td>
                      <td class="text-center font-bold text-emerald-700">+{{ q.scoreBonus }}đ</td>
                      <td class="text-center">
                        <span class="score-badge-q">{{ q.scoreFinal }} <small>/100đ</small></span>
                      </td>
                      <td class="text-center">
                        <span class="classification-pill-sm" [ngClass]="getClassificationBadgeClass(q.classification)">
                          {{ getClassificationLabel(q.classification) }}
                        </span>
                      </td>
                      <td class="text-center text-slate-700">{{ q.completedTasks }}/{{ q.totalTasks }} việc</td>
                      <td class="text-center">
                        <span class="q-status-badge" [ngClass]="getQuarterStatusClass(q.status)">
                          {{ q.status === 'closed' ? 'Đã chốt' : (q.status === 'open' ? 'Đang mở' : 'Dự thảo') }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      } @else {
        <!-- ========================================================================= -->
        <!-- B. QUARTERLY SCORECARD VIEW (KHI CHỌN QUÝ CỤ THỂ) -->
        <!-- ========================================================================= -->

        <!-- 3. SCORECARD HIGHLIGHT CARDS (100-POINT SYSTEM) -->
        <div class="scorecard-grid">
          <!-- CRITERIA A: GENERAL (30 PTS) -->
          <div class="score-summary-card card-general">
            <div class="card-top">
              <span class="section-tag">PHẦN A (30 ĐIỂM)</span>
              <span class="material-symbols-outlined card-icon">verified_user</span>
            </div>

            @if (isEditingGeneralScore) {
              <div class="score-input-inline">
                <input
                  type="number"
                  min="0"
                  max="30"
                  class="input-general-score"
                  [(ngModel)]="inputGeneralScore"
                  (keyup.enter)="saveGeneralScore()"
                  placeholder="0-30"
                />
                <span class="score-max">/ 30đ</span>
                <button
                  type="button"
                  class="btn-save-general"
                  (click)="saveGeneralScore()"
                  [disabled]="isSavingGeneral"
                  title="Lưu điểm Phần A"
                >
                  <span class="material-symbols-outlined">check</span>
                </button>
                <button
                  type="button"
                  class="btn-cancel-general"
                  (click)="cancelEditGeneralScore()"
                  title="Hủy"
                >
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            } @else {
              <div class="score-display">
                <span class="score-number">{{ generalScore() }}</span>
                <span class="score-max">/ 30đ</span>
                <button
                  type="button"
                  class="btn-edit-general"
                  (click)="startEditGeneralScore()"
                  title="Bấm để nhập/sửa điểm Tiêu chuẩn chung"
                >
                  <span class="material-symbols-outlined">edit_note</span>
                  <span>Nhập điểm</span>
                </button>
              </div>
            }

            <span class="score-label">Tiêu Chuẩn Chung</span>
            <p class="score-desc">Ý thức kỷ luật, đạo đức nhà giáo, thực hiện quy chế, đổi mới sáng tạo</p>
            <div class="card-progress">
              <div class="progress-bar-fill" [style.width.%]="(generalScore() / 30) * 100"></div>
            </div>
          </div>

          <!-- CRITERIA B: 9-AXES TASK RESULTS (70 PTS) -->
          <div class="score-summary-card card-task">
            <div class="card-top">
              <span class="section-tag">PHẦN B (70 ĐIỂM)</span>
              <span class="material-symbols-outlined card-icon">hub</span>
            </div>
            <div class="score-display">
              <span class="score-number text-blue">{{ taskScore() }}</span>
              <span class="score-max">/ 70đ</span>
            </div>
            <span class="score-label">Kết Quả Thực Hiện Theo Trục</span>
            <p class="score-desc">{{ tasksCount() }} nhiệm vụ đã giao kết nối theo các trục kết quả</p>
            <div class="card-progress">
              <div class="progress-bar-fill bg-blue" [style.width.%]="(taskScore() / 70) * 100"></div>
            </div>
          </div>

          <!-- CRITERIA C: BONUS POINTS (+5%, CAPPED AT 7 PTS / 10%) -->
          <div class="score-summary-card card-bonus">
            <div class="card-top">
              <span class="section-tag">ĐIỂM THƯỞNG (+5%)</span>
              <span class="material-symbols-outlined card-icon">stars</span>
            </div>
            <div class="score-display">
              <span class="score-number text-emerald">+{{ bonusScore() }}</span>
              <span class="score-max">/ 7đ</span>
              @if (scoreSheet()?.bonusDetails && (scoreSheet()?.bonusDetails)!.length > 0) {
                <span class="bonus-auto-pill" [title]="'Tự động cộng thưởng từ ' + (scoreSheet()?.bonusDetails)!.length + ' nhiệm vụ đủ điều kiện'">
                  {{ (scoreSheet()?.bonusDetails)!.length }} việc +5%
                </span>
              }
            </div>
            <span class="score-label">Tự Động Tính Từ Nhiệm Vụ</span>
            <p class="score-desc">Tự động cộng +5% từ các công việc hoàn thành trước hạn, có minh chứng hoặc đánh giá xuất sắc (Trần 7đ & 10%)</p>
            <div class="card-progress">
              <div class="progress-bar-fill bg-emerald" [style.width.%]="(bonusScore() / 7) * 100"></div>
            </div>
          </div>

          <!-- FINAL CLASSIFICATION -->
          <div class="score-summary-card card-final">
            <div class="card-top">
              <span class="section-tag">TỔNG ĐIỂM CHỐT</span>
              <span class="material-symbols-outlined card-icon">military_tech</span>
            </div>
            <div class="score-display">
              <span class="score-number highlight">{{ finalScore() }}</span>
              <span class="score-max">/ 100đ</span>
            </div>
            <div class="classification-box">
              <span
                class="classification-badge"
                [style.background-color]="classificationColor() + '20'"
                [style.color]="classificationColor()"
                [style.border-color]="classificationColor()"
              >
                {{ classificationLabel() }}
              </span>
            </div>
            <p class="score-desc">{{ classificationSubText() }}</p>
          </div>
        </div>

        <!-- 4. ANTI-FRAUD / HEURISTIC DIAGNOSTIC NOTICES -->
        @if (diagnosticWarnings().length > 0) {
          <div class="alert-notice-card alert-warning">
            <span class="material-symbols-outlined notice-icon">security</span>
            <div class="notice-content">
              <strong>Lưu ý kiểm soát & chống nhiệm vụ hình thức (Quy tắc Sở GD&ĐT):</strong>
              <ul>
                @for (w of (diagnosticWarnings() || []); track w) {
                  <li>{{ w }}</li>
                }
              </ul>
            </div>
          </div>
        }

        <!-- 5. 9-AXES LOAD DISTRIBUTION & BREAKDOWN -->
        <div class="section-card">
          <div class="section-header">
            <div class="header-left">
              <span class="material-symbols-outlined header-icon">bar_chart</span>
              <div>
                <h3 class="section-title">Phân Bổ Điểm Theo Trục Kết Quả (Thang 70 Điểm)</h3>
                <span class="section-subtitle">Không bắt buộc phủ kín tất cả các trục — Trục không phát sinh việc không chấm điểm</span>
              </div>
            </div>
          </div>

          <div class="axis-bars-grid">
            @for (axis of (scoreSheet()?.axisBreakdown || []); track axis.axisId) {
              <div class="axis-card" [class.has-tasks]="axis.totalTasks > 0">
                <div class="axis-card-top">
                  <div class="axis-title-box">
                    <span class="axis-dot" [style.background-color]="getAxisColor(axis.axisCode)"></span>
                    <strong>{{ axis.axisName }}</strong>
                  </div>
                  <span class="axis-points-badge">{{ axis.achievedScore }} / {{ axis.totalWeightScore }}đ</span>
                </div>

                <div class="axis-progress-track">
                  <div
                    class="axis-progress-bar"
                    [style.width.%]="axis.percentageOfTaskScore"
                    [style.background-color]="getAxisColor(axis.axisCode)"
                  ></div>
                </div>

                <div class="axis-card-footer">
                  <span class="task-count">{{ axis.completedTasks }}/{{ axis.totalTasks }} việc hoàn thành</span>
                  <span class="pct-share">{{ axis.percentageOfTaskScore }}% điểm phần B</span>
                </div>

                <!-- CHUYEN MON SUBTYPE BREAKDOWN FOR TEACHERS -->
                @if (axis.axisCode === 'chuyen_mon' && axis.subtypes) {
                  <div class="chuyen-mon-subtypes">
                    <div class="sub-item">
                      <span class="sub-label">↳ GV Bộ môn:</span>
                      <span class="sub-score">{{ axis.subtypes.gv_bo_mon?.achievedScore || 0 }}đ ({{ axis.subtypes.gv_bo_mon?.totalTasks || 0 }} việc)</span>
                    </div>
                    <div class="sub-item">
                      <span class="sub-label">↳ GVCN:</span>
                      <span class="sub-score">{{ axis.subtypes.gvcn?.achievedScore || 0 }}đ ({{ axis.subtypes.gvcn?.totalTasks || 0 }} việc)</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- 6. TASK LIST TABLE IN EVALUATION PERIOD -->
        <div class="section-card">
          <div class="section-header">
            <div class="header-left">
              <span class="material-symbols-outlined header-icon">checklist</span>
              <div>
                <h3 class="section-title">Danh Mục Nhiệm Vụ KPI Trong Kỳ</h3>
                <span class="section-subtitle">Chấm điểm dựa trên Trục chính, minh chứng hoàn thành & xét duyệt điểm thưởng</span>
              </div>
            </div>
            <button type="button" class="btn-action btn-add-sm" (click)="openCreateTaskDialog()">
              <span class="material-symbols-outlined">add</span>
              <span>Thêm việc mới</span>
            </button>
          </div>

          <div class="table-responsive">
            <table class="kpi-task-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên Nhiệm Vụ & Sản Phẩm Đầu Ra</th>
                  <th>Trục Chính</th>
                  <th class="text-center">Trọng Số (70đ)</th>
                  <th class="text-center">Tiến Độ</th>
                  <th class="text-center">Minh Chứng</th>
                  <th class="text-center">Điểm Đạt</th>
                  <th class="text-center">Cảnh Báo</th>
                  <th class="text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                @for (task of (scoreSheet()?.tasksBreakdown || []); track task.id; let idx = $index) {
                  <tr>
                    <td class="text-center">{{ idx + 1 }}</td>
                    <td>
                      <div class="task-title-cell">
                        <strong>{{ task.title }}</strong>
                        @if (task.description) {
                          <span class="task-desc-line">{{ task.description }}</span>
                        }
                        @if (task.taskSubtype) {
                          <span class="subtype-tag">
                            {{ task.taskSubtype === 'gv_bo_mon' ? 'Giáo viên bộ môn' : 'Giáo viên chủ nhiệm' }}
                          </span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="axis-pill" [style.border-color]="getAxisColor(task.primaryAxis?.code || '')">
                        {{ task.primaryAxis?.name || 'Chưa gán' }}
                      </span>
                    </td>
                    <td class="text-center font-bold">{{ task.weightScore || 0 }}đ</td>
                    <td class="text-center">
                      <div class="progress-cell">
                        <div class="mini-progress-track">
                          <div class="mini-progress-fill" [style.width.%]="task.progressPercent"></div>
                        </div>
                        <span class="progress-pct">{{ task.progressPercent }}%</span>
                      </div>
                    </td>
                    <td class="text-center">
                      @if (task.evidenceCount > 0) {
                        <span class="badge-evidence" title="Đã đính kèm minh chứng">
                          <span class="material-symbols-outlined">attachment</span> {{ task.evidenceCount }}
                        </span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td class="text-center font-bold text-blue">{{ task.achievedScore || 0 }}đ</td>
                    <td class="text-center">
                      @if (task.warningFlags && task.warningFlags.length > 0) {
                        <span class="warn-chip" [title]="task.warningFlags.join('; ')">
                          <span class="material-symbols-outlined">warning</span> Cảnh báo
                        </span>
                      } @else {
                        <span class="text-green font-bold">✓ Chuẩn</span>
                      }
                    </td>
                    <td class="text-center">
                      <div class="table-actions">
                        <button
                          type="button"
                          class="btn-table-action"
                          (click)="openTask(task.id)"
                          title="Xem chi tiết công việc"
                        >
                          <span class="material-symbols-outlined">visibility</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- DIALOG TẠO/SỬA NHIỆM VỤ KPI -->
      @if (isTaskDialogOpen()) {
        <app-kpi-task-dialog
          [task]="editingTask()"
          [periodId]="selectedPeriodId() === 'annual_rollup' ? (periods()[0]?.id || '') : selectedPeriodId()"
          (saved)="onTaskSaved($event)"
          (cancelled)="onTaskDialogCancelled()"
        ></app-kpi-task-dialog>
      }
    </div>
  `,
  styles: [
    `
      .my-kpi-container {
        padding: 1.25rem 1.5rem 3rem;
        max-width: 1440px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      /* Page Header */
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1.5rem;
        flex-wrap: wrap;

        .breadcrumb-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #0284c7;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px;
        }

        .page-subtitle {
          font-size: 0.86rem;
          color: #64748b;
          margin: 0;
          max-width: 780px;
        }

        .header-right-actions {
          display: flex;
          gap: 10px;
        }
      }

      .btn-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;

        &.btn-add-task {
          background: #0284c7;
          color: #ffffff;
          &:hover { background: #0369a1; }
        }

        &.btn-print {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #475569;
          &:hover { background: #f1f5f9; }
        }

        &.btn-add-sm {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
          padding: 5px 10px;
          font-size: 0.76rem;
          &:hover { background: #dbeafe; }
        }
      }

      /* Period Toolbar */
      .period-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 18px;
        flex-wrap: wrap;
        gap: 12px;

        .period-picker {
          display: flex;
          align-items: center;
          gap: 10px;

          label {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.82rem;
            font-weight: 700;
            color: #334155;
          }

          .period-select {
            min-width: 320px;
            height: 38px;
            padding: 0 12px;
            border-radius: 8px;
            border: 1.5px solid #cbd5e1;
            font-size: 0.86rem;
            font-weight: 600;
            color: #0f172a;
            outline: none;
            &:focus { border-color: #0284c7; }
          }
        }

        .user-kpi-badge {
          display: flex;
          align-items: center;
          gap: 8px;

          .material-symbols-outlined {
            font-size: 30px;
            color: #0284c7;
          }

          .user-meta {
            display: flex;
            flex-direction: column;
            font-size: 0.8rem;
            strong { color: #0f172a; font-size: 0.88rem; }
            .role-desc { color: #64748b; font-size: 0.74rem; }
          }
        }
      }

      /* =========================================
         ANNUAL ROLLUP STYLES
         ========================================= */
      .annual-quarters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;

        .quarter-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);

          &.evaluated {
            border-color: #93c5fd;
            background: #f8fafc;
          }

          .q-top {
            display: flex;
            align-items: center;
            justify-content: space-between;

            .q-badge {
              font-size: 0.72rem;
              font-weight: 800;
              background: #0284c7;
              color: #ffffff;
              padding: 2px 8px;
              border-radius: 4px;
            }

            .q-status-tag {
              font-size: 0.7rem;
              font-weight: 700;
              padding: 1px 6px;
              border-radius: 4px;
              &.st-open { background: #ecfdf5; color: #059669; }
              &.st-closed { background: #f1f5f9; color: #475569; }
              &.st-draft { background: #fffbeb; color: #b45309; }
            }
          }

          .q-title {
            font-size: 1.05rem;
            font-weight: 800;
            color: #0f172a;
            margin: 2px 0 0;
          }

          .q-date-sub {
            font-size: 0.72rem;
            color: #64748b;
          }

          .q-score-row {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            margin: 4px 0 2px;

            .q-score-num {
              font-size: 1.4rem;
              font-weight: 800;
              color: #0284c7;
              small { font-size: 0.75rem; color: #64748b; font-weight: 500; }
            }
          }

          .q-parts-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.76rem;
            color: #475569;
            background: #ffffff;
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;

            .sep { color: #cbd5e1; }
          }

          .q-tasks-info {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.74rem;
            color: #059669;
            font-weight: 600;
            margin-top: 2px;

            .icon-tasks { font-size: 15px; }
          }
        }
      }

      .annual-result-card {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border-radius: 14px;
        padding: 20px 24px;
        color: #ffffff;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
        display: flex;
        flex-direction: column;
        gap: 16px;

        .annual-main-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          align-items: center;

          .annual-stat-box {
            display: flex;
            flex-direction: column;
            gap: 4px;

            .stat-label {
              font-size: 0.76rem;
              font-weight: 800;
              letter-spacing: 0.05em;
              color: #94a3b8;
              text-transform: uppercase;
            }

            .stat-score-val {
              font-size: 2.2rem;
              font-weight: 900;
              color: #38bdf8;
              line-height: 1.1;

              small { font-size: 1rem; color: #94a3b8; font-weight: 500; }
            }

            .stat-formula {
              font-size: 0.76rem;
              color: #cbd5e1;
            }
          }

          .annual-classification-box {
            display: flex;
            flex-direction: column;
            gap: 6px;

            .stat-label {
              font-size: 0.76rem;
              font-weight: 800;
              letter-spacing: 0.05em;
              color: #94a3b8;
              text-transform: uppercase;
            }

            .yearly-class-badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 8px 16px;
              border-radius: 10px;
              border: 1.5px solid;
              font-size: 1.05rem;
              font-weight: 800;
              width: fit-content;

              .material-symbols-outlined { font-size: 24px; }
            }

            .stat-desc {
              font-size: 0.74rem;
              color: #94a3b8;
            }
          }
        }

        .annual-warning-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(217, 119, 6, 0.2);
          border: 1px solid #d97706;
          color: #fef3c7;
          font-size: 0.82rem;

          &.danger {
            background: rgba(220, 38, 38, 0.2);
            border-color: #dc2626;
            color: #fee2e2;
          }

          .material-symbols-outlined { font-size: 20px; }
        }
      }

      .quarter-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;

        th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          font-size: 0.76rem;
          padding: 10px 14px;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
        }

        td {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
        }

        .score-badge-q {
          display: inline-block;
          font-size: 0.92rem;
          font-weight: 800;
          color: #0284c7;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          padding: 2px 8px;
          border-radius: 6px;

          small { font-size: 0.72rem; color: #64748b; font-weight: 500; }
        }

        .q-status-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          &.st-open { background: #ecfdf5; color: #059669; }
          &.st-closed { background: #f1f5f9; color: #475569; }
          &.st-draft { background: #fffbeb; color: #b45309; }
        }
      }

      /* =========================================
         QUARTERLY SCORECARD STYLES
         ========================================= */
      .scorecard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 14px;

        .score-summary-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);

          &.card-general { border-left: 4px solid #2563eb; }
          &.card-task { border-left: 4px solid #0284c7; }
          &.card-bonus { border-left: 4px solid #059669; }
          &.card-final { border-left: 4px solid #7c3aed; }

          .card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;

            .section-tag {
              font-size: 0.72rem;
              font-weight: 800;
              color: #64748b;
              letter-spacing: 0.04em;
            }

            .card-icon { font-size: 20px; color: #94a3b8; }
          }

          .score-display {
            display: flex;
            align-items: baseline;
            gap: 6px;
            margin: 4px 0;

            .score-number {
              font-size: 1.7rem;
              font-weight: 900;
              color: #0f172a;
              line-height: 1;

              &.text-blue { color: #0284c7; }
              &.text-emerald { color: #059669; }
              &.highlight { color: #7c3aed; }
            }

            .score-max {
              font-size: 0.8rem;
              color: #64748b;
              font-weight: 600;
            }

            .bonus-auto-pill {
              font-size: 0.7rem;
              font-weight: 800;
              background: #ecfdf5;
              color: #047857;
              border: 1px solid #a7f3d0;
              padding: 2px 6px;
              border-radius: 4px;
              margin-left: auto;
            }

            .btn-edit-general {
              margin-left: auto;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              color: #1d4ed8;
              padding: 3px 8px;
              border-radius: 6px;
              font-size: 0.74rem;
              font-weight: 700;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 3px;

              .material-symbols-outlined { font-size: 15px; }
              &:hover { background: #dbeafe; }
            }
          }

          .score-input-inline {
            display: flex;
            align-items: center;
            gap: 6px;
            margin: 4px 0;

            .input-general-score {
              width: 60px;
              height: 32px;
              border-radius: 6px;
              border: 1.5px solid #0284c7;
              text-align: center;
              font-size: 1rem;
              font-weight: 800;
              color: #0f172a;
            }

            .btn-save-general {
              width: 30px;
              height: 30px;
              background: #059669;
              color: #ffffff;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              .material-symbols-outlined { font-size: 18px; }
            }

            .btn-cancel-general {
              width: 30px;
              height: 30px;
              background: #f1f5f9;
              color: #64748b;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              .material-symbols-outlined { font-size: 18px; }
            }
          }

          .score-label {
            font-size: 0.86rem;
            font-weight: 700;
            color: #1e293b;
          }

          .score-desc {
            font-size: 0.74rem;
            color: #64748b;
            margin: 0;
            line-height: 1.35;
          }

          .card-progress {
            height: 4px;
            background: #e2e8f0;
            border-radius: 999px;
            overflow: hidden;
            margin-top: 4px;

            .progress-bar-fill {
              height: 100%;
              background: #2563eb;
              &.bg-blue { background: #0284c7; }
              &.bg-emerald { background: #059669; }
            }
          }

          .classification-box {
            margin: 2px 0;

            .classification-badge {
              display: inline-block;
              font-size: 0.78rem;
              font-weight: 800;
              padding: 3px 10px;
              border-radius: 999px;
              border: 1px solid;
            }
          }
        }
      }

      .classification-pill-sm {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        white-space: nowrap;

        &.pill-xuat-sac { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
        &.pill-tot { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        &.pill-hoan-thanh { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        &.pill-chua-dat { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
      }

      /* Sections common */
      .section-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 18px 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;

          .header-left {
            display: flex;
            align-items: center;
            gap: 10px;

            .header-icon {
              font-size: 22px;
              color: #0284c7;
              background: #f0f9ff;
              padding: 6px;
              border-radius: 8px;
            }

            .section-title {
              font-size: 1.05rem;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
            }

            .section-subtitle {
              font-size: 0.78rem;
              color: #64748b;
              display: block;
              margin-top: 2px;
            }
          }
        }
      }

      .axis-bars-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;

        .axis-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;

          &.has-tasks { background: #ffffff; border-color: #cbd5e1; }

          .axis-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;

            .axis-title-box {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.82rem;

              .axis-dot { width: 8px; height: 8px; border-radius: 50%; }
            }

            .axis-points-badge {
              font-size: 0.74rem;
              font-weight: 800;
              background: #f1f5f9;
              padding: 1px 6px;
              border-radius: 4px;
            }
          }

          .axis-progress-track {
            height: 4px;
            background: #e2e8f0;
            border-radius: 999px;
            overflow: hidden;

            .axis-progress-bar { height: 100%; border-radius: 999px; }
          }

          .axis-card-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.72rem;
            color: #64748b;
          }

          .chuyen-mon-subtypes {
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px dashed #e2e8f0;
            font-size: 0.72rem;
            color: #475569;
          }
        }
      }

      .table-responsive { overflow-x: auto; }

      .kpi-task-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;

        th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          font-size: 0.75rem;
          padding: 10px 14px;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
        }

        td {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
        }

        .task-title-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
          .task-desc-line { font-size: 0.74rem; color: #64748b; }
          .subtype-tag { font-size: 0.68rem; font-weight: 700; color: #0284c7; background: #f0f9ff; padding: 1px 5px; border-radius: 4px; width: fit-content; }
        }

        .axis-pill {
          font-size: 0.74rem;
          font-weight: 700;
          background: #f8fafc;
          border-left: 3px solid #0284c7;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .progress-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          .mini-progress-track { width: 50px; height: 4px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
          .mini-progress-fill { height: 100%; background: #059669; }
          .progress-pct { font-size: 0.76rem; font-weight: 700; }
        }

        .badge-evidence {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 0.74rem;
          font-weight: 700;
          color: #0284c7;
          background: #f0f9ff;
          padding: 2px 6px;
          border-radius: 4px;
          .material-symbols-outlined { font-size: 14px; }
        }

        .warn-chip {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #b45309;
          background: #fef3c7;
          padding: 2px 6px;
          border-radius: 4px;
          .material-symbols-outlined { font-size: 14px; }
        }

        .btn-table-action {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          &:hover { background: #0284c7; color: #ffffff; border-color: #0284c7; }
          .material-symbols-outlined { font-size: 16px; }
        }
      }

      .alert-notice-card {
        background: #fffbeb;
        border: 1px solid #fcd34d;
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 0.82rem;
        color: #92400e;

        .notice-icon { font-size: 20px; color: #d97706; }
        ul { margin: 4px 0 0; padding-left: 18px; }
      }

      .loading-state {
        text-align: center;
        padding: 40px;
        color: #64748b;
        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #e2e8f0;
          border-top-color: #0284c7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @media print {
        .hide-on-print { display: none !important; }
      }
    `,
  ],
})
export class MyKpiComponent implements OnInit {
  private kpiService = inject(KpiFlexibleService);
  private router = inject(Router);
  public authService = inject(AuthService);
  public academicYearService = inject(AcademicYearService);
  private destroyRef = inject(DestroyRef);

  periods = signal<EvaluationPeriod[]>([]);
  selectedPeriodId = signal<string>('');
  scoreSheet = signal<ScoreCalculationSheet | null>(null);

  // Annual rollup signal
  annualRollupData = signal<AnnualRollupResult | null>(null);
  isLoadingAnnual = signal<boolean>(false);

  showBonusModal = signal<boolean>(false);
  showSubmitScoreModal = signal<boolean>(false);
  isTaskDialogOpen = signal<boolean>(false);
  editingTask = signal<any>(null);

  isSubmittingBonus = signal<boolean>(false);
  isSubmittingScore = signal<boolean>(false);

  // Điểm phần A tự nhập
  isEditingGeneralScore = false;
  inputGeneralScore = 30;
  isSavingGeneral = false;

  generalScore = computed(() => {
    return this.scoreSheet()?.scoreGeneral ?? 30;
  });

  taskScore = computed(() => {
    return this.scoreSheet()?.scoreTask || 0;
  });

  bonusScore = computed(() => {
    return this.scoreSheet()?.scoreBonusCapped || 0;
  });

  finalScore = computed(() => {
    const s = this.scoreSheet();
    if (!s) return 30;
    if (typeof s.scoreFinal === 'number') return s.scoreFinal;
    const gen = s.scoreGeneral ?? 30;
    const task = s.scoreTask ?? 0;
    const bonus = s.scoreBonusCapped ?? 0;
    return Math.min(100, Math.round((gen + task + bonus) * 100) / 100);
  });

  startEditGeneralScore(): void {
    this.inputGeneralScore = this.generalScore();
    this.isEditingGeneralScore = true;
  }

  cancelEditGeneralScore(): void {
    this.isEditingGeneralScore = false;
  }

  saveGeneralScore(): void {
    const val = Math.min(30, Math.max(0, Number(this.inputGeneralScore) || 0));
    const periodId = this.selectedPeriodId();
    const userId = this.authService.currentUser()?.id;
    if (!periodId || !userId) return;

    this.isSavingGeneral = true;
    this.kpiService
      .updateScoreGeneral({
        employeeId: userId,
        periodId,
        scoreGeneral: val,
      })
      .subscribe({
        next: (res) => {
          this.isSavingGeneral = false;
          this.isEditingGeneralScore = false;
          if (res?.data?.calc) {
            this.scoreSheet.set({
              ...res.data.calc,
              classificationEvaluation: res.data.classificationEval,
            });
          }
          this.loadScoreSheet();
        },
        error: (err) => {
          alert(err.error?.message || 'Có lỗi xảy ra khi cập nhật điểm');
          this.isSavingGeneral = false;
        },
      });
  }

  bonusForm = {
    taskId: '',
    reasonType: 'tien_do_vuot' as 'tien_do_vuot' | 'sang_kien_moi',
    reasonDescription: '',
  };

  selfScoreForm = {
    scoreGeneral: 30,
    note: '',
  };

  tasksCount = computed(() => {
    return this.scoreSheet()?.tasksBreakdown?.length || 0;
  });

  completedTasks = computed(() => {
    return this.scoreSheet()?.tasksBreakdown?.filter((t) => t.progressPercent >= 100) || [];
  });

  classificationLabel = computed(() => {
    return this.scoreSheet()?.classificationEvaluation?.classificationLabel || 'Không hoàn thành nhiệm vụ';
  });

  classificationColor = computed(() => {
    return this.scoreSheet()?.classificationEvaluation?.classificationColor || '#dc2626';
  });

  classificationSubText = computed(() => {
    const s = this.scoreSheet();
    if (!s) return 'Chưa có dữ liệu đánh giá';
    if (s.classificationEvaluation?.hasUncompletedTasks) {
      return 'Có nhiệm vụ chưa hoàn thành 100% trong kỳ';
    }
    return 'Cần người có thẩm quyền xác nhận điều kiện bắt buộc kèm theo';
  });

  diagnosticWarnings = computed(() => {
    const s = this.scoreSheet();
    if (!s) return [];
    const warnings: string[] = [];

    // Check Khac overuse
    const khacAxis = s.axisBreakdown?.find((a) => a.axisCode === 'khac');
    if ((khacAxis?.percentageOfTaskScore || 0) > 20) {
      warnings.push(`Trục 'Khác' chiếm ${khacAxis?.percentageOfTaskScore}% điểm (vượt ngưỡng 20%) — Đề nghị rà soát và chuyển việc sang các trục chuyên biệt.`);
    }

    // Check suspicious tasks
    const suspiciousCount = s.tasksBreakdown?.filter((t) => t.warningFlags && t.warningFlags.length > 0).length || 0;
    if (suspiciousCount > 0) {
      warnings.push(`Có ${suspiciousCount} nhiệm vụ có cảnh báo kiểm chuẩn (tạo sát hạn chốt kỳ hoặc trọng số nhỏ).`);
    }

    return warnings;
  });

  ngOnInit(): void {
    this.loadPeriods();

    this.academicYearService.yearChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadPeriods();
      });
  }

  loadPeriods(): void {
    const selectedYear = this.academicYearService.currentAcademicYear();
    this.kpiService.getPeriods(selectedYear).subscribe({
      next: (periods) => {
        this.periods.set(periods);
        if (periods.length > 0) {
          const current = periods.find((p) => p.status === 'open') || periods[0];
          this.selectedPeriodId.set(current.id);
          this.loadScoreSheet();
        }
      },
      error: (err) => console.error('Failed to load periods:', err),
    });
  }

  onPeriodChange(periodId: string): void {
    this.selectedPeriodId.set(periodId);
    if (periodId === 'annual_rollup') {
      this.loadAnnualRollup();
    } else {
      this.loadScoreSheet();
    }
  }

  loadScoreSheet(): void {
    const periodId = this.selectedPeriodId();
    if (!periodId || periodId === 'annual_rollup') return;

    this.kpiService.getMyScoreSheet(periodId).subscribe({
      next: (sheet) => {
        this.scoreSheet.set(sheet);
        if (sheet?.scoreGeneral !== undefined) {
          this.selfScoreForm.scoreGeneral = sheet.scoreGeneral;
        }
      },
      error: (err) => console.error('Failed to load score sheet:', err),
    });
  }

  loadAnnualRollup(): void {
    this.isLoadingAnnual.set(true);
    const selectedYear = this.academicYearService.currentAcademicYear();
    this.kpiService.getAnnualRollup(undefined, selectedYear).subscribe({
      next: (data) => {
        this.annualRollupData.set(data);
        this.isLoadingAnnual.set(false);
      },
      error: (err) => {
        console.error('Failed to load annual rollup:', err);
        this.isLoadingAnnual.set(false);
      },
    });
  }

  openCreateTaskDialog(): void {
    this.editingTask.set(null);
    this.isTaskDialogOpen.set(true);
  }

  editTask(task: any): void {
    this.editingTask.set(task);
    this.isTaskDialogOpen.set(true);
  }

  onTaskSaved(savedTask: any): void {
    this.isTaskDialogOpen.set(false);
    if (this.selectedPeriodId() === 'annual_rollup') {
      this.loadAnnualRollup();
    } else {
      this.loadScoreSheet();
    }
  }

  onTaskDialogCancelled(): void {
    this.isTaskDialogOpen.set(false);
  }

  openBonusModal(): void {
    this.bonusForm = {
      taskId: '',
      reasonType: 'tien_do_vuot',
      reasonDescription: '',
    };
    this.showBonusModal.set(true);
  }

  openBonusModalForTask(task: any): void {
    this.bonusForm = {
      taskId: task.id,
      reasonType: 'tien_do_vuot',
      reasonDescription: '',
    };
    this.showBonusModal.set(true);
  }

  submitBonusProposal(): void {
    if (!this.bonusForm.taskId) return;
    this.isSubmittingBonus.set(true);

    this.kpiService
      .proposeBonus({
        taskId: this.bonusForm.taskId,
        periodId: this.selectedPeriodId() === 'annual_rollup' ? (this.periods()[0]?.id || '') : this.selectedPeriodId(),
        reasonType: this.bonusForm.reasonType,
        reasonDescription: this.bonusForm.reasonDescription,
      })
      .subscribe({
        next: () => {
          this.isSubmittingBonus.set(false);
          this.showBonusModal.set(false);
          alert('Đề xuất điểm thưởng (+5%) đã được gửi lên Cấp quản lý phê duyệt!');
          this.loadScoreSheet();
        },
        error: (err) => {
          alert(err.error?.message || 'Có lỗi xảy ra khi gửi đề xuất thưởng');
          this.isSubmittingBonus.set(false);
        },
      });
  }

  openSubmitScoreModal(): void {
    this.showSubmitScoreModal.set(true);
  }

  confirmSubmitScore(): void {
    this.isSubmittingScore.set(true);
    this.kpiService
      .submitKpiScore(
        this.selectedPeriodId(),
        this.selfScoreForm.scoreGeneral,
        this.selfScoreForm.note
      )
      .subscribe({
        next: () => {
          this.isSubmittingScore.set(false);
          this.showSubmitScoreModal.set(false);
          alert('Bảng điểm tự đánh giá đã được nộp thành công!');
          this.loadScoreSheet();
        },
        error: (err) => {
          alert(err.error?.message || 'Lỗi khi nộp bảng điểm');
          this.isSubmittingScore.set(false);
        },
      });
  }

  printScorecard(): void {
    window.print();
  }

  openTask(taskId: string): void {
    this.router.navigate(['/tasks', taskId]);
  }

  getQuarterStatusClass(status: string): string {
    switch (status) {
      case 'open':
        return 'st-open';
      case 'closed':
        return 'st-closed';
      default:
        return 'st-draft';
    }
  }

  getClassificationLabel(cls: string): string {
    switch (cls) {
      case 'xuat_sac':
        return 'Xuất sắc';
      case 'tot':
        return 'Tốt';
      case 'hoan_thanh':
        return 'Hoàn thành';
      case 'khong_hoan_thanh':
        return 'Chưa đạt';
      default:
        return 'Chưa đánh giá';
    }
  }

  getClassificationBadgeClass(cls: string): string {
    switch (cls) {
      case 'xuat_sac':
        return 'pill-xuat-sac';
      case 'tot':
        return 'pill-tot';
      case 'hoan_thanh':
        return 'pill-hoan-thanh';
      case 'khong_hoan_thanh':
      default:
        return 'pill-chua-dat';
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
