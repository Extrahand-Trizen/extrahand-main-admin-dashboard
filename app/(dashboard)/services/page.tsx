'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, ListChecks, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  createCatalogService,
  listServiceCatalog,
  listServiceCategoryContent,
  listServiceSkuContent,
  updateCatalogService,
  updateServiceCategoryScope,
  updateServiceSkuScope,
  updateCatalogServiceStatus,
  uploadCatalogServiceImage,
  type CatalogService,
  type CreateCatalogService,
  type ServiceScopeSection,
  type ServiceCategory,
  type UpdateCatalogService,
} from '@/lib/api/services';
import {
  listPricingCategories,
  listPricingSkus,
  type PricingCategory,
  type PricingSku,
} from '@/lib/api/location-pricing';
import { formatCurrency } from '@/lib/utils';

const PARTNER_CATEGORIES = [
  'cleaning',
  'electrician',
  'appliance_repair',
  'ac_service',
  'plumbing',
  'carpentry',
  'pest_control',
  'beauty_services',
  'care_services',
  'pet_services',
  'painting',
  'delivery_logistics',
  'driving',
  'professional_services',
  'event_services',
  'car_wash',
  'laundry',
  'daily_labour',
] as const;

const BUILT_IN_FILTERS: Record<string, Array<{ id: string; label: string }>> = {
  'full-house': [
    { id: '1-bhk', label: '1 BHK' },
    { id: '2-bhk', label: '2 BHK' },
    { id: '3-bhk', label: '3 BHK' },
    { id: '4-bhk', label: '4 BHK' },
    { id: 'combos', label: 'Combos' },
  ],
};

const fieldClassName =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20';

