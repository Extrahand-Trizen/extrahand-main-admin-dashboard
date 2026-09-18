"use client";

import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Ban, Check, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listUsers } from "@/lib/api/users";
import {
  addExcludedPhone,
  addPreferredPartner,
  getAssignmentRules,
  PartnerSearchResult,
  removeExcludedPhone,
  removePreferredPartner,
  reorderPreferredPartner,
  AreaAssignmentRule,
  removeAreaRule,
  reorderAreaRulePartner,
  saveAreaRule,
  searchAssignmentPartners,
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

async function listAllApprovedPartners(): Promise<Awaited<ReturnType<typeof listUsers>>["data"]> {
  const firstPage = await listUsers({ role: "partner", page: 1, limit: 50 });
  const partners = [...firstPage.data];
  const totalPages = firstPage.pagination?.pages || 1;

  console.info("[AssignmentManagement] Approved partner page 1", {
    received: firstPage.data.length,
    total: firstPage.pagination?.total,
    totalPages,
  });

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await listUsers({ role: "partner", page, limit: 50 });
    partners.push(...response.data);
    console.info(`[AssignmentManagement] Approved partner page ${page}`, {
      received: response.data.length,
    });
  }

  const approvedPartners = partners.filter((partner) => partner.partnerProfile?.status?.toLowerCase() === "approved");
  console.info("[AssignmentManagement] Approved partners loaded", {
    received: partners.length,
    approved: approvedPartners.length,
    workAreaSamples: approvedPartners.slice(0, 3).map((partner) => ({
      name: partner.name,
      areas: partner.partnerProfile?.workAreas || (partner as typeof partner & { workAreas?: string[] }).workAreas || [],
    })),
  });
  return approvedPartners;
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
  const [areaEditorOpen, setAreaEditorOpen] = useState(false);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);

  const rulesQuery = useQuery({
    queryKey: ["assignment-management-rules"],
    queryFn: getAssignmentRules,
  });
  const partnerQuery = useQuery({
    queryKey: ["assignment-management-partners", partnerSearch],
    queryFn: () => searchAssignmentPartners(partnerSearch),
    enabled: partnerSearch.trim().length >= 2,
  });
  const areaPartnerQuery = useQuery({
    queryKey: ["assignment-management-area-partners", areaPartnerSearch],
    queryFn: () => searchAssignmentPartners(areaPartnerSearch),
    enabled: areaPartnerSearchOpen && areaPartnerSearch.trim().length >= 2,
  });
  const customerQuery = useQuery({
    queryKey: ["assignment-management-customers", phoneSearch],
    queryFn: () => listUsers({ search: phoneSearch, role: "Customer", limit: 10 }),
    enabled: phoneSearch.trim().length >= 2,
  });
  const approvedPartnersQuery = useQuery({
    queryKey: ["assignment-management-approved-partners"],
    queryFn: listAllApprovedPartners,
  });

  const rules = rulesQuery.data?.data;
  const preferredPartners = rules?.preferredPartners || [];
  const approvedAreaPartners = (approvedPartnersQuery.data || []).map((partner) => ({
    profileId: String(partner._id || partner.profileId || partner.userId),
    uid: String(partner.uid || partner.userId),
    name: partner.name || partner.fullName || "Partner",
    phone: partner.phone,
    categories: partner.partnerProfile?.categories || [],
    areas: partner.partnerProfile?.workAreas || (partner as typeof partner & { workAreas?: string[] }).workAreas || [],
    priority: 0,
    active: true,
  }));
  const areaCategories = Array.from(new Set(approvedAreaPartners.flatMap((partner) => partner.categories || []).filter(Boolean))).sort();
  const areaNames = Array.from(new Set([
    ...approvedAreaPartners.flatMap((partner) => partner.areas || []).filter(Boolean),
    ...(rules?.areaRules || []).map((rule) => rule.area).filter(Boolean),
  ])).sort();
  const areaPartnerSource = approvedAreaPartners.filter((partner) =>
    areaWorkTypeFilter !== "book_now" || areaCategoryFilter === "all" || (partner.categories || []).some((category) => category.toLowerCase() === areaCategoryFilter.toLowerCase()),
  );
  const areaRules = rules?.areaRules || [];
  const getApprovedPartnersForArea = (area: string) => areaPartnerSource.filter((partner) => (partner.areas || []).some((partnerArea) => {
    const normalizedPartnerArea = normalizeArea(partnerArea);
    const normalizedArea = normalizeArea(area);
    return normalizedPartnerArea === normalizedArea || normalizedPartnerArea.includes(normalizedArea) || normalizedArea.includes(normalizedPartnerArea);
  }));
  const allExcludedPhones = rules?.excludedPhones || [];
  const excludedPhoneSet = new Set(allExcludedPhones.map(normalizePhone).filter(Boolean));
  const getEligiblePartnersForArea = (area: string) => getApprovedPartnersForArea(area)
    .filter((partner) => !excludedPhoneSet.has(normalizePhone(partner.phone)));
  const getRuleEligiblePartners = (rule: AreaAssignmentRule) => (rule.preferredPartners || [])
    .filter((partner) => !excludedPhoneSet.has(normalizePhone(partner.phone)));
  const getEligiblePartnersForAreaCategory = (area: string, category: string) => approvedAreaPartners
    .filter((partner) => (partner.categories || []).some((item) => item.toLowerCase() === category.toLowerCase()))
    .filter((partner) => (partner.areas || []).some((partnerArea) => {
      const normalizedPartnerArea = normalizeArea(partnerArea);
      const normalizedArea = normalizeArea(area);
      return normalizedPartnerArea === normalizedArea || normalizedPartnerArea.includes(normalizedArea) || normalizedArea.includes(normalizedPartnerArea);
    }))
    .filter((partner) => !excludedPhoneSet.has(normalizePhone(partner.phone)));
  const defaultAreaNames = Array.from(new Set(
    areaPartnerSource.flatMap((partner) => partner.areas || []).filter(Boolean),
  ));
  console.info("[AssignmentManagement] Areas derived", {
    approvedPartners: areaPartnerSource.length,
    areas: defaultAreaNames,
  });
  const defaultAreaRules: AreaAssignmentRule[] = defaultAreaNames.map((area) => ({
    area,
    zone: "Default Zone",
    workTypes: ["hourly"],
    active: true,
    preferredPartners: getApprovedPartnersForArea(area)
      .map((partner, index) => ({ ...partner, priority: index })),
  }));
  const allAreaRules = [
    ...areaRules,
    ...defaultAreaRules.filter((defaultRule) => !areaRules.some((rule) => normalizeArea(rule.area) === normalizeArea(defaultRule.area))),
  ].filter((rule) => normalizeArea(rule.area).length > 0);
  const availableAreaRules = allAreaRules.filter((rule) => {
    const hasEligiblePartner = Math.max(getEligiblePartnersForArea(rule.area).length, getRuleEligiblePartners(rule).length) >= 1;
    const matchesWorkType = (rule.workTypes || []).includes(areaWorkTypeFilter);
    const matchesCategory = areaWorkTypeFilter !== "book_now" || areaCategoryFilter === "all" || rule.category?.toLowerCase() === areaCategoryFilter.toLowerCase();
    return hasEligiblePartner && matchesWorkType && matchesCategory;
  });
  const visibleAreaRules = availableAreaRules.filter((rule) => {
    const matchesSearch = String(rule.area || "").toLowerCase().includes(areaSearch.toLowerCase());
    return matchesSearch;
  });
  const matchingAreaPartners = areaRuleWorkType === "book_now" && areaRuleCategory ? getEligiblePartnersForAreaCategory(areaName, areaRuleCategory) : getEligiblePartnersForArea(areaName);
  const selectedAreaPartners = areaPartnerIds
    .map((id) => areaPartnerSource.find((partner) => partner.profileId === id) || areaAddedPartners.find((partner) => partnerId(partner) === id))
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
        .map((profileId) => areaPartnerSource.find((partner) => partner.profileId === profileId) || areaAddedPartners.find((partner) => partnerId(partner) === profileId))
        .filter(Boolean) as AreaAssignmentRule["preferredPartners"],
    }),
    onSuccess: (data) => {
      refreshRules(data);
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

  const handleAreaNameChange = (value: string) => {
    setAreaName(value);
    setAreaPartnerIds([]);
  };

  const openAreaEditor = (rule?: AreaAssignmentRule) => {
    if (rule) {
      setAreaName(rule.area);
      setAreaRuleCategory(rule.category || "");
      setAreaRuleWorkType(rule.workTypes?.[0] || "hourly");
      setAreaPartnerIds(rule.preferredPartners.map((partner) => partner.profileId));
      setAreaAddedPartners(rule.preferredPartners);
    } else {
      setAreaName("");
      setAreaRuleCategory("");
      setAreaRuleWorkType("hourly");
      setAreaPartnerIds([]);
      setAreaAddedPartners([]);
    }
    setAreaPartnerSearch("");
    setAreaPartnerSearchOpen(false);
    setAreaDropdownOpen(false);
    setAreaDropdownOpen(false);
    setAreaEditorOpen(true);
  };

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
          <div className={areaEditorOpen ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]" : ""}>
          <Card className="min-w-0">
            <CardHeader className="border-b bg-white pb-5"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Filters</h3><Button className="h-10" onClick={() => openAreaEditor()}><Plus className="mr-2 h-4 w-4" />Add Area Rule</Button></div><div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 xl:grid-cols-3"><label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Search</span><Input className="h-10 w-full bg-white" value={areaSearch} onChange={(event) => setAreaSearch(event.target.value)} placeholder="Search area..." /></label><label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Work type</span><select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaWorkTypeFilter} onChange={(event) => { setAreaWorkTypeFilter(event.target.value); if (event.target.value === "hourly") setAreaCategoryFilter("all"); }} aria-label="Filter areas by work type"><option value="hourly">Hourly</option><option value="book_now">Book Now</option></select></label>{areaWorkTypeFilter === "book_now" && <label className="space-y-1.5"><span className="text-xs font-medium uppercase tracking-wide text-gray-500">Category</span><select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaCategoryFilter} onChange={(event) => setAreaCategoryFilter(event.target.value)} aria-label="Filter Book Now areas by category"><option value="all">All categories</option>{areaCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}</div><div className="mt-4"><Button variant="outline" onClick={() => { setAreaSearch(""); setAreaWorkTypeFilter("hourly"); setAreaCategoryFilter("all"); }}>Reset</Button></div></CardHeader>
            <CardContent className="p-4 sm:p-5"><div className="overflow-x-auto rounded-lg border border-gray-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Work Type</th>{areaWorkTypeFilter === "book_now" && <th className="px-4 py-3">Category</th>}<th className="px-4 py-3">Preferred Partners</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{visibleAreaRules.map((rule, index) => <tr key={rule.area || `area-${index}`} className="border-b transition-colors last:border-0 hover:bg-amber-50/40"><td className="px-4 py-3 text-gray-400">{index + 1}</td><td className="px-4 py-3 font-medium text-gray-900">{rule.area || "Unnamed area"}</td><td className="px-4 py-3 text-gray-600">{(rule.workTypes || []).join(", ") || "-"}</td>{areaWorkTypeFilter === "book_now" && <td className="px-4 py-3 text-gray-600">{rule.category || "-"}</td>}<td className="px-4 py-3 text-gray-600">{Math.max(getEligiblePartnersForArea(rule.area).length, getRuleEligiblePartners(rule).length) || "-"}</td><td className="px-4 py-3"><Badge variant="success">Active</Badge></td><td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => openAreaEditor(rule)}>Edit</Button></td></tr>)}</tbody></table></div>{visibleAreaRules.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No area rules configured yet.</p>}</CardContent>
          </Card>
          {areaEditorOpen && <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Edit Area Rule</CardTitle>
              <CardDescription>Choose partners in priority order for this area.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="relative"><Input value={areaName} onChange={(event) => { handleAreaNameChange(event.target.value); setAreaDropdownOpen(event.target.value.trim().length > 0); }} placeholder="Type area..." aria-label="Search area" autoFocus />{areaDropdownOpen && areaName.trim() && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white p-1 shadow-lg">{areaNames.filter((area) => normalizeArea(area).includes(normalizeArea(areaName))).map((area) => <button key={area} type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-amber-50" onClick={() => { handleAreaNameChange(area); setAreaDropdownOpen(false); }}>{area}</button>)}{areaNames.filter((area) => normalizeArea(area).includes(normalizeArea(areaName))).length === 0 && <p className="px-3 py-2 text-sm text-gray-500">No matching areas</p>}</div>}</div>
                {areaName.trim() && <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaRuleWorkType} onChange={(event) => { setAreaRuleWorkType(event.target.value); if (event.target.value === "hourly") setAreaRuleCategory(""); }} aria-label="Select work type"><option value="hourly">Hourly</option><option value="book_now">Book Now</option></select>}
                {areaName.trim() && areaRuleWorkType === "book_now" && <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={areaRuleCategory} onChange={(event) => setAreaRuleCategory(event.target.value)} aria-label="Select area category"><option value="">Select category</option>{areaCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>}
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-gray-700">Partners for this area{areaRuleWorkType === "book_now" ? " and category" : ""}</p>{(areaRuleWorkType === "hourly" || areaRuleCategory) && <Button type="button" size="sm" variant="outline" onClick={() => setAreaPartnerSearchOpen((open) => !open)}><Plus className="mr-1 h-3 w-3" />Add Partner</Button>}</div>
                {areaPartnerSearchOpen && <div className="relative"><Input value={areaPartnerSearch} onChange={(event) => setAreaPartnerSearch(event.target.value)} placeholder="Search by name or phone..." autoFocus />{(areaPartnerQuery.isFetching || areaPartnerSearch.trim().length >= 2) && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white p-1 shadow-lg">{areaPartnerQuery.isFetching && <p className="px-3 py-2 text-xs text-gray-500">Searching...</p>}{(areaPartnerQuery.data?.data || []).map((partner) => { const id = partnerId(partner); const added = areaPartnerIds.includes(id); return <button type="button" key={id} disabled={added} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-amber-50 disabled:opacity-60" onClick={() => { setAreaPartnerIds((current) => current.includes(id) ? current : [...current, id]); setAreaAddedPartners((current) => current.some((item) => partnerId(item) === id) ? current : [...current, partner]); setAreaPartnerSearch(""); }}><span>{partnerName(partner)} <span className="text-xs text-gray-500">{partner.phone || partner.phoneNumber || partnerUid(partner)}</span></span><span className="text-xs font-medium text-amber-700">{added ? "Added" : "Add"}</span></button>; })}</div>}</div>}
                <div className="space-y-1"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Added partners</p>{selectedAreaPartners.length === 0 && <p className="text-sm text-gray-500">No partners added yet.</p>}{selectedAreaPartners.map((partner) => <div key={partnerId(partner)} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"><span>{partnerName(partner)} <span className="text-xs text-gray-500">{partner.phone || partner.phoneNumber || partnerUid(partner)}</span></span><button type="button" className="text-xs text-red-600 hover:underline" onClick={() => { const id = partnerId(partner); setAreaPartnerIds((current) => current.filter((item) => item !== id)); setAreaAddedPartners((current) => current.filter((item) => partnerId(item) !== id)); }}>Remove</button></div>)}</div>
                {areaName && matchingAreaPartners.length > 0 && <p className="text-xs text-gray-500">Approved partners already matching this area are available to add.</p>}
              </div>
              <Button className="w-full" onClick={() => saveAreaRuleMutation.mutate()} disabled={saveAreaRuleMutation.isPending || !areaName.trim() || (areaRuleWorkType === "book_now" && !areaRuleCategory) || areaPartnerIds.length === 0}>
                {saveAreaRuleMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Save Area Rule
              </Button>
            </CardContent>
          </Card>}
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
