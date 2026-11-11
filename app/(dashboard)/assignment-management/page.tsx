"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Ban, Building2, Check, ChevronDown, ChevronRight, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listUsers } from "@/lib/api/users";
import { getLocationCatalog, ManagedLocation } from "@/lib/api/locations";
import {
  addExcludedPhone,
  addPreferredPartner,
  getEligibleAssignmentPartners,
  getEligiblePartnerAreaData,
  getAssignmentRules,
  PartnerSearchResult,
  removeExcludedPhone,
  removePreferredPartner,
  reorderPreferredPartner,
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

export function AssignmentManagementPage({
  initialTab = "preferred",
  showTabs = true,
}: {
  initialTab?: "preferred" | "areas";
  showTabs?: boolean;
}) {
  const queryClient = useQueryClient();
  const [partnerSearch, setPartnerSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"preferred" | "areas">(initialTab);
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
  const [expandedZoneIds, setExpandedZoneIds] = useState<string[]>([]);
  const [areaEditorOpen, setAreaEditorOpen] = useState(false);

  const rulesQuery = useQuery({
    queryKey: ["assignment-management-rules"],
    queryFn: getAssignmentRules,
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
  });
  const partnerQuery = useQuery({
    queryKey: ["assignment-management-partners", partnerSearch],
    queryFn: () => getEligibleAssignmentPartners(partnerSearch),
    enabled: partnerSearch.trim().length >= 2,
  });
  const areaPartnerQuery = useQuery({
    queryKey: ["assignment-management-area-partners", areaPartnerSearch],
    queryFn: () => getEligibleAssignmentPartners(areaPartnerSearch),
    enabled: areaPartnerSearchOpen && areaPartnerSearch.trim().length >= 2,
  });
  const customerQuery = useQuery({
    queryKey: ["assignment-management-customers", phoneSearch],
    queryFn: () => listUsers({ search: phoneSearch, role: "Customer", limit: 10 }),
    enabled: phoneSearch.trim().length >= 2,
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

  const locationCities = useMemo(() => locationCatalogQuery.data || [], [locationCatalogQuery.data]);

  const rules = rulesQuery.data?.data;
  const isLoadingAreaRules = rulesQuery.isPending || locationCatalogQuery.isPending;
  const preferredPartners = rules?.preferredPartners || [];
  const approvedAreaPartners = (approvedPartnersQuery.data || []).map((partner) => ({
    profileId: String(partner._id || partner.profileId || partner.userId),
    uid: String(partner.uid || partner.userId),
    name: partner.name || partner.fullName || "Partner",
    phone: partner.phone,
    categories: partner.partnerProfile?.categories || [],
    areas: partner.partnerProfile?.workAreas || partner.workAreas || [],
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
  const allExcludedPhones = rules?.excludedPhones || [];
  const excludedPhoneSet = new Set(allExcludedPhones.map(normalizePhone).filter(Boolean));
  const getEligiblePartnersForArea = (
    area: string,
    workType = areaWorkTypeFilter,
    category = areaCategoryFilter,
  ) => approvedAreaPartners
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
  ) => {
    if (getAreaRules(area, workType).some((rule) =>
      workType !== "book_now" ||
      category === "all" ||
      String(rule.category || "").toLowerCase() === category.toLowerCase(),
    )) return getSavedAreaPartners(area, workType, category).length;
    return getEligiblePartnersForArea(area, workType, category).length;
  };
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
    .map((id) => areaAddedPartners.find((partner) => partnerId(partner) === id) || approvedAreaPartners.find((partner) => partner.profileId === id))
    .filter(Boolean) as PartnerSearchResult[];
  const excludedPhones = allExcludedPhones.filter((phone) =>
    phone.includes(phoneSearch.replace(/\D/g, "")),
  );
  const customerResults = customerQuery.data?.data || [];
  const excludedCustomerQueries = useQueries({
    queries: allExcludedPhones.map((phone) => ({
      queryKey: ["assignment-management-excluded-customer", phone],
      queryFn: () => listUsers({ search: phone, role: "Customer", limit: 10 }),
      enabled: phone.length >= 2,
    })),
  });

  const excludedCustomers = allExcludedPhones.map((phone, index) => ({
    phone,
    name: excludedCustomerQueries[index]?.data?.data?.find((customer) =>
      (customer.phone || "").replace(/\D/g, "").slice(-10) === phone.replace(/\D/g, "").slice(-10),
    )?.name || "Customer",
  }));
  const searchResults = partnerQuery.data?.data || [];

  const refreshRules = (data: { data?: unknown }) => {
    queryClient.setQueryData(["assignment-management-rules"], data);
    void queryClient.invalidateQueries({ queryKey: ["assignment-management-approved-partners"] });
    void queryClient.invalidateQueries({ queryKey: ["assignment-management-partners"] });
    void queryClient.invalidateQueries({ queryKey: ["assignment-management-area-partners"] });
    setPartnerSearch("");
  };

  const addPartnerMutation = useMutation({
    mutationFn: (partner: PartnerSearchResult) => addPreferredPartner({
      profileId: partnerId(partner),
      uid: partnerUid(partner),
      name: partnerName(partner),
      phone: partner.phone || partner.phoneNumber,
      categories: partner.categories || partner.partnerProfile?.categories || [],
      areas: partner.workAreas || partner.partnerProfile?.workAreas || [],
    }),
    onSuccess: (data) => {
      refreshRules(data);
      toast.success("Partner added to preferred list");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to add partner"),
  });

  const removePartnerMutation = useMutation({
    mutationFn: removePreferredPartner,
    onSuccess: (data) => {
      refreshRules(data);
      toast.success("Partner removed from preferred list");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove partner"),
  });

  const reorderPartnerMutation = useMutation({
    mutationFn: ({ profileId, direction }: { profileId: string; direction: "up" | "down" }) =>
      reorderPreferredPartner(profileId, direction),
    onSuccess: (data) => refreshRules(data),
    onError: (error: Error) => toast.error(error.message || "Failed to reorder partners"),
  });

  const addPhoneMutation = useMutation({
    mutationFn: addExcludedPhone,
    onSuccess: (data) => {
      refreshRules(data);
      setPhoneSearch("");
      toast.success("Phone number added to exclusions");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to add phone number"),
  });

  const removePhoneMutation = useMutation({
    mutationFn: removeExcludedPhone,
    onSuccess: (data) => {
      refreshRules(data);
      toast.success("Phone number removed from exclusions");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove phone number"),
  });

  const saveAreaRuleMutation = useMutation({
    mutationFn: () => saveAreaRule({
      area: areaName,
      category: areaRuleWorkType === "book_now" ? areaRuleCategory : undefined,
      zone: "Default Zone",
      workTypes: [areaRuleWorkType],
      preferredPartners: areaPartnerIds
        .map((profileId) => areaAddedPartners.find((partner) => partnerId(partner) === profileId) || approvedAreaPartners.find((partner) => partner.profileId === profileId))
        .filter(Boolean) as AreaAssignmentRule["preferredPartners"],
    }),
    onSuccess: (data) => {
      refreshRules(data);
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
      const matchingPartners = targetArea
        ? getEligiblePartnersForArea(targetArea, workType, selectedCategory || "all")
        : [];
      setAreaPartnerIds(matchingPartners.map((partner) => partner.profileId));
      setAreaAddedPartners(matchingPartners);
    }
    setAreaPartnerSearch("");
    setAreaPartnerSearchOpen(false);
    setAreaEditorOpen(true);
  };

  const loadEditorPartnersFor = (workType: string, category: string) => {
    const rule = getAreaRule(areaName, workType, category);
    const partners = rule?.preferredPartners || getEligiblePartnersForArea(areaName, workType, category);
    setAreaPartnerIds(partners.map((partner) => partner.profileId));
    setAreaAddedPartners(partners);
  };

  const renderAreaPartnerEditor = () => (
    <div className="space-y-4 border-t bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-semibold text-gray-900">Manage partners for {areaName}</h3><p className="text-sm text-gray-500">Add or remove partners, then save your changes.</p></div>
        <Button type="button" variant="ghost" size="icon" aria-label="Close partner editor" onClick={() => setAreaEditorOpen(false)}><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Location</span><Input value={areaName} readOnly aria-label="Selected location" /></label>
        <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Work type</span><select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaRuleWorkType} onChange={(event) => { const workType = event.target.value; const category = workType === "book_now" ? areaRuleCategory || areaCategories[0] || "" : ""; setAreaRuleWorkType(workType); setAreaRuleCategory(category); loadEditorPartnersFor(workType, category); }} aria-label="Select work type"><option value="hourly">Hourly</option><option value="book_now">Book Now</option></select></label>
        {areaRuleWorkType === "book_now" && <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Category</span><select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaRuleCategory} onChange={(event) => { setAreaRuleCategory(event.target.value); loadEditorPartnersFor("book_now", event.target.value); }} aria-label="Select area category"><option value="">Select category</option>{areaCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}
      </div>
      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-gray-700">Preferred Partners ({selectedAreaPartners.length})</p>{(areaRuleWorkType === "hourly" || areaRuleCategory) && <Button type="button" size="sm" variant="outline" onClick={() => setAreaPartnerSearchOpen((open) => !open)}><Plus className="mr-1 h-3 w-3" />Add Partner</Button>}</div>
        {areaPartnerSearchOpen && <div className="relative"><Input value={areaPartnerSearch} onChange={(event) => setAreaPartnerSearch(event.target.value)} placeholder="Search by name or phone..." autoFocus />{(areaPartnerQuery.isFetching || areaPartnerSearch.trim().length >= 2) && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white p-1 shadow-lg">{areaPartnerQuery.isFetching && <p className="px-3 py-2 text-xs text-gray-500">Searching...</p>}{(areaPartnerQuery.data?.data || []).map((partner) => { const id = partnerId(partner); const added = areaPartnerIds.includes(id); return <button type="button" key={id} disabled={added} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-amber-50 disabled:opacity-60" onClick={() => { setAreaPartnerIds((current) => current.includes(id) ? current : [...current, id]); setAreaAddedPartners((current) => current.some((item) => partnerId(item) === id) ? current : [...current, partner]); setAreaPartnerSearch(""); }}><span>{partnerName(partner)} <span className="text-xs text-gray-500">{partner.phone || partner.phoneNumber || partnerUid(partner)}</span></span><span className="text-xs font-medium text-amber-700">{added ? "Added" : "Add"}</span></button>; })}</div>}</div>}
        <div className="max-h-80 space-y-1 overflow-y-auto">{selectedAreaPartners.length === 0 && <p className="text-sm text-gray-500">No partners added yet.</p>}{selectedAreaPartners.map((partner) => <div key={partnerId(partner)} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"><span>{partnerName(partner)} <span className="text-xs text-gray-500">{partner.phone || partner.phoneNumber || partnerUid(partner)}</span></span><button type="button" className="text-xs text-red-600 hover:underline" onClick={() => { const id = partnerId(partner); setAreaPartnerIds((current) => current.filter((item) => item !== id)); setAreaAddedPartners((current) => current.filter((item) => partnerId(item) !== id)); }}>Remove</button></div>)}</div>
        {matchingAreaPartners.length > 0 && <p className="text-xs text-gray-500">Approved partners matching this location are available to add.</p>}
      </div>
      <div className="flex justify-end"><Button onClick={() => saveAreaRuleMutation.mutate()} disabled={saveAreaRuleMutation.isPending || !areaName.trim() || (areaRuleWorkType === "book_now" && !areaRuleCategory)}>{saveAreaRuleMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Partners</Button></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{initialTab === "areas" ? "Area Rules" : "Preferred Partners"}</h1>
          <p className="mt-1 text-sm text-gray-600">{initialTab === "areas" ? "Manage area and category assignments for approved partners." : "Manage preferred partners and exclusions for automatic work assignment."}</p>
        </div>
      </div>

      {showTabs && <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-white">
        {([['preferred', 'Preferred Partners'], ['areas', 'Area Rules']] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setActiveTab(value)} className={`border-r px-4 py-3 text-sm font-medium last:border-r-0 ${activeTab === value ? "bg-amber-50 text-amber-700" : "text-gray-600 hover:bg-gray-50"}`}>
            {label}
          </button>
        ))}
      </div>}

      {activeTab === "areas" && (
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
              {isLoadingAreaRules && <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Loading locations...</div>}
              {!isLoadingAreaRules && visibleCities.map((city) => {
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
              {!isLoadingAreaRules && visibleCities.length === 0 && <p className="px-3 py-8 text-center text-sm text-gray-500">{locationCities.length ? "No cities match this search." : "No cities are configured in Location Management."}</p>}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            {isLoadingAreaRules ? <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Loading area rules...</CardContent> : !selectedCity ? <CardContent className="py-10 text-center text-sm text-gray-500">Select a city to view its areas.</CardContent> : <>
              <CardHeader className="border-b">
                <div className="flex flex-wrap items-center gap-3"><Building2 className="h-6 w-6 text-gray-600" /><CardTitle>{selectedCity.name}</CardTitle><Badge variant={selectedCity.enabled === false ? "secondary" : "success"}>{selectedCity.enabled === false ? "Disabled" : "Active"}</Badge></div>
                <CardDescription>{selectedCityAreas.length ? `${selectedCity.areas?.length ? 0 : selectedCity.zones?.length || 0} Zones · ${selectedCityAreas.length} Areas` : "No Areas · City-level partner assignment"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-5">
                {selectedCityAreas.length === 0 ? (() => {
                  const cityRule = getAreaRule(selectedCity.name);
                  const partners = getAreaRules(selectedCity.name).length
                    ? getSavedAreaPartners(selectedCity.name)
                    : getEligiblePartnersForArea(selectedCity.name);
                  return <div className="space-y-4">
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">This city has no areas. Preferred partners added here apply to the entire city.</div>
                    {!areaEditorOpen && <div className="rounded-lg border p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-gray-900">Preferred Partners ({getDisplayedAreaPartnerCount(selectedCity.name)})</h3><Button size="sm" variant="outline" onClick={() => openAreaEditor(cityRule, selectedCity.name)}><Plus className="mr-1 h-4 w-4" />{getDisplayedAreaPartnerCount(selectedCity.name) ? "Edit Partners" : "Add Partner"}</Button></div>
                      {partners.length ? <div className="space-y-2">{partners.map((partner) => <div key={partner.profileId} className="rounded-md bg-gray-50 px-3 py-2 text-sm"><span className="font-medium">{partner.name}</span><span className="ml-2 text-xs text-gray-500">{partner.phone || partner.uid}</span></div>)}</div> : <p className="text-sm text-gray-500">No preferred partners configured for this city yet.</p>}
                    </div>}
                    {areaEditorOpen && normalizeArea(areaName) === normalizeArea(selectedCity.name) && renderAreaPartnerEditor()}
                  </div>;
                })() : selectedCity.areas?.length ? <div className="space-y-3">
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">Areas in {selectedCity.name}</h3><span className="text-xs text-gray-500">{visibleCityAreas.length} shown</span></div>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[480px] text-left text-sm"><thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Area</th><th className="px-3 py-2">Preferred Partners</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
                      <tbody>{(selectedCity.areas || []).filter((area) => areaMatchesFilters(area, selectedCity.name)).map((area) => {
                        const rule = getAreaRule(area.name);
                        const partnerCount = getDisplayedAreaPartnerCount(area.name);
                        return <Fragment key={area.id}><tr className="border-b"><td className="px-3 py-3 font-medium">{area.name}{area.enabled === false && <Badge className="ml-2" variant="secondary">Disabled</Badge>}</td><td className="px-3 py-3">{partnerCount || "—"}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => openAreaEditor(rule, area.name)}><Plus className="mr-1 h-3 w-3" />{partnerCount ? "Edit" : "Add Partners"}</Button></td></tr>{areaEditorOpen && normalizeArea(areaName) === normalizeArea(area.name) && <tr><td colSpan={3} className="border-b p-0">{renderAreaPartnerEditor()}</td></tr>}</Fragment>;
                      })}</tbody>
                    </table>
                  </div>
                  {(selectedCity.areas || []).filter((area) => areaMatchesFilters(area, selectedCity.name)).length === 0 && <p className="py-8 text-center text-sm text-gray-500">No areas match the selected filters.</p>}
                </div> : <div className="space-y-3">
                  {visibleZones.map((zone, zoneIndex) => {
                    const zoneAreas = (zone.areas || []).filter((area) => areaMatchesFilters(area, zone.name));
                    const isExpanded = expandedZoneIds.length ? expandedZoneIds.includes(zone.id) : zoneIndex === 0;
                    return <section key={zone.id} className="overflow-hidden rounded-lg border">
                      <button type="button" onClick={() => setExpandedZoneIds((current) => {
                        const expanded = current.length ? current : visibleZones[0]?.id ? [visibleZones[0].id] : [];
                        return expanded.includes(zone.id) ? expanded.filter((id) => id !== zone.id) : [...expanded, zone.id];
                      })} className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left hover:bg-gray-100">
                        <span className="flex items-center gap-2 font-semibold text-gray-900">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{zone.name}{zone.enabled === false && <Badge variant="secondary">Disabled</Badge>}</span><span className="text-xs text-gray-500">{zone.areas?.length || 0} Areas</span>
                      </button>
                      {isExpanded && <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="border-b text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Area</th><th className="px-3 py-2">Preferred Partners</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{zoneAreas.map((area) => {
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
      )}

      {activeTab === "preferred" && <>
        <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Search and add partners</CardTitle><CardDescription>Search by partner name, phone number, or partner ID.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input className="pl-9" value={partnerSearch} onChange={(event) => setPartnerSearch(event.target.value)} placeholder="Search partners..." /></div>
            {partnerQuery.isFetching && <p className="text-sm text-gray-500">Searching...</p>}
            <div className="space-y-2">{searchResults.map((partner) => { const alreadyAdded = preferredPartners.some((item) => item.profileId === partnerId(partner)); return <div key={partnerId(partner)} className="flex items-center gap-3 rounded-lg border p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{partnerName(partner)}</p><p className="text-xs text-gray-500">{partner.phone || partner.phoneNumber || partnerUid(partner)}</p></div>{alreadyAdded ? <Badge variant="secondary"><Check className="mr-1 h-3 w-3" />Added</Badge> : <Button size="sm" onClick={() => addPartnerMutation.mutate(partner)} disabled={addPartnerMutation.isPending}><Plus className="mr-1 h-4 w-4" />Add</Button>}</div>; })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferred partners list</CardTitle>
              <CardDescription>Eligible partners receive hourly works one by one in a repeating cycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {preferredPartners.map((partner, index) => (
              <div key={partner.profileId} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="w-5 text-center text-sm font-semibold text-gray-500">{index + 1}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-700">{partner.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-900">{partner.name}</p><p className="truncate text-xs text-gray-500">{partner.phone || partner.uid}</p></div>
                <Badge variant={partner.active ? "success" : "secondary"}>{partner.active ? "Active" : "Inactive"}</Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Move ${partner.name} up`} disabled={index === 0 || reorderPartnerMutation.isPending} onClick={() => reorderPartnerMutation.mutate({ profileId: partner.profileId, direction: "up" })}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Move ${partner.name} down`} disabled={index === preferredPartners.length - 1 || reorderPartnerMutation.isPending} onClick={() => reorderPartnerMutation.mutate({ profileId: partner.profileId, direction: "down" })}><ArrowDown className="h-4 w-4" /></Button>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Remove ${partner.name}`} onClick={() => removePartnerMutation.mutate(partner.profileId)} disabled={removePartnerMutation.isPending}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            ))}
            {preferredPartners.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No preferred partners added yet.</p>}
          </CardContent>
        </Card>
        </div>

        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-red-600" />Exclusions</CardTitle>
          <CardDescription>A customer phone number here blocks automatic assignment for every Book Now work, even when no other partner matches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={phoneSearch} onChange={(event) => setPhoneSearch(event.target.value)} placeholder="Search or enter customer phone number" />
            <Button onClick={() => addPhoneMutation.mutate(phoneSearch)} disabled={addPhoneMutation.isPending || phoneSearch.replace(/\D/g, "").length < 10}><Plus className="mr-2 h-4 w-4" />Add exclusion</Button>
          </div>
            {customerQuery.isFetching && <p className="text-sm text-gray-500">Searching customers...</p>}
            {customerResults.length > 0 && (
              <div className="space-y-2">
                {customerResults.map((customer) => {
                  const customerPhone = customer.phone || "";
                  const normalizedPhone = customerPhone.replace(/\D/g, "");
                  const alreadyExcluded = allExcludedPhones.some(
                    (phone) => phone.replace(/\D/g, "").slice(-10) === normalizedPhone.slice(-10),
                  );
                  return (
                    <div key={customer.userId || customer._id || customerPhone} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 font-semibold text-red-700">{(customer.name || "C").charAt(0).toUpperCase()}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-900">{customer.name}</p><p className="truncate text-xs text-gray-500">{customerPhone || "No phone number"}</p></div>
                      {alreadyExcluded ? <Badge variant="destructive">Excluded</Badge> : <Button size="sm" onClick={() => addPhoneMutation.mutate(customerPhone)} disabled={addPhoneMutation.isPending || normalizedPhone.length < 10}><Plus className="mr-1 h-4 w-4" />Exclude</Button>}
                    </div>
                  );
                })}
              </div>
            )}
          {addPhoneMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          <div className="space-y-2">
            {excludedCustomers.filter(({ phone }) => excludedPhones.includes(phone)).map(({ phone, name }, index) => (
              <div key={phone} className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                <span className="w-6 text-sm font-semibold text-gray-500">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{name}</p>
                  <p className="text-xs text-gray-600">{phone}</p>
                </div>
                <Badge variant="destructive">Excluded</Badge>
                <Button variant="ghost" size="icon" aria-label={`Remove ${name}`} onClick={() => removePhoneMutation.mutate(phone)} disabled={removePhoneMutation.isPending}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
            {excludedPhones.length === 0 && <p className="text-sm text-gray-500">No excluded phone numbers.</p>}
          </div>
        </CardContent>
        </Card>
      </>}
    </div>
  );
}

export default function AssignmentManagementLandingPage() {
  return <AssignmentManagementPage />;
}
