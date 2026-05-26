import { apiRequest } from './client';
import { AdminNotification, ApiResponse } from '@/types';

export interface NotificationsResponse extends ApiResponse<AdminNotification[]> {
  unreadCount?: number;
}

export async function getNotifications(
  limit = 20,
  unreadOnly = false
): Promise<NotificationsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (unreadOnly) {
    params.append('unreadOnly', 'true');
  }

  return apiRequest<NotificationsResponse>(`/api/v1/notifications?${params.toString()}`);
}

export async function markNotificationRead(notificationId: string): Promise<ApiResponse<null>> {
  return apiRequest<ApiResponse<null>>(`/api/v1/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

export async function markAllNotificationsRead(): Promise<ApiResponse<null>> {
  return apiRequest<ApiResponse<null>>('/api/v1/notifications/read-all', {
    method: 'POST',
  });
}
