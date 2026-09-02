import { apiRequest } from './client';
import {
  ApiResponse,
  QcommerceOrder,
  QcommerceOrderFilters,
  QcommerceCategory,
  QcommerceSubcategory,
  QcommerceShop,
} from '@/types';

/**
 * List Qcommerce orders with filters
 */
export async function listQcommerceOrders(
  filters?: QcommerceOrderFilters
): Promise<ApiResponse<QcommerceOrder[]>> {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.shop && filters.shop !== 'all') params.append('shop', filters.shop);
  if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters?.subcategory && filters.subcategory !== 'all') params.append('subcategory', filters.subcategory);
  if (filters?.assignedTo && filters.assignedTo !== 'all') params.append('assignedTo', filters.assignedTo);
  if (filters?.deadlineSortOrder) params.append('deadlineSortOrder', filters.deadlineSortOrder);

  const query = params.toString();
  return apiRequest<ApiResponse<QcommerceOrder[]>>(
    `/api/v1/qcommerce/orders${query ? `?${query}` : ''}`
  );
}

/**
 * Get Qcommerce order by ID or orderNumber
 */
export async function getQcommerceOrder(
  id: string
): Promise<ApiResponse<QcommerceOrder>> {
  return apiRequest<ApiResponse<QcommerceOrder>>(`/api/v1/qcommerce/orders/${encodeURIComponent(id)}`);
}

/**
 * Get Qcommerce categories for filter dropdown
 */
export async function getQcommerceCategories(): Promise<ApiResponse<QcommerceCategory[]>> {
  return apiRequest<ApiResponse<QcommerceCategory[]>>('/api/v1/qcommerce/categories');
}

/**
 * Get Qcommerce subcategories for filter dropdown
 */
export async function getQcommerceSubcategories(
  categoryId?: string
): Promise<ApiResponse<QcommerceSubcategory[]>> {
  const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  return apiRequest<ApiResponse<QcommerceSubcategory[]>>(`/api/v1/qcommerce/subcategories${query}`);
}

/**
 * Get Qcommerce shops for filter dropdown
 */
export async function getQcommerceShops(): Promise<ApiResponse<QcommerceShop[]>> {
  return apiRequest<ApiResponse<QcommerceShop[]>>('/api/v1/qcommerce/shops');
}

/**
 * Assign a helper to a Qcommerce order
 */
export async function assignQcommerceHelper(
  orderId: string,
  helperData: {
    helperUid: string;
    helperProfileId: string;
    helperName?: string;
    helperPhone?: string;
    role?: 'helper' | 'partner';
  }
): Promise<ApiResponse<QcommerceOrder>> {
  return apiRequest<ApiResponse<QcommerceOrder>>(
    `/api/v1/qcommerce/orders/${encodeURIComponent(orderId)}/assign`,
    {
      method: 'POST',
      body: JSON.stringify(helperData),
    }
  );
}

/**
 * Update status of a Qcommerce order
 */
export async function updateQcommerceOrderStatus(
  orderId: string,
  status: string
): Promise<ApiResponse<QcommerceOrder>> {
  return apiRequest<ApiResponse<QcommerceOrder>>(
    `/api/v1/qcommerce/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}
