import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationItem, NotificationType } from '../../core/models/notification.models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="notifications-page-container">
      <!-- DESKTOP PUSH NOTIFICATION BANNER -->
      @if (notifService.isBrowserSupported() && !notifService.isPermissionGranted()) {
        <div class="push-permission-banner">
          <div class="banner-left">
            <span class="material-symbols-outlined banner-icon">notifications_active</span>
            <div class="banner-text">
              <strong>Bật thông báo đẩy trên máy tính (Desktop Push Notifications)</strong>
              <span>Nhận cảnh báo tức thì ở góc màn hình khi có việc mới được giao, bình luận hoặc sắp tới hạn chót.</span>
            </div>
          </div>
          <button type="button" class="btn-request-push tap-target" (click)="enablePushNotifications()">
            <span class="material-symbols-outlined">add_alert</span>
            <span>Bật thông báo ngay</span>
          </button>
        </div>
      }

      <!-- HEADER -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <span class="material-symbols-outlined">notifications_active</span>
            <span>TRUNG TÂM THÔNG BÁO HỆ THỐNG</span>
          </div>
          <h1 class="page-title">Thông Báo & Nhắc Việc Tự Động</h1>
          <p class="page-subtitle">
            Cập nhật tức thì khi có việc mới được giao, sắp đến hạn, quá hạn hoặc có bình luận, phản hồi nghiệm thu.
          </p>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="btn-refresh tap-target"
            (click)="loadNotifications()"
            [disabled]="isLoading()"
            title="Làm mới danh sách"
          >
            <span class="material-symbols-outlined" [class.spin]="isLoading()">refresh</span>
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            class="btn-mark-all-read tap-target"
            (click)="markAllRead()"
            [disabled]="unreadCount() === 0 || isMarkingAll()"
            title="Đánh dấu tất cả thông báo là đã đọc"
          >
            <span class="material-symbols-outlined">done_all</span>
            <span>Đã đọc tất cả</span>
          </button>
        </div>
      </header>

      <!-- SEARCH & FILTER TOOLBAR -->
      <div class="notifications-toolbar">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            class="search-input"
            placeholder="Tìm theo tiêu đề, nội dung hoặc mã công việc..."
            [(ngModel)]="searchKeyword"
            (ngModelChange)="onSearchChange()"
          />
          @if (searchKeyword) {
            <button type="button" class="clear-search-btn" (click)="searchKeyword = ''; onSearchChange()">
              <span class="material-symbols-outlined">close</span>
            </button>
          }
        </div>

        <!-- FILTER TABS & CHIPS -->
        <div class="filter-tabs-bar">
          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedTab() === 'ALL'"
            (click)="setTab('ALL')"
          >
            <span>Tất cả</span>
            <span class="tab-badge">{{ totalCount() }}</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedTab() === 'UNREAD'"
            (click)="setTab('UNREAD')"
          >
            <span>Chưa đọc</span>
            @if (unreadCount() > 0) {
              <span class="tab-badge unread-badge">{{ unreadCount() }}</span>
            }
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedTab() === 'GIAO_VIEC'"
            (click)="setTab('GIAO_VIEC')"
          >
            <span class="material-symbols-outlined tab-icon">assignment_ind</span>
            <span>Giao việc mới</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedTab() === 'NHAC_VIEC'"
            (click)="setTab('NHAC_VIEC')"
          >
            <span class="material-symbols-outlined tab-icon">alarm</span>
            <span>Hạn chót & Quá hạn</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedTab() === 'BO_SUNG_HOAN_THANH'"
            (click)="setTab('BO_SUNG_HOAN_THANH')"
          >
            <span class="material-symbols-outlined tab-icon">verified</span>
            <span>Nghiệm thu & Bổ sung</span>
          </button>
        </div>
      </div>

      <!-- NOTIFICATIONS LIST -->
      <section class="notifications-list-section">
        @if (isLoading()) {
          <div class="notif-cards-list">
            @for (item of [1, 2, 3, 4]; track item) {
              <div class="skeleton-card" style="flex-direction: row; align-items: center; gap: 14px;">
                <div class="skeleton-avatar" style="border-radius: 12px; width: 44px; height: 44px;"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: flex; justify-content: space-between;">
                    <div class="skeleton-line w-50 h-20"></div>
                    <div class="skeleton-line w-30"></div>
                  </div>
                  <div class="skeleton-line w-90"></div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredNotifications().length === 0) {
          <div class="friendly-empty-state">
            <svg class="empty-svg-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" fill="#EEF4FC" />
              <path d="M60 36C52.268 36 46 42.268 46 50V62L40 68V72H80V68L74 62V50C74 42.268 67.732 36 60 36Z" fill="#1F3864" />
              <path d="M54 76C54 79.3137 56.6863 82 60 82C63.3137 82 66 79.3137 66 76H54Z" fill="#1F3864" />
              <circle cx="78" cy="42" r="6" fill="#2E7D32" stroke="#FFFFFF" stroke-width="2" />
            </svg>
            <h3 class="empty-state-title">
              {{ searchKeyword ? 'Không tìm thấy thông báo phù hợp!' : selectedTab() === 'UNREAD' ? 'Không có thông báo chưa đọc!' : authService.isSystemAdmin() ? 'Chưa có thông báo hệ thống nào' : 'Chưa có thông báo nào' }}
            </h3>
            <p class="empty-state-desc">
              {{ searchKeyword ? 'Thử tìm với từ khóa khác hoặc xóa bộ lọc tìm kiếm.' : selectedTab() === 'UNREAD' ? 'Tuyệt vời! Bạn đã đọc hết tất cả thông báo.' : authService.isSystemAdmin() ? 'Hệ thống nền tảng hoạt động bình thường, không có cảnh báo hoặc cập nhật cần xử lý.' : 'Các thông báo giao việc mới, nhắc hạn và kết quả duyệt sẽ xuất hiện tại đây.' }}
            </p>
          </div>
        } @else {
          <div class="notif-cards-list">
            @for (notif of pagedNotifications(); track notif.id) {
              <div
                class="notif-card tap-target"
                [class.is-unread]="!notif.isRead"
                (click)="onNotificationClick(notif)"
              >
                <!-- TYPE ICON -->
                <div class="notif-icon-circle" [ngClass]="getNotifTypeClass(notif.type)">
                  <span class="material-symbols-outlined">{{ getNotifIcon(notif.type) }}</span>
                </div>

                <!-- CONTENT -->
                <div class="notif-content">
                  <div class="notif-top-row">
                    <h4 class="notif-title">{{ notif.title }}</h4>
                    <span class="notif-time">{{ formatTimeAgo(notif.createdAt) }}</span>
                  </div>

                  <p class="notif-desc">{{ notif.content }}</p>

                  <div class="notif-footer">
                    <span class="type-tag" [ngClass]="getNotifTypeClass(notif.type)">
                      {{ getNotifTypeLabel(notif.type) }}
                    </span>

                    <span class="nav-hint">
                      <span>Mở xem chi tiết</span>
                      <span class="material-symbols-outlined">arrow_forward</span>
                    </span>
                  </div>
                </div>

                <!-- UNREAD INDICATOR -->
                @if (!notif.isRead) {
                  <span class="unread-dot" title="Chưa đọc"></span>
                }
              </div>
            }
          </div>

          <!-- PAGINATION -->
          <app-pagination
            [totalItems]="filteredNotifications().length"
            [pageSize]="pageSize()"
            [currentPage]="currentPage()"
            [pageSizeOptions]="[10, 20, 50]"
            itemName="thông báo"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          ></app-pagination>
        }
      </section>
    </div>
  `,
  styles: [
    `
      .notifications-page-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-bottom: 32px;
      }

      /* PUSH PERMISSION BANNER */
      .push-permission-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 18px;
        background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
        border: 1.5px solid #93C5FD;
        border-radius: 12px;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08);

        .banner-left {
          display: flex;
          align-items: center;
          gap: 12px;

          .banner-icon {
            font-size: 28px;
            color: #2563EB;
            background: #FFFFFF;
            padding: 6px;
            border-radius: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }

          .banner-text {
            display: flex;
            flex-direction: column;
            gap: 2px;

            strong {
              font-size: 0.88rem;
              color: #1E3A8A;
            }

            span {
              font-size: 0.78rem;
              color: #3B82F6;
            }
          }
        }

        .btn-request-push {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #2563EB;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, transform 0.1s ease;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);

          &:hover {
            background: #1D4ED8;
            transform: translateY(-1px);
          }

          .material-symbols-outlined {
            font-size: 16px;
          }
        }
      }

      /* HEADER */
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;

        .header-left {
          .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: #EEF4FC;
            border-radius: 9999px;
            color: #1F3864;
            font-size: 0.75rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 6px;

            .material-symbols-outlined {
              font-size: 16px;
            }
          }

          .page-title {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 800;
            color: #1E293B;
          }

          .page-subtitle {
            margin: 4px 0 0 0;
            font-size: 0.88rem;
            color: #64748B;
          }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;

          .btn-refresh, .btn-mark-all-read {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: #FFFFFF;
            border: 1.5px solid #CBD5E1;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            color: #1F3864;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover:not(:disabled) {
              background: #F8FAFC;
              border-color: #1F3864;
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }

          .btn-mark-all-read {
            background: #EEF4FC;
            border-color: #BFDBFE;
            color: #1E40AF;

            &:hover:not(:disabled) {
              background: #DBEAFE;
              border-color: #93C5FD;
            }
          }
        }
      }

      /* TOOLBAR */
      .notifications-toolbar {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

        .search-box {
          position: relative;
          display: flex;
          align-items: center;

          .search-icon {
            position: absolute;
            left: 12px;
            font-size: 20px;
            color: #94A3B8;
            pointer-events: none;
          }

          .search-input {
            width: 100%;
            padding: 9px 36px 9px 38px;
            border: 1.5px solid #E2E8F0;
            border-radius: 8px;
            font-size: 0.85rem;
            font-family: inherit;
            color: #0F172A;
            background: #F8FAFC;
            transition: all 0.15s ease;

            &:focus {
              background: #FFFFFF;
              border-color: #3B82F6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
              outline: none;
            }
          }

          .clear-search-btn {
            position: absolute;
            right: 10px;
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 2px;
            display: flex;

            &:hover {
              color: #0F172A;
            }
          }
        }

        .filter-tabs-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;

          .tab-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: #F1F5F9;
            border: 1px solid transparent;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 700;
            color: #64748B;
            cursor: pointer;
            transition: all 0.15s ease;

            .tab-icon {
              font-size: 16px;
            }

            .tab-badge {
              padding: 1px 6px;
              border-radius: 9999px;
              background: #E2E8F0;
              font-size: 0.7rem;
              color: #475569;

              &.unread-badge {
                background: #DC2626;
                color: #FFFFFF;
              }
            }

            &:hover {
              background: #E2E8F0;
              color: #1E293B;
            }

            &.active {
              background: #EEF4FC;
              color: #1F3864;
              border-color: #BFDBFE;
            }
          }
        }
      }

      /* NOTIFICATIONS LIST */
      .notifications-list-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .notif-cards-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .notif-card {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        cursor: pointer;
        position: relative;
        transition: all 0.15s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

        &:hover {
          background: #F8FAFC;
          border-color: #BFDBFE;
          transform: translateY(-1px);
        }

        &.is-unread {
          background: #F0F7FF;
          border-color: #BFDBFE;

          .notif-title {
            font-weight: 800;
            color: #1F3864;
          }
        }

        .notif-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .material-symbols-outlined {
            font-size: 22px;
          }

          &.type-assign { background: #DBEAFE; color: #1E40AF; }
          &.type-due { background: #FEF3C7; color: #D97706; }
          &.type-overdue { background: #FEE2E2; color: #DC2626; }
          &.type-revise { background: #FFEDD5; color: #EA580C; }
          &.type-approved { background: #DCFCE7; color: #16A34A; }
          &.type-general { background: #F1F5F9; color: #475569; }
        }

        .notif-content {
          flex: 1;
          min-width: 0;

          .notif-top-row {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 4px;

            .notif-title {
              margin: 0;
              font-size: 0.95rem;
              font-weight: 700;
              color: #1E293B;
            }

            .notif-time {
              font-size: 0.75rem;
              color: #94A3B8;
              white-space: nowrap;
            }
          }

          .notif-desc {
            margin: 0 0 10px 0;
            font-size: 0.85rem;
            color: #475569;
            line-height: 1.5;
          }

          .notif-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;

            .type-tag {
              font-size: 0.72rem;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 6px;

              &.type-assign { background: #EEF4FC; color: #1F3864; }
              &.type-due { background: #FEF3C7; color: #92400E; }
              &.type-overdue { background: #FEE2E2; color: #991B1B; }
              &.type-revise { background: #FFEDD5; color: #9A3412; }
              &.type-approved { background: #DCFCE7; color: #166534; }
              &.type-general { background: #F1F5F9; color: #475569; }
            }

            .nav-hint {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 0.78rem;
              font-weight: 700;
              color: #1F3864;

              .material-symbols-outlined {
                font-size: 14px;
              }
            }
          }
        }

        .unread-dot {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2E5EAA;
        }
      }

      .friendly-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 16px;
        background: #FFFFFF;
        border-radius: 14px;
        border: 1px dashed #CBD5E1;
        text-align: center;
        color: #64748B;

        .empty-svg-illustration {
          width: 72px;
          height: 72px;
          margin-bottom: 12px;
        }

        .empty-state-title {
          margin: 0;
          font-size: 1.1rem;
          color: #1E293B;
          font-weight: 700;
        }

        .empty-state-desc {
          margin: 6px 0 0 0;
          font-size: 0.85rem;
          max-width: 420px;
        }
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifService = inject(NotificationService);
  authService = inject(AuthService);
  private router = inject(Router);
  private accountSub?: Subscription;

  isLoading = signal(false);
  selectedTab = signal<string>('ALL');
  searchKeyword = '';
  isMarkingAll = signal(false);

  notificationsList = signal<NotificationItem[]>([]);
  totalCount = signal(0);
  unreadCount = signal(0);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  filteredNotifications = computed(() => {
    const list = this.notificationsList();
    const tab = this.selectedTab();
    const query = this.searchKeyword.trim().toLowerCase();

    return list.filter((item) => {
      // 1. Tab filter
      if (tab === 'UNREAD' && item.isRead) return false;
      if (tab === 'GIAO_VIEC' && item.type !== 'GIAO_VIEC' && item.type !== 'TASK_ASSIGNED') return false;
      if (tab === 'NHAC_VIEC' && item.type !== 'NHAC_VIEC' && item.type !== 'HET_HAN' && item.type !== 'TASK_DUE_SOON' && item.type !== 'TASK_OVERDUE') return false;
      if (tab === 'BO_SUNG_HOAN_THANH' && item.type !== 'CAN_BO_SUNG' && item.type !== 'DA_HOAN_THANH' && item.type !== 'TASK_REJECTED' && item.type !== 'TASK_APPROVED') return false;

      // 2. Keyword search
      if (query) {
        const title = (item.title || '').toLowerCase();
        const content = (item.content || '').toLowerCase();
        const code = (item.taskCode || '').toLowerCase();
        if (!title.includes(query) && !content.includes(query) && !code.includes(query)) {
          return false;
        }
      }

      return true;
    });
  });

  pagedNotifications = computed(() => {
    const list = this.filteredNotifications();
    const page = this.currentPage();
    const size = this.pageSize();
    return list.slice((page - 1) * size, page * size);
  });

  ngOnInit() {
    this.loadNotifications();
    this.accountSub = this.authService.accountSwitched$.subscribe(() => {
      this.loadNotifications();
    });
  }

  ngOnDestroy() {
    this.accountSub?.unsubscribe();
  }

  loadNotifications() {
    this.isLoading.set(true);
    if (this.authService.isSystemAdmin()) {
      this.notificationsList.set([]);
      this.totalCount.set(0);
      this.unreadCount.set(0);
    }
    this.notifService
      .getNotifications({ pageSize: 100 })
      .subscribe({
        next: (res) => {
          this.notificationsList.set(res.items || []);
          this.totalCount.set(res.total || 0);
          this.unreadCount.set(res.unreadCount || 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  onSearchChange() {
    this.currentPage.set(1);
  }

  setTab(tab: string) {
    this.selectedTab.set(tab);
    this.currentPage.set(1);
  }

  enablePushNotifications() {
    this.notifService.requestBrowserPermission();
  }

  markAllRead() {
    this.isMarkingAll.set(true);
    this.notifService.markAllAsRead().subscribe({
      next: () => {
        this.isMarkingAll.set(false);
        this.unreadCount.set(0);
        this.notificationsList.update((list) => list.map((n) => ({ ...n, isRead: true })));
      },
      error: () => {
        this.isMarkingAll.set(false);
      },
    });
  }

  onNotificationClick(notif: NotificationItem) {
    if (!notif.isRead) {
      this.notifService.markAsRead(notif.id).subscribe();
    }

    if (notif.link) {
      if (notif.link.includes('/tasks/')) {
        const taskId = notif.link.split('/tasks/')[1]?.split('?')[0];
        if (taskId) {
          this.router.navigate(['/tasks'], { queryParams: { taskId } });
          return;
        }
      }
      this.router.navigateByUrl(notif.link);
      return;
    }

    if (notif.taskId) {
      this.router.navigate(['/tasks'], { queryParams: { taskId: notif.taskId } });
    } else if (notif.planId) {
      this.router.navigate(['/plans'], { queryParams: { planId: notif.planId } });
    }
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  getNotifTypeClass(type: NotificationType): string {
    switch (type) {
      case 'GIAO_VIEC':
      case 'TASK_ASSIGNED':
        return 'type-assign';
      case 'NHAC_VIEC':
      case 'TASK_DUE_SOON':
        return 'type-due';
      case 'HET_HAN':
      case 'TASK_OVERDUE':
        return 'type-overdue';
      case 'CAN_BO_SUNG':
      case 'TASK_REJECTED':
        return 'type-revise';
      case 'DA_HOAN_THANH':
      case 'TASK_APPROVED':
        return 'type-approved';
      default:
        return 'type-general';
    }
  }

  getNotifIcon(type: NotificationType): string {
    switch (type) {
      case 'GIAO_VIEC':
      case 'TASK_ASSIGNED':
        return 'assignment_ind';
      case 'NHAC_VIEC':
      case 'TASK_DUE_SOON':
        return 'alarm';
      case 'HET_HAN':
      case 'TASK_OVERDUE':
        return 'warning';
      case 'CAN_BO_SUNG':
      case 'TASK_REJECTED':
        return 'replay';
      case 'DA_HOAN_THANH':
      case 'TASK_APPROVED':
        return 'check_circle';
      default:
        return 'notifications';
    }
  }

  getNotifTypeLabel(type: NotificationType): string {
    switch (type) {
      case 'GIAO_VIEC':
      case 'TASK_ASSIGNED':
        return 'Giao việc mới';
      case 'NHAC_VIEC':
      case 'TASK_DUE_SOON':
        return 'Sắp tới hạn';
      case 'HET_HAN':
      case 'TASK_OVERDUE':
        return 'Quá hạn hoàn thành';
      case 'CAN_BO_SUNG':
      case 'TASK_REJECTED':
        return 'Yêu cầu bổ sung';
      case 'DA_HOAN_THANH':
      case 'TASK_APPROVED':
        return 'Phê duyệt hoàn thành';
      default:
        return 'Thông báo hệ thống';
    }
  }

  formatTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }
}

