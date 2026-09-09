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
            <span class="material-symbols-outlined logo-icon">school</span>
          </div>
          <div class="brand-text">
            <h1 class="app-name">TN EDU</h1>
            <span class="school-name">THCS Phước Tân</span>
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
            <span class="nav-text">Tổng quan</span>
          </a>

          <a routerLink="/my-tasks" routerLinkActive="active" class="nav-link">
            <span class="material-symbols-outlined nav-icon">task_alt</span>
            <span class="nav-text">Việc của tôi</span>
          </a>

          <a routerLink="/plans" routerLinkActive="active" class="nav-link">
            <span class="material-symbols-outlined nav-icon">calendar_month</span>
            <span class="nav-text">Kế hoạch</span>
          </a>

          <a routerLink="/tasks" routerLinkActive="active" class="nav-link">
            <span class="material-symbols-outlined nav-icon">assignment</span>
            <span class="nav-text">Tất cả công việc</span>
          </a>

          <a routerLink="/org" routerLinkActive="active" class="nav-link">
            <span class="material-symbols-outlined nav-icon">account_tree</span>
            <span class="nav-text">Cơ cấu & Điểm trường</span>
          </a>

          <a routerLink="/notifications" routerLinkActive="active" class="nav-link">
            <span class="material-symbols-outlined nav-icon">notifications</span>
            <span class="nav-text">Thông báo</span>
            @if (notifService.unreadCount() > 0) {
              <span class="sidebar-unread-badge">{{ notifService.unreadCount() }}</span>
            }
          </a>
        </nav>

        <!-- Quick Create Task Action in Sidebar -->
        <div class="sidebar-action">
          <button type="button" class="create-task-btn" routerLink="/tasks" [queryParams]="{ create: 'true' }">
            <span class="material-symbols-outlined">add_circle</span>
            <span>{{ authService.isGiaoVien() ? 'Đề xuất việc mới' : 'Giao việc mới (RACI)' }}</span>
          </button>
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
        <!-- TOP DEMO ROLE & ACCOUNT SWITCHER BAR (DESKTOP & MOBILE) -->
        <header class="top-demo-bar">
          <div class="bar-left">
            <div class="active-identity-tag" [ngClass]="getRolePillClass()">
              <span class="material-symbols-outlined tag-icon">{{ getRoleIcon() }}</span>
              <div class="tag-details">
                <span class="tag-title">{{ authService.currentUser()?.fullName }}</span>
                <span class="tag-sub">{{ authService.activeRole()?.roleTitle }} • {{ authService.activeRole()?.scopeName || 'Toàn trường' }}</span>
              </div>
            </div>
          </div>

          <!-- 4 QUICK DEMO ACCOUNTS SWITCH BUTTONS -->
          <div class="bar-right">
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
        </header>

        <!-- MOBILE TOP BAR (Small screens only) -->
        <header class="mobile-header hide-on-desktop">
          <div class="mobile-brand">
            <span class="material-symbols-outlined brand-icon">school</span>
            <span class="mobile-title">TN EDU</span>
          </div>

          <div class="mobile-actions">
            <a routerLink="/notifications" class="mobile-icon-btn" title="Thông báo">
              <span class="material-symbols-outlined">notifications</span>
              @if (notifService.unreadCount() > 0) {
                <span class="mobile-notif-dot"></span>
              }
            </a>
            @if (authService.currentUser(); as user) {
              <img [src]="user.avatarUrl" [alt]="user.fullName" class="mobile-avatar" (click)="logout()" title="Bấm để đăng xuất" />
            }
          </div>
        </header>

        <!-- ROUTER OUTLET -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>

        <!-- MOBILE FLOATING ACTION BUTTON (FAB) -->
        <button
          type="button"
          class="mobile-fab hide-on-desktop tap-target"
          routerLink="/tasks"
          [queryParams]="{ create: 'true' }"
          title="Tạo việc mới"
        >
          <span class="material-symbols-outlined">add</span>
        </button>

        <!-- MOBILE BOTTOM NAVIGATION (4 Tabs) -->
        <nav class="mobile-bottom-nav hide-on-desktop">
          <a routerLink="/my-tasks" routerLinkActive="active" class="bottom-tab tap-target">
            <span class="material-symbols-outlined tab-icon">task_alt</span>
            <span class="tab-label">Việc của tôi</span>
          </a>

          <a routerLink="/plans" routerLinkActive="active" class="bottom-tab tap-target">
            <span class="material-symbols-outlined tab-icon">calendar_month</span>
            <span class="tab-label">Kế hoạch</span>
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

          <a routerLink="/dashboard" routerLinkActive="active" class="bottom-tab tap-target">
            <span class="material-symbols-outlined tab-icon">dashboard</span>
            <span class="tab-label">Tổng quan</span>
          </a>
        </nav>
      </div>

      <!-- 3. GLOBAL CONTACT MINI CARD POPOVER / BOTTOM-SHEET -->
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
      }

      /* 1. DESKTOP SIDEBAR */
      .desktop-sidebar {
        width: var(--sidebar-width);
        min-width: var(--sidebar-width);
        background: #1F3864;
        color: #FFFFFF;
        display: flex;
        flex-direction: column;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 100;
      }

      .sidebar-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 18px 16px 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);

        .logo-box {
          width: 38px;
          height: 38px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;

          .logo-icon {
            font-size: 22px;
            color: #FFFFFF;
          }
        }

        .brand-text {
          .app-name {
            font-size: 1.15rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #FFFFFF;
            line-height: 1.2;
          }
          .school-name {
            font-size: 0.76rem;
            color: rgba(255, 255, 255, 0.7);
          }
        }
      }

      .context-pill {
        margin: 10px 14px 6px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);

        .pill-icon {
          font-size: 20px;
          color: #93C5FD;
        }

        .pill-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;

          .pill-role {
            font-size: 0.8rem;
            font-weight: 700;
            color: #FFFFFF;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .pill-scope {
            font-size: 0.72rem;
            color: #93C5FD;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        &.pill-hieu-truong {
          background: rgba(30, 58, 138, 0.5);
          border-color: #60A5FA;
          .pill-icon { color: #FBBF24; }
        }
        &.pill-pht {
          background: rgba(46, 94, 170, 0.5);
          border-color: #93C5FD;
          .pill-icon { color: #60A5FA; }
        }
        &.pill-to-truong {
          background: rgba(217, 119, 6, 0.3);
          border-color: #FCD34D;
          .pill-icon { color: #F59E0B; }
        }
        &.pill-giao-vien {
          background: rgba(5, 150, 105, 0.3);
          border-color: #6EE7B7;
          .pill-icon { color: #34D399; }
        }
      }

      .sidebar-nav {
        flex: 1;
        padding: 10px 10px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 500;
          transition: all 0.2s ease;

          .nav-icon {
            font-size: 20px;
            color: rgba(255, 255, 255, 0.7);
          }

          &:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #FFFFFF;
            .nav-icon { color: #FFFFFF; }
          }

          &.active {
            background: rgba(255, 255, 255, 0.2);
            color: #FFFFFF;
            font-weight: 700;
            .nav-icon { color: #93C5FD; }
          }
        }
      }

      .sidebar-action {
        padding: 10px 14px;

        .create-task-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #2E7D32;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 9px 14px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: #256628;
            box-shadow: 0 4px 10px rgba(46, 125, 50, 0.3);
          }
        }
      }

      .sidebar-footer {
        padding: 10px 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);

        .user-card {
          display: flex;
          align-items: center;
          gap: 10px;

          .user-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.2);
          }

          .user-details {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;

            .user-name {
              font-size: 0.82rem;
              font-weight: 700;
              color: #FFFFFF;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .user-title {
              font-size: 0.7rem;
              color: rgba(255, 255, 255, 0.65);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }

          .logout-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
            display: flex;
            align-items: center;

            &:hover {
              color: #EF4444;
              background: rgba(239, 68, 68, 0.15);
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
        background: #F1F5F9;
      }

      /* TOP DEMO SWITCHER BAR */
      .top-demo-bar {
        background: #FFFFFF;
        border-bottom: 1px solid #CBD5E1;
        padding: 8px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        z-index: 50;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        flex-wrap: wrap;

        .bar-left {
          display: flex;
          align-items: center;
          gap: 8px;

          .active-identity-tag {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 4px 10px;
            border-radius: 8px;
            background: #EEF4FC;
            border: 1px solid #BFDBFE;

            .tag-icon {
              font-size: 20px;
              color: #1F3864;
            }

            .tag-details {
              display: flex;
              flex-direction: column;

              .tag-title {
                font-size: 0.82rem;
                font-weight: 800;
                color: #1F3864;
              }

              .tag-sub {
                font-size: 0.7rem;
                color: #475569;
              }
            }

            &.pill-hieu-truong {
              background: #EFF6FF;
              border-color: #93C5FD;
              .tag-icon { color: #1E40AF; }
              .tag-title { color: #1E40AF; }
            }
            &.pill-pht {
              background: #F0FDF4;
              border-color: #86EFAC;
              .tag-icon { color: #166534; }
              .tag-title { color: #166534; }
            }
            &.pill-to-truong {
              background: #FFFBEB;
              border-color: #FDE68A;
              .tag-icon { color: #92400E; }
              .tag-title { color: #92400E; }
            }
            &.pill-giao-vien {
              background: #ECFDF5;
              border-color: #A7F3D0;
              .tag-icon { color: #065F46; }
              .tag-title { color: #065F46; }
            }
          }
        }

        .bar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;

          .demo-bar-label {
            font-size: 0.78rem;
            font-weight: 700;
            color: #475569;
            white-space: nowrap;
          }

          .demo-buttons-group,
          .demo-buttons-row {
            display: flex;
            align-items: center;
            gap: 6px;

            .demo-role-btn {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 4px 10px;
              border-radius: 9999px;
              border: 1.5px solid #CBD5E1;
              background: #F8FAFC;
              color: #334155;
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.15s ease;

              .btn-icon {
                font-size: 16px;
                color: #64748B;
              }

              .btn-name {
                font-weight: 700;
              }

              .btn-role-tag {
                font-size: 0.68rem;
                opacity: 0.85;
              }

              &:hover {
                background: #EEF4FC;
                border-color: #93C5FD;
                color: #1F3864;
                .btn-icon { color: #1F3864; }
              }

              &.active {
                background: #1F3864;
                border-color: #1F3864;
                color: #FFFFFF;

                .btn-icon { color: #FBBF24; }
                .btn-role-tag { color: #93C5FD; }
              }

              &.active.role-pho_hieu_truong {
                background: #2E5EAA;
                border-color: #2E5EAA;
              }
              &.active.role-to_truong {
                background: #D97706;
                border-color: #D97706;
              }
              &.active.role-giao_vien {
                background: #059669;
                border-color: #059669;
              }
            }
          }
        }
      }

      .page-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px 20px;
        -webkit-overflow-scrolling: touch;
      }

      /* 3. MOBILE HEADER & NAVIGATION */
      .mobile-header {
        height: var(--top-header-height);
        min-height: var(--top-header-height);
        background: #1F3864;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        box-shadow: var(--tn-shadow-sm);
        z-index: 90;

        .mobile-brand {
          display: flex;
          align-items: center;
          gap: 8px;

          .brand-icon { font-size: 22px; color: #FFFFFF; }
          .mobile-title { font-size: 1.1rem; font-weight: 700; }
        }

        .mobile-actions {
          display: flex;
          align-items: center;
          gap: 12px;

          .mobile-icon-btn {
            color: #FFFFFF;
            text-decoration: none;
            display: flex;
            align-items: center;
          }

          .mobile-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
          }
        }
      }

      .mobile-bottom-nav {
        height: var(--bottom-nav-height);
        background: var(--tn-surface);
        border-top: 1px solid var(--tn-border);
        display: flex;
        align-items: center;
        justify-content: space-around;
        padding: 0 8px;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
        z-index: 90;

        .bottom-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-decoration: none;
          color: var(--tn-text-muted);
          font-size: 0.72rem;
          font-weight: 500;
          transition: all 0.2s ease;

          .tab-icon {
            font-size: 22px;
          }

          &.active {
            color: #1F3864;
            font-weight: 700;
            .tab-icon { color: #1F3864; }
          }
        }
      }

      .mobile-fab {
        position: absolute;
        bottom: calc(var(--bottom-nav-height) + 16px);
        right: 16px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #2E7D32;
        color: #FFFFFF;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(46, 125, 50, 0.4);
        cursor: pointer;
        z-index: 95;
        transition: transform 0.2s ease;

        &:active {
          transform: scale(0.92);
        }

        .material-symbols-outlined {
          font-size: 28px;
        }
      }

      .sidebar-unread-badge {
        margin-left: auto;
        background: #DC2626;
        color: #FFFFFF;
        font-size: 0.72rem;
        font-weight: 800;
        padding: 1px 7px;
        border-radius: 9999px;
      }

      .mobile-notif-dot {
        width: 8px;
        height: 8px;
        background: #EF4444;
        border-radius: 50%;
        position: absolute;
        top: 14px;
        right: 54px;
      }

      .tab-icon-wrapper {
        position: relative;
        display: inline-flex;

        .bottom-notif-badge {
          position: absolute;
          top: -4px;
          right: -8px;
          background: #DC2626;
          color: #FFFFFF;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0 4px;
          border-radius: 9999px;
          min-width: 14px;
          text-align: center;
        }
      }

      @media (max-width: 768px) {
        .top-demo-bar {
          padding: 6px 10px;
          .bar-left { display: none; }
          .bar-right { width: 100%; justify-content: space-between; }
        }

        .page-content {
          padding: 12px;
          padding-bottom: calc(var(--bottom-nav-height) + 20px);
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

  private notifInterval: any;

  ngOnInit() {
    this.fetchNotifications();
    this.notifInterval = setInterval(() => {
      this.fetchNotifications();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.notifInterval) clearInterval(this.notifInterval);
  }

  isCurrentAccount(identifier: string): boolean {
    const user = this.authService.currentUser();
    return user?.phone === identifier || user?.email === identifier;
  }

  switchAccount(acc: DemoAccountInfo) {
    this.authService.switchDemoAccount(acc.identifier).subscribe({
      next: () => {
        this.fetchNotifications();
      },
      error: () => {},
    });
  }

  getRolePillClass(): string {
    const role = this.authService.activeRole()?.role;
    switch (role) {
      case 'HIEU_TRUONG':
      case 'ADMIN':
        return 'pill-hieu-truong';
      case 'PHO_HIEU_TRUONG':
        return 'pill-pht';
      case 'TO_TRUONG':
        return 'pill-to-truong';
      case 'GIAO_VIEN':
      case 'NHAN_VIEN':
      default:
        return 'pill-giao-vien';
    }
  }

  getRoleIcon(): string {
    const role = this.authService.activeRole()?.role;
    switch (role) {
      case 'HIEU_TRUONG':
      case 'ADMIN':
        return 'stars';
      case 'PHO_HIEU_TRUONG':
        return 'shield_person';
      case 'TO_TRUONG':
        return 'supervisor_account';
      case 'GIAO_VIEN':
      case 'NHAN_VIEN':
      default:
        return 'person';
    }
  }

  fetchNotifications() {
    if (this.authService.isAuthenticated()) {
      this.notifService.getNotifications({ pageSize: 5 }).subscribe();
    }
  }

  logout() {
    if (this.notifInterval) clearInterval(this.notifInterval);
    this.authService.logout();
  }

  getContactUser(): UserPickerItem | null {
    const val = this.contactCardService.currentUser();
    if (val && typeof val === 'object') {
      return val as UserPickerItem;
    }
    return null;
  }

  getContactUserId(): string | undefined {
    const val = this.contactCardService.currentUser();
    if (typeof val === 'string') {
      return val;
    }
    return undefined;
  }
}
