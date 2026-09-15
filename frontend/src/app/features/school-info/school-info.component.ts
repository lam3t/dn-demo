import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SchoolService } from '../../core/services/school.service';
import { AuthService } from '../../core/services/auth.service';
import { SchoolInfo, SchoolStatsDetail } from '../../core/models/school.models';

@Component({
  selector: 'app-school-info',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="school-info-container">
      <!-- Top Banner Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb">
            <span class="material-symbols-outlined icon-breadcrumb">school</span>
            <span>Hồ sơ & Quy mô Nhà trường</span>
            <span class="separator">/</span>
            <span class="active">Năm học {{ school()?.schoolYear || '2026 - 2027' }}</span>
          </div>
          <h1 class="page-title">
            {{ school()?.name || 'Chưa cập nhật tên trường' }}
            <span class="status-badge live-badge">
              {{ (school()?.locations?.length || 1) > 1 ? ('Trường có ' + school()?.locations?.length + ' điểm trường / cơ sở') : 'Cơ sở chính' }}
            </span>
          </h1>
          <p class="page-subtitle">
            Hiệu trưởng: <strong>{{ school()?.principalName || 'Chưa cập nhật' }}</strong> • 
            Địa chỉ: {{ school()?.address || 'Chưa cập nhật địa chỉ' }} • 
            Hotline: <a [href]="school()?.phone ? ('tel:' + school()?.phone) : 'javascript:void(0)'" class="phone-link">{{ school()?.phone || 'Chưa cập nhật' }}</a>
          </p>
        </div>

        <div class="header-actions">
          <button *ngIf="canEdit()" (click)="openEditModal()" class="btn-primary">
            <span class="material-symbols-outlined btn-icon">edit_note</span>
            <span>Cập nhật thông tin</span>
          </button>
          <button (click)="loadSchoolData()" class="btn-secondary" title="Làm mới dữ liệu">
            <span class="material-symbols-outlined btn-icon" [class.spinning]="loading()">refresh</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div *ngIf="loading()" class="loading-state">
        <div class="spinner"></div>
        <p>Đang tải thông tin quy mô trường học...</p>
      </div>

      <div *ngIf="!loading() && school()" class="content-wrapper">
        <!-- 4 Stat Metric Cards -->
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="stat-icon-wrapper">
              <span class="material-symbols-outlined card-icon">groups</span>
            </div>
            <div class="stat-info">
              <span class="stat-label">Tổng số Học sinh</span>
              <div class="stat-value">
                {{ (school()?.totalStudents || 0) | number }}
                <span class="stat-unit">học sinh</span>
              </div>
              <div class="stat-sub">
                <span class="badge female-badge">
                  <span class="material-symbols-outlined mini-icon">female</span>
                  {{ (school()?.totalFemaleStudents || 0) | number }} Nữ ({{ getFemalePercent() }}%)
                </span>
                <span class="avg-badge">~{{ getAvgPerClass() }} HS/lớp</span>
              </div>
            </div>
          </div>

          <div class="stat-card green">
            <div class="stat-icon-wrapper">
              <span class="material-symbols-outlined card-icon">class</span>
            </div>
            <div class="stat-info">
              <span class="stat-label">Tổng số Lớp học</span>
              <div class="stat-value">
                {{ school()?.totalClasses || 0 }}
                <span class="stat-unit">lớp</span>
              </div>
              <div class="stat-sub">
                <span class="text-muted">Niên khóa {{ school()?.schoolYear || '2026-2027' }}</span>
              </div>
            </div>
          </div>

          <div class="stat-card purple">
            <div class="stat-icon-wrapper">
              <span class="material-symbols-outlined card-icon">badge</span>
            </div>
            <div class="stat-info">
              <span class="stat-label">Cán bộ • Giáo viên • NV</span>
              <div class="stat-value">
                {{ school()?.totalStaff || 0 }}
                <span class="stat-unit">nhân sự</span>
              </div>
              <div class="stat-sub">
                <span class="text-muted">{{ (school()?.locations?.length || 0) }} Điểm trường • {{ (school()?.totalOrgUnits || 0) }} Tổ/Phòng ban</span>
              </div>
            </div>
          </div>

          <div class="stat-card amber">
            <div class="stat-icon-wrapper">
              <span class="material-symbols-outlined card-icon">domain</span>
            </div>
            <div class="stat-info">
              <span class="stat-label">Điểm trường / Phân hiệu</span>
              <div class="stat-value">
                {{ school()?.locations?.length || 1 }}
                <span class="stat-unit">cơ sở</span>
              </div>
              <div class="stat-sub">
                <span class="text-muted">{{ (school()?.locations?.length || 1) }} cơ sở trực thuộc</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Campus Cards Section -->
        <div class="section-title-row">
          <h2 class="section-title">
            <span class="material-symbols-outlined title-icon">apartment</span>
            Quy mô & Cơ sở vật chất Điểm trường (Năm học {{ school()?.schoolYear || '2026-2027' }})
          </h2>
          <span class="section-desc">Nguyên tắc một kế hoạch giáo dục - một chuẩn kiểm tra đánh giá - dữ liệu dùng chung</span>
        </div>

        <div class="locations-grid">
          @if (!school()?.locations || school()?.locations?.length === 0) {
            <div class="empty-loc-card">
              <span class="material-symbols-outlined text-muted">domain</span>
              <p>Chưa có thông tin phân hiệu. Trường học đang hoạt động với điểm trường chính.</p>
            </div>
          } @else {
            <div *ngFor="let loc of school()?.locations" class="location-card" [class.main-loc]="loc.isMain">
              <div class="loc-header">
                <div class="loc-title-group">
                  <span class="loc-badge" [class.main]="loc.isMain">
                    {{ loc.isMain ? 'ĐIỂM CHÍNH (TRUNG TÂM)' : 'PHÂN HIỆU VỆ TINH' }}
                  </span>
                  <h3 class="loc-name">{{ loc.name }}</h3>
                </div>
                <div class="loc-code">{{ loc.code }}</div>
              </div>

              <div class="loc-body">
                <div class="loc-stat-row">
                  <div class="loc-stat-item">
                    <span class="num">{{ loc.classCount || 0 }}</span>
                    <span class="lbl">Lớp học</span>
                  </div>
                  <div class="loc-stat-item">
                    <span class="num">{{ (loc.studentCount || 0) | number }}</span>
                    <span class="lbl">Học sinh</span>
                  </div>
                  <div class="loc-stat-item">
                    <span class="num">{{ (loc.femaleStudentCount || 0) | number }}</span>
                    <span class="lbl">Học sinh Nữ</span>
                  </div>
                  <div class="loc-stat-item">
                    <span class="num">{{ loc.userCount || 0 }}</span>
                    <span class="lbl">Cán bộ GV</span>
                  </div>
                </div>

                <div class="loc-info-list">
                  <div class="info-row">
                    <span class="material-symbols-outlined row-icon">location_on</span>
                    <span class="text">{{ loc.address || school()?.address || 'Chưa cập nhật địa chỉ' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="material-symbols-outlined row-icon">call</span>
                    <a [href]="loc.phone ? ('tel:' + loc.phone) : 'javascript:void(0)'" class="phone-link">{{ loc.phone || school()?.phone || 'Chưa cập nhật' }}</a>
                    <span class="direct-call-badge">Liên hệ trực tiếp</span>
                  </div>
                </div>

                @if (school()?.totalStudents && (loc.studentCount || 0) > 0) {
                  <div class="loc-progress-bar">
                    <div class="progress-label">
                      <span>Tỷ trọng học sinh toàn trường:</span>
                      <strong>{{ getLocRatio(loc.studentCount) }}%</strong>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" [style.width.%]="getLocRatio(loc.studentCount)"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Grade Matrix Table Section (Only if available) -->
        @if (school()?.gradeMatrix && school()!.gradeMatrix!.length > 0) {
          <div class="section-card">
            <div class="card-header">
              <div>
                <h3 class="card-title">
                  <span class="material-symbols-outlined title-icon">table_chart</span>
                  Ma trận Sĩ số & Phân bố Lớp học theo từng Khối
                </h3>
                <p class="card-subtitle">
                  Kế hoạch giáo dục và quy mô phân bổ học sinh chi tiết
                </p>
              </div>
              <div class="table-tag">Bình quân toàn trường: {{ getAvgPerClass() }} HS/lớp</div>
            </div>

            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="text-left">Điểm trường</th>
                    <th class="text-center">Khối 6</th>
                    <th class="text-center">Khối 7</th>
                    <th class="text-center">Khối 8</th>
                    <th class="text-center">Khối 9</th>
                    <th class="text-center highlight-col">Tổng cộng</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let gm of school()?.gradeMatrix">
                    <td class="font-bold">{{ gm.locationName || gm.locationId }}</td>
                    <td class="text-center">{{ gm.grade6?.classes || 0 }} lớp • {{ gm.grade6?.students || 0 }} HS</td>
                    <td class="text-center">{{ gm.grade7?.classes || 0 }} lớp • {{ gm.grade7?.students || 0 }} HS</td>
                    <td class="text-center">{{ gm.grade8?.classes || 0 }} lớp • {{ gm.grade8?.students || 0 }} HS</td>
                    <td class="text-center">{{ gm.grade9?.classes || 0 }} lớp • {{ gm.grade9?.students || 0 }} HS</td>
                    <td class="text-center highlight-col font-bold">{{ gm.total?.classes || 0 }} lớp • {{ gm.total?.students || 0 }} HS</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Management & School Summary Section -->
        <div class="legal-info-grid">
          <div class="legal-card">
            <h4 class="legal-title">
              <span class="material-symbols-outlined title-icon text-blue">verified_user</span>
              Ban Giám hiệu & Lãnh đạo Nhà trường
            </h4>
            <ul class="legal-list">
              <li>
                <strong>Hiệu trưởng:</strong> <span>{{ school()?.principalName || 'Chưa cập nhật' }}</span>
              </li>
              <li>
                <strong>Điện thoại liên hệ:</strong> <span>{{ school()?.phone || 'Chưa cập nhật' }}</span>
              </li>
              <li>
                <strong>Email chính thức:</strong> <span>{{ school()?.email || 'Chưa cập nhật' }}</span>
              </li>
              <li>
                <strong>Website trường:</strong> <span>{{ school()?.website || 'Chưa cập nhật' }}</span>
              </li>
            </ul>
          </div>

          <div class="legal-card">
            <h4 class="legal-title">
              <span class="material-symbols-outlined title-icon text-blue">description</span>
              Thông tin Hồ sơ & Đặc điểm Tình hình
            </h4>
            <div class="legal-list">
              <p class="text-sm text-slate-700">
                {{ school()?.description || 'Chưa có thông tin mô tả chi tiết về trường. Nhấn "Cập nhật thông tin" để bổ sung.' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit School Info Modal -->
      <div *ngIf="showEditModal()" class="modal-overlay" (click)="closeEditModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined modal-icon">edit_square</span>
              <div>
                <h3 class="modal-title">Cập nhật Thông tin & Quy mô Trường học</h3>
                <p class="modal-subtitle">Dữ liệu được đồng bộ trực tiếp vào hệ thống quản lý điều hành</p>
              </div>
            </div>
            <button class="close-btn" (click)="closeEditModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="editForm" (ngSubmit)="saveSchoolInfo()" class="modal-body">
            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">Tên trường <span class="req">*</span></label>
                <input type="text" formControlName="name" class="form-input" placeholder="Ví dụ: Trường TH và THCS Phước Tân" />
              </div>
            </div>

            <div class="form-row two-col">
              <div class="form-group">
                <label class="form-label">Hiệu trưởng <span class="req">*</span></label>
                <input type="text" formControlName="principalName" class="form-input" placeholder="Ví dụ: Phạm Thị Nam" />
              </div>
              <div class="form-group">
                <label class="form-label">Năm học <span class="req">*</span></label>
                <input type="text" formControlName="schoolYear" class="form-input" placeholder="2026 - 2027" />
              </div>
            </div>

            <div class="form-row three-col">
              <div class="form-group">
                <label class="form-label">Tổng số Học sinh <span class="req">*</span></label>
                <input type="number" formControlName="totalStudents" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Số Học sinh Nữ</label>
                <input type="number" formControlName="totalFemaleStudents" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Tổng số Lớp <span class="req">*</span></label>
                <input type="number" formControlName="totalClasses" class="form-input" />
              </div>
            </div>

            <div class="form-row two-col">
              <div class="form-group">
                <label class="form-label">Tổng số Cán bộ - GV - NV</label>
                <input type="number" formControlName="totalStaff" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Số điện thoại / Hotline</label>
                <input type="text" formControlName="phone" class="form-input" />
              </div>
            </div>

            <div class="form-row two-col">
              <div class="form-group">
                <label class="form-label">Email chính thức</label>
                <input type="email" formControlName="email" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Website nhà trường</label>
                <input type="url" formControlName="website" class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">Địa chỉ trụ sở chính</label>
                <input type="text" formControlName="address" class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">Mô tả đặc điểm tình hình & bối cảnh</label>
                <textarea formControlName="description" rows="3" class="form-textarea"></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="closeEditModal()" class="btn-cancel">Hủy</button>
              <button type="submit" [disabled]="editForm.invalid || saving()" class="btn-save">
                <span class="material-symbols-outlined btn-icon" *ngIf="!saving()">save</span>
                <span class="material-symbols-outlined btn-icon spinning" *ngIf="saving()">progress_activity</span>
                <span>{{ saving() ? 'Đang lưu...' : 'Lưu thay đổi' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 1.5rem;
      background: #F8FAFC;
      min-height: calc(100vh - 56px);
      font-family: inherit;
    }

    .school-info-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #E2E8F0;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #64748B;
      margin-bottom: 0.5rem;
    }

    .icon-breadcrumb {
      font-size: 1.15rem;
      color: #1F3864;
    }

    .breadcrumb .separator {
      color: #CBD5E1;
    }

    .breadcrumb .active {
      color: #1F3864;
      font-weight: 600;
    }

    .page-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.4rem 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .status-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .live-badge {
      background: #EEF2FF;
      color: #3730A3;
      border: 1px solid #C7D2FE;
    }

    .page-subtitle {
      font-size: 0.9rem;
      color: #475569;
      margin: 0;
    }

    .phone-link {
      color: #1E40AF;
      font-weight: 600;
      text-decoration: none;
    }
    .phone-link:hover {
      text-decoration: underline;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.2rem;
      background: #1F3864;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(31, 56, 100, 0.15);
    }
    .btn-primary:hover {
      background: #16294A;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px rgba(31, 56, 100, 0.2);
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      background: #FFFFFF;
      color: #334155;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      background: #F1F5F9;
      border-color: #94A3B8;
    }

    .btn-icon {
      font-size: 18px;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: #FFFFFF;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      gap: 1.25rem;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid #E2E8F0;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 4px;
    }
    .stat-card.blue::before { background: #2563EB; }
    .stat-card.green::before { background: #16A34A; }
    .stat-card.purple::before { background: #7C3AED; }
    .stat-card.amber::before { background: #D97706; }

    .stat-icon-wrapper {
      width: 52px;
      height: 52px;
      min-width: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-card.blue .stat-icon-wrapper { background: #EFF6FF; color: #2563EB; }
    .stat-card.green .stat-icon-wrapper { background: #F0FDF4; color: #16A34A; }
    .stat-card.purple .stat-icon-wrapper { background: #FAF5FF; color: #7C3AED; }
    .stat-card.amber .stat-icon-wrapper { background: #FFFBEB; color: #D97706; }

    .card-icon {
      font-size: 28px;
    }

    .stat-info {
      flex: 1;
      min-width: 0;
    }

    .stat-label {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748B;
      display: block;
      margin-bottom: 0.25rem;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.1;
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
    }

    .stat-unit {
      font-size: 0.85rem;
      font-weight: 500;
      color: #64748B;
    }

    .stat-sub {
      margin-top: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .female-badge {
      background: #FDF2F8;
      color: #DB2777;
      border: 1px solid #FBCFE8;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }

    .mini-icon {
      font-size: 14px;
    }

    .avg-badge {
      background: #F1F5F9;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
    }

    .text-muted {
      font-size: 0.8rem;
      color: #64748B;
    }

    /* Section Header */
    .section-title-row {
      margin-bottom: 1.25rem;
    }

    .section-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1E293B;
      margin: 0 0 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .title-icon {
      font-size: 22px;
      color: #1F3864;
    }
    .text-blue {
      color: #2563EB !important;
    }

    .section-desc {
      font-size: 0.85rem;
      color: #64748B;
    }

    /* Locations Grid */
    .locations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .location-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      transition: all 0.2s ease;
    }
    .location-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      border-color: #CBD5E1;
    }
    .location-card.main-loc {
      border: 2px solid #3B82F6;
      background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
    }

    .loc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #F1F5F9;
    }

    .loc-badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      background: #F1F5F9;
      color: #475569;
      display: inline-block;
      margin-bottom: 0.25rem;
    }
    .loc-badge.main {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .loc-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }

    .loc-code {
      font-size: 0.75rem;
      font-family: monospace;
      padding: 0.2rem 0.5rem;
      background: #F1F5F9;
      color: #64748B;
      border-radius: 4px;
    }

    .loc-stat-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      background: #F8FAFC;
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      text-align: center;
    }

    .loc-stat-item .num {
      display: block;
      font-size: 1.15rem;
      font-weight: 700;
      color: #0F172A;
    }
    .loc-stat-item .lbl {
      font-size: 0.75rem;
      color: #64748B;
    }

    .loc-info-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #475569;
    }

    .row-icon {
      font-size: 18px;
      color: #64748B;
    }

    .direct-call-badge {
      font-size: 0.7rem;
      background: #DCFCE7;
      color: #15803D;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-weight: 600;
      margin-left: auto;
    }

    .loc-progress-bar {
      margin-top: 0.5rem;
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #64748B;
      margin-bottom: 0.25rem;
    }

    .bar-track {
      height: 6px;
      background: #E2E8F0;
      border-radius: 999px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: #1F3864;
      border-radius: 999px;
    }

    /* Table Card */
    .section-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      margin-bottom: 2rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-subtitle {
      font-size: 0.85rem;
      color: #64748B;
      margin: 0;
    }

    .table-tag {
      font-size: 0.8rem;
      font-weight: 600;
      background: #F1F5F9;
      color: #334155;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .data-table th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 600;
      padding: 0.75rem 1rem;
      border-bottom: 2px solid #E2E8F0;
    }

    .data-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
    }

    .data-table tr:hover td {
      background: #F8FAFC;
    }

    .grade-pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .grade-pill.g6 { background: #EFF6FF; color: #1E40AF; }
    .grade-pill.g7 { background: #F0FDF4; color: #166534; }
    .grade-pill.g8 { background: #FEF3C7; color: #92400E; }
    .grade-pill.g9 { background: #F3E8FF; color: #6B21A8; }

    .highlight-col {
      background: #F8FAFC;
    }

    .female-text {
      color: #BE185D;
      font-weight: 500;
    }

    .total-row td {
      border-top: 2px solid #CBD5E1;
      border-bottom: none;
      background: #F1F5F9;
      font-size: 0.95rem;
    }

    .text-primary {
      color: #1F3864 !important;
    }

    /* Legal & Management Cards */
    .legal-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.25rem;
    }

    .legal-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      padding: 1.25rem;
    }

    .legal-title {
      font-size: 1rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.75rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .legal-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #475569;
    }

    .legal-list li {
      line-height: 1.4;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 16px;
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #E2E8F0;
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-icon {
      font-size: 1.5rem;
      color: #1F3864;
    }

    .modal-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: #64748B;
      margin: 0.2rem 0 0 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #64748B;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 6px;
    }
    .close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }
    .form-row.two-col > * { flex: 1; }
    .form-row.three-col > * { flex: 1; }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group.full-width { width: 100%; }

    .form-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .req {
      color: #DC2626;
    }

    .form-input, .form-textarea {
      padding: 0.55rem 0.75rem;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #0F172A;
      background: #FFFFFF;
      transition: border-color 0.2s;
    }
    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid #E2E8F0;
      margin-top: 0.5rem;
    }

    .btn-cancel {
      padding: 0.6rem 1.2rem;
      background: #FFFFFF;
      color: #475569;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-cancel:hover { background: #F1F5F9; }

    .btn-save {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 1.4rem;
      background: #1F3864;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-save:hover:not(:disabled) {
      background: #16294A;
    }
    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .school-info-container {
        padding: 1rem 0.75rem 2.5rem;
      }
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }
      .header-actions {
        width: 100%;
        .btn-primary, .btn-secondary {
          flex: 1;
          justify-content: center;
        }
      }
      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      .stat-card {
        padding: 0.9rem;
        gap: 0.75rem;
      }
      .locations-grid {
        grid-template-columns: 1fr;
      }
      .legal-info-grid {
        grid-template-columns: 1fr;
      }
      .table-responsive {
        overflow-x: auto;
      }
      .form-row.two-col,
      .form-row.three-col {
        flex-direction: column;
        gap: 0.75rem;
      }
      .modal-card {
        max-height: 85vh;
        margin: 0.5rem;
      }
    }
  `]
})
export class SchoolInfoComponent implements OnInit {
  private schoolService = inject(SchoolService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  school = signal<SchoolInfo | null>(null);
  loading = signal(true);
  saving = signal(false);
  showEditModal = signal(false);

  editForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadSchoolData();
  }

  initForm(): void {
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      principalName: ['', Validators.required],
      schoolYear: ['2026 - 2027', Validators.required],
      totalStudents: [0, [Validators.required, Validators.min(0)]],
      totalFemaleStudents: [0, [Validators.min(0)]],
      totalClasses: [0, [Validators.required, Validators.min(0)]],
      totalStaff: [0, [Validators.min(0)]],
      phone: [''],
      email: [''],
      website: [''],
      address: [''],
      description: [''],
    });
  }

  loadSchoolData(): void {
    this.loading.set(true);
    this.schoolService.getSchoolInfo().subscribe({
      next: (data) => {
        this.school.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching school info', err);
        this.loading.set(false);
      }
    });
  }

  canEdit(): boolean {
    const role = this.authService.currentUser()?.roles?.[0]?.role;
    return role === 'ADMIN' || role === 'HIEU_TRUONG';
  }

  getFemalePercent(): number {
    const s = this.school();
    if (!s || !s.totalStudents) return 0;
    return Math.round(((s.totalFemaleStudents || 0) / s.totalStudents) * 1000) / 10;
  }

  getAvgPerClass(): string {
    const s = this.school();
    if (!s || !s.totalStudents || !s.totalClasses) return '0';
    return (s.totalStudents / s.totalClasses).toFixed(1);
  }

  getLocRatio(studentCount: number): number {
    const s = this.school();
    if (!s || !s.totalStudents) return 0;
    return Math.round((studentCount / s.totalStudents) * 1000) / 10;
  }

  openEditModal(): void {
    const s = this.school();
    if (s) {
      this.editForm.patchValue({
        name: s.name || '',
        principalName: s.principalName || '',
        schoolYear: s.schoolYear || '2026 - 2027',
        totalStudents: s.totalStudents || 0,
        totalFemaleStudents: s.totalFemaleStudents || 0,
        totalClasses: s.totalClasses || 0,
        totalStaff: s.totalStaff || 0,
        phone: s.phone || '',
        email: s.email || '',
        website: s.website || '',
        address: s.address || '',
        description: s.description || '',
      });
    }
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  saveSchoolInfo(): void {
    if (this.editForm.invalid) return;

    this.saving.set(true);
    this.schoolService.updateSchoolInfo(this.editForm.value).subscribe({
      next: (updated) => {
        this.school.set(updated);
        this.saving.set(false);
        this.closeEditModal();
        this.loadSchoolData();
      },
      error: (err) => {
        console.error('Failed to update school info', err);
        this.saving.set(false);
        alert('Cập nhật thất bại. Vui lòng thử lại.');
      }
    });
  }
}
