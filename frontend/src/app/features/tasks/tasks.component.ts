import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskService, TaskFilterParams } from '../../core/services/task.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ContactCardService } from '../../core/services/contact-card.service';
import {
  TaskItem,
  TaskStatus,
  TaskPriority,
} from '../../core/models/task.models';
import { LocationItem, OrgUnitItem } from '../../core/models/user.models';
import { DashboardService } from '../../core/services/dashboard.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { StatusTabsCounterComponent, StatusTabItem } from '../../shared/components/status-tabs-counter/status-tabs-counter.component';
import { TaskCreateWizardComponent } from '../../shared/components/task-create-wizard/task-create-wizard.component';
import { TaskDetailModalComponent } from '../../shared/components/task-detail-modal/task-detail-modal.component';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    StatusTabsCounterComponent,
    TaskCreateWizardComponent,
    TaskDetailModalComponent,
  ],
  template: `
    <div class="tasks-page-container">
      <!-- HEADER -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <span class="material-symbols-outlined">assignment</span>
            <span>QUẢN TRỊ CÔNG VIỆC TRƯỜNG HỌC</span>
          </div>
          <h1 class="page-title">Theo Dõi, Phê Duyệt & Phân Công Việc</h1>
          <p class="page-subtitle">
            Giám sát tiến độ toàn trường, phát hiện điểm nghẽn và phê duyệt kết quả theo quy trình RACI.
          </p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn-create-task tap-target" (click)="openCreateWizard()">
            <span class="material-symbols-outlined">{{ authService.isGiaoVien() ? 'post_add' : 'add_task' }}</span>
            <span>{{ authService.isGiaoVien() ? '+ Đề xuất việc mới' : '+ Giao việc mới (RACI)' }}</span>
          </button>
        </div>
      </header>

      <!-- STATUS TABS COUNTER -->
      <section class="status-tabs-wrapper">
        <app-status-tabs-counter
          [tabs]="statusTabs()"
          [activeKey]="activeStatusTab()"
          (tabChange)="onTabChange($event)"
        ></app-status-tabs-counter>
      </section>

      <!-- SEARCH & FILTER TOOLBAR -->
      <section class="filter-toolbar">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            class="search-input"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Tìm theo tên công việc, người phụ trách hoặc mã việc..."
          />
          @if (searchQuery) {
            <button type="button" class="clear-search-btn" (click)="searchQuery = ''; onSearchChange()">
              <span class="material-symbols-outlined">close</span>
            </button>
          }
        </div>

        <div class="filters-group">
          <!-- LOCATION FILTER -->
          <select class="filter-select tap-target" [(ngModel)]="filterLocationId" (ngModelChange)="loadTasks()">
            <option value="">Tất cả điểm trường</option>
            @for (loc of locations(); track loc.id) {
              <option [value]="loc.id">{{ loc.name }}</option>
            }
          </select>

          <!-- ORG UNIT FILTER -->
          <select class="filter-select tap-target" [(ngModel)]="filterOrgUnitId" (ngModelChange)="loadTasks()">
            <option value="">Tất cả tổ / bộ phận</option>
            @for (org of orgUnits(); track org.id) {
              <option [value]="org.id">{{ org.name }}</option>
            }
          </select>

          <!-- PRIORITY FILTER -->
          <select class="filter-select tap-target" [(ngModel)]="filterPriority" (ngModelChange)="loadTasks()">
            <option value="">Tất cả mức độ</option>
            <option value="KHAN_CAP">Khẩn cấp</option>
            <option value="CAO">Quan trọng</option>
            <option value="TRUNG_BINH">Bình thường</option>
            <option value="THAP">Thấp</option>
          </select>

          <!-- QUICK TOGGLE: ONLY MY ACTIONABLE TASKS -->
          <button
            type="button"
            class="btn-toggle-actionable tap-target"
            [class.active]="filterOnlyMyAction()"
            (click)="toggleOnlyMyAction()"
          >
            <span class="material-symbols-outlined">pending_actions</span>
            <span>Chờ tôi xử lý</span>
          </button>
        </div>
      </section>

      <!-- TASKS TABLE & CARDS VIEW -->
      <section class="tasks-content-section">
        @if (isLoading()) {
          <div class="tasks-skeleton-list">
            @for (item of [1, 2, 3, 4, 5]; track item) {
              <div class="task-skeleton-row">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-col-main">
                  <div class="skeleton-line w-70 h-20"></div>
                  <div class="skeleton-line w-50"></div>
                </div>
                <div class="skeleton-col-meta hide-on-mobile">
                  <div class="skeleton-line w-90"></div>
                </div>
                <div class="skeleton-col-status">
                  <div class="skeleton-line w-90 h-28"></div>
                </div>
              </div>
            }
          </div>
        } @else if (tasksList().length === 0) {
          <div class="friendly-empty-state">
            <svg class="empty-svg-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" fill="#EEF4FC" />
              <path d="M40 38H80V82H40V38Z" rx="4" fill="#FFFFFF" stroke="#1F3864" stroke-width="2.5" />
              <path d="M48 48H72" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round" />
              <path d="M48 58H72" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round" />
              <path d="M48 68H62" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round" />
              <circle cx="82" cy="82" r="16" fill="#2E7D32" stroke="#FFFFFF" stroke-width="3" />
              <path d="M76 82L80 86L88 78" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <h3 class="empty-state-title">Chưa có công việc nào ở mục này!</h3>
            <p class="empty-state-desc">
              Không tìm thấy công việc nào phù hợp với bộ lọc hiện tại. Thầy/cô có thể tạo công việc mới hoặc thử chọn bộ lọc khác.
            </p>
            <button type="button" class="empty-state-action-btn tap-target" (click)="openCreateWizard()">
              <span class="material-symbols-outlined">add_task</span>
              <span>+ Tạo công việc mới ngay</span>
            </button>
          </div>
        } @else {
          <!-- DESKTOP TABLE -->
          <div class="desktop-table-wrapper">
            <table class="tasks-table">
              <thead>
                <tr>
                  <th class="col-code">Mã</th>
                  <th class="col-title">Tên công việc & Đính kèm</th>
                  <th class="col-loc">Điểm trường / Tổ</th>
                  <th class="col-status">Trạng thái</th>
                  <th class="col-holder">Người đang giữ việc</th>
                  <th class="col-bottleneck">Thời gian ở trạng thái</th>
                  <th class="col-due">Hạn nộp</th>
                  <th class="col-prog">Tiến độ</th>
                  <th class="col-action"></th>
                </tr>
              </thead>
              <tbody>
                @for (task of tasksList(); track task.id) {
                  <tr class="task-table-row tap-target" (click)="openTaskDetail(task.id)">
                    <td class="col-code">
                      <span class="code-badge">{{ task.code || 'CV-' + task.id.slice(0, 4) }}</span>
                    </td>

                    <td class="col-title">
                      <div class="title-cell">
                        <div class="title-top">
                          <span class="priority-dot" [ngClass]="'prio-' + task.priority"></span>
                          <strong class="task-name">{{ task.title }}</strong>
                          @if (task.requireAttachment) {
                            <span class="attach-badge" title="Bắt buộc có minh chứng">
                              <span class="material-symbols-outlined">attach_file</span>
                            </span>
                          }
                        </div>
                        @if (task.plan) {
                          <span class="plan-sub">Kế hoạch: {{ task.plan.title }}</span>
                        }
                      </div>
                    </td>

                    <td class="col-loc">
                      <div class="loc-cell">
                        <span class="loc-name">{{ task.location?.name || 'Toàn trường' }}</span>
                        @if (task.orgUnit) {
                          <span class="org-name">{{ task.orgUnit.name }}</span>
                        }
                      </div>
                    </td>

                    <td class="col-status">
                      <app-status-badge [status]="task.status"></app-status-badge>
                    </td>

                    <!-- NGƯỜI ĐANG GIỮ VIỆC (ACTIONABLE OWNER) -->
                    <td class="col-holder" (click)="$event.stopPropagation()">
                      @if (getActionableHolder(task); as holder) {
                        <div
                          class="holder-chip tap-target"
                          (click)="openUserContact(holder, $event)"
                          [title]="'Liên hệ người xử lý: ' + holder.fullName"
                        >
                          <img
                            [src]="holder.avatarUrl || 'assets/images/default-avatar.svg'"
                            class="holder-avatar"
                            [alt]="holder.fullName"
                          />
                          <div class="holder-info">
                            <span class="holder-name">{{ holder.fullName }}</span>
                            <span class="holder-role">{{ holder.roleLabel }}</span>
                          </div>
                          @if (holder.phone) {
                            <a
                              [href]="'tel:' + holder.phone"
                              class="call-btn-mini"
                              (click)="$event.stopPropagation()"
                              [title]="'Gọi ngay: ' + holder.phone"
                            >
                              <span class="material-symbols-outlined">call</span>
                              <span class="call-phone-text">{{ holder.phone }}</span>
                            </a>
                          }
                        </div>
                      } @else {
                        <span class="unassigned-text">Chưa rõ</span>
                      }
                    </td>

                    <!-- SỐ NGÀY Ở TRẠNG THÁI HIỆN TẠI (ĐIỂM NGHẼN) -->
                    <td class="col-bottleneck">
                      @if (getDaysInCurrentStatus(task); as days) {
                        <div class="bottleneck-tag" [ngClass]="getBottleneckClass(days, task.status)">
                          <span class="material-symbols-outlined">timer</span>
                          <span>{{ days }} ngày</span>
                        </div>
                      }
                    </td>

                    <!-- HẠN HOÀN THÀNH -->
                    <td class="col-due">
                      <div class="due-box" [class.is-overdue]="isOverdue(task)">
                        <span class="material-symbols-outlined due-icon">event</span>
                        <span>{{ formatDate(task.dueDate) }}</span>
                      </div>
                    </td>

                    <!-- TIẾN ĐỘ % -->
                    <td class="col-prog">
                      <div class="prog-wrapper">
                        <div class="prog-bar-track">
                          <div
                            class="prog-bar-fill"
                            [style.width.%]="task.progressPercent || 0"
                          ></div>
                        </div>
                        <span class="prog-val">{{ task.progressPercent || 0 }}%</span>
                      </div>
                    </td>

                    <!-- ACTION ARROW -->
                    <td class="col-action" (click)="$event.stopPropagation()">
                      <button
                        type="button"
                        class="btn-open-detail tap-target"
                        (click)="openTaskDetail(task.id)"
                        title="Xem chi tiết việc"
                      >
                        <span class="material-symbols-outlined">chevron_right</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- MOBILE CARDS VIEW (<768px) -->
          <div class="mobile-cards-list">
            @for (task of tasksList(); track task.id) {
              <div class="mobile-task-card tap-target" (click)="openTaskDetail(task.id)">
                <div class="mobile-card-top">
                  <div class="tags-row">
                    <span class="code-badge">{{ task.code || 'CV-' + task.id.slice(0, 4) }}</span>
                    <app-status-badge [status]="task.status"></app-status-badge>
                    @if (isOverdue(task)) {
                      <span class="overdue-pill">QUÁ HẠN</span>
                    }
                  </div>
                  <span class="card-due-date">{{ formatDate(task.dueDate) }}</span>
                </div>

                <h3 class="card-task-title">{{ task.title }}</h3>

                <div class="card-holder-row" (click)="$event.stopPropagation()">
                  <span class="label">Đang giữ việc:</span>
                  @if (getActionableHolder(task); as holder) {
                    <div class="holder-chip-mini" (click)="openUserContact(holder, $event)">
                      <img [src]="holder.avatarUrl || 'assets/images/default-avatar.svg'" class="avatar-tiny" alt="" />
                      <span class="name">{{ holder.fullName }}</span>
                      @if (holder.phone) {
                        <a [href]="'tel:' + holder.phone" class="call-link" (click)="$event.stopPropagation()" [title]="'Gọi ngay: ' + holder.phone">
                          <span class="material-symbols-outlined">call</span>
                          <span class="call-phone-text">{{ holder.phone }}</span>
                        </a>
                      }
                    </div>
                  } @else {
                    <span class="unassigned-text">Chưa phân công</span>
                  }
                </div>

                <div class="card-bottom-row">
                  <div class="bottleneck-tag" [ngClass]="getBottleneckClass(getDaysInCurrentStatus(task), task.status)">
                    <span class="material-symbols-outlined">timer</span>
                    <span>Ở trạng thái: {{ getDaysInCurrentStatus(task) }} ngày</span>
                  </div>

                  <div class="prog-box-mini">
                    <span>{{ task.progressPercent || 0 }}%</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- TASK DETAIL MODAL (PROMPT 15) -->
      <app-task-detail-modal
        [taskId]="selectedTaskId()"
        (taskUpdated)="onTaskUpdated()"
        (closed)="onTaskDetailClosed()"
      ></app-task-detail-modal>

      <!-- TASK CREATE WIZARD (PROMPT 14) -->
      <app-task-create-wizard
        #taskWizard
        (taskCreated)="onTaskCreated()"
      ></app-task-create-wizard>
    </div>
  `,
  styles: [
    `
      .tasks-page-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
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
          .btn-create-task {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 20px;
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(31, 56, 100, 0.2);
            transition: all 0.15s ease;

            &:hover {
              background: #152644;
              transform: translateY(-1px);
            }
          }
        }
      }

      /* FILTER TOOLBAR */
      .filter-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 10px 16px;
        gap: 12px;
        flex-wrap: wrap;

        .search-box {
          position: relative;
          flex: 1;
          min-width: 240px;

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
            padding: 9px 36px 9px 38px;
            border: 1.5px solid #CBD5E1;
            border-radius: 8px;
            font-size: 0.88rem;
            font-family: inherit;
            color: #1E293B;
            box-sizing: border-box;

            &:focus {
              border-color: #1F3864;
              outline: none;
            }
          }

          .clear-search-btn {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 2px;
            display: flex;
          }
        }

        .filters-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;

          .filter-select {
            padding: 8px 12px;
            border: 1.5px solid #CBD5E1;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            color: #334155;
            background: #F8FAFC;
          }

          .btn-toggle-actionable {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: #F1F5F9;
            border: 1.5px solid #CBD5E1;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 700;
            color: #475569;
            cursor: pointer;
            transition: all 0.15s ease;

            .material-symbols-outlined {
              font-size: 18px;
            }

            &.active {
              background: #EEF4FC;
              border-color: #1F3864;
              color: #1F3864;
            }
          }
        }
      }

      /* TASKS CONTENT SECTION */
      .tasks-content-section {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
      }

      /* DESKTOP TABLE */
      .desktop-table-wrapper {
        overflow-x: auto;

        @media (max-width: 768px) {
          display: none;
        }
      }

      .tasks-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.88rem;

        th {
          padding: 10px 14px;
          background: #F8FAFC;
          color: #64748B;
          font-weight: 700;
          font-size: 0.82rem;
          border-bottom: 2px solid #E2E8F0;
        }

        td {
          padding: 12px 14px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }

        .task-table-row {
          cursor: pointer;
          transition: background-color 0.12s ease;

          &:hover {
            background-color: #F8FAFC;
          }

          &:last-child td {
            border-bottom: none;
          }
        }

        .col-code {
          width: 70px;

          .code-badge {
            font-family: monospace;
            font-size: 0.75rem;
            font-weight: 700;
            background: #EEF4FC;
            color: #1F3864;
            padding: 2px 6px;
            border-radius: 4px;
          }
        }

        .col-title {
          min-width: 260px;

          .title-cell {
            display: flex;
            flex-direction: column;
            gap: 2px;

            .title-top {
              display: flex;
              align-items: center;
              gap: 6px;

              .priority-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;

                &.prio-KHAN_CAP { background: #DC2626; }
                &.prio-CAO { background: #D97706; }
                &.prio-TRUNG_BINH { background: #3B82F6; }
                &.prio-THAP { background: #94A3B8; }
              }

              .task-name {
                font-weight: 700;
                color: #1E293B;
              }

              .attach-badge {
                color: #0284C7;
                display: flex;

                .material-symbols-outlined {
                  font-size: 16px;
                }
              }
            }

            .plan-sub {
              font-size: 0.75rem;
              color: #64748B;
              margin-left: 14px;
            }
          }
        }

        .col-loc {
          min-width: 140px;

          .loc-cell {
            display: flex;
            flex-direction: column;
            .loc-name { font-weight: 600; color: #334155; }
            .org-name { font-size: 0.75rem; color: #64748B; }
          }
        }

        .col-status {
          min-width: 120px;
        }

        .col-holder {
          min-width: 180px;

          .holder-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 4px 10px;
            background: #EEF4FC;
            border: 1px solid #BFDBFE;
            border-radius: 9999px;
            cursor: pointer;

            .holder-avatar {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              object-fit: cover;
            }

            .holder-info {
              display: flex;
              flex-direction: column;
              min-width: 0;

              .holder-name {
                font-size: 0.8rem;
                font-weight: 700;
                color: #1F3864;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100px;
              }

              .holder-role {
                font-size: 0.68rem;
                color: #64748B;
              }
            }

            .call-btn-mini {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 2px 7px;
              border-radius: 6px;
              background: #EEF4FC;
              border: 1px solid #BFDBFE;
              color: #1F3864;
              text-decoration: none;
              font-size: 0.72rem;
              font-weight: 600;
              white-space: nowrap;
              transition: all 0.15s ease;

              .material-symbols-outlined {
                font-size: 13px;
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

          .unassigned-text {
            color: #94A3B8;
            font-size: 0.8rem;
            font-style: italic;
          }
        }

        .col-bottleneck {
          min-width: 110px;

          .bottleneck-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.78rem;
            font-weight: 700;

            .material-symbols-outlined {
              font-size: 15px;
            }

            &.tag-normal { background: #F1F5F9; color: #475569; }
            &.tag-warning { background: #FEF3C7; color: #D97706; }
            &.tag-critical { background: #FEE2E2; color: #DC2626; }
          }
        }

        .col-due {
          min-width: 110px;

          .due-box {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.82rem;
            color: #475569;

            .due-icon {
              font-size: 16px;
              color: #94A3B8;
            }

            &.is-overdue {
              color: #DC2626;
              font-weight: 700;
              .due-icon { color: #DC2626; }
            }
          }
        }

        .col-prog {
          min-width: 90px;

          .prog-wrapper {
            display: flex;
            align-items: center;
            gap: 6px;

            .prog-bar-track {
              flex: 1;
              height: 6px;
              background: #E2E8F0;
              border-radius: 9999px;
              overflow: hidden;

              .prog-bar-fill {
                height: 100%;
                background: #1F3864;
                border-radius: 9999px;
              }
            }

            .prog-val {
              font-size: 0.75rem;
              font-weight: 700;
              color: #475569;
              width: 28px;
            }
          }
        }

        .col-action {
          width: 32px;
          text-align: right;

          .btn-open-detail {
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 4px;

            &:hover {
              color: #1F3864;
            }
          }
        }
      }

      /* MOBILE CARDS VIEW */
      .mobile-cards-list {
        display: none;
        flex-direction: column;
        gap: 10px;
        padding: 12px;

        @media (max-width: 768px) {
          display: flex;
        }

        .mobile-task-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;

          .mobile-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;

            .tags-row {
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .code-badge {
              font-family: monospace;
              font-size: 0.72rem;
              font-weight: 700;
              background: #EEF4FC;
              color: #1F3864;
              padding: 2px 4px;
              border-radius: 4px;
            }

            .overdue-pill {
              font-size: 0.68rem;
              font-weight: 800;
              background: #DC2626;
              color: #FFFFFF;
              padding: 1px 6px;
              border-radius: 4px;
            }

            .card-due-date {
              font-size: 0.78rem;
              color: #64748B;
              font-weight: 600;
            }
          }

          .card-task-title {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 700;
            color: #1E293B;
          }

          .card-holder-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.8rem;

            .label { color: #64748B; }

            .holder-chip-mini {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #EEF4FC;
              border-radius: 9999px;
              padding: 2px 8px;

              .avatar-tiny {
                width: 18px;
                height: 18px;
                border-radius: 50%;
              }

              .name {
                font-weight: 600;
                color: #1F3864;
              }

              .call-link {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                padding: 2px 6px;
                border-radius: 4px;
                background: #EEF4FC;
                color: #1F3864;
                text-decoration: none;
                font-size: 0.72rem;
                font-weight: 600;
                margin-left: 4px;

                .material-symbols-outlined {
                  font-size: 13px;
                  color: #1F3864;
                }

                &:hover {
                  background: #1F3864;
                  color: #FFFFFF;
                  .material-symbols-outlined { color: #FFFFFF; }
                }
              }
            }
          }

          .card-bottom-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 6px;
            border-top: 1px solid #F1F5F9;

            .prog-box-mini {
              font-size: 0.8rem;
              font-weight: 800;
              color: #1F3864;
            }
          }
        }
      }

      .loading-box,
      .empty-tasks-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 16px;
        text-align: center;
        color: #64748B;
      }

      .empty-tasks-box {
        .empty-icon {
          font-size: 48px;
          color: #CBD5E1;
          margin-bottom: 8px;
        }

        h3 { margin: 0; font-size: 1.1rem; color: #1E293B; }
        p { margin: 4px 0 16px 0; font-size: 0.88rem; }

        .btn-create-empty {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          background: #1F3864;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
      }

      .tasks-skeleton-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;

        .task-skeleton-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;

          .skeleton-col-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .skeleton-col-meta {
            width: 140px;
          }

          .skeleton-col-status {
            width: 110px;
          }
        }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class TasksComponent implements OnInit, OnDestroy {
  taskService = inject(TaskService);
  userService = inject(UserService);
  authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private contactCardService = inject(ContactCardService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChild('taskWizard') taskWizard!: TaskCreateWizardComponent;

  isLoading = signal(true);
  tasksList = signal<TaskItem[]>([]);
  totalTasks = signal(0);

  // Status Tabs Counter
  activeStatusTab = signal<string>('ALL');
  statusTabs = signal<StatusTabItem[]>([
    { key: 'ALL', label: 'Tất cả', count: 0 },
    { key: 'MOI', label: 'Mới', count: 0 },
    { key: 'DANG_THUC_HIEN', label: 'Đang thực hiện', count: 0 },
    { key: 'CHO_KIEM_TRA', label: 'Chờ kiểm tra', count: 0 },
    { key: 'CHO_PHE_DUYET', label: 'Chờ phê duyệt', count: 0 },
    { key: 'BO_SUNG', label: 'Bổ sung', count: 0 },
    { key: 'DONG', label: 'Đã đóng', count: 0 },
  ]);

  // Filters
  searchQuery = '';
  filterLocationId = '';
  filterOrgUnitId = '';
  filterPriority = '';
  filterOnlyMyAction = signal(false);

  // Options
  locations = signal<LocationItem[]>([]);
  orgUnits = signal<OrgUnitItem[]>([]);

  // Task Detail Modal State
  selectedTaskId = signal<string | null>(null);

  private accountSub?: Subscription;

  ngOnInit() {
    this.loadFilterOptions();
    this.loadTasks();
    this.loadTabCounters();

    // Subscribe to switchDemoAccount to reload data immediately
    this.accountSub = this.authService.accountSwitched$.subscribe(() => {
      this.loadTasks();
    });

    // Check query params for direct task opening (e.g. ?taskId=...) or create wizard (?create=true)
    this.route.queryParams.subscribe((params) => {
      if (params['taskId']) {
        this.selectedTaskId.set(params['taskId']);
      }
      if (params['create'] === 'true') {
        setTimeout(() => {
          this.openCreateWizard();
          this.router.navigate([], { queryParams: { create: null }, queryParamsHandling: 'merge' });
        }, 150);
      }
    });
  }

  ngOnDestroy() {
    this.accountSub?.unsubscribe();
  }

  private loadFilterOptions() {
    this.userService.getLocations().subscribe({
      next: (locs) => this.locations.set(locs),
      error: () => {},
    });

    this.userService.getOrgUnits().subscribe({
      next: (orgs) => this.orgUnits.set(orgs),
      error: () => {},
    });
  }

  loadTabCounters() {
    this.dashboardService.getOverview({
      locationId: this.filterLocationId || undefined,
      orgUnitId: this.filterOrgUnitId || undefined,
    }).subscribe({
      next: (overview) => {
        const bs = overview.byStatus || {};
        this.statusTabs.update((tabs) =>
          tabs.map((tab) => {
            let cnt = 0;
            switch (tab.key) {
              case 'ALL':
                cnt = overview.totalTasks;
                break;
              case 'MOI':
                cnt = (bs.NHAP || 0) + (bs.DA_GIAO || 0);
                break;
              case 'DANG_THUC_HIEN':
                cnt = (bs.DA_TIEP_NHAN || 0) + (bs.DANG_THUC_HIEN || 0);
                break;
              case 'CHO_KIEM_TRA':
                cnt = bs.CHO_KIEM_TRA || 0;
                break;
              case 'CHO_PHE_DUYET':
                cnt = (bs.HOAN_THANH || 0) + (bs.XAC_NHAN || 0);
                break;
              case 'BO_SUNG':
                cnt = bs.BO_SUNG || 0;
                break;
              case 'DONG':
                cnt = bs.DONG || 0;
                break;
            }
            return { ...tab, count: cnt };
          })
        );
      },
      error: () => {},
    });
  }

  loadTasks() {
    this.isLoading.set(true);
    this.loadTabCounters();

    const params: TaskFilterParams = {
      search: this.searchQuery || undefined,
      locationId: this.filterLocationId || undefined,
      orgUnitId: this.filterOrgUnitId || undefined,
      priority: this.filterPriority || undefined,
      pageSize: 50,
    };

    // Map active status tab to filter param
    if (this.activeStatusTab() === 'MOI') {
      params.status = 'DA_GIAO';
    } else if (this.activeStatusTab() === 'DANG_THUC_HIEN') {
      params.status = 'DANG_THUC_HIEN';
    } else if (this.activeStatusTab() === 'CHO_KIEM_TRA') {
      params.status = 'CHO_KIEM_TRA';
    } else if (this.activeStatusTab() === 'CHO_PHE_DUYET') {
      params.status = 'HOAN_THANH';
    } else if (this.activeStatusTab() === 'BO_SUNG') {
      params.status = 'BO_SUNG';
    } else if (this.activeStatusTab() === 'DONG') {
      params.status = 'DONG';
    }

    this.taskService.getTasks(params).subscribe({
      next: (res) => {
        let items = res.items || [];

        // If "Chờ tôi xử lý" filter is active, filter client-side
        if (this.filterOnlyMyAction()) {
          const currentUserId = this.authService.currentUser()?.id;
          items = items.filter((t) => {
            const holder = this.getActionableHolder(t);
            return holder && holder.id === currentUserId;
          });
        }

        this.tasksList.set(items);
        this.totalTasks.set(res.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onTabChange(tabKey: string) {
    this.activeStatusTab.set(tabKey);
    this.loadTasks();
  }

  onSearchChange() {
    this.loadTasks();
  }

  toggleOnlyMyAction() {
    this.filterOnlyMyAction.update((v) => !v);
    this.loadTasks();
  }

  openCreateWizard() {
    if (this.taskWizard) {
      this.taskWizard.openWithData({});
    }
  }

  onTaskCreated() {
    this.loadTasks();
  }

  openTaskDetail(id: string) {
    this.selectedTaskId.set(id);
    this.router.navigate([], { queryParams: { taskId: id }, queryParamsHandling: 'merge' });
  }

  onTaskDetailClosed() {
    this.selectedTaskId.set(null);
    this.router.navigate([], { queryParams: { taskId: null }, queryParamsHandling: 'merge' });
  }

  onTaskUpdated() {
    this.loadTasks();
  }

  openUserContact(user: any, event: Event) {
    event.stopPropagation();
    if (user && user.id) {
      this.contactCardService.open(user.id);
    }
  }

  /**
   * Tính toán người ĐANG GIỮ VIỆC (Người cần hành động tiếp theo theo RACI)
   */
  getActionableHolder(task: TaskItem): { id: string; fullName: string; phone: string; avatarUrl?: string | null; roleLabel: string } | null {
    if (!task.assignments || task.assignments.length === 0) return null;

    const chuTri = task.assignments.find((a) => a.role === 'CHU_TRI')?.user;
    const kiemTra = task.assignments.find((a) => a.role === 'KIEM_TRA')?.user;
    const pheDuyet = task.assignments.find((a) => a.role === 'PHE_DUYET')?.user;

    switch (task.status) {
      case 'NHAP':
      case 'DA_GIAO':
      case 'DA_TIEP_NHAN':
      case 'DANG_THUC_HIEN':
      case 'BO_SUNG':
        return chuTri ? { ...chuTri, roleLabel: 'Chủ trì thực hiện' } : null;

      case 'CHO_KIEM_TRA':
        return kiemTra
          ? { ...kiemTra, roleLabel: 'Kiểm tra / Nghiệm thu' }
          : chuTri
            ? { ...chuTri, roleLabel: 'Chờ duyệt' }
            : null;

      case 'HOAN_THANH':
      case 'XAC_NHAN':
        return pheDuyet
          ? { ...pheDuyet, roleLabel: 'Phê duyệt đóng' }
          : { id: task.createdById, fullName: task.createdBy?.fullName || 'Người giao việc', phone: task.createdBy?.phone || '', avatarUrl: task.createdBy?.avatarUrl, roleLabel: 'Người giao' };

      default:
        return chuTri ? { ...chuTri, roleLabel: 'Chủ trì' } : null;
    }
  }

  /**
   * Tính số ngày đã ở trạng thái hiện tại (Điểm nghẽn)
   */
  getDaysInCurrentStatus(task: TaskItem): number {
    const refDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt);
    const diffMs = Date.now() - refDate.getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  getBottleneckClass(days: number, status: TaskStatus): string {
    if (status === 'HOAN_THANH' || status === 'DONG') return 'tag-normal';
    if (days >= 5) return 'tag-critical';
    if (days >= 3) return 'tag-warning';
    return 'tag-normal';
  }

  formatDate(d?: string | Date | null): string {
    if (!d) return 'Chưa đặt';
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  isOverdue(task: TaskItem): boolean {
    if (!task.dueDate) return false;
    if (task.status === 'HOAN_THANH' || task.status === 'XAC_NHAN' || task.status === 'DONG') return false;
    return new Date(task.dueDate).getTime() < Date.now();
  }
}
