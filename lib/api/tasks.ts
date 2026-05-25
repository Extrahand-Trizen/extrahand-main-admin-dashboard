import { apiRequest } from './client';
import { ApiResponse, Task, TaskFilters, TaskApplication } from '@/types';

/**
 * List tasks with filters
 */
export async function listTasks(filters?: TaskFilters): Promise<ApiResponse<Task[]>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.customerId) params.append('customerId', filters.customerId);
  if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);

  const query = params.toString();
  return apiRequest<ApiResponse<Task[]>>(`/api/v1/tasks${query ? `?${query}` : ''}`);
}

export async function listApplications(filters?: {
  page?: number;
  limit?: number;
  status?: string;
  taskId?: string;
  mine?: boolean;
  profileId?: string;
}): Promise<ApiResponse<any[]>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.status) params.append('status', filters.status);
  if (filters?.taskId) params.append('taskId', filters.taskId);
  if (filters?.mine) params.append('mine', 'true');
  if (filters?.profileId) params.append('profileId', filters.profileId);

  const query = params.toString();
  return apiRequest<ApiResponse<any[]>>(`/api/v1/applications${query ? `?${query}` : ''}`);
}

/**
 * Get task by ID
 */
export async function getTask(taskId: string): Promise<ApiResponse<Task>> {
  return apiRequest<ApiResponse<Task>>(`/api/v1/tasks/${taskId}`);
}

/**
 * Update task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<ApiResponse<Task>> {
  return apiRequest<ApiResponse<Task>>(`/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete task
 */
export async function deleteTask(
  taskId: string,
  reason: string
): Promise<ApiResponse<void>> {
  const result = await apiRequest<ApiResponse<void>>(`/api/v1/tasks/${taskId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
  if (!result || result.success === false) {
    const msg =
      (result as ApiResponse<void> | null)?.error || 'Failed to delete task';
    throw new Error(msg);
  }
  return result;
}

/**
 * Request task deletion (Operations -> Super Admin approval)
 */
export async function requestTaskDelete(
  taskId: string,
  reason: string
): Promise<ApiResponse<{ requestId: string }>> {
  const result = await apiRequest<ApiResponse<{ requestId: string }>>(
    `/api/v1/tasks/${taskId}/delete-requests`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );

  if (!result || result.success === false) {
    const msg =
      (result as ApiResponse<{ requestId: string }> | null)?.error ||
      "Failed to request task deletion";
    throw new Error(msg);
  }

  return result;
}

export async function listDeletedTasks(filters?: TaskFilters): Promise<ApiResponse<Task[]>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.search) params.append('search', filters.search);

  const query = params.toString();
  return apiRequest<ApiResponse<Task[]>>(`/api/v1/tasks/recycle-bin${query ? `?${query}` : ''}`);
}

export async function restoreTask(taskId: string): Promise<ApiResponse<Task>> {
  const result = await apiRequest<ApiResponse<Task>>(`/api/v1/tasks/${taskId}/restore`, {
    method: 'POST',
  });
  if (!result || result.success === false) {
    const msg =
      (result as ApiResponse<Task> | null)?.error || 'Failed to restore task';
    throw new Error(msg);
  }
  return result;
}

export async function permanentlyDeleteTask(
  taskId: string,
  reason?: string
): Promise<ApiResponse<void>> {
  const result = await apiRequest<ApiResponse<void>>(`/api/v1/tasks/${taskId}/permanent`, {
    method: 'DELETE',
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
  if (!result || result.success === false) {
    const msg =
      (result as ApiResponse<void> | null)?.error || 'Failed to permanently delete task';
    throw new Error(msg);
  }
  return result;
}

export async function listTaskDeleteRequests(params?: {
  page?: number;
  limit?: number;
  status?: "pending" | "approved" | "rejected" | "all";
  search?: string;
}): Promise<ApiResponse<any>> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.status) query.append("status", params.status);
  if (params?.search) query.append("search", params.search);
  const qs = query.toString();
  return apiRequest<ApiResponse<any>>(`/api/v1/tasks/delete-requests${qs ? `?${qs}` : ""}`);
}

export async function approveTaskDeleteRequest(
  requestId: string,
  decisionNote?: string,
): Promise<ApiResponse<any>> {
  const result = await apiRequest<ApiResponse<any>>(
    `/api/v1/tasks/delete-requests/${requestId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ decisionNote }),
    },
  );
  if (!result || result.success === false) {
    throw new Error((result as any)?.error || "Failed to approve delete request");
  }
  return result;
}

export async function rejectTaskDeleteRequest(
  requestId: string,
  decisionNote?: string,
): Promise<ApiResponse<any>> {
  const result = await apiRequest<ApiResponse<any>>(
    `/api/v1/tasks/delete-requests/${requestId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ decisionNote }),
    },
  );
  if (!result || result.success === false) {
    throw new Error((result as any)?.error || "Failed to reject delete request");
  }
  return result;
}

/**
 * Get task applications
 */
export async function getTaskApplications(
  taskId: string,
  filters?: { page?: number; limit?: number; status?: string }
): Promise<ApiResponse<TaskApplication[]>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.status) params.append('status', filters.status);

  const query = params.toString();
  return apiRequest<ApiResponse<TaskApplication[]>>(
    `/api/v1/tasks/${taskId}/applications${query ? `?${query}` : ''}`
  );
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  taskId: string,
  applicationId: string,
  status: string
): Promise<ApiResponse<TaskApplication>> {
  return apiRequest<ApiResponse<TaskApplication>>(
    `/api/v1/tasks/${taskId}/applications/${applicationId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}
