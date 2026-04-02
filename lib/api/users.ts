import { apiRequest } from './client';
import { ApiResponse, User, UserFilters } from '@/types';

/**
 * List users with filters
 */
export async function listUsers(filters?: UserFilters): Promise<ApiResponse<User[]>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.role) params.append('role', filters.role);

  const query = params.toString();
  return apiRequest<ApiResponse<User[]>>(`/api/v1/users${query ? `?${query}` : ''}`);
}

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<ApiResponse<User>> {
  return apiRequest<ApiResponse<User>>(`/api/v1/users/${userId}`);
}

/**
 * Update user
 */
export async function updateUser(
  userId: string,
  updates: Partial<User>
): Promise<ApiResponse<User>> {
  return apiRequest<ApiResponse<User>>(`/api/v1/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Ban user
 */
export async function banUser(
  userId: string,
  reason: string
): Promise<ApiResponse<User>> {
  return apiRequest<ApiResponse<User>>(`/api/v1/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Unban user
 */
export async function unbanUser(userId: string): Promise<ApiResponse<User>> {
  return apiRequest<ApiResponse<User>>(`/api/v1/users/${userId}/unban`, {
    method: 'POST',
  });
}

/**
 * Suspend user
 */
export async function suspendUser(
  userId: string,
  reason: string
): Promise<ApiResponse<User>> {
  return apiRequest<ApiResponse<User>>(`/api/v1/users/${userId}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Unsuspend user
 */
export async function unsuspendUser(userId: string): Promise<ApiResponse<User>> {
  return apiRequest<ApiResponse<User>>(`/api/v1/users/${userId}/unsuspend`, {
    method: 'POST',
  });
}
