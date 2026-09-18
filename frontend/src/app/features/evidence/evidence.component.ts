import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AttachmentService } from '../../core/services/attachment.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { LocationItem, OrgUnitItem } from '../../core/models/user.models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-evidence',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PaginationComponent],
  template: `
    <div class="evidence-container">
      <!-- HEADER -->
      <div class="page-header">
        <div class="header-titles">
          <div class="header-tag">
            <span class="material-symbols-outlined tag-icon">verified</span>
            <span>Kho Minh Chứng Số</span>
            <span class="year-badge">Năm học: {{ academicYearService.currentAcademicYear() }}</span>
          </div>
          <h1 class="page-title">Kho Minh Chứng & Hồ Sơ Nghiệm Thu ({{ academicYearService.currentAcademicYear() }})</h1>
          <p class="page-subtitle">
            Trung tâm tra cứu, giám sát và khai thác tập trung các tài liệu, biên bản nghiệm thu, hình ảnh minh chứng kết quả thực hiện công việc và KPI toàn trường.
          </p>
        </div>
      </div>

      <!-- FILTER TOOLBAR -->
      <div class="filter-card">
        <div class="filter-grid">
          <!-- Search input -->
          <div class="filter-field search-field">
            <label class="field-label">Tìm kiếm minh chứng</label>
            <div class="search-input-wrapper">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                class="form-control"
                placeholder="Nhập tên tệp, tên công việc, người cập nhật..."
                [(ngModel)]="searchQuery"
                (keyup.enter)="applyFilter()"
              />
              @if (searchQuery) {
                <button type="button" class="btn-clear-search" (click)="clearSearch()">
                  <span class="material-symbols-outlined">close</span>
                </button>
              }
            </div>
          </div>

          <!-- File Type Filter -->
          <div class="filter-field">
            <label class="field-label">Loại tài liệu</label>
            <select class="form-select" [(ngModel)]="selectedMimeType" (change)="applyFilter()">
              <option value="ALL">Tất cả định dạng</option>
              <option value="PDF">Tài liệu PDF (.pdf)</option>
              <option value="IMAGE">Hình ảnh (.jpg, .png, .webp)</option>
              <option value="WORD">Văn bản Word (.doc, .docx)</option>
              <option value="EXCEL">Bảng tính Excel (.xls, .xlsx)</option>
            </select>
          </div>

          <!-- Location Filter -->
          <div class="filter-field">
            <label class="field-label">Điểm trường</label>
            <select class="form-select" [(ngModel)]="selectedLocationId" (change)="applyFilter()">
              <option value="">Toàn bộ điểm trường</option>
              @for (loc of locations(); track loc.id) {
                <option [value]="loc.id">{{ loc.name }}</option>
              }
            </select>
          </div>

          <!-- Org Unit Filter -->
          <div class="filter-field">
            <label class="field-label">Tổ / Bộ phận</label>
            <select class="form-select" [(ngModel)]="selectedOrgUnitId" (change)="applyFilter()">
              <option value="">Toàn bộ tổ / bộ phận</option>
              @for (unit of orgUnits(); track unit.id) {
                <option [value]="unit.id">{{ unit.name }}</option>
              }
            </select>
          </div>
        </div>

        <div class="filter-actions">
          <button type="button" class="btn btn-primary" (click)="applyFilter()">
            <span class="material-symbols-outlined">filter_alt</span>
            <span>Áp dụng bộ lọc</span>
          </button>
          <button type="button" class="btn btn-secondary" (click)="resetFilters()">
            <span class="material-symbols-outlined">restart_alt</span>
            <span>Đặt lại</span>
          </button>
          <span class="filter-summary-text">
            Tìm thấy <strong>{{ totalItems() }}</strong> tệp minh chứng
          </span>
        </div>
      </div>

      <!-- EVIDENCE DATA TABLE (REORGANIZED AS TABLE VIEW) -->
      @if (isLoading()) {
        <div class="loading-box">
          <span class="material-symbols-outlined spinner-icon">progress_activity</span>
          <span>Đang tải danh mục minh chứng...</span>
        </div>
      } @else if (evidenceList().length === 0) {
        <div class="empty-box">
          <span class="material-symbols-outlined empty-icon">folder_off</span>
          <h3>Không tìm thấy tệp minh chứng nào</h3>
          <p>Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc phía trên.</p>
        </div>
      } @else {
        <div class="table-card">
          <div class="table-responsive">
            <table class="evidence-table">
              <thead>
                <tr>
                  <th class="col-file">Tên tệp tin & Định dạng</th>
                  <th class="col-task">Công việc liên quan</th>
                  <th class="col-scope">Điểm trường & Tổ phụ trách</th>
                  <th class="col-uploader">Người cập nhật</th>
                  <th class="col-date">Thời gian</th>
                  <th class="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (item of evidenceList(); track item.id) {
                  <tr>
                    <!-- 1. File Info -->
                    <td class="col-file">
                      <div class="file-cell">
                        <div class="file-icon-box" [ngClass]="getFileTypeClass(item.mimeType)">
                          <span class="material-symbols-outlined">{{ getFileTypeIcon(item.mimeType) }}</span>
                        </div>
                        <div class="file-info-text">
                          <span class="file-name-title" [title]="getDisplayFileName(item.originalName || item.fileName)">
                            {{ getDisplayFileName(item.originalName || item.fileName) }}
                          </span>
                          <div class="file-sub-meta">
                            <span class="file-size-badge">{{ formatFileSize(item.fileSize) }}</span>
                            <span class="file-format-badge" [ngClass]="getFileTypeClass(item.mimeType)">
                              {{ getFileTypeName(item.mimeType) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- 2. Linked Task -->
                    <td class="col-task">
                      @if (item.task) {
                        <div class="task-info-box">
                          <a [routerLink]="['/tasks', item.task.id]" class="task-link" [title]="item.task.title">
                            @if (item.task.code) {
                              <span class="task-code-pill">#{{ item.task.code }}</span>
                            }
                            <span class="task-title-text">{{ item.task.title }}</span>
                          </a>
                        </div>
                      } @else {
                        <span class="text-muted">Tài liệu độc lập</span>
                      }
                    </td>

                    <!-- 3. Scope / Location & Org Unit -->
                    <td class="col-scope">
                      <div class="scope-badges">
                        @if (item.locationName || getLocationName(item.task?.locationId)) {
                          <span class="badge-location">
                            <span class="material-symbols-outlined badge-icon">location_on</span>
                            {{ item.locationName || getLocationName(item.task?.locationId) }}
                          </span>
                        }
                        @if (item.orgUnitName || getOrgUnitName(item.task?.orgUnitId)) {
                          <span class="badge-org">
                            <span class="material-symbols-outlined badge-icon">groups</span>
                            {{ item.orgUnitName || getOrgUnitName(item.task?.orgUnitId) }}
                          </span>
                        }
                      </div>
                    </td>

                    <!-- 4. Uploader -->
                    <td class="col-uploader">
                      <div class="uploader-cell">
                        <img
                          [src]="item.uploadedBy?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (item.uploadedBy?.fullName || 'User')"
                          class="uploader-avatar"
                          alt="Avatar"
                        />
                        <div class="uploader-meta">
                          <span class="uploader-name">{{ item.uploadedBy?.fullName || 'Người dùng' }}</span>
                          @if (item.uploadedBy?.phone) {
                            <a [href]="'tel:' + item.uploadedBy.phone" class="btn-phone" title="Gọi điện cho người cập nhật">
                              <span class="material-symbols-outlined">call</span>
                              <span>{{ item.uploadedBy.phone }}</span>
                            </a>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- 5. Created Date -->
                    <td class="col-date">
                      <span class="date-text">{{ item.createdAt | date:'dd/MM/yyyy' }}</span>
                      <span class="time-text">{{ item.createdAt | date:'HH:mm' }}</span>
                    </td>

                    <!-- 6. Actions -->
                    <td class="col-actions">
                      <div class="action-buttons">
                        <button
                          type="button"
                          class="btn-act btn-view"
                          (click)="previewEvidence(item)"
                          title="Xem tài liệu"
                        >
                          <span class="material-symbols-outlined">visibility</span>
                          <span>Xem</span>
                        </button>
                        <a
                          [href]="item.fileUrl"
                          [download]="getDisplayFileName(item.originalName || item.fileName)"
                          target="_blank"
                          class="btn-act btn-download"
                          title="Tải xuống tệp tin"
                        >
                          <span class="material-symbols-outlined">download</span>
                          <span>Tải về</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- PAGINATION -->
          @if (totalPages() > 1 || totalItems() > 0) {
            <div class="pagination-footer">
              <app-pagination
                [currentPage]="currentPage()"
                [totalItems]="totalItems()"
                [pageSize]="pageSize()"
                itemName="minh chứng"
                (pageChange)="onPageChange($event)"
              ></app-pagination>
            </div>
          }
        </div>
      }

      <!-- PREVIEW MODAL -->
      @if (previewItem()) {
        <div class="modal-overlay" (click)="previewItem.set(null)">
          <div class="modal-preview-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <span class="material-symbols-outlined modal-icon">{{ getFileTypeIcon(previewItem()!.mimeType) }}</span>
                <h3 class="modal-title">{{ getDisplayFileName(previewItem()!.originalName || previewItem()!.fileName) }}</h3>
              </div>
              <div class="modal-actions">
                <a
                  [href]="previewItem()!.fileUrl"
                  [download]="getDisplayFileName(previewItem()!.originalName || previewItem()!.fileName)"
                  target="_blank"
                  class="btn btn-sm btn-primary"
                >
                  <span class="material-symbols-outlined">download</span>
                  <span>Tải về</span>
                </a>
                <button type="button" class="btn-close-modal" (click)="previewItem.set(null)">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div class="modal-body">
              @if (previewItem()!.mimeType.includes('pdf')) {
                <iframe [src]="previewItem()!.fileUrl" class="preview-frame" title="Xem trước minh chứng"></iframe>
              } @else if (previewItem()!.mimeType.startsWith('image/')) {
                <div class="img-wrap">
                  <img [src]="previewItem()!.fileUrl" class="preview-img" alt="Minh chứng" />
                </div>
              } @else {
                <div class="other-format-box">
                  <span class="material-symbols-outlined large-doc-icon">{{ getFileTypeIcon(previewItem()!.mimeType) }}</span>
                  <h4>{{ getDisplayFileName(previewItem()!.originalName || previewItem()!.fileName) }}</h4>
                  <p>Văn bản Microsoft Office (.docx, .xlsx). Vui lòng tải về máy để xem nội dung đầy đủ nhất.</p>
                  <a
                    [href]="previewItem()!.fileUrl"
                    [download]="getDisplayFileName(previewItem()!.originalName || previewItem()!.fileName)"
                    class="btn btn-primary"
                  >
                    <span class="material-symbols-outlined">download</span>
                    <span>Tải về máy ngay</span>
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
    .evidence-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 40px;
    }
    .page-header {
      background: white;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
      margin-bottom: 8px;
      width: fit-content;
    }
    .year-badge {
      background: #dbeafe;
      color: #1e40af;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      margin-left: 6px;
    }
    .tag-icon { font-size: 16px; }
    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .page-subtitle {
      color: #64748b;
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }

    /* FILTER CARD */
    .filter-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .filter-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 1024px) {
      .filter-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 640px) {
      .filter-grid { grid-template-columns: 1fr; }
    }
    .search-field { grid-column: span 1; }
    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field-label {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }
    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      color: #94a3b8;
      font-size: 20px;
      pointer-events: none;
    }
    .search-input-wrapper input {
      padding-left: 38px;
      padding-right: 32px;
      width: 100%;
      height: 40px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      color: #0f172a;
      &:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
    }
    .btn-clear-search {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
    .form-select {
      height: 40px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0 12px;
      font-size: 14px;
      background: white;
      color: #0f172a;
      &:focus {
        outline: none;
        border-color: #2563eb;
      }
    }
    .filter-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      border-top: 1px solid #f1f5f9;
      padding-top: 14px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .btn-primary { background: #2563eb; color: white; &:hover { background: #1d4ed8; } }
    .btn-secondary { background: #f1f5f9; color: #475569; &:hover { background: #e2e8f0; } }
    .filter-summary-text {
      margin-left: auto;
      font-size: 13px;
      color: #64748b;
    }

    /* TABLE CARD */
    .table-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .table-responsive {
      overflow-x: auto;
    }
    .evidence-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    .evidence-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .evidence-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #1e293b;
    }
    .evidence-table tr:hover td {
      background: #f8fafc;
    }

    /* Columns */
    .col-file { min-width: 280px; }
    .col-task { min-width: 240px; }
    .col-scope { min-width: 180px; }
    .col-uploader { min-width: 180px; }
    .col-date { min-width: 120px; }
    .col-actions { min-width: 170px; text-align: right; }

    /* 1. File Cell */
    .file-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .file-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      span { font-size: 20px; }
    }
    .file-info-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      overflow: hidden;
    }
    .file-name-title {
      font-weight: 600;
      color: #0f172a;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .file-sub-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }
    .file-size-badge {
      color: #64748b;
    }
    .file-format-badge {
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
    }

    .type-pdf { background: #fee2e2; color: #b91c1c; }
    .type-word { background: #e0e7ff; color: #3730a3; }
    .type-excel { background: #dcfce7; color: #15803d; }
    .type-img { background: #f3e8ff; color: #6b21a8; }
    .type-other { background: #f1f5f9; color: #475569; }

    /* 2. Task Cell */
    .task-info-box {
      display: flex;
      align-items: center;
    }
    .task-link {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      line-height: 1.4;
      &:hover {
        text-decoration: underline;
        color: #1d4ed8;
      }
    }
    .task-code-pill {
      background: #eff6ff;
      color: #1d4ed8;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .task-title-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .text-muted { color: #94a3b8; font-style: italic; }

    /* 3. Scope Badges */
    .scope-badges {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .badge-location, .badge-org {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
      width: fit-content;
    }
    .badge-location { background: #f1f5f9; color: #334155; }
    .badge-org { background: #f0fdf4; color: #166534; }
    .badge-icon { font-size: 14px; }

    /* 4. Uploader Cell */
    .uploader-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .uploader-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid #cbd5e1;
    }
    .uploader-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .uploader-name {
      font-weight: 600;
      color: #0f172a;
    }
    .btn-phone {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #2563eb;
      text-decoration: none;
      &:hover { text-decoration: underline; }
      span.material-symbols-outlined { font-size: 13px; }
    }

    /* 5. Date Cell */
    .col-date {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .date-text { font-weight: 500; color: #334155; }
    .time-text { font-size: 11px; color: #94a3b8; }

    /* 6. Action Buttons */
    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }
    .btn-act {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      border: 1px solid #cbd5e1;
      background: white;
      color: #334155;
      transition: all 0.15s;
      span.material-symbols-outlined { font-size: 16px; }
    }
    .btn-view:hover {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #93c5fd;
    }
    .btn-download:hover {
      background: #f0fdf4;
      color: #166534;
      border-color: #86efac;
    }

    .pagination-footer {
      padding: 16px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .loading-box, .empty-box {
      background: white;
      border-radius: 12px;
      padding: 48px 24px;
      text-align: center;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .spinner-icon {
      font-size: 36px;
      color: #2563eb;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .empty-icon {
      font-size: 48px;
      color: #94a3b8;
    }

    /* PREVIEW MODAL */
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
    .modal-preview-card {
      background: white;
      border-radius: 14px;
      width: 850px;
      height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }
    .modal-header {
      padding: 14px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
    }
    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .modal-icon { font-size: 20px; color: #2563eb; }
    .modal-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
    .modal-actions { display: flex; align-items: center; gap: 8px; }
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
      flex: 1;
      padding: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
    }
    .preview-frame { width: 100%; height: 100%; border: none; }
    .img-wrap { padding: 20px; max-width: 100%; max-height: 100%; display: flex; align-items: center; justify-content: center; }
    .preview-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
    .other-format-box {
      background: white;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      max-width: 480px;
    }
    .large-doc-icon { font-size: 64px; color: #2563eb; }
  `]
})
export class EvidenceComponent implements OnInit, OnDestroy {
  private attachmentService = inject(AttachmentService);
  private userService = inject(UserService);
  public authService = inject(AuthService);
  public academicYearService = inject(AcademicYearService);
  private yearSub?: Subscription;

