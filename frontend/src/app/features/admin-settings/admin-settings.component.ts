import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import {
  AdminUserItem,
  PermissionMatrixItem,
  LocationSummaryItem,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  AdminUserRole,
  PermissionItem,
  RoleModelItem,
  SharedCategoryItem,
  KPIDefinitionItem,
  TenantQuotaInfo,
} from '../../core/models/admin.models';
import { LocationItem, OrgUnitItem, UserPickerItem } from '../../core/models/user.models';
import { PeoplePickerComponent } from '../../shared/components/people-picker/people-picker.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

export type AdminTab = 'accounts' | 'roles' | 'locations' | 'teachers-by-loc' | 'categories' | 'kpi-config';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PeoplePickerComponent, PaginationComponent],
  template: `
    <div class="admin-settings-container">
      <!-- HEADER -->
      <div class="page-header">
        <div class="header-titles">
          <div class="header-tag">
            <span class="material-symbols-outlined tag-icon">admin_panel_settings</span>
            <span>Quản trị Hệ thống SaaS</span>
          </div>
          <h1 class="page-title">Cấu hình & Quản lý Phân quyền Đa Tenant</h1>
          <p class="page-subtitle">Quản trị danh sách tài khoản, hạn mức thuê bao, ma trận phân quyền động (RBAC), điểm trường, danh mục dùng chung và chỉ số KPI.</p>
        </div>

        @if (!authService.isAdmin()) {
          <div class="role-warning-banner">
            <span class="material-symbols-outlined warn-icon">lock</span>
            <div class="warn-content">
              <span class="warn-title">Quyền truy cập bị giới hạn</span>
              <span class="warn-desc">Bạn đang đăng nhập với vai trò <strong>{{ authService.activeRole()?.roleTitle || 'Cán bộ' }}</strong>. Phân hệ Quản trị & Cấu hình hệ thống chỉ dành riêng cho Quản trị viên hệ thống (Admin).</span>
            </div>
          </div>
        }
      </div>

      @if (authService.isAdmin()) {
        <!-- 6 NAVIGATION TABS (SRS Mục 5.3) -->
        <div class="tabs-nav-bar">
          <button
            type="button"
            class="nav-tab-btn tap-target"
            [class.active]="activeTab() === 'accounts'"
            (click)="switchTab('accounts')"
          >
          <span class="material-symbols-outlined">manage_accounts</span>
          <span>Tài khoản & Hạn mức</span>
          <span class="tab-badge">{{ totalUsers() }}</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn tap-target"
          [class.active]="activeTab() === 'roles'"
          (click)="switchTab('roles')"
        >
          <span class="material-symbols-outlined">shield_person</span>
          <span>Ma trận Phân quyền</span>
          <span class="tab-badge info">{{ tenantRoles().length }}</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn tap-target"
          [class.active]="activeTab() === 'locations'"
          (click)="switchTab('locations')"
        >
          <span class="material-symbols-outlined">apartment</span>
          <span>Điểm trường & Tổ chuyên môn</span>
          <span class="tab-badge">{{ (locationsSummary().length || locations().length) + orgUnits().length }}</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn tap-target"
          [class.active]="activeTab() === 'teachers-by-loc'"
          (click)="switchTab('teachers-by-loc')"
        >
          <span class="material-symbols-outlined">groups</span>
          <span>Nhân sự theo Điểm trường</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn tap-target"
          [class.active]="activeTab() === 'categories'"
          (click)="switchTab('categories')"
        >
          <span class="material-symbols-outlined">category</span>
          <span>Danh mục dùng chung</span>
          <span class="tab-badge purple">{{ categoriesList().length }}</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn tap-target"
          [class.active]="activeTab() === 'kpi-config'"
          (click)="switchTab('kpi-config')"
        >
          <span class="material-symbols-outlined">monitoring</span>
          <span>Cấu hình chỉ số KPI</span>
          <span class="tab-badge orange">{{ kpiDefinitionsList().length }}</span>
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
      <!-- TAB 1: QUẢN LÝ TÀI KHOẢN & HẠN MỨC GÓI THUÊ -->
      <!-- ======================================================= -->
      @if (activeTab() === 'accounts') {
        <div class="tab-content-panel">
          <!-- QUOTA & SUBSCRIPTION USAGE BANNER -->
          @if (quotaInfo()) {
            <div class="quota-banner-card">
              <div class="quota-header">
                <div class="quota-package-badge">
                  <span class="material-symbols-outlined pkg-icon">verified</span>
                  <span class="pkg-title">Gói dịch vụ: <strong>{{ quotaInfo()?.package?.name || 'Gói Tiêu chuẩn' }}</strong></span>
                  @if (quotaInfo()?.subscription) {
                    <span class="sub-expiry-badge">
                      <span class="material-symbols-outlined">event</span>
                      Hạn dùng: {{ quotaInfo()?.subscription?.endDate | date:'dd/MM/yyyy' }}
                    </span>
                  }
                </div>
                <div class="quota-status-pill" [class.danger]="(quotaInfo()?.quota?.accountUsagePercent || 0) >= 90" [class.warning]="(quotaInfo()?.quota?.accountUsagePercent || 0) >= 75">
                  <span class="material-symbols-outlined">person</span>
                  <span>{{ quotaInfo()?.quota?.activeAccounts }} / {{ quotaInfo()?.quota?.maxAccounts }} Tài khoản đang dùng ({{ quotaInfo()?.quota?.accountUsagePercent }}%)</span>
                </div>
              </div>

              <div class="quota-progress-track">
                <div
                  class="quota-progress-fill"
                  [style.width.%]="quotaInfo()?.quota?.accountUsagePercent || 0"
                  [class.warning]="(quotaInfo()?.quota?.accountUsagePercent || 0) >= 75 && (quotaInfo()?.quota?.accountUsagePercent || 0) < 90"
                  [class.danger]="(quotaInfo()?.quota?.accountUsagePercent || 0) >= 90"
                ></div>
              </div>

              <div class="quota-footer-details">
                <span class="quota-detail-item">
                  <span class="material-symbols-outlined">account_circle</span>
                  Còn lại: <strong>{{ quotaInfo()?.quota?.remainingAccounts }}</strong> tài khoản khả dụng.
                </span>
                <span class="quota-detail-item">
                  <span class="material-symbols-outlined">cloud</span>
                  Dung lượng lưu trữ: <strong>{{ quotaInfo()?.quota?.usedStorageMB }} MB</strong> / {{ quotaInfo()?.quota?.storageQuotaGB }} GB ({{ quotaInfo()?.quota?.storageUsagePercent }}%)
                </span>
              </div>
            </div>
          }

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
                  @for (user of pagedUsersList(); track user.id) {
                    <tr [class.row-locked]="!user.isActive">
                      <td>
                        <div class="user-cell">
                          <img [src]="user.avatarUrl || 'https://ui-avatars.com/api/?name=' + user.fullName" [alt]="user.fullName" class="table-avatar" />
                          <div class="user-meta">
                            <div class="user-fullname-row">
                              <span class="user-fullname">{{ user.fullName }}</span>
                              @if (isUserToTruong(user)) {
                                <span class="badge-totruong-mini" title="Tổ trưởng tổ chuyên môn">👑 Tổ trưởng</span>
                              }
                            </div>
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
                        <span class="loc-badge" [class.main-loc]="user.primaryLocation?.code === 'DIEM_CHINH'">
                          {{ user.primaryLocation?.name || '—' }}
                        </span>
                      </td>
                      <td>
                        <span class="org-badge">{{ user.primaryOrgUnit?.name || '—' }}</span>
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
                        <span class="status-pill" [class.active]="user.isActive" [class.locked]="!user.isActive">
                          <span class="dot"></span>
                          <span>{{ user.isActive ? 'Hoạt động' : 'Đã khoá' }}</span>
                        </span>
                      </td>
                      <td class="text-right actions-cell">
                        <button
                          type="button"
                          class="action-btn edit"
                          (click)="openEditUserModal(user)"
                          title="Sửa thông tin"
                        >
                          <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          type="button"
                          class="action-btn status"
                          [class.locked]="!user.isActive"
                          (click)="confirmToggleStatus(user)"
                          [title]="user.isActive ? 'Khoá tài khoản' : 'Mở khoá tài khoản'"
                        >
                          <span class="material-symbols-outlined">{{ user.isActive ? 'lock' : 'lock_open' }}</span>
                        </button>
                        <button
                          type="button"
                          class="action-btn reset-pass"
                          (click)="confirmResetPassword(user)"
                          title="Đặt lại mật khẩu về mặc định 123456"
                        >
                          <span class="material-symbols-outlined">key</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- PAGINATION -->
            <app-pagination
              [totalItems]="usersList().length"
              [pageSize]="usersPageSize()"
              [currentPage]="currentUsersPage()"
              itemName="tài khoản"
              (pageChange)="onUsersPageChange($event)"
              (pageSizeChange)="onUsersPageSizeChange($event)"
            ></app-pagination>
          }
        </div>
      }

      <!-- ======================================================= -->
      <!-- TAB 2: MA TRẬN PHÂN QUYỀN ĐỘNG (DYNAMIC RBAC MATRIX) -->
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
                  <img [src]="selectedRoleUser()?.avatarUrl || 'https://ui-avatars.com/api/?name=' + selectedRoleUser()?.fullName" class="profile-avatar" />
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

          <!-- BOTTOM: DYNAMIC PERMISSION MATRIX (60 PERMISSIONS X ROLES) -->
          <div class="permissions-matrix-card">
            <div class="section-title-box flex-between">
              <div class="title-meta-left">
                <span class="material-symbols-outlined title-icon">grid_view</span>
                <div>
                  <h2>2. Ma trận Phân quyền Động theo Vai trò (RBAC Dynamic Matrix)</h2>
                  <p class="note-text">
                    Tùy biến cấu hình tập quyền (60 quyền hệ thống thuộc 6 nhóm chức năng) cho từng vai trò trên trường của bạn.
                  </p>
                </div>
              </div>
              <div class="matrix-action-buttons">
                <button type="button" class="btn-secondary tap-target" (click)="openCreateRoleModal()">
                  <span class="material-symbols-outlined">add_circle</span>
                  <span>+ Tạo Vai trò Tùy biến</span>
                </button>
              </div>
            </div>

            <!-- Filter categories buttons -->
            <div class="category-filter-chips">
              <button
                type="button"
                class="cat-chip"
                [class.active]="permissionFilterCategory() === 'all'"
                (click)="permissionFilterCategory.set('all')"
              >
                Tất cả ({{ permissionsCatalog().length }})
              </button>
              <button
                type="button"
                class="cat-chip"
                [class.active]="permissionFilterCategory() === 'KE_HOACH'"
                (click)="permissionFilterCategory.set('KE_HOACH')"
              >
                Kế hoạch ({{ getPermissionsByCategory('KE_HOACH').length }})
              </button>
              <button
                type="button"
                class="cat-chip"
                [class.active]="permissionFilterCategory() === 'CONG_VIEC'"
                (click)="permissionFilterCategory.set('CONG_VIEC')"
              >
                Công việc ({{ getPermissionsByCategory('CONG_VIEC').length }})
              </button>
              <button
                type="button"
                class="cat-chip"
                [class.active]="permissionFilterCategory() === 'KPI'"
                (click)="permissionFilterCategory.set('KPI')"
              >
                KPI ({{ getPermissionsByCategory('KPI').length }})
              </button>
              <button
                type="button"
                class="cat-chip"
                [class.active]="permissionFilterCategory() === 'BAO_CAO'"
                (click)="permissionFilterCategory.set('BAO_CAO')"
              >
                Báo cáo ({{ getPermissionsByCategory('BAO_CAO').length }})
              </button>
              <button
                type="button"
                class="cat-chip"
                [class.active]="permissionFilterCategory() === 'DANH_MUC_TO_CHUC'"
                (click)="permissionFilterCategory.set('DANH_MUC_TO_CHUC')"
              >
                Tổ chức & Danh mục ({{ getPermissionsByCategory('DANH_MUC_TO_CHUC').length }})
              </button>
              <button
                type="button"
                class="cat-chip"
                [class.active]="permissionFilterCategory() === 'QUAN_TRI_HE_THONG'"
                (click)="permissionFilterCategory.set('QUAN_TRI_HE_THONG')"
              >
                Quản trị HT ({{ getPermissionsByCategory('QUAN_TRI_HE_THONG').length }})
              </button>
            </div>

            <!-- INTERACTIVE MATRIX TABLE -->
            <div class="matrix-table-container">
              <table class="matrix-grid-table">
                <thead>
                  <tr>
                    <th class="col-perm-key">Mã & Tên Quyền (Permission)</th>
                    <th class="col-perm-cat">Nhóm chức năng</th>
                    @for (role of tenantRoles(); track role.id) {
                      <th class="col-role-header" [ngClass]="'header-' + role.code.toLowerCase()">
                        <div class="role-header-content">
                          <span class="material-symbols-outlined role-icon">{{ getRoleIconName(role.code) }}</span>
                          <span class="role-name">{{ role.name }}</span>
                          @if (!role.isSystem) {
                            <button
                              type="button"
                              class="btn-del-role"
                              (click)="deleteCustomRole(role)"
                              title="Xóa vai trò tùy biến này"
                            >
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          }
                        </div>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (perm of filteredPermissions(); track perm.key) {
                    <tr>
                      <td class="perm-title-cell">
                        <div class="perm-info">
                          <code class="perm-key">{{ perm.key }}</code>
                          <span class="perm-name">{{ perm.name }}</span>
                          @if (perm.description) {
                            <span class="perm-desc">{{ perm.description }}</span>
                          }
                        </div>
                      </td>
                      <td class="perm-cat-cell">
                        <span class="cat-badge" [ngClass]="'cat-' + perm.category.toLowerCase()">
                          {{ getCategoryLabel(perm.category) }}
                        </span>
                      </td>
                      @for (role of tenantRoles(); track role.id) {
                        <td class="perm-check-cell">
                          <label class="matrix-checkbox-wrapper tap-target">
                            <input
                              type="checkbox"
                              [checked]="isRoleHasPermission(role, perm.key)"
                              (change)="toggleRolePermission(role, perm.key)"
                            />
                            <span class="custom-check"></span>
                          </label>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- TAB 3: QUẢN LÝ ĐIỂM TRƯỜNG & PHÂN HIỆU -->
      <!-- ======================================================= -->
      @if (activeTab() === 'locations') {
        <div class="tab-content-panel">
          <!-- PHẦN 1: ĐIỂM TRƯỜNG & PHÂN HIỆU -->
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
                      <span class="metric-num progress-color">{{ loc.inProgressTaskCount }}</span>
                      <span class="metric-lbl">⏳ Đang làm</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-num overdue-color">{{ loc.overdueTaskCount }}</span>
                      <span class="metric-lbl">⚠️ Quá hạn</span>
                    </div>
                    <div class="metric-item">
                      <span class="metric-num done-color">{{ loc.completedTaskCount }}</span>
                      <span class="metric-lbl">✅ Hoàn thành</span>
                    </div>
                  </div>

                  <div class="loc-card-actions">
                    <button type="button" class="btn-card-action tap-target" (click)="openEditLocationModal(loc)">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Sửa thông tin</span>
                    </button>
                    @if (!loc.isMain) {
                      <button type="button" class="btn-card-action danger tap-target" (click)="confirmDeleteLocation(loc)">
                        <span class="material-symbols-outlined">delete</span>
                        <span>Xóa</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- PHẦN 2: TỔ CHUYÊN MÔN & KHỐI / PHÒNG BAN -->
          <div class="locations-top-bar" style="margin-top: 2.5rem; border-top: 1px solid #E2E8F0; padding-top: 1.75rem;">
            <div class="summary-meta-text">
              <h2>Danh sách Tổ Chuyên Môn & Khối / Phòng Ban ({{ orgUnits().length }})</h2>
              <p>Quản lý các tổ chuyên môn (Toán, Văn, Anh...), tổ văn phòng và các bộ phận nghiệp vụ trong trường.</p>
            </div>
            <button type="button" class="btn-primary tap-target" (click)="openCreateOrgUnitModal()">
              <span class="material-symbols-outlined">group_add</span>
              <span>+ Thêm tổ chuyên môn</span>
            </button>
          </div>

          <div class="desktop-table-wrapper hide-on-mobile">
            <table class="admin-table">
              <thead>
                <tr>
                  <th style="width: 60px;" class="text-center">STT</th>
                  <th>Tên Tổ / Phòng Ban</th>
                  <th style="width: 130px;">Mã Tổ</th>
                  <th style="width: 170px;">👑 Tổ trưởng phụ trách</th>
                  <th>Trực thuộc Cấp trên</th>
                  <th style="width: 90px;" class="text-center">Thứ tự</th>
                  <th style="width: 130px;" class="text-center">Số nhân sự</th>
                  <th style="width: 140px;" class="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (org of orgUnits(); track org.id; let idx = $index) {
                  <tr>
                    <td class="text-center font-medium text-slate-500">{{ idx + 1 }}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="color: #2563EB; font-size: 20px;">groups</span>
                        <strong style="color: #0F172A; font-size: 0.9rem;">{{ org.name }}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="code-tag font-mono">{{ org.code }}</span>
                    </td>
                    <td>
                      @if (getOrgLeader(org.id); as leader) {
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span class="role-badge-pill role-to-truong" style="font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; background: #FEF3C7; color: #B45309; font-weight: 600;">👑 {{ leader.fullName }}</span>
                        </div>
                      } @else {
                        <span class="text-slate-400 text-xs italic">Chưa chỉ định</span>
                      }
                    </td>
                    <td>
                      <span class="text-slate-600 text-xs">{{ org.parent?.name || getOrgName(org.parentId) || 'Trực thuộc Trường' }}</span>
                    </td>
                    <td class="text-center font-semibold text-slate-600">{{ org.orderIndex ?? 0 }}</td>
                    <td class="text-center">
                      <span class="tab-badge info">{{ getOrgUserCount(org.id) }} cán bộ GV</span>
                    </td>
                    <td class="text-right">
                      <div class="action-btn-group" style="display: inline-flex; gap: 6px;">
                        <button type="button" class="btn-icon-action" title="Chỉnh sửa tổ chuyên môn" (click)="openEditOrgUnitModal(org)">
                          <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button type="button" class="btn-icon-action danger" title="Xóa tổ chuyên môn" (click)="confirmDeleteOrgUnit(org)">
                          <span class="material-symbols-outlined">delete</span>
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

      <!-- ======================================================= -->
      <!-- TAB 4: NHÂN SỰ THEO ĐIỂM TRƯỜNG -->
      <!-- ======================================================= -->
      @if (activeTab() === 'teachers-by-loc') {
        <div class="tab-content-panel">
          <div class="campus-teachers-header">
            <div class="campus-selector-box">
              <span class="label">Chọn Điểm trường:</span>
              <div class="campus-chips">
                @for (loc of locations(); track loc.id) {
                  <button
                    type="button"
                    class="campus-chip-btn tap-target"
                    [class.active]="selectedCampusId === loc.id"
                    (click)="selectedCampusId = loc.id; loadCampusTeachers()"
                  >
                    <span class="material-symbols-outlined">{{ loc.isMain ? 'apartment' : 'domain' }}</span>
                    <span>{{ loc.name }}</span>
                  </button>
                }
              </div>
            </div>

            <button type="button" class="btn-primary tap-target" (click)="openAddTeacherToCampusModal()">
              <span class="material-symbols-outlined">person_add</span>
              <span>+ Thêm GV vào điểm trường</span>
            </button>
          </div>

          <!-- TEACHERS TABLE IN CAMPUS -->
          <div class="desktop-table-wrapper hide-on-mobile">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Số điện thoại</th>
                  <th>Tổ / Bộ phận</th>
                  <th>Vai trò</th>
                  <th>Tải công việc</th>
                  <th class="text-right">Điều chuyển</th>
                </tr>
              </thead>
              <tbody>
                @for (t of pagedCampusTeachers(); track t.id) {
                  <tr>
                    <td>
                      <div class="user-cell">
                        <img [src]="t.avatarUrl || 'https://ui-avatars.com/api/?name=' + t.fullName" class="table-avatar" />
                        <div class="user-meta">
                          <span class="user-fullname">{{ t.fullName }}</span>
                          <span class="user-sub">{{ t.title }}</span>
                        </div>
                      </div>
                    </td>
                    <td>{{ t.phone }}</td>
                    <td>{{ t.primaryOrgUnit?.name || '—' }}</td>
                    <td>
                      <div class="roles-chips-cell">
                        @for (r of t.roles; track r.id) {
                          <span class="role-micro-chip" [ngClass]="'role-' + r.role.toLowerCase()">
                            {{ getRoleLabel(r.role) }}
                          </span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="workload-pill" [ngClass]="getWorkloadClass(t.currentTaskLoad)">
                        {{ t.currentTaskLoad }} việc
                      </span>
                    </td>
                    <td class="text-right">
                      <button type="button" class="btn-transfer tap-target" (click)="openTransferCampusModal(t)">
                        <span class="material-symbols-outlined">swap_horiz</span>
                        <span>Chuyển cơ sở</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <app-pagination
            [totalItems]="filteredCampusTeachers().length"
            [pageSize]="teachersPageSize()"
            [currentPage]="currentTeachersPage()"
            itemName="giáo viên"
            (pageChange)="onTeachersPageChange($event)"
            (pageSizeChange)="onTeachersPageSizeChange($event)"
          ></app-pagination>
        </div>
      }

      <!-- ======================================================= -->
      <!-- TAB 5: DANH MỤC DÙNG CHUNG (SHARED CATEGORIES) -->
      <!-- ======================================================= -->
      @if (activeTab() === 'categories') {
        <div class="tab-content-panel">
          <div class="section-title-box flex-between">
            <div class="title-meta-left">
              <span class="material-symbols-outlined title-icon">category</span>
              <div>
                <h2>Quản lý Danh mục Dùng chung Hệ thống</h2>
                <p class="note-text">Cấu hình các loại danh mục: Loại công việc, Học kỳ, Năm học, Chức vụ...</p>
              </div>
            </div>
            <button type="button" class="btn-primary tap-target" (click)="openCategoryModal()">
              <span class="material-symbols-outlined">add</span>
              <span>+ Thêm Danh mục Mới</span>
            </button>
          </div>

          <!-- Category Type Selector -->
          <div class="category-type-tabs">
            <button
              type="button"
              class="type-tab-btn"
              [class.active]="selectedCategoryType() === 'all'"
              (click)="selectedCategoryType.set('all')"
            >
              Tất cả ({{ categoriesList().length }})
            </button>
            <button
              type="button"
              class="type-tab-btn"
              [class.active]="selectedCategoryType() === 'LOAI_CONG_VIEC'"
              (click)="selectedCategoryType.set('LOAI_CONG_VIEC')"
            >
              Loại công việc
            </button>
            <button
              type="button"
              class="type-tab-btn"
              [class.active]="selectedCategoryType() === 'HOC_KY'"
              (click)="selectedCategoryType.set('HOC_KY')"
            >
              Học kỳ
            </button>
            <button
              type="button"
              class="type-tab-btn"
              [class.active]="selectedCategoryType() === 'NAM_HOC'"
              (click)="selectedCategoryType.set('NAM_HOC')"
            >
              Năm học
            </button>
            <button
              type="button"
              class="type-tab-btn"
              [class.active]="selectedCategoryType() === 'CHUC_VU'"
              (click)="selectedCategoryType.set('CHUC_VU')"
            >
              Chức vụ
            </button>
          </div>

          <!-- CATEGORIES TABLE -->
          <div class="desktop-table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Loại Danh mục</th>
                  <th>Mã (Code)</th>
                  <th>Tên hiển thị</th>
                  <th>Thứ tự</th>
                  <th>Mặc định</th>
                  <th>Trạng thái</th>
                  <th class="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (cat of filteredCategories(); track cat.id) {
                  <tr>
                    <td>
                      <span class="cat-type-badge">{{ cat.type }}</span>
                    </td>
                    <td><code>{{ cat.code }}</code></td>
                    <td><strong>{{ cat.name }}</strong></td>
                    <td>{{ cat.orderIndex }}</td>
                    <td>
                      @if (cat.isDefault) {
                        <span class="default-badge">⭐ Mặc định</span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <span class="status-pill" [class.active]="cat.isActive" [class.locked]="!cat.isActive">
                        <span class="dot"></span>
                        <span>{{ cat.isActive ? 'Áp dụng' : 'Ẩn' }}</span>
                      </span>
                    </td>
                    <td class="text-right actions-cell">
                      <button type="button" class="action-btn edit" (click)="openCategoryModal(cat)" title="Sửa">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button type="button" class="action-btn delete" (click)="deleteCategory(cat)" title="Xóa">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- TAB 6: CẤU HÌNH CHỈ SỐ KPI (KPI DEFINITIONS) -->
      <!-- ======================================================= -->
      @if (activeTab() === 'kpi-config') {
        <div class="tab-content-panel">
          <div class="section-title-box flex-between">
            <div class="title-meta-left">
              <span class="material-symbols-outlined title-icon">monitoring</span>
              <div>
                <h2>Cấu hình Chỉ số Đánh giá KPI Bổ sung</h2>
                <p class="note-text">Thiết lập các tiêu chí KPI tùy biến của nhà trường (Sáng kiến kinh nghiệm, Tiết dạy tốt, Công tác kiêm nhiệm...).</p>
              </div>
            </div>
            <button type="button" class="btn-primary tap-target" (click)="openKPIModal()">
              <span class="material-symbols-outlined">add</span>
              <span>+ Thêm Chỉ số KPI Mới</span>
            </button>
          </div>

          <!-- KPI DEFINITIONS TABLE -->
          <div class="desktop-table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Mã KPI</th>
                  <th>Tên Chỉ số</th>
                  <th>Đơn vị tính</th>
                  <th>Mục tiêu</th>
                  <th>Trọng số</th>
                  <th>Vai trò áp dụng</th>
                  <th>Trạng thái</th>
                  <th class="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (kpi of kpiDefinitionsList(); track kpi.id) {
                  <tr>
                    <td><code>{{ kpi.code }}</code></td>
                    <td>
                      <div class="kpi-meta-cell">
                        <strong>{{ kpi.name }}</strong>
                        @if (kpi.description) {
                          <span class="kpi-desc">{{ kpi.description }}</span>
                        }
                      </div>
                    </td>
                    <td><span class="unit-badge">{{ kpi.unit }}</span></td>
                    <td><strong>{{ kpi.targetValue !== null ? kpi.targetValue : '—' }}</strong></td>
                    <td><span class="weight-tag">x{{ kpi.weight }}</span></td>
                    <td>
                      <div class="roles-chips-cell">
                        @for (r of getApplicableRolesList(kpi); track r) {
                          <span class="role-micro-chip">{{ getRoleLabel(r) }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="status-pill" [class.active]="kpi.isActive" [class.locked]="!kpi.isActive">
                        <span class="dot"></span>
                        <span>{{ kpi.isActive ? 'Áp dụng' : 'Tạm dừng' }}</span>
                      </span>
                    </td>
                    <td class="text-right actions-cell">
                      <button type="button" class="action-btn edit" (click)="openKPIModal(kpi)" title="Sửa">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button type="button" class="action-btn delete" (click)="deleteKPIDefinition(kpi)" title="Xóa">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 1: TẠO TÀI KHOẢN MỚI -->
      <!-- ======================================================= -->
      @if (showCreateUserModal()) {
        <div class="modal-backdrop">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Tạo mới Tài khoản Nhân sự</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Họ và tên <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="newUserForm.fullName" placeholder="Ví dụ: Nguyễn Văn An" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Số điện thoại (Dùng đăng nhập) <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="newUserForm.phone" placeholder="0901234567" class="form-input" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Email liên hệ <span class="req">*</span></label>
                  <input type="email" [(ngModel)]="newUserForm.email" placeholder="an.nv@dongnai.edu.vn" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Chức danh / Chức vụ</label>
                  <input type="text" [(ngModel)]="newUserForm.position" placeholder="Giáo viên Toán, Nhân viên Văn thư..." class="form-input" />
                </div>
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

              <!-- Vai trò ban đầu & cờ Tổ trưởng -->
              <div class="form-group">
                <label>Vai trò ban đầu</label>
                <select [(ngModel)]="newUserInitialRole" class="form-select">
                  <option value="GIAO_VIEN">Giáo viên</option>
                  <option value="TO_TRUONG">Tổ trưởng</option>
                  <option value="PHO_HIEU_TRUONG">Phó Hiệu trưởng</option>
                  <option value="HIEU_TRUONG">Hiệu trưởng</option>
                  <option value="NHAN_VIEN">Nhân viên / Hành chính</option>
                  <option value="ADMIN">Quản trị hệ thống (Admin)</option>
                </select>
              </div>

              @if (newUserForm.orgUnitId) {
                <div class="form-group to-truong-switch-group">
                  <label class="custom-checkbox-container tap-target">
                    <input type="checkbox" [(ngModel)]="newUserForm.isToTruong" />
                    <div class="checkbox-text-block">
                      <strong class="checkbox-title">👑 Bổ nhiệm làm Tổ trưởng tổ chuyên môn</strong>
                      <span class="checkbox-subtitle">Phụ trách điều hành, phân công và kiểm tra công việc trong {{ getOrgName(newUserForm.orgUnitId) }}.</span>
                    </div>
                  </label>
                </div>
              }
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
      <!-- MODAL 2: SỬA TÀI KHOẢN -->
      <!-- ======================================================= -->
      @if (showEditUserModal() && editingUser()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Sửa thông tin: {{ editingUser()?.fullName }}</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Họ và tên <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="editUserForm.fullName" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Số điện thoại <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="editUserForm.phone" class="form-input" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Email liên hệ <span class="req">*</span></label>
                  <input type="email" [(ngModel)]="editUserForm.email" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Chức danh</label>
                  <input type="text" [(ngModel)]="editUserForm.position" class="form-input" />
                </div>
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

              @if (editUserForm.orgUnitId) {
                <div class="form-group to-truong-switch-group">
                  <label class="custom-checkbox-container tap-target">
                    <input type="checkbox" [(ngModel)]="editUserForm.isToTruong" />
                    <div class="checkbox-text-block">
                      <strong class="checkbox-title">👑 Đảm nhiệm vai trò Tổ trưởng tổ chuyên môn</strong>
                      <span class="checkbox-subtitle">Phụ trách điều hành, phân công và kiểm tra công việc trong {{ getOrgName(editUserForm.orgUnitId) }}.</span>
                    </div>
                  </label>
                </div>
              }
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
      <!-- MODAL 3: GÁN VAI TRÒ MỚI CHO USER -->
      <!-- ======================================================= -->
      @if (showAddRoleModal()) {
        <div class="modal-backdrop">
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
        <div class="modal-backdrop">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
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
                  <input type="text" [(ngModel)]="locationForm.name" placeholder="Ví dụ: Phân hiệu 3" class="form-input" />
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

              <!-- Người phụ trách cơ sở / điểm trường -->
              <div class="form-group">
                <label>Người phụ trách điểm trường / phân hiệu</label>
                <app-people-picker
                  placeholder="Tìm & chỉ định người phụ trách cơ sở..."
                  mode="single"
                  [required]="false"
                  [(ngModel)]="locationForm.managerId"
                ></app-people-picker>
                <span class="field-hint" style="font-size: 0.8rem; color: #64748B;">
                  Cán bộ chịu trách nhiệm quản lý cơ sở và nhận báo cáo định kỳ.
                </span>
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
      <!-- MODAL TẠO / SỬA TỔ CHUYÊN MÔN -->
      <!-- ======================================================= -->
      @if (showOrgUnitModal()) {
        <div class="modal-backdrop">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingOrgUnitId ? 'Sửa Tổ Chuyên Môn / Phòng Ban' : 'Thêm Mới Tổ Chuyên Môn' }}</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Tên Tổ chuyên môn / Phòng ban <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="orgUnitForm.name"
                  placeholder="Ví dụ: Tổ Toán - Tin học, Tổ Ngữ văn..."
                  class="form-input"
                />
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Mã Tổ (Code) <span class="req">*</span></label>
                  <input
                    type="text"
                    [(ngModel)]="orgUnitForm.code"
                    placeholder="Ví dụ: TO_TOAN_TIN"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>Thứ tự hiển thị</label>
                  <input
                    type="number"
                    [(ngModel)]="orgUnitForm.orderIndex"
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label>Tổ chức cấp trên (Trực thuộc)</label>
                <select [(ngModel)]="orgUnitForm.parentId" class="form-select">
                  <option [ngValue]="null">-- Trực thuộc Trường (Cấp cao nhất) --</option>
                  @for (parentOrg of getAvailableParentOrgs(); track parentOrg.id) {
                    <option [value]="parentOrg.id">{{ parentOrg.name }} ({{ parentOrg.code }})</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>👑 Tổ trưởng chuyên môn phụ trách tổ</label>
                <app-people-picker
                  placeholder="Tìm & chỉ định Tổ trưởng chuyên môn..."
                  mode="single"
                  [required]="false"
                  [(ngModel)]="orgUnitForm.leaderId"
                ></app-people-picker>
                <span class="field-hint" style="font-size: 0.8rem; color: #64748B; margin-top: 4px; display: block;">
                  Mỗi tổ có 1 Tổ trưởng chuyên môn chịu trách nhiệm phân công, quản lý và duyệt công việc trong phạm vi tổ.
                </span>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button
                type="button"
                class="btn-primary tap-target"
                [disabled]="isSubmitting()"
                (click)="submitOrgUnitForm()"
              >
                {{ isSubmitting() ? 'Đang lưu...' : (editingOrgUnitId ? 'Cập nhật' : 'Tạo tổ chuyên môn') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL ĐIỀU CHUYỂN CƠ SỞ CÔNG TÁC -->
      @if (showTransferModal() && transferTeacherTarget()) {
        <div class="modal-backdrop">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Điều chuyển Cơ sở công tác</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="user-transfer-card" style="padding: 12px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; display: flex; align-items: center; gap: 12px;">
                <img [src]="transferTeacherTarget()?.avatarUrl || 'https://ui-avatars.com/api/?name=' + transferTeacherTarget()?.fullName" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" />
                <div>
                  <div style="font-weight: 700; color: #1E293B;">{{ transferTeacherTarget()?.fullName }}</div>
                  <div style="font-size: 0.85rem; color: #64748B;">{{ transferTeacherTarget()?.title || 'Giáo viên' }} • Cơ sở hiện tại: <strong>{{ getCurrentCampusName() }}</strong></div>
                </div>
              </div>
              <div class="form-group" style="margin-top: 10px;">
                <label>Chọn Điểm trường / Phân hiệu tiếp nhận <span class="req">*</span></label>
                <select [(ngModel)]="transferDestinationLocationId" class="form-select">
                  @for (loc of getOtherCampuses(); track loc.id) {
                    <option [value]="loc.id">{{ loc.name }} ({{ loc.code }})</option>
                  }
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button type="button" class="btn-primary tap-target" [disabled]="isSubmitting() || !transferDestinationLocationId" (click)="confirmTransferCampus()">
                {{ isSubmitting() ? 'Đang chuyển...' : 'Xác nhận điều chuyển' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 5: TẠO VAI TRÒ TÙY BIẾN (CUSTOM ROLE) -->
      <!-- ======================================================= -->
      @if (showCustomRoleModal()) {
        <div class="modal-backdrop">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Tạo Vai trò Tùy biến (Custom Role)</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Mã vai trò (Code) <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="customRoleForm.code" placeholder="Ví dụ: TONG_PHU_TRACH" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Tên vai trò hiển thị <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="customRoleForm.name" placeholder="Ví dụ: Tổng phụ trách Đội" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label>Mô tả nhiệm vụ</label>
                <textarea [(ngModel)]="customRoleForm.description" rows="2" placeholder="Mô tả phạm vi trách nhiệm của vai trò..." class="form-textarea"></textarea>
              </div>

              <div class="form-group">
                <label>Chọn các quyền khởi tạo ({{ customRoleForm.permissionKeys.length }} đã chọn):</label>
                <div class="role-perms-selector-box">
                  @for (perm of permissionsCatalog(); track perm.key) {
                    <label class="perm-checkbox-item">
                      <input
                        type="checkbox"
                        [checked]="customRoleForm.permissionKeys.includes(perm.key)"
                        (change)="toggleCustomRolePerm(perm.key)"
                      />
                      <span class="perm-title">{{ perm.name }}</span>
                      <code class="perm-sub">({{ perm.key }})</code>
                    </label>
                  }
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button type="button" class="btn-primary tap-target" [disabled]="isSubmitting()" (click)="submitCreateRole()">
                {{ isSubmitting() ? 'Đang tạo...' : 'Tạo Vai trò' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 6: TẠO / SỬA DANH MỤC DÙNG CHUNG -->
      <!-- ======================================================= -->
      @if (showCategoryModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingCategoryId ? 'Sửa Danh mục' : 'Thêm mới Danh mục Dùng chung' }}</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Loại danh mục <span class="req">*</span></label>
                <select [(ngModel)]="categoryForm.type" class="form-select" [disabled]="!!editingCategoryId">
                  <option value="LOAI_CONG_VIEC">Loại công việc (LOAI_CONG_VIEC)</option>
                  <option value="HOC_KY">Học kỳ (HOC_KY)</option>
                  <option value="NAM_HOC">Năm học (NAM_HOC)</option>
                  <option value="CHUC_VU">Chức vụ (CHUC_VU)</option>
                </select>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label>Mã danh mục (Code) <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="categoryForm.code" placeholder="Ví dụ: DOT_XUAT" class="form-input" [disabled]="!!editingCategoryId" />
                </div>
                <div class="form-group">
                  <label>Thứ tự hiển thị</label>
                  <input type="number" [(ngModel)]="categoryForm.orderIndex" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label>Tên hiển thị <span class="req">*</span></label>
                <input type="text" [(ngModel)]="categoryForm.name" placeholder="Ví dụ: Việc đột xuất" class="form-input" />
              </div>

              <div class="form-grid-2">
                <div class="form-group checkbox-group">
                  <label class="custom-checkbox">
                    <input type="checkbox" [(ngModel)]="categoryForm.isDefault" />
                    <span>Đặt làm giá trị mặc định</span>
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label class="custom-checkbox">
                    <input type="checkbox" [(ngModel)]="categoryForm.isActive" />
                    <span>Đang áp dụng</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button type="button" class="btn-primary tap-target" [disabled]="isSubmitting()" (click)="submitCategoryForm()">
                {{ isSubmitting() ? 'Đang lưu...' : 'Lưu Danh mục' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 7: TẠO / SỬA CHỈ SỐ KPI -->
      <!-- ======================================================= -->
      @if (showKPIModal()) {
        <div class="modal-backdrop">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingKPIId ? 'Sửa Chỉ số KPI' : 'Thêm mới Chỉ số KPI' }}</h3>
              <button type="button" class="modal-close-btn" (click)="closeModals()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Mã chỉ số (Code) <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="kpiForm.code" placeholder="Ví dụ: KPI_SANG_KIEN" class="form-input" [disabled]="!!editingKPIId" />
                </div>
                <div class="form-group">
                  <label>Tên chỉ số <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="kpiForm.name" placeholder="Ví dụ: Số sáng kiến kinh nghiệm" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label>Mô tả tiêu chí đánh giá</label>
                <textarea [(ngModel)]="kpiForm.description" rows="2" class="form-textarea" placeholder="Mô tả cách tính và yêu cầu minh chứng..."></textarea>
              </div>

              <div class="form-grid-3">
                <div class="form-group">
                  <label>Đơn vị tính</label>
                  <input type="text" [(ngModel)]="kpiForm.unit" placeholder="Sáng kiến, Điểm, Tiết..." class="form-input" />
                </div>
                <div class="form-group">
                  <label>Mục tiêu kỳ</label>
                  <input type="number" [(ngModel)]="kpiForm.targetValue" placeholder="1, 2, 10..." class="form-input" />
                </div>
                <div class="form-group">
                  <label>Trọng số (Weight)</label>
                  <input type="number" step="0.5" [(ngModel)]="kpiForm.weight" class="form-input" />
                </div>
              </div>

              <div class="form-group">
                <label>Áp dụng cho các vai trò:</label>
                <div class="applicable-roles-box">
                  <label class="role-check-item">
                    <input type="checkbox" [checked]="isRoleApplicable('GIAO_VIEN')" (change)="toggleRoleApplicable('GIAO_VIEN')" />
                    <span>Giáo viên</span>
                  </label>
                  <label class="role-check-item">
                    <input type="checkbox" [checked]="isRoleApplicable('TO_TRUONG')" (change)="toggleRoleApplicable('TO_TRUONG')" />
                    <span>Tổ trưởng</span>
                  </label>
                  <label class="role-check-item">
                    <input type="checkbox" [checked]="isRoleApplicable('PHO_HIEU_TRUONG')" (change)="toggleRoleApplicable('PHO_HIEU_TRUONG')" />
                    <span>Phó Hiệu trưởng</span>
                  </label>
                  <label class="role-check-item">
                    <input type="checkbox" [checked]="isRoleApplicable('NHAN_VIEN')" (change)="toggleRoleApplicable('NHAN_VIEN')" />
                    <span>Nhân viên</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel tap-target" (click)="closeModals()">Hủy</button>
              <button type="button" class="btn-primary tap-target" [disabled]="isSubmitting()" (click)="submitKPIForm()">
                {{ isSubmitting() ? 'Đang lưu...' : 'Lưu Chỉ số KPI' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ======================================================= -->
      <!-- MODAL 8: THÔNG BÁO TẠO USER THÀNH CÔNG -->
      <!-- ======================================================= -->
      @if (createdUserSuccessInfo()) {
        <div class="modal-backdrop">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header success-header">
              <span class="material-symbols-outlined success-icon">check_circle</span>
              <h3>Tạo tài khoản thành công!</h3>
              <button type="button" class="modal-close-btn" (click)="createdUserSuccessInfo.set(null)">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <p>Tài khoản cho nhân sự đã sẵn sàng để đăng nhập vào hệ thống TN EDU.</p>
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

          .tag-icon { font-size: 16px; }
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

          .warn-icon { font-size: 22px; color: #D97706; }
          .warn-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            .warn-title { font-size: 0.88rem; color: #92400E; strong { font-weight: 700; color: #78350F; } }
            .warn-desc { font-size: 0.78rem; color: #B45309; }
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
            &:hover { background: #2E5B9A; }
          }
        }
      }

      /* TABS NAVIGATION */
      .tabs-nav-bar {
        display: flex;
        gap: 8px;
        border-bottom: 2px solid #E2E8F0;
        padding-bottom: 2px;
        overflow-x: auto;

        .nav-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: transparent;
          border: none;
          border-radius: 8px 8px 0 0;
          font-size: 0.92rem;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;

          .material-symbols-outlined { font-size: 20px; }

          .tab-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            background: #F1F5F9;
            color: #475569;

            &.info { background: #DBEAFE; color: #1E40AF; }
            &.purple { background: #F3E8FF; color: #6B21A8; }
            &.orange { background: #FFEDD5; color: #9A3412; }
          }

          &:hover {
            color: #1E293B;
            background: #F8FAFC;
          }

          &.active {
            color: #1F3864;
            font-weight: 700;
            border-bottom: 3px solid #1F3864;
            background: #F1F5F9;

            .tab-badge {
              background: #1F3864;
              color: #FFFFFF;
            }
          }
        }
      }

      /* TOAST BANNER */
      .alert-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 18px;
        border-radius: 10px;
        font-size: 0.9rem;
        font-weight: 600;

        &.success {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
          .alert-icon { color: #059669; }
        }

        &.error {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
          .alert-icon { color: #DC2626; }
        }

        .alert-text { flex: 1; }
        .alert-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
        }
      }

      /* QUOTA USAGE BANNER CARD */
      .quota-banner-card {
        background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
        color: #FFFFFF;
        padding: 18px 22px;
        border-radius: 14px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        gap: 12px;

        .quota-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;

          .quota-package-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.95rem;

            .pkg-icon { color: #38BDF8; font-size: 22px; }
            .pkg-title strong { color: #38BDF8; }

            .sub-expiry-badge {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              background: rgba(255, 255, 255, 0.12);
              padding: 3px 10px;
              border-radius: 9999px;
              font-size: 0.8rem;
              color: #CBD5E1;
              .material-symbols-outlined { font-size: 14px; }
            }
          }

          .quota-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(56, 189, 248, 0.15);
            border: 1px solid rgba(56, 189, 248, 0.3);
            color: #7DD3FC;
            padding: 4px 14px;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 700;

            &.warning {
              background: rgba(245, 158, 11, 0.2);
              border-color: rgba(245, 158, 11, 0.4);
              color: #FCD34D;
            }

            &.danger {
              background: rgba(239, 68, 68, 0.25);
              border-color: rgba(239, 68, 68, 0.5);
              color: #FCA5A5;
            }
          }
        }

        .quota-progress-track {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
          overflow: hidden;

          .quota-progress-fill {
            height: 100%;
            background: #38BDF8;
            border-radius: 9999px;
            transition: width 0.4s ease;

            &.warning { background: #F59E0B; }
            &.danger { background: #EF4444; }
          }
        }

        .quota-footer-details {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.83rem;
          color: #94A3B8;

          .quota-detail-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            .material-symbols-outlined { font-size: 16px; color: #38BDF8; }
            strong { color: #FFFFFF; }
          }
        }
      }

      /* FILTER CONTROLS */
      .filter-controls-card {
        background: #FFFFFF;
        padding: 16px 20px;
        border-radius: 12px;
        border: 1px solid #E2E8F0;
        display: flex;
        flex-direction: column;
        gap: 12px;

        .filter-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;

          .search-input-box {
            position: relative;
            flex: 1;
            min-width: 280px;

            .search-icon {
              position: absolute;
              left: 12px;
              top: 50%;
              transform: translateY(-50%);
              color: #94A3B8;
              font-size: 20px;
            }

            .search-input {
              width: 100%;
              padding: 10px 36px 10px 40px;
              border: 1px solid #CBD5E1;
              border-radius: 8px;
              font-size: 0.9rem;
              &:focus {
                border-color: #1F3864;
                outline: none;
                box-shadow: 0 0 0 3px rgba(31, 56, 100, 0.1);
              }
            }

            .clear-input-btn {
              position: absolute;
              right: 10px;
              top: 50%;
              transform: translateY(-50%);
              background: none;
              border: none;
              color: #94A3B8;
              cursor: pointer;
            }
          }
        }

        .filter-chips-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;

          .filter-label { font-size: 0.85rem; font-weight: 700; color: #475569; }
          .filter-select {
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            font-size: 0.85rem;
            background: #FFFFFF;
            &:focus { border-color: #1F3864; outline: none; }
          }

          .status-toggle-chips {
            display: inline-flex;
            gap: 6px;
            margin-left: auto;

            .chip-btn {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 6px 12px;
              border: 1px solid #CBD5E1;
              border-radius: 9999px;
              background: #FFFFFF;
              font-size: 0.82rem;
              font-weight: 600;
              color: #475569;
              cursor: pointer;

              .dot { width: 8px; height: 8px; border-radius: 50%; }
              .dot.green { background: #10B981; }
              .dot.red { background: #EF4444; }

              &.active {
                background: #1F3864;
                color: #FFFFFF;
                border-color: #1F3864;
              }
            }
          }
        }
      }

      /* ADMIN TABLES */
      .desktop-table-wrapper {
        background: #FFFFFF;
        border-radius: 12px;
        border: 1px solid #E2E8F0;
        overflow-x: auto;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;

          th {
            background: #F8FAFC;
            color: #475569;
            font-weight: 700;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid #E2E8F0;
            white-space: nowrap;
          }

          td {
            padding: 12px 16px;
            border-bottom: 1px solid #F1F5F9;
            vertical-align: middle;
          }

          tr:hover td {
            background: #F8FAFC;
          }

          tr.row-locked td {
            opacity: 0.65;
            background: #FFF5F5;
          }
        }
      }

      /* USER CELL */
      .user-cell {
        display: flex;
        align-items: center;
        gap: 12px;

        .table-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #E2E8F0;
        }

        .user-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .user-fullname-row {
            display: flex;
            align-items: center;
            gap: 6px;
            .user-fullname { font-weight: 700; color: #1E293B; }
            .badge-totruong-mini {
              font-size: 0.72rem;
              background: #FEF3C7;
              color: #92400E;
              padding: 2px 6px;
              border-radius: 4px;
              font-weight: 700;
            }
          }

          .user-sub { font-size: 0.78rem; color: #64748B; }
        }
      }

      .phone-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #1F3864;
        font-weight: 600;
        text-decoration: none;
        .phone-icon { font-size: 16px; }
        &:hover { text-decoration: underline; }
      }

      .loc-badge {
        display: inline-block;
        padding: 4px 10px;
        background: #F1F5F9;
        color: #334155;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;

        &.main-loc {
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FDE68A;
        }
      }

      .org-badge {
        display: inline-block;
        padding: 4px 10px;
        background: #EFF6FF;
        color: #1D4ED8;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .roles-chips-cell {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;

        .role-micro-chip {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.74rem;
          font-weight: 700;
          background: #E2E8F0;
          color: #334155;

          &.role-hieu_truong { background: #FEF3C7; color: #92400E; }
          &.role-pho_hieu_truong { background: #DBEAFE; color: #1E40AF; }
          &.role-to_truong { background: #E0E7FF; color: #3730A3; }
          &.role-giao_vien { background: #DCFCE7; color: #166534; }
          &.role-nhan_vien { background: #F1F5F9; color: #475569; }
          &.role-admin { background: #FEE2E2; color: #991B1B; }
        }
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.78rem;
        font-weight: 700;

        .dot { width: 6px; height: 6px; border-radius: 50%; }

        &.active {
          background: #ECFDF5;
          color: #065F46;
          .dot { background: #10B981; }
        }

        &.locked {
          background: #FEF2F2;
          color: #991B1B;
          .dot { background: #EF4444; }
        }
      }

      .actions-cell {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;

        .action-btn {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          background: #FFFFFF;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;

          .material-symbols-outlined { font-size: 18px; }

          &:hover {
            background: #F1F5F9;
            color: #1E293B;
          }

          &.edit:hover { background: #EFF6FF; color: #1D4ED8; border-color: #93C5FD; }
          &.status:hover { background: #FEF3C7; color: #D97706; border-color: #FCD34D; }
          &.status.locked:hover { background: #ECFDF5; color: #059669; border-color: #6EE7B7; }
          &.reset-pass:hover { background: #F3E8FF; color: #7E22CE; border-color: #D8B4FE; }
          &.delete:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        }
      }

      /* BUTTONS */
      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 16px;
        background: #1F3864;
        color: #FFFFFF;
        border: none;
        border-radius: 8px;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
        &:hover { background: #2E5B9A; }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
      }

      .btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: #F1F5F9;
        color: #1E293B;
        border: 1px solid #CBD5E1;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        &:hover { background: #E2E8F0; }
      }

      .btn-cancel {
        padding: 8px 14px;
        background: transparent;
        border: 1px solid #CBD5E1;
        border-radius: 8px;
        color: #475569;
        font-weight: 600;
        cursor: pointer;
        &:hover { background: #F1F5F9; }
      }

      /* DYNAMIC RBAC MATRIX SECTION */
      .roles-panel {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .roles-management-card, .permissions-matrix-card {
        background: #FFFFFF;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #E2E8F0;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .section-title-box {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        &.flex-between {
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
        }

        .title-meta-left {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .title-icon { font-size: 28px; color: #1F3864; }
        h2 { font-size: 1.15rem; font-weight: 800; color: #1E293B; margin: 0 0 4px 0; }
        p, .note-text { font-size: 0.85rem; color: #64748B; margin: 0; }
      }

      .category-filter-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        .cat-chip {
          padding: 6px 14px;
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;

          &:hover { background: #F1F5F9; }
          &.active {
            background: #1F3864;
            color: #FFFFFF;
            border-color: #1F3864;
          }
        }
      }

      .matrix-table-container {
        overflow-x: auto;
        border: 1px solid #E2E8F0;
        border-radius: 10px;

        .matrix-grid-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;

          th {
            background: #F8FAFC;
            padding: 12px;
            font-weight: 700;
            color: #334155;
            border: 1px solid #E2E8F0;
            text-align: center;

            &.col-perm-key { text-align: left; min-width: 260px; }
            &.col-perm-cat { text-align: left; width: 140px; }

            .role-header-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;

              .role-icon { font-size: 20px; color: #1F3864; }
              .role-name { font-size: 0.82rem; font-weight: 700; }
              .btn-del-role {
                background: none;
                border: none;
                color: #EF4444;
                cursor: pointer;
                padding: 2px;
                .material-symbols-outlined { font-size: 16px; }
              }
            }
          }

          td {
            padding: 10px 12px;
            border: 1px solid #E2E8F0;
            vertical-align: middle;

            &.perm-title-cell {
              .perm-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                .perm-key { font-weight: 700; color: #1E40AF; background: #EFF6FF; padding: 1px 6px; border-radius: 4px; display: inline-block; width: fit-content; }
                .perm-name { font-weight: 600; color: #1E293B; font-size: 0.86rem; }
                .perm-desc { font-size: 0.76rem; color: #64748B; }
              }
            }

            &.perm-cat-cell {
              .cat-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.72rem;
                font-weight: 700;

                &.cat-ke_hoach { background: #DBEAFE; color: #1E40AF; }
                &.cat-cong_viec { background: #DCFCE7; color: #166534; }
                &.cat-kpi { background: #FFEDD5; color: #9A3412; }
                &.cat-bao_cao { background: #F3E8FF; color: #6B21A8; }
                &.cat-danh_muc_to_chuc { background: #E0E7FF; color: #3730A3; }
                &.cat-quan_tri_he_thong { background: #FEE2E2; color: #991B1B; }
              }
            }

            &.perm-check-cell {
              text-align: center;

              .matrix-checkbox-wrapper {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;

                input[type="checkbox"] {
                  width: 18px;
                  height: 18px;
                  accent-color: #1F3864;
                  cursor: pointer;
                }
              }
            }
          }

          tr:hover td { background: #F8FAFC; }
        }
      }

      /* ROLES CHIPS GRID */
      .large-roles-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 12px;
        margin-top: 10px;

        .large-role-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          background: #F8FAFC;

          .role-icon-box {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }

          .role-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            .role-title-text { font-weight: 700; font-size: 0.88rem; color: #1E293B; }
            .role-scope-text { font-size: 0.76rem; color: #64748B; }
          }

          .remove-role-btn {
            background: none;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            &:hover { color: #EF4444; }
          }
        }
      }

      /* LOCATIONS GRID */
      .locations-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 18px;

        .location-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);

          &.main-campus {
            border: 2px solid #F59E0B;
            background: linear-gradient(180deg, #FFFDF7 0%, #FFFFFF 100%);
          }

          .loc-badge-group {
            display: flex;
            align-items: center;
            gap: 8px;
            .main-tag { background: #FEF3C7; color: #92400E; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; }
            .sub-tag { background: #EFF6FF; color: #1D4ED8; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; }
            .code-tag { font-family: monospace; font-size: 0.75rem; color: #64748B; }
          }

          .loc-name { font-size: 1.15rem; font-weight: 800; color: #1E293B; margin: 0; }
          .loc-address, .loc-phone {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.82rem;
            color: #64748B;
            margin: 0;
            .loc-icon { font-size: 16px; color: #94A3B8; }
            a { color: #1F3864; text-decoration: none; font-weight: 600; }
          }

          .manager-box {
            background: #F8FAFC;
            padding: 10px 12px;
            border-radius: 8px;
            font-size: 0.8rem;

            .manager-label { font-size: 0.74rem; color: #64748B; display: block; margin-bottom: 6px; }
            .manager-info {
              display: flex;
              align-items: center;
              gap: 8px;
              .mgr-avatar { width: 30px; height: 30px; border-radius: 50%; }
              .mgr-meta { display: flex; flex-direction: column; }
              .mgr-name { font-weight: 700; color: #1E293B; }
              .mgr-sub { font-size: 0.72rem; color: #64748B; }
            }
            .no-manager-text { color: #94A3B8; font-style: italic; }
          }

          .loc-metrics-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            background: #F1F5F9;
            padding: 10px 8px;
            border-radius: 8px;
            text-align: center;

            .metric-item {
              display: flex;
              flex-direction: column;
              gap: 2px;
              .metric-num { font-size: 1.05rem; font-weight: 800; color: #1E293B; }
              .metric-num.progress-color { color: #2563EB; }
              .metric-num.overdue-color { color: #DC2626; }
              .metric-num.done-color { color: #16A34A; }
              .metric-lbl { font-size: 0.68rem; color: #64748B; }
            }
          }

          .loc-card-actions {
            display: flex;
            gap: 8px;
            margin-top: auto;
            .btn-card-action {
              flex: 1;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              padding: 8px;
              border: 1px solid #CBD5E1;
              background: #FFFFFF;
              border-radius: 6px;
              font-size: 0.82rem;
              font-weight: 600;
              color: #334155;
              cursor: pointer;
              &:hover { background: #F8FAFC; }
              &.danger { color: #DC2626; &:hover { background: #FEF2F2; } }
            }
          }
        }
      }

      /* CATEGORIES & KPI TAB STYLES */
      .category-type-tabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 4px;

        .type-tab-btn {
          padding: 8px 16px;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          background: #FFFFFF;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          white-space: nowrap;

          &:hover { background: #F8FAFC; }
          &.active {
            background: #1F3864;
            color: #FFFFFF;
            border-color: #1F3864;
          }
        }
      }

      .cat-type-badge {
        display: inline-block;
        padding: 3px 8px;
        background: #F3E8FF;
        color: #7E22CE;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .default-badge {
        display: inline-block;
        padding: 2px 8px;
        background: #FEF3C7;
        color: #92400E;
        border-radius: 4px;
        font-size: 0.74rem;
        font-weight: 700;
      }

      .unit-badge {
        display: inline-block;
        padding: 2px 8px;
        background: #EFF6FF;
        color: #1D4ED8;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .weight-tag {
        font-weight: 700;
        color: #B45309;
        background: #FEF3C7;
        padding: 2px 8px;
        border-radius: 4px;
      }

      .kpi-meta-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .kpi-desc { font-size: 0.76rem; color: #64748B; }
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
        z-index: 999;
        padding: 16px;

        .modal-dialog {
          background: #FFFFFF;
          border-radius: 14px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);

          &.modal-lg { max-width: 680px; }

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid #E2E8F0;
            h3 { font-size: 1.15rem; font-weight: 800; color: #1E293B; margin: 0; }
            .modal-close-btn { background: none; border: none; font-size: 20px; color: #94A3B8; cursor: pointer; }
          }

          .modal-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .modal-footer {
            padding: 14px 20px;
            border-top: 1px solid #E2E8F0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
          }
        }
      }

      .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        label { font-size: 0.84rem; font-weight: 700; color: #334155; }
        .req { color: #DC2626; }
        .form-input, .form-select, .form-textarea {
          padding: 9px 12px;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          font-size: 0.88rem;
          background: #FFFFFF;
          &:focus { border-color: #1F3864; outline: none; box-shadow: 0 0 0 3px rgba(31, 56, 100, 0.1); }
        }
      }

      .role-perms-selector-box {
        max-height: 220px;
        overflow-y: auto;
        border: 1px solid #CBD5E1;
        border-radius: 8px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;

        .perm-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          cursor: pointer;
          .perm-title { font-weight: 600; color: #1E293B; }
          .perm-sub { font-size: 0.74rem; color: #64748B; }
        }
      }

      .applicable-roles-box {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        .role-check-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          cursor: pointer;
        }
      }

      .tab-content-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .locations-top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 14px;
        background: #FFFFFF;
        padding: 16px 20px;
        border-radius: 12px;
        border: 1px solid #E2E8F0;

        .summary-meta-text {
          h2 { font-size: 1.15rem; font-weight: 800; color: #1E293B; margin: 0 0 4px 0; }
          p { font-size: 0.85rem; color: #64748B; margin: 0; }
        }
      }

      /* CAMPUS TEACHERS TAB (TAB 4) */
      .campus-teachers-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 14px;
        background: #FFFFFF;
        padding: 16px 20px;
        border-radius: 12px;
        border: 1px solid #E2E8F0;
      }

      .campus-selector-box {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;

        .label {
          font-size: 0.88rem;
          font-weight: 700;
          color: #334155;
          white-space: nowrap;
        }
      }

      .campus-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .campus-chip-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        cursor: pointer;
        transition: all 0.15s ease;

        .material-symbols-outlined {
          font-size: 18px;
          color: #64748B;
        }

        &:hover {
          background: #EFF6FF;
          color: #1D4ED8;
          border-color: #93C5FD;
          .material-symbols-outlined { color: #1D4ED8; }
        }

        &.active {
          background: #1F3864 !important;
          color: #FFFFFF !important;
          border-color: #1F3864 !important;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(31, 56, 100, 0.2);

          .material-symbols-outlined {
            color: #FFFFFF !important;
          }
        }
      }

      .btn-transfer {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: 1px solid #CBD5E1;
        background: #FFFFFF;
        color: #334155;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;

        .material-symbols-outlined { font-size: 16px; }

        &:hover {
          background: #EFF6FF;
          color: #1D4ED8;
          border-color: #93C5FD;
        }
      }

      .workload-pill {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 0.78rem;
        font-weight: 700;
        background: #F1F5F9;
        color: #475569;

        &.workload-none { background: #F1F5F9; color: #64748B; }
        &.workload-light { background: #ECFDF5; color: #065F46; }
        &.workload-medium { background: #EFF6FF; color: #1D4ED8; }
        &.workload-heavy { background: #FEF3C7; color: #92400E; }
        &.workload-high { background: #FEE2E2; color: #991B1B; }
      }

      .empty-state-box {
        background: #FFFFFF;
        padding: 40px 20px;
        border-radius: 12px;
        border: 1px solid #E2E8F0;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;

        .empty-icon { font-size: 48px; color: #94A3B8; }
        h3 { font-size: 1.1rem; font-weight: 700; color: #1E293B; margin: 0; }
        p { font-size: 0.85rem; color: #64748B; margin: 0; }
      }

      /* USER ROLES SELECTOR & DETAILS (TAB 2) */
      .user-picker-wrapper {
        margin-top: 4px;
      }

      .user-roles-detail-box {
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: #F8FAFC;
        padding: 16px 18px;
        border-radius: 12px;
        border: 1px solid #E2E8F0;

        .user-profile-bar {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;

          .profile-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 2px solid #CBD5E1;
            object-fit: cover;
          }

          .profile-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            .profile-name { font-size: 1.05rem; font-weight: 700; color: #1E293B; }
            .profile-sub { font-size: 0.82rem; color: #64748B; }
          }

          .add-role-btn {
            margin-left: auto;
          }
        }

        .assigned-roles-list {
          display: flex;
          flex-direction: column;
          gap: 10px;

          .roles-header-label {
            font-size: 0.85rem;
            font-weight: 700;
            color: #334155;
          }

          .no-roles-msg {
            font-size: 0.85rem;
            color: #94A3B8;
            font-style: italic;
            margin: 0;
          }
        }
      }

      .picker-placeholder-box {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px;
        background: #F8FAFC;
        border: 1px dashed #CBD5E1;
        border-radius: 10px;
        color: #64748B;
        font-size: 0.88rem;

        .material-symbols-outlined { font-size: 24px; color: #94A3B8; }
        p { margin: 0; }
      }

      .to-truong-switch-group {
        background: #FFFBEB;
        border: 1px solid #FDE68A;
        padding: 12px 14px;
        border-radius: 8px;

        .custom-checkbox-container {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;

          input[type="checkbox"] {
            margin-top: 3px;
            width: 18px;
            height: 18px;
            accent-color: #D97706;
          }

          .checkbox-text-block {
            display: flex;
            flex-direction: column;
            gap: 2px;
            .checkbox-title { font-size: 0.88rem; color: #92400E; }
            .checkbox-subtitle { font-size: 0.78rem; color: #B45309; }
          }
        }
      }

      .custom-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #334155;
        cursor: pointer;

        input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #1F3864;
        }
      }

      .success-header {
        background: #ECFDF5;
        color: #065F46;
        .success-icon { font-size: 26px; color: #059669; }
        h3 { color: #065F46 !important; }
      }

      .created-account-card {
        background: #F8FAFC;
        padding: 14px;
        border-radius: 8px;
        border: 1px solid #E2E8F0;
        display: flex;
        flex-direction: column;
        gap: 8px;

        .acc-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          .acc-lbl { color: #64748B; }
          .acc-val { font-weight: 700; color: #1E293B; }
          .acc-val.highlight { color: #1D4ED8; }
          .pass-badge { background: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
        }
      }

      .skeleton-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        .skeleton-row {
          height: 48px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `,
  ],
})
export class AdminSettingsComponent implements OnInit {
  adminService = inject(AdminService);
  userService = inject(UserService);
  authService = inject(AuthService);
  confirmDialog = inject(ConfirmDialogService);

