import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { AttachmentService } from '../../../core/services/attachment.service';
import { ContactCardService } from '../../../core/services/contact-card.service';
import {
  TaskItem,
  TaskStatus,
  TaskPriority,
  TaskAssignmentRole,
  TaskLogItem,
  TaskAttachmentItem,
  TaskCommentItem,
} from '../../../core/models/task.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { FileDropzoneComponent } from '../file-dropzone/file-dropzone.component';

@Component({
  selector: 'app-task-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, FileDropzoneComponent],
  template: `
    @if (isOpen() && task()) {
      <div class="task-modal-backdrop" (click)="close()">
        <div class="task-modal-container" (click)="$event.stopPropagation()">
          <!-- MODAL HEADER -->
          <div class="modal-header">
            <div class="header-main">
              <div class="header-tags">
                <span class="task-code">{{ task()!.code || 'CV-' + task()!.id.slice(0, 6) }}</span>
                <app-status-badge [status]="task()!.status"></app-status-badge>
                <span class="priority-tag" [ngClass]="'prio-' + task()!.priority">
                  {{ getPriorityLabel(task()!.priority) }}
                </span>
                @if (task()!.location) {
                  <span class="loc-tag">
                    <span class="material-symbols-outlined">location_on</span>
                    {{ task()!.location?.name }}
                  </span>
                }
              </div>
              <h2 class="task-title">{{ task()!.title }}</h2>
            </div>
            <button type="button" class="btn-close-modal" (click)="close()" title="Đóng">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- MODAL CONTENT GRID -->
          <div class="modal-body-layout">
            <!-- LEFT COLUMN: MAIN DETAILS, PROGRESS, DROPZONE, TIMELINE, COMMENTS -->
            <div class="body-main-col">
              <!-- DESCRIPTION / REQUIREMENTS -->
              <div class="section-card">
                <h4 class="section-title">
                  <span class="material-symbols-outlined">description</span>
                  <span>Nội dung yêu cầu & Chỉ tiêu</span>
                </h4>
                <p class="task-desc-text">
                  {{ task()!.description || 'Không có mô tả chi tiết kèm theo.' }}
                </p>

                @if (task()!.plan) {
                  <div class="attached-plan-banner">
                    <span class="material-symbols-outlined">account_tree</span>
                    <span>Thuộc Kế hoạch: <strong>[{{ task()!.plan?.level }}] {{ task()!.plan?.title }}</strong></span>
                  </div>
                }
              </div>

              <!-- PROGRESS UPDATE SECTION (SLIDER & QUICK NOTE) -->
              <div class="section-card progress-update-card">
                <div class="section-header-row">
                  <h4 class="section-title">
                    <span class="material-symbols-outlined">trending_up</span>
                    <span>Cập nhật tiến độ hoàn thành</span>
                  </h4>
                  <strong class="current-prog-val" [style.color]="getProgressColor(tempProgress())">
                    {{ tempProgress() }}%
                  </strong>
                </div>

                <div class="slider-box">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    class="progress-slider"
                    [(ngModel)]="tempProgress"
                    (ngModelChange)="onProgressChange()"
                  />
                  <div class="slider-marks">
                    <span>0% (Bắt đầu)</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100% (Hoàn thành)</span>
                  </div>
                </div>

                <div class="progress-note-box">
                  <input
                    type="text"
                    class="prog-note-input"
                    [(ngModel)]="progressNote"
                    placeholder="Ghi chú thêm về nội dung vừa hoàn thành (tùy chọn)..."
                  />
                  <button
                    type="button"
                    class="btn-save-prog tap-target"
                    (click)="saveProgress()"
                    [disabled]="isUpdatingProgress() || tempProgress() === task()!.progressPercent"
                  >
                    @if (isUpdatingProgress()) {
                      <span class="material-symbols-outlined spin">progress_activity</span>
                    } @else {
                      <span class="material-symbols-outlined">check</span>
                    }
                    <span>Lưu % tiến độ</span>
                  </button>
                </div>
              </div>

              <!-- FILE ATTACHMENTS & DROPZONE -->
              <div class="section-card attachments-card">
                <div class="section-header-row">
                  <h4 class="section-title">
                    <span class="material-symbols-outlined">attachment</span>
                    <span>Hồ sơ & Minh chứng kết quả</span>
                    @if (task()!.requireAttachment) {
                      <span class="required-badge" title="Bắt buộc có tệp/ảnh minh chứng">BẮT BUỘC</span>
                    }
                  </h4>
                  <span class="file-count">{{ task()!.attachments?.length || 0 }} tệp</span>
                </div>

                <!-- FILE LIST GALLERY -->
                @if (task()!.attachments && task()!.attachments!.length > 0) {
                  <div class="attachments-list">
                    @for (file of task()!.attachments; track file.id) {
                      <div class="file-item-card">
                        <div class="file-icon-box">
                          <span class="material-symbols-outlined">{{ getFileIcon(file.mimeType) }}</span>
                        </div>
                        <div class="file-info">
                          <a [href]="file.fileUrl" target="_blank" class="file-name" [title]="file.originalName">
                            {{ file.originalName }}
                          </a>
                          <div class="file-meta">
                            <span>{{ formatFileSize(file.fileSize) }}</span>
                            <span>• {{ file.uploadedBy?.fullName || 'Người dùng' }}</span>
                            <span>• {{ formatDate(file.createdAt) }}</span>
                          </div>
                        </div>
                        <div class="file-actions">
                          <a [href]="file.fileUrl" target="_blank" class="btn-file-action" title="Xem trước / Tải về">
                            <span class="material-symbols-outlined">download</span>
                          </a>
                          <button
                            type="button"
                            class="btn-file-action delete"
                            (click)="deleteAttachment(file.id)"
                            title="Xóa tệp"
                          >
                            <span class="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="no-files-box">
                    <span class="material-symbols-outlined">draft</span>
                    <span>Chưa có tệp minh chứng nào được tải lên.</span>
                  </div>
                }

                <!-- FILE DROPZONE -->
                <div class="dropzone-wrapper">
                  <app-file-dropzone
                    [taskId]="task()!.id"
                    (uploadSuccess)="onUploadSuccess($event)"
                  ></app-file-dropzone>
                </div>
              </div>

              <!-- TIMELINE / TASK LOG -->
              <div class="section-card timeline-card">
                <h4 class="section-title">
                  <span class="material-symbols-outlined">history</span>
                  <span>Nhật ký hoạt động & Thay đổi trạng thái</span>
                </h4>

                <div class="vertical-timeline">
                  @if (task()!.logs && task()!.logs!.length > 0) {
                    @for (log of task()!.logs; track log.id) {
                      <div class="timeline-item">
                        <div class="timeline-dot" [ngClass]="getTimelineDotClass(log.action)">
                          <span class="material-symbols-outlined">{{ getTimelineIcon(log.action) }}</span>
                        </div>
                        <div class="timeline-content">
                          <div class="timeline-header">
                            <strong class="log-user" (click)="openContact(log.user, $event)">
                              {{ log.user?.fullName || 'Hệ thống' }}
                            </strong>
                            <span class="log-action">{{ formatLogAction(log) }}</span>
                            <span class="log-time">{{ formatDate(log.createdAt) }}</span>
                          </div>

                          @if (log.note) {
                            <p class="log-note-text">"{{ log.note }}"</p>
                          }
                        </div>
                      </div>
                    }
                  } @else {
                    <p class="empty-timeline">Chưa có nhật ký hoạt động.</p>
                  }
                </div>
              </div>

              <!-- COMMENTS WITH @MENTION -->
              <div class="section-card comments-card">
                <h4 class="section-title">
                  <span class="material-symbols-outlined">forum</span>
                  <span>Trao đổi & Bình luận ({{ task()!.comments?.length || 0 }})</span>
                </h4>

                <!-- COMMENT INPUT WITH @MENTION -->
                <div class="comment-input-box">
                  <div class="input-wrapper">
                    <textarea
                      rows="2"
                      class="comment-textarea"
                      [(ngModel)]="commentText"
                      (keyup)="onCommentKeyUp($event)"
                      placeholder="Viết trao đổi nội bộ... (Gõ @ để nhắc tên giáo viên)"
                    ></textarea>

                    <!-- @MENTION SUGGESTION POPUP -->
                    @if (showMentionSuggestions()) {
                      <div class="mention-dropdown">
                        <div class="mention-header">Gợi ý người liên quan (@mention):</div>
                        @for (u of filteredMentionUsers(); track u.id) {
                          <div class="mention-item" (click)="selectMentionUser(u)">
                            <img [src]="u.avatarUrl || 'assets/images/default-avatar.svg'" class="mini-avatar" alt="" />
                            <div class="mention-name-box">
                              <span class="m-name">{{ u.fullName }}</span>
                              <span class="m-role">{{ u.title || 'Giáo viên' }}</span>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <button
                    type="button"
                    class="btn-send-comment tap-target"
                    (click)="submitComment()"
                    [disabled]="!commentText.trim() || isSubmittingComment()"
                  >
                    @if (isSubmittingComment()) {
                      <span class="material-symbols-outlined spin">progress_activity</span>
                    } @else {
                      <span class="material-symbols-outlined">send</span>
                    }
                    <span>Gửi trao đổi</span>
                  </button>
                </div>

                <!-- COMMENTS LIST -->
                <div class="comments-list">
                  @for (c of task()!.comments; track c.id) {
                    <div class="comment-bubble">
                      <img
                        [src]="c.user?.avatarUrl || 'assets/images/default-avatar.svg'"
                        class="comment-avatar"
                        [alt]="c.user?.fullName"
                      />
                      <div class="comment-body">
                        <div class="comment-top">
                          <strong class="comment-author" (click)="openContact(c.user, $event)">
                            {{ c.user?.fullName }}
                          </strong>
                          <span class="comment-date">{{ formatDate(c.createdAt) }}</span>
                        </div>
                        <div class="comment-message" [innerHTML]="formatCommentText(c.content)"></div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN: RACI TEAM & METADATA -->
            <div class="body-side-col">
              <!-- STATUS WORKFLOW ACTIONS -->
              <div class="side-card action-workflow-card">
                <h4 class="side-title">Hành động quy trình</h4>
                <div class="workflow-status-notice">
                  <span class="label">Trạng thái hiện tại:</span>
                  <app-status-badge [status]="task()!.status"></app-status-badge>
                </div>

                <div class="workflow-action-buttons">
                  <!-- TIẾP NHẬN (CHO CHỦ TRÌ KHI DA_GIAO) -->
                  @if (canTransitionTo('DA_TIEP_NHAN')) {
                    <button
                      type="button"
                      class="btn-workflow-action btn-blue tap-target"
                      (click)="performStatusChange('DA_TIEP_NHAN', 'Đã tiếp nhận công việc')"
                    >
                      <span class="material-symbols-outlined">assignment_turned_in</span>
                      <span>Tiếp nhận công việc</span>
                    </button>
                  }

                  <!-- BẮT ĐẦU LÀM (DANG_THUC_HIEN) -->
                  @if (canTransitionTo('DANG_THUC_HIEN')) {
                    <button
                      type="button"
                      class="btn-workflow-action btn-indigo tap-target"
                      (click)="performStatusChange('DANG_THUC_HIEN', 'Bắt đầu thực hiện')"
                    >
                      <span class="material-symbols-outlined">play_arrow</span>
                      <span>Bắt đầu thực hiện</span>
                    </button>
                  }

                  <!-- GỬI DUYỆT (CHO_KIEM_TRA) -->
                  @if (canTransitionTo('CHO_KIEM_TRA')) {
                    <button
                      type="button"
                      class="btn-workflow-action btn-amber tap-target"
                      (click)="performStatusChange('CHO_KIEM_TRA', 'Đã nộp kết quả, gửi kiểm tra nghiệm thu')"
                    >
                      <span class="material-symbols-outlined">send_and_archive</span>
                      <span>Gửi nghiệm thu / Kiểm tra</span>
                    </button>
                  }

                  <!-- PHÊ DUYỆT ĐẠT (HOAN_THANH) -->
                  @if (canTransitionTo('HOAN_THANH')) {
                    <button
                      type="button"
                      class="btn-workflow-action btn-green tap-target"
                      (click)="performStatusChange('HOAN_THANH', 'Nghiệm thu đạt yêu cầu')"
                    >
                      <span class="material-symbols-outlined">check_circle</span>
                      <span>Xác nhận đạt / Hoàn thành</span>
                    </button>
                  }

                  <!-- YÊU CẦU BỔ SUNG (BO_SUNG) -->
                  @if (canTransitionTo('BO_SUNG')) {
                    <button
                      type="button"
                      class="btn-workflow-action btn-orange tap-target"
                      (click)="promptForReasonAndChange('BO_SUNG', 'Yêu cầu bổ sung minh chứng/kết quả')"
                    >
                      <span class="material-symbols-outlined">replay</span>
                      <span>Yêu cầu bổ sung kết quả</span>
                    </button>
                  }

                  <!-- ĐÓNG VIỆC (DONG) -->
                  @if (canTransitionTo('DONG')) {
                    <button
                      type="button"
                      class="btn-workflow-action btn-gray tap-target"
                      (click)="performStatusChange('DONG', 'Đã đóng hồ sơ công việc')"
                    >
                      <span class="material-symbols-outlined">lock</span>
                      <span>Đóng công việc</span>
                    </button>
                  }
                </div>

                @if (actionError()) {
                  <div class="action-error-banner">
                    <span class="material-symbols-outlined">error</span>
                    <span>{{ actionError() }}</span>
                  </div>
                }
              </div>

              <!-- RACI PEOPLE CARD (CLICK-TO-CALL) -->
              <div class="side-card raci-team-card">
                <h4 class="side-title">
                  <span class="material-symbols-outlined">groups</span>
                  <span>Phân công trách nhiệm (RACI)</span>
                </h4>

                <!-- 1. CHỦ TRÌ -->
                <div class="raci-role-group">
                  <span class="role-badge badge-chutri">CHỦ TRÌ (CHÍNH)</span>
                  @if (chuTriAssignment(); as a) {
                    <div class="raci-person-card tap-target" (click)="openContact(a.user, $event)">
                      <img
                        [src]="a.user.avatarUrl || 'assets/images/default-avatar.svg'"
                        class="raci-avatar"
                        [alt]="a.user.fullName"
                      />
                      <div class="raci-name-box">
                        <strong class="raci-name">{{ a.user.fullName }}</strong>
                        <span class="raci-sub">{{ a.user.title || 'Giáo viên' }}</span>
                        <span class="raci-loc">{{ a.user.primaryLocation?.name }}</span>
                      </div>
                      <a [href]="'tel:' + a.user.phone" class="btn-call-mini" (click)="$event.stopPropagation()" title="Gọi ngay">
                        <span class="material-symbols-outlined">call</span>
                      </a>
                    </div>
                  } @else {
                    <p class="unassigned-text">Chưa phân công</p>
                  }
                </div>

                <!-- 2. PHỐI HỢP -->
                @if (phoiHopAssignments().length > 0) {
                  <div class="raci-role-group">
                    <span class="role-badge badge-phoihop">PHỐI HỢP THỰC HIỆN</span>
                    <div class="raci-person-list">
                      @for (a of phoiHopAssignments(); track a.id) {
                        <div class="raci-person-card tap-target" (click)="openContact(a.user, $event)">
                          <img
                            [src]="a.user.avatarUrl || 'assets/images/default-avatar.svg'"
                            class="raci-avatar"
                            [alt]="a.user.fullName"
                          />
                          <div class="raci-name-box">
                            <strong class="raci-name">{{ a.user.fullName }}</strong>
                            <span class="raci-sub">{{ a.user.title }}</span>
                          </div>
                          <a [href]="'tel:' + a.user.phone" class="btn-call-mini" (click)="$event.stopPropagation()" title="Gọi ngay">
                            <span class="material-symbols-outlined">call</span>
                          </a>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- 3. KIỂM TRA -->
                @if (kiemTraAssignment(); as a) {
                  <div class="raci-role-group">
                    <span class="role-badge badge-kiemtra">KIỂM TRA / NGHIỆM THU</span>
                    <div class="raci-person-card tap-target" (click)="openContact(a.user, $event)">
                      <img
                        [src]="a.user.avatarUrl || 'assets/images/default-avatar.svg'"
                        class="raci-avatar"
                        [alt]="a.user.fullName"
                      />
                      <div class="raci-name-box">
                        <strong class="raci-name">{{ a.user.fullName }}</strong>
                        <span class="raci-sub">{{ a.user.title }}</span>
                      </div>
                      <a [href]="'tel:' + a.user.phone" class="btn-call-mini" (click)="$event.stopPropagation()" title="Gọi ngay">
                        <span class="material-symbols-outlined">call</span>
                      </a>
                    </div>
                  </div>
                }
              </div>

              <!-- TIME & META CARD -->
              <div class="side-card meta-info-card">
                <h4 class="side-title">Thông tin thời hạn</h4>
                <div class="meta-row">
                  <span class="meta-label">Hạn hoàn thành:</span>
                  <strong class="meta-val" [class.overdue-val]="isTaskOverdue()">
                    {{ formatDateOnly(task()!.dueDate) }}
                  </strong>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Ngày bắt đầu:</span>
                  <span class="meta-val">{{ formatDateOnly(task()!.startDate) }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Người giao việc:</span>
                  <span class="meta-val">{{ task()!.createdBy?.fullName || 'Ban Giám hiệu' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Ngày tạo:</span>
                  <span class="meta-val">{{ formatDate(task()!.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .task-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        z-index: 2150;
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

      .task-modal-container {
        width: 100%;
        max-width: 960px;
        max-height: 92vh;
        background: #FFFFFF;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);

        @media (max-width: 768px) {
          max-width: 100%;
          border-radius: 24px 24px 0 0;
          max-height: 95vh;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      }

      /* MODAL HEADER */
      .modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 16px 24px;
        background: #F8FAFC;
        border-bottom: 1px solid #E2E8F0;
        gap: 16px;

        .header-main {
          .header-tags {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 6px;

            .task-code {
              font-family: monospace;
              font-size: 0.78rem;
              font-weight: 800;
              background: #EEF4FC;
              color: #1F3864;
              padding: 2px 6px;
              border-radius: 4px;
            }

            .priority-tag {
              font-size: 0.75rem;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 9999px;

              &.prio-KHAN_CAP { background: #FEE2E2; color: #DC2626; }
              &.prio-CAO { background: #FEF3C7; color: #D97706; }
              &.prio-TRUNG_BINH { background: #F1F5F9; color: #475569; }
              &.prio-THAP { background: #F1F5F9; color: #94A3B8; }
            }

            .loc-tag {
              display: inline-flex;
              align-items: center;
              gap: 2px;
              font-size: 0.75rem;
              font-weight: 600;
              color: #475569;
              background: #F1F5F9;
              padding: 2px 8px;
              border-radius: 9999px;

              .material-symbols-outlined {
                font-size: 14px;
                color: #1F3864;
              }
            }
          }

          .task-title {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 800;
            color: #1E293B;
            line-height: 1.35;
          }
        }

        .btn-close-modal {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #EEF4FC;
          border: none;
          color: #1F3864;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
      }

      /* BODY LAYOUT GRID */
      .modal-body-layout {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 16px;
        padding: 20px 24px;
        overflow-y: auto;

        @media (max-width: 840px) {
          grid-template-columns: 1fr;
        }
      }

      .body-main-col,
      .body-side-col {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* SECTION CARDS */
      .section-card,
      .side-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      }

      .section-title,
      .side-title {
        margin: 0 0 10px 0;
        font-size: 0.92rem;
        font-weight: 700;
        color: #1E293B;
        display: flex;
        align-items: center;
        gap: 6px;

        .material-symbols-outlined {
          font-size: 18px;
          color: #1F3864;
        }

        .required-badge {
          font-size: 0.68rem;
          font-weight: 800;
          background: #FEE2E2;
          color: #B91C1C;
          padding: 1px 6px;
          border-radius: 4px;
        }
      }

      .section-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;

        .section-title {
          margin: 0;
        }

        .file-count,
        .current-prog-val {
          font-size: 0.95rem;
          font-weight: 800;
        }
      }

      .task-desc-text {
        font-size: 0.88rem;
        color: #334155;
        line-height: 1.6;
        margin: 0;
      }

      .attached-plan-banner {
        margin-top: 10px;
        padding: 8px 12px;
        background: #EEF4FC;
        border-radius: 8px;
        font-size: 0.82rem;
        color: #1F3864;
        display: flex;
        align-items: center;
        gap: 6px;

        .material-symbols-outlined {
          font-size: 16px;
        }
      }

      /* PROGRESS CARD */
      .progress-update-card {
        .slider-box {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .progress-slider {
            width: 100%;
            height: 8px;
            border-radius: 9999px;
            accent-color: #1F3864;
            cursor: pointer;
          }

          .slider-marks {
            display: flex;
            justify-content: space-between;
            font-size: 0.72rem;
            color: #94A3B8;
          }
        }

        .progress-note-box {
          display: flex;
          gap: 8px;
          margin-top: 12px;

          .prog-note-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            font-size: 0.85rem;

            &:focus {
              border-color: #1F3864;
              outline: none;
            }
          }

          .btn-save-prog {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 8px 14px;
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;

            &:disabled {
              background: #CBD5E1;
              cursor: not-allowed;
            }
          }
        }
      }

      /* ATTACHMENTS CARD */
      .attachments-card {
        .attachments-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;

          .file-item-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;

            .file-icon-box {
              color: #1F3864;
              display: flex;
            }

            .file-info {
              flex: 1;
              min-width: 0;

              .file-name {
                font-size: 0.85rem;
                font-weight: 600;
                color: #1E293B;
                text-decoration: none;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: block;

                &:hover {
                  color: #2E5EAA;
                  text-decoration: underline;
                }
              }

              .file-meta {
                display: flex;
                gap: 6px;
                font-size: 0.75rem;
                color: #64748B;
              }
            }

            .file-actions {
              display: flex;
              gap: 4px;

              .btn-file-action {
                background: transparent;
                border: none;
                color: #64748B;
                padding: 4px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;

                &:hover {
                  background: #EEF4FC;
                  color: #1F3864;
                }

                &.delete:hover {
                  color: #DC2626;
                }
              }
            }
          }
        }

        .no-files-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #F8FAFC;
          border-radius: 8px;
          font-size: 0.82rem;
          color: #64748B;
          margin-bottom: 10px;

          .material-symbols-outlined {
            color: #94A3B8;
          }
        }
      }

      /* TIMELINE CARD */
      .vertical-timeline {
        display: flex;
        flex-direction: column;
        gap: 12px;
        position: relative;
        padding-left: 24px;

        &::before {
          content: '';
          position: absolute;
          left: 11px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: #E2E8F0;
        }

        .timeline-item {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 2px;

          .timeline-dot {
            position: absolute;
            left: -24px;
            top: 2px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #EEF4FC;
            color: #1F3864;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #FFFFFF;
            box-shadow: 0 0 0 1px #CBD5E1;

            .material-symbols-outlined {
              font-size: 14px;
            }

            &.dot-green { background: #DCFCE7; color: #16A34A; }
            &.dot-amber { background: #FEF3C7; color: #D97706; }
            &.dot-red { background: #FEE2E2; color: #DC2626; }
            &.dot-blue { background: #EEF4FC; color: #1F3864; }
          }

          .timeline-content {
            .timeline-header {
              font-size: 0.82rem;
              color: #475569;
              display: flex;
              gap: 6px;
              flex-wrap: wrap;

              .log-user {
                color: #1F3864;
                cursor: pointer;
                &:hover { text-decoration: underline; }
              }

              .log-time {
                color: #94A3B8;
                margin-left: auto;
                font-size: 0.75rem;
              }
            }

            .log-note-text {
              margin: 4px 0 0 0;
              font-size: 0.8rem;
              color: #64748B;
              font-style: italic;
            }
          }
        }
      }

      /* COMMENTS CARD */
      .comments-card {
        .comment-input-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;

          .input-wrapper {
            position: relative;

            .comment-textarea {
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #CBD5E1;
              border-radius: 8px;
              font-size: 0.85rem;
              font-family: inherit;
              box-sizing: border-box;

              &:focus {
                border-color: #1F3864;
                outline: none;
              }
            }

            .mention-dropdown {
              position: absolute;
              bottom: 100%;
              left: 0;
              right: 0;
              background: #FFFFFF;
              border: 1px solid #CBD5E1;
              border-radius: 8px;
              box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
              max-height: 180px;
              overflow-y: auto;
              z-index: 10;
              margin-bottom: 4px;

              .mention-header {
                padding: 6px 10px;
                font-size: 0.75rem;
                font-weight: 700;
                background: #F8FAFC;
                color: #64748B;
                border-bottom: 1px solid #E2E8F0;
              }

              .mention-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                cursor: pointer;

                &:hover {
                  background: #EEF4FC;
                }

                .mini-avatar {
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                }

                .mention-name-box {
                  display: flex;
                  flex-direction: column;
                  .m-name { font-size: 0.82rem; font-weight: 600; color: #1E293B; }
                  .m-role { font-size: 0.72rem; color: #64748B; }
                }
              }
            }
          }

          .btn-send-comment {
            align-self: flex-end;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 6px 14px;
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;

            &:disabled {
              background: #CBD5E1;
              cursor: not-allowed;
            }
          }
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 10px;

          .comment-bubble {
            display: flex;
            gap: 10px;

            .comment-avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              object-fit: cover;
              flex-shrink: 0;
            }

            .comment-body {
              flex: 1;
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 10px;
              padding: 8px 12px;

              .comment-top {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;

                .comment-author {
                  font-size: 0.82rem;
                  color: #1F3864;
                  cursor: pointer;
                }

                .comment-date {
                  font-size: 0.72rem;
                  color: #94A3B8;
                }
              }

              .comment-message {
                font-size: 0.85rem;
                color: #334155;
                line-height: 1.5;
              }
            }
          }
        }
      }

      /* SIDEBAR: WORKFLOW ACTIONS */
      .action-workflow-card {
        .workflow-status-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;

          .label {
            font-size: 0.8rem;
            color: #64748B;
          }
        }

        .workflow-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;

          .btn-workflow-action {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 10px;
            border: none;
            font-size: 0.88rem;
            font-weight: 700;
            color: #FFFFFF;
            cursor: pointer;
            transition: all 0.15s ease;

            .material-symbols-outlined {
              font-size: 20px;
            }

            &.btn-blue { background: #2E5EAA; }
            &.btn-indigo { background: #1F3864; }
            &.btn-amber { background: #D97706; }
            &.btn-green { background: #2E7D32; }
            &.btn-orange { background: #EA580C; }
            &.btn-gray { background: #475569; }

            &:hover {
              opacity: 0.9;
              transform: translateY(-1px);
            }
          }
        }

        .action-error-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          background: #FEE2E2;
          border-radius: 8px;
          color: #B91C1C;
          font-size: 0.78rem;
          margin-top: 10px;
        }
      }

      /* SIDEBAR: RACI TEAM */
      .raci-team-card {
        .raci-role-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;

          &:last-child {
            margin-bottom: 0;
          }

          .role-badge {
            font-size: 0.7rem;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            width: fit-content;

            &.badge-chutri { background: #DBEAFE; color: #1E40AF; }
            &.badge-phoihop { background: #F3E8FF; color: #6B21A8; }
            &.badge-kiemtra { background: #FEF3C7; color: #92400E; }
          }

          .raci-person-card {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            cursor: pointer;

            &:hover {
              background: #EEF4FC;
            }

            .raci-avatar {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              object-fit: cover;
            }

            .raci-name-box {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;

              .raci-name {
                font-size: 0.82rem;
                color: #1E293B;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .raci-sub {
                font-size: 0.72rem;
                color: #64748B;
              }

              .raci-loc {
                font-size: 0.68rem;
                color: #94A3B8;
              }
            }

            .btn-call-mini {
              width: 26px;
              height: 26px;
              border-radius: 50%;
              background: #2E7D32;
              color: #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              text-decoration: none;

              .material-symbols-outlined {
                font-size: 14px;
              }

              &:hover {
                background: #1B5E20;
              }
            }
          }
        }
      }

      /* SIDEBAR: META INFO */
      .meta-info-card {
        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          padding: 4px 0;
          border-bottom: 1px solid #F1F5F9;

          &:last-child {
            border-bottom: none;
          }

          .meta-label { color: #64748B; }
          .meta-val { color: #1E293B; }

          .overdue-val {
            color: #C62828;
            font-weight: 700;
          }
        }
      }

      @keyframes scaleUp {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class TaskDetailModalComponent implements OnInit {
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private attachmentService = inject(AttachmentService);
  private contactCardService = inject(ContactCardService);

  @Input() set taskId(id: string | null) {
    if (id) {
      this.loadTask(id);
    } else {
      this.task.set(null);
      this.isOpen.set(false);
    }
  }

  @Output() taskUpdated = new EventEmitter<TaskItem>();
  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false);
  task = signal<TaskItem | null>(null);

  // Progress update state
  tempProgress = signal(0);
  progressNote = '';
  isUpdatingProgress = signal(false);

  // Comment state
  commentText = '';
  isSubmittingComment = signal(false);
  showMentionSuggestions = signal(false);

  // Workflow action state
  actionError = signal<string | null>(null);

  ngOnInit() {}

  loadTask(id: string) {
    this.taskService.getTaskById(id).subscribe({
      next: (t) => {
        this.task.set(t);
        this.tempProgress.set(t.progressPercent || 0);
        this.actionError.set(null);
        this.isOpen.set(true);
      },
      error: () => {},
    });
  }

  chuTriAssignment = computed(() => {
    return this.task()?.assignments?.find((a) => a.role === 'CHU_TRI') || null;
  });

  phoiHopAssignments = computed(() => {
    return this.task()?.assignments?.filter((a) => a.role === 'PHOI_HOP') || [];
  });

  kiemTraAssignment = computed(() => {
    return this.task()?.assignments?.find((a) => a.role === 'KIEM_TRA') || null;
  });

  onProgressChange() {
    // reactive update
  }

  saveProgress() {
    const t = this.task();
    if (!t) return;

    this.isUpdatingProgress.set(true);
    this.taskService.updateProgress(t.id, this.tempProgress(), this.progressNote || undefined).subscribe({
      next: (updated) => {
        this.isUpdatingProgress.set(false);
        this.progressNote = '';
        this.loadTask(t.id);
        this.taskUpdated.emit(updated);
      },
      error: (err) => {
        this.isUpdatingProgress.set(false);
        alert(err.error?.message || 'Không thể cập nhật tiến độ.');
      },
    });
  }

  onUploadSuccess(att: any) {
    const t = this.task();
    if (t) {
      this.loadTask(t.id);
      this.taskUpdated.emit(t);
    }
  }

  deleteAttachment(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa tệp minh chứng này?')) return;
    this.attachmentService.deleteAttachment(id).subscribe({
      next: () => {
        const t = this.task();
        if (t) {
          this.loadTask(t.id);
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể xóa tệp.');
      },
    });
  }

  // Workflow logic
  canTransitionTo(status: TaskStatus): boolean {
    const t = this.task();
    if (!t) return false;
    const current = t.status;

    switch (status) {
      case 'DA_TIEP_NHAN':
        return current === 'DA_GIAO' || current === 'NHAP';
      case 'DANG_THUC_HIEN':
        return current === 'DA_TIEP_NHAN' || current === 'BO_SUNG' || current === 'DA_GIAO';
      case 'CHO_KIEM_TRA':
        return current === 'DANG_THUC_HIEN' || current === 'DA_TIEP_NHAN' || current === 'BO_SUNG';
      case 'HOAN_THANH':
        return current === 'CHO_KIEM_TRA' || current === 'DANG_THUC_HIEN';
      case 'BO_SUNG':
        return current === 'CHO_KIEM_TRA';
      case 'DONG':
        return current === 'HOAN_THANH' || current === 'XAC_NHAN';
      default:
        return false;
    }
  }

  performStatusChange(status: TaskStatus, note?: string) {
    const t = this.task();
    if (!t) return;
    this.actionError.set(null);

    this.taskService.updateStatus(t.id, status, note).subscribe({
      next: (updated) => {
        this.loadTask(t.id);
        this.taskUpdated.emit(updated);
      },
      error: (err) => {
        this.actionError.set(err.error?.message || 'Không thể chuyển trạng thái.');
      },
    });
  }

  promptForReasonAndChange(status: TaskStatus, defaultNote: string) {
    const reason = prompt('Nhập lý do / nội dung yêu cầu bổ sung:', defaultNote);
    if (reason !== null && reason.trim()) {
      this.performStatusChange(status, reason.trim());
    }
  }

  // Mention Suggestions
  onCommentKeyUp(event: KeyboardEvent) {
    if (this.commentText.includes('@')) {
      this.showMentionSuggestions.set(true);
    } else {
      this.showMentionSuggestions.set(false);
    }
  }

  filteredMentionUsers = computed(() => {
    const t = this.task();
    if (!t || !t.assignments) return [];
    return t.assignments.map((a) => a.user);
  });

  selectMentionUser(user: any) {
    const lastAtIndex = this.commentText.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      this.commentText = this.commentText.substring(0, lastAtIndex) + `@${user.fullName} `;
    }
    this.showMentionSuggestions.set(false);
  }

  submitComment() {
    const t = this.task();
    if (!t || !this.commentText.trim()) return;

    this.isSubmittingComment.set(true);
    this.taskService.addComment(t.id, this.commentText.trim()).subscribe({
      next: () => {
        this.isSubmittingComment.set(false);
        this.commentText = '';
        this.showMentionSuggestions.set(false);
        this.loadTask(t.id);
      },
      error: () => {
        this.isSubmittingComment.set(false);
      },
    });
  }

  formatCommentText(text: string): string {
    if (!text) return '';
    return text.replace(/@([A-ZÀ-Ỵa-zà-ỵ\s]+)/g, '<strong style="color: #1F3864; background: #EEF4FC; padding: 1px 4px; border-radius: 4px;">@$1</strong>');
  }

  openContact(user: any, event: Event) {
    event.stopPropagation();
    if (user && user.id) {
      this.contactCardService.open(user.id);
    }
  }

  close() {
    this.isOpen.set(false);
    this.closed.emit();
  }

  getPriorityLabel(prio: TaskPriority): string {
    switch (prio) {
      case 'KHAN_CAP': return 'Khẩn cấp';
      case 'CAO': return 'Quan trọng';
      case 'TRUNG_BINH': return 'Bình thường';
      default: return 'Thấp';
    }
  }

  getProgressColor(val: number): string {
    if (val >= 80) return '#2E7D32';
    if (val >= 50) return '#1F3864';
    if (val > 0) return '#D97706';
    return '#94A3B8';
  }

  getFileIcon(mime?: string): string {
    if (!mime) return 'insert_drive_file';
    if (mime.includes('pdf')) return 'picture_as_pdf';
    if (mime.includes('image')) return 'image';
    if (mime.includes('word') || mime.includes('doc')) return 'article';
    if (mime.includes('sheet') || mime.includes('excel')) return 'table_view';
    return 'insert_drive_file';
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(d?: string | Date): string {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  formatDateOnly(d?: string | Date | null): string {
    if (!d) return 'Chưa đặt';
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  isTaskOverdue(): boolean {
    const t = this.task();
    if (!t || !t.dueDate) return false;
    if (t.status === 'HOAN_THANH' || t.status === 'XAC_NHAN' || t.status === 'DONG') return false;
    return new Date(t.dueDate).getTime() < Date.now();
  }

  getTimelineDotClass(action: string): string {
    if (action.includes('HOAN_THANH') || action.includes('DUYET')) return 'dot-green';
    if (action.includes('BO_SUNG')) return 'dot-red';
    if (action.includes('TIEN_DO')) return 'dot-amber';
    return 'dot-blue';
  }

  getTimelineIcon(action: string): string {
    if (action.includes('HOAN_THANH')) return 'check_circle';
    if (action.includes('BO_SUNG')) return 'replay';
    if (action.includes('TIEN_DO')) return 'trending_up';
    if (action.includes('MINH_CHUNG') || action.includes('FILE')) return 'attach_file';
    return 'edit';
  }

  formatLogAction(log: TaskLogItem): string {
    if (log.action === 'CREATE_TASK') return 'Đã giao công việc mới';
    if (log.action === 'UPDATE_STATUS') return `Chuyển trạng thái sang: ${log.newStatus}`;
    if (log.action === 'UPDATE_PROGRESS') return `Cập nhật tiến độ lên ${log.newProgress}%`;
    if (log.action === 'ATTACH_FILE') return 'Đính kèm tệp minh chứng';
    return log.action;
  }
}
