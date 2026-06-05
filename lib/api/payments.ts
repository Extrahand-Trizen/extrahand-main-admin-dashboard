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
  limit?: number;
  offset?: number;
}): Promise<PaymentListResponse<PaymentTransaction>> {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  if (filters?.transactionType) params.append('transactionType', filters.transactionType);
  if (filters?.holdStatus) params.append('holdStatus', filters.holdStatus);
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
  limit?: number;
  offset?: number;
}): Promise<PaymentListResponse<PaymentPayout>> {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));
  const query = params.toString();
  return apiRequest<PaymentListResponse<PaymentPayout>>(
    `/api/v1/payments/payouts${query ? `?${query}` : ''}`
  );
}

export async function listPaymentRefunds(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<PaymentListResponse<PaymentRefund>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.offset) params.append('offset', String(filters.offset));
  const query = params.toString();
  return apiRequest<PaymentListResponse<PaymentRefund>>(
    `/api/v1/payments/refunds${query ? `?${query}` : ''}`
  );
}

export async function listPaymentLedger(filters?: {
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<PaymentListResponse<PaymentLedgerEntry>> {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
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
