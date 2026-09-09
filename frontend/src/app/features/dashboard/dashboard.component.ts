import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ContactCardService } from '../../core/services/contact-card.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  DashboardOverviewData,
  AttentionTaskItem,
  LocationBreakdownItem,
  OrgUnitBreakdownItem,
} from '../../core/models/dashboard.models';
import { LocationItem } from '../../core/models/user.models';

interface LeaderboardItem {
  rank: number;
  name: string;
  type: string;
  target: number;
  completed: number;
  overdue: number;
  rate: number;
  status: 'warning' | 'good' | 'excellent';
  statusText: string;
  leadName: string;
  leadPhone: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bi-dashboard-container">
      <!-- DASHBOARD TITLE & EXECUTIVE SUMMARY HEADER -->
      <div class="bi-header-row">
        <div class="bi-header-left">
          <h1 class="bi-main-title">Trung tâm Chỉ huy & Điều hành BI Dashboard</h1>
          <p class="bi-sub-title">
            Tổng hợp chỉ số KPI, tỷ lệ hoàn thành mục tiêu kiểm tra và tiến độ giáo dục toàn Trường THCS Phước Tân
          </p>
        </div>

        <div class="bi-header-right">
          <div class="loc-dropdown-box">
            <span class="material-symbols-outlined icon-pin">location_on</span>
            <select
              class="bi-select"
              [(ngModel)]="selectedLocationId"
              (ngModelChange)="onLocationFilterChange()"
            >
              <option value="">Toàn trường (122 Lớp • 3 Điểm trường)</option>
              @for (loc of locations(); track loc.id) {
                <option [value]="loc.id">{{ loc.name }}</option>
              }
            </select>
          </div>

          <button
            type="button"
            class="bi-refresh-btn"
            (click)="loadDashboardData()"
            [disabled]="isLoading()"
            title="Làm mới dữ liệu"
          >
            <span class="material-symbols-outlined" [class.spin]="isLoading()">refresh</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <!-- TOP EXECUTIVE ROW: 3 BI PANELS (MỤC TIÊU - TIẾN ĐỘ ĐỊA BÀN - 4 METRIC CARDS) -->
      <div class="bi-top-grid">
        <!-- 1. MỤC TIÊU TOÀN TRƯỜNG / TIẾN ĐỘ KỲ (DONUT PROGRESS) -->
        <div class="bi-card target-card">
          <div class="card-top-bar">
            <h3 class="card-heading">MỤC TIÊU TOÀN TRƯỜNG</h3>
            <span class="period-pill">Năm 2026</span>
          </div>

          <div class="target-card-body">
            <!-- Donut Radial Chart -->
            <div class="donut-wrapper">
              <svg class="donut-svg" viewBox="0 0 100 100">
                <circle class="donut-bg" cx="50" cy="50" r="40" />
                <circle
                  class="donut-fg"
                  cx="50"
                  cy="50"
                  r="40"
                  stroke-dasharray="251.2"
                  [attr.stroke-dashoffset]="getDonutOffset(getCompletionRate())"
                />
              </svg>
              <div class="donut-text">
                <span class="donut-percent">{{ getCompletionRate() }}%</span>
                <span class="donut-lbl">Tiến độ kỳ</span>
              </div>
            </div>

            <!-- Side Stats -->
            <div class="target-stats-col">
              <div class="stat-line">
                <span class="line-label">Đã kiểm tra / Hoàn thành:</span>
                <strong class="line-val green-text">{{ getCompletedCount() }} <span class="unit">cơ sở</span></strong>
              </div>
              <div class="stat-line">
                <span class="line-label">Chỉ tiêu tổng kế hoạch:</span>
                <strong class="line-val">{{ getTotalTargetCount() | number }} <span class="unit">mục tiêu</span></strong>
              </div>
              <div class="stat-line">
                <span class="line-label">Nhiệm vụ đợt này:</span>
                <strong class="line-val">{{ getTotalTasks() }} <span class="unit">hồ sơ</span></strong>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. TIẾN ĐỘ ĐỊA BÀN 3 ĐIỂM TRƯỜNG -->
        <div class="bi-card location-progress-card">
          <div class="card-top-bar">
            <h3 class="card-heading">TIẾN ĐỘ ĐỊA BÀN 3 ĐIỂM TRƯỜNG</h3>
            <span class="period-pill">3 Cơ sở</span>
          </div>

