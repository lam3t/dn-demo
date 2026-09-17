import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { DocumentFolder, DocumentFile, CreateFolderDto, UpdateFolderDto, DocumentUploadEvent } from '../models/document.models';

export interface FilePayload {
  name: string;
  originalName: string;
  size: number;
  type: string;
  dataUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private http = inject(HttpClient);

  /**
   * Lấy cây thư mục tài liệu phân cấp
   */
  getFolderTree(academicYear?: string): Observable<DocumentFolder[]> {
    const params: any = {};
    if (academicYear) params.academicYear = academicYear;
    return this.http
      .get<{ success: boolean; data: DocumentFolder[] }>('/api/documents/folders', { params })
      .pipe(map((res) => res.data || []));
  }

  /**
   * Tạo mới một thư mục
   */
  createFolder(dto: CreateFolderDto): Observable<DocumentFolder> {
    return this.http
      .post<{ success: boolean; data: DocumentFolder }>('/api/documents/folders', dto)
      .pipe(map((res) => res.data));
  }

  /**
   * Đổi tên / cập nhật thư mục
   */
  updateFolder(id: string, dto: UpdateFolderDto): Observable<DocumentFolder> {
    return this.http
      .patch<{ success: boolean; data: DocumentFolder }>(`/api/documents/folders/${id}`, dto)
      .pipe(map((res) => res.data));
  }

  /**
   * Xóa một thư mục và các tệp/thư mục con
   */
  deleteFolder(id: string): Observable<{ success: boolean; message?: string }> {
    return this.http
      .delete<{ success: boolean; message?: string }>(`/api/documents/folders/${id}`)
      .pipe(map((res) => res));
  }

  /**
   * Lấy danh sách tệp tin trong một thư mục
   */
  getFilesByFolder(folderId: string, search?: string): Observable<DocumentFile[]> {
    const params: any = {};
    if (search) params.search = search;
    return this.http
      .get<{ success: boolean; data: DocumentFile[] }>(`/api/documents/folders/${folderId}/files`, { params })
      .pipe(map((res) => res.data || []));
  }

  /**
   * Tải lên danh sách tệp tin vào thư mục có báo tiến trình
   */
  uploadFilesWithProgress(folderId: string, files: File[], filesData?: FilePayload[]): Observable<DocumentUploadEvent> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('folderId', folderId);
    if (filesData && filesData.length > 0) {
      formData.append('filesData', JSON.stringify(filesData));
    }

    const req = new HttpRequest('POST', `/api/documents/folders/${folderId}/files`, formData, {
      reportProgress: true,
    });

    return this.http.request<{ success: boolean; data: DocumentFile[] }>(req).pipe(
      map((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          return { progress, completed: false };
        } else if (event.type === HttpEventType.Response) {
          return {
            progress: 100,
            completed: true,
            data: event.body?.data || [],
          };
        }
        return { progress: 0, completed: false };
      })
    );
  }

  /**
   * Xóa một tệp tin
   */
  deleteFile(fileId: string): Observable<{ success: boolean; message?: string }> {
    return this.http
      .delete<{ success: boolean; message?: string }>(`/api/documents/files/${fileId}`)
      .pipe(map((res) => res));
  }

  /**
   * Tìm kiếm tài liệu toàn diện
   */
  searchDocuments(keyword: string, academicYear?: string): Observable<DocumentFile[]> {
    const params: any = { search: keyword };
    if (academicYear) params.academicYear = academicYear;
    return this.http
      .get<{ success: boolean; data: DocumentFile[] }>('/api/documents/search', { params })
      .pipe(map((res) => res.data || []));
  }

  /**
   * Khởi tạo cây thư mục mẫu chuẩn theo trường học
   */
  initSampleTree(academicYear: string): Observable<DocumentFolder[]> {
    return this.http
      .post<{ success: boolean; data: DocumentFolder[] }>('/api/documents/sample-tree', { academicYear })
      .pipe(map((res) => res.data || []));
  }
}
