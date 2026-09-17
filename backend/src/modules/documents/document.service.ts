import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';

export interface DocumentFolderData {
  id: string;
  name: string;
  parentId: string | null;
  tenantId: string;
  academicYear?: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentService {
  // In-memory / tenant-scoped store for document folders if custom table isn't migrated
  private memoryFolders: Map<string, any[]> = new Map();
  private memoryFiles: Map<string, any[]> = new Map();

  private getSampleFolders(tenantId: string, academicYear: string) {
    return [
      { id: 'f-root', name: 'HÒA BÌNH', parentId: null, tenantId, academicYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: 'f-2627', name: '2026_2027', parentId: 'f-root', tenantId, academicYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: 'f-dang', name: '1. Công tác Đảng', parentId: 'f-2627', tenantId, academicYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-hctcns', name: '2. HC-TC-NS', parentId: 'f-2627', tenantId, academicYear, orderIndex: 2, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: 'f-qdqc', name: 'QUYẾT ĐỊNH_QUY CHẾ ĐẦU NĂM HỌC', parentId: 'f-hctcns', tenantId, academicYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-diemchinh', name: '3. Điểm chính', parentId: 'f-2627', tenantId, academicYear, orderIndex: 3, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: 'f-chuyenmon', name: 'Chuyên môn', parentId: 'f-diemchinh', tenantId, academicYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-csvc', name: 'CSVC', parentId: 'f-diemchinh', tenantId, academicYear, orderIndex: 2, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-nhansu', name: 'Nhân sự', parentId: 'f-diemchinh', tenantId, academicYear, orderIndex: 3, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: 'f-dshs', name: 'DS HS ĐẦU NĂM - DS CÁC LỚP 2026-2027', parentId: 'f-nhansu', tenantId, academicYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-ph1', name: '4. Phân hiệu 1', parentId: 'f-2627', tenantId, academicYear, orderIndex: 4, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-ph2', name: '5. Phân hiệu 2', parentId: 'f-2627', tenantId, academicYear, orderIndex: 5, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-thang', name: '6. Công tác tháng', parentId: 'f-2627', tenantId, academicYear, orderIndex: 6, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: 'f-thang1', name: 'Tháng 1', parentId: 'f-thang', tenantId, academicYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-thang2', name: 'Tháng 2', parentId: 'f-thang', tenantId, academicYear, orderIndex: 2, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-thang3', name: 'Tháng 3', parentId: 'f-thang', tenantId, academicYear, orderIndex: 3, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-thang4', name: 'Tháng 4', parentId: 'f-thang', tenantId, academicYear, orderIndex: 4, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-thang5', name: 'Tháng 5', parentId: 'f-thang', tenantId, academicYear, orderIndex: 5, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-thang8', name: 'Tháng 8', parentId: 'f-thang', tenantId, academicYear, orderIndex: 6, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-thang9', name: 'Tháng 9', parentId: 'f-thang', tenantId, academicYear, orderIndex: 7, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: 'f-tuan1', name: 'Tuần 1', parentId: 'f-thang9', tenantId, academicYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-tuan2', name: 'Tuần 2', parentId: 'f-thang9', tenantId, academicYear, orderIndex: 2, createdAt: new Date(), updatedAt: new Date() },
      { id: 'f-tuan3', name: 'Tuần 3', parentId: 'f-thang9', tenantId, academicYear, orderIndex: 3, createdAt: new Date(), updatedAt: new Date() },
    ];
  }

  private getTenantFolders(tenantId: string, academicYear: string): any[] {
    if (!this.memoryFolders.has(tenantId)) {
      this.memoryFolders.set(tenantId, this.getSampleFolders(tenantId, academicYear));
    }
    return this.memoryFolders.get(tenantId)!;
  }

  private getTenantFiles(tenantId: string): any[] {
    if (!this.memoryFiles.has(tenantId)) {
      this.memoryFiles.set(tenantId, [
        {
          id: 'doc-file-1',
          folderId: 'f-dang',
          fileName: 'Nghi-quyet-Chi-bo-Dau-nam-2026-2027.pdf',
          originalName: 'Nghị quyết Chi bộ đầu năm 2026 - 2027.pdf',
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileSize: 1420000,
          mimeType: 'application/pdf',
          tenantId,
          academicYear: '2026-2027',
          createdAt: new Date('2026-08-16T14:30:00Z'),
          uploadedBy: { id: 'u-hieutruong', fullName: 'Phạm Thị Nam', phone: '0903111222' },
        },
        {
          id: 'doc-file-3',
          folderId: 'f-qdqc',
          fileName: 'Quyet-dinh-thanh-lap-hoi-dong-su-pham-2026-2027.pdf',
          originalName: 'Quyết định thành lập Hội đồng Sư phạm năm học 2026-2027.pdf',
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileSize: 2150000,
          mimeType: 'application/pdf',
          tenantId,
          academicYear: '2026-2027',
          createdAt: new Date('2026-08-20T08:00:00Z'),
          uploadedBy: { id: 'u-hieutruong', fullName: 'Phạm Thị Nam', phone: '0903111222' },
        },
        {
          id: 'doc-file-6',
          folderId: 'f-chuyenmon',
          fileName: 'Phan-phoi-chuong-trinh-Toan-THCS-2026-2027.xlsx',
          originalName: 'Phân phối chương trình Toán THCS năm học 2026-2027.xlsx',
          fileUrl: '#',
          fileSize: 1560000,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          tenantId,
          academicYear: '2026-2027',
          createdAt: new Date('2026-08-28T14:20:00Z'),
          uploadedBy: { id: 'u-totruong-toan', fullName: 'Lê Hoàng Long', phone: '0903444555' },
        },
      ]);
    }
    return this.memoryFiles.get(tenantId)!;
  }

  async getTree(tenantId: string, academicYear: string = '2026-2027') {
    const folders = this.getTenantFolders(tenantId, academicYear);
    const files = this.getTenantFiles(tenantId);

    const map = new Map<string, any>();
    folders.forEach((f) => {
      const fl = files.filter((file) => file.folderId === f.id);
      const totalSize = fl.reduce((sum, file) => sum + (file.fileSize || 0), 0);
      map.set(f.id, {
        ...f,
        children: [],
        fileCount: fl.length,
        totalSize,
      });
    });

    const tree: any[] = [];
    folders.forEach((f) => {
      const node = map.get(f.id);
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId).children.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  }

  async createFolder(tenantId: string, data: { name: string; parentId?: string | null; academicYear?: string }) {
    const folders = this.getTenantFolders(tenantId, data.academicYear || '2026-2027');
    const newFolder = {
      id: 'f-' + Date.now(),
      name: data.name.trim(),
      parentId: data.parentId || null,
      tenantId,
      academicYear: data.academicYear || '2026-2027',
      orderIndex: folders.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOpen: true,
    };
    folders.push(newFolder);
    return newFolder;
  }

  async updateFolder(tenantId: string, id: string, name: string) {
    const folders = this.getTenantFolders(tenantId, '2026-2027');
    const folder = folders.find((f) => f.id === id);
    if (!folder) {
      throw new AppError('Không tìm thấy thư mục.', 404);
    }
    folder.name = name.trim();
    folder.updatedAt = new Date();
    return folder;
  }

  async deleteFolder(tenantId: string, id: string) {
    const folders = this.getTenantFolders(tenantId, '2026-2027');
    const files = this.getTenantFiles(tenantId);

    const idsToDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      folders.forEach((f) => {
        if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
          idsToDelete.add(f.id);
          changed = true;
        }
      });
    }

    const updatedFolders = folders.filter((f) => !idsToDelete.has(f.id));
    this.memoryFolders.set(tenantId, updatedFolders);

    const updatedFiles = files.filter((f) => !idsToDelete.has(f.folderId));
    this.memoryFiles.set(tenantId, updatedFiles);

    return { success: true };
  }

