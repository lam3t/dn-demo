import { Component, EventEmitter, Input, Output, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KpiFlexibleService } from '../../core/services/kpi-flexible.service';
import { KpiAxis, EvaluationPeriod } from '../../core/models/kpi-flexible.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-kpi-task-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" *ngIf="isOpen">
      <div class="modal-card">
        <div class="modal-header">
          <div class="header-title-box">
            <span class="badge">TRỤC KẾT QUẢ LINH HOẠT</span>
            <h3>{{ editingTask?.id ? 'Chỉnh sửa Nhiệm vụ KPI' : 'Thêm mới Nhiệm vụ KPI' }}</h3>
          </div>
          <button class="btn-close" (click)="close()">×</button>
        </div>

        <div class="modal-body">
          <!-- Live Anti-fraud warnings box if any -->
          <div class="warning-banner" *ngIf="liveWarnings().length > 0">
            <div class="warning-header">
              <i class="bi bi-shield-exclamation text-amber"></i>
              <strong>Hệ thống phát hiện các lưu ý kiểm chuẩn:</strong>
            </div>
            <ul>
              <li *ngFor="let w of liveWarnings()">{{ w }}</li>
            </ul>
          </div>

          <!-- Title -->
          <div class="form-group">
            <label>Tên nhiệm vụ KPI <span class="req">*</span></label>
            <input
              type="text"
              [(ngModel)]="formModel.title"
              (ngModelChange)="checkWarnings()"
              placeholder="vd: Giảng dạy và kiểm tra đánh giá môn Toán 9, Công tác chủ nhiệm..."
              class="form-control"
            />
          </div>

          <!-- Description -->
          <div class="form-group">
            <label>Mục tiêu & Sản phẩm đầu ra cụ thể</label>
            <textarea
              [(ngModel)]="formModel.description"
              rows="2"
              placeholder="Nêu rõ sản phẩm minh chứng: Ma trận đề thi, sổ điểm điện tử, giáo án số hóa..."
              class="form-control"
            ></textarea>
          </div>

          <!-- Primary Axis (Filtered by user role & position) -->
          <div class="form-group">
            <label>
              <i class="bi bi-star-fill text-amber"></i>
              Trục kết quả chính (Dùng tính điểm 70 điểm) <span class="req">*</span>
            </label>
            <select
              [(ngModel)]="formModel.primaryAxisId"
              (ngModelChange)="onPrimaryAxisChange()"
              class="form-control primary-axis-select"
            >
              <option value="">-- Chọn Trục kết quả chính --</option>
              <option *ngFor="let a of allowedAxes()" [value]="a.id">
                {{ a.displayOrder }}. {{ a.name }} ({{ a.code }})
              </option>
            </select>
            <small class="hint" *ngIf="isNVUser">
              <i class="bi bi-info-circle"></i> Nhân sự khối Nhân viên: Trục Chuyên môn được ẩn theo quy định của Sở.
            </small>
          </div>

          <!-- Subtype for Chuyên môn (Mandatory for GV) -->
          <div class="form-group subtype-box" *ngIf="selectedAxisIsChuyenMon">
            <label class="text-indigo">
              <i class="bi bi-diagram-3-fill"></i>
              Phân loại nhiệm vụ Chuyên môn (Bắt buộc) <span class="req">*</span>
            </label>
            <div class="radio-cards">
              <label class="radio-card" [class.selected]="formModel.taskSubtype === 'gv_bo_mon'">
                <input type="radio" name="subtype" value="gv_bo_mon" [(ngModel)]="formModel.taskSubtype" />
                <div class="radio-content">
                  <strong>Giáo viên bộ môn</strong>
                  <span>Giảng dạy, ra đề, chấm thi, bồi dưỡng HS</span>
                </div>
              </label>

              <label class="radio-card" [class.selected]="formModel.taskSubtype === 'gvcn'">
                <input type="radio" name="subtype" value="gvcn" [(ngModel)]="formModel.taskSubtype" />
                <div class="radio-content">
                  <strong>Giáo viên chủ nhiệm (GVCN)</strong>
                  <span>Quản lý lớp, nề nếp, họp CMHS, HĐTN</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Secondary Axes (Many-to-Many tags for statistics) -->
          <div class="form-group">
            <label>Trục liên quan khác (Tùy chọn - Tham chiếu thống kê)</label>
            <div class="secondary-tags-wrap">
              <button
                type="button"
                *ngFor="let a of allAxes()"
                class="tag-btn"
                [class.active]="isSecondarySelected(a.id)"
                (click)="toggleSecondaryAxis(a.id)"
                [disabled]="a.id === formModel.primaryAxisId"
              >
                {{ a.name }}
              </button>
            </div>
          </div>

          <!-- Row: Weight Score & Priority & DueDate -->
          <div class="form-row">
            <div class="form-group col">
              <label>Trọng số điểm (Thang 70) <span class="req">*</span></label>
              <input
                type="number"
                [(ngModel)]="formModel.weightScore"
                (ngModelChange)="checkWarnings()"
                class="form-control"
                min="0.5"
                max="70"
                step="0.5"
              />
            </div>

            <div class="form-group col">
              <label>Độ ưu tiên</label>
              <select [(ngModel)]="formModel.priority" class="form-control">
                <option value="TRUNG_BINH">Trung bình (x1.0)</option>
                <option value="CAO">Cao (x1.5)</option>
                <option value="KHAN_CAP">Khẩn cấp (x2.0)</option>
                <option value="THAP">Thấp (x0.8)</option>
              </select>
            </div>

            <div class="form-group col">
              <label>Hạn hoàn thành</label>
              <input type="date" [(ngModel)]="dueDateStr" class="form-control" />
            </div>
          </div>

          <!-- Evidence files input -->
          <div class="form-group">
            <label><i class="bi bi-paperclip"></i> Đính kèm đường dẫn sản phẩm / Minh chứng</label>
            <div class="evidence-input-row">
              <input
                type="text"
                [(ngModel)]="newEvidenceFileName"
                placeholder="Tên tệp minh chứng (vd: de_toan_9.pdf)"
                class="form-control"
              />
              <button class="btn btn-outline btn-sm" type="button" (click)="addEvidence()">
                <i class="bi bi-plus"></i> Thêm tệp
              </button>
            </div>

            <div class="evidence-list" *ngIf="evidenceList.length > 0">
              <div class="evidence-tag" *ngFor="let ev of evidenceList; let i = index">
                <i class="bi bi-file-earmark-check"></i> {{ ev.fileName }}
                <button type="button" class="btn-remove-ev" (click)="removeEvidence(i)">×</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close()">Hủy</button>
          <button class="btn btn-primary" (click)="saveTask()">
            <i class="bi bi-check2-circle"></i> Lưu nhiệm vụ
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 20px;
    }

    .modal-card {
      background: white;
      border-radius: 18px;
      width: 100%;
      max-width: 680px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #f8fafc;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 10.5px;
      font-weight: 700;
      color: #1e40af;
      background: #dbeafe;
      border-radius: 12px;
      margin-bottom: 4px;
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 26px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 75vh;
      overflow-y: auto;
    }

    .warning-banner {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 12.5px;
      color: #92400e;
    }

    .warning-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .warning-banner ul {
      margin: 0;
      padding-left: 20px;
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
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .req { color: #e11d48; }

    .form-control {
      padding: 9px 12px;
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

    .primary-axis-select {
      font-weight: 700;
      color: #1e3a8a;
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    .subtype-box {
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 12px;
      padding: 14px;
    }

    .radio-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 6px;
    }

    .radio-card {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 14px;
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      transition: 0.2s;
    }

    .radio-card.selected {
      border-color: #6366f1;
      background: #eef2ff;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    .radio-content {
      display: flex;
      flex-direction: column;
    }

    .radio-content strong {
      font-size: 13px;
      color: #1e1b4b;
    }

    .radio-content span {
      font-size: 11.5px;
      color: #64748b;
    }

    .secondary-tags-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tag-btn {
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      cursor: pointer;
      transition: 0.2s;
    }

    .tag-btn.active {
      background: #2563eb;
      color: white;
      border-color: #2563eb;
    }

    .tag-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .evidence-input-row {
      display: flex;
      gap: 8px;
    }

    .evidence-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .evidence-tag {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 12px;
      color: #1e293b;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-remove-ev {
      background: transparent;
      border: none;
      font-size: 16px;
      color: #ef4444;
      cursor: pointer;
      line-height: 1;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #f8fafc;
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
    }

    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #e2e8f0; color: #334155; }
    .btn-outline { background: transparent; border: 1px solid #cbd5e1; color: #475569; }
  `],
})
export class KpiTaskDialogComponent implements OnInit {
  private kpiService = inject(KpiFlexibleService);
  private authService = inject(AuthService);

  @Input() isOpen = false;
  @Input() editingTask: any = null;
  @Input() set task(val: any) {
    this.editingTask = val;
  }
  get task(): any {
    return this.editingTask;
  }
  @Input() currentPeriodId: string = '';
  @Input() set periodId(val: string) {
    this.currentPeriodId = val;
  }
  get periodId(): string {
    return this.currentPeriodId;
  }
  @Output() closeDialog = new EventEmitter<void>();
  @Output() taskSaved = new EventEmitter<any>();
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  allAxes = signal<KpiAxis[]>([]);
  allowedAxes = signal<KpiAxis[]>([]);
  liveWarnings = signal<string[]>([]);

  formModel: any = {
    title: '',
    description: '',
    periodId: '',
    primaryAxisId: '',
    taskSubtype: 'gv_bo_mon',
    secondaryAxisIds: [] as string[],
    weightScore: 10,
    priority: 'TRUNG_BINH',
  };

  dueDateStr = '';
  newEvidenceFileName = '';
  evidenceList: Array<{ fileName: string; fileUrl: string }> = [];

  get isNVUser(): boolean {
    const user = this.authService.currentUser();
    return (
      (user as any)?.positionGroup === 'NV' ||
      user?.roles?.some((r) => r.role === 'NHAN_VIEN') ||
      false
    );
  }

  get selectedAxisIsChuyenMon(): boolean {
    const axis = this.allAxes().find((a) => a.id === this.formModel.primaryAxisId);
    return axis?.code === 'chuyen_mon' || axis?.requiresSubtype === true;
  }

  ngOnInit() {
    this.kpiService.getAxes().subscribe((axes) => this.allAxes.set(axes));
    this.kpiService.getAllowedAxes().subscribe((axes) => this.allowedAxes.set(axes));
  }

  ngOnChanges() {
    if (this.isOpen) {
      if (this.editingTask) {
        this.formModel = {
          ...this.editingTask,
          secondaryAxisIds: (this.editingTask.secondaryAxes || []).map((a: any) => a.id),
        };
        this.dueDateStr = this.editingTask.dueDate ? this.editingTask.dueDate.slice(0, 10) : '';
        this.evidenceList = this.editingTask.evidenceFiles || [];
      } else {
        this.formModel = {
          title: '',
          description: '',
          periodId: this.currentPeriodId,
          primaryAxisId: this.allowedAxes()[0]?.id || '',
          taskSubtype: 'gv_bo_mon',
          secondaryAxisIds: [],
          weightScore: 10,
          priority: 'TRUNG_BINH',
        };
        this.dueDateStr = '';
        this.evidenceList = [];
      }
      this.checkWarnings();
    }
  }

  onPrimaryAxisChange() {
    // Remove primary from secondary if present
    this.formModel.secondaryAxisIds = this.formModel.secondaryAxisIds.filter(
      (id: string) => id !== this.formModel.primaryAxisId
    );

    if (this.selectedAxisIsChuyenMon && !this.formModel.taskSubtype) {
      this.formModel.taskSubtype = 'gv_bo_mon';
    }

    this.checkWarnings();
  }

  isSecondarySelected(axisId: string): boolean {
    return this.formModel.secondaryAxisIds.includes(axisId);
  }

  toggleSecondaryAxis(axisId: string) {
    if (this.isSecondarySelected(axisId)) {
      this.formModel.secondaryAxisIds = this.formModel.secondaryAxisIds.filter((id: string) => id !== axisId);
    } else {
      this.formModel.secondaryAxisIds.push(axisId);
    }
  }

  addEvidence() {
    if (!this.newEvidenceFileName.trim()) return;
    this.evidenceList.push({
      fileName: this.newEvidenceFileName.trim(),
      fileUrl: `/uploads/${this.newEvidenceFileName.trim()}`,
    });
    this.newEvidenceFileName = '';
    this.checkWarnings();
  }

  removeEvidence(index: number) {
    this.evidenceList.splice(index, 1);
    this.checkWarnings();
  }

  checkWarnings() {
    const warnings: string[] = [];

    if (this.evidenceList.length === 0) {
      warnings.push('Chưa đính kèm minh chứng sản phẩm.');
    }

    if (this.formModel.weightScore < 1.0) {
      warnings.push('Trọng số điểm nhỏ (< 1.0 điểm) so với thang 70.');
    }

    const axis = this.allAxes().find((a) => a.id === this.formModel.primaryAxisId);
    if (axis?.code === 'khac') {
      warnings.push('Nhiệm vụ gán trục "Khác" — Lưu ý tỷ lệ trục Khác không nên vượt quá 20% tổng điểm.');
    }

    this.liveWarnings.set(warnings);
  }

  close() {
    this.closeDialog.emit();
    this.cancelled.emit();
  }

  saveTask() {
    if (!this.formModel.title || !this.formModel.primaryAxisId) {
      alert('Vui lòng nhập tên công việc và chọn Trục kết quả chính!');
      return;
    }

    if (this.selectedAxisIsChuyenMon && !this.formModel.taskSubtype) {
      alert('Vui lòng chọn loại nhiệm vụ Chuyên môn: GV bộ môn hoặc GVCN!');
      return;
    }

    const payload = {
      ...this.formModel,
      periodId: this.currentPeriodId || this.formModel.periodId,
      dueDate: this.dueDateStr ? new Date(this.dueDateStr) : undefined,
      evidenceFiles: this.evidenceList,
    };

    if (this.editingTask?.id) {
      this.kpiService.updateKpiTask(this.editingTask.id, payload).subscribe({
        next: (res) => {
          this.taskSaved.emit(res);
          this.saved.emit(res);
          this.close();
        },
        error: (err) => alert(`Lỗi cập nhật: ${err.error?.message || err.message}`),
      });
    } else {
      this.kpiService.createKpiTask(payload).subscribe({
        next: (res) => {
          this.taskSaved.emit(res);
          this.saved.emit(res);
          this.close();
        },
        error: (err) => alert(`Lỗi tạo nhiệm vụ: ${err.error?.message || err.message}`),
      });
    }
  }
}
