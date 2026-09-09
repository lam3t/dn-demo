import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanService } from '../../core/services/plan.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { PlanTreeNode, PlanItem, PlanLevel } from '../../core/models/plan.models';
import { PlanTreeComponent } from '../../shared/components/plan-tree/plan-tree.component';
import { TaskCreateWizardComponent } from '../../shared/components/task-create-wizard/task-create-wizard.component';
import { LocationItem } from '../../core/models/user.models';

interface PaperPlanRow {
  id: string;
  timeLabel: string;
  startDate: string;
  endDate: string;
  focusContent: string;
  targetResult: string;
  saved: boolean;
  generatedTaskId?: string;
}

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanTreeComponent, TaskCreateWizardComponent],
  template: `
    <div class="plans-page-container">
      <!-- HEADER -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <span class="material-symbols-outlined">account_tree</span>
            <span>QUẢN LÝ KẾ HOẠCH NHÀ TRƯỜNG</span>
          </div>
          <h1 class="page-title">Cây Kế Hoạch & Số Hóa Kế Hoạch Giấy</h1>
          <p class="page-subtitle">
            Theo dõi phân cấp Năm → Học kỳ → Quý → Tháng → Tuần và số hóa bảng kế hoạch giáo viên.
          </p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn-primary tap-target" (click)="openCreatePlanModal()">
            <span class="material-symbols-outlined">add_circle</span>
            <span>Lập kế hoạch mới</span>
          </button>
          <button type="button" class="btn-secondary tap-target" (click)="openDuplicateModal()">
            <span class="material-symbols-outlined">content_copy</span>
            <span>Sao chép kỳ trước</span>
          </button>
        </div>
      </header>

      <!-- STATS HERO SUMMARY CARDS -->
      <section class="stats-summary-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper icon-blue">
            <span class="material-symbols-outlined">calendar_today</span>
          </div>
          <div class="stat-info">
            <span class="stat-label">Năm học hiện hành</span>
            <strong class="stat-val">{{ activeSchoolYearTitle() }}</strong>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper icon-indigo">
            <span class="material-symbols-outlined">layers</span>
          </div>
          <div class="stat-info">
            <span class="stat-label">Tổng số mốc kế hoạch</span>
            <strong class="stat-val">{{ totalPlanNodesCount() }} mốc</strong>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper icon-teal">
            <span class="material-symbols-outlined">task_alt</span>
          </div>
          <div class="stat-info">
            <span class="stat-label">Công việc gắn kế hoạch</span>
            <strong class="stat-val">
              {{ totalCompletedTasks() }}/{{ totalTasksCount() }} hoàn thành
            </strong>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper icon-green">
            <span class="material-symbols-outlined">trending_up</span>
          </div>
          <div class="stat-info">
            <span class="stat-label">Tiến độ chung toàn trường</span>
            <strong class="stat-val" [style.color]="averageProgress() >= 80 ? '#2E7D32' : '#1F3864'">
              {{ averageProgress() }}%
            </strong>
          </div>
        </div>
      </section>

      <!-- MAIN TABS: 1. CÂY KẾ HOẠCH | 2. BẢNG SỐ HÓA KẾ HOẠCH GIẤY -->
      <div class="view-tabs-bar">
        <button
          type="button"
          class="view-tab-btn"
          [class.active]="activeTab() === 'tree'"
          (click)="activeTab.set('tree')"
        >
          <span class="material-symbols-outlined">account_tree</span>
          <span>1. Cây Kế Hoạch Lồng Nhau (Năm → Tuần)</span>
        </button>

        <button
          type="button"
          class="view-tab-btn"
          [class.active]="activeTab() === 'paper'"
          (click)="activeTab.set('paper')"
        >
          <span class="material-symbols-outlined">edit_note</span>
          <span>2. Số Hóa Kế Hoạch (Bảng Giấy 3 Cột)</span>
        </button>
      </div>

      <!-- TAB 1: CÂY KẾ HOẠCH LỒNG NHAU -->
      @if (activeTab() === 'tree') {
        <section class="tab-content-panel">
          <!-- TREE CONTROLS & FILTER BAR -->
          <div class="tree-controls-bar">
            <div class="controls-left">
              <label class="filter-label">Kế hoạch gốc:</label>
              <select class="root-select tap-target" [(ngModel)]="selectedRootPlanId" (ngModelChange)="loadTree()">
                <option value="">Toàn bộ cây kế hoạch</option>
                @for (p of allPlans(); track p.id) {
                  @if (p.level === 'NAM' || p.level === 'HOC_KY') {
                    <option [value]="p.id">[{{ p.level }}] {{ p.title }}</option>
                  }
                }
              </select>
            </div>

            <div class="controls-right">
              <button type="button" class="btn-tool-text tap-target" (click)="treeComponent?.expandAll()">
                <span class="material-symbols-outlined">unfold_more</span>
                <span>Mở rộng tất cả</span>
              </button>
              <button type="button" class="btn-tool-text tap-target" (click)="treeComponent?.collapseAll()">
                <span class="material-symbols-outlined">unfold_less</span>
                <span>Thu gọn tất cả</span>
              </button>
              <button type="button" class="btn-tool-text reload-btn tap-target" (click)="loadTree()" title="Tải lại">
                <span class="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          <!-- TREE COMPONENT -->
          @if (isLoading()) {
            <div class="tree-skeleton-list">
              @for (item of [1, 2, 3, 4]; track item) {
                <div class="skeleton-card" style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="skeleton-line w-50 h-20"></div>
                    <div class="skeleton-line w-30"></div>
                  </div>
                  <div class="skeleton-line w-90"></div>
                  <div style="display: flex; gap: 10px; margin-top: 6px;">
                    <div class="skeleton-line w-30"></div>
                    <div class="skeleton-line w-30"></div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <app-plan-tree
              #treeComponent
              [nodes]="treeNodes()"
              [isRoot]="true"
              (createTaskForPlan)="openWizardForPlan($event)"
              (addChildPlan)="openAddChildPlanModal($event)"
              (editPlan)="openEditPlanModal($event)"
            ></app-plan-tree>
          }
        </section>
      }

      <!-- TAB 2: BẢNG SỐ HÓA KẾ HOẠCH GIẤY (3 CỘT) -->
      @if (activeTab() === 'paper') {
        <section class="tab-content-panel paper-layout-panel">
          <!-- PAPER TOP BANNER & TARGET PLAN SELECTOR -->
          <div class="paper-header-box">
            <div class="paper-header-left">
              <span class="paper-badge">MÔ PHỎNG SỔ KẾ HOẠCH GIÁO VIÊN</span>
              <h2 class="paper-title">Bảng Kế Hoạch Trọng Tâm Theo Mốc Thời Gian</h2>
              <p class="paper-desc">
                Nhập liệu theo 3 cột quen thuộc: <strong>Thời gian</strong> | <strong>Nội dung trọng tâm</strong> | <strong>Kết quả cần đạt</strong>. 
                Sau khi lưu, bấm nút <em>"Tạo công việc từ dòng này →"</em> để giao việc tự động!
              </p>
            </div>

            <div class="paper-target-plan-box">
              <label class="field-label">Gắn vào Kế hoạch mẹ:</label>
              <select class="plan-target-select" [(ngModel)]="paperTargetPlanId">
                <option [ngValue]="null">-- Chọn kế hoạch (hoặc tạo mới bên dưới) --</option>
                @for (p of allPlans(); track p.id) {
                  <option [value]="p.id">[{{ p.level }}] {{ p.title }}</option>
                }
              </select>
            </div>
          </div>

          <!-- 3-COLUMN PAPER TABLE -->
          <div class="paper-table-wrapper">
            <table class="paper-table">
              <thead>
                <tr>
                  <th class="col-stt">STT</th>
                  <th class="col-time">
                    <div class="th-content">
                      <span class="material-symbols-outlined">schedule</span>
                      <span>1. Thời gian / Mốc thực hiện</span>
                    </div>
                  </th>
                  <th class="col-content">
                    <div class="th-content">
                      <span class="material-symbols-outlined">edit_document</span>
                      <span>2. Nội dung trọng tâm công việc</span>
                    </div>
                  </th>
                  <th class="col-result">
                    <div class="th-content">
                      <span class="material-symbols-outlined">verified</span>
                      <span>3. Kết quả cần đạt / Sản phẩm</span>
                    </div>
                  </th>
                  <th class="col-actions">Thao tác & Giao việc</th>
                </tr>
              </thead>
              <tbody>
                @for (row of paperRows(); track row.id; let idx = $index) {
                  <tr class="paper-row" [class.is-saved]="row.saved">
                    <td class="col-stt">
                      <span class="stt-badge">{{ idx + 1 }}</span>
                    </td>

                    <!-- CỘT 1: THỜI GIAN -->
                    <td class="col-time">
                      <div class="time-input-container">
                        <input
                          type="text"
                          class="paper-input text-bold"
                          [(ngModel)]="row.timeLabel"
                          placeholder="VD: Tuần 1 (01/09 - 07/09)"
                        />
                        <div class="date-pickers-mini">
                          <input
                            type="date"
                            class="date-mini"
                            [(ngModel)]="row.startDate"
                            title="Ngày bắt đầu"
                          />
                          <span class="date-sep">→</span>
                          <input
                            type="date"
                            class="date-mini"
                            [(ngModel)]="row.endDate"
                            title="Ngày kết thúc"
                          />
                        </div>
                      </div>
                    </td>

                    <!-- CỘT 2: NỘI DUNG TRỌNG TÂM -->
                    <td class="col-content">
                      <textarea
                        class="paper-textarea"
                        rows="2"
                        [(ngModel)]="row.focusContent"
                        placeholder="Nhập nội dung trọng tâm công việc cần triển khai..."
                      ></textarea>
                    </td>

                    <!-- CỘT 3: KẾT QUẢ CẦN ĐẠT -->
                    <td class="col-result">
                      <textarea
                        class="paper-textarea"
                        rows="2"
                        [(ngModel)]="row.targetResult"
                        placeholder="Chỉ tiêu, biên bản, danh sách hoặc sản phẩm cần nộp..."
                      ></textarea>
                    </td>

                    <!-- THAO TÁC & TẠO VIỆC -->
                    <td class="col-actions">
                      <div class="row-actions-cell">
                        <button
                          type="button"
                          class="btn-save-row tap-target"
                          [class.saved]="row.saved"
                          (click)="savePaperRow(row)"
                          title="Lưu dòng này"
                        >
                          <span class="material-symbols-outlined">{{ row.saved ? 'check_circle' : 'save' }}</span>
                          <span>{{ row.saved ? 'Đã lưu' : 'Lưu' }}</span>
                        </button>

                        @if (row.saved) {
                          <button
                            type="button"
                            class="btn-create-task-from-row tap-target"
                            (click)="createTaskFromPaperRow(row)"
                            title="Mở form giao việc với thông tin dòng này"
                          >
                            <span class="material-symbols-outlined">send</span>
                            <span>Tạo công việc từ dòng này →</span>
                          </button>
                        }

                        <button
                          type="button"
                          class="btn-delete-row tap-target"
                          (click)="deletePaperRow(row.id)"
                          title="Xóa dòng"
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

          <!-- PAPER ACTIONS BAR: + THÊM DÒNG -->
          <div class="paper-bottom-bar">
            <button type="button" class="btn-add-row tap-target" (click)="addPaperRow()">
              <span class="material-symbols-outlined">add_circle</span>
              <span>+ Thêm dòng kế hoạch tiếp theo</span>
            </button>

            <div class="bottom-bar-right">
              <span class="row-counter-text">Đang có {{ paperRows().length }} dòng kế hoạch</span>
              <button
                type="button"
                class="btn-batch-generate tap-target"
                (click)="batchGenerateTasks()"
                [disabled]="!canBatchGenerate()"
                title="Tạo nhanh tất cả công việc cho các dòng đã lưu"
              >
                <span class="material-symbols-outlined">bolt</span>
                <span>Tạo việc hàng loạt từ bảng</span>
              </button>
            </div>
          </div>
        </section>
      }

      <!-- MODAL: TẠO / SỬA KẾ HOẠCH -->
      @if (showPlanModal()) {
        <div class="modal-backdrop" (click)="closePlanModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-titles">
                <span class="modal-tag">{{ editingPlanId() ? 'CHỈNH SỬA' : 'TẠO MỚI' }}</span>
                <h3 class="modal-title">{{ editingPlanId() ? 'Cập nhật Kế hoạch' : 'Lập Kế hoạch mới' }}</h3>
              </div>
              <button type="button" class="btn-close-modal" (click)="closePlanModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Tên kế hoạch <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="planFormTitle"
                  placeholder="VD: Kế hoạch Tháng 10/2026 - Kiểm tra giữa học kỳ I"
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Cấp độ kế hoạch <span class="required">*</span></label>
                  <select class="form-select" [(ngModel)]="planFormLevel">
                    <option value="NAM">Kế hoạch Năm</option>
                    <option value="HOC_KY">Học kỳ</option>
                    <option value="QUY">Quý</option>
                    <option value="THANG">Tháng</option>
                    <option value="TUAN">Tuần</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Kế hoạch cấp trên (Cha)</label>
                  <select class="form-select" [(ngModel)]="planFormParentId">
                    <option [ngValue]="null">-- Cấp cao nhất (Không có cha) --</option>
                    @for (p of availableParentPlans(); track p.id) {
                      <option [value]="p.id">[{{ p.level }}] {{ p.title }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Ngày bắt đầu <span class="required">*</span></label>
                  <input type="date" class="form-input" [(ngModel)]="planFormStartDate" />
                </div>

                <div class="form-group">
                  <label class="form-label">Ngày kết thúc <span class="required">*</span></label>
                  <input type="date" class="form-input" [(ngModel)]="planFormEndDate" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Mô tả / Mục tiêu trọng tâm</label>
                <textarea
                  class="form-textarea"
                  rows="3"
                  [(ngModel)]="planFormDescription"
                  placeholder="Nội dung chi tiết mục tiêu, chỉ tiêu phấn đấu..."
                ></textarea>
              </div>

              @if (planModalError()) {
                <div class="modal-error-alert">
                  <span class="material-symbols-outlined">error</span>
                  <span>{{ planModalError() }}</span>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closePlanModal()">Hủy bỏ</button>
              <button
                type="button"
                class="btn-save"
                (click)="submitPlanForm()"
                [disabled]="isSubmittingPlan()"
              >
                @if (isSubmittingPlan()) {
                  <span class="material-symbols-outlined spin">progress_activity</span>
                  <span>Đang lưu...</span>
                } @else {
                  <span class="material-symbols-outlined">save</span>
                  <span>{{ editingPlanId() ? 'Lưu thay đổi' : 'Tạo kế hoạch' }}</span>
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: SAO CHÉP KẾ HOẠCH (KỲ TRƯỚC) -->
      @if (showDuplicateModal()) {
        <div class="modal-backdrop" (click)="closeDuplicateModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-titles">
                <span class="modal-tag">TIỆN ÍCH QUẢN LÝ</span>
                <h3 class="modal-title">Sao Chép Kế Hoạch (Kỳ Trước → Kỳ Mới)</h3>
              </div>
              <button type="button" class="btn-close-modal" (click)="closeDuplicateModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Chọn kế hoạch nguồn cần sao chép <span class="required">*</span></label>
                <select class="form-select" [(ngModel)]="duplicateSourceId">
                  <option value="">-- Chọn kế hoạch gốc --</option>
                  @for (p of allPlans(); track p.id) {
                    <option [value]="p.id">[{{ p.level }}] {{ p.title }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Tên kế hoạch mới <span class="required">*</span></label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="duplicateNewTitle"
                  placeholder="VD: Kế hoạch Học kỳ II (2026-2027)"
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Ngày bắt đầu mới <span class="required">*</span></label>
                  <input type="date" class="form-input" [(ngModel)]="duplicateNewStartDate" />
                </div>

                <div class="form-group">
                  <label class="form-label">Ngày kết thúc mới <span class="required">*</span></label>
                  <input type="date" class="form-input" [(ngModel)]="duplicateNewEndDate" />
                </div>
              </div>

              <div class="form-group checkbox-opt">
                <label class="checkbox-container">
                  <input type="checkbox" [(ngModel)]="duplicateIncludeTasks" />
                  <div class="checkbox-desc">
                    <strong>Sao chép toàn bộ danh mục công việc con</strong>
                    <p>Các công việc sẽ được sao chép và tự động chuyển về trạng thái 'Mới tạo' (NHAP/DA_GIAO).</p>
                  </div>
                </label>
              </div>

              @if (duplicateModalError()) {
                <div class="modal-error-alert">
                  <span class="material-symbols-outlined">error</span>
                  <span>{{ duplicateModalError() }}</span>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeDuplicateModal()">Hủy bỏ</button>
              <button
                type="button"
                class="btn-save"
                (click)="submitDuplicate()"
                [disabled]="isSubmittingDuplicate()"
              >
                @if (isSubmittingDuplicate()) {
                  <span class="material-symbols-outlined spin">progress_activity</span>
                  <span>Đang sao chép...</span>
                } @else {
                  <span class="material-symbols-outlined">content_copy</span>
                  <span>Bắt đầu sao chép</span>
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- WIZARD GIAO VIỆC (PROMPT 14) -->
      <app-task-create-wizard
        #taskWizard
        (taskCreated)="onTaskCreatedFromWizard()"
      ></app-task-create-wizard>
    </div>
  `,
  styles: [
    `
      .plans-page-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 4px 0 32px 0;
      }

      /* HEADER */
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;

        .header-left {
          .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: #EEF4FC;
            border-radius: 9999px;
            color: #1F3864;
            font-size: 0.75rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 6px;

            .material-symbols-outlined {
              font-size: 16px;
            }
          }

          .page-title {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 800;
            color: #1E293B;
          }

          .page-subtitle {
            margin: 4px 0 0 0;
            font-size: 0.9rem;
            color: #64748B;
          }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;

          .btn-primary,
          .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 18px;
            border-radius: 10px;
            font-size: 0.88rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .btn-primary {
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            box-shadow: 0 4px 12px rgba(31, 56, 100, 0.2);

            &:hover {
              background: #152644;
            }
          }

          .btn-secondary {
            background: #FFFFFF;
            color: #1F3864;
            border: 1.5px solid #CBD5E1;

            &:hover {
              background: #F8FAFC;
              border-color: #94A3B8;
            }
          }
        }
      }

      /* STATS SUMMARY GRID */
      .stats-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;

        .stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);

          .stat-icon-wrapper {
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

            &.icon-blue { background: #EEF4FC; color: #1F3864; }
            &.icon-indigo { background: #EEF2FF; color: #4F46E5; }
            &.icon-teal { background: #CCFBF1; color: #0F766E; }
            &.icon-green { background: #DCFCE7; color: #16A34A; }
          }

          .stat-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;

            .stat-label {
              font-size: 0.78rem;
              color: #64748B;
              font-weight: 600;
            }

            .stat-val {
              font-size: 1.05rem;
              font-weight: 800;
              color: #1E293B;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
        }
      }

      /* TABS BAR */
      .view-tabs-bar {
        display: flex;
        gap: 8px;
        border-bottom: 2px solid #E2E8F0;
        padding-bottom: 2px;

        .view-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: transparent;
          border: none;
          border-radius: 10px 10px 0 0;
          font-size: 0.92rem;
          font-weight: 700;
          color: #64748B;
          cursor: pointer;
          position: relative;
          transition: all 0.15s ease;

          .material-symbols-outlined {
            font-size: 20px;
          }

          &:hover {
            color: #1F3864;
            background: #F1F5F9;
          }

          &.active {
            color: #1F3864;
            background: #FFFFFF;

            &::after {
              content: '';
              position: absolute;
              bottom: -2px;
              left: 0;
              right: 0;
              height: 3px;
              background: #1F3864;
              border-radius: 3px 3px 0 0;
            }
          }
        }
      }

      /* TAB CONTENT PANEL */
      .tab-content-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* TREE CONTROLS BAR */
      .tree-controls-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 10px 16px;
        gap: 12px;
        flex-wrap: wrap;

        .controls-left {
          display: flex;
          align-items: center;
          gap: 10px;

          .filter-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #475569;
          }

          .root-select {
            padding: 6px 12px;
            border-radius: 8px;
            border: 1.5px solid #CBD5E1;
            font-size: 0.88rem;
            font-weight: 600;
            color: #1E293B;
            background: #F8FAFC;
          }
        }

        .controls-right {
          display: flex;
          align-items: center;
          gap: 8px;

          .btn-tool-text {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            background: #F1F5F9;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 600;
            color: #334155;
            cursor: pointer;

            &:hover {
              background: #E2E8F0;
            }

            &.reload-btn {
              padding: 6px 8px;
            }
          }
        }
      }

      /* PAPER LAYOUT PANEL (TAB 2) */
      .paper-layout-panel {
        background: #FFFFFF;
        border-radius: 16px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 18px;

        .paper-header-box {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px dashed #CBD5E1;
          flex-wrap: wrap;

          .paper-badge {
            display: inline-block;
            font-size: 0.72rem;
            font-weight: 800;
            color: #7C3AED;
            background: #F5F3FF;
            padding: 2px 8px;
            border-radius: 6px;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }

          .paper-title {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 800;
            color: #1E293B;
          }

          .paper-desc {
            margin: 4px 0 0 0;
            font-size: 0.85rem;
            color: #64748B;
            max-width: 650px;
          }

          .paper-target-plan-box {
            display: flex;
            flex-direction: column;
            gap: 4px;

            .field-label {
              font-size: 0.8rem;
              font-weight: 700;
              color: #475569;
            }

            .plan-target-select {
              padding: 8px 12px;
              border-radius: 8px;
              border: 1.5px solid #1F3864;
              background: #EEF4FC;
              font-weight: 700;
              font-size: 0.88rem;
              color: #1F3864;
              min-width: 260px;
            }
          }
        }
      }

      /* PAPER TABLE */
      .paper-table-wrapper {
        overflow-x: auto;
      }

      .paper-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.88rem;

        th {
          padding: 10px 12px;
          background: #F8FAFC;
          color: #1E293B;
          font-weight: 700;
          border-bottom: 2px solid #CBD5E1;
          border-top: 1px solid #E2E8F0;

          .th-content {
            display: flex;
            align-items: center;
            gap: 6px;

            .material-symbols-outlined {
              font-size: 18px;
              color: #1F3864;
            }
          }
        }

        td {
          padding: 12px 10px;
          border-bottom: 1px solid #E2E8F0;
          vertical-align: top;
        }

        .paper-row {
          transition: background-color 0.15s ease;

          &:hover {
            background-color: #FDFEFE;
          }

          &.is-saved {
            background-color: #F8FAF9;
          }
        }

        .col-stt {
          width: 44px;
          text-align: center;

          .stt-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #EEF4FC;
            color: #1F3864;
            font-weight: 800;
            font-size: 0.8rem;
          }
        }

        .col-time {
          width: 220px;

          .time-input-container {
            display: flex;
            flex-direction: column;
            gap: 6px;

            .paper-input {
              width: 100%;
              padding: 6px 10px;
              border: 1px solid #CBD5E1;
              border-radius: 6px;
              font-size: 0.85rem;
              font-weight: 600;
              color: #1E293B;
              box-sizing: border-box;

              &:focus {
                border-color: #1F3864;
                outline: none;
              }
            }

            .date-pickers-mini {
              display: flex;
              align-items: center;
              gap: 4px;

              .date-mini {
                width: 46%;
                padding: 4px 6px;
                border: 1px solid #E2E8F0;
                border-radius: 4px;
                font-size: 0.75rem;
                color: #475569;
              }

              .date-sep {
                font-size: 0.8rem;
                color: #94A3B8;
              }
            }
          }
        }

        .col-content {
          min-width: 260px;
        }

        .col-result {
          min-width: 240px;
        }

        .paper-textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          font-size: 0.85rem;
          font-family: inherit;
          color: #1E293B;
          resize: vertical;
          box-sizing: border-box;

          &:focus {
            border-color: #1F3864;
            outline: none;
            background: #FFFFFF;
          }
        }

        .col-actions {
          width: 220px;

          .row-actions-cell {
            display: flex;
            flex-direction: column;
            gap: 6px;

            .btn-save-row {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              padding: 6px 10px;
              background: #FFFFFF;
              border: 1px solid #CBD5E1;
              border-radius: 6px;
              font-size: 0.8rem;
              font-weight: 700;
              color: #475569;
              cursor: pointer;

              &.saved {
                background: #DCFCE7;
                border-color: #86EFAC;
                color: #16A34A;
              }

              .material-symbols-outlined {
                font-size: 16px;
              }
            }

            .btn-create-task-from-row {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              padding: 6px 10px;
              background: #1F3864;
              border: none;
              border-radius: 6px;
              font-size: 0.78rem;
              font-weight: 700;
              color: #FFFFFF;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(31, 56, 100, 0.2);
              animation: pulseBtn 1.5s infinite;

              .material-symbols-outlined {
                font-size: 15px;
              }

              &:hover {
                background: #152644;
              }
            }

            .btn-delete-row {
              align-self: flex-end;
              background: transparent;
              border: none;
              color: #94A3B8;
              cursor: pointer;
              padding: 2px;

              &:hover {
                color: #C62828;
              }
            }
          }
        }
      }

      /* PAPER BOTTOM BAR */
      .paper-bottom-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 14px;
        border-top: 1px solid #E2E8F0;
        gap: 12px;
        flex-wrap: wrap;

        .btn-add-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: #EEF4FC;
          color: #1F3864;
          border: 1.5px dashed #BFDBFE;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;

          &:hover {
            background: #DBEAFE;
            border-color: #1F3864;
          }
        }

        .bottom-bar-right {
          display: flex;
          align-items: center;
          gap: 14px;

          .row-counter-text {
            font-size: 0.85rem;
            color: #64748B;
            font-weight: 500;
          }

          .btn-batch-generate {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 18px;
            background: #2E7D32;
            color: #FFFFFF;
            border: none;
            border-radius: 10px;
            font-size: 0.88rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(46, 125, 50, 0.25);

            &:disabled {
              background: #94A3B8;
              cursor: not-allowed;
              box-shadow: none;
            }
          }
        }
      }

      /* MODALS */
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        z-index: 2100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: fadeIn 0.15s ease-out;
      }

      .modal-card {
        width: 100%;
        max-width: 580px;
        background: #FFFFFF;
        border-radius: 18px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: #F8FAFC;
        border-bottom: 1px solid #E2E8F0;

        .modal-tag {
          font-size: 0.72rem;
          font-weight: 800;
          color: #1F3864;
          letter-spacing: 0.5px;
        }

        .modal-title {
          margin: 2px 0 0 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: #1E293B;
        }

        .btn-close-modal {
          background: #EEF4FC;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1F3864;
          cursor: pointer;
        }
      }

      .modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-height: 75vh;
        overflow-y: auto;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .form-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;

          .required { color: #DC2626; }
        }

        .form-input,
        .form-select,
        .form-textarea {
          padding: 9px 12px;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          font-size: 0.88rem;
          font-family: inherit;
          color: #1E293B;

          &:focus {
            border-color: #1F3864;
            outline: none;
          }
        }
      }

      .form-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }
      }

      .checkbox-opt {
        .checkbox-container {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;

          .checkbox-desc {
            strong { font-size: 0.88rem; color: #1E293B; }
            p { margin: 2px 0 0 0; font-size: 0.8rem; color: #64748B; }
          }
        }
      }

      .modal-error-alert {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: #FEE2E2;
        border: 1px solid #FCA5A5;
        border-radius: 8px;
        color: #B91C1C;
        font-size: 0.85rem;
      }

      .modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 14px 20px;
        background: #F8FAFC;
        border-top: 1px solid #E2E8F0;
        gap: 10px;

        .btn-cancel {
          padding: 8px 16px;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }

        .btn-save {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 20px;
          background: #1F3864;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;

          &:hover:not(:disabled) {
            background: #152644;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 40px;
        color: #64748B;
        font-size: 0.92rem;
      }

      @keyframes pulseBtn {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class PlansComponent implements OnInit {
  private planService = inject(PlanService);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  @ViewChild('treeComponent') treeComponent?: PlanTreeComponent;
  @ViewChild('taskWizard') taskWizard?: TaskCreateWizardComponent;

  activeTab = signal<'tree' | 'paper'>('tree');
  isLoading = signal(false);

  // Trees & Plans Data
  treeNodes = signal<PlanTreeNode[]>([]);
  allPlans = signal<PlanItem[]>([]);
  selectedRootPlanId = '';

  // Stats computed
  totalPlanNodesCount = signal(0);
  totalTasksCount = signal(0);
  totalCompletedTasks = signal(0);
  averageProgress = signal(0);
  activeSchoolYearTitle = signal('Năm học 2026-2027');

  // Paper Table Data
  paperTargetPlanId: string | null = null;
  paperRows = signal<PaperPlanRow[]>([
    {
      id: '1',
      timeLabel: 'Tuần 1 (01/09 - 07/09)',
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      focusContent: 'Tổ chức Lễ Khai giảng năm học mới & Ổn định nền nếp dạy học tại 3 điểm trường.',
      targetResult: '100% học sinh tham dự, các phân hiệu phân công TKB và biên bản bàn giao CSVC hoàn tất.',
      saved: true,
    },
    {
      id: '2',
      timeLabel: 'Tuần 2 (08/09 - 14/09)',
      startDate: '2026-09-08',
      endDate: '2026-09-14',
      focusContent: 'Kiểm tra hệ thống phòng cháy chữa cháy, an toàn điện và phòng chống bão lũ mùa mưa.',
      targetResult: 'Biên bản kiểm tra CSVC tại Phân hiệu 1, Phân hiệu 2 có chữ ký Tổ trưởng.',
      saved: true,
    },
    {
      id: '3',
      timeLabel: 'Tuần 3 (15/09 - 21/09)',
      startDate: '2026-09-15',
      endDate: '2026-09-21',
      focusContent: 'Họp Tổ chuyên môn cụm liên phân hiệu: Thống nhất kế hoạch dạy học & đề kiểm tra.',
      targetResult: 'Kế hoạch bài dạy đã duyệt, biên bản sinh hoạt chuyên môn nộp BGH.',
      saved: false,
    },
  ]);

  // Plan Create/Edit Modal State
  showPlanModal = signal(false);
  editingPlanId = signal<string | null>(null);
  isSubmittingPlan = signal(false);
  planModalError = signal<string | null>(null);

  planFormTitle = '';
  planFormLevel: PlanLevel = 'THANG';
  planFormParentId: string | null = null;
  planFormStartDate = '';
  planFormEndDate = '';
  planFormDescription = '';

  // Duplicate Modal State
  showDuplicateModal = signal(false);
  duplicateSourceId = '';
  duplicateNewTitle = '';
  duplicateNewStartDate = '';
  duplicateNewEndDate = '';
  duplicateIncludeTasks = true;
  isSubmittingDuplicate = signal(false);
  duplicateModalError = signal<string | null>(null);

  ngOnInit() {
    this.loadAllPlans();
    this.loadTree();
  }

  loadTree() {
    this.isLoading.set(true);
    const rootId = this.selectedRootPlanId || undefined;
    this.planService.getPlanTree(rootId).subscribe({
      next: (nodes) => {
        this.treeNodes.set(nodes);
        this.computeStats(nodes);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  loadAllPlans() {
    this.planService.getAll().subscribe({
      next: (plans) => {
        this.allPlans.set(plans);
        const yearPlan = plans.find((p) => p.level === 'NAM');
        if (yearPlan) {
          this.activeSchoolYearTitle.set(yearPlan.title);
        }
        if (!this.paperTargetPlanId && plans.length > 0) {
          this.paperTargetPlanId = plans[0].id;
        }
      },
      error: () => {},
    });
  }

  private computeStats(nodes: PlanTreeNode[]) {
    let totalNodes = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let sumProgress = 0;

    const traverse = (list: PlanTreeNode[]) => {
      list.forEach((n) => {
        totalNodes++;
        totalTasks += n.taskCount || 0;
        completedTasks += n.completedTaskCount || 0;
        sumProgress += n.progressPercent || 0;
        if (n.children && n.children.length > 0) traverse(n.children);
      });
    };

    traverse(nodes);

    this.totalPlanNodesCount.set(totalNodes);
    this.totalTasksCount.set(totalTasks);
    this.totalCompletedTasks.set(completedTasks);
    this.averageProgress.set(totalNodes > 0 ? Math.round(sumProgress / totalNodes) : 0);
  }

  availableParentPlans = computed(() => {
    return this.allPlans().filter((p) => p.id !== this.editingPlanId());
  });

  // Paper Table Actions
  addPaperRow() {
    const currentCount = this.paperRows().length;
    const nextWeek = currentCount + 1;
    const newRow: PaperPlanRow = {
      id: Date.now().toString(),
      timeLabel: `Tuần ${nextWeek}`,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      focusContent: '',
      targetResult: '',
      saved: false,
    };
    this.paperRows.update((rows) => [...rows, newRow]);
  }

  deletePaperRow(id: string) {
    this.paperRows.update((rows) => rows.filter((r) => r.id !== id));
  }

  savePaperRow(row: PaperPlanRow) {
    if (!row.focusContent.trim()) {
      alert('Vui lòng nhập nội dung trọng tâm trước khi lưu dòng!');
      return;
    }
    row.saved = true;
  }

  createTaskFromPaperRow(row: PaperPlanRow) {
    if (!this.taskWizard) return;
    this.taskWizard.openWithData({
      title: row.focusContent,
      description: row.targetResult ? `Kết quả/Sản phẩm yêu cầu: ${row.targetResult}` : undefined,
      dueDate: row.endDate || undefined,
      planId: this.paperTargetPlanId || undefined,
    });
  }

  canBatchGenerate(): boolean {
    const savedRows = this.paperRows().filter((r) => r.saved && r.focusContent.trim());
    return savedRows.length > 0 && !!this.paperTargetPlanId;
  }

  batchGenerateTasks() {
    if (!this.paperTargetPlanId) {
      alert('Vui lòng chọn Kế hoạch mẹ ở góc trên trước khi tạo hàng loạt!');
      return;
    }

    const savedRows = this.paperRows().filter((r) => r.saved && r.focusContent.trim());
    if (savedRows.length === 0) {
      alert('Chưa có dòng kế hoạch nào được lưu để tạo việc!');
      return;
    }

    const currentUserId = this.authService.currentUser()?.id || '';

    const tasksData = savedRows.map((r) => ({
      title: r.focusContent,
      description: r.targetResult,
      startDate: r.startDate || undefined,
      dueDate: r.endDate || undefined,
      priority: 'TRUNG_BINH',
      chuTriId: currentUserId,
    }));

    this.planService.generateTasks(this.paperTargetPlanId, tasksData).subscribe({
      next: (tasks) => {
        alert(`Đã tạo thành công ${tasks.length} công việc từ bảng kế hoạch giấy!`);
        this.loadTree();
        this.loadAllPlans();
        this.activeTab.set('tree');
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể tạo việc hàng loạt. Vui lòng thử lại.');
      },
    });
  }

  // WIZARD CALLS
  openWizardForPlan(node: PlanTreeNode) {
    if (!this.taskWizard) return;
    const nodeEndStr = node.endDate ? new Date(node.endDate).toISOString().slice(0, 10) : '';
    this.taskWizard.openWithData({
      planId: node.id,
      dueDate: nodeEndStr,
      title: `[${node.title}] `,
    });
  }

  onTaskCreatedFromWizard() {
    this.loadTree();
    this.loadAllPlans();
  }

  // PLAN CRUD MODAL
  openCreatePlanModal() {
    this.editingPlanId.set(null);
    this.planFormTitle = '';
    this.planFormLevel = 'THANG';
    this.planFormParentId = this.selectedRootPlanId || null;
    this.planFormStartDate = new Date().toISOString().slice(0, 10);
    this.planFormEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    this.planFormDescription = '';
    this.planModalError.set(null);
    this.showPlanModal.set(true);
  }

  openAddChildPlanModal(parent: PlanTreeNode) {
    this.editingPlanId.set(null);
    this.planFormParentId = parent.id;
    this.planFormStartDate = parent.startDate ? new Date(parent.startDate).toISOString().slice(0, 10) : '';
    this.planFormEndDate = parent.endDate ? new Date(parent.endDate).toISOString().slice(0, 10) : '';
    this.planFormDescription = '';
    this.planModalError.set(null);

    // Pick appropriate child level
    switch (parent.level) {
      case 'NAM': this.planFormLevel = 'HOC_KY'; break;
      case 'HOC_KY': this.planFormLevel = 'THANG'; break;
      case 'QUY': this.planFormLevel = 'THANG'; break;
      case 'THANG': this.planFormLevel = 'TUAN'; break;
      default: this.planFormLevel = 'TUAN'; break;
    }

    this.planFormTitle = `Kế hoạch trực thuộc: ${parent.title}`;
    this.showPlanModal.set(true);
  }

  openEditPlanModal(node: PlanTreeNode) {
    this.editingPlanId.set(node.id);
    this.planFormTitle = node.title;
    this.planFormLevel = node.level;
    this.planFormParentId = node.parentPlanId || null;
    this.planFormStartDate = node.startDate ? new Date(node.startDate).toISOString().slice(0, 10) : '';
    this.planFormEndDate = node.endDate ? new Date(node.endDate).toISOString().slice(0, 10) : '';
    this.planFormDescription = node.description || '';
    this.planModalError.set(null);
    this.showPlanModal.set(true);
  }

  closePlanModal() {
    this.showPlanModal.set(false);
  }

  submitPlanForm() {
    if (!this.planFormTitle.trim()) {
      this.planModalError.set('Vui lòng nhập tên kế hoạch.');
      return;
    }
    if (!this.planFormStartDate || !this.planFormEndDate) {
      this.planModalError.set('Vui lòng chọn ngày bắt đầu và kết thúc.');
      return;
    }

    this.isSubmittingPlan.set(true);
    this.planModalError.set(null);

    const payload = {
      title: this.planFormTitle.trim(),
      description: this.planFormDescription.trim() || undefined,
      level: this.planFormLevel,
      parentPlanId: this.planFormParentId || null,
      startDate: this.planFormStartDate,
      endDate: this.planFormEndDate,
    };

    const editId = this.editingPlanId();
    if (editId) {
      this.planService.update(editId, payload).subscribe({
        next: () => {
          this.isSubmittingPlan.set(false);
          this.closePlanModal();
          this.loadTree();
          this.loadAllPlans();
        },
        error: (err) => {
          this.isSubmittingPlan.set(false);
          this.planModalError.set(err.error?.message || 'Cập nhật thất bại.');
        },
      });
    } else {
      this.planService.create(payload).subscribe({
        next: () => {
          this.isSubmittingPlan.set(false);
          this.closePlanModal();
          this.loadTree();
          this.loadAllPlans();
        },
        error: (err) => {
          this.isSubmittingPlan.set(false);
          this.planModalError.set(err.error?.message || 'Tạo kế hoạch thất bại.');
        },
      });
    }
  }

  // DUPLICATE MODAL
  openDuplicateModal() {
    this.duplicateSourceId = this.selectedRootPlanId || (this.allPlans().length > 0 ? this.allPlans()[0].id : '');
    this.duplicateNewTitle = '';
    this.duplicateNewStartDate = '';
    this.duplicateNewEndDate = '';
    this.duplicateIncludeTasks = true;
    this.duplicateModalError.set(null);
    this.showDuplicateModal.set(true);
  }

  closeDuplicateModal() {
    this.showDuplicateModal.set(false);
  }

  submitDuplicate() {
    if (!this.duplicateSourceId) {
      this.duplicateModalError.set('Vui lòng chọn kế hoạch nguồn để sao chép.');
      return;
    }
    if (!this.duplicateNewTitle.trim()) {
      this.duplicateModalError.set('Vui lòng nhập tên kế hoạch mới.');
      return;
    }

    this.isSubmittingDuplicate.set(true);
    this.duplicateModalError.set(null);

    const options = {
      newTitle: this.duplicateNewTitle.trim(),
      newStartDate: this.duplicateNewStartDate || undefined,
      newEndDate: this.duplicateNewEndDate || undefined,
      includeTasks: this.duplicateIncludeTasks,
    };

    this.planService.duplicate(this.duplicateSourceId, options).subscribe({
      next: () => {
        this.isSubmittingDuplicate.set(false);
        this.closeDuplicateModal();
        this.loadTree();
        this.loadAllPlans();
        alert('Đã sao chép kế hoạch thành công!');
      },
      error: (err) => {
        this.isSubmittingDuplicate.set(false);
        this.duplicateModalError.set(err.error?.message || 'Sao chép kế hoạch thất bại.');
      },
    });
  }
}
