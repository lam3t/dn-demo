/**
 * Chuẩn hóa chuỗi tiếng Việt: chuyển chữ thường, loại bỏ toàn bộ dấu thanh/dấu mũ và chữ đ/Đ
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Tính điểm độ khớp (Relevance Score) để sắp xếp kết quả tìm kiếm:
 * - Điểm 3: Bắt đầu bằng từ khóa tìm kiếm (Prefix match)
 * - Điểm 2: Có chứa từ bắt đầu bằng từ khóa (Word prefix match)
 * - Điểm 1: Có chứa từ khóa ở bất kỳ vị trí nào (Substring match)
 * - Điểm 0: Không khớp
 */
export function calculateMatchScore(target: string, query: string): number {
  const normTarget = removeVietnameseAccents(target);
  const normQuery = removeVietnameseAccents(query);

  if (!normQuery) return 1;
  if (normTarget === normQuery) return 4;
  if (normTarget.startsWith(normQuery)) return 3;

  const words = normTarget.split(/\s+/);
  if (words.some((w) => w.startsWith(normQuery))) return 2;

  if (normTarget.includes(normQuery)) return 1;

  return 0;
}
