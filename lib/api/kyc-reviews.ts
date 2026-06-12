import { ApiResponse } from "@/types";
import { apiRequest } from "./client";

export type KycReviewStatus = "pending" | "accepted" | "rejected";
export type KycFollowUpStatus =
  | "none"
  | "follow_up"
  | "not_interested"
  | "followup_uploaded";

export interface KycReviewAssignee {
  userId: string;
  name: string;
  email: string;
}

export interface KycReviewDocument {
  label: string;
  url: string;
}

export interface KycReviewRow {
  notificationId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  aadhaar: string;
  failureReason?: string;
  failedOn?: string;
  aadhaarUpdatedAt?: string;
  followUpStatus: KycFollowUpStatus;
  followUpDate?: string | null;
  registeredAt?: string | null;
  assignedTo: KycReviewAssignee[];
  claimedBy?: KycReviewAssignee | null;
  claimedAt?: string | null;
  reviewStatus: KycReviewStatus;
  reviewedBy?: KycReviewAssignee | null;
  reviewedAt?: string | null;
  sessionId?: string;
  verificationId?: string;
  isAadhaarVerified?: boolean;
  /** True when photos were uploaded manually by an admin (not via DigiLocker/OCR) */
  isManualUpload?: boolean;
  /** Admin who uploaded the photos manually */
  uploadedBy?: KycReviewAssignee | null;
  uploadedAt?: string | null;
  documents: KycReviewDocument[];
  profileUrl: string;
}

export interface KycReviewsResponse extends ApiResponse<KycReviewRow[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function listKycReviews(params: {
  search?: string;
  reviewStatus?: string;
  followUpStatus?: string;
  claimStatus?: string;
  includeVerified?: boolean;
  page?: number;
  limit?: number;
  sortOrder?: "newest" | "latest" | "oldest";
  assignedTo?: string;
} = {}): Promise<KycReviewsResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.reviewStatus) query.set("reviewStatus", params.reviewStatus);
  if (params.followUpStatus) query.set("followUpStatus", params.followUpStatus);
  if (params.claimStatus) query.set("claimStatus", params.claimStatus);
  if (params.includeVerified) query.set("includeVerified", "true");
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.assignedTo && params.assignedTo !== "all") query.set("assignedTo", params.assignedTo);

  const queryString = query.toString();
  return apiRequest<KycReviewsResponse>(
    `/api/v1/kyc-reviews${queryString ? `?${queryString}` : ""}`,
  );
}

export async function acceptKycReview(row: {
  userId: string;
  sessionId?: string;
  verificationId?: string;
}): Promise<ApiResponse<unknown>> {
  return apiRequest<ApiResponse<unknown>>(
    `/api/v1/kyc-reviews/${encodeURIComponent(row.userId)}/accept`,
    {
      method: "POST",
      body: JSON.stringify({
        sessionId: row.sessionId || "",
        verificationId: row.verificationId || "",
      }),
    },
  );
}

export async function rejectKycReview(row: {
  userId: string;
  sessionId?: string;
  verificationId?: string;
  reason?: string;
  followUpStatus: KycFollowUpStatus;
  followUpDate?: string;
}): Promise<ApiResponse<unknown>> {
  return apiRequest<ApiResponse<unknown>>(
    `/api/v1/kyc-reviews/${encodeURIComponent(row.userId)}/reject`,
    {
      method: "POST",
      body: JSON.stringify({
        sessionId: row.sessionId || "",
        verificationId: row.verificationId || "",
        reason: row.reason || "",
        followUpStatus: row.followUpStatus,
        followUpDate: row.followUpDate || null,
      }),
    },
  );
}

export async function uploadAadhaarDocument(
  userId: string,
  side: "front" | "back",
  file: File,
  sessionId: string,
): Promise<ApiResponse<{ side: string; objectKey: string; sessionId: string; message: string }>> {
  const token = localStorage.getItem("accessToken");
  if (!token) throw new Error("Not authenticated. Please login.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("side", side);
  formData.append("sessionId", sessionId);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const response = await fetch(
    `${API_BASE_URL}/api/v1/kyc-reviews/${encodeURIComponent(userId)}/upload-aadhaar`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type — browser sets it with boundary for FormData
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || "Upload failed");
  }

  return response.json();
}

