import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap, catchError, of } from 'rxjs';
import {
  NotificationItem,
  NotificationType,
  NotificationFilterParams,
  NotificationListResponse,
} from '../models/notification.models';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private http = inject(HttpClient);
  private router = inject(Router);

  unreadCount = signal<number>(0);
  notifications = signal<NotificationItem[]>([]);
  isPermissionGranted = signal<boolean>(false);
  isBrowserSupported = signal<boolean>(false);

  private seenIds = new Set<string>();
  private isInitialized = false;
  private pollingTimer?: any;

  constructor() {
    this.checkBrowserSupport();
    this.startBackgroundPolling();
  }

  private checkBrowserSupport() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.isBrowserSupported.set(true);
      this.isPermissionGranted.set(Notification.permission === 'granted');
    }
  }

  /**
   * Xin quyền cấp phép thông báo đẩy từ trình duyệt
   */
  async requestBrowserPermission(): Promise<boolean> {
    if (!this.isBrowserSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      this.isPermissionGranted.set(granted);
      if (granted) {
        this.showBrowserNotification({
          title: 'TN EDU • Đã bật thông báo',
          content: 'Bạn sẽ nhận được thông báo đẩy tức thì trên màn hình khi có việc mới hoặc cập nhật.',
        });
      }
      return granted;
    } catch {
      return false;
    }
  }

  /**
   * Bắn thông báo đẩy trên trình duyệt (Web Notification API)
   */
  showBrowserNotification(notif: {
    id?: string;
    title: string;
    content: string;
    link?: string | null;
    taskId?: string | null;
  }) {
    if (!this.isBrowserSupported() || Notification.permission !== 'granted') {
      return;
    }

    try {
      // Dùng tag duy nhất cho từng sự kiện để trình duyệt KHÔNG ghi đè/chặn thông báo mới của cùng 1 công việc
      const uniqueTag = `tn-notif-${notif.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const n = new Notification(notif.title, {
        body: notif.content,
        icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=TNEDU',
        tag: uniqueTag,
      });

      n.onclick = () => {
        window.focus();
        if (notif.link) {
          if (notif.link.includes('/tasks/')) {
            const taskId = notif.link.split('/tasks/')[1]?.split('?')[0];
            if (taskId) {
              this.router.navigate(['/tasks'], { queryParams: { taskId } });
              n.close();
              return;
            }
          }
          this.router.navigateByUrl(notif.link);
        } else if (notif.taskId) {
          this.router.navigate(['/tasks'], { queryParams: { taskId: notif.taskId } });
        }
        n.close();
      };
    } catch {
      // Fallback if browser prevents notification instantiation
    }
  }

  /**
   * Phát sinh và kích hoạt thông báo đẩy ngay lập tức (0ms delay) cho cả Popover quả chuông và Desktop Push
   */
  emitNotification(item: {
    title: string;
    content: string;
    type?: NotificationType;
    taskId?: string | null;
    taskCode?: string | null;
    link?: string | null;
    senderName?: string | null;
    senderAvatar?: string | null;
  }): NotificationItem {
    const notifId = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const newNotif: NotificationItem = {
      id: notifId,
      title: item.title,
      content: item.content,
      type: item.type || 'GENERAL',
      taskId: item.taskId || null,
      taskCode: item.taskCode || null,
      link: item.link || (item.taskId ? `/tasks?taskId=${item.taskId}` : null),
      senderName: item.senderName || null,
      senderAvatar: item.senderAvatar || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Ghi nhận ID để vòng lặp polling không bị trùng lặp
    this.seenIds.add(newNotif.id);

    // Cập nhật tức thì vào signals của giao diện quả chuông
    this.notifications.update((list) => [newNotif, ...list]);
    this.unreadCount.update((c) => c + 1);

    // Bắn thông báo đẩy trên trình duyệt
    this.showBrowserNotification(newNotif);

    // Phát âm thanh chuông thông báo
    this.playNotificationSound();

    return newNotif;
  }

  /**
   * Phát âm thanh chuông thông báo tinh tế bằng Web Audio API
   */
  playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /**
   * Bắt đầu vòng lặp đồng bộ thông báo ngầm
   */
  private startBackgroundPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    // Initial fetch
    this.refreshNotifications();

    // Poll every 25 seconds
    this.pollingTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return; // Save bandwidth when tab inactive
      this.refreshNotifications(true);
    }, 25000);
  }

  /**
   * Làm mới danh sách thông báo và kiểm tra có thông báo mới không
   */
  refreshNotifications(isPolling = false): void {
    this.getNotifications({ pageSize: 20 }).subscribe({
      next: (res) => {
        if (!res || !res.items) return;

        if (!this.isInitialized) {
          res.items.forEach((item) => this.seenIds.add(item.id));
          this.isInitialized = true;
          return;
        }

        // Detect new items
        const newUnreadItems = res.items.filter(
          (item) => !item.isRead && !this.seenIds.has(item.id)
        );

        if (newUnreadItems.length > 0) {
          newUnreadItems.forEach((item) => {
            this.seenIds.add(item.id);
            this.showBrowserNotification(item);
          });
          this.playNotificationSound();
        }
      },
      error: () => {},
    });
  }

  getNotifications(params: NotificationFilterParams = {}): Observable<NotificationListResponse> {
    let httpParams = new HttpParams();
    if (params.unreadOnly !== undefined) httpParams = httpParams.set('unreadOnly', params.unreadOnly.toString());
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
    if (params.search) httpParams = httpParams.set('search', params.search.trim());
    if (params.type) httpParams = httpParams.set('type', params.type);

    return this.http
      .get<{ success: boolean; data: NotificationListResponse }>('/api/notifications', { params: httpParams })
      .pipe(
        map((res) => res?.data),
        tap((data) => {
          if (data) {
            this.unreadCount.set(data.unreadCount || 0);
            this.notifications.set(data.items || []);
          }
        }),
        catchError((err) => {
          return of({
            items: this.notifications(),
            total: this.notifications().length,
            unreadCount: this.unreadCount(),
            page: 1,
            pageSize: 20,
            totalPages: 1,
          });
        })
      );
  }

  markAsRead(id: string): Observable<NotificationItem | any> {
    return this.http
      .patch<{ success: boolean; data: NotificationItem }>(`/api/notifications/${id}/read`, {})
      .pipe(
        map((res) => res?.data),
        tap(() => {
          this.unreadCount.update((c) => Math.max(0, c - 1));
          this.notifications.update((list) =>
            list.map((item) => (item.id === id ? { ...item, isRead: true } : item))
          );
        }),
        catchError(() => {
          // Optimistic local update
          this.unreadCount.update((c) => Math.max(0, c - 1));
          this.notifications.update((list) =>
            list.map((item) => (item.id === id ? { ...item, isRead: true } : item))
          );
          return of({ id, isRead: true });
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
        }),
        catchError(() => {
          this.unreadCount.set(0);
          this.notifications.update((list) => list.map((item) => ({ ...item, isRead: true })));
          return of({ success: true });
        })
      );
  }
}
