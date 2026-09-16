import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { KpiFlexibleService } from '../../core/services/kpi-flexible.service';
import { EvaluationPeriod, TaskAssignmentLogItem, KpiAxis } from '../../core/models/kpi-flexible.models';

@Component({
  selector: 'app-kpi-assignment-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="assignment-log-container">
      <!-- Special Guidance Banner -->
      <div class="guidance-banner">
        <div class="banner-icon">
          <i class="bi bi-info-circle-fill"></i>
        </div>
        <div class="banner-content">
          <h4>Quy chế Giao việc & Phân công trách nhiệm Lãnh đạo</h4>
          <p>
            Các nội dung như <strong>quản lý dạy thêm, bán trú, giữ trẻ, tăng cường</strong> thuộc phạm vi KTTC/Quản lý chung do Hiệu trưởng phân công cho các Phó Hiệu trưởng hoặc bộ phận phụ trách được ghi nhận tại đây để <strong>lưu vết phân công công tác</strong>.
            <br />
            <span class="highlight-text">★ Lưu ý nghiệp vụ:</span> Các nội dung này <strong>KHÔNG tạo thành nhiệm vụ KPI cá nhân</strong> và <strong>KHÔNG tính điểm trực tiếp vào bảng điểm 70 điểm</strong> (đã được đánh giá ở cấp thẩm quyền quản lý), tránh tính điểm trùng lặp.
          </p>
        </div>
      </div>

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <h2>Sổ Nhật ký Giao việc & Phân công nhiệm vụ</h2>
          <p class="subtitle">Lưu vết và theo dõi tiến độ các mảng công tác được Hiệu trưởng giao trách nhiệm trong kỳ</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openCreateModal()">
            <i class="bi bi-plus-lg"></i> Tạo phân công mới
          </button>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-item">
          <label>Kỳ đánh giá:</label>
          <select [(ngModel)]="selectedPeriodId" (change)="loadLogs()" class="form-control">
            <option value="">Tất cả các kỳ</option>
            <option *ngFor="let p of periods()" [value]="p.id">{{ p.name }} ({{ p.schoolYear }})</option>
          </select>
        </div>
      </div>

      <!-- Assignment Logs List -->
      <div class="logs-grid" *ngIf="logs().length > 0; else emptyTpl">
        <div class="log-card" *ngFor="let item of logs()">
          <div class="card-top">
            <div class="axis-tag" *ngIf="item.relatedAxis">
              <i class="bi bi-tag-fill"></i> Mảng: {{ item.relatedAxis.name }}
            </div>
            <div class="date-tag">{{ item.createdAt | date: 'dd/MM/yyyy HH:mm' }}</div>
          </div>

          <h3 class="log-title">{{ item.title }}</h3>
          <p class="log-desc" *ngIf="item.description">{{ item.description }}</p>

          <div class="assignment-meta">
            <div class="meta-row">
              <span class="meta-label">Người giao việc:</span>
              <span class="meta-val">
                <i class="bi bi-person-badge-fill text-primary"></i>
                <strong>{{ item.assignedBy?.fullName }}</strong> ({{ item.assignedBy?.title || 'Hiệu trưởng' }})
              </span>
            </div>

            <div class="meta-row">
              <span class="meta-label">Đơn vị / Cá nhân nhận:</span>
              <span class="meta-val">
                <i class="bi bi-person-check-fill text-success"></i>
                <strong *ngIf="item.assignedTo">{{ item.assignedTo.fullName }} ({{ item.assignedTo.title }})</strong>
                <strong *ngIf="!item.assignedTo && item.assignedDepartment">{{ item.assignedDepartment }}</strong>
              </span>
            </div>

            <div class="meta-row" *ngIf="item.orgUnit">
              <span class="meta-label">Bộ phận liên quan:</span>
              <span class="meta-val">{{ item.orgUnit.name }}</span>
            </div>
          </div>

          <div class="card-bottom">
            <div class="note-box" *ngIf="item.note">
              <i class="bi bi-chat-left-text"></i> {{ item.note }}
            </div>
            <button class="btn btn-sm btn-danger-outline" (click)="deleteLog(item)">
              <i class="bi bi-trash"></i> Xóa
            </button>
          </div>
        </div>
      </div>

      <ng-template #emptyTpl>
        <div class="empty-state">
          <i class="bi bi-journal-check empty-icon"></i>
          <p>Chưa có bản ghi phân công giao việc nào trong kỳ này.</p>
          <button class="btn btn-sm btn-primary" (click)="openCreateModal()">Tạo phân công ngay</button>
        </div>
      </ng-template>

      <!-- Modal Create Assignment Log -->
      <div class="modal-backdrop" *ngIf="showModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Tạo Bản ghi Giao việc / Phân công trách nhiệm</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Kỳ đánh giá <span class="req">*</span></label>
              <select [(ngModel)]="formModel.periodId" class="form-control">
                <option *ngFor="let p of periods()" [value]="p.id">{{ p.name }} ({{ p.schoolYear }})</option>
              </select>
            </div>

            <div class="form-group">
              <label>Tiêu đề nội dung giao việc <span class="req">*</span></label>
              <input
                type="text"
                [(ngModel)]="formModel.title"
                placeholder="vd: Điều hành và quản lý bếp ăn bán trú học kỳ 1..."
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label>Mô tả chi tiết / Yêu cầu công việc</label>
              <textarea
                [(ngModel)]="formModel.description"
                rows="3"
                placeholder="Nêu rõ phạm vi, mục tiêu, quyền hạn và chế độ báo cáo..."
                class="form-control"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label>Phân công cho Cá nhân</label>
                <select [(ngModel)]="formModel.assignedToId" class="form-control">
                  <option value="">-- Giao theo Bộ phận --</option>
                  <option *ngFor="let u of staffUsers()" [value]="u.id">{{ u.fullName }} ({{ u.title || 'Cán bộ' }})</option>
                </select>
              </div>

              <div class="form-group col">
                <label>Hoặc Giao theo Bộ phận / Điểm trường</label>
                <input
                  type="text"
                  [(ngModel)]="formModel.assignedDepartment"
                  placeholder="vd: Ban Bán trú / Phân hiệu 1"
                  class="form-control"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label>Mảng công tác liên quan</label>
                <select [(ngModel)]="formModel.relatedAxisId" class="form-control">
                  <option value="">-- Chọn mảng tham chiếu --</option>
                  <option *ngFor="let a of axes()" [value]="a.id">{{ a.name }} ({{ a.code }})</option>
                </select>
              </div>

              <div class="form-group col">
                <label>Ghi chú phân công</label>
                <input
                  type="text"
                  [(ngModel)]="formModel.note"
                  placeholder="vd: Lưu vết phân công, không tính KPI cá nhân"
                  class="form-control"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Hủy</button>
            <button class="btn btn-primary" (click)="saveAssignmentLog()">Lưu bản ghi phân công</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .assignment-log-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .guidance-banner {
      display: flex;
      gap: 16px;
      background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
      border: 1px solid #bfdbfe;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.05);
    }

    .banner-icon {
      font-size: 26px;
      color: #2563eb;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .banner-content h4 {
      font-size: 15px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 0 0 6px 0;
    }

    .banner-content p {
      font-size: 13px;
      color: #334155;
      line-height: 1.6;
      margin: 0;
    }

    .highlight-text {
      font-weight: 700;
      color: #b91c1c;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    h2 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .subtitle {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
    }

    .filter-bar {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 18px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }

    .logs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 20px;
    }

    .log-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: 0.2s;
    }

    .log-card:hover {
      border-color: #cbd5e1;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .axis-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      background: #f1f5f9;
      color: #475569;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .date-tag {
      font-size: 11.5px;
      color: #94a3b8;
    }

    .log-title {
      font-size: 15.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
      line-height: 1.4;
    }

    .log-desc {
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
      margin: 0 0 14px 0;
    }

    .assignment-meta {
      background: #f8fafc;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
      font-size: 12.5px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .meta-label {
      color: #64748b;
      font-weight: 600;
      white-space: nowrap;
    }

    .meta-val {
      color: #1e293b;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-align: right;
    }

    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }

    .note-box {
      font-size: 11.5px;
      color: #64748b;
      font-style: italic;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: 0.2s;
    }

    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #e2e8f0; color: #334155; }
    .btn-danger-outline { background: transparent; border: 1px solid #fca5a5; color: #dc2626; }
    .btn-danger-outline:hover { background: #fee2e2; }
    .btn-sm { padding: 4px 10px; font-size: 12px; }

    .empty-state {
      padding: 60px;
      text-align: center;
      background: white;
      border-radius: 16px;
      border: 1px dashed #cbd5e1;
      color: #64748b;
    }

    .empty-icon {
      font-size: 40px;
      color: #94a3b8;
      margin-bottom: 12px;
      display: block;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-card {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      animation: modalIn 0.25s ease-out;
    }

    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 {
      font-size: 17px;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 24px;
      color: #64748b;
      cursor: pointer;
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 75vh;
      overflow-y: auto;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .form-row .col {
      flex: 1;
    }

    .form-group label {
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
    }

    .req { color: #e11d48; }

    .form-control {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      outline: none;
    }

    .form-control:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #f8fafc;
    }
  `],
})
export class KpiAssignmentLogComponent implements OnInit {
  private kpiService = inject(KpiFlexibleService);
  private http = inject(HttpClient);

  periods = signal<EvaluationPeriod[]>([]);
  axes = signal<KpiAxis[]>([]);
  staffUsers = signal<any[]>([]);
  logs = signal<TaskAssignmentLogItem[]>([]);
  showModal = signal<boolean>(false);

  selectedPeriodId = '';

  formModel: any = {
    periodId: '',
    title: '',
    description: '',
    assignedToId: '',
    assignedDepartment: '',
    relatedAxisId: '',
    note: '',
  };

  ngOnInit() {
    this.loadInitData();
  }

  loadInitData() {
    this.kpiService.getPeriods().subscribe((periods) => {
      this.periods.set(periods);
      if (periods.length > 0) {
        this.selectedPeriodId = periods[0].id;
        this.formModel.periodId = periods[0].id;
      }
      this.loadLogs();
    });

    this.kpiService.getAxes().subscribe((axes) => this.axes.set(axes));

    this.http.get<{ success: boolean; data: any[] }>('/api/users').subscribe((res) => {
      this.staffUsers.set(res.data || []);
    });
  }

  loadLogs() {
    this.kpiService.getAssignmentLogs(this.selectedPeriodId || undefined).subscribe({
      next: (logs) => this.logs.set(logs),
      error: (err) => console.error('Lỗi tải nhật ký giao việc:', err),
    });
  }

  openCreateModal() {
    this.formModel = {
      periodId: this.selectedPeriodId || (this.periods()[0]?.id || ''),
      title: '',
      description: '',
      assignedToId: '',
      assignedDepartment: '',
      relatedAxisId: '',
      note: 'Lưu vết phân công trách nhiệm BGH (Không gắn KPI cá nhân)',
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveAssignmentLog() {
    if (!this.formModel.title || !this.formModel.periodId) {
      alert('Vui lòng nhập đầy đủ tiêu đề và kỳ đánh giá!');
      return;
    }

    this.kpiService.createAssignmentLog(this.formModel).subscribe({
      next: () => {
        this.closeModal();
        this.loadLogs();
      },
      error: (err) => alert(`Lỗi tạo phân công: ${err.error?.message || err.message}`),
    });
  }

  deleteLog(item: TaskAssignmentLogItem) {
    if (!confirm(`Bạn có chắc muốn xóa bản ghi phân công "${item.title}"?`)) return;

    this.kpiService.deleteAssignmentLog(item.id).subscribe({
      next: () => this.loadLogs(),
      error: (err) => alert(`Lỗi xóa: ${err.message}`),
    });
  }
}
