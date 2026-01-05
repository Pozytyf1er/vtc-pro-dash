import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Alert } from "./useAlerts";

export interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | "default";
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: "Notification" in window && "serviceWorker" in navigator,
    isSubscribed: false,
    permission: "Notification" in window ? Notification.permission : "default",
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.log("Push notifications not supported");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission === "granted") {
        // Save to database that push is enabled
        if (user) {
          await supabase.from("user_alert_settings").upsert({
            user_id: user.id,
            push_enabled: true,
          });
        }
        setState((prev) => ({ ...prev, isSubscribed: true }));
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [state.isSupported, user]);

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (state.permission !== "granted") {
        console.log("Notification permission not granted");
        return;
      }

      try {
        // Try to use service worker for notification
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            ...options,
          });
        } else {
          // Fallback to regular notification
          new Notification(title, {
            icon: "/pwa-192x192.png",
            ...options,
          });
        }
      } catch (error) {
        // Fallback to regular notification
        try {
          new Notification(title, {
            icon: "/pwa-192x192.png",
            ...options,
          });
        } catch (e) {
          console.error("Failed to show notification:", e);
        }
      }
    },
    [state.permission]
  );

  const sendAlertNotifications = useCallback(
    async (alerts: Alert[]) => {
      if (state.permission !== "granted" || alerts.length === 0) return;

      // Group by severity - only send for critical alerts
      const criticalAlerts = alerts.filter((a) => a.severity === "error");

      if (criticalAlerts.length > 0) {
        const bodies = criticalAlerts.slice(0, 3).map((a) => a.message);
        await showNotification(
          `${criticalAlerts.length} alerte(s) urgente(s)`,
          {
            body: bodies.join("\n"),
            tag: "vtc-alerts",
            requireInteraction: true,
          }
        );
      }
    },
    [state.permission, showNotification]
  );

  return {
    ...state,
    requestPermission,
    showNotification,
    sendAlertNotifications,
  };
}
