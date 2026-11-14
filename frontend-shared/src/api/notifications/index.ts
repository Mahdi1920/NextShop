import { apiClient } from "@shared/api/clients";

export type NotificationItem = {
  _id: string;
  recipientId?: string | null;
  role?: string | null;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

export const notificationsApi = {
  async listMine(limit: number = 50): Promise<NotificationItem[]> {
    const res = await apiClient.get<NotificationItem[]>("/notifications/me", {
      params: { limit },
    });
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ count: number }>("/notifications/unread-count");
    return res.data.count;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch("/notifications/mark-all-read");
  },
};

