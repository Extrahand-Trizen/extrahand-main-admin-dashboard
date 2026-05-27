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
  if (filters?.category) params.append('category', filters.category);
  if (typeof filters?.isAadhaarVerified === 'boolean') {
    params.append('isAadhaarVerified', String(filters.isAadhaarVerified));
  }
  if (typeof filters?.isCertified === 'boolean') {
    params.append('isCertified', String(filters.isCertified));
  }
  if (filters?.createdFrom) params.append('createdFrom', filters.createdFrom);
  if (filters?.createdTo) params.append('createdTo', filters.createdTo);

  const query = params.toString();
  return apiRequest<ApiResponse<User[]>>(`/api/v1/users${query ? `?${query}` : ''}`);
}

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<ApiResponse<User>> {
  const segment = encodeURIComponent(userId);
  const res = await apiRequest<ApiResponse<User> | null>(`/api/v1/users/${segment}`);
  if (res == null || res.success === false) {
    throw new Error(
      (res as ApiResponse<User> | null)?.error ||
        'User not found or could not be loaded',
    );
  }
  return res;
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

/**
 * Preview users with no role saved (dry run — safe, no deletion)
 */
export async function previewUsersWithoutRoles(): Promise<{
  success: boolean;
  data: {
    count: number;
    users: Array<{ uid: string; name: string; email: string; createdAt: string }>;
  };
  message: string;
}> {
  return apiRequest(`/api/v1/users/cleanup/no-role`, {
    method: 'GET',
  });
}

/**
 * Cascade delete users with no roles (destructive!)
 */
export async function deleteUsersWithoutRoles(): Promise<{
  success: boolean;
  data: {
    count: number;
    deletedCount: number;
    users: Array<{ uid: string; name: string; email: string; createdAt: string }>;
  };
  message: string;
}> {
  return apiRequest(`/api/v1/users/cleanup/no-role`, {
    method: 'POST',
    body: JSON.stringify({ dry_run: false }),
  });
}

/**
 * Get registration source for a user
 */
export async function getUserRegistrationSource(
  userId: string
): Promise<ApiResponse<{ source: 'partner_portal' | 'self_registered'; addedByName: string | null; leadId: string | null }>> {
  const segment = encodeURIComponent(userId);
  const res = await apiRequest<ApiResponse<{ source: 'partner_portal' | 'self_registered'; addedByName: string | null; leadId: string | null }> | null>(
    `/api/v1/users/${segment}/registration-source`
  );
  if (res == null || res.success === false) {
    throw new Error(
      (res as any)?.error || 'Registration source could not be loaded'
    );
  }
  return res;
}
