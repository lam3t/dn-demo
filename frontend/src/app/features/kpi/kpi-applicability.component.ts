import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { KpiFlexibleService } from '../../core/services/kpi-flexible.service';
import { EvaluationPeriod, UnitAxisApplicabilityItem } from '../../core/models/kpi-flexible.models';

@Component({
  selector: 'app-kpi-applicability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="applicability-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="badge">THIẾT LẬP ĐƠN VỊ • KỲ ĐÁNH GIÁ</div>
          <h2>Áp dụng Trục kết quả theo Tổ / Bộ phận</h2>
          <p class="subtitle">
            Quy định các trục kết quả áp dụng cho từng đơn vị trong kỳ đánh giá. Trục được đánh dấu <strong>"Không áp dụng"</strong> sẽ không được gán làm trục chính cho bất kỳ nhiệm vụ nào của đơn vị trong kỳ đó.
          </p>
        </div>
      </div>

      <!-- Filters (Select Period & OrgUnit) -->
      <div class="filter-panel">
        <div class="filter-group">
          <label><i class="bi bi-calendar-event"></i> Kỳ đánh giá</label>
          <select [(ngModel)]="selectedPeriodId" (change)="loadApplicability()" class="form-control">
            <option *ngFor="let p of periods()" [value]="p.id">{{ p.name }} ({{ p.schoolYear }})</option>
          </select>
        </div>

        <div class="filter-group">
          <label><i class="bi bi-diagram-2"></i> Tổ chuyên môn / Đơn vị</label>
          <select [(ngModel)]="selectedUnitId" (change)="loadApplicability()" class="form-control">
            <option *ngFor="let u of orgUnits()" [value]="u.id">{{ u.name }}</option>
          </select>
        </div>
      </div>

      <!-- Applicability Table -->
      <div class="table-card" *ngIf="applicabilityList().length > 0; else emptyTpl">
        <div class="table-header-info">
          <span>Danh sách <strong>{{ applicabilityList().length }} trục kết quả</strong> của đơn vị</span>
          <span class="auto-save-hint"><i class="bi bi-check-circle-fill text-success"></i> Tự động đồng bộ và lưu trữ</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;" class="text-center">#</th>
                <th style="width: 220px;">Trục kết quả</th>
                <th style="width: 140px;">Phạm vi áp dụng</th>
                <th style="width: 160px;" class="text-center">Trạng thái áp dụng</th>
                <th>Lý do giải trình (Bắt buộc nếu Không áp dụng)</th>
                <th style="width: 100px;" class="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of applicabilityList(); let i = index" [class.row-na]="!item.isApplicable">
                <td class="text-center font-bold">{{ item.displayOrder || i + 1 }}</td>
                <td>
                  <div class="axis-info">
                    <strong>{{ item.axisName }}</strong>
                    <code>{{ item.axisCode }}</code>
                  </div>
                </td>
                <td>
                  <span class="scope-pill" [ngClass]="item.roleScope.toLowerCase()">
                    {{ getScopeLabel(item.roleScope) }}
                  </span>
                </td>
                <td class="text-center">
                  <button
                    class="btn-toggle-status"
                    [class.active]="item.isApplicable"
                    (click)="toggleApplicable(item)"
                  >
                    <i class="bi" [ngClass]="item.isApplicable ? 'bi-check-circle-fill' : 'bi-dash-circle-fill'"></i>
                    {{ item.isApplicable ? 'ÁP DỤNG' : 'KHÔNG ÁP DỤNG' }}
                  </button>
                </td>
                <td>
                  <div *ngIf="!item.isApplicable; else applicableNoteTpl">
                    <input
                      type="text"
                      [(ngModel)]="item.reason"
                      placeholder="Nhập lý do đơn vị không phát sinh nhiệm vụ trục này..."
                      class="form-control reason-input"
                      [class.is-invalid]="!item.reason || item.reason.trim() === ''"
                    />
                    <small class="text-danger" *ngIf="!item.reason || item.reason.trim() === ''">
                      * Bắt buộc giải trình theo quy định
                    </small>
                  </div>
                  <ng-template #applicableNoteTpl>
                    <span class="text-muted"><i class="bi bi-info-circle"></i> Đơn vị có nhiệm vụ phát sinh theo trục này</span>
                  </ng-template>
                </td>
                <td class="text-center">
                  <button class="btn btn-sm btn-primary" (click)="saveItem(item)">
                    <i class="bi bi-save"></i> Lưu
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ng-template #emptyTpl>
        <div class="empty-state">
          <div class="spinner"></div>
          <p>Đang tải cấu hình áp dụng trục của đơn vị...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .applicability-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
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
      max-width: 900px;
      line-height: 1.5;
    }

    .filter-panel {
      display: flex;
      gap: 16px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    }

    .filter-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .filter-group label {
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 6px;
    }

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

    .table-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
    }

    .table-header-info {
      padding: 14px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #475569;
    }

    .auto-save-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #16a34a;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }

    .data-table th {
      background: #f1f5f9;
      padding: 12px 16px;
      font-weight: 700;
      color: #1e293b;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .row-na {
      background: #fff1f2;
    }

    .axis-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .axis-info strong {
      color: #0f172a;
      font-size: 14px;
    }

    .axis-info code {
      font-size: 11px;
      color: #64748b;
    }

    .scope-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      display: inline-block;
    }

    .scope-pill.all { background: #e0f2fe; color: #0369a1; }
    .scope-pill.gv_only { background: #dcfce7; color: #15803d; }
    .scope-pill.nv_only { background: #fef3c7; color: #b45309; }
    .scope-pill.restricted { background: #fee2e2; color: #b91c1c; }

    .btn-toggle-status {
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid #cbd5e1;
      font-size: 12px;
      font-weight: 700;
      background: #f1f5f9;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: 0.2s;
    }

    .btn-toggle-status.active {
      background: #dcfce7;
      color: #15803d;
      border-color: #86efac;
    }

    .btn-toggle-status:not(.active) {
      background: #fee2e2;
      color: #b91c1c;
      border-color: #fca5a5;
    }

    .reason-input {
      width: 100%;
    }

    .reason-input.is-invalid {
      border-color: #e11d48;
      background: #fff1f2;
    }

    .text-danger {
      font-size: 11.5px;
      color: #e11d48;
      font-weight: 600;
      margin-top: 4px;
      display: block;
    }

    .btn {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-sm { padding: 5px 10px; font-size: 12px; }

    .empty-state {
      padding: 60px;
      text-align: center;
      color: #64748b;
      background: white;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class KpiApplicabilityComponent implements OnInit {
  private kpiService = inject(KpiFlexibleService);
  private http = inject(HttpClient);

  periods = signal<EvaluationPeriod[]>([]);
  orgUnits = signal<any[]>([]);
  applicabilityList = signal<UnitAxisApplicabilityItem[]>([]);

  selectedPeriodId = '';
  selectedUnitId = '';

  ngOnInit() {
    this.loadPeriodsAndUnits();
  }

  loadPeriodsAndUnits() {
    this.kpiService.getPeriods().subscribe((periods) => {
      this.periods.set(periods);
      if (periods.length > 0) {
        this.selectedPeriodId = periods[0].id;
      }

      this.http.get<{ success: boolean; data: any[] }>('/api/org').subscribe((res) => {
        const units = res.data || [];
        this.orgUnits.set(units);
        if (units.length > 0) {
          this.selectedUnitId = units[0].id;
        }

        if (this.selectedPeriodId && this.selectedUnitId) {
          this.loadApplicability();
        }
      });
    });
  }

  loadApplicability() {
    if (!this.selectedPeriodId || !this.selectedUnitId) return;

    this.kpiService.getUnitApplicability(this.selectedUnitId, this.selectedPeriodId).subscribe({
      next: (list) => this.applicabilityList.set(list),
      error: (err) => console.error('Lỗi tải cấu hình áp dụng:', err),
    });
  }

  toggleApplicable(item: UnitAxisApplicabilityItem) {
    item.isApplicable = !item.isApplicable;
    if (item.isApplicable) {
      item.reason = '';
    }
  }

  saveItem(item: UnitAxisApplicabilityItem) {
    if (!item.isApplicable && (!item.reason || item.reason.trim() === '')) {
      alert('Vui lòng nhập lý do giải trình khi chọn Không áp dụng!');
      return;
    }

    this.kpiService
      .setUnitApplicability({
        unitId: this.selectedUnitId,
        periodId: this.selectedPeriodId,
        axisId: item.axisId,
        isApplicable: item.isApplicable,
        reason: item.reason || undefined,
      })
      .subscribe({
        next: () => {
          alert(`Đã lưu cấu hình cho trục "${item.axisName}"`);
          this.loadApplicability();
        },
        error: (err) => alert(`Lỗi lưu cấu hình: ${err.error?.message || err.message}`),
      });
  }

  getScopeLabel(scope: string): string {
    switch (scope) {
      case 'ALL': return 'Tất cả (GV + NV)';
      case 'GV_ONLY': return 'Chỉ GV';
      case 'NV_ONLY': return 'Chỉ NV';
      case 'RESTRICTED': return 'Giới hạn (RESTRICTED)';
      default: return scope;
    }
  }
}
