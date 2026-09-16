import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KpiFlexibleService } from '../../core/services/kpi-flexible.service';
import { KpiAxis, AxisRoleScope } from '../../core/models/kpi-flexible.models';

@Component({
  selector: 'app-kpi-axis-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="axis-config-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="badge">QUẢN LÝ DANH MỤC TRỤC</div>
          <h2>Cấu hình Trục nhiệm vụ KPI</h2>
          <p class="subtitle">
            Quản lý danh mục các trục nhiệm vụ của nhà trường để gắn vào công việc khi giao việc và tự động tổng hợp, tính điểm KPI.
          </p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openCreateModal()">
            <i class="bi bi-plus-circle"></i> Thêm trục mới
          </button>
        </div>
      </div>

      <!-- Axes List Grid -->
      <div class="axes-grid" *ngIf="axes().length > 0; else loadingTpl">
        <div class="axis-card" *ngFor="let axis of axes(); let idx = index" [class.inactive]="!axis.isActive">
          <div class="card-header">
            <div class="axis-index-badge">#{{ axis.displayOrder || idx + 1 }}</div>
            <div class="axis-title-box">
              <h3 class="axis-name">{{ axis.name }}</h3>
              <span class="axis-code">Mã: <code>{{ axis.code }}</code></span>
            </div>
            <div class="scope-tag" [ngClass]="getScopeBadgeClass(axis.roleScope)">
              {{ getScopeLabel(axis.roleScope) }}
            </div>
          </div>

          <p class="axis-desc">{{ axis.description || 'Chưa có mô tả chi tiết' }}</p>

          <!-- Specific Rule Badges -->
          <div class="rules-box">
            <div class="rule-item" *ngIf="axis.requiresSubtype">
              <i class="bi bi-diagram-3-fill text-indigo"></i>
              <span>Bắt buộc chọn Sub-type: <strong>GV bộ môn / GVCN</strong></span>
            </div>

            <div class="rule-item" *ngIf="axis.roleScope === 'RESTRICTED'">
              <i class="bi bi-shield-lock-fill text-amber"></i>
              <span>Giới hạn chức danh: <strong>{{ (axis.restrictedPositionCodes || ['ke_toan', 'thu_quy']).join(', ') }}</strong></span>
            </div>

            <div class="rule-item" *ngIf="axis.warnOveruseThresholdPct">
              <i class="bi bi-exclamation-triangle-fill text-rose"></i>
              <span>Cảnh báo nếu điểm vượt quá: <strong>{{ axis.warnOveruseThresholdPct }}%</strong> tổng điểm</span>
            </div>
          </div>

          <div class="card-footer">
            <label class="status-toggle">
              <input type="checkbox" [checked]="axis.isActive" (change)="toggleAxisStatus(axis)" />
              <span class="slider"></span>
              <span class="status-text">{{ axis.isActive ? 'Đang hoạt động' : 'Tạm khóa' }}</span>
            </label>

            <button class="btn btn-sm btn-outline" (click)="openEditModal(axis)">
              <i class="bi bi-pencil-square"></i> Sửa
            </button>
          </div>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="empty-state">
          <div class="spinner"></div>
          <p>Đang tải danh mục trục kết quả...</p>
        </div>
      </ng-template>

      <!-- Edit / Create Modal -->
      <div class="modal-backdrop" *ngIf="showModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>{{ editingAxis()?.id ? 'Chỉnh sửa Trục kết quả' : 'Thêm mới Trục kết quả' }}</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Mã trục (Code) <span class="req">*</span></label>
              <input type="text" [(ngModel)]="formModel.code" placeholder="vd: chuyen_mon, kttc..." [disabled]="!!editingAxis()?.id" class="form-control" />
            </div>

            <div class="form-group">
              <label>Tên trục <span class="req">*</span></label>
              <input type="text" [(ngModel)]="formModel.name" placeholder="vd: Chuyên môn, Xây dựng Đảng..." class="form-control" />
            </div>

            <div class="form-group">
              <label>Mô tả nội dung</label>
              <textarea [(ngModel)]="formModel.description" rows="2" class="form-control" placeholder="Mô tả nhóm công việc thuộc trục này"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label>Thứ tự hiển thị</label>
                <input type="number" [(ngModel)]="formModel.displayOrder" class="form-control" min="1" />
              </div>
              <div class="form-group col">
                <label>Phạm vi áp dụng (Role Scope) <span class="req">*</span></label>
                <select [(ngModel)]="formModel.roleScope" class="form-control">
                  <option value="ALL">Tất cả (GV + NV)</option>
                  <option value="GV_ONLY">Chỉ Giáo viên (GV_ONLY)</option>
                  <option value="NV_ONLY">Chỉ Nhân viên (NV_ONLY)</option>
                  <option value="RESTRICTED">Giới hạn chức vụ (RESTRICTED)</option>
                </select>
              </div>
            </div>

            <div class="form-group" *ngIf="formModel.roleScope === 'RESTRICTED'">
              <label>Mã chức vụ được phép (cách nhau bằng dấu phẩy)</label>
              <input type="text" [(ngModel)]="restrictedCodesStr" placeholder="ke_toan, thu_quy" class="form-control" />
              <small class="hint">Chỉ nhân sự có position_code nằm trong danh sách này mới được chọn trục làm Trục chính.</small>
            </div>

            <div class="form-check-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="formModel.requiresSubtype" />
                <span>Bắt buộc chọn loại nhiệm vụ con (Sub-type: GV bộ môn / GVCN)</span>
              </label>
            </div>

            <div class="form-group" *ngIf="formModel.code === 'khac' || formModel.warnOveruseThresholdPct">
              <label>Ngưỡng cảnh báo lạm dụng (%)</label>
              <input type="number" [(ngModel)]="formModel.warnOveruseThresholdPct" placeholder="20" class="form-control" min="5" max="100" />
              <small class="hint">Cảnh báo người duyệt nếu điểm trục này vượt quá % tổng điểm cá nhân.</small>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Hủy</button>
            <button class="btn btn-primary" (click)="saveAxis()">Lưu cấu hình</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .axis-config-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      color: #1e40af;
      background: #dbeafe;
      border-radius: 20px;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    h2 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
    }

    .subtitle {
      color: #64748b;
      font-size: 13.5px;
      margin: 0;
      max-width: 800px;
      line-height: 1.5;
    }

    .axes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 20px;
    }

    .axis-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
    }

    .axis-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
      border-color: #cbd5e1;
    }

    .axis-card.inactive {
      opacity: 0.6;
      background: #f8fafc;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .axis-index-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .axis-title-box {
      flex: 1;
      min-width: 0;
    }

    .axis-name {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .axis-code code {
      font-size: 11px;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .scope-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      white-space: nowrap;
    }

    .scope-all { background: #e0f2fe; color: #0369a1; }
    .scope-gv { background: #dcfce7; color: #15803d; }
    .scope-nv { background: #fef3c7; color: #b45309; }
    .scope-restricted { background: #fee2e2; color: #b91c1c; }

    .axis-desc {
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
      margin-bottom: 16px;
      flex: 1;
    }

    .rules-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
      font-size: 12px;
      color: #334155;
    }

    .rule-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .text-indigo { color: #4f46e5; }
    .text-amber { color: #d97706; }
    .text-rose { color: #e11d48; }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
    }

    .status-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 600;
      color: #475569;
    }

    .status-toggle input {
      display: none;
    }

    .slider {
      width: 34px;
      height: 18px;
      background: #cbd5e1;
      border-radius: 20px;
      position: relative;
      transition: 0.3s;
    }

    .slider::before {
      content: '';
      width: 14px;
      height: 14px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: 0.3s;
    }

    input:checked + .slider {
      background: #16a34a;
    }

    input:checked + .slider::before {
      transform: translateX(16px);
    }

    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #e2e8f0; color: #334155; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #475569; }
    .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
    .btn-sm { padding: 4px 10px; font-size: 12px; }

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
      max-width: 520px;
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
      transition: 0.2s;
    }

    .form-control:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .hint {
      font-size: 11.5px;
      color: #64748b;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
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
export class KpiAxisConfigComponent implements OnInit {
  private kpiService = inject(KpiFlexibleService);

  axes = signal<KpiAxis[]>([]);
  showModal = signal<boolean>(false);
  editingAxis = signal<KpiAxis | null>(null);

  formModel: Partial<KpiAxis> = {
    code: '',
    name: '',
    description: '',
    displayOrder: 1,
    roleScope: 'ALL',
    requiresSubtype: false,
    warnOveruseThresholdPct: null,
  };
  restrictedCodesStr = '';

  ngOnInit() {
    this.loadAxes();
  }

  loadAxes() {
    this.kpiService.getAxes().subscribe({
      next: (res) => this.axes.set(res),
      error: (err) => console.error('Lỗi tải danh sách trục:', err),
    });
  }

  openCreateModal() {
    this.editingAxis.set(null);
    this.formModel = {
      code: '',
      name: '',
      description: '',
      displayOrder: this.axes().length + 1,
      roleScope: 'ALL',
      requiresSubtype: false,
      warnOveruseThresholdPct: null,
    };
    this.restrictedCodesStr = '';
    this.showModal.set(true);
  }

  openEditModal(axis: KpiAxis) {
    this.editingAxis.set(axis);
    this.formModel = { ...axis };
    this.restrictedCodesStr = (axis.restrictedPositionCodes || []).join(', ');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingAxis.set(null);
  }

  saveAxis() {
    if (!this.formModel.code || !this.formModel.name) {
      alert('Vui lòng nhập đầy đủ mã trục và tên trục!');
      return;
    }

    if (this.formModel.roleScope === 'RESTRICTED') {
      this.formModel.restrictedPositionCodes = this.restrictedCodesStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      this.formModel.restrictedPositionCodes = null;
    }

    this.kpiService.createOrUpdateAxis({ ...this.formModel, id: this.editingAxis()?.id }).subscribe({
      next: () => {
        this.closeModal();
        this.loadAxes();
      },
      error: (err) => alert(`Lỗi lưu trục: ${err.message || err}`),
    });
  }

  toggleAxisStatus(axis: KpiAxis) {
    this.kpiService.createOrUpdateAxis({ id: axis.id, isActive: !axis.isActive }).subscribe({
      next: () => this.loadAxes(),
      error: (err) => alert(`Lỗi cập nhật trạng thái: ${err.message || err}`),
    });
  }

  getScopeBadgeClass(scope: AxisRoleScope): string {
    switch (scope) {
      case 'ALL': return 'scope-all';
      case 'GV_ONLY': return 'scope-gv';
      case 'NV_ONLY': return 'scope-nv';
      case 'RESTRICTED': return 'scope-restricted';
    }
  }

  getScopeLabel(scope: AxisRoleScope): string {
    switch (scope) {
      case 'ALL': return 'Tất cả (GV + NV)';
      case 'GV_ONLY': return 'Chỉ GV';
      case 'NV_ONLY': return 'Chỉ NV';
      case 'RESTRICTED': return 'Giới hạn (RESTRICTED)';
    }
  }
}
