import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "community:lastSeenPostsAt";

/** Per-viewer "new since you were last here" marker for the Community feed —
 * purely a local convenience (no backend concept of read/unread posts), so
 * it's read/written straight to localStorage rather than synced anywhere. */
export function useSeenPosts() {
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
      return 0;
    }
  });

  const markSeenNow = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // best-effort — a private window or cleared storage just disables the badge
    }
  }, []);

  // Mark everything currently loaded as seen once the viewer leaves the feed,
  // not immediately on mount — otherwise the "New" badge would never render
  // long enough to notice.
  useEffect(() => {
    return () => markSeenNow();
  }, [markSeenNow]);

  const isNew = useCallback((createdAt: string) => new Date(createdAt).getTime() > lastSeenAt, [lastSeenAt]);

  return { isNew };
}
