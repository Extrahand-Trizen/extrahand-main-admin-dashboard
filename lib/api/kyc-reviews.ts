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
  assignedTo: KycReviewAssignee[];
  reviewStatus: KycReviewStatus;
  reviewedBy?: KycReviewAssignee | null;
  reviewedAt?: string | null;
  sessionId?: string;
  verificationId?: string;
  isAadhaarVerified?: boolean;
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
} = {}): Promise<KycReviewsResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.reviewStatus) query.set("reviewStatus", params.reviewStatus);
  if (params.followUpStatus) query.set("followUpStatus", params.followUpStatus);

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
  followUpStatus: Exclude<KycFollowUpStatus, "none">;
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
