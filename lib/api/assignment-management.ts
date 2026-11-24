import { apiRequest } from './client';
import { ApiResponse } from '@/types';

export type PartnerAddedBy = {
  userId: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
};

export type PreferredPartner = {
  profileId: string;
  uid: string;
  name: string;
  phone?: string;
  categories: string[];
  areas: string[];
  isAadhaarVerified?: boolean;
  addedBy?: PartnerAddedBy;
  priority: number;
  active: boolean;
};

export type AssignmentRules = {
  preferredPartners: PreferredPartner[];
  areaRules: AreaAssignmentRule[];
  excludedPhones: string[];
};

export type AreaAssignmentRule = {
  area: string;
  category?: string;
  zone: string;
  workTypes: string[];
  preferredPartners: PreferredPartner[];
  active: boolean;
};

export type CityPreferredPartner = Omit<PreferredPartner, 'priority'>;
export type CityPreferredPartnerRule = Omit<AreaAssignmentRule, 'preferredPartners'> & {
  preferredPartners: CityPreferredPartner[];
};

export type PartnerSearchResult = {
  _id?: string;
  uid?: string;
  userId?: string;
  profileId?: string;
  name?: string;
  fullName?: string;
  phone?: string;
  phoneNumber?: string;
  mobile?: string;
  mobileNumber?: string;
  categories?: string[];
  workAreas?: string[];
  partnerProfile?: {
    categories?: string[];
    workAreas?: string[];
    phone?: string;
  };
  isAadhaarVerified?: boolean;
  addedBy?: PartnerAddedBy;
};

export type EligibleAssignmentPartnersResponse = ApiResponse<PartnerSearchResult[]> & {
  excludedPhones?: string[];
};

export async function getAssignmentRules(): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>('/api/v1/assignment-management');
}

export async function getCityPreferredPartners(params: {
  city: string;
  workType: 'hourly' | 'book_now';
  category?: string;
}): Promise<ApiResponse<CityPreferredPartnerRule[]>> {
  const query = new URLSearchParams({
    city: params.city,
    workType: params.workType,
  });
  if (params.category?.trim()) query.set('category', params.category.trim());
  return apiRequest<ApiResponse<CityPreferredPartnerRule[]>>(
    `/api/v1/assignment-management/preferred-partners?${query.toString()}`,
  );
}

export async function getEligibleAssignmentPartners(
  search?: string,
  page = 1,
): Promise<EligibleAssignmentPartnersResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (search?.trim()) params.set('search', search.trim());
  return apiRequest<EligibleAssignmentPartnersResponse>(
    `/api/v1/assignment-management/eligible-partners?${params.toString()}`,
  );
}

export async function getEligiblePartnerAreaData(): Promise<ApiResponse<PartnerSearchResult[]>> {
  return apiRequest<ApiResponse<PartnerSearchResult[]>>(
    '/api/v1/assignment-management/eligible-partner-area-data',
  );
}

export async function searchAssignmentPartners(query: string): Promise<ApiResponse<PartnerSearchResult[]>> {
  return apiRequest<ApiResponse<PartnerSearchResult[]>>(
    `/api/v1/users/helpers/search?q=${encodeURIComponent(query)}`,
  );
}

export async function addPreferredPartner(partner: {
  profileId: string;
  uid: string;
  name: string;
  phone?: string;
  categories?: string[];
  areas?: string[];
}): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>('/api/v1/assignment-management/preferred-partners', {
    method: 'POST',
    body: JSON.stringify(partner),
  });
}

export async function removePreferredPartner(profileId: string): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>(
    `/api/v1/assignment-management/preferred-partners/${encodeURIComponent(profileId)}`,
    { method: 'DELETE' },
  );
}

export async function reorderPreferredPartner(profileId: string, direction: 'up' | 'down'): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>('/api/v1/assignment-management/preferred-partners/reorder', {
    method: 'POST',
    body: JSON.stringify({ profileId, direction }),
  });
}

export async function addExcludedPhone(phone: string): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>('/api/v1/assignment-management/excluded-phones', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function saveAreaRule(
  rule: Omit<AreaAssignmentRule, 'active'>,
): Promise<{ success: true; data: { areaRule: AreaAssignmentRule } }> {
  const response = await apiRequest<ApiResponse<{ areaRule: AreaAssignmentRule }>>(
    '/api/v1/assignment-management/area-rules',
    {
      method: 'POST',
      body: JSON.stringify(rule),
    },
  );
  if (!response?.success || !response.data?.areaRule) {
    throw new Error(response?.error || 'Failed to save area rule');
  }
  return { success: true, data: response.data };
}

export async function removeAreaRule(area: string): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>(`/api/v1/assignment-management/area-rules/${encodeURIComponent(area)}`, { method: 'DELETE' });
}

export async function reorderAreaRulePartner(area: string, profileId: string, direction: 'up' | 'down'): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>('/api/v1/assignment-management/area-rules/reorder', {
    method: 'POST', body: JSON.stringify({ area, profileId, direction }),
  });
}

export async function removeExcludedPhone(phone: string): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>(
    `/api/v1/assignment-management/excluded-phones/${encodeURIComponent(phone)}`,
    { method: 'DELETE' },
  );
}
