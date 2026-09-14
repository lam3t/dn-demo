import fs from 'fs';
import path from 'path';

export interface UploadResult {
  fileKey: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export class StorageService {
  private static uploadsBase = path.join(process.cwd(), 'uploads');
  private static isS3Configured = Boolean(process.env.S3_BUCKET && process.env.S3_ENDPOINT);

  /**
   * Khởi tạo thư mục gốc cho lưu trữ cục bộ
   */
  private static ensureDirExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Lưu trữ tệp minh chứng theo tenant-isolated path: /{tenantId}/tasks/{taskId}/{fileId}-{fileName}
   */
  public static async saveTaskEvidence(
    tenantId: string,
    taskId: string,
    file: Express.Multer.File
  ): Promise<UploadResult> {
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    
    // Chuẩn đường dẫn phân tầng đa tenant
    const relativeKey = `${tenantId}/tasks/${taskId}/${uniqueFileName}`;
    
    // Lưu cục bộ theo cấu trúc tenant folder
    const targetDir = path.join(this.uploadsBase, tenantId, 'tasks', taskId);
    this.ensureDirExists(targetDir);

    const targetFilePath = path.join(targetDir, uniqueFileName);

    if (file.buffer) {
      fs.writeFileSync(targetFilePath, file.buffer);
    } else if (file.path && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, targetFilePath);
      // Clean up multer temp file if needed
      try { fs.unlinkSync(file.path); } catch (_) {}
    }

    const fileUrl = `/uploads/${relativeKey}`;

    return {
      fileKey: relativeKey,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Xóa tệp minh chứng
   */
  public static async deleteFile(tenantId: string, relativeKey: string): Promise<boolean> {
    // Đảm bảo không truy cập trái phép ngoài tenantId
    if (!relativeKey.startsWith(`${tenantId}/`)) {
      throw new Error('Không có quyền thao tác trên tệp thuộc tenant khác');
    }

    const fullPath = path.join(this.uploadsBase, relativeKey);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  /**
   * Lấy đường dẫn file vật lý trên server (với kiểm tra tenant isolation)
   */
  public static getPhysicalPath(tenantId: string, relativeKey: string): string | null {
    if (!relativeKey.startsWith(`${tenantId}/`)) {
      return null;
    }
    const fullPath = path.join(this.uploadsBase, relativeKey);
    return fs.existsSync(fullPath) ? fullPath : null;
  }
}
