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

  const expectedRoles = route.data?.['roles'] as string[];
  if (expectedRoles && expectedRoles.length > 0) {
    const activeRole = authService.activeRole()?.role;
    const isAllowed =
      activeRole === 'ADMIN' ||
      activeRole === 'HIEU_TRUONG' ||
      (activeRole && expectedRoles.includes(activeRole));

    if (!isAllowed) {
      router.navigate(['/my-tasks']);
      return false;
    }
  }

  return true;
};