  // Signals
  isLoading = signal<boolean>(false);
  evidenceList = signal<any[]>([]);
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  locations = signal<LocationItem[]>([]);
  orgUnits = signal<OrgUnitItem[]>([]);

  // Filter models
  searchQuery: string = '';
  selectedMimeType: string = 'ALL';
  selectedLocationId: string = '';
  selectedOrgUnitId: string = '';

  previewItem = signal<any | null>(null);

  ngOnInit() {
    this.loadMetadata();
    this.loadEvidence();

    this.yearSub = this.academicYearService.yearChanged$.subscribe(() => {
      this.currentPage.set(1);
      this.loadEvidence();
    });
  }

  ngOnDestroy() {
    if (this.yearSub) {
      this.yearSub.unsubscribe();
    }
  }

  loadMetadata() {
    this.userService.getLocations().subscribe({
      next: (locs) => this.locations.set(locs),
      error: () => {},
    });
    this.userService.getOrgUnits().subscribe({
      next: (units) => this.orgUnits.set(units),
      error: () => {},
    });
  }

  getDisplayFileName(name: string | undefined): string {
    if (!name) return 'Tệp minh chứng';
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

  loadEvidence() {
    this.isLoading.set(true);
    this.attachmentService
      .getEvidenceRepository({
        search: this.searchQuery,
        mimeType: this.selectedMimeType,
        locationId: this.selectedLocationId,
        orgUnitId: this.selectedOrgUnitId,
        page: this.currentPage(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          const rawItems = res?.items || [];
          const sanitizedItems = rawItems.map((item: any) => ({
            ...item,
            originalName: this.getDisplayFileName(item.originalName || item.fileName),
            fileName: this.getDisplayFileName(item.fileName || item.originalName),
          }));
          this.evidenceList.set(sanitizedItems);
          this.totalItems.set(res?.pagination?.total || 0);
          this.totalPages.set(res?.pagination?.totalPages || 1);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  applyFilter() {
    this.currentPage.set(1);
    this.loadEvidence();
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyFilter();
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedMimeType = 'ALL';
    this.selectedLocationId = '';
    this.selectedOrgUnitId = '';
    this.applyFilter();
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadEvidence();
  }

  previewEvidence(item: any) {
    this.previewItem.set(item);
  }

  getLocationName(locationId?: string): string {
    if (!locationId) return '';
    const loc = this.locations().find((l) => l.id === locationId);
    return loc ? loc.name : '';
  }

  getOrgUnitName(orgUnitId?: string): string {
    if (!orgUnitId) return '';
    const org = this.orgUnits().find((o) => o.id === orgUnitId);
    return org ? org.name : '';
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
