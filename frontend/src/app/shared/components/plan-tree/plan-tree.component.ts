import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlanTreeNode, PlanLevel } from '../../../core/models/plan.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { ContactCardService } from '../../../core/services/contact-card.service';

@Component({
  selector: 'app-plan-tree',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  template: `
    <div class="plan-tree-container">
      @if (nodes.length === 0) {
        <div class="friendly-empty-state">
          <svg class="empty-svg-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="#EEF4FC" />
            <path d="M60 30V48M40 70H80M40 70V88M80 70V88M60 48H40V70M60 48H80" stroke="#1F3864" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="52" y="24" width="16" height="12" rx="3" fill="#1F3864" />
            <rect x="32" y="86" width="16" height="12" rx="3" fill="#2E7D32" />
            <rect x="72" y="86" width="16" height="12" rx="3" fill="#2E7D32" />
          </svg>
          <h3 class="empty-state-title">Chưa có dữ liệu cây kế hoạch!</h3>
          <p class="empty-state-desc">
            Bắt đầu lập các mốc kế hoạch Năm, Học kỳ, Tháng hoặc số hóa kế hoạch giáo viên để theo dõi tiến độ toàn trường.
          </p>
        </div>
      } @else {
        <div class="tree-nodes-list">
          @for (node of nodes; track node.id) {
            <div class="plan-node-wrapper" [class.is-root]="isRoot" [class.is-expanded]="isExpanded(node.id)">
              <!-- NODE HEADER CARD -->
              <div
                class="plan-node-card"
                [ngClass]="'level-' + node.level.toLowerCase()"
                (click)="toggleNode(node.id, $event)"
              >
                <!-- EXPAND/COLLAPSE CHEVRON -->
                <button
                  type="button"
                  class="chevron-btn tap-target"
                  [class.has-children]="hasChildrenOrTasks(node)"
                  (click)="toggleNode(node.id, $event)"
                  aria-label="Thu gọn/mở rộng"
                >
                  @if (hasChildrenOrTasks(node)) {
                    <span class="material-symbols-outlined chevron-icon">
                      {{ isExpanded(node.id) ? 'keyboard_arrow_down' : 'chevron_right' }}
                    </span>
                  } @else {
                    <span class="leaf-dot"></span>
                  }
                </button>

                <!-- LEVEL BADGE -->
                <div class="level-badge-tag" [ngClass]="'badge-' + node.level.toLowerCase()">
                  <span class="material-symbols-outlined level-icon">{{ getLevelIcon(node.level) }}</span>
                  <span class="level-text">{{ getLevelLabel(node.level) }}</span>
                </div>

                <!-- MAIN INFO -->
                <div class="node-main-info">
                  <div class="node-title-row">
                    <h4 class="node-title">{{ node.title }}</h4>
                    @if (node.description) {
                      <span class="node-desc-preview" [title]="node.description">
                        — {{ node.description }}
                      </span>
                    }
                  </div>

                  <!-- TIME RANGE & METRICS -->
                  <div class="node-meta-row">
                    <div class="meta-item time-range">
                      <span class="material-symbols-outlined meta-icon">calendar_month</span>
                      <span>{{ formatDateRange(node.startDate, node.endDate) }}</span>
                    </div>

                    <div class="meta-item task-counter" [class.has-tasks]="node.taskCount > 0">
                      <span class="material-symbols-outlined meta-icon">task_alt</span>
                      <span>
                        <strong>{{ node.completedTaskCount }}</strong>/{{ node.taskCount }} việc hoàn thành
                      </span>
                    </div>

                    @if (node.children && node.children.length > 0) {
                      <div class="meta-item subplan-counter">
                        <span class="material-symbols-outlined meta-icon">folder_open</span>
                        <span>{{ node.children.length }} kế hoạch con</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- PROGRESS BAR & % -->
                <div class="node-progress-section" (click)="$event.stopPropagation()">
                  <div class="progress-info-row">
                    <span class="progress-label">Tiến độ</span>
                    <strong class="progress-percent" [style.color]="getProgressColor(node.progressPercent, node.endDate)">
                      {{ node.progressPercent || 0 }}%
                    </strong>
                  </div>
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      [style.width.%]="node.progressPercent || 0"
                      [style.background-color]="getProgressColor(node.progressPercent, node.endDate)"
                    ></div>
                  </div>
                </div>

                <!-- ACTIONS -->
                <div class="node-actions" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="action-btn btn-add-task tap-target"
                    title="Tạo việc từ mốc kế hoạch này"
                    (click)="onAddChildTask(node)"
                  >
                    <span class="material-symbols-outlined">add_task</span>
                    <span class="action-btn-text">Giao việc</span>
                  </button>

                  <button
                    type="button"
                    class="action-btn btn-more tap-target"
                    title="Thao tác"
                    (click)="onNodeMenu(node, $event)"
                  >
                    <span class="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>

              <!-- EXPANDED CONTENT (SUB-PLANS & CHILD TASKS) -->
              @if (isExpanded(node.id)) {
                <div class="node-expanded-body">
                  <!-- 1. CHILD TASKS IN THIS NODE -->
                  @if (node.tasks && node.tasks.length > 0) {
                    <div class="child-tasks-section">
                      <div class="child-section-header">
                        <div class="section-title">
                          <span class="material-symbols-outlined">checklist</span>
                          <span>Danh sách công việc trực thuộc ({{ node.tasks.length }})</span>
                        </div>
                        <button
                          type="button"
                          class="inline-add-task-btn"
                          (click)="onAddChildTask(node)"
                        >
                          <span class="material-symbols-outlined">add</span>
                          <span>Thêm việc</span>
                        </button>
                      </div>

                      <!-- DESKTOP TABLE -->
                      <div class="tasks-table-container hide-on-mobile">
                        <table class="child-tasks-table">
                          <thead>
                            <tr>
                              <th class="col-title">Tên công việc</th>
                              <th class="col-location">Điểm trường / Tổ</th>
                              <th class="col-raci">Chủ trì (RACI)</th>
                              <th class="col-due">Hạn nộp</th>
                              <th class="col-status">Trạng thái</th>
                              <th class="col-progress">Tiến độ</th>
                              <th class="col-action"></th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (task of node.tasks; track task.id) {
                              <tr class="task-row tap-target" (click)="onTaskClick(task)">
                                <td class="col-title">
                                  <div class="task-title-cell">
                                    <span class="task-name">{{ task.title }}</span>
                                    @if (task.requireAttachment) {
                                      <span class="badge-attachment" title="Bắt buộc nộp minh chứng">
                                        <span class="material-symbols-outlined">attach_file</span>
                                      </span>
                                    }
                                  </div>
                                </td>
                                <td class="col-location">
                                  <div class="location-cell">
                                    <span class="loc-tag">{{ task.location?.name || 'Toàn trường' }}</span>
                                    @if (task.orgUnit) {
                                      <span class="org-sub">{{ task.orgUnit.name }}</span>
                                    }
                                  </div>
                                </td>
                                <td class="col-raci" (click)="$event.stopPropagation()">
                                  @if (getChuTriUser(task); as chuTri) {
                                    <div
                                      class="chu-tri-chip tap-target"
                                      (click)="openUserContact(chuTri, $event)"
                                      [title]="'Xem liên hệ: ' + chuTri.fullName"
                                    >
                                      <img
                                        [src]="chuTri.avatarUrl || 'assets/images/default-avatar.svg'"
                                        class="user-avatar-mini"
                                        [alt]="chuTri.fullName"
                                      />
                                      <span class="user-name">{{ chuTri.fullName }}</span>
                                      <a
                                        [href]="'tel:' + chuTri.phone"
                                        class="quick-call-link"
                                        title="Gọi ngay"
                                        (click)="$event.stopPropagation()"
                                      >
                                        <span class="material-symbols-outlined">call</span>
                                      </a>
                                    </div>
                                  } @else {
                                    <span class="unassigned-text">Chưa phân công</span>
                                  }
                                </td>
                                <td class="col-due">
                                  <div class="due-cell" [class.is-overdue]="isTaskOverdue(task)">
                                    <span class="material-symbols-outlined date-icon">schedule</span>
                                    <span>{{ formatDueDate(task.dueDate) }}</span>
                                  </div>
                                </td>
                                <td class="col-status">
                                  <app-status-badge [status]="task.status"></app-status-badge>
                                </td>
                                <td class="col-progress">
                                  <div class="task-progress-box">
                                    <div class="task-prog-track">
                                      <div
                                        class="task-prog-fill"
                                        [style.width.%]="task.progressPercent || 0"
                                      ></div>
                                    </div>
                                    <span class="task-prog-text">{{ task.progressPercent || 0 }}%</span>
                                  </div>
                                </td>
                                <td class="col-action" (click)="$event.stopPropagation()">
                                  <button
                                    type="button"
                                    class="view-task-arrow-btn"
                                    (click)="onTaskClick(task)"
                                    title="Xem chi tiết việc"
                                  >
                                    <span class="material-symbols-outlined">arrow_forward</span>
                                  </button>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>

                      <!-- MOBILE CARDS LIST (<768px) -->
                      <div class="child-tasks-cards-mobile hide-on-desktop">
                        @for (task of node.tasks; track task.id) {
                          <div class="child-task-card-m tap-target" (click)="onTaskClick(task)">
                            <div class="card-m-top">
                              <span class="m-title">{{ task.title }}</span>
                              <app-status-badge [status]="task.status"></app-status-badge>
                            </div>
                            <div class="card-m-meta">
                              <span class="m-loc">{{ task.location?.name || 'Toàn trường' }}</span>
                              <span class="m-due" [class.is-overdue]="isTaskOverdue(task)">Hạn: {{ formatDueDate(task.dueDate) }}</span>
                            </div>
                            @if (getChuTriUser(task); as chuTri) {
                              <div class="card-m-holder" (click)="$event.stopPropagation()">
                                <span class="m-holder-label">Chủ trì:</span>
                                <div class="m-holder-chip" (click)="openUserContact(chuTri, $event)">
                                  <img [src]="chuTri.avatarUrl || 'assets/images/default-avatar.svg'" class="m-avatar" alt="" />
                                  <span class="m-name">{{ chuTri.fullName }}</span>
                                  <a [href]="'tel:' + chuTri.phone" class="m-call" (click)="$event.stopPropagation()" title="Gọi ngay">
                                    <span class="material-symbols-outlined">call</span>
                                  </a>
                                </div>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- 2. RECURSIVE SUB-PLANS (Năm -> Kỳ -> Quý -> Tháng -> Tuần) -->
                  @if (node.children && node.children.length > 0) {
                    <div class="nested-subplans">
                      <app-plan-tree
                        [nodes]="node.children"
                        [isRoot]="false"
                        (taskSelected)="taskSelected.emit($event)"
                        (createTaskForPlan)="createTaskForPlan.emit($event)"
                        (editPlan)="editPlan.emit($event)"
                        (deletePlan)="deletePlan.emit($event)"
                        (addChildPlan)="addChildPlan.emit($event)"
                      ></app-plan-tree>
                    </div>
                  }

                  <!-- 3. EMPTY STATE IN EXPANDED NODE -->
                  @if ((!node.tasks || node.tasks.length === 0) && (!node.children || node.children.length === 0)) {
                    <div class="node-empty-content">
                      <p>Chưa có kế hoạch con hoặc công việc nào trong mốc này.</p>
                      <div class="empty-node-actions">
                        <button type="button" class="btn-create-sub-action" (click)="onAddChildTask(node)">
                          <span class="material-symbols-outlined">add_task</span>
                          <span>Giao việc mới</span>
                        </button>
                        <button type="button" class="btn-create-sub-action secondary" (click)="onAddChildPlan(node)">
                          <span class="material-symbols-outlined">create_new_folder</span>
                          <span>Thêm cấp con ({{ getNextLevelLabel(node.level) }})</span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .plan-tree-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
      }

      .empty-tree-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 16px;
        background: #FFFFFF;
        border-radius: 16px;
        border: 2px dashed #E2E8F0;
        color: #94A3B8;
        text-align: center;

        .empty-icon {
          font-size: 48px;
          margin-bottom: 8px;
          color: #CBD5E1;
        }

        .empty-text {
          font-size: 0.95rem;
          font-weight: 500;
        }
      }

      .tree-nodes-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      /* NODE WRAPPER */
      .plan-node-wrapper {
        border-radius: 14px;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        transition: all 0.2s ease;
        overflow: hidden;

        &.is-root {
          border-left: 5px solid #1F3864;
          box-shadow: 0 4px 12px rgba(31, 56, 100, 0.06);
        }

        &.is-expanded {
          border-color: #BFDBFE;
          box-shadow: 0 6px 18px rgba(31, 56, 100, 0.08);
        }
      }

      /* NODE CARD (HEADER) */
      .plan-node-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: #FFFFFF;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.15s ease;

        &:hover {
          background-color: #F8FAFC;
        }

        @media (max-width: 900px) {
          flex-wrap: wrap;
          gap: 10px;
        }
      }

      /* CHEVRON */
      .chevron-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #F1F5F9;
        border: none;
        border-radius: 8px;
        color: #475569;
        cursor: pointer;
        flex-shrink: 0;
        transition: background-color 0.15s ease;

        &:hover {
          background: #E2E8F0;
        }

        .chevron-icon {
          font-size: 20px;
        }

        .leaf-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #94A3B8;
        }
      }

      /* LEVEL BADGES */
      .level-badge-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.3px;
        flex-shrink: 0;

        .level-icon {
          font-size: 16px;
        }

        &.badge-nam {
          background: #1F3864;
          color: #FFFFFF;
        }

        &.badge-hoc_ky {
          background: #2E5EAA;
          color: #FFFFFF;
        }

        &.badge-quy {
          background: #0284C7;
          color: #FFFFFF;
        }

        &.badge-thang {
          background: #0D9488;
          color: #FFFFFF;
        }

        &.badge-tuan {
          background: #7C3AED;
          color: #FFFFFF;
        }
      }

      /* MAIN INFO */
      .node-main-info {
        flex: 1;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .node-title-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;

          .node-title {
            margin: 0;
            font-size: 1rem;
            font-weight: 700;
            color: #1E293B;
          }

          .node-desc-preview {
            font-size: 0.85rem;
            color: #64748B;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 350px;
          }
        }

        .node-meta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;

          .meta-item {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.82rem;
            color: #64748B;

            .meta-icon {
              font-size: 16px;
              color: #94A3B8;
            }

            &.task-counter.has-tasks {
              color: #1F3864;
              font-weight: 600;
              .meta-icon {
                color: #2E7D32;
              }
            }
          }
        }
      }

      /* PROGRESS SECTION */
      .node-progress-section {
        width: 140px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;

        @media (max-width: 600px) {
          width: 100%;
          order: 3;
        }

        .progress-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.78rem;

          .progress-label {
            color: #64748B;
            font-weight: 500;
          }

          .progress-percent {
            font-size: 0.88rem;
            font-weight: 800;
          }
        }

        .progress-track {
          width: 100%;
          height: 7px;
          background: #E2E8F0;
          border-radius: 9999px;
          overflow: hidden;

          .progress-fill {
            height: 100%;
            border-radius: 9999px;
            transition: width 0.3s ease;
          }
        }
      }

      /* ACTIONS */
      .node-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;

          &.btn-add-task {
            background: #EEF4FC;
            color: #1F3864;
            border: 1px solid #BFDBFE;

            &:hover {
              background: #DBEAFE;
              color: #152644;
            }
          }

          &.btn-more {
            background: transparent;
            color: #64748B;
            padding: 6px 8px;

            &:hover {
              background: #F1F5F9;
              color: #1E293B;
            }
          }
        }
      }

      /* EXPANDED CONTENT BODY */
      .node-expanded-body {
        padding: 16px;
        background: #F8FAFC;
        border-top: 1px solid #E2E8F0;
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: fadeIn 0.15s ease-out;
      }

      /* CHILD TASKS SECTION */
      .child-tasks-section {
        background: #FFFFFF;
        border-radius: 12px;
        border: 1px solid #E2E8F0;
        overflow: hidden;

        .child-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #F1F5F9;
          border-bottom: 1px solid #E2E8F0;

          .section-title {
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

          .inline-add-task-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.78rem;
            font-weight: 700;
            color: #1F3864;
            background: #FFFFFF;
            border: 1px solid #CBD5E1;
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;

            &:hover {
              background: #EEF4FC;
            }
          }
        }
      }

      .tasks-table-container {
        overflow-x: auto;
      }

      .child-tasks-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.85rem;

        th {
          padding: 8px 12px;
          font-weight: 600;
          color: #64748B;
          border-bottom: 1px solid #E2E8F0;
          background: #FAFAFA;
        }

        td {
          padding: 10px 12px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }

        .task-row {
          cursor: pointer;
          transition: background-color 0.12s ease;

          &:hover {
            background-color: #F8FAFC;
          }

          &:last-child td {
            border-bottom: none;
          }
        }

        .col-title {
          min-width: 220px;

          .task-title-cell {
            display: flex;
            align-items: center;
            gap: 6px;

            .task-name {
              font-weight: 600;
              color: #1E293B;
            }

            .badge-attachment {
              color: #0284C7;
              display: inline-flex;
              align-items: center;

              .material-symbols-outlined {
                font-size: 16px;
              }
            }
          }
        }

        .col-location {
          min-width: 130px;

          .location-cell {
            display: flex;
            flex-direction: column;

            .loc-tag {
              font-weight: 600;
              color: #334155;
            }

            .org-sub {
              font-size: 0.75rem;
              color: #64748B;
            }
          }
        }

        .col-raci {
          min-width: 160px;

          .chu-tri-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 8px;
            background: #EEF4FC;
            border-radius: 9999px;
            border: 1px solid #BFDBFE;
            font-size: 0.8rem;
            cursor: pointer;

            .user-avatar-mini {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              object-fit: cover;
            }

            .user-name {
              font-weight: 600;
              color: #1F3864;
              max-width: 100px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .quick-call-link {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #2E7D32;
              color: #FFFFFF;
              text-decoration: none;

              .material-symbols-outlined {
                font-size: 13px;
              }

              &:hover {
                background: #1B5E20;
              }
            }
          }

          .unassigned-text {
            color: #94A3B8;
            font-style: italic;
            font-size: 0.8rem;
          }
        }

        .col-due {
          min-width: 110px;

          .due-cell {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: #475569;
            font-weight: 500;

            .date-icon {
              font-size: 15px;
              color: #94A3B8;
            }

            &.is-overdue {
              color: #C62828;
              font-weight: 700;

              .date-icon {
                color: #C62828;
              }
            }
          }
        }

        .col-status {
          min-width: 120px;
        }

        .col-progress {
          min-width: 100px;

          .task-progress-box {
            display: flex;
            align-items: center;
            gap: 6px;

            .task-prog-track {
              flex: 1;
              height: 5px;
              background: #E2E8F0;
              border-radius: 9999px;
              overflow: hidden;

              .task-prog-fill {
                height: 100%;
                background: #1F3864;
                border-radius: 9999px;
              }
            }

            .task-prog-text {
              font-size: 0.75rem;
              font-weight: 700;
              color: #475569;
              width: 28px;
            }
          }
        }

        .col-action {
          width: 40px;
          text-align: center;

          .view-task-arrow-btn {
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;

            &:hover {
              color: #1F3864;
              background: #EEF4FC;
            }
          }
        }
      }

      /* MOBILE CHILD TASKS CARDS */
      .child-tasks-cards-mobile {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;

        .child-task-card-m {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;

          .card-m-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 8px;

            .m-title {
              font-size: 0.9rem;
              font-weight: 700;
              color: #1E293B;
              line-height: 1.3;
            }
          }

          .card-m-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.76rem;
            color: #64748B;

            .m-loc { font-weight: 600; color: #334155; }
            .m-due {
              &.is-overdue { color: #DC2626; font-weight: 700; }
            }
          }

          .card-m-holder {
            display: flex;
            align-items: center;
            gap: 6px;
            padding-top: 4px;
            border-top: 1px solid #F1F5F9;
            font-size: 0.76rem;

            .m-holder-label { color: #64748B; }

            .m-holder-chip {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              background: #EEF4FC;
              padding: 2px 6px;
              border-radius: 9999px;

              .m-avatar {
                width: 18px;
                height: 18px;
                border-radius: 50%;
              }

              .m-name {
                font-weight: 600;
                color: #1F3864;
              }

              .m-call {
                color: #2E7D32;
                display: flex;
                .material-symbols-outlined { font-size: 13px; }
              }
            }
          }
        }
      }

      /* NESTED SUB-PLANS */
      .nested-subplans {
        margin-left: 20px;
        padding-left: 12px;
        border-left: 2px solid #CBD5E1;

        @media (max-width: 600px) {
          margin-left: 6px;
          padding-left: 6px;
        }
      }

      /* EMPTY STATE INSIDE EXPANDED NODE */
      .node-empty-content {
        padding: 16px;
        background: #FFFFFF;
        border-radius: 10px;
        border: 1px dashed #CBD5E1;
        text-align: center;
        color: #64748B;
        font-size: 0.85rem;

        p {
          margin: 0 0 10px 0;
        }

        .empty-node-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;

          .btn-create-sub-action {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;

            &.secondary {
              background: #EEF4FC;
              color: #1F3864;
              border: 1px solid #BFDBFE;
            }

            &:hover {
              opacity: 0.9;
            }
          }
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
  ],
})
export class PlanTreeComponent {
  private router = inject(Router);
  private contactCardService = inject(ContactCardService);

  @Input() nodes: PlanTreeNode[] = [];
  @Input() isRoot = true;

  @Output() taskSelected = new EventEmitter<any>();
  @Output() createTaskForPlan = new EventEmitter<PlanTreeNode>();
  @Output() editPlan = new EventEmitter<PlanTreeNode>();
  @Output() deletePlan = new EventEmitter<PlanTreeNode>();
  @Output() addChildPlan = new EventEmitter<PlanTreeNode>();

  // Track expanded state of nodes by ID
  expandedNodeIds = signal<Set<string>>(new Set<string>());

  hasChildrenOrTasks(node: PlanTreeNode): boolean {
    const hasKids = !!(node.children && node.children.length > 0);
    const hasTasks = !!(node.tasks && node.tasks.length > 0);
    return hasKids || hasTasks;
  }

  isExpanded(nodeId: string): boolean {
    return this.expandedNodeIds().has(nodeId);
  }

  toggleNode(nodeId: string, event: Event) {
    event.stopPropagation();
    const current = new Set(this.expandedNodeIds());
    if (current.has(nodeId)) {
      current.delete(nodeId);
    } else {
      current.add(nodeId);
    }
    this.expandedNodeIds.set(current);
  }

  expandAll() {
    const allIds = new Set<string>();
    const collect = (list: PlanTreeNode[]) => {
      list.forEach((n) => {
        allIds.add(n.id);
        if (n.children && n.children.length > 0) collect(n.children);
      });
    };
    collect(this.nodes);
    this.expandedNodeIds.set(allIds);
  }

  collapseAll() {
    this.expandedNodeIds.set(new Set<string>());
  }

  getLevelLabel(level: PlanLevel): string {
    switch (level) {
      case 'NAM': return 'KẾ HOẠCH NĂM';
      case 'HOC_KY': return 'HỌC KỲ';
      case 'QUY': return 'QUÝ';
      case 'THANG': return 'THÁNG';
      case 'TUAN': return 'TUẦN';
      default: return level;
    }
  }

  getNextLevelLabel(level: PlanLevel): string {
    switch (level) {
      case 'NAM': return 'Học kỳ';
      case 'HOC_KY': return 'Tháng / Quý';
      case 'QUY': return 'Tháng';
      case 'THANG': return 'Tuần';
      case 'TUAN': return 'Công việc';
      default: return 'Cấp con';
    }
  }

  getLevelIcon(level: PlanLevel): string {
    switch (level) {
      case 'NAM': return 'calendar_today';
      case 'HOC_KY': return 'school';
      case 'QUY': return 'pie_chart';
      case 'THANG': return 'calendar_month';
      case 'TUAN': return 'date_range';
      default: return 'folder';
    }
  }

  formatDateRange(startStr?: string | Date, endStr?: string | Date): string {
    if (!startStr || !endStr) return '';
    const s = new Date(startStr);
    const e = new Date(endStr);
    const sFormatted = `${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')}/${s.getFullYear()}`;
    const eFormatted = `${String(e.getDate()).padStart(2, '0')}/${String(e.getMonth() + 1).padStart(2, '0')}/${e.getFullYear()}`;
    return `${sFormatted} — ${eFormatted}`;
  }

  formatDueDate(dateStr?: string | Date): string {
    if (!dateStr) return 'Chưa đặt';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  getProgressColor(percent: number = 0, endDate?: string | Date): string {
    if (percent >= 80) return '#2E7D32'; // Green
    if (endDate && new Date(endDate).getTime() < Date.now() && percent < 100) {
      return '#C62828'; // Overdue Red
    }
    if (percent >= 50) return '#1F3864'; // Deep Navy
    if (percent > 0) return '#F0A500'; // Amber Warning
    return '#94A3B8'; // Slate
  }

  getChuTriUser(task: any): any | null {
    if (!task || !task.assignments) return null;
    const chuTriAssignment = task.assignments.find((a: any) => a.role === 'CHU_TRI');
    return chuTriAssignment?.user || null;
  }

  isTaskOverdue(task: any): boolean {
    if (!task.dueDate) return false;
    if (task.status === 'HOAN_THANH' || task.status === 'XAC_NHAN' || task.status === 'DONG') {
      return false;
    }
    return new Date(task.dueDate).getTime() < Date.now();
  }

  openUserContact(user: any, event: Event) {
    event.stopPropagation();
    if (user && user.id) {
      this.contactCardService.open(user.id);
    }
  }

  onAddChildTask(node: PlanTreeNode) {
    this.createTaskForPlan.emit(node);
  }

  onAddChildPlan(node: PlanTreeNode) {
    this.addChildPlan.emit(node);
  }

  onNodeMenu(node: PlanTreeNode, event: Event) {
    event.stopPropagation();
    this.editPlan.emit(node);
  }

  onTaskClick(task: any) {
    this.taskSelected.emit(task);
    this.router.navigate(['/tasks'], { queryParams: { taskId: task.id } });
  }
}