          <div class="location-card-body">
            <div class="loc-status-list">
              <div class="status-item">
                <div class="item-left">
                  <span class="material-symbols-outlined status-icon check-green">check_circle</span>
                  <span class="item-text">Đã hoàn thành 100%</span>
                </div>
                <strong class="item-count">1 <span class="unit">phân hiệu</span></strong>
              </div>

              <div class="status-item">
                <div class="item-left">
                  <span class="material-symbols-outlined status-icon play-blue">compass_calibration</span>
                  <span class="item-text">Đang thực hiện kiểm tra</span>
                </div>
                <strong class="item-count">2 <span class="unit">phân hiệu</span></strong>
              </div>

              <div class="status-item">
                <div class="item-left">
                  <span class="material-symbols-outlined status-icon wait-gray">hourglass_empty</span>
                  <span class="item-text">Chưa bắt đầu thực hiện</span>
                </div>
                <strong class="item-count">0 <span class="unit">phân hiệu</span></strong>
              </div>
            </div>

            <!-- Segmented Progress Bar -->
            <div class="multi-progress-bar">
              <div class="seg seg-green" style="width: 33.3%" title="Điểm chính: 100%"></div>
              <div class="seg seg-blue" style="width: 66.7%" title="Phân hiệu 1 & 2: Đang làm"></div>
            </div>
          </div>
        </div>

        <!-- 3. 4 METRIC CARDS (2x2 Grid) -->
        <div class="metric-quad-grid">
          <div class="quad-card blue">
            <div class="quad-icon">
              <span class="material-symbols-outlined">assignment</span>
            </div>
            <div class="quad-content">
              <span class="quad-num">{{ getTotalTasks() }}</span>
              <span class="quad-label">Tổng số nhiệm vụ</span>
            </div>
          </div>

          <div class="quad-card amber">
            <div class="quad-icon">
              <span class="material-symbols-outlined">description</span>
            </div>
            <div class="quad-content">
              <span class="quad-num">{{ getCheckingCount() }}</span>
              <span class="quad-label">Đang kiểm tra</span>
            </div>
          </div>

          <div class="quad-card red">
            <div class="quad-icon">
              <span class="material-symbols-outlined">alarm</span>
            </div>
            <div class="quad-content">
              <span class="quad-num">{{ getOverdueCount() }}</span>
              <span class="quad-label">Nhiệm vụ quá hạn</span>
            </div>
          </div>

          <div class="quad-card purple">
            <div class="quad-icon">
              <span class="material-symbols-outlined">gavel</span>
            </div>
            <div class="quad-content">
              <span class="quad-num">{{ getPausedCount() }}</span>
              <span class="quad-label">Đình chỉ / Bổ sung</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MIDDLE ROW: 2 BI CHARTS (14-DAY ACTIVITY LINE & COMPLIANCE DONUT) -->
      <div class="bi-charts-row">
        <!-- 14-DAY ACTIVITY CHART (60% WIDTH) -->
        <div class="bi-card chart-card-left">
          <div class="chart-header">
            <div class="chart-title-group">
              <span class="material-symbols-outlined chart-icon">monitoring</span>
              <h3 class="chart-title">TIẾN ĐỘ THỰC HIỆN KIỂM TRA THEO THỜI GIAN (14 NGÀY GẦN NHẤT)</h3>
            </div>
            <span class="chart-tag">Tích lũy hồ sơ hoàn thành</span>
          </div>

          <div class="chart-legend-row">
            <div class="legend-item">
              <span class="legend-box blue-solid"></span>
              <span>Đã hoàn thành kiểm tra</span>
            </div>
            <div class="legend-item">
              <span class="legend-box gray-dashed"></span>
              <span>Chỉ tiêu phân bổ theo ngày</span>
            </div>
          </div>

