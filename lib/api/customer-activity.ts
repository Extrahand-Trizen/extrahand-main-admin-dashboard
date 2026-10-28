import { apiRequest } from './client';
import { ApiResponse, TaskFilters } from '@/types';

export type CustomerActivityPeriod = '7d' | '30d' | 'all';
export type CustomerActivitySort =
  | 'most_works'
  | 'fewest_works'
  | 'recently_posted';

export interface CustomerActivityCustomer {
  profileId: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  workCount: number;
  lastWorkPostedAt: string | null;
}

export interface CustomerActivityResponse extends ApiResponse<CustomerActivityCustomer[]> {
  summary?: {
    totalCustomers: number;
    totalWorksPosted: number;
    averageWorksPerCustomer: number;
  };
}

export async function listCustomerActivity(params: {
  page: number;
  limit: number;
  period: CustomerActivityPeriod;
  sort: CustomerActivitySort;
  search?: string;
}): Promise<CustomerActivityResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    period: params.period,
    sort: params.sort,
  });
  if (params.search) query.set('search', params.search);
  return apiRequest<CustomerActivityResponse>(
    `/api/v1/users/customer-activity?${query.toString()}`,
  );
}

export function getWorkCreationDateFilter(
  period: CustomerActivityPeriod,
): Pick<TaskFilters, 'createdFrom' | 'createdTo'> {
  if (period === 'all') return {};
  const now = Date.now();
  const days = period === '7d' ? 7 : 30;
  return {
    createdFrom: new Date(now - days * 24 * 60 * 60 * 1000).toISOString(),
    createdTo: new Date(now).toISOString(),
  };
}
