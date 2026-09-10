interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags: string[];
}

export class AppCache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Lấy dữ liệu từ cache nếu còn hạn
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Lưu dữ liệu vào cache với thời gian sống (TTL tính theo giây)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 30, tags: string[] = []): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  /**
   * Xóa cache theo tag (ví dụ: 'tasks', 'dashboard', 'plans', 'users')
   */
  invalidateTags(tags: string[]): void {
    const tagSet = new Set(tags);
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.some((t) => tagSet.has(t))) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Xóa cache theo key cụ thể hoặc tiền tố
   */
  invalidateKey(keyOrPrefix: string): void {
    for (const key of this.store.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Xóa toàn bộ cache
   */
  clear(): void {
    this.store.clear();
  }
}

export const appCache = new AppCache();
export default appCache;
