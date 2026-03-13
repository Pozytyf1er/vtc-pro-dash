// Push notification utilities for alerts
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendPushNotification = (title: string, body: string, icon?: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        icon: icon || '/pwa-192x192.png',
      });
    } else {
      new Notification(title, { body, icon: icon || '/pwa-192x192.png', badge: '/pwa-192x192.png' });
    }
  } catch {
    new Notification(title, { body, icon: icon || '/pwa-192x192.png' });
  }
};

interface AlertItem {
  type: string;
  title: string;
  message: string;
  severity: string;
  daysRemaining: number;
}

const LAST_NOTIF_KEY = 'vtc_last_notification_check';

export const checkAndSendAlertNotifications = async (alerts: AlertItem[]) => {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const lastCheck = localStorage.getItem(LAST_NOTIF_KEY);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Only send once per day
  if (lastCheck === todayStr) return;

  const urgentAlerts = alerts.filter(a => a.severity === 'error');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  if (urgentAlerts.length > 0) {
    sendPushNotification(
      '⚠️ Alertes urgentes VTC Manager',
      urgentAlerts.map(a => a.message).join('\n'),
    );
  }

  if (warningAlerts.length > 0) {
    setTimeout(() => {
      sendPushNotification(
        '🔔 Rappels VTC Manager',
        warningAlerts.slice(0, 3).map(a => a.message).join('\n'),
      );
    }, 3000);
  }

  localStorage.setItem(LAST_NOTIF_KEY, todayStr);
};
