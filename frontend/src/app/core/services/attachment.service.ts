import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { TaskAttachmentItem } from '../models/task.models';

export interface UploadProgressEvent {
  progress: number;
  completed: boolean;
  data?: TaskAttachmentItem[];
}

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private http = inject(HttpClient);

  uploadTaskAttachmentsWithProgress(
    taskId: string,
    files: File[],
    taskLogId?: string
  ): Observable<UploadProgressEvent> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    if (taskLogId) {
      formData.append('taskLogId', taskLogId);
    }

    const req = new HttpRequest('POST', `/api/tasks/${taskId}/attachments`, formData, {
      reportProgress: true,
    });

    return this.http.request<{ success: boolean; data: TaskAttachmentItem[] }>(req).pipe(
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

  getTaskAttachments(taskId: string): Observable<TaskAttachmentItem[]> {
    return this.http
      .get<{ success: boolean; data: TaskAttachmentItem[] }>(`/api/tasks/${taskId}/attachments`)
      .pipe(map((res) => res.data || []));
  }

  deleteAttachment(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/attachments/${id}`);
  }
}
