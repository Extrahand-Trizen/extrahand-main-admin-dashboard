"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Loader2,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  SlidersHorizontal,
  Tag,
  Building2,
  X,
  ArrowRight,
  Info,
  Check,
  Package,
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import {
  createHourlyPrice,
  ensureGoogleLocation,
  listHourlyPrices,
  listLocations,
  listPricingCategories,
  listPricingSkus,
  searchLocations,
  updateHourlyPrice,
  type GoogleLocationResult,
  type HourlyPriceRule,
  type LocationRecord,
  type PriceRuleSku,
  type PricingLocationType,
  type PricingSku,
} from "@/lib/api/location-pricing";

type LocationSummary = {
  key: string;
  location: LocationRecord;
  activeRuleCount: number;
  hourlyOverrideCount: number;
  packageOverrideCount: number;
};

type LocationRowItem = {
  rule: HourlyPriceRule;
  sku: PriceRuleSku | null;
};

type ResetTarget = { rule: HourlyPriceRule; sku: PriceRuleSku | null; location: LocationRecord };

const PRICES_QUERY_KEY = "location-pricing-hourly-prices";
const CATEGORIES_QUERY_KEY = "location-pricing-categories";
const CATEGORY_SKUS_QUERY_KEY = "location-pricing-category-skus";
const LOCATIONS_QUERY_KEY = "location-pricing-locations";
const SERVICE_SEARCH_THRESHOLD = 8;

function locationKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function ruleKey(skuId: string, type: string, locationId: string): string {
  return `${skuId}:${type}:${locationId}`;
}

function locationName(location: LocationRecord): string {
  return location.displayName || location.canonicalName || location.pincode || location._id;
}

function locationContext(location: LocationRecord): string {
  if (location.city || location.state || location.pincode || location.country) {
    return [location.city, location.state, location.pincode, location.country].filter(Boolean).join(", ");
  }
  const state = typeof location.stateId === "object" ? location.stateId.displayName : "";
  const city = typeof location.cityId === "object" ? location.cityId.displayName : "";
  return [city, state, location.type === "pincode" ? "" : location.pincode].filter(Boolean).join(", ");
}

