import { ApiResponse } from '@/types';
import { apiRequest } from './client';

export type PartnerCategoryRequestStatus = 'pending' | 'approved' | 'rejected';
export type PartnerCategoryRequestStatusFilter = PartnerCategoryRequestStatus | 'all';

export interface PartnerCategoryRequest {
  requestId: string;
  uid: string;
  partnerName?: string;
  partnerPhone?: string;
  partnerEmail?: string;
  name?: string;
  phone?: string;
  email?: string;
  currentCategories: string[];
  requestedCategory: string;
  requestedSkills: string[];
  workAreas: string[];
  city: string;
  requestedAt: string;
  status: PartnerCategoryRequestStatus;
  reviewNotes?: string;
}

export interface PartnerCategoryRequestFilters {
  status?: PartnerCategoryRequestStatusFilter;
  page?: number;
  limit?: number;
  search?: string;
  requestedCategory?: string;
  currentCategory?: string;
  city?: string;
}

interface PartnerCategoryRequestListPayload {
  items: PartnerCategoryRequest[];
  total: number;
  page: number;
  limit: number;
}

export type PartnerCategoryRequestListResponse = ApiResponse<PartnerCategoryRequest[]> & {
  data: PartnerCategoryRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function listPartnerCategoryRequests(
  filters: PartnerCategoryRequestFilters = {},
): Promise<PartnerCategoryRequestListResponse> {
  const params = new URLSearchParams();
  params.set('status', filters.status || 'all');
  params.set('page', String(filters.page || 1));
  params.set('limit', String(filters.limit || 25));

  if (filters.search) params.set('search', filters.search);
  if (filters.requestedCategory) params.set('requestedCategory', filters.requestedCategory);
  if (filters.currentCategory) params.set('currentCategory', filters.currentCategory);
  if (filters.city) params.set('city', filters.city);

  const response = await apiRequest<ApiResponse<PartnerCategoryRequestListPayload> | null>(
    `/api/v1/users/partner-category-requests?${params.toString()}`,
  );
  if (!response || response.success === false) {
    throw new Error(response?.error || 'Partner category requests could not be loaded');
  }
  if (
    !response.data ||
    !Array.isArray(response.data.items) ||
    typeof response.data.total !== 'number' ||
    typeof response.data.page !== 'number' ||
    typeof response.data.limit !== 'number' ||
    response.data.limit <= 0
  ) {
    throw new Error('Partner category requests returned an invalid list response');
  }
  const { items, total, page, limit } = response.data;
  return {
    ...response,
    data: items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function reviewPartnerCategoryRequest(
  requestId: string,
  status: Exclude<PartnerCategoryRequestStatus, 'pending'>,
  reviewNotes?: string,
): Promise<ApiResponse<PartnerCategoryRequest>> {
  const response = await apiRequest<ApiResponse<PartnerCategoryRequest> | null>(
    `/api/v1/users/partner-category-requests/${encodeURIComponent(requestId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        ...(reviewNotes?.trim() ? { reviewNotes: reviewNotes.trim() } : {}),
      }),
    },
  );
  if (!response || response.success === false) {
    throw new Error(response?.error || 'Partner category request could not be updated');
  }
  return response;
}
