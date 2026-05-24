import { api } from "./client";

export type NotificationType = "daily_digest" | "system_alert" | "general";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export async function fetchUnreadNotifications(): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>("/api/notifications");
  return data;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await api.put(`/api/notifications/${id}/read`);
}