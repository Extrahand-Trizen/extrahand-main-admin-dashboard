import { ApiResponse } from "@/types";
import { apiRequest } from "./client";
import type {
  KycFollowUpStatus,
  KycReviewRow,
  KycReviewStatus,
} from "./kyc-reviews";

export interface AadhaarFollowUpResponse extends ApiResponse<KycReviewRow[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * List ALL helpers whose Aadhaar is not verified.
 * Each helper is assigned (round-robin) to one of the 3 operations admins.
 * Operations admins only see their own assigned helpers; super-admins see all.
 */
export async function listAadhaarFollowUps(params: {
  search?: string;
  reviewStatus?: string;
  followUpStatus?: string;
  page?: number;
  limit?: number;
  sortOrder?: "newest" | "oldest";
  assignedTo?: string;
} = {}): Promise<AadhaarFollowUpResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.reviewStatus && params.reviewStatus !== "all")
    query.set("reviewStatus", params.reviewStatus);
  if (params.followUpStatus && params.followUpStatus !== "all")
    query.set("followUpStatus", params.followUpStatus);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.assignedTo && params.assignedTo !== "all")
    query.set("assignedTo", params.assignedTo);

  const queryString = query.toString();
  return apiRequest<AadhaarFollowUpResponse>(
    `/api/v1/aadhaar-followups${queryString ? `?${queryString}` : ""}`,
  );
}

// Re-export types from kyc-reviews so the page can use them interchangeably
export type { KycFollowUpStatus, KycReviewRow, KycReviewStatus };
