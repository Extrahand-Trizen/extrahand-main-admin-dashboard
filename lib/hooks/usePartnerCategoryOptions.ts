'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CATEGORY_OPTIONS, FILTER_ONLY_CATEGORY_OPTIONS } from '@/lib/category-options';
import { FILTER_ONLY_PARTNER_CATEGORY_IDS } from '@/lib/constants/partner-categories';
import { listPartnerCategories } from '@/lib/api/partner-categories';

export function usePartnerCategoryOptions() {
  const { data, error } = useQuery({
    queryKey: ['partner-category-catalog', 'active'],
    queryFn: () => listPartnerCategories(false),
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load partner categories');
    }
  }, [error]);

  const options = data
    ? [
        ...data
          .filter(
            (category) =>
                !FILTER_ONLY_PARTNER_CATEGORY_IDS.some((id) => id === category.id),
          )
          .map((category) => ({ value: category.id, label: category.label })),
        ...FILTER_ONLY_CATEGORY_OPTIONS,
      ]
        .sort((left, right) => left.label.localeCompare(right.label))
    : CATEGORY_OPTIONS;

  return { options, error };
}