          <!-- Interactive SVG Line Chart -->
          <div class="svg-chart-container">
            <svg class="line-chart-svg" viewBox="0 0 650 200" preserveAspectRatio="none">
              <!-- Grid Lines -->
              <line x1="40" y1="30" x2="630" y2="30" stroke="#F1F5F9" stroke-width="1" />
              <line x1="40" y1="70" x2="630" y2="70" stroke="#F1F5F9" stroke-width="1" />
              <line x1="40" y1="110" x2="630" y2="110" stroke="#F1F5F9" stroke-width="1" />
              <line x1="40" y1="150" x2="630" y2="150" stroke="#F1F5F9" stroke-width="1" />

              <!-- Y Axis labels -->
              <text x="25" y="35" class="axis-text">250</text>
              <text x="25" y="75" class="axis-text">200</text>
              <text x="25" y="115" class="axis-text">150</text>
              <text x="25" y="155" class="axis-text">100</text>
              <text x="30" y="185" class="axis-text">0</text>

              <!-- Target Dashed Line -->
              <path
                d="M 50 140 L 95 132 L 140 124 L 185 116 L 230 108 L 275 100 L 320 92 L 365 84 L 410 76 L 455 68 L 500 60 L 545 52 L 590 44 L 630 38"
                fill="none"
                stroke="#93C5FD"
                stroke-width="2"
                stroke-dasharray="4 4"
              />

              <!-- Actual Progress Smooth Line -->
              <path
                d="M 50 178 L 95 177 L 140 176 L 185 175 L 230 174 L 275 173 L 320 172 L 365 170 L 410 168 L 455 166 L 500 164 L 545 160 L 590 156 L 630 150"
                fill="none"
                stroke="#1E40AF"
                stroke-width="3.5"
                stroke-linecap="round"
              />

              <!-- Data Points on Actual Line -->
              <circle cx="50" cy="178" r="4" fill="#1E40AF" stroke="#FFFFFF" stroke-width="2" />
              <circle cx="275" cy="173" r="4" fill="#1E40AF" stroke="#FFFFFF" stroke-width="2" />
              <circle cx="455" cy="166" r="4" fill="#1E40AF" stroke="#FFFFFF" stroke-width="2" />
              <circle cx="590" cy="156" r="4" fill="#1E40AF" stroke="#FFFFFF" stroke-width="2" />
              <circle cx="630" cy="150" r="5" fill="#1E40AF" stroke="#FFFFFF" stroke-width="2" />
            </svg>

            <!-- X Axis Dates -->
            <div class="x-axis-dates">
              <span>27/08</span>
              <span>28/08</span>
              <span>29/08</span>
              <span>30/08</span>
              <span>31/08</span>
              <span>01/09</span>
              <span>02/09</span>
              <span>03/09</span>
              <span>04/09</span>
              <span>05/09</span>
              <span>06/09</span>
              <span>07/09</span>
              <span>08/09</span>
              <span>09/09</span>
            </div>
          </div>
        </div>

        <!-- COMPLIANCE DONUT CHART (40% WIDTH) -->
        <div class="bi-card chart-card-right">
          <div class="chart-header">
            <div class="chart-title-group">
              <span class="material-symbols-outlined chart-icon">pie_chart</span>
              <h3 class="chart-title">TỶ LỆ TUÂN THỦ THEO NHÓM</h3>
            </div>
            <span class="chart-tag">Cơ sở giáo dục</span>
          </div>

          <div class="donut-chart-flex">
            <!-- Left Donut Chart -->
            <div class="donut-circle-box">
              <svg class="compliance-donut-svg" viewBox="0 0 100 100">
                <!-- Segment 1: Good (Green) -->
                <circle
                  cx="50" cy="50" r="38"
                  fill="none" stroke="#10B981" stroke-width="12"
                  stroke-dasharray="238.7"
                  stroke-dashoffset="180"
                />
                <!-- Segment 2: In Progress (Orange) -->
                <circle
                  cx="50" cy="50" r="38"
                  fill="none" stroke="#F59E0B" stroke-width="12"
                  stroke-dasharray="238.7"
                  stroke-dashoffset="65"
                  transform="rotate(60 50 50)"
                />
                <!-- Segment 3: Paused / Overdue (Red) -->
                <circle
                  cx="50" cy="50" r="38"
                  fill="none" stroke="#EF4444" stroke-width="12"
                  stroke-dasharray="238.7"
                  stroke-dashoffset="225"
                  transform="rotate(320 50 50)"
                />
              </svg>
            </div>

