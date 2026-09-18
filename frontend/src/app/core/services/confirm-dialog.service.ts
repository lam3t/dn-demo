import { Injectable, signal } from '@angular/core';

export type DialogType = 'danger' | 'warning' | 'info' | 'prompt';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export interface PromptDialogOptions {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  inputValue?: string;
  placeholder?: string;
  required?: boolean;
  resolve: (value: any) => void;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  state = signal<ConfirmDialogState | null>(null);

  confirm(options: ConfirmDialogOptions | string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const opts: ConfirmDialogOptions =
        typeof options === 'string'
          ? { message: options, type: 'danger' }
          : options;

      this.state.set({
        isOpen: true,
        type: opts.type || 'danger',
        title: opts.title || (opts.type === 'danger' ? 'Xác nhận thực hiện' : 'Thông báo'),
        message: opts.message,
        confirmText: opts.confirmText || (opts.type === 'danger' ? 'Đồng ý / Xóa' : 'Xác nhận'),
        cancelText: opts.cancelText || 'Hủy bỏ',
        resolve: (val: boolean) => {
          this.state.set(null);
          resolve(val);
        },
      });
    });
  }

  prompt(options: PromptDialogOptions): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.state.set({
        isOpen: true,
        type: 'prompt',
        title: options.title || 'Nhập thông tin',
        message: options.message,
        inputValue: options.defaultValue || '',
        placeholder: options.placeholder || 'Nhập nội dung...',
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy bỏ',
        required: options.required ?? true,
        resolve: (val: string | null) => {
          this.state.set(null);
          resolve(val);
        },
      });
    });
  }

  handleConfirm(inputValue?: string) {
    const currentState = this.state();
    if (!currentState) return;

    if (currentState.type === 'prompt') {
      if (currentState.required && (!inputValue || !inputValue.trim())) {
        return;
      }
      currentState.resolve(inputValue?.trim() || '');
    } else {
      currentState.resolve(true);
    }
  }

  handleCancel() {
    const currentState = this.state();
    if (!currentState) return;

    if (currentState.type === 'prompt') {
      currentState.resolve(null);
    } else {
      currentState.resolve(false);
    }
  }
}
