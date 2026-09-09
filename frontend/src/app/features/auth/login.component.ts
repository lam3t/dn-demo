import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile, ActiveContextRole, UserRoleItem } from '../../core/models/auth.models';

interface DemoAccount {
  name: string;
  roleTitle: string;
  identifier: string;
  avatar: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <!-- HEADER -->
        <div class="brand-header">
          <div class="logo-circle">
            <span class="material-symbols-outlined logo-icon">school</span>
          </div>
          <h1 class="system-title">TN EDU</h1>
          <p class="system-subtitle">Quản lý Kế hoạch & Công việc Trường Phổ thông</p>
          <div class="school-badge">
            <span class="material-symbols-outlined">location_on</span>
            <span>Trường THCS Phước Tân (3 Điểm trường)</span>
          </div>
        </div>

        <!-- STEP 1: FORM ĐĂNG NHẬP -->
        @if (!showRoleSelection()) {
          <form (ngSubmit)="onLogin()" class="login-form">
            @if (errorMessage()) {
              <div class="error-alert">
                <span class="material-symbols-outlined">error</span>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <div class="form-group">
              <label for="identifier">Tài khoản (Số điện thoại hoặc Email)</label>
              <div class="input-box">
                <span class="material-symbols-outlined input-icon">account_circle</span>
                <input
                  id="identifier"
                  type="text"
                  name="identifier"
                  [(ngModel)]="identifier"
                  placeholder="Nhập số điện thoại hoặc email..."
                  required
                  autocomplete="username"
                  class="tap-target"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="password">Mật khẩu</label>
              <div class="input-box">
                <span class="material-symbols-outlined input-icon">lock</span>
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  name="password"
                  [(ngModel)]="password"
                  placeholder="Nhập mật khẩu..."
                  required
                  autocomplete="current-password"
                  class="tap-target"
                />
                <button
                  type="button"
                  class="toggle-pwd-btn"
                  (click)="showPassword = !showPassword"
                  title="Hiện/ẩn mật khẩu"
                >
                  <span class="material-symbols-outlined">
                    {{ showPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="submit-btn tap-target"
              [disabled]="isLoading() || !identifier.trim() || !password.trim()"
            >
              @if (isLoading()) {
                <span class="material-symbols-outlined spin">progress_activity</span>
                <span>Đang xử lý...</span>
              } @else {
                <span class="material-symbols-outlined">login</span>
                <span>Đăng nhập</span>
              }
            </button>
          </form>

          <!-- QUICK DEMO LOGINS -->
          <div class="demo-section">
            <div class="divider">
              <span>Hoặc bấm chọn nhanh tài khoản mẫu để thử nghiệm</span>
            </div>

            <div class="demo-grid">
              @for (acc of demoAccounts; track acc.identifier) {
                <button
                  type="button"
                  class="demo-account-btn"
                  (click)="fillDemoAccount(acc.identifier)"
                  [title]="acc.name + ' (' + acc.roleTitle + ')'"
                >
                  <img [src]="acc.avatar" [alt]="acc.name" class="demo-avatar" />
                  <div class="demo-info">
                    <span class="demo-name">{{ acc.name }}</span>
                    <span class="demo-role">{{ acc.roleTitle }}</span>
                  </div>
                </button>
              }
            </div>
          </div>
        }

        <!-- STEP 2: CHỌN NGỮ CẢNH VAI TRÒ LÀM VIỆC (KHI CÓ NHIỀU VAI TRÒ) -->
        @if (showRoleSelection() && loggedUser()) {
          <div class="role-selection-section">
            <div class="role-selection-header">
              <span class="material-symbols-outlined role-head-icon">switch_account</span>
              <h2 class="role-selection-title">Chọn vai trò làm việc</h2>
              <p class="role-selection-desc">
                Chào thầy/cô <strong>{{ loggedUser()?.fullName }}</strong>, vui lòng chọn vai trò để hệ thống tải dữ liệu phù hợp:
              </p>
            </div>

            <div class="role-cards-list">
              @for (roleItem of availableRoles(); track $index) {
                <button
                  type="button"
                  class="role-card-btn tap-target"
                  (click)="selectRole(roleItem, true)"
                >
                  <div class="role-icon-box">
                    <span class="material-symbols-outlined">{{ getRoleIcon(roleItem.role) }}</span>
                  </div>
                  <div class="role-card-info">
                    <h3 class="role-card-title">{{ getRoleTitle(roleItem) }}</h3>
                    <div class="role-card-scope">
                      <span class="material-symbols-outlined">domain</span>
                      <span>{{ getRoleScopeText(roleItem) }}</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined arrow-icon">arrow_forward_ios</span>
                </button>
              }
            </div>

            <div class="remember-choice">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="rememberRoleChoice" />
                <span>Ghi nhớ lựa chọn này cho các lần đăng nhập tiếp theo</span>
              </label>
            </div>

            <div class="back-action">
              <button type="button" class="back-btn" (click)="cancelRoleSelection()">
                <span class="material-symbols-outlined">arrow_back</span>
                <span>Đăng nhập bằng tài khoản khác</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrapper {
        min-height: 100vh;
        width: 100vw;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #0F1F38 0%, #1F3864 60%, #1E3A8A 100%);
        padding: 20px;
      }

      .login-card {
        width: 100%;
        max-width: 480px;
        background: #FFFFFF;
        border-radius: 20px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
        padding: 32px 28px;
        position: relative;
        overflow: hidden;
      }

      .brand-header {
        text-align: center;
        margin-bottom: 24px;

        .logo-circle {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          background: #1F3864;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 4px 12px rgba(31, 56, 100, 0.25);

          .logo-icon {
            font-size: 32px;
            color: #FFFFFF;
          }
        }

        .system-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1F3864;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .system-subtitle {
          font-size: 0.88rem;
          color: #64748B;
          margin-bottom: 10px;
        }

        .school-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: #EEF4FC;
          border: 1px solid #D0E1F9;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #1E40AF;

          .material-symbols-outlined {
            font-size: 14px;
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
        border-radius: 8px;
        color: #B91C1C;
        font-size: 0.85rem;
        margin-bottom: 16px;

        .material-symbols-outlined {
          font-size: 18px;
          flex-shrink: 0;
        }
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 16px;

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;

          label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #334155;
          }

          .input-box {
            display: flex;
            align-items: center;
            background: #F8FAFC;
            border: 1.5px solid #CBD5E1;
            border-radius: 10px;
            padding: 0 12px;
            transition: all 0.2s ease;

            &:focus-within {
              border-color: #1F3864;
              background: #FFFFFF;
              box-shadow: 0 0 0 3px rgba(31, 56, 100, 0.12);
            }

            .input-icon {
              font-size: 20px;
              color: #94A3B8;
              margin-right: 8px;
            }

            input {
              flex: 1;
              border: none;
              background: transparent;
              padding: 12px 0;
              font-size: 0.95rem;
              color: #1E293B;
              outline: none;

              &::placeholder {
                color: #94A3B8;
                font-size: 0.88rem;
              }
            }

            .toggle-pwd-btn {
              background: transparent;
              border: none;
              color: #94A3B8;
              cursor: pointer;
              padding: 4px;
              display: flex;
              align-items: center;

              &:hover {
                color: #334155;
              }
            }
          }
        }

        .submit-btn {
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
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 6px;

          &:hover:not(:disabled) {
            background: #152644;
            box-shadow: 0 6px 16px rgba(31, 56, 100, 0.3);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .spin {
            animation: spin 1s linear infinite;
          }
        }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* DEMO ACCOUNTS */
      .demo-section {
        margin-top: 24px;

        .divider {
          text-align: center;
          position: relative;
          margin-bottom: 14px;

          &::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: #E2E8F0;
          }

          span {
            position: relative;
            background: #FFFFFF;
            padding: 0 10px;
            font-size: 0.75rem;
            color: #64748B;
            font-weight: 500;
          }
        }

        .demo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;

          .demo-account-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            text-align: left;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              background: #EEF4FC;
              border-color: #B4D1FA;
              transform: translateY(-1px);
            }

            .demo-avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              flex-shrink: 0;
            }

            .demo-info {
              display: flex;
              flex-direction: column;
              overflow: hidden;

              .demo-name {
                font-size: 0.78rem;
                font-weight: 600;
                color: #1E293B;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .demo-role {
                font-size: 0.7rem;
                color: #1F3864;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
            }
          }
        }
      }

      /* ROLE SELECTION SECTION */
      .role-selection-section {
        .role-selection-header {
          text-align: center;
          margin-bottom: 20px;

          .role-head-icon {
            font-size: 38px;
            color: #1F3864;
            margin-bottom: 6px;
          }

          .role-selection-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1F3864;
            margin-bottom: 4px;
          }

          .role-selection-desc {
            font-size: 0.85rem;
            color: #475569;
            line-height: 1.4;
          }
        }

        .role-cards-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;

          .role-card-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            background: #FFFFFF;
            border: 2px solid #E2E8F0;
            border-radius: 12px;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
              border-color: #1F3864;
              background: #F8FAFC;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(31, 56, 100, 0.12);
            }

