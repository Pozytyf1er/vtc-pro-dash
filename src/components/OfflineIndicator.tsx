import { useEffect, useState } from "react";
import { usePendingSync } from "@/hooks/useOfflineCache";
import { WifiOff, RefreshCw, CheckCircle, XCircle, Cloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { pendingCount, isSyncing, lastSyncResult, syncPendingChanges } = usePendingSync();

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

  // Don't show anything if online and no pending changes
  if (!isOffline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  const handleManualSync = () => {
    if (!isOffline && !isSyncing) {
      syncPendingChanges();
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg transition-all duration-300",
        isOffline
          ? "bg-destructive text-destructive-foreground"
          : isSyncing
          ? "bg-primary text-primary-foreground"
          : lastSyncResult === "error"
          ? "bg-orange-500 text-white"
          : "bg-muted text-muted-foreground"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Mode hors-ligne</span>
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Synchronisation...</span>
        </>
      ) : lastSyncResult === "success" && pendingCount === 0 ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">Synchronisation terminée</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4" />
          <span className="text-sm font-medium">
            {pendingCount} modification(s) en attente
          </span>
        </>
      )}

      {pendingCount > 0 && (
        <Badge variant="secondary" className="ml-1">
          {pendingCount}
        </Badge>
      )}

      {!isOffline && pendingCount > 0 && !isSyncing && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-1"
              onClick={handleManualSync}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Synchroniser maintenant</p>
          </TooltipContent>
        </Tooltip>
      )}

      {lastSyncResult === "error" && !isSyncing && (
        <Tooltip>
          <TooltipTrigger>
            <XCircle className="h-4 w-4 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Échec de la synchronisation</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export default OfflineIndicator;
