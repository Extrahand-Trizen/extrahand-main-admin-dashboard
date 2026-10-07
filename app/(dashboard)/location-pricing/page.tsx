"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, MapPinned, Pencil, Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type PriceGroup = {
  key: string;
  location: LocationRecord;
  rows: Array<{ rule: HourlyPriceRule; sku: PriceRuleSku | null }>;
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
  if (diff === 0) return <span className="text-gray-500">Same as default</span>;
  return (
    <span className={diff < 0 ? "text-green-700" : "text-amber-700"}>
      {formatCurrency(Math.abs(diff))} {diff < 0 ? "below" : "above"} default
    </span>
  );
}

export default function LocationPricingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const canLoad = isSuperAdmin && !authLoading;

  const [filter, setFilter] = useState("");
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
  const locationsByKey = useMemo(
    () => new Map((locationsQuery.data?.data || []).map((location) => [locationKey(location.type, location._id), location])),
    [locationsQuery.data?.data],
  );
  const categorySkus = useMemo(
    () => (categorySkusQuery.data?.data || []).filter((sku) => sku.isActive).sort(compareSkus),
    [categorySkusQuery.data?.data],
  );
  const visibleCategorySkus = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) return categorySkus;
    return categorySkus.filter((sku) => `${sku.name} ${sku.slug}`.toLowerCase().includes(term));
  }, [categorySkus, serviceSearch]);

  const groups = useMemo<PriceGroup[]>(() => {
    const byLocation = new Map<string, PriceGroup>();
    for (const rule of allRules) {
      if (!rule.isActive) continue;
      const key = locationKey(rule.locationType, rule.locationId);
      let group = byLocation.get(key);
      if (!group) {
        const location = locationsByKey.get(key) ?? { _id: rule.locationId, type: rule.locationType, isActive: true };
        group = { key, location, rows: [] };
        byLocation.set(key, group);
      }
      group.rows.push({ rule, sku: rule.sku ?? null });
    }
    const result = Array.from(byLocation.values());
    result.forEach((group) =>
      group.rows.sort(
        (a, b) =>
          (a.sku?.parentCategoryName ?? "").localeCompare(b.sku?.parentCategoryName ?? "") ||
          (a.sku?.subcategoryName ?? "").localeCompare(b.sku?.subcategoryName ?? "") ||
          (a.sku && b.sku ? compareSkus(a.sku, b.sku) : 0),
      ),
    );
    return result.sort((a, b) => locationName(a.location).localeCompare(locationName(b.location)));
  }, [allRules, locationsByKey]);

  const filteredGroups = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return groups;
    return groups
      .map((group) => {
        const locationMatches = [locationName(group.location), locationContext(group.location), group.location.type]
          .join(" ")
          .toLowerCase()
          .includes(term);
        if (locationMatches) return group;
        const rows = group.rows.filter(({ sku }) =>
          `${sku?.name ?? ""} ${sku?.parentCategoryName ?? ""} ${sku?.subcategoryName ?? ""}`.toLowerCase().includes(term),
        );
        return rows.length ? { ...group, rows } : null;
      })
      .filter((group): group is PriceGroup => Boolean(group));
  }, [filter, groups]);

  const totalActivePrices = groups.reduce((sum, group) => sum + group.rows.length, 0);

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

  const openDialog = (preset?: { location: LocationRecord; sku: PriceRuleSku }) => {
    setDialogLocation(preset?.location ?? null);
    setDialogGroupId(preset?.sku.parentCategoryId ?? null);
    setDialogSubcategoryId(preset?.sku.subcategoryId ?? null);
    setDialogSkuId(preset?.sku._id ?? null);
    setServiceSearch("");
    const presetRule = preset
      ? rulesByKey.get(ruleKey(preset.sku._id, preset.location.type, preset.location._id))
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
      // A reset rule still occupies the unique SKU + location slot, so it must be reactivated rather than recreated.
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
      toast.success(
        `${dialogSku?.name ?? "Service"} price for ${
          dialogLocation ? locationName(dialogLocation) : "location"
        } set to ${formatCurrency(offerPrice)}`,
      );
      setDialogOpen(false);
      await Promise.all([invalidatePrices(), queryClient.invalidateQueries({ queryKey: [LOCATIONS_QUERY_KEY] })]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: async (target: ResetTarget) => {
      await updateHourlyPrice(target.rule._id, { isActive: false });
    },
    onSuccess: async (_data, target) => {
      toast.success(`${target.sku?.name ?? "Service"} price reset for ${locationName(target.location)}`);
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
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapPinned className="h-6 w-6 text-yellow-600" />
          <div>
            <h1 className="text-2xl font-semibold">Location &amp; Pricing</h1>
            <p className="text-sm text-gray-500">Book Now service prices set for specific areas, pincodes and cities.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={isRefreshing} onClick={() => void refreshAll()}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Set new price
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Updated prices</CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                {isLoadingList
                  ? "Loading..."
                  : `${totalActivePrices} active price${totalActivePrices === 1 ? "" : "s"} across ${groups.length} location${groups.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {groups.length > 0 ? (
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Filter by location or service..."
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingList ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading updated prices...
            </div>
          ) : hasListError ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">Could not load location prices.</p>
              <Button variant="outline" onClick={() => void refreshAll()}>
                Try again
              </Button>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-base font-medium text-gray-700">No location prices set yet.</p>
              <p className="mt-1 text-sm text-gray-500">
                Click <span className="font-medium">Set new price</span> to add a price for an area, pincode or city.
              </p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No prices match &quot;{filter.trim()}&quot;.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Default price</TableHead>
                  <TableHead>Location price</TableHead>
                  <TableHead>Difference</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <Fragment key={group.key}>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableCell colSpan={6} className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin className="h-4 w-4 text-yellow-600" />
                          <span className="font-semibold text-gray-900">{locationName(group.location)}</span>
                          <Badge variant="outline" className="capitalize">{group.location.type}</Badge>
                          {locationContext(group.location) ? (
                            <span className="text-xs text-gray-500">{locationContext(group.location)}</span>
                          ) : null}
                          <span className="ml-auto text-xs text-gray-500">
                            {group.rows.length} price{group.rows.length === 1 ? "" : "s"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {group.rows.map(({ rule, sku }) => (
                      <TableRow key={rule._id}>
                        <TableCell>
                          <div className="font-medium">{sku?.name ?? "Unknown service"}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {sku ? (
                              <>
                                <Badge variant="secondary">{sku.parentCategoryName || sku.categoryName || "Uncategorised"}</Badge>
                                {sku.subcategoryName && sku.subcategoryName !== sku.parentCategoryName ? (
                                  <span>{sku.subcategoryName}</span>
                                ) : null}
                                <span>{serviceDetail(sku)}</span>
                              </>
                            ) : (
                              rule.skuId
                            )}
                            {sku && !sku.isActive ? <Badge variant="outline">Inactive service</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {sku ? (
                            <>
                              <div>{formatCurrency(sku.defaultPrice)}</div>
                              {sku.basePrice > sku.defaultPrice ? (
                                <div className="text-xs line-through">{formatCurrency(sku.basePrice)}</div>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-base font-semibold">{formatCurrency(rule.offerPrice)}</TableCell>
                        <TableCell>
                          {sku ? <PriceDifference defaultPrice={sku.defaultPrice} price={rule.offerPrice} /> : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {rule.updatedAt ? formatDateTime(rule.updatedAt) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={!sku?.isActive}
                              onClick={() => sku && openDialog({ location: group.location, sku })}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Set new price
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setResetTarget({ rule, sku, location: group.location })}
                            >
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                              Reset
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && (setPriceMutation.isPending || isProvisioning)) return;
          setDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <form onSubmit={submitPrice} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Set new price</DialogTitle>
              <DialogDescription>Choose a location, category, and subcategory, then set the price for a package.</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label>Location</Label>
              {dialogLocation ? (
                <div className="flex items-start justify-between gap-3 rounded-md border bg-gray-50 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{locationName(dialogLocation)}</span>
                      <Badge variant="outline" className="capitalize">{dialogLocation.type}</Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {dialogLocation.formattedAddress || locationContext(dialogLocation) || "Canonical location"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
                      className="pl-9"
                      placeholder="Search area, locality, city or pincode..."
                      value={locationSearch}
                      autoFocus
                      onChange={(event) => setLocationSearch(event.target.value)}
                    />
                  </div>
                  {locationSearch.trim().length > 0 && locationSearch.trim().length < 2 ? (
                    <p className="text-xs text-gray-500">Type at least 2 characters.</p>
                  ) : null}
                  {isSearchingLocations && locationSearch.trim().length >= 2 ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching locations...
                    </div>
                  ) : null}
                  {!isSearchingLocations && locationSearch.trim().length >= 2 && googleLocations.length === 0 ? (
                    <p className="text-sm text-gray-500">No locations found. Try a city, area, pincode or landmark.</p>
                  ) : null}
                  {!isSearchingLocations && googleLocations.length > 0 ? (
                    <div className="max-h-56 divide-y overflow-y-auto rounded-md border bg-white">
                      {googleLocations.map((location) => (
                        <button
                          key={location.placeId}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-yellow-50 disabled:opacity-60"
                          disabled={isProvisioning}
                          onClick={() => void selectGoogleLocation(location)}
                        >
                          <div className="pr-3">
                            <div className="text-sm font-medium text-gray-900">{location.name}</div>
                            <div className="text-xs text-gray-500">
                              {[location.area, location.city, location.state, location.pincode].filter(Boolean).join(", ") ||
                                location.address}
                            </div>
                          </div>
                          {isProvisioning ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              {dialogLocation && !dialogPricingType ? (
                <p className="text-sm text-red-600">Prices can only be set for an area, pincode or city.</p>
              ) : null}
            </div>

            {dialogLocation && dialogPricingType ? (
              <div className="space-y-2">
                <Label>Category</Label>
                {categoriesQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : categoriesQuery.isError ? (
                  <p className="text-sm text-red-600">Could not load categories.</p>
                ) : (
                  <Select value={dialogGroupId ?? undefined} onValueChange={selectGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : null}

            {dialogLocation && dialogPricingType && selectedGroup ? (
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select value={dialogSubcategoryId ?? undefined} onValueChange={selectSubcategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedGroup.subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {dialogLocation && dialogPricingType && selectedSubcategory ? (
              <div className="space-y-2">
                <Label>Package</Label>
                {categorySkusQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading packages...
                  </div>
                ) : categorySkusQuery.isError ? (
                  <p className="text-sm text-red-600">Could not load packages for this subcategory.</p>
                ) : categorySkus.length === 0 ? (
                  <p className="text-sm text-gray-500">No packages in this subcategory.</p>
                ) : (
                  <>
                    {categorySkus.length > SERVICE_SEARCH_THRESHOLD ? (
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          className="pl-9"
                          placeholder="Search packages..."
                          value={serviceSearch}
                          onChange={(event) => setServiceSearch(event.target.value)}
                        />
                      </div>
                    ) : null}
                    <div className="max-h-64 divide-y overflow-y-auto rounded-md border bg-white">
                      {visibleCategorySkus.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-gray-500">No services match &quot;{serviceSearch.trim()}&quot;.</p>
                      ) : (
                        visibleCategorySkus.map((sku) => {
                          const rule = activeRuleFor(sku._id);
                          const selected = dialogSkuId === sku._id;
                          return (
                            <button
                              key={sku._id}
                              type="button"
                              onClick={() => selectSku(sku._id)}
                              className={cn(
                                "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
                                selected ? "bg-yellow-50 ring-1 ring-inset ring-yellow-600" : "hover:bg-gray-50",
                              )}
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900">{sku.name}</div>
                                <div className="text-xs text-gray-500">{serviceDetail(sku)}</div>
                              </div>
                              <div className="shrink-0 text-right text-xs">
                                <div className="text-gray-500">Default {formatCurrency(sku.defaultPrice)}</div>
                                <div className={rule ? "font-medium text-green-700" : "text-gray-400"}>
                                  {rule ? `Now ${formatCurrency(rule.offerPrice)}` : "No location price"}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {dialogSku && dialogLocation && dialogPricingType ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3 rounded-md border bg-gray-50 p-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Default price</div>
                    <div className="mt-0.5 font-semibold">{formatCurrency(dialogSku.defaultPrice)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Current location price</div>
                    <div className="mt-0.5 font-semibold">
                      {dialogActiveRule ? formatCurrency(dialogActiveRule.offerPrice) : "Not set"}
                    </div>
                  </div>
                </div>
                <Label htmlFor="location-price-input">New price (INR)</Label>
                <Input
                  id="location-price-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  autoFocus
                  placeholder="Enter price"
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  aria-invalid={Boolean(trimmedPrice && priceError)}
                />
                {trimmedPrice && priceError ? (
                  <p className="text-sm text-red-600">{priceError}</p>
                ) : isUnchanged ? (
                  <p className="text-sm text-gray-500">This is already the current location price.</p>
                ) : !priceError ? (
                  <p className="text-sm">
                    <PriceDifference defaultPrice={dialogSku.defaultPrice} price={parsedPrice} />
                  </p>
                ) : null}
                {dialogSku.pricingUnit !== "hourly" ? (
                  <p className="text-xs text-gray-500">
                    Size or type options for this service (for example bathrooms or sofa seats) scale by the same percentage.
                  </p>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={setPriceMutation.isPending}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSave}>
                {setPriceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save price
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open && !resetMutation.isPending) setResetTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset location price?</AlertDialogTitle>
            <AlertDialogDescription>
              {resetTarget
                ? `${resetTarget.sku?.name ?? "This service"} in ${locationName(
                    resetTarget.location,
                  )} will stop using its location price of ${formatCurrency(resetTarget.rule.offerPrice)} and go back to the default price.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={resetMutation.isPending}
              onClick={() => resetTarget && resetMutation.mutate(resetTarget)}
            >
              {resetMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reset price
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