function categoryLabel(value: string) {
  return value
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function filterSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getServiceCount(categories: ServiceCategory[]) {
  return categories.reduce((total, category) => total + category.services.length, 0);
}

function isValidOfferPrice(offerPrice: number | null, basePrice: number) {
  return (
    offerPrice === null ||
    (Number.isFinite(offerPrice) && offerPrice > 0 && offerPrice < basePrice)
  );
}

type ScopeSectionForm = Omit<ServiceScopeSection, 'includedItems' | 'notIncludedItems'> & {
  includedItemsText: string;
  notIncludedItemsText: string;
};

function formatScopeItems(items: string[] | undefined) {
  return (items || []).join('\n');
}

function parseScopeItems(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function usesCategoryScope(categorySlug: string) {
  return ['hourly-helper', 'personal-assistant', 'personal-assistance'].includes(
    categorySlug.trim().toLowerCase(),
  );
}

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [categorySelection, setCategorySelection] = useState('new');
  const [filterSelection, setFilterSelection] = useState('new');
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryImageUrl, setCategoryImageUrl] = useState('');
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceImageUrl, setServiceImageUrl] = useState('');
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [basePrice, setBasePrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [pricingUnit, setPricingUnit] = useState<'fixed' | 'hourly'>('fixed');
  const [partnerCategoryId, setPartnerCategoryId] = useState<string>('cleaning');
  const [editingService, setEditingService] = useState<CatalogService | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingCategorySlug, setEditingCategorySlug] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editingImageFile, setEditingImageFile] = useState<File | null>(null);
  const [editBasePrice, setEditBasePrice] = useState('');
  const [editOfferPrice, setEditOfferPrice] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState('60');
  const [editPricingUnit, setEditPricingUnit] = useState<'fixed' | 'hourly'>('fixed');
  const [editPartnerCategoryId, setEditPartnerCategoryId] = useState('cleaning');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIncludesText, setEditIncludesText] = useState('');
  const [editExcludesText, setEditExcludesText] = useState('');
  const [editingScopeCategory, setEditingScopeCategory] = useState<ServiceCategory | null>(null);
  const [scopeIncludedTitle, setScopeIncludedTitle] = useState('Included');
  const [scopeNotIncludedTitle, setScopeNotIncludedTitle] = useState('Not included');
  const [scopeSections, setScopeSections] = useState<ScopeSectionForm[]>([]);

  const { data: categories = [], isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['service-catalog-admin'],
    queryFn: listServiceCatalog,
    staleTime: 0,
    refetchOnMount: 'always',
    });
  const {
    data: categoryContents = [],
    isLoading: isScopeContentLoading,
    error: scopeContentError,
    refetch: refetchScopeContent,
  } = useQuery({
    queryKey: ['service-category-scope-content'],
    queryFn: listServiceCategoryContent,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const categoryContentBySlug = useMemo(
    () => new Map(categoryContents.map((content) => [content.categorySlug, content] as const)),
    [categoryContents],
  );
  const {
    data: skuContents = [],
    isLoading: isSkuContentLoading,
    error: skuContentError,
    refetch: refetchSkuContent,
  } = useQuery({
    queryKey: ['service-sku-scope-content'],
    queryFn: listServiceSkuContent,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const {
    data: pricingSkus = [],
    isLoading: isPricingLoading,
    isRefetching: isPricingRefetching,
    error: pricingError,
    refetch: refetchPricing,
  } = useQuery({
    queryKey: ['service-catalog-global-prices'],
    queryFn: async (): Promise<PricingSku[]> => {
      const response = await listPricingSkus();
      if (!response?.success || !Array.isArray(response.data)) {
        throw new Error(response?.error || 'Failed to load global prices');
      }
      return response.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const globalPriceBySkuId = useMemo(
    () => new Map(pricingSkus.map((sku) => [String(sku._id), sku.defaultPrice] as const)),
    [pricingSkus],
  );
  const {
    data: pricingCategories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['service-management-category-filters'],
    queryFn: async (): Promise<PricingCategory[]> => {
      const response = await listPricingCategories();
      if (!response?.success || !Array.isArray(response.data)) {
        throw new Error(response?.error || 'Failed to load categories');
      }
      return response.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const selectedPricingCategory = pricingCategories.find(
    (category) => category.id === categoryFilter,
  );
  const subcategoryOptions = selectedPricingCategory?.subcategories || [];
  const availableServiceFilters = useMemo(() => {
    const category = categories.find((item) => item.slug === categorySelection);
    const filters = new Map<string, { id: string; label: string }>();
    (BUILT_IN_FILTERS[categorySelection] || []).forEach((filter) => {
      filters.set(filter.id, filter);
    });
    category?.services.forEach((service) => {
      if (service.isActive && service.filterId && service.filterLabel) {
        filters.set(service.filterId, {
          id: service.filterId,
          label: service.filterLabel,
        });
      }
    });
    return Array.from(filters.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, categorySelection]);

  const visibleCategories = (() => {
    const query = search.trim().toLowerCase();
    const categoryIds = categoryFilter
      ? new Set(
          (selectedPricingCategory?.subcategories || [])
            .filter(
              (subcategory) =>
                !subcategoryFilter || subcategory.id === subcategoryFilter,
            )
            .map((subcategory) => subcategory.categoryId),
        )
      : null;
    return categories
      .filter((category) => !categoryIds || categoryIds.has(category._id))
      .map((category) => {
        const categorySearchLabels = pricingCategories.flatMap((parentCategory) =>
          parentCategory.subcategories
            .filter((subcategory) => subcategory.categoryId === category._id)
            .flatMap((subcategory) => [parentCategory.name, subcategory.name]),
        );
        const categoryMatches =
          !query ||
          `${category.name} ${category.slug} ${categorySearchLabels.join(' ')}`
            .toLowerCase()
            .includes(query);
        const services = category.services.filter((service) => {
          if (!includeInactive && !service.isActive) return false;
          if (categoryMatches) return true;
          return `${service.name} ${service.slug}`.toLowerCase().includes(query);
        });
        return { ...category, services };
      })
      .filter((category) => category.services.length > 0);
  })();

  const createMutation = useMutation({
    mutationFn: async ({
      payload,
      imageFile,
      categoryImageFile,
    }: {
      payload: CreateCatalogService;
      imageFile: File | null;
      categoryImageFile: File | null;
    }) => {
      const [imageUrl, categoryIconUrl] = await Promise.all([
        imageFile ? uploadCatalogServiceImage(imageFile) : payload.imageUrl,
        categoryImageFile ? uploadCatalogServiceImage(categoryImageFile) : payload.categoryIconUrl,
      ]);
      return createCatalogService({ ...payload, imageUrl, categoryIconUrl });
    },
    onSuccess: async () => {
      toast.success('Service added to the app catalog');
      setFormOpen(false);
      setCategorySelection('new');
      setFilterSelection('new');
      setNewFilterLabel('');
      setCategoryName('');
      setCategoryDescription('');
      setCategoryImageUrl('');
      setCategoryImageFile(null);
      setServiceName('');
      setServiceDescription('');
      setServiceImageUrl('');
      setServiceImageFile(null);
      setBasePrice('');
      setDurationMinutes('60');
      setPricingUnit('fixed');
      setPartnerCategoryId('cleaning');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['service-catalog-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['service-catalog-global-prices'] }),
      ]);
    },
    onError: (createError: Error) => {
      toast.error(createError.message || 'Failed to add service');
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({
      serviceId,
      payload,
      imageFile,
      packageScope,
    }: {
      serviceId: string;
      payload: UpdateCatalogService;
      imageFile: File | null;
      packageScope?: {
        categorySlug: string;
        skuSlug: string;
        displayName: string;
        includes: string[];
        excludes: string[];
      };
      isSoftDelete?: boolean;
      offerCleared?: boolean;
    }) => {
      const imageUrl = imageFile
        ? await uploadCatalogServiceImage(imageFile)
        : payload.imageUrl;
      const updatedService = await updateCatalogService(serviceId, { ...payload, imageUrl });
      if (packageScope) {
        await updateServiceSkuScope(
          packageScope.categorySlug,
          packageScope.skuSlug,
          packageScope.displayName,
          packageScope.includes,
          packageScope.excludes,
        );
      }
      return updatedService;
    },
    onSuccess: async (_data, variables) => {
      const message = variables.isSoftDelete
        ? 'Service moved to inactive services'
        : 'Service details updated';
      toast.success(
        variables.offerCleared
          ? `${message}; invalid offer price cleared`
          : message,
      );
      if (variables.isSoftDelete) setIncludeInactive(true);
      setDeleteConfirmOpen(false);
      setEditingService(null);
      setEditingImageFile(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['service-catalog-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['service-catalog-global-prices'] }),
        queryClient.invalidateQueries({ queryKey: ['service-sku-scope-content'] }),
      ]);
    },
    onError: (updateError: Error) => {
      toast.error(updateError.message || 'Failed to update service');
    },
  });

  const updateServiceStatusMutation = useMutation({
    mutationFn: ({
      serviceId,
      isActive,
    }: {
      serviceId: string;
      isActive: boolean;
      isSoftDelete?: boolean;
    }) => updateCatalogServiceStatus(serviceId, isActive),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.isSoftDelete
          ? 'Service moved to inactive services'
          : `Service ${variables.isActive ? 'activated' : 'deactivated'}`,
      );
      if (!variables.isActive) setIncludeInactive(true);
      setDeleteConfirmOpen(false);
      setEditingService(null);
      setEditingImageFile(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['service-catalog-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['service-catalog-global-prices'] }),
      ]);
    },
    onError: (updateError: Error) => {
      toast.error(updateError.message || 'Failed to update service status');
    },
  });

  const scopeMutation = useMutation({
    mutationFn: ({
      category,
      scope,
    }: {
      category: ServiceCategory;
      scope: {
        includedTitle: string;
        notIncludedTitle: string;
        sections: ServiceScopeSection[];
      };
    }) => updateServiceCategoryScope(category.slug, category.name, scope),
    onSuccess: async () => {
      toast.success('Service scope updated in the app');
      setEditingScopeCategory(null);
      await queryClient.invalidateQueries({ queryKey: ['service-category-scope-content'] });
    },
    onError: (updateError: Error) => {
      toast.error(updateError.message || 'Failed to update service scope');
    },
  });

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericPrice = Number(basePrice);
    const numericDuration = Number(durationMinutes);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast.error('Service price must be greater than zero');
      return;
    }
    if (!Number.isInteger(numericDuration) || numericDuration < 15) {
      toast.error('Duration must be at least 15 whole minutes');
      return;
    }

    const selectedFilter = availableServiceFilters.find(
      (filter) => filter.id === filterSelection,
    );
    const filterLabel =
      filterSelection === 'new' ? newFilterLabel.trim() : selectedFilter?.label || '';
    const filterId =
      filterSelection === 'new' ? filterSlug(newFilterLabel) : selectedFilter?.id || '';
    if (!filterLabel || !filterId) {
      toast.error('Choose an existing filter or enter a filter name');
      return;
    }

    const payload: CreateCatalogService = {
      ...(categorySelection === 'new'
        ? {
            categoryName: categoryName.trim(),
            categoryDescription: categoryDescription.trim(),
            categoryIconUrl: categoryImageUrl.trim(),
            categorySortOrder: categories.length * 10,
          }
        : { categorySlug: categorySelection }),
      filterId,
      filterLabel,
      name: serviceName.trim(),
      description: serviceDescription.trim(),
      imageUrl: serviceImageUrl.trim(),
      basePrice: numericPrice,
      durationMinutes: numericDuration,
      pricingUnit,
      partnerCategoryId,
    };

    createMutation.mutate({
      payload,
      imageFile: serviceImageFile,
      categoryImageFile,
    });
  };

  const openServiceEditor = (service: CatalogService, categorySlug: string) => {
    setEditingService(service);
    setEditingCategorySlug(categorySlug);
    setEditName(service.name);
    setEditDescription(service.description || '');
    setEditImageUrl(service.imageUrl || '');
    setEditingImageFile(null);
    setEditBasePrice(String(service.basePrice));
    setEditOfferPrice(service.offerPrice > 0 ? String(service.offerPrice) : '');
    setEditDurationMinutes(String(service.durationMinutes));
    setEditPricingUnit(service.pricingUnit);
    setEditPartnerCategoryId(service.partnerCategoryId || service.taskCategory || 'cleaning');
    setEditIsActive(service.isActive);
    const storedContent = skuContents.find(
      (content) =>
        content.categorySlug.toLowerCase() === categorySlug.toLowerCase() &&
        content.skuSlug.toLowerCase() === service.slug.toLowerCase(),
    );
    setEditIncludesText(formatScopeItems(storedContent?.includes));
    setEditExcludesText(formatScopeItems(storedContent?.excludes));
  };

  const openScopeEditor = (category: ServiceCategory) => {
    const storedScope = categoryContentBySlug.get(category.slug)?.scope;
    setEditingScopeCategory(category);
    setScopeIncludedTitle(storedScope?.includedTitle || 'Included');
    setScopeNotIncludedTitle(storedScope?.notIncludedTitle || 'Not included');
    setScopeSections(
      storedScope?.sections.length
        ? storedScope.sections.map((section) => ({
            id: section.id,
            label: section.label,
            includedItemsText: formatScopeItems(section.includedItems),
            notIncludedItemsText: formatScopeItems(section.notIncludedItems),
          }))
        : [{
            id: category.slug,
            label: category.name,
            includedItemsText: '',
            notIncludedItemsText: '',
          }],
    );
  };

  const saveScope = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingScopeCategory) return;
    if (
      !scopeIncludedTitle.trim() ||
      !scopeNotIncludedTitle.trim() ||
      scopeSections.some((section) => !section.id.trim() || !section.label.trim())
    ) {
      toast.error('Enter both section headings and a label for every category tab');
      return;
    }

    scopeMutation.mutate({
      category: editingScopeCategory,
      scope: {
        includedTitle: scopeIncludedTitle.trim(),
        notIncludedTitle: scopeNotIncludedTitle.trim(),
        sections: scopeSections.map((section) => ({
          id: section.id.trim(),
          label: section.label.trim(),
          includedItems: parseScopeItems(section.includedItemsText),
          notIncludedItems: parseScopeItems(section.notIncludedItemsText),
        })),
      },
    });
  };

  const saveService = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingService) return;
    if (
      !usesCategoryScope(editingCategorySlug) &&
      (isSkuContentLoading || skuContentError)
    ) {
      toast.error('Service includes and exclusions could not be loaded. Refresh and try again.');
      return;
    }
    const numericBasePrice = Number(editBasePrice);
    const offerPrice = editOfferPrice.trim() ? Number(editOfferPrice) : null;
    const numericDuration = Number(editDurationMinutes);
    if (
      !Number.isFinite(numericBasePrice) ||
      numericBasePrice <= 0
    ) {
      toast.error('Base price must be greater than zero');
      return;
    }
    if (!isValidOfferPrice(offerPrice, numericBasePrice) && editIsActive) {
      toast.error('Offer price must be greater than zero and lower than the base price');
      return;
    }
    const offerCleared = !isValidOfferPrice(offerPrice, numericBasePrice);
    if (!Number.isInteger(numericDuration) || numericDuration < 15) {
      toast.error('Duration must be at least 15 whole minutes');
      return;
    }

    const originalOfferPrice =
      editingService.offerPrice > 0 ? editingService.offerPrice : null;
    const originalCategorySlug = categories.find((category) =>
      category.services.some((service) => service._id === editingService._id),
    )?.slug;
    const statusOnlyChange =
      editIsActive !== editingService.isActive &&
      editingCategorySlug === originalCategorySlug &&
      editName.trim() === editingService.name &&
      editDescription.trim() === (editingService.description || '') &&
      editImageUrl.trim() === (editingService.imageUrl || '') &&
      numericBasePrice === editingService.basePrice &&
      offerPrice === originalOfferPrice &&
      numericDuration === editingService.durationMinutes &&
      editPricingUnit === editingService.pricingUnit &&
      editPartnerCategoryId ===
        (editingService.partnerCategoryId || editingService.taskCategory || 'cleaning') &&
      editIncludesText ===
        formatScopeItems(
          skuContents.find(
            (content) =>
              content.categorySlug.toLowerCase() === originalCategorySlug?.toLowerCase() &&
              content.skuSlug.toLowerCase() === editingService.slug.toLowerCase(),
          )?.includes,
        ) &&
      editExcludesText ===
        formatScopeItems(
          skuContents.find(
            (content) =>
              content.categorySlug.toLowerCase() === originalCategorySlug?.toLowerCase() &&
              content.skuSlug.toLowerCase() === editingService.slug.toLowerCase(),
          )?.excludes,
        );
    if (statusOnlyChange) {
      updateServiceStatusMutation.mutate({
        serviceId: editingService._id,
        isActive: editIsActive,
      });
      return;
    }

    updateServiceMutation.mutate({
      serviceId: editingService._id,
      imageFile: editingImageFile,
      offerCleared,
      payload: {
        categorySlug: editingCategorySlug,
        name: editName.trim(),
        description: editDescription.trim(),
        imageUrl: editImageUrl.trim(),
        basePrice: numericBasePrice,
        offerPrice: offerCleared ? null : offerPrice,
        durationMinutes: numericDuration,
        pricingUnit: editPricingUnit,
        partnerCategoryId: editPartnerCategoryId,
        isActive: editIsActive,
      },
      ...(!usesCategoryScope(editingCategorySlug)
        ? {
            packageScope: {
              categorySlug: editingCategorySlug,
              skuSlug: editingService.slug,
              displayName: editName.trim(),
              includes: parseScopeItems(editIncludesText),
              excludes: parseScopeItems(editExcludesText),
            },
          }
        : {}),
    });
  };

  const softDeleteService = () => {
    if (!editingService) return;
    updateServiceStatusMutation.mutate({
      serviceId: editingService._id,
      isActive: false,
      isSoftDelete: true,
    });
  };

  const totalServices = getServiceCount(categories);
  const activeServices = categories.reduce(
    (total, category) =>
      total +
        (category.isActive && category.isVisibleInApp
          ? category.services.filter((service) => service.isActive).length
          : 0),
    0,
  );
  const isServiceUpdatePending =
    updateServiceMutation.isPending || updateServiceStatusMutation.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-amber-600" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Service Management</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage Book Now services. New services are published to the app catalog automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
              void refetchPricing();
              void refetchCategories();
              void refetchScopeContent();
              void refetchSkuContent();
            }}
            disabled={
              isLoading ||
              isRefetching ||
              isPricingLoading ||
              isPricingRefetching ||
              isCategoriesLoading ||
              isSkuContentLoading
            }
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                isRefetching || isPricingRefetching || isCategoriesLoading || isSkuContentLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-amber-600 text-white hover:bg-amber-700"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add service
          </Button>
        </div>
      </div>

      {scopeContentError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load service scope content: {(scopeContentError as Error).message}
        </p>
      ) : null}
      {skuContentError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load service includes and exclusions: {(skuContentError as Error).message}
        </p>
      ) : null}

      {formOpen && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add a service</DialogTitle>
              <DialogDescription>
              Add a bookable package to an existing category or create a new category and its first package.
              </DialogDescription>
            </DialogHeader>
            <Card className="border-0 shadow-none">
            <CardContent className="px-0">
            <form className="space-y-5" onSubmit={handleCreate}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Category
                  <select
                    className={fieldClassName}
                    value={categorySelection}
                    onChange={(event) => {
                      setCategorySelection(event.target.value);
                      setFilterSelection('new');
                      setNewFilterLabel('');
                    }}
                  >
                    <option value="new">Create a new category</option>
                    {categories
                      .filter((category) => category.isActive && category.isVisibleInApp)
                      .map((category) => (
                      <option key={category._id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                {categorySelection === 'new' && (
                  <>
                    <label className="space-y-1.5 text-sm font-medium text-gray-700">
                      Category name
                      <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-gray-700">
                      Category description
                      <Input
                        value={categoryDescription}
                        onChange={(event) => setCategoryDescription(event.target.value)}
                        maxLength={500}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-gray-700">
                      Category image
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => setCategoryImageFile(event.target.files?.[0] || null)}
                      />
                      <Input
                        type="url"
                        value={categoryImageUrl}
                        onChange={(event) => setCategoryImageUrl(event.target.value)}
                        placeholder="Or paste an image URL"
                      />
                      {categoryImageFile && (
                        <span className="block text-xs font-normal text-gray-500">
                          Selected: {categoryImageFile.name}
                        </span>
                      )}
                      <span className="block text-xs font-normal text-gray-500">
                        JPG, PNG or WebP, up to 10 MB.
                      </span>
                    </label>
                  </>
                )}
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Service filter
                  <select
                    className={fieldClassName}
                    value={filterSelection}
                    onChange={(event) => setFilterSelection(event.target.value)}
                  >
                    <option value="new">Create a new filter</option>
                    {availableServiceFilters.map((filter) => (
                      <option key={filter.id} value={filter.id}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </label>
                {filterSelection === 'new' && (
                  <label className="space-y-1.5 text-sm font-medium text-gray-700">
                    New filter name
                    <Input
                      value={newFilterLabel}
                      onChange={(event) => setNewFilterLabel(event.target.value)}
                      placeholder="e.g. 1 BHK"
                      required
                    />
                  </label>
                )}
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Service name
                  <Input value={serviceName} onChange={(event) => setServiceName(event.target.value)} required />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Service description
                  <Input
                    value={serviceDescription}
                    onChange={(event) => setServiceDescription(event.target.value)}
                    maxLength={500}
                  />
                </label>
                <div className="space-y-1.5 text-sm font-medium text-gray-700">
                  <label htmlFor="new-service-image">Service image</label>
                  <Input
                    id="new-service-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setServiceImageFile(event.target.files?.[0] || null)}
                  />
                  <Input
                    type="url"
                    value={serviceImageUrl}
                    onChange={(event) => setServiceImageUrl(event.target.value)}
                    placeholder="Or paste an image URL"
                  />
                  {serviceImageFile && (
                    <p className="text-xs text-gray-500">Selected: {serviceImageFile.name}</p>
                  )}
                  <p className="text-xs font-normal text-gray-500">JPG, PNG or WebP, up to 10 MB.</p>
                </div>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Price (₹)
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={basePrice}
                    onChange={(event) => setBasePrice(event.target.value)}
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Duration (minutes)
                  <Input
                    type="number"
                    min="15"
                    step="1"
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Pricing unit
                  <select
                    className={fieldClassName}
                    value={pricingUnit}
                    onChange={(event) => setPricingUnit(event.target.value as 'fixed' | 'hourly')}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Partner skill group (used for task routing)
                  <select
                    className={fieldClassName}
                    value={partnerCategoryId}
                    onChange={(event) => setPartnerCategoryId(event.target.value)}
                  >
                    {editPartnerCategoryId === 'other' && (
                      <option value="other">Other (legacy)</option>
                    )}
                    {PARTNER_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 text-white hover:bg-amber-700"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add to app catalog
                </Button>
              </div>
            </form>
            </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Categories</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{categories.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">All services</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{totalServices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Active in app</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{activeServices}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-base">Existing services</CardTitle>
            <CardDescription>
              Active services match the app catalog. Show inactive services to reactivate or update
              them. Global prices use the same SKU data as Configure Price.
            </CardDescription>
          </div>
          <div className="grid w-full grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]">
            <label className="min-w-0 space-y-1.5 text-xs font-medium text-gray-600">
              Search
              <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Services, categories..."
                className="h-10 w-full pl-9"
              />
              </div>
            </label>
            <label className="min-w-0 space-y-1.5 text-xs font-medium text-gray-600">
              Category
              <select
                aria-label="Filter by category"
                className={`${fieldClassName} h-10`}
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setSubcategoryFilter('');
                }}
              >
                <option value="">All categories</option>
                {pricingCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 space-y-1.5 text-xs font-medium text-gray-600">
              Subcategory
              <select
                aria-label="Filter by subcategory"
                className={`${fieldClassName} h-10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
                value={subcategoryFilter}
                onChange={(event) => setSubcategoryFilter(event.target.value)}
                disabled={!categoryFilter}
              >
                <option value="">
                  {categoryFilter ? 'All subcategories' : 'Choose a category first'}
                </option>
                {subcategoryOptions.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant={includeInactive ? 'default' : 'outline'}
              onClick={() => setIncludeInactive((include) => !include)}
              className={`h-10 whitespace-nowrap ${includeInactive ? 'bg-gray-800 text-white hover:bg-gray-700' : ''}`}
            >
              {includeInactive ? 'Hide inactive' : 'Show inactive'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || isPricingLoading || isCategoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : error || pricingError || categoriesError ? (
            <div className="py-12 text-center text-sm text-red-600">
              {error instanceof Error
                ? error.message
                : pricingError instanceof Error
                  ? pricingError.message
                  : categoriesError instanceof Error
                    ? categoriesError.message
                    : 'Failed to load services and filters.'}
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              {search
                ? 'No services match your search.'
                : includeInactive
                  ? 'No services have been added yet.'
                  : 'No active services found. Show inactive services to manage disabled packages.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead>Category</TableHead>
                    <TableHead>Service / package</TableHead>
                    <TableHead>Global app price</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Partner skill group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCategories.flatMap((category) =>
                    (category.services.length > 0 ? category.services : [null]).map((service) => (
                      <TableRow key={`${category._id}-${service?._id || 'empty'}`}>
                        <TableCell>
                          <div className="space-y-2">
                            <div>
                              <div className="font-medium text-gray-900">{category.name}</div>
                              <div className="font-mono text-xs text-gray-500">{category.slug}</div>
                            </div>
                            {(service === category.services[0] || !service) &&
                            usesCategoryScope(category.slug) ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openScopeEditor(category)}
                                disabled={isScopeContentLoading || Boolean(scopeContentError)}
                              >
                                <ListChecks className="h-4 w-4" />
                                Edit app scope
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {service ? (
                            <>
                              <div className="font-medium text-gray-900">{service.name}</div>
                              <div className="font-mono text-xs text-gray-500">{service.slug}</div>
                            </>
                          ) : (
                            <span className="text-sm italic text-gray-400">No packages</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {service ? (
                            (() => {
                              const isVisibleInApp =
                                category.isActive && category.isVisibleInApp && service.isActive;
                              const globalPrice = globalPriceBySkuId.get(service._id);
                              if (!isVisibleInApp) {
                                return <span className="text-sm text-gray-500">Not shown in app</span>;
                              }
                              return globalPrice === undefined ? (
                                <span className="text-sm text-red-600">Price unavailable</span>
                              ) : (
                                <div className="space-y-1">
                                  {globalPrice < service.basePrice && (
                                    <div className="text-xs text-gray-500 line-through">
                                      {formatCurrency(service.basePrice)}
                                    </div>
                                  )}
                                  <div className="font-medium text-gray-900">
                                    {formatCurrency(globalPrice)}
                                  </div>
                                  {globalPrice < service.basePrice && (
                                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                      {Math.round(
                                        ((service.basePrice - globalPrice) / service.basePrice) * 100,
                                      )}
                                      % OFF
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {service
                            ? `${service.durationMinutes} min${service.pricingUnit === 'hourly' ? ' / hr' : ''}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {service
                            ? categoryLabel(service.partnerCategoryId || service.taskCategory)
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {service ? (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={
                                  category.isActive &&
                                  category.isVisibleInApp &&
                                  service.isActive
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-gray-200 bg-gray-100 text-gray-600'
                                }
                              >
                                {category.isActive &&
                                category.isVisibleInApp &&
                                service.isActive
                                  ? 'Active'
                                  : 'Inactive'}
                              </Badge>
                              <Switch
                                checked={service.isActive}
                                disabled={isServiceUpdatePending}
                                aria-label={`${service.isActive ? 'Deactivate' : 'Activate'} ${service.name}`}
                                onCheckedChange={(isActive) =>
                                  updateServiceStatusMutation.mutate({
                                    serviceId: service._id,
                                    isActive,
                                  })
                                }
                              />
                            </div>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {service ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label={`Edit ${service.name}`}
                              title="Edit service"
                              disabled={
                                !usesCategoryScope(category.slug) &&
                                (isSkuContentLoading || Boolean(skuContentError))
                              }
                              onClick={() => openServiceEditor(service, category.slug)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingService)}
        onOpenChange={(open) => {
          if (!open && !isServiceUpdatePending) {
            setEditingService(null);
            setEditingImageFile(null);
            setDeleteConfirmOpen(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit service</DialogTitle>
            <DialogDescription>
              Update the service details used by the app and partner task routing.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={saveService}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-gray-700">
                Category
                <select
                  className={fieldClassName}
                  value={editingCategorySlug}
                  onChange={(event) => setEditingCategorySlug(event.target.value)}
                >
                  {categories
                    .filter((category) => category.isActive && category.isVisibleInApp)
                    .map((category) => (
                    <option key={category._id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Service status</p>
                  <p className="text-xs text-gray-500">
                    {editIsActive ? 'Visible and bookable in the app' : 'Hidden from the app'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {editIsActive ? 'Active' : 'Inactive'}
                  </span>
                  <Switch
                    checked={editIsActive}
                    onCheckedChange={setEditIsActive}
                    aria-label="Set service active in app"
                  />
                </div>
              </div>
              <label className="space-y-1.5 text-sm font-medium text-gray-700">
                Service name
                <Input value={editName} onChange={(event) => setEditName(event.target.value)} required />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-gray-700">
                Description
                <Input
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  maxLength={500}
                />
              </label>
              <div className="space-y-1.5 text-sm font-medium text-gray-700 sm:col-span-2">
                <label htmlFor="edit-service-image">Service image</label>
                <Input
                  id="edit-service-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setEditingImageFile(event.target.files?.[0] || null)}
                />
                <Input
                  type="url"
                  value={editImageUrl}
                  onChange={(event) => setEditImageUrl(event.target.value)}
                  placeholder="Image URL"
                />
                <p className="text-xs font-normal text-gray-500">
                  JPG, PNG or WebP, up to 10 MB.
                  {editingImageFile ? ` Selected: ${editingImageFile.name}` : ''}
                </p>
              </div>
              <label className="space-y-1.5 text-sm font-medium text-gray-700">
                Base price (₹)
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editBasePrice}
                  onChange={(event) => setEditBasePrice(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-gray-700">
                Offer price (₹)
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editOfferPrice}
                  onChange={(event) => setEditOfferPrice(event.target.value)}
                  placeholder="No offer"
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-gray-700">
                Duration (minutes)
                <Input
                  type="number"
                  min="15"
                  step="1"
                  value={editDurationMinutes}
                  onChange={(event) => setEditDurationMinutes(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-gray-700">
                Pricing unit
                <select
                  className={fieldClassName}
                  value={editPricingUnit}
                  onChange={(event) => setEditPricingUnit(event.target.value as 'fixed' | 'hourly')}
                >
                  <option value="fixed">Fixed</option>
                  <option value="hourly">Hourly</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-gray-700 sm:col-span-2">
                Partner skill group (used for task routing)
                <select
                  className={fieldClassName}
                  value={editPartnerCategoryId}
                  onChange={(event) => setEditPartnerCategoryId(event.target.value)}
                >
                  {PARTNER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabel(category)}
                    </option>
                  ))}
                </select>
              </label>
              {!usesCategoryScope(editingCategorySlug) ? (
                <>
                  <label className="space-y-1.5 text-sm font-medium text-gray-700 sm:col-span-2">
                    What's included
                    <textarea
                      className={`${fieldClassName} min-h-28 resize-y`}
                      value={editIncludesText}
                      onChange={(event) => setEditIncludesText(event.target.value)}
                      placeholder="Enter one included item per line"
                      aria-label="What is included in this service"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-gray-700 sm:col-span-2">
                    What's not included
                    <textarea
                      className={`${fieldClassName} min-h-28 resize-y`}
                      value={editExcludesText}
                      onChange={(event) => setEditExcludesText(event.target.value)}
                      placeholder="Enter one excluded item per line"
                      aria-label="What is not included in this service"
                    />
                  </label>
                  <p className="text-xs font-normal text-gray-500 sm:col-span-2">
                    Enter one item per line. These lists are shown with this service in the customer app.
                  </p>
                </>
              ) : null}
            </div>
            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="mr-auto border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={!editingService?.isActive || isServiceUpdatePending}
              >
                <Trash2 className="h-4 w-4" />
                {editingService?.isActive ? 'Delete service' : 'Already inactive'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingService(null)}
                disabled={isServiceUpdatePending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 text-white hover:bg-amber-700"
                disabled={
                  isServiceUpdatePending ||
                  (!usesCategoryScope(editingCategorySlug) &&
                    (isSkuContentLoading || Boolean(skuContentError)))
                }
              >
                {isServiceUpdatePending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save service
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editingScopeCategory)}
        onOpenChange={(open) => {
          if (!open && !scopeMutation.isPending) setEditingScopeCategory(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit app scope</DialogTitle>
            <DialogDescription>
              Changes apply to the {editingScopeCategory?.name} category in the customer app.
              Enter one included or not-included item per line.
            </DialogDescription>
          </DialogHeader>
          {scopeContentError ? (
            <p className="text-sm text-red-600">
              Could not load saved scope content: {(scopeContentError as Error).message}
            </p>
          ) : null}
          <form className="space-y-5" onSubmit={saveScope}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-gray-700">
                Included section heading
                <Input
                  value={scopeIncludedTitle}
                  onChange={(event) => setScopeIncludedTitle(event.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-gray-700">
                Not-included section heading
                <Input
                  value={scopeNotIncludedTitle}
                  onChange={(event) => setScopeNotIncludedTitle(event.target.value)}
                  maxLength={120}
                  required
                />
              </label>
            </div>
            <div className="space-y-4">
              {scopeSections.map((section, index) => (
                <Card key={`${section.id}-${index}`} className="border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">Scope tab {index + 1}</CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setScopeSections((current) =>
                          current.filter((_, sectionIndex) => sectionIndex !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-medium text-gray-700">
                      Tab label
                      <Input
                        value={section.label}
                        onChange={(event) =>
                          setScopeSections((current) =>
                            current.map((item, sectionIndex) =>
                              sectionIndex === index
                                ? { ...item, label: event.target.value }
                                : item,
                            ),
                          )
                        }
                        maxLength={120}
                        required
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-gray-700">
                      Tab identifier
                      <Input
                        value={section.id}
                        onChange={(event) =>
                          setScopeSections((current) =>
                            current.map((item, sectionIndex) =>
                              sectionIndex === index
                                ? { ...item, id: event.target.value }
                                : item,
                            ),
                          )
                        }
                        maxLength={100}
                        required
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-gray-700">
                      Included items
                      <textarea
                        className={`${fieldClassName} min-h-32 resize-y`}
                        value={section.includedItemsText}
                        onChange={(event) =>
                          setScopeSections((current) =>
                            current.map((item, sectionIndex) =>
                              sectionIndex === index
                                ? { ...item, includedItemsText: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="One item per line"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-gray-700">
                      Not-included items
                      <textarea
                        className={`${fieldClassName} min-h-32 resize-y`}
                        value={section.notIncludedItemsText}
                        onChange={(event) =>
                          setScopeSections((current) =>
                            current.map((item, sectionIndex) =>
                              sectionIndex === index
                                ? { ...item, notIncludedItemsText: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="One item per line"
                      />
                    </label>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setScopeSections((current) => [
                  ...current,
                  {
                    id: `${editingScopeCategory?.slug || 'scope'}-${Date.now()}`,
                    label: '',
                    includedItemsText: '',
                    notIncludedItemsText: '',
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Add scope tab
            </Button>
            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingScopeCategory(null)}
                disabled={scopeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 text-white hover:bg-amber-700"
                disabled={scopeMutation.isPending}
              >
                {scopeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Save app scope
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              “{editingService?.name}” will be deactivated and removed from the customer app.
              Existing bookings and service history will be preserved. You can find it under
              Show inactive and reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isServiceUpdatePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                softDeleteService();
              }}
              disabled={isServiceUpdatePending}
            >
              {isServiceUpdatePending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Deactivate service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
