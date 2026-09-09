import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { UserService } from '../../core/services/user.service';
import { ContactCardService } from '../../core/services/contact-card.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  DashboardOverviewData,
  AttentionTaskItem,
  LocationBreakdownItem,
  OrgUnitBreakdownItem,
} from '../../core/models/dashboard.models';
import { LocationItem } from '../../core/models/user.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StatusBadgeComponent],
  template: `
    <div class="dashboard-page">
      <!-- TOP FILTER & TITLE BAR -->
      <div class="dashboard-header">
        <div class="header-title-box">
          <h1 class="page-title">Tổng Quan Điều Hành</h1>
          <p class="page-subtitle">
            Theo dõi tiến độ công việc và kế hoạch toàn trường THCS Phước Tân sau sáp nhập
          </p>
        </div>

        <div class="header-controls">
          <!-- LOCATION FILTER DROPDOWN -->
          <div class="location-filter-box">
            <span class="material-symbols-outlined filter-icon">location_on</span>
            <select
              class="location-select tap-target"
              [(ngModel)]="selectedLocationId"
              (ngModelChange)="onLocationFilterChange()"
            >
              <option value="">Toàn trường (3 Điểm trường)</option>
              @for (loc of locations(); track loc.id) {
                <option [value]="loc.id">{{ loc.name }}</option>
              }
            </select>
          </div>

          <button
            type="button"
            class="refresh-btn tap-target"
            (click)="loadDashboardData()"
            [disabled]="isLoading()"
            title="Làm mới dữ liệu"
          >
            <span class="material-symbols-outlined" [class.spin]="isLoading()">refresh</span>
            <span class="btn-text">Làm mới</span>
          </button>
        </div>
      </div>

      @if (isLoading() && !overviewData()) {
        <div class="metrics-grid">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="skeleton-card">
              <div style="display: flex; gap: 14px; align-items: center;">
                <div class="skeleton-avatar"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                  <div class="skeleton-line w-50"></div>
                  <div class="skeleton-line w-90 h-28"></div>
                </div>
              </div>
            </div>
          }
        </div>
        <div class="dashboard-body-grid" style="margin-top: 20px;">
          <div class="skeleton-card" style="min-height: 300px;">
            <div class="skeleton-line w-50 h-20"></div>
            <div class="skeleton-line w-100" style="margin-top: 14px;"></div>
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-70"></div>
          </div>
          <div class="skeleton-card" style="min-height: 300px;">
            <div class="skeleton-line w-50 h-20"></div>
            <div class="skeleton-line w-100" style="margin-top: 14px;"></div>
            <div class="skeleton-line w-80"></div>
          </div>
        </div>
      } @else if (overviewData(); as data) {
        <!-- 1. 4 LARGE METRIC CARDS -->
        <div class="metrics-grid">
          <!-- CARD 1: TỔNG VIỆC -->
          <div class="metric-card card-total">
            <div class="metric-icon-box icon-blue">
              <span class="material-symbols-outlined">assignment</span>
            </div>
            <div class="metric-content">
              <span class="metric-label">Tổng số công việc</span>
              <div class="metric-number-row">
                <span class="metric-number">{{ data.totalTasks }}</span>
                <span class="metric-unit">công việc</span>
              </div>
              <span class="metric-hint">Trong toàn bộ kế hoạch</span>
            </div>
          </div>

          <!-- CARD 2: ĐANG THỰC HIỆN -->
          <div class="metric-card card-progress">
            <div class="metric-icon-box icon-amber">
              <span class="material-symbols-outlined">pending_actions</span>
            </div>
            <div class="metric-content">
              <span class="metric-label">Đang thực hiện</span>
              <div class="metric-number-row">
                <span class="metric-number text-amber">{{ data.inProgressCount }}</span>
                <span class="metric-unit">công việc</span>
              </div>
              <span class="metric-hint">Đã giao & đang triển khai</span>
            </div>
          </div>

          <!-- CARD 3: HOÀN THÀNH -->
          <div class="metric-card card-completed">
            <div class="metric-icon-box icon-green">
              <span class="material-symbols-outlined">check_circle</span>
            </div>
            <div class="metric-content">
              <span class="metric-label">Đã hoàn thành</span>
              <div class="metric-number-row">
                <span class="metric-number text-green">{{ data.completedCount }}</span>
                <span class="metric-badge-rate">{{ getOverallCompletionRate() }}%</span>
              </div>
              <span class="metric-hint">Đã nghiệm thu & đóng</span>
            </div>
          </div>

          <!-- CARD 4: QUÁ HẠN -->
          <div class="metric-card card-overdue" [class.has-overdue]="data.overdueCount > 0">
            <div class="metric-icon-box icon-red">
              <span class="material-symbols-outlined">error</span>
            </div>
            <div class="metric-content">
              <span class="metric-label">Quá hạn cần xử lý</span>
              <div class="metric-number-row">
                <span class="metric-number text-red">{{ data.overdueCount }}</span>
                <span class="metric-unit">công việc</span>
              </div>
              <span class="metric-hint" [class.text-red-bold]="data.overdueCount > 0">
                {{ data.overdueCount > 0 ? 'Cần đôn đốc ngay' : 'Đúng tiến độ' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. MAIN DASHBOARD CONTENT (2 COLUMNS) -->
        <div class="dashboard-body-grid">
          <!-- LEFT COLUMN: VIỆC CẦN QUAN TÂM (ATTENTION TASKS) -->
          <div class="dashboard-panel attention-panel">
            <div class="panel-header">
              <div class="panel-title-box">
                <span class="material-symbols-outlined title-icon text-amber">priority_high</span>
                <h2 class="panel-title">Việc cần quan tâm</h2>
              </div>
              <span class="attention-count-badge">
                {{ data.attentionTasks.length }} công việc
              </span>
            </div>

            <div class="attention-list">
              @if (data.attentionTasks.length === 0) {
                <div class="friendly-empty-state" style="padding: 30px 16px; margin: 0;">
                  <svg class="empty-svg-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 70px; height: 70px;">
                    <circle cx="60" cy="60" r="50" fill="#DCFCE7" />
                    <path d="M42 60L54 72L78 46" stroke="#16A34A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <h3 class="empty-state-title" style="font-size: 1.05rem;">Mọi việc đang theo đúng tiến độ!</h3>
                  <p class="empty-state-desc" style="font-size: 0.82rem;">
                    Tuyệt vời! Hiện không có công việc nào bị quá hạn hoặc cần đôn đốc khẩn cấp tại thời điểm này.
                  </p>
                </div>
              } @else {
                @for (task of data.attentionTasks; track task.id) {
                  <div class="attention-task-card tap-target" (click)="goToTaskDetail(task.id)">
                    <!-- URGENCY REASON BANNER -->
                    <div class="urgency-banner" [ngClass]="getUrgencyClass(task.priorityLevel)">
                      <span class="material-symbols-outlined banner-icon">
                        {{ getUrgencyIcon(task.priorityLevel) }}
                      </span>
                      <strong class="banner-text">{{ task.reason }}</strong>
                      @if (task.dueDate) {
                        <span class="due-text">• Hạn: {{ task.dueDate | date: 'dd/MM/yyyy' }}</span>
                      }
                    </div>

                    <div class="task-card-main">
                      <div class="task-title-row">
                        <span class="task-code" *ngIf="task.code">{{ task.code }}</span>
                        <h3 class="task-name">{{ task.title }}</h3>
                      </div>

                      <div class="task-tags-row">
                        <app-status-badge [status]="task.status"></app-status-badge>
                        @if (task.locationName) {
                          <span class="tag-location">
                            <span class="material-symbols-outlined">location_on</span>
                            {{ task.locationName }}
                          </span>
                        }
                        @if (task.orgUnitName) {
                          <span class="tag-org">
                            <span class="material-symbols-outlined">groups</span>
                            {{ task.orgUnitName }}
                          </span>
                        }
                      </div>

                      <!-- PROGRESS & COORDINATOR ROW -->
                      <div class="task-footer-row">
                        <!-- Progress info -->
                        <div class="task-progress-mini">
                          <div class="progress-bar-bg">
                            <div
                              class="progress-bar-val"
                              [style.width.%]="task.progressPercent"
                              [ngClass]="getProgressClass(task.progressPercent, task.isOverdue)"
                            ></div>
                          </div>
                          <span class="progress-pct-text">{{ task.progressPercent }}%</span>
                        </div>

                        <!-- Click-to-call Coordinator -->
                        @if (task.chuTri; as ct) {
                          <div
                            class="coordinator-pill"
                            (click)="openContactCard(ct, $event)"
                            [title]="'Chủ trì: ' + ct.fullName + ' - Bấm để gọi điện'"
                          >
                            <img
                              [src]="ct.avatarUrl || 'https://ui-avatars.com/api/?name=' + ct.fullName + '&background=1F3864&color=fff'"
                              [alt]="ct.fullName"
                              class="coord-avatar"
                            />
                            <span class="coord-name">{{ ct.fullName }}</span>
                            <a
                              [href]="'tel:' + ct.phone"
                              class="coord-call-btn"
                              (click)="$event.stopPropagation()"
                              title="Gọi điện ngay"
                            >
                              <span class="material-symbols-outlined">call</span>
                            </a>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          </div>

          <!-- RIGHT COLUMN: PROGRESS BREAKDOWNS (CAMPUS & ORG UNITS) -->
          <div class="dashboard-panel-column">
            <!-- 1. TIẾN ĐỘ THEO ĐIỂM TRƯỜNG -->
            <div class="dashboard-panel">
              <div class="panel-header">
                <div class="panel-title-box">
                  <span class="material-symbols-outlined title-icon text-blue">domain</span>
                  <h2 class="panel-title">Tiến độ theo Điểm trường</h2>
                </div>
                <span class="panel-sub-label">3 phân hiệu</span>
              </div>

              <div class="breakdown-list">
                @for (loc of data.breakdownByLocation; track loc.id) {
                  <div class="breakdown-item">
                    <div class="breakdown-info-row">
                      <div class="breakdown-name-box">
                        <strong class="breakdown-name">{{ loc.name }}</strong>
                        @if (loc.isMain) {
                          <span class="main-badge">Trụ sở chính</span>
                        }
                      </div>
                      <div class="breakdown-stats">
                        <span class="stat-tasks">{{ loc.completedTasks }}/{{ loc.totalTasks }} việc</span>
                        <strong class="stat-pct" [ngClass]="getRateColorClass(loc.completionRate)">
                          {{ loc.completionRate }}%
                        </strong>
                      </div>
                    </div>

                    <!-- PROGRESS BAR -->
                    <div class="breakdown-bar-track">
                      <div
                        class="breakdown-bar-fill"
                        [style.width.%]="loc.completionRate"
                        [ngClass]="getRateColorClass(loc.completionRate)"
                      ></div>
                    </div>

                    <div class="breakdown-badges-row">
                      <span class="mini-status-badge badge-doing">
                        Đang làm: {{ loc.inProgressTasks }}
                      </span>
                      @if (loc.overdueTasks > 0) {
                        <span class="mini-status-badge badge-overdue">
                          Quá hạn: {{ loc.overdueTasks }}
                        </span>
                      }
                      <span class="mini-status-badge badge-waiting">
                        Chờ duyệt: {{ loc.pendingReviewTasks }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- 2. TIẾN ĐỘ THEO TỔ CHUYÊN MÔN -->
            <div class="dashboard-panel">
              <div class="panel-header">
                <div class="panel-title-box">
                  <span class="material-symbols-outlined title-icon text-indigo">account_tree</span>
                  <h2 class="panel-title">Tiến độ theo Tổ chuyên môn</h2>
                </div>
                <span class="panel-sub-label">{{ data.breakdownByOrgUnit.length }} tổ</span>
              </div>

              <div class="breakdown-list">
                @for (org of data.breakdownByOrgUnit; track org.id) {
                  <div class="breakdown-item">
                    <div class="breakdown-info-row">
                      <strong class="breakdown-name">{{ org.name }}</strong>
                      <div class="breakdown-stats">
                        <span class="stat-tasks">{{ org.completedTasks }}/{{ org.totalTasks }} việc</span>
                        <strong class="stat-pct" [ngClass]="getRateColorClass(org.completionRate)">
                          {{ org.completionRate }}%
                        </strong>
                      </div>
                    </div>

                    <div class="breakdown-bar-track">
                      <div
                        class="breakdown-bar-fill"
                        [style.width.%]="org.completionRate"
                        [ngClass]="getRateColorClass(org.completionRate)"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dashboard-page {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 1300px;
        margin: 0 auto;
        padding-bottom: 30px;
      }

      /* HEADER & FILTERS */
      .dashboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;

        .header-title-box {
          .page-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: #1F3864;
            margin-bottom: 4px;
          }

          .page-subtitle {
            font-size: 0.85rem;
            color: #64748B;
          }
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 10px;

          .location-filter-box {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #FFFFFF;
            border: 1.5px solid #CBD5E1;
            border-radius: 10px;
            padding: 0 12px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);

            .filter-icon {
              font-size: 20px;
              color: #1F3864;
            }

            .location-select {
              border: none;
              background: transparent;
              padding: 9px 0;
              font-size: 0.88rem;
              font-weight: 600;
              color: #1E293B;
              outline: none;
              cursor: pointer;
            }
          }

          .refresh-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 9px 14px;
            background: #EEF4FC;
            border: 1px solid #BFDBFE;
            border-radius: 10px;
            color: #1F3864;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover:not(:disabled) {
              background: #1F3864;
              color: #FFFFFF;
            }

            .material-symbols-outlined {
              font-size: 18px;
            }
          }
        }
      }

      /* 4 LARGE METRIC CARDS */
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;

        @media (max-width: 1024px) {
          grid-template-columns: repeat(2, 1fr);
        }

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }

        .metric-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          }

          &.card-overdue.has-overdue {
            border-color: #FECACA;
            background: #FFF5F5;
          }

          .metric-icon-box {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            .material-symbols-outlined {
              font-size: 28px;
            }

            &.icon-blue { background: #EEF4FC; color: #1F3864; }
            &.icon-amber { background: #FEF3C7; color: #D97706; }
            &.icon-green { background: #DCFCE7; color: #16A34A; }
            &.icon-red { background: #FEE2E2; color: #DC2626; }
          }

          .metric-content {
            flex: 1;
            overflow: hidden;

            .metric-label {
              font-size: 0.78rem;
              font-weight: 600;
              color: #64748B;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }

            .metric-number-row {
              display: flex;
              align-items: baseline;
              gap: 8px;
              margin: 2px 0;

              .metric-number {
                font-size: 1.8rem;
                font-weight: 800;
                color: #1E293B;
                line-height: 1.1;

                &.text-amber { color: #D97706; }
                &.text-green { color: #16A34A; }
                &.text-red { color: #DC2626; }
              }

              .metric-unit {
                font-size: 0.78rem;
                color: #94A3B8;
              }

              .metric-badge-rate {
                font-size: 0.8rem;
                font-weight: 700;
                background: #DCFCE7;
                color: #166534;
                padding: 1px 6px;
                border-radius: 9999px;
              }
            }

            .metric-hint {
              font-size: 0.74rem;
              color: #94A3B8;

              &.text-red-bold {
                color: #DC2626;
                font-weight: 700;
              }
            }
          }
        }
      }

      /* MAIN 2-COLUMN BODY GRID */
      .dashboard-body-grid {
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        gap: 20px;

        @media (max-width: 960px) {
          grid-template-columns: 1fr;
        }
      }

      .dashboard-panel {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        display: flex;
        flex-direction: column;
        gap: 16px;

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid #F1F5F9;

          .panel-title-box {
            display: flex;
            align-items: center;
            gap: 8px;

            .title-icon {
              font-size: 22px;
              &.text-amber { color: #D97706; }
              &.text-blue { color: #1F3864; }
              &.text-indigo { color: #4F46E5; }
            }

            .panel-title {
              font-size: 1.1rem;
              font-weight: 800;
              color: #1E293B;
            }
          }

          .attention-count-badge {
            font-size: 0.74rem;
            font-weight: 700;
            background: #FEF3C7;
            color: #92400E;
            padding: 3px 8px;
            border-radius: 9999px;
          }

          .panel-sub-label {
            font-size: 0.78rem;
            color: #64748B;
            font-weight: 500;
          }
        }
      }

      .dashboard-panel-column {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* ATTENTION TASKS LIST */
      .attention-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .empty-attention-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 36px 16px;
          text-align: center;
          color: #64748B;
          gap: 10px;

          .empty-icon {
            font-size: 40px;
          }
        }

        .attention-task-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

          &:hover {
            border-color: #1F3864;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(31, 56, 100, 0.1);
          }

          .urgency-banner {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            font-size: 0.76rem;

            .banner-icon {
              font-size: 16px;
            }

            .due-text {
              margin-left: auto;
              opacity: 0.85;
            }

            &.urgency-overdue {
              background: #FEE2E2;
              color: #B91C1C;
              border-bottom: 1px solid #FCA5A5;
            }

            &.urgency-revise {
              background: #FFEDD5;
              color: #C2410C;
              border-bottom: 1px solid #FDBA74;
            }

            &.urgency-review {
              background: #FEF3C7;
              color: #B45309;
              border-bottom: 1px solid #FDE68A;
            }

            &.urgency-due-soon {
              background: #EEF4FC;
              color: #1E40AF;
              border-bottom: 1px solid #BFDBFE;
            }
          }

          .task-card-main {
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;

            .task-title-row {
              display: flex;
              align-items: center;
              gap: 8px;

              .task-code {
                font-size: 0.72rem;
                font-weight: 700;
                background: #F1F5F9;
                color: #475569;
                padding: 2px 6px;
                border-radius: 4px;
              }

              .task-name {
                font-size: 0.92rem;
                font-weight: 700;
                color: #1E293B;
                line-height: 1.3;
              }
            }

            .task-tags-row {
              display: flex;
              align-items: center;
              gap: 6px;
              flex-wrap: wrap;

              .tag-location,
              .tag-org {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                padding: 1px 7px;
                border-radius: 9999px;
                font-size: 0.7rem;
                font-weight: 500;

                .material-symbols-outlined {
                  font-size: 12px;
                }
              }

              .tag-location {
                background: #F0FDF4;
                color: #166534;
              }

              .tag-org {
                background: #EEF4FC;
                color: #1F3864;
              }
            }

            .task-footer-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              padding-top: 6px;
              border-top: 1px solid #F8FAFC;

              .task-progress-mini {
                display: flex;
                align-items: center;
                gap: 6px;
                flex: 1;
                max-width: 140px;

                .progress-bar-bg {
                  flex: 1;
                  height: 6px;
                  background: #E2E8F0;
                  border-radius: 9999px;
                  overflow: hidden;

                  .progress-bar-val {
                    height: 100%;
                    background: #1F3864;
                    border-radius: 9999px;

                    &.bar-green { background: #2E7D32; }
                    &.bar-amber { background: #F0A500; }
                    &.bar-red { background: #C62828; }
                  }
                }

                .progress-pct-text {
                  font-size: 0.72rem;
                  font-weight: 700;
                  color: #475569;
                }
              }

              .coordinator-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 9999px;
                padding: 2px 8px 2px 3px;
                cursor: pointer;
                transition: all 0.15s ease;

                &:hover {
                  background: #EEF4FC;
                  border-color: #B4D1FA;
                }

                .coord-avatar {
                  width: 22px;
                  height: 22px;
                  border-radius: 50%;
                  object-fit: cover;
                }

                .coord-name {
                  font-size: 0.76rem;
                  font-weight: 600;
                  color: #1E293B;
                  max-width: 120px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }

                .coord-call-btn {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #2E7D32;
                  color: #FFFFFF;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  text-decoration: none;

                  .material-symbols-outlined {
                    font-size: 12px;
                  }
                }
              }
            }
          }
        }
      }

      /* BREAKDOWNS (CAMPUS & ORG) */
      .breakdown-list {
        display: flex;
        flex-direction: column;
        gap: 14px;

        .breakdown-item {
          display: flex;
          flex-direction: column;
          gap: 6px;

          .breakdown-info-row {
            display: flex;
            align-items: center;
            justify-content: space-between;

            .breakdown-name-box {
              display: flex;
              align-items: center;
              gap: 6px;

              .breakdown-name {
                font-size: 0.88rem;
                font-weight: 700;
                color: #1E293B;
              }

              .main-badge {
                font-size: 0.65rem;
                font-weight: 700;
                background: #EEF4FC;
                color: #1E40AF;
                padding: 1px 5px;
                border-radius: 4px;
              }
            }

            .breakdown-stats {
              display: flex;
              align-items: center;
              gap: 8px;

              .stat-tasks {
                font-size: 0.74rem;
                color: #64748B;
              }

              .stat-pct {
                font-size: 0.85rem;
                font-weight: 800;

                &.rate-green { color: #16A34A; }
                &.rate-amber { color: #D97706; }
                &.rate-blue { color: #2563EB; }
              }
            }
          }

          .breakdown-bar-track {
            width: 100%;
            height: 8px;
            background: #F1F5F9;
            border-radius: 9999px;
            overflow: hidden;

            .breakdown-bar-fill {
              height: 100%;
              border-radius: 9999px;
              transition: width 0.4s ease;

              &.rate-green { background: #16A34A; }
              &.rate-amber { background: #D97706; }
              &.rate-blue { background: #2563EB; }
            }
          }

          .breakdown-badges-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 2px;

            .mini-status-badge {
              font-size: 0.68rem;
              padding: 1px 6px;
              border-radius: 4px;
              font-weight: 600;

              &.badge-doing { background: #EEF4FC; color: #1F3864; }
              &.badge-overdue { background: #FEE2E2; color: #DC2626; font-weight: 700; }
              &.badge-waiting { background: #FEF3C7; color: #92400E; }
            }
          }
        }
      }

      /* SKELETON LOADING */
      .page-loading-skeleton {
        display: flex;
        flex-direction: column;
        gap: 20px;

        .skeleton-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          .skeleton-card {
            height: 90px;
            background: #E2E8F0;
            border-radius: 16px;
            animation: pulse 1.5s infinite;
          }
        }

        .skeleton-body {
          height: 380px;
          background: #E2E8F0;
          border-radius: 16px;
          animation: pulse 1.5s infinite;
        }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private userService = inject(UserService);
  private contactCardService = inject(ContactCardService);
  private router = inject(Router);

  selectedLocationId = '';
  locations = signal<LocationItem[]>([]);

  isLoading = signal(true);
  overviewData = signal<DashboardOverviewData | null>(null);

  ngOnInit() {
    this.loadLocations();
    this.loadDashboardData();
  }

  loadLocations() {
    this.userService.getLocations().subscribe({
      next: (locs) => this.locations.set(locs),
      error: () => {},
    });
  }

  loadDashboardData() {
    this.isLoading.set(true);
    this.dashboardService
      .getOverview({ locationId: this.selectedLocationId || undefined })
      .subscribe({
        next: (data) => {
          this.isLoading.set(false);
          this.overviewData.set(data);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  onLocationFilterChange() {
    this.loadDashboardData();
  }

  getOverallCompletionRate(): number {
    const d = this.overviewData();
    if (!d || d.totalTasks === 0) return 0;
    return Math.round((d.completedCount / d.totalTasks) * 100);
  }

  getUrgencyClass(level: number): string {
    if (level === 4) return 'urgency-overdue';
    if (level === 3) return 'urgency-revise';
    if (level === 2) return 'urgency-review';
    return 'urgency-due-soon';
  }

  getUrgencyIcon(level: number): string {
    if (level === 4) return 'error';
    if (level === 3) return 'assignment_return';
    if (level === 2) return 'policy';
    return 'schedule';
  }

  getProgressClass(pct: number, isOverdue?: boolean): string {
    if (isOverdue) return 'bar-red';
    if (pct >= 80) return 'bar-green';
    if (pct >= 40) return 'bar-amber';
    return 'bar-blue';
  }

  getRateColorClass(rate: number): string {
    if (rate >= 60) return 'rate-green';
    if (rate >= 30) return 'rate-amber';
    return 'rate-blue';
  }

  openContactCard(user: any, event: MouseEvent) {
    event.stopPropagation();
    this.contactCardService.open(user);
  }

  goToTaskDetail(taskId: string) {
    this.router.navigate(['/tasks'], { queryParams: { taskId } });
  }
}
