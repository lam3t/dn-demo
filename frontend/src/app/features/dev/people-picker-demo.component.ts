import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PeoplePickerComponent } from '../../shared/components/people-picker/people-picker.component';
import { FileDropzoneComponent } from '../../shared/components/file-dropzone/file-dropzone.component';
import { ContactCardService } from '../../core/services/contact-card.service';
import { UserPickerItem } from '../../core/models/user.models';

@Component({
  selector: 'app-people-picker-demo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PeoplePickerComponent,
    FileDropzoneComponent,
  ],
  template: `
    <div class="demo-page-container">
      <!-- HEADER -->
      <div class="demo-header">
        <div class="header-left">
          <a routerLink="/dashboard" class="back-link">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Về Tổng quan</span>
          </a>
          <h1 class="page-title">Kiểm thử Bộ UI Components Dùng Chung</h1>
          <p class="page-subtitle">
            Môi trường kiểm tra và đo lường hiệu năng 3 components cốt lõi: <strong>People Picker</strong> (42+ nhân sự), <strong>Contact Mini-Card</strong> (Click-to-call, Zalo) và <strong>File Dropzone</strong> (Minh chứng kéo-thả, Camera).
          </p>
        </div>

        <!-- METRIC COUNTER BOX -->
        <div class="metric-box">
          <div class="metric-item">
            <span class="metric-label">Số lần gõ phím</span>
            <span class="metric-value">{{ keyStrokeCount() }}</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric-item">
            <span class="metric-label">Số lần bấm chuột</span>
            <span class="metric-value">{{ clickCount() }}</span>
          </div>
          <div class="metric-divider"></div>
          <div class="metric-item">
            <span class="metric-label">Thời gian chọn xong</span>
            <span class="metric-value text-green">{{ lastSelectionDuration() }}</span>
          </div>
          <button type="button" class="reset-metric-btn" (click)="resetMetrics()" title="Đặt lại bộ đếm">
            <span class="material-symbols-outlined">restart_alt</span>
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      <!-- UX HIGHLIGHT BANNER -->
      <div class="ux-banner">
        <div class="banner-icon">
          <span class="material-symbols-outlined">bolt</span>
        </div>
        <div class="banner-content">
          <h4>Điểm đột phá về tốc độ phân công & liên lạc:</h4>
          <p>
            Nhờ tính năng <strong>⚡ Gợi ý gần đây (Recent Collaborators)</strong>, người giao việc chỉ mất 
            <span class="badge-fast">1 lần bấm chuột (0 phím gõ)</span> để chọn đúng đầu mối thường xuyên phối hợp, 
            hoặc chỉ cần gõ <strong>2 ký tự không dấu</strong> (VD: <em>"an", "long", "dung"</em>) để tìm ngay trong 42 giáo viên. Bấm vào bất kỳ ai để mở <strong>Contact Mini-Card</strong> gọi điện thoại ngay lập tức!
          </p>
        </div>
      </div>

      <!-- SECTION 1: PEOPLE PICKER DEMOS -->
      <div class="demo-grid">
        <!-- TEST 1: SINGLE SELECTION (CHỌN 1 NGƯỜI CHỦ TRÌ) -->
        <div class="demo-card" (click)="recordClick()" (keydown)="recordKeyStroke()">
          <div class="card-header">
            <div class="badge single-badge">Chế độ SINGLE</div>
            <h2 class="card-title">1. Chọn Người Chủ trì (Single Picker)</h2>
            <p class="card-desc">Bắt buộc đúng 1 người chịu trách nhiệm chính theo quy tắc RACI.</p>
          </div>

          <div class="card-body">
            <app-people-picker
              mode="single"
              label="Người chủ trì công việc"
              [required]="true"
              placeholder="Gõ tên, chức vụ hoặc SĐT người chủ trì..."
              [(ngModel)]="singleSelectedId"
              (selectedUsersChange)="onSingleUsersChange($event)"
              (userSelected)="onUserSelected('single', $event)"
            ></app-people-picker>

            <!-- SELECTED USER CARD PREVIEW -->
            @if (singleSelectedUser(); as user) {
              <div class="selected-detail-card" (click)="openContactCard(user)">
                <div class="detail-avatar-box">
                  <img [src]="user.avatarUrl" [alt]="user.fullName" class="detail-avatar" />
                  <span class="detail-workload-dot" [ngClass]="getWorkloadClass(user.currentTaskLoad)"></span>
                </div>
                <div class="detail-info">
                  <div class="name-line">
                    <h3 class="user-fullname">{{ user.fullName }}</h3>
                    <span class="detail-workload-tag" [ngClass]="getWorkloadClass(user.currentTaskLoad)">
                      {{ getWorkloadText(user.currentTaskLoad) }} ({{ user.currentTaskLoad }} việc)
                    </span>
                  </div>
                  <p class="user-title-line">
                    <span>{{ user.title || 'Cán bộ giáo viên' }}</span>
                    @if (user.primaryOrgUnit) {
                      <span> • {{ user.primaryOrgUnit.name }}</span>
                    }
                  </p>
                  <p class="user-location-line">
                    <span class="material-symbols-outlined">location_on</span>
                    <span>{{ user.primaryLocation?.name || 'Điểm chính (Trung tâm)' }}</span>
                  </p>
                </div>
                <div class="detail-actions">
                  <a
                    [href]="'tel:' + user.phone"
                    class="call-action-btn"
                    (click)="$event.stopPropagation()"
                    [title]="'Gọi cho ' + user.fullName"
                  >
                    <span class="material-symbols-outlined">call</span>
                    <span>{{ user.phone }}</span>
                  </a>
                </div>
              </div>
            } @else {
              <div class="empty-picker-hint">
                <span class="material-symbols-outlined">info</span>
                <span>Chưa chọn người chủ trì. Thử bấm vào ô phía trên để chọn từ danh sách gợi ý.</span>
              </div>
            }
          </div>
        </div>

        <!-- TEST 2: MULTI SELECTION (CHỌN NHIỀU NGƯỜI PHỐI HỢP) -->
        <div class="demo-card" (click)="recordClick()" (keydown)="recordKeyStroke()">
          <div class="card-header">
            <div class="badge multi-badge">Chế độ MULTI</div>
            <h2 class="card-title">2. Chọn Người Phối hợp / Kiểm tra (Multi Picker)</h2>
            <p class="card-desc">Có thể chọn nhiều cán bộ giáo viên từ nhiều điểm trường khác nhau.</p>
          </div>

          <div class="card-body">
            <app-people-picker
              mode="multi"
              label="Danh sách cán bộ phối hợp thực hiện"
              placeholder="Tìm và thêm nhiều giáo viên phối hợp..."
              [(ngModel)]="multiSelectedIds"
              (selectedUsersChange)="onMultiUsersChange($event)"
              (userSelected)="onUserSelected('multi', $event)"
            ></app-people-picker>

            <!-- MULTI SELECTED LIST -->
            @if (multiSelectedUsers().length > 0) {
              <div class="multi-selected-list">
                <div class="list-title-row">
                  <span class="count-text">Đã chọn {{ multiSelectedUsers().length }} nhân sự:</span>
                  <button type="button" class="btn-clear-list" (click)="clearMulti()">Xóa hết</button>
                </div>
                <div class="users-grid">
                  @for (user of multiSelectedUsers(); track user.id) {
                    <div class="user-mini-card" (click)="openContactCard(user)">
                      <img [src]="user.avatarUrl" [alt]="user.fullName" class="mini-avatar" />
                      <div class="mini-meta">
                        <span class="mini-name">{{ user.fullName }}</span>
                        <span class="mini-sub">{{ user.title || 'Giáo viên' }} • {{ user.primaryLocation?.name }}</span>
                      </div>
                      @if (user.phone) {
                        <a
                          [href]="'tel:' + user.phone"
                          class="mini-call-btn"
                          (click)="$event.stopPropagation()"
                          [title]="'Gọi điện: ' + user.phone"
                        >
                          <span class="material-symbols-outlined">call</span>
                          <span class="call-phone-text">{{ user.phone }}</span>
                        </a>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- SECTION 2: FILE DROPZONE COMPONENT TEST -->
      <div class="demo-card full-width-card">
        <div class="card-header">
          <div class="badge upload-badge">Tệp đính kèm & Minh chứng</div>
          <h2 class="card-title">3. Kiểm thử File Dropzone Component (Kéo - Thả & Camera)</h2>
          <p class="card-desc">
            Vùng kéo-thả trực quan trên Desktop & 2 nút lớn "📷 Chụp ảnh", "🖼️ Chọn tệp" trên Mobile, giới hạn 20MB.
          </p>
        </div>
        <div class="card-body">
          <app-file-dropzone
            label="Tải lên tệp minh chứng kết quả công việc"
            [autoUpload]="false"
            (filesSelected)="onFilesSelected($event)"
          ></app-file-dropzone>

          @if (uploadedFilesCount() > 0) {
            <div class="upload-result-banner">
              <span class="material-symbols-outlined text-green">check_circle</span>
              <span>Đã tiếp nhận <strong>{{ uploadedFilesCount() }}</strong> tệp minh chứng trong phiên thử nghiệm.</span>
            </div>
          }
        </div>
      </div>

      <!-- TEST PRESETS & BENCHMARK HELPERS -->
      <div class="benchmark-section">
        <h3 class="section-heading">
          <span class="material-symbols-outlined">speed</span>
          <span>Kịch bản kiểm tra tốc độ thao tác (1-Click Test Scenarios)</span>
        </h3>
        <div class="presets-row">
          <button type="button" class="preset-btn" (click)="runScenario('bgh')">
            <span class="material-symbols-outlined">stars</span>
            <span>Chọn Ban Giám hiệu (Hiệu trưởng + Phó HT)</span>
          </button>
          <button type="button" class="preset-btn" (click)="runScenario('toan')">
            <span class="material-symbols-outlined">calculate</span>
            <span>Chọn Tổ Toán - Tin học (6 GV)</span>
          </button>
          <button type="button" class="preset-btn" (click)="runScenario('ph1')">
            <span class="material-symbols-outlined">home_work</span>
            <span>Chọn tất cả GV Phân hiệu 1 (Tân Lập)</span>
          </button>
          <button type="button" class="preset-btn reset" (click)="resetAll()">
            <span class="material-symbols-outlined">clear_all</span>
            <span>Đặt lại toàn bộ</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .demo-page-container {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding-bottom: 40px;
      }

      .demo-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #1F3864;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 6px;

          &:hover {
            text-decoration: underline;
          }

          .material-symbols-outlined {
            font-size: 18px;
          }
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1F3864;
          margin-bottom: 4px;
        }

        .page-subtitle {
          font-size: 0.88rem;
          color: #64748B;
          max-width: 600px;
        }
      }

      .metric-box {
        background: #FFFFFF;
        border: 1px solid #CBD5E1;
        border-radius: 12px;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

        .metric-item {
          display: flex;
          flex-direction: column;
          align-items: center;

          .metric-label {
            font-size: 0.72rem;
            color: #64748B;
            font-weight: 600;
            text-transform: uppercase;
          }

          .metric-value {
            font-size: 1.25rem;
            font-weight: 800;
            color: #1E293B;

            &.text-green {
              color: #2E7D32;
            }
          }
        }

        .metric-divider {
          width: 1px;
          height: 32px;
          background: #E2E8F0;
        }

        .reset-metric-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #E2E8F0;
            color: #1E293B;
          }

          .material-symbols-outlined {
            font-size: 16px;
          }
        }
      }

      .ux-banner {
        display: flex;
        align-items: center;
        gap: 14px;
        background: linear-gradient(135deg, #EEF4FC 0%, #E0EDFD 100%);
        border: 1px solid #BFDBFE;
        border-radius: 12px;
        padding: 14px 18px;

        .banner-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #1F3864;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .material-symbols-outlined {
            font-size: 24px;
          }
        }

        .banner-content {
          h4 {
            font-size: 0.95rem;
            font-weight: 700;
            color: #1F3864;
            margin-bottom: 2px;
          }

          p {
            font-size: 0.85rem;
            color: #334155;
            line-height: 1.4;

            .badge-fast {
              background: #2E7D32;
              color: #FFFFFF;
              padding: 2px 6px;
              border-radius: 4px;
              font-weight: 700;
            }
          }
        }
      }

      .demo-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;

        @media (max-width: 900px) {
          grid-template-columns: 1fr;
        }
      }

      .demo-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        display: flex;
        flex-direction: column;
        gap: 16px;

        .card-header {
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.72rem;
            font-weight: 700;
            margin-bottom: 6px;

            &.single-badge {
              background: #E0E7FF;
              color: #3730A3;
            }

            &.multi-badge {
              background: #DCFCE7;
              color: #166534;
            }
          }

          .card-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: #1E293B;
            margin-bottom: 2px;
          }

          .card-desc {
            font-size: 0.82rem;
            color: #64748B;
          }
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
      }

      .selected-detail-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        border-radius: 12px;

        .detail-avatar-box {
          position: relative;

          .detail-avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .detail-workload-dot {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid #FFFFFF;

            &.workload-light { background: #2E7D32; }
            &.workload-medium { background: #F0A500; }
            &.workload-heavy { background: #C62828; }
          }
        }

        .detail-info {
          flex: 1;

          .name-line {
            display: flex;
            align-items: center;
            gap: 8px;

            .user-fullname {
              font-size: 1rem;
              font-weight: 700;
              color: #1E293B;
            }

            .detail-workload-tag {
              font-size: 0.72rem;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 9999px;

              &.workload-light { background: #DCFCE7; color: #166534; }
              &.workload-medium { background: #FEF3C7; color: #92400E; }
              &.workload-heavy { background: #FEE2E2; color: #991B1B; }
            }
          }

          .user-title-line {
            font-size: 0.82rem;
            color: #475569;
            margin-top: 2px;
          }

          .user-location-line {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.78rem;
            color: #1E40AF;
            font-weight: 500;
            margin-top: 2px;

            .material-symbols-outlined {
              font-size: 15px;
            }
          }
        }

        .detail-actions {
          .call-action-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: #1F3864;
            color: #FFFFFF;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.15s ease;

            &:hover {
              background: #152644;
              box-shadow: 0 4px 10px rgba(31, 56, 100, 0.25);
            }

            .material-symbols-outlined {
              font-size: 18px;
            }
          }
        }
      }

      .empty-picker-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: #F1F5F9;
        border-radius: 8px;
        color: #64748B;
        font-size: 0.82rem;

        .material-symbols-outlined {
          font-size: 18px;
          color: #94A3B8;
        }
      }

      .multi-selected-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 6px;

        .list-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .count-text {
            font-size: 0.82rem;
            font-weight: 700;
            color: #1E293B;
          }

          .btn-clear-list {
            background: transparent;
            border: none;
            color: #EF4444;
            font-size: 0.78rem;
            cursor: pointer;
            font-weight: 600;

            &:hover {
              text-decoration: underline;
            }
          }
        }

        .users-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;

          @media (max-width: 600px) {
            grid-template-columns: 1fr;
          }

          .user-mini-card {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;

            .mini-avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              object-fit: cover;
            }

            .mini-meta {
              flex: 1;
              overflow: hidden;
              display: flex;
              flex-direction: column;

              .mini-name {
                font-size: 0.82rem;
                font-weight: 600;
                color: #1E293B;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .mini-sub {
                font-size: 0.72rem;
                color: #64748B;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
            }

            .mini-call-btn {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 3px 8px;
              border-radius: 6px;
              background: #EEF4FC;
              border: 1px solid #BFDBFE;
              color: #1F3864;
              text-decoration: none;
              font-size: 0.74rem;
              font-weight: 600;
              white-space: nowrap;
              transition: all 0.15s ease;

              .material-symbols-outlined {
                font-size: 14px;
                color: #1F3864;
              }

              .call-phone-text {
                letter-spacing: 0.2px;
              }

              &:hover {
                background: #1F3864;
                border-color: #1F3864;
                color: #FFFFFF;
                .material-symbols-outlined { color: #FFFFFF; }
              }
            }
          }
        }
      }

      .benchmark-section {
        background: #FFFFFF;
        border: 1px solid #CBD5E1;
        border-radius: 12px;
        padding: 16px 20px;

        .section-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 700;
          color: #1F3864;
          margin-bottom: 12px;

          .material-symbols-outlined {
            font-size: 22px;
            color: #F0A500;
          }
        }

        .presets-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;

          .preset-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: #F8FAFC;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            color: #334155;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              background: #EEF4FC;
              border-color: #B4D1FA;
              color: #1F3864;
            }

            &.reset {
              color: #EF4444;
              &:hover {
                background: #FEE2E2;
                border-color: #FCA5A5;
              }
            }

            .material-symbols-outlined {
              font-size: 18px;
            }
          }
        }
      }

      .full-width-card {
        grid-column: 1 / -1;

        .upload-badge {
          background: #F3E8FF;
          color: #7E22CE;
        }

        .upload-result-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 10px;
          color: #166534;
          font-size: 0.85rem;
          margin-top: 10px;

          .material-symbols-outlined {
            font-size: 20px;
          }
        }
      }
    `,
  ],
})
export class PeoplePickerDemoComponent {
  private contactCardService = inject(ContactCardService);

