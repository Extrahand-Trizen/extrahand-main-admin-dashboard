"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createHubSection,
  listHubSections,
  listServiceContent,
  updateHubSection,
  type HubSection,
  type HubService,
  type ServiceContent,
} from "@/lib/api/coupon-management";
import { Field, FormDialog, Notice, Pager, PanelHeader, StatusBadge } from "./shared";

type SectionForm = Omit<HubSection, "_id"> & { services: HubService[] };
const emptyForm = (): SectionForm => ({ slug: "", title: "", iconKey: "Broom", sortOrder: 0, services: [], isActive: true });
const emptyService = (sortOrder: number): HubService => ({
  serviceId: "", label: "", categorySlug: "", sectionId: "", imageUrl: "", sortOrder, isActive: true,
});

export default function CategoriesTab() {
  const [rows, setRows] = useState<HubSection[]>([]);
  const [serviceRows, setServiceRows] = useState<ServiceContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<HubSection | null>(null);
  const [form, setForm] = useState<SectionForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sections, services] = await Promise.all([listHubSections(), listServiceContent()]);
      setRows(sections);
      setServiceRows(services);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load categories");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const titleBySlug = useMemo(() => new Map(serviceRows.map((service) => [service.categorySlug, service.title])), [serviceRows]);
  const filtered = useMemo(() => {
    const ordered = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    const q = query.trim().toLowerCase();
    return q ? ordered.filter((row) => [row.title, row.slug, row.iconKey, ...(row.services || []).flatMap((service) => [service.label, service.serviceId, service.categorySlug])].join(" ").toLowerCase().includes(q)) : ordered;
  }, [query, rows]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openNew = () => { setEditing(null); setForm(emptyForm()); setFormError(null); };
  const openEdit = (row: HubSection) => {
    setEditing(row);
    setForm({
      slug: row.slug, title: row.title, iconKey: row.iconKey || "", sortOrder: row.sortOrder || 0,
      services: (row.services || []).map((service) => ({ ...service, serviceId: service.serviceId || "", label: service.label || "", categorySlug: service.categorySlug || "", sectionId: service.sectionId || "", imageUrl: service.imageUrl || "", sortOrder: Number(service.sortOrder || 0), isActive: service.isActive !== false })),
      isActive: row.isActive,
    });
    setFormError(null);
  };
  const closeForm = () => { setForm(null); setEditing(null); setFormError(null); };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    const slug = form.slug.trim();
    const title = form.title.trim();
    if (!slug || !title) { setFormError("Category slug and title are required"); return; }
    const payload: SectionForm = {
      slug, title, iconKey: form.iconKey?.trim() || "", sortOrder: Number(form.sortOrder) || 0,
      services: form.services.map((service, index) => ({
        serviceId: service.serviceId.trim(), label: service.label.trim(), categorySlug: service.categorySlug.trim(),
        sectionId: service.sectionId?.trim() || "", imageUrl: service.imageUrl?.trim() || "",
        sortOrder: Number(service.sortOrder) || index * 10, isActive: service.isActive !== false,
      })).filter((service) => service.serviceId && service.label && service.categorySlug),
      isActive: form.isActive,
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing?._id) await updateHubSection(editing._id, payload);
      else await createHubSection(payload);
      closeForm();
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Save failed");
    } finally { setSaving(false); }
  };
  const toggle = async (row: HubSection) => {
    setError(null);
    try {
      if (row._id) await updateHubSection(row._id, { isActive: !row.isActive });
      else await createHubSection({ ...row, isActive: !row.isActive });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Status update failed"); }
  };
  const setService = (index: number, patch: Partial<HubService>) => setForm((current) => current ? {
    ...current, services: current.services.map((service, itemIndex) => itemIndex === index ? { ...service, ...patch } : service),
  } : null);

  return (
    <section>
      <PanelHeader title="Categories" description="Manage Book Now parent categories and their nested services." action={<Button onClick={openNew}><Plus />Add category</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-sm" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search category or service…" />
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
      </div>
      {error ? <Notice error>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[790px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Category", "Slug", "Services", "Sort", "Status", "Actions"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((row) => <Fragment key={row.slug}>
              <tr>
                <td className="px-4 py-3">
                  <button className="flex items-center gap-2 text-left font-semibold text-gray-900" type="button" onClick={() => setExpanded(expanded === row.slug ? null : row.slug)}>
                    {expanded === row.slug ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{row.title}
                    {row.iconKey ? <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-500">{row.iconKey}</span> : null}
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{row.slug}</td>
                <td className="px-4 py-3">{(row.services || []).filter((service) => service.isActive !== false).length} active / {(row.services || []).length} total</td>
                <td className="px-4 py-3">{row.sortOrder}</td>
                <td className="px-4 py-3"><StatusBadge active={row.isActive} /></td>
                <td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button><Button size="sm" variant={row.isActive ? "secondary" : "default"} onClick={() => void toggle(row)}>{row.isActive ? "Deactivate" : "Activate"}</Button></div></td>
              </tr>
              {expanded === row.slug ? <tr><td className="bg-gray-50 px-6 py-3" colSpan={6}>
                {(row.services || []).length ? <div className="grid gap-2 sm:grid-cols-2">{[...row.services].sort((a, b) => a.sortOrder - b.sortOrder).map((service) => <div key={`${service.serviceId}-${service.categorySlug}`} className="flex items-center justify-between gap-3 rounded border bg-white p-3 text-sm">
                  <div><p className="font-medium">{service.label}</p><p className="text-xs text-gray-500">{titleBySlug.get(service.categorySlug) || service.categorySlug}</p></div><StatusBadge active={service.isActive !== false} />
                </div>)}</div> : <p className="text-sm text-gray-500">No services are attached to this category.</p>}
              </td></tr> : null}
            </Fragment>)}
            {!paged.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">{loading ? "Loading…" : "No categories found."}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
      {form ? <FormDialog title={editing ? "Edit category" : "Add category"} onClose={closeForm} onSubmit={submit} saving={saving} error={formError} submitLabel={editing ? "Save changes" : "Add category"}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Category slug"><Input required value={form.slug} onChange={(event) => setForm((current) => current ? { ...current, slug: event.target.value } : current)} /></Field>
          <Field label="Category title"><Input required value={form.title} onChange={(event) => setForm((current) => current ? { ...current, title: event.target.value } : current)} /></Field>
          <Field label="Icon key"><Input value={form.iconKey || ""} onChange={(event) => setForm((current) => current ? { ...current, iconKey: event.target.value } : current)} /></Field>
          <Field label="Sort order"><Input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => current ? { ...current, sortOrder: Number(event.target.value) } : current)} /></Field>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><h4 className="font-medium">Services</h4><Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => current ? { ...current, services: [...current.services, emptyService(current.services.length * 10)] } : current)}><Plus />Add service row</Button></div>
          {!form.services.length ? <p className="rounded border border-dashed p-4 text-sm text-gray-500">No services added to this category yet.</p> : null}
          {form.services.map((service, index) => <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2" key={`${service.categorySlug}-${index}`}>
            <Field label="Service id"><Input value={service.serviceId} onChange={(event) => setService(index, { serviceId: event.target.value })} /></Field>
            <Field label="Label"><Input value={service.label} onChange={(event) => setService(index, { label: event.target.value })} /></Field>
            <Field label="Service slug"><Input value={service.categorySlug} onChange={(event) => setService(index, { categorySlug: event.target.value })} /></Field>
            <Field label="Section id"><Input value={service.sectionId || ""} onChange={(event) => setService(index, { sectionId: event.target.value })} /></Field>
            <Field label="Image URL"><Input value={service.imageUrl || ""} onChange={(event) => setService(index, { imageUrl: event.target.value })} /></Field>
            <Field label="Sort order"><Input type="number" value={service.sortOrder} onChange={(event) => setService(index, { sortOrder: Number(event.target.value) })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-600" checked={service.isActive} onChange={(event) => setService(index, { isActive: event.target.checked })} />Active</label>
            <Button type="button" variant="destructive" size="sm" className="justify-self-start" onClick={() => setForm((current) => current ? { ...current, services: current.services.filter((_, itemIndex) => itemIndex !== index) } : current)}>Remove service</Button>
          </div>)}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-600" checked={form.isActive} onChange={(event) => setForm((current) => current ? { ...current, isActive: event.target.checked } : current)} />Active</label>
      </FormDialog> : null}
    </section>
  );
}
