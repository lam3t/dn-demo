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
import { NotificationService } from '../../../core/services/notification.service';
import {
  TaskItem,
  TaskStatus,
  TaskPriority,
  TaskAssignmentRole,
  TaskEvaluationRating,
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
                <!-- DUE DATE BADGE (KIỂM TRA QUYỀN SỬA) -->
                @if (canEditDueDate()) {
                  <div class="due-tag tap-target can-edit" [class.is-overdue]="isTaskOverdue()" (click)="startEditDueDate()" title="Bấm vào để đổi hạn hoàn thành (Chỉ người giao việc/BGH)">
                    <span class="material-symbols-outlined">{{ isTaskOverdue() ? 'alarm_on' : 'event' }}</span>
                    <span>{{ isTaskOverdue() ? 'Quá hạn: ' : 'Hạn: ' }}{{ formatDateOnly(task()!.dueDate) }}</span>
                    <span class="material-symbols-outlined edit-hint">edit</span>
                  </div>
                } @else {
                  <div class="due-tag read-only" [class.is-overdue]="isTaskOverdue()" [title]="'Hạn hoàn thành: ' + formatDateOnly(task()!.dueDate)">
                    <span class="material-symbols-outlined">{{ isTaskOverdue() ? 'alarm_on' : 'event' }}</span>
                    <span>{{ isTaskOverdue() ? 'Quá hạn: ' : 'Hạn: ' }}{{ formatDateOnly(task()!.dueDate) }}</span>
                  </div>
                }
              </div>
              <h2 class="task-title">{{ task()!.title }}</h2>
            </div>
            <button type="button" class="btn-close-modal tap-target" (click)="close()" title="Đóng">
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
                    [disabled]="!canAssigneeAct()"
                  />
                  <div class="slider-marks">
                    <span>0% (Bắt đầu)</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100% (Hoàn thành)</span>
                  </div>
                  <!-- PRESET BUTTONS -->
                  @if (canAssigneeAct()) {
                    <div class="progress-presets-row">
                      <button type="button" class="btn-preset tap-target" (click)="setTempProgress(25)">25%</button>
                      <button type="button" class="btn-preset tap-target" (click)="setTempProgress(50)">50%</button>
                      <button type="button" class="btn-preset tap-target" (click)="setTempProgress(75)">75%</button>
                      <button type="button" class="btn-preset btn-preset-100 tap-target" (click)="setTempProgress(100)">100% Hoàn thành</button>
                    </div>
                  }
                </div>

                @if (canAssigneeAct()) {
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
                }
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
                          <a [href]="file.fileUrl" target="_blank" class="file-name" [title]="getDisplayFileName(file.originalName || file.fileName)">
                            {{ getDisplayFileName(file.originalName || file.fileName) }}
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
                          @if (canDeleteAttachment(file)) {
                            <button
                              type="button"
                              class="btn-file-action delete tap-target"
                              (click)="deleteAttachment(file.id)"
                              title="Xóa tệp"
                            >
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          }
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

                <!-- FILE DROPZONE (HỖ TRỢ CAMERA DI ĐỘNG & DESKTOP) -->
                <div class="dropzone-wrapper">
                  <app-file-dropzone
                    [taskId]="task()!.id"
                    [autoUpload]="true"
                    (uploadComplete)="onUploadSuccess($event)"
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
                      (keydown)="onCommentKeyDown($event)"
                      placeholder="Viết trao đổi nội bộ... (Nhấn Enter để gửi, Shift+Enter xuống dòng, Gõ @ để nhắc tên)"
                    ></textarea>

                    <!-- @MENTION SUGGESTION POPUP -->
                    @if (showMentionSuggestions()) {
                      <div class="mention-dropdown">
                        <div class="mention-header">Gợi ý người liên quan (@mention):</div>
                        @for (u of filteredMentionUsers(); track u.id) {
                          <div class="mention-item" (click)="selectMentionUser(u)">
                            <img [src]="u.avatarUrl || 'https://ui-avatars.com/api/?name=' + u.fullName + '&background=1F3864&color=fff'" class="mini-avatar" [alt]="u.fullName" />
                            <div class="mention-name-box">
                              <span class="m-name">{{ u.fullName }}</span>
                              <span class="m-role">{{ u.title || 'Giáo viên' }}</span>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <div class="comment-bottom-bar">
                    <span class="comment-hint-text">Gõ &#64; để nhắc tên cán bộ • Enter để gửi</span>
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
                </div>

                <!-- COMMENTS LIST -->
                <div class="comments-list">
                  @for (c of task()!.comments; track c.id) {
                    <div class="comment-bubble">
                      <img
                        [src]="c.user?.avatarUrl || 'https://ui-avatars.com/api/?name=' + (c.user?.fullName || 'User') + '&background=1F3864&color=fff'"
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
              <!-- STATUS WORKFLOW ACTIONS (CHUẨN HÓA LOGIC THEO VAI TRÒ & TRẠNG THÁI) -->
              <div class="side-card action-workflow-card">
                <h4 class="side-title">Hành động quy trình</h4>
                <div class="workflow-status-notice">
                  <span class="label">Trạng thái hiện tại:</span>
                  <app-status-badge [status]="task()!.status"></app-status-badge>
                </div>

                <div class="workflow-action-buttons">
                  <!-- THÔNG BÁO CHO OBSERVER -->
                  @if (!canPerformAnyAction() && task()!.status !== 'DONG') {
                    <div class="read-only-role-notice">
                      <span class="material-symbols-outlined">visibility</span>
                      <span>Bạn đang xem công việc với quyền theo dõi (Chỉ cán bộ được phân công RACI phù hợp hoặc Ban Giám hiệu mới có quyền thao tác).</span>
                    </div>
                  }

                  <!-- 1. KHI Ở TRẠNG THÁI MỚI GIAO (DA_GIAO) HOẶC NHÁP (NHAP) -->
                  @if (task()!.status === 'DA_GIAO' || task()!.status === 'NHAP') {
                    @if (canAssigneeAct()) {
                      <button
                        type="button"
                        class="btn-workflow-action btn-indigo tap-target"
                        (click)="performStatusChange('DANG_THUC_HIEN', 'Tiếp nhận & Bắt đầu thực hiện')"
                      >
                        <span class="material-symbols-outlined">play_circle</span>
                        <span>Tiếp nhận & Bắt đầu làm</span>
                      </button>
                    } @else if (isInspectorOrBGH()) {
                      <div class="status-info-box">
                        <span class="material-symbols-outlined">schedule</span>
                        <span>Đã giao việc, đang chờ cán bộ phụ trách tiếp nhận & triển khai.</span>
                      </div>
                    }
                  }

                  <!-- 2. KHI Ở TRẠNG THÁI ĐÃ TIẾP NHẬN (DA_TIEP_NHAN) -->
                  @if (task()!.status === 'DA_TIEP_NHAN') {
                    @if (canAssigneeAct()) {
                      <button
                        type="button"
                        class="btn-workflow-action btn-indigo tap-target"
                        (click)="performStatusChange('DANG_THUC_HIEN', 'Bắt đầu thực hiện công việc')"
                      >
                        <span class="material-symbols-outlined">play_arrow</span>
                        <span>Bắt đầu thực hiện</span>
                      </button>
                    } @else if (isInspectorOrBGH()) {
                      <div class="status-info-box">
                        <span class="material-symbols-outlined">info</span>
                        <span>Cán bộ đã tiếp nhận, đang chuẩn bị thực hiện.</span>
                      </div>
                    }
                  }

                  <!-- 3. KHI ĐANG THỰC HIỆN (DANG_THUC_HIEN) -->
                  @if (task()!.status === 'DANG_THUC_HIEN') {
                    @if (canAssigneeAct()) {
                      <button
                        type="button"
                        class="btn-workflow-action btn-amber tap-target"
                        (click)="submitForReview()"
                      >
                        <span class="material-symbols-outlined">send</span>
                        <span>Gửi yêu cầu kiểm tra & nghiệm thu</span>
                      </button>
                    } @else if (isInspectorOrBGH()) {
                      <div class="status-info-box">
                        <span class="material-symbols-outlined">engineering</span>
                        <span>Cán bộ đang trong quá trình thực hiện nhiệm vụ (Tiến độ: {{ task()!.progressPercent }}%).</span>
                      </div>
                    }
                  }

                  <!-- 4. KHI CHỜ KIỂM TRA (CHO_KIEM_TRA) -->
                  @if (task()!.status === 'CHO_KIEM_TRA') {
                    @if (isInspectorOrBGH()) {
                      <button
                        type="button"
                        class="btn-workflow-action btn-green tap-target"
                        (click)="approveCompleted()"
                      >
                        <span class="material-symbols-outlined">check_circle</span>
                        <span>Nghiệm thu ĐẠT / Hoàn thành</span>
                      </button>

                      <button
                        type="button"
                        class="btn-workflow-action btn-orange tap-target"
                        (click)="promptForReasonAndChange('BO_SUNG', 'Yêu cầu bổ sung thêm minh chứng/hồ sơ rõ ràng hơn')"
                      >
                        <span class="material-symbols-outlined">replay</span>
                        <span>Yêu cầu bổ sung kết quả</span>
                      </button>
                    } @else {
                      <div class="status-info-box alert-waiting">
                        <span class="material-symbols-outlined">hourglass_top</span>
                        <span>Đã gửi kết quả. Đang chờ Người kiểm tra / Ban Giám hiệu nghiệm thu.</span>
                      </div>
                    }
                  }

                  <!-- 5. KHI CẦN BỔ SUNG (BO_SUNG) -->
                  @if (task()!.status === 'BO_SUNG') {
                    @if (canAssigneeAct()) {
                      <button
                        type="button"
                        class="btn-workflow-action btn-amber tap-target"
                        (click)="submitForReview()"
                      >
                        <span class="material-symbols-outlined">send</span>
                        <span>Gửi lại yêu cầu kiểm tra & nghiệm thu</span>
                      </button>
                    } @else {
                      <div class="status-info-box alert-waiting">
                        <span class="material-symbols-outlined">edit_note</span>
                        <span>Đang chờ cán bộ bổ sung thêm minh chứng/kết quả theo yêu cầu.</span>
                      </div>
                    }
                  }

                  <!-- 6. KHI ĐÃ HOÀN THÀNH (HOAN_THANH) -->
                  @if (task()!.status === 'HOAN_THANH' || task()!.status === 'XAC_NHAN') {
                    <div class="status-info-box alert-completed">
                      <span class="material-symbols-outlined">task_alt</span>
                      <span>Công việc đã được nghiệm thu hoàn thành.</span>
                    </div>

                    @if (canCloseOrReopen()) {
                      <button
                        type="button"
                        class="btn-workflow-action btn-gray tap-target"
                        (click)="performStatusChange('DONG', 'Đã đóng hồ sơ công việc')"
                      >
                        <span class="material-symbols-outlined">lock</span>
                        <span>Đóng hồ sơ công việc</span>
                      </button>

                      <button
                        type="button"
                        class="btn-workflow-action btn-reopen tap-target"
                        (click)="performStatusChange('DANG_THUC_HIEN', 'Mở lại công việc để tiếp tục thực hiện')"
                      >
                        <span class="material-symbols-outlined">lock_open</span>
                        <span>Mở lại công việc</span>
                      </button>
                    }
                  }

                  <!-- 7. KHI ĐÃ ĐÓNG (DONG) -->
                  @if (task()!.status === 'DONG') {
                    <div class="status-info-box alert-locked">
                      <span class="material-symbols-outlined">lock</span>
                      <span>Hồ sơ công việc đã hoàn tất và đóng lưu trữ.</span>
                    </div>

                    @if (canCloseOrReopen()) {
                      <button
                        type="button"
                        class="btn-workflow-action btn-reopen tap-target"
                        (click)="performStatusChange('DANG_THUC_HIEN', 'Mở lại công việc để tiếp tục thực hiện')"
                      >
                        <span class="material-symbols-outlined">lock_open</span>
                        <span>Mở lại công việc</span>
                      </button>
                    }
                  }
                </div>

                @if (actionSuccess()) {
                  <div class="action-success-banner">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>{{ actionSuccess() }}</span>
                  </div>
                }

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
                        [src]="a.user.avatarUrl || 'https://ui-avatars.com/api/?name=' + a.user.fullName + '&background=1F3864&color=fff'"
                        class="raci-avatar"
                        [alt]="a.user.fullName"
                      />
                      <div class="raci-name-box">
                        <strong class="raci-name">{{ a.user.fullName }}</strong>
                        <span class="raci-sub">{{ a.user.title || 'Giáo viên' }}</span>
                        <span class="raci-loc">{{ a.user.primaryLocation?.name }}</span>
                      </div>
                      @if (a.user.phone) {
                        <a [href]="'tel:' + a.user.phone" class="btn-call-mini tap-target" (click)="$event.stopPropagation()" [title]="'Gọi ngay: ' + a.user.phone">
                          <span class="material-symbols-outlined">call</span>
                          <span class="call-phone-text">{{ a.user.phone }}</span>
                        </a>
                      }
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
                            [src]="a.user.avatarUrl || 'https://ui-avatars.com/api/?name=' + a.user.fullName + '&background=1F3864&color=fff'"
                            class="raci-avatar"
                            [alt]="a.user.fullName"
                          />
                          <div class="raci-name-box">
                            <strong class="raci-name">{{ a.user.fullName }}</strong>
                            <span class="raci-sub">{{ a.user.title }}</span>
                          </div>
                          @if (a.user.phone) {
                            <a [href]="'tel:' + a.user.phone" class="btn-call-mini tap-target" (click)="$event.stopPropagation()" [title]="'Gọi ngay: ' + a.user.phone">
                              <span class="material-symbols-outlined">call</span>
                              <span class="call-phone-text">{{ a.user.phone }}</span>
                            </a>
                          }
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
                          [src]="a.user.avatarUrl || 'https://ui-avatars.com/api/?name=' + a.user.fullName + '&background=1F3864&color=fff'"
                          class="raci-avatar"
                          [alt]="a.user.fullName"
                        />
                      <div class="raci-name-box">
                        <strong class="raci-name">{{ a.user.fullName }}</strong>
                        <span class="raci-sub">{{ a.user.title }}</span>
                      </div>
                      @if (a.user.phone) {
                        <a [href]="'tel:' + a.user.phone" class="btn-call-mini tap-target" (click)="$event.stopPropagation()" [title]="'Gọi ngay: ' + a.user.phone">
                          <span class="material-symbols-outlined">call</span>
                          <span class="call-phone-text">{{ a.user.phone }}</span>
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- EVALUATION CARD (TT 70, 89) -->
              <div class="side-card evaluation-card">
                <div class="eval-header-row">
                  <h4 class="side-title">
                    <span class="material-symbols-outlined eval-star-icon">hotel_class</span>
                    <span>Đánh giá kết quả (4 mức)</span>
                  </h4>
                  @if (canEvaluateTask()) {
                    <button type="button" class="btn-eval-edit tap-target" (click)="showEvalModal.set(true)">
                      <span class="material-symbols-outlined">rate_review</span>
                      <span>{{ task()!.evaluationRating ? 'Sửa' : 'Đánh giá' }}</span>
                    </button>
                  }
                </div>

                @if (task()!.evaluationRating) {
                  <div class="eval-result-pill" [ngClass]="'eval-' + task()!.evaluationRating">
                    <span class="eval-rating-title">{{ getEvaluationLabel(task()!.evaluationRating!) }}</span>
                    @if (task()!.evaluationComment) {
                      <p class="eval-comment-text">"{{ task()!.evaluationComment }}"</p>
                    }
                    <div class="eval-meta-info">
                      <span>Đánh giá bởi: <strong>{{ task()!.evaluatedBy?.fullName || 'Ban Giám hiệu' }}</strong></span>
                      @if (task()!.evaluatedAt) {
                        <span> • {{ formatDate(task()!.evaluatedAt!) }}</span>
                      }
                    </div>
                  </div>
                } @else {
                  <p class="unassigned-text">Chưa có đánh giá xếp loại kết quả.</p>
                }
              </div>

              <!-- TIME & META CARD (KIỂM TRA QUYỀN SỬA HẠN HOÀN THÀNH) -->
              <div class="side-card meta-info-card">
                <h4 class="side-title">Thông tin thời hạn</h4>
                <div class="meta-row due-meta-row">
                  <span class="meta-label">Hạn hoàn thành:</span>
                  @if (canEditDueDate()) {
                    @if (!isEditingDueDate()) {
                      <button type="button" class="btn-edit-due-badge tap-target" [class.overdue-badge]="isTaskOverdue()" (click)="startEditDueDate()" title="Bấm để đổi ngày hạn hoàn thành (Chỉ người giao việc/BGH)">
                        <span class="material-symbols-outlined">calendar_month</span>
                        <strong class="due-text">{{ formatDateOnly(task()!.dueDate) }}</strong>
                        <span class="material-symbols-outlined edit-icon">edit</span>
                      </button>
                    } @else {
                      <div class="due-edit-inline-box" (click)="$event.stopPropagation()">
                        <input type="date" class="date-inline-input tap-target" [(ngModel)]="editDueDateVal" />
                        <button type="button" class="btn-inline-save tap-target" (click)="saveDueDate()" [disabled]="isSavingDueDate()" title="Lưu hạn mới">
                          <span class="material-symbols-outlined">check</span>
                          <span>Lưu</span>
                        </button>
                        <button type="button" class="btn-inline-cancel tap-target" (click)="cancelEditDueDate()" title="Hủy">
                          <span class="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    }
                  } @else {
                    <span class="meta-val static-due-val" [class.overdue-text]="isTaskOverdue()">
                      {{ formatDateOnly(task()!.dueDate) }}
                    </span>
                  }
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

          <!-- EVALUATION MODAL DIALOG POPUP (TT 70, 89) -->
          @if (showEvalModal()) {
            <div class="eval-modal-backdrop" (click)="showEvalModal.set(false)">
              <div class="eval-modal-box" (click)="$event.stopPropagation()">
                <div class="eval-modal-header">
                  <div class="eval-modal-title">
                    <span class="material-symbols-outlined star-icon">hotel_class</span>
                    <h3>Đánh giá xếp loại kết quả công việc</h3>
                  </div>
                  <button type="button" class="btn-eval-close tap-target" (click)="showEvalModal.set(false)" title="Đóng">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div class="eval-modal-body">
                  <p class="eval-task-name">Nhiệm vụ: <strong>{{ task()!.title }}</strong></p>

                  <label class="eval-field-label">Chọn mức xếp loại đánh giá:</label>
                  <div class="eval-options-grid">
                    <button
                      type="button"
                      class="eval-opt-btn opt-xuat-sac tap-target"
                      [class.active]="selectedRating() === 'XUAT_SAC'"
                      (click)="selectedRating.set('XUAT_SAC')"
                    >
                      <span class="eval-opt-icon">⭐</span>
                      <span class="eval-opt-title">Xuất sắc</span>
                      <span class="eval-opt-sub">Vượt tiến độ, chất lượng cao</span>
                    </button>

                    <button
                      type="button"
                      class="eval-opt-btn opt-tot tap-target"
                      [class.active]="selectedRating() === 'TOT'"
                      (click)="selectedRating.set('TOT')"
                    >
                      <span class="eval-opt-icon">🟢</span>
                      <span class="eval-opt-title">Tốt</span>
                      <span class="eval-opt-sub">Đúng tiến độ, hồ sơ đầy đủ</span>
                    </button>

                    <button
                      type="button"
                      class="eval-opt-btn opt-hoan-thanh tap-target"
                      [class.active]="selectedRating() === 'HOAN_THANH'"
                      (click)="selectedRating.set('HOAN_THANH')"
                    >
                      <span class="eval-opt-icon">🔵</span>
                      <span class="eval-opt-title">Hoàn thành</span>
                      <span class="eval-opt-sub">Đạt yêu cầu cơ bản</span>
                    </button>

                    <button
                      type="button"
                      class="eval-opt-btn opt-chua-dat tap-target"
                      [class.active]="selectedRating() === 'CHUA_DAT'"
                      (click)="selectedRating.set('CHUA_DAT')"
                    >
                      <span class="eval-opt-icon">🔴</span>
                      <span class="eval-opt-title">Chưa đạt</span>
                      <span class="eval-opt-sub">Chưa đạt yêu cầu/chậm tiến độ</span>
                    </button>
                  </div>

                  <label class="eval-field-label">Nhận xét / Đánh giá chi tiết:</label>
                  <textarea
                    rows="3"
                    class="eval-textarea tap-target"
                    [(ngModel)]="evalCommentText"
                    placeholder="Nhập nhận xét về chất lượng thực hiện, tiến độ và sản phẩm công việc..."
                  ></textarea>
                </div>

                <div class="eval-modal-footer">
                  <button type="button" class="btn-eval-cancel tap-target" (click)="showEvalModal.set(false)">Hủy</button>
                  <button
                    type="button"
                    class="btn-eval-submit tap-target"
                    (click)="submitEvaluation()"
                    [disabled]="isSubmittingEval()"
                  >
                    @if (isSubmittingEval()) {
                      <span class="material-symbols-outlined spin">progress_activity</span>
                      <span>Đang lưu...</span>
                    } @else {
                      <span class="material-symbols-outlined">save</span>
                      <span>Lưu đánh giá kết quả</span>
                    }
                  </button>
                </div>
              </div>
            </div>
          }
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

            .due-tag {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 0.75rem;
              font-weight: 700;
              color: #1F3864;
              background: #EEF4FC;
              border: 1px solid #BFDBFE;
              padding: 2px 10px;
              border-radius: 9999px;
              cursor: pointer;
              transition: all 0.15s ease;

              .material-symbols-outlined { font-size: 14px; }
              .edit-hint { font-size: 13px; color: #2E5EAA; opacity: 0.8; }

              &:hover {
                background: #1F3864;
                color: #FFFFFF;
                .edit-hint { color: #FFFFFF; }
              }

              &.is-overdue {
                background: #FEE2E2;
                border-color: #FECDD3;
                color: #DC2626;
                &:hover {
                  background: #DC2626;
                  color: #FFFFFF;
                  .edit-hint { color: #FFFFFF; }
                }
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
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 16px;
        padding: 20px 24px;
        overflow-y: auto;
        overflow-x: hidden;
        box-sizing: border-box;

        @media (max-width: 880px) {
          grid-template-columns: 1fr;
        }
      }

      .body-main-col {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
        width: 100%;
        overflow: hidden;
        box-sizing: border-box;
      }

      .body-side-col {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
      }

      /* SECTION CARDS */
      .section-card,
      .side-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
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
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;

          .prog-note-input {
            flex: 1;
            min-width: 0;
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            font-size: 0.85rem;
            box-sizing: border-box;

            &:focus {
              border-color: #1F3864;
              outline: none;
            }
          }

          .btn-save-prog {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 8px 14px;
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;

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
            min-width: 0;
            width: 100%;
            box-sizing: border-box;

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

          .comment-bottom-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 4px;

            .comment-hint-text {
              font-size: 0.75rem;
              color: #94A3B8;
            }

            .btn-send-comment {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 6px 16px;
              background: #1F3864;
              color: #FFFFFF;
              border: none;
              border-radius: 8px;
              font-size: 0.82rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.15s ease;

              &:hover:not(:disabled) {
                background: #152744;
              }

              &:disabled {
                background: #CBD5E1;
                cursor: not-allowed;
              }

              .spin {
                animation: spin 1s linear infinite;
              }
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

          .read-only-role-notice {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 10px 12px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            font-size: 0.8rem;
            color: #64748B;
            line-height: 1.4;

            .material-symbols-outlined {
              font-size: 18px;
              color: #94A3B8;
              flex-shrink: 0;
              margin-top: 1px;
            }
          }

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
            &.btn-reopen { background: #0284C7; }

            &:hover {
              opacity: 0.9;
              transform: translateY(-1px);
            }
          }
        }

        .action-success-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 8px;
          color: #065F46;
          font-size: 0.78rem;
          font-weight: 700;
          margin-top: 10px;
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
              flex-shrink: 0;
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
                .material-symbols-outlined {
                  color: #FFFFFF;
                }
              }
            }
          }
        }
      }

      /* SIDEBAR: EVALUATION CARD (TT 70, 89) */
      .evaluation-card {
        background: #FDFBF7;
        border: 1px solid #FDE68A;

        .eval-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .eval-star-icon { color: #D97706; font-size: 18px; }
          .btn-eval-edit {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            background: #FEF3C7;
            border: 1px solid #FCD34D;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #92400E;
            cursor: pointer;
            &:hover { background: #FDE68A; }
          }
        }

        .eval-result-pill {
          padding: 8px 10px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;

          &.eval-XUAT_SAC { background: #FEF3C7; border: 1px solid #FCD34D; .eval-rating-title { color: #B45309; } }
          &.eval-TOT { background: #DCFCE7; border: 1px solid #86EFAC; .eval-rating-title { color: #15803D; } }
          &.eval-HOAN_THANH { background: #EFF6FF; border: 1px solid #93C5FD; .eval-rating-title { color: #1D4ED8; } }
          &.eval-CHUA_DAT { background: #FEE2E2; border: 1px solid #FCA5A5; .eval-rating-title { color: #B91C1C; } }

          .eval-rating-title { font-size: 0.88rem; font-weight: 800; }
          .eval-comment-text { font-size: 0.78rem; color: #475569; font-style: italic; margin: 0; }
          .eval-meta-info { font-size: 0.72rem; color: #64748B; }
        }
      }

      /* SIDEBAR: META INFO */
      .meta-info-card {
        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          padding: 6px 0;
          border-bottom: 1px solid #F1F5F9;

          &:last-child {
            border-bottom: none;
          }

          .meta-label { color: #64748B; }
          .meta-val { color: #1E293B; }

          .btn-edit-due-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 8px;
            background: #F1F5F9;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            color: #1E293B;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.15s ease;

            .due-text {
              font-weight: 700;
              color: #1F3864;
            }

            .edit-icon {
              font-size: 14px;
              color: #64748B;
            }

            &:hover {
              background: #EEF4FC;
              border-color: #93C5FD;
              color: #1F3864;

              .edit-icon {
                color: #1F3864;
              }
            }

            &.overdue-badge {
              background: #FEE2E2;
              border-color: #FCA5A5;
              color: #B91C1C;

              .due-text {
                color: #B91C1C;
              }
              .edit-icon {
                color: #B91C1C;
              }
            }
          }

          .btn-edit-inline-meta {
            background: transparent;
            border: none;
            padding: 2px;
            color: #64748B;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            border-radius: 4px;
            &:hover {
              color: #1F3864;
              background: #EEF4FC;
            }
            .material-symbols-outlined {
              font-size: 14px;
            }
          }
        }
      }

      .due-edit-inline-box {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;

        .date-inline-input {
          padding: 3px 6px;
          font-size: 0.8rem;
          border: 1.5px solid #1F3864;
          border-radius: 6px;
          outline: none;
        }

        .btn-inline-save {
          padding: 3px;
          background: #16A34A;
          color: #FFFFFF;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          .material-symbols-outlined { font-size: 14px; }
        }

        .btn-inline-cancel {
          padding: 3px;
          background: #94A3B8;
          color: #FFFFFF;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          .material-symbols-outlined { font-size: 14px; }
        }
      }

      /* PROGRESS PRESETS */
      .progress-presets-row {
        display: flex;
        gap: 6px;
        margin-top: 8px;
        flex-wrap: wrap;

        .btn-preset {
          flex: 1;
          padding: 4px 8px;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #EEF4FC;
            border-color: #93C5FD;
            color: #1F3864;
          }

          &.btn-preset-100 {
            background: #ECFDF5;
            border-color: #86EFAC;
            color: #16A34A;
            font-weight: 700;

            &:hover {
              background: #DCFCE7;
              border-color: #22C55E;
            }
          }
        }
      }

      /* STATUS INFO BOXES */
      .status-info-box {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 12px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        font-size: 0.8rem;
        color: #475569;
        line-height: 1.4;

        .material-symbols-outlined {
          font-size: 18px;
          color: #1F3864;
          flex-shrink: 0;
          margin-top: 1px;
        }

        &.alert-waiting {
          background: #FEF3C7;
          border-color: #FDE68A;
          color: #92400E;
          .material-symbols-outlined { color: #D97706; }
        }

        &.alert-completed {
          background: #ECFDF5;
          border-color: #A7F3D0;
          color: #065F46;
          .material-symbols-outlined { color: #059669; }
        }

        &.alert-locked {
          background: #F1F5F9;
          border-color: #CBD5E1;
          color: #475569;
          .material-symbols-outlined { color: #64748B; }
        }
      }

      /* DUE DATE READ-ONLY / EDITABLE BADGES */
      .due-tag.can-edit {
        cursor: pointer;
      }
      .due-tag.read-only {
        cursor: default;
        background: #F1F5F9;
        border-color: #E2E8F0;
        color: #475569;
        &:hover {
          background: #F1F5F9;
          color: #475569;
        }
      }
      .static-due-val {
        font-weight: 600;
        color: #1E293B;

        &.overdue-text {
          color: #DC2626;
          font-weight: 700;
        }
      }

      /* EVALUATION MODAL DIALOG */
      .eval-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(4px);
        z-index: 2300;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: fadeIn 0.15s ease-out;
      }

      .eval-modal-box {
        width: 100%;
        max-width: 540px;
        background: #FFFFFF;
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .eval-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: #F8FAFC;
        border-bottom: 1px solid #E2E8F0;

        .eval-modal-title {
          display: flex;
          align-items: center;
          gap: 8px;

          .star-icon {
            color: #D97706;
            font-size: 22px;
          }

          h3 {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 800;
            color: #1E293B;
          }
        }

        .btn-eval-close {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background: #EEF4FC;
          color: #1F3864;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
      }

      .eval-modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;

        .eval-task-name {
          margin: 0;
          font-size: 0.88rem;
          color: #475569;
          padding: 8px 12px;
          background: #F8FAFC;
          border-radius: 8px;
          border-left: 3px solid #1F3864;
        }

        .eval-field-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #1E293B;
          margin-top: 4px;
        }

        .eval-options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;

          .eval-opt-btn {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 10px 12px;
            background: #FFFFFF;
            border: 2px solid #E2E8F0;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: left;

            .eval-opt-icon { font-size: 1.2rem; margin-bottom: 2px; }
            .eval-opt-title { font-size: 0.88rem; font-weight: 700; color: #1E293B; }
            .eval-opt-sub { font-size: 0.72rem; color: #64748B; margin-top: 2px; }

            &:hover {
              border-color: #CBD5E1;
              background: #F8FAFC;
            }

            &.active {
              &.opt-xuat-sac { border-color: #F59E0B; background: #FFFBEB; }
              &.opt-tot { border-color: #10B981; background: #ECFDF5; }
              &.opt-hoan-thanh { border-color: #3B82F6; background: #EFF6FF; }
              &.opt-chua-dat { border-color: #EF4444; background: #FEF2F2; }
            }
          }
        }

        .eval-textarea {
          width: 100%;
          padding: 10px 12px;
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
      }

      .eval-modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding: 14px 20px;
        background: #F8FAFC;
        border-top: 1px solid #E2E8F0;

        .btn-eval-cancel {
          padding: 8px 16px;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          &:hover { background: #F1F5F9; }
        }

        .btn-eval-submit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          background: #1F3864;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          &:hover:not(:disabled) { background: #152744; }
          &:disabled { background: #CBD5E1; cursor: not-allowed; }
          .spin { animation: spin 1s linear infinite; }
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
  private notificationService = inject(NotificationService);

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
  actionSuccess = signal<string | null>(null);

  // Due Date inline editing
  isEditingDueDate = signal(false);
  editDueDateVal = '';
  isSavingDueDate = signal(false);

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

  startEditDueDate() {
    const t = this.task();
    this.editDueDateVal = t?.dueDate ? t.dueDate.slice(0, 10) : '';
    this.isEditingDueDate.set(true);
  }

  cancelEditDueDate() {
    this.isEditingDueDate.set(false);
  }

  saveDueDate() {
    const t = this.task();
    if (!t || !this.editDueDateVal) return;
    this.isSavingDueDate.set(true);
    const newDueDate = this.editDueDateVal;
    this.taskService.updateTask(t.id, { dueDate: newDueDate }).subscribe({
      next: (updated) => {
        this.isSavingDueDate.set(false);
        this.isEditingDueDate.set(false);
        this.task.set({ ...t, dueDate: newDueDate });
        this.actionSuccess.set('Đã cập nhật hạn hoàn thành thành công!');
        setTimeout(() => this.actionSuccess.set(null), 3000);
        this.taskUpdated.emit(updated || { ...t, dueDate: newDueDate });

        const currentUser = this.authService.currentUser();
        this.notificationService.emitNotification({
          title: 'Thay đổi hạn hoàn thành',
          content: `${currentUser?.fullName || 'Người giao việc'} đã điều chỉnh hạn hoàn thành công việc "${t.title}" sang ngày ${newDueDate}.`,
          type: 'NHAC_VIEC',
          taskId: t.id,
          taskCode: t.code,
          senderName: currentUser?.fullName,
          senderAvatar: currentUser?.avatarUrl,
        });

        this.loadTask(t.id);
      },
      error: (err) => {
        this.isSavingDueDate.set(false);
        alert(err.error?.message || 'Không thể cập nhật hạn hoàn thành.');
      },
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
    const progVal = this.tempProgress();
    const noteVal = this.progressNote;
    this.taskService.updateProgress(t.id, progVal, noteVal || undefined).subscribe({
      next: (updated) => {
        this.isUpdatingProgress.set(false);
        this.progressNote = '';
        this.loadTask(t.id);
        this.taskUpdated.emit(updated);

        const currentUser = this.authService.currentUser();
        this.notificationService.emitNotification({
          title: `Cập nhật tiến độ: ${progVal}%`,
          content: `${currentUser?.fullName || 'Cán bộ'} đã cập nhật tiến độ công việc "${t.title}" lên ${progVal}%. ${noteVal ? 'Ghi chú: ' + noteVal : ''}`,
          type: 'STATUS_CHANGED',
          taskId: t.id,
          taskCode: t.code,
          senderName: currentUser?.fullName,
          senderAvatar: currentUser?.avatarUrl,
        });
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

      const currentUser = this.authService.currentUser();
      this.notificationService.emitNotification({
        title: 'Minh chứng mới được tải lên',
        content: `${currentUser?.fullName || 'Cán bộ'} đã tải lên hồ sơ/ảnh minh chứng cho công việc "${t.title}".`,
        type: 'STATUS_CHANGED',
        taskId: t.id,
        taskCode: t.code,
        senderName: currentUser?.fullName,
        senderAvatar: currentUser?.avatarUrl,
      });
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

  // Permission checks
  canEditDueDate(): boolean {
    const t = this.task();
    if (!t) return false;
    const currentUserId = this.authService.currentUser()?.id;
    const isBGH = this.authService.isBGH() || this.authService.isAdmin() || this.authService.isHieuTruong();
    const isCreator = t.createdById === currentUserId;
    return isCreator || isBGH;
  }

  canAssigneeAct(): boolean {
    const t = this.task();
    if (!t) return false;
    if (t.status === 'HOAN_THANH' || t.status === 'XAC_NHAN' || t.status === 'DONG') return false;
    const currentUserId = this.authService.currentUser()?.id;
    const isBGH = this.authService.isBGH() || this.authService.isAdmin();
    const isCreator = t.createdById === currentUserId;
    const isAssigned = t.assignments?.some(a => a.userId === currentUserId && (a.role === 'CHU_TRI' || a.role === 'PHOI_HOP'));
    return isAssigned || isCreator || isBGH;
  }

  isInspectorOrBGH(): boolean {
    const t = this.task();
    if (!t) return false;
    const currentUserId = this.authService.currentUser()?.id;
    const isBGH = this.authService.isBGH() || this.authService.isAdmin() || this.authService.isHieuTruong();
    const isInspector = t.assignments?.some(a => a.userId === currentUserId && (a.role === 'KIEM_TRA' || a.role === 'PHE_DUYET'));
    const isCreator = t.createdById === currentUserId;
    return isBGH || isInspector || isCreator;
  }

  canPerformAnyAction(): boolean {
    return this.canAssigneeAct() || this.isInspectorOrBGH();
  }

  canCloseOrReopen(): boolean {
    const t = this.task();
    if (!t) return false;
    const currentUserId = this.authService.currentUser()?.id;
    const isBGH = this.authService.isBGH() || this.authService.isAdmin() || this.authService.isHieuTruong();
    const isCreator = t.createdById === currentUserId;
    return isBGH || isCreator;
  }

  getDisplayFileName(name: string | undefined): string {
    if (!name) return 'Tệp đính kèm';
    let result = name;
    for (let i = 0; i < 2; i++) {
      try {
        if (/[\u00C0-\u00FF]/.test(result)) {
          const bytes = new Uint8Array([...result].map((c) => c.charCodeAt(0) & 0xff));
          const decoded = new TextDecoder('utf-8').decode(bytes);
          if (!decoded.includes('\ufffd') && decoded !== result) {
            result = decoded;
            continue;
          }
        }
      } catch (_) {}
      break;
    }
    return result;
  }

  canDeleteAttachment(file: TaskAttachmentItem): boolean {
    const t = this.task();
    if (!t) return false;
    if (t.status === 'DONG') return false;
    const currentUserId = this.authService.currentUser()?.id;
    const isUploader = file.uploadedById === currentUserId;
    const isBGH = this.authService.isBGH() || this.authService.isAdmin();
    const isCreator = t.createdById === currentUserId;
    return isUploader || isCreator || isBGH;
  }

  setTempProgress(val: number) {
    this.tempProgress.set(val);
  }

  submitForReview() {
    const t = this.task();
    if (!t) return;
    if (t.requireAttachment && (!t.attachments || t.attachments.length === 0)) {
      alert('Công việc này yêu cầu bắt buộc phải có tệp hoặc ảnh chụp minh chứng kết quả trước khi gửi nghiệm thu.');
      return;
    }
    this.performStatusChange('CHO_KIEM_TRA', 'Đã hoàn tất công việc, gửi yêu cầu kiểm tra nghiệm thu');
  }

  approveCompleted() {
    this.performStatusChange('HOAN_THANH', 'Nghiệm thu đạt yêu cầu, hoàn thành công việc');
  }

  // Workflow logic
  canTransitionTo(status: TaskStatus | 'REOPEN'): boolean {
    const t = this.task();
    if (!t) return false;
    const current = t.status;
    const currentUserId = this.authService.currentUser()?.id;
    const isBGH = this.authService.isBGH();
    const isHieuTruong = this.authService.isHieuTruong();
    const isCreator = t.createdById === currentUserId;

    const userAssignment = t.assignments?.find((a) => a.userId === currentUserId);
    const userRole = userAssignment?.role;
    const isChuTri = userRole === 'CHU_TRI' || isCreator;
    const isAssignee = !!userAssignment || isCreator;
    const isInspector = userRole === 'KIEM_TRA' || userRole === 'PHE_DUYET' || isBGH;
    const hasInspectorInTask = t.assignments?.some((a) => a.role === 'KIEM_TRA' || a.role === 'PHE_DUYET');

    switch (status) {
      case 'DA_TIEP_NHAN':
        return (current === 'DA_GIAO' || current === 'NHAP') && (isAssignee || isBGH);
      case 'DANG_THUC_HIEN':
        return (current === 'DA_TIEP_NHAN' || current === 'BO_SUNG' || current === 'DA_GIAO' || current === 'NHAP') && (isAssignee || isBGH);
      case 'CHO_KIEM_TRA':
        return (current === 'DANG_THUC_HIEN' || current === 'DA_TIEP_NHAN' || current === 'BO_SUNG' || current === 'DA_GIAO') && (isAssignee || isBGH);
      case 'HOAN_THANH':
        return (current === 'CHO_KIEM_TRA' || current === 'DANG_THUC_HIEN') && (isInspector || (!hasInspectorInTask && (isChuTri || isBGH)));
      case 'BO_SUNG':
        return current === 'CHO_KIEM_TRA' && isInspector;
      case 'DONG':
        return (current === 'HOAN_THANH' || current === 'XAC_NHAN') && (isHieuTruong || isCreator || isBGH || userRole === 'PHE_DUYET');
      case 'REOPEN':
        return (current === 'HOAN_THANH' || current === 'DONG') && (isHieuTruong || isBGH || isCreator);
      default:
        return false;
    }
  }

  hasAnyAction(): boolean {
    return (
      this.canTransitionTo('DA_TIEP_NHAN') ||
      this.canTransitionTo('DANG_THUC_HIEN') ||
      this.canTransitionTo('CHO_KIEM_TRA') ||
      this.canTransitionTo('HOAN_THANH') ||
      this.canTransitionTo('BO_SUNG') ||
      this.canTransitionTo('DONG') ||
      this.canTransitionTo('REOPEN')
    );
  }

  performStatusChange(status: TaskStatus, note?: string) {
    const t = this.task();
    if (!t) return;
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.taskService.updateStatus(t.id, status, note).subscribe({
      next: (updated) => {
        this.actionSuccess.set('Đã chuyển trạng thái công việc thành công!');
        this.loadTask(t.id);
        this.taskUpdated.emit(updated);
        setTimeout(() => this.actionSuccess.set(null), 3000);

        const currentUser = this.authService.currentUser();
        const statusNames: any = {
          DA_TIEP_NHAN: 'Đã tiếp nhận',
          DANG_THUC_HIEN: 'Bắt đầu thực hiện',
          CHO_KIEM_TRA: 'Chờ kiểm tra / nghiệm thu',
          BO_SUNG: 'Yêu cầu bổ sung',
          HOAN_THANH: 'Đã hoàn thành',
          DONG: 'Đã đóng hồ sơ',
        };
        const sName = statusNames[status] || status;

        this.notificationService.emitNotification({
          title: `Chuyển trạng thái: ${sName}`,
          content: `${currentUser?.fullName || 'Cán bộ'} đã chuyển việc "${t.title}" sang trạng thái [${sName}]. ${note ? 'Ghi chú: ' + note : ''}`,
          type: status === 'BO_SUNG' ? 'CAN_BO_SUNG' : status === 'HOAN_THANH' ? 'DA_HOAN_THANH' : 'STATUS_CHANGED',
          taskId: t.id,
          taskCode: t.code,
          senderName: currentUser?.fullName,
          senderAvatar: currentUser?.avatarUrl,
        });
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

  onCommentKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (!this.showMentionSuggestions()) {
        event.preventDefault();
        this.submitComment();
      }
    }
  }

  submitComment() {
    const t = this.task();
    if (!t || !this.commentText.trim()) return;

    const content = this.commentText.trim();
    this.isSubmittingComment.set(true);
    this.taskService.addComment(t.id, content).subscribe({
      next: (newComment) => {
        this.isSubmittingComment.set(false);
        this.commentText = '';
        this.showMentionSuggestions.set(false);
        const currentComments = t.comments || [];
        const userObj = this.authService.currentUser();
        const commentObj = newComment || {
          id: 'cmt-' + Date.now(),
          taskId: t.id,
          userId: userObj?.id || 'u-user',
          content,
          createdAt: new Date().toISOString(),
          user: {
            id: userObj?.id || 'u-user',
            fullName: userObj?.fullName || 'Tôi',
            title: userObj?.title || 'Giáo viên',
            avatarUrl: userObj?.avatarUrl || null,
            phone: userObj?.phone || '',
          },
        };
        this.task.set({ ...t, comments: [...currentComments, commentObj] });
        this.loadTask(t.id);

        this.notificationService.emitNotification({
          title: `Trao đổi mới trong ${t.code || 'công việc'}`,
          content: `${userObj?.fullName || 'Cán bộ'}: "${content.length > 80 ? content.slice(0, 80) + '...' : content}"`,
          type: 'GENERAL',
          taskId: t.id,
          taskCode: t.code,
          senderName: userObj?.fullName,
          senderAvatar: userObj?.avatarUrl,
        });
      },
      error: (err) => {
        this.isSubmittingComment.set(false);
        alert(err.error?.message || 'Không thể gửi trao đổi.');
      },
    });
  }

  formatCommentText(text: string): string {
    if (!text) return '';
    return text.replace(/@([A-ZÀ-Ỵa-zà-ỵ\s]+)/g, '<strong style="color: #1F3864; background: #EEF4FC; padding: 1px 4px; border-radius: 4px;">@$1</strong>');
  }

  openContact(user: any, event: Event) {
    event.stopPropagation();
    if (user) {
      this.contactCardService.open(user);
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

  showEvalModal = signal(false);
  selectedRating = signal<TaskEvaluationRating>('TOT');
  evalCommentText = '';
  isSubmittingEval = signal(false);

  canEvaluateTask(): boolean {
    return this.authService.isBGH() || this.authService.isToTruong() || this.authService.isAdmin();
  }

  getEvaluationLabel(rating: TaskEvaluationRating): string {
    switch (rating) {
      case 'XUAT_SAC': return '⭐ Xuất sắc';
      case 'TOT': return '🟢 Tốt';
      case 'HOAN_THANH': return '🔵 Hoàn thành';
      case 'CHUA_DAT': return '🔴 Chưa đạt';
      default: return rating;
    }
  }

  submitEvaluation() {
    const t = this.task();
    if (!t) return;
    this.isSubmittingEval.set(true);
    const rating = this.selectedRating();
    const comment = this.evalCommentText;
    this.taskService.evaluateTask(t.id, {
      rating,
      comment,
    }).subscribe({
      next: (updated) => {
        this.isSubmittingEval.set(false);
        this.showEvalModal.set(false);
        this.evalCommentText = '';
        this.loadTask(t.id);
        this.taskUpdated.emit(updated);

        const currentUser = this.authService.currentUser();
        const ratingName = rating === 'XUAT_SAC' ? 'Xuất sắc' : rating === 'TOT' ? 'Tốt' : rating === 'HOAN_THANH' ? 'Hoàn thành' : 'Chưa đạt';
        this.notificationService.emitNotification({
          title: `Kết quả nghiệm thu: [${ratingName}]`,
          content: `${currentUser?.fullName || 'Ban Giám hiệu'} đã đánh giá xếp loại công việc "${t.title}". ${comment ? 'Nhận xét: ' + comment : ''}`,
          type: rating === 'CHUA_DAT' ? 'CAN_BO_SUNG' : 'TASK_APPROVED',
          taskId: t.id,
          taskCode: t.code,
          senderName: currentUser?.fullName,
          senderAvatar: currentUser?.avatarUrl,
        });
      },
      error: (err) => {
        this.isSubmittingEval.set(false);
        alert(err.error?.message || 'Không thể lưu đánh giá.');
      },
    });
  }

  formatLogAction(log: TaskLogItem): string {
    if (log.action === 'CREATE_TASK') return 'Đã giao công việc mới';
    if (log.action === 'UPDATE_STATUS') return `Chuyển trạng thái sang: ${log.newStatus}`;
    if (log.action === 'UPDATE_PROGRESS') return `Cập nhật tiến độ lên ${log.newProgress}%`;
    if (log.action === 'ATTACH_FILE') return 'Đính kèm tệp minh chứng';
    if (log.action === 'DANH_GIA_KET_QUA') return 'Đánh giá xếp loại kết quả';
    return log.action;
  }
}
