export interface AcademicYearOption {
  code: string;           // e.g. "2026-2027"
  name: string;           // e.g. "Năm học 2026 - 2027"
  shortName: string;      // e.g. "2026 - 2027"
  startYear: number;      // 2026
  endYear: number;        // 2027
  isDefault: boolean;     // true if current default active school year
  status: 'CURRENT' | 'ARCHIVED' | 'UPCOMING';
  description?: string;
}

export interface AcademicYearDateRange {
  yearCode: string;
  startDate: Date;
  endDate: Date;
  startStr: string;       // "YYYY-MM-DD" e.g. "2026-09-01"
  endStr: string;         // "YYYY-MM-DD" e.g. "2027-08-31"
  formattedDisplay: string; // "01/09/2026 - 31/08/2027"
}

/**
 * Phân tích mã năm học dạng "2026-2027" hoặc "2026 - 2027" thành đối tượng năm bắt đầu và kết thúc
 */
export function parseAcademicYear(yearCode: string): { startYear: number; endYear: number } {
  if (!yearCode) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const start = currentMonth >= 8 ? currentYear : currentYear - 1;
    return { startYear: start, endYear: start + 1 };
  }

  const parts = yearCode.replace(/\s+/g, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts.length > 1 ? parseInt(parts[1], 10) : start + 1;

  if (isNaN(start) || isNaN(end)) {
    return { startYear: 2026, endYear: 2027 };
  }

  return { startYear: start, endYear: end };
}

/**
 * Lấy dải ngày bắt đầu và kết thúc của năm học (Từ 01/09 năm N đến 31/08 năm N+1)
 */
export function getAcademicYearDateRange(yearCode: string): AcademicYearDateRange {
  const { startYear, endYear } = parseAcademicYear(yearCode);

  const startStr = `${startYear}-09-01`;
  const endStr = `${endYear}-08-31`;

  const startDate = new Date(`${startStr}T00:00:00.000Z`);
  const endDate = new Date(`${endStr}T23:59:59.999Z`);

  return {
    yearCode: `${startYear}-${endYear}`,
    startDate,
    endDate,
    startStr,
    endStr,
    formattedDisplay: `01/09/${startYear} - 31/08/${endYear}`,
  };
}

/**
 * Chuẩn hóa chuỗi hiển thị năm học: "2026-2027" -> "2026 - 2027"
 */
export function formatAcademicYearDisplay(yearCode: string): string {
  const { startYear, endYear } = parseAcademicYear(yearCode);
  return `${startYear} - ${endYear}`;
}
