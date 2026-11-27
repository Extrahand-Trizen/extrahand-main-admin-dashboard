import {
  getPartnerCategoryLabel,
  FILTER_ONLY_PARTNER_CATEGORY_IDS,
  PARTNER_APP_CATEGORY_IDS,
} from "@/lib/constants/partner-categories";

export const FILTER_ONLY_CATEGORY_OPTIONS = FILTER_ONLY_PARTNER_CATEGORY_IDS
  .map((value) => ({
    value,
    label: getPartnerCategoryLabel(value),
  }))
  .sort((left, right) => left.label.localeCompare(right.label));

export const CATEGORY_OPTIONS = [
  ...PARTNER_APP_CATEGORY_IDS.map((value) => ({
    value,
    label: getPartnerCategoryLabel(value),
  })),
  ...FILTER_ONLY_CATEGORY_OPTIONS,
].sort((left, right) => left.label.localeCompare(right.label));
