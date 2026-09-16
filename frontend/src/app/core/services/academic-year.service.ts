import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  AcademicYearOption,
  AcademicYearDateRange,
  getAcademicYearDateRange,
  formatAcademicYearDisplay,
  parseAcademicYear,
} from '../models/academic-year.models';

const STORAGE_KEY = 'tn_edu_selected_academic_year';
const DEFAULT_YEAR = '2026-2027';

const DEFAULT_ACADEMIC_YEARS: AcademicYearOption[] = [
  {
    code: '2026-2027',
    name: 'Năm học 2026 - 2027',
    shortName: '2026 - 2027',
    startYear: 2026,
    endYear: 2027,
    isDefault: true,
    status: 'CURRENT',
    description: 'Năm học hiện hành (Đang diễn ra)',
  },
  {
    code: '2025-2026',
    name: 'Năm học 2025 - 2026',
    shortName: '2025 - 2026',
    startYear: 2025,
    endYear: 2026,
    isDefault: false,
    status: 'ARCHIVED',
    description: 'Năm học trước (Dữ liệu đã tổng kết & lưu trữ)',
  },
  {
    code: '2024-2025',
    name: 'Năm học 2024 - 2025',
    shortName: '2024 - 2025',
    startYear: 2024,
    endYear: 2025,
    isDefault: false,
    status: 'ARCHIVED',
    description: 'Năm học lịch sử (Dữ liệu lưu trữ)',
  },
  {
    code: '2027-2028',
    name: 'Năm học 2027 - 2028',
    shortName: '2027 - 2028',
    startYear: 2027,
    endYear: 2028,
    isDefault: false,
    status: 'UPCOMING',
    description: 'Năm học kế tiếp (Dự thảo & Kế hoạch)',
  },
];

@Injectable({
  providedIn: 'root',
})
export class AcademicYearService {
  private http = inject(HttpClient);

  // State Signals
  private currentYearSignal = signal<string>(this.getInitialYear());
  private yearsListSignal = signal<AcademicYearOption[]>(DEFAULT_ACADEMIC_YEARS);

  // Event stream for components that subscribe via RxJS
  private yearChangedSubject = new Subject<string>();
  readonly yearChanged$ = this.yearChangedSubject.asObservable();

  // Readonly Public Signals
  readonly currentAcademicYear = this.currentYearSignal.asReadonly();
  readonly academicYears = this.yearsListSignal.asReadonly();

  // Computed Properties
  readonly isCurrentDefaultYear = computed(() => {
    const cur = this.currentYearSignal();
    const def = this.yearsListSignal().find((y) => y.isDefault);
    return def ? def.code === cur : cur === DEFAULT_YEAR;
  });

  readonly currentYearOption = computed(() => {
    const cur = this.currentYearSignal();
    return (
      this.yearsListSignal().find((y) => y.code === cur) || {
        code: cur,
        name: `Năm học ${formatAcademicYearDisplay(cur)}`,
        shortName: formatAcademicYearDisplay(cur),
        startYear: parseAcademicYear(cur).startYear,
        endYear: parseAcademicYear(cur).endYear,
        isDefault: cur === DEFAULT_YEAR,
        status: cur === DEFAULT_YEAR ? ('CURRENT' as const) : ('ARCHIVED' as const),
      }
    );
  });

  readonly formattedCurrentYear = computed(() => {
    return formatAcademicYearDisplay(this.currentYearSignal());
  });

  readonly selectedDateRange = computed<AcademicYearDateRange>(() => {
    return getAcademicYearDateRange(this.currentYearSignal());
  });

  constructor() {
    this.loadAcademicYears();
  }

  /**
   * Lấy năm học ban đầu từ localStorage hoặc mặc định
   */
  private getInitialYear(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch (e) {
      // Ignore localStorage error
    }
    return DEFAULT_YEAR;
  }

  /**
   * Tải danh mục năm học từ SharedCategory API
   */
  loadAcademicYears(): void {
    this.http
      .get<{ success: boolean; data: any[] }>('/api/admin/shared-categories?type=NAM_HOC')
      .pipe(
        map((res) => {
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            return res.data.map((cat: any) => {
              const { startYear, endYear } = parseAcademicYear(cat.code);
              const isDef = Boolean(cat.isDefault);
              let status: 'CURRENT' | 'ARCHIVED' | 'UPCOMING' = isDef ? 'CURRENT' : 'ARCHIVED';
              if (startYear > 2026) status = 'UPCOMING';
              else if (startYear < 2026) status = 'ARCHIVED';

              return {
                code: cat.code,
                name: cat.name || `Năm học ${formatAcademicYearDisplay(cat.code)}`,
                shortName: formatAcademicYearDisplay(cat.code),
                startYear,
                endYear,
                isDefault: isDef,
                status,
                description: cat.description || (isDef ? 'Năm học hiện hành' : 'Năm học lưu trữ'),
              } as AcademicYearOption;
            });
          }
          return DEFAULT_ACADEMIC_YEARS;
        }),
        catchError(() => of(DEFAULT_ACADEMIC_YEARS)),
        tap((years) => {
          this.yearsListSignal.set(years);
          // Nếu năm hiện tại không hợp lệ, fallback về default
          const exists = years.some((y) => y.code === this.currentYearSignal());
          if (!exists) {
            const def = years.find((y) => y.isDefault) || years[0];
            if (def) this.setAcademicYear(def.code);
          }
        })
      )
      .subscribe();
  }

  /**
   * Đặt năm học được chọn toàn hệ thống
   */
  setAcademicYear(yearCode: string): void {
    if (!yearCode || yearCode === this.currentYearSignal()) return;

    this.currentYearSignal.set(yearCode);
    try {
      localStorage.setItem(STORAGE_KEY, yearCode);
    } catch (e) {}

    this.yearChangedSubject.next(yearCode);
  }

  /**
   * Reset về năm học hiện hành mặc định
   */
  resetToDefaultYear(): void {
    const def = this.yearsListSignal().find((y) => y.isDefault) || DEFAULT_ACADEMIC_YEARS[0];
    this.setAcademicYear(def.code);
  }

  /**
   * Helper lấy dải ngày cho bất kỳ mã năm học nào
   */
  getDateRangeForYear(yearCode: string): AcademicYearDateRange {
    return getAcademicYearDateRange(yearCode);
  }
}
