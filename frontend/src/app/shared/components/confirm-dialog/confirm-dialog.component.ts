import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (dialogService.state(); as state) {
      <div class="confirm-dialog-overlay" (click)="onOverlayClick($event)">
        <div class="confirm-dialog-card" [class.type-danger]="state.type === 'danger'" [class.type-warning]="state.type === 'warning'" [class.type-info]="state.type === 'info'" [class.type-prompt]="state.type === 'prompt'" (click)="$event.stopPropagation()">
          
          <!-- DIALOG HEADER -->
          <div class="dialog-header">
            <div class="header-icon-box" [ngClass]="state.type">
              @if (state.type === 'danger') {
                <span class="material-symbols-outlined">warning</span>
              } @else if (state.type === 'warning') {
                <span class="material-symbols-outlined">report</span>
              } @else if (state.type === 'prompt') {
                <span class="material-symbols-outlined">edit_note</span>
              } @else {
                <span class="material-symbols-outlined">info</span>
              }
            </div>

            <div class="header-text-box">
              <h3 class="dialog-title">{{ state.title }}</h3>
              <p class="dialog-message">{{ state.message }}</p>
            </div>
          </div>

          <!-- PROMPT INPUT FIELD (IF PROMPT TYPE) -->
          @if (state.type === 'prompt') {
            <div class="prompt-input-wrapper">
              <textarea
                rows="3"
                class="prompt-textarea"
                [(ngModel)]="promptInputText"
                [placeholder]="state.placeholder || 'Nhập nội dung...'"
                (keydown)="onPromptKeyDown($event)"
                autofocus
              ></textarea>
              @if (state.required && !promptInputText.trim()) {
                <span class="prompt-error-hint">⚠️ Vui lòng nhập nội dung trước khi xác nhận</span>
              }
            </div>
          }

          <!-- DIALOG ACTIONS -->
          <div class="dialog-actions">
            <button
              type="button"
              class="btn-cancel tap-target"
              (click)="dialogService.handleCancel()"
            >
              {{ state.cancelText }}
            </button>

            <button
              type="button"
              class="btn-confirm tap-target"
              [class.btn-danger]="state.type === 'danger'"
              [class.btn-warning]="state.type === 'warning'"
              [class.btn-primary]="state.type === 'info' || state.type === 'prompt'"
              [disabled]="state.type === 'prompt' && state.required && !promptInputText.trim()"
              (click)="onConfirm(state)"
            >
              @if (state.type === 'danger') {
                <span class="material-symbols-outlined icon-btn">delete_forever</span>
              } @else if (state.type === 'prompt') {
                <span class="material-symbols-outlined icon-btn">check_circle</span>
              }
              <span>{{ state.confirmText }}</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .confirm-dialog-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: fadeIn 0.15s ease-out forwards;
      }

      .confirm-dialog-card {
        background: #FFFFFF;
        width: 100%;
        max-width: 480px;
        border-radius: 16px;
        box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.08);
        overflow: hidden;
        animation: scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        display: flex;
        flex-direction: column;
      }

      .dialog-header {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 22px 24px 16px;

        .header-icon-box {
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

          &.danger {
            background: #FEE2E2;
            color: #DC2626;
          }

          &.warning {
            background: #FEF3C7;
            color: #D97706;
          }

          &.prompt {
            background: #EEF2FF;
            color: #4F46E5;
          }

          &.info {
            background: #E0F2FE;
            color: #0284C7;
          }
        }

        .header-text-box {
          flex: 1;

          .dialog-title {
            margin: 0 0 6px 0;
            font-size: 1.12rem;
            font-weight: 700;
            color: #0F172A;
            line-height: 1.35;
          }

          .dialog-message {
            margin: 0;
            font-size: 0.9rem;
            color: #475569;
            line-height: 1.5;
            white-space: pre-line;
          }
        }
      }

      .prompt-input-wrapper {
        padding: 0 24px 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;

        .prompt-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          font-size: 0.9rem;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          transition: all 0.15s ease;
          resize: vertical;

          &:focus {
            border-color: #1F3864;
            box-shadow: 0 0 0 3px rgba(31, 56, 100, 0.12);
          }
        }

        .prompt-error-hint {
          font-size: 0.78rem;
          color: #DC2626;
          font-weight: 500;
        }
      }

      .dialog-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 24px;
        background: #F8FAFC;
        border-top: 1px solid #E2E8F0;

        .btn-cancel {
          padding: 9px 18px;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #F1F5F9;
            color: #0F172A;
          }
        }

        .btn-confirm {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 20px;
          border-radius: 9px;
          border: none;
          font-size: 0.88rem;
          font-weight: 700;
          color: #FFFFFF;
          cursor: pointer;
          transition: all 0.15s ease;

          .icon-btn {
            font-size: 18px;
          }

          &.btn-danger {
            background: #DC2626;
            &:hover:not(:disabled) {
              background: #B91C1C;
            }
          }

          &.btn-warning {
            background: #D97706;
            &:hover:not(:disabled) {
              background: #B45309;
            }
          }

          &.btn-primary {
            background: #1F3864;
            &:hover:not(:disabled) {
              background: #152744;
            }
          }

          &:disabled {
            background: #CBD5E1;
            cursor: not-allowed;
          }
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes scaleUp {
        from {
          opacity: 0;
          transform: scale(0.94) translateY(8px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  dialogService = inject(ConfirmDialogService);
  promptInputText = '';

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.dialogService.state()) {
      this.dialogService.handleCancel();
    }
  }

  onOverlayClick(event: MouseEvent) {
    // Confirmation dialog overlay click does NOT close by accident if prompt has text
    if (this.dialogService.state()?.type !== 'prompt') {
      this.dialogService.handleCancel();
    }
  }

  onPromptKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const state = this.dialogService.state();
      if (state) {
        this.onConfirm(state);
      }
    }
  }

  onConfirm(state: any) {
    if (state.type === 'prompt') {
      this.dialogService.handleConfirm(this.promptInputText);
      this.promptInputText = '';
    } else {
      this.dialogService.handleConfirm();
    }
  }
}
