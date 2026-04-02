import { apiRequest } from "./client";

// Types
export type DashboardType =
  | "main_admin"
  | "super_admin"
  | "leads_onboarding"
  | "content_admin"
  | "payment_admin";

export interface AdminInvite {
  inviteId: string;
  email: string;
  dashboardType: DashboardType;
  role: string;
  invitedBy: string;
  invitedByName: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface AdminUser {
  userId: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  status: "active" | "suspended" | "inactive";
  dashboardAccess: Array<{
    dashboardType: DashboardType;
    role: string;
    status: "active" | "suspended" | "inactive";
    grantedBy: string;
    grantedAt: string;
  }>;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CreateInviteData {
  email: string;
  dashboardType: DashboardType;
  role: string;
  customMessage?: string;
}

// API Endpoints
export const listInvites = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  dashboardType?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.status) query.append("status", params.status);
  if (params?.dashboardType) query.append("dashboardType", params.dashboardType);

  const queryString = query.toString();
  const res = await apiRequest<{
    success: boolean;
    data: {
      invites: AdminInvite[];
      pagination: { total: number; pages: number; page: number; limit: number };
    };
  }>(`/api/v1/admin/invites${queryString ? `?${queryString}` : ""}`);

  // Keep the same return shape as the old axios-based implementation:
  // pages expect `data.invites` and `data.pagination`.
  return res?.data;
};

export const createInvite = async (inviteData: CreateInviteData) => {
  const res = await apiRequest<{
    success: boolean;
    data: Partial<AdminInvite>;
  }>(`/api/v1/admin/invites`, {
    method: "POST",
    body: JSON.stringify(inviteData),
  });

  return res?.data;
};

export const resendInvite = async (inviteId: string) => {
  const res = await apiRequest<{
    success: boolean;
    message: string;
  }>(`/api/v1/admin/invites/${inviteId}/resend`, {
    method: "POST",
  });

  return res;
};

export const cancelInvite = async (inviteId: string) => {
  const res = await apiRequest<{
    success: boolean;
    message: string;
  }>(`/api/v1/admin/invites/${inviteId}`, {
    method: "DELETE",
  });

  return res;
};

export const listUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  dashboardType?: string;
  status?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.search) query.append("search", params.search);
  if (params?.dashboardType) query.append("dashboardType", params.dashboardType);
  if (params?.status) query.append("status", params.status);

  const queryString = query.toString();
  const res = await apiRequest<{
    success: boolean;
    data: {
      users: AdminUser[];
      pagination: { total: number; pages: number; page: number; limit: number };
    };
  }>(`/api/v1/admin/users${queryString ? `?${queryString}` : ""}`);

  // pages expect `data.users` and don't access `data.data`.
  return res?.data;
};

export const updateUser = async (
  userId: string,
  updates: {
    name?: string;
    status?: "active" | "suspended" | "inactive";
  },
) => {
  const res = await apiRequest<{
    success: boolean;
    data: AdminUser;
  }>(`/api/v1/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

  return res?.data;
};
