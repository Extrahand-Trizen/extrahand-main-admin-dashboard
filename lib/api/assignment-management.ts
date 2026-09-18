import { apiRequest } from './client';
import { ApiResponse } from '@/types';

type PreferredPartner = {
  profileId: string;
  uid: string;
  name: string;
  phone?: string;
  categories: string[];
  areas: string[];
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

export type PartnerSearchResult = {
  _id?: string;
  uid?: string;
  userId?: string;
  profileId?: string;
  name?: string;
  fullName?: string;
  phone?: string;
  phoneNumber?: string;
  categories?: string[];
  workAreas?: string[];
  partnerProfile?: { categories?: string[]; workAreas?: string[] };
};

export async function getAssignmentRules(): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>('/api/v1/assignment-management');
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

export async function saveAreaRule(rule: Omit<AreaAssignmentRule, 'active'>): Promise<ApiResponse<AssignmentRules>> {
  return apiRequest<ApiResponse<AssignmentRules>>('/api/v1/assignment-management/area-rules', {
    method: 'POST', body: JSON.stringify(rule),
  });
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
