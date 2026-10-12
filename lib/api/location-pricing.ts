import { apiRequest } from './client';

type ApiEnvelope<T> = { success: boolean; data: T; error?: string };

export type LocationType = 'state' | 'city' | 'pincode' | 'area';
export type PricingLocationType = 'area' | 'pincode' | 'city';

export type LocationRecord = {
  _id: string;
  type: LocationType;
  canonicalName?: string;
  displayName?: string;
  normalizedKey?: string;
  aliases?: string[];
  pincode?: string;
  normalizedPincode?: string;
  stateId?: string | { _id: string; displayName?: string };
  cityId?: string | { _id: string; displayName?: string };
  isActive: boolean;
  provider?: string | null;
  providerPlaceId?: string | null;
  formattedAddress?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type GoogleLocationResult = {
  placeId: string;
  name: string;
  address: string;
  formattedAddress?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  coordinates?: [number, number];
};

export type HourlySku = {
  _id: string;
  slug: string;
  name: string;
  basePrice: number;
  offerPrice?: number;
  durationMinutes: number;
  isActive: boolean;
};

export type PricingSubcategory = {
  id: string;
  name: string;
  categoryId: string;
  sectionId?: string;
};

export type PricingCategory = {
  id: string;
  name: string;
  subcategories: PricingSubcategory[];
};

export type PricingSku = {
  _id: string;
  slug: string;
  name: string;
  categoryId: string;
  pricingUnit?: "fixed" | "hourly";
  basePrice: number;
  /** Price customers see when no location price applies. */
  defaultPrice: number;
  durationMinutes?: number;
  isActive: boolean;
};

export type PriceRuleSku = PricingSku & {
  categorySlug: string;
  categoryName: string;
  parentCategoryId: string;
  parentCategoryName: string;
  subcategoryId: string;
  subcategoryName: string;
};

export type HourlyPriceRule = {
  _id: string;
  skuId: string;
  locationType: PricingLocationType;
  locationId: string;
  offerPrice: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
  sku?: PriceRuleSku | null;
};

export function listLocations(params?: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => value && query.set(key, value));
  return apiRequest<ApiEnvelope<LocationRecord[]>>(`/api/v1/location-pricing/locations${query.toString() ? `?${query}` : ''}`);
}

export function searchLocations(query: string) {
  return apiRequest<ApiEnvelope<GoogleLocationResult[]>>(`/api/v1/location-pricing/location-search?query=${encodeURIComponent(query)}`);
}

export function ensureGoogleLocation(body: GoogleLocationResult) {
  return apiRequest<ApiEnvelope<LocationRecord>>('/api/v1/location-pricing/ensure-google-location', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createLocation(type: LocationType, body: Record<string, unknown>) {
  return apiRequest<ApiEnvelope<LocationRecord>>(`/api/v1/location-pricing/locations/${type}`, { method: 'POST', body: JSON.stringify(body) });
}

export function updateLocation(type: LocationType, id: string, body: Record<string, unknown>) {
  return apiRequest<ApiEnvelope<LocationRecord>>(`/api/v1/location-pricing/locations/${type}/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function setLocationActive(type: LocationType, id: string, active: boolean) {
  return apiRequest<ApiEnvelope<LocationRecord>>(`/api/v1/location-pricing/locations/${type}/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' });
}

export function listHourlySkus() {
  return apiRequest<ApiEnvelope<HourlySku[]>>('/api/v1/location-pricing/hourly-skus');
}

export function listPricingCategories() {
  return apiRequest<ApiEnvelope<PricingCategory[]>>('/api/v1/location-pricing/categories');
}

export function listPricingSkus(categoryId: string, sectionId?: string) {
  const query = new URLSearchParams({ categoryId });
  if (sectionId) query.set('sectionId', sectionId);
  return apiRequest<ApiEnvelope<PricingSku[]>>(`/api/v1/location-pricing/skus?${query.toString()}`);
}

export function listHourlyPrices(skuId?: string) {
  const query = skuId ? `?skuId=${encodeURIComponent(skuId)}` : '';
  return apiRequest<ApiEnvelope<HourlyPriceRule[]>>(`/api/v1/location-pricing/hourly-prices${query}`);
}

export function createHourlyPrice(body: { skuId: string; locationType: PricingLocationType; locationId: string; offerPrice: number }) {
  return apiRequest<ApiEnvelope<HourlyPriceRule>>('/api/v1/location-pricing/hourly-prices', { method: 'POST', body: JSON.stringify(body) });
}

export function updateHourlyPrice(id: string, body: Record<string, unknown>) {
  return apiRequest<ApiEnvelope<HourlyPriceRule>>(`/api/v1/location-pricing/hourly-prices/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function updateSkuGlobalPrice(skuId: string, offerPrice: number) {
  return apiRequest<ApiEnvelope<PricingSku>>(`/api/v1/location-pricing/skus/${skuId}/global-price`, {
    method: 'PATCH',
    body: JSON.stringify({ offerPrice }),
  });
}

export type HourlyAvailabilityItem = {
  _id: string;
  locationId: string;
  locationType: LocationType;
  displayName: string;
  canonicalName: string;
  parentDisplayName?: string;
  isEnabled: boolean;
  isExplicit: boolean;
  eligibleHelperCount: number;
  updatedAt?: string;
  updatedBy?: string;
};

export function listHourlyAvailabilities(params?: { search?: string; type?: string; isEnabled?: boolean }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.type) query.set('type', params.type);
  if (params?.isEnabled !== undefined) query.set('isEnabled', String(params.isEnabled));
  return apiRequest<ApiEnvelope<HourlyAvailabilityItem[]>>(`/api/v1/location-pricing/hourly-availability${query.toString() ? `?${query.toString()}` : ''}`);
}

export function toggleHourlyAvailability(type: LocationType, id: string, isEnabled: boolean) {
  return apiRequest<ApiEnvelope<HourlyAvailabilityItem>>(`/api/v1/location-pricing/hourly-availability/${type}/${id}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ isEnabled }),
  });
}

export type PostCompareAvailabilityItem = {
  areaId: string;
  canonicalName: string;
  displayName: string;
  isEnabled: boolean;
  isExplicit: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export function listPostCompareAreaAvailabilities(search?: string) {
  const query = new URLSearchParams();
  if (search?.trim()) query.set('search', search.trim());
  return apiRequest<ApiEnvelope<PostCompareAvailabilityItem[]>>(
    `/api/v1/location-pricing/post-compare-availability/areas${query.toString() ? `?${query.toString()}` : ''}`,
  );
}

export function togglePostCompareAreaAvailability(areaId: string, isEnabled: boolean) {
  return apiRequest<ApiEnvelope<PostCompareAvailabilityItem>>(
    `/api/v1/location-pricing/post-compare-availability/areas/${encodeURIComponent(areaId)}/toggle`,
    { method: 'POST', body: JSON.stringify({ isEnabled }) },
  );
}
