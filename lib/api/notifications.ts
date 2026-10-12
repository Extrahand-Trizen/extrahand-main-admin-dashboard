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

// ---------------------------------------------------------------------------
// App user broadcasts (Notifications page) — Super Admin only
// ---------------------------------------------------------------------------

export type BroadcastApp = 'customer_app' | 'helper_app' | 'seller_app';

export type BroadcastStatus = 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

export type BroadcastRecipientType = 'all' | 'selected';

export const MAX_SELECTED_RECIPIENTS = 500;

/** `userRole` is the user list `role` filter that matches each app's users. */
export const BROADCAST_APP_OPTIONS: Array<{ value: BroadcastApp; label: string; userRole: string }> = [
  { value: 'customer_app', label: 'Customer App', userRole: 'customer' },
  { value: 'helper_app', label: 'Partner App', userRole: 'helper' },
  { value: 'seller_app', label: 'Seller App', userRole: 'seller' },
];

export interface NotificationBroadcast {
  id: string;
  app: BroadcastApp;
  recipientType: BroadcastRecipientType;
  userIds: string[];
  title: string;
  message: string;
  imageUrl: string | null;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  status: BroadcastStatus;
  failureReason: string | null;
  scheduledAt: string | null;
  sendAt: string;
  createdBy: string;
  createdAt: string;
}

export interface NotificationBroadcastList {
  success: boolean;
  data: NotificationBroadcast[];
  pagination: { total: number; limit: number; skip: number };
}

export async function listNotificationBroadcasts(params: {
  app?: BroadcastApp | 'all';
  limit?: number;
  skip?: number;
}): Promise<NotificationBroadcastList | null> {
  const search = new URLSearchParams({
    limit: String(params.limit ?? 20),
    skip: String(params.skip ?? 0),
  });
  if (params.app && params.app !== 'all') {
    search.append('app', params.app);
  }
  return apiRequest<NotificationBroadcastList | null>(`/api/v1/notifications/broadcasts?${search.toString()}`);
}

export async function sendNotificationBroadcast(payload: {
  app: BroadcastApp;
  title: string;
  message: string;
  imageUrl?: string;
  scheduledAt?: string;
  recipientType: BroadcastRecipientType;
  userIds?: string[];
}): Promise<ApiResponse<NotificationBroadcast> & { message?: string }> {
  return apiRequest(`/api/v1/notifications/broadcasts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cancelNotificationBroadcast(id: string): Promise<ApiResponse<NotificationBroadcast>> {
  return apiRequest(`/api/v1/notifications/broadcasts/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  });
}

export async function clearNotificationBroadcasts(
  app: BroadcastApp
): Promise<ApiResponse<{ app: BroadcastApp; deletedCount: number }>> {
  return apiRequest(`/api/v1/notifications/broadcasts/clear`, {
    method: 'POST',
    body: JSON.stringify({ app }),
  });
}

export async function uploadNotificationImage(file: File): Promise<string> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('Not authenticated. Please login.');

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/broadcasts/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type — browser sets it with boundary for FormData
    },
    body: formData,
  });

  const result = await response.json().catch(() => ({ error: response.statusText }));
  if (!response.ok || !result?.data?.url) {
    throw new Error(result?.error || 'Image upload failed');
  }
  return result.data.url as string;
}
