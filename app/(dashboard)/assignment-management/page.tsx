"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ApiResponse } from "@/types";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "sonner";
import { getLocationCatalog, ManagedLocation } from "@/lib/api/locations";
import { getTaskPostedEmailSettings } from "@/lib/api/admin";
import {
  getEligibleAssignmentPartners,
  getEligiblePartnerAreaData,
  getAssignmentRules,
  AssignmentRules,
  PartnerAddedBy,
  PartnerSearchResult,
  AreaAssignmentRule,
  removeAreaRule,
  reorderAreaRulePartner,
  saveAreaRule,
} from "@/lib/api/assignment-management";

function partnerId(partner: PartnerSearchResult): string {
  return String(partner._id || partner.profileId || partner.userId || "");
}

function partnerUid(partner: PartnerSearchResult): string {
  return String(partner.uid || partner.userId || "");
}

function partnerName(partner: PartnerSearchResult): string {
  return partner.name || partner.fullName || "Partner";
}

function partnerInitials(partner: PartnerSearchResult): string {
  return partnerName(partner)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function aadhaarStatusLabel(partner: PartnerSearchResult): string {
  return partner.isAadhaarVerified === true ? "Aadhaar verified" : "Aadhaar not verified";
}

function addedByLabel(addedBy?: PartnerAddedBy): string {
  if (!addedBy) return "Not recorded";
  return addedBy.name || "Unknown admin";
}

function normalizeArea(value: string | undefined): string {
  return String(value || "").toLowerCase().replace(/[-_\s]+/g, "");
}

function normalizePhone(value: string | undefined): string {
  return (value || "").replace(/\D/g, "").slice(-10);
}

function cityAreas(city: ManagedLocation): ManagedLocation[] {
  if (city.areas?.length) return city.areas;
  return (city.zones || []).flatMap((zone) => zone.areas || []);
}

export function AssignmentManagementPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [areaName, setAreaName] = useState("");
  const [areaRuleCategory, setAreaRuleCategory] = useState("");
  const [areaRuleWorkType, setAreaRuleWorkType] = useState("hourly");
  const [areaPartnerIds, setAreaPartnerIds] = useState<string[]>([]);
  const [areaAddedPartners, setAreaAddedPartners] = useState<PartnerSearchResult[]>([]);
  const [areaPartnerSearch, setAreaPartnerSearch] = useState("");
  const [areaPartnerSearchOpen, setAreaPartnerSearchOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");
  const [areaWorkTypeFilter, setAreaWorkTypeFilter] = useState("hourly");
  const [areaCategoryFilter, setAreaCategoryFilter] = useState("all");
  const [partnerAssignmentFilter, setPartnerAssignmentFilter] = useState<"all" | "with" | "without">("all");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [expandedZoneIds, setExpandedZoneIds] = useState<string[] | null>(null);
  const [areaEditorOpen, setAreaEditorOpen] = useState(false);

  const rulesQuery = useQuery({
    queryKey: ["assignment-management-rules"],
    queryFn: getAssignmentRules,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const taskPostedEmailSettingsQuery = useQuery({
    queryKey: ["task-posted-email-settings"],
    queryFn: getTaskPostedEmailSettings,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
  const locationCatalogQuery = useQuery({
    queryKey: ["assignment-management-location-catalog"],
    queryFn: async () => {
      const response = await getLocationCatalog();
      if (!response.success || !Array.isArray(response.data?.cities)) {
        throw new Error("Failed to load locations from Location Management");
      }
      return response.data.cities;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const areaPartnerQuery = useQuery({
    queryKey: ["assignment-management-area-partners", areaPartnerSearch],
    queryFn: () => getEligibleAssignmentPartners(areaPartnerSearch),
    enabled: areaPartnerSearchOpen && areaPartnerSearch.trim().length >= 2,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const approvedPartnersQuery = useQuery({
    queryKey: ["assignment-management-approved-partners"],
    queryFn: async () => {
      const response = await getEligiblePartnerAreaData();
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.error || "Failed to load approved partner areas");
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (approvedPartnersQuery.isError) {
      toast.error(approvedPartnersQuery.error.message || "Failed to refresh approved partner areas");
    }
  }, [approvedPartnersQuery.isError, approvedPartnersQuery.error]);

  useEffect(() => {
    if (locationCatalogQuery.isError) {
      toast.error(locationCatalogQuery.error.message || "Failed to load locations");
    }
  }, [locationCatalogQuery.isError, locationCatalogQuery.error]);

  useEffect(() => {
    if (taskPostedEmailSettingsQuery.isError) {
      toast.error(taskPostedEmailSettingsQuery.error.message || "Failed to load task-posted exclusions");
    }
  }, [taskPostedEmailSettingsQuery.isError, taskPostedEmailSettingsQuery.error]);

  const locationCities = useMemo(() => locationCatalogQuery.data || [], [locationCatalogQuery.data]);

  const rules = rulesQuery.data?.data;
  const isLoadingLocations = locationCatalogQuery.isPending;
  const isLoadingAreaRules = rulesQuery.isPending;
  const approvedAreaPartners = (approvedPartnersQuery.data || []).map((partner) => ({
    profileId: String(partner._id || partner.profileId || partner.userId),
    uid: String(partner.uid || partner.userId),
    name: partner.name || partner.fullName || "Partner",
    phone: partner.phone,
    categories: partner.partnerProfile?.categories || [],
    areas: partner.partnerProfile?.workAreas || partner.workAreas || [],
    isAadhaarVerified: partner.isAadhaarVerified === true,
    priority: 0,
    active: true,
  }));
  const areaCategories = Array.from(new Set([
    ...approvedAreaPartners.flatMap((partner) => partner.categories || []).filter(Boolean),
    ...(rules?.areaRules || []).map((rule) => rule.category).filter((category): category is string => Boolean(category)),
  ])).sort();
  const areaRules = rules?.areaRules || [];
  const getAreaRules = (area: string, workType = areaWorkTypeFilter) => areaRules.filter((rule) =>
    normalizeArea(rule.area) === normalizeArea(area) &&
    (rule.workTypes || []).includes(workType),
  );
  const getAreaRule = (
    area: string,
    workType = areaWorkTypeFilter,
    category = areaCategoryFilter,
  ) => {
    const matchingRules = getAreaRules(area, workType);
    if (workType === "book_now" && category === "all") {
      return [...matchingRules].sort((first, second) =>
        second.preferredPartners.length - first.preferredPartners.length,
      )[0];
    }
    const categoryKey = workType === "hourly" ? "" : category;
    return matchingRules.find((rule) =>
      String(rule.category || "").toLowerCase() === categoryKey.toLowerCase(),
    );
  };
  const getSavedAreaPartners = (
    area: string,
    workType = areaWorkTypeFilter,
    category = areaCategoryFilter,
  ) => {
    const matchingRules = getAreaRules(area, workType).filter((rule) =>
      workType !== "book_now" ||
      category === "all" ||
      String(rule.category || "").toLowerCase() === category.toLowerCase(),
    );
    return Array.from(new Map(
      matchingRules.flatMap((rule) => rule.preferredPartners)
        .map((partner) => [partner.profileId, partner]),
    ).values());
  };
  const allExcludedPhones = taskPostedEmailSettingsQuery.data?.excludedPhones || [];
  const excludedPhoneSet = new Set(allExcludedPhones.map(normalizePhone).filter(Boolean));
  const getEligiblePartnersForArea = (
    area: string,
    workType = areaWorkTypeFilter,
    category = areaCategoryFilter,
  ) => approvedAreaPartners
    .filter((partner) => partner.isAadhaarVerified === true)
    .filter((partner) => (partner.areas || []).some((partnerArea) => {
      const normalizedPartnerArea = normalizeArea(partnerArea);
      const normalizedArea = normalizeArea(area);
      return normalizedPartnerArea === normalizedArea || normalizedPartnerArea.includes(normalizedArea) || normalizedArea.includes(normalizedPartnerArea);
    }))
    .filter((partner) => workType !== "book_now" || category === "all" || (partner.categories || []).some((item) => item.toLowerCase() === category.toLowerCase()))
    .filter((partner) => !excludedPhoneSet.has(normalizePhone(partner.phone)));
  const getDisplayedAreaPartnerCount = (
    area: string,
    workType = areaWorkTypeFilter,
    category = areaCategoryFilter,
  ) => getSavedAreaPartners(area, workType, category).length;
  const getPreferredBookNowCategory = (area: string) => {
    const savedRules = [...getAreaRules(area, "book_now")].sort(
      (first, second) => second.preferredPartners.length - first.preferredPartners.length,
    );
    if (savedRules[0]?.category) return savedRules[0].category;
    return [...areaCategories].sort((first, second) =>
      getEligiblePartnersForArea(area, "book_now", second).length -
      getEligiblePartnersForArea(area, "book_now", first).length,
    )[0] || areaCategories[0] || "";
  };
  const matchesPartnerAssignment = (area: string) => {
    if (partnerAssignmentFilter === "all") return true;
    const hasPartners = getDisplayedAreaPartnerCount(area) > 0;
    return partnerAssignmentFilter === "with" ? hasPartners : !hasPartners;
  };
  const visibleCities = locationCities.filter((city) =>
    (!areaSearch.trim() ||
      city.name.toLowerCase().includes(areaSearch.toLowerCase()) ||
      cityAreas(city).some((area) => area.name.toLowerCase().includes(areaSearch.toLowerCase()))) &&
    (partnerAssignmentFilter === "all" ||
      matchesPartnerAssignment(city.name) ||
      cityAreas(city).some((area) => matchesPartnerAssignment(area.name))),
  );
  const selectedCity = visibleCities.find((city) => city.id === selectedCityId) || visibleCities[0];
  const selectedCityAreas = selectedCity ? cityAreas(selectedCity) : [];
  const areaMatchesFilters = (area: ManagedLocation, parentName = "") => {
    const search = areaSearch.trim().toLowerCase();
    const matchesSearch = !search ||
      area.name.toLowerCase().includes(search) ||
      parentName.toLowerCase().includes(search) ||
      selectedCity?.name.toLowerCase().includes(search);
    return matchesSearch && matchesPartnerAssignment(area.name);
  };
  const visibleCityAreas = selectedCityAreas.filter((area) => areaMatchesFilters(area, selectedCity?.name || ""));
  const visibleZones = (selectedCity?.zones || []).filter((zone) =>
    (!areaSearch.trim() ||
      zone.name.toLowerCase().includes(areaSearch.toLowerCase()) ||
      (zone.areas || []).some((area) => areaMatchesFilters(area, zone.name))) &&
    (partnerAssignmentFilter === "all" ||
      (zone.areas || []).some((area) => matchesPartnerAssignment(area.name))),
  );
  const matchingAreaPartners = getEligiblePartnersForArea(areaName, areaRuleWorkType, areaRuleCategory || "all");
  const selectedAreaPartners = areaPartnerIds
    .map((id) => {
      const savedPartner = areaAddedPartners.find((partner) => partnerId(partner) === id);
      const currentPartner = approvedAreaPartners.find((partner) => partner.profileId === id);
      return currentPartner ? { ...currentPartner, addedBy: savedPartner?.addedBy } : savedPartner;
    })
    .filter(Boolean) as PartnerSearchResult[];
  const refreshRules = (data: { data?: unknown }) => {
    queryClient.setQueryData(["assignment-management-rules"], data);
  };

  const refreshSavedAreaRule = (savedRule: AreaAssignmentRule) => {
    queryClient.setQueryData<ApiResponse<AssignmentRules>>(
      ["assignment-management-rules"],
      (current) => {
        if (!current?.data) return current;
        const areaKey = normalizeArea(savedRule.area);
        const categoryKey = String(savedRule.category || "").trim().toLowerCase();
        const savedWorkTypes = new Set(savedRule.workTypes);
        const areaRules = current.data.areaRules.flatMap((rule) => {
          const matchesRule =
            normalizeArea(rule.area) === areaKey &&
            String(rule.category || "").trim().toLowerCase() === categoryKey &&
            rule.workTypes.some((workType) => savedWorkTypes.has(workType));
          if (!matchesRule) return [rule];
          const remainingWorkTypes = rule.workTypes.filter(
            (workType) => !savedWorkTypes.has(workType),
          );
          return remainingWorkTypes.length
            ? [{ ...rule, workTypes: remainingWorkTypes }]
            : [];
        });
        return {
          ...current,
          data: { ...current.data, areaRules: [...areaRules, savedRule] },
        };
      },
    );
  };

  const saveAreaRuleMutation = useMutation({
    mutationFn: (rule: Omit<AreaAssignmentRule, "active">) => saveAreaRule(rule),
    onSuccess: (response) => {
      refreshSavedAreaRule(response.data.areaRule);
      setAreaEditorOpen(false);
      setAreaName("");
      setAreaRuleCategory("");
      setAreaRuleWorkType("hourly");
      setAreaPartnerIds([]);
      setAreaAddedPartners([]);
      setAreaPartnerSearch("");
      setAreaPartnerSearchOpen(false);
      toast.success("Area rule saved");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save area rule"),
  });

  const removeAreaRuleMutation = useMutation({
    mutationFn: removeAreaRule,
    onSuccess: (data) => refreshRules(data),
    onError: (error: Error) => toast.error(error.message || "Failed to remove area rule"),
  });

  const reorderAreaPartnerMutation = useMutation({
    mutationFn: ({ area, profileId, direction }: { area: string; profileId: string; direction: "up" | "down" }) => reorderAreaRulePartner(area, profileId, direction),
    onSuccess: (data) => refreshRules(data),
    onError: (error: Error) => toast.error(error.message || "Failed to reorder area partners"),
  });

  const openAreaEditor = (
    rule?: AreaAssignmentRule,
    locationName?: string,
    workType = areaWorkTypeFilter,
    category = areaCategoryFilter,
  ) => {
    const targetArea = locationName || rule?.area || "";
    const selectedRule = rule && (rule.workTypes || []).includes(workType)
      ? rule
      : getAreaRule(targetArea, workType, category);
    const selectedCategory = workType === "book_now"
      ? category !== "all"
        ? category
        : selectedRule?.category ||
          getPreferredBookNowCategory(targetArea)
      : "";
    const savedRule = selectedRule || (targetArea && selectedCategory
      ? getAreaRule(targetArea, workType, selectedCategory)
      : undefined);
    setAreaName(targetArea);
    setAreaRuleWorkType(workType);
    setAreaRuleCategory(selectedCategory);
    if (savedRule) {
      setAreaPartnerIds(savedRule.preferredPartners.map((partner) => partner.profileId));
      setAreaAddedPartners(savedRule.preferredPartners);
    } else {
      setAreaPartnerIds([]);
      setAreaAddedPartners([]);
    }
    setAreaPartnerSearch("");
    setAreaPartnerSearchOpen(false);
    setAreaEditorOpen(true);
  };

  const loadEditorPartnersFor = (workType: string, category: string) => {
    const rule = getAreaRule(areaName, workType, category);
    const partners = rule ? rule.preferredPartners : [];
    setAreaPartnerIds(partners.map((partner) => partner.profileId));
    setAreaAddedPartners(partners);
  };

  const renderAreaPartnerEditor = () => (
    <div className="space-y-4 border-t bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-semibold text-gray-900">Manage partners for {areaName}</h3><p className="text-sm text-gray-500">Add or remove partners, then save. New partners are included only after you add them.</p></div>
        <Button type="button" variant="ghost" size="icon" aria-label="Close partner editor" onClick={() => setAreaEditorOpen(false)}><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Location</span><Input value={areaName} readOnly aria-label="Selected location" /></label>
        <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Work type</span><select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaRuleWorkType} onChange={(event) => { const workType = event.target.value; const category = workType === "book_now" ? areaRuleCategory || areaCategories[0] || "" : ""; setAreaRuleWorkType(workType); setAreaRuleCategory(category); loadEditorPartnersFor(workType, category); }} aria-label="Select work type"><option value="hourly">Hourly</option><option value="book_now">Book Now</option></select></label>
        {areaRuleWorkType === "book_now" && <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Category</span><select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaRuleCategory} onChange={(event) => { setAreaRuleCategory(event.target.value); loadEditorPartnersFor("book_now", event.target.value); }} aria-label="Select area category"><option value="">Select category</option>{areaCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}
      </div>
      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">Preferred partners</p>
            <Badge variant="secondary">{selectedAreaPartners.length}</Badge>
          </div>
          {(areaRuleWorkType === "hourly" || areaRuleCategory) && (
            <Button
              type="button"
              size="sm"
              variant={areaPartnerSearchOpen ? "secondary" : "outline"}
              onClick={() => setAreaPartnerSearchOpen((open) => !open)}
            >
              {areaPartnerSearchOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {areaPartnerSearchOpen ? "Close search" : "Add partner"}
            </Button>
          )}
        </div>

        {areaPartnerSearchOpen && (
          <div className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                value={areaPartnerSearch}
                onChange={(event) => setAreaPartnerSearch(event.target.value)}
                placeholder="Search by name or phone..."
                autoFocus
                aria-label="Search partners by name or phone"
              />
            </div>
            {areaPartnerSearch.trim().length < 2 && (
              <p className="px-1 pt-2 text-xs text-gray-500">Enter at least 2 characters to search.</p>
            )}
            {(areaPartnerQuery.isFetching || areaPartnerSearch.trim().length >= 2) && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl">
                {areaPartnerQuery.isFetching && (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching partners...
                  </div>
                )}
                {!areaPartnerQuery.isFetching && (areaPartnerQuery.data?.data || []).length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-gray-500">No matching partners found.</p>
                )}
                <div className="divide-y divide-gray-100">
                  {(areaPartnerQuery.data?.data || []).map((partner) => {
                    const id = partnerId(partner);
                    const added = areaPartnerIds.includes(id);
                    const verified = partner.isAadhaarVerified === true;
                    return (
                      <button
                        type="button"
                        key={id}
                        disabled={added || !verified}
                        title={!verified ? "Cannot be added: Aadhaar not verified" : undefined}
                        aria-label={`${partnerName(partner)}. ${verified ? (added ? "Already added" : "Aadhaar verified, add partner") : "Cannot be added: Aadhaar not verified"}`}
                        className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-md px-3 py-3 text-left transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:hover:bg-white sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                        onClick={() => {
                          setAreaPartnerIds((current) => current.includes(id) ? current : [...current, id]);
                          setAreaAddedPartners((current) =>
                            current.some((item) => partnerId(item) === id) ? current : [...current, partner],
                          );
                          setAreaPartnerSearch("");
                        }}
                      >
                        <span className="row-span-2 flex min-w-0 items-center gap-3 sm:row-span-1">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                            {partnerInitials(partner)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-gray-900">{partnerName(partner)}</span>
                            <span className="block truncate text-xs text-gray-500">{partner.phone || partner.phoneNumber || partnerUid(partner)}</span>
                          </span>
                        </span>
                        <span className={`col-start-2 row-start-1 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${verified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {verified ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                          {aadhaarStatusLabel(partner)}
                        </span>
                        <span className={`col-start-2 row-start-2 inline-flex h-8 min-w-28 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-xs font-semibold transition-colors sm:col-start-3 sm:row-start-1 ${added ? "border-gray-200 bg-gray-50 text-gray-400" : verified ? "border-green-600 bg-white text-green-700 group-hover:bg-green-50" : "border-gray-200 bg-gray-100 text-gray-400"}`}>
                          {added ? <Check className="h-3.5 w-3.5" /> : verified ? <Plus className="h-3.5 w-3.5" /> : null}
                          {added ? "Added" : "Add partner"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedAreaPartners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
            <UserRound className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-700">No preferred partners yet</p>
            <p className="mt-1 text-xs text-gray-500">Add Aadhaar-verified partners for this location.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
            <ul className="divide-y divide-gray-100">
              {selectedAreaPartners.map((partner) => {
                const id = partnerId(partner);
                const verified = partner.isAadhaarVerified === true;
                return (
                  <li key={id} className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50 sm:px-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                        {partnerInitials(partner)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{partnerName(partner)}</p>
                        <p className="truncate text-xs text-gray-500">{partner.phone || partner.phoneNumber || partnerUid(partner)}</p>
                        {isSuperAdmin && (
                          <p className="truncate text-[11px] text-gray-500">
                            Added by: {addedByLabel(partner.addedBy)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium sm:text-[11px] ${verified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {verified ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">{aadhaarStatusLabel(partner)}</span>
                        <span className="sm:hidden">{verified ? "Verified" : "Not verified"}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-gray-500 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Remove ${partnerName(partner)}`}
                        onClick={() => {
                          setAreaPartnerIds((current) => current.filter((item) => item !== id));
                          setAreaAddedPartners((current) => current.filter((item) => partnerId(item) !== id));
                        }}
                      >
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {matchingAreaPartners.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <Check className="h-3.5 w-3.5 text-green-600" />
            Approved, Aadhaar-verified partners matching this location are available to add.
          </p>
        )}
      </div>
      <div className="flex justify-end"><Button onClick={() => saveAreaRuleMutation.mutate({
        area: areaName,
        category: areaRuleWorkType === "book_now" ? areaRuleCategory : undefined,
        zone: "Default Zone",
        workTypes: [areaRuleWorkType],
        preferredPartners: areaPartnerIds
          .map((profileId) => areaAddedPartners.find((partner) => partnerId(partner) === profileId) || approvedAreaPartners.find((partner) => partner.profileId === profileId))
          .filter(Boolean) as AreaAssignmentRule["preferredPartners"],
      })} disabled={saveAreaRuleMutation.isPending || !areaName.trim() || (areaRuleWorkType === "book_now" && !areaRuleCategory)}>{saveAreaRuleMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Partners</Button></div>
    </div>
  );

  const renderCityAssignmentRow = () => {
    if (!selectedCity) return null;
    const cityRule = getAreaRule(selectedCity.name);
    const partnerCount = getDisplayedAreaPartnerCount(selectedCity.name);
    const search = areaSearch.trim().toLowerCase();
    const citySearchMatches = !search ||
      selectedCity.name.toLowerCase().includes(search) ||
      selectedCityAreas.some((area) => area.name.toLowerCase().includes(search));
    if (!citySearchMatches || !matchesPartnerAssignment(selectedCity.name)) return null;

    return (
      <>
        <tr className="border-b bg-amber-50/60">
          <td className="px-3 py-3 font-medium">
            Entire city
          </td>
          <td className="px-3 py-3">{partnerCount || "—"}</td>
          <td className="px-3 py-2 text-right">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openAreaEditor(cityRule, selectedCity.name)}
            >
              <Plus className="mr-1 h-3 w-3" />
              {partnerCount ? "Edit" : "Add Partners"}
            </Button>
          </td>
        </tr>
        {areaEditorOpen && normalizeArea(areaName) === normalizeArea(selectedCity.name) && (
          <tr>
            <td colSpan={3} className="border-b p-0">{renderAreaPartnerEditor()}</td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Preferred Partners</h1>
          <p className="mt-1 text-sm text-gray-600">Manage preferred partner assignments for approved partners.</p>
        </div>
      </div>

        <div className="space-y-6">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(220px,0.6fr)_minmax(0,1.4fr)]">
          <Card className="min-w-0 xl:col-span-full">
            <CardHeader className="border-b bg-white pb-5">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Filters</h3></div>
              <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Search</span><Input className="h-10 w-full bg-white" value={areaSearch} onChange={(event) => setAreaSearch(event.target.value)} placeholder="Search city or area..." /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Work type</span><select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaWorkTypeFilter} onChange={(event) => { setAreaWorkTypeFilter(event.target.value); if (event.target.value === "hourly") setAreaCategoryFilter("all"); }} aria-label="Filter areas by work type"><option value="hourly">Hourly</option><option value="book_now">Book Now</option></select></label>
                {areaWorkTypeFilter === "book_now" && <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Category</span><select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaCategoryFilter} onChange={(event) => setAreaCategoryFilter(event.target.value)} aria-label="Filter Book Now areas by category"><option value="all">All categories</option>{areaCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}
                <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Partner Assignment</span><select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={partnerAssignmentFilter} onChange={(event) => setPartnerAssignmentFilter(event.target.value as "all" | "with" | "without")} aria-label="Filter by partner assignment"><option value="all">All Areas</option><option value="with">With Partners</option><option value="without">Without Partners</option></select></label>
              </div>
              <div className="mt-4"><Button variant="outline" onClick={() => { setAreaSearch(""); setAreaWorkTypeFilter("hourly"); setAreaCategoryFilter("all"); setPartnerAssignmentFilter("all"); }}>Reset</Button></div>
            </CardHeader>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="border-b pb-3"><CardTitle className="text-base">Cities ({locationCities.length})</CardTitle><CardDescription>Locations from Location Management</CardDescription></CardHeader>
            <CardContent className="max-h-[620px] space-y-1 overflow-y-auto p-2">
              {isLoadingLocations && <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Loading locations...</div>}
              {!isLoadingLocations && visibleCities.map((city) => {
                const zones = city.areas?.length ? [] : city.zones || [];
                const areas = cityAreas(city);
                const cityRule = getAreaRule(city.name);
                return <button key={city.id} type="button" onClick={() => { setSelectedCityId(city.id); setExpandedZoneIds(city.zones?.[0]?.id ? [city.zones[0].id] : []); setAreaEditorOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${city.id === selectedCity?.id ? "border-amber-200 bg-amber-50" : "border-transparent hover:bg-gray-50"}`}>
                  <Building2 className="h-5 w-5 shrink-0 text-gray-500" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-900">{city.name}</span><span className="block text-xs text-gray-500">{areas.length ? `${zones.length} ${zones.length === 1 ? "Zone" : "Zones"} · ${areas.length} ${areas.length === 1 ? "Area" : "Areas"}` : "No Areas · City-level"}</span></span>
                  <Badge variant={city.enabled === false ? "secondary" : "success"}>{city.enabled === false ? "Disabled" : "Active"}</Badge>
                  {cityRule && <span className="sr-only">{cityRule.preferredPartners.length} city partners configured</span>}
                </button>;
              })}
              {!isLoadingLocations && visibleCities.length === 0 && <p className="px-3 py-8 text-center text-sm text-gray-500">{locationCities.length ? "No cities match this search." : "No cities are configured in Location Management."}</p>}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            {isLoadingAreaRules || isLoadingLocations ? <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Loading area rules...</CardContent> : !selectedCity ? <CardContent className="py-10 text-center text-sm text-gray-500">Select a city to view its areas.</CardContent> : <>
              <CardHeader className="border-b">
                <div className="flex flex-wrap items-center gap-3"><Building2 className="h-6 w-6 text-gray-600" /><CardTitle>{selectedCity.name}</CardTitle><Badge variant={selectedCity.enabled === false ? "secondary" : "success"}>{selectedCity.enabled === false ? "Disabled" : "Active"}</Badge></div>
                <CardDescription>{selectedCityAreas.length ? `${selectedCity.areas?.length ? 0 : selectedCity.zones?.length || 0} Zones · ${selectedCityAreas.length} Areas` : "No Areas · City-level partner assignment"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-5">
                {selectedCityAreas.length === 0 ? (() => {
                  const cityRule = getAreaRule(selectedCity.name);
                  const partners = getSavedAreaPartners(selectedCity.name);
                  return <div className="space-y-4">
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">This city has no areas. Preferred partners added here apply to the entire city.</div>
                    {!areaEditorOpen && <div className="rounded-lg border p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-gray-900">Preferred partners ({getDisplayedAreaPartnerCount(selectedCity.name)})</h3><Button size="sm" variant="outline" onClick={() => openAreaEditor(cityRule, selectedCity.name)}><Plus className="mr-1 h-4 w-4" />{getDisplayedAreaPartnerCount(selectedCity.name) ? "Edit Partners" : "Add Partner"}</Button></div>
                      {partners.length ? (
                        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
                          <ul className="divide-y divide-gray-100">
                            {partners.map((partner) => {
                              const currentPartner = approvedAreaPartners.find(
                                (item) => item.profileId === partner.profileId,
                              ) || partner;
                              const verified = currentPartner.isAadhaarVerified === true;
                              return (
                                <li
                                  key={partner.profileId}
                                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50 sm:px-4"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                                      {partnerInitials(currentPartner)}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-gray-900">{currentPartner.name || partner.name}</p>
                                      <p className="truncate text-xs text-gray-500">{currentPartner.phone || partner.phone || partner.uid}</p>
                                      {isSuperAdmin && (
                                        <p className="truncate text-[11px] text-gray-500">
                                          Added by: {addedByLabel(partner.addedBy)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${verified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {verified ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                                    {aadhaarStatusLabel(currentPartner)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : <p className="text-sm text-gray-500">No preferred partners configured for this city yet.</p>}
                    </div>}
                    {areaEditorOpen && normalizeArea(areaName) === normalizeArea(selectedCity.name) && renderAreaPartnerEditor()}
                  </div>;
                })() : selectedCity.areas?.length ? <div className="space-y-3">
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">Areas in {selectedCity.name}</h3><span className="text-xs text-gray-500">{visibleCityAreas.length} shown</span></div>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[480px] text-left text-sm"><thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Area</th><th className="px-3 py-2">Partners</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
                      <tbody>{renderCityAssignmentRow()}{(selectedCity.areas || []).filter((area) => areaMatchesFilters(area, selectedCity.name)).map((area) => {
                        const rule = getAreaRule(area.name);
                        const partnerCount = getDisplayedAreaPartnerCount(area.name);
                        return <Fragment key={area.id}><tr className="border-b"><td className="px-3 py-3 font-medium">{area.name}{area.enabled === false && <Badge className="ml-2" variant="secondary">Disabled</Badge>}</td><td className="px-3 py-3">{partnerCount || "—"}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => openAreaEditor(rule, area.name)}><Plus className="mr-1 h-3 w-3" />{partnerCount ? "Edit" : "Add Partners"}</Button></td></tr>{areaEditorOpen && normalizeArea(areaName) === normalizeArea(area.name) && <tr><td colSpan={3} className="border-b p-0">{renderAreaPartnerEditor()}</td></tr>}</Fragment>;
                      })}</tbody>
                    </table>
                  </div>
                  {(selectedCity.areas || []).filter((area) => areaMatchesFilters(area, selectedCity.name)).length === 0 && <p className="py-8 text-center text-sm text-gray-500">No areas match the selected filters.</p>}
                </div> : <div className="space-y-3">
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">Areas in {selectedCity.name}</h3><span className="text-xs text-gray-500">{visibleCityAreas.length} shown</span></div>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Area</th><th className="px-3 py-2">Partners</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
                      <tbody>{renderCityAssignmentRow()}</tbody>
                    </table>
                  </div>
                  {visibleZones.map((zone, zoneIndex) => {
                    const zoneAreas = (zone.areas || []).filter((area) => areaMatchesFilters(area, zone.name));
                    const isExpanded = expandedZoneIds === null ? zoneIndex === 0 : expandedZoneIds.includes(zone.id);
                    return <section key={zone.id} className="overflow-hidden rounded-lg border">
                      <button type="button" onClick={() => setExpandedZoneIds((current) => {
                        const expanded = current ?? (visibleZones[0]?.id ? [visibleZones[0].id] : []);
                        return expanded.includes(zone.id) ? expanded.filter((id) => id !== zone.id) : [...expanded, zone.id];
                      })} className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left hover:bg-gray-100">
                        <span className="flex items-center gap-2 font-semibold text-gray-900">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{zone.name}{zone.enabled === false && <Badge variant="secondary">Disabled</Badge>}</span><span className="text-xs text-gray-500">{zone.areas?.length || 0} Areas</span>
                      </button>
                      {isExpanded && <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="border-b text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Area</th><th className="px-3 py-2">Partners</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{zoneAreas.map((area) => {
                        const rule = getAreaRule(area.name);
                        const partnerCount = getDisplayedAreaPartnerCount(area.name);
                        return <Fragment key={area.id}><tr className="border-b"><td className="px-3 py-3 font-medium">{area.name}{area.enabled === false && <Badge className="ml-2" variant="secondary">Disabled</Badge>}</td><td className="px-3 py-3">{partnerCount || "—"}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => openAreaEditor(rule, area.name)}><Plus className="mr-1 h-3 w-3" />{partnerCount ? "Edit" : "Add Partners"}</Button></td></tr>{areaEditorOpen && normalizeArea(areaName) === normalizeArea(area.name) && <tr><td colSpan={3} className="border-b p-0">{renderAreaPartnerEditor()}</td></tr>}</Fragment>;
                      })}</tbody></table>{zoneAreas.length === 0 && <p className="px-3 py-5 text-sm text-gray-500">No areas in this zone match the selected filters.</p>}</div>}
                    </section>;
                  })}
                  {visibleZones.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No zones or areas match the selected filters.</p>}
                </div>}
              </CardContent>
            </>}
          </Card>
          </div>
        </div>
    </div>
  );
}

export default function AssignmentManagementLandingPage() {
  return <AssignmentManagementPage />;
}