  singleSelectedId = signal<string | null>(null);
  singleSelectedUser = signal<UserPickerItem | null>(null);

  multiSelectedIds = signal<string[]>([]);
  multiSelectedUsers = signal<UserPickerItem[]>([]);

  uploadedFilesCount = signal<number>(0);

  keyStrokeCount = signal(0);
  clickCount = signal(0);
  startTime = signal<number | null>(null);
  lastSelectionDuration = signal<string>('0.0s');

  recordClick() {
    this.clickCount.update((n) => n + 1);
    if (!this.startTime()) {
      this.startTime.set(Date.now());
    }
  }

  recordKeyStroke() {
    this.keyStrokeCount.update((n) => n + 1);
    if (!this.startTime()) {
      this.startTime.set(Date.now());
    }
  }

  onSingleUsersChange(users: UserPickerItem[]) {
    this.singleSelectedUser.set(users.length > 0 ? users[0] : null);
  }

  onMultiUsersChange(users: UserPickerItem[]) {
    this.multiSelectedUsers.set(users);
  }

  onUserSelected(mode: string, user: UserPickerItem) {
    if (this.startTime()) {
      const durationMs = Date.now() - this.startTime()!;
      this.lastSelectionDuration.set((durationMs / 1000).toFixed(1) + 's');
    }
  }

