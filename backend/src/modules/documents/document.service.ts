import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { decodeUtf8FileName } from '../../services/storage.service';

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

  private async getSampleFolders(tenantId: string, academicYear: string): Promise<any[]> {
    let schoolName = '';
    let locations: any[] = [];

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    let tenant: any = null;

    if (tenantId && isUuid.test(tenantId)) {
      try {
        tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          include: {
            school: {
              include: {
                locations: { orderBy: [{ isMain: 'desc' }, { name: 'asc' }] },
                orgUnits: { orderBy: { orderIndex: 'asc' } },
              },
            },
            locations: { orderBy: [{ isMain: 'desc' }, { name: 'asc' }] },
          },
        });
      } catch (_) {}
    }

    if (!tenant && tenantId && typeof tenantId === 'string' && tenantId.trim()) {
      try {
        const cleanCode = tenantId.replace(/^tenant-/, '').toUpperCase().replace(/-/g, '_');
        tenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { code: { equals: cleanCode, mode: 'insensitive' } },
              { code: { equals: tenantId, mode: 'insensitive' } },
              { name: { contains: tenantId.replace(/^tenant-/, ''), mode: 'insensitive' } },
            ],
          },
          include: {
            school: {
              include: {
                locations: { orderBy: [{ isMain: 'desc' }, { name: 'asc' }] },
                orgUnits: { orderBy: { orderIndex: 'asc' } },
              },
            },
            locations: { orderBy: [{ isMain: 'desc' }, { name: 'asc' }] },
          },
        });
      } catch (_) {}
    }

    // Fallback if tenant not yet configured: pick the primary registered school in DB
    if (!tenant) {
      try {
        tenant = await prisma.tenant.findFirst({
          include: {
            school: {
              include: {
                locations: { orderBy: [{ isMain: 'desc' }, { name: 'asc' }] },
                orgUnits: { orderBy: { orderIndex: 'asc' } },
              },
            },
            locations: { orderBy: [{ isMain: 'desc' }, { name: 'asc' }] },
          },
        });
      } catch (_) {}
    }

    if (tenant) {
      schoolName = tenant.school?.name || tenant.name || '';
      locations = tenant.school?.locations || tenant.locations || [];
    }

    // Tên thư mục gốc theo tên trường (Ví dụ: NGUYỄN HUỆ, PHƯỚC TÂN, HÒA BÌNH...)
    let rootName = 'TÀI LIỆU NHÀ TRƯỜNG';
    if (schoolName) {
      rootName = schoolName
        .toUpperCase()
        .replace(/^TRƯỜNG\s+THCS\s+/i, '')
        .replace(/^TRƯỜNG\s+TH\s*(&|VÀ)\s*THCS\s+/i, '')
        .replace(/^TRƯỜNG\s+TIỂU\s+HỌC\s+/i, '')
        .replace(/^TRƯỜNG\s+MẦM\s+NON\s+/i, '')
        .replace(/^TRƯỜNG\s+THPT\s+/i, '')
        .replace(/^TRƯỜNG\s+/i, '')
        .trim();
      if (!rootName) {
        rootName = schoolName.toUpperCase();
      }
    }

    const cleanYear = (academicYear || '2026-2027').replace(/\s+/g, '').replace(/Nămhọc/gi, '') || '2026-2027';
    const yearUnderscore = cleanYear.replace('-', '_');

    const rootId = `f-root-${tenantId}`;
    const yearId = `f-year-${tenantId}`;

    const folders: any[] = [
      { id: rootId, name: rootName, parentId: null, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: yearId, name: yearUnderscore, parentId: rootId, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: `f-dang-${tenantId}`, name: '1. Công tác Đảng', parentId: yearId, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-hctcns-${tenantId}`, name: '2. HC-TC-NS', parentId: yearId, tenantId, academicYear: cleanYear, orderIndex: 2, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: `f-qdqc-${tenantId}`, name: 'QUYẾT ĐỊNH_QUY CHẾ ĐẦU NĂM HỌC', parentId: `f-hctcns-${tenantId}`, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
    ];

    let order = 3;
    // Tự động sinh thư mục theo Điểm trường thực tế của trường trong CSDL
    if (locations && locations.length > 0) {
      locations.forEach((loc, idx) => {
        const locFolderId = `f-loc-${loc.id || idx}-${tenantId}`;
        folders.push({
          id: locFolderId,
          name: `${order}. ${loc.name}`,
          parentId: yearId,
          tenantId,
          academicYear: cleanYear,
          orderIndex: order++,
          createdAt: new Date(),
          updatedAt: new Date(),
          isOpen: idx === 0 || !!loc.isMain,
        });

        folders.push(
          { id: `f-cm-${loc.id || idx}-${tenantId}`, name: 'Chuyên môn', parentId: locFolderId, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
          { id: `f-csvc-${loc.id || idx}-${tenantId}`, name: 'CSVC', parentId: locFolderId, tenantId, academicYear: cleanYear, orderIndex: 2, createdAt: new Date(), updatedAt: new Date() },
          { id: `f-ns-${loc.id || idx}-${tenantId}`, name: 'Nhân sự', parentId: locFolderId, tenantId, academicYear: cleanYear, orderIndex: 3, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
          { id: `f-dshs-${loc.id || idx}-${tenantId}`, name: `DS HS ĐẦU NĂM - DS CÁC LỚP ${cleanYear}`, parentId: `f-ns-${loc.id || idx}-${tenantId}`, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() }
        );
      });
    } else {
      const diemChinhId = `f-diemchinh-${tenantId}`;
      folders.push(
        { id: diemChinhId, name: `${order++}. Điểm chính`, parentId: yearId, tenantId, academicYear: cleanYear, orderIndex: 3, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
        { id: `f-cm-${tenantId}`, name: 'Chuyên môn', parentId: diemChinhId, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: `f-csvc-${tenantId}`, name: 'CSVC', parentId: diemChinhId, tenantId, academicYear: cleanYear, orderIndex: 2, createdAt: new Date(), updatedAt: new Date() },
        { id: `f-ns-${tenantId}`, name: 'Nhân sự', parentId: diemChinhId, tenantId, academicYear: cleanYear, orderIndex: 3, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
        { id: `f-dshs-${tenantId}`, name: `DS HS ĐẦU NĂM - DS CÁC LỚP ${cleanYear}`, parentId: `f-ns-${tenantId}`, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() }
      );
    }

    // Thư mục công tác tháng
    const thangFolderId = `f-thang-${tenantId}`;
    folders.push(
      { id: thangFolderId, name: `${order++}. Công tác tháng`, parentId: yearId, tenantId, academicYear: cleanYear, orderIndex: order, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: `f-thang8-${tenantId}`, name: 'Tháng 8', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-thang9-${tenantId}`, name: 'Tháng 9', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 2, createdAt: new Date(), updatedAt: new Date(), isOpen: true },
      { id: `f-tuan1-${tenantId}`, name: 'Tuần 1', parentId: `f-thang9-${tenantId}`, tenantId, academicYear: cleanYear, orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-tuan2-${tenantId}`, name: 'Tuần 2', parentId: `f-thang9-${tenantId}`, tenantId, academicYear: cleanYear, orderIndex: 2, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-tuan3-${tenantId}`, name: 'Tuần 3', parentId: `f-thang9-${tenantId}`, tenantId, academicYear: cleanYear, orderIndex: 3, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-tuan4-${tenantId}`, name: 'Tuần 4', parentId: `f-thang9-${tenantId}`, tenantId, academicYear: cleanYear, orderIndex: 4, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-thang10-${tenantId}`, name: 'Tháng 10', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 3, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-thang11-${tenantId}`, name: 'Tháng 11', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 4, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-thang12-${tenantId}`, name: 'Tháng 12', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 5, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-thang1-${tenantId}`, name: 'Tháng 1', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 6, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-thang2-${tenantId}`, name: 'Tháng 2', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 7, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-thang3-${tenantId}`, name: 'Tháng 3', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 8, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-thang4-${tenantId}`, name: 'Tháng 4', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 9, createdAt: new Date(), updatedAt: new Date() },
      { id: `f-thang5-${tenantId}`, name: 'Tháng 5', parentId: thangFolderId, tenantId, academicYear: cleanYear, orderIndex: 10, createdAt: new Date(), updatedAt: new Date() }
    );

    return folders;
  }

  private async getTenantFolders(tenantId: string, academicYear: string): Promise<any[]> {
    if (!this.memoryFolders.has(tenantId)) {
      const sample = await this.getSampleFolders(tenantId, academicYear);
      this.memoryFolders.set(tenantId, sample);
    }
    return this.memoryFolders.get(tenantId)!;
  }

  private getTenantFiles(tenantId: string): any[] {
    if (!this.memoryFiles.has(tenantId)) {
      this.memoryFiles.set(tenantId, []);
    }
    return this.memoryFiles.get(tenantId)!;
  }

  async getTree(tenantId: string, academicYear: string = '2026-2027') {
    const folders = await this.getTenantFolders(tenantId, academicYear);
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
    const folders = await this.getTenantFolders(tenantId, data.academicYear || '2026-2027');
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
    const folders = await this.getTenantFolders(tenantId, '2026-2027');
    const folder = folders.find((f) => f.id === id);
    if (!folder) {
      throw new AppError('Không tìm thấy thư mục.', 404);
    }
    folder.name = name.trim();
    folder.updatedAt = new Date();
    return folder;
  }

  async deleteFolder(tenantId: string, id: string) {
    const folders = await this.getTenantFolders(tenantId, '2026-2027');
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
    files: Express.Multer.File[],
    filesData?: Array<{ name: string; originalName: string; size: number; type: string; dataUrl: string }>
  ) {
    const tenantFiles = this.getTenantFiles(tenantId);
    const created = [];

    let user = null;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uploadedById && isUuid.test(uploadedById)) {
      try {
        user = await prisma.user.findUnique({
          where: { id: uploadedById },
          select: { id: true, fullName: true, phone: true, avatarUrl: true },
        });
      } catch (_) {}
    }

    const itemsCount = Math.max(files.length, (filesData || []).length);
    for (let i = 0; i < itemsCount; i++) {
      const f = files[i] || null;
      const meta = filesData && filesData[i] ? filesData[i] : null;
      const rawName = f?.originalname ? decodeUtf8FileName(f.originalname) : '';
      const fileName = meta?.originalName || meta?.name || rawName || f?.filename || 'Tep_Tin_Moi.pdf';
      const originalName = meta?.originalName || meta?.name || rawName || 'Tệp tin mới.pdf';
      const mimeType = meta?.type || f?.mimetype || 'application/pdf';
      const fileSize = meta?.size || f?.size || (f?.buffer ? f.buffer.length : 1024 * 500);

      // Ưu tiên: Data URL từ filesData -> Buffer Base64 -> Dummy preview URL
      let fileUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      if (meta && meta.dataUrl) {
        fileUrl = meta.dataUrl;
      } else if (f && f.buffer) {
        fileUrl = `data:${mimeType};base64,${f.buffer.toString('base64')}`;
      }

      const newFile = {
        id: 'doc-file-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        folderId,
        fileName,
        originalName,
        fileUrl,
        fileSize,
        mimeType,
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
    const sample = await this.getSampleFolders(tenantId, academicYear);
    this.memoryFolders.set(tenantId, sample);
    return this.getTree(tenantId, academicYear);
  }
}

export const documentService = new DocumentService();
