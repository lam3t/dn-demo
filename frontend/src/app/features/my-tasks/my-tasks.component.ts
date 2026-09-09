import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { ContactCardService } from '../../core/services/contact-card.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { StatusTabsCounterComponent, StatusTabItem } from '../../shared/components/status-tabs-counter/status-tabs-counter.component';
import { FileDropzoneComponent } from '../../shared/components/file-dropzone/file-dropzone.component';
import { TaskItem, TaskStatus, TaskPriority, TaskAssignmentRole } from '../../core/models/task.models';

type MyTaskGroupType = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'DUE_SOON' | 'OVERDUE' | 'WAITING_CONFIRM';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StatusBadgeComponent,
    FileDropzoneComponent,
  ],
  template: `
    <div class="my-tasks-page">
      <!-- ROLE-TAILORED BANNER -->
      @if (authService.currentUser(); as user) {
        <div class="my-role-banner" [ngClass]="getRoleBannerClass()">
          <div class="role-icon-box">
            <span class="material-symbols-outlined">{{ getRoleBannerIcon() }}</span>
          </div>
          <div class="role-content">
            <div class="role-badge-row">
              <span class="role-tag-pill">{{ authService.activeRole()?.roleTitle || user.title }}</span>
              <span class="scope-tag-pill">{{ authService.activeRole()?.scopeName }}</span>
            </div>
            <h2 class="role-heading">Nhiệm Vụ Cá Nhân & Trách Nhiệm Phân Công</h2>
            <p class="role-guidance">{{ getRoleGuidance() }}</p>
          </div>
          @if (waitingConfirmCount() > 0 && (authService.isToTruong() || authService.isBGH())) {
            <div class="alert-pending-badge tap-target" (click)="setGroup('WAITING_CONFIRM')">
              <span class="material-symbols-outlined pulse-icon">notifications_active</span>
              <span><strong>{{ waitingConfirmCount() }}</strong> việc đang chờ bạn nghiệm thu!</span>
            </div>
          }
        </div>
      }

      <!-- HEADER -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">Việc Của Tôi</h1>
          <p class="page-subtitle">
            Theo dõi nhiệm vụ được giao, cập nhật tiến độ & đính kèm minh chứng thực hiện
          </p>
        </div>

        <div class="header-right">
          <button
            type="button"
            class="refresh-btn tap-target"
            (click)="loadMyTasks()"
            [disabled]="isLoading()"
            title="Làm mới danh sách"
          >
            <span class="material-symbols-outlined" [class.spin]="isLoading()">refresh</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <!-- STATUS & GROUPING TABS -->
      <div class="tabs-container">
        <div class="custom-group-tabs">
          <button
            type="button"
            class="group-tab-btn tap-target"
            [class.active]="activeGroup() === 'ALL'"
            (click)="setGroup('ALL')"
          >
            <span>Tất cả</span>
            <span class="count-pill">{{ totalCount() }}</span>
          </button>

          <button
            type="button"
            class="group-tab-btn tap-target"
            [class.active]="activeGroup() === 'TODAY'"
            (click)="setGroup('TODAY')"
          >
            <span class="material-symbols-outlined tab-icon">today</span>
            <span>Hôm nay</span>
            <span class="count-pill count-blue">{{ todayCount() }}</span>
          </button>

          <button
            type="button"
            class="group-tab-btn tap-target"
            [class.active]="activeGroup() === 'THIS_WEEK'"
            (click)="setGroup('THIS_WEEK')"
          >
            <span class="material-symbols-outlined tab-icon">date_range</span>
            <span>Tuần này</span>
            <span class="count-pill">{{ thisWeekCount() }}</span>
          </button>

          <button
            type="button"
            class="group-tab-btn tap-target"
            [class.active]="activeGroup() === 'DUE_SOON'"
            (click)="setGroup('DUE_SOON')"
          >
            <span class="material-symbols-outlined tab-icon text-amber">hourglass_top</span>
            <span>Sắp hạn (3 ngày)</span>
            <span class="count-pill count-amber">{{ dueSoonCount() }}</span>
          </button>

          <button
            type="button"
            class="group-tab-btn tap-target"
            [class.active]="activeGroup() === 'OVERDUE'"
            (click)="setGroup('OVERDUE')"
          >
            <span class="material-symbols-outlined tab-icon text-red">error</span>
            <span>Quá hạn</span>
            <span class="count-pill count-red">{{ overdueCount() }}</span>
          </button>

          <button
            type="button"
            class="group-tab-btn tap-target"
            [class.active]="activeGroup() === 'WAITING_CONFIRM'"
            (click)="setGroup('WAITING_CONFIRM')"
          >
            <span class="material-symbols-outlined tab-icon text-purple">verified_user</span>
            <span>Chờ tôi xác nhận</span>
            <span class="count-pill count-purple">{{ waitingConfirmCount() }}</span>
          </button>
        </div>
      </div>

      <!-- SEARCH & PRIORITY FILTER BAR -->
      <div class="search-filter-bar">
        <div class="search-input-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            class="search-input tap-target"
            placeholder="Tìm theo tên công việc, mã việc..."
            [(ngModel)]="searchKeyword"
            (ngModelChange)="onSearchChange()"
          />
          @if (searchKeyword) {
            <button type="button" class="clear-search-btn" (click)="clearSearch()">
              <span class="material-symbols-outlined">cancel</span>
            </button>
          }
        </div>

        <div class="priority-filter-box">
          <select class="priority-select tap-target" [(ngModel)]="selectedPriority" (ngModelChange)="onFilterChange()">
            <option value="">Tất cả mức ưu tiên</option>
            <option value="KHAN_CAP">🔴 Khẩn cấp</option>
            <option value="CAO">🟠 Cao</option>
            <option value="TRUNG_BINH">🔵 Trung bình</option>
            <option value="THAP">⚪ Thấp</option>
          </select>
        </div>
      </div>

      <!-- MAIN TASKS LIST -->
      @if (isLoading() && allTasks().length === 0) {
        <div class="tasks-cards-grid">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="skeleton-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="skeleton-line w-30 h-20"></div>
                <div class="skeleton-line w-30 h-20"></div>
              </div>
              <div class="skeleton-line w-90 h-20"></div>
              <div class="skeleton-line w-50"></div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-line w-30 h-28"></div>
              </div>
            </div>
          }
        </div>
      } @else if (filteredTasks().length === 0) {
        <div class="friendly-empty-state">
          <svg class="empty-svg-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="#DCFCE7" />
            <path d="M42 62L54 74L78 48" stroke="#16A34A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="60" cy="60" r="46" stroke="#86EFAC" stroke-width="2" stroke-dasharray="4 4" />
          </svg>
          <h3 class="empty-state-title">Thảnh thơi! Chưa có việc nào ở mục này</h3>
          <p class="empty-state-desc">
            Thầy/cô đã hoàn thành tất cả nhiệm vụ hoặc chưa có công việc mới được phân công trong nhóm này.
          </p>
          <a routerLink="/tasks" [queryParams]="{ create: 'true' }" class="empty-state-action-btn tap-target" style="text-decoration: none;">
            <span class="material-symbols-outlined">add_task</span>
            <span>+ Tạo việc mới nếu cần</span>
          </a>
        </div>
      } @else {
        <div class="tasks-cards-grid">
          @for (task of filteredTasks(); track task.id) {
            <div class="task-compact-card" [class.is-overdue]="task.isOverdue">
              <!-- TOP META ROW -->
              <div class="card-top-row">
                <div class="top-left-tags">
                  <span class="task-code" *ngIf="task.code">{{ task.code }}</span>
                  <span class="my-role-badge" [ngClass]="getMyRoleBadgeClass(task)">
                    {{ getMyRoleName(task) }}
                  </span>
                  @if (task.priority === 'KHAN_CAP' || task.priority === 'CAO') {
                    <span class="priority-badge" [ngClass]="'prio-' + task.priority">
                      {{ task.priority === 'KHAN_CAP' ? 'Khẩn cấp' : 'Ưu tiên cao' }}
                    </span>
                  }
                </div>
                <app-status-badge [status]="task.status"></app-status-badge>
              </div>

              <!-- TASK TITLE -->
              <h2 class="task-title" (click)="goToDetail(task.id)">{{ task.title }}</h2>

              <!-- DESCRIPTION PREVIEW (IF ANY) -->
              @if (task.description) {
                <p class="task-desc-snippet">{{ task.description }}</p>
              }

              <!-- ATTACHMENT REQUIRED BADGE -->
              @if (task.requireAttachment) {
                <div class="req-attach-hint">
                  <span class="material-symbols-outlined">attach_file</span>
                  <span>Bắt buộc có minh chứng trước khi gửi duyệt</span>
                </div>
              }

              <!-- DEADLINE & SCOPE ROW -->
              <div class="card-meta-row">
                <div class="deadline-box" [ngClass]="getDueStatusClass(task)">
                  <span class="material-symbols-outlined">calendar_today</span>
                  <span class="due-text">{{ getDueText(task) }}</span>
                </div>

                @if (task.location?.name) {
                  <span class="scope-tag">
                    <span class="material-symbols-outlined">location_on</span>
                    {{ task.location?.name }}
                  </span>
                }
              </div>

              <!-- PROGRESS BAR -->
              <div class="progress-section">
                <div class="progress-info-line">
                  <span class="progress-label">Tiến độ thực hiện</span>
                  <strong class="progress-pct">{{ task.progressPercent }}%</strong>
                </div>
                <div class="progress-bar-track">
                  <div
                    class="progress-bar-fill"
                    [style.width.%]="task.progressPercent"
                    [ngClass]="getProgressColor(task.progressPercent, task.isOverdue)"
                  ></div>
                </div>
              </div>

              <!-- CARD ACTIONS & QUICK UPDATE BUTTON -->
              <div class="card-actions-footer">
                <!-- ASSIGNEES / COORDINATOR AVATARS -->
                <div class="assignees-avatars">
                  @for (asg of task.assignments; track asg.id) {
                    <img
                      [src]="asg.user.avatarUrl || 'https://ui-avatars.com/api/?name=' + asg.user.fullName + '&background=1F3864&color=fff'"
                      [alt]="asg.user.fullName"
                      class="mini-avatar"
                      [title]="asg.user.fullName + ' (' + asg.role + ')'"
                      (click)="openContactCard(asg.user, $event)"
                    />
                  }
                </div>

                <div class="card-footer-btns">
                  <!-- NẾU LÀ NGƯỜI KIỂM TRA / BGH VÀ VIỆC ĐANG CHỜ KIỂM TRA -->
                  @if (canInspect(task)) {
                    <button
                      type="button"
                      class="btn-card-action btn-approve tap-target"
                      (click)="quickApprove(task, $event)"
                      title="Nghiệm thu đạt yêu cầu"
                    >
                      <span class="material-symbols-outlined">check_circle</span>
                      <span>Duyệt đạt</span>
                    </button>
                    <button
                      type="button"
                      class="btn-card-action btn-reject tap-target"
                      (click)="quickReject(task, $event)"
                      title="Yêu cầu bổ sung"
                    >
                      <span class="material-symbols-outlined">replay</span>
                      <span>Bổ sung</span>
                    </button>
                  } @else if (isMyLeading(task) && canSubmitForReview(task)) {
                    <button
                      type="button"
                      class="quick-update-btn btn-highlight tap-target"
                      (click)="openQuickUpdate(task, $event)"
                      title="Cập nhật tiến độ & Gửi duyệt"
                    >
                      <span class="material-symbols-outlined">send</span>
                      <span>Nộp kết quả</span>
                    </button>
                  } @else {
                    <!-- BUTTON CẬP NHẬT NHANH -->
                    <button
                      type="button"
                      class="quick-update-btn tap-target"
                      (click)="openQuickUpdate(task, $event)"
                      title="Cập nhật tiến độ & Minh chứng"
                    >
                      <span class="material-symbols-outlined">edit_note</span>
                      <span>Cập nhật</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- MODAL CẬP NHẬT NHANH (IN-PLACE QUICK UPDATE DRAWER / MODAL) -->
      @if (quickUpdatingTask(); as qTask) {
        <div class="quick-modal-backdrop" (click)="closeQuickUpdate()">
          <div class="quick-modal-container" (click)="$event.stopPropagation()">
            <!-- MODAL HEADER -->
            <div class="quick-modal-header">
              <div class="header-titles">
                <span class="modal-badge">CẬP NHẬT NHANH CÔNG VIỆC</span>
                <h3 class="modal-task-title">{{ qTask.title }}</h3>
              </div>
              <button type="button" class="close-modal-btn" (click)="closeQuickUpdate()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- MODAL BODY -->
            <div class="quick-modal-body">
              <!-- 1. SLIDER TIẾN ĐỘ % -->
              <div class="form-section">
                <div class="slider-header-row">
                  <label class="section-label">
                    <span class="material-symbols-outlined">trending_up</span>
                    <span>Tiến độ hoàn thành:</span>
                  </label>
                  <span class="current-pct-badge">{{ updateProgressVal }}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  class="pct-slider"
                  [(ngModel)]="updateProgressVal"
                />

                <!-- PRESET BUTTONS (25%, 50%, 75%, 100%) -->
                <div class="pct-presets-row">
                  <button type="button" class="pct-btn" (click)="updateProgressVal = 25">25%</button>
                  <button type="button" class="pct-btn" (click)="updateProgressVal = 50">50%</button>
                  <button type="button" class="pct-btn" (click)="updateProgressVal = 75">75%</button>
                  <button type="button" class="pct-btn pct-100" (click)="updateProgressVal = 100">100% Hoàn thành</button>
                </div>
              </div>

              <!-- 2. GHI CHÚ / BÁO CÁO KẾT QUẢ -->
              <div class="form-section">
                <label class="section-label">
                  <span class="material-symbols-outlined">comment</span>
                  <span>Ghi chú cập nhật kết quả:</span>
                </label>
                <textarea
                  rows="3"
                  class="note-textarea tap-target"
                  placeholder="Nhập tóm tắt kết quả thực hiện, khó khăn hoặc kiến nghị..."
                  [(ngModel)]="updateNote"
                ></textarea>
              </div>

              <!-- 3. FILE DROPZONE MINH CHỨNG -->
              <div class="form-section">
                <app-file-dropzone
                  [taskId]="qTask.id"
                  [label]="'Đính kèm tệp / ảnh minh chứng kết quả'"
                  [autoUpload]="true"
                  (uploadComplete)="onEvidenceUploaded($event)"
                ></app-file-dropzone>
              </div>

              <!-- ERROR MESSAGE IF ANY -->
              @if (quickUpdateError()) {
                <div class="modal-error-alert">
                  <span class="material-symbols-outlined">error</span>
                  <span>{{ quickUpdateError() }}</span>
                </div>
              }
            </div>

            <!-- MODAL ACTIONS FOOTER -->
            <div class="quick-modal-footer">
              <!-- NÚT GỬI DUYỆT KIỂM TRA -->
              @if (canSubmitForReview(qTask)) {
                <button
                  type="button"
                  class="btn-action btn-submit-review tap-target"
                  (click)="submitStatusChange(qTask, 'CHO_KIEM_TRA')"
                  [disabled]="isSaving()"
                >
                  <span class="material-symbols-outlined">send</span>
                  <span>Gửi kiểm tra duyệt</span>
                </button>
              }

              <!-- NÚT LƯU TIẾN ĐỘ THÔNG THƯỜNG -->
              <button
                type="button"
                class="btn-action btn-save tap-target"
                (click)="saveQuickProgress(qTask)"
                [disabled]="isSaving()"
              >
                @if (isSaving()) {
                  <span class="material-symbols-outlined spin">progress_activity</span>
                  <span>Đang lưu...</span>
                } @else {
                  <span class="material-symbols-outlined">save</span>
                  <span>Lưu tiến độ</span>
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
      .my-tasks-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-width: 1200px;
        margin: 0 auto;
        padding-bottom: 40px;
      }

      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;

        .header-left {
          .page-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: #1F3864;
            margin-bottom: 4px;
          }

          .page-subtitle {
            font-size: 0.85rem;
            color: #64748B;
          }
        }

        .header-right {
          .refresh-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: #EEF4FC;
            border: 1px solid #BFDBFE;
            border-radius: 10px;
            color: #1F3864;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover:not(:disabled) {
              background: #1F3864;
              color: #FFFFFF;
            }

            .material-symbols-outlined {
              font-size: 18px;
            }
          }
        }
      }

      /* TABS GROUP */
      .tabs-container {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

        .custom-group-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: thin;

          .group-tab-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: 8px;
            border: none;
            background: transparent;
            color: #475569;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease;

            .tab-icon {
              font-size: 18px;
            }

            .count-pill {
              font-size: 0.75rem;
              font-weight: 700;
              background: #F1F5F9;
              color: #475569;
              padding: 1px 7px;
              border-radius: 9999px;

              &.count-blue { background: #EEF4FC; color: #1E40AF; }
              &.count-amber { background: #FEF3C7; color: #B45309; }
              &.count-red { background: #FEE2E2; color: #B91C1C; }
              &.count-purple { background: #F3E8FF; color: #7E22CE; }
            }

            &:hover {
              background: #F8FAFC;
              color: #1F3864;
            }

            &.active {
              background: #1F3864;
              color: #FFFFFF;

              .tab-icon { color: #FFFFFF !important; }
              .count-pill {
                background: rgba(255, 255, 255, 0.25);
                color: #FFFFFF;
              }
            }
          }
        }
      }

      /* SEARCH & FILTERS */
      .search-filter-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;

        .search-input-box {
          flex: 1;
          min-width: 260px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          padding: 0 12px;
          transition: border-color 0.2s ease;

          &:focus-within {
            border-color: #1F3864;
            box-shadow: 0 0 0 3px rgba(31, 56, 100, 0.1);
          }

          .search-icon {
            font-size: 20px;
            color: #94A3B8;
          }

          .search-input {
            flex: 1;
            border: none;
            background: transparent;
            padding: 9px 0;
            font-size: 0.9rem;
            outline: none;
            color: #1E293B;
          }

          .clear-search-btn {
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
          }
        }

        .priority-filter-box {
          .priority-select {
            background: #FFFFFF;
            border: 1.5px solid #CBD5E1;
            border-radius: 10px;
            padding: 9px 12px;
            font-size: 0.85rem;
            font-weight: 600;
            color: #334155;
            outline: none;
            cursor: pointer;
          }
        }
      }

      /* TASK CARDS GRID */
      .tasks-cards-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;

        @media (max-width: 800px) {
          grid-template-columns: 1fr;
        }

        .task-compact-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease;

          &:hover {
            transform: translateY(-2px);
            border-color: #CBD5E1;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          }

          &.is-overdue {
            border-color: #FECACA;
          }

          .card-top-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;

            .top-left-tags {
              display: flex;
              align-items: center;
              gap: 6px;
              flex-wrap: wrap;

              .task-code {
                font-size: 0.72rem;
                font-weight: 700;
                background: #F1F5F9;
                color: #475569;
                padding: 2px 6px;
                border-radius: 4px;
              }

              .my-role-badge {
                font-size: 0.72rem;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 9999px;

                &.role-chu-tri { background: #EEF4FC; color: #1E40AF; }
                &.role-phoi-hop { background: #F3E8FF; color: #7E22CE; }
                &.role-kiem-tra { background: #FEF3C7; color: #92400E; }
                &.role-other { background: #F1F5F9; color: #475569; }
              }

              .priority-badge {
                font-size: 0.68rem;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 4px;

                &.prio-KHAN_CAP { background: #FEE2E2; color: #B91C1C; }
                &.prio-CAO { background: #FFEDD5; color: #C2410C; }
              }
            }
          }

          .task-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: #1E293B;
            line-height: 1.35;
            cursor: pointer;

            &:hover {
              color: #1F3864;
              text-decoration: underline;
            }
          }

          .task-desc-snippet {
            font-size: 0.8rem;
            color: #64748B;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .req-attach-hint {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.72rem;
            color: #D97706;
            font-weight: 600;

            .material-symbols-outlined {
              font-size: 14px;
            }
          }

          .card-meta-row {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.78rem;

            .deadline-box {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-weight: 600;

              .material-symbols-outlined {
                font-size: 15px;
              }

              &.due-overdue { color: #DC2626; }
              &.due-today { color: #2563EB; font-weight: 700; }
              &.due-soon { color: #D97706; }
              &.due-normal { color: #64748B; }
            }

            .scope-tag {
              display: inline-flex;
              align-items: center;
              gap: 2px;
              color: #1E40AF;
              font-weight: 500;

              .material-symbols-outlined {
                font-size: 14px;
              }
            }
          }

          .progress-section {
            display: flex;
            flex-direction: column;
            gap: 4px;

            .progress-info-line {
              display: flex;
              align-items: center;
              justify-content: space-between;

              .progress-label {
                font-size: 0.74rem;
                color: #64748B;
              }

              .progress-pct {
                font-size: 0.8rem;
                color: #1E293B;
              }
            }

            .progress-bar-track {
              width: 100%;
              height: 6px;
              background: #F1F5F9;
              border-radius: 9999px;
              overflow: hidden;

              .progress-bar-fill {
                height: 100%;
                border-radius: 9999px;

                &.fill-green { background: #2E7D32; }
                &.fill-amber { background: #F0A500; }
                &.fill-red { background: #C62828; }
                &.fill-blue { background: #1F3864; }
              }
            }
          }

          .card-actions-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 10px;
            border-top: 1px solid #F1F5F9;

            .assignees-avatars {
              display: flex;
              align-items: center;

              .mini-avatar {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 2px solid #FFFFFF;
                object-fit: cover;
                cursor: pointer;
                margin-left: -6px;

                &:first-child { margin-left: 0; }
                &:hover { transform: scale(1.15); z-index: 2; }
              }
            }

            .quick-update-btn {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 8px 14px;
              background: #2E7D32;
              color: #FFFFFF;
              border: none;
              border-radius: 8px;
              font-size: 0.85rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.15s ease;

              &:hover {
                background: #256628;
                box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
              }

              .material-symbols-outlined {
                font-size: 18px;
              }
            }
          }
        }
      }

      /* MODAL CẬP NHẬT NHANH */
      .quick-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(3px);
        z-index: 2100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;

        @media (max-width: 768px) {
          padding: 0;
          align-items: flex-end;
        }
      }

      .quick-modal-container {
        width: 100%;
        max-width: 540px;
        background: #FFFFFF;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        animation: scaleUp 0.2s ease-out;

        @media (max-width: 768px) {
          border-radius: 20px 20px 0 0;
          max-height: 92vh;
        }

        .quick-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #E2E8F0;
          background: #F8FAFC;

          .header-titles {
            .modal-badge {
              font-size: 0.72rem;
              font-weight: 800;
              color: #2E7D32;
              letter-spacing: 0.5px;
            }

            .modal-task-title {
              font-size: 1.05rem;
              font-weight: 700;
              color: #1E293B;
              margin-top: 2px;
            }
          }

          .close-modal-btn {
            background: transparent;
            border: none;
            color: #64748B;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
          }
        }

        .quick-modal-body {
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;

          .form-section {
            display: flex;
            flex-direction: column;
            gap: 8px;

            .section-label {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.85rem;
              font-weight: 700;
              color: #334155;

              .material-symbols-outlined {
                font-size: 18px;
                color: #1F3864;
              }
            }

            .slider-header-row {
              display: flex;
              align-items: center;
              justify-content: space-between;

              .current-pct-badge {
                font-size: 1.1rem;
                font-weight: 800;
                color: #2E7D32;
                background: #DCFCE7;
                padding: 2px 10px;
                border-radius: 9999px;
              }
            }

            .pct-slider {
              width: 100%;
              height: 8px;
              accent-color: #2E7D32;
              cursor: pointer;
            }

            .pct-presets-row {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 6px;

              .pct-btn {
                padding: 6px;
                background: #F1F5F9;
                border: 1px solid #CBD5E1;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                color: #475569;
                cursor: pointer;

                &:hover {
                  background: #EEF4FC;
                  color: #1F3864;
                }

                &.pct-100 {
                  background: #DCFCE7;
                  border-color: #86EFAC;
                  color: #166534;
                  font-weight: 700;
                }
              }
            }

            .note-textarea {
              width: 100%;
              border: 1.5px solid #CBD5E1;
              border-radius: 10px;
              padding: 10px;
              font-size: 0.88rem;
              outline: none;
              resize: vertical;

              &:focus {
                border-color: #1F3864;
              }
            }
          }

          .modal-error-alert {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            background: #FEE2E2;
            border: 1px solid #FCA5A5;
            border-radius: 8px;
            color: #B91C1C;
            font-size: 0.82rem;
          }
        }

        .quick-modal-footer {
          padding: 14px 20px;
          border-top: 1px solid #E2E8F0;
          background: #F8FAFC;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;

          .btn-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 18px;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 700;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;

            .material-symbols-outlined {
              font-size: 20px;
            }

            &.btn-save {
              background: #1F3864;
              color: #FFFFFF;

              &:hover:not(:disabled) {
                background: #152644;
              }
            }

            &.btn-submit-review {
              background: #F0A500;
              color: #FFFFFF;

              &:hover:not(:disabled) {
                background: #D99400;
              }
            }

            &:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
          }
        }
      }

      .loading-state,
      .empty-state-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 20px;
        text-align: center;
        background: #FFFFFF;
        border: 1px dashed #CBD5E1;
        border-radius: 16px;
        color: #64748B;
        gap: 10px;

        .empty-icon {
          font-size: 48px;
          color: #94A3B8;
        }

        .spin-large {
          font-size: 36px;
          color: #1F3864;
          animation: spin 1s linear infinite;
        }
      }

      /* ROLE WORKSPACE BANNER */
      .my-role-banner {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px 18px;
        border-radius: 14px;
        border: 1.5px solid #E2E8F0;
        background: #FFFFFF;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
        flex-wrap: wrap;

        &.role-hieu-truong {
          background: linear-gradient(135deg, #1F3864 0%, #152847 100%);
          border-color: #3B5B91;
          color: #FFFFFF;
          .role-icon-box { background: rgba(255, 255, 255, 0.15); color: #FCD34D; }
          .role-tag-pill { background: #FCD34D; color: #1E293B; }
          .scope-tag-pill { background: rgba(255, 255, 255, 0.2); color: #E2E8F0; }
          .role-heading { color: #FFFFFF; }
          .role-guidance { color: #CBD5E1; }
        }

        &.role-pht {
          background: linear-gradient(135deg, #2E5EAA 0%, #1F3864 100%);
          border-color: #60A5FA;
          color: #FFFFFF;
          .role-icon-box { background: rgba(255, 255, 255, 0.18); color: #93C5FD; }
          .role-tag-pill { background: #93C5FD; color: #1E293B; }
          .scope-tag-pill { background: rgba(255, 255, 255, 0.2); color: #E2E8F0; }
          .role-heading { color: #FFFFFF; }
          .role-guidance { color: #E2E8F0; }
        }

        &.role-to-truong {
          background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
          border-color: #FCD34D;
          color: #78350F;
          .role-icon-box { background: #F59E0B; color: #FFFFFF; }
          .role-tag-pill { background: #D97706; color: #FFFFFF; }
          .scope-tag-pill { background: #FDE68A; color: #92400E; }
          .role-heading { color: #78350F; }
          .role-guidance { color: #92400E; }
        }

        &.role-giao-vien {
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
          border-color: #86EFAC;
          color: #14532D;
          .role-icon-box { background: #10B981; color: #FFFFFF; }
          .role-tag-pill { background: #059669; color: #FFFFFF; }
          .scope-tag-pill { background: #BBF7D0; color: #166534; }
          .role-heading { color: #14532D; }
          .role-guidance { color: #166534; }
        }

        .role-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .material-symbols-outlined {
            font-size: 24px;
          }
        }

        .role-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;

          .role-badge-row {
            display: flex;
            align-items: center;
            gap: 6px;

            .role-tag-pill {
              font-size: 0.72rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              padding: 2px 8px;
              border-radius: 9999px;
            }

            .scope-tag-pill {
              font-size: 0.72rem;
              font-weight: 600;
              padding: 2px 8px;
              border-radius: 9999px;
            }
          }

          .role-heading {
            font-size: 1.05rem;
            font-weight: 800;
            margin: 0;
          }

          .role-guidance {
            font-size: 0.82rem;
            margin: 0;
            line-height: 1.4;
          }
        }

        .alert-pending-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #DC2626;
          color: #FFFFFF;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);

          &:hover {
            background: #B91C1C;
            transform: scale(1.02);
          }

          .pulse-icon {
            font-size: 18px;
            animation: pulse-ring 1.5s infinite;
          }
        }
      }

      .card-footer-btns {
        display: flex;
        align-items: center;
        gap: 6px;

        .btn-card-action {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;

          .material-symbols-outlined {
            font-size: 16px;
          }

          &.btn-approve {
            background: #DCFCE7;
            color: #15803D;
            border: 1px solid #86EFAC;

            &:hover {
              background: #16A34A;
              color: #FFFFFF;
            }
          }

          &.btn-reject {
            background: #FFEDD5;
            color: #C2410C;
            border: 1px solid #FDBA74;

            &:hover {
              background: #EA580C;
              color: #FFFFFF;
            }
          }
        }

        .btn-highlight {
          background: #1F3864 !important;
          color: #FFFFFF !important;
          border-color: #1F3864 !important;

          &:hover {
            background: #152847 !important;
          }
        }
      }

      @keyframes pulse-ring {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      @keyframes scaleUp {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class MyTasksComponent implements OnInit, OnDestroy {
  taskService = inject(TaskService);
  authService = inject(AuthService);
  private contactCardService = inject(ContactCardService);
  private router = inject(Router);

  isLoading = signal(true);
  isSaving = signal(false);
  allTasks = signal<TaskItem[]>([]);

  activeGroup = signal<MyTaskGroupType>('ALL');
  searchKeyword = '';
  selectedPriority = '';

  // Quick Update State
  quickUpdatingTask = signal<TaskItem | null>(null);
  updateProgressVal = 0;
  updateNote = '';
  quickUpdateError = signal<string | null>(null);

  private accountSub?: Subscription;

  totalCount = computed(() => this.allTasks().length);

  todayCount = computed(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return this.allTasks().filter((t) => t.dueDate?.startsWith(todayStr)).length;
  });

  thisWeekCount = computed(() => {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.allTasks().filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= now && d <= sevenDaysLater;
    }).length;
  });

  dueSoonCount = computed(() => {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return this.allTasks().filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= now && d <= threeDaysLater && t.status !== 'HOAN_THANH' && t.status !== 'DONG';
    }).length;
  });

  overdueCount = computed(() => this.allTasks().filter((t) => t.isOverdue).length);

  waitingConfirmCount = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    return this.allTasks().filter((t) => {
      if (t.status === 'CHO_KIEM_TRA') {
        return (
          this.authService.isBGH() ||
          t.assignments.some(
            (a) =>
              a.userId === currentUserId &&
              (a.role === 'KIEM_TRA' || a.role === 'PHE_DUYET')
          )
        );
      }
      if (t.status === 'BO_SUNG') {
        return t.assignments.some(
          (a) => a.userId === currentUserId && a.role === 'CHU_TRI'
        );
      }
      return false;
    }).length;
  });

  filteredTasks = computed(() => {
    let list = this.allTasks();
    const grp = this.activeGroup();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const currentUserId = this.authService.currentUser()?.id;

    if (grp === 'TODAY') {
      list = list.filter((t) => t.dueDate?.startsWith(todayStr));
    } else if (grp === 'THIS_WEEK') {
      list = list.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= now && d <= sevenDaysLater;
      });
    } else if (grp === 'DUE_SOON') {
      list = list.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= now && d <= threeDaysLater && t.status !== 'HOAN_THANH' && t.status !== 'DONG';
      });
    } else if (grp === 'OVERDUE') {
      list = list.filter((t) => t.isOverdue);
    } else if (grp === 'WAITING_CONFIRM') {
      list = list.filter((t) => {
        if (t.status === 'CHO_KIEM_TRA') {
          return (
            this.authService.isBGH() ||
            t.assignments.some(
              (a) =>
                a.userId === currentUserId &&
                (a.role === 'KIEM_TRA' || a.role === 'PHE_DUYET')
            )
          );
        }
        if (t.status === 'BO_SUNG') {
          return t.assignments.some((a) => a.userId === currentUserId && a.role === 'CHU_TRI');
        }
        return false;
      });
    }

    if (this.searchKeyword.trim()) {
      const q = this.searchKeyword.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.code && t.code.toLowerCase().includes(q))
      );
    }

    if (this.selectedPriority) {
      list = list.filter((t) => t.priority === this.selectedPriority);
    }

    return list;
  });

  ngOnInit() {
    this.loadMyTasks();

    // Subscribe to switchDemoAccount to reload personal tasks immediately
    this.accountSub = this.authService.accountSwitched$.subscribe(() => {
      this.loadMyTasks();
    });
  }

  ngOnDestroy() {
    this.accountSub?.unsubscribe();
  }

  getRoleBannerClass(): string {
    if (this.authService.isHieuTruong()) return 'role-hieu-truong';
    if (this.authService.isPHT()) return 'role-pht';
    if (this.authService.isToTruong()) return 'role-to-truong';
    return 'role-giao-vien';
  }

  getRoleBannerIcon(): string {
    if (this.authService.isHieuTruong()) return 'stars';
    if (this.authService.isPHT()) return 'shield_person';
    if (this.authService.isToTruong()) return 'supervisor_account';
    return 'assignment_ind';
  }

  getRoleGuidance(): string {
    if (this.authService.isHieuTruong()) {
      return 'Nhiệm vụ trực tiếp chỉ đạo, giám sát các tổ chuyên môn và duyệt đóng các mốc kế hoạch quan trọng.';
    }
    if (this.authService.isPHT()) {
      return 'Theo dõi & chỉ đạo các công việc trọng tâm tại Phân hiệu 1 Tân Lập và công việc phối hợp liên trường.';
    }
    if (this.authService.isToTruong()) {
      return 'Quản lý tiến độ tổ Toán - Tin. Kiểm tra & Nghiệm thu đạt yêu cầu cho các công việc giáo viên đã hoàn tất nộp minh chứng.';
    }
    return 'Cập nhật tiến độ % thực hiện, kéo thanh trượt, đính kèm hình ảnh/tệp minh chứng và gửi kiểm tra duyệt.';
  }

  loadMyTasks() {
    this.isLoading.set(true);
    this.taskService.getTasks({ myTasks: true, pageSize: 50 }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.allTasks.set(res.items);

        // If ToTruong or BGH has waiting tasks, default to WAITING_CONFIRM group
        if ((this.authService.isToTruong() || this.authService.isBGH()) && this.waitingConfirmCount() > 0) {
          this.activeGroup.set('WAITING_CONFIRM');
        } else {
          this.activeGroup.set('ALL');
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  setGroup(group: MyTaskGroupType) {
    this.activeGroup.set(group);
  }

  onSearchChange() {}

  clearSearch() {
    this.searchKeyword = '';
  }

  onFilterChange() {}

  isMyLeading(task: TaskItem): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    return task.assignments.some((a) => a.userId === currentUserId && a.role === 'CHU_TRI');
  }

  canInspect(task: TaskItem): boolean {
    if (task.status !== 'CHO_KIEM_TRA') return false;
    const currentUserId = this.authService.currentUser()?.id;
    if (this.authService.isBGH()) return true;
    return task.assignments.some(
      (a) => a.userId === currentUserId && (a.role === 'KIEM_TRA' || a.role === 'PHE_DUYET')
    );
  }

  quickApprove(task: TaskItem, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm(`Xác nhận nghiệm thu ĐẠT cho công việc "${task.title}"?`)) return;

    this.taskService.updateStatus(task.id, 'HOAN_THANH', 'Nghiệm thu đạt yêu cầu qua nút duyệt nhanh').subscribe({
      next: () => {
        this.loadMyTasks();
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể nghiệm thu công việc.');
      },
    });
  }

  quickReject(task: TaskItem, event: MouseEvent) {
    event.stopPropagation();
    const reason = prompt(`Nhập yêu cầu bổ sung cho công việc "${task.title}":`, 'Cần bổ sung thêm ảnh minh chứng rõ nét hơn');
    if (reason === null || !reason.trim()) return;

    this.taskService.updateStatus(task.id, 'BO_SUNG', reason.trim()).subscribe({
      next: () => {
        this.loadMyTasks();
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể chuyển trạng thái.');
      },
    });
  }

  getMyRoleName(task: TaskItem): string {
    const currentUserId = this.authService.currentUser()?.id;
    const assignment = task.assignments.find((a) => a.userId === currentUserId);
    if (!assignment) return 'Tham gia';

    switch (assignment.role) {
      case 'CHU_TRI':
        return 'Chủ trì';
      case 'PHOI_HOP':
        return 'Phối hợp';
      case 'KIEM_TRA':
        return 'Kiểm tra';
      case 'PHE_DUYET':
        return 'Phê duyệt';
      default:
        return 'Theo dõi';
    }
  }

  getMyRoleBadgeClass(task: TaskItem): string {
    const currentUserId = this.authService.currentUser()?.id;
    const assignment = task.assignments.find((a) => a.userId === currentUserId);
    if (!assignment) return 'role-other';

    switch (assignment.role) {
      case 'CHU_TRI':
        return 'role-chu-tri';
      case 'PHOI_HOP':
        return 'role-phoi-hop';
      case 'KIEM_TRA':
      case 'PHE_DUYET':
        return 'role-kiem-tra';
      default:
        return 'role-other';
    }
  }

  getDueStatusClass(task: TaskItem): string {
    if (task.isOverdue) return 'due-overdue';
    if (!task.dueDate) return 'due-normal';

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (task.dueDate.startsWith(todayStr)) return 'due-today';

    const d = new Date(task.dueDate);
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 3) return 'due-soon';

    return 'due-normal';
  }

  getDueText(task: TaskItem): string {
    if (!task.dueDate) return 'Không có hạn';
    const now = new Date();
    const d = new Date(task.dueDate);
    const dateFormatted = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

    if (task.isOverdue) {
      const daysOver = Math.max(1, Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24)));
      return `Quá hạn ${daysOver} ngày (${dateFormatted})`;
    }

    const todayStr = now.toISOString().slice(0, 10);
    if (task.dueDate.startsWith(todayStr)) {
      return `Hạn chót hôm nay (${dateFormatted})`;
    }

    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 3) {
      return `Còn ${diffDays} ngày (${dateFormatted})`;
    }

    return `Hạn: ${dateFormatted}`;
  }

  getProgressColor(pct: number, isOverdue?: boolean): string {
    if (isOverdue) return 'fill-red';
    if (pct >= 80) return 'fill-green';
    if (pct >= 40) return 'fill-amber';
    return 'fill-blue';
  }

  openContactCard(user: any, event: MouseEvent) {
    event.stopPropagation();
    this.contactCardService.open(user);
  }

  goToDetail(taskId: string) {
    this.router.navigate(['/tasks'], { queryParams: { taskId } });
  }

  // QUICK UPDATE ACTIONS
  openQuickUpdate(task: TaskItem, event: MouseEvent) {
    event.stopPropagation();
    this.quickUpdatingTask.set(task);
    this.updateProgressVal = task.progressPercent || 0;
    this.updateNote = '';
    this.quickUpdateError.set(null);
  }

  closeQuickUpdate() {
    this.quickUpdatingTask.set(null);
    this.quickUpdateError.set(null);
  }

  canSubmitForReview(task: TaskItem): boolean {
    return task.status === 'DA_GIAO' || task.status === 'DA_TIEP_NHAN' || task.status === 'DANG_THUC_HIEN' || task.status === 'BO_SUNG';
  }

  saveQuickProgress(task: TaskItem) {
    this.isSaving.set(true);
    this.quickUpdateError.set(null);

    this.taskService
      .updateProgress(task.id, this.updateProgressVal, this.updateNote)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeQuickUpdate();
          this.loadMyTasks();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.quickUpdateError.set(err.error?.message || 'Không thể lưu tiến độ.');
        },
      });
  }

  submitStatusChange(task: TaskItem, newStatus: TaskStatus) {
    this.isSaving.set(true);
    this.quickUpdateError.set(null);

    // Trước khi đổi trạng thái, cập nhật tiến độ nếu có thay đổi
    this.taskService
      .updateProgress(task.id, this.updateProgressVal, this.updateNote)
      .subscribe({
        next: () => {
          this.taskService.updateStatus(task.id, newStatus, this.updateNote).subscribe({
            next: () => {
              this.isSaving.set(false);
              this.closeQuickUpdate();
              this.loadMyTasks();
            },
            error: (err) => {
              this.isSaving.set(false);
              this.quickUpdateError.set(err.error?.message || 'Chuyển trạng thái thất bại.');
            },
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          this.quickUpdateError.set(err.error?.message || 'Cập nhật tiến độ thất bại.');
        },
      });
  }

  onEvidenceUploaded(data: any) {
    // Tự động cập nhật danh sách
    this.loadMyTasks();
  }
}
