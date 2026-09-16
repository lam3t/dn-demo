import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SchoolService } from '../../core/services/school.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { SchoolInfo, LocationInfo } from '../../core/models/school.models';
import { UserPickerItem } from '../../core/models/user.models';

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
            <span class="active">Năm học {{ school()?.schoolYear || academicYearService.formattedCurrentYear() }}</span>
            <span *ngIf="!academicYearService.isCurrentDefaultYear()" class="archived-tag">
              <span class="material-symbols-outlined mini-icon">history_toggle_off</span>
              (Lưu trữ / Lịch sử)
            </span>
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
          <button *ngIf="canEdit()" (click)="openEditModal()" class="btn-primary" id="btn-edit-school-info">
            <span class="material-symbols-outlined btn-icon">edit_note</span>
            <span>Cập nhật thông tin trường</span>
          </button>
          <button (click)="loadSchoolData()" class="btn-secondary" title="Làm mới dữ liệu" id="btn-refresh-school-info">
            <span class="material-symbols-outlined btn-icon" [class.spinning]="loading()">refresh</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading()" class="loading-state">
        <div class="spinner"></div>
        <p>Đang tải thông tin quy mô trường học...</p>
      </div>

      <div *ngIf="!loading() && school()" class="content-wrapper">
        <!-- 4 Stat Metric Cards (Tự động tổng hợp từ các điểm trường & tài khoản) -->
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
                <span class="text-muted">Tổng hợp từ {{ school()?.locations?.length || 1 }} điểm trường</span>
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
                <span class="text-muted">Tổng hợp từ danh sách tài khoản</span>
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

        <!-- Campus Cards Section Header -->
        <div class="section-title-row">
          <div class="title-with-desc">
            <h2 class="section-title">
              <span class="material-symbols-outlined title-icon">apartment</span>
              Quy mô & Cơ sở vật chất Điểm trường (Năm học {{ school()?.schoolYear || academicYearService.formattedCurrentYear() }})
            </h2>
            <span class="section-desc">Cập nhật sĩ số học sinh và số lớp tại từng điểm trường để hệ thống tự động tổng hợp vào quy mô chung</span>
          </div>
          <div class="section-actions" *ngIf="canAddLocation()">
            <button (click)="openAddLocationModal()" class="btn-add-loc" id="btn-add-new-location">
              <span class="material-symbols-outlined btn-icon">add_location_alt</span>
              <span>Thêm điểm trường mới</span>
            </button>
          </div>
        </div>

        <!-- Campus Cards Grid -->
        <div class="locations-grid">
          @if (!school()?.locations || school()?.locations?.length === 0) {
            <div class="empty-loc-card">
              <span class="material-symbols-outlined text-muted">domain</span>
              <p>Chưa có thông tin phân hiệu. Trường học đang hoạt động với điểm trường chính.</p>
              <button *ngIf="canAddLocation()" (click)="openAddLocationModal()" class="btn-primary-sm mt-2">
                <span class="material-symbols-outlined">add</span>
                <span>Khai báo điểm trường</span>
              </button>
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
                <div class="loc-header-right">
                  <div class="loc-code">{{ loc.code }}</div>
                  <div class="loc-actions-group" *ngIf="canEditLocation(loc)">
                    <button class="icon-btn-edit" (click)="openEditLocationModal(loc)" title="Cập nhật số liệu & sĩ số điểm trường">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      *ngIf="canDeleteLocation() && !loc.isMain"
                      class="icon-btn-delete"
                      (click)="deleteLocation(loc, $event)"
                      title="Xóa điểm trường"
                      [disabled]="deletingLocationId() === loc.id"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="loc-body">
                <!-- Cán bộ phụ trách điểm trường -->
                <div class="loc-manager-box" *ngIf="loc.manager">
                  <span class="material-symbols-outlined manager-icon">supervisor_account</span>
                  <span class="manager-label">Phụ trách:</span>
                  <strong class="manager-name">{{ loc.manager.fullName }}</strong>
                  <span class="manager-title" *ngIf="loc.manager.title">({{ loc.manager.title }})</span>
                </div>

                <!-- 4 Chỉ số: Lớp học, Học sinh, Học sinh Nữ, Cán bộ GV -->
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
                  <div class="loc-stat-item highlight-staff" title="Tổng hợp tự động từ danh sách tài khoản thuộc điểm trường">
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

                <!-- Action button to update stats directly on card -->
                <div class="loc-footer-actions" *ngIf="canEditLocation(loc)">
                  <button (click)="openEditLocationModal(loc)" class="btn-card-edit-loc">
                    <span class="material-symbols-outlined mini-icon">edit_square</span>
                    <span>Cập nhật số liệu điểm trường</span>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Grade Matrix Table Section (If available) -->
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
              <li class="info-item">
                <span class="info-label">Hiệu trưởng:</span>
                <span class="info-val font-semibold">{{ school()?.principalName || 'Chưa cập nhật' }}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Điện thoại liên hệ:</span>
                <span class="info-val">{{ school()?.phone || 'Chưa cập nhật' }}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Email chính thức:</span>
                <span class="info-val">{{ school()?.email || 'Chưa cập nhật' }}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Website trường:</span>
                <span class="info-val">{{ school()?.website || 'Chưa cập nhật' }}</span>
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
                {{ school()?.description || 'Chưa có thông tin mô tả chi tiết về trường. Nhấn "Cập nhật thông tin trường" để bổ sung.' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 1: Cập nhật Thông tin Chung Nhà trường (KHÔNG nhập tay tổng số HS, lớp, GV) -->
      <div *ngIf="showEditModal()" class="modal-overlay" (click)="closeEditModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined modal-icon">edit_square</span>
              <div>
                <h3 class="modal-title">Cập nhật Thông tin & Hồ sơ Nhà trường</h3>
                <p class="modal-subtitle">Thông tin hành chính và liên hệ chính thức của nhà trường</p>
              </div>
            </div>
            <button class="close-btn" (click)="closeEditModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="editForm" (ngSubmit)="saveSchoolInfo()" class="modal-body">
            <!-- Thông báo tự động tổng hợp -->
            <div class="info-notice-banner">
              <span class="material-symbols-outlined notice-icon">info</span>
              <div class="notice-text">
                <strong>Quy mô Học sinh, Lớp học & Cán bộ GV:</strong>
                <span>Được hệ thống tự động tổng hợp trực tiếp từ các Điểm trường / Phân hiệu và danh sách tài khoản. Để điều chỉnh số liệu, vui lòng cập nhật tại từng Điểm trường bên dưới.</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">Tên trường <span class="req">*</span></label>
                <input type="text" formControlName="name" class="form-input" placeholder="Ví dụ: Trường THCS Nguyễn Huệ" />
              </div>
            </div>

            <div class="form-row two-col">
              <div class="form-group">
                <label class="form-label">Hiệu trưởng <span class="req">*</span></label>
                <input type="text" formControlName="principalName" class="form-input" placeholder="Ví dụ: Nguyễn Văn Hùng" />
              </div>
              <div class="form-group">
                <label class="form-label">Năm học <span class="req">*</span></label>
                <input type="text" formControlName="schoolYear" class="form-input" placeholder="2026 - 2027" />
              </div>
            </div>

            <div class="form-row two-col">
              <div class="form-group">
                <label class="form-label">Số điện thoại / Hotline</label>
                <input type="text" formControlName="phone" class="form-input" placeholder="02513999888" />
              </div>
              <div class="form-group">
                <label class="form-label">Email chính thức</label>
                <input type="email" formControlName="email" class="form-input" placeholder="thcs_nguyenhue@dongnai.edu.vn" />
              </div>
            </div>

            <div class="form-row two-col">
              <div class="form-group">
                <label class="form-label">Website nhà trường</label>
                <input type="url" formControlName="website" class="form-input" placeholder="https://thcsnguyenhue.dongnai.edu.vn" />
              </div>
              <div class="form-group">
                <label class="form-label">Địa chỉ trụ sở chính</label>
                <input type="text" formControlName="address" class="form-input" placeholder="Số 45 đường Hùng Vương, TP. Biên Hòa..." />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">Mô tả đặc điểm tình hình & bối cảnh</label>
                <textarea formControlName="description" rows="3" class="form-textarea" placeholder="Nhập mô tả bối cảnh, lịch sử phát triển hoặc ghi chú nhà trường..."></textarea>
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

      <!-- MODAL 2: Cập nhật / Thêm mới Điểm trường (Sĩ số học sinh, số lớp, cán bộ phụ trách) -->
      <div *ngIf="showLocationModal()" class="modal-overlay" (click)="closeLocationModal()">
        <div class="modal-card loc-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="material-symbols-outlined modal-icon">{{ isEditingLocation() ? 'edit_location' : 'add_location_alt' }}</span>
              <div>
                <h3 class="modal-title">{{ isEditingLocation() ? ('Cập nhật Số liệu Điểm trường (' + (school()?.schoolYear || academicYearService.formattedCurrentYear()) + '): ' + (selectedLocation()?.name || '')) : 'Thêm mới Điểm trường / Phân hiệu' }}</h3>
                <p class="modal-subtitle">
                  Số lớp học, tổng học sinh và học sinh nữ cho Năm học {{ school()?.schoolYear || academicYearService.formattedCurrentYear() }} sẽ được tự động tổng hợp vào quy mô toàn trường
                </p>
              </div>
            </div>
            <button class="close-btn" (click)="closeLocationModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="locationForm" (ngSubmit)="saveLocation()" class="modal-body">
            <div class="form-row two-col">
              <div class="form-group">
                <label class="form-label">Tên điểm trường / Phân hiệu <span class="req">*</span></label>
                <input type="text" formControlName="name" class="form-input" placeholder="Ví dụ: Phân hiệu Bến Cá" />
              </div>
              <div class="form-group">
                <label class="form-label">Mã cơ sở <span class="req">*</span></label>
                <input type="text" formControlName="code" class="form-input uppercase" placeholder="Ví dụ: NH_PH1" [readonly]="isEditingLocation() && selectedLocation()?.isMain" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">Cán bộ phụ trách điểm trường</label>
                <select formControlName="managerId" class="form-input form-select">
                  <option value="">-- Chưa chỉ định cán bộ phụ trách --</option>
                  <option *ngFor="let u of availableUsers()" [value]="u.id">
                    {{ u.fullName }} {{ u.title ? ('- ' + u.title) : '' }} {{ u.phone ? ('(' + u.phone + ')') : '' }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Phân mục: Sĩ số học sinh & Lớp học -->
            <div class="section-divider-title">
              <span class="material-symbols-outlined mini-icon">bar_chart</span>
              <span>QUY MÔ SĨ SỐ & LỚP HỌC (Tự động đồng bộ vào trường)</span>
            </div>

            <div class="form-row three-col">
              <div class="form-group">
                <label class="form-label">Số Lớp học <span class="req">*</span></label>
                <input type="number" formControlName="classCount" min="0" class="form-input" placeholder="0" />
              </div>
              <div class="form-group">
                <label class="form-label">Tổng số Học sinh <span class="req">*</span></label>
                <input type="number" formControlName="studentCount" min="0" class="form-input" placeholder="0" />
              </div>
              <div class="form-group">
                <label class="form-label">Số Học sinh Nữ <span class="req">*</span></label>
                <input type="number" formControlName="femaleStudentCount" min="0" class="form-input" placeholder="0" />
              </div>
            </div>

            <div class="auto-sync-hint-box">
              <span class="material-symbols-outlined hint-icon">groups</span>
              <div class="hint-text">
                <strong>Số lượng Cán bộ GV ({{ (selectedLocation()?.userCount || 0) }} nhân sự):</strong>
                <span>Được hệ thống tổng hợp tự động từ danh sách tài khoản đang được phân công tại điểm trường này.</span>
              </div>
            </div>

            <!-- Phân mục: Thông tin liên hệ & Cơ sở -->
            <div class="section-divider-title">
              <span class="material-symbols-outlined mini-icon">contact_page</span>
              <span>THÔNG TIN LIÊN HỆ & CƠ SỞ</span>
            </div>

            <div class="form-row two-col">
              <div class="form-group">
                <label class="form-label">Số điện thoại liên hệ / Hotline</label>
                <input type="text" formControlName="phone" class="form-input" placeholder="02513999888" />
              </div>
              <div class="form-group checkbox-group-container" *ngIf="canAddLocation()">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="isMain" class="form-checkbox" />
                  <span>Đặt làm Điểm chính (Trung tâm)</span>
                </label>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">Địa chỉ cơ sở</label>
                <input type="text" formControlName="address" class="form-input" placeholder="Ví dụ: Số 45 đường Hùng Vương..." />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" (click)="closeLocationModal()" class="btn-cancel">Hủy</button>
              <button type="submit" [disabled]="locationForm.invalid || savingLocation()" class="btn-save">
                <span class="material-symbols-outlined btn-icon" *ngIf="!savingLocation()">save</span>
                <span class="material-symbols-outlined btn-icon spinning" *ngIf="savingLocation()">progress_activity</span>
                <span>{{ savingLocation() ? 'Đang lưu...' : 'Lưu số liệu điểm trường' }}</span>
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

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
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

    .archived-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #FFFBEB;
      color: #B45309;
      border: 1px solid #FDE68A;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      margin-left: 6px;

      .mini-icon {
        font-size: 14px;
      }
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

    .btn-primary-sm {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.9rem;
      background: #1F3864;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .btn-primary-sm:hover {
      background: #16294A;
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

    .btn-add-loc {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      background: #EEF2FF;
      color: #1E40AF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-add-loc:hover {
      background: #DBEAFE;
      border-color: #93C5FD;
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

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: #64748B;
      gap: 1rem;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #E2E8F0;
      border-top-color: #1F3864;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .content-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .empty-loc-card {
      grid-column: 1 / -1;
      background: #FFFFFF;
      border: 1.5px dashed #CBD5E1;
      border-radius: 12px;
      padding: 2.5rem;
      text-align: center;
      color: #64748B;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      .material-symbols-outlined { font-size: 40px; color: #94A3B8; }
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .title-with-desc {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .section-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1E293B;
      margin: 0;
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
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
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
      display: flex;
      flex-direction: column;
      justify-content: space-between;
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
      margin-bottom: 0.85rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #F1F5F9;
    }

    .loc-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
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

    .loc-header-right {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .loc-code {
      font-size: 0.75rem;
      font-family: monospace;
      padding: 0.2rem 0.5rem;
      background: #F1F5F9;
      color: #64748B;
      border-radius: 4px;
      font-weight: 700;
    }

    .loc-actions-group {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .icon-btn-edit, .icon-btn-delete {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 0.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748B;
      transition: all 0.15s ease;
      .material-symbols-outlined { font-size: 16px; }
    }
    .icon-btn-edit:hover {
      background: #EFF6FF;
      color: #2563EB;
      border-color: #BFDBFE;
    }
    .icon-btn-delete:hover {
      background: #FEF2F2;
      color: #DC2626;
      border-color: #FECACA;
    }

    .loc-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .loc-manager-box {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      background: #EFF6FF;
      color: #1E40AF;
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      border: 1px solid #DBEAFE;
    }
    .manager-icon {
      font-size: 16px;
      color: #2563EB;
    }
    .manager-label {
      color: #64748B;
    }
    .manager-name {
      color: #0F172A;
    }
    .manager-title {
      color: #64748B;
      font-size: 0.75rem;
    }

    .loc-stat-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      background: #F8FAFC;
      padding: 0.75rem;
      border-radius: 8px;
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

    .loc-stat-item.highlight-staff {
      background: #FAF5FF;
      border-radius: 6px;
      padding: 0.15rem;
    }
    .loc-stat-item.highlight-staff .num {
      color: #7C3AED;
    }
    .loc-stat-item.highlight-staff .lbl {
      color: #6D28D9;
      font-weight: 600;
    }

    .loc-info-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
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
      margin-top: 0.25rem;
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

    .loc-footer-actions {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px dashed #E2E8F0;
    }

    .btn-card-edit-loc {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.55rem;
      background: #F1F5F9;
      color: #1F3864;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-card-edit-loc:hover {
      background: #E2E8F0;
      color: #0F172A;
      border-color: #94A3B8;
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
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-subtitle {
      font-size: 0.85rem;
      color: #64748B;
      margin: 0.2rem 0 0 0;
    }

    .table-tag {
      background: #F1F5F9;
      color: #334155;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #CBD5E1;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .data-table th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 600;
      padding: 0.75rem 1rem;
      border: 1px solid #E2E8F0;
    }

    .data-table td {
      padding: 0.75rem 1rem;
      border: 1px solid #E2E8F0;
      color: #334155;
    }

    .data-table tr:hover {
      background: #F8FAFC;
    }

    .highlight-col {
      background: #EFF6FF;
      color: #1E40AF;
    }

    /* Legal info grid */
    .legal-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .legal-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
      gap: 0.6rem;
      font-size: 0.9rem;
      color: #475569;
    }

    .legal-list .info-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      line-height: 1.4;
    }

    .info-label {
      font-weight: 600;
      color: #334155;
      min-width: 140px;
    }

    .info-val {
      color: #0F172A;
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
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 6px;
      transition: all 0.2s;
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

    .info-notice-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.75rem 1rem;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;
      font-size: 0.82rem;
      color: #1E40AF;
      line-height: 1.45;
    }
    .notice-icon {
      font-size: 20px;
      color: #2563EB;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .notice-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      width: 100%;
    }

    .form-row.two-col > .form-group {
      flex: 1;
    }

    .form-row.three-col > .form-group {
      flex: 1;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group.full-width {
      width: 100%;
    }

    .form-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .req {
      color: #EF4444;
    }

    .form-input, .form-textarea, .form-select {
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #0F172A;
      background: #FFFFFF;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus, .form-textarea:focus, .form-select:focus {
      outline: none;
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .form-input.uppercase {
      text-transform: uppercase;
    }

    .section-divider-title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.82rem;
      font-weight: 700;
      color: #1E293B;
      padding-top: 0.5rem;
      border-top: 1px dashed #E2E8F0;
      margin-top: 0.25rem;
    }

    .auto-sync-hint-box {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      background: #FAF5FF;
      border: 1px solid #E9D5FF;
      border-radius: 8px;
      font-size: 0.8rem;
      color: #581C87;
    }
    .hint-icon {
      font-size: 18px;
      color: #7C3AED;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .hint-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .checkbox-group-container {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      padding-bottom: 0.55rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }

    .form-checkbox {
      width: 18px;
      height: 18px;
      accent-color: #1F3864;
      cursor: pointer;
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
export class SchoolInfoComponent implements OnInit, OnDestroy {
  private schoolService = inject(SchoolService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  academicYearService = inject(AcademicYearService);
  private fb = inject(FormBuilder);

  private yearSub?: Subscription;

  school = signal<SchoolInfo | null>(null);
  loading = signal(true);
  saving = signal(false);
  showEditModal = signal(false);

  // Location CRUD state
  showLocationModal = signal(false);
  isEditingLocation = signal(false);
  selectedLocation = signal<LocationInfo | null>(null);
  availableUsers = signal<UserPickerItem[]>([]);
  savingLocation = signal(false);
  deletingLocationId = signal<string | null>(null);

  editForm!: FormGroup;
  locationForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.initLocationForm();
    this.loadSchoolData();

    this.yearSub = this.academicYearService.yearChanged$.subscribe(() => {
      this.loadSchoolData();
    });
  }

  ngOnDestroy(): void {
    this.yearSub?.unsubscribe();
  }

  initForm(): void {
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      principalName: ['', Validators.required],
      schoolYear: [this.academicYearService.formattedCurrentYear(), Validators.required],
      phone: [''],
      email: [''],
      website: [''],
      address: [''],
      description: [''],
    });
  }

  initLocationForm(): void {
    this.locationForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
      managerId: [''],
      classCount: [0, [Validators.required, Validators.min(0)]],
      studentCount: [0, [Validators.required, Validators.min(0)]],
      femaleStudentCount: [0, [Validators.required, Validators.min(0)]],
      address: [''],
      phone: [''],
      isMain: [false],
    });
  }

  loadSchoolData(): void {
    const selectedYear = this.academicYearService.currentAcademicYear();
    this.loading.set(true);
    this.schoolService.getSchoolInfo(selectedYear).subscribe({
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

  loadUsers(): void {
    this.userService.searchUsers({ pageSize: 100 }).subscribe({
      next: (res) => {
        this.availableUsers.set(res.items || []);
      },
      error: () => {}
    });
  }

  canEdit(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.isSystemAdmin || this.authService.isSystemAdmin()) return true;
    if (this.authService.isAdmin() || this.authService.isHieuTruong() || this.authService.isBGH()) return true;

    const roles = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.role));
    return roles.includes('ADMIN') || roles.includes('HIEU_TRUONG') || roles.includes('SYSTEM_ADMIN');
  }

  canAddLocation(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.isSystemAdmin || this.authService.isSystemAdmin()) return true;
    if (this.authService.isAdmin() || this.authService.isBGH()) return true;

    const roles = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.role));
    return roles.includes('ADMIN') || roles.includes('HIEU_TRUONG') || roles.includes('PHO_HIEU_TRUONG') || roles.includes('SYSTEM_ADMIN');
  }

  canDeleteLocation(): boolean {
    return this.canAddLocation();
  }

  canEditLocation(loc: LocationInfo): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.isSystemAdmin || this.authService.isSystemAdmin()) return true;
    if (this.authService.isAdmin() || this.authService.isHieuTruong() || this.authService.isBGH()) return true;

    const roles = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.role));
    if (roles.includes('ADMIN') || roles.includes('HIEU_TRUONG') || roles.includes('PHO_HIEU_TRUONG') || roles.includes('SYSTEM_ADMIN')) {
      return true;
    }

    // Cán bộ phụ trách điểm trường này
    if (loc.managerId && loc.managerId === user.id) return true;
    if (loc.manager?.id && loc.manager.id === user.id) return true;

    // Hoặc người dùng có scope quản lý điểm trường này
    const hasScopedLoc = (user.roles || []).some((r: any) => (typeof r === 'object' && r.scopeLocationId === loc.id));
    if (hasScopedLoc) return true;

    // Hoặc người dùng thuộc điểm trường này
    if (user.primaryLocationId === loc.id) return true;

    return false;
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
        schoolYear: s.schoolYear || this.academicYearService.formattedCurrentYear(),
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

  openAddLocationModal(): void {
    this.isEditingLocation.set(false);
    this.selectedLocation.set(null);
    this.locationForm.reset({
      name: '',
      code: '',
      managerId: '',
      classCount: 0,
      studentCount: 0,
      femaleStudentCount: 0,
      address: '',
      phone: '',
      isMain: false,
    });
    this.loadUsers();
    this.showLocationModal.set(true);
  }

  openEditLocationModal(loc: LocationInfo): void {
    this.isEditingLocation.set(true);
    this.selectedLocation.set(loc);
    this.locationForm.patchValue({
      name: loc.name || '',
      code: loc.code || '',
      managerId: loc.managerId || (loc.manager?.id || ''),
      classCount: loc.classCount || 0,
      studentCount: loc.studentCount || 0,
      femaleStudentCount: loc.femaleStudentCount || 0,
      address: loc.address || '',
      phone: loc.phone || '',
      isMain: loc.isMain || false,
    });
    this.loadUsers();
    this.showLocationModal.set(true);
  }

  closeLocationModal(): void {
    this.showLocationModal.set(false);
    this.selectedLocation.set(null);
  }

  saveLocation(): void {
    if (this.locationForm.invalid) {
      this.locationForm.markAllAsTouched();
      return;
    }

    const val = this.locationForm.value;
    if (Number(val.femaleStudentCount) > Number(val.studentCount)) {
      alert('Số học sinh nữ không được lớn hơn tổng số học sinh của điểm trường.');
      return;
    }

    const currentYear = this.academicYearService.currentAcademicYear();
    this.savingLocation.set(true);

    if (this.isEditingLocation() && this.selectedLocation()) {
      const locId = this.selectedLocation()!.id;
      this.schoolService.updateLocation(locId, val, currentYear).subscribe({
        next: () => {
          this.savingLocation.set(false);
          this.closeLocationModal();
          this.loadSchoolData();
        },
        error: (err) => {
          console.error('Failed to update location', err);
          this.savingLocation.set(false);
          alert(err.error?.message || 'Cập nhật điểm trường thất bại. Vui lòng thử lại.');
        }
      });
    } else {
      this.schoolService.createLocation(val, currentYear).subscribe({
        next: () => {
          this.savingLocation.set(false);
          this.closeLocationModal();
          this.loadSchoolData();
        },
        error: (err) => {
          console.error('Failed to create location', err);
          this.savingLocation.set(false);
          alert(err.error?.message || 'Tạo mới điểm trường thất bại. Vui lòng thử lại.');
        }
      });
    }
  }

  deleteLocation(loc: LocationInfo, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa điểm trường "${loc.name}" (${loc.code})?`)) {
      return;
    }

    this.deletingLocationId.set(loc.id);
    this.schoolService.deleteLocation(loc.id).subscribe({
      next: () => {
        this.deletingLocationId.set(null);
        this.loadSchoolData();
      },
      error: (err) => {
        console.error('Failed to delete location', err);
        this.deletingLocationId.set(null);
        alert(err.error?.message || 'Không thể xóa điểm trường. Vui lòng kiểm tra các ràng buộc.');
      }
    });
  }
}
