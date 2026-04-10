import { apiRequest } from './client';
import { AnalyticsOverview, ApiResponse } from '@/types';

export async function getAnalyticsOverview(): Promise<ApiResponse<AnalyticsOverview>> {
  return apiRequest<ApiResponse<AnalyticsOverview>>('/api/v1/analytics/overview');
}
