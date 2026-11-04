"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createSkuContent,
  listOperationalSkus,
  listServiceContent,
  listSkuContent,
  updateOperationalSkuOffer,
  updateSkuContent,
  type OperationalSku,
  type ServiceContent,
  type SkuContent,
} from "@/lib/api/coupon-management";
import { Field, FormDialog, Notice, Pager, PanelHeader, StatusBadge, fieldClass, textareaClass } from "./shared";

type PackageForm = {
  categorySlug: string;
  skuSlug: string;
  displayName: string;
  shortDescription: string;
  longDescription: string;
  includesText: string;
  excludesText: string;
  sortOrder: string;
  isActive: boolean;
  originalPrice: string;
  offerDiscountType: "percent" | "flat";
  offerDiscountValue: string;
  isOfferActive: boolean;
  isFeaturedOnHome: boolean;
  featuredSortOrder: string;
  durationMinutes: string;
};
const emptyForm = (categorySlug = "full-house"): PackageForm => ({
  categorySlug, skuSlug: "", displayName: "", shortDescription: "", longDescription: "",
  includesText: "", excludesText: "", sortOrder: "0", isActive: true, originalPrice: "0",
  offerDiscountType: "percent", offerDiscountValue: "0", isOfferActive: false, durationMinutes: "30",
  isFeaturedOnHome: false, featuredSortOrder: "0",
});
const linesToArray = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);

