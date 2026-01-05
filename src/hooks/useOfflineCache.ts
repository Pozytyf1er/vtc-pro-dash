import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const CACHE_PREFIX = "vtc_cache_";
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function useOfflineCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Try to load from cache first
      const cached = getFromCache<T>(key);
      if (cached) {
        setData(cached);
        if (isOffline) {
          setLoading(false);
          return;
        }
      }

      // If online, fetch fresh data
      if (!isOffline) {
        try {
          const freshData = await fetchFn();
          setData(freshData);
          saveToCache(key, freshData);
        } catch (error) {
          // If fetch fails and we have cached data, use it
          if (cached) {
            console.log("Using cached data due to fetch error");
          }
        }
      }

      setLoading(false);
    };

    loadData();
  }, [key, isOffline, ...dependencies]);

  const refresh = async () => {
    if (isOffline) return;
    setLoading(true);
    try {
      const freshData = await fetchFn();
      setData(freshData);
      saveToCache(key, freshData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
    setLoading(false);
  };

  return { data, loading, isOffline, refresh };
}

function getFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const now = Date.now();

    // Check if cache is still valid (not expired)
    if (now - entry.timestamp < CACHE_EXPIRY_MS) {
      return entry.data;
    }

    // Cache expired, remove it
    localStorage.removeItem(CACHE_PREFIX + key);
    return null;
  } catch {
    return null;
  }
}

function saveToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    // Storage might be full, clear old caches
    clearOldCaches();
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      console.error("Failed to save to cache:", error);
    }
  }
}

function clearOldCaches(): void {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  
  // Remove the oldest half of cached items
  const entries = cacheKeys.map(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      return { key, timestamp: entry.timestamp };
    } catch {
      return null;
    }
  }).filter(Boolean) as { key: string; timestamp: number }[];

  entries.sort((a, b) => a.timestamp - b.timestamp);
  
  const toRemove = entries.slice(0, Math.ceil(entries.length / 2));
  toRemove.forEach(entry => localStorage.removeItem(entry.key));
}

// Hook for syncing offline changes
export function usePendingSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const count = getPendingChangesCount();
    setPendingCount(count);
  }, []);

  const addPendingChange = (table: string, operation: "insert" | "update" | "delete", data: any) => {
    const pending = getPendingChanges();
    pending.push({
      id: Date.now().toString(),
      table,
      operation,
      data,
      timestamp: Date.now(),
      userId: user?.id,
    });
    localStorage.setItem(CACHE_PREFIX + "pending_changes", JSON.stringify(pending));
    setPendingCount(pending.length);
  };

  const syncPendingChanges = async () => {
    if (!navigator.onLine) return;

    const pending = getPendingChanges();
    const synced: string[] = [];

    for (const change of pending) {
      try {
        if (change.operation === "insert") {
          await supabase.from(change.table).insert(change.data);
        } else if (change.operation === "update") {
          await supabase.from(change.table).update(change.data).eq("id", change.data.id);
        } else if (change.operation === "delete") {
          await supabase.from(change.table).delete().eq("id", change.data.id);
        }
        synced.push(change.id);
      } catch (error) {
        console.error("Failed to sync change:", error);
      }
    }

    // Remove synced changes
    const remaining = pending.filter(p => !synced.includes(p.id));
    localStorage.setItem(CACHE_PREFIX + "pending_changes", JSON.stringify(remaining));
    setPendingCount(remaining.length);

    return synced.length;
  };

  return { pendingCount, addPendingChange, syncPendingChanges };
}

function getPendingChanges(): any[] {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + "pending_changes");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getPendingChangesCount(): number {
  return getPendingChanges().length;
}