  // STATE SIGNALS
  activeTab = signal<AdminTab>('accounts');
  alertMessage = signal<string>('');
  alertType = signal<'success' | 'error'>('success');
  isSubmitting = signal<boolean>(false);

  // METADATA
  locations = signal<LocationItem[]>([]);
  orgUnits = signal<OrgUnitItem[]>([]);

  // TAB 1: ACCOUNTS & QUOTA STATE
  usersList = signal<AdminUserItem[]>([]);
  totalUsers = signal<number>(0);
  isLoadingUsers = signal<boolean>(false);
  searchKeyword = '';
  filterLocationId = '';
  filterOrgUnitId = '';
  filterRole = '';
  filterStatus: 'all' | 'active' | 'locked' = 'all';

  currentUsersPage = signal<number>(1);
  usersPageSize = signal<number>(10);

  quotaInfo = signal<TenantQuotaInfo | null>(null);

  pagedUsersList = computed(() => {
    const list = this.usersList();
    const page = this.currentUsersPage();
    const size = this.usersPageSize();
    return list.slice((page - 1) * size, page * size);
  });

  // TAB 2: DYNAMIC RBAC MATRIX & ROLES STATE
  selectedRoleUser = signal<AdminUserItem | null>(null);
  permissionsCatalog = signal<PermissionItem[]>([]);
  tenantRoles = signal<RoleModelItem[]>([]);
  permissionFilterCategory = signal<string>('all');