export interface AadhaarUploadStatus {
  hasUpload: boolean;
  sessionId: string | null;
  uploadedAt: string | null;
  reviewStatus: KycReviewStatus | null;
  /** Use this as the sessionId for the next upload batch */
  nextSessionId: string;
  claimedBy?: KycReviewAssignee | null;
  claimedAt?: string | null;
}

export async function getAadhaarUploadStatus(
  userId: string,
): Promise<ApiResponse<AadhaarUploadStatus>> {
  return apiRequest<ApiResponse<AadhaarUploadStatus>>(
    `/api/v1/kyc-reviews/${encodeURIComponent(userId)}/upload-status`,
  );
}

export async function updateKycFollowUp(row: {
  userId: string;
  sessionId?: string;
  verificationId?: string;
  followUpStatus: KycFollowUpStatus;
  reviewStatus?: KycReviewStatus;
  followUpDate?: string | null;
}): Promise<ApiResponse<unknown>> {
  return apiRequest<ApiResponse<unknown>>(
    `/api/v1/kyc-reviews/${encodeURIComponent(row.userId)}/follow-up`,
    {
      method: "PATCH",
      body: JSON.stringify({
        sessionId: row.sessionId || "",
        verificationId: row.verificationId || "",
        followUpStatus: row.followUpStatus,
        reviewStatus: row.reviewStatus,
        followUpDate: row.followUpDate || null,
      }),
    },
  );
}

export async function claimKycReview(
  userId: string,
  sessionId?: string,
): Promise<ApiResponse<unknown>> {
  return apiRequest<ApiResponse<unknown>>(
    `/api/v1/kyc-reviews/${encodeURIComponent(userId)}/claim`,
    {
      method: "POST",
      body: JSON.stringify({ sessionId: sessionId || "" }),
    },
  );
}

export async function unclaimKycReview(
  userId: string,
  sessionId?: string,
): Promise<ApiResponse<unknown>> {
  return apiRequest<ApiResponse<unknown>>(
    `/api/v1/kyc-reviews/${encodeURIComponent(userId)}/unclaim`,
    {
      method: "POST",
      body: JSON.stringify({ sessionId: sessionId || "" }),
    },
  );
}

export async function transferKycReview(
  userId: string,
  targetAdminUserId: string,
  sessionId?: string,
): Promise<ApiResponse<unknown>> {
  return apiRequest<ApiResponse<unknown>>(
    `/api/v1/kyc-reviews/${encodeURIComponent(userId)}/transfer`,
    {
      method: "POST",
      body: JSON.stringify({
        targetAdminUserId,
        sessionId: sessionId || "",
      }),
    },
  );
}

export async function listMyClaims(params: {
  search?: string;
  reviewStatus?: string;
  followUpStatus?: string;
  includeVerified?: boolean;
  page?: number;
  limit?: number;
  sortOrder?: "newest" | "latest" | "oldest";
} = {}): Promise<KycReviewsResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.reviewStatus) query.set("reviewStatus", params.reviewStatus);
  if (params.followUpStatus) query.set("followUpStatus", params.followUpStatus);
  if (params.includeVerified) query.set("includeVerified", "true");
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);

  const queryString = query.toString();
  return apiRequest<KycReviewsResponse>(
    `/api/v1/kyc-reviews/my-claims${queryString ? `?${queryString}` : ""}`,
  );
}

export async function listOpsAdmins(): Promise<ApiResponse<KycReviewAssignee[]>> {
  return apiRequest<ApiResponse<KycReviewAssignee[]>>("/api/v1/kyc-reviews/ops-admins");
}

export async function getKycReviewDocuments(
  userId: string,
  sessionId: string,
  verificationId: string,
): Promise<ApiResponse<KycReviewDocument[]>> {
  return apiRequest<ApiResponse<KycReviewDocument[]>>(
    `/api/v1/kyc-reviews/${encodeURIComponent(userId)}/documents?sessionId=${encodeURIComponent(sessionId)}&verificationId=${encodeURIComponent(verificationId)}`,
  );
}