export default function PackagesTab() {
  const [rows, setRows] = useState<SkuContent[]>([]);
  const [operational, setOperational] = useState<OperationalSku[]>([]);
  const [services, setServices] = useState<ServiceContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<SkuContent | null>(null);
  const [form, setForm] = useState<PackageForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const operationalMap = useMemo(() => new Map(operational.map((row) => [`${row.categorySlug}::${row.slug}`, row])), [operational]);
  const serviceLabel = useMemo(() => {
    const map = new Map<string, string>([
      ["hourly-helper", "Hourly Based Services (All Durations)"], ["hourly-1h", "Hourly Helper · 1 hour"],
      ["hourly-1-5h", "Hourly Helper · 1.5 hours"], ["hourly-2h", "Hourly Helper · 2 hours"],
      ["hourly-3h", "Hourly Helper · 3 hours"], ["hourly-4h", "Hourly Helper · 4 hours"],
      ["full-house", "Full House Cleaning"], ["bathroom", "Bathroom Cleaning"], ["kitchen", "Kitchen Cleaning"],
      ["sofa", "Sofa Cleaning"], ["mattress", "Mattress Cleaning"], ["window-glass", "Window & Glass Cleaning"],
      ["ac-services", "AC Services"], ["appliance-repair", "Appliance Repair"], ["womens-beauty", "Women's Beauty"],
      ["womens-hair", "Women's Hair"], ["mens-grooming", "Men's Grooming"], ["massage", "Massage"],
    ]);
    for (const service of services) map.set(service.categorySlug, service.title);
    for (const row of operational) if (!map.has(row.categorySlug)) map.set(row.categorySlug, row.categorySlug);
    for (const row of rows) if (!map.has(row.categorySlug)) map.set(row.categorySlug, row.categorySlug);
    return map;
  }, [operational, rows, services]);
  const serviceOptions = useMemo(() => [...serviceLabel.entries()].map(([slug, label]) => ({ slug, label })).sort((a, b) => a.label.localeCompare(b.label)), [serviceLabel]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [skuRows, operationalRows, serviceRows] = await Promise.all([listSkuContent(), listOperationalSkus(), listServiceContent()]);
      setRows(skuRows);
      setOperational(operationalRows);
      setServices(serviceRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load packages");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const ordered = [...rows].sort((a, b) => (serviceLabel.get(a.categorySlug) || a.categorySlug).localeCompare(serviceLabel.get(b.categorySlug) || b.categorySlug) || a.displayName.localeCompare(b.displayName));
    const q = query.trim().toLowerCase();
    return q ? ordered.filter((row) => [row.displayName, row.skuSlug, row.categorySlug, serviceLabel.get(row.categorySlug)].join(" ").toLowerCase().includes(q)) : ordered;
  }, [query, rows, serviceLabel]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const closeForm = () => { setForm(null); setEditing(null); setFormError(null); };
  const openNew = () => { setEditing(null); setForm(emptyForm(serviceOptions[0]?.slug || "full-house")); setFormError(null); };
  const openEdit = (row: SkuContent) => {
    const pricing = operationalMap.get(`${row.categorySlug}::${row.skuSlug}`);
    setEditing(row);
    setForm({
      categorySlug: row.categorySlug, skuSlug: row.skuSlug, displayName: row.displayName,
      shortDescription: row.shortDescription || "", longDescription: row.longDescription || "",
      includesText: (row.includes || []).join("\n"), excludesText: (row.excludes || []).join("\n"),
      isFeaturedOnHome: row.isFeaturedOnHome === true,
      featuredSortOrder: String(row.featuredSortOrder ?? 0),
      sortOrder: String(row.sortOrder ?? 0), isActive: row.isActive,
      originalPrice: String(pricing?.basePrice ?? 0), offerDiscountType: pricing?.pricing?.offerDiscountType || "percent",
      offerDiscountValue: String(pricing?.pricing?.offerDiscountValue ?? 0), isOfferActive: Boolean(pricing?.pricing?.isOfferActive),
      durationMinutes: String(pricing?.durationMinutes ?? 30),
    });
    setFormError(null);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    const payload = {
      categorySlug: form.categorySlug.trim(), skuSlug: form.skuSlug.trim(), displayName: form.displayName.trim(),
      shortDescription: form.shortDescription.trim(), longDescription: form.longDescription.trim(),
      includes: linesToArray(form.includesText), excludes: linesToArray(form.excludesText),
      sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive,
      isFeaturedOnHome: form.isFeaturedOnHome,
      featuredSortOrder: Number(form.featuredSortOrder) || 0,
    };
    if (!payload.categorySlug || !payload.skuSlug || !payload.displayName) {
      setFormError("Parent service, SKU slug, and package name are required");
      return;
    }
    if (Number(form.originalPrice) < 0 || Number(form.offerDiscountValue) < 0) {
      setFormError("Price and offer value cannot be negative");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updateSkuContent(editing._id, payload);
      else await createSkuContent(payload);
      const currentOperational = operationalMap.get(`${payload.categorySlug}::${payload.skuSlug}`);
      if (currentOperational?._id) {
        await updateOperationalSkuOffer(currentOperational._id, {
          basePrice: Number(form.originalPrice) || 0,
          offerDiscountType: form.offerDiscountType,
          offerDiscountValue: Number(form.offerDiscountValue) || 0,
          isOfferActive: form.isOfferActive,
          durationMinutes: Number(form.durationMinutes) || 30,
        });
      }
      closeForm();
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Save failed");
    } finally { setSaving(false); }
  };
  const toggle = async (row: SkuContent) => {
    setError(null);
    try { await updateSkuContent(row._id, { isActive: !row.isActive }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status update failed"); }
  };

  return (
    <section>
      <PanelHeader title="Packages / SKUs" description="Manage Book Now packages, SKU content and the operational offer/pricing fields." action={<Button onClick={openNew}><Plus />Add package</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-sm" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search package, SKU, or service…" />
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
      </div>
      {error ? <Notice error>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Service", "Package", "SKU", "Price", "Offer", "Home featured", "Status", "Actions"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((row) => {
              const sku = operationalMap.get(`${row.categorySlug}::${row.skuSlug}`);
              const original = sku?.pricing?.originalPrice ?? sku?.basePrice ?? 0;
              const offer = sku?.pricing?.offerPrice ?? original;
              return <tr key={row._id}>
                <td className="px-4 py-3">{serviceLabel.get(row.categorySlug) || row.categorySlug}</td>
                <td className="px-4 py-3 font-medium">{row.displayName}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.skuSlug}</td>
                <td className="px-4 py-3">₹{original}</td>
                <td className="px-4 py-3">{sku?.pricing?.isOfferActive ? `₹${offer} (${sku.pricing.appliedPercent}% off)` : "No offer"}</td>
                <td className="px-4 py-3">{row.isFeaturedOnHome ? `Yes · ${row.featuredSortOrder ?? 0}` : "No"}</td>
                <td className="px-4 py-3"><StatusBadge active={row.isActive} /></td>
                <td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button><Button size="sm" variant={row.isActive ? "secondary" : "default"} onClick={() => void toggle(row)}>{row.isActive ? "Deactivate" : "Activate"}</Button></div></td>
              </tr>;
            })}
            {!paged.length ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">{loading ? "Loading…" : "No packages found."}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
      {form ? <FormDialog title={editing ? "Edit package" : "Add package"} onClose={closeForm} onSubmit={submit} saving={saving} error={formError} submitLabel={editing ? "Save changes" : "Add package"}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Parent service"><select className={fieldClass} required value={form.categorySlug} onChange={(event) => setForm((current) => current ? { ...current, categorySlug: event.target.value } : current)}>{serviceOptions.map((option) => <option key={option.slug} value={option.slug}>{option.label} ({option.slug})</option>)}</select></Field>
          <Field label="SKU slug"><Input required value={form.skuSlug} onChange={(event) => setForm((current) => current ? { ...current, skuSlug: event.target.value } : current)} /></Field>
          <Field label="Package name"><Input required value={form.displayName} onChange={(event) => setForm((current) => current ? { ...current, displayName: event.target.value } : current)} /></Field>
          <Field label="Short description"><Input value={form.shortDescription} onChange={(event) => setForm((current) => current ? { ...current, shortDescription: event.target.value } : current)} /></Field>
          <Field label="Long description"><textarea className={textareaClass} rows={3} value={form.longDescription} onChange={(event) => setForm((current) => current ? { ...current, longDescription: event.target.value } : current)} /></Field>
          <Field label="Includes (one per line)"><textarea className={textareaClass} rows={5} value={form.includesText} onChange={(event) => setForm((current) => current ? { ...current, includesText: event.target.value } : current)} /></Field>
          <Field label="Excludes (one per line)"><textarea className={textareaClass} rows={4} value={form.excludesText} onChange={(event) => setForm((current) => current ? { ...current, excludesText: event.target.value } : current)} /></Field>
          <Field label="Original price (₹)"><Input type="number" min="0" step="0.01" value={form.originalPrice} onChange={(event) => setForm((current) => current ? { ...current, originalPrice: event.target.value } : current)} /></Field>
          <Field label="Offer type"><select className={fieldClass} value={form.offerDiscountType} onChange={(event) => setForm((current) => current ? { ...current, offerDiscountType: event.target.value as PackageForm["offerDiscountType"] } : current)}><option value="percent">Percent</option><option value="flat">Flat</option></select></Field>
          <Field label="Offer value"><Input type="number" min="0" step="0.01" value={form.offerDiscountValue} onChange={(event) => setForm((current) => current ? { ...current, offerDiscountValue: event.target.value } : current)} /></Field>
          <Field label="Duration (minutes)"><Input type="number" min="15" value={form.durationMinutes} onChange={(event) => setForm((current) => current ? { ...current, durationMinutes: event.target.value } : current)} /></Field>
          <Field label="Sort order"><Input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => current ? { ...current, sortOrder: event.target.value } : current)} /></Field>
          <Field label="Featured order (lower appears first)"><Input type="number" value={form.featuredSortOrder} onChange={(event) => setForm((current) => current ? { ...current, featuredSortOrder: event.target.value } : current)} /></Field>
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-600" checked={form.isActive} onChange={(event) => setForm((current) => current ? { ...current, isActive: event.target.checked } : current)} />Active</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-600" checked={form.isOfferActive} onChange={(event) => setForm((current) => current ? { ...current, isOfferActive: event.target.checked } : current)} />Offer active</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-600" checked={form.isFeaturedOnHome} onChange={(event) => setForm((current) => current ? { ...current, isFeaturedOnHome: event.target.checked } : current)} />Show in home Featured Services</label>
        </div>
        {!editing && !operationalMap.has(`${form.categorySlug}::${form.skuSlug}`) ? <p className="text-xs text-amber-800">Operational price/offer updates are available after a matching operational SKU exists.</p> : null}
      </FormDialog> : null}
    </section>
  );
}
