import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
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
          <div class="context-pill" [title]="'Đang làm việc với vai trò: ' + role.roleTitle">
            <span class="material-symbols-outlined pill-icon">badge</span>
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
            <span>Giao việc mới</span>
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
        <!-- MOBILE TOP BAR -->
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
        background: var(--tn-primary);
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
        padding: 20px 16px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);

        .logo-box {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;

          .logo-icon {
            font-size: 24px;
            color: #FFFFFF;
          }
        }

        .brand-text {
          .app-name {
            font-size: 1.15rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #FFFFFF;
            line-height: 1.2;
          }
          .school-name {
            font-size: 0.78rem;
            color: rgba(255, 255, 255, 0.7);
          }
        }
      }

      .context-pill {
        margin: 12px 16px 8px;
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
            font-weight: 600;
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
      }

      .sidebar-nav {
        flex: 1;
        padding: 12px 10px;
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
          font-size: 0.9rem;
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
            font-weight: 600;
            .nav-icon { color: #93C5FD; }
          }
        }
      }

      .sidebar-action {
        padding: 12px 16px;

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
          padding: 10px 16px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: #256628;
            box-shadow: 0 4px 10px rgba(46, 125, 50, 0.3);
          }
        }
      }

      .sidebar-footer {
        padding: 12px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);

        .user-card {
          display: flex;
          align-items: center;
          gap: 10px;

          .user-avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.2);
          }

          .user-details {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;

            .user-name {
              font-size: 0.85rem;
              font-weight: 600;
              color: #FFFFFF;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .user-title {
              font-size: 0.72rem;
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
        background: var(--tn-bg-app);
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
        background: var(--tn-primary);
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
            color: var(--tn-primary);
            font-weight: 700;
            .tab-icon { color: var(--tn-primary); }
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
        .page-content {
          padding: 12px;
          padding-bottom: calc(var(--bottom-nav-height) + 20px);
        }
      }
    `,
  ],
})
export class LayoutComponent implements OnInit {
  authService = inject(AuthService);
  contactCardService = inject(ContactCardService);
  notifService = inject(NotificationService);
  private router = inject(Router);

  private notifInterval: any;

  ngOnInit() {
    this.fetchNotifications();
    // Poll notifications every 30s as per Prompt 17
    this.notifInterval = setInterval(() => {
      this.fetchNotifications();
    }, 30000);
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

