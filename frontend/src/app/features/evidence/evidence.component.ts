import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AttachmentService } from '../../core/services/attachment.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
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
            <span class="material-symbols-outlined tag-icon">folder_shared</span>
            <span>Kho Minh Chứng Số</span>
          </div>
          <h1 class="page-title">Kho Minh Chứng & Tài Liệu Hoạt Động</h1>
          <p class="page-subtitle">
            Trung tâm lưu trữ, tra cứu và khai thác tập trung các tài liệu, biên bản, hình ảnh, minh chứng kết quả công việc và KPI toàn trường.
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
                placeholder="Nhập tên tệp, tên công việc..."
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

      <!-- EVIDENCE GRID -->
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
        <div class="evidence-grid">
          @for (item of evidenceList(); track item.id) {
            <div class="evidence-card">
              <div class="card-type-icon" [ngClass]="getFileTypeClass(item.mimeType)">
                <span class="material-symbols-outlined">{{ getFileTypeIcon(item.mimeType) }}</span>
              </div>

              <div class="card-body">
                <h3 class="file-name" [title]="item.originalName || item.fileName">
                  {{ item.originalName || item.fileName }}
                </h3>
                <div class="file-size-tag">{{ formatFileSize(item.fileSize) }} • {{ getFileTypeName(item.mimeType) }}</div>

                @if (item.task) {
                  <div class="task-link-box">
                    <span class="material-symbols-outlined task-icon">assignment</span>
                    <a [routerLink]="['/tasks', item.task.id]" class="task-title-link" [title]="item.task.title">
                      @if (item.task.code) {
                        <span class="task-code">#{{ item.task.code }}</span>
                      }
                      {{ item.task.title }}
                    </a>
                  </div>
                }

                <div class="uploader-info">
                  <div class="uploader-left">
                    <img
                      [src]="item.uploadedBy?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (item.uploadedBy?.fullName || 'User')"
                      class="uploader-avatar"
                      alt="Avatar"
                    />
                    <div class="uploader-details">
                      <span class="uploader-name">{{ item.uploadedBy?.fullName || 'Người dùng' }}</span>
                      <span class="upload-time">{{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>

                  @if (item.uploadedBy?.phone) {
                    <a [href]="'tel:' + item.uploadedBy.phone" class="btn-call tap-target" title="Gọi điện cho người cập nhật">
                      <span class="material-symbols-outlined">call</span>
                    </a>
                  }
                </div>
              </div>

              <div class="card-footer">
                <a [href]="item.fileUrl" target="_blank" class="btn-action btn-view" title="Xem trước tài liệu">
                  <span class="material-symbols-outlined">visibility</span>
                  <span>Xem tài liệu</span>
                </a>
                <a [href]="item.fileUrl" [download]="item.originalName || item.fileName" class="btn-action btn-download" title="Tải xuống tệp">
                  <span class="material-symbols-outlined">download</span>
                  <span>Tải về</span>
                </a>
              </div>
            </div>
          }
        </div>

        <!-- PAGINATION -->
        @if (totalPages() > 1) {
          <div class="pagination-wrapper">
            <app-pagination
              [currentPage]="currentPage()"
              [totalItems]="totalItems()"
              [pageSize]="pageSize()"
              itemName="minh chứng"
              (pageChange)="onPageChange($event)"
            ></app-pagination>
          </div>
        }
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
    .filter-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 16px;
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
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #f1f5f9; color: #475569; }
    .btn-secondary:hover { background: #e2e8f0; }
    .filter-summary-text {
      margin-left: auto;
      font-size: 13px;
      color: #64748b;
    }
    .loading-box, .empty-box {
      background: white;
      border-radius: 12px;
      padding: 48px 24px;
      text-align: center;
      border: 1px solid #e2e8f0;
      color: #64748b;
    }
    .spinner-icon {
      font-size: 36px;
      animation: spin 1s linear infinite;
      color: #2563eb;
      margin-bottom: 12px;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    .empty-icon {
      font-size: 48px;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .evidence-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .evidence-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.07);
    }
    .card-type-icon {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .card-type-icon span { font-size: 32px; }
    .type-pdf { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    .type-img { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .type-word { background: linear-gradient(135deg, #2563eb, #1e40af); }
    .type-excel { background: linear-gradient(135deg, #10b981, #047857); }
    .type-other { background: linear-gradient(135deg, #64748b, #334155); }

    .card-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }
    .file-name {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-size-tag {
      font-size: 12px;
      color: #64748b;
    }
    .task-link-box {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #f1f5f9;
    }
    .task-icon { font-size: 16px; color: #2563eb; flex-shrink: 0; }
    .task-title-link {
      font-size: 13px;
      color: #1e293b;
      text-decoration: none;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .task-title-link:hover { color: #2563eb; text-decoration: underline; }
    .task-code {
      color: #64748b;
      font-size: 12px;
      margin-right: 4px;
    }
    .uploader-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px dashed #e2e8f0;
    }
    .uploader-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .uploader-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
    }
    .uploader-details {
      display: flex;
      flex-direction: column;
    }
    .uploader-name {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
    .upload-time {
      font-size: 11px;
      color: #94a3b8;
    }
    .btn-call {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #f0fdf4;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn-call:hover { background: #dcfce7; }
    .btn-call span { font-size: 16px; }

    .card-footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-top: 1px solid #e2e8f0;
    }
    .btn-action {
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn-view {
      color: #2563eb;
      background: #eff6ff;
      border-right: 1px solid #e2e8f0;
    }
    .btn-view:hover { background: #dbeafe; }
    .btn-download {
      color: #475569;
      background: #f8fafc;
    }
    .btn-download:hover { background: #f1f5f9; }
    .btn-action span.material-symbols-outlined { font-size: 18px; }
  `]
})
export class EvidenceComponent implements OnInit {
  private attachmentService = inject(AttachmentService);
  private userService = inject(UserService);
  public authService = inject(AuthService);

  // Signals
  isLoading = signal<boolean>(false);
  evidenceList = signal<any[]>([]);
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(12);

  locations = signal<LocationItem[]>([]);
  orgUnits = signal<OrgUnitItem[]>([]);

  // Filter models
  searchQuery: string = '';
  selectedMimeType: string = 'ALL';
  selectedLocationId: string = '';
  selectedOrgUnitId: string = '';

  ngOnInit() {
    this.loadMetadata();
    this.loadEvidence();
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
          this.evidenceList.set(res.items || []);
          this.totalItems.set(res.pagination?.total || 0);
          this.totalPages.set(res.pagination?.totalPages || 1);
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
    if (mimeType.includes('word')) return 'type-word';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'type-excel';
    return 'type-other';
  }

  getFileTypeIcon(mimeType: string): string {
    if (!mimeType) return 'draft';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('word')) return 'description';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'table_view';
    return 'attach_file';
  }

  getFileTypeName(mimeType: string): string {
    if (!mimeType) return 'Tệp tin';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.startsWith('image/')) return 'Hình ảnh';
    if (mimeType.includes('word')) return 'Word DOCX';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Excel XLSX';
    return 'Tài liệu';
  }
}
