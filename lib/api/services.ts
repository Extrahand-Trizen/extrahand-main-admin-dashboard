import { apiRequest } from './client';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
};

export type CatalogService = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl: string;
  basePrice: number;
  offerPrice: number;
  originalPrice: number;
  defaultPrice: number;
  pricingUnit: 'fixed' | 'hourly';
  durationMinutes: number;
  taskCategory: string;
  partnerCategoryId: string;
  isActive: boolean;
  filterId?: string;
  filterLabel?: string;
};

export type ServiceCategory = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
  isVisibleInApp: boolean;
  services: CatalogService[];
};

export type ServiceScopeSection = {
  id: string;
  label: string;
  includedItems: string[];
  notIncludedItems: string[];
};

export type ServiceScope = {
  includedTitle: string;
  notIncludedTitle: string;
  sections: ServiceScopeSection[];
};

export type ServiceCategoryContent = {
  _id?: string;
  categorySlug: string;
  title: string;
  subtitle?: string;
  description?: string;
  heroImageUrl?: string;
  iconUrl?: string;
  faqCategoryKeys?: string[];
  sortOrder?: number;
  isActive?: boolean;
  scope?: ServiceScope;
};

export type ServiceSkuContent = {
  _id: string;
  categorySlug: string;
  skuSlug: string;
  displayName: string;
  includes: string[];
  excludes: string[];
};

export type CreateCatalogService = {
  categorySlug?: string;
  categoryName?: string;
  categoryDescription?: string;
  categoryIconUrl?: string;
  categorySortOrder?: number;
  filterId: string;
  filterLabel: string;
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  durationMinutes: number;
  pricingUnit: 'fixed' | 'hourly';
  partnerCategoryId: string;
};

export type UpdateCatalogService = {
  categorySlug: string;
  name: string;
  description: string;
  imageUrl?: string;
  basePrice: number;
  offerPrice: number | null;
  durationMinutes: number;
  pricingUnit: 'fixed' | 'hourly';
  partnerCategoryId: string;
  isActive: boolean;
};

export type BookNowLocationType = 'state' | 'city' | 'pincode' | 'area';

export type BookNowLocationAvailability = {
  _id: string;
  locationId: string;
  locationType: BookNowLocationType;
  displayName: string;
  canonicalName: string;
  parentDisplayName?: string;
  isEnabled: boolean;
  availabilityMode: 'enabled' | 'disabled' | 'mixed';
  isExplicit: boolean;
  inheritedFrom?: BookNowLocationType;
  updatedAt?: string;
  updatedBy?: string;
  catalogId?: string | null;
};

export async function listBookNowLocationAvailability(params: {
  search?: string;
  type?: BookNowLocationType | 'all';
  isEnabled?: boolean;
  catalogId?: string;
}): Promise<BookNowLocationAvailability[]> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.type && params.type !== 'all') query.set('type', params.type);
  if (params.isEnabled !== undefined) query.set('isEnabled', String(params.isEnabled));
  if (params.catalogId) query.set('catalogId', params.catalogId);
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : '';
  const response = await apiRequest<ApiEnvelope<BookNowLocationAvailability[]>>(
    `/api/v1/services/book-now-availability${suffix}`,
  );
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(response?.message || response?.error || 'Failed to load location availability');
  }
  return response.data;
}

