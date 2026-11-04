import { apiRequest } from '@/lib/api/client';

export type CouponFlow = 'BOOK_NOW' | 'POST_COMPARE';
export type Coupon = {
  _id: string;
  code: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minOrderAmount: number;
  applicableTo: 'ALL_SERVICES' | 'SELECTED_SERVICES';
  serviceIds: string[];
  applicableLocations?: 'ALL_LOCATIONS' | 'SELECTED_LOCATIONS';
  cities?: string[];
  pincodes?: string[];
  applicableFlows: CouponFlow[];
  redemptionScope: 'PER_USER' | 'GLOBAL_SINGLE_USE';
  firstBookingOnly: boolean;
  usageLimitPerUser: number;
  overallUsageLimit: number | null;
  startDate: string;
  expiryDate: string | null;
  isActive: boolean;
  showOnHomeOffers?: boolean;
};

export type HubService = {
  serviceId: string;
  label: string;
  categorySlug: string;
  sectionId?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
};
export type HubSection = {
  _id?: string;
  slug: string;
  title: string;
  iconKey?: string;
  sortOrder: number;
  services: HubService[];
  isActive: boolean;
};
export type ServiceContent = {
  _id: string;
  categorySlug: string;
  title: string;
  subtitle?: string;
  description?: string;
  heroImageUrl?: string;
  iconUrl?: string;
  faqCategoryKeys: string[];
  sortOrder: number;
  isActive: boolean;
};
export type SkuContent = {
  _id: string;
  categorySlug: string;
  skuSlug: string;
  displayName: string;
  shortDescription?: string;
  longDescription?: string;
  includes: string[];
  excludes: string[];
  imageUrls: string[];
  faqItems: Array<{ question: string; answer: string }>;
  sortOrder: number;
  isFeaturedOnHome: boolean;
  featuredSortOrder: number;
  isActive: boolean;
};
export type CustomerHomePromotion = {
  _id: string;
  tag: string;
  title: string;
  subtitle: string;
  actionType: 'route' | 'category' | 'services_hub' | 'url' | 'none';
  actionValue: string;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};
export type CustomerHomeCouponOffer = {
  code: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minOrderAmount: number;
  applicableTo: 'ALL_SERVICES' | 'SELECTED_SERVICES';
  serviceIds: string[];
  firstBookingOnly: boolean;
  expiryDate: string | null;
};
export type OperationalSku = {
  _id: string;
  slug: string;
  name: string;
  categorySlug: string;
  basePrice: number;
  durationMinutes: number;
  pricing?: {
    originalPrice: number;
    offerPrice: number;
    savingsAmount: number;
    isOfferActive: boolean;
    offerDiscountType: 'percent' | 'flat';
    offerDiscountValue: number;
    appliedPercent: number;
  };
};
export type HelpSupport = {
  _id: string;
  variant: 'customer' | 'helper';
  categoryKey: string;
  title: string;
  subtitle: string;
  icon: string;
  items: Array<{ q: string; a: string }>;
  sortOrder: number;
  isActive: boolean;
};

type ApiRecord = Record<string, unknown>;

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await apiRequest<T>(
    path,
    {
      method,
      ...(method.toUpperCase() === 'GET' ? { cache: 'no-store' } : {}),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    { throwOnError: true },
  );
  if (response == null) {
    throw new Error(`Coupon management ${method} ${path} returned no response.`);
  }
  return response;
}

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiRecord).data as T;
  }
  return response as T;
}

export async function listCoupons(): Promise<Coupon[]> {
  const response = await request<ApiRecord>('/api/v1/coupon-management/coupons');
  const data = (response.data as ApiRecord | undefined) ?? response;
  return Array.isArray(data.coupons) ? (data.coupons as Coupon[]) : [];
}

export function createCoupon(payload: Record<string, unknown>) {
  return request('/api/v1/coupon-management/coupons', 'POST', payload);
}
export function updateCoupon(id: string, payload: Record<string, unknown>) {
  return request(`/api/v1/coupon-management/coupons/${encodeURIComponent(id)}`, 'PATCH', payload);
}
export function updateCouponStatus(id: string, isActive: boolean) {
  return request(
    `/api/v1/coupon-management/coupons/${encodeURIComponent(id)}/status`,
    'PATCH',
    { isActive },
  );
}
export function deleteCoupon(id: string) {
  return request(`/api/v1/coupon-management/coupons/${encodeURIComponent(id)}`, 'DELETE');
}
export function bulkCreateCoupons(payload: Record<string, unknown>) {
  return request<{
    createdCount: number;
    skippedCount: number;
    createdCodes: string[];
    skippedCodes: string[];
  }>('/api/v1/coupon-management/coupons/bulk', 'POST', payload);
}