  async getFilesByFolder(tenantId: string, folderId: string, search?: string) {
    const files = this.getTenantFiles(tenantId);
    let result = files.filter((f) => f.folderId === folderId);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.fileName.toLowerCase().includes(q) ||
          (f.originalName && f.originalName.toLowerCase().includes(q))
      );
    }
    return result;
  }

  async uploadFiles(
    tenantId: string,
    folderId: string,
    uploadedById: string,
    files: Express.Multer.File[]
  ) {
    const tenantFiles = this.getTenantFiles(tenantId);
    const created = [];

    const user = await prisma.user.findUnique({
      where: { id: uploadedById },
      select: { id: true, fullName: true, phone: true, avatarUrl: true },
    });

    for (const f of files) {
      const newFile = {
        id: 'doc-file-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        folderId,
        fileName: f.originalname || f.filename || 'Tep_Tin_Moi.pdf',
        originalName: f.originalname || 'Tệp tin mới.pdf',
        fileUrl: `/uploads/documents/${tenantId}/${f.filename || f.originalname}`,
        fileSize: f.size || 1024 * 500,
        mimeType: f.mimetype || 'application/pdf',
        uploadedById,
        uploadedBy: user || { id: uploadedById, fullName: 'Người dùng' },
        tenantId,
        academicYear: '2026-2027',
        createdAt: new Date(),
      };
      tenantFiles.unshift(newFile);
      created.push(newFile);
    }

    return created;
  }

  async deleteFile(tenantId: string, fileId: string) {
    const files = this.getTenantFiles(tenantId);
    const updated = files.filter((f) => f.id !== fileId);
    this.memoryFiles.set(tenantId, updated);
    return { success: true };
  }

  async initSampleTree(tenantId: string, academicYear: string = '2026-2027') {
    this.memoryFolders.set(tenantId, this.getSampleFolders(tenantId, academicYear));
    return this.getTree(tenantId, academicYear);
  }
}

export const documentService = new DocumentService();