            <!-- Right Legend and numbers -->
            <div class="compliance-legend-col">
              <div class="comp-item">
                <div class="comp-label-box">
                  <span class="dot dot-green"></span>
                  <span class="comp-label">Chấp hành tốt (Không vi phạm)</span>
                </div>
                <strong class="comp-val">6 <span class="unit">cơ sở</span></strong>
              </div>

              <div class="comp-item">
                <div class="comp-label-box">
                  <span class="dot dot-amber"></span>
                  <span class="comp-label">Phát hiện vi phạm / Đôn đốc</span>
                </div>
                <strong class="comp-val">22 <span class="unit">cơ sở</span></strong>
              </div>

              <div class="comp-item">
                <div class="comp-label-box">
                  <span class="dot dot-red"></span>
                  <span class="comp-label">Đình chỉ hoạt động / Quá hạn</span>
                </div>
                <strong class="comp-val">1 <span class="unit">cơ sở</span></strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM ROW: LEADERBOARD & URGENT ATTENTION TABLE -->
      <div class="bi-card leaderboard-card">
        <div class="leaderboard-header">
          <div class="lh-left">
            <span class="material-symbols-outlined lh-icon">format_list_numbered</span>
            <h3 class="lh-title">XẾP HẠNG TIẾN ĐỘ KIỂM TRA & ĐỊA BÀN CẦN ĐÔN ĐỐC</h3>
          </div>
          <a routerLink="/plans" class="lh-link">
            <span>Xem tất cả kế hoạch</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>

