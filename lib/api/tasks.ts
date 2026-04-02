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
  if (filters?.posterId) params.append('posterId', filters.posterId);

  const query = params.toString();
  return apiRequest<ApiResponse<Task[]>>(`/api/v1/tasks${query ? `?${query}` : ''}`);
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
  return apiRequest<ApiResponse<void>>(`/api/v1/tasks/${taskId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
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