async function catalogList<T>(path: string): Promise<T[]> {
  const response = await request<unknown>(path);
  const data = unwrapData<unknown>(response);
  return Array.isArray(data) ? (data as T[]) : [];
}

export const listHubSections = () =>
  catalogList<HubSection>('/api/v1/coupon-management/catalog/hub-sections?includeInactive=true');
export const createHubSection = (payload: HubSection) =>
  request('/api/v1/coupon-management/catalog/hub-sections', 'POST', payload);
export const updateHubSection = (id: string, payload: Partial<HubSection>) =>
  request(
    `/api/v1/coupon-management/catalog/hub-sections/${encodeURIComponent(id)}`,
    'PATCH',
    payload,
  );
export const listServiceContent = () =>
  catalogList<ServiceContent>(
    '/api/v1/coupon-management/catalog/categories/content?includeInactive=true',
  );
export const createServiceContent = (payload: Record<string, unknown>) =>
  request('/api/v1/coupon-management/catalog/categories/content', 'POST', payload);
export const updateServiceContent = (id: string, payload: Record<string, unknown>) =>
  request(
    `/api/v1/coupon-management/catalog/categories/content/${encodeURIComponent(id)}`,
    'PATCH',
    payload,
  );
export const listSkuContent = () =>
  catalogList<SkuContent>('/api/v1/coupon-management/catalog/skus/content?includeInactive=true');
export const createSkuContent = (payload: Record<string, unknown>) =>
  request('/api/v1/coupon-management/catalog/skus/content', 'POST', payload);
export const updateSkuContent = (id: string, payload: Record<string, unknown>) =>
  request(
    `/api/v1/coupon-management/catalog/skus/content/${encodeURIComponent(id)}`,
    'PATCH',
    payload,
  );
export const listCustomerHomePromotions = () =>
  catalogList<CustomerHomePromotion>(
    '/api/v1/coupon-management/catalog/home-promotions?includeInactive=true',
  );
export async function listCustomerHomeCouponOffers(): Promise<CustomerHomeCouponOffer[]> {
  const response = await request<unknown>('/api/v1/coupon-management/coupons/home-offers');
  const data = unwrapData<unknown>(response);
  if (!Array.isArray(data)) {
    throw new Error('Customer home coupon offers returned an invalid response.');
  }
  return data as CustomerHomeCouponOffer[];
}
export const createCustomerHomePromotion = (payload: Record<string, unknown>) =>
  request('/api/v1/coupon-management/catalog/home-promotions', 'POST', payload);
export const updateCustomerHomePromotion = (id: string, payload: Record<string, unknown>) =>
  request(
    `/api/v1/coupon-management/catalog/home-promotions/${encodeURIComponent(id)}`,
    'PATCH',
    payload,
  );
export const listOperationalSkus = () =>
  catalogList<OperationalSku>(
    '/api/v1/coupon-management/catalog/skus/operational?includeInactive=true',
  );
export const updateOperationalSkuOffer = (id: string, payload: Record<string, unknown>) =>
  request(
    `/api/v1/coupon-management/catalog/skus/operational/${encodeURIComponent(id)}/offer`,
    'PATCH',
    payload,
  );
export const listHelpSupport = (variant: 'customer' | 'helper') =>
  catalogList<HelpSupport>(
    `/api/v1/coupon-management/catalog/help-support/${variant}?includeInactive=true`,
  );
export const createHelpSupport = (
  variant: 'customer' | 'helper',
  categoryKey: string,
  payload: Record<string, unknown>,
) =>
  request(
    `/api/v1/coupon-management/catalog/help-support/${variant}/${encodeURIComponent(categoryKey)}`,
    'PUT',
    payload,
  );
export const updateHelpSupport = (id: string, payload: Record<string, unknown>) =>
  request(
    `/api/v1/coupon-management/catalog/help-support/${encodeURIComponent(id)}`,
    'PATCH',
    payload,
  );
