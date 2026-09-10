import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ReportService, ReportFilterCriteria, ReportSummaryKpis, BreakdownStatItem } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { PlanService } from '../../core/services/plan.service';
import { ContactCardService } from '../../core/services/contact-card.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { TaskDetailModalComponent } from '../../shared/components/task-detail-modal/task-detail-modal.component';
import { TaskItem } from '../../core/models/task.models';
import { LocationItem, OrgUnitItem } from '../../core/models/user.models';
import { PlanItem } from '../../core/models/plan.models';

type PresetType = 'DEFAULT' | 'OVERDUE' | 'LOCATIONS' | 'ORGS' | 'WAITING_REVIEW' | 'IN_PLAN';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StatusBadgeComponent,
    TaskDetailModalComponent,
  ],
  template: `
    <div class="reports-page">
      <!-- HEADER -->
      <div class="page-header hide-on-print">
        <div class="header-left">
          <div class="breadcrumb-row">
            <span class="material-symbols-outlined">analytics</span>
            <span>Báo Cáo & Thống Kê Điều Hành</span>
          </div>
          <h1 class="page-title">Xây Dựng Báo Cáo Công Việc & Kế Hoạch</h1>
          <p class="page-subtitle">
            Tổng hợp đa chiều tiến độ thực hiện nhiệm vụ theo 3 Điểm trường, 8 Tổ chuyên môn và trích xuất file Excel báo cáo
          </p>
        </div>

        <div class="header-right-actions">
          <button
            type="button"
            class="btn-action btn-refresh tap-target"
            (click)="loadReportData()"
            [disabled]="isLoading()"
            title="Làm mới số liệu"
          >
            <span class="material-symbols-outlined" [class.spin]="isLoading()">refresh</span>
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            class="btn-action btn-print tap-target"
            (click)="printReport()"
            title="In báo cáo hoặc lưu file PDF"
          >
            <span class="material-symbols-outlined">print</span>
            <span>In / Lưu PDF</span>
          </button>

          <button
            type="button"
            class="btn-action btn-excel tap-target"
            (click)="exportExcel()"
            [disabled]="isLoading() || filteredTasks().length === 0"
            title="Xuất dữ liệu ra file Excel chuẩn định dạng"
          >
            <span class="material-symbols-outlined excel-icon">table_view</span>
            <span>Xuất file Excel báo cáo</span>
          </button>
        </div>
      </div>

      <!-- PRINT-ONLY HEADER (Chỉ hiện khi in) -->
      <div class="print-header show-on-print-only">
        <div class="print-header-top">
          <div class="print-unit-left">
            <strong>ỦY BAN NHÂN DÂN TP. BIÊN HÒA</strong><br/>
            <strong>TRƯỜNG TH & THCS PHƯỚC TÂN</strong>
          </div>
          <div class="print-unit-right">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
            <u>Độc lập - Tự do - Hạnh phúc</u>
          </div>
        </div>
        <h2 class="print-main-title">{{ getReportHeading() | uppercase }}</h2>
        <p class="print-subtitle">Năm học 2026 - 2027 • 3 Điểm trường (122 lớp - 5.669 học sinh)</p>
        <div class="print-meta-grid">
          <div>• Điểm trường: <strong>{{ getSelectedLocationName() }}</strong></div>
          <div>• Tổ chuyên môn: <strong>{{ getSelectedOrgName() }}</strong></div>
          <div>• Kỳ báo cáo: <strong>{{ getTimeRangeLabel() }}</strong></div>
          <div>• Thời điểm xuất: <strong>{{ currentDateTimeStr }}</strong></div>
        </div>
      </div>

      <!-- PRESET BUTTONS (1-CLICK QUICK REPORTS) -->
      <div class="presets-bar hide-on-print">
        <span class="preset-label">
          <span class="material-symbols-outlined">bolt</span>
          <span>Mẫu báo cáo nhanh:</span>
        </span>
        <div class="preset-buttons-row">
          <button
            type="button"
            class="preset-btn"
            [class.active]="activePreset === 'DEFAULT'"
            (click)="applyPreset('DEFAULT')"
          >
            📊 Tiến độ Tháng 9 Toàn trường
          </button>
          <button
            type="button"
            class="preset-btn"
            [class.active]="activePreset === 'OVERDUE'"
            (click)="applyPreset('OVERDUE')"
          >
            🚨 Việc Chậm tiến độ / Quá hạn
          </button>
          <button
            type="button"
            class="preset-btn"
            [class.active]="activePreset === 'LOCATIONS'"
            (click)="applyPreset('LOCATIONS')"
          >
            🏫 So sánh 3 Điểm trường
          </button>
          <button
            type="button"
            class="preset-btn"
            [class.active]="activePreset === 'ORGS'"
            (click)="applyPreset('ORGS')"
          >
            👥 Hiệu suất Tổ Chuyên môn
          </button>
          <button
            type="button"
            class="preset-btn"
            [class.active]="activePreset === 'WAITING_REVIEW'"
            (click)="applyPreset('WAITING_REVIEW')"
          >
            📋 Việc Chờ nghiệm thu & Đã nộp minh chứng
          </button>
          <button
            type="button"
            class="preset-btn"
            [class.active]="activePreset === 'IN_PLAN'"
            (click)="applyPreset('IN_PLAN')"
          >
            🎯 Nhiệm vụ Trong Kế hoạch Chiến lược
          </button>
        </div>
      </div>

      <!-- FILTER PANEL -->
      <div class="filter-panel-card hide-on-print">
        <div class="filter-card-header" (click)="toggleFilterExpand()">
          <div class="header-title-left">
            <span class="material-symbols-outlined filter-icon">tune</span>
            <span class="title-text">Bộ Lọc Tùy Biến Báo Cáo</span>
            <span class="filter-count-badge">{{ activeFilterCount() }} tiêu chí đang lọc</span>
          </div>
          <button type="button" class="btn-toggle-filter" (click)="$event.stopPropagation(); toggleFilterExpand()">
            <span class="material-symbols-outlined">{{ isFilterExpanded ? 'expand_less' : 'expand_more' }}</span>
          </button>
        </div>

        @if (isFilterExpanded) {
          <div class="filter-card-body">
            <div class="filters-grid">
              <!-- 1. Điểm trường -->
              <div class="filter-group">
                <label class="filter-label">
                  <span class="material-symbols-outlined">location_on</span>
                  <span>Điểm trường (Cơ sở)</span>
                </label>
                <select class="filter-select tap-target" [(ngModel)]="filters.locationId" (ngModelChange)="onFilterChange()">
                  <option value="">Toàn trường (3 Điểm trường)</option>
                  @for (loc of locations(); track loc.id) {
                    <option [value]="loc.id">{{ loc.name }}</option>
                  }
                </select>
              </div>

              <!-- 2. Tổ chuyên môn -->
              <div class="filter-group">
                <label class="filter-label">
                  <span class="material-symbols-outlined">corporate_fare</span>
                  <span>Tổ Chuyên Môn / Khối</span>
                </label>
                <select class="filter-select tap-target" [(ngModel)]="filters.orgUnitId" (ngModelChange)="onFilterChange()">
                  <option value="">Tất cả các tổ chuyên môn</option>
                  @for (org of orgUnits(); track org.id) {
                    <option [value]="org.id">{{ org.name }}</option>
                  }
                </select>
              </div>

              <!-- 3. Kế hoạch / Đột xuất -->
              <div class="filter-group">
                <label class="filter-label">
                  <span class="material-symbols-outlined">calendar_month</span>
                  <span>Gắn kết Kế hoạch</span>
                </label>
                <select class="filter-select tap-target" [(ngModel)]="selectedPlanScope" (ngModelChange)="onPlanScopeChange()">
                  <option value="ALL">Tất cả (Trong KH & Việc đột xuất)</option>
                  <option value="IN_PLAN">Chỉ việc Trong Kế hoạch</option>
                  <option value="OUT_OF_PLAN">Chỉ việc Đột xuất (Ngoài kế hoạch)</option>
                  @for (p of plans(); track p.id) {
                    <option [value]="p.id">• {{ p.title }}</option>
                  }
                </select>
              </div>

              <!-- 4. Khoảng thời gian -->
              <div class="filter-group">
                <label class="filter-label">
                  <span class="material-symbols-outlined">date_range</span>
                  <span>Kỳ Báo Cáo (Thời gian)</span>
                </label>
                <select class="filter-select tap-target" [(ngModel)]="filters.timeRange" (ngModelChange)="onFilterChange()">
                  <option value="ALL">Toàn bộ năm học (2026 - 2027)</option>
                  <option value="THIS_MONTH">Tháng 9/2026 (Tháng hiện tại)</option>
                  <option value="THIS_WEEK">Tuần này</option>
                  <option value="THIS_TERM">Học kỳ I (8/2026 - 1/2027)</option>
                  <option value="CUSTOM">Tùy chọn khoảng ngày...</option>
                </select>
              </div>

              <!-- 5. Trạng thái công việc -->
              <div class="filter-group">
                <label class="filter-label">
                  <span class="material-symbols-outlined">flag</span>
                  <span>Trạng Thái Nhiệm Vụ</span>
                </label>
                <select class="filter-select tap-target" [(ngModel)]="filters.status" (ngModelChange)="onFilterChange()">
                  <option value="">Tất cả trạng thái</option>
                  <option value="HOAN_THANH">✅ Hoàn thành</option>
                  <option value="DANG_THUC_HIEN">🔵 Đang thực hiện</option>
                  <option value="CHO_KIEM_TRA">🟡 Chờ nghiệm thu</option>
                  <option value="BO_SUNG">🟠 Yêu cầu bổ sung</option>
                  <option value="DA_GIAO">⚪ Đã giao việc</option>
                  <option value="DONG">🔒 Đã đóng</option>
                </select>
              </div>

              <!-- 6. Mức ưu tiên -->
              <div class="filter-group">
                <label class="filter-label">
                  <span class="material-symbols-outlined">priority_high</span>
                  <span>Mức Độ Ưu Tiên</span>
                </label>
                <select class="filter-select tap-target" [(ngModel)]="filters.priority" (ngModelChange)="onFilterChange()">
                  <option value="">Tất cả mức độ</option>
                  <option value="KHAN_CAP">🔴 Khẩn cấp</option>
                  <option value="CAO">🟠 Cao</option>
                  <option value="TRUNG_BINH">🔵 Trung bình</option>
                  <option value="THAP">⚪ Thấp</option>
                </select>
              </div>
            </div>

            <!-- Custom date range row if selected -->
            @if (filters.timeRange === 'CUSTOM') {
              <div class="custom-dates-row">
                <div class="date-input-box">
                  <label>Từ ngày:</label>
                  <input type="date" class="date-input tap-target" [(ngModel)]="filters.startDate" (ngModelChange)="onFilterChange()" />
                </div>
                <div class="date-input-box">
                  <label>Đến ngày:</label>
                  <input type="date" class="date-input tap-target" [(ngModel)]="filters.endDate" (ngModelChange)="onFilterChange()" />
                </div>
              </div>
            }

            <div class="filter-footer-row">
              <div class="search-input-wrapper">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  class="search-input tap-target"
                  placeholder="Tìm nhanh theo tên việc, mã việc, giáo viên chủ trì..."
                  [(ngModel)]="filters.search"
                  (ngModelChange)="onFilterChange()"
                />
                @if (filters.search) {
                  <button type="button" class="clear-search-btn" (click)="filters.search = ''; onFilterChange()">
                    <span class="material-symbols-outlined">cancel</span>
                  </button>
                }
              </div>

              <div class="filter-actions-right">
                <label class="checkbox-overdue-pill tap-target">
                  <input type="checkbox" [(ngModel)]="filters.isOverdue" (ngModelChange)="onFilterChange()" />
                  <span class="material-symbols-outlined alert-icon">error</span>
                  <span>Chỉ lọc việc Quá Hạn</span>
                </label>

                <button type="button" class="btn-reset-filters tap-target" (click)="resetFilters()">
                  <span class="material-symbols-outlined">restart_alt</span>
                  <span>Đặt lại bộ lọc</span>
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- KPI SUMMARY CARDS -->
      <div class="kpi-cards-grid">
        <!-- Card 1: Tổng số việc -->
        <div class="kpi-card card-total">
          <div class="card-icon-box">
            <span class="material-symbols-outlined">assignment</span>
          </div>
          <div class="card-info">
            <span class="kpi-label">Tổng Công Việc Báo Cáo</span>
            <div class="kpi-val-row">
              <span class="kpi-value">{{ summaryKpis().totalTasks }}</span>
              <span class="kpi-unit">nhiệm vụ</span>
            </div>
            <span class="kpi-subtext">
              Trong KH: <strong>{{ summaryKpis().inPlanCount }}</strong> • Đột xuất: <strong>{{ summaryKpis().outOfPlanCount }}</strong>
            </span>
          </div>
        </div>

        <!-- Card 2: Hoàn thành -->
        <div class="kpi-card card-completed">
          <div class="card-icon-box">
            <span class="material-symbols-outlined">task_alt</span>
          </div>
          <div class="card-info">
            <span class="kpi-label">Đã Hoàn Tất Nghiệm Thu</span>
            <div class="kpi-val-row">
              <span class="kpi-value color-green">{{ summaryKpis().completedTasks }}</span>
              <span class="kpi-rate-badge badge-green">{{ summaryKpis().completionRate }}%</span>
            </div>
            <div class="kpi-mini-bar">
              <div class="mini-bar-fill fill-green" [style.width.%]="summaryKpis().completionRate"></div>
            </div>
          </div>
        </div>

        <!-- Card 3: Đang thực hiện -->
        <div class="kpi-card card-progress">
          <div class="card-icon-box">
            <span class="material-symbols-outlined">pending_actions</span>
          </div>
          <div class="card-info">
            <span class="kpi-label">Đang Triển Khai Thực Hiện</span>
            <div class="kpi-val-row">
              <span class="kpi-value color-blue">{{ summaryKpis().inProgressTasks }}</span>
              <span class="kpi-unit">việc</span>
            </div>
            <span class="kpi-subtext">Đang đúng kế hoạch</span>
          </div>
        </div>

        <!-- Card 4: Chờ nghiệm thu -->
        <div class="kpi-card card-review">
          <div class="card-icon-box">
            <span class="material-symbols-outlined">verified_user</span>
          </div>
          <div class="card-info">
            <span class="kpi-label">Chờ Kiểm Tra & Nghiệm Thu</span>
            <div class="kpi-val-row">
              <span class="kpi-value color-amber">{{ summaryKpis().waitingConfirmTasks }}</span>
              <span class="kpi-unit">việc</span>
            </div>
            <span class="kpi-subtext">Đã nộp minh chứng kết quả</span>
          </div>
        </div>

        <!-- Card 5: Quá hạn -->
        <div class="kpi-card card-overdue" [class.has-overdue]="summaryKpis().overdueTasks > 0">
          <div class="card-icon-box">
            <span class="material-symbols-outlined">error</span>
          </div>
          <div class="card-info">
            <span class="kpi-label">Chậm Tiến Độ / Quá Hạn</span>
            <div class="kpi-val-row">
              <span class="kpi-value color-red">{{ summaryKpis().overdueTasks }}</span>
              <span class="kpi-unit">việc</span>
            </div>
            <span class="kpi-subtext" [class.text-red]="summaryKpis().overdueTasks > 0">
              {{ summaryKpis().overdueTasks > 0 ? 'Cần BGH chỉ đạo đôn đốc' : 'Không có việc trễ hạn' }}
            </span>
          </div>
        </div>
      </div>

      <!-- VISUAL BREAKDOWN TABS (Theo Điểm Trường & Theo Tổ Bộ Môn) -->
      <div class="breakdown-container hide-on-print">
        <div class="breakdown-header">
          <div class="breakdown-tabs">
            <button
              type="button"
              class="breakdown-tab-btn tap-target"
              [class.active]="activeBreakdownTab === 'LOCATIONS'"
              (click)="activeBreakdownTab = 'LOCATIONS'"
            >
              <span class="material-symbols-outlined">domain</span>
              <span>So Sánh 3 Điểm Trường (Cơ sở)</span>
            </button>
            <button
              type="button"
              class="breakdown-tab-btn tap-target"
              [class.active]="activeBreakdownTab === 'ORGS'"
              (click)="activeBreakdownTab = 'ORGS'"
            >
              <span class="material-symbols-outlined">groups</span>
              <span>Tiến Độ Theo 8 Tổ Chuyên Môn</span>
            </button>
          </div>
        </div>

        <div class="breakdown-body">
          @if (activeBreakdownTab === 'LOCATIONS') {
            <div class="stat-bars-grid">
              @for (item of locationBreakdown(); track item.id) {
                <div class="stat-bar-card">
                  <div class="stat-card-top">
                    <div class="stat-name-box">
                      <span class="material-symbols-outlined loc-icon">location_on</span>
                      <strong class="stat-name">{{ item.name }}</strong>
                    </div>
                    <div class="stat-rate-pill" [ngClass]="getRatePillClass(item.completionRate)">
                      {{ item.completionRate }}% Hoàn thành
                    </div>
                  </div>

                  <div class="progress-track">
                    <div class="progress-fill fill-green" [style.width.%]="item.completionRate"></div>
                  </div>

                  <div class="stat-card-counts">
                    <span>Tổng số: <strong>{{ item.total }}</strong></span>
                    <span>Hoàn thành: <strong class="color-green">{{ item.completed }}</strong></span>
                    <span>Đang làm: <strong class="color-blue">{{ item.inProgress }}</strong></span>
                    @if (item.overdue > 0) {
                      <span class="color-red">Quá hạn: <strong>{{ item.overdue }}</strong></span>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="stat-bars-grid grid-orgs">
              @for (item of orgUnitBreakdown(); track item.id) {
                <div class="stat-bar-card">
                  <div class="stat-card-top">
                    <div class="stat-name-box">
                      <span class="material-symbols-outlined org-icon">school</span>
                      <strong class="stat-name">{{ item.name }}</strong>
                    </div>
                    <div class="stat-rate-pill" [ngClass]="getRatePillClass(item.completionRate)">
                      {{ item.completionRate }}%
                    </div>
                  </div>

                  <div class="progress-track">
                    <div class="progress-fill fill-green" [style.width.%]="item.completionRate"></div>
                  </div>

                  <div class="stat-card-counts">
                    <span>Tổng: <strong>{{ item.total }}</strong></span>
                    <span>Xong: <strong class="color-green">{{ item.completed }}</strong></span>
                    <span>Đang làm: <strong class="color-blue">{{ item.inProgress }}</strong></span>
                    @if (item.overdue > 0) {
                      <span class="color-red">Trễ: <strong>{{ item.overdue }}</strong></span>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- MAIN DATA TABLE -->
      <div class="report-table-section">
        <div class="table-header-row">
          <div class="table-title-box">
            <h3 class="table-section-title">
              <span class="material-symbols-outlined">table_chart</span>
              <span>Bảng Kê Chi Tiết Nhiệm Vụ & Tiến Độ</span>
            </h3>
            <span class="badge-total-items">{{ filteredTasks().length }} công việc khớp bộ lọc</span>
          </div>

          <div class="table-tools hide-on-print">
            <button
              type="button"
              class="tool-btn btn-excel-mini tap-target"
              (click)="exportExcel()"
              [disabled]="filteredTasks().length === 0"
              title="Xuất danh sách này ra Excel"
            >
              <span class="material-symbols-outlined">download</span>
              <span>Tải Excel</span>
            </button>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <span class="material-symbols-outlined spin-icon">sync</span>
            <span>Đang tải và tổng hợp dữ liệu báo cáo...</span>
          </div>
        } @else if (filteredTasks().length === 0) {
          <div class="empty-state">
            <span class="material-symbols-outlined empty-icon">search_off</span>
            <h4>Không tìm thấy công việc nào khớp với bộ lọc</h4>
            <p>Vui lòng thử chọn lại phạm vi Điểm trường, Tổ chuyên môn hoặc đặt lại bộ lọc.</p>
            <button type="button" class="btn-reset-empty tap-target" (click)="resetFilters()">
              <span class="material-symbols-outlined">refresh</span>
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="report-data-table">
              <thead>
                <tr>
                  <th style="width: 45px;" class="text-center">STT</th>
                  <th style="width: 100px;">Mã việc</th>
                  <th style="min-width: 240px;">Tên nhiệm vụ / Công việc</th>
                  <th style="width: 150px;">Kế hoạch trực thuộc</th>
                  <th style="width: 140px;">Điểm trường</th>
                  <th style="width: 140px;">Tổ chuyên môn</th>
                  <th style="width: 140px;">Người Chủ trì (R)</th>
                  <th style="width: 130px;">Người Kiểm tra (A)</th>
                  <th style="width: 110px;" class="text-center">Hạn chót</th>
                  <th style="width: 90px;" class="text-center">Tiến độ</th>
                  <th style="width: 130px;" class="text-center">Trạng thái</th>
                  <th style="width: 110px;" class="text-center hide-on-print">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (task of pagedTasks(); track task.id; let idx = $index) {
                  <tr [class.row-overdue]="task.isOverdue">
                    <td class="text-center font-semibold text-slate">{{ (currentPage() - 1) * pageSize() + idx + 1 }}</td>
                    <td>
                      <span class="code-badge">{{ task.code || 'CV-' + task.id.slice(-5) }}</span>
                    </td>
                    <td>
                      <div class="task-title-cell">
                        <span class="main-title" (click)="openTaskModal(task)">{{ task.title }}</span>
                        @if (task.priority === 'KHAN_CAP' || task.priority === 'CAO') {
                          <span class="priority-tag" [ngClass]="'prio-' + task.priority">
                            {{ task.priority === 'KHAN_CAP' ? '🔴 Khẩn' : '🟠 Cao' }}
                          </span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="plan-cell-text" [title]="task.plan?.title || 'Ngoài kế hoạch'">
                        {{ task.plan?.title || '⚡ Việc đột xuất' }}
                      </span>
                    </td>
                    <td>
                      <span class="location-tag-pill" [ngClass]="getLocationTagClass(task)">
                        {{ task.location?.name || 'Điểm chính' }}
                      </span>
                    </td>
                    <td>
                      <span class="org-name-text">{{ task.orgUnit?.name || 'Ban Giám hiệu' }}</span>
                    </td>
                    <td>
                      <div class="user-cell" (click)="openContactCard(getChuTriUser(task), $event)">
                        <span class="user-fullname">{{ getChuTriName(task) }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="user-reviewer-name">{{ getKiemTraName(task) }}</span>
                    </td>
                    <td class="text-center">
                      <span class="due-date-pill" [ngClass]="getDueStatusClass(task)">
                        {{ formatDueDate(task.dueDate) }}
                      </span>
                    </td>
                    <td class="text-center">
                      <div class="progress-num-box">
                        <strong>{{ task.progressPercent || 0 }}%</strong>
                      </div>
                    </td>
                    <td class="text-center">
                      <app-status-badge [status]="task.status" [isOverdue]="task.isOverdue || false"></app-status-badge>
                    </td>
                    <td class="text-center hide-on-print">
                      <button type="button" class="btn-view-detail tap-target" (click)="openTaskModal(task)" title="Xem chi tiết & minh chứng">
                        <span class="material-symbols-outlined">visibility</span>
                        <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- PAGINATION -->
          @if (filteredTasks().length > pageSize()) {
            <div class="pagination-bar hide-on-print">
              <span class="page-info-text">
                Hiển thị <strong>{{ (currentPage() - 1) * pageSize() + 1 }}</strong> -
                <strong>{{ Math.min(currentPage() * pageSize(), filteredTasks().length) }}</strong> trên
                <strong>{{ filteredTasks().length }}</strong> công việc
              </span>

              <div class="pagination-btns">
                <button
                  type="button"
                  class="page-btn tap-target"
                  [disabled]="currentPage() === 1"
                  (click)="currentPage.set(currentPage() - 1)"
                >
                  <span class="material-symbols-outlined">chevron_left</span>
                  <span>Trước</span>
                </button>

                <span class="current-page-tag">Trang {{ currentPage() }} / {{ totalPages() }}</span>

                <button
                  type="button"
                  class="page-btn tap-target"
                  [disabled]="currentPage() === totalPages()"
                  (click)="currentPage.set(currentPage() + 1)"
                >
                  <span>Sau</span>
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- PRINT SIGNATURE SECTION (Chỉ hiện khi in) -->
      <div class="print-signatures show-on-print-only">
        <div class="sign-box">
          <strong>NGƯỜI LẬP BÁO CÁO</strong>
          <p><i>(Ký và ghi rõ họ tên)</i></p>
          <div class="sign-space"></div>
          <strong>{{ authService.currentUser()?.fullName || 'Cán bộ phụ trách' }}</strong>
        </div>
        <div class="sign-box">
          <strong>HIỆU TRƯỞNG PHÊ DUYỆT</strong>
          <p><i>(Ký, đóng dấu và ghi rõ họ tên)</i></p>
          <div class="sign-space"></div>
          <strong>Cô Phạm Thị Nam</strong>
        </div>
      </div>

      <!-- TASK DETAIL MODAL -->
      @if (selectedTaskIdForModal()) {
        <app-task-detail-modal
          [taskId]="selectedTaskIdForModal()"
          (closed)="selectedTaskIdForModal.set(null)"
          (taskUpdated)="onTaskUpdated($event)"
        ></app-task-detail-modal>
      }
    </div>
  `,
  styles: [
    `
      .reports-page {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding-bottom: 40px;
      }

      /* HEADER */
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;

        .header-left {
          .breadcrumb-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            font-weight: 700;
            color: #1F3864;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;

            .material-symbols-outlined {
              font-size: 18px;
            }
          }

          .page-title {
            font-size: 1.7rem;
            font-weight: 800;
            color: #1E293B;
            margin: 0;
            line-height: 1.25;
          }

          .page-subtitle {
            font-size: 0.9rem;
            color: #64748B;
            margin-top: 4px;
            margin-bottom: 0;
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
            font-size: 0.88rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;

            .material-symbols-outlined {
              font-size: 20px;
            }

            &.btn-refresh {
              background: #FFFFFF;
              border: 1.5px solid #CBD5E1;
              color: #475569;

              &:hover:not(:disabled) {
                background: #F1F5F9;
                color: #1F3864;
                border-color: #94A3B8;
              }
            }

            &.btn-print {
              background: #EEF4FC;
              border: 1.5px solid #BFDBFE;
              color: #1F3864;

              &:hover {
                background: #DBEAFE;
                color: #1E3A8A;
              }
            }

            &.btn-excel {
              background: linear-gradient(135deg, #107C41 0%, #0B5C30 100%);
              color: #FFFFFF;
              box-shadow: 0 4px 12px rgba(16, 124, 65, 0.25);

              &:hover:not(:disabled) {
                background: linear-gradient(135deg, #0E6B38 0%, #084D28 100%);
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(16, 124, 65, 0.35);
              }

              .excel-icon {
                color: #A7F3D0;
              }
            }

            &:disabled {
              opacity: 0.55;
              cursor: not-allowed;
            }
          }
        }
      }

      /* PRESETS BAR */
      .presets-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 8px 14px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        overflow-x: auto;
        scrollbar-width: thin;

        .preset-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #1F3864;
          white-space: nowrap;

          .material-symbols-outlined {
            font-size: 18px;
            color: #F59E0B;
          }
        }

        .preset-buttons-row {
          display: flex;
          align-items: center;
          gap: 6px;

          .preset-btn {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 6px 12px;
            font-size: 0.8rem;
            font-weight: 600;
            color: #475569;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease;

            &:hover {
              background: #EEF4FC;
              color: #1F3864;
              border-color: #BFDBFE;
            }

            &.active {
              background: #1F3864;
              color: #FFFFFF;
              border-color: #1F3864;
            }
          }
        }
      }

      /* FILTER PANEL */
      .filter-panel-card {
        background: #FFFFFF;
        border: 1.5px solid #E2E8F0;
        border-radius: 14px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        overflow: hidden;

        .filter-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #F8FAFC;
          cursor: pointer;
          border-bottom: 1px solid #E2E8F0;

          .header-title-left {
            display: flex;
            align-items: center;
            gap: 8px;

            .filter-icon {
              font-size: 20px;
              color: #1F3864;
            }

            .title-text {
              font-size: 0.95rem;
              font-weight: 700;
              color: #1E293B;
            }

            .filter-count-badge {
              font-size: 0.72rem;
              font-weight: 700;
              background: #EEF4FC;
              color: #1E40AF;
              padding: 2px 8px;
              border-radius: 9999px;
            }
          }

          .btn-toggle-filter {
            background: transparent;
            border: none;
            color: #64748B;
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
          }
        }

        .filter-card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;

          .filters-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;

            @media (max-width: 992px) {
              grid-template-columns: repeat(2, 1fr);
            }

            @media (max-width: 600px) {
              grid-template-columns: 1fr;
            }

            .filter-group {
              display: flex;
              flex-direction: column;
              gap: 4px;

              .filter-label {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 0.78rem;
                font-weight: 700;
                color: #475569;

                .material-symbols-outlined {
                  font-size: 16px;
                  color: #1F3864;
                }
              }

              .filter-select {
                background: #FFFFFF;
                border: 1.5px solid #CBD5E1;
                border-radius: 8px;
                padding: 8px 10px;
                font-size: 0.85rem;
                font-weight: 600;
                color: #1E293B;
                outline: none;
                cursor: pointer;

                &:focus {
                  border-color: #1F3864;
                }
              }
            }
          }

          .custom-dates-row {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #F8FAFC;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px dashed #CBD5E1;

            .date-input-box {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.82rem;
              font-weight: 600;
              color: #475569;

              .date-input {
                background: #FFFFFF;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 0.82rem;
                outline: none;
              }
            }
          }

          .filter-footer-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            padding-top: 10px;
            border-top: 1px solid #F1F5F9;

            .search-input-wrapper {
              flex: 1;
              min-width: 260px;
              display: flex;
              align-items: center;
              gap: 8px;
              background: #F8FAFC;
              border: 1.5px solid #CBD5E1;
              border-radius: 8px;
              padding: 0 10px;

              &:focus-within {
                border-color: #1F3864;
                background: #FFFFFF;
              }

              .search-icon {
                font-size: 18px;
                color: #94A3B8;
              }

              .search-input {
                flex: 1;
                border: none;
                background: transparent;
                padding: 7px 0;
                font-size: 0.85rem;
                outline: none;
                color: #1E293B;
              }

              .clear-search-btn {
                background: transparent;
                border: none;
                color: #94A3B8;
                cursor: pointer;
                padding: 2px;
                display: flex;
                align-items: center;
              }
            }

            .filter-actions-right {
              display: flex;
              align-items: center;
              gap: 10px;

              .checkbox-overdue-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 7px 12px;
                background: #FEE2E2;
                border: 1px solid #FCA5A5;
                border-radius: 8px;
                font-size: 0.8rem;
                font-weight: 700;
                color: #B91C1C;
                cursor: pointer;

                input[type='checkbox'] {
                  accent-color: #DC2626;
                  cursor: pointer;
                }

                .alert-icon {
                  font-size: 16px;
                }
              }

              .btn-reset-filters {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 7px 12px;
                background: #F1F5F9;
                border: 1px solid #CBD5E1;
                border-radius: 8px;
                font-size: 0.8rem;
                font-weight: 600;
                color: #475569;
                cursor: pointer;

                &:hover {
                  background: #E2E8F0;
                  color: #1E293B;
                }

                .material-symbols-outlined {
                  font-size: 16px;
                }
              }
            }
          }
        }
      }

      /* KPI CARDS GRID */
      .kpi-cards-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 14px;

        @media (max-width: 1200px) {
          grid-template-columns: repeat(3, 1fr);
        }

        @media (max-width: 768px) {
          grid-template-columns: repeat(2, 1fr);
        }

        @media (max-width: 480px) {
          grid-template-columns: 1fr;
        }

        .kpi-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
          }

          .card-icon-box {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;

            .material-symbols-outlined {
              font-size: 20px;
            }
          }

          &.card-total {
            border-left: 4px solid #1F3864;
            .card-icon-box { background: #EEF4FC; color: #1F3864; }
          }
          &.card-completed {
            border-left: 4px solid #10B981;
            .card-icon-box { background: #DCFCE7; color: #10B981; }
          }
          &.card-progress {
            border-left: 4px solid #3B82F6;
            .card-icon-box { background: #DBEAFE; color: #3B82F6; }
          }
          &.card-review {
            border-left: 4px solid #F59E0B;
            .card-icon-box { background: #FEF3C7; color: #F59E0B; }
          }
          &.card-overdue {
            border-left: 4px solid #EF4444;
            .card-icon-box { background: #FEE2E2; color: #EF4444; }

            &.has-overdue {
              background: #FFFBFB;
              border-color: #FECACA;
            }
          }

          .card-info {
            display: flex;
            flex-direction: column;
            gap: 2px;

            .kpi-label {
              font-size: 0.74rem;
              font-weight: 700;
              color: #64748B;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }

            .kpi-val-row {
              display: flex;
              align-items: baseline;
              gap: 6px;

              .kpi-value {
                font-size: 1.6rem;
                font-weight: 900;
                color: #1E293B;
                line-height: 1.1;

                &.color-green { color: #16A34A; }
                &.color-blue { color: #2563EB; }
                &.color-amber { color: #D97706; }
                &.color-red { color: #DC2626; }
              }

              .kpi-unit {
                font-size: 0.75rem;
                font-weight: 600;
                color: #64748B;
              }

              .kpi-rate-badge {
                font-size: 0.75rem;
                font-weight: 800;
                padding: 1px 6px;
                border-radius: 9999px;

                &.badge-green {
                  background: #DCFCE7;
                  color: #15803D;
                }
              }
            }

            .kpi-subtext {
              font-size: 0.72rem;
              color: #64748B;
              margin-top: 4px;

              &.text-red {
                color: #DC2626;
                font-weight: 700;
              }
            }

            .kpi-mini-bar {
              height: 4px;
              background: #E2E8F0;
              border-radius: 9999px;
              margin-top: 6px;
              overflow: hidden;

              .mini-bar-fill {
                height: 100%;
                border-radius: 9999px;

                &.fill-green { background: #10B981; }
              }
            }
          }
        }
      }

      /* VISUAL BREAKDOWN */
      .breakdown-container {
        background: #FFFFFF;
        border: 1.5px solid #E2E8F0;
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);

        .breakdown-header {
          margin-bottom: 14px;

          .breakdown-tabs {
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #E2E8F0;
            padding-bottom: 8px;

            .breakdown-tab-btn {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 8px 14px;
              background: transparent;
              border: none;
              border-radius: 8px;
              font-size: 0.88rem;
              font-weight: 700;
              color: #64748B;
              cursor: pointer;
              transition: all 0.15s ease;

              .material-symbols-outlined {
                font-size: 18px;
              }

              &:hover {
                background: #F1F5F9;
                color: #1F3864;
              }

              &.active {
                background: #EEF4FC;
                color: #1F3864;
              }
            }
          }
        }

        .stat-bars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;

          @media (max-width: 900px) {
            grid-template-columns: 1fr;
          }

          &.grid-orgs {
            grid-template-columns: repeat(3, 1fr);

            @media (max-width: 1100px) {
              grid-template-columns: repeat(2, 1fr);
            }

            @media (max-width: 700px) {
              grid-template-columns: 1fr;
            }
          }

          .stat-bar-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;

            .stat-card-top {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;

              .stat-name-box {
                display: flex;
                align-items: center;
                gap: 6px;

                .loc-icon {
                  font-size: 18px;
                  color: #1F3864;
                }

                .org-icon {
                  font-size: 18px;
                  color: #D97706;
                }

                .stat-name {
                  font-size: 0.88rem;
                  color: #1E293B;
                }
              }

              .stat-rate-pill {
                font-size: 0.72rem;
                font-weight: 800;
                padding: 2px 7px;
                border-radius: 9999px;

                &.rate-high { background: #DCFCE7; color: #15803D; }
                &.rate-med { background: #FEF3C7; color: #B45309; }
                &.rate-low { background: #EEF4FC; color: #1E40AF; }
              }
            }

            .progress-track {
              height: 6px;
              background: #E2E8F0;
              border-radius: 9999px;
              overflow: hidden;

              .progress-fill {
                height: 100%;
                border-radius: 9999px;
                background: #10B981;
              }
            }

            .stat-card-counts {
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 0.75rem;
              color: #64748B;
              flex-wrap: wrap;

              .color-green { color: #16A34A; }
              .color-blue { color: #2563EB; }
              .color-red { color: #DC2626; }
            }
          }
        }
      }

      /* REPORT TABLE SECTION */
      .report-table-section {
        background: #FFFFFF;
        border: 1.5px solid #E2E8F0;
        border-radius: 14px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        overflow: hidden;

        .table-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1.5px solid #E2E8F0;
          background: #F8FAFC;

          .table-title-box {
            display: flex;
            align-items: center;
            gap: 10px;

            .table-section-title {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 1.05rem;
              font-weight: 800;
              color: #1E293B;
              margin: 0;

              .material-symbols-outlined {
                font-size: 20px;
                color: #1F3864;
              }
            }

            .badge-total-items {
              font-size: 0.75rem;
              font-weight: 700;
              background: #EEF4FC;
              color: #1E40AF;
              padding: 2px 8px;
              border-radius: 9999px;
            }
          }

          .table-tools {
            .btn-excel-mini {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 6px 12px;
              background: #107C41;
              color: #FFFFFF;
              border: none;
              border-radius: 8px;
              font-size: 0.8rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.15s ease;

              &:hover:not(:disabled) {
                background: #0E6B38;
              }

              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              .material-symbols-outlined {
                font-size: 16px;
              }
            }
          }
        }

        .table-responsive {
          overflow-x: auto;

          .report-data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;

            thead {
              background: #F1F5F9;

              th {
                padding: 10px 12px;
                font-size: 0.76rem;
                font-weight: 800;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                border-bottom: 1.5px solid #CBD5E1;
                white-space: nowrap;
              }
            }

            tbody {
              tr {
                border-bottom: 1px solid #E2E8F0;
                transition: background-color 0.15s ease;

                &:hover {
                  background-color: #F8FAFC;
                }

                &.row-overdue {
                  background-color: #FEF2F2;

                  &:hover {
                    background-color: #FEE2E2;
                  }
                }

                td {
                  padding: 10px 12px;
                  vertical-align: middle;
                  color: #334155;

                  &.text-center { text-align: center; }
                  &.font-semibold { font-weight: 600; }
                  &.text-slate { color: #64748B; }
                }

                .code-badge {
                  font-size: 0.72rem;
                  font-weight: 800;
                  background: #F1F5F9;
                  color: #475569;
                  padding: 2px 6px;
                  border-radius: 4px;
                  white-space: nowrap;
                }

                .task-title-cell {
                  display: flex;
                  flex-direction: column;
                  gap: 3px;

                  .main-title {
                    font-size: 0.88rem;
                    font-weight: 700;
                    color: #1E293B;
                    cursor: pointer;

                    &:hover {
                      color: #1F3864;
                      text-decoration: underline;
                    }
                  }

                  .priority-tag {
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 1px 5px;
                    border-radius: 4px;
                    width: fit-content;

                    &.prio-KHAN_CAP { background: #FEE2E2; color: #B91C1C; }
                    &.prio-CAO { background: #FFEDD5; color: #C2410C; }
                  }
                }

                .plan-cell-text {
                  font-size: 0.8rem;
                  color: #64748B;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                }

                .location-tag-pill {
                  display: inline-block;
                  font-size: 0.72rem;
                  font-weight: 700;
                  padding: 2px 8px;
                  border-radius: 9999px;
                  white-space: nowrap;

                  &.loc-main { background: #EEF4FC; color: #1E40AF; }
                  &.loc-ph1 { background: #DCFCE7; color: #166534; }
                  &.loc-ph2 { background: #FEF3C7; color: #92400E; }
                }

                .org-name-text {
                  font-size: 0.8rem;
                  font-weight: 600;
                  color: #475569;
                }

                .user-cell {
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  cursor: pointer;

                  .user-fullname {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #1F3864;

                    &:hover {
                      text-decoration: underline;
                    }
                  }
                }

                .user-reviewer-name {
                  font-size: 0.8rem;
                  color: #64748B;
                }

                .due-date-pill {
                  font-size: 0.76rem;
                  font-weight: 700;
                  padding: 2px 7px;
                  border-radius: 6px;
                  white-space: nowrap;

                  &.due-normal { background: #F1F5F9; color: #475569; }
                  &.due-soon { background: #FEF3C7; color: #B45309; }
                  &.due-overdue { background: #FEE2E2; color: #B91C1C; font-weight: 800; }
                }

                .progress-num-box {
                  font-size: 0.85rem;
                  font-weight: 800;
                  color: #1E293B;
                }

                .btn-view-detail {
                  display: inline-flex;
                  align-items: center;
                  gap: 3px;
                  padding: 4px 8px;
                  background: #EEF4FC;
                  border: 1px solid #BFDBFE;
                  border-radius: 6px;
                  color: #1F3864;
                  font-size: 0.75rem;
                  font-weight: 700;
                  cursor: pointer;
                  transition: all 0.15s ease;

                  &:hover {
                    background: #1F3864;
                    color: #FFFFFF;
                  }

                  .material-symbols-outlined {
                    font-size: 14px;
                  }
                }
              }
            }
          }
        }

        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          font-size: 0.82rem;
          color: #64748B;

          .pagination-btns {
            display: flex;
            align-items: center;
            gap: 8px;

            .page-btn {
              display: inline-flex;
              align-items: center;
              gap: 2px;
              padding: 5px 10px;
              background: #FFFFFF;
              border: 1px solid #CBD5E1;
              border-radius: 6px;
              font-size: 0.8rem;
              font-weight: 600;
              color: #475569;
              cursor: pointer;

              &:hover:not(:disabled) {
                background: #F1F5F9;
                color: #1F3864;
              }

              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              .material-symbols-outlined {
                font-size: 16px;
              }
            }

            .current-page-tag {
              font-weight: 700;
              color: #1E293B;
            }
          }
        }
      }

      /* LOADING & EMPTY STATES */
      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 20px;
        text-align: center;
        gap: 10px;
        color: #64748B;

        .spin-icon {
          font-size: 36px;
          color: #1F3864;
          animation: spin 1s linear infinite;
        }

        .empty-icon {
          font-size: 48px;
          color: #94A3B8;
        }

        h4 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
        }

        p {
          font-size: 0.88rem;
          margin: 0;
        }

        .btn-reset-empty {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #1F3864;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 6px;
        }
      }

      /* PRINT VISIBILITY & STYLES */
      .show-on-print-only {
        display: none;
      }

      @media print {
        .hide-on-print {
          display: none !important;
        }

        .show-on-print-only {
          display: block !important;
        }

        body {
          background: #FFFFFF !important;
          color: #000000 !important;
        }

        .reports-page {
          padding: 0 !important;
          gap: 10px !important;
        }

        .print-header {
          margin-bottom: 20px;
          border-bottom: 2px solid #000000;
          padding-bottom: 15px;

          .print-header-top {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;

            .print-unit-left { text-align: left; }
            .print-unit-right { text-align: right; }
          }

          .print-main-title {
            text-align: center;
            font-size: 15pt;
            font-weight: bold;
            margin: 15px 0 2px 0;
            color: #000000;
          }

          .print-subtitle {
            text-align: center;
            font-size: 10pt;
            font-style: italic;
            margin: 0 0 10px 0;
          }

          .print-meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
            font-size: 9.5pt;
            margin-top: 10px;
            background: #F8FAFC;
            padding: 8px;
            border: 1px solid #CBD5E1;
          }
        }

        .kpi-cards-grid {
          grid-template-columns: repeat(5, 1fr) !important;
          gap: 6px !important;

          .kpi-card {
            border: 1px solid #94A3B8 !important;
            padding: 8px !important;
            box-shadow: none !important;

            .card-icon-box {
              display: none !important;
            }

            .kpi-value {
              font-size: 1.2rem !important;
            }
          }
        }

        .report-table-section {
          border: 1px solid #000000 !important;
          box-shadow: none !important;

          .table-header-row {
            background: #F1F5F9 !important;
            border-bottom: 1px solid #000000 !important;
          }

          .report-data-table {
            border-collapse: collapse !important;

            th {
              background: #E2E8F0 !important;
              color: #000000 !important;
              border: 1px solid #000000 !important;
              font-size: 8pt !important;
              padding: 4px 6px !important;
            }

            td {
              border: 1px solid #000000 !important;
              font-size: 8pt !important;
              padding: 4px 6px !important;
              color: #000000 !important;
            }
          }
        }

        .print-signatures {
          display: flex !important;
          justify-content: space-between !important;
          margin-top: 40px !important;
          page-break-inside: avoid;

          .sign-box {
            text-align: center;
            width: 45%;

            strong {
              font-size: 10.5pt;
            }

            p {
              font-size: 9pt;
              margin: 2px 0;
            }

            .sign-space {
              height: 70px;
            }
          }
        }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportService);
  authService = inject(AuthService);
  private userService = inject(UserService);
  private planService = inject(PlanService);
  private contactCardService = inject(ContactCardService);
  private router = inject(Router);

  Math = Math;

  isLoading = signal(true);
  allTasks = signal<TaskItem[]>([]);
  locations = signal<LocationItem[]>([]);
  orgUnits = signal<OrgUnitItem[]>([]);
  plans = signal<PlanItem[]>([]);

  activePreset: PresetType = 'DEFAULT';
  activeBreakdownTab: 'LOCATIONS' | 'ORGS' = 'LOCATIONS';
  isFilterExpanded = true;

  selectedPlanScope = 'ALL';

  filters: ReportFilterCriteria = {
    locationId: '',
    orgUnitId: '',
    planId: '',
    status: '',
    priority: '',
    isOverdue: false,
    timeRange: 'THIS_MONTH',
    startDate: '',
    endDate: '',
    search: '',
  };

  // Pagination
  currentPage = signal(1);
  pageSize = signal(12);

  // Task Detail Modal
  selectedTaskIdForModal = signal<string | null>(null);

  currentDateTimeStr = '';

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filters.locationId) count++;
    if (this.filters.orgUnitId) count++;
    if (this.selectedPlanScope !== 'ALL') count++;
    if (this.filters.timeRange !== 'ALL') count++;
    if (this.filters.status) count++;
    if (this.filters.priority) count++;
    if (this.filters.isOverdue) count++;
    if (this.filters.search?.trim()) count++;
    return count;
  });

  filteredTasks = computed(() => this.allTasks());

  summaryKpis = computed<ReportSummaryKpis>(() => {
    return this.reportService.computeSummaryKpis(this.filteredTasks());
  });

  locationBreakdown = computed<BreakdownStatItem[]>(() => {
    return this.reportService.computeLocationBreakdown(this.filteredTasks());
  });

  orgUnitBreakdown = computed<BreakdownStatItem[]>(() => {
    return this.reportService.computeOrgUnitBreakdown(this.filteredTasks());
  });

  totalPages = computed(() => {
    const total = this.filteredTasks().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  pagedTasks = computed(() => {
    const list = this.filteredTasks();
    const page = this.currentPage();
    const size = this.pageSize();
    return list.slice((page - 1) * size, page * size);
  });

  ngOnInit() {
    this.updateCurrentDateTime();
    this.loadFilterDropdowns();
    this.loadReportData();
  }

  updateCurrentDateTime() {
    const now = new Date();
    this.currentDateTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }

  loadFilterDropdowns() {
    this.userService.getLocations().subscribe({
      next: (locs) => this.locations.set(locs),
      error: () => {},
    });

    this.userService.getOrgUnits().subscribe({
      next: (orgs) => this.orgUnits.set(orgs),
      error: () => {},
    });

    this.planService.getAll().subscribe({
      next: (plans) => this.plans.set(plans),
      error: () => {},
    });
  }

  loadReportData() {
    this.isLoading.set(true);
    this.currentPage.set(1);
    this.updateCurrentDateTime();

    this.reportService.getReportTasks(this.filters).subscribe({
      next: (tasks) => {
        this.isLoading.set(false);
        this.allTasks.set(tasks);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange() {
    this.loadReportData();
  }

  onPlanScopeChange() {
    if (this.selectedPlanScope === 'ALL') {
      this.filters.inPlanOnly = false;
      this.filters.outOfPlanOnly = false;
      this.filters.planId = '';
    } else if (this.selectedPlanScope === 'IN_PLAN') {
      this.filters.inPlanOnly = true;
      this.filters.outOfPlanOnly = false;
      this.filters.planId = '';
    } else if (this.selectedPlanScope === 'OUT_OF_PLAN') {
      this.filters.inPlanOnly = false;
      this.filters.outOfPlanOnly = true;
      this.filters.planId = '';
    } else {
      this.filters.inPlanOnly = false;
      this.filters.outOfPlanOnly = false;
      this.filters.planId = this.selectedPlanScope;
    }
    this.onFilterChange();
  }

  toggleFilterExpand() {
    this.isFilterExpanded = !this.isFilterExpanded;
  }

  applyPreset(preset: PresetType) {
    this.activePreset = preset;
    this.resetFilterValues();

    switch (preset) {
      case 'DEFAULT':
        this.filters.timeRange = 'THIS_MONTH';
        break;
      case 'OVERDUE':
        this.filters.isOverdue = true;
        break;
      case 'LOCATIONS':
        this.activeBreakdownTab = 'LOCATIONS';
        break;
      case 'ORGS':
        this.activeBreakdownTab = 'ORGS';
        break;
      case 'WAITING_REVIEW':
        this.filters.status = 'CHO_KIEM_TRA';
        break;
      case 'IN_PLAN':
        this.selectedPlanScope = 'IN_PLAN';
        this.filters.inPlanOnly = true;
        break;
    }

    this.loadReportData();
  }

  resetFilterValues() {
    this.filters = {
      locationId: '',
      orgUnitId: '',
      planId: '',
      status: '',
      priority: '',
      isOverdue: false,
      timeRange: 'ALL',
      startDate: '',
      endDate: '',
      search: '',
    };
    this.selectedPlanScope = 'ALL';
  }

  resetFilters() {
    this.activePreset = 'DEFAULT';
    this.resetFilterValues();
    this.filters.timeRange = 'THIS_MONTH';
    this.loadReportData();
  }

  exportExcel() {
    const title = this.getReportHeading();
    const filterMeta = {
      locationName: this.getSelectedLocationName(),
      orgUnitName: this.getSelectedOrgName(),
      planName: this.getSelectedPlanName(),
      timeRangeText: this.getTimeRangeLabel(),
      exporterName: `${this.authService.currentUser()?.fullName || 'Cán bộ'} (${this.authService.activeRole()?.roleTitle || 'Phụ trách'})`,
    };

    const customName = `Bao_Cao_Cong_Viec_THCS_Phuoc_Tan_${new Date().toISOString().slice(0, 10)}.xls`;
    this.reportService.exportToExcel(title, filterMeta, this.summaryKpis(), this.filteredTasks(), customName);
  }

  printReport() {
    window.print();
  }

  getReportHeading(): string {
    if (this.filters.isOverdue) return 'Báo cáo công việc chậm tiến độ & quá hạn';
    if (this.filters.locationId) {
      return `Báo cáo tiến độ công việc - ${this.getSelectedLocationName()}`;
    }
    if (this.filters.orgUnitId) {
      return `Báo cáo thực hiện nhiệm vụ - ${this.getSelectedOrgName()}`;
    }
    return 'Báo cáo tổng hợp tình hình thực hiện công việc & kế hoạch';
  }

  getSelectedLocationName(): string {
    if (!this.filters.locationId) return 'Toàn trường (3 Điểm trường)';
    const loc = this.locations().find((l) => l.id === this.filters.locationId);
    return loc ? loc.name : 'Điểm trường đã chọn';
  }

  getSelectedOrgName(): string {
    if (!this.filters.orgUnitId) return 'Tất cả các tổ';
    const org = this.orgUnits().find((o) => o.id === this.filters.orgUnitId);
    return org ? org.name : 'Tổ đã chọn';
  }

  getSelectedPlanName(): string {
    if (this.selectedPlanScope === 'IN_PLAN') return 'Các công việc thuộc Kế hoạch chiến lược';
    if (this.selectedPlanScope === 'OUT_OF_PLAN') return 'Nhiệm vụ đột xuất ngoài kế hoạch';
    if (this.filters.planId) {
      const p = this.plans().find((pl) => pl.id === this.filters.planId);
      return p ? p.title : 'Kế hoạch đã chọn';
    }
    return 'Toàn bộ kế hoạch & Việc đột xuất';
  }

  getTimeRangeLabel(): string {
    switch (this.filters.timeRange) {
      case 'THIS_MONTH': return 'Tháng 9/2026';
      case 'THIS_WEEK': return 'Tuần này';
      case 'THIS_TERM': return 'Học kỳ I (2026 - 2027)';
      case 'CUSTOM': return `Từ ${this.filters.startDate || '...'} đến ${this.filters.endDate || '...'}`;
      default: return 'Toàn bộ năm học 2026 - 2027';
    }
  }

  getRatePillClass(rate: number): string {
    if (rate >= 70) return 'rate-high';
    if (rate >= 40) return 'rate-med';
    return 'rate-low';
  }

  getLocationTagClass(task: TaskItem): string {
    if (task.location?.code === 'PHAN_HIEU_1' || task.locationId?.includes('ph1')) return 'loc-ph1';
    if (task.location?.code === 'PHAN_HIEU_2' || task.locationId?.includes('ph2')) return 'loc-ph2';
    return 'loc-main';
  }

  getDueStatusClass(task: TaskItem): string {
    if (task.status === 'HOAN_THANH' || task.status === 'DONG') return 'due-normal';
    if (task.isOverdue) return 'due-overdue';
    if (!task.dueDate) return 'due-normal';
    const now = new Date();
    const d = new Date(task.dueDate);
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diff <= 3) return 'due-soon';
    return 'due-normal';
  }

  formatDueDate(dateStr?: string | null): string {
    if (!dateStr) return 'Không có hạn';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  getChuTriUser(task: TaskItem): any {
    return task.assignments?.find((a) => a.role === 'CHU_TRI')?.user;
  }

  getChuTriName(task: TaskItem): string {
    const u = this.getChuTriUser(task);
    return u?.fullName || 'Chưa phân công';
  }

  getKiemTraName(task: TaskItem): string {
    const kt = task.assignments?.find((a) => a.role === 'KIEM_TRA' || a.role === 'PHE_DUYET')?.user;
    return kt?.fullName || 'Ban Giám hiệu';
  }

  openContactCard(user: any, event: MouseEvent) {
    if (!user) return;
    event.stopPropagation();
    this.contactCardService.open(user);
  }

  openTaskModal(task: TaskItem) {
    this.selectedTaskIdForModal.set(task.id);
  }

  onTaskUpdated(updated: TaskItem) {
    this.allTasks.update((tasks) => tasks.map((t) => (t.id === updated.id ? updated : t)));
  }
}
