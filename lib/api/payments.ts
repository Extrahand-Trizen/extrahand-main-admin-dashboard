import { apiRequest } from './client';
import {
  ApiResponse,
  PaymentLedgerEntry,
  PaymentOverview,
  PaymentPayout,
  PaymentRefund,
  PaymentTransaction,
} from '@/types';

type PaymentListResponse<T> = ApiResponse<T[]> & { total?: number };

export async function getPaymentsOverview(): Promise<ApiResponse<PaymentOverview>> {
  return apiRequest<ApiResponse<PaymentOverview>>('/api/v1/payments/overview');
}

export async function listPaymentTransactions(filters?: {
  q?: string;
  transactionType?: 'all' | 'real' | 'team';
  holdStatus?: 'held' | 'cancelled';
  environment?: 'production' | 'development';
  limit?: number;
  offset?: number;
}): Promise<PaymentListResponse<PaymentTransaction>> {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  if (filters?.transactionType) params.append('transactionType', filters.transactionType);
  if (filters?.holdStatus) params.append('holdStatus', filters.holdStatus);
  if (filters?.environment) params.append('environment', filters.environment);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));
  const query = params.toString();
  return apiRequest<PaymentListResponse<PaymentTransaction>>(
    `/api/v1/payments/transactions${query ? `?${query}` : ''}`
  );
}

export async function updateTransactionTeamTest(
  transactionId: string,
  teamTest?: boolean,
  teamTestTransferred?: boolean
): Promise<ApiResponse<any>> {
  const body: Record<string, boolean> = {};
  if (typeof teamTest === 'boolean') body.teamTest = teamTest;
  if (typeof teamTestTransferred === 'boolean') body.teamTestTransferred = teamTestTransferred;

  return apiRequest<ApiResponse<any>>(`/api/v1/payments/transactions/${transactionId}/team-test`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function updatePaymentPayoutStatus(
  payoutId: string,
  status: string
): Promise<ApiResponse<any>> {
  return apiRequest<ApiResponse<any>>(`/api/v1/payments/payouts/${payoutId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function listPaymentPayouts(filters?: {
  q?: string;
  status?: string;
  transactionType?: 'all' | 'real' | 'team';
  environment?: 'production' | 'development';
  limit?: number;
  offset?: number;
}): Promise<PaymentListResponse<PaymentPayout>> {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.transactionType && filters.transactionType !== 'all') {
    params.append('transactionType', filters.transactionType);
  }
  if (filters?.environment) params.append('environment', filters.environment);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));
  const query = params.toString();
  return apiRequest<PaymentListResponse<PaymentPayout>>(
    `/api/v1/payments/payouts${query ? `?${query}` : ''}`
  );
}

export async function updatePayoutTeamTest(
  payoutId: string,
  teamTest: boolean
): Promise<ApiResponse<any>> {
  return apiRequest<ApiResponse<any>>(`/api/v1/payments/payouts/${payoutId}/team-test`, {
    method: 'PATCH',
    body: JSON.stringify({ teamTest }),
  });
}

export async function listPaymentRefunds(filters?: {
  status?: string;
  transactionType?: 'all' | 'real' | 'team';
  environment?: 'production' | 'development';
  limit?: number;
  offset?: number;
}): Promise<PaymentListResponse<PaymentRefund>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.transactionType && filters.transactionType !== 'all') {
    params.append('transactionType', filters.transactionType);
  }
  if (filters?.environment) params.append('environment', filters.environment);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));
  const query = params.toString();
  return apiRequest<PaymentListResponse<PaymentRefund>>(
    `/api/v1/payments/refunds${query ? `?${query}` : ''}`
  );
}

export async function updateRefundTeamTest(
  refundId: string,
  teamTest: boolean
): Promise<ApiResponse<any>> {
  return apiRequest<ApiResponse<any>>(`/api/v1/payments/refunds/${refundId}/team-test`, {
    method: 'PATCH',
    body: JSON.stringify({ teamTest }),
  });
}

export async function listPaymentLedger(filters?: {
  type?: string;
  environment?: 'production' | 'development';
  limit?: number;
  offset?: number;
}): Promise<PaymentListResponse<PaymentLedgerEntry>> {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.environment) params.append('environment', filters.environment);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));
  const query = params.toString();
  return apiRequest<PaymentListResponse<PaymentLedgerEntry>>(
    `/api/v1/payments/ledger${query ? `?${query}` : ''}`
  );
}

export async function getUserBankAccounts(userId: string): Promise<ApiResponse<{ bankAccounts: any[] }>> {
  return apiRequest<ApiResponse<{ bankAccounts: any[] }>>(`/api/v1/payments/users/${encodeURIComponent(userId)}/bank-accounts`);
}

export async function enrichPaymentTransactions(body: {
  ids: string[];
}): Promise<ApiResponse<Record<string, {
  customerUserId?: string;
  helperUserId?: string;
  customerName?: string | null;
  helperName?: string | null;
  taskTitle?: string | null;
  teamTest?: boolean;
}>>> {
  return apiRequest('/api/v1/payments/transactions/enrich', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function enrichPaymentPayouts(body: {
  ids: string[];
}): Promise<ApiResponse<Record<string, {
  customerUserId?: string;
  helperUserId?: string;
  customerName?: string | null;
  helperName?: string | null;
  taskTitle?: string | null;
  teamTest?: boolean;
}>>> {
  return apiRequest('/api/v1/payments/payouts/enrich', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function enrichPaymentRefunds(body: {
  ids: string[];
}): Promise<ApiResponse<Record<string, {
  customerUserId?: string;
  helperUserId?: string;
  customerName?: string | null;
  helperName?: string | null;
  taskTitle?: string | null;
  teamTest?: boolean;
}>>> {
  return apiRequest('/api/v1/payments/refunds/enrich', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function enrichPaymentLedger(body: {
  ids: string[];
}): Promise<ApiResponse<Record<string, {
  customerUserId?: string;
  helperUserId?: string;
  customerName?: string | null;
  helperName?: string | null;
  taskTitle?: string | null;
}>>> {
  return apiRequest('/api/v1/payments/ledger/enrich', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deletePaymentTransaction(escrowId: string): Promise<ApiResponse<any>> {
  return apiRequest<ApiResponse<any>>(`/api/v1/payments/transactions/${encodeURIComponent(escrowId)}`, {
    method: 'DELETE',
  });
}

export async function deletePaymentPayout(payoutId: string): Promise<ApiResponse<any>> {
  return apiRequest<ApiResponse<any>>(`/api/v1/payments/payouts/${encodeURIComponent(payoutId)}`, {
    method: 'DELETE',
  });
}

export async function deletePaymentRefund(refundId: string): Promise<ApiResponse<any>> {
  return apiRequest<ApiResponse<any>>(`/api/v1/payments/refunds/${encodeURIComponent(refundId)}`, {
    method: 'DELETE',
  });
}

