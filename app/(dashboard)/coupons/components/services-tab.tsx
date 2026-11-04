"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createServiceContent,
  createHubSection,
  listHubSections,
  listServiceContent,
  updateHubSection,
  updateServiceContent,
  type HubSection,
  type HubService,
  type ServiceContent,
} from "@/lib/api/coupon-management";
import { Field, FormDialog, Notice, Pager, PanelHeader, StatusBadge, fieldClass, textareaClass } from "./shared";

type ServiceForm = {
  parentCategorySlug: string;
  categorySlug: string;
  title: string;
  subtitle: string;
  description: string;
  heroImageUrl: string;
  iconUrl: string;
  sortOrder: string;
  isActive: boolean;
};
const emptyForm = (parentCategorySlug = ""): ServiceForm => ({
  parentCategorySlug, categorySlug: "", title: "", subtitle: "", description: "",
  heroImageUrl: "", iconUrl: "", sortOrder: "0", isActive: true,
});

export default function ServicesTab() {
  const [rows, setRows] = useState<ServiceContent[]>([]);
  const [sections, setSections] = useState<HubSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<ServiceContent | null>(null);
  const [form, setForm] = useState<ServiceForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [serviceRows, sectionRows] = await Promise.all([listServiceContent(), listHubSections()]);
      setRows(serviceRows);
      setSections(sectionRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load services");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const parentByService = useMemo(() => {
    const map = new Map<string, HubSection>();
    for (const section of sections) for (const service of section.services || []) map.set(service.categorySlug, section);
    return map;
  }, [sections]);
  const parentOptions = useMemo(() => [...sections].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)), [sections]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((row) => [row.title, row.subtitle, row.description, row.categorySlug].join(" ").toLowerCase().includes(q)) : rows;
  }, [query, rows]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const closeForm = () => { setForm(null); setEditing(null); setFormError(null); };
  const openNew = () => { setEditing(null); setForm(emptyForm(parentOptions[0]?.slug || "")); setFormError(null); };
  const openEdit = (row: ServiceContent) => {
    setEditing(row);
    setForm({
      parentCategorySlug: parentByService.get(row.categorySlug)?.slug || parentOptions[0]?.slug || "",
      categorySlug: row.categorySlug, title: row.title, subtitle: row.subtitle || "",
      description: row.description || "", heroImageUrl: row.heroImageUrl || "",
      iconUrl: row.iconUrl || "", sortOrder: String(row.sortOrder ?? 0), isActive: row.isActive,
    });
    setFormError(null);
  };
  const saveHubSection = async (section: HubSection, services: HubService[]) => {
    if (section._id) await updateHubSection(section._id, { services });
    else await createHubSection({ ...section, services });
  };
  const attachService = async (payload: { categorySlug: string; title: string; heroImageUrl: string; sortOrder: number; isActive: boolean }, oldSlug?: string) => {
    if (!form) return;
    const target = sections.find((section) => section.slug === form.parentCategorySlug);
    if (!target) throw new Error("Select a parent category before saving the service");
    const oldParent = oldSlug ? parentByService.get(oldSlug) : undefined;
    if (oldParent && oldParent.slug !== target.slug) {
      await saveHubSection(oldParent, (oldParent.services || []).filter((service) => service.categorySlug !== oldSlug));
    }
    const existing = target.services || [];
    const index = existing.findIndex((service) => service.categorySlug === (oldSlug || payload.categorySlug));
    const service: HubService = {
      serviceId: payload.categorySlug, label: payload.title, categorySlug: payload.categorySlug,
      sectionId: "", imageUrl: payload.heroImageUrl, sortOrder: payload.sortOrder, isActive: payload.isActive,
    };
    const next = index >= 0 ? existing.map((item, itemIndex) => itemIndex === index ? service : item) : [...existing, service];
    if (target._id) await updateHubSection(target._id, { services: next });
    else await createHubSection({ ...target, services: next });
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    const payload = {
      categorySlug: form.categorySlug.trim(), title: form.title.trim(), subtitle: form.subtitle.trim(),
      description: form.description.trim(), heroImageUrl: form.heroImageUrl.trim(), iconUrl: form.iconUrl.trim(),
      sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive,
    };
    if (!payload.categorySlug || !payload.title) { setFormError("Service slug and title are required"); return; }
    if (!form.parentCategorySlug) { setFormError("Select a parent category"); return; }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updateServiceContent(editing._id, payload);
      else await createServiceContent(payload);
      await attachService(
        { categorySlug: payload.categorySlug, title: payload.title, heroImageUrl: payload.heroImageUrl, sortOrder: payload.sortOrder, isActive: payload.isActive },
        editing?.categorySlug,
      );
      closeForm();
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Save failed");
    } finally { setSaving(false); }
  };
  const toggle = async (row: ServiceContent) => {
    setError(null);
    try { await updateServiceContent(row._id, { isActive: !row.isActive }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status update failed"); }
  };

  return (
    <section>
      <PanelHeader title="Services" description="Manage the Book Now services customers see under each category." action={<Button onClick={openNew} disabled={!parentOptions.length}><Plus />Add service</Button>} />
      {!parentOptions.length ? <Notice error>There are no parent categories yet. Add a category before creating a service.</Notice> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-sm" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search service name or slug…" />
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
      </div>
      {error ? <Notice error>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Title", "Category", "Service slug", "Sort", "Status", "Actions"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((row) => <tr key={row._id}>
              <td className="px-4 py-3"><strong>{row.title}</strong>{row.subtitle ? <p className="text-xs text-gray-500">{row.subtitle}</p> : null}</td>
              <td className="px-4 py-3">{parentByService.get(row.categorySlug)?.title || "Unassigned"}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.categorySlug}</td>
              <td className="px-4 py-3">{row.sortOrder}</td>
              <td className="px-4 py-3"><StatusBadge active={row.isActive} /></td>
              <td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button><Button size="sm" variant={row.isActive ? "secondary" : "default"} onClick={() => void toggle(row)}>{row.isActive ? "Deactivate" : "Activate"}</Button></div></td>
            </tr>)}
            {!paged.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">{loading ? "Loading…" : "No services found."}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
      {form ? <FormDialog title={editing ? "Edit service" : "Add service"} onClose={closeForm} onSubmit={submit} saving={saving} error={formError} submitLabel={editing ? "Save changes" : "Add service"}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Parent category"><select className={fieldClass} required value={form.parentCategorySlug} onChange={(event) => setForm((current) => current ? { ...current, parentCategorySlug: event.target.value } : current)}>{parentOptions.map((option) => <option key={option.slug} value={option.slug}>{option.title} ({option.slug})</option>)}</select></Field>
          <Field label="Service slug"><Input required value={form.categorySlug} onChange={(event) => setForm((current) => current ? { ...current, categorySlug: event.target.value } : current)} placeholder="example-service-slug" /></Field>
          <Field label="Title"><Input required value={form.title} onChange={(event) => setForm((current) => current ? { ...current, title: event.target.value } : current)} /></Field>
          <Field label="Subtitle"><Input value={form.subtitle} onChange={(event) => setForm((current) => current ? { ...current, subtitle: event.target.value } : current)} /></Field>
          <Field label="Description"><textarea className={textareaClass} rows={4} value={form.description} onChange={(event) => setForm((current) => current ? { ...current, description: event.target.value } : current)} /></Field>
          <Field label="Hero image URL"><Input value={form.heroImageUrl} onChange={(event) => setForm((current) => current ? { ...current, heroImageUrl: event.target.value } : current)} /></Field>
          <Field label="Icon URL"><Input value={form.iconUrl} onChange={(event) => setForm((current) => current ? { ...current, iconUrl: event.target.value } : current)} /></Field>
          <Field label="Sort order"><Input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => current ? { ...current, sortOrder: event.target.value } : current)} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-600" checked={form.isActive} onChange={(event) => setForm((current) => current ? { ...current, isActive: event.target.checked } : current)} />Active</label>
        </div>
      </FormDialog> : null}
    </section>
  );
}
