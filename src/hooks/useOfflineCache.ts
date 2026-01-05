import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const CACHE_PREFIX = "vtc_cache_";
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const SYNC_DEBOUNCE_MS = 2000; // Wait 2 seconds after coming online before syncing

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PendingChange {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
  userId?: string;
}

export function useOfflineCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = []
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_PREFIX + "pending_changes");

  // Remove the oldest half of cached items
  const entries = cacheKeys
    .map((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        return { key, timestamp: entry.timestamp };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as { key: string; timestamp: number }[];

  entries.sort((a, b) => a.timestamp - b.timestamp);

  const toRemove = entries.slice(0, Math.ceil(entries.length / 2));
  toRemove.forEach((entry) => localStorage.removeItem(entry.key));
}

// Enhanced hook for syncing offline changes with auto-sync
export function usePendingSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<"success" | "error" | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownOnlineToast = useRef(false);

  // Update pending count on mount and when changes happen
  useEffect(() => {
    const count = getPendingChangesCount();
    setPendingCount(count);
  }, []);

  const syncPendingChanges = useCallback(async (): Promise<number> => {
    if (!navigator.onLine) {
      return 0;
    }

    const pending = getPendingChanges();
    if (pending.length === 0) {
      return 0;
    }

    setIsSyncing(true);
    const synced: string[] = [];
    const errors: string[] = [];

    for (const change of pending) {
      try {
        const tableName = change.table as "incomes" | "expenses" | "vehicles" | "drivers" | "maintenance" | "shifts";
        
        if (change.operation === "insert") {
          const { error } = await supabase.from(tableName).insert(change.data as never);
          if (error) throw error;
        } else if (change.operation === "update") {
          const { id, ...updateData } = change.data;
          const { error } = await supabase.from(tableName).update(updateData as never).eq("id", id as string);
          if (error) throw error;
        } else if (change.operation === "delete") {
          const { error } = await supabase.from(tableName).delete().eq("id", change.data.id as string);
          if (error) throw error;
        }

        synced.push(change.id);
      } catch (error) {
        console.error("Failed to sync change:", change, error);
        errors.push(change.id);
      }
    }

    // Remove synced changes
    const remaining = pending.filter((p) => !synced.includes(p.id));
    localStorage.setItem(CACHE_PREFIX + "pending_changes", JSON.stringify(remaining));
    setPendingCount(remaining.length);
    setIsSyncing(false);

    // Show result
    if (synced.length > 0 && errors.length === 0) {
      setLastSyncResult("success");
      toast({
        title: "Synchronisation terminée",
        description: `${synced.length} modification(s) synchronisée(s)`,
      });
    } else if (errors.length > 0) {
      setLastSyncResult("error");
      toast({
        title: "Synchronisation partielle",
        description: `${synced.length} réussie(s), ${errors.length} échouée(s)`,
        variant: "destructive",
      });
    }

    return synced.length;
  }, [toast]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      console.log("Connection restored, scheduling sync...");
      
      // Show toast only once when coming back online
      if (!hasShownOnlineToast.current && getPendingChangesCount() > 0) {
        hasShownOnlineToast.current = true;
        toast({
          title: "Connexion rétablie",
          description: "Synchronisation des modifications en cours...",
        });
      }

      // Debounce sync to avoid multiple rapid calls
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncPendingChanges();
        hasShownOnlineToast.current = false;
      }, SYNC_DEBOUNCE_MS);
    };

    const handleOffline = () => {
      console.log("Connection lost");
      hasShownOnlineToast.current = false;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync if online and has pending changes
    if (navigator.onLine && getPendingChangesCount() > 0) {
      syncTimeoutRef.current = setTimeout(() => {
        syncPendingChanges();
      }, SYNC_DEBOUNCE_MS);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [syncPendingChanges, toast]);

  const addPendingChange = useCallback(
    (table: string, operation: "insert" | "update" | "delete", data: Record<string, unknown>) => {
      const pending = getPendingChanges();
      
      // Check for duplicate operations on the same record
      const existingIndex = pending.findIndex(
        (p) => p.table === table && p.data?.id === data?.id
      );

      if (existingIndex >= 0) {
        // Update existing pending change
        if (operation === "delete") {
          // If we're deleting something that was just inserted, remove both
          if (pending[existingIndex].operation === "insert") {
            pending.splice(existingIndex, 1);
          } else {
            pending[existingIndex] = {
              id: Date.now().toString(),
              table,
              operation,
              data,
              timestamp: Date.now(),
              userId: user?.id,
            };
          }
        } else {
          // Update the existing change
          pending[existingIndex] = {
            ...pending[existingIndex],
            operation: pending[existingIndex].operation === "insert" ? "insert" : operation,
            data,
            timestamp: Date.now(),
          };
        }
      } else {
        // Add new pending change
        pending.push({
          id: Date.now().toString(),
          table,
          operation,
          data,
          timestamp: Date.now(),
          userId: user?.id,
        });
      }

      localStorage.setItem(CACHE_PREFIX + "pending_changes", JSON.stringify(pending));
      setPendingCount(pending.length);
    },
    [user]
  );

  const clearPendingChanges = useCallback(() => {
    localStorage.setItem(CACHE_PREFIX + "pending_changes", JSON.stringify([]));
    setPendingCount(0);
  }, []);

  return {
    pendingCount,
    isSyncing,
    lastSyncResult,
    addPendingChange,
    syncPendingChanges,
    clearPendingChanges,
  };
}

function getPendingChanges(): PendingChange[] {
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
