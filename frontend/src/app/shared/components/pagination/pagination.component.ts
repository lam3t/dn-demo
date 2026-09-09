import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (totalItems > 0) {
      <div class="pagination-container">
        <!-- LEFT: ITEMS INFO (DESKTOP) -->
        <div class="pagination-info hide-on-mobile">
          <span>
            Hiển thị <strong>{{ startItemIndex }}–{{ endItemIndex }}</strong> trong tổng số <strong>{{ totalItems }}</strong> {{ itemName }}
          </span>
        </div>

        <!-- CENTER: PAGE NAVIGATION BUTTONS -->
        <div class="pagination-controls">
          <!-- First page (Desktop) -->
          <button
            type="button"
            class="page-btn nav-btn hide-on-mobile tap-target"
            [disabled]="currentPage === 1"
            (click)="goToPage(1)"
            title="Trang đầu tiên"
          >
            <span class="material-symbols-outlined">first_page</span>
          </button>

          <!-- Prev page -->
          <button
            type="button"
            class="page-btn nav-btn tap-target"
            [disabled]="currentPage === 1"
            (click)="goToPage(currentPage - 1)"
            title="Trang trước"
          >
            <span class="material-symbols-outlined">chevron_left</span>
            <span class="mobile-nav-label hide-on-desktop">Trước</span>
          </button>

          <!-- Desktop Page Numbers -->
          <div class="page-numbers-group hide-on-mobile">
            @for (p of visiblePages; track $index) {
              @if (p === -1) {
                <span class="page-dots">...</span>
              } @else {
                <button
                  type="button"
                  class="page-btn num-btn tap-target"
                  [class.active]="p === currentPage"
                  (click)="goToPage(p)"
                >
                  {{ p }}
                </button>
              }
            }
          </div>

          <!-- Mobile Page Status Indicator -->
          <div class="mobile-page-indicator hide-on-desktop">
            <span class="curr-page">{{ currentPage }}</span>
            <span class="slash">/</span>
            <span class="total-pages">{{ totalPages }}</span>
            <span class="total-badge">({{ totalItems }} {{ itemName }})</span>
          </div>

          <!-- Next page -->
          <button
            type="button"
            class="page-btn nav-btn tap-target"
            [disabled]="currentPage === totalPages"
            (click)="goToPage(currentPage + 1)"
            title="Trang kế tiếp"
          >
            <span class="mobile-nav-label hide-on-desktop">Sau</span>
            <span class="material-symbols-outlined">chevron_right</span>
          </button>

          <!-- Last page (Desktop) -->
          <button
            type="button"
            class="page-btn nav-btn hide-on-mobile tap-target"
            [disabled]="currentPage === totalPages"
            (click)="goToPage(totalPages)"
            title="Trang cuối cùng"
          >
            <span class="material-symbols-outlined">last_page</span>
          </button>
        </div>

        <!-- RIGHT: PAGE SIZE SELECTOR (DESKTOP) -->
        <div class="page-size-selector hide-on-mobile">
          <label class="page-size-label">Số dòng:</label>
          <select
            [ngModel]="pageSize"
            (ngModelChange)="onPageSizeChange($event)"
            class="page-size-select tap-target"
          >
            @for (opt of pageSizeOptions; track opt) {
              <option [value]="opt">{{ opt }} / trang</option>
            }
          </select>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .pagination-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 16px;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        margin-top: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      }

      .pagination-info {
        font-size: 0.82rem;
        color: #64748B;

        strong {
          color: #0F172A;
          font-weight: 700;
        }
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .page-numbers-group {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        padding: 0 6px;
        border-radius: 8px;
        border: 1px solid #CBD5E1;
        background: #FFFFFF;
        color: #334155;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;

        .material-symbols-outlined {
          font-size: 18px;
        }

        &:hover:not(:disabled) {
          background: #F1F5F9;
          border-color: #94A3B8;
          color: #0F172A;
        }

        &.active {
          background: #1F3864;
          border-color: #1F3864;
          color: #FFFFFF;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(31, 56, 100, 0.2);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: #F8FAFC;
        }
      }

      .page-dots {
        font-size: 0.85rem;
        color: #94A3B8;
        padding: 0 4px;
        letter-spacing: 2px;
      }

      .page-size-selector {
        display: flex;
        align-items: center;
        gap: 8px;

        .page-size-label {
          font-size: 0.82rem;
          color: #64748B;
          font-weight: 500;
        }

        .page-size-select {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          font-size: 0.82rem;
          font-weight: 600;
          color: #1E293B;
          outline: none;
          cursor: pointer;

          &:focus {
            border-color: #2563EB;
          }
        }
      }

      /* MOBILE RESPONSIVE STYLES */
      .mobile-page-indicator {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.82rem;
        font-weight: 600;
        color: #475569;
        padding: 0 8px;

        .curr-page {
          color: #1D4ED8;
          font-weight: 800;
          font-size: 0.92rem;
        }

        .slash {
          color: #CBD5E1;
        }

        .total-pages {
          color: #0F172A;
          font-weight: 700;
        }

        .total-badge {
          font-size: 0.72rem;
          color: #64748B;
          margin-left: 2px;
        }
      }

      @media (max-width: 768px) {
        .pagination-container {
          justify-content: center;
          padding: 8px 12px;
          border-radius: 10px;
        }

        .pagination-controls {
          width: 100%;
          justify-content: space-between;

          .page-btn.nav-btn {
            min-height: 44px;
            padding: 0 12px;
            gap: 4px;
            background: #F8FAFC;
            border-color: #CBD5E1;

            .mobile-nav-label {
              font-size: 0.82rem;
              font-weight: 700;
            }
          }
        }
      }

      @media (min-width: 769px) {
        .hide-on-desktop {
          display: none !important;
        }
      }

      @media (max-width: 768px) {
        .hide-on-mobile {
          display: none !important;
        }
      }
    `,
  ],
})
export class PaginationComponent {
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() currentPage = 1;
  @Input() pageSizeOptions = [10, 20, 50];
  @Input() itemName = 'mục';

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get startItemIndex(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItemIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    pages.push(1);

    if (current > 3) {
      pages.push(-1); // ellipsis
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push(-1); // ellipsis
    }

    pages.push(total);
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSizeChange.emit(Number(newSize));
  }
}
