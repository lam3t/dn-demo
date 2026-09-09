import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatusTabItem {
  key: string;
  label: string;
  count: number;
  icon?: string;
  color?: string;
}

@Component({
  selector: 'app-status-tabs-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabs-container">
      <div class="tabs-scrollable">
        @for (tab of tabs; track tab.key) {
          <button
            type="button"
            class="tab-item tap-target"
            [class.active]="tab.key === activeKey"
            [ngClass]="'tab-status-' + tab.key.toLowerCase()"
            (click)="selectTab(tab.key)"
          >
            @if (tab.icon) {
              <span class="material-symbols-outlined tab-icon">{{ tab.icon }}</span>
            }
            <span class="tab-label">{{ tab.label }}</span>
            <span
              class="tab-counter-badge"
              [class.highlight]="tab.key === activeKey"
              [ngClass]="'badge-' + tab.key.toLowerCase()"
            >
              {{ tab.count }}
            </span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .tabs-container {
        width: 100%;
        border-bottom: 2px solid #E2E8F0;
        background: #FFFFFF;
        position: relative;
        user-select: none;
        border-radius: 12px 12px 0 0;
      }

      .tabs-scrollable {
        display: flex;
        align-items: center;
        gap: 4px;
        overflow-x: auto;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
        padding: 4px 12px 0 12px;

        &::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }
      }

      .tab-item {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        color: #64748B;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.18s ease;
        position: relative;
        bottom: -2px;

        .tab-icon {
          font-size: 18px;
          color: #94A3B8;
          transition: color 0.18s ease;
        }

        &:hover {
          color: #1F3864;
          background-color: rgba(31, 56, 100, 0.03);
          .tab-icon { color: #1F3864; }
        }

        &.active {
          color: #1F3864;
          font-weight: 800;
          border-bottom-color: #1F3864;

          .tab-icon { color: inherit; }

          &.tab-status-all { border-bottom-color: #1F3864; color: #1F3864; }
          &.tab-status-moi,
          &.tab-status-nhap_da_giao { border-bottom-color: #2E5EAA; color: #2E5EAA; }
          &.tab-status-dang_thuc_hien { border-bottom-color: #1F3864; color: #1F3864; }
          &.tab-status-cho_kiem_tra { border-bottom-color: #D97706; color: #D97706; }
          &.tab-status-cho_phe_duyet { border-bottom-color: #7C3AED; color: #7C3AED; }
          &.tab-status-bo_sung { border-bottom-color: #EA580C; color: #EA580C; }
          &.tab-status-hoan_thanh { border-bottom-color: #2E7D32; color: #2E7D32; }
          &.tab-status-dong { border-bottom-color: #475569; color: #475569; }
          &.tab-status-quahan { border-bottom-color: #DC2626; color: #DC2626; }
        }
      }

      .tab-counter-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 800;
        background: #F1F5F9;
        color: #475569;
        transition: all 0.18s ease;

        /* INACTIVE STYLED BADGES */
        &.badge-moi,
        &.badge-nhap_da_giao { background: #EEF4FC; color: #2E5EAA; }
        &.badge-dang_thuc_hien { background: #EEF2F6; color: #1F3864; }
        &.badge-cho_kiem_tra { background: #FEF3C7; color: #B45309; }
        &.badge-cho_phe_duyet { background: #F3E8FF; color: #7C3AED; }
        &.badge-bo_sung { background: #FFEDD5; color: #C2410C; }
        &.badge-hoan_thanh { background: #DCFCE7; color: #15803D; }
        &.badge-dong { background: #F1F5F9; color: #475569; }
        &.badge-quahan { background: #FEE2E2; color: #DC2626; }

        /* ACTIVE SOLID COLORED BADGES */
        &.highlight {
          background: #1F3864;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);

          &.badge-moi,
          &.badge-nhap_da_giao { background: #2E5EAA; color: #FFFFFF; }
          &.badge-dang_thuc_hien { background: #1F3864; color: #FFFFFF; }
          &.badge-cho_kiem_tra { background: #D97706; color: #FFFFFF; }
          &.badge-cho_phe_duyet { background: #7C3AED; color: #FFFFFF; }
          &.badge-bo_sung { background: #EA580C; color: #FFFFFF; }
          &.badge-hoan_thanh { background: #2E7D32; color: #FFFFFF; }
          &.badge-dong { background: #475569; color: #FFFFFF; }
          &.badge-quahan { background: #DC2626; color: #FFFFFF; }
        }
      }

      @media (max-width: 768px) {
        .tab-item {
          padding: 10px 12px;
          font-size: 0.85rem;
          gap: 6px;
        }
      }
    `,
  ],
})
export class StatusTabsCounterComponent {
  @Input() tabs: StatusTabItem[] = [];
  @Input() activeKey = 'ALL';
  @Output() tabChange = new EventEmitter<string>();

  selectTab(key: string) {
    if (this.activeKey !== key) {
      this.activeKey = key;
      this.tabChange.emit(key);
    }
  }
}
