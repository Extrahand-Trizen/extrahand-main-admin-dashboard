"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, CircleDashed, Pencil, Plus, RefreshCw, Ticket, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bulkCreateCoupons,
  createCoupon,
  deleteCoupon,
  listCoupons,
  listHubSections,
  listServiceContent,
  updateCoupon,
  updateCouponStatus,
  type Coupon,
  type CouponFlow,
  type HubSection,
  type ServiceContent,
} from "@/lib/api/coupon-management";
import { Field, FormDialog, Notice, Pager, PanelHeader, StatusBadge, fieldClass, textareaClass } from "./shared";

function CouponMetric({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
  tone: "amber" | "green" | "slate" | "blue";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    slate: "bg-slate-50 text-slate-600 ring-slate-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
  }[tone];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-950">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{detail}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${toneClass}`}>{icon}</span>
      </div>
    </div>
  );
}

type CouponFormState = {
  code: string;
  codesText: string;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: string;
  minOrderAmount: string;
  applicableTo: "ALL_SERVICES" | "SELECTED_SERVICES";
  serviceIds: string[];
  applicableLocations: "ALL_LOCATIONS" | "SELECTED_LOCATIONS";
  citiesInput: string;
  pincodesInput: string;
  flowBookNow: boolean;
  flowPostCompare: boolean;
  redemptionScope: "PER_USER" | "GLOBAL_SINGLE_USE";
  firstBookingOnly: boolean;
  usageLimitPerUser: string;
  overallUsageLimit: string;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
};

type Target = { slug: string; label: string; group: "Book Now" | "Post & Compare" };

const BOOK_NOW_DEFAULTS: Target[] = [
  ["hourly-helper", "Hourly Based Services (All Durations)"],
  ["hourly-1h", "Hourly Helper · 1 hour"],
  ["hourly-1-5h", "Hourly Helper · 1.5 hours"],
  ["hourly-2h", "Hourly Helper · 2 hours"],
  ["hourly-3h", "Hourly Helper · 3 hours"],
  ["hourly-4h", "Hourly Helper · 4 hours"],
  ["full-house", "Full House Cleaning"],
  ["bathroom", "Bathroom Cleaning"],
  ["kitchen", "Kitchen Cleaning"],
  ["sofa", "Sofa Cleaning"],
  ["mattress", "Mattress Cleaning"],
  ["window-glass", "Window & Glass Cleaning"],
  ["ac-services", "AC Services"],
  ["appliance-repair", "Appliance Repair"],
  ["womens-beauty", "Women's Beauty"],
  ["womens-hair", "Women's Hair"],
  ["mens-grooming", "Men's Grooming"],
  ["massage", "Massage"],
].map(([slug, label]) => ({ slug, label, group: "Book Now" }));
const POST_COMPARE_DEFAULTS: Target[] = [
  ["hourly-based", "Hourly Based Services"], ["business-services", "Business Services"],
  ["marketing-design", "Marketing & Design"], ["ac-repair", "AC Repair & Service"],
  ["appliance-repair", "Appliance Repair"], ["beauty-services", "Beauty Services"],
  ["car-washing", "Car Washing / Car Cleaning"], ["roadside-assistance", "Roadside Assistance"],
  ["maid", "Maid"], ["personal-assistances", "Personal Assistance"], ["carpenter", "Carpenter"],
  ["cooking-home-chef", "Cooking / Home Chef"], ["deep-cleaning", "Deep Cleaning"],
  ["delivery-pickup-services", "Delivery / Pickup Services"], ["driver-chauffeur", "Driver / Chauffeur"],
  ["electrical", "Electrical"], ["event-services", "Event Services"], ["fitness-trainers", "Fitness Trainers"],
  ["furniture-assembly", "Furniture Assembly"], ["gardening", "Gardening"],
  ["handyperson", "Handyperson / General Repairs"], ["home-cleaning", "Home Cleaning"],
  ["it-support", "IT Support / Laptop Repair"], ["laundry-ironing", "Laundry / Ironing"],
  ["massage-spa", "Massage / Spa"], ["packers-movers", "Packers & Movers"], ["painting", "Painting"],
  ["pest-control", "Pest Control"], ["photographer-videographer", "Photographer / Videographer"],
  ["plumbing", "Plumbing"], ["security-patrol", "Security Patrol / Watchman"],
  ["senior-care-elder-care", "Senior Care / Elder Care"], ["tutors", "Tutors"],
  ["water-tanker-services", "Water & Tanker Services"], ["pet-services", "Pet Services"],
  ["accounting", "Accounting"], ["receptionist-services", "Receptionist Services"],
  ["writing-services", "Writing Services"], ["other", "Other"],
].map(([slug, label]) => ({ slug, label, group: "Post & Compare" }));

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): CouponFormState => ({
  code: "",
  codesText: "",
  discountType: "FIXED",
  discountValue: "100",
  minOrderAmount: "499",
  applicableTo: "ALL_SERVICES",
  serviceIds: [],
  applicableLocations: "ALL_LOCATIONS",
  citiesInput: "",
  pincodesInput: "",
  flowBookNow: true,
  flowPostCompare: false,
  redemptionScope: "PER_USER",
  firstBookingOnly: false,
  usageLimitPerUser: "1",
  overallUsageLimit: "",
  startDate: today(),
  expiryDate: "",
  isActive: true,
});

