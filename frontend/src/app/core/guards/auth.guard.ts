import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const isSysAdmin = authService.isSystemAdmin();
  const url = state.url.split('?')[0];

  // System Admin chỉ có quyền quản trị SaaS (/system-admin) và Thông báo (/notifications)
  if (isSysAdmin) {
    if (url === '/system-admin' || url === '/notifications' || url === '') {
      return true;
    }
    router.navigate(['/system-admin']);
    return false;
  }

  // Người dùng cấp trường không thể truy cập /system-admin
  if (!isSysAdmin && url === '/system-admin') {
    router.navigate(['/dashboard']);
    return false;
  }

  const expectedRoles = route.data?.['roles'] as string[];
  if (expectedRoles && expectedRoles.length > 0) {
    const activeRole = authService.activeRole()?.role;
    const isAllowed = activeRole && expectedRoles.includes(activeRole);

    if (!isAllowed) {
      router.navigate(['/my-tasks']);
      return false;
    }
  }

  return true;
};

