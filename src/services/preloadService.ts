import api from './api';

// Cache for background-fetched promises to avoid duplicate fetching and facilitate instant loading.
const preloadCache: Record<string, Promise<any>> = {};

export const preloadService = {
  preload(key: string, fetchFn: () => Promise<any>) {
    if (!preloadCache[key]) {
      console.log(`[PreloadStrategy] Triggering background prefetch for: ${key}`);
      preloadCache[key] = fetchFn().catch(err => {
        console.warn(`[PreloadStrategy] Prefetch failed for ${key}:`, err);
        // Clear on failure so retry works
        delete preloadCache[key];
        throw err;
      });
    }
    return preloadCache[key];
  },

  get(key: string) {
    return preloadCache[key];
  },

  has(key: string) {
    return !!preloadCache[key];
  },

  clear(key?: string) {
    if (key) {
      delete preloadCache[key];
    } else {
      Object.keys(preloadCache).forEach(k => delete preloadCache[k]);
    }
  }
};
