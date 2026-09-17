import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { DocumentService } from '../../core/services/document.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { AuthService } from '../../core/services/auth.service';
import { DocumentFolder, DocumentFile } from '../../core/models/document.models';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="documents-page">
      <!-- HEADER -->
      <div class="page-header">
        <div class="header-titles">
          <div class="header-tag">
            <span class="material-symbols-outlined tag-icon">folder_open</span>
            <span>Hệ Thống Quản Lý Tài Liệu & Văn Bản</span>
            <span class="year-badge">Năm học: {{ academicYearService.currentAcademicYear() }}</span>
          </div>
          <h1 class="page-title">Quản Lý Cây Thư Mục & Tài Liệu Trường Học</h1>
          <p class="page-subtitle">
            Không gian lưu trữ, tổ chức thư mục phân cấp và quản lý hồ sơ, công văn, biểu mẫu toàn trường theo phong cách Windows Explorer trực quan.
          </p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="reinitSampleTree()" title="Khôi phục lại cây thư mục mẫu chuẩn theo ảnh">
            <span class="material-symbols-outlined">restart_alt</span>
            <span>Cây thư mục mẫu</span>
          </button>
          <button type="button" class="btn btn-primary" (click)="openUploadModal()" [disabled]="!selectedFolder()">
            <span class="material-symbols-outlined">upload_file</span>
            <span>Tải lên tệp</span>
          </button>
        </div>
      </div>

      <!-- MAIN EXPLORER CONTAINER -->
      <div class="explorer-card">
        <!-- 1. LEFT PANEL: FOLDER TREE -->
        <div class="tree-panel">
          <div class="panel-header">
            <div class="panel-title-box">
              <span class="material-symbols-outlined panel-icon">account_tree</span>
              <span class="panel-title">CÂY THƯ MỤC</span>
            </div>
            <button type="button" class="btn-icon-action" (click)="openCreateFolderModal(null)" title="Thêm thư mục gốc">
              <span class="material-symbols-outlined">create_new_folder</span>
            </button>
          </div>

          <!-- Tree Search Filter -->
          <div class="tree-search-box">
            <span class="material-symbols-outlined tree-search-icon">search</span>
            <input
              type="text"
              class="tree-search-input"
              placeholder="Lọc cây thư mục..."
              [(ngModel)]="treeSearchQuery"
            />
            @if (treeSearchQuery) {
              <button type="button" class="tree-search-clear" (click)="treeSearchQuery = ''">
                <span class="material-symbols-outlined">close</span>
              </button>
            }
          </div>

          <!-- Tree Nodes List -->
          <div class="tree-scroll-area">
            @if (isLoadingTree()) {
              <div class="tree-loading">
                <span class="material-symbols-outlined spinner-icon">progress_activity</span>
                <span>Đang tải cây thư mục...</span>
              </div>
            } @else if (folderTree().length === 0) {
              <div class="tree-empty">
                <span class="material-symbols-outlined">folder_off</span>
                <p>Chưa có thư mục nào</p>
                <button type="button" class="btn btn-sm btn-outline" (click)="reinitSampleTree()">
                  Tạo cây mẫu
                </button>
              </div>
            } @else {
              <div class="tree-root-list">
                @for (folder of filteredTree(); track folder.id) {
                  <ng-container
                    *ngTemplateOutlet="treeNodeTpl; context: { $implicit: folder, depth: 0 }"
                  ></ng-container>
                }
              </div>
            }
          </div>

          <!-- Tree Footer Quick Info -->
          <div class="tree-footer">
            <span class="material-symbols-outlined icon-small">info</span>
            <span>Tổng số: <strong>{{ totalFolderCount() }}</strong> thư mục</span>
          </div>
        </div>

        <!-- 2. RIGHT PANEL: FILE & CONTENT EXPLORER -->
        <div class="content-panel">
          <!-- BREADCRUMB & LOCATION BAR -->
          <div class="breadcrumb-bar">
            <button
              type="button"
              class="btn-nav-up"
              (click)="navigateUp()"
              [disabled]="!canNavigateUp()"
              title="Lên thư mục cha"
            >
              <span class="material-symbols-outlined">arrow_upward</span>
            </button>

            <div class="breadcrumb-path">
              <span class="material-symbols-outlined breadcrumb-home-icon">domain</span>
              @for (segment of breadcrumbPath(); track segment.id; let last = $last) {
                <span class="path-separator">/</span>
                <button
                  type="button"
                  class="path-item"
                  [class.active]="last"
                  (click)="selectFolder(segment)"
                >
                  <span class="material-symbols-outlined path-folder-icon">folder</span>
                  <span>{{ segment.name }}</span>
                </button>
              }
            </div>

            <div class="view-mode-toggle">
              <button
                type="button"
                class="btn-view-mode"
                [class.active]="viewMode === 'table'"
                (click)="viewMode = 'table'"
                title="Chế độ bảng chi tiết"
              >
                <span class="material-symbols-outlined">format_list_bulleted</span>
              </button>
              <button
                type="button"
                class="btn-view-mode"
                [class.active]="viewMode === 'grid'"
                (click)="viewMode = 'grid'"
                title="Chế độ lưới icon"
              >
                <span class="material-symbols-outlined">grid_view</span>
              </button>
            </div>
          </div>

          <!-- ACTION TOOLBAR -->
          <div class="content-toolbar">
            <div class="toolbar-left">
              <button
                type="button"
                class="btn btn-sm btn-primary"
                (click)="openUploadModal()"
                [disabled]="!selectedFolder()"
              >
                <span class="material-symbols-outlined">upload</span>
                <span>Tải lên tệp</span>
              </button>

              <button
                type="button"
                class="btn btn-sm btn-secondary"
                (click)="openCreateFolderModal(selectedFolder()?.id || null)"
              >
                <span class="material-symbols-outlined">create_new_folder</span>
                <span>Thư mục con mới</span>
              </button>

              @if (selectedFolder()) {
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  (click)="confirmDeleteFolder(selectedFolder()!)"
                  title="Xóa thư mục hiện tại"
                >
                  <span class="material-symbols-outlined">delete</span>
                  <span>Xóa thư mục</span>
                </button>
              }
            </div>

            <div class="toolbar-right">
              <!-- Search in folder -->
              <div class="file-search-box">
                <span class="material-symbols-outlined">search</span>
                <input
                  type="text"
                  class="file-search-input"
                  placeholder="Tìm tệp trong thư mục..."
                  [(ngModel)]="fileSearchQuery"
                  (input)="applyFileSearch()"
                />
                @if (fileSearchQuery) {
                  <button type="button" class="btn-clear-search" (click)="clearFileSearch()">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                }
              </div>

              <!-- Filter Type -->
              <select class="form-select-filter" [(ngModel)]="fileTypeFilter" (change)="applyFileSearch()">
                <option value="ALL">Mọi định dạng</option>
                <option value="PDF">PDF (.pdf)</option>
                <option value="WORD">Word (.docx, .doc)</option>
                <option value="EXCEL">Excel (.xlsx, .xls)</option>
                <option value="IMAGE">Hình ảnh (.png, .jpg)</option>
              </select>
            </div>
          </div>

          <!-- EXPLORER BODY: FOLDERS & FILES -->
          <div class="explorer-body">
            @if (isLoadingFiles()) {
              <div class="explorer-loading">
                <span class="material-symbols-outlined spinner-icon">progress_activity</span>
                <span>Đang tải danh sách tài liệu...</span>
              </div>
            } @else {
              <!-- 1. SUBFOLDERS SECTION (if any) -->
              @if (currentSubFolders().length > 0) {
                <div class="subfolders-section">
                  <div class="section-title">Thư mục con ({{ currentSubFolders().length }})</div>
                  <div class="subfolders-grid">
                    @for (sub of currentSubFolders(); track sub.id) {
                      <div
                        class="folder-card"
                        (dblclick)="selectFolder(sub)"
                        (click)="highlightItem(sub.id)"
                        [class.selected]="highlightedId === sub.id"
                        [title]="'Nhấp đúp để mở thư mục ' + sub.name"
                      >
                        <div class="folder-card-icon">
                          <span class="material-symbols-outlined">folder</span>
                        </div>
                        <div class="folder-card-info">
                          <span class="folder-card-name">{{ sub.name }}</span>
                          <span class="folder-card-meta">{{ sub.children?.length || 0 }} thư mục con • {{ sub.fileCount || 0 }} tệp</span>
                        </div>
                        <div class="folder-card-actions">
                          <button
                            type="button"
                            class="btn-folder-action"
                            (click)="$event.stopPropagation(); openEditFolderModal(sub)"
                            title="Đổi tên"
                          >
                            <span class="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            type="button"
                            class="btn-folder-action btn-del"
                            (click)="$event.stopPropagation(); confirmDeleteFolder(sub)"
                            title="Xóa"
                          >
                            <span class="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- 2. FILES SECTION -->
              @if (filteredFiles().length === 0 && currentSubFolders().length === 0) {
                <div class="empty-folder-box">
                  <div class="empty-icon-wrap">
                    <span class="material-symbols-outlined empty-folder-icon">folder_open</span>
                  </div>
                  <h3>Thư mục này hiện đang trống</h3>
                  <p>Tải lên tài liệu hoặc tạo thư mục con để bắt đầu tổ chức lưu trữ văn bản.</p>
                  <div class="empty-actions">
                    <button type="button" class="btn btn-primary" (click)="openUploadModal()">
                      <span class="material-symbols-outlined">upload_file</span>
                      <span>Tải lên tệp ngay</span>
                    </button>
                    <button type="button" class="btn btn-secondary" (click)="openCreateFolderModal(selectedFolder()?.id || null)">
                      <span class="material-symbols-outlined">create_new_folder</span>
                      <span>Thêm thư mục con</span>
                    </button>
                  </div>
                </div>
              } @else if (filteredFiles().length === 0 && currentSubFolders().length > 0) {
                <div class="no-files-notice">
                  <span class="material-symbols-outlined">info</span>
                  <span>Không có tệp tin trực tiếp trong thư mục này. Hãy duyệt các thư mục con phía trên hoặc tải tệp mới.</span>
                </div>
              } @else {
                <!-- TABLE VIEW MODE -->
                @if (viewMode === 'table') {
                  <div class="files-table-wrapper">
                    <table class="files-table">
                      <thead>
                        <tr>
                          <th class="col-name">Tên tệp tin</th>
                          <th class="col-type">Định dạng</th>
                          <th class="col-size">Dung lượng</th>
                          <th class="col-uploader">Người tải lên</th>
                          <th class="col-date">Ngày tạo</th>
                          <th class="col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (file of filteredFiles(); track file.id) {
                          <tr
                            (click)="highlightItem(file.id)"
                            [class.selected]="highlightedId === file.id"
                          >
                            <td class="col-name">
                              <div class="file-name-cell">
                                <div class="file-badge-icon" [ngClass]="getFileTypeClass(file.mimeType)">
                                  <span class="material-symbols-outlined">{{ getFileTypeIcon(file.mimeType) }}</span>
                                </div>
                                <div class="file-name-texts">
                                  <span class="file-main-name" [title]="file.originalName || file.fileName">
                                    {{ file.originalName || file.fileName }}
                                  </span>
                                  @if (file.description) {
                                    <span class="file-sub-desc">{{ file.description }}</span>
                                  }
                                </div>
                              </div>
                            </td>
                            <td class="col-type">
                              <span class="type-tag" [ngClass]="getFileTypeClass(file.mimeType)">
                                {{ getFileTypeName(file.mimeType) }}
                              </span>
                            </td>
                            <td class="col-size">
                              <span class="size-text">{{ formatFileSize(file.fileSize) }}</span>
                            </td>
                            <td class="col-uploader">
                              <div class="uploader-cell">
                                <img
                                  [src]="file.uploadedBy?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (file.uploadedBy?.fullName || 'User')"
                                  class="uploader-avatar-mini"
                                  alt="Avatar"
                                />
                                <span class="uploader-text">{{ file.uploadedBy?.fullName || 'Quản trị viên' }}</span>
                              </div>
                            </td>
                            <td class="col-date">
                              <span class="date-text">{{ file.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                            </td>
                            <td class="col-actions">
                              <div class="action-buttons-cell">
                                <button
                                  type="button"
                                  class="btn-file-act btn-view"
                                  (click)="previewFile(file)"
                                  title="Xem trước"
                                >
                                  <span class="material-symbols-outlined">visibility</span>
                                </button>
                                <a
                                  [href]="file.fileUrl"
                                  [download]="file.originalName || file.fileName"
                                  target="_blank"
                                  class="btn-file-act btn-download"
                                  title="Tải về máy"
                                >
                                  <span class="material-symbols-outlined">download</span>
                                </a>
                                <button
                                  type="button"
                                  class="btn-file-act btn-delete"
                                  (click)="confirmDeleteFile(file)"
                                  title="Xóa tệp"
                                >
                                  <span class="material-symbols-outlined">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }

                <!-- GRID VIEW MODE -->
                @if (viewMode === 'grid') {
                  <div class="files-grid-wrapper">
                    @for (file of filteredFiles(); track file.id) {
                      <div
                        class="file-card"
                        (click)="highlightItem(file.id)"
                        [class.selected]="highlightedId === file.id"
                      >
                        <div class="file-card-preview" [ngClass]="getFileTypeClass(file.mimeType)">
                          <span class="material-symbols-outlined preview-icon">{{ getFileTypeIcon(file.mimeType) }}</span>
                          <span class="preview-type-badge">{{ getFileTypeName(file.mimeType) }}</span>
                        </div>

                        <div class="file-card-body">
                          <h4 class="file-card-title" [title]="file.originalName || file.fileName">
                            {{ file.originalName || file.fileName }}
                          </h4>
                          <div class="file-card-meta">
                            <span>{{ formatFileSize(file.fileSize) }}</span>
                            <span>•</span>
                            <span>{{ file.createdAt | date:'dd/MM/yyyy' }}</span>
                          </div>
                        </div>

                        <div class="file-card-footer">
                          <button
                            type="button"
                            class="card-btn-act"
                            (click)="previewFile(file)"
                            title="Xem trước"
                          >
                            <span class="material-symbols-outlined">visibility</span>
                          </button>
                          <a
                            [href]="file.fileUrl"
                            [download]="file.originalName || file.fileName"
                            target="_blank"
                            class="card-btn-act"
                            title="Tải xuống"
                          >
                            <span class="material-symbols-outlined">download</span>
                          </a>
                          <button
                            type="button"
                            class="card-btn-act card-btn-del"
                            (click)="confirmDeleteFile(file)"
                            title="Xóa tệp"
                          >
                            <span class="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            }
          </div>

          <!-- STATUS BAR FOOTER -->
          <div class="panel-status-bar">
            <div class="status-left">
              <span>Đang mở: <strong>{{ selectedFolder()?.name || 'Thư mục gốc' }}</strong></span>
              <span>|</span>
              <span><strong>{{ currentSubFolders().length }}</strong> thư mục con</span>
              <span>|</span>
              <span><strong>{{ filteredFiles().length }}</strong> tệp tin</span>
            </div>
            <div class="status-right">
              <span>Tổng dung lượng thư mục: <strong>{{ formatFileSize(currentFolderTotalSize()) }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- TEMPLATE FOR RECURSIVE TREE NODE -->
      <ng-template #treeNodeTpl let-folder let-depth="depth">
        <div class="tree-node-wrapper" [style.padding-left.px]="depth * 16">
          <div
            class="tree-node-item"
            [class.active]="selectedFolder()?.id === folder.id"
            (click)="selectFolder(folder)"
          >
            <!-- EXPAND / COLLAPSE TOGGLE -->
            @if (folder.children && folder.children.length > 0) {
              <button
                type="button"
                class="btn-tree-toggle"
                (click)="$event.stopPropagation(); toggleNode(folder)"
              >
                <span class="material-symbols-outlined toggle-chevron" [class.open]="folder.isOpen">
                  {{ folder.isOpen ? 'expand_more' : 'chevron_right' }}
                </span>
              </button>
            } @else {
              <span class="tree-spacer"></span>
            }

            <!-- FOLDER ICON -->
            <span class="material-symbols-outlined tree-folder-icon" [class.open]="folder.isOpen || selectedFolder()?.id === folder.id">
              {{ (folder.isOpen || selectedFolder()?.id === folder.id) ? 'folder_open' : 'folder' }}
            </span>

            <!-- FOLDER NAME -->
            <span class="tree-folder-name" [title]="folder.name">{{ folder.name }}</span>

            <!-- BADGE COUNT -->
            @if (folder.fileCount && folder.fileCount > 0) {
              <span class="tree-count-badge">{{ folder.fileCount }}</span>
            }

            <!-- CONTEXT HOVER ACTIONS -->
            <div class="tree-node-hover-actions">
              <button
                type="button"
                class="btn-hover-act"
                (click)="$event.stopPropagation(); openCreateFolderModal(folder.id)"
                title="Tạo thư mục con"
              >
                <span class="material-symbols-outlined">add</span>
              </button>
              <button
                type="button"
                class="btn-hover-act"
                (click)="$event.stopPropagation(); openEditFolderModal(folder)"
                title="Đổi tên"
              >
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button
                type="button"
                class="btn-hover-act btn-del"
                (click)="$event.stopPropagation(); confirmDeleteFolder(folder)"
                title="Xóa thư mục"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <!-- CHILDREN NODES -->
          @if (folder.isOpen && folder.children && folder.children.length > 0) {
            <div class="tree-children-container">
              @for (child of folder.children; track child.id) {
                <ng-container
                  *ngTemplateOutlet="treeNodeTpl; context: { $implicit: child, depth: depth + 1 }"
                ></ng-container>
              }
            </div>
          }
        </div>
      </ng-template>

      <!-- MODAL 1: CREATE / EDIT FOLDER -->
      @if (showFolderModal()) {
        <div class="modal-overlay" (click)="closeFolderModal()">
          <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <span class="material-symbols-outlined modal-icon">
                  {{ isEditingFolder() ? 'edit_note' : 'create_new_folder' }}
                </span>
                <h3 class="modal-title">{{ isEditingFolder() ? 'Đổi Tên Thư Mục' : 'Tạo Thư Mục Mới' }}</h3>
              </div>
              <button type="button" class="btn-close-modal" (click)="closeFolderModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Tên thư mục <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  placeholder="Ví dụ: 1. Công tác Đảng, Chuyên môn, Kế hoạch tuần..."
                  [(ngModel)]="folderFormName"
                  (keyup.enter)="saveFolder()"
                  autofocus
                />
              </div>

              @if (!isEditingFolder() && targetParentFolder()) {
                <div class="parent-info-note">
                  <span class="material-symbols-outlined">subdirectory_arrow_right</span>
                  <span>Tạo bên trong: <strong>{{ targetParentFolder()?.name }}</strong></span>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeFolderModal()">Hủy</button>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="!folderFormName.trim() || isSubmittingFolder()"
                (click)="saveFolder()"
              >
                <span class="material-symbols-outlined">save</span>
                <span>{{ isEditingFolder() ? 'Cập nhật' : 'Tạo thư mục' }}</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL 2: UPLOAD FILES -->
      @if (showUploadModal()) {
        <div class="modal-overlay" (click)="closeUploadModal()">
          <div class="modal-card modal-md" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <span class="material-symbols-outlined modal-icon">cloud_upload</span>
                <h3 class="modal-title">Tải Lên Tệp Tin Tài Liệu</h3>
              </div>
              <button type="button" class="btn-close-modal" (click)="closeUploadModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="upload-target-banner">
                <span class="material-symbols-outlined">folder</span>
                <span>Thư mục đích: <strong>{{ selectedFolder()?.name || 'Thư mục gốc' }}</strong></span>
              </div>

              <!-- Drag and drop dropzone -->
              <div
                class="upload-dropzone"
                [class.drag-over]="isDragOver"
                (dragover)="onDragOver($event)"
                (dragleave)="isDragOver = false"
                (drop)="onFileDrop($event)"
                (click)="fileInput.click()"
              >
                <input
                  #fileInput
                  type="file"
                  multiple
                  class="hidden-file-input"
                  (change)="onFileSelect($event)"
                />
                <span class="material-symbols-outlined dropzone-icon">upload_file</span>
                <h4>Kéo thả tệp vào đây hoặc nhấn để duyệt</h4>
                <p>Hỗ trợ tải lên cùng lúc nhiều tệp (PDF, Word, Excel, Hình ảnh, Tối đa 50MB/tệp)</p>
              </div>

              <!-- Selected Files List -->
              @if (pendingFiles.length > 0) {
                <div class="pending-files-section">
                  <div class="pending-header">
                    <span>Đã chọn {{ pendingFiles.length }} tệp tin:</span>
                    <button type="button" class="btn-clear-pending" (click)="pendingFiles = []">
                      Xóa tất cả
                    </button>
                  </div>
                  <div class="pending-list">
                    @for (pf of pendingFiles; track pf.name; let i = $index) {
                      <div class="pending-item">
                        <span class="material-symbols-outlined pending-icon">description</span>
                        <div class="pending-name">{{ pf.name }}</div>
                        <div class="pending-size">{{ formatFileSize(pf.size) }}</div>
                        <button type="button" class="btn-remove-pending" (click)="removePendingFile(i)">
                          <span class="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Upload Progress -->
              @if (isUploading()) {
                <div class="upload-progress-box">
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" [style.width.%]="uploadProgress()"></div>
                  </div>
                  <span class="progress-text">Đang tải lên... {{ uploadProgress() }}%</span>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeUploadModal()" [disabled]="isUploading()">
                Đóng
              </button>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="pendingFiles.length === 0 || isUploading()"
                (click)="submitUploadFiles()"
              >
                <span class="material-symbols-outlined">cloud_upload</span>
                <span>Bắt đầu tải lên ({{ pendingFiles.length }} tệp)</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL 3: PREVIEW FILE -->
      @if (previewModalFile()) {
        <div class="modal-overlay" (click)="previewModalFile.set(null)">
          <div class="modal-card modal-lg preview-modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <span class="material-symbols-outlined modal-icon">{{ getFileTypeIcon(previewModalFile()!.mimeType) }}</span>
                <h3 class="modal-title">{{ previewModalFile()!.originalName || previewModalFile()!.fileName }}</h3>
              </div>
              <div class="modal-header-actions">
                <a
                  [href]="previewModalFile()!.fileUrl"
                  [download]="previewModalFile()!.originalName || previewModalFile()!.fileName"
                  target="_blank"
                  class="btn btn-sm btn-primary"
                >
                  <span class="material-symbols-outlined">download</span>
                  <span>Tải về</span>
                </a>
                <button type="button" class="btn-close-modal" (click)="previewModalFile.set(null)">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div class="modal-body preview-modal-body">
              @if (previewModalFile()!.mimeType.includes('pdf')) {
                <div class="pdf-preview-box">
                  <iframe
                    [src]="previewModalFile()!.fileUrl"
                    class="preview-iframe"
                    title="Xem trước PDF"
                  ></iframe>
                </div>
              } @else if (previewModalFile()!.mimeType.startsWith('image/')) {
                <div class="image-preview-box">
                  <img [src]="previewModalFile()!.fileUrl" class="preview-full-img" alt="Ảnh minh họa" />
                </div>
              } @else {
                <div class="doc-preview-placeholder">
                  <span class="material-symbols-outlined doc-large-icon">{{ getFileTypeIcon(previewModalFile()!.mimeType) }}</span>
                  <h4>{{ previewModalFile()!.originalName || previewModalFile()!.fileName }}</h4>
                  <p>Định dạng văn bản Office (Word/Excel) xem trực quan nhất khi tải về thiết bị hoặc mở qua Microsoft 365.</p>
                  <a
                    [href]="previewModalFile()!.fileUrl"
                    [download]="previewModalFile()!.originalName || previewModalFile()!.fileName"
                    class="btn btn-primary"
                  >
                    <span class="material-symbols-outlined">download</span>
                    <span>Tải tệp này về máy</span>
                  </a>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .documents-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 40px;
    }

    /* HEADER */
    .page-header {
      background: #ffffff;
      border-radius: 12px;
      padding: 20px 24px;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
    }
    .header-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      width: fit-content;
    }
    .year-badge {
      background: #dbeafe;
      color: #1e40af;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      margin-left: 6px;
    }
    .tag-icon { font-size: 16px; }
    .page-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .page-subtitle {
      color: #64748b;
      margin: 0;
      font-size: 13px;
      line-height: 1.4;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* MAIN EXPLORER SPLIT CARD */
    .explorer-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      display: grid;
      grid-template-columns: 320px 1fr;
      min-height: 680px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      overflow: hidden;
    }
    @media (max-width: 900px) {
      .explorer-card { grid-template-columns: 1fr; }
    }

    /* 1. LEFT PANEL (TREE) */
    .tree-panel {
      border-right: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .panel-header {
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f1f5f9;
    }
    .panel-title-box {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      letter-spacing: 0.5px;
    }
    .panel-icon { font-size: 18px; color: #2563eb; }
    .btn-icon-action {
      background: none;
      border: none;
      color: #2563eb;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 6px;
      transition: background 0.15s;
      &:hover { background: #dbeafe; }
    }

    .tree-search-box {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
      position: relative;
      display: flex;
      align-items: center;
    }
    .tree-search-icon {
      position: absolute;
      left: 20px;
      color: #94a3b8;
      font-size: 16px;
    }
    .tree-search-input {
      width: 100%;
      height: 32px;
      padding-left: 30px;
      padding-right: 26px;
      font-size: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      &:focus { outline: none; border-color: #2563eb; }
    }
    .tree-search-clear {
      position: absolute;
      right: 18px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      padding: 0;
      span { font-size: 14px; }
    }

    .tree-scroll-area {
      flex: 1;
      overflow-y: auto;
      padding: 8px 4px;
      max-height: 580px;
    }
    .tree-loading, .tree-empty {
      padding: 30px 16px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .tree-root-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tree-node-wrapper {
      display: flex;
      flex-direction: column;
    }
    .tree-node-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      user-select: none;
      position: relative;
      transition: background 0.15s, color 0.15s;
      color: #334155;
      font-size: 13px;
      &:hover {
        background: #e2e8f0;
        .tree-node-hover-actions { display: flex; }
      }
      &.active {
        background: #dbeafe;
        color: #1d4ed8;
        font-weight: 600;
        .tree-folder-icon { color: #2563eb; }
      }
    }
    .btn-tree-toggle {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      display: flex;
      align-items: center;
      color: #64748b;
    }
    .toggle-chevron {
      font-size: 18px;
      transition: transform 0.15s;
    }
    .tree-spacer {
      width: 22px;
      height: 18px;
      display: inline-block;
    }
    .tree-folder-icon {
      font-size: 18px;
      color: #eab308;
      margin-right: 4px;
    }
    .tree-folder-icon.open { color: #f59e0b; }
    .tree-folder-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: inherit;
    }
    .tree-count-badge {
      font-size: 11px;
      background: #e2e8f0;
      color: #475569;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 600;
    }

    .tree-node-hover-actions {
      display: none;
      align-items: center;
      gap: 2px;
      margin-left: 4px;
    }
    .btn-hover-act {
      background: none;
      border: none;
      padding: 2px;
      border-radius: 4px;
      cursor: pointer;
      color: #64748b;
      display: flex;
      align-items: center;
      &:hover { background: #cbd5e1; color: #0f172a; }
      &.btn-del:hover { background: #fee2e2; color: #dc2626; }
      span { font-size: 14px; }
    }

    .tree-footer {
      padding: 10px 14px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
    }
    .icon-small { font-size: 15px; }

    /* 2. RIGHT PANEL (CONTENT EXPLORER) */
    .content-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #ffffff;
    }

    .breadcrumb-bar {
      padding: 10px 16px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-nav-up {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      color: #334155;
      &:hover:not(:disabled) { background: #e2e8f0; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
      span { font-size: 16px; }
    }
    .breadcrumb-path {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 4px;
      overflow-x: auto;
      white-space: nowrap;
      padding: 2px 0;
    }
    .breadcrumb-home-icon { font-size: 18px; color: #2563eb; }
    .path-separator { color: #94a3b8; font-size: 14px; }
    .path-item {
      background: none;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #475569;
      padding: 3px 6px;
      border-radius: 4px;
      &:hover { background: #e2e8f0; color: #0f172a; }
      &.active {
        font-weight: 700;
        color: #1e293b;
        background: #e2e8f0;
      }
    }
    .path-folder-icon { font-size: 16px; color: #eab308; }

    .view-mode-toggle {
      display: flex;
      align-items: center;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
    }
    .btn-view-mode {
      background: none;
      border: none;
      padding: 4px 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      color: #64748b;
      &.active { background: #2563eb; color: #ffffff; }
      span { font-size: 18px; }
    }

    .content-toolbar {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .file-search-box {
      position: relative;
      display: flex;
      align-items: center;
      span { position: absolute; left: 10px; color: #94a3b8; font-size: 18px; }
    }
    .file-search-input {
      height: 34px;
      padding-left: 32px;
      padding-right: 28px;
      font-size: 13px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      width: 220px;
      &:focus { outline: none; border-color: #2563eb; }
    }
    .btn-clear-search {
      position: absolute;
      right: 6px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      span { font-size: 16px; }
    }
    .form-select-filter {
      height: 34px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 10px;
      font-size: 13px;
      background: #ffffff;
      color: #334155;
    }

    /* EXPLORER BODY */
    .explorer-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .explorer-loading {
      padding: 60px 20px;
      text-align: center;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    /* SUBFOLDERS */
    .subfolders-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .subfolders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
    }
    .folder-card {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s;
      position: relative;
      &:hover {
        border-color: #93c5fd;
        background: #eff6ff;
        transform: translateY(-1px);
        .folder-card-actions { display: flex; }
      }
      &.selected {
        border-color: #2563eb;
        background: #dbeafe;
      }
    }
    .folder-card-icon {
      font-size: 26px;
      color: #f59e0b;
      display: flex;
      align-items: center;
    }
    .folder-card-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .folder-card-name {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .folder-card-meta {
      font-size: 11px;
      color: #64748b;
    }
    .folder-card-actions {
      display: none;
      align-items: center;
      gap: 2px;
    }
    .btn-folder-action {
      background: none;
      border: none;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      color: #64748b;
      display: flex;
      &:hover { background: #cbd5e1; color: #0f172a; }
      &.btn-del:hover { background: #fee2e2; color: #dc2626; }
      span { font-size: 16px; }
    }

    /* EMPTY STATE */
    .empty-folder-box {
      border: 2px dashed #e2e8f0;
      border-radius: 12px;
      padding: 48px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      background: #fafafa;
      margin: 20px 0;
    }
    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #e0f2fe;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    .empty-folder-icon { font-size: 32px; color: #0284c7; }
    .empty-folder-box h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .empty-folder-box p {
      font-size: 13px;
      color: #64748b;
      max-width: 420px;
      margin: 0;
    }
    .empty-actions {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    .no-files-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      color: #64748b;
      span { color: #3b82f6; }
    }

    /* TABLE VIEW */
    .files-table-wrapper {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow-x: auto;
    }
    .files-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    .files-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .files-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #1e293b;
    }
    .files-table tr:hover td {
      background: #f8fafc;
    }
    .files-table tr.selected td {
      background: #eff6ff;
    }

    .file-name-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .file-badge-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      span { font-size: 18px; }
    }
    .file-name-texts {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .file-main-name {
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 380px;
    }
    .file-sub-desc {
      font-size: 11px;
      color: #64748b;
    }

    .type-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .type-pdf { background: #fee2e2; color: #b91c1c; }
    .type-word { background: #e0e7ff; color: #3730a3; }
    .type-excel { background: #dcfce7; color: #15803d; }
    .type-img { background: #f3e8ff; color: #6b21a8; }
    .type-other { background: #f1f5f9; color: #475569; }

    .size-text { color: #64748b; font-size: 12px; }
    .date-text { color: #64748b; font-size: 12px; white-space: nowrap; }

    .uploader-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    .uploader-avatar-mini {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1px solid #cbd5e1;
    }
    .uploader-text { font-size: 12px; color: #334155; }

    .action-buttons-cell {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .btn-file-act {
      background: none;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      color: #475569;
      text-decoration: none;
      transition: all 0.15s;
      span { font-size: 16px; }
      &:hover { background: #f1f5f9; color: #0f172a; }
      &.btn-view:hover { background: #dbeafe; color: #1d4ed8; border-color: #93c5fd; }
      &.btn-download:hover { background: #dcfce7; color: #15803d; border-color: #86efac; }
      &.btn-delete:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    }

    /* GRID VIEW */
    .files-grid-wrapper {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 14px;
    }
    .file-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: all 0.15s;
      &:hover {
        border-color: #93c5fd;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        transform: translateY(-2px);
      }
      &.selected {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
      }
    }
    .file-card-preview {
      height: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .preview-icon { font-size: 40px; }
    .preview-type-badge {
      position: absolute;
      bottom: 6px;
      right: 6px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.9);
      color: #334155;
    }
    .file-card-body {
      padding: 10px 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .file-card-title {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .file-card-meta {
      font-size: 11px;
      color: #64748b;
      display: flex;
      gap: 4px;
    }
    .file-card-footer {
      padding: 6px 10px;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }
    .card-btn-act {
      background: none;
      border: none;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      color: #64748b;
      display: flex;
      text-decoration: none;
      &:hover { background: #e2e8f0; color: #0f172a; }
      &.card-btn-del:hover { background: #fee2e2; color: #dc2626; }
      span { font-size: 16px; }
    }

    /* STATUS BAR */
    .panel-status-bar {
      padding: 8px 16px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #64748b;
      gap: 12px;
    }
    .status-left, .status-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* BUTTONS */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .btn-sm { padding: 6px 10px; font-size: 12px; }
    .btn-primary { background: #2563eb; color: #ffffff; &:hover:not(:disabled) { background: #1d4ed8; } }
    .btn-secondary { background: #f1f5f9; color: #334155; border-color: #cbd5e1; &:hover { background: #e2e8f0; } }
    .btn-outline { background: #ffffff; color: #334155; border-color: #cbd5e1; &:hover { background: #f8fafc; border-color: #94a3b8; } }
    .btn-outline-danger { background: #ffffff; color: #dc2626; border-color: #fca5a5; &:hover { background: #fee2e2; } }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* MODALS */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: 90vh;
      animation: modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-sm { width: 440px; }
    .modal-md { width: 560px; }
    .modal-lg { width: 850px; }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
    }
    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .modal-icon { font-size: 22px; color: #2563eb; }
    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .modal-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-close-modal {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      padding: 4px;
      border-radius: 6px;
      &:hover { background: #e2e8f0; color: #0f172a; }
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }
    .required { color: #dc2626; }
    .form-control {
      height: 38px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0 12px;
      font-size: 14px;
      color: #0f172a;
      &:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
    }
    .parent-info-note {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #64748b;
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
    }

    /* UPLOAD MODAL */
    .upload-target-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      span.material-symbols-outlined { color: #f59e0b; }
    }
    .upload-dropzone {
      border: 2px dashed #94a3b8;
      border-radius: 12px;
      padding: 32px 20px;
      text-align: center;
      cursor: pointer;
      background: #f8fafc;
      transition: all 0.15s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      &:hover, &.drag-over {
        border-color: #2563eb;
        background: #eff6ff;
      }
    }
    .dropzone-icon { font-size: 40px; color: #2563eb; }
    .upload-dropzone h4 { margin: 0; font-size: 15px; color: #1e293b; }
    .upload-dropzone p { margin: 0; font-size: 12px; color: #64748b; }
    .hidden-file-input { display: none; }

    .pending-files-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pending-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
    .btn-clear-pending {
      background: none;
      border: none;
      color: #dc2626;
      font-size: 12px;
      cursor: pointer;
      &:hover { text-decoration: underline; }
    }
    .pending-list {
      max-height: 160px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
    }
    .pending-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
      &:last-child { border-bottom: none; }
    }
    .pending-icon { font-size: 16px; color: #2563eb; }
    .pending-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
    .pending-size { color: #64748b; }
    .btn-remove-pending {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      &:hover { color: #dc2626; }
      span { font-size: 14px; }
    }

    .upload-progress-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .progress-bar-wrap {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #2563eb;
      transition: width 0.2s;
    }
    .progress-text { font-size: 12px; color: #2563eb; font-weight: 600; text-align: right; }

    /* PREVIEW MODAL */
    .preview-modal-card {
      height: 85vh;
    }
    .preview-modal-body {
      flex: 1;
      padding: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
    }
    .pdf-preview-box { width: 100%; height: 100%; }
    .preview-iframe { width: 100%; height: 100%; border: none; }
    .image-preview-box {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .preview-full-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .doc-preview-placeholder {
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      max-width: 480px;
    }
    .doc-large-icon { font-size: 64px; color: #2563eb; }
    .doc-preview-placeholder h4 { margin: 0; font-size: 16px; color: #0f172a; }
    .doc-preview-placeholder p { margin: 0; font-size: 13px; color: #64748b; }
  `]
})
export class DocumentsComponent implements OnInit, OnDestroy {
  private documentService = inject(DocumentService);
  public academicYearService = inject(AcademicYearService);
  public authService = inject(AuthService);
  private yearSub?: Subscription;

  // Tree & Folder signals
  isLoadingTree = signal<boolean>(false);
  folderTree = signal<DocumentFolder[]>([]);
  selectedFolder = signal<DocumentFolder | null>(null);

  // Files signals
  isLoadingFiles = signal<boolean>(false);
  filesList = signal<DocumentFile[]>([]);
  highlightedId: string | null = null;
  viewMode: 'table' | 'grid' = 'table';

  // Search & Filter
  treeSearchQuery: string = '';
  fileSearchQuery: string = '';
  fileTypeFilter: string = 'ALL';

  // Modals
  showFolderModal = signal<boolean>(false);
  isEditingFolder = signal<boolean>(false);
  targetParentFolder = signal<DocumentFolder | null>(null);
  folderToEdit = signal<DocumentFolder | null>(null);
  folderFormName: string = '';
  isSubmittingFolder = signal<boolean>(false);

  showUploadModal = signal<boolean>(false);
  isDragOver: boolean = false;
  pendingFiles: File[] = [];
  isUploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);

  previewModalFile = signal<DocumentFile | null>(null);

  // Computed properties
  filteredTree = computed(() => {
    const q = this.treeSearchQuery.trim().toLowerCase();
    const tree = this.folderTree();
    if (!q) return tree;

    const filterNodes = (nodes: DocumentFolder[]): DocumentFolder[] => {
      const result: DocumentFolder[] = [];
      for (const node of nodes) {
        const matches = node.name.toLowerCase().includes(q);
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        if (matches || filteredChildren.length > 0) {
          result.push({
            ...node,
            isOpen: true,
            children: filteredChildren,
          });
        }
      }
      return result;
    };

    return filterNodes(tree);
  });

  currentSubFolders = computed(() => {
    const sel = this.selectedFolder();
    if (!sel) {
      return this.folderTree();
    }
    return sel.children || [];
  });

  filteredFiles = computed(() => {
    let files = this.filesList();
    const q = this.fileSearchQuery.trim().toLowerCase();
    const type = this.fileTypeFilter;

    if (q) {
      files = files.filter(
        (f) =>
          f.fileName.toLowerCase().includes(q) ||
          (f.originalName && f.originalName.toLowerCase().includes(q)) ||
          (f.description && f.description.toLowerCase().includes(q))
      );
    }

    if (type !== 'ALL') {
      files = files.filter((f) => {
        if (type === 'PDF') return f.mimeType.includes('pdf');
        if (type === 'IMAGE') return f.mimeType.startsWith('image/');
        if (type === 'WORD') return f.mimeType.includes('word');
        if (type === 'EXCEL') return f.mimeType.includes('sheet') || f.mimeType.includes('excel');
        return true;
      });
    }

    return files;
  });

  breadcrumbPath = computed(() => {
    const path: DocumentFolder[] = [];
    let current = this.selectedFolder();
    if (!current) return path;

    const allFolders = this.flattenTree(this.folderTree());
    while (current) {
      path.unshift(current);
      if (current.parentId) {
        current = allFolders.find((f) => f.id === current?.parentId) || null;
      } else {
        current = null;
      }
    }
    return path;
  });

  totalFolderCount = computed(() => {
    return this.flattenTree(this.folderTree()).length;
  });

  currentFolderTotalSize = computed(() => {
    return this.filteredFiles().reduce((acc, f) => acc + (f.fileSize || 0), 0);
  });

  ngOnInit() {
    this.loadTreeAndSelectDefault();

    this.yearSub = this.academicYearService.yearChanged$.subscribe(() => {
      this.loadTreeAndSelectDefault();
    });
  }

  ngOnDestroy() {
    if (this.yearSub) {
      this.yearSub.unsubscribe();
    }
  }

  loadTreeAndSelectDefault() {
    this.isLoadingTree.set(true);
    this.documentService.getFolderTree(this.academicYearService.currentAcademicYear()).subscribe({
      next: (tree) => {
        this.folderTree.set(tree);
        this.isLoadingTree.set(false);

        // Select the root or first available folder by default
        if (tree.length > 0) {
          const root = tree[0];
          // If root has children (e.g. 2026_2027), try selecting the academic year child
          if (root.children && root.children.length > 0) {
            this.selectFolder(root.children[0]);
          } else {
            this.selectFolder(root);
          }
        }
      },
      error: () => {
        this.isLoadingTree.set(false);
      },
    });
  }

  selectFolder(folder: DocumentFolder) {
    this.selectedFolder.set(folder);
    this.highlightedId = folder.id;
    this.fileSearchQuery = '';
    this.fileTypeFilter = 'ALL';
    this.loadFilesForFolder(folder.id);
  }

  loadFilesForFolder(folderId: string) {
    this.isLoadingFiles.set(true);
    this.documentService.getFilesByFolder(folderId).subscribe({
      next: (files) => {
        this.filesList.set(files);
        this.isLoadingFiles.set(false);
      },
      error: () => {
        this.isLoadingFiles.set(false);
      },
    });
  }

  toggleNode(folder: DocumentFolder) {
    folder.isOpen = !folder.isOpen;
  }

  canNavigateUp(): boolean {
    return !!this.selectedFolder()?.parentId;
  }

  navigateUp() {
    const parentId = this.selectedFolder()?.parentId;
    if (parentId) {
      const all = this.flattenTree(this.folderTree());
      const parent = all.find((f) => f.id === parentId);
      if (parent) {
        this.selectFolder(parent);
      }
    }
  }

  highlightItem(id: string) {
    this.highlightedId = id;
  }

  applyFileSearch() {
    // Computed signals automatically re-evaluate
  }

  clearFileSearch() {
    this.fileSearchQuery = '';
  }

  // Folder Modals & CRUD
  openCreateFolderModal(parentId: string | null) {
    this.isEditingFolder.set(false);
    this.folderFormName = '';
    if (parentId) {
      const all = this.flattenTree(this.folderTree());
      this.targetParentFolder.set(all.find((f) => f.id === parentId) || null);
    } else {
      this.targetParentFolder.set(null);
    }
    this.showFolderModal.set(true);
  }

  openEditFolderModal(folder: DocumentFolder) {
    this.isEditingFolder.set(true);
    this.folderToEdit.set(folder);
    this.folderFormName = folder.name;
    this.showFolderModal.set(true);
  }

  closeFolderModal() {
    this.showFolderModal.set(false);
    this.folderFormName = '';
    this.targetParentFolder.set(null);
    this.folderToEdit.set(null);
  }

  saveFolder() {
    const name = this.folderFormName.trim();
    if (!name) return;

    this.isSubmittingFolder.set(true);
    if (this.isEditingFolder() && this.folderToEdit()) {
      this.documentService.updateFolder(this.folderToEdit()!.id, { name }).subscribe({
        next: (updated) => {
          this.isSubmittingFolder.set(false);
          this.closeFolderModal();
          this.loadTreeAndSelectDefault();
        },
        error: () => {
          this.isSubmittingFolder.set(false);
        },
      });
    } else {
      const parentId = this.targetParentFolder()?.id || null;
      this.documentService
        .createFolder({
          name,
          parentId,
          academicYear: this.academicYearService.currentAcademicYear(),
        })
        .subscribe({
          next: (created) => {
            this.isSubmittingFolder.set(false);
            this.closeFolderModal();
            this.loadTreeAndSelectDefault();
          },
          error: () => {
            this.isSubmittingFolder.set(false);
          },
        });
    }
  }

  confirmDeleteFolder(folder: DocumentFolder) {
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa thư mục "${folder.name}" và toàn bộ tệp tin, thư mục con bên trong?`
      )
    ) {
      this.documentService.deleteFolder(folder.id).subscribe({
        next: () => {
          this.loadTreeAndSelectDefault();
        },
      });
    }
  }

  reinitSampleTree() {
    if (confirm('Khôi phục lại toàn bộ cây thư mục mẫu chuẩn theo sơ đồ trường học?')) {
      this.isLoadingTree.set(true);
      this.documentService.initSampleTree(this.academicYearService.currentAcademicYear()).subscribe({
        next: () => {
          this.loadTreeAndSelectDefault();
        },
      });
    }
  }

  // File Upload & Dropzone
  openUploadModal() {
    this.pendingFiles = [];
    this.uploadProgress.set(0);
    this.isUploading.set(false);
    this.showUploadModal.set(true);
  }

  closeUploadModal() {
    this.showUploadModal.set(false);
    this.pendingFiles = [];
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = true;
  }

  onFileDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = false;
    if (e.dataTransfer?.files) {
      const files = Array.from(e.dataTransfer.files);
      this.pendingFiles.push(...files);
    }
  }

  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.pendingFiles.push(...files);
    }
  }

  removePendingFile(index: number) {
    this.pendingFiles.splice(index, 1);
  }

  submitUploadFiles() {
    const folder = this.selectedFolder();
    if (!folder || this.pendingFiles.length === 0) return;

    this.isUploading.set(true);
    this.documentService.uploadFilesWithProgress(folder.id, this.pendingFiles).subscribe({
      next: (event) => {
        this.uploadProgress.set(event.progress);
        if (event.completed) {
          this.isUploading.set(false);
          this.closeUploadModal();
          this.loadFilesForFolder(folder.id);
          this.loadTreeAndSelectDefault(); // Refresh counts
        }
      },
      error: () => {
        this.isUploading.set(false);
      },
    });
  }

  // File Actions
  previewFile(file: DocumentFile) {
    this.previewModalFile.set(file);
  }

  confirmDeleteFile(file: DocumentFile) {
    if (confirm(`Bạn có chắc chắn muốn xóa tệp tin "${file.originalName || file.fileName}"?`)) {
      this.documentService.deleteFile(file.id).subscribe({
        next: () => {
          if (this.selectedFolder()) {
            this.loadFilesForFolder(this.selectedFolder()!.id);
          }
        },
      });
    }
  }

  // Helpers
  private flattenTree(nodes: DocumentFolder[]): DocumentFolder[] {
    const result: DocumentFolder[] = [];
    const traverse = (items: DocumentFolder[]) => {
      for (const item of items) {
        result.push(item);
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(nodes);
    return result;
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileTypeClass(mimeType: string): string {
    if (!mimeType) return 'type-other';
    if (mimeType.includes('pdf')) return 'type-pdf';
    if (mimeType.startsWith('image/')) return 'type-img';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'type-word';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'type-excel';
    return 'type-other';
  }

  getFileTypeIcon(mimeType: string): string {
    if (!mimeType) return 'draft';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'table_view';
    return 'attach_file';
  }

  getFileTypeName(mimeType: string): string {
    if (!mimeType) return 'Tệp tin';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.startsWith('image/')) return 'Hình ảnh';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Word';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Excel';
    return 'Tài liệu';
  }
}
