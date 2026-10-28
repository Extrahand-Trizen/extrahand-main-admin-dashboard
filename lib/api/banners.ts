import { apiRequest } from './client';

type ApiEnvelope<T> = { success: boolean; data: T; error?: string; message?: string };

export type BannerPlacement = 'book_services' | 'extramart' | 'book_now_scheduled' | 'book_now_instant';
export type BannerActionType = 'screen' | 'category' | 'url' | 'tab' | 'none';
export type BannerTone = 'light' | 'dark';

export interface AdminBanner {
  _id: string;
  placement: BannerPlacement;
  tag?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  actionType: BannerActionType;
  actionValue?: string;
  actionParams?: Record<string, any>;
  backgroundColor?: string;
  tone?: BannerTone;
  ctaLabel?: string;
  sortOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBannerPayload {
  placement: BannerPlacement;
  tag?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  actionType: BannerActionType;
  actionValue?: string;
  actionParams?: Record<string, any>;
  backgroundColor?: string;
  tone?: BannerTone;
  ctaLabel?: string;
  sortOrder?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export function listAdminBanners(placement?: string) {
  const query = placement ? `?placement=${encodeURIComponent(placement)}` : '';
  return apiRequest<ApiEnvelope<AdminBanner[]>>(`/api/v1/banners${query}`);
}

export function getAdminBanner(id: string) {
  return apiRequest<ApiEnvelope<AdminBanner>>(`/api/v1/banners/${encodeURIComponent(id)}`);
}

export function createAdminBanner(body: CreateBannerPayload) {
  return apiRequest<ApiEnvelope<AdminBanner>>('/api/v1/banners', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateAdminBanner(id: string, body: Partial<CreateBannerPayload>) {
  return apiRequest<ApiEnvelope<AdminBanner>>(`/api/v1/banners/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteAdminBanner(id: string) {
  return apiRequest<ApiEnvelope<null>>(`/api/v1/banners/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function reorderAdminBanners(orderedIds: string[]) {
  return apiRequest<ApiEnvelope<null>>('/api/v1/banners/reorder', {
    method: 'POST',
    body: JSON.stringify({ orderedIds }),
  });
}

export function uploadBannerImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);
  return apiRequest<ApiEnvelope<{ url: string; key: string }>>('/api/v1/banners/upload-image', {
    method: 'POST',
    body: formData,
  });
}
