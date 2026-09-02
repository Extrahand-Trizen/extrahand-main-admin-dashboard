export interface QcommerceOrderItem {
  productSlug?: string;
  masterProductId?: string;
  name: string;
  unit: string;
  quantity: number;
  unitPricePaise?: number;
  unitPrice?: number;
  lineTotalPaise?: number;
  lineTotal?: number;
  imageUrl?: string;
}

export interface QcommerceOrderAddress {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pinCode: string;
  coordinates?: [number, number];
  name?: string;
  phone?: string;
}

export interface QcommerceAssignedHelper {
  userId?: string;
  profileId?: string;
  name?: string;
  phone?: string;
  role?: string;
  assignedAt?: string;
}

export interface QcommerceOpsAdmin {
  userId?: string;
  name?: string;
  email?: string;
}

export type QcommerceOrderStatus =
  | 'open'
  | 'assigned'
  | 'completed'
  | 'cancelled'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'FAILED';

export interface QcommerceOrder {
  id: string;
  _id?: string;
  userId: string;
  orderNumber: string;
  shopId?: string;
  shopName: string;
  shopCategory?: string;
  shopSubcategory?: string;
  status: QcommerceOrderStatus;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  items: QcommerceOrderItem[];
  address: QcommerceOrderAddress;
  deliveryInstructions?: string[];
  partnerTipPaise?: number;
  itemTotalPaise?: number;
  deliveryFeePaise?: number;
  handlingFeePaise?: number;
  couponDiscountPaise?: number;
  amountPaise: number;
  amount: number;
  assignedTo?: QcommerceAssignedHelper;
  assignedHelperName?: string;
  opsAdmin?: QcommerceOpsAdmin;
  opsAdminName?: string;
  deadline?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QcommerceCategory {
  id: string;
  name: string;
  slug: string;
  code?: string;
  imageUrl?: string;
}

export interface QcommerceSubcategory {
  id: string;
  name: string;
  slug: string;
  categoryId?: string;
  categorySlug?: string;
}

export interface QcommerceShop {
  id: string;
  shopName: string;
  shopType?: string;
  city?: string;
  area?: string;
}

export interface QcommerceOrderFilters {
  search?: string;
  status?: string;
  shop?: string;
  category?: string;
  subcategory?: string;
  assignedTo?: string;
  deadlineSortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