function labelFor(slug: string, targets: Target[]) {
  return targets.find((target) => target.slug === slug)?.label || slug;
}

function flowsFor(serviceIds: string[], targets: Target[]) {
  const selected = targets.filter((target) => serviceIds.includes(target.slug));
  return {
    flowBookNow: selected.some((target) => target.group === "Book Now"),
    flowPostCompare: selected.some((target) => target.group === "Post & Compare"),
  };
}

function parseCodes(raw: string) {
  return [...new Set(raw.split(/[\s,;]+/).map((code) => code.trim().toUpperCase()).filter(Boolean))];
}

function makePayload(form: CouponFormState, targets: Target[], bulk: boolean, allowPostCompare: boolean) {
  const availableTargets = allowPostCompare
    ? targets
    : targets.filter((target) => target.group === "Book Now");
  const selectedFlow = form.applicableTo === "SELECTED_SERVICES"
    ? flowsFor(form.serviceIds, availableTargets)
    : null;
  const applicableFlows: CouponFlow[] = [];
  if (selectedFlow ? selectedFlow.flowBookNow : form.flowBookNow) applicableFlows.push("BOOK_NOW");
  if (allowPostCompare && (selectedFlow ? selectedFlow.flowPostCompare : form.flowPostCompare)) {
    applicableFlows.push("POST_COMPARE");
  }
  if (!applicableFlows.length) throw new Error(
    selectedFlow ? "Select at least one Book Now service" : "Select at least one applicable flow",
  );
  if (form.applicableTo === "SELECTED_SERVICES" && form.serviceIds.length === 0) {
    throw new Error("Select at least one category or service");
  }
  const cities = form.citiesInput.split(",").map((city) => city.trim().toUpperCase()).filter(Boolean);
  const pincodes = form.pincodesInput.split(",").map((pincode) => pincode.trim()).filter(Boolean);
  if (form.applicableLocations === "SELECTED_LOCATIONS" && !cities.length && !pincodes.length) {
    throw new Error("Specify at least one city or pincode when restricting to selected locations");
  }
  const discountValue = Number(form.discountValue);
  const minOrderAmount = Number(form.minOrderAmount);
  if (!Number.isFinite(discountValue) || discountValue < 0) throw new Error("Enter a valid discount value");
  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) throw new Error("Enter a valid minimum order amount");
  if (!bulk && !form.code.trim()) throw new Error("Coupon code is required");
  if (!bulk && form.redemptionScope === "PER_USER" && Number(form.usageLimitPerUser) < 1) {
    throw new Error("Usage limit per user must be at least 1");
  }
  return {
    ...(bulk ? {} : { code: form.code.trim().toUpperCase() }),
    discountType: form.discountType,
    discountValue,
    minOrderAmount,
    applicableTo: form.applicableTo,
    serviceIds: form.applicableTo === "SELECTED_SERVICES" ? form.serviceIds : [],
    applicableLocations: form.applicableLocations,
    cities: form.applicableLocations === "SELECTED_LOCATIONS" ? cities : [],
    pincodes: form.applicableLocations === "SELECTED_LOCATIONS" ? pincodes : [],
    applicableFlows,
    redemptionScope: bulk ? "GLOBAL_SINGLE_USE" : form.redemptionScope,
    firstBookingOnly: form.firstBookingOnly,
    usageLimitPerUser: bulk || form.redemptionScope === "GLOBAL_SINGLE_USE" ? 1 : Number(form.usageLimitPerUser) || 1,
    overallUsageLimit: Number(form.overallUsageLimit) > 0 ? Number(form.overallUsageLimit) : null,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
    expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
    isActive: form.isActive,
  };
}