  openContactCard(user: UserPickerItem) {
    this.contactCardService.open(user);
  }

  onFilesSelected(files: File[]) {
    this.uploadedFilesCount.set(files.length);
  }

  clearMulti() {
    this.multiSelectedIds.set([]);
    this.multiSelectedUsers.set([]);
  }

  resetMetrics() {
    this.keyStrokeCount.set(0);
    this.clickCount.set(0);
    this.startTime.set(null);
    this.lastSelectionDuration.set('0.0s');
  }

  resetAll() {
    this.singleSelectedId.set(null);
    this.singleSelectedUser.set(null);
    this.multiSelectedIds.set([]);
    this.multiSelectedUsers.set([]);
    this.uploadedFilesCount.set(0);
    this.resetMetrics();
  }

  runScenario(type: 'bgh' | 'toan' | 'ph1') {
    this.resetMetrics();
    // Pre-select via demo logic
    if (type === 'bgh') {
      // Pick Nguyen Van An
      this.singleSelectedId.set('0903111222');
    }
  }

  getWorkloadClass(count: number): string {
    if (count <= 2) return 'workload-light';
    if (count <= 5) return 'workload-medium';
    return 'workload-heavy';
  }

  getWorkloadText(count: number): string {
    if (count <= 2) return 'Tải nhẹ';
    if (count <= 5) return 'Tải vừa';
    return 'Tải cao / Bận';
  }
}