            .role-icon-box {
              width: 44px;
              height: 44px;
              border-radius: 10px;
              background: #EEF4FC;
              color: #1F3864;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;

              .material-symbols-outlined {
                font-size: 24px;
              }
            }

            .role-card-info {
              flex: 1;

              .role-card-title {
                font-size: 0.95rem;
                font-weight: 700;
                color: #1E293B;
                margin-bottom: 2px;
              }

              .role-card-scope {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 0.78rem;
                color: #64748B;

                .material-symbols-outlined {
                  font-size: 14px;
                }
              }
            }

            .arrow-icon {
              font-size: 16px;
              color: #94A3B8;
            }
          }
        }

        .remember-choice {
          padding: 8px 4px;
          margin-bottom: 12px;

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.82rem;
            color: #475569;
            cursor: pointer;

            input[type='checkbox'] {
              width: 16px;
              height: 16px;
              accent-color: #1F3864;
              cursor: pointer;
            }
          }
        }

        .back-action {
          text-align: center;
          border-top: 1px solid #F1F5F9;
          padding-top: 12px;

          .back-btn {
            background: transparent;
            border: none;
            color: #64748B;
            font-size: 0.85rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 6px;
            transition: all 0.2s ease;

            &:hover {
              color: #1F3864;
              background: #F8FAFC;
            }

            .material-symbols-outlined {
              font-size: 18px;
            }
          }
        }
      }

      @media (max-width: 480px) {
        .login-card {
          padding: 24px 18px;
        }

        .demo-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `,
  ],
})
export class LoginComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  identifier = '0903111222';
  password = '123456';
  showPassword = false;

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  showRoleSelection = signal(false);
  loggedUser = signal<UserProfile | null>(null);
  availableRoles = signal<UserRoleItem[]>([]);
  rememberRoleChoice = true;

  demoAccounts: DemoAccount[] = [
    {
      name: 'Nguyễn Văn An',
      roleTitle: 'Hiệu trưởng',
      identifier: '0903111222',
      avatar: 'https://ui-avatars.com/api/?name=Nguy%E1%BB%85n+V%C4%83n+An&background=1F3864&color=fff',
    },
    {
      name: 'Lê Hoàng Long',
      roleTitle: 'PHT – Phân hiệu 1',
      identifier: '0903333444',
      avatar: 'https://ui-avatars.com/api/?name=L%C3%AA+Ho%C3%A0ng+Long&background=1F3864&color=fff',
    },
    {
      name: 'Vũ Đình Dũng',
      roleTitle: 'Tổ trưởng Toán-Tin',
      identifier: '0912111001',
      avatar: 'https://ui-avatars.com/api/?name=V%C5%A9+%C4%90%C3%ACnh+D%C5%A9ng&background=1F3864&color=fff',
    },
    {
      name: 'Bùi Thị Hồng Nhung',
      roleTitle: 'Giáo viên Toán (PH1)',
      identifier: '0914202001',
      avatar: 'https://ui-avatars.com/api/?name=B%C3%B9i+Th%E1%BB%8B+H%E1%BB%93ng+Nhung&background=1F3864&color=fff',
    },
  ];

  fillDemoAccount(identifier: string) {
    this.identifier = identifier;
    this.password = '123456';
  }

  onLogin() {
    if (!this.identifier.trim() || !this.password.trim()) {
      this.errorMessage.set('Vui lòng nhập tài khoản và mật khẩu.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.identifier.trim(), this.password.trim()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const user = res.data.user;
        this.loggedUser.set(user);

        // Nếu user có nhiều hơn 1 vai trò / phạm vi
        if (user.roles && user.roles.length > 1) {
          const rememberedKey = 'tn_edu_remembered_role_' + user.id;
          const savedRoleJson = localStorage.getItem(rememberedKey);

          if (savedRoleJson) {
            try {
              const savedRole = JSON.parse(savedRoleJson) as UserRoleItem;
              const matchedRole = user.roles.find(
                (r) =>
                  r.role === savedRole.role &&
                  r.scopeLocationId === savedRole.scopeLocationId &&
                  r.scopeOrgUnitId === savedRole.scopeOrgUnitId
              );

              if (matchedRole) {
                this.selectRole(matchedRole, false);
                return;
              }
            } catch (e) {
              localStorage.removeItem(rememberedKey);
            }
          }

          // Hiện màn hình chọn vai trò
          this.availableRoles.set(user.roles);
          this.showRoleSelection.set(true);
        } else {
          this.navigateAfterLogin();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu.'
        );
      },
    });
  }

  selectRole(roleItem: UserRoleItem, updateStorage = true) {
    const user = this.loggedUser() || this.authService.currentUser();
    if (!user) return;

    const activeRole: ActiveContextRole = {
      role: roleItem.role,
      roleTitle: this.authService.getRoleVietnameseName(roleItem.role),
      scopeName: roleItem.scopeLocationName || roleItem.scopeOrgUnitName || user.primaryLocationName,
      scopeLocationId: roleItem.scopeLocationId,
      scopeOrgUnitId: roleItem.scopeOrgUnitId,
    };

    this.authService.setActiveRole(activeRole);

    if (updateStorage) {
      const rememberedKey = 'tn_edu_remembered_role_' + user.id;
      if (this.rememberRoleChoice) {
        localStorage.setItem(rememberedKey, JSON.stringify(roleItem));
      } else {
        localStorage.removeItem(rememberedKey);
      }
    }

    this.navigateAfterLogin();
  }

  cancelRoleSelection() {
    this.authService.logout();
    this.showRoleSelection.set(false);
    this.loggedUser.set(null);
    this.availableRoles.set([]);
  }

  getRoleTitle(roleItem: UserRoleItem): string {
    const name = this.authService.getRoleVietnameseName(roleItem.role);
    if (roleItem.scopeLocationName) {
      return `${name} – ${roleItem.scopeLocationName}`;
    }
    if (roleItem.scopeOrgUnitName) {
      return `${name} – ${roleItem.scopeOrgUnitName}`;
    }
    return name;
  }

  getRoleScopeText(roleItem: UserRoleItem): string {
    if (roleItem.scopeLocationName) {
      return `Phụ trách: ${roleItem.scopeLocationName}`;
    }
    if (roleItem.scopeOrgUnitName) {
      return `Phụ trách: ${roleItem.scopeOrgUnitName}`;
    }
    return 'Phạm vi: Toàn trường';
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'HIEU_TRUONG':
        return 'stars';
      case 'PHO_HIEU_TRUONG':
        return 'shield_person';
      case 'TO_TRUONG':
        return 'supervisor_account';
      case 'GIAO_VIEN':
        return 'person';
      case 'NHAN_VIEN':
        return 'badge';
      case 'ADMIN':
        return 'admin_panel_settings';
      default:
        return 'person';
    }
  }

  private navigateAfterLogin() {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }
}