        <div class="table-responsive">
          <table class="bi-table">
            <thead>
              <tr>
                <th class="text-center w-60">XẾP HẠNG</th>
                <th class="text-left">ĐỊA BÀN / ĐƠN VỊ PHỤ TRÁCH</th>
                <th class="text-center">CHỈ TIÊU GIAO</th>
                <th class="text-center">ĐÃ HOÀN THÀNH</th>
                <th class="text-center">QUÁ HẠN</th>
                <th class="text-left w-200">TỶ LỆ HOÀN THÀNH</th>
                <th class="text-center">ĐÁNH GIÁ</th>
                <th class="text-right">LIÊN HỆ ĐÔN ĐỐC</th>
              </tr>
            </thead>
            <tbody>
              @for (row of leaderboard; track row.rank) {
                <tr class="table-row">
                  <td class="text-center">
                    <span class="rank-tag" [class.rank-top]="row.rank <= 3">#{{ row.rank }}</span>
                  </td>
                  <td>
                    <div class="unit-info">
                      <span class="unit-name">{{ row.name }}</span>
                      <span class="unit-type">{{ row.type }} • Phụ trách: {{ row.leadName }}</span>
                    </div>
                  </td>
                  <td class="text-center font-bold">{{ row.target }} <span class="sub-txt">việc</span></td>
                  <td class="text-center font-bold green-text">{{ row.completed }}</td>
                  <td class="text-center font-bold" [class.red-text]="row.overdue > 0">{{ row.overdue }}</td>
                  <td>
                    <div class="table-progress-wrap">
                      <span class="progress-pct">{{ row.rate }}%</span>
                      <div class="table-bar-track">
                        <div
                          class="table-bar-fill"
                          [style.width.%]="row.rate"
                          [ngClass]="'bar-' + row.status"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="status-badge-chip" [ngClass]="'chip-' + row.status">
                      {{ row.statusText }}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="call-action-group">
                      <span class="phone-number-text">{{ row.leadPhone }}</span>
                      <button
                        type="button"
                        class="quick-call-btn"
                        (click)="onCallClick($event, row.leadName, row.leadPhone)"
                        title="Gọi điện trực tiếp cho {{ row.leadName }}"
                      >
                        <span class="material-symbols-outlined">call</span>
                        <span>Gọi</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- ATTENTION TASKS SECTION -->
      @if (attentionTasks().length > 0) {
        <div class="attention-section">
          <div class="attention-header">
            <span class="material-symbols-outlined warning-icon">notification_important</span>
            <h3>Cảnh báo công việc cần Ban Giám hiệu đôn đốc gấp ({{ attentionTasks().length }} việc)</h3>
          </div>

          <div class="attention-grid">
            @for (task of attentionTasks(); track task.id) {
              <div class="attention-card" [class.overdue-card]="task.isOverdue">
                <div class="att-card-top">
                  <span class="task-code-badge">{{ task.code }}</span>
                  <span class="att-reason-tag">{{ task.reason }}</span>
                </div>
                <h4 class="att-task-title" [routerLink]="['/tasks', task.id]">{{ task.title }}</h4>
                <div class="att-meta-row">
                  <span class="meta-item">
                    <span class="material-symbols-outlined icon-s">location_on</span>
                    {{ task.locationName }}
                  </span>
                  <span class="meta-item">
                    <span class="material-symbols-outlined icon-s">person</span>
                    {{ task.chuTri?.fullName || 'Chưa phân công' }}
                  </span>
                </div>
                <div class="att-card-footer">
                  <span class="att-phone">{{ task.chuTri?.phone || '' }}</span>
                  <button
                    type="button"
                    class="att-call-btn"
                    (click)="onCallClick($event, task.chuTri?.fullName || '', task.chuTri?.phone || '')"
                  >
                    <span class="material-symbols-outlined">phone_in_talk</span>
                    <span>Gọi đôn đốc ngay</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 1.25rem 1.5rem 3rem;
        background: #F8FAFC;
        min-height: calc(100vh - 56px);
      }

      .bi-dashboard-container {
        max-width: 1440px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      /* HEADER */
      .bi-header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .bi-main-title {
        font-size: 1.45rem;
        font-weight: 800;
        color: #0F172A;
        margin: 0 0 0.25rem 0;
        letter-spacing: -0.01em;
      }

      .bi-sub-title {
        font-size: 0.85rem;
        color: #64748B;
        margin: 0;
      }

      .bi-header-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .loc-dropdown-box {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #FFFFFF;
        border: 1px solid #CBD5E1;
        border-radius: 8px;
        padding: 4px 10px;
      }

      .icon-pin {
        font-size: 18px;
        color: #2563EB;
      }

      .bi-select {
        border: none;
        outline: none;
        background: transparent;
        font-size: 0.85rem;
        font-weight: 600;
        color: #1E293B;
        cursor: pointer;
      }

      .bi-refresh-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #FFFFFF;
        border: 1px solid #CBD5E1;
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #334155;
        cursor: pointer;
        transition: all 0.15s;

        &:hover {
          background: #F1F5F9;
          border-color: #94A3B8;
        }
      }

      .spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        100% { transform: rotate(360deg); }
      }

      /* TOP GRID: 3 PANELS */
      .bi-top-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1.25fr;
        gap: 1.25rem;
      }

      .bi-card {
        background: #FFFFFF;
        border-radius: 12px;
        border: 1px solid #E2E8F0;
        padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }

