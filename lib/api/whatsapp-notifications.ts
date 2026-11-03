import { apiRequest } from './client';

export type WhatsAppApplication = 'customer_app' | 'helper_app' | 'seller_app';

export type WhatsAppTemplate = {
  id: string;
  organizationId: string;
  metaTemplateName: string;
  category: string;
  language: string;
  metaStatus: string;
  preview?: {
    templateKind?: string;
    headerText?: string;
    bodyText?: string;
    footerText?: string;
    buttons?: Array<{ type: string; text: string; url?: string }>;
    carouselCards?: Array<{ bodyText: string }>;
  };
};

export type WhatsAppPartnerCategory = {
  id: string;
  name: string;
};

export type WhatsAppCampaignStatus =
  | 'preparing'
  | 'sending'
  | 'sent'
  | 'sent_with_errors'
  | 'failed';

export type WhatsAppRecipientStatus =
  | 'pending'
  | 'sending'
  | 'queued'
  | 'failed'
  | 'suppressed';

export type WhatsAppCampaignHistoryItem = {
  id: string;
  app: WhatsAppApplication;
  templateName: string;
  templateLanguage: string;
  templateCategory: string;
  cities: string[];
  categories: string[];
  recipientCount: number;
  status: WhatsAppCampaignStatus;
  createdBy: string;
  createdAt: string;
  completedAt?: string | null;
  recipientStatuses: Partial<Record<WhatsAppRecipientStatus, number>>;
};

export type WhatsAppCampaignRecipient = {
  uid: string;
  status: WhatsAppRecipientStatus;
  attemptCount: number;
  providerEventId: string | null;
  lastError: string | null;
  updatedAt: string;
};

function requireSuccess<T extends { success: boolean; error?: string }>(
  response: T | null,
  failureMessage: string,
): T {
  if (!response || response.success !== true) {
    throw new Error(response?.error || failureMessage);
  }
  return response;
}

export async function listWhatsAppPartnerCategories(): Promise<{
  success: boolean;
  data: WhatsAppPartnerCategory[];
}> {
  const response = await apiRequest<{
    success: boolean;
    data: WhatsAppPartnerCategory[];
    error?: string;
  } | null>('/api/v1/notifications/whatsapp/categories');
  const result = requireSuccess(response, 'Failed to load partner categories');
  if (!Array.isArray(result.data)) {
    throw new Error('The category catalog returned an invalid response');
  }
  return result;
}

export async function listApprovedWhatsAppTemplates(): Promise<{
  success: boolean;
  data: WhatsAppTemplate[];
}> {
  const response = await apiRequest<{
    success: boolean;
    data: WhatsAppTemplate[];
    error?: string;
  } | null>('/api/v1/notifications/whatsapp/templates');
  const result = requireSuccess(response, 'Failed to load approved WhatsApp templates');
  if (!Array.isArray(result.data)) {
    throw new Error('Dialog returned an invalid approved-template list');
  }
  return result;
}

export async function countWhatsAppAudience(input: {
  app: WhatsAppApplication;
  categories: string[];
  cities: string[];
  workAreas: string[];
}): Promise<{ success: boolean; data: { count: number } }> {
  const response = await apiRequest<{
    success: boolean;
    data: { count: number };
    error?: string;
  } | null>('/api/v1/notifications/whatsapp/audience', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const result = requireSuccess(response, 'Failed to count WhatsApp recipients');
  if (!Number.isInteger(result.data?.count) || result.data.count < 0) {
    throw new Error('Admin service returned an invalid WhatsApp recipient count');
  }
  return result;
}

export async function sendWhatsAppCampaign(input: {
  app: WhatsAppApplication;
  categories: string[];
  cities: string[];
  workAreas: string[];
  templateId: string;
  variables: Record<string, string>;
}): Promise<{
  success: boolean;
  data: { id: string; recipientCount: number; status: 'sending' };
}> {
  const response = await apiRequest<{
    success: boolean;
    data: { id: string; recipientCount: number; status: 'sending' };
    error?: string;
  } | null>('/api/v1/notifications/whatsapp/campaigns', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const result = requireSuccess(response, 'Failed to start WhatsApp campaign');
  if (
    typeof result.data?.id !== 'string' ||
    !Number.isInteger(result.data.recipientCount) ||
    result.data.recipientCount < 1
  ) {
    throw new Error('Admin service returned an invalid WhatsApp campaign');
  }
  return result;
}

export async function listWhatsAppCampaignHistory(input: {
  page: number;
  limit: number;
}): Promise<{
  success: boolean;
  data: WhatsAppCampaignHistoryItem[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> {
  const query = new URLSearchParams({
    page: String(input.page),
    limit: String(input.limit),
  });
  const response = await apiRequest<{
    success: boolean;
    data: WhatsAppCampaignHistoryItem[];
    pagination: { total: number; page: number; limit: number; pages: number };
    error?: string;
  } | null>(`/api/v1/notifications/whatsapp/campaigns?${query}`);
  const result = requireSuccess(response, 'Failed to load WhatsApp campaign history');
  if (
    !Array.isArray(result.data) ||
    !result.pagination ||
    !Number.isInteger(result.pagination.total) ||
    !Number.isInteger(result.pagination.pages)
  ) {
    throw new Error('Admin service returned invalid WhatsApp campaign history');
  }
  return result;
}

export async function listWhatsAppCampaignRecipients(input: {
  campaignId: string;
  page: number;
  limit: number;
}): Promise<{
  success: boolean;
  data: WhatsAppCampaignRecipient[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> {
  const query = new URLSearchParams({
    page: String(input.page),
    limit: String(input.limit),
  });
  const response = await apiRequest<{
    success: boolean;
    data: WhatsAppCampaignRecipient[];
    pagination: { total: number; page: number; limit: number; pages: number };
    error?: string;
  } | null>(
    `/api/v1/notifications/whatsapp/campaigns/${encodeURIComponent(input.campaignId)}/recipients?${query}`,
  );
  const result = requireSuccess(response, 'Failed to load WhatsApp campaign recipients');
  if (
    !Array.isArray(result.data) ||
    !result.pagination ||
    !Number.isInteger(result.pagination.total) ||
    !Number.isInteger(result.pagination.pages)
  ) {
    throw new Error('Admin service returned invalid WhatsApp recipient results');
  }
  return result;
}
