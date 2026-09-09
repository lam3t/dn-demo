import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, DemoAccountInfo } from '../../../core/services/auth.service';
import { ContactCardService } from '../../../core/services/contact-card.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ContactMiniCardComponent } from '../contact-mini-card/contact-mini-card.component';
import { UserPickerItem } from '../../../core/models/user.models';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ContactMiniCardComponent],
  template: `
    <div class="app-layout">
      <!-- 1. DESKTOP SIDEBAR -->
      <aside class="desktop-sidebar hide-on-mobile">
        <div class="sidebar-header">
          <div class="logo-box">
            <span class="material-symbols-outlined logo-icon">insights</span>
          </div>
          <div class="brand-text">
            <div class="brand-top">
              <h1 class="app-name">TN EDU</h1>
              <span class="version-tag">2026-2027</span>
            </div>
            <span class="school-name">THCS PHƯỚC TÂN</span>
          </div>
        </div>

        <!-- Campus / Role Context Selector Pill -->
        @if (authService.activeRole(); as role) {
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

          <a routerLink="/org" routerLinkActive="active" class="nav-link">
            <span class="material-symbols-outlined nav-icon">apartment</span>
            <span class="nav-text">Cơ cấu & Điểm trường</span>
          </a>

          <a routerLink="/notifications" routerLinkActive="active" class="nav-link">
            <span class="material-symbols-outlined nav-icon">notifications</span>
            <span class="nav-text">Thông báo</span>
            @if (notifService.unreadCount() > 0) {
              <span class="sidebar-unread-badge">{{ notifService.unreadCount() }}</span>
            }
          </a>

          @if (authService.isHieuTruong()) {
            <a routerLink="/admin-settings" routerLinkActive="active" class="nav-link admin-link" title="Cấu hình hệ thống (Prompt 18B)">
              <span class="material-symbols-outlined nav-icon admin-icon">admin_panel_settings</span>
              <span class="nav-text">Cấu hình hệ thống</span>
              <span class="sidebar-admin-badge">Admin</span>
            </a>
          } @else {
            <a (click)="switchAndGoToAdmin()" class="nav-link admin-link locked-role-nav" title="Dành cho Hiệu trưởng / Quản trị. Bấm để chuyển nhanh sang Cô Phạm Thị Nam">
              <span class="material-symbols-outlined nav-icon">admin_panel_settings</span>
              <span class="nav-text">Cấu hình hệ thống</span>
              <span class="sidebar-lock-tag">Hiệu trưởng</span>
            </a>
          }
        </nav>

        <!-- Quick Create Task Action in Sidebar -->
        <div class="sidebar-action">
          <button type="button" class="create-task-btn" routerLink="/tasks" [queryParams]="{ create: 'true' }">
            <span class="material-symbols-outlined">add_circle</span>
            <span>{{ authService.isGiaoVien() ? 'Đề xuất việc mới' : 'Giao việc mới (RACI)' }}</span>
          </button>
        </div>

        <!-- Version footer -->
        <div class="sidebar-bottom-badge">
          <span class="material-symbols-outlined icon-mini">verified</span>
          <span>Phiên bản Năm học 2026-2027</span>
        </div>

        <!-- User Profile & Logout in Sidebar Footer -->
        <div class="sidebar-footer">
          @if (authService.currentUser(); as user) {
            <div class="user-card">
              <img [src]="user.avatarUrl" [alt]="user.fullName" class="user-avatar" />
              <div class="user-details">
                <span class="user-name" [title]="user.fullName">{{ user.fullName }}</span>
                <span class="user-title" [title]="user.title || ''">{{ user.title || 'Cán bộ giáo viên' }}</span>
              </div>
              <button type="button" class="logout-btn" (click)="logout()" title="Đăng xuất">
                <span class="material-symbols-outlined">logout</span>
              </button>
            </div>
          }
        </div>
      </aside>

      <!-- 2. MAIN CONTENT AREA -->
      <div class="main-wrapper">
        <!-- TOP HEADER: CLEAN BRAND TITLE & QUICK ROLE SWITCHER -->
        <header class="top-nav-bar">
          <div class="nav-bar-left">
            <div class="header-brand-title hide-on-mobile">
              <span class="material-symbols-outlined brand-star-icon">school</span>
              <span class="brand-school">Trường THCS Phước Tân</span>
              <span class="brand-scale-badge">122 Lớp • 5.669 Học sinh</span>
            </div>
          </div>

          <!-- 4 QUICK DEMO ACCOUNTS SWITCH BUTTONS & USER STATUS -->
          <div class="nav-bar-right">
            <div class="demo-buttons-container hide-on-mobile">
              <span class="demo-bar-label">⚡ Đổi nhanh vai trò:</span>
              <div class="demo-buttons-row">
                @for (acc of authService.demoAccounts; track acc.identifier) {
                  <button
                    type="button"
                    class="demo-role-btn tap-target"
                    [class.active]="isCurrentAccount(acc.identifier)"
                    [ngClass]="'role-' + acc.role.toLowerCase()"
                    (click)="switchAccount(acc)"
                    [title]="acc.desc"
                  >
                    <span class="material-symbols-outlined btn-icon">{{ acc.icon }}</span>
                    <span class="btn-name">{{ acc.name }}</span>
                    <span class="btn-role-tag">{{ acc.roleTitle }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Right Controls: Language pill, Notification Bell, User Header Pill -->
            <div class="header-user-controls">
              <span class="lang-pill" title="Ngôn ngữ tiếng Việt">VN</span>

              <a routerLink="/notifications" class="notif-bell-btn" title="Thông báo hệ thống">
                <span class="material-symbols-outlined">notifications</span>
                @if (notifService.unreadCount() > 0) {
                  <span class="notif-badge">{{ notifService.unreadCount() }}</span>
                }
              </a>

              @if (authService.currentUser(); as u) {
                <div class="header-profile-pill" (click)="logout()" title="Bấm để đăng xuất">
                  <div class="avatar-ring">
                    <img [src]="u.avatarUrl" [alt]="u.fullName" class="header-avatar" />
                  </div>
                  <div class="header-user-text hide-on-mobile">
                    <span class="header-user-name">{{ u.fullName }}</span>
                    <span class="header-user-role">{{ u.title || authService.activeRole()?.roleTitle }}</span>
                  </div>
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
            <div class="mobile-brand" routerLink="/dashboard">
              <span class="material-symbols-outlined brand-icon">school</span>
              <span class="mobile-title">THCS Phước Tân</span>
            </div>
          </div>

          <div class="mobile-actions">
            @if (authService.isHieuTruong()) {
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

        <!-- MOBILE BOTTOM NAVIGATION (5 Primary Tabs) -->
        <nav class="mobile-bottom-nav hide-on-desktop">
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
                    <span class="drawer-user-title">{{ user.title || 'Cán bộ giáo viên' }}</span>
                    <span class="drawer-user-phone">📞 {{ user.phone }}</span>
                  </div>
                }
              </div>
              <button type="button" class="drawer-close-btn tap-target" (click)="closeMobileDrawer()" title="Đóng menu">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Active Context Pill in Drawer -->
            @if (authService.activeRole(); as role) {
              <div class="drawer-context-pill" [ngClass]="getRolePillClass()">
                <span class="material-symbols-outlined pill-icon">{{ getRoleIcon() }}</span>
                <div class="pill-meta">
                  <span class="pill-role-title">{{ role.roleTitle }}</span>
                  <span class="pill-scope-title">{{ role.scopeName || 'Toàn trường (122 Lớp • 5.669 HS)' }}</span>
                </div>
              </div>
            }

            <!-- Quick Demo Accounts Switcher on Mobile Drawer -->
            <div class="drawer-section">
              <div class="drawer-section-title">
                <span class="material-symbols-outlined title-icon">swap_horiz</span>
                <span>Chuyển nhanh 4 vai trò demo:</span>
              </div>
              <div class="drawer-demo-grid">
                @for (acc of authService.demoAccounts; track acc.identifier) {
                  <button
                    type="button"
                    class="drawer-demo-btn tap-target"
                    [class.active]="isCurrentAccount(acc.identifier)"
                    [ngClass]="'role-' + acc.role.toLowerCase()"
                    (click)="switchAccountFromDrawer(acc)"
                  >
                    <span class="material-symbols-outlined btn-icon">{{ acc.icon }}</span>
                    <div class="demo-btn-text">
                      <span class="demo-name">{{ acc.name }}</span>
                      <span class="demo-role">{{ acc.roleTitle }}</span>
                    </div>
                  </button>
                }
              </div>
            </div>

            <!-- Full Navigation Links in Drawer -->
            <div class="drawer-section">
              <div class="drawer-section-title">
                <span class="material-symbols-outlined title-icon">grid_view</span>
                <span>Phân hệ hệ thống:</span>
              </div>
              <nav class="drawer-nav-list">
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

                <a routerLink="/org" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                  <span class="material-symbols-outlined nav-icon">apartment</span>
                  <span class="nav-label">Cơ cấu & Điểm trường</span>
                </a>

                <a routerLink="/notifications" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item">
                  <span class="material-symbols-outlined nav-icon">notifications</span>
                  <span class="nav-label">Thông báo hệ thống</span>
                  @if (notifService.unreadCount() > 0) {
                    <span class="drawer-unread-badge">{{ notifService.unreadCount() }}</span>
                  }
                </a>

                @if (authService.isHieuTruong()) {
                  <a routerLink="/admin-settings" routerLinkActive="active" (click)="closeMobileDrawer()" class="drawer-nav-item admin-item">
                    <span class="material-symbols-outlined nav-icon admin-icon">admin_panel_settings</span>
                    <span class="nav-label">Cấu hình hệ thống (Prompt 18B)</span>
                    <span class="drawer-admin-tag">Admin</span>
                  </a>
                } @else {
                  <a (click)="switchAndGoToAdminFromDrawer()" class="drawer-nav-item locked-item">
                    <span class="material-symbols-outlined nav-icon">admin_panel_settings</span>
                    <span class="nav-label">Cấu hình hệ thống (Prompt 18B)</span>
                    <span class="drawer-lock-tag">Hiệu trưởng</span>
                  </a>
                }
              </nav>
            </div>

            <!-- Quick Action button -->
            <div class="drawer-action-box">
              <button type="button" class="drawer-create-btn tap-target" routerLink="/tasks" [queryParams]="{ create: 'true' }" (click)="closeMobileDrawer()">
                <span class="material-symbols-outlined">add_circle</span>
                <span>{{ authService.isGiaoVien() ? 'Đề xuất việc mới' : 'Giao việc mới (RACI)' }}</span>
              </button>
            </div>

            <!-- Drawer Footer: Logout & Version info -->
            <div class="drawer-footer">
              <button type="button" class="drawer-logout-btn tap-target" (click)="logout()">
                <span class="material-symbols-outlined">logout</span>
                <span>Đăng xuất</span>
              </button>
              <span class="drawer-version">TN EDU • THCS Phước Tân 2026-2027</span>
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
      .top-nav-bar {
        background: #FFFFFF;
        border-bottom: 1px solid #E2E8F0;
        padding: 0 1.25rem;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        z-index: 50;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

        .nav-bar-left {
          display: flex;
          align-items: center;
          height: 100%;
        }

        .header-brand-title {
          display: flex;
          align-items: center;
          gap: 8px;

          .brand-star-icon {
            font-size: 20px;
            color: #1E40AF;
          }

          .brand-school {
            font-size: 0.95rem;
            font-weight: 800;
            color: #0F172A;
            letter-spacing: -0.01em;
          }

          .brand-scale-badge {
            font-size: 0.72rem;
            font-weight: 700;
            background: #EEF2FF;
            color: #3730A3;
            border: 1px solid #C7D2FE;
            padding: 2px 8px;
            border-radius: 999px;
          }
        }

        .nav-bar-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .demo-buttons-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .demo-bar-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #64748B;
          }

          .demo-buttons-row {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            flex-wrap: nowrap;
          }
        }

        .demo-role-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          font-size: 0.74rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
          line-height: 1;

          .btn-icon {
            font-size: 15px;
            flex-shrink: 0;
          }
          .btn-name {
            font-weight: 600;
            white-space: nowrap;
          }
          .btn-role-tag {
            font-size: 0.65rem;
            background: #F1F5F9;
            color: #64748B;
            padding: 2px 5px;
            border-radius: 4px;
            white-space: nowrap;
            line-height: 1.1;
          }

          &:hover {
            border-color: #94A3B8;
            background: #F8FAFC;
          }

          &.active {
            border-color: #3B82F6;
            background: #EFF6FF;
            color: #1D4ED8;
            .btn-role-tag {
              background: #DBEAFE;
              color: #1E40AF;
            }
          }
        }

        .header-user-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .lang-pill {
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          padding: 2px 6px;
          border-radius: 4px;
          background: #F1F5F9;
        }

        .notif-bell-btn {
          position: relative;
          color: #64748B;
          text-decoration: none;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;

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

        .header-profile-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 3px 8px 3px 4px;
          border-radius: 999px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          cursor: pointer;
          transition: background 0.15s;

          &:hover {
            background: #F1F5F9;
          }

          .avatar-ring {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .header-avatar {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .header-user-text {
            display: flex;
            flex-direction: column;
            line-height: 1.1;

            .header-user-name {
              font-size: 0.78rem;
              font-weight: 700;
              color: #0F172A;
            }

            .header-user-role {
              font-size: 0.68rem;
              color: #64748B;
            }
          }
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

          .drawer-demo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 6px;

            .drawer-demo-btn {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 8px;
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 8px;
              text-align: left;
              cursor: pointer;
              min-height: 44px;

              .btn-icon {
                font-size: 16px;
                color: #64748B;
                flex-shrink: 0;
              }

              .demo-btn-text {
                display: flex;
                flex-direction: column;
                overflow: hidden;

                .demo-name {
                  font-size: 0.72rem;
                  font-weight: 700;
                  color: #0F172A;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }

                .demo-role {
                  font-size: 0.62rem;
                  color: #64748B;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
              }

              &.active {
                background: #EFF6FF;
                border-color: #3B82F6;

                .btn-icon {
                  color: #2563EB;
                }

                .demo-name {
                  color: #1D4ED8;
                }
              }

              &:active {
                transform: scale(0.97);
              }
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
  private router = inject(Router);

  isMobileDrawerOpen = false;

  ngOnInit(): void {
    this.notifService.getNotifications({ unreadOnly: true }).subscribe({ error: () => {} });

    // Auto-close mobile drawer when route changes
    this.router.events.subscribe(() => {
      this.isMobileDrawerOpen = false;
    });
  }

  ngOnDestroy(): void {}

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen = !this.isMobileDrawerOpen;
  }

  closeMobileDrawer(): void {
    this.isMobileDrawerOpen = false;
  }

  switchAccountFromDrawer(account: DemoAccountInfo): void {
    this.switchAccount(account);
    this.closeMobileDrawer();
  }

  switchAndGoToAdminFromDrawer(): void {
    this.switchAndGoToAdmin();
    this.closeMobileDrawer();
  }

  logout(): void {
    this.closeMobileDrawer();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  switchAccount(account: DemoAccountInfo): void {
    this.authService.switchDemoAccount(account.identifier).subscribe({ error: () => {} });
  }

  switchAndGoToAdmin(): void {
    const hieuTruongAcc = this.authService.demoAccounts.find((a) => a.role === 'HIEU_TRUONG');
    if (hieuTruongAcc) {
      this.authService.switchDemoAccount(hieuTruongAcc.identifier).subscribe({
        next: () => {
          this.router.navigate(['/admin-settings']);
        },
      });
    }
  }

  isCurrentAccount(identifier: string): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    return user.phone === identifier || user.email === identifier;
  }

  getRolePillClass(): string {
    const role = this.authService.activeRole()?.role;
    switch (role) {
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
