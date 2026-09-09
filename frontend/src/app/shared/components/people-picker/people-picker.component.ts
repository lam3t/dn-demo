import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  HostListener,
  inject,
  signal,
  computed,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserPickerItem, LocationItem, OrgUnitItem } from '../../../core/models/user.models';

@Component({
  selector: 'app-people-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PeoplePickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="people-picker-container" [class.disabled]="disabled" [class.is-invalid]="required && touched && selectedUsers().length === 0">
      @if (label) {
        <label class="picker-label">
          <span>{{ label }}</span>
          @if (required) {
            <span class="required-star">*</span>
          }
        </label>
      }

      <!-- DESKTOP / MAIN TRIGGER BOX -->
      <div
        class="picker-box tap-target"
        [class.focused]="isOpen()"
        [class.has-selection]="selectedUsers().length > 0"
        (click)="onBoxClick($event)"
      >
        <!-- SELECTED CHIPS LIST -->
        <div class="chips-list">
          @for (user of selectedUsers(); track user.id) {
            <div class="user-chip" (click)="$event.stopPropagation()">
              <img
                [src]="user.avatarUrl || 'https://ui-avatars.com/api/?name=' + user.fullName + '&background=1F3864&color=fff'"
                [alt]="user.fullName"
                class="chip-avatar"
              />
              <span class="chip-name">{{ user.fullName }}</span>
              <span class="chip-workload-dot" [ngClass]="getWorkloadClass(user.currentTaskLoad)" [title]="getWorkloadTitle(user.currentTaskLoad)"></span>
              @if (!disabled) {
                <button type="button" class="chip-remove-btn" (click)="removeUser(user, $event)" title="Bỏ chọn">
                  <span class="material-symbols-outlined">close</span>
                </button>
              }
            </div>
          }

          <!-- INPUT SEARCH FIELD -->
          @if (mode === 'multi' || selectedUsers().length === 0) {
            <input
              #searchInput
              type="text"
              class="search-input"
              [placeholder]="selectedUsers().length === 0 ? placeholder : 'Thêm người khác...'"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchInputChange($event)"
              (focus)="openDropdown()"
              (keydown)="onKeyDown($event)"
              [disabled]="disabled"
            />
          }
        </div>

        <div class="picker-actions">
          @if (selectedUsers().length > 0 && !disabled) {
            <button type="button" class="clear-all-btn" (click)="clearAll($event)" title="Xóa tất cả đã chọn">
              <span class="material-symbols-outlined">backspace</span>
            </button>
          }
          <span class="material-symbols-outlined dropdown-arrow" [class.rotated]="isOpen()">
            arrow_drop_down
          </span>
        </div>
      </div>

      <!-- DESKTOP DROPDOWN (Shown on screens >= 768px) -->
      @if (isOpen() && !isMobileView()) {
        <div class="desktop-dropdown" (click)="$event.stopPropagation()">
          <!-- QUICK FILTER CHIPS -->
          <div class="filter-chips-bar">
            <button
              type="button"
              class="filter-chip"
              [class.active]="activeFilterType() === 'ALL'"
              (click)="setFilter('ALL', '')"
            >
              Tất cả
            </button>

            <!-- Gợi ý gần đây -->
            <button
              type="button"
              class="filter-chip"
              [class.active]="activeFilterType() === 'RECENT'"
              (click)="setFilter('RECENT', '')"
            >
              <span class="material-symbols-outlined chip-icon">history</span>
              <span>Gần đây</span>
            </button>

            <!-- Lọc theo điểm trường -->
            @for (loc of locations(); track loc.id) {
              <button
                type="button"
                class="filter-chip"
                [class.active]="activeFilterType() === 'LOCATION' && activeFilterValue() === loc.id"
                (click)="setFilter('LOCATION', loc.id)"
              >
                <span class="material-symbols-outlined chip-icon">location_on</span>
                <span>{{ loc.name }}</span>
              </button>
            }

            <!-- Lọc theo tổ -->
            @for (org of orgUnits(); track org.id) {
              <button
                type="button"
                class="filter-chip"
                [class.active]="activeFilterType() === 'ORG' && activeFilterValue() === org.id"
                (click)="setFilter('ORG', org.id)"
              >
                <span class="material-symbols-outlined chip-icon">groups</span>
                <span>{{ org.name }}</span>
              </button>
            }
          </div>

          <!-- LIST HEADER -->
          <div class="dropdown-section-header">
            <span>{{ listHeaderText() }}</span>
            @if (isLoading()) {
              <span class="material-symbols-outlined spin-icon">progress_activity</span>
            } @else {
              <span class="results-count">{{ userList().length }} nhân sự</span>
            }
          </div>

          <!-- USER LIST ITEMS -->
          <div class="dropdown-list-items">
            @if (isLoading() && userList().length === 0) {
              <div class="loading-state">
                <span class="material-symbols-outlined spin">progress_activity</span>
                <span>Đang tải danh sách nhân sự...</span>
              </div>
            } @else if (userList().length === 0) {
              <div class="empty-state">
                <span class="material-symbols-outlined empty-icon">person_search</span>
                <p>Không tìm thấy nhân sự phù hợp.</p>
                <small>Thử tìm theo tên, số điện thoại hoặc chọn tổ khác</small>
              </div>
            } @else {
              @for (user of userList(); track user.id; let i = $index) {
                <div
                  class="user-list-item"
                  [class.selected]="isUserSelected(user.id)"
                  [class.highlighted]="i === highlightedIndex()"
                  (click)="toggleUserSelection(user)"
                >
                  <div class="avatar-wrapper">
                    <img
                      [src]="user.avatarUrl || 'https://ui-avatars.com/api/?name=' + user.fullName + '&background=1F3864&color=fff'"
                      [alt]="user.fullName"
                      class="user-avatar"
                    />
                    <span
                      class="workload-badge"
                      [ngClass]="getWorkloadClass(user.currentTaskLoad)"
                      [title]="getWorkloadTitle(user.currentTaskLoad)"
                    ></span>
                  </div>

                  <div class="user-meta">
                    <div class="name-row">
                      <span class="user-name">{{ user.fullName }}</span>
                      @if (user.sharedTaskCount && user.sharedTaskCount > 0) {
                        <span class="collab-tag" title="Số lần phối hợp cùng">
                          <span class="material-symbols-outlined">handshake</span>
                          {{ user.sharedTaskCount }} lần
                        </span>
                      }
                    </div>

                    <div class="user-sub">
                      <span class="user-title-text">{{ user.title || 'Cán bộ giáo viên' }}</span>
                      @if (user.primaryOrgUnit) {
                        <span class="dot-separator">•</span>
                        <span class="org-name">{{ user.primaryOrgUnit.name }}</span>
                      }
                      @if (user.primaryLocation) {
                        <span class="dot-separator">•</span>
                        <span class="loc-badge">{{ user.primaryLocation.name }}</span>
                      }
                    </div>
                  </div>

                  <div class="item-right-action">
                    <!-- Workload Tag -->
                    <div class="workload-pill" [ngClass]="getWorkloadClass(user.currentTaskLoad)">
                      <span class="dot"></span>
                      <span>{{ user.currentTaskLoad }} việc</span>
                    </div>

                    <!-- Direct Call Action -->
                    @if (user.phone) {
                      <a
                        [href]="'tel:' + user.phone"
                        class="quick-call-btn"
                        (click)="$event.stopPropagation()"
                        [title]="'Gọi ngay cho ' + user.fullName + ' (' + user.phone + ')'"
                      >
                        <span class="material-symbols-outlined">call</span>
                      </a>
                    }

                    <!-- Checkbox state -->
                    <div class="selection-checkbox" [class.checked]="isUserSelected(user.id)">
                      <span class="material-symbols-outlined">
                        {{ isUserSelected(user.id) ? 'check_box' : 'check_box_outline_blank' }}
                      </span>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      }

      <!-- MOBILE FULL-SCREEN MODAL (Shown when opened on < 768px) -->
      @if (isOpen() && isMobileView()) {
        <div class="mobile-modal-overlay" (click)="closeDropdown()">
          <div class="mobile-modal-sheet" (click)="$event.stopPropagation()">
            <!-- MOBILE TOP BAR -->
            <div class="mobile-modal-header">
              <button type="button" class="close-modal-btn" (click)="closeDropdown()">
                <span class="material-symbols-outlined">close</span>
              </button>
              <div class="modal-title-box">
                <h3 class="modal-title">{{ label || 'Chọn nhân sự' }}</h3>
                <span class="modal-subtitle">
                  {{ mode === 'single' ? 'Chọn 1 người' : 'Đã chọn ' + selectedUsers().length + ' người' }}
                </span>
              </div>
              <button type="button" class="done-modal-btn" (click)="closeDropdown()">
                Xong
              </button>
            </div>

            <!-- MOBILE SEARCH BOX -->
            <div class="mobile-search-bar">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                class="mobile-search-input tap-target"
                placeholder="Tìm tên, chức vụ, tổ, SĐT..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchInputChange($event)"
                autofocus
              />
              @if (searchQuery) {
                <button type="button" class="clear-search-btn" (click)="clearSearch()">
                  <span class="material-symbols-outlined">cancel</span>
                </button>
              }
            </div>

            <!-- MOBILE FILTER CHIPS -->
            <div class="mobile-filters-scroll">
              <button
                type="button"
                class="filter-chip"
                [class.active]="activeFilterType() === 'ALL'"
                (click)="setFilter('ALL', '')"
              >
                Tất cả
              </button>
              <button
                type="button"
                class="filter-chip"
                [class.active]="activeFilterType() === 'RECENT'"
                (click)="setFilter('RECENT', '')"
              >
                <span class="material-symbols-outlined chip-icon">history</span>
                <span>Gần đây</span>
              </button>
              @for (loc of locations(); track loc.id) {
                <button
                  type="button"
                  class="filter-chip"
                  [class.active]="activeFilterType() === 'LOCATION' && activeFilterValue() === loc.id"
                  (click)="setFilter('LOCATION', loc.id)"
                >
                  <span>{{ loc.name }}</span>
                </button>
              }
              @for (org of orgUnits(); track org.id) {
                <button
                  type="button"
                  class="filter-chip"
                  [class.active]="activeFilterType() === 'ORG' && activeFilterValue() === org.id"
                  (click)="setFilter('ORG', org.id)"
                >
                  <span>{{ org.name }}</span>
                </button>
              }
            </div>

            <!-- MOBILE SELECTED CHIPS SUMMARY BAR (IF ANY) -->
            @if (selectedUsers().length > 0) {
              <div class="mobile-selected-bar">
                <span class="selected-label">Đã chọn ({{ selectedUsers().length }}):</span>
                <div class="selected-chips-scroll">
                  @for (user of selectedUsers(); track user.id) {
                    <div class="mobile-selected-chip">
                      <span>{{ user.fullName }}</span>
                      <button type="button" (click)="removeUser(user, $event)">
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- MOBILE USER LIST -->
            <div class="mobile-user-list">
              @if (isLoading() && userList().length === 0) {
                <div class="loading-state">
                  <span class="material-symbols-outlined spin">progress_activity</span>
                  <span>Đang tải dữ liệu nhân sự...</span>
                </div>
              } @else if (userList().length === 0) {
                <div class="empty-state">
                  <span class="material-symbols-outlined empty-icon">person_search</span>
                  <p>Không tìm thấy nhân sự phù hợp</p>
                </div>
              } @else {
                @for (user of userList(); track user.id) {
                  <div
                    class="mobile-user-item tap-target"
                    [class.selected]="isUserSelected(user.id)"
                    (click)="toggleUserSelection(user)"
                  >
                    <div class="mobile-avatar-box">
                      <img
                        [src]="user.avatarUrl || 'https://ui-avatars.com/api/?name=' + user.fullName + '&background=1F3864&color=fff'"
                        [alt]="user.fullName"
                        class="mobile-avatar"
                      />
                      <span class="workload-dot" [ngClass]="getWorkloadClass(user.currentTaskLoad)"></span>
                    </div>

                    <div class="mobile-user-info">
                      <div class="mobile-name-row">
                        <strong class="user-fullname">{{ user.fullName }}</strong>
                        <span class="mobile-workload-text" [ngClass]="getWorkloadClass(user.currentTaskLoad)">
                          {{ getWorkloadLabel(user.currentTaskLoad) }} ({{ user.currentTaskLoad }} việc)
                        </span>
                      </div>
                      <div class="mobile-sub-row">
                        <span>{{ user.title || 'Giáo viên' }}</span>
                        @if (user.primaryOrgUnit) {
                          <span> - {{ user.primaryOrgUnit.name }}</span>
                        }
                      </div>
                      @if (user.primaryLocation) {
                        <div class="mobile-loc-row">
                          <span class="material-symbols-outlined">location_on</span>
                          <span>{{ user.primaryLocation.name }}</span>
                        </div>
                      }
                    </div>

                    <div class="mobile-item-actions">
                      @if (user.phone) {
                        <a
                          [href]="'tel:' + user.phone"
                          class="mobile-call-btn"
                          (click)="$event.stopPropagation()"
                          title="Gọi điện thoại"
                        >
                          <span class="material-symbols-outlined">call</span>
                        </a>
                      }
                      <div class="mobile-checkbox" [class.checked]="isUserSelected(user.id)">
                        <span class="material-symbols-outlined">
                          {{ isUserSelected(user.id) ? 'check_circle' : 'radio_button_unchecked' }}
                        </span>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- MOBILE BOTTOM CONFIRM BUTTON -->
            <div class="mobile-bottom-bar">
              <button type="button" class="confirm-btn tap-target" (click)="closeDropdown()">
                <span>Xác nhận đã chọn ({{ selectedUsers().length }})</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .people-picker-container {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 6px;

        &.disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        &.is-invalid .picker-box {
          border-color: #EF4444;
          background: #FEF2F2;
        }
      }

      .picker-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #334155;
        display: flex;
        align-items: center;
        gap: 4px;

        .required-star {
          color: #EF4444;
          font-weight: 700;
        }
      }

      /* TRIGGER BOX */
      .picker-box {
        min-height: 44px;
        background: #FFFFFF;
        border: 1.5px solid #CBD5E1;
        border-radius: 10px;
        padding: 4px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: #94A3B8;
        }

        &.focused {
          border-color: #1F3864;
          box-shadow: 0 0 0 3px rgba(31, 56, 100, 0.12);
        }

        .chips-list {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          padding: 2px 0;

          .user-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #EEF4FC;
            border: 1px solid #BFDBFE;
            border-radius: 9999px;
            padding: 3px 8px 3px 4px;
            font-size: 0.82rem;
            color: #1E3A8A;
            font-weight: 600;

            .chip-avatar {
              width: 22px;
              height: 22px;
              border-radius: 50%;
              object-fit: cover;
            }

            .chip-name {
              max-width: 140px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .chip-workload-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              flex-shrink: 0;

              &.workload-light { background: #2E7D32; }
              &.workload-medium { background: #F0A500; }
              &.workload-heavy { background: #C62828; }
            }

            .chip-remove-btn {
              background: transparent;
              border: none;
              color: #64748B;
              cursor: pointer;
              display: flex;
              align-items: center;
              padding: 0;

              &:hover {
                color: #EF4444;
              }

              .material-symbols-outlined {
                font-size: 15px;
              }
            }
          }

          .search-input {
            flex: 1;
            min-width: 140px;
            border: none;
            outline: none;
            background: transparent;
            font-size: 0.9rem;
            color: #1E293B;
            padding: 6px 4px;

            &::placeholder {
              color: #94A3B8;
              font-size: 0.85rem;
            }
          }
        }

        .picker-actions {
          display: flex;
          align-items: center;
          gap: 4px;

          .clear-all-btn {
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;

            &:hover {
              color: #EF4444;
            }

            .material-symbols-outlined {
              font-size: 18px;
            }
          }

          .dropdown-arrow {
            font-size: 22px;
            color: #64748B;
            transition: transform 0.2s ease;

            &.rotated {
              transform: rotate(180deg);
            }
          }
        }
      }

      /* DESKTOP DROPDOWN */
      .desktop-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        background: #FFFFFF;
        border: 1px solid #CBD5E1;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        max-height: 380px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: fadeIn 0.15s ease-out;

        .filter-chips-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-bottom: 1px solid #F1F5F9;
          overflow-x: auto;
          background: #F8FAFC;
          scrollbar-width: thin;

          .filter-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 9999px;
            border: 1px solid #E2E8F0;
            background: #FFFFFF;
            color: #475569;
            font-size: 0.76rem;
            font-weight: 500;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease;

            .chip-icon {
              font-size: 14px;
            }

            &:hover {
              background: #EEF4FC;
              border-color: #B4D1FA;
              color: #1F3864;
            }

            &.active {
              background: #1F3864;
              border-color: #1F3864;
              color: #FFFFFF;
              font-weight: 600;

              .chip-icon { color: #FFFFFF; }
            }
          }
        }

        .dropdown-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          font-size: 0.74rem;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: #FFFFFF;
          border-bottom: 1px solid #F8FAFC;

          .results-count {
            font-weight: 500;
            text-transform: none;
          }

          .spin-icon {
            font-size: 16px;
            animation: spin 1s linear infinite;
          }
        }

        .dropdown-list-items {
          flex: 1;
          overflow-y: auto;
          padding: 4px 0;
          max-height: 280px;

          .loading-state,
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            text-align: center;
            color: #64748B;
            font-size: 0.85rem;
            gap: 6px;

            .empty-icon {
              font-size: 36px;
              color: #94A3B8;
            }

            small {
              font-size: 0.76rem;
              color: #94A3B8;
            }
          }

          .user-list-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            cursor: pointer;
            transition: background 0.15s ease;
            border-bottom: 1px solid #F8FAFC;

            &:hover,
            &.highlighted {
              background: #F1F5F9;
            }

            &.selected {
              background: #EFF6FF;
            }

            .avatar-wrapper {
              position: relative;

              .user-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                object-fit: cover;
              }

              .workload-badge {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                border: 2px solid #FFFFFF;

                &.workload-light { background: #2E7D32; }
                &.workload-medium { background: #F0A500; }
                &.workload-heavy { background: #C62828; }
              }
            }

            .user-meta {
              flex: 1;
              overflow: hidden;

              .name-row {
                display: flex;
                align-items: center;
                gap: 6px;

                .user-name {
                  font-size: 0.88rem;
                  font-weight: 600;
                  color: #1E293B;
                }

                .collab-tag {
                  display: inline-flex;
                  align-items: center;
                  gap: 2px;
                  font-size: 0.68rem;
                  background: #FEF3C7;
                  color: #92400E;
                  padding: 1px 6px;
                  border-radius: 9999px;
                  font-weight: 600;

                  .material-symbols-outlined {
                    font-size: 12px;
                  }
                }
              }

              .user-sub {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 0.76rem;
                color: #64748B;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;

                .dot-separator { color: #CBD5E1; }
                .loc-badge { color: #1E40AF; font-weight: 500; }
              }
            }

            .item-right-action {
              display: flex;
              align-items: center;
              gap: 8px;

              .workload-pill {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: 9999px;
                font-size: 0.72rem;
                font-weight: 600;

                .dot {
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                }

                &.workload-light {
                  background: #DCFCE7;
                  color: #166534;
                  .dot { background: #166534; }
                }
                &.workload-medium {
                  background: #FEF3C7;
                  color: #92400E;
                  .dot { background: #D97706; }
                }
                &.workload-heavy {
                  background: #FEE2E2;
                  color: #991B1B;
                  .dot { background: #DC2626; }
                }
              }

              .quick-call-btn {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: #EEF4FC;
                color: #1F3864;
                display: flex;
                align-items: center;
                justify-content: center;
                text-decoration: none;
                transition: all 0.15s ease;

                &:hover {
                  background: #1F3864;
                  color: #FFFFFF;
                }

                .material-symbols-outlined {
                  font-size: 15px;
                }
              }

              .selection-checkbox {
                color: #CBD5E1;
                display: flex;
                align-items: center;

                &.checked {
                  color: #1F3864;
                }

                .material-symbols-outlined {
                  font-size: 22px;
                }
              }
            }
          }
        }
      }

      /* MOBILE FULLSCREEN MODAL */
      .mobile-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2000;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }

      .mobile-modal-sheet {
        background: #FFFFFF;
        width: 100%;
        height: 92vh;
        border-radius: 20px 20px 0 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: slideUp 0.25s ease-out;

        .mobile-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #E2E8F0;
          background: #F8FAFC;

          .close-modal-btn {
            background: transparent;
            border: none;
            color: #64748B;
            font-size: 24px;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
          }

          .modal-title-box {
            text-align: center;
            .modal-title {
              font-size: 1rem;
              font-weight: 700;
              color: #1F3864;
            }
            .modal-subtitle {
              font-size: 0.75rem;
              color: #64748B;
            }
          }

          .done-modal-btn {
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 6px;
            padding: 6px 14px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
          }
        }

        .mobile-search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 12px 16px 8px;
          padding: 0 12px;
          background: #F1F5F9;
          border-radius: 10px;
          border: 1px solid #CBD5E1;

          .search-icon {
            color: #64748B;
            font-size: 20px;
          }

          .mobile-search-input {
            flex: 1;
            border: none;
            background: transparent;
            padding: 10px 0;
            font-size: 0.95rem;
            outline: none;
            color: #1E293B;
          }

          .clear-search-btn {
            background: transparent;
            border: none;
            color: #94A3B8;
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
          }
        }

        .mobile-filters-scroll {
          display: flex;
          gap: 6px;
          padding: 6px 16px;
          overflow-x: auto;
          scrollbar-width: none;
          background: #FFFFFF;

          .filter-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            border-radius: 9999px;
            border: 1px solid #E2E8F0;
            background: #F8FAFC;
            color: #475569;
            font-size: 0.8rem;
            white-space: nowrap;

            &.active {
              background: #1F3864;
              color: #FFFFFF;
              border-color: #1F3864;
              font-weight: 600;
            }
          }
        }

        .mobile-selected-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: #EEF4FC;
          border-top: 1px solid #E2E8F0;
          border-bottom: 1px solid #E2E8F0;

          .selected-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: #1E40AF;
            white-space: nowrap;
          }

          .selected-chips-scroll {
            display: flex;
            gap: 6px;
            overflow-x: auto;

            .mobile-selected-chip {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              background: #FFFFFF;
              border: 1px solid #BFDBFE;
              border-radius: 9999px;
              padding: 2px 8px;
              font-size: 0.75rem;
              color: #1E3A8A;
              white-space: nowrap;

              button {
                background: transparent;
                border: none;
                color: #EF4444;
                padding: 0;
                display: flex;
                align-items: center;
                .material-symbols-outlined { font-size: 14px; }
              }
            }
          }
        }

        .mobile-user-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 16px;

          .mobile-user-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 10px;
            border-bottom: 1px solid #F1F5F9;
            border-radius: 8px;
            min-height: 56px;

            &.selected {
              background: #EFF6FF;
            }

            .mobile-avatar-box {
              position: relative;

              .mobile-avatar {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                object-fit: cover;
              }

              .workload-dot {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid #FFFFFF;

                &.workload-light { background: #2E7D32; }
                &.workload-medium { background: #F0A500; }
                &.workload-heavy { background: #C62828; }
              }
            }

            .mobile-user-info {
              flex: 1;
              overflow: hidden;

              .mobile-name-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;

                .user-fullname {
                  font-size: 0.95rem;
                  color: #1E293B;
                }

                .mobile-workload-text {
                  font-size: 0.72rem;
                  font-weight: 600;

                  &.workload-light { color: #166534; }
                  &.workload-medium { color: #B45309; }
                  &.workload-heavy { color: #B91C1C; }
                }
              }

              .mobile-sub-row {
                font-size: 0.8rem;
                color: #64748B;
                margin-top: 2px;
              }

              .mobile-loc-row {
                display: flex;
                align-items: center;
                gap: 2px;
                font-size: 0.74rem;
                color: #1E40AF;
                margin-top: 2px;

                .material-symbols-outlined {
                  font-size: 14px;
                }
              }
            }

            .mobile-item-actions {
              display: flex;
              align-items: center;
              gap: 10px;

              .mobile-call-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: #EEF4FC;
                color: #1F3864;
                display: flex;
                align-items: center;
                justify-content: center;
                text-decoration: none;

                .material-symbols-outlined {
                  font-size: 20px;
                }
              }

              .mobile-checkbox {
                color: #CBD5E1;
                display: flex;
                align-items: center;

                &.checked {
                  color: #1F3864;
                }

                .material-symbols-outlined {
                  font-size: 26px;
                }
              }
            }
          }
        }

        .mobile-bottom-bar {
          padding: 12px 16px;
          border-top: 1px solid #E2E8F0;
          background: #FFFFFF;

          .confirm-btn {
            width: 100%;
            min-height: 48px;
            background: #1F3864;
            color: #FFFFFF;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class PeoplePickerComponent implements OnInit, OnDestroy, ControlValueAccessor {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private elementRef = inject(ElementRef);

  @Input() mode: 'single' | 'multi' = 'multi';
  @Input() label?: string;
  @Input() placeholder = 'Tìm kiếm và chọn nhân sự...';
  @Input() required = false;
  @Input() disabled = false;
  @Input() filterOrgUnitId?: string;
  @Input() filterLocationId?: string;
  @Input() excludeUserIds: string[] = [];

  @Input() set selectedUserIds(ids: string[]) {
    if (ids && ids.length > 0) {
      this.loadUsersByIds(ids);
    } else {
      this.selectedUsers.set([]);
    }
  }

  @Output() selectedUsersChange = new EventEmitter<UserPickerItem[]>();
  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() userSelected = new EventEmitter<UserPickerItem>();
  @Output() userRemoved = new EventEmitter<UserPickerItem>();

  searchQuery = '';
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  isOpen = signal(false);
  isLoading = signal(false);
  userList = signal<UserPickerItem[]>([]);
  selectedUsers = signal<UserPickerItem[]>([]);
  highlightedIndex = signal<number>(-1);

  locations = signal<LocationItem[]>([]);
  orgUnits = signal<OrgUnitItem[]>([]);

  activeFilterType = signal<'ALL' | 'RECENT' | 'LOCATION' | 'ORG'>('RECENT');
  activeFilterValue = signal<string>('');

  touched = false;
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  listHeaderText = computed(() => {
    if (this.searchQuery.trim()) {
      return `Kết quả tìm kiếm "${this.searchQuery.trim()}"`;
    }
    if (this.activeFilterType() === 'RECENT') {
      return '⚡ Gợi ý gần đây / thường xuyên phối hợp';
    }
    if (this.activeFilterType() === 'LOCATION') {
      const loc = this.locations().find((l) => l.id === this.activeFilterValue());
      return loc ? `Điểm trường: ${loc.name}` : 'Lọc theo điểm trường';
    }
    if (this.activeFilterType() === 'ORG') {
      const org = this.orgUnits().find((o) => o.id === this.activeFilterValue());
      return org ? `Tổ: ${org.name}` : 'Lọc theo tổ';
    }
    return '👥 Toàn bộ cán bộ giáo viên';
  });

  isMobileView(): boolean {
    return window.innerWidth < 768;
  }

  ngOnInit() {
    this.loadFilterOptions();

    this.searchSub = this.searchSubject
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((query) => {
        this.executeSearch(query);
      });

    // Tải danh sách mặc định (recent collaborators hoặc top users)
    this.loadDefaultList();
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    if (Array.isArray(value)) {
      this.loadUsersByIds(value);
    } else if (typeof value === 'string' && value) {
      this.loadUsersByIds([value]);
    } else {
      this.selectedUsers.set([]);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  private loadFilterOptions() {
    this.userService.getLocations().subscribe({
      next: (locs) => this.locations.set(locs),
      error: () => {},
    });

    this.userService.getOrgUnits().subscribe({
      next: (orgs) => this.orgUnits.set(orgs),
      error: () => {},
    });
  }

  onBoxClick(event: MouseEvent) {
    if (this.disabled) return;
    this.openDropdown();
  }

  openDropdown() {
    if (this.disabled) return;
    this.isOpen.set(true);
    if (!this.searchQuery && this.userList().length === 0) {
      this.loadDefaultList();
    }
  }

  closeDropdown() {
    this.isOpen.set(false);
    this.touched = true;
    this.onTouched();
  }

  onSearchInputChange(value: string) {
    if (value.trim().length > 0) {
      this.activeFilterType.set('ALL');
    }
    this.searchSubject.next(value);
  }

  clearSearch() {
    this.searchQuery = '';
    this.activeFilterType.set('RECENT');
    this.loadDefaultList();
  }

  setFilter(type: 'ALL' | 'RECENT' | 'LOCATION' | 'ORG', value: string) {
    this.activeFilterType.set(type);
    this.activeFilterValue.set(value);
    this.searchQuery = '';

    if (type === 'RECENT') {
      this.loadRecentCollaborators();
    } else {
      this.executeSearch('');
    }
  }

  private loadDefaultList() {
    const currentUser = this.authService.currentUser();
    if (currentUser?.id) {
      this.loadRecentCollaborators();
    } else {
      this.executeSearch('');
    }
  }

  private loadRecentCollaborators() {
    const currentUser = this.authService.currentUser();
    if (!currentUser?.id) {
      this.executeSearch('');
      return;
    }

    this.isLoading.set(true);
    this.userService.getRecentCollaborators(currentUser.id, 12).subscribe({
      next: (users) => {
        this.isLoading.set(false);
        const filtered = this.filterExcluded(users);
        this.userList.set(filtered);
      },
      error: () => {
        this.isLoading.set(false);
        this.executeSearch('');
      },
    });
  }

  private executeSearch(query: string) {
    this.isLoading.set(true);
    const params: any = {
      search: query,
      pageSize: 45,
    };

    if (this.activeFilterType() === 'LOCATION' && this.activeFilterValue()) {
      params.locationId = this.activeFilterValue();
    } else if (this.filterLocationId) {
      params.locationId = this.filterLocationId;
    }

    if (this.activeFilterType() === 'ORG' && this.activeFilterValue()) {
      params.orgUnitId = this.activeFilterValue();
    } else if (this.filterOrgUnitId) {
      params.orgUnitId = this.filterOrgUnitId;
    }

    this.userService.searchUsers(params).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const filtered = this.filterExcluded(res.items);
        this.userList.set(filtered);
      },
      error: () => {
        this.isLoading.set(false);
        this.userList.set([]);
      },
    });
  }

  private filterExcluded(users: UserPickerItem[]): UserPickerItem[] {
    if (!this.excludeUserIds || this.excludeUserIds.length === 0) {
      return users;
    }
    return users.filter((u) => !this.excludeUserIds.includes(u.id));
  }

  private loadUsersByIds(ids: string[]) {
    // Tìm trong userList hiện tại trước
    const existing = this.userList().filter((u) => ids.includes(u.id));
    if (existing.length === ids.length) {
      this.selectedUsers.set(existing);
      return;
    }

    // Tải từ API search
    this.userService.searchUsers({ pageSize: 100 }).subscribe({
      next: (res) => {
        const found = res.items.filter((u) => ids.includes(u.id));
        this.selectedUsers.set(found);
      },
      error: () => {},
    });
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers().some((u) => u.id === userId);
  }

  toggleUserSelection(user: UserPickerItem) {
    if (this.mode === 'single') {
      this.selectedUsers.set([user]);
      this.emitChanges();
      this.closeDropdown();
      this.searchQuery = '';
      this.userSelected.emit(user);
      return;
    }

    const current = this.selectedUsers();
    const index = current.findIndex((u) => u.id === user.id);

    if (index >= 0) {
      const updated = current.filter((u) => u.id !== user.id);
      this.selectedUsers.set(updated);
      this.userRemoved.emit(user);
    } else {
      const updated = [...current, user];
      this.selectedUsers.set(updated);
      this.userSelected.emit(user);
    }

    this.emitChanges();
  }

  removeUser(user: UserPickerItem, event: MouseEvent) {
    event.stopPropagation();
    const updated = this.selectedUsers().filter((u) => u.id !== user.id);
    this.selectedUsers.set(updated);
    this.userRemoved.emit(user);
    this.emitChanges();
  }

  clearAll(event: MouseEvent) {
    event.stopPropagation();
    this.selectedUsers.set([]);
    this.emitChanges();
  }

  private emitChanges() {
    const users = this.selectedUsers();
    const ids = users.map((u) => u.id);

    this.selectedUsersChange.emit(users);
    this.selectionChange.emit(ids);

    if (this.mode === 'single') {
      this.onChange(ids.length > 0 ? ids[0] : null);
    } else {
      this.onChange(ids);
    }

    this.touched = true;
    this.onTouched();
  }

  onKeyDown(event: KeyboardEvent) {
    const list = this.userList();
    if (!this.isOpen() || list.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (this.highlightedIndex() + 1) % list.length;
      this.highlightedIndex.set(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (this.highlightedIndex() - 1 + list.length) % list.length;
      this.highlightedIndex.set(prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.highlightedIndex();
      if (idx >= 0 && idx < list.length) {
        this.toggleUserSelection(list[idx]);
      }
    } else if (event.key === 'Escape') {
      this.closeDropdown();
    }
  }

  getWorkloadClass(count: number): string {
    if (count <= 2) return 'workload-light';
    if (count <= 5) return 'workload-medium';
    return 'workload-heavy';
  }

  getWorkloadLabel(count: number): string {
    if (count <= 2) return 'Tải nhẹ';
    if (count <= 5) return 'Tải vừa';
    return 'Tải cao / Bận';
  }

  getWorkloadTitle(count: number): string {
    if (count <= 2) return `Đang xử lý ${count} việc (Tải công việc nhẹ - Nên ưu tiên giao việc)`;
    if (count <= 5) return `Đang xử lý ${count} việc (Tải công việc vừa phải)`;
    return `Đang xử lý ${count} việc (Tải công việc cao / Bận - Cần cân nhắc khi giao thêm việc)`;
  }
}
