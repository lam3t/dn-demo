import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationItem, NotificationType } from '../../core/models/notification.models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  template: `
    <div class="notifications-page-container">
      <!-- HEADER -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <span class="material-symbols-outlined">notifications_active</span>
            <span>TRUNG TÂM THÔNG BÁO</span>
          </div>
          <h1 class="page-title">Thông Báo & Nhắc Việc Tự Động</h1>
          <p class="page-subtitle">
            Cập nhật tức thì khi có việc mới được giao, sắp đến hạn, quá hạn hoặc có phản hồi nghiệm thu.
          </p>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="btn-mark-all-read tap-target"
            (click)="markAllRead()"
            [disabled]="unreadCount() === 0 || isMarkingAll()"
          >
            <span class="material-symbols-outlined">done_all</span>
            <span>Đánh dấu tất cả đã đọc</span>
          </button>
        </div>
      </header>

      <!-- FILTER TABS & STATS -->
      <div class="filter-tabs-bar">
        <button
          type="button"
          class="tab-btn"
          [class.active]="filterUnreadOnly() === false"
          (click)="setFilter(false)"
        >
          <span>Tất cả thông báo</span>
          <span class="tab-badge">{{ totalCount() }}</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="filterUnreadOnly() === true"
          (click)="setFilter(true)"
        >
          <span>Chưa đọc</span>
          @if (unreadCount() > 0) {
            <span class="tab-badge unread-badge">{{ unreadCount() }}</span>
          }
        </button>
      </div>

      <!-- NOTIFICATIONS LIST -->
      <section class="notifications-list-section">
        @if (isLoading()) {
          <div class="notif-cards-list">
            @for (item of [1, 2, 3, 4]; track item) {
              <div class="skeleton-card" style="flex-direction: row; align-items: center; gap: 14px;">
                <div class="skeleton-avatar" style="border-radius: 12px; width: 42px; height: 42px;"></div>
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
        } @else if (notificationsList().length === 0) {
          <div class="friendly-empty-state">
            <svg class="empty-svg-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" fill="#EEF4FC" />
              <path d="M60 36C52.268 36 46 42.268 46 50V62L40 68V72H80V68L74 62V50C74 42.268 67.732 36 60 36Z" fill="#1F3864" />
              <path d="M54 76C54 79.3137 56.6863 82 60 82C63.3137 82 66 79.3137 66 76H54Z" fill="#1F3864" />
              <circle cx="78" cy="42" r="6" fill="#2E7D32" stroke="#FFFFFF" stroke-width="2" />
            </svg>
            <h3 class="empty-state-title">{{ filterUnreadOnly() ? 'Không có thông báo chưa đọc!' : 'Chưa có thông báo nào' }}</h3>
            <p class="empty-state-desc">
              {{ filterUnreadOnly() ? 'Tuyệt vời! Thầy/cô đã đọc hết tất cả thông báo và nhắc việc.' : 'Các thông báo giao việc mới, nhắc hạn và kết quả duyệt sẽ xuất hiện tại đây.' }}
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

                    @if (notif.taskId) {
                      <span class="nav-hint">
                        <span>Bấm để xem công việc</span>
                        <span class="material-symbols-outlined">arrow_forward</span>
                      </span>
                    }
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
            [totalItems]="notificationsList().length"
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
        gap: 18px;
        padding-bottom: 32px;
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
            font-size: 0.9rem;
            color: #64748B;
          }
        }

        .header-actions {
          .btn-mark-all-read {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 9px 16px;
            background: #FFFFFF;
            border: 1.5px solid #CBD5E1;
            border-radius: 10px;
            font-size: 0.88rem;
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
        }
      }

      /* FILTER TABS */
      .filter-tabs-bar {
        display: flex;
        gap: 8px;
        border-bottom: 2px solid #E2E8F0;
        padding-bottom: 2px;

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: transparent;
          border: none;
          border-radius: 8px 8px 0 0;
          font-size: 0.9rem;
          font-weight: 700;
          color: #64748B;
          cursor: pointer;
          position: relative;
          transition: all 0.15s ease;

          .tab-badge {
            padding: 1px 7px;
            border-radius: 9999px;
            background: #F1F5F9;
            font-size: 0.75rem;
            color: #475569;

            &.unread-badge {
              background: #DC2626;
              color: #FFFFFF;
            }
          }

          &:hover {
            color: #1F3864;
            background: #F8FAFC;
          }

          &.active {
            color: #1F3864;
            background: #FFFFFF;

            &::after {
              content: '';
              position: absolute;
              bottom: -2px;
              left: 0;
              right: 0;
              height: 3px;
              background: #1F3864;
              border-radius: 3px 3px 0 0;
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
        border-radius: 14px;
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
          width: 42px;
          height: 42px;
          border-radius: 12px;
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

      .loading-state,
      .empty-notif-box {
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
      }

      .empty-notif-box {
        .empty-icon {
          font-size: 48px;
          color: #CBD5E1;
          margin-bottom: 8px;
        }

        h3 { margin: 0; font-size: 1.1rem; color: #1E293B; }
        p { margin: 4px 0 0 0; font-size: 0.88rem; }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class NotificationsComponent implements OnInit {
  private notifService = inject(NotificationService);
  private router = inject(Router);

  isLoading = signal(false);
  filterUnreadOnly = signal(false);
  isMarkingAll = signal(false);

  notificationsList = signal<NotificationItem[]>([]);
  totalCount = signal(0);
  unreadCount = signal(0);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  pagedNotifications = computed(() => {
    const list = this.notificationsList();
    const page = this.currentPage();
    const size = this.pageSize();
    return list.slice((page - 1) * size, page * size);
  });

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading.set(true);
    this.currentPage.set(1);
    this.notifService
      .getNotifications({ unreadOnly: this.filterUnreadOnly() ? true : undefined, pageSize: 50 })
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

  setFilter(unreadOnly: boolean) {
    this.filterUnreadOnly.set(unreadOnly);
    this.currentPage.set(1);
    this.loadNotifications();
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
      this.router.navigate(['/plans']);
    }
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
