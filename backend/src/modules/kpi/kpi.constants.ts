export interface KpiSubtypeOption {
  code: string;
  name: string;
}

export interface DefaultAxisDefinition {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  roleScope: 'ALL' | 'GV_ONLY' | 'NV_ONLY' | 'RESTRICTED';
  restrictedPositionCodes?: string[];
  requiresSubtype: boolean;
  subtypeOptions?: KpiSubtypeOption[];
  warnOveruseThresholdPct?: number | null;
}

export const DEFAULT_KPI_AXES: DefaultAxisDefinition[] = [
  {
    code: 'dang',
    name: 'Xây dựng Đảng',
    description: 'Công tác phát triển Đảng, học tập chỉ thị, sinh hoạt chính trị tư tưởng',
    displayOrder: 1,
    roleScope: 'ALL',
    requiresSubtype: false,
  },
  {
    code: 'chuyen_mon',
    name: 'Chuyên môn',
    description: 'Hoạt động giảng dạy bộ môn, công tác chủ nhiệm lớp, dự giờ, hội giảng',
    displayOrder: 2,
    roleScope: 'GV_ONLY',
    requiresSubtype: true,
    subtypeOptions: [
      { code: 'gv_bo_mon', name: 'Giáo viên bộ môn' },
      { code: 'gvcn', name: 'Giáo viên chủ nhiệm (GVCN)' },
    ],
  },
  {
    code: 'phong_trao',
    name: 'Phong trào',
    description: 'Hội thi giáo viên, thi đua ngành, công đoàn, đoàn thanh niên, văn thể mỹ',
    displayOrder: 3,
    roleScope: 'ALL',
    requiresSubtype: false,
  },
  {
    code: 'hanh_chinh',
    name: 'Hành chính',
    description: 'Văn thư - Lưu trữ, CSVC - Thiết bị, Thư viện, hỗ trợ hành chính văn phòng',
    displayOrder: 4,
    roleScope: 'ALL',
    requiresSubtype: false,
  },
  {
    code: 'chuyen_doi_so',
    name: 'Chuyển đổi số',
    description: 'Ứng dụng CNTT, quản lý học bạ điện tử, bài giảng số STEM, website nhà trường',
    displayOrder: 5,
    roleScope: 'ALL',
    requiresSubtype: false,
  },
  {
    code: 'antt',
    name: 'ANTT',
    description: 'An ninh trật tự trường học, cổng trường an toàn giao thông, PCCC, bảo vệ',
    displayOrder: 6,
    roleScope: 'ALL',
    requiresSubtype: false,
  },
  {
    code: 'y_te',
    name: 'Y tế',
    description: 'Y tế học đường, khám sức khỏe định kỳ, phòng dịch, an toàn thực phẩm',
    displayOrder: 7,
    roleScope: 'ALL',
    requiresSubtype: false,
  },
  {
    code: 'kttc',
    name: 'KTTC (Kế toán tài chính)',
    description: 'Công tác tài chính ngân sách, chế độ tiền lương, kiểm toán nội bộ (RESTRICTED)',
    displayOrder: 8,
    roleScope: 'RESTRICTED',
    restrictedPositionCodes: ['ke_toan', 'thu_quy'],
    requiresSubtype: false,
  },
  {
    code: 'khac',
    name: 'Khác',
    description: 'Nhiệm vụ đột xuất ngoài 8 trục chính trên',
    displayOrder: 9,
    roleScope: 'ALL',
    requiresSubtype: false,
    warnOveruseThresholdPct: 20.0,
  },
];
