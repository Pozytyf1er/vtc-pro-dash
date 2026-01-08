import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Cloud, CloudOff, Check, Loader2 } from "lucide-react";
import { usePendingSync } from "@/hooks/useOfflineCache";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function SyncIndicator() {
  const { t } = useTranslation();
  const { pendingCount, syncPendingChanges } = usePendingSync();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (pendingCount > 0) {
        handleSync();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pendingCount]);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    
    setSyncing(true);
    try {
      const synced = await syncPendingChanges();
      if (synced && synced > 0) {
        toast({
          title: t('common.success'),
          description: t('offline.syncComplete'),
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('offline.syncFailed'),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (pendingCount === 0 && isOnline) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <Badge variant="outline" className="flex items-center gap-1 text-orange-600 border-orange-600">
          <CloudOff className="h-3 w-3" />
          {t('common.offline')}
        </Badge>
      )}
      
      {pendingCount > 0 && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Cloud className="h-3 w-3" />
          {pendingCount} {t('common.pendingChanges')}
        </Badge>
      )}
      
      {isOnline && pendingCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSync}
          disabled={syncing}
          className="h-7 px-2"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
