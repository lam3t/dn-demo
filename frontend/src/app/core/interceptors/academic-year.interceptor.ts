import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';

const STORAGE_KEY = 'tn_edu_selected_academic_year';
const DEFAULT_YEAR = '2026-2027';

export const academicYearInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  let currentYear: string | null = null;
  try {
    currentYear = localStorage.getItem(STORAGE_KEY) || DEFAULT_YEAR;
  } catch (e) {
    currentYear = DEFAULT_YEAR;
  }

  // Attach academic year header to all internal API requests
  if (req.url.startsWith('/api') && currentYear) {
    const clonedReq = req.clone({
      setHeaders: {
        'X-Academic-Year': currentYear,
      },
    });
    return next(clonedReq);
  }

  return next(req);
};

