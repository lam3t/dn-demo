import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ContactCardService } from '../../../core/services/contact-card.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SearchService } from '../../../core/services/search.service';
import { GlobalSearchResult } from '../../../core/models/search.models';
import { ContactMiniCardComponent } from '../contact-mini-card/contact-mini-card.component';
import { UserPickerItem } from '../../../core/models/user.models';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ContactMiniCardComponent],
  template: `
    <div class="app-layout">
      <!-- 1. DESKTOP SIDEBAR -->
      <aside class="desktop-sidebar hide-on-mobile">
        <div class="sidebar-header">
          <div class="logo-box">
            <span class="material-symbols-outlined logo-icon">{{ authService.isSystemAdmin() ? 'hub' : 'insights' }}</span>
          </div>
          <div class="brand-text">
            <div class="brand-top">
              <h1 class="app-name">TN EDU</h1>
              <span class="version-tag">{{ authService.isSystemAdmin() ? 'SaaS' : '2026-2027' }}</span>
            </div>
            <span class="school-name">{{ authService.isSystemAdmin() ? 'QUẢN TRỊ NỀN TẢNG SAAS' : (authService.currentUser()?.tenantName || 'TH & THCS PHƯỚC TÂN') }}</span>
          </div>
        </div>

        <!-- Campus / Role Context Selector Pill (Only for School-level users) -->
        @if (!authService.isSystemAdmin() && authService.activeRole(); as role) {
          <div class="context-pill" [ngClass]="getRolePillClass()" [title]="'Đang làm việc với vai trò: ' + role.roleTitle">
            <span class="material-symbols-outlined pill-icon">{{ getRoleIcon() }}</span>
            <div class="pill-info">
              <span class="pill-role">{{ role.roleTitle }}</span>
              <span class="pill-scope">{{ role.scopeName || 'Toàn trường' }}</span>
            </div>
          </div>
        }

        <!-- Navigation Menu -->
        <nav class="sidebar-nav">
          @if (authService.isSystemAdmin()) {
            <!-- SYSTEM ADMIN: ONLY PLATFORM TENANTS & AUDIT LOGS -->
            <a routerLink="/system-admin" routerLinkActive="active" class="nav-link saas-link" title="Quản trị Nền tảng SaaS">
              <span class="material-symbols-outlined nav-icon saas-icon">hub</span>
              <span class="nav-text">Quản lý Trường học (Tenants)</span>
              <span class="sidebar-saas-badge">SaaS</span>
            </a>

            <a routerLink="/notifications" routerLinkActive="active" class="nav-link">
              <span class="material-symbols-outlined nav-icon">notifications</span>
              <span class="nav-text">Thông báo hệ thống</span>
              @if (notifService.unreadCount() > 0) {
                <span class="sidebar-unread-badge">{{ notifService.unreadCount() }}</span>
              }
            </a>
          } @else {
            <!-- SCHOOL-LEVEL USERS: SCHOOL MANAGEMENT MODULES -->
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
              <span class="material-symbols-outlined nav-icon">dashboard</span>
              <span class="nav-text">Dashboard</span>
            </a>

            <a routerLink="/school-info" routerLinkActive="active" class="nav-link">
              <span class="material-symbols-outlined nav-icon">domain</span>
              <span class="nav-text">Hồ sơ & Quy mô trường</span>
            </a>

            <a routerLink="/plans" routerLinkActive="active" class="nav-link">
              <span class="material-symbols-outlined nav-icon">calendar_month</span>
              <span class="nav-text">Lập kế hoạch & Phê duyệt</span>
            </a>

            <a routerLink="/tasks" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
              <span class="material-symbols-outlined nav-icon">assignment</span>
              <span class="nav-text">Quản lý công việc</span>
            </a>

            <a routerLink="/my-tasks" routerLinkActive="active" class="nav-link">
              <span class="material-symbols-outlined nav-icon">task_alt</span>
              <span class="nav-text">Việc của tôi</span>
            </a>

            <a routerLink="/my-kpi" routerLinkActive="active" class="nav-link" title="Đánh giá & Tính điểm KPI cá nhân">
              <span class="material-symbols-outlined nav-icon">monitoring</span>
              <span class="nav-text">KPI của tôi</span>
            </a>

            <a routerLink="/org" routerLinkActive="active" class="nav-link">
              <span class="material-symbols-outlined nav-icon">apartment</span>
              <span class="nav-text">Cơ cấu & Điểm trường</span>
            </a>

            <a routerLink="/reports" routerLinkActive="active" class="nav-link" title="Báo cáo & Xuất Excel">
              <span class="material-symbols-outlined nav-icon">analytics</span>
              <span class="nav-text">Báo cáo & Thống kê</span>
            </a>

            <a routerLink="/evidence" routerLinkActive="active" class="nav-link" title="Kho minh chứng & Tài liệu">
              <span class="material-symbols-outlined nav-icon">folder_open</span>
              <span class="nav-text">Kho minh chứng</span>
            </a>

            <a routerLink="/notifications" routerLinkActive="active" class="nav-link">
              <span class="material-symbols-outlined nav-icon">notifications</span>
              <span class="nav-text">Thông báo</span>
              @if (notifService.unreadCount() > 0) {
                <span class="sidebar-unread-badge">{{ notifService.unreadCount() }}</span>
              }
            </a>

            @if (authService.isAdmin()) {
              <a routerLink="/admin-settings" routerLinkActive="active" class="nav-link admin-link" title="Cấu hình hệ thống">
                <span class="material-symbols-outlined nav-icon admin-icon">admin_panel_settings</span>
                <span class="nav-text">Cấu hình hệ thống</span>
                <span class="sidebar-admin-badge">Admin</span>
              </a>
            }
          }
        </nav>

        <!-- Quick Create Task Action in Sidebar (Only for School Users) -->
        @if (!authService.isSystemAdmin()) {
          <div class="sidebar-action">
            <button type="button" class="create-task-btn" routerLink="/tasks" [queryParams]="{ create: 'true' }">
              <span class="material-symbols-outlined">add_circle</span>
              <span>{{ authService.isGiaoVien() ? 'Đề xuất việc mới' : 'Giao việc mới (RACI)' }}</span>
            </button>
          </div>
        }

        <!-- Version footer -->
        <div class="sidebar-bottom-badge">
          <span class="material-symbols-outlined icon-mini">verified</span>
          <span>{{ authService.isSystemAdmin() ? 'TN EDU SaaS Enterprise' : 'Phiên bản Năm học 2026-2027' }}</span>
        </div>
      </aside>

      <!-- 2. MAIN CONTENT AREA -->
      <div class="main-wrapper">
        <!-- TOP HEADER: CLEAN BRAND TITLE & USER CONTROLS -->
        <header class="top-nav-bar hide-on-mobile">
          <div class="nav-bar-left">
            <div class="header-brand-title hide-on-mobile">
              <span class="material-symbols-outlined brand-star-icon">{{ authService.isSystemAdmin() ? 'hub' : 'school' }}</span>
              <span class="brand-school">{{ authService.isSystemAdmin() ? 'TN EDU • QUẢN TRỊ NỀN TẢNG SAAS' : (authService.currentUser()?.tenantName || authService.currentUser()?.schoolName || 'Trường TH và THCS Phước Tân') }}</span>
              <span class="brand-scale-badge">{{ authService.isSystemAdmin() ? 'Platform Management' : (authService.currentUser()?.tenantCode ? ('Mã: ' + authService.currentUser()?.tenantCode) : '122 Lớp • 5.669 Học sinh') }}</span>
            </div>
          </div>

          <!-- GLOBAL SEARCH OMNIBAR (For School Users) -->
          @if (!authService.isSystemAdmin()) {
            <div class="global-search-container hide-on-mobile" (click)="$event.stopPropagation()">
              <div class="search-input-wrapper" [class.focused]="isSearchOpen">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  class="global-search-input"
                  placeholder="Tìm kiếm công việc, kế hoạch, nhân sự... (Ctrl+K)"
                  [value]="searchQuery"
                  (input)="onSearchInput($event)"
                  (focus)="onSearchFocus()"
                  (keydown)="onSearchKeyDown($event)"
                />
                @if (isSearching) {
                  <span class="material-symbols-outlined spin search-loader">progress_activity</span>
                } @else if (searchQuery) {
                  <button type="button" class="clear-search-btn" (click)="clearSearch()">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                } @else {
                  <kbd class="search-kbd">Ctrl K</kbd>
                }
              </div>

              <!-- SEARCH RESULTS DROPDOWN -->
              @if (isSearchOpen && (searchResults || isSearching)) {
                <div class="search-dropdown-menu">
                  @if (isSearching) {
                    <div class="search-empty-state">
                      <span class="material-symbols-outlined spin">progress_activity</span>
                      <span>Đang tìm kiếm...</span>
                    </div>
                  } @else if (searchResults && searchResults.total === 0) {
                    <div class="search-empty-state">
                      <span class="material-symbols-outlined">search_off</span>
                      <span>Không tìm thấy kết quả nào cho "{{ searchQuery }}"</span>
                    </div>
                  } @else if (searchResults) {
                    <!-- TASKS SECTION -->
                    @if (searchResults.tasks.length > 0) {
                      <div class="result-group">
                        <div class="result-group-header">
                          <span class="material-symbols-outlined group-icon">assignment</span>
                          <span>CÔNG VIỆC ({{ searchResults.tasks.length }})</span>
                        </div>
                        <div class="result-items">
                          @for (task of searchResults.tasks; track task.id) {
                            <div class="result-item" (click)="selectTask(task.id)">
                              <div class="result-item-main">
                                <span class="item-title">{{ task.title }}</span>
                                <div class="item-meta">
                                  @if (task.code) {
                                    <span class="meta-code">#{{ task.code }}</span>
                                  }
                                  <span class="meta-status">{{ task.status }}</span>
                                  @if (task.assignee) {
                                    <span class="meta-assignee">👤 {{ task.assignee.fullName }}</span>
                                  }
                                </div>
                              </div>
                              <div class="result-item-progress">
                                <span class="progress-val">{{ task.progressPercent }}%</span>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- PLANS SECTION -->
                    @if (searchResults.plans.length > 0) {
                      <div class="result-group">
                        <div class="result-group-header">
                          <span class="material-symbols-outlined group-icon">calendar_month</span>
                          <span>KẾ HOẠCH ({{ searchResults.plans.length }})</span>
                        </div>
                        <div class="result-items">
                          @for (plan of searchResults.plans; track plan.id) {
                            <div class="result-item" (click)="selectPlan(plan.id)">
                              <div class="result-item-main">
                                <span class="item-title">{{ plan.title }}</span>
                                <div class="item-meta">
                                  <span class="meta-level">{{ plan.level }}</span>
                                  <span class="meta-dates">{{ plan.startDate | date:'dd/MM' }} - {{ plan.endDate | date:'dd/MM/yyyy' }}</span>
                                </div>
                              </div>
                              <div class="result-item-progress">
                                <span class="progress-val">{{ plan.progressPercent }}%</span>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- USERS SECTION -->
                    @if (searchResults.users.length > 0) {
                      <div class="result-group">
                        <div class="result-group-header">
                          <span class="material-symbols-outlined group-icon">person</span>
                          <span>NHÂN SỰ ({{ searchResults.users.length }})</span>
                        </div>
                        <div class="result-items">
                          @for (usr of searchResults.users; track usr.id) {
                            <div class="result-item user-result" (click)="selectUser(usr.id)">
                              <img [src]="usr.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + usr.fullName" class="user-item-avatar" />
                              <div class="result-item-main">
                                <span class="item-title">{{ usr.fullName }}</span>
                                <div class="item-meta">
                                  <span class="meta-title">{{ usr.title || 'Cán bộ giáo viên' }}</span>
                                  @if (usr.primaryOrgUnit) {
                                    <span class="meta-org">• {{ usr.primaryOrgUnit.name }}</span>
                                  }
                                </div>
                              </div>
                              <span class="material-symbols-outlined contact-icon">contact_phone</span>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- ATTACHMENTS / EVIDENCE SECTION (TT 022) -->
                    @if (searchResults.attachments && searchResults.attachments.length > 0) {
                      <div class="result-group">
                        <div class="result-group-header">
                          <span class="material-symbols-outlined group-icon">folder_open</span>
                          <span>MINH CHỨNG & TÀI LIỆU ({{ searchResults.attachments.length }})</span>
                        </div>
                        <div class="result-items">
                          @for (att of searchResults.attachments; track att.id) {
                            <div class="result-item" (click)="selectAttachment(att)">
                              <div class="result-item-main">
                                <span class="item-title">{{ att.fileName }}</span>
                                <div class="item-meta">
                                  <span class="meta-code">{{ att.mimeType || 'File' }}</span>
                                  @if (att.task) {
                                    <span class="meta-assignee">📋 {{ att.task.title }}</span>
                                  }
                                </div>
                              </div>
                              <div class="result-item-progress">
                                <span class="material-symbols-outlined" style="font-size: 18px; color: #2563EB;">open_in_new</span>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }

          <!-- Right Controls: Language pill, Notification Bell, User Header Pill -->
          <div class="nav-bar-right">
            <div class="header-user-controls">
              <span class="lang-pill" title="Ngôn ngữ tiếng Việt">VN</span>

              <a routerLink="/notifications" class="notif-bell-btn" title="Thông báo hệ thống">
                <span class="material-symbols-outlined">notifications</span>
                @if (notifService.unreadCount() > 0) {
                  <span class="notif-badge">{{ notifService.unreadCount() }}</span>
                }
              </a>

              @if (authService.currentUser(); as u) {
                <div class="user-menu-wrapper" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="header-profile-pill"
                    (click)="toggleUserMenu($event)"
                    [class.active]="isUserMenuOpen"
                    title="Menu tài khoản cá nhân"
                  >
                    <div class="avatar-ring">
                      <img [src]="u.avatarUrl || 'https://ui-avatars.com/api/?name=' + u.fullName + '&background=1E3A8A&color=fff'" [alt]="u.fullName" class="header-avatar" />
                    </div>
                    <div class="header-user-text hide-on-mobile">
                      <span class="header-user-name">{{ u.fullName }}</span>
                      <span class="header-user-role">{{ authService.isSystemAdmin() ? 'System Admin (SaaS)' : (u.title || authService.activeRole()?.roleTitle || 'Cán bộ giáo viên') }}</span>
                    </div>
                    <span class="material-symbols-outlined dropdown-chevron" [class.rotated]="isUserMenuOpen">expand_more</span>
                  </button>

                  <!-- USER DROPDOWN POPUP MENU -->
                  @if (isUserMenuOpen) {
                    <div class="user-dropdown-menu">
                      <div class="dropdown-user-header">
                        <div class="dropdown-avatar-wrap">
                          <img [src]="u.avatarUrl || 'https://ui-avatars.com/api/?name=' + u.fullName + '&background=1E3A8A&color=fff'" [alt]="u.fullName" class="dropdown-avatar" />
                        </div>
                        <div class="dropdown-user-meta">
                          <div class="dropdown-user-name" [title]="u.fullName">{{ u.fullName }}</div>
                          <div class="dropdown-user-email" [title]="u.email || u.phone">{{ u.email || u.phone }}</div>
                          <div class="dropdown-user-badge">
                            <span class="material-symbols-outlined badge-icon">{{ authService.isSystemAdmin() ? 'hub' : 'verified_user' }}</span>
                            <span>{{ authService.isSystemAdmin() ? 'Quản trị Nền tảng SaaS' : (u.title || authService.activeRole()?.roleTitle || 'Cán bộ giáo viên') }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="dropdown-divider"></div>

                      <div class="dropdown-menu-list">
                        <button type="button" class="dropdown-menu-item" (click)="openProfileModal(); $event.stopPropagation()">
                          <span class="material-symbols-outlined item-icon text-blue">badge</span>
                          <div class="item-text-wrap">
                            <span class="item-label">Xem thông tin cá nhân</span>
                            <span class="item-desc">Hồ sơ, chức danh & phân quyền</span>
                          </div>
                          <span class="material-symbols-outlined item-arrow">chevron_right</span>
                        </button>

                        <button type="button" class="dropdown-menu-item" (click)="openChangePasswordFromMenu(); $event.stopPropagation()">
                          <span class="material-symbols-outlined item-icon text-amber">lock_reset</span>
                          <div class="item-text-wrap">
                            <span class="item-label">Đổi mật khẩu</span>
                            <span class="item-desc">Cập nhật mật khẩu bảo mật</span>
                          </div>
                          <span class="material-symbols-outlined item-arrow">chevron_right</span>
                        </button>

                        <div class="dropdown-divider"></div>

                        <button type="button" class="dropdown-menu-item logout-item" (click)="logout(); $event.stopPropagation()">
                          <span class="material-symbols-outlined item-icon text-red">logout</span>
                          <div class="item-text-wrap">
                            <span class="item-label text-red">Đăng xuất</span>
                            <span class="item-desc">Thoát khỏi phiên làm việc</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </header>

        <!-- MOBILE TOP BAR (Small screens only) -->
        <header class="mobile-header hide-on-desktop">
          <div class="mobile-header-left">
            <button type="button" class="mobile-menu-btn tap-target" (click)="toggleMobileDrawer()" title="Mở menu điều hướng">
              <span class="material-symbols-outlined">menu</span>
            </button>
            <div class="mobile-brand" [routerLink]="authService.isSystemAdmin() ? '/system-admin' : '/dashboard'">
              <span class="material-symbols-outlined brand-icon">{{ authService.isSystemAdmin() ? 'hub' : 'school' }}</span>
              <span class="mobile-title">{{ authService.isSystemAdmin() ? 'TN EDU SaaS' : (authService.currentUser()?.tenantName || 'TH & THCS Phước Tân') }}</span>
            </div>
          </div>

          <div class="mobile-actions">
            @if (!authService.isSystemAdmin() && authService.isAdmin()) {
              <a routerLink="/admin-settings" routerLinkActive="admin-active" class="mobile-icon-btn admin-mobile-btn" title="Cấu hình hệ thống">
                <span class="material-symbols-outlined">admin_panel_settings</span>
              </a>
            }
            <a routerLink="/notifications" routerLinkActive="active" class="mobile-icon-btn" title="Thông báo">
              <span class="material-symbols-outlined">notifications</span>
              @if (notifService.unreadCount() > 0) {
                <span class="mobile-notif-dot"></span>
              }
            </a>
            @if (authService.currentUser(); as user) {
              <button type="button" class="mobile-avatar-btn tap-target" (click)="toggleMobileDrawer()" title="Hồ sơ & Menu">
                <img [src]="user.avatarUrl" [alt]="user.fullName" class="mobile-avatar" />
              </button>
            }
          </div>
        </header>

        <!-- ROUTER OUTLET -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>

        <!-- MOBILE BOTTOM NAVIGATION -->
        <nav class="mobile-bottom-nav hide-on-desktop">
          @if (authService.isSystemAdmin()) {
            <a routerLink="/system-admin" routerLinkActive="active" class="bottom-tab tap-target">
              <span class="material-symbols-outlined tab-icon">hub</span>
              <span class="tab-label">Quản trị SaaS</span>
            </a>

            <a routerLink="/notifications" routerLinkActive="active" class="bottom-tab tap-target">
              <div class="tab-icon-wrapper">
                <span class="material-symbols-outlined tab-icon">notifications</span>
                @if (notifService.unreadCount() > 0) {
                  <span class="bottom-notif-badge">{{ notifService.unreadCount() }}</span>
                }
              </div>
              <span class="tab-label">Thông báo</span>
            </a>

            <button type="button" class="bottom-tab bottom-tab-btn tap-target" (click)="logout()">
              <span class="material-symbols-outlined tab-icon">logout</span>
              <span class="tab-label">Đăng xuất</span>
            </button>
          } @else {
            <a routerLink="/dashboard" routerLinkActive="active" class="bottom-tab tap-target">
              <span class="material-symbols-outlined tab-icon">dashboard</span>
              <span class="tab-label">Tổng quan</span>
            </a>

            <a routerLink="/tasks" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="bottom-tab tap-target">
              <span class="material-symbols-outlined tab-icon">assignment</span>
              <span class="tab-label">Công việc</span>
            </a>

            <a routerLink="/plans" routerLinkActive="active" class="bottom-tab tap-target">
              <span class="material-symbols-outlined tab-icon">calendar_month</span>
              <span class="tab-label">Kế hoạch</span>
            </a>

            <a routerLink="/my-tasks" routerLinkActive="active" class="bottom-tab tap-target">
              <span class="material-symbols-outlined tab-icon">task_alt</span>
              <span class="tab-label">Của tôi</span>
            </a>

            <button type="button" class="bottom-tab bottom-tab-btn tap-target" [class.active]="isMobileDrawerOpen" (click)="toggleMobileDrawer()">
              <div class="tab-icon-wrapper">
                <span class="material-symbols-outlined tab-icon">menu</span>
                @if (notifService.unreadCount() > 0) {
                  <span class="bottom-notif-badge">{{ notifService.unreadCount() }}</span>
                }
              </div>
              <span class="tab-label">Menu</span>
            </button>
          }
        </nav>
      </div>

      <!-- 3. MOBILE SLIDE-OUT DRAWER / NAVIGATION SHEET -->
      @if (isMobileDrawerOpen) {
        <div class="mobile-drawer-overlay hide-on-desktop" (click)="closeMobileDrawer()">
          <div class="mobile-drawer-sheet" (click)="$event.stopPropagation()">
            <!-- Drawer Header: User info & close btn -->
            <div class="drawer-header">
              <div class="drawer-user-info">
                @if (authService.currentUser(); as user) {
                  <img [src]="user.avatarUrl" [alt]="user.fullName" class="drawer-avatar" />
                  <div class="drawer-user-text">
                    <span class="drawer-user-name">{{ user.fullName }}</span>
                    <span class="drawer-user-title">{{ authService.isSystemAdmin() ? 'Quản trị Nền tảng SaaS' : (user.title || 'Cán bộ giáo viên') }}</span>
                    <span class="drawer-user-phone">📞 {{ user.phone }}</span>
                  </div>
                }
              </div>
              <button type="button" class="drawer-close-btn tap-target" (click)="closeMobileDrawer()" title="Đóng menu">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Active Context Pill in Drawer (Only for School Users) -->
            @if (!authService.isSystemAdmin() && authService.activeRole(); as role) {
              <div class="drawer-context-pill" [ngClass]="getRolePillClass()">
                <span class="material-symbols-outlined pill-icon">{{ getRoleIcon() }}</span>
                <div class="pill-meta">
                  <span class="pill-role-title">{{ role.roleTitle }}</span>
                  <span class="pill-scope-title">{{ role.scopeName || 'Toàn trường' }}</span>
                </div>
              </div>
            }

            <!-- Full Navigation Links in Drawer -->
            <div class="drawer-section">
              <div class="drawer-section-title">
                <span class="material-symbols-outlined title-icon">grid_view</span>
                <span>{{ authService.isSystemAdmin() ? 'Quản trị Nền tảng:' : 'Phân hệ hệ thống:' }}</span>
              </div>
              <nav class="drawer-nav-list">
                @if (authService.isSystemAdmin()) {
                  <a routerLink="/system-admin" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item saas-item">
                    <span class="material-symbols-outlined nav-icon saas-icon">hub</span>
                    <span class="nav-label">Quản lý Trường học (Tenants)</span>
                    <span class="drawer-saas-tag">SaaS</span>
                  </a>

                  <a routerLink="/notifications" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">notifications</span>
                    <span class="nav-label">Thông báo hệ thống</span>
                    @if (notifService.unreadCount() > 0) {
                      <span class="drawer-unread-badge">{{ notifService.unreadCount() }}</span>
                    }
                  </a>
                } @else {
                  <a routerLink="/dashboard" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">dashboard</span>
                    <span class="nav-label">Tổng quan Dashboard</span>
                  </a>

                  <a routerLink="/school-info" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">domain</span>
                    <span class="nav-label">Hồ sơ & Quy mô trường</span>
                  </a>

                  <a routerLink="/plans" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">calendar_month</span>
                    <span class="nav-label">Lập kế hoạch & Phê duyệt</span>
                  </a>

                  <a routerLink="/tasks" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">assignment</span>
                    <span class="nav-label">Quản lý công việc (RACI)</span>
                  </a>

                  <a routerLink="/my-tasks" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">task_alt</span>
                    <span class="nav-label">Việc của tôi</span>
                  </a>

                  <a routerLink="/my-kpi" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">monitoring</span>
                    <span class="nav-label">KPI của tôi</span>
                  </a>

                  <a routerLink="/org" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">apartment</span>
                    <span class="nav-label">Cơ cấu & Điểm trường</span>
                  </a>

                  <a routerLink="/reports" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">analytics</span>
                    <span class="nav-label">Báo cáo & Xuất Excel</span>
                  </a>

                  <a routerLink="/evidence" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">folder_open</span>
                    <span class="nav-label">Kho minh chứng</span>
                  </a>

                  <a routerLink="/notifications" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                    <span class="material-symbols-outlined nav-icon">notifications</span>
                    <span class="nav-label">Thông báo hệ thống</span>
                    @if (notifService.unreadCount() > 0) {
                      <span class="drawer-unread-badge">{{ notifService.unreadCount() }}</span>
                    }
                  </a>

                  @if (authService.isAdmin()) {
                    <a routerLink="/admin-settings" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item admin-item">
                      <span class="material-symbols-outlined nav-icon admin-icon">admin_panel_settings</span>
                      <span class="nav-label">Cấu hình hệ thống</span>
                      <span class="drawer-admin-tag">Admin</span>
                    </a>
                  }
                }
              </nav>
            </div>

            <!-- Quick Action button (Only for school users) -->
            @if (!authService.isSystemAdmin()) {
              <div class="drawer-action-box">
                <button type="button" class="drawer-create-btn tap-target" routerLink="/tasks" [queryParams]="{ create: 'true' }" (click)="closeMobileDrawer()">
                  <span class="material-symbols-outlined">add_circle</span>
                  <span>{{ authService.isGiaoVien() ? 'Đề xuất việc mới' : 'Giao việc mới (RACI)' }}</span>
                </button>
              </div>
            }

            <!-- Drawer Footer: Profile, Change Password, Logout & Version info -->
            <div class="drawer-footer">
              <button type="button" class="drawer-pwd-btn tap-target" (click)="openProfileModal(); closeMobileDrawer()">
                <span class="material-symbols-outlined">badge</span>
                <span>Thông tin cá nhân</span>
              </button>
              <button type="button" class="drawer-pwd-btn tap-target" (click)="openChangePassword()">
                <span class="material-symbols-outlined">lock_reset</span>
                <span>Đổi mật khẩu</span>
              </button>
              <button type="button" class="drawer-logout-btn tap-target" (click)="logout()">
                <span class="material-symbols-outlined">logout</span>
                <span>Đăng xuất</span>
              </button>
              <span class="drawer-version">{{ authService.isSystemAdmin() ? 'TN EDU • Nền tảng SaaS Đa Trường học' : 'TN EDU • Quản lý Trường học 2026-2027' }}</span>
            </div>
          </div>
        </div>
      }

      <!-- 4. GLOBAL CONTACT MINI CARD POPOVER -->
      @if (contactCardService.isOpen()) {
        <app-contact-mini-card
          [visible]="contactCardService.isOpen()"
          [user]="getContactUser()"
          [userId]="getContactUserId()"
          (closed)="contactCardService.close()"
        ></app-contact-mini-card>
      }

      <!-- 5. PERSONAL PROFILE MODAL -->
      @if (isProfileModalOpen) {
        @if (authService.currentUser(); as user) {
          <div class="layout-modal-backdrop" (click)="closeProfileModal()">
            <div class="layout-modal-dialog profile-modal-dialog" (click)="$event.stopPropagation()">
              <div class="modal-dialog-header">
                <div class="modal-title-wrap">
                  <span class="material-symbols-outlined modal-icon">badge</span>
                  <h3>Thông Tin Tài Khoản Cá Nhân</h3>
                </div>
                <button type="button" class="modal-close-btn" (click)="closeProfileModal()" title="Đóng">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>

              <div class="modal-dialog-body profile-modal-body">
                <!-- Hero Profile Banner -->
                <div class="profile-hero-card">
                  <img [src]="user.avatarUrl || 'https://ui-avatars.com/api/?name=' + user.fullName + '&background=1E3A8A&color=fff'" [alt]="user.fullName" class="hero-avatar" />
                  <div class="hero-details">
                    <h4 class="hero-name">{{ user.fullName }}</h4>
                    <div class="hero-role-pill">
                      <span class="material-symbols-outlined pill-icon">{{ authService.isSystemAdmin() ? 'hub' : 'verified_user' }}</span>
                      <span>{{ authService.isSystemAdmin() ? 'Quản trị Nền tảng SaaS' : (user.title || authService.activeRole()?.roleTitle || 'Cán bộ giáo viên') }}</span>
                    </div>
                    <div class="hero-subtext">
                      <span>🏢 {{ authService.isSystemAdmin() ? 'TN EDU SaaS Enterprise Platform' : (user.tenantName || user.schoolName || 'Trường TH và THCS Phước Tân') }}</span>
                    </div>
                  </div>
                </div>

                <!-- Information Grid -->
                <div class="profile-grid">
                  <!-- Section: Contact Info -->
                  <div class="profile-section-box">
                    <div class="section-box-title">
                      <span class="material-symbols-outlined icon">contact_page</span>
                      <span>Thông tin liên hệ</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Họ và tên:</span>
                      <span class="info-val font-semibold">{{ user.fullName }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Số điện thoại (Tên đăng nhập):</span>
                      <span class="info-val font-semibold">{{ user.phone || 'Chưa cập nhật' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Địa chỉ Email:</span>
                      <span class="info-val">{{ user.email || 'Chưa cập nhật' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Chức danh / Chức vụ:</span>
                      <span class="info-val">{{ user.title || (authService.isSystemAdmin() ? 'System Administrator' : 'Cán bộ giáo viên') }}</span>
                    </div>
                  </div>

                  <!-- Section: Unit & Scope -->
                  <div class="profile-section-box">
                    <div class="section-box-title">
                      <span class="material-symbols-outlined icon">domain</span>
                      <span>Đơn vị & Phạm vi công tác</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Trường học / Đơn vị:</span>
                      <span class="info-val">{{ authService.isSystemAdmin() ? 'Nền tảng SaaS Toàn hệ thống' : (user.tenantName || user.schoolName || 'Trường TH & THCS Phước Tân') }}</span>
                    </div>
                    @if (user.tenantCode) {
                      <div class="info-row">
                        <span class="info-label">Mã trường (Tenant Code):</span>
                        <span class="info-val font-mono"><span class="badge-code">{{ user.tenantCode }}</span></span>
                      </div>
                    }
                    <div class="info-row">
                      <span class="info-label">Điểm trường / Cơ sở:</span>
                      <span class="info-val">{{ user.primaryLocationName || 'Toàn trường / Cơ sở chính' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Tổ chuyên môn / Phòng:</span>
                      <span class="info-val">{{ user.primaryOrgUnitName || 'Ban Giám Hiệu / Toàn trường' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Section: System Roles & Permissions -->
                <div class="profile-section-box">
                  <div class="section-box-title">
                    <span class="material-symbols-outlined icon">security</span>
                    <span>Vai trò & Quyền hạn được giao</span>
                  </div>
                  <div class="roles-tags-wrap">
                    @if (authService.isSystemAdmin()) {
                      <div class="role-badge-chip chip-sysadmin">
                        <span class="material-symbols-outlined">hub</span>
                        <div class="chip-text">
                          <span class="chip-title">SYSTEM_ADMIN • Quản trị Nền tảng SaaS</span>
                          <span class="chip-scope">Toàn quyền quản trị đa trường học & cấu hình hệ thống</span>
                        </div>
                      </div>
                    } @else if (user.roles && user.roles.length > 0) {
                      @for (r of user.roles; track $index) {
                        <div class="role-badge-chip">
                          <span class="material-symbols-outlined">shield</span>
                          <div class="chip-text">
                            <span class="chip-title">{{ authService.getRoleVietnameseName(r.role) }} ({{ r.role }})</span>
                            @if (r.scopeLocationName || r.scopeOrgUnitName) {
                              <span class="chip-scope">Phạm vi: {{ r.scopeLocationName || r.scopeOrgUnitName }}</span>
                            }
                          </div>
                        </div>
                      }
                    } @else {
                      <div class="role-badge-chip">
                        <span class="material-symbols-outlined">person</span>
                        <div class="chip-text">
                          <span class="chip-title">Giáo viên / Cán bộ nhân viên</span>
                          <span class="chip-scope">Trường TH & THCS Phước Tân</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <div class="modal-dialog-footer profile-modal-footer">
                <button type="button" class="btn-dialog-secondary" (click)="openChangePasswordFromProfile()">
                  <span class="material-symbols-outlined">lock_reset</span>
                  <span>Đổi mật khẩu</span>
                </button>
                <button type="button" class="btn-dialog-submit" (click)="closeProfileModal()">
                  <span class="material-symbols-outlined">close</span>
                  <span>Đóng</span>
                </button>
              </div>
            </div>
          </div>
        }
      }

      <!-- 6. CHANGE PASSWORD MODAL (TT 003) -->
      @if (isChangePasswordOpen) {
        <div class="layout-modal-backdrop" (click)="closeChangePassword()">
          <div class="layout-modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-dialog-header">
              <div class="modal-title-wrap">
                <span class="material-symbols-outlined modal-icon">lock_reset</span>
                <h3>Đổi Mật Khẩu Tài Khoản</h3>
              </div>
              <button type="button" class="modal-close-btn" (click)="closeChangePassword()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-dialog-body">
              @if (changePasswordSuccess) {
                <div class="alert-box alert-success">
                  <span class="material-symbols-outlined">check_circle</span>
                  <span>{{ changePasswordSuccess }}</span>
                </div>
              }
              @if (changePasswordError) {
                <div class="alert-box alert-error">
                  <span class="material-symbols-outlined">error</span>
                  <span>{{ changePasswordError }}</span>
                </div>
              }

              <div class="form-field-group">
                <label class="field-label">Mật khẩu hiện tại <span class="req">*</span></label>
                <input
                  type="password"
                  class="field-input"
                  placeholder="Nhập mật khẩu hiện tại"
                  [(ngModel)]="currentPassword"
                  [disabled]="isChangingPassword"
                />
              </div>

              <div class="form-field-group">
                <label class="field-label">Mật khẩu mới (tối thiểu 6 ký tự) <span class="req">*</span></label>
                <input
                  type="password"
                  class="field-input"
                  placeholder="Nhập mật khẩu mới"
                  [(ngModel)]="newPassword"
                  [disabled]="isChangingPassword"
                />
              </div>

              <div class="form-field-group">
                <label class="field-label">Xác nhận mật khẩu mới <span class="req">*</span></label>
                <input
                  type="password"
                  class="field-input"
                  placeholder="Nhập lại mật khẩu mới"
                  [(ngModel)]="confirmPassword"
                  [disabled]="isChangingPassword"
                />
              </div>
            </div>

            <div class="modal-dialog-footer">
              <button type="button" class="btn-dialog-cancel" (click)="closeChangePassword()" [disabled]="isChangingPassword">
                Hủy bỏ
              </button>
              <button
                type="button"
                class="btn-dialog-submit"
                (click)="submitChangePassword()"
                [disabled]="isChangingPassword || !currentPassword || !newPassword || !confirmPassword"
              >
                @if (isChangingPassword) {
                  <span class="material-symbols-outlined spin">progress_activity</span>
                  <span>Đang cập nhật...</span>
                } @else {
                  <span class="material-symbols-outlined">check</span>
                  <span>Cập nhật mật khẩu</span>
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .app-layout {
        display: flex;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        background: #F8FAFC;
        font-family: inherit;
      }

      /* 1. DESKTOP SIDEBAR */
      .desktop-sidebar {
        width: 250px;
        min-width: 250px;
        background: #FFFFFF;
        color: #1E293B;
        display: flex;
        flex-direction: column;
        border-right: 1px solid #E2E8F0;
        z-index: 100;
        box-shadow: 1px 0 3px rgba(0, 0, 0, 0.02);
      }

      .sidebar-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 16px 14px;
        border-bottom: 1px solid #F1F5F9;

        .logo-box {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #1E40AF, #3B82F6);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);

          .logo-icon {
            font-size: 20px;
            color: #FFFFFF;
          }
        }

        .brand-text {
          flex: 1;
          .brand-top {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .app-name {
            font-size: 1.05rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #1E3A8A;
            line-height: 1.2;
            margin: 0;
          }
          .version-tag {
            font-size: 0.65rem;
            font-weight: 700;
            background: #EFF6FF;
            color: #2563EB;
            padding: 1px 5px;
            border-radius: 4px;
          }
          .school-name {
            font-size: 0.72rem;
            font-weight: 600;
            color: #64748B;
            letter-spacing: 0.02em;
          }
        }
      }

      .context-pill {
        margin: 10px 12px 6px;
        padding: 8px 10px;
        background: #F8FAFC;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #E2E8F0;

        .pill-icon {
          font-size: 18px;
          color: #2563EB;
        }

        .pill-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;

          .pill-role {
            font-size: 0.78rem;
            font-weight: 700;
            color: #0F172A;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .pill-scope {
            font-size: 0.7rem;
            color: #64748B;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        &.pill-hieu-truong {
          background: #EFF6FF;
          border-color: #BFDBFE;
          .pill-icon { color: #1D4ED8; }
        }
        &.pill-pht {
          background: #F0FDF4;
          border-color: #BBF7D0;
          .pill-icon { color: #15803D; }
        }
        &.pill-to-truong {
          background: #FFFBEB;
          border-color: #FDE68A;
          .pill-icon { color: #B45309; }
        }
        &.pill-giao-vien {
          background: #F8FAFC;
          border-color: #E2E8F0;
          .pill-icon { color: #475569; }
        }
      }

      .sidebar-nav {
        flex: 1;
        padding: 8px 10px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 3px;

        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 8px;
          color: #475569;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.15s ease;

          .nav-icon {
            font-size: 19px;
            color: #64748B;
            transition: color 0.15s;
          }

          &:hover {
            background: #F1F5F9;
            color: #0F172A;
            .nav-icon { color: #1E293B; }
          }

          &.active {
            background: #EFF6FF;
            color: #1D4ED8;
            font-weight: 700;
            border-left: 3px solid #2563EB;
            border-radius: 4px 8px 8px 4px;
            .nav-icon { color: #2563EB; }
          }
        }

        .sidebar-unread-badge {
          margin-left: auto;
          background: #EF4444;
          color: #FFFFFF;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 999px;
        }

        .sidebar-admin-badge {
          margin-left: auto;
          background: #EEF2FF;
          color: #3730A3;
          border: 1px solid #C7D2FE;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .sidebar-lock-tag {
          margin-left: auto;
          background: #F1F5F9;
          color: #64748B;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .locked-role-nav {
          cursor: pointer;
          opacity: 0.85;

          &:hover {
            opacity: 1;
            background: #FEF3C7;
            color: #92400E;
            .nav-icon { color: #D97706; }
          }
        }
      }

      .sidebar-action {
        padding: 8px 12px;

        .create-task-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #1F3864;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: #16294A;
            box-shadow: 0 3px 8px rgba(31, 56, 100, 0.25);
          }
        }
      }

      .sidebar-bottom-badge {
        padding: 6px 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        color: #64748B;
        border-top: 1px solid #F1F5F9;

        .icon-mini {
          font-size: 14px;
          color: #10B981;
        }
      }

      .sidebar-footer {
        padding: 8px 12px;
        border-top: 1px solid #F1F5F9;
        background: #F8FAFC;

        .user-card {
          display: flex;
          align-items: center;
          gap: 8px;

          .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 1px solid #CBD5E1;
          }

          .user-details {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;

            .user-name {
              font-size: 0.8rem;
              font-weight: 700;
              color: #0F172A;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .user-title {
              font-size: 0.68rem;
              color: #64748B;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }

          .logout-btn {
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;

            &:hover {
              color: #EF4444;
              background: #FEE2E2;
            }
          }
        }
      }

      /* 2. MAIN CONTENT AREA */
      .main-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
        position: relative;
        background: #F8FAFC;
      }

      /* TOP HEADER WITH TABS & QUICK ROLE SWITCHER */
      /* TOP HEADER WITH QUICK ROLE SWITCHER (DESKTOP) */
      .top-nav-bar {
        background: #FFFFFF;
        border-bottom: 1px solid #E2E8F0;
        padding: 0 1rem;
        height: 54px;
        min-height: 54px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        z-index: 50;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        overflow: visible;

        .nav-bar-left {
          display: flex;
          align-items: center;
          height: 100%;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .header-brand-title {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;

          .brand-star-icon {
            font-size: 18px;
            color: #1E40AF;
            flex-shrink: 0;
          }

          .brand-school {
            font-size: 0.88rem;
            font-weight: 800;
            color: #0F172A;
            letter-spacing: -0.01em;
            white-space: nowrap;
          }

          .brand-scale-badge {
            font-size: 0.68rem;
            font-weight: 700;
            background: #EEF2FF;
            color: #3730A3;
            border: 1px solid #C7D2FE;
            padding: 2px 7px;
            border-radius: 999px;
            white-space: nowrap;
          }
        }

        .nav-bar-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
          white-space: nowrap;
        }


        .header-user-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .lang-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          padding: 2px 5px;
          border-radius: 4px;
          background: #F1F5F9;
          white-space: nowrap;
        }

        .notif-bell-btn {
          position: relative;
          color: #64748B;
          text-decoration: none;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          white-space: nowrap;
          flex-shrink: 0;

          &:hover {
            color: #0F172A;
            background: #F1F5F9;
          }

          .notif-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            background: #EF4444;
            color: #FFFFFF;
            font-size: 0.65rem;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 999px;
          }
        }

        .user-menu-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .header-profile-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px 2px 3px;
          border-radius: 999px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;

          &:hover, &.active {
            background: #EFF6FF;
            border-color: #BFDBFE;
          }

          .avatar-ring {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: 1.5px solid #DBEAFE;
          }

          .header-avatar {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .header-user-text {
            display: flex;
            flex-direction: column;
            line-height: 1.15;
            max-width: 130px;
            overflow: hidden;

            .header-user-name {
              font-size: 0.78rem;
              font-weight: 700;
              color: #0F172A;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .header-user-role {
              font-size: 0.65rem;
              color: #64748B;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }

          .dropdown-chevron {
            font-size: 18px;
            color: #64748B;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.15s;

            &.rotated {
              transform: rotate(180deg);
              color: #2563EB;
            }
          }
        }

        /* Top Header User Dropdown Popover */
        .user-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 290px;
          background: #FFFFFF;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06);
          border: 1px solid #E2E8F0;
          z-index: 1000;
          animation: dropDownIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;

          .dropdown-user-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            background: #F8FAFC;
            border-bottom: 1px solid #F1F5F9;

            .dropdown-avatar-wrap {
              width: 42px;
              height: 42px;
              border-radius: 50%;
              overflow: hidden;
              flex-shrink: 0;
              border: 2px solid #DBEAFE;

              .dropdown-avatar {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
            }

            .dropdown-user-meta {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;

              .dropdown-user-name {
                font-size: 0.88rem;
                font-weight: 700;
                color: #0F172A;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .dropdown-user-email {
                font-size: 0.72rem;
                color: #64748B;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-top: 1px;
              }

              .dropdown-user-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 0.65rem;
                font-weight: 600;
                color: #1D4ED8;
                background: #EFF6FF;
                border: 1px solid #BFDBFE;
                padding: 1px 6px;
                border-radius: 4px;
                margin-top: 4px;
                align-self: flex-start;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;

                .badge-icon {
                  font-size: 13px;
                }
              }
            }
          }

          .dropdown-divider {
            height: 1px;
            background: #F1F5F9;
            margin: 4px 0;
          }

          .dropdown-menu-list {
            padding: 6px;
            display: flex;
            flex-direction: column;
            gap: 2px;

            .dropdown-menu-item {
              display: flex;
              align-items: center;
              gap: 10px;
              width: 100%;
              padding: 9px 12px;
              border: none;
              background: transparent;
              border-radius: 8px;
              cursor: pointer;
              text-align: left;
              transition: all 0.15s ease;

              &:hover {
                background: #F1F5F9;
              }

              &.logout-item:hover {
                background: #FEF2F2;
                .item-label {
                  color: #DC2626;
                }
              }

              .item-icon {
                font-size: 20px;
                flex-shrink: 0;

                &.text-blue { color: #2563EB; }
                &.text-amber { color: #D97706; }
                &.text-red { color: #EF4444; }
              }

              .item-text-wrap {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;

                .item-label {
                  font-size: 0.82rem;
                  font-weight: 600;
                  color: #1E293B;

                  &.text-red {
                    color: #EF4444;
                  }
                }

                .item-desc {
                  font-size: 0.68rem;
                  color: #94A3B8;
                  margin-top: 1px;
                }
              }

              .item-arrow {
                font-size: 16px;
                color: #CBD5E1;
              }
            }
          }
        }
      }

      @media (max-width: 1440px) {
        .brand-scale-badge {
          display: none !important;
        }
      }

      /* Mobile Header */
      .mobile-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        background: #FFFFFF;
        border-bottom: 1px solid #E2E8F0;
        z-index: 80;
        height: 52px;

        .mobile-header-left {
          display: flex;
          align-items: center;
          gap: 10px;

          .mobile-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            background: #F8FAFC;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            color: #1E293B;
            cursor: pointer;
            transition: all 0.15s ease;

            .material-symbols-outlined {
              font-size: 24px;
            }

            &:active {
              background: #E2E8F0;
              transform: scale(0.96);
            }
          }

          .mobile-brand {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #1E40AF;
            font-weight: 800;
            font-size: 0.95rem;
            cursor: pointer;

            .brand-icon {
              font-size: 20px;
              color: #2563EB;
            }

            .mobile-title {
              white-space: nowrap;
            }
          }
        }

        .mobile-actions {
          display: flex;
          align-items: center;
          gap: 8px;

          .mobile-icon-btn {
            position: relative;
            color: #64748B;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 8px;

            &:active {
              background: #F1F5F9;
            }

            &.admin-mobile-btn {
              color: #1E40AF;
              background: #EFF6FF;
              border: 1px solid #BFDBFE;
            }

            &.admin-active {
              background: #1E40AF;
              color: #FFFFFF;
            }
          }

          .mobile-notif-dot {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 8px;
            height: 8px;
            background: #EF4444;
            border-radius: 50%;
            border: 1.5px solid #FFFFFF;
          }

          .mobile-avatar-btn {
            background: transparent;
            border: none;
            padding: 0;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;

            .mobile-avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 1.5px solid #3B82F6;
              object-fit: cover;
            }
          }
        }
      }

      .page-content {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }

      /* Mobile Bottom Nav */
      .mobile-bottom-nav {
        display: flex;
        background: #FFFFFF;
        border-top: 1px solid #E2E8F0;
        height: 58px;
        align-items: center;
        justify-content: space-around;
        z-index: 100;
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);

        .bottom-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          height: 100%;
          color: #64748B;
          text-decoration: none;
          font-size: 0.68rem;
          font-weight: 500;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.15s ease;

          .tab-icon {
            font-size: 22px;
          }

          &:active {
            transform: scale(0.95);
          }

          &.active {
            color: #1D4ED8;
            font-weight: 700;

            .tab-icon {
              color: #2563EB;
            }
          }

          .tab-icon-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .bottom-notif-badge {
            position: absolute;
            top: -4px;
            right: -8px;
            background: #EF4444;
            color: #FFFFFF;
            font-size: 0.6rem;
            padding: 1px 4px;
            border-radius: 999px;
            font-weight: 700;
          }
        }
      }

      /* MOBILE SLIDE-OUT DRAWER STYLES */
      .mobile-drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: flex;
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .mobile-drawer-sheet {
        width: 320px;
        max-width: 86vw;
        height: 100%;
        background: #FFFFFF;
        box-shadow: 4px 0 25px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1);

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 14px;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;

          .drawer-user-info {
            display: flex;
            align-items: center;
            gap: 10px;
            overflow: hidden;

            .drawer-avatar {
              width: 44px;
              height: 44px;
              border-radius: 50%;
              border: 2px solid #3B82F6;
              flex-shrink: 0;
            }

            .drawer-user-text {
              display: flex;
              flex-direction: column;
              overflow: hidden;

              .drawer-user-name {
                font-size: 0.92rem;
                font-weight: 800;
                color: #0F172A;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .drawer-user-title {
                font-size: 0.75rem;
                color: #475569;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .drawer-user-phone {
                font-size: 0.7rem;
                color: #64748B;
              }
            }
          }

          .drawer-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            background: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            color: #64748B;
            cursor: pointer;
            flex-shrink: 0;

            &:active {
              background: #F1F5F9;
              color: #0F172A;
            }
          }
        }

        .drawer-context-pill {
          margin: 10px 12px 0;
          padding: 8px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #E2E8F0;

          .pill-icon {
            font-size: 18px;
          }

          .pill-meta {
            display: flex;
            flex-direction: column;
            overflow: hidden;

            .pill-role-title {
              font-size: 0.78rem;
              font-weight: 700;
              color: #0F172A;
            }

            .pill-scope-title {
              font-size: 0.7rem;
              color: #64748B;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        }

        .drawer-section {
          padding: 12px 14px 4px;

          .drawer-section-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 8px;

            .title-icon {
              font-size: 15px;
              color: #3B82F6;
            }
          }

          .drawer-nav-list {
            display: flex;
            flex-direction: column;
            gap: 3px;

            .drawer-nav-item {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 12px;
              min-height: 44px;
              border-radius: 8px;
              color: #334155;
              text-decoration: none;
              font-size: 0.86rem;
              font-weight: 600;
              transition: all 0.15s ease;
              cursor: pointer;

              .nav-icon {
                font-size: 20px;
                color: #64748B;
                flex-shrink: 0;
              }

              .nav-label {
                flex: 1;
              }

              &:active {
                background: #F1F5F9;
              }

              &.active {
                background: #EFF6FF;
                color: #1D4ED8;
                font-weight: 700;

                .nav-icon {
                  color: #2563EB;
                }
              }

              .drawer-unread-badge {
                background: #EF4444;
                color: #FFFFFF;
                font-size: 0.68rem;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 999px;
              }

              .drawer-admin-tag {
                background: #EEF2FF;
                color: #3730A3;
                border: 1px solid #C7D2FE;
                font-size: 0.68rem;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 4px;
              }

              .drawer-lock-tag {
                background: #F1F5F9;
                color: #64748B;
                font-size: 0.65rem;
                font-weight: 600;
                padding: 1px 5px;
                border-radius: 4px;
              }

              &.admin-item {
                color: #1E3A8A;
                .admin-icon {
                  color: #1E40AF;
                }
              }

              &.locked-item {
                opacity: 0.85;
                &:hover, &:active {
                  background: #FFFBEB;
                }
              }
            }
          }
        }

        .drawer-action-box {
          padding: 8px 14px;
          margin-top: auto;

          .drawer-create-btn {
            width: 100%;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;

            &:active {
              background: #16294A;
            }
          }
        }

        .drawer-footer {
          padding: 10px 14px 16px;
          border-top: 1px solid #F1F5F9;
          display: flex;
          flex-direction: column;
          gap: 8px;

          .drawer-logout-btn {
            width: 100%;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            color: #EF4444;
            font-size: 0.84rem;
            font-weight: 700;
            cursor: pointer;

            &:active {
              background: #FEF2F2;
            }
          }

          .drawer-version {
            font-size: 0.68rem;
            color: #94A3B8;
            text-align: center;
          }
        }
      }

      /* GLOBAL SEARCH OMNIBAR */
      .global-search-container {
        position: relative;
        flex: 1;
        max-width: 440px;
        margin: 0 1rem;

        .search-input-wrapper {
          display: flex;
          align-items: center;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          padding: 4px 10px;
          transition: all 0.2s ease;

          &:hover {
            border-color: #94A3B8;
            background: #FFFFFF;
          }

          &.focused {
            border-color: #3B82F6;
            background: #FFFFFF;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
          }

          .search-icon {
            font-size: 18px;
            color: #64748B;
            margin-right: 6px;
            flex-shrink: 0;
          }

          .global-search-input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: 0.8rem;
            color: #1E293B;
            outline: none;
            width: 100%;

            &::placeholder {
              color: #94A3B8;
            }
          }

          .search-loader {
            font-size: 16px;
            color: #3B82F6;
          }

          .clear-search-btn {
            background: transparent;
            border: none;
            padding: 0;
            cursor: pointer;
            color: #94A3B8;
            display: flex;
            align-items: center;

            &:hover {
              color: #475569;
            }

            .material-symbols-outlined {
              font-size: 16px;
            }
          }

          .search-kbd {
            font-size: 0.65rem;
            font-family: inherit;
            background: #E2E8F0;
            color: #64748B;
            padding: 1px 5px;
            border-radius: 4px;
            border: 1px solid #CBD5E1;
            font-weight: 600;
          }
        }

        .search-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          max-height: 480px;
          overflow-y: auto;
          z-index: 1000;
          padding: 8px 0;
          animation: dropDownIn 0.15s ease-out;

          .search-empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 24px 16px;
            color: #64748B;
            font-size: 0.82rem;

            .material-symbols-outlined {
              font-size: 20px;
            }
          }

          .result-group {
            margin-bottom: 8px;

            &:last-child {
              margin-bottom: 0;
            }

            .result-group-header {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 6px 14px 4px;
              font-size: 0.68rem;
              font-weight: 700;
              color: #64748B;
              letter-spacing: 0.05em;

              .group-icon {
                font-size: 14px;
                color: #3B82F6;
              }
            }

            .result-items {
              display: flex;
              flex-direction: column;

              .result-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 14px;
                cursor: pointer;
                transition: background 0.12s;
                gap: 10px;

                &:hover {
                  background: #F1F5F9;
                }

                .result-item-main {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  overflow: hidden;

                  .item-title {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: #1E293B;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  }

                  .item-meta {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.7rem;
                    color: #64748B;
                    margin-top: 2px;

                    .meta-code {
                      font-weight: 700;
                      color: #2563EB;
                    }

                    .meta-status {
                      background: #F1F5F9;
                      padding: 0 4px;
                      border-radius: 3px;
                    }
                  }
                }

                .result-item-progress {
                  .progress-val {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #059669;
                    background: #ECFDF5;
                    padding: 2px 6px;
                    border-radius: 4px;
                  }
                }

                &.user-result {
                  .user-item-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    border: 1px solid #CBD5E1;
                    flex-shrink: 0;
                  }

                  .contact-icon {
                    font-size: 18px;
                    color: #3B82F6;
                  }
                }
              }
            }
          }
        }
      }

      .pwd-action-btn {
        background: transparent;
        border: none;
        color: #64748B;
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;

        &:hover {
          background: #EFF6FF;
          color: #2563EB;
        }

        .material-symbols-outlined {
          font-size: 18px;
        }
      }

      .drawer-pwd-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 10px 14px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        color: #334155;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        margin-bottom: 8px;

        &:hover {
          background: #EFF6FF;
          color: #2563EB;
          border-color: #BFDBFE;
        }
      }

      /* CHANGE PASSWORD MODAL STYLES */
      .layout-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 16px;
      }

      .layout-modal-dialog {
        background: #FFFFFF;
        border-radius: 12px;
        width: 100%;
        max-width: 440px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
        border: 1px solid #E2E8F0;
        overflow: hidden;
        animation: dropDownIn 0.2s ease-out;

        &.profile-modal-dialog {
          max-width: 620px;
          width: 95%;
        }
      }

      /* PERSONAL PROFILE MODAL BODY & CARDS */
      .profile-modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-height: 75vh;
        overflow-y: auto;
      }

      .profile-hero-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: linear-gradient(135deg, #EFF6FF, #F8FAFC);
        border-radius: 12px;
        border: 1px solid #DBEAFE;

        .hero-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 3px solid #FFFFFF;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          object-fit: cover;
          flex-shrink: 0;
        }

        .hero-details {
          flex: 1;
          min-width: 0;

          .hero-name {
            font-size: 1.15rem;
            font-weight: 800;
            color: #0F172A;
            margin: 0 0 4px 0;
          }

          .hero-role-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #1D4ED8;
            background: #DBEAFE;
            padding: 2px 8px;
            border-radius: 999px;
            margin-bottom: 4px;

            .pill-icon {
              font-size: 14px;
            }
          }

          .hero-subtext {
            font-size: 0.78rem;
            color: #64748B;
            font-weight: 500;
          }
        }
      }

      .profile-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }
      }

      .profile-section-box {
        padding: 12px 14px;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;

        .section-box-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
          padding-bottom: 6px;
          border-bottom: 1px solid #F1F5F9;

          .icon {
            font-size: 18px;
            color: #2563EB;
          }
        }

        .info-row {
          display: flex;
          flex-direction: column;
          gap: 1px;

          .info-label {
            color: #64748B;
            font-size: 0.7rem;
            font-weight: 500;
          }

          .info-val {
            color: #0F172A;
            font-size: 0.8rem;
            font-weight: 600;
            word-break: break-word;

            .badge-code {
              background: #F1F5F9;
              color: #475569;
              padding: 1px 6px;
              border-radius: 4px;
              border: 1px solid #CBD5E1;
              font-size: 0.72rem;
              font-weight: 700;
            }
          }
        }
      }

      .roles-tags-wrap {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .role-badge-chip {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 10px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 0.78rem;
          color: #334155;

          .material-symbols-outlined {
            font-size: 18px;
            color: #2563EB;
            margin-top: 1px;
            flex-shrink: 0;
          }

          .chip-text {
            display: flex;
            flex-direction: column;
            gap: 1px;

            .chip-title {
              font-weight: 700;
              color: #0F172A;
              font-size: 0.78rem;
            }

            .chip-scope {
              font-size: 0.7rem;
              color: #64748B;
            }
          }

          &.chip-sysadmin {
            background: #F1F5F9;
            border-color: #CBD5E1;

            .material-symbols-outlined {
              color: #1E293B;
            }
          }
        }
      }

      .profile-modal-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 14px 20px;
        border-top: 1px solid #F1F5F9;
        background: #F8FAFC;

        .btn-dialog-secondary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          color: #334155;
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #F1F5F9;
            color: #0F172A;
            border-color: #94A3B8;
          }

          .material-symbols-outlined {
            font-size: 18px;
            color: #D97706;
          }
        }
      }

      .modal-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #F1F5F9;
        background: #F8FAFC;

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;

          .modal-icon {
            font-size: 22px;
            color: #2563EB;
          }

          h3 {
            font-size: 1rem;
            font-weight: 700;
            color: #0F172A;
            margin: 0;
          }
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: #64748B;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;

          &:hover {
            background: #E2E8F0;
            color: #0F172A;
          }
        }
      }

      .modal-dialog-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .alert-box {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 500;

        &.alert-success {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }

        &.alert-error {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }
      }

      .form-field-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .field-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;

          .req {
            color: #EF4444;
          }
        }

        .field-input {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 0.85rem;
          color: #0F172A;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;

          &:focus {
            border-color: #3B82F6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
          }

          &:disabled {
            background: #F1F5F9;
            cursor: not-allowed;
          }
        }
      }

      .modal-dialog-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding: 14px 20px;
        border-top: 1px solid #F1F5F9;
        background: #F8FAFC;

        .btn-dialog-cancel {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          color: #475569;
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;

          &:hover:not(:disabled) {
            background: #F1F5F9;
            color: #0F172A;
          }
        }

        .btn-dialog-submit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: #2563EB;
          color: #FFFFFF;
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;

          &:hover:not(:disabled) {
            background: #1D4ED8;
          }

          &:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .spin {
            animation: spin 1s linear infinite;
          }
        }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes dropDownIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes slideInLeft {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }

      @media (min-width: 1024px) {
        .hide-on-desktop {
          display: none !important;
        }
      }

      @media (max-width: 1023px) {
        .hide-on-mobile {
          display: none !important;
        }
      }
    `,
  ],
})
export class LayoutComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  contactCardService = inject(ContactCardService);
  notifService = inject(NotificationService);
  private searchService = inject(SearchService);
  private router = inject(Router);

  isMobileDrawerOpen = false;
  isUserMenuOpen = false;
  isProfileModalOpen = false;

  // Global Search state
  searchQuery = '';
  isSearchOpen = false;
  isSearching = false;
  searchResults: GlobalSearchResult | null = null;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Change Password state (TT 003)
  isChangePasswordOpen = false;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  changePasswordError = '';
  changePasswordSuccess = '';
  isChangingPassword = false;

  ngOnInit(): void {
    this.notifService.getNotifications({ unreadOnly: true }).subscribe({ error: () => {} });

    // Setup debounced search
    this.searchSub = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          const trimmed = q.trim();
          if (!trimmed || trimmed.length < 2) {
            this.isSearching = false;
            this.searchResults = null;
            return of(null);
          }
          this.isSearching = true;
          return this.searchService.searchGlobal(trimmed, 'ALL');
        })
      )
      .subscribe({
        next: (results) => {
          this.isSearching = false;
          this.searchResults = results;
        },
        error: () => {
          this.isSearching = false;
        },
      });

    // Auto-close mobile drawer, user menu & search when route changes
    this.router.events.subscribe(() => {
      this.isMobileDrawerOpen = false;
      this.isSearchOpen = false;
      this.isUserMenuOpen = false;
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isSearchOpen = false;
    this.isUserMenuOpen = false;
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const input = document.querySelector('.global-search-input') as HTMLInputElement;
      if (input) {
        input.focus();
        this.isSearchOpen = true;
      }
    } else if (event.key === 'Escape') {
      this.isSearchOpen = false;
      this.isUserMenuOpen = false;
      this.isProfileModalOpen = false;
    }
  }

  toggleUserMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isSearchOpen = false;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  openProfileModal(): void {
    this.closeUserMenu();
    this.isMobileDrawerOpen = false;
    this.isProfileModalOpen = true;
  }

  closeProfileModal(): void {
    this.isProfileModalOpen = false;
  }

  openChangePasswordFromMenu(): void {
    this.closeUserMenu();
    this.openChangePassword();
  }

  openChangePasswordFromProfile(): void {
    this.closeProfileModal();
    this.openChangePassword();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.isSearchOpen = true;
    this.searchSubject.next(this.searchQuery);
  }

  onSearchFocus(): void {
    this.isSearchOpen = true;
    if (this.searchQuery.trim().length >= 2 && !this.searchResults) {
      this.searchSubject.next(this.searchQuery);
    }
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isSearchOpen = false;
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = null;
    this.isSearchOpen = false;
  }

  selectTask(taskId: string): void {
    this.isSearchOpen = false;
    this.router.navigate(['/tasks'], { queryParams: { taskId } });
  }

  selectPlan(planId: string): void {
    this.isSearchOpen = false;
    this.router.navigate(['/plans'], { queryParams: { planId } });
  }

  selectUser(userId: string): void {
    this.isSearchOpen = false;
    this.contactCardService.open(userId);
  }

  selectAttachment(attachment: any): void {
    this.isSearchOpen = false;
    if (attachment.fileUrl) {
      window.open(attachment.fileUrl, '_blank');
    } else if (attachment.taskId) {
      this.router.navigate(['/tasks'], { queryParams: { taskId: attachment.taskId } });
    } else {
      this.router.navigate(['/evidence']);
    }
  }

  openChangePassword(): void {
    this.closeUserMenu();
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.changePasswordError = '';
    this.changePasswordSuccess = '';
    this.isChangingPassword = false;
    this.isChangePasswordOpen = true;
    this.isMobileDrawerOpen = false;
  }

  closeChangePassword(): void {
    this.isChangePasswordOpen = false;
  }

  submitChangePassword(): void {
    this.changePasswordError = '';
    this.changePasswordSuccess = '';

    if (!this.currentPassword) {
      this.changePasswordError = 'Vui lòng nhập mật khẩu hiện tại.';
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.changePasswordError = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.changePasswordError = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    this.isChangingPassword = true;
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (res) => {
        this.isChangingPassword = false;
        this.changePasswordSuccess = res.message || 'Đổi mật khẩu thành công!';
        setTimeout(() => {
          this.closeChangePassword();
        }, 1500);
      },
      error: (err) => {
        this.isChangingPassword = false;
        this.changePasswordError = err.error?.message || err.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
      },
    });
  }

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen = !this.isMobileDrawerOpen;
  }

  closeMobileDrawer(): void {
    this.isMobileDrawerOpen = false;
  }

  logout(): void {
    this.closeUserMenu();
    this.closeMobileDrawer();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getRolePillClass(): string {
    const role = this.authService.activeRole()?.role;
    switch (role) {
      case 'SYSTEM_ADMIN':
        return 'pill-sysadmin';
      case 'ADMIN':
        return 'pill-admin';
      case 'HIEU_TRUONG':
        return 'pill-hieu-truong';
      case 'PHO_HIEU_TRUONG':
        return 'pill-pht';
      case 'TO_TRUONG':
        return 'pill-to-truong';
      case 'GIAO_VIEN':
      default:
        return 'pill-giao-vien';
    }
  }

  getRoleIcon(): string {
    const role = this.authService.activeRole()?.role;
    switch (role) {
      case 'SYSTEM_ADMIN':
        return 'hub';
      case 'ADMIN':
        return 'admin_panel_settings';
      case 'HIEU_TRUONG':
        return 'stars';
      case 'PHO_HIEU_TRUONG':
        return 'shield_person';
      case 'TO_TRUONG':
        return 'supervisor_account';
      case 'GIAO_VIEN':
      default:
        return 'person';
    }
  }

  getContactUser(): UserPickerItem | undefined {
    const u = this.contactCardService.currentUser();
    return typeof u === 'object' && u !== null ? (u as UserPickerItem) : undefined;
  }

  getContactUserId(): string | undefined {
    const u = this.contactCardService.currentUser();
    return typeof u === 'string' ? u : u?.id;
  }
}
