import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TaskService } from '../../../core/services/task.service';
import { UserService } from '../../../core/services/user.service';
import { PlanService } from '../../../core/services/plan.service';
import { KpiFlexibleService } from '../../../core/services/kpi-flexible.service';
import { KpiAxis, EvaluationPeriod } from '../../../core/models/kpi-flexible.models';
import { PeoplePickerComponent } from '../people-picker/people-picker.component';
import { UserPickerItem, LocationItem } from '../../../core/models/user.models';
import { PlanItem } from '../../../core/models/plan.models';
import { TaskPriority, TaskAssignmentRole, TaskItem } from '../../../core/models/task.models';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-task-create-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, PeoplePickerComponent],
  template: `
    @if (isOpen()) {
      <div class="wizard-backdrop">
        <div class="wizard-modal-container">
          <!-- WIZARD TOP BAR -->
          <div class="wizard-header">
            <div class="wizard-header-titles">
              <span class="wizard-tag">QUY TRÌNH GIAO VIỆC RACI</span>
              <h2 class="wizard-title">{{ isFromPlan ? 'Tạo việc từ Kế hoạch' : 'Giao việc mới' }}</h2>
            </div>
            <button type="button" class="close-wizard-btn" (click)="close()" title="Đóng">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- STEPPER INDICATOR (3 BƯỚC) -->
          @if (!isSuccess()) {
            <div class="wizard-stepper">
              <div
                class="step-item"
                [class.active]="currentStep() === 1"
                [class.completed]="currentStep() > 1"
                (click)="goToStep(1)"
              >
                <div class="step-circle">
                  @if (currentStep() > 1) {
                    <span class="material-symbols-outlined check-icon">check</span>
                  } @else {
                    <span>1</span>
                  }
                </div>
                <span class="step-title">1. Thông tin việc</span>
              </div>

              <div class="step-line" [class.filled]="currentStep() > 1"></div>

              <div
                class="step-item"
                [class.active]="currentStep() === 2"
                [class.completed]="currentStep() > 2"
                (click)="goToStep(2)"
              >
                <div class="step-circle">
                  @if (currentStep() > 2) {
                    <span class="material-symbols-outlined check-icon">check</span>
                  } @else {
                    <span>2</span>
                  }
                </div>
                <span class="step-title">2. Phân công RACI</span>
              </div>

              <div class="step-line" [class.filled]="currentStep() > 2"></div>

              <div
                class="step-item"
                [class.active]="currentStep() === 3"
                (click)="goToStep(3)"
              >
                <div class="step-circle">3</div>
                <span class="step-title">3. Xác nhận</span>
              </div>
            </div>
          }

          <!-- WIZARD CONTENT BODY -->
          <div class="wizard-body">
            <!-- SUCCESS VIEW -->
            @if (isSuccess()) {
              <div class="success-view">
                <div class="success-icon-circle">
                  <span class="material-symbols-outlined">check_circle</span>
                </div>
                <h3 class="success-title">Giao việc thành công!</h3>
                <p class="success-desc">
                  Công việc <strong>"{{ createdTask()?.title }}"</strong> đã được phân công theo mô hình RACI và thông báo tới các cán bộ phụ trách.
                </p>

                <div class="success-task-summary">
                  <div class="sum-row">
                    <span class="sum-label">Mã công việc:</span>
                    <strong class="sum-val">{{ createdTask()?.code || 'CV-AUTO' }}</strong>
                  </div>
                  <div class="sum-row">
                    <span class="sum-label">Hạn hoàn thành:</span>
                    <strong class="sum-val">{{ taskDueDate || 'Không đặt hạn' }}</strong>
                  </div>
                  <div class="sum-row">
                    <span class="sum-label">Chủ trì thực hiện:</span>
                    <strong class="sum-val">{{ chuTriUser()?.fullName || 'Chưa rõ' }}</strong>
                  </div>
                </div>

                <div class="success-actions">
                  <button type="button" class="btn-primary tap-target" (click)="resetAndCreateNew()">
                    <span class="material-symbols-outlined">add_task</span>
                    <span>Giao việc khác</span>
                  </button>
                  <button type="button" class="btn-secondary tap-target" (click)="viewCreatedTask()">
                    <span class="material-symbols-outlined">visibility</span>
                    <span>Xem chi tiết việc vừa tạo</span>
                  </button>
                </div>
              </div>
            } @else {
              <!-- BƯỚC 1: THÔNG TIN CÔNG VIỆC -->
              @if (currentStep() === 1) {
                <div class="step-content">
                  <!-- TÊN CÔNG VIỆC -->
                  <div class="form-group">
                    <label class="form-label" for="taskTitle">
                      <span>Tên công việc</span>
                      <span class="required">*</span>
                    </label>
                    <input
                      id="taskTitle"
                      type="text"
                      class="text-input tap-target"
                      placeholder="Nhập tên nhiệm vụ cần giao (rõ ràng, súc tích)..."
                      [(ngModel)]="taskTitle"
                      required
                    />
                  </div>

                  <!-- MÔ TẢ & KẾT QUẢ CẦN NỘP -->
                  <div class="form-group">
                    <label class="form-label" for="taskDesc">
                      <span>Nội dung chi tiết & Kết quả / Sản phẩm cần đạt</span>
                    </label>
                    <textarea
                      id="taskDesc"
                      rows="3"
                      class="text-textarea tap-target"
                      placeholder="Mô tả cụ thể yêu cầu thực hiện, sản phẩm bàn giao, biên bản nghiệm thu..."
                      [(ngModel)]="taskDescription"
                    ></textarea>
                  </div>

                  <!-- GẮN VÀO KẾ HOẠCH NÀO (OPTIONAL) -->
                  <div class="form-group">
                    <label class="form-label">Gắn vào Kế hoạch (Tùy chọn)</label>
                    <select class="select-input tap-target" [(ngModel)]="taskPlanId">
                      <option [ngValue]="null">Công việc đột xuất / Phát sinh ngoài kế hoạch</option>
                      @for (p of availablePlans(); track p.id) {
                        <option [value]="p.id">[{{ p.level }}] {{ p.title }}</option>
                      }
                    </select>
                  </div>

                  <!-- 2 CỘT: HẠN HOÀN THÀNH & ĐIỂM TRƯỜNG -->
                  <div class="form-row-2">
                    <div class="form-group">
                      <label class="form-label" for="taskDueDate">
                        <span>Hạn hoàn thành</span>
                        <span class="required">*</span>
                      </label>
                      <div class="date-input-box">
                        <span class="material-symbols-outlined">event</span>
                        <input
                          id="taskDueDate"
                          type="date"
                          class="date-input tap-target"
                          [(ngModel)]="taskDueDate"
                          required
                        />
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Điểm trường thực hiện</label>
                      <select class="select-input tap-target" [(ngModel)]="taskLocationId">
                        <option value="">Toàn trường / Không cố định</option>
                        @for (loc of locations(); track loc.id) {
                          <option [value]="loc.id">{{ loc.name }}</option>
                        }
                      </select>
                    </div>
                  </div>

                  <!-- MỨC ĐỘ ƯU TIÊN (3 NÚT LỚN) -->
                  <div class="form-group">
                    <label class="form-label">Mức độ ưu tiên</label>
                    <div class="priority-buttons-row">
                      <button
                        type="button"
                        class="prio-btn prio-normal tap-target"
                        [class.active]="taskPriority === 'TRUNG_BINH'"
                        (click)="taskPriority = 'TRUNG_BINH'"
                      >
                        <span class="material-symbols-outlined">check_circle_outline</span>
                        <span>Bình thường</span>
                      </button>

                      <button
                        type="button"
                        class="prio-btn prio-high tap-target"
                        [class.active]="taskPriority === 'CAO'"
                        (click)="taskPriority = 'CAO'"
                      >
                        <span class="material-symbols-outlined">priority_high</span>
                        <span>Quan trọng</span>
                      </button>

                      <button
                        type="button"
                        class="prio-btn prio-urgent tap-target"
                        [class.active]="taskPriority === 'KHAN_CAP'"
                        (click)="taskPriority = 'KHAN_CAP'"
                      >
                        <span class="material-symbols-outlined">crisis_alert</span>
                        <span>Khẩn cấp</span>
                      </button>
                    </div>
                  </div>

                  <!-- YÊU CẦU MINH CHỨNG BẮT BUỘC -->
                  <div class="form-group checkbox-group">
                    <label class="checkbox-container tap-target">
                      <input type="checkbox" [(ngModel)]="taskRequireAttachment" />
                      <div class="checkbox-text">
                        <strong>Yêu cầu đính kèm tệp / ảnh minh chứng bắt buộc</strong>
                        <p class="checkbox-desc">
                          Người chủ trì phải nộp biên bản, hình ảnh hoặc báo cáo mới được phép gửi kiểm tra duyệt.
                        </p>
                      </div>
                    </label>
                  </div>

                  <!-- GẮN TRỤC KẾT QUẢ KPI (THANG 70 ĐIỂM SỞ GD&ĐT) -->
                  <div class="kpi-axis-card">
                    <div class="kpi-card-header">
                      <div class="kpi-header-left">
                        <span class="material-symbols-outlined icon-kpi">hub</span>
                        <div>
                          <strong>Gắn Trục Kết Quả KPI</strong>
                          <span class="kpi-sub-text">Xác định công việc này có tính điểm vào 70 điểm KPI của người phụ trách hay không</span>
                        </div>
                      </div>
                      <label class="kpi-toggle-wrap">
                        <input type="checkbox" [(ngModel)]="isKpiIncluded" />
                        <span class="kpi-toggle-text">{{ isKpiIncluded ? 'Tính KPI' : 'Không tính KPI' }}</span>
                      </label>
                    </div>

                    @if (isKpiIncluded) {
                      <div class="kpi-fields-body">
                        <div class="form-row-2">
                          <div class="form-group">
                            <label class="form-label">
                              <span>Kỳ đánh giá KPI</span>
                              <span class="auto-tag">Tự động tính theo ngày</span>
                            </label>
                            <div class="kpi-period-readonly-box">
                              <div class="period-left-icon">
                                <span class="material-symbols-outlined">event_note</span>
                              </div>
                              <div class="period-text-info">
                                <div class="period-title-row">
                                  <strong class="period-title">{{ currentQuarterLabel() }}</strong>
                                  <span class="period-year-badge">Năm học {{ currentSchoolYearLabel() }}</span>
                                </div>
                                <span class="period-sub">Khung thời gian: {{ currentQuarterDateRange() }}</span>
                              </div>
                              <div class="lock-indicator" title="Kỳ đánh giá được hệ thống tự động khóa cố định theo thời gian thực tế">
                                <span class="material-symbols-outlined">lock</span>
                                <span>Cố định</span>
                              </div>
                            </div>
                          </div>

                          <div class="form-group">
                            <label class="form-label">
                              <span>Trọng số điểm (Thang 70)</span>
                              <span class="required">*</span>
                            </label>
                            <input
                              type="number"
                              min="0.5"
                              max="70"
                              step="0.5"
                              class="text-input tap-target"
                              [(ngModel)]="kpiWeightScore"
                              placeholder="vd: 10"
                            />
                          </div>
                        </div>

                        <div class="form-group">
                          <label class="form-label">
                            <span>Trục kết quả chính (Gắn đánh giá KPI)</span>
                            <span class="required">*</span>
                          </label>
                          <select class="select-input tap-target primary-axis-select" [(ngModel)]="kpiPrimaryAxisId">
                            <option value="">-- Chọn Trục kết quả --</option>
                            @for (a of allowedAxes(); track a.id) {
                              <option [value]="a.id">{{ a.displayOrder }}. {{ a.name }}</option>
                            }
                          </select>
                        </div>

                        @if (selectedAxisIsChuyenMon()) {
                          <div class="form-group subtype-selection-box">
                            <label class="form-label">
                              <span>Phân loại nhiệm vụ Chuyên môn (Bắt buộc cho Giáo viên)</span>
                              <span class="required">*</span>
                            </label>
                            <div class="subtype-radio-grid">
                              <label class="sub-radio-card" [class.selected]="kpiTaskSubtype === 'gv_bo_mon'">
                                <input type="radio" name="wizardSubtype" value="gv_bo_mon" [(ngModel)]="kpiTaskSubtype" />
                                <div class="sub-radio-content">
                                  <strong>Giáo viên bộ môn</strong>
                                  <span>Giảng dạy, ra đề, chấm bài, bồi dưỡng học sinh</span>
                                </div>
                              </label>

                              <label class="sub-radio-card" [class.selected]="kpiTaskSubtype === 'gvcn'">
                                <input type="radio" name="wizardSubtype" value="gvcn" [(ngModel)]="kpiTaskSubtype" />
                                <div class="sub-radio-content">
                                  <strong>Giáo viên chủ nhiệm (GVCN)</strong>
                                  <span>Quản lý nề nếp lớp, họp CMHS, hoạt động trải nghiệm</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="non-kpi-banner">
                        <span class="material-symbols-outlined info-icon">info</span>
                        <span>Công việc này được lưu dưới dạng <strong>Việc sự vụ / Ban Giám hiệu phân công (Bán trú, dạy thêm...) / Thường kỳ</strong> và <strong>không tính điểm KPI cá nhân</strong>.</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- BƯỚC 2: PHÂN CÔNG RACI -->
              @if (currentStep() === 2) {
                <div class="step-content">
                  <div class="raci-guide-banner">
                    <span class="material-symbols-outlined">supervised_user_circle</span>
                    <p>
                      Mô hình RACI giúp rõ ràng trách nhiệm: <strong>Chủ trì</strong> (chịu trách nhiệm chính), 
                      <strong>Phối hợp</strong> (cùng làm), <strong>Kiểm tra</strong> (tổ trưởng/PHT nghiệm thu).
                    </p>
                  </div>

                  <!-- 1. CHỦ TRÌ (SINGLE PICKER) -->
                  <div class="raci-role-box box-chutri">
                    <div class="role-box-header">
                      <div class="role-title">
                        <span class="material-symbols-outlined role-icon icon-blue">person</span>
                        <span>1. Người Chủ trì chính</span>
                        <span class="required">* (Bắt buộc đúng 1 người)</span>
                      </div>
                    </div>
                    <app-people-picker
                      mode="single"
                      placeholder="Tìm và chọn giáo viên chủ trì..."
                      [(ngModel)]="selectedChuTriId"
                      (selectedUsersChange)="onChuTriChange($event)"
                    ></app-people-picker>
                  </div>

                  <!-- 2. PHỐI HỢP (MULTI PICKER) -->
                  <div class="raci-role-box">
                    <div class="role-box-header">
                      <div class="role-title">
                        <span class="material-symbols-outlined role-icon icon-purple">group</span>
                        <span>2. Cán bộ Phối hợp thực hiện</span>
                        <span class="optional">(Có thể chọn nhiều người)</span>
                      </div>
                    </div>
                    <app-people-picker
                      mode="multi"
                      placeholder="Tìm và thêm giáo viên phối hợp..."
                      [(ngModel)]="selectedPhoiHopIds"
                      (selectedUsersChange)="onPhoiHopChange($event)"
                    ></app-people-picker>
                  </div>

                  <!-- 3. KIỂM TRA (SINGLE PICKER) -->
                  <div class="raci-role-box">
                    <div class="role-box-header">
                      <div class="role-title">
                        <span class="material-symbols-outlined role-icon icon-amber">verified</span>
                        <span>3. Người Kiểm tra / Nghiệm thu kết quả</span>
                        <span class="optional">(Tổ trưởng hoặc PHT phụ trách)</span>
                      </div>
                    </div>
                    <app-people-picker
                      mode="single"
                      placeholder="Chọn người nghiệm thu kết quả..."
                      [(ngModel)]="selectedKiemTraId"
                      (selectedUsersChange)="onKiemTraChange($event)"
                    ></app-people-picker>
                  </div>
                </div>
              }

              <!-- BƯỚC 3: XÁC NHẬN & TỔNG HỢP -->
              @if (currentStep() === 3) {
                <div class="step-content">
                  <div class="confirm-summary-card">
                    <div class="summary-header">
                      <span class="summary-badge">TỔNG HỢP PHIẾU GIAO VIỆC</span>
                      <h3 class="summary-task-title">{{ taskTitle }}</h3>
                    </div>

                    <div class="summary-meta-grid">
                      <div class="sum-meta-item">
                        <span class="label">Mức ưu tiên:</span>
                        <span class="val prio-val" [ngClass]="'prio-' + taskPriority">
                          {{ getPriorityLabel(taskPriority) }}
                        </span>
                      </div>
                      <div class="sum-meta-item">
                        <span class="label">Hạn hoàn thành:</span>
                        <strong class="val">{{ taskDueDate || 'Chưa đặt hạn' }}</strong>
                      </div>
                      <div class="sum-meta-item">
                        <span class="label">Điểm trường:</span>
                        <span class="val">{{ getLocationName(taskLocationId) }}</span>
                      </div>
                      <div class="sum-meta-item">
                        <span class="label">Yêu cầu minh chứng:</span>
                        <span class="val">{{ taskRequireAttachment ? '✅ Bắt buộc có tệp/ảnh' : '⚪ Không bắt buộc' }}</span>
                      </div>
                    </div>

                    @if (taskDescription) {
                      <div class="summary-desc-box">
                        <span class="label">Nội dung yêu cầu:</span>
                        <p class="val-desc">{{ taskDescription }}</p>
                      </div>
                    }

                    <!-- KPI SUMMARY -->
                    <div class="sum-kpi-box" [class.kpi-active]="isKpiIncluded">
                      <div class="kpi-sum-header">
                        <span class="material-symbols-outlined icon-mini">{{ isKpiIncluded ? 'stars' : 'info' }}</span>
                        <strong>{{ isKpiIncluded ? 'GẮN VÀO ĐÁNH GIÁ KPI THEO TRỤC KẾT QUẢ' : 'CÔNG VIỆC THƯỜNG KỲ (KHÔNG TÍNH KPI)' }}</strong>
                      </div>
                      @if (isKpiIncluded) {
                        <div class="kpi-sum-row">
                          <span><strong>Kỳ đánh giá:</strong> {{ currentQuarterLabel() }} (Năm học {{ currentSchoolYearLabel() }})</span>
                          <span><strong>Trục kết quả:</strong> {{ getPrimaryAxisName() }}</span>
                          <span><strong>Trọng số:</strong> {{ kpiWeightScore }} điểm (thang 70)</span>
                          @if (selectedAxisIsChuyenMon()) {
                            <span><strong>Nhánh:</strong> {{ kpiTaskSubtype === 'gv_bo_mon' ? 'Giáo viên bộ môn' : 'Giáo viên chủ nhiệm (GVCN)' }}</span>
                          }
                        </div>
                      }
                    </div>

                    <!-- RACI SUMMARY -->
                    <div class="summary-raci-section">
                      <h4 class="raci-heading">Phân công trách nhiệm (RACI):</h4>

                      <div class="raci-row">
                        <span class="raci-tag tag-chutri">CHỦ TRÌ</span>
                        <div class="raci-person">
                          <strong>{{ chuTriUser()?.fullName || 'Chưa chọn chủ trì' }}</strong>
                          <span>({{ chuTriUser()?.title || 'Giáo viên' }} - {{ chuTriUser()?.primaryLocation?.name }})</span>
                        </div>
                      </div>

                      @if (phoiHopUsers().length > 0) {
                        <div class="raci-row">
                          <span class="raci-tag tag-phoihop">PHỐI HỢP</span>
                          <div class="raci-people-chips">
                            @for (u of phoiHopUsers(); track u.id) {
                              <span class="person-chip">{{ u.fullName }}</span>
                            }
                          </div>
                        </div>
                      }

                      @if (kiemTraUser()) {
                        <div class="raci-row">
                          <span class="raci-tag tag-kiemtra">KIỂM TRA</span>
                          <div class="raci-person">
                            <strong>{{ kiemTraUser()?.fullName }}</strong>
                            <span>({{ kiemTraUser()?.title || 'Tổ trưởng/PHT' }})</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            }

            @if (errorMessage()) {
              <div class="error-alert">
                <span class="material-symbols-outlined">error</span>
                <span>{{ errorMessage() }}</span>
              </div>
            }
          </div>

          <!-- WIZARD FOOTER CONTROLS -->
          @if (!isSuccess()) {
            <div class="wizard-footer">
              @if (currentStep() > 1) {
                <button type="button" class="btn-prev tap-target" (click)="prevStep()">
                  <span class="material-symbols-outlined">arrow_back</span>
                  <span>Quay lại</span>
                </button>
              }

              <div class="footer-spacer"></div>

              @if (currentStep() < 3) {
                <button type="button" class="btn-next tap-target" (click)="nextStep()">
                  <span>Tiếp tục</span>
                  <span class="material-symbols-outlined">arrow_forward</span>
                </button>
              } @else {
                <button
                  type="button"
                  class="btn-submit tap-target"
                  (click)="submitCreateTask()"
                  [disabled]="isSubmitting()"
                >
                  @if (isSubmitting()) {
                    <span class="material-symbols-outlined spin">progress_activity</span>
                    <span>Đang giao việc...</span>
                  } @else {
                    <span class="material-symbols-outlined">task_alt</span>
                    <span>XÁC NHẬN GIAO VIỆC NGAY</span>
                  }
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .wizard-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        z-index: 2200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: fadeIn 0.15s ease-out;

        @media (max-width: 768px) {
          padding: 0;
          align-items: flex-end;
        }
      }

      .wizard-modal-container {
        width: 100%;
        max-width: 680px;
        background: #FFFFFF;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);

        @media (max-width: 768px) {
          max-width: 100%;
          border-radius: 24px 24px 0 0;
          max-height: 94vh;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      }

      .wizard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        background: #F8FAFC;
        border-bottom: 1px solid #E2E8F0;

        .wizard-header-titles {
          .wizard-tag {
            font-size: 0.72rem;
            font-weight: 800;
            color: #1F3864;
            letter-spacing: 0.5px;
          }
          .wizard-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: #1E293B;
            margin-top: 2px;
          }
        }

        .close-wizard-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #EEF4FC;
          border: none;
          color: #1F3864;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
      }

      /* STEPPER */
      .wizard-stepper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 32px;
        background: #FFFFFF;
        border-bottom: 1px solid #F1F5F9;

        @media (max-width: 600px) {
          padding: 10px 16px;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;

          .step-circle {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #F1F5F9;
            color: #64748B;
            font-size: 0.85rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .step-title {
            font-size: 0.85rem;
            font-weight: 600;
            color: #64748B;

            @media (max-width: 600px) {
              display: none;
            }
          }

          &.active {
            .step-circle {
              background: #1F3864;
              color: #FFFFFF;
            }
            .step-title {
              color: #1F3864;
              font-weight: 700;
            }
          }

          &.completed {
            .step-circle {
              background: #2E7D32;
              color: #FFFFFF;
            }
          }
        }

        .step-line {
          flex: 1;
          height: 2px;
          background: #E2E8F0;
          margin: 0 12px;

          &.filled {
            background: #2E7D32;
          }
        }
      }

      .wizard-body {
        padding: 20px 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;

        @media (max-width: 600px) {
          padding: 16px;
        }
      }

      .step-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .form-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;

          .required { color: #EF4444; }
        }

        .text-input,
        .select-input,
        .text-textarea {
          width: 100%;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.92rem;
          outline: none;
          color: #1E293B;

          &:focus {
            border-color: #1F3864;
            box-shadow: 0 0 0 3px rgba(31, 56, 100, 0.1);
          }
        }

        .date-input-box {
          display: flex;
          align-items: center;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          padding: 0 10px;

          .material-symbols-outlined {
            color: #64748B;
            font-size: 20px;
          }

          .date-input {
            flex: 1;
            border: none;
            background: transparent;
            padding: 9px 6px;
            font-size: 0.92rem;
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

      .priority-buttons-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;

        .prio-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          border: 1.5px solid #E2E8F0;
          background: #F8FAFC;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;

          .material-symbols-outlined {
            font-size: 18px;
          }

          &.prio-normal.active {
            background: #EEF4FC;
            border-color: #1F3864;
            color: #1F3864;
          }

          &.prio-high.active {
            background: #FFEDD5;
            border-color: #F97316;
            color: #C2410C;
          }

          &.prio-urgent.active {
            background: #FEE2E2;
            border-color: #EF4444;
            color: #B91C1C;
          }
        }
      }

      .checkbox-container {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        cursor: pointer;

        input[type='checkbox'] {
          width: 18px;
          height: 18px;
          accent-color: #1F3864;
          margin-top: 2px;
        }

        .checkbox-text {
          font-size: 0.85rem;
          color: #1E293B;

          .checkbox-desc {
            font-size: 0.76rem;
            color: #64748B;
            margin-top: 2px;
          }
        }
      }

      /* KPI AXIS SECTION */
      .kpi-axis-card {
        background: #F8FAFC;
        border: 1.5px solid #CBD5E1;
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;

        .kpi-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .kpi-header-left {
            display: flex;
            align-items: center;
            gap: 10px;

            .icon-kpi {
              font-size: 26px;
              color: #0284C7;
            }

            strong {
              display: block;
              font-size: 0.92rem;
              color: #0F172A;
            }

            .kpi-sub-text {
              font-size: 0.76rem;
              color: #64748B;
            }
          }

          .kpi-toggle-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            color: #0284C7;
            cursor: pointer;
            background: #E0F2FE;
            padding: 6px 12px;
            border-radius: 20px;

            input[type='checkbox'] {
              accent-color: #0284C7;
              width: 16px;
              height: 16px;
            }
          }
        }

        .kpi-fields-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px dashed #CBD5E1;
        }

        .kpi-period-readonly-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: #F0FDF4;
          border: 1.5px solid #86EFAC;
          border-radius: 8px;
          color: #166534;

          .period-left-icon {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            background: #DCFCE7;
            color: #15803D;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            .material-symbols-outlined {
              font-size: 18px;
            }
          }

          .period-text-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;

            .period-title-row {
              display: flex;
              align-items: center;
              gap: 6px;
              flex-wrap: wrap;

              .period-title {
                font-size: 0.88rem;
                font-weight: 800;
                color: #14532D;
              }

              .period-year-badge {
                font-size: 0.7rem;
                font-weight: 700;
                background: #DCFCE7;
                color: #166534;
                padding: 1px 6px;
                border-radius: 4px;
                border: 1px solid #BBF7D0;
              }
            }

            .period-sub {
              font-size: 0.72rem;
              color: #4B5563;
            }
          }

          .lock-indicator {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 2px 6px;
            background: #E2E8F0;
            border-radius: 4px;
            font-size: 0.68rem;
            font-weight: 700;
            color: #475569;
            flex-shrink: 0;

            .material-symbols-outlined {
              font-size: 12px;
            }
          }
        }

        .auto-tag {
          font-size: 0.68rem;
          font-weight: 700;
          color: #059669;
          background: #ECFDF5;
          padding: 1px 6px;
          border-radius: 4px;
          margin-left: auto;
        }

        .subtype-selection-box {
          background: #EEF2FF;
          border: 1px solid #C7D2FE;
          border-radius: 10px;
          padding: 10px 12px;

          .subtype-radio-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 6px;

            @media (max-width: 600px) {
              grid-template-columns: 1fr;
            }

            .sub-radio-card {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              background: #FFFFFF;
              border: 1.5px solid #E2E8F0;
              border-radius: 8px;
              padding: 8px 10px;
              cursor: pointer;

              &.selected {
                border-color: #4F46E5;
                background: #F5F3FF;
              }

              .sub-radio-content {
                display: flex;
                flex-direction: column;
                font-size: 0.82rem;

                strong { color: #1E1B4B; }
                span { font-size: 0.74rem; color: #64748B; }
              }
            }
          }
        }

        .non-kpi-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: #475569;
          background: #F1F5F9;
          padding: 8px 12px;
          border-radius: 8px;

          .info-icon {
            font-size: 18px;
            color: #64748B;
            flex-shrink: 0;
          }
        }
      }

      .sum-kpi-box {
        background: #F1F5F9;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 0.85rem;

        &.kpi-active {
          background: #E0F2FE;
          border-color: #BAE6FD;
          color: #0369A1;
        }

        .kpi-sum-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
        }

        .kpi-sum-row {
          display: flex;
          gap: 16px;
          margin-top: 6px;
          font-size: 0.82rem;
          flex-wrap: wrap;
        }
      }

      /* RACI BOXES */
      .raci-guide-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: #EEF4FC;
        border-radius: 10px;
        color: #1F3864;
        font-size: 0.82rem;

        .material-symbols-outlined {
          font-size: 20px;
        }
      }

      .raci-role-box {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;

        &.box-chutri {
          border-color: #BFDBFE;
          background: #F8FAFC;
        }

        .role-box-header {
          .role-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9rem;
            font-weight: 700;
            color: #1E293B;

            .role-icon {
              font-size: 20px;
              &.icon-blue { color: #1F3864; }
              &.icon-purple { color: #7E22CE; }
              &.icon-amber { color: #D97706; }
            }

            .required { color: #EF4444; font-size: 0.78rem; }
            .optional { color: #64748B; font-size: 0.78rem; font-weight: 500; }
          }
        }
      }

      /* CONFIRM SUMMARY */
      .confirm-summary-card {
        background: #F8FAFC;
        border: 1.5px solid #CBD5E1;
        border-radius: 14px;
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;

        .summary-header {
          .summary-badge {
            font-size: 0.72rem;
            font-weight: 800;
            color: #1F3864;
          }
          .summary-task-title {
            font-size: 1.15rem;
            font-weight: 800;
            color: #1E293B;
            margin-top: 2px;
          }
        }

        .summary-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 10px;
          background: #FFFFFF;
          border-radius: 10px;
          border: 1px solid #E2E8F0;

          .sum-meta-item {
            font-size: 0.82rem;
            .label { color: #64748B; margin-right: 4px; }
            .val { font-weight: 600; color: #1E293B; }
          }
        }

        .summary-desc-box {
          font-size: 0.85rem;
          .label { font-weight: 700; color: #475569; }
          .val-desc { color: #1E293B; margin-top: 2px; }
        }

        .summary-raci-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid #E2E8F0;
          padding-top: 10px;

          .raci-heading {
            font-size: 0.85rem;
            font-weight: 700;
            color: #1F3864;
          }

          .raci-row {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.85rem;

            .raci-tag {
              font-size: 0.68rem;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;

              &.tag-chutri { background: #EEF4FC; color: #1E40AF; }
              &.tag-phoihop { background: #F3E8FF; color: #7E22CE; }
              &.tag-kiemtra { background: #FEF3C7; color: #92400E; }
            }

            .raci-people-chips {
              display: flex;
              gap: 4px;
              flex-wrap: wrap;

              .person-chip {
                background: #FFFFFF;
                border: 1px solid #CBD5E1;
                padding: 1px 8px;
                border-radius: 9999px;
                font-size: 0.78rem;
                font-weight: 600;
              }
            }
          }
        }
      }

      /* SUCCESS VIEW */
      .success-view {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 20px 10px;
        gap: 12px;

        .success-icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #DCFCE7;
          color: #16A34A;
          display: flex;
          align-items: center;
          justify-content: center;

          .material-symbols-outlined {
            font-size: 40px;
          }
        }

        .success-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #1E293B;
        }

        .success-desc {
          font-size: 0.88rem;
          color: #64748B;
          max-width: 480px;
        }

        .success-task-summary {
          width: 100%;
          max-width: 420px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;

          .sum-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.85rem;
            .sum-label { color: #64748B; }
            .sum-val { color: #1E293B; }
          }
        }

        .success-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;

          .btn-primary,
          .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 18px;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
          }

          .btn-primary {
            background: #2E7D32;
            color: #FFFFFF;
            border: none;
          }

          .btn-secondary {
            background: #EEF4FC;
            color: #1F3864;
            border: 1px solid #BFDBFE;
          }
        }
      }

      .error-alert {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: #FEE2E2;
        border: 1px solid #FCA5A5;
        border-radius: 10px;
        color: #B91C1C;
        font-size: 0.85rem;
      }

      /* WIZARD FOOTER */
      .wizard-footer {
        display: flex;
        align-items: center;
        padding: 14px 24px;
        background: #F8FAFC;
        border-top: 1px solid #E2E8F0;
        gap: 12px;

        .footer-spacer {
          flex: 1;
        }

        .btn-prev {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 10px;
          color: #475569;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .btn-next {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #1F3864;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;

          &:hover {
            background: #152644;
          }
        }

        .btn-submit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 22px;
          background: #2E7D32;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.92rem;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(46, 125, 50, 0.3);

          &:hover:not(:disabled) {
            background: #256628;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }

      @keyframes scaleUp {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
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
export class TaskCreateWizardComponent implements OnInit {
  private taskService = inject(TaskService);
  private userService = inject(UserService);
  private planService = inject(PlanService);
  private kpiService = inject(KpiFlexibleService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  @Input() set visible(val: boolean) {
    this.isOpen.set(val);
    if (val) {
      this.resetWizard();
    }
  }

  @Input() initialPlanId?: string | null;
  @Input() initialTitle?: string;
  @Input() initialDescription?: string;
  @Input() initialDueDate?: string;

  @Output() closed = new EventEmitter<void>();
  @Output() taskCreated = new EventEmitter<TaskItem>();

  isOpen = signal(false);
  currentStep = signal<1 | 2 | 3>(1);
  isSubmitting = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);

  createdTask = signal<TaskItem | null>(null);

  locations = signal<LocationItem[]>([]);
  availablePlans = signal<PlanItem[]>([]);
  periods = signal<EvaluationPeriod[]>([]);
  allowedAxes = signal<KpiAxis[]>([]);

  // Form Fields - Step 1
  taskTitle = '';
  taskDescription = '';
  taskPlanId: string | null = null;
  taskDueDate = '';
  taskLocationId = '';
  taskPriority: TaskPriority = 'TRUNG_BINH';
  taskRequireAttachment = false;

  // Form Fields - Step 1 (KPI Axis)
  isKpiIncluded = true;
  kpiPeriodId = '';
  kpiPrimaryAxisId = '';
  kpiTaskSubtype: 'gv_bo_mon' | 'gvcn' | '' = 'gv_bo_mon';
  kpiWeightScore: number = 10;

  // Form Fields - Step 2 (RACI)
  selectedChuTriId: string | null = null;
  chuTriUser = signal<UserPickerItem | null>(null);

  selectedPhoiHopIds: string[] = [];
  phoiHopUsers = signal<UserPickerItem[]>([]);

  selectedKiemTraId: string | null = null;
  kiemTraUser = signal<UserPickerItem | null>(null);

  isFromPlan = false;

  ngOnInit() {
    this.loadDataOptions();
  }

  openWithData(data: {
    title?: string;
    description?: string;
    planId?: string;
    dueDate?: string;
    locationId?: string;
  }) {
    this.resetWizard();
    this.isFromPlan = !!data.planId;
    if (data.title) this.taskTitle = data.title;
    if (data.description) this.taskDescription = data.description;
    if (data.planId) this.taskPlanId = data.planId;
    if (data.dueDate) this.taskDueDate = data.dueDate;
    if (data.locationId) this.taskLocationId = data.locationId;
    this.isOpen.set(true);
  }

  private loadDataOptions() {
    this.userService.getLocations().subscribe({
      next: (locs) => this.locations.set(locs),
      error: () => {},
    });

    this.planService.getAll().subscribe({
      next: (plans) => this.availablePlans.set(plans),
      error: () => {},
    });

    this.kpiService.getPeriods().subscribe({
      next: (pList) => {
        this.periods.set(pList);
        this.autoAssignCurrentKpiPeriod(pList);
      },
      error: () => {},
    });

    this.kpiService.getAllowedAxes().subscribe({
      next: (axes) => {
        this.allowedAxes.set(axes);
        if (axes.length > 0 && !this.kpiPrimaryAxisId) {
          const chuyenMon = axes.find((a) => a.code === 'chuyen_mon') || axes[0];
          this.kpiPrimaryAxisId = chuyenMon.id;
        }
      },
      error: () => {},
    });
  }

  calculateCurrentKpiPeriod() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1 - 12
    const year = now.getFullYear();

    let quarterIndex = 1;
    let quarterName = '';
    let quarterCode = '';
    let schoolYear = '';
    let dateRange = '';

    if (month >= 1 && month <= 3) {
      quarterIndex = 1;
      quarterName = `Quý I/${year}`;
      quarterCode = `QUY_1_${year}`;
      schoolYear = `${year - 1}-${year}`;
      dateRange = `01/01/${year} - 31/03/${year}`;
    } else if (month >= 4 && month <= 6) {
      quarterIndex = 2;
      quarterName = `Quý II/${year}`;
      quarterCode = `QUY_2_${year}`;
      schoolYear = `${year - 1}-${year}`;
      dateRange = `01/04/${year} - 30/06/${year}`;
    } else if (month >= 7 && month <= 9) {
      quarterIndex = 3;
      quarterName = `Quý III/${year}`;
      quarterCode = `QUY_3_${year}`;
      schoolYear = `${year}-${year + 1}`;
      dateRange = `01/07/${year} - 30/09/${year}`;
    } else {
      quarterIndex = 4;
      quarterName = `Quý IV/${year}`;
      quarterCode = `QUY_4_${year}`;
      schoolYear = `${year}-${year + 1}`;
      dateRange = `01/10/${year} - 31/12/${year}`;
    }

    return { quarterIndex, quarterName, quarterCode, schoolYear, dateRange };
  }

  currentQuarterInfo = computed(() => {
    return this.calculateCurrentKpiPeriod();
  });

  currentQuarterLabel = computed(() => {
    return this.currentQuarterInfo().quarterName;
  });

  currentSchoolYearLabel = computed(() => {
    return this.currentQuarterInfo().schoolYear;
  });

  currentQuarterDateRange = computed(() => {
    return this.currentQuarterInfo().dateRange;
  });

  private autoAssignCurrentKpiPeriod(pList?: EvaluationPeriod[]) {
    const list = pList || this.periods();
    const info = this.currentQuarterInfo();

    // 1. Match by code (e.g. QUY_3_2026)
    let matching = list.find((p) => p.code === info.quarterCode);

    // 2. Match by name and schoolYear
    if (!matching) {
      matching = list.find((p) => p.name === info.quarterName && p.schoolYear === info.schoolYear);
    }

    // 3. Match by date range covering today
    if (!matching) {
      const now = new Date();
      matching = list.find((p) => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return start <= now && end >= now;
      });
    }

    // 4. Fallback
    if (matching) {
      this.kpiPeriodId = matching.id;
    } else if (list.length > 0) {
      const openPeriod = list.find((p) => p.status === 'open') || list[0];
      this.kpiPeriodId = openPeriod.id;
    } else {
      this.kpiPeriodId = info.quarterCode;
    }
  }

  selectedAxisIsChuyenMon(): boolean {
    if (!this.kpiPrimaryAxisId) return false;
    const axis = this.allowedAxes().find((a) => a.id === this.kpiPrimaryAxisId);
    return axis?.code === 'chuyen_mon';
  }

  getPrimaryAxisName(): string {
    if (!this.kpiPrimaryAxisId) return 'Chưa chọn trục';
    const axis = this.allowedAxes().find((a) => a.id === this.kpiPrimaryAxisId);
    return axis ? `${axis.displayOrder}. ${axis.name}` : 'Chưa chọn trục';
  }


  goToStep(step: 1 | 2 | 3) {
    if (step === 2 && !this.validateStep1()) return;
    if (step === 3 && (!this.validateStep1() || !this.validateStep2())) return;
    this.currentStep.set(step);
  }

  nextStep() {
    if (this.currentStep() === 1) {
      if (!this.validateStep1()) return;
      this.currentStep.set(2);
    } else if (this.currentStep() === 2) {
      if (!this.validateStep2()) return;
      this.currentStep.set(3);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => (s - 1) as any);
    }
  }

  private validateStep1(): boolean {
    this.errorMessage.set(null);
    if (!this.taskTitle.trim()) {
      this.errorMessage.set('Vui lòng nhập tên công việc cần giao.');
      return false;
    }
    if (!this.taskDueDate) {
      this.errorMessage.set('Vui lòng chọn hạn hoàn thành công việc.');
      return false;
    }
    if (this.isKpiIncluded) {
      if (!this.kpiPeriodId) {
        this.autoAssignCurrentKpiPeriod();
      }
      if (!this.kpiPrimaryAxisId) {
        this.errorMessage.set('Vui lòng chọn Trục kết quả KPI chính.');
        return false;
      }
      if (!this.kpiWeightScore || this.kpiWeightScore <= 0) {
        this.errorMessage.set('Vui lòng nhập trọng số điểm KPI hợp lệ (0.5 - 70).');
        return false;
      }
      if (this.selectedAxisIsChuyenMon() && !this.kpiTaskSubtype) {
        this.errorMessage.set('Vui lòng chọn phân loại nhiệm vụ Chuyên môn (Giáo viên bộ môn hoặc GVCN).');
        return false;
      }
    }
    return true;
  }

  private validateStep2(): boolean {
    this.errorMessage.set(null);
    if (!this.selectedChuTriId) {
      this.errorMessage.set('Bắt buộc phải chọn đúng 1 người chịu trách nhiệm CHỦ TRÌ.');
      return false;
    }
    return true;
  }

  onChuTriChange(users: UserPickerItem[]) {
    this.chuTriUser.set(users.length > 0 ? users[0] : null);
    this.selectedChuTriId = users.length > 0 ? users[0].id : null;
  }

  onPhoiHopChange(users: UserPickerItem[]) {
    this.phoiHopUsers.set(users);
    this.selectedPhoiHopIds = users.map((u) => u.id);
  }

  onKiemTraChange(users: UserPickerItem[]) {
    this.kiemTraUser.set(users.length > 0 ? users[0] : null);
    this.selectedKiemTraId = users.length > 0 ? users[0].id : null;
  }

  submitCreateTask() {
    if (!this.validateStep1() || !this.validateStep2()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const assignments: Array<{ userId: string; role: TaskAssignmentRole; note?: string }> = [
      { userId: this.selectedChuTriId!, role: 'CHU_TRI', note: 'Chịu trách nhiệm chính' },
    ];

    (this.selectedPhoiHopIds || []).forEach((uid) => {
      assignments.push({ userId: uid, role: 'PHOI_HOP', note: 'Phối hợp thực hiện' });
    });

    if (this.selectedKiemTraId) {
      assignments.push({ userId: this.selectedKiemTraId!, role: 'KIEM_TRA', note: 'Kiểm tra chất lượng' });
    }

    const payload: any = {
      title: this.taskTitle.trim(),
      description: this.taskDescription.trim() || undefined,
      planId: this.taskPlanId || undefined,
      locationId: this.taskLocationId || undefined,
      priority: this.taskPriority,
      dueDate: this.taskDueDate,
      requireAttachment: this.taskRequireAttachment,
      assignments,
      periodId: this.isKpiIncluded ? this.kpiPeriodId : undefined,
      primaryAxisId: this.isKpiIncluded ? this.kpiPrimaryAxisId : undefined,
      taskSubtype: this.isKpiIncluded && this.selectedAxisIsChuyenMon() ? this.kpiTaskSubtype : undefined,
      weightScore: this.isKpiIncluded ? Number(this.kpiWeightScore) : undefined,
    };

    this.taskService.createTask(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.createdTask.set(created);
        this.isSuccess.set(true);
        this.taskCreated.emit(created);

        const currentUser = this.authService.currentUser();
        this.notificationService.emitNotification({
          title: 'Giao nhiệm vụ mới',
          content: `${currentUser?.fullName || 'Ban Giám hiệu'} đã phân công nhiệm vụ "${created.title}". Hạn: ${created.dueDate}.`,
          type: 'GIAO_VIEC',
          taskId: created.id,
          taskCode: created.code,
          senderName: currentUser?.fullName,
          senderAvatar: currentUser?.avatarUrl,
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Giao việc không thành công. Vui lòng thử lại.');
      },
    });
  }

  resetAndCreateNew() {
    this.resetWizard();
    this.currentStep.set(1);
  }

  viewCreatedTask() {
    const task = this.createdTask();
    this.close();
    if (task) {
      this.router.navigate(['/tasks'], { queryParams: { taskId: task.id } });
    }
  }

  close() {
    this.isOpen.set(false);
    this.closed.emit();
  }

  private resetWizard() {
    this.currentStep.set(1);
    this.isSuccess.set(false);
    this.isSubmitting.set(false);
    this.errorMessage.set(null);
    this.createdTask.set(null);

    this.taskTitle = '';
    this.taskDescription = '';
    this.taskPlanId = null;
    this.taskDueDate = '';
    this.taskLocationId = '';
    this.taskPriority = 'TRUNG_BINH';
    this.taskRequireAttachment = false;

    // Reset KPI fields
    this.isKpiIncluded = true;
    this.autoAssignCurrentKpiPeriod();
    const chuyenMon = this.allowedAxes().find((a) => a.code === 'chuyen_mon') || this.allowedAxes()[0];
    this.kpiPrimaryAxisId = chuyenMon ? chuyenMon.id : '';
    this.kpiTaskSubtype = 'gv_bo_mon';
    this.kpiWeightScore = 10;

    this.selectedChuTriId = null;
    this.chuTriUser.set(null);
    this.selectedPhoiHopIds = [];
    this.phoiHopUsers.set([]);
    this.selectedKiemTraId = null;
    this.kiemTraUser.set(null);
  }

  getPriorityLabel(prio: TaskPriority): string {
    switch (prio) {
      case 'KHAN_CAP': return 'Khẩn cấp';
      case 'CAO': return 'Quan trọng';
      default: return 'Bình thường';
    }
  }

  getLocationName(id?: string): string {
    if (!id) return 'Toàn trường';
    const loc = this.locations().find((l) => l.id === id);
    return loc ? loc.name : 'Toàn trường';
  }
}
