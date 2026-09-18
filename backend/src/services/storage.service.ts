import fs from 'fs';
import path from 'path';

export interface UploadResult {
  fileKey: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export function decodeUtf8FileName(originalName: string): string {
  if (!originalName) return 'tep_tin';
  try {
    // Multer/busboy parse header theo chuẩn latin1. Chuyển đổi lại UTF-8 để giữ nguyên dấu tiếng Việt
    const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
    if (!decoded.includes('\ufffd')) {
      return decoded;
    }
  } catch (_) {}
  return originalName;
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
   * Giữ nguyên 100% tên tệp gốc tiếng Việt chuẩn UTF-8
   */
  public static async saveTaskEvidence(
    tenantId: string,
    taskId: string,
    file: Express.Multer.File
  ): Promise<UploadResult> {
    const rawOriginalName = decodeUtf8FileName(file.originalname || 'minh_chung.pdf');
    const ext = path.extname(rawOriginalName) || '.bin';
    const baseName = path.basename(rawOriginalName, ext);
    // Tên file lưu đĩa vật lý: xóa ký tự cấm của OS Windows/Linux nhưng giữ nguyên timestamp + tên
    const safeDiskBase = baseName.replace(/[/\\?%*:|"<>]/g, '_').substring(0, 100);
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${safeDiskBase}${ext}`;
    const relativeKey = `${tenantId}/tasks/${taskId}/${uniqueFileName}`;
    const mimeType = file.mimetype || 'application/octet-stream';

    // Tạo fileUrl: Luôn dùng URL tĩnh /uploads/... cho production server, chỉ dùng Base64 data URL trên Vercel Serverless
    let fileUrl = `/uploads/${relativeKey}`;
    if (process.env.VERCEL && file.buffer) {
      fileUrl = `data:${mimeType};base64,${file.buffer.toString('base64')}`;
    }

    // Ghi vào đĩa cục bộ
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
    } catch (err) {
      console.error('Lỗi khi ghi tệp đính kèm vào đĩa:', err);
      if (!process.env.VERCEL && file.buffer) {
        fileUrl = `data:${mimeType};base64,${file.buffer.toString('base64')}`;
      }
    }

    return {
      fileKey: relativeKey,
      fileUrl,
      fileName: rawOriginalName,
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
