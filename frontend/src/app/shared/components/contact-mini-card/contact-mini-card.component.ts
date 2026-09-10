import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { UserPickerItem } from '../../../core/models/user.models';

@Component({
  selector: 'app-contact-mini-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="contact-backdrop" (click)="close()">
        <div class="contact-card-container" (click)="$event.stopPropagation()">
          <!-- DRAG HANDLE FOR MOBILE BOTTOM-SHEET -->
          <div class="mobile-drag-handle hide-on-desktop"></div>

          <!-- TOP HEADER WITH CLOSE BUTTON -->
          <div class="card-header">
            <span class="card-type-label">
              <span class="material-symbols-outlined label-icon">contact_page</span>
              <span>Thông tin liên hệ nhân sự</span>
            </span>
            <button type="button" class="close-btn" (click)="close()" title="Đóng">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- LOADING STATE -->
          @if (isLoading()) {
            <div class="card-loading">
              <span class="material-symbols-outlined spin">progress_activity</span>
              <span>Đang tải thông tin liên hệ...</span>
            </div>
          } @else if (userData(); as u) {
            <!-- USER PROFILE INFO -->
            <div class="card-body">
              <div class="profile-hero">
                <div class="avatar-box">
                  <img
                    [src]="u.avatarUrl || 'https://ui-avatars.com/api/?name=' + u.fullName + '&background=1F3864&color=fff'"
                    [alt]="u.fullName"
                    class="hero-avatar"
                  />
                  <span
                    class="workload-status-dot"
                    [ngClass]="getWorkloadClass(u.currentTaskLoad)"
                    [title]="getWorkloadTitle(u.currentTaskLoad)"
                  ></span>
                </div>

                <div class="hero-details">
                  <h3 class="hero-name">{{ u.fullName }}</h3>
                  <p class="hero-title">{{ u.title || 'Cán bộ giáo viên' }}</p>
                  <div class="hero-tags">
                    @if (u.primaryOrgUnit) {
                      <span class="tag-org">
                        <span class="material-symbols-outlined">groups</span>
                        {{ u.primaryOrgUnit.name }}
                      </span>
                    }
                    @if (u.primaryLocation) {
                      <span class="tag-loc">
                        <span class="material-symbols-outlined">location_on</span>
                        {{ u.primaryLocation.name }}
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- WORKLOAD SUMMARY BAR -->
              <div class="workload-banner" [ngClass]="getWorkloadClass(u.currentTaskLoad)">
                <div class="workload-left">
                  <span class="material-symbols-outlined">pending_actions</span>
                  <span>Tải công việc hiện tại:</span>
                </div>
                <strong class="workload-count">
                  {{ u.currentTaskLoad }} việc ({{ getWorkloadLabel(u.currentTaskLoad) }})
                </strong>
              </div>

              <!-- DETAILED CONTACT ROWS -->
              <div class="contact-details-list">
                <div class="detail-row">
                  <span class="material-symbols-outlined row-icon">phone</span>
                  <div class="row-content">
                    <span class="row-label">Số điện thoại</span>
                    <strong class="row-value">{{ u.phone || 'Chưa cập nhật' }}</strong>
                  </div>
                </div>

                <div class="detail-row">
                  <span class="material-symbols-outlined row-icon">mail</span>
                  <div class="row-content">
                    <span class="row-label">Email công vụ</span>
                    <span class="row-value">{{ u.email || 'Chưa cập nhật' }}</span>
                  </div>
                </div>

                @if (u.primaryLocation) {
                  <div class="detail-row">
                    <span class="material-symbols-outlined row-icon">domain</span>
                    <div class="row-content">
                      <span class="row-label">Điểm trường công tác</span>
                      <span class="row-value">{{ u.primaryLocation.name }}</span>
                    </div>
                  </div>
                }
              </div>

              <!-- PROMINENT CALL & ZALO ACTION BUTTONS -->
              <div class="action-buttons-group">
                <!-- PRIMARY CLICK-TO-CALL BUTTON -->
                <a
                  [href]="'tel:' + (u.phone || '')"
                  class="btn-action btn-call tap-target"
                  [class.disabled]="!u.phone"
                >
                  <span class="material-symbols-outlined action-icon">call</span>
                  <div class="btn-texts">
                    <span class="btn-main-text">GỌI ĐIỆN THOẠI NGAY</span>
                    <span class="btn-sub-text">{{ u.phone || 'Không có số' }}</span>
                  </div>
                </a>

                <!-- SECONDARY ZALO BUTTON -->
                <a
                  [href]="'https://zalo.me/' + (u.phone || '')"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn-action btn-zalo tap-target"
                  [class.disabled]="!u.phone"
                >
                  <span class="zalo-icon-box">Zalo</span>
                  <div class="btn-texts">
                    <span class="btn-main-text">Nhắn tin Zalo</span>
                    <span class="btn-sub-text">Mở ứng dụng Zalo</span>
                  </div>
                </a>
              </div>
            </div>
          } @else {
            <div class="card-error">
              <span class="material-symbols-outlined error-icon">person_off</span>
              <p>Không tìm thấy dữ liệu nhân sự.</p>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .contact-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(3px);
        z-index: 2500;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: fadeIn 0.15s ease-out;

        @media (max-width: 768px) {
          padding: 0;
          align-items: flex-end;
        }
      }

      .contact-card-container {
        width: 100%;
        max-width: 440px;
        background: #FFFFFF;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        position: relative;
        animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);

        @media (max-width: 768px) {
          max-width: 100%;
          border-radius: 24px 24px 0 0;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      }

      .mobile-drag-handle {
        width: 40px;
        height: 4px;
        border-radius: 9999px;
        background: #CBD5E1;
        margin: 10px auto 4px;
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px 10px;
        border-bottom: 1px solid #F1F5F9;

        .card-type-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #1F3864;
          text-transform: uppercase;
          letter-spacing: 0.5px;

          .label-icon {
            font-size: 18px;
            color: #1F3864;
          }
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #F1F5F9;
          border: none;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #E2E8F0;
            color: #0F172A;
          }

          .material-symbols-outlined {
            font-size: 18px;
          }
        }
      }

      .card-loading,
      .card-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        gap: 10px;
        color: #64748B;
        font-size: 0.9rem;

        .spin {
          font-size: 32px;
          color: #1F3864;
          animation: spin 1s linear infinite;
        }

        .error-icon {
          font-size: 40px;
          color: #EF4444;
        }
      }

      .card-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* HERO PROFILE */
      .profile-hero {
        display: flex;
        align-items: center;
        gap: 16px;

        .avatar-box {
          position: relative;
          flex-shrink: 0;

          .hero-avatar {
            width: 68px;
            height: 68px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #EEF4FC;
            box-shadow: 0 4px 12px rgba(31, 56, 100, 0.15);
          }

          .workload-status-dot {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2.5px solid #FFFFFF;

            &.workload-light { background: #2E7D32; }
            &.workload-medium { background: #F0A500; }
            &.workload-heavy { background: #C62828; }
          }
        }

        .hero-details {
          flex: 1;
          overflow: hidden;

          .hero-name {
            font-size: 1.2rem;
            font-weight: 800;
            color: #1E293B;
            line-height: 1.3;
            margin-bottom: 2px;
          }

          .hero-title {
            font-size: 0.86rem;
            color: #64748B;
            font-weight: 500;
            margin-bottom: 6px;
          }

          .hero-tags {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;

            .tag-org,
            .tag-loc {
              display: inline-flex;
              align-items: center;
              gap: 3px;
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 0.72rem;
              font-weight: 600;

              .material-symbols-outlined {
                font-size: 13px;
              }
            }

            .tag-org {
              background: #EEF4FC;
              color: #1F3864;
            }

            .tag-loc {
              background: #F0FDF4;
              color: #166534;
              border: 1px solid #BBF7D0;
            }
          }
        }
      }

      /* WORKLOAD BANNER */
      .workload-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-radius: 10px;
        font-size: 0.8rem;

        .workload-left {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;

          .material-symbols-outlined {
            font-size: 17px;
          }
        }

        .workload-count {
          font-weight: 700;
        }

        &.workload-light {
          background: #DCFCE7;
          color: #166534;
        }

        &.workload-medium {
          background: #FEF3C7;
          color: #92400E;
        }

        &.workload-heavy {
          background: #FEE2E2;
          color: #991B1B;
        }
      }

      /* DETAIL ROWS */
      .contact-details-list {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 6px 12px;
        display: flex;
        flex-direction: column;

        .detail-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #F1F5F9;

          &:last-child {
            border-bottom: none;
          }

          .row-icon {
            font-size: 20px;
            color: #64748B;
          }

          .row-content {
            display: flex;
            flex-direction: column;

            .row-label {
              font-size: 0.7rem;
              color: #94A3B8;
              font-weight: 500;
            }

            .row-value {
              font-size: 0.88rem;
              color: #1E293B;
              font-weight: 600;
            }
          }
        }
      }

      /* ACTION BUTTONS */
      .action-buttons-group {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 4px;

        .btn-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          text-decoration: none;
          min-height: 52px;
          transition: all 0.2s ease;
          cursor: pointer;

          &.disabled {
            opacity: 0.5;
            pointer-events: none;
          }

          .btn-texts {
            display: flex;
            flex-direction: column;
            text-align: left;

            .btn-main-text {
              font-size: 0.92rem;
              font-weight: 800;
              letter-spacing: 0.3px;
              line-height: 1.2;
            }

            .btn-sub-text {
              font-size: 0.74rem;
              opacity: 0.85;
            }
          }

          &.btn-call {
            background: #2E7D32;
            color: #FFFFFF;
            box-shadow: 0 4px 14px rgba(46, 125, 50, 0.35);

            &:hover {
              background: #256628;
              transform: translateY(-1px);
              box-shadow: 0 6px 18px rgba(46, 125, 50, 0.45);
            }

            .action-icon {
              font-size: 26px;
            }
          }

          &.btn-zalo {
            background: #0068FF;
            color: #FFFFFF;
            box-shadow: 0 4px 14px rgba(0, 104, 255, 0.25);

            &:hover {
              background: #0056D2;
              transform: translateY(-1px);
            }

            .zalo-icon-box {
              font-weight: 900;
              font-size: 0.95rem;
              background: #FFFFFF;
              color: #0068FF;
              padding: 2px 6px;
              border-radius: 6px;
              letter-spacing: -0.5px;
            }
          }
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes scaleUp {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class ContactMiniCardComponent implements OnInit, OnChanges {
  private userService = inject(UserService);

  @Input() userId?: string;
  @Input() user?: UserPickerItem | null;
  @Input() set visible(val: boolean) {
    this.isOpen.set(val);
    if (val && this.userId && !this.userData()) {
      this.loadUser(this.userId);
    }
  }

  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false);
  isLoading = signal(false);
  userData = signal<UserPickerItem | null>(null);

  ngOnInit() {
    if (this.user) {
      this.userData.set(this.user);
      if (!this.user.phone && (this.user.id || this.userId)) {
        this.loadUser(this.user.id || this.userId!);
      }
    } else if (this.userId) {
      this.loadUser(this.userId);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['user'] && this.user) {
      this.userData.set(this.user);
      if (!this.user.phone && (this.user.id || this.userId)) {
        this.loadUser(this.user.id || this.userId!);
      }
    } else if (changes['userId'] && this.userId) {
      this.loadUser(this.userId);
    }
  }

  open(userOrId: UserPickerItem | string) {
    if (typeof userOrId === 'string') {
      this.userId = userOrId;
      this.loadUser(userOrId);
    } else {
      this.userData.set(userOrId);
      if (!userOrId.phone && userOrId.id) {
        this.loadUser(userOrId.id);
      }
    }
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.userData.set(null);
    this.closed.emit();
  }

  private loadUser(id: string) {
    this.isLoading.set(true);
    this.userService.getUserById(id).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        if (data) {
          const current = this.userData();
          this.userData.set({
            ...(current || {}),
            ...data,
          } as UserPickerItem);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  getWorkloadClass(count = 0): string {
    if (count <= 2) return 'workload-light';
    if (count <= 5) return 'workload-medium';
    return 'workload-heavy';
  }

  getWorkloadLabel(count = 0): string {
    if (count <= 2) return 'Tải nhẹ';
    if (count <= 5) return 'Tải vừa';
    return 'Tải cao / Bận';
  }

  getWorkloadTitle(count = 0): string {
    if (count <= 2) return `Đang xử lý ${count} việc (Tải nhẹ)`;
    if (count <= 5) return `Đang xử lý ${count} việc (Tải vừa)`;
    return `Đang xử lý ${count} việc (Tải cao / Bận)`;
  }
}
