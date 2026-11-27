import { apiRequest } from './client';

export type PartnerCategorySkill = {
  id: string;
  label: string;
};

export type PartnerCategory = {
  id: string;
  label: string;
  description: string;
  icon: string;
  emoji: string;
  popular: boolean;
  isActive: boolean;
  skills: PartnerCategorySkill[];
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
};

export async function listPartnerCategories(includeInactive = false): Promise<PartnerCategory[]> {
  const query = includeInactive ? '?includeInactive=true' : '';
  const response = await apiRequest<ApiEnvelope<PartnerCategory[]>>(
    `/api/v1/users/partner-categories${query}`,
  );
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(response?.error || 'Failed to load partner categories');
  }
  return response.data;
}

export async function createPartnerCategory(
  category: Omit<PartnerCategory, 'isActive'> & { isActive?: boolean },
): Promise<PartnerCategory> {
  const response = await apiRequest<ApiEnvelope<PartnerCategory>>(
    '/api/v1/users/partner-categories',
    { method: 'POST', body: JSON.stringify(category) },
  );
  if (!response?.success || !response.data) {
    throw new Error(response?.error || 'Failed to create partner category');
  }
  return response.data;
}

export async function updatePartnerCategory(
  category: PartnerCategory,
): Promise<PartnerCategory> {
  const response = await apiRequest<ApiEnvelope<PartnerCategory>>(
    `/api/v1/users/partner-categories/${encodeURIComponent(category.id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(category),
    },
  );
  if (!response?.success || !response.data) {
    throw new Error(response?.error || 'Failed to update partner category');
  }
  return response.data;
}

export async function setPartnerCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<PartnerCategory> {
  const response = await apiRequest<ApiEnvelope<PartnerCategory>>(
    `/api/v1/users/partner-categories/${encodeURIComponent(categoryId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    },
  );
  if (!response?.success || response.data?.isActive !== isActive) {
    throw new Error(response?.error || 'Failed to update partner category status');
  }
  return response.data;
}
