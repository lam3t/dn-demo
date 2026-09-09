import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttachmentService } from '../../../core/services/attachment.service';

export interface FileQueueItem {
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string | null;
  progress: number;
  status: 'QUEUED' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  errorMessage?: string;
}

@Component({
  selector: 'app-file-dropzone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dropzone-wrapper" [class.disabled]="disabled">
      @if (label) {
        <label class="dropzone-label">
          <span class="material-symbols-outlined">attach_file</span>
          <span>{{ label }}</span>
          @if (required) {
            <span class="required-star">*</span>
          }
        </label>
      }

      <!-- DESKTOP DRAG & DROP AREA -->
      <div
        class="desktop-drop-area hide-on-mobile"
        [class.drag-over]="isDragOver()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <input
          #fileInput
          type="file"
          class="hidden-input"
          [accept]="accept"
          [multiple]="maxFiles > 1"
          (change)="onFileInputChange($event)"
          [disabled]="disabled"
        />

        <div class="drop-icon-box">
          <span class="material-symbols-outlined upload-icon">cloud_upload</span>
        </div>

        <div class="drop-texts">
          <p class="main-instruction">
            <strong>Kéo thả file vào đây</strong> hoặc <span class="browse-link">bấm để chọn từ máy tính</span>
          </p>
          <p class="format-note">
            Chấp nhận PDF, Word, Excel, Ảnh (JPG, PNG) • Tối đa 20MB/file
          </p>
        </div>
      </div>

      <!-- MOBILE ACTION BUTTONS (2 NÚT LỚN RIÊNG BIỆT) -->
      <div class="mobile-actions-row hide-on-desktop">
        <!-- NÚT 1: CHỤP ẢNH MINH CHỨNG -->
        <button
          type="button"
          class="mobile-upload-btn btn-camera tap-target"
          (click)="cameraInput.click()"
          [disabled]="disabled"
        >
          <span class="material-symbols-outlined">photo_camera</span>
          <div class="btn-text-box">
            <span class="btn-title">📷 Chụp ảnh</span>
            <span class="btn-desc">Camera điện thoại</span>
          </div>
        </button>
        <input
          #cameraInput
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden-input"
          (change)="onFileInputChange($event)"
        />

        <!-- NÚT 2: CHỌN ẢNH HOẶC TỆP CÓ SẴN -->
        <button
          type="button"
          class="mobile-upload-btn btn-gallery tap-target"
          (click)="galleryInput.click()"
          [disabled]="disabled"
        >
          <span class="material-symbols-outlined">folder_open</span>
          <div class="btn-text-box">
            <span class="btn-title">🖼️ Chọn tệp/ảnh</span>
            <span class="btn-desc">Tải từ thư viện</span>
          </div>
        </button>
        <input
          #galleryInput
          type="file"
          [accept]="accept"
          [multiple]="maxFiles > 1"
          class="hidden-input"
          (change)="onFileInputChange($event)"
        />
      </div>

      <!-- ERROR ALERT (IF ANY INVALID FILE) -->
      @if (validationError()) {
        <div class="error-banner">
          <span class="material-symbols-outlined">warning</span>
          <span>{{ validationError() }}</span>
        </div>
      }

      <!-- FILE QUEUE PREVIEW LIST -->
      @if (fileQueue().length > 0) {
        <div class="file-queue-list">
          <div class="queue-header">
            <span class="queue-title">
              Danh sách tệp đính kèm ({{ fileQueue().length }}/{{ maxFiles }})
            </span>
            @if (!disabled && !isUploading()) {
              <button type="button" class="clear-all-files" (click)="clearAllFiles()">
                Xóa tất cả
              </button>
            }
          </div>

          <div class="queue-items">
            @for (item of fileQueue(); track item.name + item.size; let i = $index) {
              <div class="file-item-card" [class.success]="item.status === 'SUCCESS'" [class.error]="item.status === 'ERROR'">
                <!-- FILE THUMBNAIL / ICON -->
                <div class="file-thumb-box">
                  @if (item.previewUrl) {
                    <img [src]="item.previewUrl" [alt]="item.name" class="img-preview" />
                  } @else {
                    <span class="material-symbols-outlined file-format-icon" [ngClass]="getFileFormatClass(item.name)">
                      {{ getFileFormatIcon(item.name) }}
                    </span>
                  }
                </div>

                <!-- FILE META & PROGRESS -->
                <div class="file-info-col">
                  <div class="file-name-row">
                    <span class="file-name" [title]="item.name">{{ item.name }}</span>
                    <span class="file-size">{{ formatBytes(item.size) }}</span>
                  </div>

                  <!-- PROGRESS BAR -->
                  @if (item.status === 'UPLOADING') {
                    <div class="progress-bar-track">
                      <div class="progress-bar-fill" [style.width.%]="item.progress"></div>
                    </div>
                  }

                  <div class="file-status-row">
                    @if (item.status === 'QUEUED') {
                      <span class="status-badge status-queued">Sẵn sàng tải lên</span>
                    } @else if (item.status === 'UPLOADING') {
                      <span class="status-badge status-uploading">
                        <span class="material-symbols-outlined spin">progress_activity</span>
                        Đang tải lên {{ item.progress }}%...
                      </span>
                    } @else if (item.status === 'SUCCESS') {
                      <span class="status-badge status-success">
                        <span class="material-symbols-outlined">check_circle</span>
                        Đã tải lên thành công
                      </span>
                    } @else if (item.status === 'ERROR') {
                      <span class="status-badge status-error">
                        <span class="material-symbols-outlined">error</span>
                        {{ item.errorMessage || 'Lỗi tải lên' }}
                      </span>
                    }
                  </div>
                </div>

                <!-- REMOVE BUTTON -->
                @if (!disabled && item.status !== 'UPLOADING') {
                  <button
                    type="button"
                    class="remove-file-btn tap-target"
                    (click)="removeFile(i)"
                    title="Xóa tệp này"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- UPLOAD TRIGGER BUTTON (IF NOT AUTO-UPLOAD) -->
          @if (!autoUpload && hasQueuedFiles() && taskId) {
            <button
              type="button"
              class="manual-upload-btn tap-target"
              (click)="uploadQueuedFiles()"
              [disabled]="isUploading()"
            >
              @if (isUploading()) {
                <span class="material-symbols-outlined spin">progress_activity</span>
                <span>Đang tải lên {{ fileQueue().length }} tệp...</span>
              } @else {
                <span class="material-symbols-outlined">upload</span>
                <span>Tải lên {{ fileQueue().length }} tệp đính kèm</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dropzone-wrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;

        &.disabled {
          opacity: 0.6;
          pointer-events: none;
        }
      }

      .dropzone-label {
        font-size: 0.85rem;
        font-weight: 700;
        color: #334155;
        display: flex;
        align-items: center;
        gap: 6px;

        .material-symbols-outlined {
          font-size: 18px;
          color: #1F3864;
        }

        .required-star {
          color: #EF4444;
        }
      }

      .hidden-input {
        display: none;
      }

      /* DESKTOP DRAG & DROP AREA */
      .desktop-drop-area {
        border: 2px dashed #CBD5E1;
        border-radius: 14px;
        background: #F8FAFC;
        padding: 24px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 10px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: #1F3864;
          background: #EEF4FC;
        }

        &.drag-over {
          border-color: #1F3864;
          background: #E0EDFD;
          transform: scale(1.01);
          box-shadow: 0 4px 20px rgba(31, 56, 100, 0.15);
        }

        .drop-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: #EEF4FC;
          color: #1F3864;
          display: flex;
          align-items: center;
          justify-content: center;

          .upload-icon {
            font-size: 30px;
          }
        }

        .drop-texts {
          .main-instruction {
            font-size: 0.95rem;
            color: #1E293B;
            margin-bottom: 4px;

            .browse-link {
              color: #1F3864;
              font-weight: 700;
              text-decoration: underline;
            }
          }

          .format-note {
            font-size: 0.78rem;
            color: #64748B;
          }
        }
      }

      /* MOBILE BUTTONS */
      .mobile-actions-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;

        .mobile-upload-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid #CBD5E1;
          background: #FFFFFF;
          cursor: pointer;
          transition: all 0.15s ease;

          .material-symbols-outlined {
            font-size: 26px;
          }

          .btn-text-box {
            display: flex;
            flex-direction: column;
            text-align: left;

            .btn-title {
              font-size: 0.9rem;
              font-weight: 700;
              color: #1E293B;
            }

            .btn-desc {
              font-size: 0.7rem;
              color: #64748B;
            }
          }

          &.btn-camera {
            border-color: #BFDBFE;
            background: #EEF4FC;
            color: #1F3864;
          }

          &.btn-gallery {
            border-color: #E2E8F0;
            background: #F8FAFC;
            color: #475569;
          }

          &:active {
            transform: scale(0.97);
          }
        }
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #FEE2E2;
        border: 1px solid #FCA5A5;
        border-radius: 8px;
        color: #B91C1C;
        font-size: 0.8rem;
      }

      /* QUEUE LIST */
      .file-queue-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;

        .queue-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .queue-title {
            font-size: 0.82rem;
            font-weight: 700;
            color: #475569;
          }

          .clear-all-files {
            background: transparent;
            border: none;
            color: #EF4444;
            font-size: 0.76rem;
            font-weight: 600;
            cursor: pointer;

            &:hover {
              text-decoration: underline;
            }
          }
        }

        .queue-items {
          display: flex;
          flex-direction: column;
          gap: 6px;

          .file-item-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            transition: all 0.15s ease;

            &.success {
              border-color: #BBF7D0;
              background: #F0FDF4;
            }

            &.error {
              border-color: #FECACA;
              background: #FEF2F2;
            }

            .file-thumb-box {
              width: 40px;
              height: 40px;
              border-radius: 8px;
              overflow: hidden;
              background: #F1F5F9;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;

              .img-preview {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }

              .file-format-icon {
                font-size: 24px;

                &.format-pdf { color: #DC2626; }
                &.format-word { color: #2563EB; }
                &.format-excel { color: #16A34A; }
                &.format-img { color: #9333EA; }
                &.format-doc { color: #475569; }
              }
            }

            .file-info-col {
              flex: 1;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              gap: 3px;

              .file-name-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;

                .file-name {
                  font-size: 0.85rem;
                  font-weight: 600;
                  color: #1E293B;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }

                .file-size {
                  font-size: 0.72rem;
                  color: #64748B;
                  white-space: nowrap;
                }
              }

              .progress-bar-track {
                width: 100%;
                height: 4px;
                background: #E2E8F0;
                border-radius: 9999px;
                overflow: hidden;

                .progress-bar-fill {
                  height: 100%;
                  background: #1F3864;
                  transition: width 0.2s ease;
                }
              }

              .file-status-row {
                .status-badge {
                  display: inline-flex;
                  align-items: center;
                  gap: 3px;
                  font-size: 0.72rem;
                  font-weight: 600;

                  .material-symbols-outlined {
                    font-size: 14px;
                  }

                  &.status-queued { color: #475569; }
                  &.status-uploading { color: #1F3864; }
                  &.status-success { color: #16A34A; }
                  &.status-error { color: #DC2626; }
                }
              }
            }

            .remove-file-btn {
              background: transparent;
              border: none;
              color: #94A3B8;
              cursor: pointer;
              padding: 4px;
              display: flex;
              align-items: center;
              border-radius: 6px;

              &:hover {
                color: #EF4444;
                background: #FEE2E2;
              }

              .material-symbols-outlined {
                font-size: 18px;
              }
            }
          }
        }

        .manual-upload-btn {
          width: 100%;
          min-height: 44px;
          background: #1F3864;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          margin-top: 4px;

          &:hover:not(:disabled) {
            background: #152644;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
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
export class FileDropzoneComponent {
  private attachmentService = inject(AttachmentService);

  @Input() taskId?: string;
  @Input() taskLogId?: string;
  @Input() label?: string;
  @Input() required = false;
  @Input() disabled = false;
  @Input() maxFileSizeMB = 20;
  @Input() maxFiles = 10;
  @Input() autoUpload = true;
  @Input() accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() uploadComplete = new EventEmitter<any>();
  @Output() fileRemoved = new EventEmitter<number>();

  isDragOver = signal(false);
  isUploading = signal(false);
  validationError = signal<string | null>(null);
  fileQueue = signal<FileQueueItem[]>([]);

  hasQueuedFiles = computed(() =>
    this.fileQueue().some((f) => f.status === 'QUEUED')
  );

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled) {
      this.isDragOver.set(true);
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (this.disabled) return;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private handleFiles(files: File[]) {
    this.validationError.set(null);
    const maxSizeBytes = this.maxFileSizeMB * 1024 * 1024;
    const currentCount = this.fileQueue().length;

    if (currentCount + files.length > this.maxFiles) {
      this.validationError.set(`Bạn chỉ được tải lên tối đa ${this.maxFiles} tệp.`);
      return;
    }

    const newItems: FileQueueItem[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > maxSizeBytes) {
        this.validationError.set(
          `Tệp "${file.name}" vượt quá kích thước giới hạn ${this.maxFileSizeMB}MB.`
        );
        continue;
      }

      let previewUrl: string | null = null;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }

      newItems.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
        progress: 0,
        status: 'QUEUED',
      });
      validFiles.push(file);
    }

    if (newItems.length > 0) {
      this.fileQueue.update((q) => [...q, ...newItems]);
      this.filesSelected.emit(validFiles);

      if (this.autoUpload && this.taskId) {
        this.uploadQueuedFiles();
      }
    }
  }

  uploadQueuedFiles() {
    if (!this.taskId) return;
    const queuedItems = this.fileQueue().filter((item) => item.status === 'QUEUED');
    if (queuedItems.length === 0) return;

    this.isUploading.set(true);
    queuedItems.forEach((item) => {
      item.status = 'UPLOADING';
    });

    const filesToUpload = queuedItems.map((item) => item.file);

    this.attachmentService
      .uploadTaskAttachmentsWithProgress(this.taskId, filesToUpload, this.taskLogId)
      .subscribe({
        next: (event) => {
          this.fileQueue.update((q) =>
            q.map((item) => {
              if (item.status === 'UPLOADING') {
                item.progress = event.progress;
                if (event.completed) {
                  item.status = 'SUCCESS';
                }
              }
              return item;
            })
          );

          if (event.completed) {
            this.isUploading.set(false);
            this.uploadComplete.emit(event.data);
          }
        },
        error: (err) => {
          this.isUploading.set(false);
          this.fileQueue.update((q) =>
            q.map((item) => {
              if (item.status === 'UPLOADING') {
                item.status = 'ERROR';
                item.errorMessage = err.error?.message || 'Tải lên thất bại';
              }
              return item;
            })
          );
        },
      });
  }

  removeFile(index: number) {
    const item = this.fileQueue()[index];
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }

    this.fileQueue.update((q) => q.filter((_, i) => i !== index));
    this.fileRemoved.emit(index);
  }

  clearAllFiles() {
    this.fileQueue().forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    this.fileQueue.set([]);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileFormatIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'picture_as_pdf';
    if (['doc', 'docx'].includes(ext)) return 'description';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'table_chart';
    return 'insert_drive_file';
  }

  getFileFormatClass(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'format-img';
    if (['pdf'].includes(ext)) return 'format-pdf';
    if (['doc', 'docx'].includes(ext)) return 'format-word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'format-excel';
    return 'format-doc';
  }
}
