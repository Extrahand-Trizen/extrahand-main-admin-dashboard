import { apiRequest } from './client';
import { ApiResponse } from '@/types';

export type TaskCallStatus =
  | 'not_updated'
  | 'genuine'
  | 'not_genuine'
  | 'call_not_lifted'
  | 'follow_up'
  | 'completed';

export interface TaskCallListItem {
  notificationId: string;
  taskId: string;
  userName: string;
  phone: string;
  taskTitle: string;
  category: string;
  notifiedOn: string;
  status: TaskCallStatus;
  followUpDate?: string | null;
  notesCount: number;
  updatedAt: string;
}

export interface TaskCallNote {
  note: string;
  createdBy: {
    userId: string;
    email: string;
    name: string;
  };
  createdAt: string;
}

export interface TaskCallDetails {
  taskId: string;
  notificationId?: string;
  status: TaskCallStatus;
  followUpDate?: string | null;
  notes: TaskCallNote[];
  updatedAt?: string | null;
}

export async function listTaskCalls(filters?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<TaskCallListItem[]>> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  const query = params.toString();
  return apiRequest<ApiResponse<TaskCallListItem[]>>(
    `/api/v1/task-calls${query ? `?${query}` : ''}`,
  );
}

export async function getTaskCall(taskId: string): Promise<ApiResponse<TaskCallDetails>> {
  return apiRequest<ApiResponse<TaskCallDetails>>(
    `/api/v1/task-calls/${encodeURIComponent(taskId)}`,
  );
}

export async function updateTaskCallStatus(
  taskId: string,
  status: TaskCallStatus,
  followUpDate?: string,
): Promise<ApiResponse<TaskCallDetails>> {
  return apiRequest<ApiResponse<TaskCallDetails>>(
    `/api/v1/task-calls/${encodeURIComponent(taskId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, followUpDate }),
    },
  );
}

export async function addTaskCallNote(
  taskId: string,
  note: string,
): Promise<ApiResponse<TaskCallDetails>> {
  return apiRequest<ApiResponse<TaskCallDetails>>(
    `/api/v1/task-calls/${encodeURIComponent(taskId)}/notes`,
    {
      method: 'POST',
      body: JSON.stringify({ note }),
    },
  );
}
