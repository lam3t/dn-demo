import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  let authReq = req;
  if (token && req.url.startsWith('/api') && !req.url.includes('/api/auth/login') && !req.url.includes('/api/auth/refresh')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        !req.url.includes('/api/auth/login') &&
        !req.url.includes('/api/auth/refresh')
      ) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((res) => {
              isRefreshing = false;
              const newToken = res.data.accessToken;
              refreshTokenSubject.next(newToken);
              const retriedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });
              return next(retriedReq);
            }),
            catchError((refreshErr) => {
              // Try auto re-login for current demo account phone if available
              const currentUser = authService.currentUser();
              const phone = currentUser?.phone || '0903111222';

              return authService.login(phone, '123456').pipe(
                switchMap((loginRes) => {
                  isRefreshing = false;
                  const freshToken = loginRes.data.accessToken;
                  refreshTokenSubject.next(freshToken);
                  const retriedReq = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${freshToken}`,
                    },
                  });
                  return next(retriedReq);
                }),
                catchError((loginErr) => {
                  isRefreshing = false;
                  refreshTokenSubject.next(null);
                  authService.logout();
                  return throwError(() => refreshErr || loginErr);
                })
              );
            })
          );
        } else {
          // If a refresh is already in progress, wait for the new token in the subject
          return refreshTokenSubject.pipe(
            filter((newToken): newToken is string => newToken !== null),
            take(1),
            switchMap((newToken) => {
              const retriedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });
              return next(retriedReq);
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};