  filteredPermissions = computed(() => {
    const cat = this.permissionFilterCategory();
    const list = this.permissionsCatalog();
    if (cat === 'all') return list;
    return list.filter((p) => p.category === cat);
  });

  // TAB 3: LOCATIONS SUMMARY STATE
  locationsSummary = signal<LocationSummaryItem[]>([]);
  isLoadingLocations = signal<boolean>(false);

  // TAB 4: TEACHERS BY LOCATION STATE
  selectedCampusId = '';
  campusTeachersList = signal<AdminUserItem[]>([]);
  campusSearchKeyword = '';
  currentTeachersPage = signal<number>(1);
  teachersPageSize = signal<number>(10);

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

  pagedCampusTeachers = computed(() => {
    const list = this.filteredCampusTeachers();
    const page = this.currentTeachersPage();
    const size = this.teachersPageSize();
    return list.slice((page - 1) * size, page * size);
  });

  // TAB 5: CATEGORIES STATE
  selectedCategoryType = signal<string>('all');
  categoriesList = signal<SharedCategoryItem[]>([]);

  filteredCategories = computed(() => {
    const type = this.selectedCategoryType();
    const list = this.categoriesList();
    if (type === 'all') return list;
    return list.filter((c) => c.type === type);
  });

  // TAB 6: KPI DEFINITIONS STATE
  kpiDefinitionsList = signal<KPIDefinitionItem[]>([]);

