import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { AttachmentService } from '../../core/services/attachment.service';
import { ContactCardService } from '../../core/services/contact-card.service';
import {
  TaskItem,
  TaskStatus,
  TaskPriority,
  TaskAssignmentRole,
  TaskLogItem,
  TaskAttachmentItem,
  TaskCommentItem,
} from '../../core/models/task.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { FileDropzoneComponent } from '../../shared/components/file-dropzone/file-dropzone.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StatusBadgeComponent, FileDropzoneComponent],
  template: `
    <div class="task-detail-page">
      <!-- TOP NAVIGATION BREADCRUMB & BACK BUTTON -->
      <div class="top-nav-bar">
        <button type="button" class="btn-back tap-target" (click)="goBack()">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>Quay lại danh sách</span>
        </button>

        <div class="breadcrumb-trail">
          <a routerLink="/tasks" class="bc-link">Công việc</a>
          <span class="bc-sep">/</span>
          <span class="bc-current">{{ task()?.code || 'Chi tiết công việc' }}</span>
        </div>
      </div>

      @if (isLoading()) {
        <div class="loading-state-box">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <span>Đang tải thông tin chi tiết công việc...</span>
        </div>
      } @else if (!task()) {
        <div class="not-found-box">
          <span class="material-symbols-outlined not-found-icon">error</span>
          <h2>Không tìm thấy công việc</h2>
          <p>Công việc này không tồn tại hoặc bạn không có quyền truy cập.</p>
          <button type="button" class="btn-primary" (click)="goBack()">Trở về trang Công việc</button>
        </div>
      } @else {
        <!-- 1. HERO HEADER SECTION -->
        <header class="task-hero-card">
          <div class="hero-top-row">
            <div class="hero-tags-group">
              <span class="task-code-badge">{{ task()!.code || 'CV-' + task()!.id.slice(0, 6) }}</span>
              <app-status-badge [status]="task()!.status"></app-status-badge>
              <span class="priority-pill" [ngClass]="'prio-' + task()!.priority">
                {{ getPriorityLabel(task()!.priority) }}
              </span>
              @if (task()!.location) {
                <span class="location-pill">
                  <span class="material-symbols-outlined">place</span>
                  <span>{{ task()!.location?.name }}</span>
                </span>
              }
              @if (task()!.orgUnit) {
                <span class="org-pill">
                  <span class="material-symbols-outlined">groups</span>
                  <span>{{ task()!.orgUnit?.name }}</span>
                </span>
              }
            </div>

            <!-- DUE DATE WITH OVERDUE ALERT & INLINE EDIT -->
            <div class="due-date-badge" [class.is-overdue]="isOverdue()">
              <span class="material-symbols-outlined due-icon">
                {{ isOverdue() ? 'alarm_on' : 'event' }}
              </span>
              <div class="due-date-text">
                <span class="due-label">{{ isOverdue() ? 'ĐÃ QUÁ HẠN' : 'Hạn hoàn thành' }}</span>
                @if (!isEditingDueDate()) {
                  <div class="due-display-row">
                    <strong class="due-value">{{ formatDateOnly(task()!.dueDate) }}</strong>
                    <button type="button" class="btn-edit-inline tap-target" (click)="startEditDueDate()" title="Sửa hạn hoàn thành">
                      <span class="material-symbols-outlined">edit_calendar</span>
                    </button>
                  </div>
                } @else {
                  <div class="due-edit-inline-box" (click)="$event.stopPropagation()">
                    <input type="date" class="date-inline-input tap-target" [(ngModel)]="editDueDateVal" />
                    <button type="button" class="btn-inline-save tap-target" (click)="saveDueDate()" [disabled]="isSavingDueDate()" title="Lưu hạn mới">
                      <span class="material-symbols-outlined">check</span>
                    </button>
                    <button type="button" class="btn-inline-cancel tap-target" (click)="cancelEditDueDate()" title="Hủy">
                      <span class="material-symbols-outlined">close</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>

          <h1 class="task-hero-title">{{ task()!.title }}</h1>

          <!-- MAIN LEADER / CHỦ TRÌ ROW -->
          <div class="hero-chu-tri-bar">
            <span class="bar-label">Người chủ trì chính:</span>
            @if (chuTriUser(); as chuTri) {
              <div
                class="chu-tri-profile-chip tap-target"
                (click)="openContact(chuTri, $event)"
                [title]="'Xem liên hệ: ' + chuTri.fullName"
              >
                <img
                  [src]="chuTri.avatarUrl || 'assets/images/default-avatar.svg'"
                  class="chu-tri-avatar"
                  [alt]="chuTri.fullName"
                />
                <div class="chu-tri-info">
                  <strong class="chu-tri-name">{{ chuTri.fullName }}</strong>
                  <span class="chu-tri-title">{{ chuTri.title || 'Cán bộ giáo viên' }}</span>
                </div>
                <a
                  [href]="'tel:' + chuTri.phone"
                  class="btn-call-hero tap-target"
                  (click)="$event.stopPropagation()"
                  title="Gọi điện ngay"
                >
                  <span class="material-symbols-outlined">call</span>
                  <span>Gọi ngay ({{ chuTri.phone }})</span>
                </a>
              </div>
            } @else {
              <span class="unassigned-badge">Chưa phân công Chủ trì</span>
            }
          </div>
        </header>

        <!-- 2. MAIN DETAIL GRID (2 COLUMNS) -->
        <div class="task-detail-grid">
          <!-- LEFT COLUMN: NỘI DUNG, TIẾN ĐỘ, MINH CHỨNG, TIMELINE, BÌNH LUẬN -->
          <div class="grid-main-col">
            <!-- NỘI DUNG YÊU CẦU & KẾ HOẠCH MẸ -->
            <section class="card-box desc-card">
              <div class="card-header-bar">
                <div class="card-title">
                  <span class="material-symbols-outlined icon-navy">description</span>
                  <h2>Nội dung yêu cầu & Mục tiêu cần đạt</h2>
                </div>
              </div>

              <div class="desc-content-body">
                <p class="desc-paragraph">{{ task()!.description || 'Không có mô tả bổ sung.' }}</p>

                @if (task()!.plan) {
                  <div class="plan-link-card">
                    <span class="material-symbols-outlined plan-icon">account_tree</span>
                    <div class="plan-info">
                      <span class="plan-sub">Kế hoạch trực thuộc:</span>
                      <strong class="plan-name">[{{ task()!.plan?.level }}] {{ task()!.plan?.title }}</strong>
                    </div>
                  </div>
                }
              </div>
            </section>

            <!-- CẬP NHẬT % TIẾN ĐỘ (SLIDER + GHI CHÚ) -->
            <section class="card-box progress-card">
              <div class="card-header-bar">
                <div class="card-title">
                  <span class="material-symbols-outlined icon-teal">trending_up</span>
                  <h2>Cập nhật tiến độ thực hiện</h2>
                </div>
                <div class="progress-number-badge" [style.color]="getProgressColor(tempProgress())">
                  {{ tempProgress() }}%
                </div>
              </div>

              @if (canUpdateProgress()) {
                <div class="progress-interactive-body">
                  <div class="slider-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      class="progress-slider-large"
                      [(ngModel)]="tempProgress"
                    />
                    <div class="slider-ticks">
                      <span>0% (Bắt đầu)</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100% (Hoàn tất)</span>
                    </div>
                  </div>

                  <div class="progress-note-form">
                    <input
                      type="text"
                      class="progress-input-note"
                      [(ngModel)]="progressNote"
                      placeholder="Ghi chú nội dung vừa hoàn thành (ví dụ: Đã gửi biên bản niêm phong)..."
                    />
                    <button
                      type="button"
                      class="btn-save-progress tap-target"
                      (click)="saveProgress()"
                      [disabled]="isUpdatingProgress() || tempProgress() === task()!.progressPercent"
                    >
                      @if (isUpdatingProgress()) {
                        <span class="material-symbols-outlined spin">progress_activity</span>
                        <span>Đang lưu...</span>
                      } @else {
                        <span class="material-symbols-outlined">save</span>
                        <span>Lưu % tiến độ</span>
                      }
                    </button>
                  </div>
                </div>
              } @else {
                <div class="progress-readonly-box">
                  <div class="readonly-bar-track">
                    <div
                      class="readonly-bar-fill"
                      [style.width.%]="task()!.progressPercent || 0"
                      [style.background-color]="getProgressColor(task()!.progressPercent)"
                    ></div>
                  </div>
                  <span class="readonly-note">
                    Chỉ người Chủ trì, Phối hợp hoặc Ban Giám hiệu mới có quyền cập nhật % tiến độ.
                  </span>
                </div>
              }
            </section>

            <!-- HỒ SƠ & MINH CHỨNG KẾT QUẢ (FILE DROPZONE) -->
            <section class="card-box attachments-card">
              <div class="card-header-bar">
                <div class="card-title">
                  <span class="material-symbols-outlined icon-amber">attachment</span>
                  <h2>Hồ sơ & Minh chứng kết quả</h2>
                  @if (task()!.requireAttachment) {
                    <span class="evidence-required-tag">BẮT BUỘC MINH CHỨNG</span>
                  }
                </div>
                <span class="count-badge">{{ task()!.attachments?.length || 0 }} tệp</span>
              </div>

              <!-- DANH SÁCH FILE MINH CHỨNG ĐÃ TẢI -->
              @if (task()!.attachments && task()!.attachments!.length > 0) {
                <div class="file-gallery-list">
                  @for (file of task()!.attachments; track file.id) {
                    <div class="file-card-row">
                      <div class="file-type-icon-box">
                        <span class="material-symbols-outlined">{{ getFileIcon(file.mimeType) }}</span>
                      </div>
                      <div class="file-info-col">
                        <a [href]="file.fileUrl" target="_blank" class="file-name-link" [title]="file.originalName">
                          {{ file.originalName }}
                        </a>
                        <div class="file-sub-meta">
                          <span>{{ formatFileSize(file.fileSize) }}</span>
                          <span>• Người nộp: <strong>{{ file.uploadedBy?.fullName || 'Giáo viên' }}</strong></span>
                          <span>• {{ formatDate(file.createdAt) }}</span>
                        </div>
                      </div>
                      <div class="file-actions-col">
                        <a [href]="file.fileUrl" target="_blank" class="btn-file-icon" title="Xem / Tải về">
                          <span class="material-symbols-outlined">download</span>
                        </a>
                        <button
                          type="button"
                          class="btn-file-icon delete"
                          (click)="deleteAttachment(file.id)"
                          title="Xóa minh chứng"
                        >
                          <span class="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-files-placeholder">
                  <span class="material-symbols-outlined">draft</span>
                  <p>Chưa có tệp / ảnh minh chứng nào được tải lên cho công việc này.</p>
                </div>
              }

              <!-- FILE DROPZONE COMPONENT -->
              <div class="dropzone-box">
                <app-file-dropzone
                  [taskId]="task()!.id"
                  (uploadSuccess)="onUploadSuccess($event)"
                ></app-file-dropzone>
              </div>
            </section>

            <!-- TIMELINE / NHẬT KÝ HOẠT ĐỘNG THEO THỜI GIAN DỌC -->
            <section class="card-box timeline-card">
              <div class="card-header-bar">
                <div class="card-title">
                  <span class="material-symbols-outlined icon-blue">history</span>
                  <h2>Nhật ký hoạt động & Thay đổi trạng thái</h2>
                </div>
                <span class="count-badge">{{ task()!.logs?.length || 0 }} sự kiện</span>
              </div>

              <div class="vertical-timeline-container">
                @if (task()!.logs && task()!.logs!.length > 0) {
                  @for (log of task()!.logs; track log.id) {
                    <div class="timeline-entry">
                      <div class="timeline-dot" [ngClass]="getTimelineDotClass(log.action)">
                        <span class="material-symbols-outlined">{{ getTimelineIcon(log.action) }}</span>
                      </div>
                      <div class="timeline-card-content">
                        <div class="timeline-top-info">
                          <strong class="log-actor" (click)="openContact(log.user, $event)">
                            {{ log.user?.fullName || 'Hệ thống' }}
                          </strong>
                          <span class="log-action-text">{{ formatLogAction(log) }}</span>
                          <span class="log-timestamp">{{ formatDate(log.createdAt) }}</span>
                        </div>

                        @if (log.note) {
                          <div class="log-note-bubble">
                            <span class="material-symbols-outlined note-icon">format_quote</span>
                            <span>{{ log.note }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                } @else {
                  <p class="empty-timeline-text">Chưa có nhật ký ghi nhận.</p>
                }
              </div>
            </section>

            <!-- KHU VỰC BÌNH LUẬN VỚI @MENTION -->
            <section class="card-box comments-card">
              <div class="card-header-bar">
                <div class="card-title">
                  <span class="material-symbols-outlined icon-purple">forum</span>
                  <h2>Trao đổi nội bộ ({{ task()!.comments?.length || 0 }})</h2>
                </div>
              </div>

              <!-- INPUT TEXTAREA WITH @MENTION POPUP -->
              <div class="comment-composer-box">
                <div class="composer-wrapper">
                  <textarea
                    rows="3"
                    class="composer-textarea"
                    [(ngModel)]="commentText"
                    (keyup)="onCommentKeyUp($event)"
                    (keydown)="onCommentKeyDown($event)"
                    placeholder="Viết ý kiến trao đổi... (Gõ @ để nhắc tên giáo viên liên quan • Enter để gửi)"
                  ></textarea>

                  <!-- MENTION SUGGESTION POPUP -->
                  @if (showMentionSuggestions()) {
                    <div class="mention-autocomplete-menu">
                      <div class="mention-menu-header">Gợi ý người liên quan trong việc:</div>
                      @for (member of taskMembers(); track member.id) {
                        <div class="mention-member-row tap-target" (click)="selectMentionMember(member)">
                          <img [src]="member.avatarUrl || 'assets/images/default-avatar.svg'" class="m-avatar" alt="" />
                          <div class="m-info">
                            <strong class="m-name">{{ member.fullName }}</strong>
                            <span class="m-title">{{ member.title || 'Cán bộ' }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>

                <div class="composer-footer">
                  <span class="composer-hint">💡 Mẹo: Gõ <strong>&#64;</strong> để gắn thẻ người liên quan</span>
                  <button
                    type="button"
                    class="btn-send-comment tap-target"
                    (click)="submitComment()"
                    [disabled]="!commentText.trim() || isSubmittingComment()"
                  >
                    @if (isSubmittingComment()) {
                      <span class="material-symbols-outlined spin">progress_activity</span>
                      <span>Đang gửi...</span>
                    } @else {
                      <span class="material-symbols-outlined">send</span>
                      <span>Gửi trao đổi</span>
                    }
                  </button>
                </div>
              </div>

              <!-- COMMENTS LIST -->
              <div class="comments-stream">
                @for (c of task()!.comments || []; track c.id) {
                  <div class="comment-entry">
                    <img
                      [src]="c.user?.avatarUrl || 'assets/images/default-avatar.svg'"
                      class="comment-author-avatar"
                      [alt]="c.user?.fullName"
                    />
                    <div class="comment-bubble-box">
                      <div class="comment-bubble-header">
                        <strong class="author-name" (click)="openContact(c.user, $event)">
                          {{ c.user?.fullName }}
                        </strong>
                        <span class="comment-time">{{ formatDate(c.createdAt) }}</span>
                      </div>
                      <div class="comment-bubble-body" [innerHTML]="formatCommentText(c.content)"></div>
                    </div>
                  </div>
                }
              </div>
            </section>
          </div>

          <!-- RIGHT COLUMN: RACI TEAM & WORKFLOW ACTION BUTTONS -->
          <div class="grid-side-col">
            <!-- 1. VÙNG NÚT HÀNH ĐỘNG THEO QUY TRÌNH (ROLE-BASED) -->
            <section class="card-box workflow-actions-card">
              <h3 class="side-card-title">
                <span class="material-symbols-outlined">tune</span>
                <span>Hành động quy trình</span>
              </h3>

              <div class="status-summary-box">
                <span class="label">Trạng thái hiện tại:</span>
                <app-status-badge [status]="task()!.status"></app-status-badge>
              </div>

              <div class="action-buttons-stack">
                @if (!hasAnyAction() && task()!.status !== 'DONG') {
                  <div class="read-only-role-notice">
                    <span class="material-symbols-outlined">visibility</span>
                    <span>Bạn đang xem công việc với quyền theo dõi (Chỉ người được phân công RACI phù hợp mới có thể chuyển trạng thái).</span>
                  </div>
                }

                <!-- NÚT 1: NHẬN VIỆC & BẮT ĐẦU NGAY (KHI DA_GIAO/NHAP) -->
                @if (canTransitionTo('DANG_THUC_HIEN') && (task()!.status === 'DA_GIAO' || task()!.status === 'NHAP')) {
                  <button
                    type="button"
                    class="btn-wf-action btn-indigo tap-target"
                    (click)="performStatusChange('DANG_THUC_HIEN', 'Nhận việc & Bắt đầu thực hiện')"
                  >
                    <span class="material-symbols-outlined">play_circle</span>
                    <span>Nhận việc & Bắt đầu làm</span>
                  </button>
                }

                <!-- NÚT 1B: TIẾP NHẬN VIỆC (CHUYỂN SANG DA_TIEP_NHAN) -->
                @if (canTransitionTo('DA_TIEP_NHAN')) {
                  <button
                    type="button"
                    class="btn-wf-action btn-blue tap-target"
                    (click)="performStatusChange('DA_TIEP_NHAN', 'Đã tiếp nhận công việc')"
                  >
                    <span class="material-symbols-outlined">assignment_turned_in</span>
                    <span>Tiếp nhận công việc</span>
                  </button>
                }

                <!-- NÚT 2: BẮT ĐẦU LÀM (KHI ĐANG Ở DA_TIEP_NHAN HOẶC BO_SUNG) -->
                @if (canTransitionTo('DANG_THUC_HIEN') && task()!.status !== 'DA_GIAO' && task()!.status !== 'NHAP' && task()!.status !== 'HOAN_THANH' && task()!.status !== 'DONG') {
                  <button
                    type="button"
                    class="btn-wf-action btn-indigo tap-target"
                    (click)="performStatusChange('DANG_THUC_HIEN', 'Bắt đầu thực hiện')"
                  >
                    <span class="material-symbols-outlined">play_arrow</span>
                    <span>Bắt đầu thực hiện</span>
                  </button>
                }

                <!-- NÚT 3: GỬI DUYỆT / NGHIỆM THU (CHO_KIEM_TRA) -->
                @if (canTransitionTo('CHO_KIEM_TRA')) {
                  <button
                    type="button"
                    class="btn-wf-action btn-amber tap-target"
                    (click)="performStatusChange('CHO_KIEM_TRA', 'Đã nộp kết quả, gửi kiểm tra nghiệm thu')"
                  >
                    <span class="material-symbols-outlined">send_and_archive</span>
                    <span>Gửi yêu cầu kiểm tra & nghiệm thu</span>
                  </button>
                }

                <!-- NÚT 4: DUYỆT ĐẠT / HOÀN THÀNH (HOAN_THANH) CHO NGƯỜI KIỂM TRA & BGH -->
                @if (canTransitionTo('HOAN_THANH')) {
                  <button
                    type="button"
                    class="btn-wf-action btn-green tap-target"
                    (click)="performStatusChange('HOAN_THANH', 'Nghiệm thu kết quả đạt yêu cầu')"
                  >
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>Nghiệm thu ĐẠT / Hoàn thành</span>
                  </button>
                }

                <!-- NÚT 5: YÊU CẦU BỔ SUNG (BO_SUNG) CHO NGƯỜI KIỂM TRA -->
                @if (canTransitionTo('BO_SUNG')) {
                  <button
                    type="button"
                    class="btn-wf-action btn-orange tap-target"
                    (click)="promptReasonAndChange('BO_SUNG')"
                  >
                    <span class="material-symbols-outlined">replay</span>
                    <span>Yêu cầu bổ sung kết quả</span>
                  </button>
                }

                <!-- NÚT 6: ĐÓNG CÔNG VIỆC (DONG) CHO BGH / NGƯỜI TẠO -->
                @if (canTransitionTo('DONG')) {
                  <button
                    type="button"
                    class="btn-wf-action btn-gray tap-target"
                    (click)="performStatusChange('DONG', 'Đã lưu trữ và đóng hồ sơ công việc')"
                  >
                    <span class="material-symbols-outlined">lock</span>
                    <span>Đóng hồ sơ công việc</span>
                  </button>
                }

                <!-- NÚT 7: MỞ LẠI CÔNG VIỆC (CHO BGH / ADMIN) -->
                @if (canTransitionTo('REOPEN')) {
                  <button
                    type="button"
                    class="btn-wf-action btn-reopen tap-target"
                    (click)="performStatusChange('DANG_THUC_HIEN', 'Mở lại công việc để tiếp tục thực hiện')"
                  >
                    <span class="material-symbols-outlined">lock_open</span>
                    <span>Mở lại công việc</span>
                  </button>
                }
              </div>

              @if (workflowError()) {
                <div class="wf-error-alert">
                  <span class="material-symbols-outlined">error</span>
                  <span>{{ workflowError() }}</span>
                </div>
              }
            </section>

            <!-- 2. RACI TEAM CARD (CLICK-TO-CALL TỨC THÌ) -->
            <section class="card-box raci-card">
              <h3 class="side-card-title">
                <span class="material-symbols-outlined">group</span>
                <span>Những người liên quan (RACI)</span>
              </h3>

              <!-- CHỦ TRÌ (CHÍNH) -->
              <div class="raci-role-section">
                <div class="role-badge-tag role-chutri">1. CHỦ TRÌ (CHỊU TRÁCH NHIỆM CHÍNH)</div>
                @if (chuTriAssignment(); as asgn) {
                  <div class="raci-member-card tap-target" (click)="openContact(asgn.user, $event)">
                    <img
                      [src]="asgn.user.avatarUrl || 'assets/images/default-avatar.svg'"
                      class="raci-user-avatar"
                      [alt]="asgn.user.fullName"
                    />
                    <div class="raci-user-info">
                      <strong class="u-name">{{ asgn.user.fullName }}</strong>
                      <span class="u-title">{{ asgn.user.title || 'Giáo viên' }}</span>
                      <span class="u-loc">{{ asgn.user.primaryLocation?.name }}</span>
                    </div>
                    @if (asgn.user.phone) {
                      <a
                        [href]="'tel:' + asgn.user.phone"
                        class="btn-call-circle tap-target"
                        (click)="$event.stopPropagation()"
                        [title]="'Gọi ngay: ' + asgn.user.phone"
                      >
                        <span class="material-symbols-outlined">call</span>
                        <span class="call-phone-text">{{ asgn.user.phone }}</span>
                      </a>
                    }
                  </div>
                }
              </div>

              <!-- PHỐI HỢP (NHIỀU NGƯỜI) -->
              @if (phoiHopAssignments().length > 0) {
                <div class="raci-role-section">
                  <div class="role-badge-tag role-phoihop">2. PHỐI HỢP THỰC HIỆN</div>
                  <div class="raci-members-stack">
                    @for (asgn of phoiHopAssignments(); track asgn.id) {
                      <div class="raci-member-card tap-target" (click)="openContact(asgn.user, $event)">
                        <img
                          [src]="asgn.user.avatarUrl || 'assets/images/default-avatar.svg'"
                          class="raci-user-avatar"
                          [alt]="asgn.user.fullName"
                        />
                        <div class="raci-user-info">
                          <strong class="u-name">{{ asgn.user.fullName }}</strong>
                          <span class="u-title">{{ asgn.user.title }}</span>
                        </div>
                        @if (asgn.user.phone) {
                          <a
                            [href]="'tel:' + asgn.user.phone"
                            class="btn-call-circle tap-target"
                            (click)="$event.stopPropagation()"
                            [title]="'Gọi ngay: ' + asgn.user.phone"
                          >
                            <span class="material-symbols-outlined">call</span>
                            <span class="call-phone-text">{{ asgn.user.phone }}</span>
                          </a>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- KIỂM TRA / NGHIỆM THU -->
              @if (kiemTraAssignment(); as asgn) {
                <div class="raci-role-section">
                  <div class="role-badge-tag role-kiemtra">3. KIỂM TRA / NGHIỆM THU</div>
                  <div class="raci-member-card tap-target" (click)="openContact(asgn.user, $event)">
                    <img
                      [src]="asgn.user.avatarUrl || 'assets/images/default-avatar.svg'"
                      class="raci-user-avatar"
                      [alt]="asgn.user.fullName"
                    />
                    <div class="raci-user-info">
                      <strong class="u-name">{{ asgn.user.fullName }}</strong>
                      <span class="u-title">{{ asgn.user.title }}</span>
                    </div>
                    @if (asgn.user.phone) {
                      <a
                        [href]="'tel:' + asgn.user.phone"
                        class="btn-call-circle tap-target"
                        (click)="$event.stopPropagation()"
                        [title]="'Gọi ngay: ' + asgn.user.phone"
                      >
                        <span class="material-symbols-outlined">call</span>
                        <span class="call-phone-text">{{ asgn.user.phone }}</span>
                      </a>
                    }
                  </div>
                </div>
              }
            </section>

            <!-- 3. THÔNG TIN THỜI HẠN & TỔ CHỨC -->
            <section class="card-box meta-card">
              <h3 class="side-card-title">
                <span class="material-symbols-outlined">info</span>
                <span>Thông tin tổng thể</span>
              </h3>

              <div class="meta-rows-list">
                <div class="meta-info-row">
                  <span class="label">Người giao việc:</span>
                  <span class="val">{{ task()!.createdBy?.fullName || 'Ban Giám hiệu' }}</span>
                </div>
                <div class="meta-info-row">
                  <span class="label">Ngày giao:</span>
                  <span class="val">{{ formatDate(task()!.createdAt) }}</span>
                </div>
                <div class="meta-info-row">
                  <span class="label">Ngày bắt đầu:</span>
                  <span class="val">{{ formatDateOnly(task()!.startDate) }}</span>
                </div>
                <div class="meta-info-row">
                  <span class="label">Hạn hoàn thành:</span>
                  @if (!isEditingDueDate()) {
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <strong class="val" [class.text-danger]="isOverdue()">{{ formatDateOnly(task()!.dueDate) }}</strong>
                      <button type="button" class="btn-edit-inline-meta tap-target" (click)="startEditDueDate()" title="Đổi ngày hạn">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                    </div>
                  } @else {
                    <div class="due-edit-inline-box" (click)="$event.stopPropagation()">
                      <input type="date" class="date-inline-input tap-target" [(ngModel)]="editDueDateVal" />
                      <button type="button" class="btn-inline-save tap-target" (click)="saveDueDate()" [disabled]="isSavingDueDate()" title="Lưu">
                        <span class="material-symbols-outlined">check</span>
                      </button>
                      <button type="button" class="btn-inline-cancel tap-target" (click)="cancelEditDueDate()" title="Hủy">
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  }
                </div>
                @if (task()!.completedAt) {
                  <div class="meta-info-row">
                    <span class="label">Ngày nghiệm thu:</span>
                    <strong class="val text-success">{{ formatDate(task()!.completedAt) }}</strong>
                  </div>
                }
              </div>
            </section>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .task-detail-page {
        display: flex;
        flex-direction: column;
        gap: 18px;
        padding-bottom: 40px;
      }

      /* TOP NAV BAR */
      .top-nav-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;

        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #1F3864;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #EEF4FC;
            border-color: #1F3864;
          }
        }

        .breadcrumb-trail {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;

          .bc-link {
            color: #64748B;
            text-decoration: none;
            font-weight: 600;
            &:hover { text-decoration: underline; color: #1F3864; }
          }
          .bc-sep { color: #CBD5E1; }
          .bc-current { color: #1E293B; font-weight: 700; }
        }
      }

      /* 1. HERO HEADER */
      .task-hero-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 16px;
        padding: 20px 24px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        display: flex;
        flex-direction: column;
        gap: 14px;

        .hero-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;

          .hero-tags-group {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;

            .task-code-badge {
              font-family: monospace;
              font-size: 0.8rem;
              font-weight: 800;
              background: #EEF4FC;
              color: #1F3864;
              padding: 3px 8px;
              border-radius: 6px;
            }

            .priority-pill {
              font-size: 0.78rem;
              font-weight: 800;
              padding: 3px 10px;
              border-radius: 9999px;

              &.prio-KHAN_CAP { background: #FEE2E2; color: #DC2626; }
              &.prio-CAO { background: #FEF3C7; color: #D97706; }
              &.prio-TRUNG_BINH { background: #F1F5F9; color: #475569; }
              &.prio-THAP { background: #F1F5F9; color: #94A3B8; }
            }

            .location-pill,
            .org-pill {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 0.78rem;
              font-weight: 600;
              color: #475569;
              background: #F8FAFC;
              padding: 3px 10px;
              border-radius: 9999px;
              border: 1px solid #E2E8F0;

              .material-symbols-outlined {
                font-size: 15px;
                color: #1F3864;
              }
            }
          }

          .due-date-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            background: #F8FAFC;
            border: 1.5px solid #E2E8F0;
            border-radius: 10px;

            .due-icon {
              font-size: 20px;
              color: #64748B;
            }

            .due-date-text {
              display: flex;
              flex-direction: column;

              .due-label {
                font-size: 0.68rem;
                color: #64748B;
                font-weight: 700;
              }

              .due-display-row {
                display: flex;
                align-items: center;
                gap: 6px;

                .due-value {
                  font-size: 0.9rem;
                  color: #1E293B;
                }

                .btn-edit-inline {
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
                    font-size: 16px;
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
                  font-size: 0.82rem;
                  border: 1.5px solid #1F3864;
                  border-radius: 6px;
                  outline: none;
                }

                .btn-inline-save {
                  padding: 4px;
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
                  padding: 4px;
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
            }

            &.is-overdue {
              background: #FEE2E2;
              border-color: #F87171;

              .due-icon { color: #DC2626; }
              .due-label { color: #B91C1C; }
              .due-value { color: #DC2626; font-weight: 800; }
            }
          }
        }

        .task-hero-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
          color: #1E293B;
          line-height: 1.35;
        }

        .hero-chu-tri-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px dashed #E2E8F0;
          flex-wrap: wrap;

          .bar-label {
            font-size: 0.85rem;
            color: #64748B;
            font-weight: 600;
          }

          .chu-tri-profile-chip {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 4px 12px;
            background: #EEF4FC;
            border: 1.5px solid #BFDBFE;
            border-radius: 9999px;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              background: #DBEAFE;
            }

            .chu-tri-avatar {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              object-fit: cover;
            }

            .chu-tri-info {
              display: flex;
              flex-direction: column;

              .chu-tri-name {
                font-size: 0.88rem;
                color: #1F3864;
              }

              .chu-tri-title {
                font-size: 0.72rem;
                color: #64748B;
              }
            }

            .btn-call-hero {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 3px 10px;
              background: #2E7D32;
              color: #FFFFFF;
              border-radius: 9999px;
              font-size: 0.78rem;
              font-weight: 700;
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

      /* 2. GRID LAYOUT */
      .task-detail-grid {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 18px;

        @media (max-width: 900px) {
          grid-template-columns: 1fr;
        }
      }

      .grid-main-col,
      .grid-side-col {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      /* CARDS */
      .card-box {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      }

      .card-header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid #F1F5F9;

        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;

          .material-symbols-outlined {
            font-size: 22px;

            &.icon-navy { color: #1F3864; }
            &.icon-teal { color: #0D9488; }
            &.icon-amber { color: #D97706; }
            &.icon-blue { color: #2E5EAA; }
            &.icon-purple { color: #7C3AED; }
          }

          h2 {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 800;
            color: #1E293B;
          }

          .evidence-required-tag {
            font-size: 0.7rem;
            font-weight: 800;
            background: #FEE2E2;
            color: #B91C1C;
            padding: 2px 6px;
            border-radius: 4px;
          }
        }

        .count-badge,
        .progress-number-badge {
          font-size: 1rem;
          font-weight: 800;
        }
      }

      .side-card-title {
        margin: 0 0 14px 0;
        font-size: 1rem;
        font-weight: 800;
        color: #1E293B;
        display: flex;
        align-items: center;
        gap: 6px;

        .material-symbols-outlined {
          font-size: 20px;
          color: #1F3864;
        }
      }

      /* DESC CARD */
      .desc-content-body {
        .desc-paragraph {
          margin: 0 0 12px 0;
          font-size: 0.92rem;
          color: #334155;
          line-height: 1.6;
        }

        .plan-link-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #EEF4FC;
          border-radius: 10px;
          border: 1px solid #BFDBFE;

          .plan-icon {
            font-size: 24px;
            color: #1F3864;
          }

          .plan-info {
            display: flex;
            flex-direction: column;

            .plan-sub {
              font-size: 0.72rem;
              color: #64748B;
            }

            .plan-name {
              font-size: 0.88rem;
              color: #1F3864;
            }
          }
        }
      }

      /* PROGRESS CARD */
      .progress-interactive-body {
        display: flex;
        flex-direction: column;
        gap: 14px;

        .slider-wrapper {
          .progress-slider-large {
            width: 100%;
            height: 10px;
            border-radius: 9999px;
            accent-color: #1F3864;
            cursor: pointer;
          }

          .slider-ticks {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            color: #94A3B8;
            margin-top: 4px;
          }
        }

        .progress-note-form {
          display: flex;
          gap: 10px;

          .progress-input-note {
            flex: 1;
            padding: 10px 14px;
            border: 1.5px solid #CBD5E1;
            border-radius: 8px;
            font-size: 0.88rem;

            &:focus {
              border-color: #1F3864;
              outline: none;
            }
          }

          .btn-save-progress {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 18px;
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            font-size: 0.88rem;
            font-weight: 700;
            cursor: pointer;

            &:disabled {
              background: #CBD5E1;
              cursor: not-allowed;
            }
          }
        }
      }

      .progress-readonly-box {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .readonly-bar-track {
          width: 100%;
          height: 10px;
          background: #E2E8F0;
          border-radius: 9999px;
          overflow: hidden;

          .readonly-bar-fill {
            height: 100%;
            border-radius: 9999px;
          }
        }

        .readonly-note {
          font-size: 0.8rem;
          color: #64748B;
          font-style: italic;
        }
      }

      /* ATTACHMENTS */
      .file-gallery-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 14px;

        .file-card-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;

          .file-type-icon-box {
            color: #1F3864;
            display: flex;
            .material-symbols-outlined { font-size: 24px; }
          }

          .file-info-col {
            flex: 1;
            min-width: 0;

            .file-name-link {
              font-size: 0.9rem;
              font-weight: 700;
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

            .file-sub-meta {
              font-size: 0.75rem;
              color: #64748B;
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
            }
          }

          .file-actions-col {
            display: flex;
            gap: 6px;

            .btn-file-icon {
              background: transparent;
              border: none;
              color: #64748B;
              padding: 6px;
              border-radius: 6px;
              cursor: pointer;
              display: flex;

              &:hover {
                background: #EEF4FC;
                color: #1F3864;
              }

              &.delete:hover {
                color: #DC2626;
                background: #FEE2E2;
              }
            }
          }
        }
      }

      .empty-files-placeholder {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px;
        background: #F8FAFC;
        border-radius: 10px;
        color: #64748B;
        font-size: 0.88rem;
        margin-bottom: 14px;

        .material-symbols-outlined {
          font-size: 28px;
          color: #94A3B8;
        }
        p { margin: 0; }
      }

      /* TIMELINE */
      .vertical-timeline-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: relative;
        padding-left: 28px;

        &::before {
          content: '';
          position: absolute;
          left: 13px;
          top: 10px;
          bottom: 10px;
          width: 2px;
          background: #E2E8F0;
        }

        .timeline-entry {
          position: relative;
          display: flex;
          flex-direction: column;

          .timeline-dot {
            position: absolute;
            left: -28px;
            top: 2px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #EEF4FC;
            color: #1F3864;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #FFFFFF;
            box-shadow: 0 0 0 1px #CBD5E1;

            .material-symbols-outlined { font-size: 16px; }
            &.dot-green { background: #DCFCE7; color: #16A34A; }
            &.dot-amber { background: #FEF3C7; color: #D97706; }
            &.dot-red { background: #FEE2E2; color: #DC2626; }
            &.dot-blue { background: #EEF4FC; color: #1F3864; }
          }

          .timeline-card-content {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            padding: 10px 14px;

            .timeline-top-info {
              font-size: 0.85rem;
              color: #334155;
              display: flex;
              gap: 8px;
              flex-wrap: wrap;

              .log-actor {
                color: #1F3864;
                cursor: pointer;
                &:hover { text-decoration: underline; }
              }

              .log-timestamp {
                color: #94A3B8;
                margin-left: auto;
                font-size: 0.75rem;
              }
            }

            .log-note-bubble {
              display: flex;
              align-items: flex-start;
              gap: 4px;
              margin-top: 6px;
              font-size: 0.82rem;
              color: #475569;
              font-style: italic;

              .note-icon {
                font-size: 16px;
                color: #94A3B8;
              }
            }
          }
        }
      }

      /* COMMENTS */
      .comment-composer-box {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 20px;

        .composer-wrapper {
          position: relative;

          .composer-textarea {
            width: 100%;
            padding: 10px 14px;
            border: 1.5px solid #CBD5E1;
            border-radius: 10px;
            font-size: 0.88rem;
            font-family: inherit;
            box-sizing: border-box;

            &:focus {
              border-color: #1F3864;
              outline: none;
            }
          }

          .mention-autocomplete-menu {
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            background: #FFFFFF;
            border: 1.5px solid #CBD5E1;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
            max-height: 200px;
            overflow-y: auto;
            z-index: 50;
            margin-bottom: 6px;

            .mention-menu-header {
              padding: 8px 12px;
              font-size: 0.75rem;
              font-weight: 800;
              background: #F8FAFC;
              color: #64748B;
              border-bottom: 1px solid #E2E8F0;
            }

            .mention-member-row {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 8px 12px;
              cursor: pointer;

              &:hover {
                background: #EEF4FC;
              }

              .m-avatar {
                width: 28px;
                height: 28px;
                border-radius: 50%;
              }

              .m-info {
                display: flex;
                flex-direction: column;
                .m-name { font-size: 0.85rem; color: #1E293B; }
                .m-title { font-size: 0.72rem; color: #64748B; }
              }
            }
          }
        }

        .composer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .composer-hint {
            font-size: 0.78rem;
            color: #64748B;
          }

          .btn-send-comment {
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

            &:disabled {
              background: #CBD5E1;
              cursor: not-allowed;
            }
          }
        }
      }

      .comments-stream {
        display: flex;
        flex-direction: column;
        gap: 14px;

        .comment-entry {
          display: flex;
          gap: 12px;

          .comment-author-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
          }

          .comment-bubble-box {
            flex: 1;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 10px 14px;

            .comment-bubble-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;

              .author-name {
                font-size: 0.85rem;
                color: #1F3864;
                cursor: pointer;
                &:hover { text-decoration: underline; }
              }

              .comment-time {
                font-size: 0.75rem;
                color: #94A3B8;
              }
            }

            .comment-bubble-body {
              font-size: 0.88rem;
              color: #334155;
              line-height: 1.5;
            }
          }
        }
      }

      /* SIDEBAR CARDS */
      .workflow-actions-card {
        .status-summary-box {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          .label { font-size: 0.82rem; color: #64748B; }
        }

        .action-buttons-stack {
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

          .btn-wf-action {
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

            .material-symbols-outlined { font-size: 20px; }
            &.btn-blue { background: #2E5EAA; }
            &.btn-indigo { background: #1F3864; }
            &.btn-amber { background: #D97706; }
            &.btn-green { background: #2E7D32; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.25); }
            &.btn-orange { background: #EA580C; }
            &.btn-gray { background: #475569; }
            &.btn-reopen { background: #0284C7; }

            &:hover {
              opacity: 0.9;
              transform: translateY(-1px);
            }
          }
        }

        .wf-error-alert {
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

      .raci-card {
        .raci-role-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;

          &:last-child { margin-bottom: 0; }

          .role-badge-tag {
            font-size: 0.7rem;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            width: fit-content;

            &.role-chutri { background: #DBEAFE; color: #1E40AF; }
            &.role-phoihop { background: #F3E8FF; color: #6B21A8; }
            &.role-kiemtra { background: #FEF3C7; color: #92400E; }
          }

          .raci-members-stack {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .raci-member-card {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            cursor: pointer;

            &:hover { background: #EEF4FC; }

            .raci-user-avatar {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              object-fit: cover;
            }

            .raci-user-info {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;

              .u-name {
                font-size: 0.82rem;
                color: #1E293B;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .u-title { font-size: 0.7rem; color: #64748B; }
              .u-loc { font-size: 0.65rem; color: #94A3B8; }
            }

            .btn-call-circle {
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

      .meta-card {
        .meta-rows-list {
          display: flex;
          flex-direction: column;
          gap: 6px;

          .meta-info-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.82rem;
            padding: 4px 0;
            border-bottom: 1px solid #F1F5F9;

            &:last-child { border-bottom: none; }
            .label { color: #64748B; }
            .val { color: #1E293B; }
            .text-danger { color: #DC2626; }
            .text-success { color: #16A34A; }

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
      }

      .loading-state-box,
      .not-found-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 16px;
        background: #FFFFFF;
        border-radius: 16px;
        text-align: center;
        color: #64748B;
      }

      .not-found-box {
        .not-found-icon { font-size: 54px; color: #DC2626; margin-bottom: 8px; }
        h2 { margin: 0; font-size: 1.3rem; color: #1E293B; }
        p { margin: 6px 0 16px 0; }
        .btn-primary {
          padding: 10px 20px;
          background: #1F3864;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private attachmentService = inject(AttachmentService);
  private contactCardService = inject(ContactCardService);

  isLoading = signal(true);
  task = signal<TaskItem | null>(null);

  // Progress state
  tempProgress = signal(0);
  progressNote = '';
  isUpdatingProgress = signal(false);

  // Comment state
  commentText = '';
  isSubmittingComment = signal(false);
  showMentionSuggestions = signal(false);

  // Workflow error
  workflowError = signal<string | null>(null);

  // Due Date inline editing
  isEditingDueDate = signal(false);
  editDueDateVal = '';
  isSavingDueDate = signal(false);

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const taskId = params['id'];
      if (taskId) {
        this.fetchTask(taskId);
      }
    });
  }

  fetchTask(id: string) {
    this.isLoading.set(true);
    this.taskService.getTaskById(id).subscribe({
      next: (t) => {
        this.task.set(t);
        this.tempProgress.set(t.progressPercent || 0);
        this.isLoading.set(false);
        this.workflowError.set(null);
      },
      error: () => {
        this.task.set(null);
        this.isLoading.set(false);
      },
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
    this.taskService.updateTask(t.id, { dueDate: this.editDueDateVal }).subscribe({
      next: () => {
        this.isSavingDueDate.set(false);
        this.isEditingDueDate.set(false);
        this.fetchTask(t.id);
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

  chuTriUser = computed(() => {
    return this.chuTriAssignment()?.user || null;
  });

  phoiHopAssignments = computed(() => {
    return this.task()?.assignments?.filter((a) => a.role === 'PHOI_HOP') || [];
  });

  kiemTraAssignment = computed(() => {
    return this.task()?.assignments?.find((a) => a.role === 'KIEM_TRA') || null;
  });

  taskMembers = computed(() => {
    const t = this.task();
    if (!t || !t.assignments) return [];
    return t.assignments.map((a) => a.user);
  });

  canUpdateProgress(): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId || !this.task()) return false;
    const t = this.task()!;
    if (t.status === 'HOAN_THANH' || t.status === 'XAC_NHAN' || t.status === 'DONG') return false;

    // Check if current user is assignee or admin/BGH
    const isAssignee = t.assignments?.some((a) => a.userId === currentUserId);
    const isCreator = t.createdById === currentUserId;
    return isAssignee || isCreator;
  }

  saveProgress() {
    const t = this.task();
    if (!t) return;

    this.isUpdatingProgress.set(true);
    this.taskService.updateProgress(t.id, this.tempProgress(), this.progressNote || undefined).subscribe({
      next: () => {
        this.isUpdatingProgress.set(false);
        this.progressNote = '';
        this.fetchTask(t.id);
      },
      error: (err) => {
        this.isUpdatingProgress.set(false);
        alert(err.error?.message || 'Không thể cập nhật tiến độ.');
      },
    });
  }

  onUploadSuccess(att: any) {
    const t = this.task();
    if (t) this.fetchTask(t.id);
  }

  deleteAttachment(id: string) {
    if (!confirm('Bạn có chắc muốn xóa tệp minh chứng này?')) return;
    this.attachmentService.deleteAttachment(id).subscribe({
      next: () => {
        const t = this.task();
        if (t) this.fetchTask(t.id);
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể xóa tệp.');
      },
    });
  }

  canTransitionTo(targetStatus: TaskStatus | 'REOPEN'): boolean {
    const t = this.task();
    if (!t) return false;
    const cur = t.status;
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

    switch (targetStatus) {
      case 'DA_TIEP_NHAN':
        return (cur === 'DA_GIAO' || cur === 'NHAP') && (isAssignee || isBGH);
      case 'DANG_THUC_HIEN':
        return (cur === 'DA_TIEP_NHAN' || cur === 'BO_SUNG' || cur === 'DA_GIAO' || cur === 'NHAP') && (isAssignee || isBGH);
      case 'CHO_KIEM_TRA':
        return (cur === 'DANG_THUC_HIEN' || cur === 'DA_TIEP_NHAN' || cur === 'BO_SUNG' || cur === 'DA_GIAO') && (isAssignee || isBGH);
      case 'HOAN_THANH':
        return (cur === 'CHO_KIEM_TRA' || cur === 'DANG_THUC_HIEN') && (isInspector || (!hasInspectorInTask && (isChuTri || isBGH)));
      case 'BO_SUNG':
        return cur === 'CHO_KIEM_TRA' && isInspector;
      case 'DONG':
        return (cur === 'HOAN_THANH' || cur === 'XAC_NHAN') && (isHieuTruong || isCreator || isBGH || userRole === 'PHE_DUYET');
      case 'REOPEN':
        return (cur === 'HOAN_THANH' || cur === 'DONG') && (isHieuTruong || isBGH || isCreator);
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
    this.workflowError.set(null);

    this.taskService.updateStatus(t.id, status, note).subscribe({
      next: () => {
        this.fetchTask(t.id);
      },
      error: (err) => {
        this.workflowError.set(err.error?.message || 'Không thể chuyển trạng thái.');
      },
    });
  }

  promptReasonAndChange(status: TaskStatus) {
    const reason = prompt('Nhập nội dung/lý do yêu cầu bổ sung:', 'Yêu cầu bổ sung thêm minh chứng kết quả');
    if (reason !== null && reason.trim()) {
      this.performStatusChange(status, reason.trim());
    }
  }

  onCommentKeyUp(event: KeyboardEvent) {
    if (this.commentText.includes('@')) {
      this.showMentionSuggestions.set(true);
    } else {
      this.showMentionSuggestions.set(false);
    }
  }

  selectMentionMember(member: any) {
    const lastAtIndex = this.commentText.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      this.commentText = this.commentText.substring(0, lastAtIndex) + `@${member.fullName} `;
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
        const currentComments = t.comments || [];
        this.task.set({ ...t, comments: [...currentComments, commentObj] });
        this.fetchTask(t.id);
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
    if (user && user.id) {
      this.contactCardService.open(user.id);
    }
  }

  goBack() {
    this.router.navigate(['/tasks']);
  }

  getPriorityLabel(prio: TaskPriority): string {
    switch (prio) {
      case 'KHAN_CAP': return 'Khẩn cấp';
      case 'CAO': return 'Quan trọng';
      case 'TRUNG_BINH': return 'Bình thường';
      default: return 'Thấp';
    }
  }

  getProgressColor(val: number = 0): string {
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

  formatDate(d?: string | Date | null): string {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  formatDateOnly(d?: string | Date | null): string {
    if (!d) return 'Chưa đặt';
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  isOverdue(): boolean {
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
    if (log.action === 'ATTACH_FILE') return 'Đã nộp tệp minh chứng kết quả';
    return log.action;
  }
}
