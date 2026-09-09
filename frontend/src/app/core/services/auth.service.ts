import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { UserProfile, ActiveContextRole, LoginResponse } from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'tn_edu_access_token';
const REFRESH_TOKEN_KEY = 'tn_edu_refresh_token';
const USER_KEY = 'tn_edu_user_profile';
const ACTIVE_ROLE_KEY = 'tn_edu_active_role';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSignal = signal<UserProfile | null>(null);
  private activeRoleSignal = signal<ActiveContextRole | null>(null);
  private accessTokenSignal = signal<string | null>(null);

  currentUser = this.currentUserSignal.asReadonly();
  activeRole = this.activeRoleSignal.asReadonly();
  accessToken = this.accessTokenSignal.asReadonly();

  isAuthenticated = computed(() => !!this.currentUserSignal() && !!this.accessTokenSignal());
  isBGH = computed(() => {
    const role = this.activeRoleSignal()?.role;
    return role === 'HIEU_TRUONG' || role === 'PHO_HIEU_TRUONG' || role === 'ADMIN';
  });

  constructor(private http: HttpClient, private router: Router) {
    this.loadStateFromStorage();
  }

  private loadStateFromStorage() {
    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      const roleStr = localStorage.getItem(ACTIVE_ROLE_KEY);

      if (token && userStr) {
        this.accessTokenSignal.set(token);
        const user = JSON.parse(userStr) as UserProfile;
        this.currentUserSignal.set(user);

        if (roleStr) {
          this.activeRoleSignal.set(JSON.parse(roleStr));
        } else if (user.roles && user.roles.length > 0) {
          this.setDefaultActiveRole(user);
        }
      }
    } catch (e) {
      this.clearStorage();
    }
  }

  private setDefaultActiveRole(user: UserProfile) {
    const primary = user.roles[0];
    const active: ActiveContextRole = {
      role: primary.role,
      roleTitle: this.getRoleVietnameseName(primary.role),
      scopeName: primary.scopeLocationName || primary.scopeOrgUnitName || user.primaryLocationName,
      scopeLocationId: primary.scopeLocationId,
      scopeOrgUnitId: primary.scopeOrgUnitId,
    };
    this.setActiveRole(active);
  }

  getRoleVietnameseName(role: string): string {
    switch (role) {
      case 'HIEU_TRUONG':
        return 'Hiệu trưởng';
      case 'PHO_HIEU_TRUONG':
        return 'Phó Hiệu trưởng';
      case 'TO_TRUONG':
        return 'Tổ trưởng';
      case 'GIAO_VIEN':
        return 'Giáo viên';
      case 'NHAN_VIEN':
        return 'Nhân viên';
      case 'ADMIN':
        return 'Quản trị hệ thống';
      default:
        return role;
    }
  }

  login(identifier: string, password: string): Observable<{ success: boolean; data: LoginResponse }> {
    return this.http
      .post<{ success: boolean; data: LoginResponse }>('/api/auth/login', {
        identifier,
        password,
      })
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this.setSession(res.data);
          }
        })
      );
  }

  setSession(data: LoginResponse) {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    this.accessTokenSignal.set(data.accessToken);
    this.currentUserSignal.set(data.user);

    this.setDefaultActiveRole(data.user);
  }

  setActiveRole(role: ActiveContextRole) {
    this.activeRoleSignal.set(role);
    localStorage.setItem(ACTIVE_ROLE_KEY, JSON.stringify(role));
  }

  refreshToken(): Observable<{ success: boolean; data: { accessToken: string; refreshToken: string } }> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    return this.http
      .post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>('/api/auth/refresh', {
        refreshToken,
      })
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            localStorage.setItem(ACCESS_TOKEN_KEY, res.data.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refreshToken);
            this.accessTokenSignal.set(res.data.accessToken);
          }
        }),
        catchError((err) => {
          this.logout();
          return throwError(() => err);
        })
      );
  }

  logout() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      this.http.post('/api/auth/logout', {}).subscribe({ error: () => {} });
    }
    this.clearStorage();
    this.router.navigate(['/auth/login']);
  }

  private clearStorage() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_ROLE_KEY);

    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
    this.activeRoleSignal.set(null);
  }

  getAccessToken(): string | null {
    return this.accessTokenSignal() || localStorage.getItem(ACCESS_TOKEN_KEY);
  }
}
