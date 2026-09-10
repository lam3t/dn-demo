import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { NotificationItem, NotificationListResponse } from '../models/notification.models';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private http = inject(HttpClient);

  unreadCount = signal<number>(0);
  notifications = signal<NotificationItem[]>([]);

  getNotifications(params: { unreadOnly?: boolean; page?: number; pageSize?: number } = {}): Observable<NotificationListResponse> {
    let httpParams = new HttpParams();
    if (params.unreadOnly !== undefined) httpParams = httpParams.set('unreadOnly', params.unreadOnly.toString());
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http
      .get<{ success: boolean; data: NotificationListResponse }>('/api/notifications', { params: httpParams })
      .pipe(
        map((res) => res?.data),
        tap((data) => {
          this.unreadCount.set(data?.unreadCount || 0);
          this.notifications.set(data?.items || []);
        })
      );
  }

  markAsRead(id: string): Observable<NotificationItem> {
    return this.http
      .patch<{ success: boolean; data: NotificationItem }>(`/api/notifications/${id}/read`, {})
      .pipe(
        map((res) => res.data),
        tap(() => {
          this.unreadCount.update((c) => Math.max(0, c - 1));
          this.notifications.update((list) =>
            list.map((item) => (item.id === id ? { ...item, isRead: true } : item))
          );
        })
      );
  }

  markAllAsRead(): Observable<{ success: boolean }> {
    return this.http
      .patch<{ success: boolean }>('/api/notifications/read-all', {})
      .pipe(
        tap(() => {
          this.unreadCount.set(0);
          this.notifications.update((list) => list.map((item) => ({ ...item, isRead: true })));
        })
      );
  }
}