  // MODAL VISIBILITY SIGNALS
  showCreateUserModal = signal<boolean>(false);
  showEditUserModal = signal<boolean>(false);
  showAddRoleModal = signal<boolean>(false);
  showLocationModal = signal<boolean>(false);
  showOrgUnitModal = signal<boolean>(false);
  showCustomRoleModal = signal<boolean>(false);
  showTransferModal = signal<boolean>(false);
  transferTeacherTarget = signal<AdminUserItem | null>(null);
  transferDestinationLocationId = '';
  showCategoryModal = signal<boolean>(false);
  showKPIModal = signal<boolean>(false);
  createdUserSuccessInfo = signal<AdminUserItem | null>(null);
  copiedText = signal<boolean>(false);

  // FORMS
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

  editingOrgUnitId: string | null = null;
  orgUnitForm = {
    name: '',
    code: '',
    parentId: null as string | null,
    orderIndex: 0,
    leaderId: null as string | null,
  };

  customRoleForm = {
    code: '',
    name: '',
    description: '',
    permissionKeys: [] as string[],
  };

  editingCategoryId: string | null = null;
  categoryForm = {
    type: 'LOAI_CONG_VIEC',
    code: '',
    name: '',
    orderIndex: 0,
    isDefault: false,
    isActive: true,
  };

