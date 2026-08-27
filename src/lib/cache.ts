/**
 * 简单的内存缓存
 * 用于缓存频繁读取但不常变化的数据（如 AI 配置）
 */

interface CacheItem<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheItem<unknown>>();

/**
 * 获取缓存
 * @param key 缓存键
 * @returns 缓存的数据，或 null（如果不存在或已过期）
 */
export function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }

  return item.data as T;
}

/**
 * 设置缓存
 * @param key 缓存键
 * @param data 要缓存的数据
 * @param ttlMs 过期时间（毫秒），默认 5 分钟
 */
export function setCache<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs,
  });
}

/**
 * 删除指定缓存
 * @param key 缓存键
 */
export function deleteCache(key: string): void {
  cache.delete(key);
}

/**
 * 清空所有缓存
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
