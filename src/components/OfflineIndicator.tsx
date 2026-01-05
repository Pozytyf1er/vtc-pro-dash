import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePendingSync } from "@/hooks/useOfflineCache";
import { useToast } from "@/hooks/use-toast";

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const { pendingCount, syncPendingChanges } = usePendingSync();
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Auto-sync when coming back online
      handleSync();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (pendingCount === 0) return;
    
    setSyncing(true);
    try {
      const syncedCount = await syncPendingChanges();
      if (syncedCount && syncedCount > 0) {
        toast({
          title: "Synchronisation réussie",
          description: `${syncedCount} modification(s) synchronisée(s)`,
        });
      }
    } catch (error) {
      toast({
        title: "Erreur de synchronisation",
        description: "Certaines modifications n'ont pas pu être synchronisées",
        variant: "destructive",
      });
    }
    setSyncing(false);
  };

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg ${
      isOffline ? 'bg-warning text-warning-foreground' : 'bg-accent text-accent-foreground'
    }`}>
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Mode hors-ligne</span>
          {pendingCount > 0 && (
            <span className="text-xs">({pendingCount} en attente)</span>
          )}
        </>
      ) : (
        <>
          {syncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{pendingCount} modification(s) en attente</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSync}
            disabled={syncing}
            className="h-6 px-2"
          >
            Synchroniser
          </Button>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