export async function updateBookNowLocationAvailability(payload: {
  locationType: BookNowLocationType;
  locationId: string;
  isEnabled: boolean;
  catalogId?: string;
}): Promise<BookNowLocationAvailability> {
  const response = await apiRequest<ApiEnvelope<BookNowLocationAvailability>>(
    `/api/v1/services/book-now-availability/${encodeURIComponent(payload.locationType)}/${encodeURIComponent(payload.locationId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        isEnabled: payload.isEnabled,
        ...(payload.catalogId ? { catalogId: payload.catalogId } : {}),
      }),
    },
  );
  if (!response?.success || typeof response.data?.isEnabled !== 'boolean') {
    throw new Error(response?.message || response?.error || 'Failed to update location availability');
  }
  return response.data;
}

export async function removeBookNowLocationFromAvailability(
  locationType: BookNowLocationType,
  locationId: string,
): Promise<void> {
  const response = await apiRequest<ApiEnvelope<{
    locationType: BookNowLocationType;
    locationId: string;
    isEnabled: boolean;
    isHidden: boolean;
  }>>(
    `/api/v1/services/book-now-availability/${encodeURIComponent(locationType)}/${encodeURIComponent(locationId)}`,
    { method: 'DELETE' },
  );
  if (
    !response?.success ||
    response.data?.locationType !== locationType ||
    response.data.locationId !== locationId ||
    response.data.isEnabled !== false ||
    response.data.isHidden !== true
  ) {
    throw new Error(response?.message || response?.error || 'Failed to remove location from Book Now');
  }
}

export async function listServiceCatalog(): Promise<ServiceCategory[]> {
  const response = await apiRequest<ApiEnvelope<ServiceCategory[]>>('/api/v1/services');
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(response?.message || response?.error || 'Failed to load services');
  }
  return response.data;
}

export async function listServiceCategoryContent(): Promise<ServiceCategoryContent[]> {
  const response = await apiRequest<ApiEnvelope<ServiceCategoryContent[]>>(
    '/api/v1/services/category-content',
  );
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(response?.message || response?.error || 'Failed to load service scope content');
  }
  return response.data;
}

export async function listServiceSkuContent(): Promise<ServiceSkuContent[]> {
  const response = await apiRequest<ApiEnvelope<ServiceSkuContent[]>>(
    '/api/v1/services/sku-content',
  );
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(response?.message || response?.error || 'Failed to load service package content');
  }
  return response.data;
}

export async function updateServiceSkuScope(
  categorySlug: string,
  skuSlug: string,
  displayName: string,
  includes: string[],
  excludes: string[],
): Promise<ServiceSkuContent> {
  const response = await apiRequest<ApiEnvelope<ServiceSkuContent>>(
    `/api/v1/services/sku-content/${encodeURIComponent(categorySlug)}/${encodeURIComponent(skuSlug)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ displayName, includes, excludes }),
    },
  );
  if (!response?.success || !response.data) {
    throw new Error(response?.message || response?.error || 'Failed to update service package scope');
  }
  return response.data;
}

export async function updateServiceCategoryScope(
  categorySlug: string,
  title: string,
  scope: ServiceScope,
): Promise<ServiceCategoryContent> {
  const response = await apiRequest<ApiEnvelope<ServiceCategoryContent>>(
    `/api/v1/services/category-content/${encodeURIComponent(categorySlug)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ title, scope }),
    },
  );
  if (!response?.success || !response.data?.scope) {
    throw new Error(response?.message || response?.error || 'Failed to update service scope');
  }
  return response.data;
}

export async function createCatalogService(payload: CreateCatalogService) {
  const response = await apiRequest<ApiEnvelope<{ category: ServiceCategory; service: CatalogService }>>(
    '/api/v1/services',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  if (!response?.success || !response.data) {
    throw new Error(response?.message || response?.error || 'Failed to create service');
  }
  return response.data;
}

export async function updateCatalogService(
  serviceId: string,
  payload: UpdateCatalogService,
) {
  const response = await apiRequest<ApiEnvelope<CatalogService>>(
    `/api/v1/services/${encodeURIComponent(serviceId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
  if (!response?.success || !response.data) {
    throw new Error(response?.message || response?.error || 'Failed to update service');
  }
  return response.data;
}

export async function updateCatalogServiceStatus(
  serviceId: string,
  isActive: boolean,
) {
  const response = await apiRequest<ApiEnvelope<CatalogService>>(
    `/api/v1/services/${encodeURIComponent(serviceId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    },
  );
  if (
    !response?.success ||
    !response.data ||
    response.data._id !== serviceId ||
    response.data.isActive !== isActive
  ) {
    throw new Error(response?.message || response?.error || 'Failed to update service status');
  }
  return response.data;
}

export async function uploadCatalogServiceImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await apiRequest<ApiEnvelope<{ url: string; key: string }>>(
    '/api/v1/services/upload-image',
    { method: 'POST', body: formData },
  );
  if (!response?.success || !response.data?.url) {
    throw new Error(response?.error || 'Failed to upload service image');
  }
  return response.data.url;
}

export async function updateCatalogServiceImage(serviceId: string, imageUrl: string) {
  const response = await apiRequest<ApiEnvelope<unknown>>(
    `/api/v1/services/${encodeURIComponent(serviceId)}/image`,
    { method: 'PATCH', body: JSON.stringify({ imageUrl }) },
  );
  if (!response?.success) {
    throw new Error(response?.error || 'Failed to update service image');
  }
}

export async function updateCatalogServiceOffer(serviceId: string, offerPrice: number | null) {
  const response = await apiRequest<ApiEnvelope<unknown>>(
    `/api/v1/services/${encodeURIComponent(serviceId)}/offer`,
    { method: 'PATCH', body: JSON.stringify({ offerPrice }) },
  );
  if (!response?.success) {
    throw new Error(response?.error || 'Failed to update service offer');
  }
}