function pricingType(location: LocationRecord): PricingLocationType | null {
  return location.type === "area" || location.type === "pincode" || location.type === "city" ? location.type : null;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr${hours === 1 ? "" : "s"}`;
}

function serviceDetail(sku: Pick<PricingSku, "pricingUnit" | "durationMinutes">): string {
  if (sku.pricingUnit === "hourly" && sku.durationMinutes) return `Hourly · ${formatDuration(sku.durationMinutes)}`;
  return "Fixed price";
}

function compareSkus(a: PricingSku, b: PricingSku): number {
  return (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0) || a.name.localeCompare(b.name);
}

function PriceDifference({ defaultPrice, price }: { defaultPrice: number; price: number }) {
  const diff = price - defaultPrice;
  if (diff === 0) return <span className="text-blue-700 font-medium">Matches default</span>;
  return (
    <span className={cn("font-medium text-xs", diff < 0 ? "text-emerald-700" : "text-amber-700")}>
      {formatCurrency(Math.abs(diff))} {diff < 0 ? "below" : "above"} default
    </span>
  );
}

export default function LocationPricingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const canLoad = isSuperAdmin && !authLoading;

  // Selected Location context
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(null);
  
  // Location list filters
  const [locationSearchFilter, setLocationSearchFilter] = useState("");
  const [locationTypeFilter, setLocationTypeFilter] = useState<string>("all");

  // Service workspace filters
  const [serviceSearchFilter, setServiceSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Add / Edit Modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLocation, setDialogLocation] = useState<LocationRecord | null>(null);
  const [dialogGroupId, setDialogGroupId] = useState<string | null>(null);
  const [dialogSubcategoryId, setDialogSubcategoryId] = useState<string | null>(null);
  const [dialogSkuId, setDialogSkuId] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Reset confirmation state
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedLocationSearch(locationSearch.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [locationSearch]);

  const pricesQuery = useQuery({
    queryKey: [PRICES_QUERY_KEY],
    queryFn: () => listHourlyPrices(),
    enabled: canLoad,
  });

  const locationsQuery = useQuery({
    queryKey: [LOCATIONS_QUERY_KEY],
    queryFn: () => listLocations(),
    enabled: canLoad,
    staleTime: 60000,
  });

  const categoriesQuery = useQuery({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: listPricingCategories,
    enabled: canLoad,
    staleTime: 60000,
  });

  const googleQuery = useQuery({
    queryKey: ["location-pricing-google-search", debouncedLocationSearch],
    queryFn: () => searchLocations(debouncedLocationSearch),
    enabled: canLoad && dialogOpen && !dialogLocation && debouncedLocationSearch.length >= 2,
    staleTime: 30000,
  });

  const categories = useMemo(() => categoriesQuery.data?.data || [], [categoriesQuery.data?.data]);
  const selectedGroup = categories.find((group) => group.id === dialogGroupId) ?? null;
  const selectedSubcategory = selectedGroup?.subcategories.find((item) => item.id === dialogSubcategoryId) ?? null;

  const categorySkusQuery = useQuery({
    queryKey: [CATEGORY_SKUS_QUERY_KEY, selectedSubcategory?.categoryId, selectedSubcategory?.sectionId],
    queryFn: () => listPricingSkus(selectedSubcategory!.categoryId, selectedSubcategory?.sectionId),
    enabled: canLoad && dialogOpen && Boolean(selectedSubcategory),
    staleTime: 60000,
  });

  const allRules = useMemo(() => pricesQuery.data?.data || [], [pricesQuery.data?.data]);
  
  const rulesByKey = useMemo(
    () => new Map(allRules.map((rule) => [ruleKey(rule.skuId, rule.locationType, rule.locationId), rule])),
    [allRules],
  );

  const ruleSkusById = useMemo(() => {
    const map = new Map<string, PriceRuleSku>();
    for (const rule of allRules) if (rule.sku) map.set(rule.skuId, rule.sku);
    return map;
  }, [allRules]);

  const locationsByKey = useMemo(() => {
    const map = new Map<string, LocationRecord>();
    for (const loc of locationsQuery.data?.data || []) {
      map.set(locationKey(loc.type, loc._id), loc);
    }
    for (const rule of allRules) {
      const key = locationKey(rule.locationType, rule.locationId);
      if (!map.has(key)) {
        map.set(key, { _id: rule.locationId, type: rule.locationType, isActive: true });
      }
    }
    return map;
  }, [locationsQuery.data?.data, allRules]);

  const categorySkus = useMemo(
    () => (categorySkusQuery.data?.data || []).filter((sku) => sku.isActive).sort(compareSkus),
    [categorySkusQuery.data?.data],
  );

  const visibleCategorySkus = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) return categorySkus;
    return categorySkus.filter((sku) => `${sku.name} ${sku.slug}`.toLowerCase().includes(term));
  }, [categorySkus, serviceSearch]);

  // Aggregate ONLY locations that have active configured rules for the sidebar
  const availableLocations = useMemo<LocationSummary[]>(() => {
    const locationMap = new Map<string, LocationSummary>();

    for (const rule of allRules) {
      if (!rule.isActive) continue;
      const key = locationKey(rule.locationType, rule.locationId);
      let item = locationMap.get(key);
      if (!item) {
        const location = locationsByKey.get(key) ?? { _id: rule.locationId, type: rule.locationType, isActive: true };
        item = {
          key,
          location,
          activeRuleCount: 0,
          hourlyOverrideCount: 0,
          packageOverrideCount: 0,
        };
        locationMap.set(key, item);
      }
      item.activeRuleCount += 1;
      if (rule.sku?.pricingUnit === "hourly") {
        item.hourlyOverrideCount += 1;
      } else {
        item.packageOverrideCount += 1;
      }
    }

    return Array.from(locationMap.values()).sort((a, b) => {
      if (b.activeRuleCount !== a.activeRuleCount) return b.activeRuleCount - a.activeRuleCount;
      return locationName(a.location).localeCompare(locationName(b.location));
    });
  }, [allRules, locationsByKey]);

  // Auto-select first configured location if none selected
  useEffect(() => {
    if (!selectedLocationKey && availableLocations.length > 0) {
      setSelectedLocationKey(availableLocations[0].key);
    }
  }, [availableLocations, selectedLocationKey]);

  // Filter locations sidebar list
  const filteredLocations = useMemo(() => {
    const term = locationSearchFilter.trim().toLowerCase();
    return availableLocations.filter((item) => {
      if (locationTypeFilter !== "all" && item.location.type !== locationTypeFilter) {
        return false;
      }
      if (!term) return true;
      const fullText = `${locationName(item.location)} ${locationContext(item.location)} ${item.location.type}`.toLowerCase();
      return fullText.includes(term);
    });
  }, [availableLocations, locationSearchFilter, locationTypeFilter]);

  // Currently selected location object
  const activeLocationSummary = useMemo(
    () => availableLocations.find((item) => item.key === selectedLocationKey) ?? null,
    [availableLocations, selectedLocationKey],
  );

  // Rows for the currently selected location
  const selectedLocationRows = useMemo<LocationRowItem[]>(() => {
    if (!selectedLocationKey) return [];
    const rows: LocationRowItem[] = [];
    for (const rule of allRules) {
      if (!rule.isActive) continue;
      const key = locationKey(rule.locationType, rule.locationId);
      if (key === selectedLocationKey) {
        rows.push({ rule, sku: rule.sku ?? null });
      }
    }
    return rows.sort(
      (a, b) =>
        (a.sku?.parentCategoryName ?? "").localeCompare(b.sku?.parentCategoryName ?? "") ||
        (a.sku?.subcategoryName ?? "").localeCompare(b.sku?.subcategoryName ?? "") ||
        (a.sku && b.sku ? compareSkus(a.sku, b.sku) : 0),
    );
  }, [allRules, selectedLocationKey]);

  // Filtered rows in current location workspace
  const filteredLocationRows = useMemo(() => {
    const term = serviceSearchFilter.trim().toLowerCase();
    return selectedLocationRows.filter(({ rule, sku }) => {
      if (categoryFilter !== "all") {
        const parentId = sku?.parentCategoryId || sku?.categorySlug;
        if (parentId !== categoryFilter) return false;
      }

      if (statusFilter !== "all" && sku) {
        const isCustom = rule.offerPrice !== sku.defaultPrice;
        if (statusFilter === "custom" && !isCustom) return false;
        if (statusFilter === "matches_global" && isCustom) return false;
      }

      if (!term) return true;
      const fullText = `${sku?.name ?? ""} ${sku?.parentCategoryName ?? ""} ${sku?.subcategoryName ?? ""}`.toLowerCase();
      return fullText.includes(term);
    });
  }, [selectedLocationRows, serviceSearchFilter, categoryFilter, statusFilter]);

  // Exactly 3 Metric Statistics
  const metrics = useMemo(() => {
    const activeRules = allRules.filter((r) => r.isActive);
    const locationsWithRules = availableLocations.length;
    const hourlyCount = activeRules.filter((r) => r.sku?.pricingUnit === "hourly").length;
    const bookNowCount = activeRules.filter((r) => r.sku?.pricingUnit !== "hourly").length;

    return {
      locationsWithRules,
      hourlyCount,
      bookNowCount,
    };
  }, [allRules, availableLocations]);

  // Modal SKU selections & helper values
  const dialogPricingType = dialogLocation ? pricingType(dialogLocation) : null;
  const dialogSku: PricingSku | null = dialogSkuId
    ? categorySkus.find((sku) => sku._id === dialogSkuId) ?? ruleSkusById.get(dialogSkuId) ?? null
    : null;
  const dialogRule =
    dialogLocation && dialogPricingType && dialogSkuId
      ? rulesByKey.get(ruleKey(dialogSkuId, dialogPricingType, dialogLocation._id)) ?? null
      : null;
  const dialogActiveRule = dialogRule?.isActive ? dialogRule : null;

  const activeRuleFor = (skuId: string): HourlyPriceRule | null => {
    if (!dialogLocation || !dialogPricingType) return null;
    const rule = rulesByKey.get(ruleKey(skuId, dialogPricingType, dialogLocation._id));
    return rule?.isActive ? rule : null;
  };

  const invalidatePrices = () => queryClient.invalidateQueries({ queryKey: [PRICES_QUERY_KEY] });

  const refreshAll = () =>
    Promise.all([
      invalidatePrices(),
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: [CATEGORY_SKUS_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_QUERY_KEY] }),
    ]);

  const openDialog = (preset?: { location?: LocationRecord; sku?: PriceRuleSku }) => {
    const targetLocation = preset?.location ?? activeLocationSummary?.location ?? null;
    setDialogLocation(targetLocation);
    setDialogGroupId(preset?.sku?.parentCategoryId ?? null);
    setDialogSubcategoryId(preset?.sku?.subcategoryId ?? null);
    setDialogSkuId(preset?.sku?._id ?? null);
    setServiceSearch("");
    const presetRule = preset?.sku && targetLocation
      ? rulesByKey.get(ruleKey(preset.sku._id, targetLocation.type, targetLocation._id))
      : undefined;
    setPriceInput(presetRule?.isActive ? String(presetRule.offerPrice) : "");
    setLocationSearch("");
    setDebouncedLocationSearch("");
    setDialogOpen(true);
  };

  const selectGroup = (groupId: string) => {
    const group = categories.find((item) => item.id === groupId);
    const onlySubcategory = group?.subcategories.length === 1 ? group.subcategories[0] : null;
    setDialogGroupId(groupId);
    setDialogSubcategoryId(onlySubcategory?.id ?? null);
    setDialogSkuId(null);
    setServiceSearch("");
    setPriceInput("");
  };

  const selectSubcategory = (subcategoryId: string) => {
    setDialogSubcategoryId(subcategoryId);
    setDialogSkuId(null);
    setServiceSearch("");
    setPriceInput("");
  };

  const selectSku = (skuId: string) => {
    setDialogSkuId(skuId);
    const rule = activeRuleFor(skuId);
    setPriceInput(rule ? String(rule.offerPrice) : "");
  };

  const selectGoogleLocation = async (result: GoogleLocationResult) => {
    try {
      setIsProvisioning(true);
      const response = await ensureGoogleLocation(result);
      if (!response.data) throw new Error("Could not map this location");
      setDialogLocation(response.data);
      const rule = dialogSkuId && pricingType(response.data)
        ? rulesByKey.get(ruleKey(dialogSkuId, response.data.type, response.data._id))
        : undefined;
      setPriceInput(rule?.isActive ? String(rule.offerPrice) : "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to configure location");
    } finally {
      setIsProvisioning(false);
    }
  };

  const setPriceMutation = useMutation({
    mutationFn: async ({ offerPrice }: { offerPrice: number }) => {
      if (!dialogLocation || !dialogPricingType) throw new Error("Select an area, pincode, or city first");
      if (!dialogSku) throw new Error("Select a service first");
      if (dialogRule) {
        await updateHourlyPrice(dialogRule._id, dialogRule.isActive ? { offerPrice } : { offerPrice, isActive: true });
        return;
      }
      await createHourlyPrice({
        skuId: dialogSku._id,
        locationType: dialogPricingType,
        locationId: dialogLocation._id,
        offerPrice,
      });
    },
    onSuccess: async (_data, { offerPrice }) => {
      const locKey = dialogLocation ? locationKey(dialogLocation.type, dialogLocation._id) : null;
      toast.success(
        `${dialogSku?.name ?? "Service"} price for ${
          dialogLocation ? locationName(dialogLocation) : "location"
        } set to ${formatCurrency(offerPrice)}`,
      );
      setDialogOpen(false);
      await Promise.all([invalidatePrices(), queryClient.invalidateQueries({ queryKey: [LOCATIONS_QUERY_KEY] })]);
      if (locKey) {
        setSelectedLocationKey(locKey);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: async (target: ResetTarget) => {
      await updateHourlyPrice(target.rule._id, { isActive: false });
    },
    onSuccess: async (_data, target) => {
      toast.success(`${target.sku?.name ?? "Service"} price reset to global default for ${locationName(target.location)}`);
      setResetTarget(null);
      await invalidatePrices();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const trimmedPrice = priceInput.trim();
  const parsedPrice = trimmedPrice === "" ? NaN : Number(trimmedPrice);
  const priceError =
    trimmedPrice === ""
      ? "Enter a price"
      : !Number.isFinite(parsedPrice) || parsedPrice < 0
        ? "Enter a valid non-negative price"
        : !Number.isInteger(parsedPrice)
          ? "Enter a whole rupee amount"
          : null;
  const isUnchanged = Boolean(dialogActiveRule) && parsedPrice === dialogActiveRule?.offerPrice;
  const canSave =
    Boolean(dialogLocation && dialogPricingType && dialogSku) && !priceError && !isUnchanged && !setPriceMutation.isPending;

  const submitPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    setPriceMutation.mutate({ offerPrice: parsedPrice });
  };

  if (!authLoading && !isSuperAdmin) {
    router.replace("/dashboard");
    return null;
  }

  if (authLoading || !isSuperAdmin) {
    return <div className="p-8 text-sm text-gray-500">Checking access...</div>;
  }

  const isLoadingList = pricesQuery.isLoading || locationsQuery.isLoading;
  const hasListError = pricesQuery.isError;
  const isRefreshing = pricesQuery.isFetching || locationsQuery.isFetching || categoriesQuery.isFetching;
  const googleLocations = googleQuery.data?.data || [];
  const isSearchingLocations =
    !dialogLocation && (locationSearch.trim() !== debouncedLocationSearch || googleQuery.isFetching);

  return (
    <div className="space-y-5 p-5 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-600/20">
            <MapPinned className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">Location Pricing</h1>
            <p className="text-xs text-gray-500">
              Manage custom price overrides for Book Now packages and Hourly Based Work across active locations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs px-3" disabled={isRefreshing} onClick={() => void refreshAll()}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="h-8 text-xs px-3 bg-amber-600 hover:bg-amber-700 text-white shadow-xs font-semibold" onClick={() => router.push('/location-pricing/configure')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Location Pricing
          </Button>
        </div>
      </div>

      {/* 2. Sleeker, Compact 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="border-gray-200/80 shadow-2xs hover:shadow-xs transition-shadow bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">Configured Locations</p>
              <p className="mt-1 text-lg sm:text-xl font-extrabold text-gray-900">{metrics.locationsWithRules}</p>
            </div>
            <div className="h-8.5 w-8.5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200/80 shadow-2xs hover:shadow-xs transition-shadow bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">Hourly Work Overrides</p>
              <p className="mt-1 text-lg sm:text-xl font-extrabold text-emerald-700">{metrics.hourlyCount}</p>
            </div>
            <div className="h-8.5 w-8.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200/80 shadow-2xs hover:shadow-xs transition-shadow bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">Book Now Overrides</p>
              <p className="mt-1 text-lg sm:text-xl font-extrabold text-amber-700">{metrics.bookNowCount}</p>
            </div>
            <div className="h-8.5 w-8.5 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Location-Centric Master-Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Location Navigation Panel (Configured Locations ONLY) */}
        <Card className="lg:col-span-4 xl:col-span-3 border-gray-200/80 shadow-2xs">
          <CardHeader className="p-3.5 pb-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-gray-900">
                Configured Locations
              </span>
              <Badge variant="secondary" className="font-bold text-[10px] bg-amber-100 text-amber-800 border-0 shrink-0 px-1.5 py-0.5">
                {availableLocations.length} active
              </Badge>
            </div>
            <CardDescription className="text-xs text-gray-500">
              Locations with custom rates
            </CardDescription>

            <div className="space-y-1.5 mt-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  className="pl-8 h-7 text-xs bg-gray-50/70 border-gray-200 focus:bg-white"
                  placeholder="Filter locations..."
                  value={locationSearchFilter}
                  onChange={(e) => setLocationSearchFilter(e.target.value)}
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pt-0.5">
                {(["all", "area", "city", "pincode"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLocationTypeFilter(type)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] rounded font-medium capitalize transition-colors shrink-0",
                      locationTypeFilter === type
                        ? "bg-amber-100 text-amber-800 font-bold"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-1.5 max-h-[550px] overflow-y-auto divide-y divide-gray-100">
            {isLoadingList ? (
              <div className="py-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                Loading locations...
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="py-6 text-center px-3">
                <div className="mx-auto h-7 w-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-semibold text-gray-700">No configured locations</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Add a price override to get started.</p>
                <Button
                  size="sm"
                  className="mt-2.5 text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white w-full shadow-2xs font-medium"
                  onClick={() => router.push('/location-pricing/configure')}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Location Pricing
                </Button>
              </div>
            ) : (
              filteredLocations.map((item) => {
                const isSelected = item.key === selectedLocationKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedLocationKey(item.key)}
                    className={cn(
                      "w-full text-left p-2 rounded-md transition-all flex items-center justify-between gap-2 my-0.5",
                      isSelected
                        ? "bg-amber-50/90 border-l-3 border-l-amber-600 border-amber-200 shadow-2xs"
                        : "hover:bg-gray-50 border border-transparent",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className={cn("h-3 w-3 shrink-0", isSelected ? "text-amber-700" : "text-gray-400")} />
                        <span className={cn("text-xs font-semibold truncate", isSelected ? "text-amber-950" : "text-gray-900")}>
                          {locationName(item.location)}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize shrink-0 font-normal border-gray-200">
                          {item.location.type}
                        </Badge>
                      </div>
                      {locationContext(item.location) ? (
                        <p className="text-[10px] text-gray-500 truncate mt-0.5 pl-4">
                          {locationContext(item.location)}
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0 font-bold hover:bg-emerald-100 border-0">
                        {item.activeRuleCount} {item.activeRuleCount === 1 ? "price" : "prices"}
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Column: Selected Location Workspace & Pricing Table */}
        <Card className="lg:col-span-8 xl:col-span-9 border-gray-200/80 shadow-2xs">
          {activeLocationSummary ? (
            <>
              <CardHeader className="p-3.5 pb-2.5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-600" />
                      <h2 className="text-sm font-bold text-gray-900">
                        {locationName(activeLocationSummary.location)}
                      </h2>
                      <Badge variant="outline" className="capitalize font-semibold text-[9px] bg-white px-1.5 py-0">
                        {activeLocationSummary.location.type}
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[9px] font-bold border-0 px-1.5 py-0">
                        {activeLocationSummary.activeRuleCount} custom rate{activeLocationSummary.activeRuleCount === 1 ? "" : "s"} configured
                      </Badge>
                    </div>
                    {locationContext(activeLocationSummary.location) ? (
                      <p className="text-[11px] text-gray-500 mt-0.5 pl-6">
                        {locationContext(activeLocationSummary.location)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Filters for Services within selected location */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-2.5 border-t border-gray-200/60">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      className="pl-8 h-7 text-xs bg-white border-gray-200"
                      placeholder="Search service..."
                      value={serviceSearchFilter}
                      onChange={(e) => setServiceSearchFilter(e.target.value)}
                    />
                  </div>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-7 text-xs bg-white border-gray-200">
                      <SelectValue placeholder="Category Filter" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-60 overflow-y-auto z-[150] bg-white border border-gray-200 shadow-lg text-xs">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-7 text-xs bg-white border-gray-200">
                      <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-60 overflow-y-auto z-[150] bg-white border border-gray-200 shadow-lg text-xs">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="custom">Custom Prices Only</SelectItem>
                      <SelectItem value="matches_global">Matches Default Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoadingList ? (
                  <div className="py-10 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                    Loading custom prices for location...
                  </div>
                ) : hasListError ? (
                  <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    Failed to load pricing data. Please refresh.
                  </div>
                ) : selectedLocationRows.length === 0 ? (
                  <div className="py-10 text-center px-4">
                    <div className="mx-auto h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-900">No location prices configured yet</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 max-w-xs mx-auto">
                      All services in {locationName(activeLocationSummary.location)} currently use global default pricing.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 font-medium"
                      onClick={() => openDialog({ location: activeLocationSummary.location })}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Set First Custom Price
                    </Button>
                  </div>
                ) : filteredLocationRows.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-500">
                    No pricing rules match current filters.
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-gray-50/80">
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="text-xs sm:text-sm font-bold text-gray-800 py-3">Services</TableHead>
                        <TableHead className="text-xs sm:text-sm font-bold text-gray-800 py-3">Category</TableHead>
                        <TableHead className="text-xs sm:text-sm font-bold text-gray-800 py-3">Global Pricing</TableHead>
                        <TableHead className="text-xs sm:text-sm font-bold text-gray-800 py-3">Current Pricing</TableHead>
                        <TableHead className="text-xs sm:text-sm font-bold text-gray-800 py-3">Difference</TableHead>
                        <TableHead className="text-xs sm:text-sm font-bold text-gray-800 py-3 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLocationRows.map(({ rule, sku }) => {
                        return (
                          <TableRow key={rule._id} className="hover:bg-amber-50/20 transition-colors border-b border-gray-100">
                            {/* 1. Services */}
                            <TableCell className="py-3">
                              <div className="font-bold text-xs sm:text-sm text-gray-900">{sku?.name ?? "Unknown service"}</div>
                              <div className="text-xs text-gray-500 font-medium mt-0.5">{sku ? serviceDetail(sku) : rule.skuId}</div>
                            </TableCell>

                            {/* 2. Category */}
                            <TableCell className="py-3">
                              {sku ? (
                                <div>
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-semibold bg-gray-100 text-gray-800 border-0 rounded-md">
                                    {sku.parentCategoryName || sku.categoryName || "Uncategorised"}
                                  </Badge>
                                  {sku.subcategoryName && sku.subcategoryName !== sku.parentCategoryName ? (
                                    <div className="text-xs text-gray-500 mt-0.5">{sku.subcategoryName}</div>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </TableCell>

                            {/* 3. Global Pricing */}
                            <TableCell className="py-3 text-xs sm:text-sm text-gray-700 font-semibold">
                              {sku ? formatCurrency(sku.defaultPrice) : "—"}
                            </TableCell>

                            {/* 4. Current Pricing */}
                            <TableCell className="py-3 text-xs sm:text-sm font-extrabold text-gray-900">
                              {formatCurrency(rule.offerPrice)}
                            </TableCell>

                            {/* 5. Difference */}
                            <TableCell className="py-3 text-xs sm:text-sm">
                              {sku ? <PriceDifference defaultPrice={sku.defaultPrice} price={rule.offerPrice} /> : "—"}
                            </TableCell>

                            {/* 6. Actions (3-Dots Menu) */}
                            <TableCell className="py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                    <span className="sr-only">Open actions menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 bg-white border border-gray-200 shadow-lg text-xs">
                                  <DropdownMenuItem
                                    className="text-xs font-medium cursor-pointer py-1.5"
                                    disabled={!sku?.isActive}
                                    onClick={() =>
                                      sku &&
                                      router.push(
                                        `/location-pricing/configure?scope=location&skuId=${sku._id}&ruleId=${rule._id}&locationId=${activeLocationSummary.location._id}`
                                      )
                                    }
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5 text-gray-500" />
                                    Edit Rate Override
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-xs font-medium text-red-600 cursor-pointer py-1.5 focus:text-red-700 focus:bg-red-50"
                                    onClick={() => setResetTarget({ rule, sku, location: activeLocationSummary.location })}
                                  >
                                    <RotateCcw className="mr-2 h-3.5 w-3.5 text-red-500" />
                                    Reset to Global Default
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </>
          ) : (
            <div className="py-12 text-center px-4">
              <div className="mx-auto h-10 w-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-gray-900">Select a Location</h3>
              <p className="text-[11px] text-gray-500 mt-0.5 max-w-xs mx-auto">
                Choose a location from the left navigation panel or click Add Location Pricing to configure custom rates.
              </p>
              <Button
                size="sm"
                className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 font-medium"
                onClick={() => openDialog()}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Location Pricing
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* 4. Completely Redesigned Modal Form Layout */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && (setPriceMutation.isPending || isProvisioning)) return;
          setDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto p-0 border-0 shadow-2xl rounded-xl bg-white">
          <form onSubmit={submitPrice} className="space-y-0">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 bg-amber-50/40">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Tag className="h-4.5 w-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900">Configure Location Price</DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 mt-0.5">
                    Set a custom rate override for Book Now packages or Hourly Based Work.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Form Section 1: Location Banner or Google Search */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">1. Target Location</Label>
                {dialogLocation ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-amber-700 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{locationName(dialogLocation)}</span>
                          <Badge variant="outline" className="capitalize text-[10px] bg-white border-amber-300 text-amber-800">
                            {dialogLocation.type}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {dialogLocation.formattedAddress || locationContext(dialogLocation) || "Canonical location"}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shrink-0"
                      disabled={setPriceMutation.isPending}
                      onClick={() => {
                        setDialogLocation(null);
                        setPriceInput("");
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-9 text-xs h-9"
                        placeholder="Search area, locality, city or pincode..."
                        value={locationSearch}
                        autoFocus
                        onChange={(event) => setLocationSearch(event.target.value)}
                      />
                    </div>
                    {isSearchingLocations ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500 py-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" /> Searching locations...
                      </div>
                    ) : null}
                    {!isSearchingLocations && googleLocations.length > 0 ? (
                      <div className="max-h-44 divide-y overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                        {googleLocations.map((location) => (
                          <button
                            key={location.placeId}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-amber-50/80 disabled:opacity-60 text-xs transition-colors"
                            disabled={isProvisioning}
                            onClick={() => void selectGoogleLocation(location)}
                          >
                            <div>
                              <div className="font-semibold text-gray-900">{location.name}</div>
                              <div className="text-[11px] text-gray-500">
                                {[location.area, location.city, location.state, location.pincode].filter(Boolean).join(", ")}
                              </div>
                            </div>
                            {isProvisioning ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Form Section 2: Category & Subcategory Grid (2 Columns) */}
              {dialogLocation && dialogPricingType ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">2. Category</Label>
                    {categoriesQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" /> Loading...
                      </div>
                    ) : (
                      <Select value={dialogGroupId ?? undefined} onValueChange={selectGroup}>
                        <SelectTrigger className="text-xs bg-white h-9 border-gray-300">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" align="start" className="max-h-56 overflow-y-auto z-[250] bg-white border border-gray-200 shadow-xl text-xs rounded-lg">
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id} className="text-xs cursor-pointer py-1.5">
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">3. Subcategory</Label>
                    {!selectedGroup ? (
                      <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-xs text-gray-400">
                        Select category first
                      </div>
                    ) : (
                      <Select value={dialogSubcategoryId ?? undefined} onValueChange={selectSubcategory}>
                        <SelectTrigger className="text-xs bg-white h-9 border-gray-300">
                          <SelectValue placeholder="Select Subcategory" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" align="start" className="max-h-56 overflow-y-auto z-[250] bg-white border border-gray-200 shadow-xl text-xs rounded-lg">
                          {selectedGroup.subcategories.map((subcategory) => (
                            <SelectItem key={subcategory.id} value={subcategory.id} className="text-xs cursor-pointer py-1.5">
                              {subcategory.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Form Section 3: Package / Service Selection */}
              {dialogLocation && dialogPricingType && selectedSubcategory ? (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-bold text-gray-700">4. Service Package or Hourly Duration</Label>
                  {categorySkusQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 py-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" /> Loading services...
                    </div>
                  ) : categorySkus.length === 0 ? (
                    <p className="text-xs text-gray-500">No services in this subcategory.</p>
                  ) : (
                    <div className="space-y-2">
                      {categorySkus.length > SERVICE_SEARCH_THRESHOLD ? (
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            className="pl-8 text-xs h-8"
                            placeholder="Search service..."
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                          />
                        </div>
                      ) : null}

                      <div className="max-h-44 divide-y overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-2xs">
                        {visibleCategorySkus.map((sku) => {
                          const rule = activeRuleFor(sku._id);
                          const selected = dialogSkuId === sku._id;
                          return (
                            <button
                              key={sku._id}
                              type="button"
                              onClick={() => selectSku(sku._id)}
                              className={cn(
                                "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors text-xs",
                                selected
                                  ? "bg-amber-50/90 border-l-3 border-l-amber-600 font-semibold text-amber-950"
                                  : "hover:bg-gray-50 text-gray-800",
                              )}
                            >
                              <div>
                                <div className="font-semibold text-gray-900">{sku.name}</div>
                                <div className="text-[11px] text-gray-500 font-normal">{serviceDetail(sku)}</div>
                              </div>
                              <div className="shrink-0 text-right text-[11px]">
                                <div className="text-gray-500">Default {formatCurrency(sku.defaultPrice)}</div>
                                <div className={rule ? "font-bold text-emerald-700" : "text-gray-400 font-normal"}>
                                  {rule ? `Location: ${formatCurrency(rule.offerPrice)}` : "No override"}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Form Section 4: Price Input Panel & Summary */}
              {dialogSku && dialogLocation && dialogPricingType ? (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3.5 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-200/80 pb-2.5">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Global Default Price</div>
                        <div className="mt-0.5 text-sm font-extrabold text-gray-900">{formatCurrency(dialogSku.defaultPrice)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Current Location Rate</div>
                        <div className="mt-0.5 text-sm font-extrabold text-gray-900">
                          {dialogActiveRule ? formatCurrency(dialogActiveRule.offerPrice) : "Default (Unconfigured)"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="location-price-input" className="text-xs font-bold text-gray-800">
                        5. Enter New Location Rate (INR ₹)
                      </Label>
                      <Input
                        id="location-price-input"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        autoFocus
                        placeholder="Enter whole rupee amount (e.g. 250)"
                        className="text-base font-bold bg-white h-10 border-gray-300 focus:border-amber-500"
                        value={priceInput}
                        onChange={(event) => setPriceInput(event.target.value)}
                        aria-invalid={Boolean(trimmedPrice && priceError)}
                      />
                    </div>

                    {trimmedPrice && priceError ? (
                      <p className="text-xs text-red-600 font-medium">{priceError}</p>
                    ) : isUnchanged ? (
                      <p className="text-xs text-gray-500">This price matches the current active location rate.</p>
                    ) : !priceError ? (
                      <div className="text-xs flex items-center gap-2">
                        <span className="text-gray-500 font-medium">Difference Preview:</span>
                        <PriceDifference defaultPrice={dialogSku.defaultPrice} price={parsedPrice} />
                      </div>
                    ) : null}
                  </div>

                  {dialogSku.pricingUnit !== "hourly" ? (
                    <p className="text-[11px] text-gray-500 pl-1">
                      Note: Option multipliers (e.g. # of rooms or seats) scale proportionally by (Location Price / Default Price).
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 pl-1">
                      Note: This exact rate applies directly for this hourly duration without option scaling.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/50 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={setPriceMutation.isPending}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
                disabled={!canSave}
              >
                {setPriceMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Save Location Rate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Reset Confirmation Dialog */}
      <AlertDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open && !resetMutation.isPending) setResetTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Reset to Global Default Price?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              {resetTarget
                ? `${resetTarget.sku?.name ?? "This service"} in ${locationName(
                    resetTarget.location,
                  )} will stop using its custom location rate of ${formatCurrency(
                    resetTarget.rule.offerPrice,
                  )} and revert back to the global default price of ${
                    resetTarget.sku ? formatCurrency(resetTarget.sku.defaultPrice) : "the default catalog"
                  }.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={resetMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              disabled={resetMutation.isPending}
              onClick={() => resetTarget && resetMutation.mutate(resetTarget)}
            >
              {resetMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Reset to Global Default
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
