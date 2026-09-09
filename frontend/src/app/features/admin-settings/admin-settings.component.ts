import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AdminUserItem,
  PermissionMatrixItem,
  LocationSummaryItem,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  AdminUserRole,
} from '../../core/models/admin.models';
import { LocationItem, OrgUnitItem, UserPickerItem } from '../../core/models/user.models';
import { PeoplePickerComponent } from '../../shared/components/people-picker/people-picker.component';

export type AdminTab = 'accounts' | 'roles' | 'locations' | 'teachers-by-loc';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PeoplePickerComponent],
  template: `
    <div class="admin-settings-container">
      <!-- HEADER -->
      <div class="page-header">
        <div class="header-titles">
          <div class="header-tag">
            <span class="material-symbols-outlined tag-icon">admin_panel_settings</span>
            <span>Quản trị Hệ thống</span>
          </div>
          <h1 class="page-title">Cấu hình & Quản lý Phân quyền</h1>
          <p class="page-subtitle">Quản lý danh sách tài khoản, gán quyền & phạm vi, cơ sở điểm trường và nhân sự trực thuộc.</p>
        </div>

        @if (!authService.isHieuTruong()) {
          <div class="role-warning-banner">
            <span class="material-symbols-outlined warn-icon">info</span>
            <div class="warn-content">
              <span class="warn-title">Bạn đang truy cập với vai trò: <strong>{{ authService.activeRole()?.roleTitle || 'Cán bộ' }}</strong></span>
              <span class="warn-desc">Phân hệ Quản trị & Cấu hình hệ thống yêu cầu quyền Quản trị hoặc Hiệu trưởng.</span>
            </div>
            <button type="button" class="btn-switch-principal tap-target" (click)="switchToPrincipalAccount()">
              <span class="material-symbols-outlined">stars</span>
              <span>Chuyển sang Cô Phạm Thị Nam (Hiệu trưởng)</span>
            </button>
          </div>
        }
      </div>

      <!-- 4 NAVIGATION TABS -->
      <div class="tabs-nav-bar">
        <button
          type="button"
          class="nav-tab-btn tap-target"
          [class.active]="activeTab() === 'accounts'"
          (click)="switchTab('accounts')"
        >
          <span class="material-symbols-outlined">manage_accounts</span>
          <span>Tài khoản</span>
          <span class="tab-badge">{{ totalUsers() }}</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn tap-target"
          [class.active]="activeTab() === 'roles'"
          (click)="switchTab('roles')"
        >
          <span class="material-symbols-outlined">shield_person</span>
          <span>Phân quyền</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn tap-target"
          [class.active]="activeTab() === 'locations'"
          (click)="switchTab('locations')"
        >
          <span class="material-symbols-outlined">apartment</span>
          <span>Điểm trường</span>
          <span class="tab-badge">{{ locations().length }}</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn tap-target"
          [class.active]="activeTab() === 'teachers-by-loc'"
          (click)="switchTab('teachers-by-loc')"
        >
          <span class="material-symbols-outlined">groups</span>
          <span>Giáo viên theo điểm trường</span>
        </button>
      </div>

      <!-- TOAST NOTIFICATION / ALERT -->
      @if (alertMessage()) {
        <div class="alert-banner" [ngClass]="alertType()">
          <span class="material-symbols-outlined alert-icon">
            {{ alertType() === 'success' ? 'check_circle' : 'error' }}
          </span>
          <span class="alert-text">{{ alertMessage() }}</span>
          <button type="button" class="alert-close-btn" (click)="alertMessage.set('')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      }

      <!-- ======================================================= -->
      <!-- TAB 1: QUẢN LÝ TÀI KHOẢN -->
      <!-- ======================================================= -->
      @if (activeTab() === 'accounts') {
        <div class="tab-content-panel">
          <!-- SEARCH & FILTER BAR -->
          <div class="filter-controls-card">
            <div class="filter-top-row">
              <div class="search-input-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  placeholder="Tìm theo họ tên, SĐT, email..."
                  [(ngModel)]="searchKeyword"
                  (ngModelChange)="onSearchChange()"
                  class="search-input"
                />
                @if (searchKeyword) {
                  <button type="button" class="clear-input-btn" (click)="searchKeyword = ''; onSearchChange()">
                    <span class="material-symbols-outlined">cancel</span>
                  </button>
                }
              </div>

              <button type="button" class="btn-primary create-user-btn tap-target" (click)="openCreateUserModal()">
                <span class="material-symbols-outlined">person_add</span>
                <span>+ Tạo tài khoản mới</span>
              </button>
            </div>

            <!-- FILTER CHIPS ROW -->
            <div class="filter-chips-row">
              <span class="filter-label">Bộ lọc:</span>

              <!-- Filter Location -->
              <select [(ngModel)]="filterLocationId" (change)="loadUsers()" class="filter-select">
                <option value="">Tất cả Điểm trường</option>
                @for (loc of locations(); track loc.id) {
                  <option [value]="loc.id">{{ loc.name }}</option>
                }
              </select>

              <!-- Filter Org Unit -->
              <select [(ngModel)]="filterOrgUnitId" (change)="loadUsers()" class="filter-select">
                <option value="">Tất cả Tổ / Khối</option>
                @for (org of orgUnits(); track org.id) {
                  <option [value]="org.id">{{ org.name }}</option>
                }
              </select>

              <!-- Filter Role -->
              <select [(ngModel)]="filterRole" (change)="loadUsers()" class="filter-select">
                <option value="">Tất cả Vai trò</option>
                <option value="HIEU_TRUONG">Hiệu trưởng</option>
                <option value="PHO_HIEU_TRUONG">Phó Hiệu trưởng</option>
                <option value="TO_TRUONG">Tổ trưởng</option>
                <option value="GIAO_VIEN">Giáo viên</option>
                <option value="NHAN_VIEN">Nhân viên</option>
                <option value="ADMIN">Quản trị hệ thống</option>
              </select>

              <!-- Filter Status -->
              <div class="status-toggle-chips">
                <button
                  type="button"
                  class="chip-btn"
                  [class.active]="filterStatus === 'all'"
                  (click)="setStatusFilter('all')"
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  class="chip-btn active-state"
                  [class.active]="filterStatus === 'active'"
                  (click)="setStatusFilter('active')"
                >
                  <span class="dot green"></span>
                  <span>Đang hoạt động</span>
                </button>
                <button
                  type="button"
                  class="chip-btn locked-state"
                  [class.active]="filterStatus === 'locked'"
                  (click)="setStatusFilter('locked')"
                >
                  <span class="dot red"></span>
                  <span>Đã khoá</span>
                </button>
              </div>
            </div>
          </div>

          <!-- USERS LIST -->
          @if (isLoadingUsers()) {
            <div class="skeleton-list">
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
            </div>
          } @else if (usersList().length === 0) {
            <div class="empty-state-box">
              <span class="material-symbols-outlined empty-icon">person_search</span>
              <h3>Không tìm thấy tài khoản phù hợp</h3>
              <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc.</p>
            </div>
          } @else {
            <!-- DESKTOP TABLE VIEW -->
            <div class="desktop-table-wrapper hide-on-mobile">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Họ và tên</th>
                    <th>Số điện thoại</th>
                    <th>Điểm trường</th>
                    <th>Tổ / Bộ phận</th>
                    <th>Vai trò gán</th>
                    <th>Trạng thái</th>
                    <th class="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of usersList(); track user.id) {
                    <tr [class.row-locked]="!user.isActive">
                      <td>
                        <div class="user-cell">
                          <img [src]="user.avatarUrl" [alt]="user.fullName" class="table-avatar" />
                          <div class="user-meta">
                            <span class="user-fullname">{{ user.fullName }}</span>
                            <span class="user-sub">{{ user.title || user.email }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <a [href]="'tel:' + user.phone" class="phone-link" title="Gọi điện">
                          <span class="material-symbols-outlined phone-icon">call</span>
                          <span>{{ user.phone }}</span>
                        </a>
                      </td>
                      <td>
                        <span class="loc-tag">{{ user.primaryLocation?.name || '—' }}</span>
                      </td>
                      <td>
                        <span class="org-tag">{{ user.primaryOrgUnit?.name || '—' }}</span>
                      </td>
                      <td>
                        <div class="roles-chips-cell">
                          @for (r of user.roles; track r.id) {
                            <span class="role-micro-chip" [ngClass]="'role-' + r.role.toLowerCase()">
                              {{ getRoleLabel(r.role) }}
                            </span>
                          }
                        </div>
                      </td>
                      <td>
                        @if (user.isActive) {
                          <span class="status-pill status-active">
                            <span class="dot"></span>
                            <span>Hoạt động</span>
                          </span>
                        } @else {
                          <span class="status-pill status-locked">
                            <span class="dot"></span>
                            <span>Đã khoá</span>
                          </span>
                        }
                      </td>
                      <td class="text-right">
                        <div class="row-actions">
                          <button
                            type="button"
                            class="action-icon-btn"
                            (click)="openEditUserModal(user)"
                            title="Sửa thông tin"
                          >
                            <span class="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            type="button"
                            class="action-icon-btn"
                            [class.btn-unlock]="!user.isActive"
                            [class.btn-lock]="user.isActive"
                            (click)="confirmToggleStatus(user)"
                            [title]="user.isActive ? 'Khoá tài khoản' : 'Mở khoá tài khoản'"
                          >
                            <span class="material-symbols-outlined">
                              {{ user.isActive ? 'lock' : 'lock_open' }}
                            </span>
                          </button>
                          <button
                            type="button"
                            class="action-icon-btn"
                            (click)="confirmResetPassword(user)"
                            title="Đặt lại mật khẩu về 123456"
                          >
                            <span class="material-symbols-outlined">key</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- MOBILE CARDS VIEW -->
            <div class="mobile-cards-list hide-on-desktop">
              @for (user of usersList(); track user.id) {
                <div class="user-card-item" [class.card-locked]="!user.isActive">
                  <div class="card-header">
                    <img [src]="user.avatarUrl" [alt]="user.fullName" class="card-avatar" />
                    <div class="card-title-box">
                      <span class="card-name">{{ user.fullName }}</span>
                      <span class="card-title-sub">{{ user.title || 'Chưa cập nhật chức vụ' }}</span>
                    </div>
                    <div class="card-status-pill">
                      @if (user.isActive) {
                        <span class="status-pill status-active">Hoạt động</span>
                      } @else {
                        <span class="status-pill status-locked">Đã khoá</span>
                      }
                    </div>
                  </div>

                  <div class="card-body-details">
                    <div class="detail-row">
                      <span class="label">SĐT:</span>
                      <a [href]="'tel:' + user.phone" class="phone-link">
                        <span class="material-symbols-outlined">call</span>
                        <span>{{ user.phone }}</span>
                      </a>
                    </div>
                    <div class="detail-row">
                      <span class="label">Email:</span>
                      <span class="val">{{ user.email }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Điểm trường:</span>
                      <span class="val loc-tag">{{ user.primaryLocation?.name || '—' }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Tổ:</span>
                      <span class="val org-tag">{{ user.primaryOrgUnit?.name || '—' }}</span>
                    </div>
                    <div class="detail-row roles-row">
                      <span class="label">Vai trò:</span>
                      <div class="roles-chips-cell">
                        @for (r of user.roles; track r.id) {
                          <span class="role-micro-chip" [ngClass]="'role-' + r.role.toLowerCase()">
                            {{ getRoleLabel(r.role) }}
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="card-footer-actions">
                    <button type="button" class="btn-card-action tap-target" (click)="openEditUserModal(user)">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      class="btn-card-action tap-target"
                      (click)="confirmToggleStatus(user)"
                    >
                      <span class="material-symbols-outlined">{{ user.isActive ? 'lock' : 'lock_open' }}</span>
                      <span>{{ user.isActive ? 'Khoá' : 'Mở khoá' }}</span>
                    </button>
                    <button type="button" class="btn-card-action tap-target" (click)="confirmResetPassword(user)">
                      <span class="material-symbols-outlined">key</span>
                      <span>Reset Pass</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ======================================================= -->
      <!-- TAB 2: CẤU HÌNH PHÂN QUYỀN (ROLES & MATRIX) -->
      <!-- ======================================================= -->
      @if (activeTab() === 'roles') {
        <div class="tab-content-panel roles-panel">
          <!-- TOP: SELECT USER & MANAGE ROLES -->
          <div class="roles-management-card">
            <div class="section-title-box">
              <span class="material-symbols-outlined title-icon">badge</span>
              <div class="title-meta">
                <h2>1. Gán vai trò & Phạm vi phụ trách cho từng nhân sự</h2>
                <p>Chọn một cán bộ/giáo viên để xem và bổ sung hoặc gỡ vai trò công tác.</p>
              </div>
            </div>

            <!-- Single People Picker to select User -->
            <div class="user-picker-wrapper">
              <app-people-picker
                label="Chọn tài khoản nhân sự"
                mode="single"
                [required]="false"
                (userSelected)="onRoleTargetUserSelected($event)"
              ></app-people-picker>
            </div>

            <!-- Selected User's Roles Details -->
            @if (selectedRoleUser()) {
              <div class="user-roles-detail-box">
                <div class="user-profile-bar">
                  <img [src]="selectedRoleUser()?.avatarUrl" class="profile-avatar" />
                  <div class="profile-info">
                    <span class="profile-name">{{ selectedRoleUser()?.fullName }}</span>
                    <span class="profile-sub">{{ selectedRoleUser()?.title }} • {{ selectedRoleUser()?.email }}</span>
                  </div>
                  <button type="button" class="btn-primary add-role-btn tap-target" (click)="openAddRoleModal()">
                    <span class="material-symbols-outlined">add_moderator</span>
                    <span>+ Thêm vai trò mới</span>
                  </button>
                </div>

                <!-- Roles List as Prominent Chips -->
                <div class="assigned-roles-list">
                  <span class="roles-header-label">Các vai trò & phạm vi đang áp dụng:</span>
                  @if (selectedRoleUser()?.roles?.length === 0) {
                    <p class="no-roles-msg">Tài khoản này chưa có vai trò nào được gán.</p>
                  } @else {
                    <div class="large-roles-grid">
                      @for (r of selectedRoleUser()?.roles; track r.id) {
                        <div class="large-role-card" [ngClass]="'role-' + r.role.toLowerCase()">
                          <div class="role-icon-box">
                            <span class="material-symbols-outlined">{{ getRoleIconName(r.role) }}</span>
                          </div>
                          <div class="role-details">
                            <span class="role-title-text">{{ getRoleLabel(r.role) }}</span>
                            <span class="role-scope-text">
                              Phạm vi: {{ getScopeDescription(r) }}
                            </span>
                          </div>
                          <button
                            type="button"
                            class="remove-role-btn tap-target"
                            (click)="confirmRemoveRole(r)"
                            title="Gỡ vai trò này"
                          >
                            <span class="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="picker-placeholder-box">
                <span class="material-symbols-outlined">touch_app</span>
                <p>Vui lòng tìm và chọn 1 người dùng ở ô trên để xem và cấu hình phân quyền.</p>
              </div>
            }
          </div>

          <!-- BOTTOM: STATIC PERMISSION MATRIX TABLE -->
          <div class="permissions-matrix-card">
            <div class="section-title-box">
              <span class="material-symbols-outlined title-icon">grid_view</span>
              <div class="title-meta">
                <h2>2. Bảng tham chiếu Ma trận Phân quyền hệ thống</h2>
                <p class="note-text">
                  ℹ️ <em>Bản demo dùng phân quyền cố định theo 6 vai trò chuẩn trong SRS mục 3, chưa hỗ trợ tuỳ biến từng quyền riêng lẻ.</em>
                </p>
              </div>
            </div>

            <div class="matrix-cards-grid">
              @for (item of permissionsMatrix(); track item.role) {
                <div class="matrix-card">
                  <div class="matrix-header" [ngClass]="'role-' + item.role.toLowerCase()">
                    <span class="material-symbols-outlined matrix-role-icon">{{ getRoleIconName(item.role) }}</span>
                    <div class="matrix-header-info">
                      <span class="matrix-role-name">{{ item.roleName }}</span>
                      <span class="matrix-scope">{{ item.scope }}</span>
                    </div>
                  </div>

                  <p class="matrix-desc">{{ item.description }}</p>

                  <div class="capabilities-list">
                    @for (cap of item.capabilities; track cap.category) {
                      <div class="cap-group">
                        <span class="cap-category-title">📌 {{ cap.category }}</span>
                        <ul class="cap-items">
                          @for (detail of cap.details; track detail) {
                            <li>{{ detail }}</li>
                          }
                        </ul>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- TAB 3: QUẢN LÝ ĐIỂM TRƯỜNG -->
      <!-- ======================================================= -->
      @if (activeTab() === 'locations') {
        <div class="tab-content-panel">
          <div class="locations-top-bar">
            <div class="summary-meta-text">
              <h2>Danh sách Cơ sở & Điểm trường ({{ locationsSummary().length }})</h2>
              <p>Tổng quan tình hình nhân sự và công việc triển khai tại từng điểm trường.</p>
            </div>
            <button type="button" class="btn-primary tap-target" (click)="openCreateLocationModal()">
              <span class="material-symbols-outlined">add_business</span>
              <span>+ Thêm điểm trường mới</span>
            </button>
          </div>

          <!-- LOCATIONS CARDS GRID -->
          @if (isLoadingLocations()) {
            <div class="skeleton-list">
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
            </div>
          } @else {
            <div class="locations-grid">
              @for (loc of locationsSummary(); track loc.id) {
                <div class="location-card" [class.main-campus]="loc.isMain">
                  <div class="loc-card-header">
                    <div class="loc-badge-group">
                      @if (loc.isMain) {
                        <span class="main-tag">⭐ Điểm trường chính</span>
                      } @else {
                        <span class="sub-tag">Phân hiệu</span>
                      }
                      <span class="code-tag">{{ loc.code }}</span>
                    </div>
                    <h3 class="loc-name">{{ loc.name }}</h3>
                    <p class="loc-address">
                      <span class="material-symbols-outlined loc-icon">location_on</span>
                      <span>{{ loc.address || 'Chưa cập nhật địa chỉ' }}</span>
                    </p>
                    @if (loc.phone) {
                      <p class="loc-phone">
                        <span class="material-symbols-outlined loc-icon">call</span>
                        <a [href]="'tel:' + loc.phone">{{ loc.phone }}</a>
                      </p>
                    }
                  </div>

                  <!-- Manager Box -->
                  <div class="manager-box">
                    <span class="manager-label">Người phụ trách cơ sở:</span>
                    @if (loc.manager) {
                      <div class="manager-info">
                        <img [src]="loc.manager.avatarUrl || 'https://ui-avatars.com/api/?name=' + loc.manager.fullName" class="mgr-avatar" />
                        <div class="mgr-meta">
                          <span class="mgr-name">{{ loc.manager.fullName }}</span>
                          <span class="mgr-sub">{{ loc.manager.phone }} • {{ loc.manager.title || 'Phụ trách' }}</span>
                        </div>
                      </div>
                    } @else {
                      <span class="no-manager-text">Chưa chỉ định người phụ trách</span>
                    }
                  </div>

                  <!-- Metrics Row -->
                  <div class="loc-metrics-row">
                    <div class="metric-item">
                      <span class="metric-num">{{ loc.userCount }}</span>
                      <span class="metric-lbl">👥 Nhân sự</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-num in-progress">{{ loc.inProgressTaskCount }}</span>
                      <span class="metric-lbl">⏳ Đang làm</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-num overdue">{{ loc.overdueTaskCount }}</span>
                      <span class="metric-lbl">⚠️ Quá hạn</span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="loc-card-actions">
                    <button type="button" class="btn-card-action tap-target" (click)="openEditLocationModal(loc)">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      class="btn-card-action btn-danger tap-target"
                      [disabled]="loc.userCount > 0 || loc.totalTaskCount > 0"
                      [title]="loc.userCount > 0 || loc.totalTaskCount > 0 ? ('Không thể xoá vì đang có ' + loc.userCount + ' nhân sự và ' + loc.totalTaskCount + ' công việc') : 'Xoá điểm trường này'"
                      (click)="confirmDeleteLocation(loc)"
                    >
                      <span class="material-symbols-outlined">delete</span>
                      <span>Xoá</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ======================================================= -->
      <!-- TAB 4: GIÁO VIÊN THEO ĐIỂM TRƯỜNG -->
      <!-- ======================================================= -->
      @if (activeTab() === 'teachers-by-loc') {
        <div class="tab-content-panel">
          <!-- TOP SELECTOR & ACTIONS -->
          <div class="teachers-by-loc-header">
            <div class="loc-selector-box">
              <label class="loc-dropdown-label">Chọn Điểm trường đang xem:</label>
              <select
                [(ngModel)]="selectedCampusId"
                (change)="loadCampusTeachers()"
                class="campus-select-dropdown"
              >
                @for (loc of locations(); track loc.id) {
                  <option [value]="loc.id">🏫 {{ loc.name }} ({{ loc.code }})</option>
                }
              </select>
            </div>

            <div class="header-right-actions">
              <div class="search-input-box small">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  placeholder="Lọc nhanh họ tên giáo viên..."
                  [(ngModel)]="campusSearchKeyword"
                  class="search-input"
                />
              </div>

              <button type="button" class="btn-primary tap-target" (click)="openAddTeacherToCampusModal()">
                <span class="material-symbols-outlined">person_add</span>
                <span>+ Thêm giáo viên vào điểm trường</span>
              </button>
            </div>
          </div>

          <!-- TEACHERS TABLE & CARDS -->
          @if (isLoadingCampusTeachers()) {
            <div class="skeleton-list">
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
            </div>
          } @else if (filteredCampusTeachers().length === 0) {
            <div class="empty-state-box">
              <span class="material-symbols-outlined empty-icon">school</span>
              <h3>Chưa có giáo viên nào tại điểm trường này</h3>
              <p>Bấm nút "+ Thêm giáo viên vào điểm trường" để điều chuyển hoặc tạo mới.</p>
            </div>
          } @else {
            <div class="desktop-table-wrapper hide-on-mobile">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Giáo viên / Nhân sự</th>
                    <th>Tổ chuyên môn</th>
                    <th>Chức vụ</th>
                    <th>Số điện thoại</th>
                    <th>Việc đang xử lý</th>
                    <th class="text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  @for (teacher of filteredCampusTeachers(); track teacher.id) {
                    <tr>
                      <td>
                        <div class="user-cell">
                          <img [src]="teacher.avatarUrl" [alt]="teacher.fullName" class="table-avatar" />
                          <div class="user-meta">
                            <span class="user-fullname">{{ teacher.fullName }}</span>
                            <span class="user-sub">{{ teacher.email }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="org-tag">{{ teacher.primaryOrgUnit?.name || '—' }}</span>
                      </td>
                      <td>{{ teacher.title || '—' }}</td>
                      <td>
                        <a [href]="'tel:' + teacher.phone" class="phone-link">
                          <span class="material-symbols-outlined phone-icon">call</span>
                          <span>{{ teacher.phone }}</span>
                        </a>
                      </td>
                      <td>
                        <span class="workload-tag" [ngClass]="getWorkloadClass(teacher.currentTaskLoad)">
                          {{ teacher.currentTaskLoad }} việc
                        </span>
                      </td>
                      <td class="text-right">
                        <button
                          type="button"
                          class="btn-transfer-loc tap-target"
                          (click)="openTransferCampusModal(teacher)"
                          title="Chuyển sang điểm trường khác"
                        >
                          <span class="material-symbols-outlined">swap_horiz</span>
                          <span>Chuyển điểm trường</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="mobile-cards-list hide-on-desktop">
              @for (teacher of filteredCampusTeachers(); track teacher.id) {
                <div class="user-card-item">
                  <div class="card-header">
                    <img [src]="teacher.avatarUrl" [alt]="teacher.fullName" class="card-avatar" />
                    <div class="card-title-box">
                      <span class="card-name">{{ teacher.fullName }}</span>
                      <span class="card-title-sub">{{ teacher.title || teacher.primaryOrgUnit?.name }}</span>
                    </div>
                  </div>
                  <div class="card-body-details">
                    <div class="detail-row">
                      <span class="label">SĐT:</span>
                      <a [href]="'tel:' + teacher.phone" class="phone-link">
                        <span class="material-symbols-outlined">call</span>
                        <span>{{ teacher.phone }}</span>
                      </a>
                    </div>
                    <div class="detail-row">
                      <span class="label">Tổ:</span>
                      <span class="val org-tag">{{ teacher.primaryOrgUnit?.name || '—' }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Tải việc:</span>
                      <span class="workload-tag" [ngClass]="getWorkloadClass(teacher.currentTaskLoad)">
                        {{ teacher.currentTaskLoad }} việc đang làm
                      </span>
                    </div>
                  </div>
                  <div class="card-footer-actions">
                    <button type="button" class="btn-card-action tap-target" (click)="openTransferCampusModal(teacher)">
                      <span class="material-symbols-outlined">swap_horiz</span>
                      <span>Chuyển điểm trường</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 1: TẠO MỚI TÀI KHOẢN -->
      <!-- ======================================================= -->
      @if (showCreateUserModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Tạo mới Tài khoản Nhân sự</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Họ và tên <span class="req">*</span></label>
                <input type="text" [(ngModel)]="newUserForm.fullName" placeholder="Ví dụ: Nguyễn Văn A" class="form-input" />
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Số điện thoại <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="newUserForm.phone" placeholder="0901234567" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Email <span class="req">*</span></label>
                  <input type="email" [(ngModel)]="newUserForm.email" placeholder="nguyenvana@phuoctan.edu.vn" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label>Chức vụ / Môn giảng dạy</label>
                <input type="text" [(ngModel)]="newUserForm.position" placeholder="Ví dụ: Giáo viên Toán" class="form-input" />
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Điểm trường trực thuộc</label>
                  <select [(ngModel)]="newUserForm.locationId" class="form-select">
                    <option [ngValue]="null">-- Chọn Điểm trường --</option>
                    @for (loc of locations(); track loc.id) {
                      <option [value]="loc.id">{{ loc.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Tổ chuyên môn / Phòng ban</label>
                  <select [(ngModel)]="newUserForm.orgUnitId" class="form-select">
                    <option [ngValue]="null">-- Chọn Tổ chuyên môn --</option>
                    @for (org of orgUnits(); track org.id) {
                      <option [value]="org.id">{{ org.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Vai trò ban đầu</label>
                <select [(ngModel)]="newUserInitialRole" class="form-select">
                  <option value="GIAO_VIEN">Giáo viên</option>
                  <option value="TO_TRUONG">Tổ trưởng</option>
                  <option value="PHO_HIEU_TRUONG">Phó Hiệu trưởng</option>
                  <option value="NHAN_VIEN">Nhân viên / Hành chính</option>
                  <option value="HIEU_TRUONG">Hiệu trưởng</option>
                  <option value="ADMIN">Quản trị hệ thống</option>
                </select>
              </div>

              <div class="modal-info-box">
                <span class="material-symbols-outlined">info</span>
                <span>Mật khẩu khởi tạo mặc định là <strong>123456</strong>. Tài khoản có thể đổi mật khẩu sau khi đăng nhập.</span>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button type="button" class="btn-primary tap-target" [disabled]="isSubmitting()" (click)="submitCreateUser()">
                {{ isSubmitting() ? 'Đang tạo...' : 'Tạo tài khoản' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 2: SỬA THÔNG TIN TÀI KHOẢN -->
      <!-- ======================================================= -->
      @if (showEditUserModal() && editingUser()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Sửa thông tin Tài khoản</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Họ và tên <span class="req">*</span></label>
                <input type="text" [(ngModel)]="editUserForm.fullName" class="form-input" />
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Số điện thoại <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="editUserForm.phone" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Email <span class="req">*</span></label>
                  <input type="email" [(ngModel)]="editUserForm.email" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label>Chức vụ / Môn giảng dạy</label>
                <input type="text" [(ngModel)]="editUserForm.position" class="form-input" />
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Điểm trường trực thuộc</label>
                  <select [(ngModel)]="editUserForm.locationId" class="form-select">
                    <option [ngValue]="null">-- Chọn Điểm trường --</option>
                    @for (loc of locations(); track loc.id) {
                      <option [value]="loc.id">{{ loc.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Tổ chuyên môn / Phòng ban</label>
                  <select [(ngModel)]="editUserForm.orgUnitId" class="form-select">
                    <option [ngValue]="null">-- Chọn Tổ chuyên môn --</option>
                    @for (org of orgUnits(); track org.id) {
                      <option [value]="org.id">{{ org.name }}</option>
                    }
                  </select>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button type="button" class="btn-primary tap-target" [disabled]="isSubmitting()" (click)="submitEditUser()">
                {{ isSubmitting() ? 'Đang lưu...' : 'Lưu thay đổi' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 3: THÊM VAI TRÒ MỚI (TAB 2) -->
      <!-- ======================================================= -->
      @if (showAddRoleModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Gán vai trò mới cho {{ selectedRoleUser()?.fullName }}</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Chọn Vai trò <span class="req">*</span></label>
                <select [(ngModel)]="newRoleData.role" class="form-select">
                  <option value="HIEU_TRUONG">Hiệu trưởng</option>
                  <option value="PHO_HIEU_TRUONG">Phó Hiệu trưởng</option>
                  <option value="TO_TRUONG">Tổ trưởng</option>
                  <option value="GIAO_VIEN">Giáo viên</option>
                  <option value="NHAN_VIEN">Nhân viên / Hành chính</option>
                  <option value="ADMIN">Quản trị hệ thống</option>
                </select>
              </div>

              <div class="form-group">
                <label>Phạm vi Điểm trường (Tùy chọn)</label>
                <select [(ngModel)]="newRoleData.scopeLocationId" class="form-select">
                  <option [ngValue]="null">Toàn trường / Không giới hạn</option>
                  @for (loc of locations(); track loc.id) {
                    <option [value]="loc.id">{{ loc.name }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Phạm vi Tổ chuyên môn (Tùy chọn)</label>
                <select [(ngModel)]="newRoleData.scopeOrgUnitId" class="form-select">
                  <option [ngValue]="null">Tất cả tổ / Không giới hạn</option>
                  @for (org of orgUnits(); track org.id) {
                    <option [value]="org.id">{{ org.name }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button type="button" class="btn-primary tap-target" [disabled]="isSubmitting()" (click)="submitAddRole()">
                {{ isSubmitting() ? 'Đang thêm...' : 'Gán vai trò' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 4: TẠO / SỬA ĐIỂM TRƯỜNG -->
      <!-- ======================================================= -->
      @if (showLocationModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingLocationId ? 'Sửa Điểm trường' : 'Tạo mới Điểm trường' }}</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Tên điểm trường <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="locationForm.name" placeholder="Ví dụ: Phân hiệu 3 (Suối Cả)" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Mã điểm trường <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="locationForm.code" placeholder="PHAN_HIEU_3" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label>Địa chỉ</label>
                <input type="text" [(ngModel)]="locationForm.address" placeholder="Địa chỉ cơ sở..." class="form-input" />
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Số điện thoại liên hệ</label>
                  <input type="text" [(ngModel)]="locationForm.phone" placeholder="0251.3..." class="form-input" />
                </div>
                <div class="form-group checkbox-group">
                  <label class="custom-checkbox">
                    <input type="checkbox" [(ngModel)]="locationForm.isMain" />
                    <span>Là Điểm trường chính (Trung tâm)</span>
                  </label>
                </div>
              </div>

              <!-- Manager Selector using PeoplePicker -->
              <div class="form-group">
                <app-people-picker
                  label="Chỉ định Người phụ trách cơ sở"
                  mode="single"
                  [required]="false"
                  (userSelected)="onLocationManagerSelected($event)"
                ></app-people-picker>
                @if (selectedLocationManagerName) {
                  <p class="current-manager-selected">
                    Đang chọn: <strong>{{ selectedLocationManagerName }}</strong>
                    <button type="button" class="btn-clear-mgr" (click)="locationForm.managerId = null; selectedLocationManagerName = ''">Bỏ chọn</button>
                  </p>
                }
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button type="button" class="btn-primary tap-target" [disabled]="isSubmitting()" (click)="submitLocationForm()">
                {{ isSubmitting() ? 'Đang lưu...' : (editingLocationId ? 'Cập nhật' : 'Tạo điểm trường') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 5: CHUYỂN ĐIỂM TRƯỜNG CHO GIÁO VIÊN -->
      <!-- ======================================================= -->
      @if (showTransferModal() && transferTargetTeacher()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Chuyển Điểm trường công tác</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <p class="transfer-teacher-msg">
                Bạn đang thực hiện điều chuyển nhân sự: <strong>{{ transferTargetTeacher()?.fullName }}</strong> ({{ transferTargetTeacher()?.title }}).
              </p>

              <div class="form-group">
                <label>Chọn Điểm trường tiếp nhận <span class="req">*</span></label>
                <select [(ngModel)]="targetDestinationCampusId" class="form-select">
                  @for (loc of locations(); track loc.id) {
                    <option [value]="loc.id">{{ loc.name }} ({{ loc.code }})</option>
                  }
                </select>
              </div>

              <div class="modal-warning-box">
                <span class="material-symbols-outlined">warning</span>
                <div>
                  <strong>Lưu ý:</strong> Nhân sự này đang có <strong>{{ transferTargetTeacher()?.currentTaskLoad }}</strong> công việc đang xử lý. Việc điều chuyển sẽ thay đổi phạm vi điểm trường chính của giáo viên.
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button type="button" class="btn-primary tap-target" [disabled]="isSubmitting()" (click)="submitTransferCampus()">
                {{ isSubmitting() ? 'Đang chuyển...' : 'Xác nhận chuyển' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 6: THÊM GIÁO VIÊN VÀO ĐIỂM TRƯỜNG (CHỌN CÁCH THỰC HIỆN) -->
      <!-- ======================================================= -->
      @if (showAddTeacherChoiceModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Thêm Giáo viên vào Điểm trường</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="choice-cards-grid">
                <div class="choice-card tap-target" (click)="selectAddTeacherMode('new')">
                  <span class="material-symbols-outlined choice-icon">person_add</span>
                  <div class="choice-text">
                    <h4>Tạo tài khoản mới</h4>
                    <p>Tạo một giáo viên mới và gán trực tiếp vào điểm trường hiện tại.</p>
                  </div>
                </div>

                <div class="choice-card tap-target" (click)="selectAddTeacherMode('transfer')">
                  <span class="material-symbols-outlined choice-icon">move_down</span>
                  <div class="choice-text">
                    <h4>Chuyển từ điểm trường khác</h4>
                    <p>Chọn giáo viên sẵn có từ điểm trường khác để điều chuyển sang đây.</p>
                  </div>
                </div>
              </div>

              @if (transferPickerMode()) {
                <div class="transfer-picker-section">
                  <hr class="divider" />
                  <app-people-picker
                    label="Chọn giáo viên cần chuyển sang điểm trường này"
                    mode="single"
                    (userSelected)="onTeacherToTransferSelected($event)"
                  ></app-people-picker>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Đóng</button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 7: THÔNG BÁO TẠO USER THÀNH CÔNG (KÈM PASS 123456) -->
      <!-- ======================================================= -->
      @if (createdUserSuccessInfo()) {
        <div class="modal-backdrop" (click)="createdUserSuccessInfo.set(null)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header success-header">
              <span class="material-symbols-outlined success-icon">check_circle</span>
              <h3>Tạo tài khoản thành công!</h3>
              <button type="button" class="modal-close-btn" (click)="createdUserSuccessInfo.set(null)">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <p>Tài khoản cho giáo viên đã sẵn sàng để đăng nhập vào hệ thống TN EDU.</p>
              <div class="created-account-card">
                <div class="acc-row">
                  <span class="acc-lbl">Họ tên:</span>
                  <span class="acc-val">{{ createdUserSuccessInfo()?.fullName }}</span>
                </div>
                <div class="acc-row">
                  <span class="acc-lbl">SĐT đăng nhập:</span>
                  <span class="acc-val highlight">{{ createdUserSuccessInfo()?.phone }}</span>
                </div>
                <div class="acc-row">
                  <span class="acc-lbl">Email:</span>
                  <span class="acc-val">{{ createdUserSuccessInfo()?.email }}</span>
                </div>
                <div class="acc-row">
                  <span class="acc-lbl">Mật khẩu mặc định:</span>
                  <span class="acc-val pass-badge">123456</span>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-primary tap-target" (click)="copyAccountInfo()">
                <span class="material-symbols-outlined">content_copy</span>
                <span>{{ copiedText() ? 'Đã sao chép!' : 'Sao chép thông tin gửi GV' }}</span>
              </button>
              <button type="button" class="btn-cancel tap-target" (click)="createdUserSuccessInfo.set(null)">Đóng</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .admin-settings-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* HEADER */
      .page-header {
        .header-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #EFF6FF;
          color: #1D4ED8;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 8px;

          .tag-icon {
            font-size: 16px;
          }
        }

        .page-title {
          font-size: 1.65rem;
          font-weight: 800;
          color: #1E293B;
          margin: 0 0 6px 0;
        }

        .page-subtitle {
          font-size: 0.92rem;
          color: #64748B;
          margin: 0;
        }

        .role-warning-banner {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          background: #FFFBEB;
          border: 1px solid #FDE68A;
          padding: 12px 16px;
          border-radius: 10px;

          .warn-icon {
            font-size: 22px;
            color: #D97706;
          }

          .warn-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;

            .warn-title {
              font-size: 0.88rem;
              color: #92400E;
              strong { font-weight: 700; color: #78350F; }
            }
            .warn-desc {
              font-size: 0.78rem;
              color: #B45309;
            }
          }

          .btn-switch-principal {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.15s;

            &:hover {
              background: #16294A;
            }
          }
        }
      }

      /* TABS NAVIGATION */
      .tabs-nav-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #F1F5F9;
        padding: 6px;
        border-radius: 12px;
        overflow-x: auto;
        scrollbar-width: none;

        .nav-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;

          .material-symbols-outlined {
            font-size: 18px;
          }

          .tab-badge {
            background: #E2E8F0;
            color: #334155;
            font-size: 0.72rem;
            padding: 2px 7px;
            border-radius: 9999px;
            font-weight: 700;
          }

          &:hover {
            color: #1E293B;
            background: #E2E8F0;
          }

          &.active {
            background: #FFFFFF;
            color: #1D4ED8;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

            .tab-badge {
              background: #DBEAFE;
              color: #1D4ED8;
            }
          }
        }
      }

      /* ALERT BANNER */
      .alert-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 10px;
        font-size: 0.9rem;

        &.success {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }

        &.error {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }

        .alert-icon {
          font-size: 20px;
        }

        .alert-text {
          flex: 1;
          font-weight: 500;
        }

        .alert-close-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: inherit;
          display: flex;
        }
      }

      /* PANEL CARD */
      .tab-content-panel {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* FILTER CONTROLS CARD */
      .filter-controls-card {
        background: #FFFFFF;
        padding: 18px;
        border-radius: 14px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        display: flex;
        flex-direction: column;
        gap: 14px;

        .filter-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .search-input-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #F8FAFC;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          padding: 8px 14px;
          transition: border-color 0.2s ease;

          &:focus-within {
            border-color: #2563EB;
            background: #FFFFFF;
          }

          .search-icon {
            font-size: 20px;
            color: #94A3B8;
          }

          .search-input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: 0.92rem;
            color: #1E293B;
            outline: none;
          }

          .clear-input-btn {
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            display: flex;
          }

          &.small {
            max-width: 320px;
          }
        }

        .filter-chips-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;

          .filter-label {
            font-size: 0.82rem;
            font-weight: 700;
            color: #64748B;
          }

          .filter-select {
            padding: 6px 12px;
            border-radius: 8px;
            border: 1px solid #CBD5E1;
            background: #FFFFFF;
            font-size: 0.84rem;
            color: #334155;
            outline: none;
            cursor: pointer;
          }

          .status-toggle-chips {
            display: flex;
            align-items: center;
            gap: 6px;

            .chip-btn {
              padding: 5px 12px;
              border-radius: 9999px;
              border: 1px solid #E2E8F0;
              background: #F8FAFC;
              font-size: 0.8rem;
              font-weight: 600;
              color: #475569;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              transition: all 0.15s ease;

              .dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;

                &.green {
                  background: #10B981;
                }
                &.red {
                  background: #EF4444;
                }
              }

              &.active {
                background: #1E293B;
                color: #FFFFFF;
                border-color: #1E293B;

                &.active-state {
                  background: #059669;
                  border-color: #059669;
                }

                &.locked-state {
                  background: #DC2626;
                  border-color: #DC2626;
                }
              }
            }
          }
        }
      }

      /* BUTTONS */
      .btn-primary {
        background: #1D4ED8;
        color: #FFFFFF;
        border: none;
        border-radius: 10px;
        padding: 9px 18px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;

        &:hover {
          background: #1E40AF;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .btn-cancel {
        background: #F1F5F9;
        color: #475569;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 9px 18px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;

        &:hover {
          background: #E2E8F0;
        }
      }

      /* TABLE STYLING */
      .desktop-table-wrapper {
        background: #FFFFFF;
        border-radius: 14px;
        border: 1px solid #E2E8F0;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .admin-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;

        th {
          background: #F8FAFC;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 12px 16px;
          border-bottom: 1.5px solid #E2E8F0;
        }

        td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 0.88rem;
          color: #1E293B;
          vertical-align: middle;
        }

        tr.row-locked td {
          background: #FFFBFB;
          opacity: 0.75;
        }

        .text-right {
          text-align: right;
        }
      }

      .user-cell {
        display: flex;
        align-items: center;
        gap: 12px;

        .table-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-meta {
          display: flex;
          flex-direction: column;

          .user-fullname {
            font-weight: 700;
            color: #0F172A;
          }

          .user-sub {
            font-size: 0.78rem;
            color: #64748B;
          }
        }
      }

      .phone-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #2563EB;
        font-weight: 600;
        text-decoration: none;

        .phone-icon {
          font-size: 16px;
        }

        &:hover {
          text-decoration: underline;
        }
      }

      .loc-tag,
      .org-tag {
        display: inline-block;
        font-size: 0.82rem;
        color: #334155;
        font-weight: 500;
      }

      .roles-chips-cell {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .role-micro-chip {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 9999px;
        background: #F1F5F9;
        color: #475569;

        &.role-hieu_truong {
          background: #EFF6FF;
          color: #1D4ED8;
        }
        &.role-pho_hieu_truong {
          background: #F0FDF4;
          color: #15803D;
        }
        &.role-to_truong {
          background: #FEF3C7;
          color: #B45309;
        }
        &.role-giao_vien {
          background: #F1F5F9;
          color: #475569;
        }
        &.role-admin {
          background: #F3E8FF;
          color: #7E22CE;
        }
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 9999px;

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        &.status-active {
          background: #ECFDF5;
          color: #059669;
          .dot {
            background: #10B981;
          }
        }

        &.status-locked {
          background: #FEF2F2;
          color: #DC2626;
          .dot {
            background: #EF4444;
          }
        }
      }

      .row-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;

        .action-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;

          .material-symbols-outlined {
            font-size: 16px;
          }

          &:hover {
            background: #F8FAFC;
            color: #1D4ED8;
            border-color: #CBD5E1;
          }

          &.btn-lock:hover {
            color: #DC2626;
            background: #FEF2F2;
            border-color: #FECACA;
          }

          &.btn-unlock:hover {
            color: #059669;
            background: #ECFDF5;
            border-color: #A7F3D0;
          }
        }
      }

      /* MOBILE CARDS */
      .mobile-cards-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .user-card-item {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;

          &.card-locked {
            opacity: 0.75;
            background: #FFFDFD;
          }

          .card-header {
            display: flex;
            align-items: center;
            gap: 12px;

            .card-avatar {
              width: 42px;
              height: 42px;
              border-radius: 50%;
            }

            .card-title-box {
              flex: 1;
              display: flex;
              flex-direction: column;

              .card-name {
                font-weight: 700;
                font-size: 0.95rem;
                color: #0F172A;
              }

              .card-title-sub {
                font-size: 0.78rem;
                color: #64748B;
              }
            }
          }

          .card-body-details {
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 0.85rem;

            .detail-row {
              display: flex;
              align-items: center;
              gap: 8px;

              .label {
                color: #64748B;
                min-width: 80px;
                font-weight: 500;
              }

              .val {
                color: #1E293B;
              }
            }
          }

          .card-footer-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-top: 8px;
            border-top: 1px solid #F1F5F9;

            .btn-card-action {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              padding: 8px 10px;
              border-radius: 8px;
              border: 1px solid #E2E8F0;
              background: #F8FAFC;
              color: #334155;
              font-size: 0.8rem;
              font-weight: 600;
              cursor: pointer;

              .material-symbols-outlined {
                font-size: 16px;
              }
            }
          }
        }
      }

      /* TAB 2: ROLES & MATRIX */
      .roles-management-card,
      .permissions-matrix-card {
        background: #FFFFFF;
        border-radius: 14px;
        border: 1px solid #E2E8F0;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .section-title-box {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        .title-icon {
          font-size: 26px;
          color: #2563EB;
        }

        .title-meta {
          h2 {
            margin: 0 0 4px 0;
            font-size: 1.15rem;
            font-weight: 700;
            color: #1E293B;
          }

          p {
            margin: 0;
            font-size: 0.85rem;
            color: #64748B;
          }

          .note-text {
            color: #475569;
            font-size: 0.82rem;
          }
        }
      }

      .user-roles-detail-box {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;

        .user-profile-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;

          .profile-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
          }

          .profile-info {
            flex: 1;
            display: flex;
            flex-direction: column;

            .profile-name {
              font-size: 1.05rem;
              font-weight: 700;
              color: #0F172A;
            }

            .profile-sub {
              font-size: 0.82rem;
              color: #64748B;
            }
          }
        }

        .assigned-roles-list {
          display: flex;
          flex-direction: column;
          gap: 10px;

          .roles-header-label {
            font-size: 0.84rem;
            font-weight: 700;
            color: #475569;
          }

          .large-roles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 12px;
          }

          .large-role-card {
            background: #FFFFFF;
            border: 1.5px solid #E2E8F0;
            border-radius: 10px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            position: relative;

            .role-icon-box {
              width: 36px;
              height: 36px;
              border-radius: 8px;
              background: #EFF6FF;
              color: #1D4ED8;
              display: flex;
              align-items: center;
              justify-content: center;

              .material-symbols-outlined {
                font-size: 20px;
              }
            }

            .role-details {
              flex: 1;
              display: flex;
              flex-direction: column;

              .role-title-text {
                font-weight: 700;
                font-size: 0.9rem;
                color: #0F172A;
              }

              .role-scope-text {
                font-size: 0.78rem;
                color: #64748B;
              }
            }

            .remove-role-btn {
              background: transparent;
              border: none;
              color: #94A3B8;
              cursor: pointer;
              padding: 4px;
              display: flex;
              border-radius: 4px;

              &:hover {
                color: #EF4444;
                background: #FEF2F2;
              }
            }
          }
        }
      }

      .picker-placeholder-box {
        padding: 30px;
        text-align: center;
        background: #F8FAFC;
        border: 1px dashed #CBD5E1;
        border-radius: 12px;
        color: #64748B;
        font-size: 0.9rem;

        .material-symbols-outlined {
          font-size: 32px;
          color: #94A3B8;
          margin-bottom: 6px;
        }
      }

      /* MATRIX CARDS */
      .matrix-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 16px;

        .matrix-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;

          .matrix-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #F1F5F9;

            .matrix-role-icon {
              font-size: 24px;
              color: #1D4ED8;
            }

            .matrix-header-info {
              display: flex;
              flex-direction: column;

              .matrix-role-name {
                font-weight: 700;
                font-size: 0.95rem;
                color: #0F172A;
              }

              .matrix-scope {
                font-size: 0.78rem;
                color: #64748B;
              }
            }
          }

          .matrix-desc {
            font-size: 0.84rem;
            color: #475569;
            margin: 0;
            line-height: 1.4;
          }

          .capabilities-list {
            display: flex;
            flex-direction: column;
            gap: 8px;

            .cap-category-title {
              font-size: 0.8rem;
              font-weight: 700;
              color: #1E293B;
              margin-bottom: 2px;
              display: block;
            }

            .cap-items {
              margin: 0;
              padding-left: 18px;
              font-size: 0.78rem;
              color: #475569;

              li {
                margin-bottom: 3px;
              }
            }
          }
        }
      }

      /* TAB 3: LOCATIONS */
      .locations-top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;

        h2 {
          margin: 0 0 4px 0;
          font-size: 1.2rem;
          font-weight: 700;
          color: #1E293B;
        }

        p {
          margin: 0;
          font-size: 0.85rem;
          color: #64748B;
        }
      }

      .locations-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
        gap: 18px;

        .location-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease;

          &.main-campus {
            border-color: #93C5FD;
            background: linear-gradient(180deg, #F0F7FF 0%, #FFFFFF 25%);
          }

          .loc-card-header {
            display: flex;
            flex-direction: column;
            gap: 6px;

            .loc-badge-group {
              display: flex;
              align-items: center;
              gap: 8px;

              .main-tag {
                background: #DBEAFE;
                color: #1D4ED8;
                font-size: 0.72rem;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 9999px;
              }

              .sub-tag {
                background: #F1F5F9;
                color: #475569;
                font-size: 0.72rem;
                font-weight: 600;
                padding: 2px 8px;
                border-radius: 9999px;
              }

              .code-tag {
                font-size: 0.72rem;
                font-family: monospace;
                color: #64748B;
              }
            }

            .loc-name {
              margin: 4px 0 0 0;
              font-size: 1.1rem;
              font-weight: 700;
              color: #0F172A;
            }

            .loc-address,
            .loc-phone {
              margin: 0;
              font-size: 0.82rem;
              color: #64748B;
              display: flex;
              align-items: center;
              gap: 4px;

              .loc-icon {
                font-size: 16px;
                color: #94A3B8;
              }

              a {
                color: #2563EB;
                text-decoration: none;
                &:hover {
                  text-decoration: underline;
                }
              }
            }
          }

          .manager-box {
            background: #F8FAFC;
            border-radius: 10px;
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;

            .manager-label {
              font-size: 0.75rem;
              font-weight: 700;
              color: #64748B;
              text-transform: uppercase;
            }

            .manager-info {
              display: flex;
              align-items: center;
              gap: 10px;

              .mgr-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
              }

              .mgr-meta {
                display: flex;
                flex-direction: column;

                .mgr-name {
                  font-weight: 700;
                  font-size: 0.85rem;
                  color: #1E293B;
                }

                .mgr-sub {
                  font-size: 0.75rem;
                  color: #64748B;
                }
              }
            }

            .no-manager-text {
              font-size: 0.82rem;
              color: #94A3B8;
              font-style: italic;
            }
          }

          .loc-metrics-row {
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 10px 0;
            border-top: 1px solid #F1F5F9;
            border-bottom: 1px solid #F1F5F9;

            .metric-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;

              .metric-num {
                font-size: 1.15rem;
                font-weight: 800;
                color: #0F172A;

                &.in-progress {
                  color: #2563EB;
                }

                &.overdue {
                  color: #EF4444;
                }
              }

              .metric-lbl {
                font-size: 0.72rem;
                color: #64748B;
                font-weight: 600;
              }
            }
          }

          .loc-card-actions {
            display: flex;
            align-items: center;
            gap: 8px;

            .btn-card-action {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              padding: 8px;
              border-radius: 8px;
              border: 1px solid #E2E8F0;
              background: #F8FAFC;
              color: #334155;
              font-size: 0.82rem;
              font-weight: 600;
              cursor: pointer;

              .material-symbols-outlined {
                font-size: 16px;
              }

              &:hover:not(:disabled) {
                background: #E2E8F0;
              }

              &.btn-danger:hover:not(:disabled) {
                background: #FEF2F2;
                color: #DC2626;
                border-color: #FECACA;
              }

              &:disabled {
                opacity: 0.4;
                cursor: not-allowed;
              }
            }
          }
        }
      }

      /* TAB 4: TEACHERS BY LOCATION */
      .teachers-by-loc-header {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;

        .loc-selector-box {
          display: flex;
          flex-direction: column;
          gap: 6px;

          .loc-dropdown-label {
            font-size: 0.8rem;
            font-weight: 700;
            color: #64748B;
          }

          .campus-select-dropdown {
            padding: 8px 14px;
            border-radius: 8px;
            border: 1.5px solid #2563EB;
            background: #EFF6FF;
            color: #1D4ED8;
            font-size: 0.95rem;
            font-weight: 700;
            outline: none;
            cursor: pointer;
          }
        }

        .header-right-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      }

      .workload-tag {
        font-size: 0.78rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 9999px;

        &.workload-light {
          background: #ECFDF5;
          color: #059669;
        }
        &.workload-medium {
          background: #EFF6FF;
          color: #2563EB;
        }
        &.workload-heavy {
          background: #FEF3C7;
          color: #D97706;
        }
      }

      .btn-transfer-loc {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid #CBD5E1;
        background: #FFFFFF;
        color: #2563EB;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;

        .material-symbols-outlined {
          font-size: 16px;
        }

        &:hover {
          background: #EFF6FF;
          border-color: #93C5FD;
        }
      }

      /* MODALS */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 16px;
      }

      .modal-dialog {
        background: #FFFFFF;
        border-radius: 16px;
        width: 100%;
        max-width: 540px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;

        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;

          h3 {
            margin: 0;
            font-size: 1.15rem;
            font-weight: 700;
            color: #0F172A;
          }

          .modal-close-btn {
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            display: flex;
          }

          &.success-header {
            background: #ECFDF5;
            color: #065F46;

            .success-icon {
              font-size: 26px;
              color: #10B981;
            }
          }
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .modal-footer {
          padding: 14px 20px;
          border-top: 1px solid #F1F5F9;
          background: #F8FAFC;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
        }
      }

      /* FORM CONTROLS */
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        label {
          font-size: 0.84rem;
          font-weight: 600;
          color: #334155;

          .req {
            color: #EF4444;
          }
        }

        .form-input,
        .form-select {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1.5px solid #CBD5E1;
          font-size: 0.9rem;
          color: #1E293B;
          outline: none;

          &:focus {
            border-color: #2563EB;
          }
        }

        &.checkbox-group {
          justify-content: center;
        }

        .custom-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 500;
          color: #1E293B;
        }
      }

      .form-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .modal-info-box,
      .modal-warning-box {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 0.82rem;

        .material-symbols-outlined {
          font-size: 20px;
        }
      }

      .modal-info-box {
        background: #EFF6FF;
        color: #1E40AF;
        border: 1px solid #DBEAFE;
      }

      .modal-warning-box {
        background: #FFFBEB;
        color: #92400E;
        border: 1px solid #FDE68A;
      }

      .current-manager-selected {
        font-size: 0.82rem;
        color: #059669;
        margin: 4px 0 0 0;

        .btn-clear-mgr {
          background: transparent;
          border: none;
          color: #EF4444;
          font-size: 0.78rem;
          text-decoration: underline;
          cursor: pointer;
          margin-left: 6px;
        }
      }

      .created-account-card {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;

        .acc-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.88rem;

          .acc-lbl {
            color: #64748B;
          }

          .acc-val {
            font-weight: 600;
            color: #0F172A;

            &.highlight {
              color: #2563EB;
              font-family: monospace;
              font-size: 0.95rem;
            }

            &.pass-badge {
              background: #FEF3C7;
              color: #92400E;
              padding: 2px 8px;
              border-radius: 6px;
              font-family: monospace;
              font-size: 0.95rem;
              font-weight: 800;
            }
          }
        }
      }

      .choice-cards-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        .choice-card {
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s ease;

          .choice-icon {
            font-size: 32px;
            color: #2563EB;
          }

          h4 {
            margin: 0 0 4px 0;
            font-size: 0.95rem;
            color: #0F172A;
          }

          p {
            margin: 0;
            font-size: 0.78rem;
            color: #64748B;
          }

          &:hover {
            background: #EFF6FF;
            border-color: #3B82F6;
          }
        }
      }

      .empty-state-box {
        text-align: center;
        padding: 40px 20px;
        background: #FFFFFF;
        border-radius: 14px;
        border: 1px solid #E2E8F0;

        .empty-icon {
          font-size: 48px;
          color: #CBD5E1;
          margin-bottom: 10px;
        }

        h3 {
          margin: 0 0 6px 0;
          font-size: 1.1rem;
          color: #334155;
        }

        p {
          margin: 0;
          font-size: 0.88rem;
          color: #64748B;
        }
      }

      .skeleton-list {
        display: flex;
        flex-direction: column;
        gap: 10px;

        .skeleton-row {
          height: 60px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          border-radius: 10px;
          animation: skeletonShimmer 1.5s infinite;
        }
      }

      @keyframes skeletonShimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      /* RESPONSIVE */
      @media (max-width: 768px) {
        .admin-settings-container {
          padding: 16px;
        }

        .filter-top-row {
          flex-direction: column;
          align-items: stretch !important;

          .create-user-btn {
            width: 100%;
            justify-content: center;
          }
        }

        .form-grid-2,
        .choice-cards-grid {
          grid-template-columns: 1fr;
        }

        .teachers-by-loc-header {
          flex-direction: column;
          align-items: stretch;

          .header-right-actions {
            flex-direction: column;

            .search-input-box.small {
              max-width: 100%;
              width: 100%;
            }

            .btn-primary {
              width: 100%;
              justify-content: center;
            }
          }
        }
      }
    `,
  ],
})
export class AdminSettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private userService = inject(UserService);
  authService = inject(AuthService);

  // Active Tab state
  activeTab = signal<AdminTab>('accounts');

  // Metadata Lists
  locations = signal<LocationItem[]>([]);
  orgUnits = signal<OrgUnitItem[]>([]);
  permissionsMatrix = signal<PermissionMatrixItem[]>([]);

  // Alerts
  alertMessage = signal<string>('');
  alertType = signal<'success' | 'error'>('success');

  // Loading States
  isLoadingUsers = signal<boolean>(false);
  isLoadingLocations = signal<boolean>(false);
  isLoadingCampusTeachers = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // TAB 1: ACCOUNTS STATE
  usersList = signal<AdminUserItem[]>([]);
  totalUsers = signal<number>(0);
  searchKeyword = '';
  filterLocationId = '';
  filterOrgUnitId = '';
  filterRole = '';
  filterStatus: 'all' | 'active' | 'locked' = 'all';

  // TAB 2: ROLES STATE
  selectedRoleUser = signal<AdminUserItem | null>(null);

  // TAB 3: LOCATIONS SUMMARY STATE
  locationsSummary = signal<LocationSummaryItem[]>([]);

  // TAB 4: TEACHERS BY LOCATION STATE
  selectedCampusId = '';
  campusTeachersList = signal<AdminUserItem[]>([]);
  campusSearchKeyword = '';

  filteredCampusTeachers = computed(() => {
    const list = this.campusTeachersList();
    const q = this.campusSearchKeyword.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        (u.title && u.title.toLowerCase().includes(q))
    );
  });

  // MODAL STATES
  showCreateUserModal = signal<boolean>(false);
  showEditUserModal = signal<boolean>(false);
  showAddRoleModal = signal<boolean>(false);
  showLocationModal = signal<boolean>(false);
  showTransferModal = signal<boolean>(false);
  showAddTeacherChoiceModal = signal<boolean>(false);
  transferPickerMode = signal<boolean>(false);
  createdUserSuccessInfo = signal<AdminUserItem | null>(null);
  copiedText = signal<boolean>(false);

  // FORMS STATE
  newUserForm: CreateAdminUserPayload = {
    fullName: '',
    phone: '',
    email: '',
    position: '',
    locationId: null,
    orgUnitId: null,
  };
  newUserInitialRole = 'GIAO_VIEN';

  editingUser = signal<AdminUserItem | null>(null);
  editUserForm: UpdateAdminUserPayload = {};

  newRoleData = {
    role: 'GIAO_VIEN',
    scopeLocationId: null as string | null,
    scopeOrgUnitId: null as string | null,
  };

  editingLocationId: string | null = null;
  locationForm = {
    name: '',
    code: '',
    address: '',
    phone: '',
    isMain: false,
    managerId: null as string | null,
  };
  selectedLocationManagerName = '';

  transferTargetTeacher = signal<AdminUserItem | null>(null);
  targetDestinationCampusId = '';

  ngOnInit() {
    this.loadCommonMetadata();
    this.loadUsers();
    this.loadLocationsSummary();

    // Auto-reload data when user switches active account via top bar
    this.authService.accountSwitched$.subscribe(() => {
      this.loadCommonMetadata();
      this.loadUsers();
      this.loadLocationsSummary();
      if (this.activeTab() === 'roles') {
        this.loadPermissionsMatrix();
      } else if (this.activeTab() === 'teachers-by-loc') {
        this.loadCampusTeachers();
      }
    });
  }

  switchToPrincipalAccount() {
    const principal = this.authService.demoAccounts.find((a) => a.role === 'HIEU_TRUONG');
    if (principal) {
      this.authService.switchDemoAccount(principal.identifier).subscribe({
        next: () => {
          this.showAlert('Đã chuyển sang vai trò Cô Phạm Thị Nam (Hiệu trưởng).');
        },
      });
    }
  }

  switchTab(tab: AdminTab) {
    this.activeTab.set(tab);
    if (tab === 'accounts') {
      this.loadUsers();
    } else if (tab === 'roles') {
      this.loadPermissionsMatrix();
    } else if (tab === 'locations') {
      this.loadLocationsSummary();
    } else if (tab === 'teachers-by-loc') {
      if (!this.selectedCampusId && this.locations().length > 0) {
        this.selectedCampusId = this.locations()[0].id;
      }
      this.loadCampusTeachers();
    }
  }

  showAlert(msg: string, type: 'success' | 'error' = 'success') {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => {
      if (this.alertMessage() === msg) {
        this.alertMessage.set('');
      }
    }, 5000);
  }

  loadCommonMetadata() {
    this.userService.getLocations().subscribe({
      next: (locs) => {
        this.locations.set(locs);
        if (!this.selectedCampusId && locs.length > 0) {
          this.selectedCampusId = locs[0].id;
        }
      },
    });

    this.userService.getOrgUnits().subscribe({
      next: (orgs) => this.orgUnits.set(orgs),
    });
  }

  // =======================================================
  // TAB 1: ACCOUNTS LOGIC
  // =======================================================
  loadUsers() {
    this.isLoadingUsers.set(true);
    this.adminService
      .getUsers({
        search: this.searchKeyword,
        locationId: this.filterLocationId || undefined,
        orgUnitId: this.filterOrgUnitId || undefined,
        role: this.filterRole || undefined,
        status: this.filterStatus,
        pageSize: 100,
      })
      .subscribe({
        next: (res) => {
          this.usersList.set(res.items);
          this.totalUsers.set(res.total);
          this.isLoadingUsers.set(false);
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Lỗi khi tải danh sách tài khoản', 'error');
          this.isLoadingUsers.set(false);
        },
      });
  }

  onSearchChange() {
    this.loadUsers();
  }

  setStatusFilter(status: 'all' | 'active' | 'locked') {
    this.filterStatus = status;
    this.loadUsers();
  }

  openCreateUserModal(prefilledLocationId?: string | null) {
    this.newUserForm = {
      fullName: '',
      phone: '',
      email: '',
      position: '',
      locationId: prefilledLocationId || null,
      orgUnitId: null,
    };
    this.newUserInitialRole = 'GIAO_VIEN';
    this.showCreateUserModal.set(true);
  }

  submitCreateUser() {
    if (!this.newUserForm.fullName?.trim() || !this.newUserForm.phone?.trim() || !this.newUserForm.email?.trim()) {
      this.showAlert('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Email.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    const payload: CreateAdminUserPayload = {
      ...this.newUserForm,
      roles: [
        {
          role: this.newUserInitialRole,
          scopeLocationId: this.newUserForm.locationId,
          scopeOrgUnitId: this.newUserForm.orgUnitId,
        },
      ],
    };

    this.adminService.createUser(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showCreateUserModal.set(false);
        this.createdUserSuccessInfo.set(res.user);
        this.copiedText.set(false);
        this.showAlert(res.message || 'Tạo tài khoản thành công.');
        this.loadUsers();
        if (this.activeTab() === 'teachers-by-loc') {
          this.loadCampusTeachers();
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Tạo tài khoản thất bại.', 'error');
      },
    });
  }

  copyAccountInfo() {
    const u = this.createdUserSuccessInfo();
    if (!u) return;
    const text = `Kính gửi thầy/cô ${u.fullName},\nThông tin tài khoản phần mềm TN EDU:\n- SĐT đăng nhập: ${u.phone}\n- Email: ${u.email}\n- Mật khẩu mặc định: 123456\nTrân trọng.`;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedText.set(true);
      setTimeout(() => this.copiedText.set(false), 3000);
    });
  }

  openEditUserModal(user: AdminUserItem) {
    this.editingUser.set(user);
    this.editUserForm = {
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      position: user.title || '',
      locationId: user.primaryLocation?.id || null,
      orgUnitId: user.primaryOrgUnit?.id || null,
    };
    this.showEditUserModal.set(true);
  }

  submitEditUser() {
    const user = this.editingUser();
    if (!user) return;

    this.isSubmitting.set(true);
    this.adminService.updateUser(user.id, this.editUserForm).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showEditUserModal.set(false);
        this.showAlert('Cập nhật thông tin tài khoản thành công.');
        this.loadUsers();
        if (this.selectedRoleUser()?.id === user.id) {
          this.refreshSelectedRoleUser(user.id);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Cập nhật tài khoản thất bại.', 'error');
      },
    });
  }

  confirmToggleStatus(user: AdminUserItem) {
    const actionText = user.isActive ? 'KHOÁ' : 'MỞ KHOÁ';
    const warningText = user.isActive
      ? `Bạn có chắc chắn muốn khoá tài khoản "${user.fullName}"?\nTài khoản này sẽ không thể đăng nhập vào hệ thống cho tới khi được mở lại.`
      : `Mở khoá cho tài khoản "${user.fullName}" để tiếp tục truy cập hệ thống?`;

    if (confirm(warningText)) {
      this.adminService.toggleUserStatus(user.id, !user.isActive).subscribe({
        next: (res) => {
          this.showAlert(res.isActive ? 'Đã mở khoá tài khoản.' : 'Đã khoá tài khoản.');
          this.loadUsers();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Thao tác trạng thái thất bại.', 'error');
        },
      });
    }
  }

  confirmResetPassword(user: AdminUserItem) {
    if (confirm(`Đặt lại mật khẩu cho tài khoản "${user.fullName}" về mặc định "123456"?`)) {
      this.adminService.resetPassword(user.id).subscribe({
        next: () => {
          this.showAlert(`Đã đặt lại mật khẩu của "${user.fullName}" về "123456".`);
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Đặt lại mật khẩu thất bại.', 'error');
        },
      });
    }
  }

  // =======================================================
  // TAB 2: ROLES & PERMISSIONS LOGIC
  // =======================================================
  loadPermissionsMatrix() {
    this.adminService.getPermissionsMatrix().subscribe({
      next: (matrix) => this.permissionsMatrix.set(matrix),
    });
  }

  onRoleTargetUserSelected(userPickerItem: UserPickerItem) {
    this.refreshSelectedRoleUser(userPickerItem.id);
  }

  refreshSelectedRoleUser(userId: string) {
    this.adminService.getUsers({ search: '', pageSize: 100 }).subscribe({
      next: (res) => {
        const found = res.items.find((u) => u.id === userId);
        if (found) {
          this.selectedRoleUser.set(found);
        }
      },
    });
  }

  openAddRoleModal() {
    const user = this.selectedRoleUser();
    if (!user) return;
    this.newRoleData = {
      role: 'GIAO_VIEN',
      scopeLocationId: user.primaryLocation?.id || null,
      scopeOrgUnitId: user.primaryOrgUnit?.id || null,
    };
    this.showAddRoleModal.set(true);
  }

  submitAddRole() {
    const user = this.selectedRoleUser();
    if (!user) return;

    this.isSubmitting.set(true);
    this.adminService.addUserRole(user.id, this.newRoleData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showAddRoleModal.set(false);
        this.showAlert(`Đã gán vai trò [${this.getRoleLabel(this.newRoleData.role)}] cho ${user.fullName}`);
        this.refreshSelectedRoleUser(user.id);
        this.loadUsers();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Gán vai trò thất bại.', 'error');
      },
    });
  }

  confirmRemoveRole(roleItem: AdminUserRole) {
    const user = this.selectedRoleUser();
    if (!user) return;

    if (confirm(`Bạn có chắc chắn muốn gỡ vai trò [${this.getRoleLabel(roleItem.role)}] khỏi tài khoản ${user.fullName}?`)) {
      this.adminService.removeUserRole(user.id, roleItem.id).subscribe({
        next: () => {
          this.showAlert('Gỡ vai trò thành công.');
          this.refreshSelectedRoleUser(user.id);
          this.loadUsers();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Không thể gỡ vai trò.', 'error');
        },
      });
    }
  }

  // =======================================================
  // TAB 3: LOCATIONS LOGIC
  // =======================================================
  loadLocationsSummary() {
    this.isLoadingLocations.set(true);
    this.adminService.getLocationsWithSummary().subscribe({
      next: (summaries) => {
        this.locationsSummary.set(summaries);
        this.isLoadingLocations.set(false);
      },
      error: (err) => {
        this.isLoadingLocations.set(false);
      },
    });
  }

  openCreateLocationModal() {
    this.editingLocationId = null;
    this.locationForm = {
      name: '',
      code: '',
      address: '',
      phone: '',
      isMain: false,
      managerId: null,
    };
    this.selectedLocationManagerName = '';
    this.showLocationModal.set(true);
  }

  openEditLocationModal(loc: LocationSummaryItem) {
    this.editingLocationId = loc.id;
    this.locationForm = {
      name: loc.name,
      code: loc.code,
      address: loc.address || '',
      phone: loc.phone || '',
      isMain: loc.isMain,
      managerId: loc.manager?.id || null,
    };
    this.selectedLocationManagerName = loc.manager?.fullName || '';
    this.showLocationModal.set(true);
  }

  onLocationManagerSelected(user: UserPickerItem) {
    this.locationForm.managerId = user.id;
    this.selectedLocationManagerName = user.fullName;
  }

  submitLocationForm() {
    if (!this.locationForm.name?.trim() || !this.locationForm.code?.trim()) {
      this.showAlert('Vui lòng nhập đầy đủ Tên và Mã điểm trường.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    if (this.editingLocationId) {
      this.adminService.updateLocation(this.editingLocationId, this.locationForm).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showLocationModal.set(false);
          this.showAlert('Cập nhật điểm trường thành công.');
          this.loadLocationsSummary();
          this.loadCommonMetadata();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Cập nhật điểm trường thất bại.', 'error');
        },
      });
    } else {
      this.adminService.createLocation(this.locationForm).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showLocationModal.set(false);
          this.showAlert('Tạo điểm trường mới thành công.');
          this.loadLocationsSummary();
          this.loadCommonMetadata();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Tạo điểm trường thất bại.', 'error');
        },
      });
    }
  }

  confirmDeleteLocation(loc: LocationSummaryItem) {
    if (loc.userCount > 0 || loc.totalTaskCount > 0) {
      this.showAlert(`Không thể xoá điểm trường vì đang có ${loc.userCount} nhân sự và ${loc.totalTaskCount} công việc.`, 'error');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xoá điểm trường "${loc.name}" (${loc.code})?`)) {
      this.adminService.deleteLocation(loc.id).subscribe({
        next: () => {
          this.showAlert('Xoá điểm trường thành công.');
          this.loadLocationsSummary();
          this.loadCommonMetadata();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Xoá điểm trường thất bại.', 'error');
        },
      });
    }
  }

  // =======================================================
  // TAB 4: TEACHERS BY LOCATION LOGIC
  // =======================================================
  loadCampusTeachers() {
    if (!this.selectedCampusId) return;
    this.isLoadingCampusTeachers.set(true);
    this.adminService
      .getUsers({
        locationId: this.selectedCampusId,
        pageSize: 100,
      })
      .subscribe({
        next: (res) => {
          this.campusTeachersList.set(res.items);
          this.isLoadingCampusTeachers.set(false);
        },
        error: () => {
          this.isLoadingCampusTeachers.set(false);
        },
      });
  }

  openAddTeacherToCampusModal() {
    this.transferPickerMode.set(false);
    this.showAddTeacherChoiceModal.set(true);
  }

  selectAddTeacherMode(mode: 'new' | 'transfer') {
    if (mode === 'new') {
      this.showAddTeacherChoiceModal.set(false);
      this.openCreateUserModal(this.selectedCampusId);
    } else {
      this.transferPickerMode.set(true);
    }
  }

  onTeacherToTransferSelected(user: UserPickerItem) {
    const loc = this.locations().find((l) => l.id === this.selectedCampusId);
    if (confirm(`Chuyển giáo viên "${user.fullName}" sang điểm trường "${loc?.name}"?`)) {
      this.adminService.updateUser(user.id, { locationId: this.selectedCampusId }).subscribe({
        next: () => {
          this.showAddTeacherChoiceModal.set(false);
          this.showAlert(`Đã chuyển giáo viên ${user.fullName} sang ${loc?.name}`);
          this.loadCampusTeachers();
          this.loadLocationsSummary();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Chuyển điểm trường thất bại.', 'error');
        },
      });
    }
  }

  openTransferCampusModal(teacher: AdminUserItem) {
    this.transferTargetTeacher.set(teacher);
    this.targetDestinationCampusId = this.locations()[0]?.id || '';
    this.showTransferModal.set(true);
  }

  submitTransferCampus() {
    const teacher = this.transferTargetTeacher();
    if (!teacher || !this.targetDestinationCampusId) return;

    this.isSubmitting.set(true);
    this.adminService
      .updateUser(teacher.id, { locationId: this.targetDestinationCampusId })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showTransferModal.set(false);
          this.showAlert(`Đã điều chuyển nhân sự ${teacher.fullName} thành công.`);
          this.loadCampusTeachers();
          this.loadLocationsSummary();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Điều chuyển thất bại.', 'error');
        },
      });
  }

  closeModals() {
    this.showCreateUserModal.set(false);
    this.showEditUserModal.set(false);
    this.showAddRoleModal.set(false);
    this.showLocationModal.set(false);
    this.showTransferModal.set(false);
    this.showAddTeacherChoiceModal.set(false);
    this.transferPickerMode.set(false);
  }

  // =======================================================
  // HELPERS
  // =======================================================
  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      HIEU_TRUONG: 'Hiệu trưởng',
      PHO_HIEU_TRUONG: 'Phó Hiệu trưởng',
      TO_TRUONG: 'Tổ trưởng',
      GIAO_VIEN: 'Giáo viên',
      NHAN_VIEN: 'Nhân viên',
      ADMIN: 'Quản trị hệ thống',
    };
    return map[role] || role;
  }

  getRoleIconName(role: string): string {
    const map: Record<string, string> = {
      HIEU_TRUONG: 'stars',
      PHO_HIEU_TRUONG: 'shield_person',
      TO_TRUONG: 'supervisor_account',
      GIAO_VIEN: 'school',
      NHAN_VIEN: 'badge',
      ADMIN: 'admin_panel_settings',
    };
    return map[role] || 'person';
  }

  getScopeDescription(roleItem: AdminUserRole): string {
    if (!roleItem.scopeLocation && !roleItem.scopeOrgUnit) {
      return 'Toàn trường (Không giới hạn)';
    }
    const parts: string[] = [];
    if (roleItem.scopeLocation) parts.push(roleItem.scopeLocation.name);
    if (roleItem.scopeOrgUnit) parts.push(roleItem.scopeOrgUnit.name);
    return parts.join(' • ');
  }

  getWorkloadClass(count: number): string {
    if (count <= 2) return 'workload-light';
    if (count <= 5) return 'workload-medium';
    return 'workload-heavy';
  }
}
