import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KpiFlexibleService } from '../../core/services/kpi-flexible.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { OrgUnitItem } from '../../core/models/user.models';
import {
  EvaluationPeriod,
  SchoolKpiOverview,
  StaffKpiItem,
  SchoolAnnualRollupResult,
  SchoolAnnualStaffItem,
} from '../../core/models/kpi-flexible.models';

@Component({
  selector: 'app-school-kpi',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="school-kpi-container">
      <!-- TOAST BANNER -->
      @if (toastMessage()) {
        <div class="toast-banner" [class.toast-success]="toastMessage()?.type === 'success'" [class.toast-error]="toastMessage()?.type === 'error'">
          <span class="material-symbols-outlined">{{ toastMessage()?.type === 'success' ? 'check_circle' : 'error' }}</span>
          <span>{{ toastMessage()?.text }}</span>
          <button type="button" class="btn-close-toast" (click)="toastMessage.set(null)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      }

      <!-- 1. PAGE HEADER -->
      <div class="page-header hide-on-print">
        <div class="header-left">
          <div class="breadcrumb-row">
            <span class="material-symbols-outlined icon-mini">military_tech</span>
            <span>Quản Lý KPI • Giám Sát Toàn Trường</span>
          </div>
          <h1 class="page-title">
            @if (isAnnualView()) {
              📊 Tổng Kết & Xếp Loại Chất Lượng Cả Năm (Tích Lũy 4 Quý)
            } @else {
              Tổng Hợp & Đánh Giá KPI Toàn Trường
            }
          </h1>
          <p class="page-subtitle">
            @if (isAnnualView()) {
              Đánh giá và xếp loại chất lượng cán bộ, viên chức cuối năm học dựa trên kết quả tích lũy 4 Quý theo chuẩn Nghị định 90/2020/NĐ-CP và hướng dẫn Sở GD&ĐT.
            } @else {
              Theo dõi thống kê phân bổ nhiệm vụ theo các trục kết quả, giám sát tiến độ thực hiện, đánh giá điểm Tiêu Chuẩn Chung (Phần A) và kiểm tra chi tiết công việc của từng cán bộ giáo viên.
            }
          </p>
        </div>

        <div class="header-right-actions">
          <button type="button" class="btn-action btn-print" (click)="printReport()">
            <span class="material-symbols-outlined">print</span>
            <span>In Báo Cáo</span>
          </button>
          <button type="button" class="btn-action btn-excel" (click)="exportExcel()">
            <span class="material-symbols-outlined excel-icon">table_view</span>
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      <!-- 2. FILTER & PERIOD TOOLBAR -->
      <div class="filter-card hide-on-print">
        <div class="filter-grid">
          <!-- Period Selector -->
          <div class="filter-item">
            <label>
              <span class="material-symbols-outlined">calendar_month</span>
              <span>Kỳ đánh giá / Tổng kết:</span>
            </label>
            <select
              class="form-select"
              [ngModel]="selectedPeriodId()"
              (ngModelChange)="onPeriodChange($event)"
            >
              <optgroup [label]="'Đánh Giá 4 Quý Trong Năm Học ' + academicYearService.currentAcademicYear()">
                @for (p of (periods() || []); track p.id) {
                  <option [value]="p.id">{{ p.name }} ({{ p.startDate | date: 'dd/MM' }} - {{ p.endDate | date: 'dd/MM/yyyy' }})</option>
                }
              </optgroup>
              <optgroup label="Tổng Kết Đánh Giá Cuối Năm">
                <option value="annual_school">📊 [TỔNG KẾT] Đánh Giá & Xếp Loại Cả Năm ({{ academicYearService.currentAcademicYear() }})</option>
              </optgroup>
            </select>
          </div>

          <!-- Org Unit (Tổ chuyên môn) -->
          <div class="filter-item">
            <label>
              <span class="material-symbols-outlined">apartment</span>
              <span>Tổ / Đơn vị:</span>
            </label>
            <select
              class="form-select"
              [(ngModel)]="selectedOrgUnitId"
              (ngModelChange)="onFilterChange()"
            >
              <option value="all">Toàn Trường (Tất Cả Các Tổ)</option>
              @for (org of (orgUnits() || []); track org.id) {
                <option [value]="org.id">{{ org.name }}</option>
              }
            </select>
          </div>

          <!-- Classification Filter -->
          <div class="filter-item">
            <label>
              <span class="material-symbols-outlined">filter_list</span>
              <span>Phân loại kết quả:</span>
            </label>
            <select
              class="form-select"
              [(ngModel)]="selectedClassification"
              (ngModelChange)="onFilterChange()"
            >
              <option value="all">Tất cả các mức</option>
              <option value="xuat_sac">⭐ Xuất sắc (Từ 90đ & đủ ĐK)</option>
              <option value="tot">✅ Tốt (70 - dưới 90đ)</option>
              <option value="hoan_thanh">🔵 Hoàn thành (50 - dưới 70đ)</option>
              <option value="khong_hoan_thanh">⚠️ Chưa hoàn thành (&lt; 50đ)</option>
            </select>
          </div>

          <!-- Search Input -->
          <div class="filter-item search-item">
            <label>
              <span class="material-symbols-outlined">search</span>
              <span>Tìm kiếm nhân sự:</span>
            </label>
            <div class="search-input-wrap">
              <input
                type="text"
                class="form-input search-input"
                placeholder="Nhập tên giáo viên, chức danh, email..."
                [(ngModel)]="searchQuery"
                (keyup.enter)="onFilterChange()"
              />
              @if (searchQuery) {
                <button type="button" class="btn-clear-search" (click)="clearSearch()">
                  <span class="material-symbols-outlined">close</span>
                </button>
              }
            </div>
          </div>

          <!-- Refresh Button -->
          <div class="filter-item btn-refresh-wrap">
            <button
              type="button"
              class="btn-action btn-refresh"
              (click)="loadData()"
              [disabled]="isLoading()"
            >
              <span class="material-symbols-outlined" [class.spinning]="isLoading()">refresh</span>
              <span>Tải lại</span>
            </button>
          </div>
        </div>
      </div>

      <!-- PRINT HEADER (PRINT ONLY) -->
      <div class="print-header show-on-print-only">
        <div class="school-title">BÁO CÁO TỔNG HỢP KPI TOÀN TRƯỜNG</div>
        <div class="print-meta">Kỳ đánh giá: {{ currentPeriodName() }} | Ngày xuất: {{ currentDate | date: 'dd/MM/yyyy HH:mm' }}</div>
      </div>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Đang tổng hợp dữ liệu KPI và công việc toàn trường...</p>
        </div>
      } @else if (isAnnualView()) {
        <!-- ========================================================= -->
        <!-- VIEW: TỔNG KẾT & ĐÁNH GIÁ XẾP LOẠI CẢ NĂM (TÍCH LŨY 4 QUÝ) -->
        <!-- ========================================================= -->
        <div class="kpi-metrics-grid">
          <!-- Card 1: Total Staff -->
          <div class="metric-card card-blue">
            <div class="metric-icon-box bg-blue">
              <span class="material-symbols-outlined">group</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Tổng Nhân Sự Đánh Giá</span>
              <span class="metric-value">{{ schoolAnnualData()?.totalStaff || 0 }} <small class="unit">nhân sự</small></span>
              <span class="metric-sub">Tích lũy đủ 4 Quý trong năm</span>
            </div>
          </div>

          <!-- Card 2: Avg School Score -->
          <div class="metric-card card-indigo">
            <div class="metric-icon-box bg-indigo">
              <span class="material-symbols-outlined">analytics</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Điểm Trung Bình Cả Năm</span>
              <span class="metric-value text-indigo">{{ schoolAnnualData()?.avgSchoolScore || 0 }} <small class="unit">/100đ</small></span>
              <span class="metric-sub">Trung bình cộng kết quả 4 quý</span>
            </div>
          </div>

          <!-- Card 3: Xuất sắc Cả Năm -->
          <div class="metric-card card-amber">
            <div class="metric-icon-box bg-amber">
              <span class="material-symbols-outlined">workspace_premium</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Xếp Loại Xuất Sắc Cả Năm</span>
              <span class="metric-value text-amber">{{ schoolAnnualData()?.classificationCounts?.xuat_sac || 0 }} <small class="unit">người</small></span>
              <span class="metric-sub">
                Chiếm {{ getPct(schoolAnnualData()?.classificationCounts?.xuat_sac, schoolAnnualData()?.totalStaff) }}% tổng nhân sự
              </span>
            </div>
          </div>

          <!-- Card 4: Tốt / Hoàn thành / Chưa đạt -->
          <div class="metric-card card-purple">
            <div class="metric-icon-box bg-purple">
              <span class="material-symbols-outlined">pie_chart</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Phân Bổ Xếp Loại Cả Năm</span>
              <div class="mini-classes-row">
                <span class="pill-mini pill-tot" title="Hoàn thành tốt">Tốt: {{ schoolAnnualData()?.classificationCounts?.tot || 0 }}</span>
                <span class="pill-mini pill-ht" title="Hoàn thành">Đạt: {{ schoolAnnualData()?.classificationCounts?.hoan_thanh || 0 }}</span>
                <span class="pill-mini pill-kht" title="Chưa hoàn thành">Chưa đạt: {{ schoolAnnualData()?.classificationCounts?.khong_hoan_thanh || 0 }}</span>
              </div>
              <span class="metric-sub">Theo Nghị định 90/2020/NĐ-CP</span>
            </div>
          </div>
        </div>

        <!-- Quy định xếp loại cuối năm Card -->
        <div class="annual-rules-banner">
          <div class="rule-icon-box">
            <span class="material-symbols-outlined">gavel</span>
          </div>
          <div class="rule-content">
            <strong>Nguyên tắc tổng kết & xếp loại chất lượng cả năm (Nghị định 90/2020/NĐ-CP):</strong>
            <ul>
              <li><strong>Hoàn thành xuất sắc nhiệm vụ:</strong> Điểm TB $\ge 90$ và tất cả các quý đều đạt loại Tốt trở lên (không quý nào $< 70$đ).</li>
              <li><strong>Hoàn thành tốt nhiệm vụ:</strong> Điểm TB $\ge 70$ và không có quý nào bị xếp loại Chưa hoàn thành ($< 50$đ).</li>
              <li><strong>Hoàn thành nhiệm vụ:</strong> Điểm TB $\ge 50$.</li>
              <li><strong>Chưa hoàn thành nhiệm vụ:</strong> Điểm TB $< 50$ hoặc có 2 quý liên tiếp không hoàn thành (cảnh báo xem xét bố trí lại công tác).</li>
            </ul>
          </div>
        </div>

        <!-- Annual Staff Table -->
        <div class="section-card">
          <div class="section-header">
            <div class="header-left">
              <span class="material-symbols-outlined header-icon">table_chart</span>
              <div>
                <h3 class="section-title">Bảng Tổng Hợp Kết Quả Đánh Giá 4 Quý & Xếp Loại Cả Năm</h3>
                <span class="section-subtitle">Tích lũy kết quả chi tiết từng quý và điểm trung bình cả năm của toàn bộ nhân sự trường</span>
              </div>
            </div>
            <div class="header-right">
              <span class="count-badge">Tổng số: {{ totalStaffCount() }} nhân sự</span>
            </div>
          </div>

          @if (filteredAnnualStaffList().length === 0) {
            <div class="empty-state">
              <span class="material-symbols-outlined empty-icon">sentiment_dissatisfied</span>
              <h4>Không tìm thấy nhân sự phù hợp với bộ lọc</h4>
              <p>Vui lòng chọn lại tổ chuyên môn hoặc từ khóa tìm kiếm.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="staff-table annual-staff-table">
                <thead>
                  <tr>
                    <th class="col-stt">STT</th>
                    <th class="col-staff">Cán Bộ / Giáo Viên</th>
                    <th class="col-org">Tổ Chuyên Môn</th>
                    <th class="text-center col-quarter">{{ schoolAnnualData()?.quarterHeaders?.[0]?.name || 'Quý III (Đầu năm)' }}</th>
                    <th class="text-center col-quarter">{{ schoolAnnualData()?.quarterHeaders?.[1]?.name || 'Quý IV (HK1)' }}</th>
                    <th class="text-center col-quarter">{{ schoolAnnualData()?.quarterHeaders?.[2]?.name || 'Quý I (Giữa HK2)' }}</th>
                    <th class="text-center col-quarter">{{ schoolAnnualData()?.quarterHeaders?.[3]?.name || 'Quý II (Tổng kết)' }}</th>
                    <th class="text-center col-avg">Điểm TB Cả Năm</th>
                    <th class="text-center col-class">Xếp Loại Cuối Năm</th>
                    <th class="text-center col-note">Cảnh Báo & Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  @for (staff of (paginatedAnnualStaffList() || []); track staff.id; let idx = $index) {
                    <tr [class.row-warning]="staff.warningMessage">
                      <td class="col-stt font-medium text-slate-500">{{ (currentPage() - 1) * pageSize() + idx + 1 }}</td>
                      <td class="col-staff">
                        <div class="staff-info-cell">
                          <img
                            [src]="staff.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + staff.fullName"
                            class="staff-avatar"
                            [alt]="staff.fullName"
                          />
                          <div class="staff-meta">
                            <strong class="staff-name">{{ staff.fullName }}</strong>
                            <span class="staff-title">{{ staff.title || 'Cán bộ giáo viên' }}</span>
                            <small class="staff-email text-slate-400">{{ staff.email }}</small>
                          </div>
                        </div>
                      </td>
                      <td class="col-org">
                        <span class="org-pill">{{ staff.orgUnitName || 'Chưa phân tổ' }}</span>
                      </td>
                      <!-- Q1 -->
                      <td class="text-center col-quarter">
                        <div class="quarter-cell">
                          @if (staff.q1Score !== null) {
                            <strong class="q-score">{{ staff.q1Score }}đ</strong>
                            <span class="pill-mini" [ngClass]="getClassificationBadgeClass(staff.q1Class || '')">
                              {{ getClassificationLabel(staff.q1Class || '') }}
                            </span>
                          } @else {
                            <span class="text-slate-400 font-mono">-</span>
                          }
                        </div>
                      </td>
                      <!-- Q2 -->
                      <td class="text-center col-quarter">
                        <div class="quarter-cell">
                          @if (staff.q2Score !== null) {
                            <strong class="q-score">{{ staff.q2Score }}đ</strong>
                            <span class="pill-mini" [ngClass]="getClassificationBadgeClass(staff.q2Class || '')">
                              {{ getClassificationLabel(staff.q2Class || '') }}
                            </span>
                          } @else {
                            <span class="text-slate-400 font-mono">-</span>
                          }
                        </div>
                      </td>
                      <!-- Q3 -->
                      <td class="text-center col-quarter">
                        <div class="quarter-cell">
                          @if (staff.q3Score !== null) {
                            <strong class="q-score">{{ staff.q3Score }}đ</strong>
                            <span class="pill-mini" [ngClass]="getClassificationBadgeClass(staff.q3Class || '')">
                              {{ getClassificationLabel(staff.q3Class || '') }}
                            </span>
                          } @else {
                            <span class="text-slate-400 font-mono">-</span>
                          }
                        </div>
                      </td>
                      <!-- Q4 -->
                      <td class="text-center col-quarter">
                        <div class="quarter-cell">
                          @if (staff.q4Score !== null) {
                            <strong class="q-score">{{ staff.q4Score }}đ</strong>
                            <span class="pill-mini" [ngClass]="getClassificationBadgeClass(staff.q4Class || '')">
                              {{ getClassificationLabel(staff.q4Class || '') }}
                            </span>
                          } @else {
                            <span class="text-slate-400 font-mono">-</span>
                          }
                        </div>
                      </td>
                      <!-- Điểm TB Cả Năm -->
                      <td class="text-center col-avg">
                        <span class="score-badge-avg">{{ staff.avgScore }} <small>/100</small></span>
                      </td>
                      <!-- Xếp loại cuối năm -->
                      <td class="text-center col-class">
                        <span class="classification-pill" [ngClass]="getClassificationBadgeClass(staff.yearlyClassification)">
                          {{ staff.yearlyClassificationLabel }}
                        </span>
                      </td>
                      <!-- Ghi chú / Cảnh báo HR -->
                      <td class="text-center col-note">
                        @if (staff.warningMessage) {
                          <div class="hr-warning-cell" [title]="staff.warningMessage">
                            <span class="material-symbols-outlined icon-warn">warning</span>
                            <span>{{ staff.warningMessage }}</span>
                          </div>
                        } @else {
                          <span class="text-emerald-700 font-medium text-xs">
                            <span class="material-symbols-outlined icon-ok">check_circle</span> Đạt chuẩn
                          </span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination Toolbar -->
            <div class="pagination-bar">
              <div class="pagination-info">
                <span class="info-text">
                  Hiển thị <strong>{{ startIndex() }} - {{ endIndex() }}</strong> trên tổng số <strong>{{ totalStaffCount() }}</strong> nhân sự
                </span>
                <div class="page-size-selector">
                  <label>Hiển thị:</label>
                  <select
                    class="select-page-size"
                    [ngModel]="pageSize()"
                    (ngModelChange)="setPageSize($event)"
                  >
                    <option [ngValue]="10">10 / trang</option>
                    <option [ngValue]="25">25 / trang</option>
                    <option [ngValue]="50">50 / trang</option>
                    <option [ngValue]="100">100 / trang</option>
                  </select>
                </div>
              </div>

              <div class="pagination-controls">
                <button
                  type="button"
                  class="btn-page-nav"
                  [disabled]="currentPage() === 1"
                  (click)="goToPage(1)"
                  title="Trang đầu"
                >
                  <span class="material-symbols-outlined">first_page</span>
                </button>
                <button
                  type="button"
                  class="btn-page-nav"
                  [disabled]="currentPage() === 1"
                  (click)="prevPage()"
                  title="Trang trước"
                >
                  <span class="material-symbols-outlined">chevron_left</span>
                </button>

                <div class="page-numbers-group">
                  @for (p of (pageNumbers() || []); track $index) {
                    @if (p === -1) {
                      <span class="page-ellipsis">...</span>
                    } @else {
                      <button
                        type="button"
                        class="btn-page-num"
                        [class.active]="p === currentPage()"
                        (click)="goToPage(p)"
                      >
                        {{ p }}
                      </button>
                    }
                  }
                </div>

                <button
                  type="button"
                  class="btn-page-nav"
                  [disabled]="currentPage() === totalPages() || totalPages() === 0"
                  (click)="nextPage()"
                  title="Trang tiếp"
                >
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
                <button
                  type="button"
                  class="btn-page-nav"
                  [disabled]="currentPage() === totalPages() || totalPages() === 0"
                  (click)="goToPage(totalPages())"
                  title="Trang cuối"
                >
                  <span class="material-symbols-outlined">last_page</span>
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- ========================================================= -->
        <!-- VIEW: ĐÁNH GIÁ THEO TỪNG QUÝ ĐỊNH KỲ                       -->
        <!-- ========================================================= -->
        <!-- 3. TOP METRICS SUMMARY CARDS -->
        <div class="kpi-metrics-grid">
          <!-- Card 1: Total Staff -->
          <div class="metric-card card-blue">
            <div class="metric-icon-box bg-blue">
              <span class="material-symbols-outlined">group</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Tổng Nhân Sự Đánh Giá</span>
              <span class="metric-value">{{ overviewData()?.totalStaff || 0 }} <small class="unit">nhân sự</small></span>
              <span class="metric-sub">Toàn bộ cán bộ, GV, NV trong trường</span>
            </div>
          </div>

          <!-- Card 2: Total Tasks & Completion Rate -->
          <div class="metric-card card-emerald">
            <div class="metric-icon-box bg-emerald">
              <span class="material-symbols-outlined">task_alt</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Nhiệm Vụ Gắn Trục KPI</span>
              <div class="val-group">
                <span class="metric-value">{{ overviewData()?.schoolCompletedTasks || 0 }}</span>
                <span class="metric-total">/ {{ overviewData()?.schoolTotalTasks || 0 }} việc</span>
              </div>
              <span class="metric-sub">Tỷ lệ hoàn thành toàn trường: <strong>{{ overviewData()?.schoolCompletionRate || 0 }}%</strong></span>
            </div>
          </div>

          <!-- Card 3: Xuất sắc -->
          <div class="metric-card card-amber">
            <div class="metric-icon-box bg-amber">
              <span class="material-symbols-outlined">stars</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Xếp Loại Xuất Sắc</span>
              <span class="metric-value text-amber">{{ overviewData()?.classificationCounts?.xuat_sac || 0 }} <small class="unit">người</small></span>
              <span class="metric-sub">
                Chiếm {{ getPct(overviewData()?.classificationCounts?.xuat_sac, overviewData()?.totalStaff) }}% tổng nhân sự
              </span>
            </div>
          </div>

          <!-- Card 4: Tốt / Hoàn thành / Chưa đạt -->
          <div class="metric-card card-purple">
            <div class="metric-icon-box bg-purple">
              <span class="material-symbols-outlined">pie_chart</span>
            </div>
            <div class="metric-info">
              <span class="metric-label">Phân Bổ Xếp Loại Khác</span>
              <div class="mini-classes-row">
                <span class="pill-mini pill-tot" title="Hoàn thành tốt">Tốt: {{ overviewData()?.classificationCounts?.tot || 0 }}</span>
                <span class="pill-mini pill-ht" title="Hoàn thành">Đạt: {{ overviewData()?.classificationCounts?.hoan_thanh || 0 }}</span>
                <span class="pill-mini pill-kht" title="Chưa hoàn thành">Chưa đạt: {{ overviewData()?.classificationCounts?.khong_hoan_thanh || 0 }}</span>
              </div>
              <span class="metric-sub">Theo quy định Sở GD&ĐT</span>
            </div>
          </div>
        </div>

        <!-- 4. SCHOOL AXIS BREAKDOWN (Thống kê theo từng Trục nhiệm vụ) -->
        <div class="section-card">
          <div class="section-header">
            <div class="header-left">
              <span class="material-symbols-outlined header-icon">stacked_bar_chart</span>
              <div>
                <h3 class="section-title">Thống Kê Nhiệm Vụ Theo Từng Trục Kết Quả Toàn Trường</h3>
                <span class="section-subtitle">Tổng hợp khối lượng công việc và tỷ lệ hoàn thành theo từng danh mục trục nhiệm vụ</span>
              </div>
            </div>
          </div>

          <div class="axes-summary-grid">
            @for (axis of (overviewData()?.schoolAxisBreakdown || []); track axis.id) {
              <div class="axis-stat-card" [class.has-tasks]="axis.totalTasks > 0">
                <div class="axis-stat-header">
                  <span class="axis-badge">#{{ axis.displayOrder }}</span>
                  <strong class="axis-name" [title]="axis.name">{{ axis.name }}</strong>
                </div>
                <div class="axis-stat-body">
                  <div class="stat-counts">
                    <span class="completed-num">{{ axis.completedTasks }}</span>
                    <span class="total-num">/ {{ axis.totalTasks }} việc</span>
                  </div>
                  <span class="rate-badge" [class.rate-high]="axis.completionRate >= 80" [class.rate-mid]="axis.completionRate >= 50 && axis.completionRate < 80">
                    {{ axis.completionRate }}%
                  </span>
                </div>
                <div class="progress-bar-wrap">
                  <div class="progress-fill" [style.width.%]="axis.completionRate"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- 5. STAFF LIST TABLE -->
        <div class="section-card">
          <div class="section-header">
            <div class="header-left">
              <span class="material-symbols-outlined header-icon">badge</span>
              <div>
                <h3 class="section-title">Danh Sách Đánh Giá & Nhiệm Vụ Của Cán Bộ - Giáo Viên</h3>
                <span class="section-subtitle">Bạn có thể chỉnh sửa trực tiếp điểm <strong>Phần A: Tiêu chuẩn chung (0 - 30đ)</strong> cho từng giáo viên hoặc bấm "Xem chi tiết" để kiểm tra công việc</span>
              </div>
            </div>
            <div class="header-right">
              <span class="count-badge">Tổng số: {{ totalStaffCount() }} nhân sự</span>
            </div>
          </div>

          @if (filteredStaffList().length === 0) {
            <div class="empty-state">
              <span class="material-symbols-outlined empty-icon">sentiment_dissatisfied</span>
              <h4>Không tìm thấy nhân sự phù hợp với bộ lọc</h4>
              <p>Vui lòng chọn lại tổ chuyên môn hoặc từ khóa tìm kiếm.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="staff-table">
                <thead>
                  <tr>
                    <th class="col-stt">STT</th>
                    <th class="col-staff">Cán Bộ / Giáo Viên</th>
                    <th class="col-org">Tổ Chuyên Môn</th>
                    <th class="text-center col-tasks">Số Việc Theo Trục</th>
                    <th class="text-center col-rate">Tỷ Lệ HT</th>
                    <th class="text-center col-general">Phần A: Tiêu Chuẩn Chung (30đ)</th>
                    <th class="text-center col-breakdown">Thành Phần (A+B+C)</th>
                    <th class="text-center col-score">Tổng Điểm KPI</th>
                    <th class="text-center col-class">Xếp Loại</th>
                    <th class="text-center col-action">Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  @for (staff of (paginatedStaffList() || []); track staff.id; let idx = $index) {
                    <tr>
                      <td class="col-stt font-medium text-slate-500">{{ (currentPage() - 1) * pageSize() + idx + 1 }}</td>
                      <td class="col-staff">
                        <div class="staff-info-cell">
                          <img
                            [src]="staff.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + staff.fullName"
                            class="staff-avatar"
                            [alt]="staff.fullName"
                          />
                          <div class="staff-meta">
                            <strong class="staff-name">{{ staff.fullName }}</strong>
                            <span class="staff-title">{{ staff.title || 'Cán bộ giáo viên' }}</span>
                          </div>
                        </div>
                      </td>
                      <td class="col-org">
                        <span class="org-pill">{{ staff.orgUnitName || 'Chưa phân tổ' }}</span>
                      </td>
                      <td class="text-center col-tasks">
                        <div class="task-count-box">
                          <strong class="text-emerald-700">{{ staff.completedTasks }}</strong>
                          <span class="text-slate-400">/</span>
                          <span class="text-slate-700">{{ staff.totalTasks }} việc</span>
                        </div>
                      </td>
                      <td class="text-center col-rate">
                        <div class="rate-cell">
                          <span class="rate-val">{{ staff.completionRate }}%</span>
                          <div class="mini-progress-track">
                            <div class="mini-progress-bar" [style.width.%]="staff.completionRate"></div>
                          </div>
                        </div>
                      </td>
                      <!-- Cột Phần A: Tiêu Chuẩn Chung (Editable) -->
                      <td class="text-center col-general">
                        <div class="general-score-input-wrap">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            step="0.5"
                            class="inline-score-input"
                            [(ngModel)]="staff.scoreGeneral"
                            (change)="updateStaffScoreGeneral(staff)"
                            (keydown.enter)="updateStaffScoreGeneral(staff)"
                            [disabled]="isSavingStaffId() === staff.id"
                            title="Nhập điểm Tiêu chuẩn chung (0 - 30 điểm)"
                          />
                          <span class="denom-text">/30đ</span>
                          @if (isSavingStaffId() === staff.id) {
                            <span class="material-symbols-outlined spinning icon-saving" title="Đang lưu...">sync</span>
                          }
                        </div>
                      </td>
                      <!-- Cột Thành Phần Điểm A + B + Thưởng C -->
                      <td class="text-center col-breakdown">
                        <div class="score-parts-badge" title="A: Tiêu chuẩn chung (tối đa 30đ) | B: Điểm công việc theo trục (tối đa 70đ) | C: Điểm thưởng (+5%)">
                          <span class="part-a">A: <strong>{{ staff.scoreGeneral }}</strong></span>
                          <span class="part-sep">+</span>
                          <span class="part-b">B: <strong>{{ staff.scoreTask }}</strong></span>
                          @if (staff.scoreBonus > 0) {
                            <span class="part-sep">+</span>
                            <span class="part-c">C: <strong>+{{ staff.scoreBonus }}</strong></span>
                          }
                        </div>
                      </td>
                      <td class="text-center col-score">
                        <span class="score-badge">{{ staff.scoreFinal }} <small>/100</small></span>
                      </td>
                      <td class="text-center col-class">
                        <span class="classification-pill" [ngClass]="getClassificationBadgeClass(staff.classification)">
                          {{ getClassificationLabel(staff.classification) }}
                        </span>
                      </td>
                      <td class="text-center col-action">
                        <button
                          type="button"
                          class="btn-view-details"
                          (click)="openStaffTaskModal(staff)"
                          title="Xem danh sách công việc và minh chứng theo trục nhiệm vụ"
                        >
                          <span class="material-symbols-outlined icon-btn">visibility</span>
                          <span>Xem chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- 5b. PAGINATION TOOLBAR -->
            <div class="pagination-bar">
              <div class="pagination-info">
                <span class="info-text">
                  Hiển thị <strong>{{ startIndex() }} - {{ endIndex() }}</strong> trên tổng số <strong>{{ totalStaffCount() }}</strong> cán bộ giáo viên
                </span>
                <div class="page-size-selector">
                  <label>Hiển thị:</label>
                  <select
                    class="select-page-size"
                    [ngModel]="pageSize()"
                    (ngModelChange)="setPageSize($event)"
                  >
                    <option [ngValue]="10">10 / trang</option>
                    <option [ngValue]="25">25 / trang</option>
                    <option [ngValue]="50">50 / trang</option>
                    <option [ngValue]="100">100 / trang</option>
                  </select>
                </div>
              </div>

              <div class="pagination-controls">
                <button
                  type="button"
                  class="btn-page-nav"
                  [disabled]="currentPage() === 1"
                  (click)="goToPage(1)"
                  title="Trang đầu"
                >
                  <span class="material-symbols-outlined">first_page</span>
                </button>
                <button
                  type="button"
                  class="btn-page-nav"
                  [disabled]="currentPage() === 1"
                  (click)="prevPage()"
                  title="Trang trước"
                >
                  <span class="material-symbols-outlined">chevron_left</span>
                </button>

                <div class="page-numbers-group">
                  @for (p of (pageNumbers() || []); track $index) {
                    @if (p === -1) {
                      <span class="page-ellipsis">...</span>
                    } @else {
                      <button
                        type="button"
                        class="btn-page-num"
                        [class.active]="p === currentPage()"
                        (click)="goToPage(p)"
                      >
                        {{ p }}
                      </button>
                    }
                  }
                </div>

                <button
                  type="button"
                  class="btn-page-nav"
                  [disabled]="currentPage() === totalPages() || totalPages() === 0"
                  (click)="nextPage()"
                  title="Trang tiếp"
                >
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
                <button
                  type="button"
                  class="btn-page-nav"
                  [disabled]="currentPage() === totalPages() || totalPages() === 0"
                  (click)="goToPage(totalPages())"
                  title="Trang cuối"
                >
                  <span class="material-symbols-outlined">last_page</span>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- 6. MODAL: CHI TIẾT CÔNG VIỆC THEO TRỤC NHIỆM VỤ CỦA GIÁO VIÊN -->
      @if (selectedStaffForDetails) {
        <div class="modal-backdrop">
          <div class="modal-dialog staff-details-modal" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="modal-title-box">
                <div class="staff-header-avatar-wrap">
                  <img
                    [src]="selectedStaffForDetails.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + selectedStaffForDetails.fullName"
                    class="modal-avatar"
                  />
                </div>
                <div>
                  <h3 class="modal-title">Chi Tiết Công Việc & Đánh Giá KPI</h3>
                  <p class="modal-subtitle">
                    <strong>{{ selectedStaffForDetails.fullName }}</strong> • {{ selectedStaffForDetails.title || 'Giáo viên' }} • {{ selectedStaffForDetails.orgUnitName }}
                  </p>
                </div>
              </div>

              <div class="modal-header-actions">
                <span class="classification-pill-lg" [ngClass]="getClassificationBadgeClass(selectedStaffForDetails.classification)">
                  {{ getClassificationLabel(selectedStaffForDetails.classification) }} ({{ selectedStaffForDetails.scoreFinal }}đ)
                </span>
                <button type="button" class="btn-close-modal" (click)="closeStaffTaskModal()">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">
              <!-- Summary Stats of Selected Staff -->
              <div class="modal-stats-bar">
                <div class="modal-stat-item">
                  <span class="stat-lbl">Tổng nhiệm vụ:</span>
                  <strong>{{ selectedStaffForDetails.totalTasks }} việc</strong>
                </div>
                <div class="modal-stat-item">
                  <span class="stat-lbl">Đã hoàn thành:</span>
                  <strong class="text-emerald-700">{{ selectedStaffForDetails.completedTasks }} việc</strong>
                </div>
                <div class="modal-stat-item">
                  <span class="stat-lbl">Đang thực hiện:</span>
                  <strong class="text-blue-700">{{ selectedStaffForDetails.inProgressTasks }} việc</strong>
                </div>
                <div class="modal-stat-item">
                  <span class="stat-lbl">Tỷ lệ hoàn thành:</span>
                  <strong class="text-indigo-700">{{ selectedStaffForDetails.completionRate }}%</strong>
                </div>
                <div class="modal-stat-item">
                  <span class="stat-lbl">Tổng điểm chốt:</span>
                  <strong class="text-blue-800">{{ selectedStaffForDetails.scoreFinal }} / 100đ</strong>
                </div>
              </div>

              <!-- Phần A Score Management in Modal -->
              <div class="modal-score-section-card">
                <div class="score-sec-info">
                  <div class="score-sec-header">
                    <span class="material-symbols-outlined text-blue-600">verified_user</span>
                    <strong>Phần A: Tiêu Chuẩn Chung (0 - 30 điểm)</strong>
                  </div>
                  <p class="score-sec-desc">
                    Đánh giá ý thức chấp hành chủ trương, kỷ luật, đạo đức nhà giáo, thực hiện quy chế và đổi mới sáng tạo.
                  </p>
                </div>

                <div class="score-sec-editor">
                  <div class="score-input-wrap-modal">
                    <label>Điểm Phần A:</label>
                    <div class="input-denom-group">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        class="form-input modal-score-input"
                        [(ngModel)]="selectedStaffForDetails.scoreGeneral"
                        (keydown.enter)="saveModalStaffGeneralScore()"
                      />
                      <span class="denom-label">/ 30đ</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="btn-save-score-modal"
                    (click)="saveModalStaffGeneralScore()"
                    [disabled]="isSavingStaffId() === selectedStaffForDetails.id"
                  >
                    <span class="material-symbols-outlined" [class.spinning]="isSavingStaffId() === selectedStaffForDetails.id">
                      {{ isSavingStaffId() === selectedStaffForDetails.id ? 'sync' : 'save' }}
                    </span>
                    <span>{{ isSavingStaffId() === selectedStaffForDetails.id ? 'Đang lưu...' : 'Lưu Điểm Phần A' }}</span>
                  </button>
                </div>
              </div>

              <!-- Task List grouped by Axis or list -->
              <h4 class="tasks-heading">
                <span class="material-symbols-outlined">task</span>
                <span>Danh Sách Công Việc Được Giao ({{ selectedStaffForDetails.tasks.length }} nhiệm vụ)</span>
              </h4>

              @if (selectedStaffForDetails.tasks.length === 0) {
                <div class="no-tasks-box">
                  <span class="material-symbols-outlined">assignment_late</span>
                  <p>Giáo viên này chưa được giao công việc nào gắn với Trục nhiệm vụ trong kỳ này.</p>
                </div>
              } @else {
                <div class="tasks-list-box">
                  @for (task of (selectedStaffForDetails.tasks || []); track task.id) {
                    <div class="task-row-card">
                      <div class="task-row-main">
                        <div class="task-row-top">
                          <span class="task-code-badge">{{ task.code }}</span>
                          <span class="task-axis-tag" [title]="task.axisName || 'Trục kết quả'">
                            <span class="material-symbols-outlined icon-axis">hub</span>
                            {{ task.axisName || 'Chung' }}
                          </span>
                          @if (task.weightScore) {
                            <span class="task-weight-tag">{{ task.weightScore }} điểm</span>
                          }
                          <span class="task-status-pill" [ngClass]="getStatusClass(task.status)">
                            {{ getStatusLabel(task.status) }}
                          </span>
                        </div>

                        <h5 class="task-title-text">{{ task.title }}</h5>

                        <div class="task-row-meta">
                          <span class="meta-item">
                            <span class="material-symbols-outlined">event</span>
                            <span>Hạn chót: {{ task.dueDate ? (task.dueDate | date: 'dd/MM/yyyy') : 'Không có' }}</span>
                          </span>
                          @if (task.completedAt) {
                            <span class="meta-item text-emerald-600">
                              <span class="material-symbols-outlined">check</span>
                              <span>Hoàn thành: {{ task.completedAt | date: 'dd/MM/yyyy' }}</span>
                            </span>
                          }
                        </div>
                      </div>

                      <div class="task-row-actions">
                        <div class="task-progress-box">
                          <span class="prog-pct">{{ task.progressPercent || 0 }}%</span>
                          <div class="prog-track">
                            <div class="prog-fill" [style.width.%]="task.progressPercent || 0"></div>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="btn-open-task"
                          (click)="openTaskPage(task.id)"
                          title="Mở toàn bộ trang chi tiết công việc này"
                        >
                          <span class="material-symbols-outlined">open_in_new</span>
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <button type="button" class="btn-dialog-close" (click)="closeStaffTaskModal()">
                Đóng
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .school-kpi-container {
        padding: 1.25rem 1.5rem 3rem;
        max-width: 1440px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      /* TOAST BANNER */
      .toast-banner {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        border-radius: 10px;
        font-size: 0.88rem;
        font-weight: 600;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
        animation: slideInUp 0.25s ease-out;

        &.toast-success {
          background: #065F46;
          color: #FFFFFF;
        }

        &.toast-error {
          background: #991B1B;
          color: #FFFFFF;
        }

        .btn-close-toast {
          background: transparent;
          border: none;
          color: #FFFFFF;
          opacity: 0.8;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          &:hover { opacity: 1; }
          .material-symbols-outlined { font-size: 18px; }
        }
      }

      @keyframes slideInUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      /* 1. Header */
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
          color: #2563EB;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;

          .icon-mini {
            font-size: 18px;
          }
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.02em;
          margin: 0 0 6px;
        }

        .page-subtitle {
          font-size: 0.86rem;
          color: #64748B;
          margin: 0;
          max-width: 780px;
          line-height: 1.5;
        }

        .header-right-actions {
          display: flex;
          align-items: center;
          gap: 10px;

          .btn-action {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 16px;
            border-radius: 8px;
            font-size: 0.86rem;
            font-weight: 600;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.2s ease;

            .material-symbols-outlined { font-size: 19px; }

            &.btn-print {
              background: #FFFFFF;
              border-color: #CBD5E1;
              color: #334155;
              &:hover { background: #F8FAFC; border-color: #94A3B8; }
            }

            &.btn-excel {
              background: #059669;
              color: #FFFFFF;
              &:hover { background: #047857; }
              .excel-icon { font-size: 19px; }
            }
          }
        }
      }

      /* 2. Filter Toolbar */
      .filter-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 1rem 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

        .filter-grid {
          display: grid;
          grid-template-columns: 2fr 1.5fr 1.5fr 2fr auto;
          gap: 1rem;
          align-items: flex-end;

          @media (max-width: 1100px) {
            grid-template-columns: 1fr 1fr;
          }

          @media (max-width: 640px) {
            grid-template-columns: 1fr;
          }

          .filter-item {
            display: flex;
            flex-direction: column;
            gap: 6px;

            label {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.8rem;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.02em;

              .material-symbols-outlined { font-size: 16px; color: #64748B; }
            }

            .form-select, .form-input {
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #CBD5E1;
              border-radius: 8px;
              font-size: 0.86rem;
              background-color: #FFFFFF;
              color: #1E293B;
              outline: none;
              transition: border-color 0.2s;

              &:focus {
                border-color: #2563EB;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
              }
            }

            .search-input-wrap {
              position: relative;
              display: flex;
              align-items: center;

              .search-input {
                padding-right: 32px;
              }

              .btn-clear-search {
                position: absolute;
                right: 8px;
                background: transparent;
                border: none;
                color: #94A3B8;
                cursor: pointer;
                display: flex;
                align-items: center;
                &:hover { color: #475569; }
                .material-symbols-outlined { font-size: 16px; }
              }
            }

            &.btn-refresh-wrap {
              .btn-refresh {
                padding: 8px 14px;
                background: #F1F5F9;
                border: 1px solid #CBD5E1;
                border-radius: 8px;
                color: #334155;
                font-weight: 600;
                font-size: 0.85rem;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                height: 38px;

                &:hover:not(:disabled) {
                  background: #E2E8F0;
                  color: #0F172A;
                }

                &:disabled {
                  opacity: 0.6;
                  cursor: not-allowed;
                }

                .material-symbols-outlined { font-size: 18px; }
              }
            }
          }
        }
      }

      /* 3. Top Metrics Summary Grid */
      .kpi-metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1.25rem;

        @media (max-width: 1024px) {
          grid-template-columns: repeat(2, 1fr);
        }
        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }

        .metric-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
          }

          &.card-blue::before { background: #2563EB; }
          &.card-emerald::before { background: #059669; }
          &.card-indigo::before { background: #4F46E5; }
          &.card-amber::before { background: #D97706; }
          &.card-purple::before { background: #7C3AED; }

          .metric-icon-box {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            .material-symbols-outlined { font-size: 24px; }

            &.bg-blue { background: #EFF6FF; color: #2563EB; }
            &.bg-emerald { background: #ECFDF5; color: #059669; }
            &.bg-indigo { background: #EEF2FF; color: #4F46E5; }
            &.bg-amber { background: #FFFBEB; color: #D97706; }
            &.bg-purple { background: #FAF5FF; color: #7C3AED; }
          }

          .metric-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;

            .metric-label {
              font-size: 0.78rem;
              font-weight: 700;
              color: #64748B;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }

            .metric-value {
              font-size: 1.6rem;
              font-weight: 800;
              color: #0F172A;
              line-height: 1.2;

              &.text-amber { color: #B45309; }
              &.text-indigo { color: #4338CA; }

              .unit {
                font-size: 0.82rem;
                font-weight: 600;
                color: #64748B;
              }
            }

            .val-group {
              display: flex;
              align-items: baseline;
              gap: 4px;

              .metric-total {
                font-size: 0.88rem;
                font-weight: 600;
                color: #64748B;
              }
            }

            .metric-sub {
              font-size: 0.78rem;
              color: #64748B;
              margin-top: 4px;

              strong { color: #0F172A; }
            }

            .mini-classes-row {
              display: flex;
              align-items: center;
              gap: 4px;
              flex-wrap: wrap;
              margin: 4px 0 2px;
            }
          }
        }
      }

      /* Annual Rules Notice Banner */
      .annual-rules-banner {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        background: #EFF6FF;
        border: 1px solid #BFDBFE;
        border-radius: 12px;
        padding: 1rem 1.25rem;

        .rule-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #DBEAFE;
          color: #1E40AF;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          .material-symbols-outlined { font-size: 20px; }
        }

        .rule-content {
          font-size: 0.84rem;
          color: #1E3A8A;
          line-height: 1.5;

          strong { color: #1E40AF; }

          ul {
            margin: 6px 0 0;
            padding-left: 1.25rem;
            li { margin-bottom: 2px; }
          }
        }
      }

      /* 4. Section Card */
      .section-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        overflow: hidden;

        .section-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;

          .header-left {
            display: flex;
            align-items: center;
            gap: 10px;

            .header-icon {
              font-size: 24px;
              color: #2563EB;
            }

            .section-title {
              font-size: 1.05rem;
              font-weight: 700;
              color: #0F172A;
              margin: 0;
            }

            .section-subtitle {
              font-size: 0.8rem;
              color: #64748B;
              display: block;
              margin-top: 2px;
            }
          }

          .header-right {
            .count-badge {
              padding: 4px 10px;
              border-radius: 6px;
              background: #F1F5F9;
              font-size: 0.8rem;
              font-weight: 600;
              color: #475569;
            }
          }
        }
      }

      /* Axes summary grid */
      .axes-summary-grid {
        padding: 1.25rem;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;

        @media (max-width: 1024px) {
          grid-template-columns: repeat(2, 1fr);
        }
        @media (max-width: 640px) {
          grid-template-columns: 1fr;
        }

        .axis-stat-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;

          &.has-tasks {
            background: #FFFFFF;
            border-color: #CBD5E1;
          }

          .axis-stat-header {
            display: flex;
            align-items: center;
            gap: 8px;

            .axis-badge {
              font-size: 0.72rem;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
              background: #E2E8F0;
              color: #475569;
            }

            .axis-name {
              font-size: 0.84rem;
              font-weight: 700;
              color: #1E293B;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }

          .axis-stat-body {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.84rem;

            .stat-counts {
              .completed-num { font-weight: 800; color: #059669; }
              .total-num { color: #64748B; }
            }

            .rate-badge {
              font-weight: 800;
              font-size: 0.78rem;
              padding: 2px 8px;
              border-radius: 999px;
              background: #F1F5F9;
              color: #64748B;

              &.rate-high { background: #DCFCE7; color: #15803D; }
              &.rate-mid { background: #FEF3C7; color: #B45309; }
            }
          }

          .progress-bar-wrap {
            height: 6px;
            background: #E2E8F0;
            border-radius: 999px;
            overflow: hidden;

            .progress-fill {
              height: 100%;
              background: #2563EB;
              border-radius: 999px;
              transition: width 0.3s ease;
            }
          }
        }
      }

      /* 5. Staff Table */
      .table-responsive {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: #CBD5E1 #F8FAFC;

        &::-webkit-scrollbar {
          height: 6px;
        }
        &::-webkit-scrollbar-track {
          background: #F8FAFC;
        }
        &::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 999px;
          &:hover {
            background: #94A3B8;
          }
        }
      }

      .staff-table {
        width: 100%;
        min-width: 1320px;
        border-collapse: collapse;
        font-size: 0.86rem;

        &.annual-staff-table {
          min-width: 1200px;
        }

        thead {
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;

          th {
            padding: 12px 14px;
            font-weight: 700;
            font-size: 0.78rem;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            white-space: nowrap;
            text-align: left;

            &.text-center { text-align: center; }
          }
        }

        tbody {
          tr {
            border-bottom: 1px solid #F1F5F9;
            transition: background 0.15s;

            &:hover {
              background: #F8FAFC;
            }

            &.row-warning {
              background: #FFFBEB;
            }

            td {
              padding: 12px 14px;
              vertical-align: middle;
              color: #1E293B;

              &.text-center { text-align: center; }
            }
          }
        }

        .col-stt { width: 48px; min-width: 48px; text-align: center; }
        .col-staff { min-width: 240px; }
        .col-org { min-width: 160px; }
        .col-tasks { min-width: 120px; white-space: nowrap; }
        .col-rate { min-width: 100px; white-space: nowrap; }
        .col-general { min-width: 180px; white-space: nowrap; }
        .col-breakdown { min-width: 155px; white-space: nowrap; }
        .col-score { min-width: 115px; white-space: nowrap; }
        .col-class { min-width: 155px; white-space: nowrap; }
        .col-action { min-width: 140px; white-space: nowrap; text-align: center; }
        .col-quarter { min-width: 115px; white-space: nowrap; }
        .col-avg { min-width: 115px; white-space: nowrap; }
        .col-note { min-width: 160px; white-space: nowrap; }

        .staff-info-cell {
          display: flex;
          align-items: center;
          gap: 10px;

          .staff-avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 1.5px solid #E2E8F0;
            object-fit: cover;
            flex-shrink: 0;
            background: #F1F5F9;
          }

          .staff-meta {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;

            .staff-name {
              font-size: 0.88rem;
              font-weight: 700;
              color: #0F172A;
              white-space: nowrap;
            }

            .staff-title {
              font-size: 0.76rem;
              color: #64748B;
              white-space: nowrap;
            }

            .staff-email {
              font-size: 0.72rem;
              color: #94A3B8;
              white-space: nowrap;
            }
          }
        }

        .org-pill {
          display: inline-block;
          padding: 4px 9px;
          border-radius: 6px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          font-size: 0.78rem;
          font-weight: 600;
          color: #334155;
          line-height: 1.35;
        }

        .task-count-box {
          font-size: 0.84rem;
          white-space: nowrap;
        }

        .rate-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;

          .rate-val {
            font-weight: 700;
            font-size: 0.82rem;
            color: #1E293B;
          }

          .mini-progress-track {
            width: 60px;
            height: 4px;
            background: #E2E8F0;
            border-radius: 999px;
            overflow: hidden;

            .mini-progress-bar {
              height: 100%;
              background: #059669;
              border-radius: 999px;
            }
          }
        }

        .general-score-input-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          position: relative;
          white-space: nowrap;

          .inline-score-input {
            width: 52px;
            height: 32px;
            padding: 2px 6px;
            border: 1.5px solid #CBD5E1;
            border-radius: 6px;
            text-align: center;
            font-weight: 700;
            font-size: 0.88rem;
            color: #1E40AF;
            background: #F8FAFC;
            outline: none;
            transition: all 0.15s ease;

            &:focus {
              background: #FFFFFF;
              border-color: #2563EB;
              box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
            }
          }

          .denom-text {
            font-size: 0.8rem;
            font-weight: 600;
            color: #64748B;
            white-space: nowrap;
          }

          .icon-saving {
            font-size: 16px;
            color: #2563EB;
          }
        }

        .score-parts-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          font-size: 0.78rem;
          color: #475569;
          white-space: nowrap;

          .part-a strong { color: #1E40AF; }
          .part-b strong { color: #059669; }
          .part-c strong { color: #D97706; }
          .part-sep { color: #94A3B8; font-weight: 600; }
        }

        .score-badge {
          display: inline-block;
          font-size: 1rem;
          font-weight: 800;
          color: #1E3A8A;
          white-space: nowrap;

          small {
            font-size: 0.72rem;
            font-weight: 600;
            color: #64748B;
          }
        }

        .score-badge-avg {
          display: inline-block;
          font-size: 1.05rem;
          font-weight: 800;
          color: #1E40AF;
          background: #EEF2FF;
          padding: 3px 8px;
          border-radius: 6px;
          white-space: nowrap;

          small {
            font-size: 0.72rem;
            font-weight: 600;
            color: #64748B;
          }
        }

        .quarter-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          white-space: nowrap;

          .q-score {
            font-size: 0.84rem;
            color: #0F172A;
          }
        }

        .hr-warning-cell {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #991B1B;
          font-size: 0.74rem;
          font-weight: 600;
          white-space: nowrap;

          .icon-warn { font-size: 15px; color: #DC2626; }
        }

        .icon-ok {
          font-size: 15px;
          vertical-align: -2px;
        }

        .btn-view-details {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1E40AF;
          font-weight: 600;
          font-size: 0.8rem;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.15s;

          &:hover {
            background: #DBEAFE;
            border-color: #93C5FD;
            box-shadow: 0 1px 3px rgba(37, 99, 235, 0.15);
          }

          .icon-btn { font-size: 16px; flex-shrink: 0; }
        }
      }

      /* Classification Pills */
      .classification-pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.01em;

        &.pill-xuat-sac { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
        &.pill-tot { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
        &.pill-hoan-thanh { background: #E0E7FF; color: #3730A3; border: 1px solid #C7D2FE; }
        &.pill-chua-dat { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }
      }

      .classification-pill-lg {
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 0.84rem;
        font-weight: 700;
        &.pill-xuat-sac { background: #FEF3C7; color: #92400E; }
        &.pill-tot { background: #DCFCE7; color: #166534; }
        &.pill-hoan-thanh { background: #E0E7FF; color: #3730A3; }
        &.pill-chua-dat { background: #FEE2E2; color: #991B1B; }
      }

      .pill-mini {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;

        &.pill-xuat-sac { background: #FEF3C7; color: #92400E; }
        &.pill-tot { background: #DCFCE7; color: #166534; }
        &.pill-ht, &.pill-hoan-thanh { background: #E0E7FF; color: #3730A3; }
        &.pill-kht, &.pill-chua-dat { background: #FEE2E2; color: #991B1B; }
      }

      /* Pagination Bar */
      .pagination-bar {
        padding: 1rem 1.25rem;
        border-top: 1px solid #F1F5F9;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;

        .pagination-info {
          display: flex;
          align-items: center;
          gap: 1rem;

          .info-text {
            font-size: 0.84rem;
            color: #64748B;
            strong { color: #1E293B; }
          }

          .page-size-selector {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.82rem;
            color: #64748B;

            .select-page-size {
              padding: 4px 8px;
              border: 1px solid #CBD5E1;
              border-radius: 6px;
              font-size: 0.82rem;
              background: #FFFFFF;
              color: #1E293B;
              outline: none;
            }
          }
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 4px;

          .btn-page-nav {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: 1px solid #CBD5E1;
            background: #FFFFFF;
            color: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s;

            &:hover:not(:disabled) {
              background: #F1F5F9;
              color: #0F172A;
            }

            &:disabled {
              opacity: 0.4;
              cursor: not-allowed;
            }

            .material-symbols-outlined { font-size: 18px; }
          }

          .page-numbers-group {
            display: flex;
            align-items: center;
            gap: 3px;

            .btn-page-num {
              min-width: 32px;
              height: 32px;
              padding: 0 6px;
              border-radius: 6px;
              border: 1px solid #CBD5E1;
              background: #FFFFFF;
              color: #334155;
              font-size: 0.82rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s;

              &:hover {
                background: #F1F5F9;
                color: #0F172A;
              }

              &.active {
                background: #2563EB;
                border-color: #2563EB;
                color: #FFFFFF;
              }
            }

            .page-ellipsis {
              padding: 0 4px;
              color: #94A3B8;
              font-weight: 700;
            }
          }
        }
      }

      /* Modal Styles */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        animation: fadeIn 0.2s ease-out;

        .staff-details-modal {
          background: #FFFFFF;
          border-radius: 16px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;

          .modal-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid #E2E8F0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;

            .modal-title-box {
              display: flex;
              align-items: center;
              gap: 12px;

              .staff-header-avatar-wrap {
                .modal-avatar {
                  width: 44px;
                  height: 44px;
                  border-radius: 50%;
                  border: 2px solid #E2E8F0;
                  object-fit: cover;
                }
              }

              .modal-title {
                font-size: 1.15rem;
                font-weight: 800;
                color: #0F172A;
                margin: 0;
              }

              .modal-subtitle {
                font-size: 0.84rem;
                color: #64748B;
                margin: 2px 0 0;
              }
            }

            .modal-header-actions {
              display: flex;
              align-items: center;
              gap: 10px;

              .btn-close-modal {
                background: transparent;
                border: none;
                color: #94A3B8;
                cursor: pointer;
                padding: 4px;
                display: flex;
                align-items: center;
                border-radius: 6px;

                &:hover {
                  background: #F1F5F9;
                  color: #0F172A;
                }
                .material-symbols-outlined { font-size: 20px; }
              }
            }
          }

          .modal-body {
            padding: 1.5rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;

            .modal-stats-bar {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 10px;
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 10px;
              padding: 12px;

              @media (max-width: 768px) {
                grid-template-columns: repeat(2, 1fr);
              }

              .modal-stat-item {
                display: flex;
                flex-direction: column;
                gap: 2px;

                .stat-lbl {
                  font-size: 0.72rem;
                  font-weight: 700;
                  color: #64748B;
                  text-transform: uppercase;
                }

                strong {
                  font-size: 0.95rem;
                  font-weight: 800;
                  color: #0F172A;
                }
              }
            }

            .modal-score-section-card {
              background: #EFF6FF;
              border: 1px solid #BFDBFE;
              border-radius: 10px;
              padding: 1rem 1.25rem;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 1.25rem;
              flex-wrap: wrap;

              .score-sec-info {
                max-width: 480px;

                .score-sec-header {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  font-size: 0.95rem;
                  font-weight: 700;
                  color: #1E40AF;
                }

                .score-sec-desc {
                  font-size: 0.8rem;
                  color: #1E3A8A;
                  margin: 4px 0 0;
                  line-height: 1.4;
                }
              }

              .score-sec-editor {
                display: flex;
                align-items: flex-end;
                gap: 10px;

                .score-input-wrap-modal {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;

                  label {
                    font-size: 0.76rem;
                    font-weight: 700;
                    color: #1E40AF;
                  }

                  .input-denom-group {
                    display: flex;
                    align-items: center;
                    gap: 6px;

                    .modal-score-input {
                      width: 70px;
                      padding: 6px 10px;
                      border: 1.5px solid #93C5FD;
                      border-radius: 8px;
                      font-size: 1rem;
                      font-weight: 800;
                      text-align: center;
                      color: #1E40AF;
                      background: #FFFFFF;
                      outline: none;

                      &:focus {
                        border-color: #2563EB;
                        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
                      }
                    }

                    .denom-label {
                      font-weight: 700;
                      color: #1E40AF;
                      font-size: 0.88rem;
                    }
                  }
                }

                .btn-save-score-modal {
                  padding: 8px 14px;
                  background: #2563EB;
                  border: none;
                  border-radius: 8px;
                  color: #FFFFFF;
                  font-weight: 700;
                  font-size: 0.84rem;
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  cursor: pointer;
                  height: 38px;

                  &:hover:not(:disabled) {
                    background: #1D4ED8;
                  }

                  &:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                  }

                  .material-symbols-outlined { font-size: 18px; }
                }
              }
            }

            .tasks-heading {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 0.95rem;
              font-weight: 700;
              color: #0F172A;
              margin: 4px 0 0;

              .material-symbols-outlined { font-size: 20px; color: #2563EB; }
            }

            .no-tasks-box {
              padding: 30px;
              text-align: center;
              background: #F8FAFC;
              border-radius: 10px;
              border: 1px dashed #CBD5E1;
              color: #64748B;

              .material-symbols-outlined { font-size: 32px; color: #94A3B8; margin-bottom: 6px; }
              p { margin: 0; font-size: 0.85rem; }
            }

            .tasks-list-box {
              display: flex;
              flex-direction: column;
              gap: 10px;

              .task-row-card {
                background: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 10px;
                padding: 12px 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                transition: all 0.15s;

                &:hover {
                  border-color: #CBD5E1;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
                }

                .task-row-main {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                  min-width: 0;

                  .task-row-top {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;

                    .task-code-badge {
                      font-family: monospace;
                      font-size: 0.74rem;
                      font-weight: 700;
                      padding: 2px 6px;
                      border-radius: 4px;
                      background: #F1F5F9;
                      color: #475569;
                    }

                    .task-axis-tag {
                      display: inline-flex;
                      align-items: center;
                      gap: 4px;
                      font-size: 0.74rem;
                      font-weight: 700;
                      padding: 2px 8px;
                      border-radius: 999px;
                      background: #EFF6FF;
                      color: #1E40AF;

                      .icon-axis { font-size: 13px; }
                    }

                    .task-weight-tag {
                      font-size: 0.72rem;
                      font-weight: 700;
                      padding: 2px 6px;
                      border-radius: 4px;
                      background: #FEF3C7;
                      color: #92400E;
                    }

                    .task-status-pill {
                      font-size: 0.72rem;
                      font-weight: 700;
                      padding: 2px 8px;
                      border-radius: 999px;

                      &.st-completed { background: #DCFCE7; color: #166534; }
                      &.st-inprogress { background: #E0E7FF; color: #3730A3; }
                      &.st-pending { background: #F1F5F9; color: #475569; }
                    }
                  }

                  .task-title-text {
                    font-size: 0.88rem;
                    font-weight: 700;
                    color: #0F172A;
                    margin: 2px 0 0;
                  }

                  .task-row-meta {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 0.76rem;
                    color: #64748B;

                    .meta-item {
                      display: flex;
                      align-items: center;
                      gap: 4px;
                      .material-symbols-outlined { font-size: 14px; }
                    }
                  }
                }

                .task-row-actions {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  flex-shrink: 0;

                  .task-progress-box {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 3px;

                    .prog-pct {
                      font-size: 0.76rem;
                      font-weight: 700;
                      color: #475569;
                    }

                    .prog-track {
                      width: 50px;
                      height: 4px;
                      background: #E2E8F0;
                      border-radius: 999px;
                      overflow: hidden;

                      .prog-fill {
                        height: 100%;
                        background: #059669;
                      }
                    }
                  }

                  .btn-open-task {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 6px 10px;
                    border-radius: 6px;
                    border: 1px solid #CBD5E1;
                    background: #FFFFFF;
                    color: #334155;
                    font-size: 0.78rem;
                    font-weight: 600;
                    cursor: pointer;

                    &:hover {
                      background: #F1F5F9;
                      color: #0F172A;
                    }

                    .material-symbols-outlined { font-size: 15px; }
                  }
                }
              }
            }
          }

          .modal-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid #E2E8F0;
            display: flex;
            align-items: center;
            justify-content: flex-end;

            .btn-dialog-close {
              padding: 8px 18px;
              border-radius: 8px;
              border: 1px solid #CBD5E1;
              background: #FFFFFF;
              color: #334155;
              font-weight: 600;
              font-size: 0.84rem;
              cursor: pointer;

              &:hover { background: #F1F5F9; color: #0F172A; }
            }
          }
        }
      }

      /* Helpers */
      .loading-state, .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #64748B;

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #E2E8F0;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }

        .empty-icon {
          font-size: 40px;
          color: #94A3B8;
          margin-bottom: 8px;
        }

        h4 { margin: 0 0 4px; color: #1E293B; font-weight: 700; }
        p { margin: 0; font-size: 0.84rem; }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media print {
        .hide-on-print { display: none !important; }
        .show-on-print-only { display: block !important; }
      }

      .show-on-print-only { display: none; }
    `,
  ],
})
export class SchoolKpiComponent implements OnInit {
  private kpiService = inject(KpiFlexibleService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  public academicYearService = inject(AcademicYearService);
  private destroyRef = inject(DestroyRef);

  periods = signal<EvaluationPeriod[]>([]);
  selectedPeriodId = signal<string>('');
  orgUnits = signal<OrgUnitItem[]>([]);

  selectedOrgUnitId = 'all';
  selectedClassification = 'all';
  searchQuery = '';

  overviewData = signal<SchoolKpiOverview | null>(null);
  schoolAnnualData = signal<SchoolAnnualRollupResult | null>(null);
  isLoading = signal<boolean>(false);

  // Pagination signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Saving states & Toast
  isSavingStaffId = signal<string | null>(null);
  toastMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  selectedStaffForDetails: StaffKpiItem | null = null;
  currentDate = new Date();

  isAnnualView = computed(() => this.selectedPeriodId() === 'annual_school');

  ngOnInit(): void {
    this.loadPeriods();
    this.loadOrgUnits();

    this.academicYearService.yearChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadPeriods();
      });
  }

  loadPeriods(): void {
    const selectedYear = this.academicYearService.currentAcademicYear();
    this.kpiService.getPeriods(selectedYear).subscribe({
      next: (periods: EvaluationPeriod[]) => {
        this.periods.set(periods);
        if (periods.length > 0) {
          const active = periods.find((p: EvaluationPeriod) => p.status === 'open') || periods[0];
          this.selectedPeriodId.set(active.id);
          this.loadData();
        }
      },
      error: () => {},
    });
  }

  loadOrgUnits(): void {
    this.userService.getOrgUnits().subscribe({
      next: (units: OrgUnitItem[]) => {
        this.orgUnits.set(units || []);
      },
      error: () => {},
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    const selectedYear = this.academicYearService.currentAcademicYear();
    if (this.isAnnualView()) {
      const orgFilter = this.selectedOrgUnitId === 'all' ? undefined : this.selectedOrgUnitId;
      this.kpiService.getSchoolAnnualRollup(selectedYear, orgFilter).subscribe({
        next: (data) => {
          this.schoolAnnualData.set(data);
          this.isLoading.set(false);
          const maxPage = Math.ceil((this.filteredAnnualStaffList().length || 0) / this.pageSize()) || 1;
          if (this.currentPage() > maxPage) {
            this.currentPage.set(1);
          }
        },
        error: (err) => {
          console.error('Error loading school annual rollup:', err);
          this.isLoading.set(false);
        },
      });
    } else {
      this.kpiService
        .getSchoolOverview({
          periodId: this.selectedPeriodId(),
          orgUnitId: this.selectedOrgUnitId,
          classification: this.selectedClassification,
          search: this.searchQuery,
        })
        .subscribe({
          next: (data) => {
            this.overviewData.set(data);
            this.isLoading.set(false);
            const maxPage = Math.ceil((data.staffList?.length || 0) / this.pageSize()) || 1;
            if (this.currentPage() > maxPage) {
              this.currentPage.set(1);
            }
          },
          error: (err) => {
            console.error('Error loading school KPI overview:', err);
            this.isLoading.set(false);
          },
        });
    }
  }

  onPeriodChange(periodId: string): void {
    this.selectedPeriodId.set(periodId);
    this.currentPage.set(1);
    this.loadData();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadData();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage.set(1);
    this.loadData();
  }

  filteredAnnualStaffList = computed(() => {
    const raw = this.schoolAnnualData()?.staffList || [];
    let list = [...raw];
    if (this.selectedOrgUnitId && this.selectedOrgUnitId !== 'all') {
      list = list.filter((s) => s.orgUnitId === this.selectedOrgUnitId);
    }
    if (this.selectedClassification && this.selectedClassification !== 'all') {
      list = list.filter((s) => s.yearlyClassification === this.selectedClassification);
    }
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q)
      );
    }
    return list;
  });

  filteredStaffList = computed(() => {
    return this.overviewData()?.staffList || [];
  });

  totalStaffCount = computed(() => {
    return this.isAnnualView()
      ? this.filteredAnnualStaffList().length
      : this.filteredStaffList().length;
  });

  totalPages = computed(() => {
    return Math.ceil(this.totalStaffCount() / this.pageSize()) || 1;
  });

  paginatedAnnualStaffList = computed(() => {
    const list = this.filteredAnnualStaffList();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  paginatedStaffList = computed(() => {
    const list = this.filteredStaffList();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  startIndex = computed(() => {
    if (this.totalStaffCount() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalStaffCount());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: number[] = [];
    if (cur <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push(-1); // ellipsis
      pages.push(total);
    } else if (cur >= total - 3) {
      pages.push(1);
      pages.push(-1);
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push(-1);
      pages.push(cur - 1);
      pages.push(cur);
      pages.push(cur + 1);
      pages.push(-1);
      pages.push(total);
    }
    return pages;
  });

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  setPageSize(size: number): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  currentPeriodName = computed(() => {
    if (this.isAnnualView()) {
      return 'Tổng Kết & Đánh Giá Cả Năm (2026-2027)';
    }
    const p = this.periods().find((item) => item.id === this.selectedPeriodId());
    return p ? `${p.name} (${p.schoolYear})` : 'Kỳ hiện hành';
  });

  showToast(text: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      if (this.toastMessage()?.text === text) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  updateStaffScoreGeneral(staff: StaffKpiItem): void {
    let score = Number(staff.scoreGeneral);
    if (isNaN(score)) score = 0;
    if (score < 0) score = 0;
    if (score > 30) score = 30;
    staff.scoreGeneral = score;

    this.isSavingStaffId.set(staff.id);
    this.kpiService
      .updateScoreGeneral({
        employeeId: staff.id,
        periodId: this.selectedPeriodId(),
        scoreGeneral: score,
      })
      .subscribe({
        next: (res) => {
          this.isSavingStaffId.set(null);
          if (res.data?.calc) {
            staff.scoreGeneral = res.data.calc.scoreGeneral;
            staff.scoreBonus = res.data.calc.scoreBonusCapped;
            staff.scoreFinal = res.data.calc.scoreFinal;
            if (res.data.classificationEval) {
              staff.classification = res.data.classificationEval.suggestedClassification;
            }
          }
          this.showToast(`Đã lưu điểm Tiêu chuẩn chung cho ${staff.fullName}: ${score}/30đ`);
        },
        error: (err) => {
          this.isSavingStaffId.set(null);
          console.error('Lỗi khi lưu điểm Tiêu chuẩn chung:', err);
          this.showToast(err.error?.message || 'Có lỗi xảy ra khi lưu điểm tiêu chuẩn chung!', 'error');
        },
      });
  }

  saveModalStaffGeneralScore(): void {
    if (!this.selectedStaffForDetails) return;
    this.updateStaffScoreGeneral(this.selectedStaffForDetails);
  }

  getPct(part?: number, total?: number): string {
    if (!part || !total || total === 0) return '0';
    return ((part / total) * 100).toFixed(1);
  }

  getClassificationLabel(cls: string): string {
    switch (cls) {
      case 'xuat_sac':
        return 'Hoàn thành Xuất sắc';
      case 'tot':
        return 'Hoàn thành Tốt';
      case 'hoan_thanh':
        return 'Hoàn thành';
      case 'khong_hoan_thanh':
        return 'Chưa hoàn thành';
      default:
        return cls || 'Chưa đánh giá';
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
        return 'pill-chua-dat';
      default:
        return 'pill-chua-dat';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'HOAN_THANH':
      case 'XAC_NHAN':
      case 'DONG':
        return 'Đã hoàn thành';
      case 'DANG_THUC_HIEN':
        return 'Đang thực hiện';
      case 'CHO_DUYET':
        return 'Chờ duyệt';
      case 'CHUA_BAT_DAU':
      default:
        return 'Chưa bắt đầu';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'HOAN_THANH':
      case 'XAC_NHAN':
      case 'DONG':
        return 'st-completed';
      case 'DANG_THUC_HIEN':
      case 'CHO_DUYET':
        return 'st-inprogress';
      default:
        return 'st-pending';
    }
  }

  openStaffTaskModal(staff: StaffKpiItem): void {
    this.selectedStaffForDetails = staff;
  }

  closeStaffTaskModal(): void {
    this.selectedStaffForDetails = null;
  }

  openTaskPage(taskId: string): void {
    this.closeStaffTaskModal();
    this.router.navigate(['/tasks', taskId]);
  }

  printReport(): void {
    window.print();
  }

  exportExcel(): void {
    const isAnnual = this.isAnnualView();
    const academicYear = this.academicYearService.currentAcademicYear();
    const currentPeriod = this.periods().find((p) => p.id === this.selectedPeriodId());
    const periodName = isAnnual
      ? `Tổng kết Cả Năm (${academicYear})`
      : currentPeriod?.name || 'Kỳ Đánh Giá KPI';

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
          .title-school { font-size: 13pt; font-weight: bold; color: #1F3864; }
          .title-report { font-size: 16pt; font-weight: bold; color: #1F3864; text-align: center; margin: 10px 0 4px 0; }
          .sub-report { font-size: 11pt; font-style: italic; text-align: center; color: #475569; margin-bottom: 15px; }
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { background-color: #1F3864; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #94A3B8; padding: 8px 6px; }
          td { border: 1px solid #CBD5E1; padding: 6px 8px; vertical-align: middle; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .bg-total { background-color: #F1F5F9; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="title-school">TRƯỜNG TIỂU HỌC & TRUNG HỌC CƠ SỞ ĐÀ NẴNG</div>
        <div class="title-report">BẢNG TỔNG HỢP ĐÁNH GIÁ & XẾP LOẠI KPI TOÀN TRƯỜNG</div>
        <div class="sub-report">${periodName} • Năm học: ${academicYear} • Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</div>
    `;

    if (isAnnual) {
      const list = this.filteredAnnualStaffList();
      tableHtml += `
        <table>
          <thead>
            <tr>
              <th rowspan="2">STT</th>
              <th rowspan="2">Mã / Email</th>
              <th rowspan="2">Họ và tên</th>
              <th rowspan="2">Tổ / Đơn vị</th>
              <th rowspan="2">Chức danh / Vị trí</th>
              <th colspan="4">Điểm Đánh Giá 4 Quý (Thang 100đ)</th>
              <th rowspan="2">Điểm TB Cả Năm</th>
              <th rowspan="2">Xếp loại Cả Năm</th>
            </tr>
            <tr>
              <th>Quý 1 (Thu)</th>
              <th>Quý 2 (Đông)</th>
              <th>Quý 3 (Xuân)</th>
              <th>Quý 4 (Hạ)</th>
            </tr>
          </thead>
          <tbody>
      `;

      list.forEach((s, idx) => {
        const q1 = s.q1Score !== null && s.q1Score !== undefined ? s.q1Score : '—';
        const q2 = s.q2Score !== null && s.q2Score !== undefined ? s.q2Score : '—';
        const q3 = s.q3Score !== null && s.q3Score !== undefined ? s.q3Score : '—';
        const q4 = s.q4Score !== null && s.q4Score !== undefined ? s.q4Score : '—';

        tableHtml += `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${s.email || ''}</td>
            <td class="font-bold">${s.fullName}</td>
            <td>${s.orgUnitName || 'Tổ Chuyên môn'}</td>
            <td>${s.title || 'Giáo viên'}</td>
            <td class="text-center">${q1}</td>
            <td class="text-center">${q2}</td>
            <td class="text-center">${q3}</td>
            <td class="text-center">${q4}</td>
            <td class="text-center font-bold" style="color: #1F3864; font-size: 11pt;">${s.avgScore || 0}</td>
            <td class="text-center font-bold">${this.getClassificationLabel(s.yearlyClassification)}</td>
          </tr>
        `;
      });

      tableHtml += `
          </tbody>
          <tfoot>
            <tr class="bg-total">
              <td colspan="5" class="text-center">TỔNG SỐ CÁN BỘ VIÊN CHỨC</td>
              <td colspan="6" class="font-bold">${list.length} người</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      const list = this.filteredStaffList();
      tableHtml += `
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã / Email</th>
              <th>Họ và tên</th>
              <th>Tổ / Đơn vị</th>
              <th>Chức danh / Vị trí</th>
              <th>Số việc theo trục (Đạt/Tổng)</th>
              <th>Tiêu chuẩn chung (Phần A / 30đ)</th>
              <th>Trục kết quả (Phần B / 70đ)</th>
              <th>Điểm thưởng (Phần C)</th>
              <th>Tổng Điểm (Thang 100đ)</th>
              <th>Xếp loại Chất lượng</th>
            </tr>
          </thead>
          <tbody>
      `;

      list.forEach((s, idx) => {
        tableHtml += `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${s.email || ''}</td>
            <td class="font-bold">${s.fullName}</td>
            <td>${s.orgUnitName || 'Tổ Chuyên môn'}</td>
            <td>${s.title || 'Giáo viên'}</td>
            <td class="text-center">${s.completedTasks}/${s.totalTasks} việc (${this.getPct(s.completedTasks, s.totalTasks)}%)</td>
            <td class="text-center">${s.scoreGeneral}</td>
            <td class="text-center">${s.scoreTask}</td>
            <td class="text-center">${s.scoreBonus > 0 ? '+' + s.scoreBonus : '0'}</td>
            <td class="text-center font-bold" style="color: #1F3864; font-size: 11pt;">${s.scoreFinal}</td>
            <td class="text-center font-bold">${this.getClassificationLabel(s.classification)}</td>
          </tr>
        `;
      });

      tableHtml += `
          </tbody>
          <tfoot>
            <tr class="bg-total">
              <td colspan="5" class="text-center">TỔNG SỐ CÁN BỘ VIÊN CHỨC</td>
              <td colspan="6" class="font-bold">${list.length} người</td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    tableHtml += `
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + tableHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = isAnnual
      ? `Tong_Ket_KPI_Ca_Nam_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xls`
      : `Bang_Tong_Hop_KPI_${(currentPeriod?.code || 'Q').replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xls`;

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast('Đã kết xuất tệp tin Excel KPI toàn trường thành công!');
  }
}
