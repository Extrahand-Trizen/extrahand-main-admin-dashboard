import { apiRequest } from "@/lib/api/client";

export type FeeMode = "BIDDING" | "BOOK_NOW";

export type FeeCategory = {
  id?: string;
  categoryKey: string;
  mode: FeeMode;
  displayName?: string | null;
  sacCode?: string | null;
  sacHeading?: string | null;
  gstPercentage: number;
  platformFeePercentage?: number | null;
  updatedBy?: string | null;
};

type FeeCategoryResponse = {
  success: boolean;
  categories?: FeeCategory[];
  category?: FeeCategory;
  error?: string;
};

export async function listFeeCategories(mode: FeeMode): Promise<FeeCategory[]> {
  const response = await apiRequest<FeeCategoryResponse>(
    `/api/v1/fee-management/categories?mode=${mode}`,
    {},
    { throwOnError: true },
  );
  if (!response?.success || !Array.isArray(response.categories)) {
    throw new Error(response?.error || "Fee categories could not be loaded.");
  }
  return response.categories;
}

export async function saveFeeCategory(category: FeeCategory): Promise<FeeCategory> {
  const response = await apiRequest<FeeCategoryResponse>(
    `/api/v1/fee-management/categories/${encodeURIComponent(category.categoryKey)}`,
    { method: "PUT", body: JSON.stringify(category) },
    { throwOnError: true },
  );
  if (!response?.success || !response.category) {
    throw new Error(response?.error || "Fee category could not be saved.");
  }
  return response.category;
}

export async function deleteFeeCategory(categoryKey: string, mode: FeeMode): Promise<void> {
  const response = await apiRequest<FeeCategoryResponse>(
    `/api/v1/fee-management/categories/${encodeURIComponent(categoryKey)}?mode=${mode}`,
    { method: "DELETE" },
    { throwOnError: true },
  );
  if (!response?.success) {
    throw new Error(response?.error || "Fee category could not be deleted.");
  }
}