function CouponTargets({
  targets,
  selected,
  onChange,
  disabled,
}: {
  targets: Target[];
  selected: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const groups = [...new Set(targets.map((target) => target.group))];
  const matches = targets.filter((target) => `${target.label} ${target.slug}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className={`rounded-lg border border-gray-200 p-3 ${disabled ? "bg-gray-50 opacity-70" : "bg-white"}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-800">Target categories & services ({selected.length})</p>
        <Button type="button" variant="ghost" size="sm" disabled={disabled || !selected.length} onClick={() => onChange([])}>Clear all</Button>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search category or service…" disabled={disabled} />
      {targets.length === 0 ? <p className="mt-2 text-sm text-gray-500">Options are loaded from catalog; you may still select the available built-in categories.</p> : null}
      <div className="mt-3 grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
        {groups.map((group) => (
          <fieldset className="rounded-md border border-gray-100 p-2" key={group}>
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{group}</legend>
            <div className="space-y-1">
              {matches.filter((target) => target.group === group).map((target) => (
                <label key={`${group}-${target.slug}`} className="flex items-start gap-2 rounded px-1 py-1 text-sm text-gray-700 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="mt-1 accent-amber-600"
                    checked={selected.includes(target.slug)}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.checked ? [...selected, target.slug] : selected.filter((slug) => slug !== target.slug))}
                  />
                  <span>{target.label}<span className="block text-xs text-gray-400">{target.slug}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {selected.length ? <div className="mt-3 flex flex-wrap gap-1">{selected.map((slug) => <Badge variant="secondary" key={slug}>{labelFor(slug, targets)}</Badge>)}</div> : null}
    </div>
  );
}

function CouponFormFields({
  value,
  onChange,
  targets,
  bulk,
  editing,
  onFile,
}: {
  value: CouponFormState;
  onChange: (value: CouponFormState) => void;
  targets: Target[];
  bulk: boolean;
  editing: boolean;
  onFile?: (file: File | null) => void;
}) {
  const set = (patch: Partial<CouponFormState>) => onChange({ ...value, ...patch });
  const formTargets = editing ? targets : targets.filter((target) => target.group === "Book Now");
  const visibleFlows: CouponFlow[] = editing ? ["BOOK_NOW", "POST_COMPARE"] : ["BOOK_NOW"];
  const selectedFlows = value.applicableTo === "SELECTED_SERVICES" ? flowsFor(value.serviceIds, formTargets) : null;
  return (
    <div className="space-y-4">
      {bulk ? (
        <>
          <p className="text-sm text-gray-600">Paste codes or import a .txt / .csv file. Bulk codes are global single-use and stay hidden from customer auto-suggest lists.</p>
          <Field label="Coupon codes">
            <textarea className={textareaClass} rows={6} value={value.codesText} onChange={(event) => set({ codesText: event.target.value.toUpperCase() })} placeholder={"TARUN100\nTARUN101\nTARUN102"} />
          </Field>
          <Field label="Upload file (.txt or .csv)">
            <input className={fieldClass} type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(event) => onFile?.(event.target.files?.[0] || null)} />
          </Field>
        </>
      ) : (
        <Field label="Coupon code">
          <Input required disabled={editing} value={value.code} onChange={(event) => set({ code: event.target.value.toUpperCase() })} placeholder="FIRST100" />
        </Field>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Discount type">
          <select className={fieldClass} value={value.discountType} onChange={(event) => set({ discountType: event.target.value as CouponFormState["discountType"] })}>
            <option value="FIXED">Fixed (₹)</option><option value="PERCENTAGE">Percentage (%)</option>
          </select>
        </Field>
        <Field label="Discount value">
          <Input required type="number" min="0" step="0.01" value={value.discountValue} onChange={(event) => set({ discountValue: event.target.value })} />
        </Field>
        <Field label="Minimum order amount">
          <Input type="number" min="0" value={value.minOrderAmount} onChange={(event) => set({ minOrderAmount: event.target.value })} />
        </Field>
        <Field label="Applicable to">
          <select
            className={fieldClass}
            value={value.applicableTo}
            onChange={(event) => {
              const applicableTo = event.target.value as CouponFormState["applicableTo"];
              if (applicableTo === "ALL_SERVICES") set({ applicableTo, serviceIds: [] });
              else set({ applicableTo, ...flowsFor(value.serviceIds, formTargets) });
            }}
          >
            <option value="ALL_SERVICES">Everything</option><option value="SELECTED_SERVICES">Selected services and categories</option>
          </select>
        </Field>
        {!bulk ? (
          <Field label="Redemption mode">
            <select className={fieldClass} value={value.redemptionScope} onChange={(event) => {
              const redemptionScope = event.target.value as CouponFormState["redemptionScope"];
              set({ redemptionScope, usageLimitPerUser: redemptionScope === "GLOBAL_SINGLE_USE" ? "1" : value.usageLimitPerUser });
            }}>
              <option value="PER_USER">Per user</option><option value="GLOBAL_SINGLE_USE">Global single use</option>
            </select>
          </Field>
        ) : null}
        {!bulk ? (
          <Field label="Usage limit per user">
            <Input type="number" min="1" disabled={value.redemptionScope === "GLOBAL_SINGLE_USE"} value={value.usageLimitPerUser} onChange={(event) => set({ usageLimitPerUser: event.target.value })} />
          </Field>
        ) : null}
        <Field label="Overall usage limit (optional)">
          <Input type="number" min="1" value={value.overallUsageLimit} onChange={(event) => set({ overallUsageLimit: event.target.value })} placeholder="100" />
        </Field>
        <Field label="Start date">
          <Input type="date" value={value.startDate} onChange={(event) => set({ startDate: event.target.value })} />
        </Field>
        <Field label="Expiry date (optional)">
          <Input type="date" value={value.expiryDate} onChange={(event) => set({ expiryDate: event.target.value })} />
        </Field>
      </div>
      <Field label="Target categories and subcategories">
        <CouponTargets targets={formTargets} selected={value.serviceIds} disabled={value.applicableTo !== "SELECTED_SERVICES"} onChange={(serviceIds) => set({ serviceIds, ...flowsFor(serviceIds, formTargets) })} />
      </Field>
      <Field label="Applicable flows">
        <div className="flex flex-wrap gap-5 rounded-lg border border-gray-200 p-3">
          {visibleFlows.map((flow) => {
            const checked = selectedFlows ? (flow === "BOOK_NOW" ? selectedFlows.flowBookNow : selectedFlows.flowPostCompare) : (flow === "BOOK_NOW" ? value.flowBookNow : value.flowPostCompare);
            return <label key={flow} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="accent-amber-600" checked={checked} disabled={value.applicableTo === "SELECTED_SERVICES"} onChange={(event) => set(flow === "BOOK_NOW" ? { flowBookNow: event.target.checked } : { flowPostCompare: event.target.checked })} />
              {flow === "BOOK_NOW" ? "Book Now" : "Post & Compare"}
            </label>;
          })}
        </div>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Applicable locations">
          <select className={fieldClass} value={value.applicableLocations} onChange={(event) => set({ applicableLocations: event.target.value as CouponFormState["applicableLocations"] })}>
            <option value="ALL_LOCATIONS">All locations</option><option value="SELECTED_LOCATIONS">Selected locations</option>
          </select>
        </Field>
        <Field label="Cities (comma-separated)">
          <Input disabled={value.applicableLocations !== "SELECTED_LOCATIONS"} value={value.citiesInput} onChange={(event) => set({ citiesInput: event.target.value })} placeholder="HYDERABAD, BENGALURU" />
        </Field>
        <Field label="Pincodes (comma-separated)">
          <Input disabled={value.applicableLocations !== "SELECTED_LOCATIONS"} value={value.pincodesInput} onChange={(event) => set({ pincodesInput: event.target.value })} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700">
          <input type="checkbox" className="accent-amber-600" checked={value.firstBookingOnly} onChange={(event) => set({ firstBookingOnly: event.target.checked })} />
          First booking only
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input type="checkbox" className="accent-amber-600" checked={value.isActive} onChange={(event) => set({ isActive: event.target.checked })} />
        Active
      </label>
    </div>
  );
}

export default function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [services, setServices] = useState<ServiceContent[]>([]);
  const [sections, setSections] = useState<HubSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [flow, setFlow] = useState<"all" | CouponFlow>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(0);
  const [form, setForm] = useState<CouponFormState | null>(null);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<Awaited<ReturnType<typeof bulkCreateCoupons>> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCoupons(await listCoupons());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void Promise.all([listServiceContent(), listHubSections()])
      .then(([serviceRows, sectionRows]) => { setServices(serviceRows); setSections(sectionRows); })
      .catch((cause) => setError(cause instanceof Error ? `Unable to load target options: ${cause.message}` : "Unable to load target options"));
  }, [load]);

  const targets = useMemo(() => {
    const map = new Map<string, Target>();
    for (const option of BOOK_NOW_DEFAULTS) map.set(`${option.group}:${option.slug}`, option);
    for (const option of POST_COMPARE_DEFAULTS) map.set(`${option.group}:${option.slug}`, option);
    for (const service of services) map.set(`Book Now:${service.categorySlug}`, { slug: service.categorySlug, label: service.title || service.categorySlug, group: "Book Now" });
    for (const section of sections) for (const service of section.services || []) {
      if (service.categorySlug) map.set(`Book Now:${service.categorySlug}`, { slug: service.categorySlug, label: service.label || service.categorySlug, group: "Book Now" });
    }
    return [...map.values()].sort((a, b) => a.group === b.group ? a.label.localeCompare(b.label) : a.group === "Book Now" ? -1 : 1);
  }, [services, sections]);
  const filtered = useMemo(() => {
    const query = listQuery.trim().toLowerCase();
    return coupons.filter((coupon) => {
      if (status === "active" && !coupon.isActive) return false;
      if (status === "inactive" && coupon.isActive) return false;
      if (flow !== "all" && !(coupon.applicableFlows || []).includes(flow)) return false;
      if (!query) return true;
      return [coupon.code, coupon.applicableTo, ...(coupon.serviceIds || []), ...(coupon.applicableFlows || []), ...(coupon.serviceIds || []).map((slug) => labelFor(slug, targets))].join(" ").toLowerCase().includes(query);
    });
  }, [coupons, flow, listQuery, status, targets]);
  const paged = pageSize === 0
    ? filtered
    : filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = coupons.filter((coupon) => coupon.isActive).length;
  const inactiveCount = coupons.length - activeCount;
  const globalSingleUseCount = coupons.filter((coupon) => coupon.redemptionScope === "GLOBAL_SINGLE_USE").length;

  const closeForm = () => { setForm(null); setEditing(null); setFormError(null); };
  const openCreate = () => { setEditing(null); setForm(emptyForm()); setFormError(null); };
  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setForm({
      ...emptyForm(),
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderAmount: String(coupon.minOrderAmount),
      applicableTo: coupon.applicableTo,
      serviceIds: coupon.serviceIds || [],
      applicableLocations: coupon.applicableLocations || "ALL_LOCATIONS",
      citiesInput: (coupon.cities || []).join(", "),
      pincodesInput: (coupon.pincodes || []).join(", "),
      flowBookNow: (coupon.applicableFlows || []).includes("BOOK_NOW"),
      flowPostCompare: (coupon.applicableFlows || []).includes("POST_COMPARE"),
      redemptionScope: coupon.redemptionScope || "PER_USER",
      firstBookingOnly: coupon.firstBookingOnly,
      usageLimitPerUser: String(coupon.usageLimitPerUser),
      overallUsageLimit: coupon.overallUsageLimit == null ? "" : String(coupon.overallUsageLimit),
      startDate: coupon.startDate?.slice(0, 10) || today(),
      expiryDate: coupon.expiryDate?.slice(0, 10) || "",
      isActive: coupon.isActive,
    });
    setFormError(null);
  };

  const saveCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    setFormError(null);
    let payload: ReturnType<typeof makePayload>;
    try { payload = makePayload(form, targets, false, Boolean(editing)); } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Check the coupon details");
      return;
    }
    setSaving(true);
    try {
      if (editing) await updateCoupon(editing._id, payload);
      else await createCoupon(payload);
      closeForm();
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Coupon save failed");
    } finally { setSaving(false); }
  };

  const saveBulk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    setFormError(null);
    setBulkResult(null);
    const codes = parseCodes(form.codesText);
    if (!codes.length) { setFormError("Paste or upload at least one coupon code."); return; }
    let sharedPayload: ReturnType<typeof makePayload>;
    try { sharedPayload = makePayload(form, targets, true, false); } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Check the coupon details");
      return;
    }
    setSaving(true);
    try {
      const result = await bulkCreateCoupons({ codes, ...sharedPayload });
      setBulkResult(result);
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Bulk upload failed");
    } finally { setSaving(false); }
  };

  const handleFile = async (file: File | null) => {
    if (!file || !form) return;
    try {
      const text = await file.text();
      setForm((current) => current ? { ...current, codesText: [current.codesText.trim(), text.trim()].filter(Boolean).join("\n") } : current);
      setFormError(null);
    } catch {
      setFormError("Unable to read the uploaded file.");
    }
  };

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    setError(null);
    try { await action(); await load(); } catch (cause) {
      setError(cause instanceof Error ? cause.message : message);
    }
  };

  return (
    <section className="space-y-5">
      <PanelHeader
        title="Coupons"
        description="Create discount codes and control where customers can use them."
        action={<div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-gray-300 bg-white" onClick={() => { setForm(emptyForm()); setFormError(null); setBulkResult(null); setBulkOpen(true); }}><Upload />Bulk import</Button>
          <Button className="bg-amber-500 text-gray-950 shadow-sm hover:bg-amber-400" onClick={openCreate}><Plus />Create coupon</Button>
        </div>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CouponMetric label="All coupons" value={coupons.length} detail="Created coupon codes" icon={<Ticket className="h-5 w-5" />} tone="amber" />
        <CouponMetric label="Active" value={activeCount} detail="Available to customers" icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <CouponMetric label="Inactive" value={inactiveCount} detail="Currently disabled" icon={<CircleDashed className="h-5 w-5" />} tone="slate" />
        <CouponMetric label="Single-use" value={globalSingleUseCount} detail="One redemption globally" icon={<Ticket className="h-5 w-5" />} tone="blue" />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <Input className="min-w-0 flex-1 border-gray-200 bg-gray-50/60 sm:max-w-md" value={listQuery} onChange={(event) => { setListQuery(event.target.value); setPage(1); }} placeholder="Search code, service, or category…" />
        <div className="flex flex-wrap gap-2">
          <select className={`${fieldClass} w-auto min-w-32 bg-gray-50/60`} value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}>
            <option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
          <select className={`${fieldClass} w-auto min-w-36 bg-gray-50/60`} value={flow} onChange={(event) => { setFlow(event.target.value as typeof flow); setPage(1); }}>
            <option value="all">All flows</option><option value="BOOK_NOW">Book Now</option><option value="POST_COMPARE">Post &amp; Compare</option>
          </select>
          <Button variant="outline" className="bg-white" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
        </div>
      </div>
      {error ? <Notice error>{error}</Notice> : null}
      <div className="space-y-3 md:hidden">
        {paged.map((coupon) => (
          <article key={coupon._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-semibold tracking-wide text-gray-950">{coupon.code}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {coupon.applicableTo === "ALL_SERVICES"
                    ? "All services"
                    : (coupon.serviceIds || []).slice(0, 2).map((slug) => labelFor(slug, targets)).join(", ")}
                  {(coupon.serviceIds || []).length > 2 ? ` +${coupon.serviceIds.length - 2} more` : ""}
                </p>
              </div>
              <StatusBadge active={coupon.isActive} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Discount</p>
                <p className="mt-1 font-semibold text-gray-900">{coupon.discountType === "FIXED" ? `₹${coupon.discountValue}` : `${coupon.discountValue}%`}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Min. order</p>
                <p className="mt-1 font-semibold text-gray-900">₹{coupon.minOrderAmount}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Applicable flows</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(coupon.applicableFlows || []).map((item) => (
                    <Badge variant="outline" key={item}>{item === "BOOK_NOW" ? "Book Now" : "Post & Compare"}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {coupon.redemptionScope === "GLOBAL_SINGLE_USE" ? <Badge variant="secondary">Global single use</Badge> : null}
              {typeof coupon.overallUsageLimit === "number" ? <Badge variant="secondary">{coupon.overallUsageLimit} total</Badge> : null}
              {coupon.firstBookingOnly ? <Badge variant="secondary">First booking</Badge> : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="w-full" onClick={() => openEdit(coupon)}><Pencil />Edit</Button>
              <Button size="sm" variant={coupon.isActive ? "secondary" : "default"} className="w-full" onClick={() => void runAction(() => updateCouponStatus(coupon._id, !coupon.isActive), "Status update failed")}>
                {coupon.isActive ? "Deactivate" : "Activate"}
              </Button>
              <Button size="sm" variant="destructive" className="col-span-2 w-full" onClick={() => { if (window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) void runAction(() => deleteCoupon(coupon._id), "Delete failed"); }}>
                <Trash2 />Delete
              </Button>
            </div>
          </article>
        ))}
        {paged.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
            {loading ? "Loading coupons…" : "No coupons match your filters."}
          </div>
        ) : null}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500"><tr>{["Code", "Discount", "Min order", "Scope", "Flows", "Status", "Actions"].map((item) => <th className="px-4 py-3.5 font-semibold" key={item}>{item}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((coupon) => <tr key={coupon._id} className="transition-colors hover:bg-amber-50/30">
              <td className="px-4 py-4"><strong className="font-semibold tracking-wide text-gray-900">{coupon.code}</strong><div className="mt-1.5 flex flex-wrap gap-1 text-xs text-gray-500">{coupon.redemptionScope === "GLOBAL_SINGLE_USE" ? <Badge variant="secondary">Global single use</Badge> : null}{typeof coupon.overallUsageLimit === "number" ? <Badge variant="secondary">{coupon.overallUsageLimit} total</Badge> : null}{coupon.firstBookingOnly ? <Badge variant="secondary">First booking</Badge> : null}</div></td>
              <td className="px-4 py-4"><span className="font-semibold text-gray-900">{coupon.discountType === "FIXED" ? `₹${coupon.discountValue}` : `${coupon.discountValue}%`}</span></td>
              <td className="px-4 py-4 text-gray-600">₹{coupon.minOrderAmount}</td>
              <td className="max-w-64 px-4 py-4 text-gray-600">{coupon.applicableTo === "ALL_SERVICES" ? "Everything" : (coupon.serviceIds || []).slice(0, 2).map((slug) => labelFor(slug, targets)).join(", ")}{(coupon.serviceIds || []).length > 2 ? ` +${coupon.serviceIds.length - 2} more` : ""}</td>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-1">{(coupon.applicableFlows || []).map((item) => <Badge variant="outline" className="whitespace-nowrap" key={item}>{item === "BOOK_NOW" ? "Book Now" : "Post & Compare"}</Badge>)}</div></td>
              <td className="px-4 py-3"><StatusBadge active={coupon.isActive} /></td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(coupon)}><Pencil />Edit</Button>
                <Button size="sm" variant={coupon.isActive ? "secondary" : "default"} onClick={() => void runAction(() => updateCouponStatus(coupon._id, !coupon.isActive), "Status update failed")}>{coupon.isActive ? "Deactivate" : "Activate"}</Button>
                <Button size="sm" variant="destructive" onClick={() => { if (window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) void runAction(() => deleteCoupon(coupon._id), "Delete failed"); }}><Trash2 />Delete</Button>
              </div></td>
            </tr>)}
            {paged.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">{loading ? "Loading coupons…" : "No coupons match your filters."}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} allowAll />

      {form ? <FormDialog title={editing ? "Edit coupon" : "Create coupon"} onClose={closeForm} onSubmit={saveCoupon} saving={saving} error={formError} submitLabel={editing ? "Save changes" : "Create coupon"}>
        <CouponFormFields value={form} onChange={setForm} targets={targets} bulk={false} editing={Boolean(editing)} />
      </FormDialog> : null}
      {bulkOpen && form ? <FormDialog title="Bulk upload global single-use coupons" onClose={() => { setBulkOpen(false); setForm(null); setBulkResult(null); setFormError(null); }} onSubmit={saveBulk} saving={saving} error={formError} submitLabel="Create bulk coupons">
        <CouponFormFields value={form} onChange={setForm} targets={targets} bulk editing={false} onFile={(file) => void handleFile(file)} />
        {bulkResult ? <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">Created {bulkResult.createdCount}; skipped {bulkResult.skippedCount}.</p>
          {bulkResult.createdCodes.length ? <p className="mt-2">Created: {bulkResult.createdCodes.slice(0, 25).join(", ")}{bulkResult.createdCodes.length > 25 ? ` +${bulkResult.createdCodes.length - 25} more` : ""}</p> : null}
          {bulkResult.skippedCodes.length ? <p className="mt-2">Skipped: {bulkResult.skippedCodes.slice(0, 25).join(", ")}{bulkResult.skippedCodes.length > 25 ? ` +${bulkResult.skippedCodes.length - 25} more` : ""}</p> : null}
        </div> : null}
      </FormDialog> : null}
    </section>
  );
}