  editingKPIId: string | null = null;
  kpiForm = {
    code: '',
    name: '',
    description: '',
    unit: 'Điểm',
    targetValue: 1 as number | null,
    weight: 1.0,
    applicableRoles: ['GIAO_VIEN', 'TO_TRUONG'] as string[],
  };

  ngOnInit() {
    this.loadCommonMetadata();
    this.loadQuota();
    this.loadUsers();
    this.loadPermissionsCatalog();
    this.loadTenantRoles();
    this.loadLocationsSummary();
    this.loadCategories();
    this.loadKPIDefinitions();

    this.authService.accountSwitched$.subscribe(() => {
      this.loadCommonMetadata();
      this.loadQuota();
      this.loadUsers();
      this.loadPermissionsCatalog();
      this.loadTenantRoles();
      this.loadLocationsSummary();
      this.loadCategories();
      this.loadKPIDefinitions();
    });
  }

  switchTab(tab: AdminTab) {
    this.activeTab.set(tab);
    if (tab === 'accounts') {
      this.loadQuota();
      this.loadUsers();
    } else if (tab === 'roles') {
      this.loadPermissionsCatalog();
      this.loadTenantRoles();
    } else if (tab === 'locations') {
      this.loadLocationsSummary();
    } else if (tab === 'teachers-by-loc') {
      this.userService.clearLocationsCache();
      this.adminService.getLocationsWithSummary().subscribe({
        next: (res) => {
          this.locationsSummary.set(res);
          this.locations.set(res);
          if (!this.selectedCampusId && res.length > 0) {
            this.selectedCampusId = res[0].id;
          } else if (this.selectedCampusId && !res.some((l) => l.id === this.selectedCampusId) && res.length > 0) {
            this.selectedCampusId = res[0].id;
          }
          this.loadCampusTeachers();
        },
        error: () => {
          this.loadCampusTeachers();
        },
      });
    } else if (tab === 'categories') {
      this.loadCategories();
    } else if (tab === 'kpi-config') {
      this.loadKPIDefinitions();
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
    this.userService.clearLocationsCache();
    this.userService.getLocations(true).subscribe({
      next: (locs) => {
        this.locations.set(locs);
        if (!this.selectedCampusId && locs.length > 0) {
          this.selectedCampusId = locs[0].id;
        } else if (this.selectedCampusId && !locs.some((l) => l.id === this.selectedCampusId) && locs.length > 0) {
          this.selectedCampusId = locs[0].id;
        }
      },
    });

    this.userService.getOrgUnits().subscribe({
      next: (orgs) => this.orgUnits.set(orgs),
    });
  }

  loadQuota() {
    this.adminService.getQuota().subscribe({
      next: (data) => this.quotaInfo.set(data),
      error: () => {},
    });
  }

  // =======================================================
  // TAB 1: ACCOUNTS LOGIC
  // =======================================================
  loadUsers() {
    this.isLoadingUsers.set(true);
    this.currentUsersPage.set(1);
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

  onUsersPageChange(page: number) {
    this.currentUsersPage.set(page);
  }

  onUsersPageSizeChange(size: number) {
    this.usersPageSize.set(size);
    this.currentUsersPage.set(1);
  }

  openCreateUserModal(prefillLocationId?: string) {
    this.newUserForm = {
      fullName: '',
      phone: '',
      email: '',
      position: '',
      locationId: prefillLocationId || null,
      orgUnitId: null,
      isToTruong: false,
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
      fullName: this.newUserForm.fullName.trim(),
      phone: this.newUserForm.phone.trim(),
      email: this.newUserForm.email.trim(),
      roles: [
        {
          role: this.newUserInitialRole,
          scopeLocationId: this.newUserForm.locationId || null,
          scopeOrgUnitId: this.newUserForm.orgUnitId || null,
        },
      ],
    };

    this.adminService.createUser(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showCreateUserModal.set(false);
        this.createdUserSuccessInfo.set(res.user);
        this.showAlert(res.message || 'Tạo tài khoản người dùng thành công.');
        this.loadUsers();
        this.loadQuota();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Tạo tài khoản thất bại.', 'error');
      },
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
      isToTruong: this.isUserToTruong(user),
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
        this.showAlert(`Đã cập nhật thông tin tài khoản ${this.editUserForm.fullName}`);
        this.loadUsers();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Cập nhật thất bại.', 'error');
      },
    });
  }

  async confirmToggleStatus(user: AdminUserItem) {
    const actionName = user.isActive ? 'KHOÁ' : 'MỞ KHOÁ';
    const confirmed = await this.confirmDialog.confirm({
      title: `${actionName} tài khoản`,
      message: `Bạn có chắc chắn muốn ${actionName} tài khoản "${user.fullName}" (${user.email})?`,
      confirmText: actionName,
      type: user.isActive ? 'danger' : 'warning',
    });
    if (confirmed) {
      this.adminService.toggleUserStatus(user.id, !user.isActive).subscribe({
        next: (res) => {
          this.showAlert(res.isActive ? `Đã mở khoá tài khoản ${user.fullName}` : `Đã khoá tài khoản ${user.fullName}`);
          this.loadUsers();
          this.loadQuota();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Lỗi khi cập nhật trạng thái tài khoản', 'error');
        },
      });
    }
  }

  async confirmResetPassword(user: AdminUserItem) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Đặt lại mật khẩu',
      message: `Đặt lại mật khẩu của tài khoản "${user.fullName}" về mặc định "123456"?`,
      confirmText: 'Đặt lại mật khẩu',
      type: 'warning',
    });
    if (confirmed) {
      this.adminService.resetPassword(user.id).subscribe({
        next: (res) => {
          this.showAlert(res.message || `Đã đặt lại mật khẩu cho ${user.fullName} về mặc định: 123456`);
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Lỗi khi đặt lại mật khẩu', 'error');
        },
      });
    }
  }

  copyAccountInfo() {
    const info = this.createdUserSuccessInfo();
    if (!info) return;
    const text = `Kính gửi thầy/cô ${info.fullName},\nThông tin đăng nhập hệ thống TN EDU của thầy/cô:\n- Địa chỉ: ${window.location.origin}\n- Tài khoản (SĐT): ${info.phone}\n- Mật khẩu mặc định: 123456\nThầy/cô vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.`;
    navigator.clipboard.writeText(text);
    this.copiedText.set(true);
    setTimeout(() => this.copiedText.set(false), 3000);
  }

  // =======================================================
  // TAB 2: DYNAMIC RBAC MATRIX & ROLES LOGIC
  // =======================================================
  loadPermissionsCatalog() {
    this.adminService.getPermissions().subscribe({
      next: (perms) => this.permissionsCatalog.set(perms),
      error: () => {},
    });
  }

  loadTenantRoles() {
    this.adminService.getRoles().subscribe({
      next: (roles) => this.tenantRoles.set(roles),
      error: () => {},
    });
  }

  getPermissionsByCategory(cat: string): PermissionItem[] {
    return this.permissionsCatalog().filter((p) => p.category === cat);
  }

  getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      KE_HOACH: 'Kế hoạch',
      CONG_VIEC: 'Công việc',
      KPI: 'Đánh giá KPI',
      BAO_CAO: 'Báo cáo',
      DANH_MUC_TO_CHUC: 'Tổ chức & DM',
      QUAN_TRI_HE_THONG: 'Quản trị HT',
    };
    return map[cat] || cat;
  }

  isRoleHasPermission(role: RoleModelItem, permKey: string): boolean {
    return role.permissionKeys?.includes(permKey) || false;
  }

  toggleRolePermission(role: RoleModelItem, permKey: string) {
    const currentPerms = new Set(role.permissionKeys || []);
    if (currentPerms.has(permKey)) {
      currentPerms.delete(permKey);
    } else {
      currentPerms.add(permKey);
    }
    const updatedPermKeys = Array.from(currentPerms);
    role.permissionKeys = updatedPermKeys;

    this.adminService.updateRolePermissions(role.id, updatedPermKeys).subscribe({
      next: () => {
        this.showAlert(`Đã cập nhật quyền cho vai trò [${role.name}] thành công.`);
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'Lỗi khi cập nhật phân quyền', 'error');
        this.loadTenantRoles();
      },
    });
  }

  openCreateRoleModal() {
    this.customRoleForm = {
      code: '',
      name: '',
      description: '',
      permissionKeys: [],
    };
    this.showCustomRoleModal.set(true);
  }

  toggleCustomRolePerm(permKey: string) {
    const idx = this.customRoleForm.permissionKeys.indexOf(permKey);
    if (idx >= 0) {
      this.customRoleForm.permissionKeys.splice(idx, 1);
    } else {
      this.customRoleForm.permissionKeys.push(permKey);
    }
  }

  submitCreateRole() {
    if (!this.customRoleForm.code.trim() || !this.customRoleForm.name.trim()) {
      this.showAlert('Vui lòng nhập Mã vai trò và Tên vai trò.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.adminService
      .createRole({
        code: this.customRoleForm.code.trim().toUpperCase(),
        name: this.customRoleForm.name.trim(),
        description: this.customRoleForm.description?.trim(),
        permissionKeys: this.customRoleForm.permissionKeys,
      })
      .subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.showCustomRoleModal.set(false);
          this.showAlert(`Tạo vai trò tùy biến [${created.name}] thành công.`);
          this.loadTenantRoles();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Tạo vai trò thất bại.', 'error');
        },
      });
  }

  async deleteCustomRole(role: RoleModelItem) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa vai trò tùy biến',
      message: `Xóa vai trò tùy biến [${role.name}]? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa vai trò',
      type: 'danger',
    });
    if (confirmed) {
      this.adminService.deleteRole(role.id).subscribe({
        next: () => {
          this.showAlert(`Đã xóa vai trò ${role.name}`);
          this.loadTenantRoles();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Xóa vai trò thất bại.', 'error');
        },
      });
    }
  }

  onRoleTargetUserSelected(pickerItem: UserPickerItem | null) {
    if (!pickerItem) {
      this.selectedRoleUser.set(null);
      return;
    }
    const found = this.usersList().find((u) => u.id === pickerItem.id);
    if (found) {
      this.selectedRoleUser.set(found);
    } else {
      this.adminService.getUsers({ search: pickerItem.email, pageSize: 1 }).subscribe({
        next: (res) => {
          if (res.items.length > 0) this.selectedRoleUser.set(res.items[0]);
        },
      });
    }
  }

  openAddRoleModal() {
    this.newRoleData = {
      role: 'GIAO_VIEN',
      scopeLocationId: null,
      scopeOrgUnitId: null,
    };
    this.showAddRoleModal.set(true);
  }

  submitAddRole() {
    const user = this.selectedRoleUser();
    if (!user) return;

    this.isSubmitting.set(true);
    this.adminService
      .addUserRole(user.id, {
        role: this.newRoleData.role,
        scopeLocationId: this.newRoleData.scopeLocationId,
        scopeOrgUnitId: this.newRoleData.scopeOrgUnitId,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showAddRoleModal.set(false);
          this.showAlert(`Đã gán thêm vai trò [${this.getRoleLabel(this.newRoleData.role)}] cho ${user.fullName}`);
          this.loadUsers();
          this.adminService.getUsers({ search: user.email, pageSize: 1 }).subscribe({
            next: (res) => {
              if (res.items.length > 0) this.selectedRoleUser.set(res.items[0]);
            },
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Lỗi khi gán vai trò', 'error');
        },
      });
  }

  async confirmRemoveRole(roleItem: AdminUserRole) {
    const user = this.selectedRoleUser();
    if (!user) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Gỡ vai trò',
      message: `Bạn có chắc chắn muốn gỡ vai trò "${this.getRoleLabel(roleItem.role)}" khỏi ${user.fullName}?`,
      confirmText: 'Gỡ vai trò',
      type: 'warning',
    });
    if (confirmed) {
      this.adminService.removeUserRole(user.id, roleItem.id).subscribe({
        next: () => {
          this.showAlert(`Đã gỡ vai trò khỏi ${user.fullName}`);
          this.loadUsers();
          this.adminService.getUsers({ search: user.email, pageSize: 1 }).subscribe({
            next: (res) => {
              if (res.items.length > 0) this.selectedRoleUser.set(res.items[0]);
            },
          });
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Lỗi khi gỡ vai trò', 'error');
        },
      });
    }
  }

  // =======================================================
  // TAB 3: LOCATIONS SUMMARY LOGIC
  // =======================================================
  loadLocationsSummary() {
    this.isLoadingLocations.set(true);
    this.adminService.getLocationsWithSummary().subscribe({
      next: (res) => {
        this.locationsSummary.set(res);
        this.locations.set(res);
        if (!this.selectedCampusId && res.length > 0) {
          this.selectedCampusId = res[0].id;
        } else if (this.selectedCampusId && !res.some((l) => l.id === this.selectedCampusId) && res.length > 0) {
          this.selectedCampusId = res[0].id;
        }
        this.isLoadingLocations.set(false);
      },
      error: () => {
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
    this.showLocationModal.set(true);
  }

  submitLocationForm() {
    if (!this.locationForm.name.trim() || !this.locationForm.code.trim()) {
      this.showAlert('Vui lòng nhập Tên điểm trường và Mã điểm trường.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    const payload = {
      ...this.locationForm,
      managerId: this.locationForm.managerId || null,
    };

    if (this.editingLocationId) {
      this.adminService.updateLocation(this.editingLocationId, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showLocationModal.set(false);
          this.showAlert('Cập nhật thông tin điểm trường thành công.');
          this.userService.clearLocationsCache();
          this.loadLocationsSummary();
          this.loadCommonMetadata();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Cập nhật điểm trường thất bại.', 'error');
        },
      });
    } else {
      this.adminService.createLocation(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showLocationModal.set(false);
          this.showAlert('Tạo điểm trường mới thành công.');
          this.userService.clearLocationsCache();
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

  async confirmDeleteLocation(loc: LocationSummaryItem) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa điểm trường',
      message: `Bạn có chắc chắn muốn xóa điểm trường "${loc.name}"?`,
      confirmText: 'Xóa điểm trường',
      type: 'danger',
    });
    if (confirmed) {
      this.adminService.deleteLocation(loc.id).subscribe({
        next: () => {
          this.showAlert(`Đã xóa điểm trường ${loc.name}`);
          this.userService.clearLocationsCache();
          this.loadLocationsSummary();
          this.loadCommonMetadata();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Xóa điểm trường thất bại.', 'error');
        },
      });
    }
  }

  // =======================================================
  // ORG UNITS CRUD LOGIC
  // =======================================================
  getOrgUserCount(orgId: string): number {
    return this.usersList().filter((u) => u.primaryOrgUnit?.id === orgId).length;
  }

  getAvailableParentOrgs(): OrgUnitItem[] {
    if (!this.editingOrgUnitId) return this.orgUnits();
    return this.orgUnits().filter((o) => o.id !== this.editingOrgUnitId);
  }

  openCreateOrgUnitModal() {
    this.editingOrgUnitId = null;
    this.orgUnitForm = {
      name: '',
      code: '',
      parentId: null,
      orderIndex: this.orgUnits().length + 1,
      leaderId: null,
    };
    this.showOrgUnitModal.set(true);
  }

  openEditOrgUnitModal(org: OrgUnitItem) {
    this.editingOrgUnitId = org.id;
    const currentLeader = this.getOrgLeader(org.id);
    this.orgUnitForm = {
      name: org.name,
      code: org.code,
      parentId: org.parentId || null,
      orderIndex: org.orderIndex ?? 0,
      leaderId: currentLeader ? currentLeader.id : null,
    };
    this.showOrgUnitModal.set(true);
  }

  submitOrgUnitForm() {
    if (!this.orgUnitForm.name.trim() || !this.orgUnitForm.code.trim()) {
      this.showAlert('Vui lòng nhập Tên tổ và Mã tổ chuyên môn.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    const payload = {
      name: this.orgUnitForm.name.trim(),
      code: this.orgUnitForm.code.trim().toUpperCase(),
      parentId: this.orgUnitForm.parentId || null,
      orderIndex: Number(this.orgUnitForm.orderIndex) || 0,
    };
    const chosenLeaderId = this.orgUnitForm.leaderId;

    if (this.editingOrgUnitId) {
      const orgId = this.editingOrgUnitId;
      const previousLeader = this.getOrgLeader(orgId);

      this.userService.updateOrgUnit(orgId, payload).subscribe({
        next: () => {
          if (chosenLeaderId && chosenLeaderId !== previousLeader?.id) {
            this.adminService.updateUser(chosenLeaderId, { isToTruong: true, orgUnitId: orgId }).subscribe({
              next: () => {
                this.isSubmitting.set(false);
                this.showOrgUnitModal.set(false);
                this.showAlert('Cập nhật tổ chuyên môn và bổ nhiệm Tổ trưởng thành công.');
                this.loadOrgUnitsData();
                this.loadUsers();
              },
              error: () => {
                this.isSubmitting.set(false);
                this.showOrgUnitModal.set(false);
                this.showAlert('Cập nhật tổ chuyên môn thành công (nhưng gán Tổ trưởng chưa hoàn tất).', 'error');
                this.loadOrgUnitsData();
              }
            });
          } else if (!chosenLeaderId && previousLeader) {
            this.adminService.updateUser(previousLeader.id, { isToTruong: false, orgUnitId: orgId }).subscribe({
              next: () => {
                this.isSubmitting.set(false);
                this.showOrgUnitModal.set(false);
                this.showAlert('Cập nhật tổ chuyên môn thành công.');
                this.loadOrgUnitsData();
                this.loadUsers();
              },
              error: () => {
                this.isSubmitting.set(false);
                this.showOrgUnitModal.set(false);
                this.loadOrgUnitsData();
              }
            });
          } else {
            this.isSubmitting.set(false);
            this.showOrgUnitModal.set(false);
            this.showAlert('Cập nhật tổ chuyên môn thành công.');
            this.loadOrgUnitsData();
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Cập nhật tổ chuyên môn thất bại.', 'error');
        },
      });
    } else {
      this.userService.createOrgUnit(payload).subscribe({
        next: (createdOrg: any) => {
          const createdOrgId = createdOrg?.id;
          if (chosenLeaderId && createdOrgId) {
            this.adminService.updateUser(chosenLeaderId, { isToTruong: true, orgUnitId: createdOrgId }).subscribe({
              next: () => {
                this.isSubmitting.set(false);
                this.showOrgUnitModal.set(false);
                this.showAlert('Thêm mới tổ chuyên môn và bổ nhiệm Tổ trưởng thành công.');
                this.loadOrgUnitsData();
                this.loadUsers();
              },
              error: () => {
                this.isSubmitting.set(false);
                this.showOrgUnitModal.set(false);
                this.showAlert('Thêm mới tổ chuyên môn thành công.');
                this.loadOrgUnitsData();
              }
            });
          } else {
            this.isSubmitting.set(false);
            this.showOrgUnitModal.set(false);
            this.showAlert('Thêm mới tổ chuyên môn thành công.');
            this.loadOrgUnitsData();
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Tạo tổ chuyên môn thất bại.', 'error');
        },
      });
    }
  }

  async confirmDeleteOrgUnit(org: OrgUnitItem) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa tổ chuyên môn',
      message: `Bạn có chắc chắn muốn xóa tổ chuyên môn [${org.name}]?`,
      confirmText: 'Xóa tổ',
      type: 'danger',
    });
    if (confirmed) {
      this.userService.deleteOrgUnit(org.id).subscribe({
        next: () => {
          this.showAlert(`Đã xóa tổ chuyên môn [${org.name}] thành công.`);
          this.loadOrgUnitsData();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Không thể xóa tổ chuyên môn (còn nhân sự hoặc nhiệm vụ liên kết).', 'error');
        },
      });
    }
  }

  loadOrgUnitsData() {
    this.userService.clearOrgUnitsCache();
    this.userService.getOrgUnits().subscribe({
      next: (orgs) => this.orgUnits.set(orgs),
    });
  }

  // =======================================================
  // TAB 4: CAMPUS TEACHERS LOGIC
  // =======================================================
  loadCampusTeachers() {
    if (!this.selectedCampusId) return;
    this.currentTeachersPage.set(1);
    this.adminService
      .getUsers({
        locationId: this.selectedCampusId,
        pageSize: 100,
      })
      .subscribe({
        next: (res) => {
          this.campusTeachersList.set(res.items);
        },
      });
  }

  onTeachersPageChange(page: number) {
    this.currentTeachersPage.set(page);
  }

  onTeachersPageSizeChange(size: number) {
    this.teachersPageSize.set(size);
    this.currentTeachersPage.set(1);
  }

  openAddTeacherToCampusModal() {
    this.openCreateUserModal(this.selectedCampusId);
  }

  getCurrentCampusName(): string {
    const loc = this.locations().find((l) => l.id === this.selectedCampusId);
    return loc ? loc.name : 'Điểm trường hiện tại';
  }

  getOtherCampuses(): LocationItem[] {
    return this.locations().filter((l) => l.id !== this.selectedCampusId);
  }

  openTransferCampusModal(teacher: AdminUserItem) {
    this.transferTeacherTarget.set(teacher);
    const other = this.getOtherCampuses();
    this.transferDestinationLocationId = other[0]?.id || '';
    this.showTransferModal.set(true);
  }

  confirmTransferCampus() {
    const teacher = this.transferTeacherTarget();
    if (!teacher || !this.transferDestinationLocationId) return;
    const targetLoc = this.locations().find((l) => l.id === this.transferDestinationLocationId);
    this.isSubmitting.set(true);
    this.adminService.updateUser(teacher.id, { locationId: this.transferDestinationLocationId }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showTransferModal.set(false);
        this.showAlert(`Đã điều chuyển ${teacher.fullName} sang ${targetLoc?.name || 'cơ sở mới'}`);
        this.userService.clearLocationsCache();
        this.loadCampusTeachers();
        this.loadLocationsSummary();
        this.loadCommonMetadata();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Chuyển cơ sở thất bại.', 'error');
      },
    });
  }

  // =======================================================
  // TAB 5: CATEGORIES LOGIC
  // =======================================================
  loadCategories() {
    this.adminService.getCategories().subscribe({
      next: (cats) => this.categoriesList.set(cats),
      error: () => {},
    });
  }

  openCategoryModal(cat?: SharedCategoryItem) {
    if (cat) {
      this.editingCategoryId = cat.id;
      this.categoryForm = {
        type: cat.type,
        code: cat.code,
        name: cat.name,
        orderIndex: cat.orderIndex,
        isDefault: cat.isDefault,
        isActive: cat.isActive,
      };
    } else {
      this.editingCategoryId = null;
      this.categoryForm = {
        type: this.selectedCategoryType() !== 'all' ? this.selectedCategoryType() : 'LOAI_CONG_VIEC',
        code: '',
        name: '',
        orderIndex: this.categoriesList().length + 1,
        isDefault: false,
        isActive: true,
      };
    }
    this.showCategoryModal.set(true);
  }

  submitCategoryForm() {
    if (!this.categoryForm.type || !this.categoryForm.code?.trim() || !this.categoryForm.name?.trim()) {
      this.showAlert('Vui lòng điền Loại, Mã và Tên danh mục.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    if (this.editingCategoryId) {
      this.adminService.updateCategory(this.editingCategoryId, this.categoryForm).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showCategoryModal.set(false);
          this.showAlert('Cập nhật danh mục thành công.');
          this.loadCategories();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Lỗi cập nhật danh mục.', 'error');
        },
      });
    } else {
      this.adminService.createCategory(this.categoryForm).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showCategoryModal.set(false);
          this.showAlert('Thêm mới danh mục thành công.');
          this.loadCategories();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Lỗi tạo danh mục.', 'error');
        },
      });
    }
  }

  async deleteCategory(cat: SharedCategoryItem) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa danh mục',
      message: `Xóa danh mục [${cat.name}]?`,
      confirmText: 'Xóa danh mục',
      type: 'danger',
    });
    if (confirmed) {
      this.adminService.deleteCategory(cat.id).subscribe({
        next: () => {
          this.showAlert(`Đã xóa danh mục ${cat.name}`);
          this.loadCategories();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Không thể xóa danh mục.', 'error');
        },
      });
    }
  }

  // =======================================================
  // TAB 6: KPI DEFINITIONS LOGIC
  // =======================================================
  loadKPIDefinitions() {
    this.adminService.getKPIDefinitions().subscribe({
      next: (kpis) => this.kpiDefinitionsList.set(kpis),
      error: () => {},
    });
  }

  openKPIModal(kpi?: KPIDefinitionItem) {
    if (kpi) {
      this.editingKPIId = kpi.id;
      this.kpiForm = {
        code: kpi.code,
        name: kpi.name,
        description: kpi.description || '',
        unit: kpi.unit || 'Điểm',
        targetValue: kpi.targetValue !== undefined ? kpi.targetValue : null,
        weight: kpi.weight || 1.0,
        applicableRoles: this.getApplicableRolesList(kpi),
      };
    } else {
      this.editingKPIId = null;
      this.kpiForm = {
        code: '',
        name: '',
        description: '',
        unit: 'Điểm',
        targetValue: 1,
        weight: 1.0,
        applicableRoles: ['GIAO_VIEN', 'TO_TRUONG'],
      };
    }
    this.showKPIModal.set(true);
  }

  getApplicableRolesList(kpi: KPIDefinitionItem): string[] {
    if (!kpi.applicableRoles) return [];
    if (Array.isArray(kpi.applicableRoles)) return kpi.applicableRoles;
    try {
      return JSON.parse(kpi.applicableRoles as any);
    } catch {
      return [];
    }
  }

  isRoleApplicable(role: string): boolean {
    return this.kpiForm.applicableRoles.includes(role);
  }

  toggleRoleApplicable(role: string) {
    const idx = this.kpiForm.applicableRoles.indexOf(role);
    if (idx >= 0) {
      this.kpiForm.applicableRoles.splice(idx, 1);
    } else {
      this.kpiForm.applicableRoles.push(role);
    }
  }

  submitKPIForm() {
    if (!this.kpiForm.code?.trim() || !this.kpiForm.name?.trim()) {
      this.showAlert('Vui lòng điền Mã và Tên chỉ số KPI.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    if (this.editingKPIId) {
      this.adminService.updateKPIDefinition(this.editingKPIId, this.kpiForm).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showKPIModal.set(false);
          this.showAlert('Cập nhật chỉ số KPI thành công.');
          this.loadKPIDefinitions();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Lỗi cập nhật KPI.', 'error');
        },
      });
    } else {
      this.adminService.createKPIDefinition(this.kpiForm).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showKPIModal.set(false);
          this.showAlert('Thêm mới chỉ số KPI thành công.');
          this.loadKPIDefinitions();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Lỗi tạo chỉ số KPI.', 'error');
        },
      });
    }
  }

  async deleteKPIDefinition(kpi: KPIDefinitionItem) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa chỉ số KPI',
      message: `Xóa chỉ số KPI [${kpi.name}]?`,
      confirmText: 'Xóa chỉ số',
      type: 'danger',
    });
    if (confirmed) {
      this.adminService.deleteKPIDefinition(kpi.id).subscribe({
        next: () => {
          this.showAlert(`Đã xóa chỉ số KPI ${kpi.name}`);
          this.loadKPIDefinitions();
        },
        error: (err) => {
          this.showAlert(err.error?.message || 'Không thể xóa chỉ số KPI.', 'error');
        },
      });
    }
  }

  closeModals() {
    this.showCreateUserModal.set(false);
    this.showEditUserModal.set(false);
    this.showAddRoleModal.set(false);
    this.showLocationModal.set(false);
    this.showOrgUnitModal.set(false);
    this.showTransferModal.set(false);
    this.showCustomRoleModal.set(false);
    this.showCategoryModal.set(false);
    this.showKPIModal.set(false);
  }

  // =======================================================
  // HELPERS
  // =======================================================
  isUserToTruong(user: AdminUserItem): boolean {
    return user.roles.some((r) => r.role === 'TO_TRUONG');
  }

  getOrgLeader(orgId: string): AdminUserItem | null {
    return this.usersList().find((u) =>
      u.roles.some((r) => r.role === 'TO_TRUONG' && (r.scopeOrgUnitId === orgId || u.primaryOrgUnit?.id === orgId))
    ) || null;
  }

  getOrgName(orgId: string | null | undefined): string {
    if (!orgId) return 'Tổ chuyên môn';
    return this.orgUnits().find((o) => o.id === orgId)?.name || 'Tổ chuyên môn';
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      HIEU_TRUONG: 'Hiệu trưởng',
      PHO_HIEU_TRUONG: 'Phó Hiệu trưởng',
      TO_TRUONG: 'Tổ trưởng',
      GIAO_VIEN: 'Giáo viên',
      NHAN_VIEN: 'Nhân viên',
      ADMIN: 'Quản trị hệ thống',
      TONG_PHU_TRACH: 'Tổng phụ trách Đội',
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
      TONG_PHU_TRACH: 'sports_score',
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

  switchToAdminAccount(): void {
    const adminAcc = this.authService.demoAccounts.find((a) => a.role === 'ADMIN');
    if (adminAcc) {
      this.authService.switchDemoAccount(adminAcc.identifier).subscribe({
        next: () => {
          this.loadUsers();
          this.loadQuota();
          this.loadTenantRoles();
          this.loadLocationsSummary();
        },
      });
    }
  }
}
