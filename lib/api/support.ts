import { apiRequest } from './client';
import { ApiResponse, SupportTicket, SupportArticle, TicketFilters } from '@/types';

/**
 * List support tickets
 */
export async function listTickets(
  filters?: TicketFilters
): Promise<ApiResponse<SupportTicket[]>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.status) params.append('status', filters.status);

  const query = params.toString();
  return apiRequest<ApiResponse<SupportTicket[]>>(
    `/api/v1/support/tickets${query ? `?${query}` : ''}`
  );
}

/**
 * Get ticket by ID
 */
export async function getTicket(ticketId: string): Promise<ApiResponse<SupportTicket>> {
  return apiRequest<ApiResponse<SupportTicket>>(`/api/v1/support/tickets/${ticketId}`);
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: 'new' | 'read' | 'replied' | 'closed'
): Promise<ApiResponse<SupportTicket>> {
  return apiRequest<ApiResponse<SupportTicket>>(
    `/api/v1/support/tickets/${ticketId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}

/**
 * List support articles
 */
export async function listArticles(filters?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<ApiResponse<SupportArticle[]>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);

  const query = params.toString();
  return apiRequest<ApiResponse<SupportArticle[]>>(
    `/api/v1/support/articles${query ? `?${query}` : ''}`
  );
}

/**
 * Get article by ID
 */
export async function getArticle(articleId: string): Promise<ApiResponse<SupportArticle>> {
  return apiRequest<ApiResponse<SupportArticle>>(`/api/v1/support/articles/${articleId}`);
}

/**
 * Create article
 */
export async function createArticle(
  article: Omit<SupportArticle, '_id' | 'createdAt' | 'updatedAt' | 'views'>
): Promise<ApiResponse<SupportArticle>> {
  return apiRequest<ApiResponse<SupportArticle>>('/api/v1/support/articles', {
    method: 'POST',
    body: JSON.stringify(article),
  });
}

/**
 * Update article
 */
export async function updateArticle(
  articleId: string,
  updates: Partial<SupportArticle>
): Promise<ApiResponse<SupportArticle>> {
  return apiRequest<ApiResponse<SupportArticle>>(`/api/v1/support/articles/${articleId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete article
 */
export async function deleteArticle(
  articleId: string,
  reason: string
): Promise<ApiResponse<void>> {
  return apiRequest<ApiResponse<void>>(`/api/v1/support/articles/${articleId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}
