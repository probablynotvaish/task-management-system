import { useState, useEffect, useCallback } from "react";
import { type Notification, fetchUnreadNotifications, markNotificationAsRead } from "../api/notifications";
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async (isPolling = false) => {
    try {
      const data = await fetchUnreadNotifications();
      const newNotifications = data || [];

      setNotifications((prev) => {
        if (isPolling && newNotifications.length > prev.length) {
          const audio = new Audio('/pop.mp3');
          audio.play().catch(e => console.log("Audio blocked by browser auto-play policy"));
        }
        return newNotifications;
      });
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, []);

  useEffect(() => {
    loadNotifications(false);

    const interval = setInterval(() => {
      loadNotifications(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  const readNotification = async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await markNotificationAsRead(id);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
      loadNotifications(false);
    }
  };

  return {
    notifications,
    unreadCount: notifications.length,
    readNotification,
  };
}