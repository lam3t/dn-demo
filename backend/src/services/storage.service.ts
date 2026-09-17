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
   * Tương thích cả Local Disk và Serverless Vercel (Base64 Data URL)
   */
  public static async saveTaskEvidence(
    tenantId: string,
    taskId: string,
    file: Express.Multer.File
  ): Promise<UploadResult> {
    const sanitizedFileName = (file.originalname || 'minh_chung.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    const relativeKey = `${tenantId}/tasks/${taskId}/${uniqueFileName}`;
    const mimeType = file.mimetype || 'application/octet-stream';

    // Tạo fileUrl: Ưu tiên Base64 Data URL nếu có file.buffer (hoạt động 100% trên Vercel Serverless)
    let fileUrl = `/uploads/${relativeKey}`;
    if (file.buffer) {
      fileUrl = `data:${mimeType};base64,${file.buffer.toString('base64')}`;
    }

    // Cố gắng ghi vào đĩa cục bộ nếu đang chạy ở local (bọc try-catch chống sập trên Vercel read-only)
    try {
      const targetDir = path.join(this.uploadsBase, tenantId, 'tasks', taskId);
      this.ensureDirExists(targetDir);
      const targetFilePath = path.join(targetDir, uniqueFileName);

      if (file.buffer) {
        fs.writeFileSync(targetFilePath, file.buffer);
      } else if (file.path && fs.existsSync(file.path)) {
        fs.copyFileSync(file.path, targetFilePath);
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
    } catch (_) {
      // Vercel serverless read-only filesystem: bỏ qua lỗi ghi đĩa vì fileUrl đã chứa Base64
    }

    return {
      fileKey: relativeKey,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size || (file.buffer ? file.buffer.length : 0),
      mimeType,
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
