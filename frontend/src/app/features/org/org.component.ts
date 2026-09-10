import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { ContactCardService } from '../../core/services/contact-card.service';
import {
  LocationItem,
  OrgTreeNode,
  UserPickerItem,
} from '../../core/models/user.models';
import { TaskItem } from '../../core/models/task.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-org',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, PaginationComponent],
  template: `
    <div class="org-page-container">
      <!-- HEADER -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <span class="material-symbols-outlined">corporate_fare</span>
            <span>CƠ CẤU TỔ CHỨC & PHÂN HIỆU</span>
          </div>
          <h1 class="page-title">Sơ Đồ Tổ Chức & 3 Điểm Trường</h1>
          <p class="page-subtitle">
            Mô hình sáp nhập: TH và THCS Phước Tân gồm 3 điểm trường (Trung tâm, Phân hiệu 1, Phân hiệu 2) và 8 tổ chuyên môn.
          </p>
        </div>
      </header>

      <!-- CAMPUS HERO CARDS (3 ĐIỂM TRƯỜNG) -->
      <section class="campuses-cards-grid">
        @for (loc of locations(); track loc.id; let idx = $index) {
          <div
            class="campus-card tap-target"
            [class.active]="selectedLocationId() === loc.id"
            [ngClass]="'campus-theme-' + (idx + 1)"
            (click)="selectLocation(loc.id)"
          >
            <div class="campus-card-header">
              <div class="campus-icon-box">
                <span class="material-symbols-outlined">school</span>
              </div>
              <div class="campus-tag-pill">
                {{ loc.code }}
              </div>
            </div>

            <h3 class="campus-name">{{ loc.name }}</h3>
            <p class="campus-address">
              <span class="material-symbols-outlined">place</span>
              <span>{{ loc.address || 'Khu vực trường TH và THCS Phước Tân' }}</span>
            </p>

            <div class="campus-footer-metrics">
              <div class="metric-item">
                <span class="material-symbols-outlined">people</span>
                <span>{{ getLocationUserCount(loc.id) }} cán bộ GV</span>
              </div>
              <div class="metric-item">
                <span class="material-symbols-outlined">assignment</span>
                <span>{{ getLocationTaskCount(loc.id) }} công việc</span>
              </div>
              <a
                [href]="'tel:' + (loc.phone || '0912111001')"
                class="campus-call-btn tap-target"
                (click)="$event.stopPropagation()"
                title="Gọi hotline điểm trường"
              >
                <span class="material-symbols-outlined">call</span>
              </a>
            </div>
          </div>
        }
      </section>

      <!-- VIEW SELECTOR TABS & CAMPUS FILTER -->
      <div class="view-tabs-bar">
        <div class="tabs-group">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'tree'"
            (click)="activeTab.set('tree')"
          >
            <span class="material-symbols-outlined">account_tree</span>
            <span>Sơ đồ cây tổ chức & Tổ chuyên môn</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'campus-detail'"
            (click)="activeTab.set('campus-detail')"
          >
            <span class="material-symbols-outlined">domain</span>
            <span>Chi tiết nhân sự & Việc tại Điểm trường</span>
          </button>
        </div>

        @if (activeTab() === 'tree') {
          <div class="tree-filter-box">
            <span class="material-symbols-outlined filter-icon">filter_alt</span>
            <select class="tree-loc-select tap-target" [(ngModel)]="treeLocationFilter" (ngModelChange)="onTreeLocationFilterChange()">
              <option value="">Tất cả điểm trường (Toàn trường)</option>
              @for (loc of locations(); track loc.id) {
                <option [value]="loc.id">{{ loc.name }}</option>
              }
            </select>
          </div>
        }
      </div>

      <!-- TAB 1: SƠ ĐỒ CÂY TỔ CHỨC -->
      @if (activeTab() === 'tree') {
        <section class="org-tree-section">
          @if (isLoadingTree()) {
            <div class="org-tree-skeleton">
              @for (item of [1, 2, 3, 4]; track item) {
                <div class="skeleton-card" style="margin-bottom: 10px;">
                  <div style="display: flex; gap: 12px; align-items: center;">
                    <div class="skeleton-avatar" style="border-radius: 8px;"></div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                      <div class="skeleton-line w-50 h-20"></div>
                      <div class="skeleton-line w-30"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="org-tree-nodes-list">
              @for (node of filteredOrgTree(); track node.id) {
                <div class="org-node-card">
                  <div class="org-node-header" (click)="toggleOrgNode(node.id)">
                    <button type="button" class="btn-tree-toggle">
                      <span class="material-symbols-outlined">
                        {{ isExpanded(node.id) ? 'expand_more' : 'chevron_right' }}
                      </span>
                    </button>

                    <div class="org-badge-icon">
                      <span class="material-symbols-outlined">groups</span>
                    </div>

                    <div class="org-main-info">
                      <div class="org-title-row">
                        <h3 class="org-name">{{ node.name }}</h3>
                        <span class="org-code-tag">{{ node.code }}</span>
                      </div>
                      <span class="org-counts-text">
                        {{ node.userCount }} nhân sự @if (treeLocationFilter) { tại điểm trường được chọn } @else { toàn trường } • {{ node.taskCount }} công việc đang triển khai
                      </span>
                    </div>

                    <!-- LEADER CHIP (CLICK-TO-CALL) -->
                    @if (node.leader) {
                      <div
                        class="leader-chip tap-target"
                        [class.is-current-user]="isCurrentUser(node.leader.id)"
                        (click)="openUserContact(node.leader, $event)"
                        title="Tổ trưởng / Trưởng đơn vị"
                      >
                        <img
                          [src]="node.leader.avatarUrl || 'assets/images/default-avatar.svg'"
                          class="leader-avatar"
                          [alt]="node.leader.fullName"
                        />
                        <div class="leader-info">
                          <span class="leader-role">{{ isCurrentUser(node.leader.id) ? '👑 Bạn là Tổ trưởng:' : '👑 Tổ trưởng:' }}</span>
                          <span class="leader-name">{{ node.leader.fullName }}</span>
                        </div>
                        @if (node.leader.phone) {
                          <a
                            [href]="'tel:' + node.leader.phone"
                            class="leader-call-btn"
                            (click)="$event.stopPropagation()"
                            [title]="'Gọi ngay: ' + node.leader.phone"
                          >
                            <span class="material-symbols-outlined">call</span>
                            <span class="call-phone-text">{{ node.leader.phone }}</span>
                          </a>
                        }
                      </div>
                    }
                  </div>

                  <!-- EXPANDED MEMBERS LIST -->
                  @if (isExpanded(node.id)) {
                    <div class="org-expanded-content">
                      <h4 class="members-sub-title">
                        <span class="material-symbols-outlined">badge</span>
                        <span>Danh sách nhân sự thuộc {{ node.name }}:</span>
                      </h4>

                      @if ((node.users || []).length === 0) {
                        <p class="empty-node-text">Không có nhân sự nào thuộc điểm trường này trong tổ.</p>
                      } @else {
                        <div class="org-members-grid">
                          @for (user of node.users || []; track user.id) {
                            <div
                              class="member-mini-card tap-target"
                              [class.is-current-user]="isCurrentUser(user.id)"
                              [class.is-leader-card]="user.isToTruong || user.id === node.leader?.id"
                              (click)="openUserContact(user, $event)"
                            >
                              <div class="member-avatar-wrapper">
                                <img
                                  [src]="user.avatarUrl || 'assets/images/default-avatar.svg'"
                                  class="member-avatar"
                                  [alt]="user.fullName"
                                />
                                <span
                                  class="workload-dot"
                                  [ngClass]="getWorkloadClass(user.currentTaskLoad)"
                                  [title]="'Tải công việc: ' + user.currentTaskLoad + ' việc đang làm'"
                                ></span>
                              </div>

                              <div class="member-info">
                                <div class="member-name-line">
                                  <strong class="member-name">{{ user.fullName }}</strong>
                                  @if (user.isToTruong || user.id === node.leader?.id) {
                                    <span class="leader-badge-pill" title="Tổ trưởng tổ chuyên môn">👑 Tổ trưởng</span>
                                  }
                                  @if (isCurrentUser(user.id)) {
                                    <span class="current-user-tag">⭐ Bạn</span>
                                  }
                                </div>
                                <span class="member-title">{{ (user.isToTruong || user.id === node.leader?.id) ? ('Tổ trưởng • ' + (user.title || 'Giáo viên')) : (user.title || 'Giáo viên') }}</span>
                                <span class="member-loc-pill" [ngClass]="getLocationBadgeClass(user.primaryLocation?.name)">
                                  {{ user.primaryLocation?.name || 'Điểm chính' }}
                                </span>
                              </div>

                              @if (user.phone) {
                                <a
                                  [href]="'tel:' + user.phone"
                                  class="btn-call-member tap-target"
                                  (click)="$event.stopPropagation()"
                                  [title]="'Gọi ngay: ' + user.phone"
                                >
                                  <span class="material-symbols-outlined">call</span>
                                  <span class="call-phone-text">{{ user.phone }}</span>
                                </a>
                              }
                            </div>
                          }
                        </div>
                      }

                      <!-- SUB ORG UNITS IF ANY -->
                      @if (node.children && node.children.length > 0) {
                        <div class="nested-sub-orgs">
                          @for (sub of node.children; track sub.id) {
                            <div class="sub-org-box">
                              <strong>{{ sub.name }}</strong> ({{ sub.userCount }} nhân sự)
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- TAB 2: CHI TIẾT ĐIỂM TRƯỜNG (NHÂN SỰ & CÔNG VIỆC) -->
      @if (activeTab() === 'campus-detail') {
        <section class="campus-detail-section">
          <!-- SELECTOR DROPDOWN -->
          <div class="campus-filter-banner">
            <div class="banner-left">
              <label class="banner-label">Đang xem Điểm trường:</label>
              <select class="campus-select tap-target" [(ngModel)]="selectedLocationId" (ngModelChange)="onLocationChange()">
                @for (loc of locations(); track loc.id) {
                  <option [value]="loc.id">{{ loc.name }} ({{ loc.code }})</option>
                }
              </select>
            </div>

            <div class="banner-right">
              <span class="badge-total">{{ campusUsers().length }} nhân sự</span>
              <span class="badge-total tasks">{{ campusTasks().length }} công việc</span>
            </div>
          </div>

          <!-- 2-COLUMN SPLIT: ROSTER (LEFT) + TASKS AT CAMPUS (RIGHT) -->
          <div class="campus-split-grid">
            <!-- ROSTER CARD -->
            <div class="campus-sub-card">
              <div class="sub-card-header">
                <div class="header-title">
                  <span class="material-symbols-outlined">badge</span>
                  <h3>Cán bộ & Giáo viên tại điểm trường</h3>
                </div>
                <span class="sub-count">{{ campusUsers().length }} người</span>
              </div>

              <div class="roster-list">
                @for (u of pagedCampusUsers(); track u.id) {
                  <div
                    class="roster-item tap-target"
                    [class.is-current-user]="isCurrentUser(u.id)"
                    (click)="openUserContact(u, $event)"
                  >
                    <div class="user-avatar-box">
                      <img [src]="u.avatarUrl || 'assets/images/default-avatar.svg'" class="avatar-img" alt="" />
                      <span
                        class="workload-indicator"
                        [ngClass]="getWorkloadClass(u.currentTaskLoad)"
                        [title]="'Số việc đang xử lý: ' + u.currentTaskLoad"
                      ></span>
                    </div>

                    <div class="user-meta-box">
                      <div class="name-row">
                        <strong class="user-name">{{ u.fullName }}</strong>
                        @if (isToTruongUser(u)) {
                          <span class="leader-badge-pill" title="Tổ trưởng tổ chuyên môn">👑 Tổ trưởng</span>
                        }
                        @if (isCurrentUser(u.id)) {
                          <span class="current-user-tag">⭐ Vị trí của bạn</span>
                        }
                        <span class="task-load-badge" [ngClass]="getWorkloadClass(u.currentTaskLoad)">
                          {{ u.currentTaskLoad }} việc
                        </span>
                      </div>
                      <span class="user-title">{{ isToTruongUser(u) ? ('Tổ trưởng • ' + (u.title || 'Giáo viên')) : (u.title || 'Giáo viên') }}</span>
                      <span class="user-org">{{ u.primaryOrgUnit?.name }}</span>
                    </div>

                    @if (u.phone) {
                      <a [href]="'tel:' + u.phone" class="btn-call-circle" (click)="$event.stopPropagation()" [title]="'Gọi ngay: ' + u.phone">
                        <span class="material-symbols-outlined">call</span>
                        <span class="call-phone-text">{{ u.phone }}</span>
                      </a>
                    }
                  </div>
                }
              </div>

              <!-- PAGINATION USERS -->
              <app-pagination
                [totalItems]="campusUsers().length"
                [pageSize]="usersPageSize()"
                [currentPage]="currentUsersPage()"
                [pageSizeOptions]="[6, 12, 24]"
                itemName="nhân sự"
                (pageChange)="onUsersPageChange($event)"
                (pageSizeChange)="onUsersPageSizeChange($event)"
              ></app-pagination>
            </div>

            <!-- TASKS AT CAMPUS CARD -->
            <div class="campus-sub-card">
              <div class="sub-card-header">
                <div class="header-title">
                  <span class="material-symbols-outlined">assignment</span>
                  <h3>Công việc đang triển khai tại đây</h3>
                </div>
                <span class="sub-count">{{ campusTasks().length }} việc</span>
              </div>

              <div class="campus-tasks-list">
                @if (campusTasks().length === 0) {
                  <div class="empty-tasks-state">
                    <span class="material-symbols-outlined">task_alt</span>
                    <p>Hiện không có công việc nào đang thực hiện tại điểm trường này.</p>
                  </div>
                } @else {
                  @for (t of pagedCampusTasks(); track t.id) {
                    <div class="campus-task-item tap-target" (click)="goToTask(t.id)">
                      <div class="task-top">
                        <span class="t-code">{{ t.code || 'CV-' + t.id.slice(0, 4) }}</span>
                        <app-status-badge [status]="t.status"></app-status-badge>
                        <span class="t-due">{{ formatDate(t.dueDate) }}</span>
                      </div>

                      <h4 class="t-title">{{ t.title }}</h4>

                      <div class="task-bottom">
                        <span class="t-chutri">
                          <span class="material-symbols-outlined icon-mini">person</span>
                          <span>Chủ trì: {{ getChuTriName(t) }}</span>
                        </span>
                        <span class="t-prog">{{ t.progressPercent || 0 }}%</span>
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- PAGINATION TASKS -->
              <app-pagination
                [totalItems]="campusTasks().length"
                [pageSize]="tasksPageSize()"
                [currentPage]="currentTasksPage()"
                [pageSizeOptions]="[6, 12, 24]"
                itemName="công việc"
                (pageChange)="onTasksPageChange($event)"
                (pageSizeChange)="onTasksPageSizeChange($event)"
              ></app-pagination>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .org-page-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding-bottom: 32px;
      }

      /* HEADER */
      .page-header {
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
      }

      /* CAMPUS CARDS (3 ĐIỂM TRƯỜNG) */
      .campuses-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;

        .campus-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          }

          &.active {
            border-color: #1F3864;
            background: #F8FAFC;
            box-shadow: 0 8px 24px rgba(31, 56, 100, 0.12);
          }

          .campus-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;

            .campus-icon-box {
              width: 40px;
              height: 40px;
              border-radius: 10px;
              background: #EEF4FC;
              color: #1F3864;
              display: flex;
              align-items: center;
              justify-content: center;

              .material-symbols-outlined {
                font-size: 22px;
              }
            }

            .campus-tag-pill {
              font-size: 0.75rem;
              font-weight: 800;
              padding: 2px 8px;
              border-radius: 9999px;
              background: #F1F5F9;
              color: #475569;
            }
          }

          .campus-name {
            margin: 0;
            font-size: 1.15rem;
            font-weight: 800;
            color: #1E293B;
          }

          .campus-address {
            margin: 0;
            font-size: 0.82rem;
            color: #64748B;
            display: flex;
            align-items: center;
            gap: 4px;

            .material-symbols-outlined {
              font-size: 16px;
              color: #94A3B8;
            }
          }

          .campus-footer-metrics {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 10px;
            border-top: 1px solid #F1F5F9;
            margin-top: 4px;

            .metric-item {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 0.8rem;
              font-weight: 600;
              color: #475569;

              .material-symbols-outlined {
                font-size: 16px;
                color: #1F3864;
              }
            }

            .campus-call-btn {
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: #2E7D32;
              color: #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              text-decoration: none;

              .material-symbols-outlined {
                font-size: 16px;
              }

              &:hover {
                background: #1B5E20;
              }
            }
          }

          &.campus-theme-1 { border-top: 4px solid #1F3864; }
          &.campus-theme-2 { border-top: 4px solid #2E5EAA; }
          &.campus-theme-3 { border-top: 4px solid #0D9488; }
        }
      }

      /* VIEW TABS BAR */
      .view-tabs-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 2px solid #E2E8F0;
        padding-bottom: 2px;
        flex-wrap: wrap;

        .tabs-group {
          display: flex;
          gap: 8px;
        }

        .tab-btn {
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

          &:hover {
            color: #1F3864;
            background: #F8FAFC;
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

        .tree-filter-box {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: #EEF4FC;
          border-radius: 8px;
          border: 1px solid #BFDBFE;

          .filter-icon {
            font-size: 18px;
            color: #1F3864;
          }

          .tree-loc-select {
            padding: 4px 8px;
            border: none;
            background: transparent;
            font-size: 0.85rem;
            font-weight: 700;
            color: #1F3864;
            outline: none;
          }
        }
      }

      /* ORG TREE SECTION */
      .org-tree-nodes-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .org-node-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);

          .org-node-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 18px;
            cursor: pointer;
            user-select: none;

            &:hover {
              background-color: #F8FAFC;
            }

            .btn-tree-toggle {
              background: transparent;
              border: none;
              color: #64748B;
              display: flex;
              cursor: pointer;
            }

            .org-badge-icon {
              width: 36px;
              height: 36px;
              border-radius: 8px;
              background: #EEF4FC;
              color: #1F3864;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }

            .org-main-info {
              flex: 1;
              min-width: 0;

              .org-title-row {
                display: flex;
                align-items: center;
                gap: 8px;

                .org-name {
                  margin: 0;
                  font-size: 1.05rem;
                  font-weight: 800;
                  color: #1E293B;
                }

                .org-code-tag {
                  font-family: monospace;
                  font-size: 0.72rem;
                  font-weight: 700;
                  background: #F1F5F9;
                  color: #475569;
                  padding: 1px 6px;
                  border-radius: 4px;
                }
              }

              .org-counts-text {
                font-size: 0.8rem;
                color: #64748B;
              }
            }

            .leader-chip {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 4px 10px;
              background: #FFFDF5;
              border: 1px solid #FDE68A;
              border-radius: 9999px;

              .leader-avatar {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                object-fit: cover;
                border: 1.5px solid #F59E0B;
              }

              .leader-info {
                display: flex;
                flex-direction: column;

                .leader-role {
                  font-size: 0.65rem;
                  font-weight: 700;
                  color: #B45309;
                }

                .leader-name {
                  font-size: 0.82rem;
                  font-weight: 700;
                  color: #1F3864;
                }
              }

              .leader-call-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 7px;
                border-radius: 6px;
                background: #EEF4FC;
                border: 1px solid #BFDBFE;
                color: #1F3864;
                text-decoration: none;
                font-size: 0.72rem;
                font-weight: 600;
                white-space: nowrap;
                transition: all 0.15s ease;

                .material-symbols-outlined {
                  font-size: 13px;
                  color: #1F3864;
                }

                .call-phone-text {
                  letter-spacing: 0.2px;
                }

                &:hover {
                  background: #1F3864;
                  border-color: #1F3864;
                  color: #FFFFFF;
                  .material-symbols-outlined { color: #FFFFFF; }
                }
              }
            }
          }

          .org-expanded-content {
            padding: 16px 20px;
            background: #F8FAFC;
            border-top: 1px solid #E2E8F0;
            display: flex;
            flex-direction: column;
            gap: 12px;

            .empty-node-text {
              margin: 4px 0;
              font-size: 0.85rem;
              color: #94A3B8;
              font-style: italic;
            }

            .members-sub-title {
              margin: 0;
              font-size: 0.88rem;
              font-weight: 700;
              color: #475569;
              display: flex;
              align-items: center;
              gap: 6px;

              .material-symbols-outlined {
                font-size: 16px;
                color: #1F3864;
              }
            }

            .org-members-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
              gap: 10px;

              .member-mini-card {
                background: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 10px;
                padding: 10px 12px;
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;

                &:hover {
                  background: #EEF4FC;
                  border-color: #BFDBFE;
                }

                .member-avatar-wrapper {
                  position: relative;

                  .member-avatar {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    object-fit: cover;
                  }

                  .workload-dot {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid #FFFFFF;

                    &.load-low { background: #16A34A; }
                    &.load-med { background: #D97706; }
                    &.load-high { background: #DC2626; }
                  }
                }

                .member-info {
                  flex: 1;
                  min-width: 0;
                  display: flex;
                  flex-direction: column;
                  gap: 2px;

                  .member-name {
                    font-size: 0.85rem;
                    color: #1E293B;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  }

                  .member-title {
                    font-size: 0.72rem;
                    color: #64748B;
                  }

                  .member-loc-pill {
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 1px 6px;
                    border-radius: 4px;
                    width: fit-content;

                    &.badge-loc-main { background: #EEF4FC; color: #1F3864; }
                    &.badge-loc-sub1 { background: #CCFBF1; color: #0F766E; }
                    &.badge-loc-sub2 { background: #FEF3C7; color: #92400E; }
                  }
                }

                .btn-call-member {
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  padding: 2px 7px;
                  border-radius: 6px;
                  background: #EEF4FC;
                  border: 1px solid #BFDBFE;
                  color: #1F3864;
                  text-decoration: none;
                  font-size: 0.72rem;
                  font-weight: 600;
                  white-space: nowrap;
                  transition: all 0.15s ease;

                  .material-symbols-outlined {
                    font-size: 13px;
                    color: #1F3864;
                  }

                  .call-phone-text {
                    letter-spacing: 0.2px;
                  }

                  &:hover {
                    background: #1F3864;
                    border-color: #1F3864;
                    color: #FFFFFF;
                    .material-symbols-outlined { color: #FFFFFF; }
                  }
                }
              }
            }
          }
        }
      }

      /* TAB 2: CAMPUS DETAIL SPLIT */
      .campus-detail-section {
        display: flex;
        flex-direction: column;
        gap: 16px;

        .campus-filter-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          gap: 12px;
          flex-wrap: wrap;

          .banner-left {
            display: flex;
            align-items: center;
            gap: 10px;

            .banner-label {
              font-size: 0.88rem;
              font-weight: 700;
              color: #1E293B;
            }

            .campus-select {
              padding: 8px 14px;
              border-radius: 8px;
              border: 1.5px solid #1F3864;
              background: #EEF4FC;
              font-weight: 700;
              color: #1F3864;
              font-size: 0.9rem;
            }
          }

          .banner-right {
            display: flex;
            gap: 8px;

            .badge-total {
              padding: 4px 10px;
              border-radius: 9999px;
              background: #EEF4FC;
              color: #1F3864;
              font-size: 0.8rem;
              font-weight: 700;

              &.tasks {
                background: #DCFCE7;
                color: #166534;
              }
            }
          }
        }

        .campus-split-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;

          @media (max-width: 860px) {
            grid-template-columns: 1fr;
          }

          .campus-sub-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 14px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);

            .sub-card-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-bottom: 10px;
              border-bottom: 1px solid #E2E8F0;

              .header-title {
                display: flex;
                align-items: center;
                gap: 6px;

                .material-symbols-outlined {
                  font-size: 18px;
                  color: #1F3864;
                }

                h3 {
                  margin: 0;
                  font-size: 1rem;
                  font-weight: 800;
                  color: #1E293B;
                }
              }

              .sub-count {
                font-size: 0.82rem;
                font-weight: 700;
                color: #64748B;
              }
            }

            .roster-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
              max-height: 520px;
              overflow-y: auto;

              .roster-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 10px;

                &:hover {
                  background: #EEF4FC;
                }

                .user-avatar-box {
                  position: relative;

                  .avatar-img {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    object-fit: cover;
                  }

                  .workload-indicator {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 9px;
                    height: 9px;
                    border-radius: 50%;
                    border: 1.5px solid #FFFFFF;

                    &.load-low { background: #16A34A; }
                    &.load-med { background: #D97706; }
                    &.load-high { background: #DC2626; }
                  }
                }

                .user-meta-box {
                  flex: 1;
                  min-width: 0;

                  .name-row {
                    display: flex;
                    align-items: center;
                    gap: 6px;

                    .user-name {
                      font-size: 0.85rem;
                      color: #1E293B;
                    }

                    .task-load-badge {
                      font-size: 0.65rem;
                      font-weight: 700;
                      padding: 1px 5px;
                      border-radius: 4px;

                      &.load-low { background: #DCFCE7; color: #166534; }
                      &.load-med { background: #FEF3C7; color: #92400E; }
                      &.load-high { background: #FEE2E2; color: #991B1B; }
                    }
                  }

                  .user-title {
                    font-size: 0.72rem;
                    color: #64748B;
                    display: block;
                  }

                  .user-org {
                    font-size: 0.68rem;
                    color: #94A3B8;
                  }
                }

                .btn-call-circle {
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  padding: 2px 7px;
                  border-radius: 6px;
                  background: #EEF4FC;
                  border: 1px solid #BFDBFE;
                  color: #1F3864;
                  text-decoration: none;
                  font-size: 0.72rem;
                  font-weight: 600;
                  white-space: nowrap;
                  transition: all 0.15s ease;

                  .material-symbols-outlined {
                    font-size: 13px;
                    color: #1F3864;
                  }

                  .call-phone-text {
                    letter-spacing: 0.2px;
                  }

                  &:hover {
                    background: #1F3864;
                    border-color: #1F3864;
                    color: #FFFFFF;
                    .material-symbols-outlined { color: #FFFFFF; }
                  }
                }
              }
            }

            .campus-tasks-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
              max-height: 520px;
              overflow-y: auto;

              .campus-task-item {
                padding: 10px 12px;
                background: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                gap: 6px;

                &:hover {
                  background: #EEF4FC;
                  border-color: #BFDBFE;
                }

                .task-top {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 6px;

                  .t-code {
                    font-family: monospace;
                    font-size: 0.72rem;
                    font-weight: 700;
                    background: #EEF4FC;
                    color: #1F3864;
                    padding: 1px 4px;
                    border-radius: 4px;
                  }

                  .t-due {
                    font-size: 0.75rem;
                    color: #64748B;
                  }
                }

                .t-title {
                  margin: 0;
                  font-size: 0.88rem;
                  font-weight: 700;
                  color: #1E293B;
                }

                .task-bottom {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  font-size: 0.75rem;
                  color: #64748B;

                  .t-chutri {
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;

                    .icon-mini {
                      font-size: 14px;
                      color: #1F3864;
                    }
                  }

                  .t-prog {
                    font-weight: 800;
                    color: #1F3864;
                  }
                }
              }

              .empty-tasks-state {
                padding: 32px 16px;
                text-align: center;
                color: #94A3B8;

                .material-symbols-outlined {
                  font-size: 36px;
                  margin-bottom: 6px;
                }

                p { margin: 0; font-size: 0.85rem; }
              }
            }
          }
        }
      }

      /* CURRENT USER HIGHLIGHT */
      .is-current-user {
        border-color: #F59E0B !important;
        background: linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%) !important;
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.4), 0 6px 16px rgba(245, 158, 11, 0.15) !important;
      }

      .current-user-tag {
        font-size: 0.68rem;
        font-weight: 800;
        background: #F59E0B;
        color: #FFFFFF;
        padding: 2px 6px;
        border-radius: 9999px;
        letter-spacing: 0.3px;
        margin-left: 4px;
        display: inline-block;
      }

      .is-leader-card {
        border-color: #FCD34D !important;
        background: #FFFDF5 !important;
      }

      .leader-badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 1px 6px;
        background: #FEF3C7;
        color: #92400E;
        border: 1px solid #FDE68A;
        border-radius: 9999px;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.2px;
        white-space: nowrap;
      }

      .member-name-line {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
      }

      .loading-box {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 40px;
        color: #64748B;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class OrgComponent implements OnInit, OnDestroy {
  userService = inject(UserService);
  taskService = inject(TaskService);
  authService = inject(AuthService);
  private contactCardService = inject(ContactCardService);
  private router = inject(Router);

  activeTab = signal<'tree' | 'campus-detail'>('tree');
  isLoadingTree = signal(false);

  locations = signal<LocationItem[]>([]);
  selectedLocationId = signal<string>('');
  treeLocationFilter = '';
  orgTree = signal<OrgTreeNode[]>([]);

  // All users cache for location metrics
  allUsers = signal<UserPickerItem[]>([]);
  allTasks = signal<TaskItem[]>([]);

  // Expanded state for org nodes
  expandedOrgIds = signal<Set<string>>(new Set<string>());

  private accountSub?: Subscription;

  ngOnInit() {
    this.loadLocations();
    this.loadOrgTree();
    this.loadAllData();

    // Subscribe to switchDemoAccount to re-expand and highlight reactively
    this.accountSub = this.authService.accountSwitched$.subscribe(() => {
      this.loadAllData();
      this.loadOrgTree();
    });
  }

  ngOnDestroy() {
    this.accountSub?.unsubscribe();
  }

  isCurrentUser(userId: string): boolean {
    return this.authService.currentUser()?.id === userId;
  }

  isToTruongUser(u: UserPickerItem): boolean {
    return !!u.isToTruong || (u.roles || []).some((r) => r.role === 'TO_TRUONG');
  }

  loadLocations() {
    this.userService.getLocations().subscribe({
      next: (locs) => {
        this.locations.set(locs);
        if (locs.length > 0 && !this.selectedLocationId()) {
          this.selectedLocationId.set(locs[0].id);
        }
      },
      error: () => {},
    });
  }

  loadOrgTree() {
    this.isLoadingTree.set(true);
    this.userService.getOrgTree().subscribe({
      next: (tree) => {
        this.orgTree.set(tree);
        // Expand first 2 nodes by default
        const ids = new Set<string>();
        tree.slice(0, 3).forEach((n) => ids.add(n.id));
        this.expandedOrgIds.set(ids);
        this.isLoadingTree.set(false);
      },
      error: () => {
        this.isLoadingTree.set(false);
      },
    });
  }

  loadAllData() {
    this.userService.searchUsers({ pageSize: 100 }).subscribe({
      next: (res) => this.allUsers.set(res.items || []),
      error: () => {},
    });

    this.taskService.getTasks({ pageSize: 100 }).subscribe({
      next: (res) => this.allTasks.set(res.items || []),
      error: () => {},
    });
  }

  selectLocation(locId: string) {
    this.selectedLocationId.set(locId);
    this.currentUsersPage.set(1);
    this.currentTasksPage.set(1);
    this.activeTab.set('campus-detail');
  }

  onLocationChange() {
    this.currentUsersPage.set(1);
    this.currentTasksPage.set(1);
  }

  onTreeLocationFilterChange() {
    // triggers reactive change
  }

  filteredOrgTree = computed(() => {
    const filterLoc = this.treeLocationFilter;
    const tree = this.orgTree();
    if (!filterLoc) return tree;

    return tree.map((node) => {
      const filteredUsers = (node.users || []).filter((u) => u.primaryLocation?.id === filterLoc);
      return {
        ...node,
        users: filteredUsers,
        userCount: filteredUsers.length,
      };
    });
  });

  isExpanded(nodeId: string): boolean {
    return this.expandedOrgIds().has(nodeId);
  }

  toggleOrgNode(nodeId: string) {
    const s = new Set(this.expandedOrgIds());
    if (s.has(nodeId)) s.delete(nodeId);
    else s.add(nodeId);
    this.expandedOrgIds.set(s);
  }

  getLocationUserCount(locId: string): number {
    return this.allUsers().filter((u) => u.primaryLocation?.id === locId).length;
  }

  getLocationTaskCount(locId: string): number {
    return this.allTasks().filter((t) => t.locationId === locId).length;
  }

  campusUsers = computed(() => {
    const locId = this.selectedLocationId();
    if (!locId) return this.allUsers();
    return this.allUsers().filter((u) => u.primaryLocation?.id === locId);
  });

  currentUsersPage = signal<number>(1);
  usersPageSize = signal<number>(6);

  pagedCampusUsers = computed(() => {
    const list = this.campusUsers();
    const page = this.currentUsersPage();
    const size = this.usersPageSize();
    return list.slice((page - 1) * size, page * size);
  });

  onUsersPageChange(page: number) {
    this.currentUsersPage.set(page);
  }

  onUsersPageSizeChange(size: number) {
    this.usersPageSize.set(size);
    this.currentUsersPage.set(1);
  }

  campusTasks = computed(() => {
    const locId = this.selectedLocationId();
    if (!locId) return this.allTasks();
    return this.allTasks().filter((t) => t.locationId === locId);
  });

  currentTasksPage = signal<number>(1);
  tasksPageSize = signal<number>(6);

  pagedCampusTasks = computed(() => {
    const list = this.campusTasks();
    const page = this.currentTasksPage();
    const size = this.tasksPageSize();
    return list.slice((page - 1) * size, page * size);
  });

  onTasksPageChange(page: number) {
    this.currentTasksPage.set(page);
  }

  onTasksPageSizeChange(size: number) {
    this.tasksPageSize.set(size);
    this.currentTasksPage.set(1);
  }

  getWorkloadClass(load: number): string {
    if (load >= 6) return 'load-high';
    if (load >= 3) return 'load-med';
    return 'load-low';
  }

  getLocationBadgeClass(locName?: string): string {
    if (!locName) return 'badge-loc-main';
    if (locName.includes('Phân hiệu 1') || locName.includes('Tân Lập')) return 'badge-loc-sub1';
    if (locName.includes('Phân hiệu 2') || locName.includes('Vườn Dừa')) return 'badge-loc-sub2';
    return 'badge-loc-main';
  }

  openUserContact(user: any, event: Event) {
    event.stopPropagation();
    if (user) {
      this.contactCardService.open(user);
    }
  }

  goToTask(taskId: string) {
    this.router.navigate(['/tasks'], { queryParams: { taskId } });
  }

  getChuTriName(task: TaskItem): string {
    const a = task.assignments?.find((asgn) => asgn.role === 'CHU_TRI');
    return a?.user?.fullName || 'Chưa phân công';
  }

  formatDate(d?: string | Date | null): string {
    if (!d) return 'Chưa đặt';
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }
}
