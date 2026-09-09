import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStatus } from '../../../core/models/task.models';

interface StatusConfig {
  label: string;
  className: string;
  icon?: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  NHAP: { label: 'Bản nháp', className: 'badge-nhap', icon: 'edit_note' },
  DA_GIAO: { label: 'Mới giao', className: 'badge-new', icon: 'send' },
  DA_TIEP_NHAN: { label: 'Đã tiếp nhận', className: 'badge-received', icon: 'task_alt' },
  DANG_THUC_HIEN: { label: 'Đang làm', className: 'badge-doing', icon: 'pending' },
  CHO_KIEM_TRA: { label: 'Chờ kiểm tra', className: 'badge-waiting', icon: 'hourglass_top' },
  BO_SUNG: { label: 'Cần bổ sung', className: 'badge-revise', icon: 'assignment_late' },
  HOAN_THANH: { label: 'Hoàn thành', className: 'badge-done', icon: 'check_circle' },
  XAC_NHAN: { label: 'Đã xác nhận', className: 'badge-verified', icon: 'verified' },
  DONG: { label: 'Đã đóng', className: 'badge-closed', icon: 'lock' },
  TAM_DUNG: { label: 'Tạm dừng', className: 'badge-paused', icon: 'pause_circle' },
  HUY: { label: 'Đã hủy', className: 'badge-cancelled', icon: 'cancel' },
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="status-pill {{ config.className }} size-{{ size || 'md' }}"
      [class.overdue]="isOverdue"
      [title]="isOverdue ? 'Công việc đã quá hạn' : config.label"
    >
      @if (showIcon && config.icon) {
        <span class="material-symbols-outlined icon">{{ isOverdue ? 'warning' : config.icon }}</span>
      }
      <span class="label">{{ isOverdue ? 'Quá hạn' : config.label }}</span>
    </span>
  `,
  styles: [
    `
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
        border-radius: 9999px;
        border: 1px solid transparent;
        white-space: nowrap;
        line-height: 1.2;
        transition: all 0.2s ease;

        .icon {
          font-size: 14px;
          line-height: 1;
        }

        &.size-sm {
          padding: 2px 8px;
          font-size: 0.725rem;
          .icon { font-size: 12px; }
        }

        &.size-md {
          padding: 4px 10px;
          font-size: 0.8rem;
          .icon { font-size: 14px; }
        }

        &.size-lg {
          padding: 6px 14px;
          font-size: 0.875rem;
          .icon { font-size: 16px; }
        }

        /* Status Colors theo đúng chuẩn Prompt 8 */
        &.badge-new, &.badge-received {
          background-color: var(--status-new-bg);
          color: var(--status-new);
          border-color: var(--status-new-border);
        }

        &.badge-doing {
          background-color: var(--status-doing-bg);
          color: var(--status-doing);
          border-color: var(--status-doing-border);
        }

        &.badge-waiting {
          background-color: var(--status-waiting-bg);
          color: var(--status-waiting);
          border-color: var(--status-waiting-border);
        }

        &.badge-revise {
          background-color: var(--status-revise-bg);
          color: var(--status-revise);
          border-color: var(--status-revise-border);
        }

        &.badge-done, &.badge-verified {
          background-color: var(--status-done-bg);
          color: var(--status-done);
          border-color: var(--status-done-border);
        }

        &.badge-closed, &.badge-nhap, &.badge-paused, &.badge-cancelled {
          background-color: #F1F5F9;
          color: #64748B;
          border-color: #CBD5E1;
        }

        /* Quá hạn */
        &.overdue {
          background-color: var(--status-overdue-bg) !important;
          color: var(--status-overdue) !important;
          border-color: var(--status-overdue-border) !important;
        }
      }
    `,
  ],
})
export class StatusBadgeComponent {
  @Input() status!: TaskStatus | string;
  @Input() isOverdue = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showIcon = true;

  get config(): StatusConfig {
    return STATUS_MAP[this.status] || {
      label: this.status || 'Chưa rõ',
      className: 'badge-nhap',
      icon: 'help',
    };
  }
}
