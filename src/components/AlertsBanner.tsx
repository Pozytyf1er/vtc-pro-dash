import { useAlerts, Alert } from "@/hooks/useAlerts";
import { AlertCircle, Bell, Fuel, Shield, Car, IdCard, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const getAlertIcon = (type: Alert["type"]) => {
  switch (type) {
    case "oil_change":
      return <Fuel className="h-4 w-4" />;
    case "insurance":
      return <Shield className="h-4 w-4" />;
    case "inspection":
      return <Car className="h-4 w-4" />;
    case "license":
      return <IdCard className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getAlertTypeLabel = (type: Alert["type"]) => {
  switch (type) {
    case "oil_change":
      return "Vidange";
    case "insurance":
      return "Assurance";
    case "inspection":
      return "Contrôle technique";
    case "license":
      return "Permis";
    default:
      return "Alerte";
  }
};

export const AlertsBanner = () => {
  const { alerts, loading } = useAlerts();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const activeAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));
  const errorAlerts = activeAlerts.filter((a) => a.severity === "error");
  const warningAlerts = activeAlerts.filter((a) => a.severity === "warning");

  const dismissAlert = (id: string) => {
    setDismissedAlerts((prev) => [...prev, id]);
  };

  if (loading || activeAlerts.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`relative gap-2 ${
            errorAlerts.length > 0
              ? "border-destructive text-destructive hover:bg-destructive/10"
              : "border-warning text-warning hover:bg-warning/10"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Alertes</span>
          <Badge
            variant={errorAlerts.length > 0 ? "destructive" : "secondary"}
            className="ml-1"
          >
            {activeAlerts.length}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertes ({activeAlerts.length})
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          <div className="space-y-3 pr-4">
            {activeAlerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune alerte active
              </p>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`relative rounded-lg border p-4 ${
                    alert.severity === "error"
                      ? "border-destructive bg-destructive/5"
                      : "border-warning bg-warning/5"
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="flex items-start gap-3 pr-6">
                    <div
                      className={`mt-0.5 ${
                        alert.severity === "error"
                          ? "text-destructive"
                          : "text-warning"
                      }`}
                    >
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            alert.severity === "error"
                              ? "border-destructive text-destructive"
                              : "border-warning text-warning"
                          }`}
                        >
                          {getAlertTypeLabel(alert.type)}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
