import { apiRequest } from './client';
import {
  AnalyticsOverview,
  ApiResponse,
  PosterAnalytics,
  PosterVerificationComparison,
  TaskCategoryBreakdown,
} from '@/types';

export async function getAnalyticsOverview(): Promise<ApiResponse<AnalyticsOverview>> {
  return apiRequest<ApiResponse<AnalyticsOverview>>('/api/v1/analytics/overview');
}

export async function getPosterAnalytics(
  requesterId: string,
  range: '7d' | '30d' | '90d' = '30d'
): Promise<ApiResponse<PosterAnalytics>> {
  return apiRequest<ApiResponse<PosterAnalytics>>(`/api/v1/analytics/posters/${requesterId}?range=${range}`);
}

export async function getPosterVerificationComparison(
  range: '7d' | '30d' | '90d' = '30d'
): Promise<ApiResponse<PosterVerificationComparison>> {
  return apiRequest<ApiResponse<PosterVerificationComparison>>(
    `/api/v1/analytics/posters/verification-comparison?range=${range}`
  );
}

export async function getTaskCategoryBreakdown(
  range: '7d' | '30d' | '90d' = '30d'
): Promise<ApiResponse<TaskCategoryBreakdown>> {
  return apiRequest<ApiResponse<TaskCategoryBreakdown>>(`/api/v1/analytics/tasks/categories?range=${range}`);
}