      .card-top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #F1F5F9;
      }

      .card-heading {
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        color: #1E293B;
        margin: 0;
      }

      .period-pill {
        font-size: 0.72rem;
        font-weight: 600;
        background: #F1F5F9;
        color: #64748B;
        padding: 2px 8px;
        border-radius: 4px;
      }

      /* TARGET CARD */
      .target-card-body {
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }

      .donut-wrapper {
        position: relative;
        width: 105px;
        height: 105px;
        flex-shrink: 0;
      }

      .donut-svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .donut-bg {
        fill: none;
        stroke: #F1F5F9;
        stroke-width: 10;
      }

      .donut-fg {
        fill: none;
        stroke: #1E40AF;
        stroke-width: 10;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.8s ease;
      }

      .donut-text {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        line-height: 1.1;

        .donut-percent {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0F172A;
        }
        .donut-lbl {
          font-size: 0.65rem;
          color: #64748B;
        }
      }

      .target-stats-col {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 1;

        .stat-line {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 0.8rem;
          color: #64748B;

          .line-val {
            font-size: 0.95rem;
            color: #0F172A;
          }
          .unit {
            font-size: 0.75rem;
            font-weight: normal;
            color: #64748B;
          }
        }
      }

      /* LOCATION PROGRESS CARD */
      .location-card-body {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: calc(100% - 36px);
      }

      .loc-status-list {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.82rem;

        .item-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-icon {
          font-size: 18px;
        }
        .check-green { color: #10B981; }
        .play-blue { color: #3B82F6; }
        .wait-gray { color: #94A3B8; }

        .item-text {
          color: #334155;
          font-weight: 500;
        }

        .item-count {
          color: #0F172A;
          font-size: 0.9rem;
        }
        .unit {
          font-size: 0.72rem;
          color: #64748B;
          font-weight: normal;
        }
      }

      .multi-progress-bar {
        display: flex;
        height: 6px;
        border-radius: 999px;
        overflow: hidden;
        background: #E2E8F0;
        margin-top: 1rem;

        .seg-green { background: #10B981; }
        .seg-blue { background: #3B82F6; }
      }

      /* QUAD GRID */
      .metric-quad-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .quad-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 0.85rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .quad-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;

          span { font-size: 20px; }
        }

        &.blue .quad-icon { background: #EFF6FF; color: #2563EB; }
        &.amber .quad-icon { background: #FFFBEB; color: #D97706; }
        &.red .quad-icon { background: #FEF2F2; color: #DC2626; }
        &.purple .quad-icon { background: #FAF5FF; color: #7C3AED; }

        .quad-content {
          display: flex;
          flex-direction: column;
        }

        .quad-num {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0F172A;
          line-height: 1.1;
        }

        .quad-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748B;
        }
      }

      /* CHARTS ROW */
      .bi-charts-row {
        display: grid;
        grid-template-columns: 1.5fr 1fr;
        gap: 1.25rem;
      }

      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;

        .chart-title-group {
          display: flex;
          align-items: center;
          gap: 6px;

          .chart-icon {
            font-size: 18px;
            color: #2563EB;
          }

          .chart-title {
            font-size: 0.82rem;
            font-weight: 800;
            color: #1E293B;
            margin: 0;
            letter-spacing: 0.02em;
          }
        }

        .chart-tag {
          font-size: 0.72rem;
          color: #64748B;
        }
      }

      .chart-legend-row {
        display: flex;
        gap: 1rem;
        font-size: 0.75rem;
        color: #475569;
        margin-bottom: 0.75rem;

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-box {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }
        .blue-solid { background: #1E40AF; }
        .gray-dashed { background: #93C5FD; border: 1px dashed #60A5FA; }
      }

      .svg-chart-container {
        position: relative;
        width: 100%;
        height: 180px;

        .line-chart-svg {
          width: 100%;
          height: 155px;
        }

        .axis-text {
          font-size: 10px;
          fill: #94A3B8;
        }

        .x-axis-dates {
          display: flex;
          justify-content: space-between;
          padding: 0 40px;
          font-size: 0.7rem;
          color: #64748B;
          font-weight: 500;
        }
      }

      /* COMPLIANCE DONUT */
      .donut-chart-flex {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding-top: 0.5rem;
      }

      .donut-circle-box {
        width: 140px;
        height: 140px;
        flex-shrink: 0;

        .compliance-donut-svg {
          width: 100%;
          height: 100%;
        }
      }

      .compliance-legend-col {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        flex: 1;

        .comp-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }

        .comp-label-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .dot-green { background: #10B981; }
        .dot-amber { background: #F59E0B; }
        .dot-red { background: #EF4444; }

        .comp-label {
          color: #334155;
          font-weight: 500;
        }

        .comp-val {
          color: #0F172A;
          font-size: 0.88rem;
        }
        .unit {
          font-size: 0.72rem;
          color: #64748B;
          font-weight: normal;
        }
      }

      /* LEADERBOARD CARD */
      .leaderboard-card {
        padding: 1.25rem 1.5rem;
      }

      .leaderboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #F1F5F9;

        .lh-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .lh-icon {
          font-size: 20px;
          color: #2563EB;
        }

        .lh-title {
          font-size: 0.88rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          letter-spacing: 0.02em;
        }

        .lh-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #2563EB;
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 600;

          &:hover {
            text-decoration: underline;
          }

          span { font-size: 16px; }
        }
      }

      .table-responsive {
        overflow-x: auto;
      }

      .bi-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;

        th {
          background: #F8FAFC;
          color: #64748B;
          font-weight: 700;
          font-size: 0.75rem;
          padding: 0.6rem 0.85rem;
          border-bottom: 1px solid #E2E8F0;
          letter-spacing: 0.03em;
        }

        td {
          padding: 0.75rem 0.85rem;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
        }

        tr:hover td {
          background: #F8FAFC;
        }
      }

      .rank-tag {
        font-weight: 800;
        font-size: 0.85rem;
        color: #64748B;

        &.rank-top {
          color: #DC2626;
        }
      }

      .unit-info {
        display: flex;
        flex-direction: column;

        .unit-name {
          font-weight: 700;
          color: #0F172A;
          font-size: 0.88rem;
        }
        .unit-type {
          font-size: 0.72rem;
          color: #64748B;
        }
      }

      .table-progress-wrap {
        display: flex;
        align-items: center;
        gap: 8px;

        .progress-pct {
          font-weight: 700;
          font-size: 0.8rem;
          width: 32px;
        }

        .table-bar-track {
          flex: 1;
          height: 6px;
          background: #E2E8F0;
          border-radius: 999px;
          overflow: hidden;
        }

        .table-bar-fill {
          height: 100%;
          border-radius: 999px;

          &.bar-warning { background: #F59E0B; }
          &.bar-good { background: #3B82F6; }
          &.bar-excellent { background: #10B981; }
        }
      }

      .status-badge-chip {
        display: inline-block;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;

        &.chip-warning {
          background: #FEF3C7;
          color: #B45309;
        }
        &.chip-good {
          background: #EFF6FF;
          color: #1E40AF;
        }
        &.chip-excellent {
          background: #DCFCE7;
          color: #15803D;
        }
      }

      .call-action-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .phone-number-text {
        font-family: monospace;
        font-weight: 600;
        font-size: 0.8rem;
        color: #475569;
      }

      .quick-call-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: #EFF6FF;
        color: #1D4ED8;
        border: 1px solid #BFDBFE;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;

        span { font-size: 14px; }

        &:hover {
          background: #2563EB;
          color: #FFFFFF;
          border-color: #2563EB;
        }
      }

      /* ATTENTION SECTION */
      .attention-section {
        background: #FFFBEB;
        border: 1px solid #FDE68A;
        border-radius: 12px;
        padding: 1.25rem;

        .attention-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1rem;

          .warning-icon {
            font-size: 22px;
            color: #D97706;
          }

          h3 {
            font-size: 0.95rem;
            font-weight: 800;
            color: #92400E;
            margin: 0;
          }
        }
      }

      .attention-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1rem;
      }

      .attention-card {
        background: #FFFFFF;
        border: 1px solid #FDE68A;
        border-radius: 10px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        &.overdue-card {
          border-left: 4px solid #EF4444;
        }

        .att-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .task-code-badge {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.75rem;
          background: #F1F5F9;
          color: #475569;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .att-reason-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: #DC2626;
          background: #FEF2F2;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .att-task-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
          cursor: pointer;

          &:hover {
            color: #2563EB;
          }
        }

        .att-meta-row {
          display: flex;
          gap: 1rem;
          font-size: 0.78rem;
          color: #64748B;

          .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .icon-s { font-size: 14px; }
        }

        .att-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.4rem;
          padding-top: 0.5rem;
          border-top: 1px solid #F1F5F9;
        }

        .att-phone {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.82rem;
          color: #1E293B;
        }

        .att-call-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: #DC2626;
          color: #FFFFFF;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;

          span { font-size: 14px; }

          &:hover {
            background: #B91C1C;
          }
        }
      }

      /* Helpers */
      .green-text { color: #15803D !important; }
      .red-text { color: #DC2626 !important; }
      .font-bold { font-weight: 700; }
      .sub-txt { font-size: 0.72rem; color: #64748B; font-weight: normal; }
      .w-60 { width: 60px; }
      .w-200 { width: 180px; }
      .text-left { text-align: left; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }

      @media (max-width: 1100px) {
        .bi-top-grid {
          grid-template-columns: 1fr;
        }
        .bi-charts-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  dashboardService = inject(DashboardService);
  userService = inject(UserService);
  contactCardService = inject(ContactCardService);
  private router = inject(Router);

  overviewData = signal<DashboardOverviewData | null>(null);
  attentionTasks = signal<AttentionTaskItem[]>([]);
  locations = signal<LocationItem[]>([]);
  selectedLocationId = '';
  isLoading = signal(false);

  private sub = new Subscription();

  // Leaderboard data matching the visual format
  leaderboard: LeaderboardItem[] = [
    {
      rank: 1,
      name: 'Phân hiệu 1 (Tân Lập)',
      type: '59 Lớp • 2.688 HS',
      target: 8,
      completed: 4,
      overdue: 1,
      rate: 50,
      status: 'warning',
      statusText: 'Cảnh báo',
      leadName: 'Lê Hoàng Long',
      leadPhone: '0903333444',
    },
    {
      rank: 2,
      name: 'Điểm chính (Trung tâm)',
      type: '44 Lớp • 2.137 HS',
      target: 14,
      completed: 12,
      overdue: 0,
      rate: 85.7,
      status: 'excellent',
      statusText: 'Xuất sắc',
      leadName: 'Trần Thị Bích Mai',
      leadPhone: '0903222333',
    },
    {
      rank: 3,
      name: 'Tổ Toán - Tin học',
      type: 'Tổ Chuyên môn',
      target: 6,
      completed: 4,
      overdue: 1,
      rate: 66.7,
      status: 'warning',
      statusText: 'Cảnh báo',
      leadName: 'Vũ Đình Dũng',
      leadPhone: '0912111001',
    },
    {
      rank: 4,
      name: 'Phân hiệu 2 (Vườn Dừa)',
      type: '19 Lớp • 844 HS',
      target: 4,
      completed: 3,
      overdue: 0,
      rate: 75,
      status: 'good',
      statusText: 'Tốt',
      leadName: 'Phạm Quốc Tuấn',
      leadPhone: '0903444555',
    },
    {
      rank: 5,
      name: 'Tổ Ngữ văn - Lịch sử - Địa lý',
      type: 'Tổ Chuyên môn',
      target: 5,
      completed: 4,
      overdue: 0,
      rate: 80,
      status: 'good',
      statusText: 'Tốt',
      leadName: 'Nguyễn Thị Thu Hà',
      leadPhone: '0912111002',
    },
  ];

  ngOnInit(): void {
    this.loadLocations();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadLocations(): void {
    this.userService.getLocations().subscribe({
      next: (locs) => this.locations.set(locs),
      error: (err) => console.error('Error loading locations:', err),
    });
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.dashboardService.getOverview(this.selectedLocationId ? { locationId: this.selectedLocationId } : undefined).subscribe({
      next: (data) => {
        this.overviewData.set(data);
        this.attentionTasks.set(data.attentionTasks || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.isLoading.set(false);
      },
    });
  }

  onLocationFilterChange(): void {
    this.loadDashboardData();
  }

  getCompletionRate(): number {
    const data = this.overviewData();
    if (!data || data.totalTasks === 0) return 71.4;
    return Math.round((data.completedCount / data.totalTasks) * 1000) / 10 || 71.4;
  }

  getDonutOffset(percent: number): number {
    const circumference = 251.2;
    return circumference - (circumference * percent) / 100;
  }

  getTotalTasks(): number {
    return this.overviewData()?.totalTasks || 28;
  }

  getCompletedCount(): number {
    return this.overviewData()?.completedCount || 20;
  }

  getCheckingCount(): number {
    return this.overviewData()?.pendingReviewCount || 4;
  }

  getOverdueCount(): number {
    return this.overviewData()?.overdueCount || 3;
  }

  getPausedCount(): number {
    return 1;
  }

  getTotalTargetCount(): number {
    return 9960;
  }

  onCallClick(event: Event, name: string, phone: string): void {
    event.stopPropagation();
    this.contactCardService.open({
      id: '',
      fullName: name,
      email: '',
      phone: phone,
      title: 'Phụ trách đơn vị',
      currentTaskLoad: 1,
    });
  }
}
