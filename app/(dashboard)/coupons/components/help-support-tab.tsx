"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createHelpSupport,
  listHelpSupport,
  updateHelpSupport,
  type HelpSupport,
} from "@/lib/api/coupon-management";
import { Field, FormDialog, Notice, Pager, PanelHeader, StatusBadge, fieldClass, textareaClass } from "./shared";

type Variant = "customer" | "helper";
type HelpForm = {
  categoryKey: string;
  title: string;
  subtitle: string;
  icon: string;
  itemsText: string;
  sortOrder: string;
  isActive: boolean;
};
const emptyForm = (): HelpForm => ({ categoryKey: "", title: "", subtitle: "", icon: "HelpCircle", itemsText: "", sortOrder: "0", isActive: true });
const itemsToText = (items: Array<{ q: string; a: string }>) => items.map((item) => `Q: ${item.q}\nA: ${item.a}`).join("\n\n");
function textToItems(text: string) {
  return text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean).flatMap((block) => {
    const lines = block.split("\n").map((line) => line.trim());
    const question = lines.find((line) => /^Q:\s*/i.test(line));
    const answer = lines.find((line) => /^A:\s*/i.test(line));
    return question && answer ? [{ q: question.replace(/^Q:\s*/i, "").trim(), a: answer.replace(/^A:\s*/i, "").trim() }] : [];
  });
}

export default function HelpSupportTab() {
  const [variant, setVariant] = useState<Variant>("customer");
  const [rows, setRows] = useState<HelpSupport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<HelpSupport | null>(null);
  const [form, setForm] = useState<HelpForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setRows(await listHelpSupport(variant)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Failed to load help support"); }
    finally { setLoading(false); }
  }, [variant]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [variant]);
  const ordered = useMemo(() => [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)), [rows]);
  const paged = ordered.slice((page - 1) * pageSize, page * pageSize);
  const closeForm = () => { setForm(null); setEditing(null); setFormError(null); };
  const openNew = () => { setEditing(null); setForm(emptyForm()); setFormError(null); };
  const openEdit = (row: HelpSupport) => {
    setEditing(row);
    setForm({ categoryKey: row.categoryKey, title: row.title, subtitle: row.subtitle, icon: row.icon, itemsText: itemsToText(row.items || []), sortOrder: String(row.sortOrder ?? 0), isActive: row.isActive });
    setFormError(null);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    if (!form.categoryKey.trim() || !form.title.trim() || !form.subtitle.trim() || !form.icon.trim()) {
      setFormError("Category key, title, subtitle, and icon are required");
      return;
    }
    const items = textToItems(form.itemsText);
    const payload = {
      categoryKey: form.categoryKey.trim(), title: form.title.trim(), subtitle: form.subtitle.trim(),
      icon: form.icon.trim(), items, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive,
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updateHelpSupport(editing._id, payload);
      else {
        const { categoryKey, ...createPayload } = payload;
        await createHelpSupport(variant, categoryKey, createPayload);
      }
      closeForm();
      await load();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Save failed"); }
    finally { setSaving(false); }
  };
  const toggle = async (row: HelpSupport) => {
    setError(null);
    try { await updateHelpSupport(row._id, { isActive: !row.isActive }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status update failed"); }
  };

  return (
    <section>
      <PanelHeader title="Help & Support" description="Manage FAQ categories and question-answer content for customer and helper apps." action={<Button onClick={openNew}><Plus />Add category</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <select className={`${fieldClass} w-auto`} value={variant} onChange={(event) => setVariant(event.target.value as Variant)}>
          <option value="customer">Customer</option><option value="helper">Helper</option>
        </select>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
      </div>
      {error ? <Notice error>{error}</Notice> : null}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[790px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Title", "Key", "Items", "Sort", "Status", "Actions"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((row) => <tr key={row._id}>
              <td className="px-4 py-3"><strong>{row.title}</strong><p className="text-xs text-gray-500">{row.subtitle}</p></td>
              <td className="px-4 py-3 font-mono text-xs">{row.categoryKey}</td>
              <td className="px-4 py-3">{(row.items || []).length}</td>
              <td className="px-4 py-3">{row.sortOrder}</td>
              <td className="px-4 py-3"><StatusBadge active={row.isActive} /></td>
              <td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button><Button size="sm" variant={row.isActive ? "secondary" : "default"} onClick={() => void toggle(row)}>{row.isActive ? "Deactivate" : "Activate"}</Button></div></td>
            </tr>)}
            {!paged.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">{loading ? "Loading…" : `No FAQ categories for ${variant}.`}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageSize={pageSize} total={ordered.length} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
      {form ? <FormDialog title={editing ? "Edit FAQ category" : "Add FAQ category"} onClose={closeForm} onSubmit={submit} saving={saving} error={formError} submitLabel={editing ? "Save changes" : "Add category"}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Category key"><Input required disabled={Boolean(editing)} value={form.categoryKey} onChange={(event) => setForm((current) => current ? { ...current, categoryKey: event.target.value } : current)} /></Field>
          <Field label="Title"><Input required value={form.title} onChange={(event) => setForm((current) => current ? { ...current, title: event.target.value } : current)} /></Field>
          <Field label="Subtitle"><Input required value={form.subtitle} onChange={(event) => setForm((current) => current ? { ...current, subtitle: event.target.value } : current)} /></Field>
          <Field label="Icon name"><Input required value={form.icon} onChange={(event) => setForm((current) => current ? { ...current, icon: event.target.value } : current)} /></Field>
          <Field label="FAQ items (blocks of Q: / A:)" className="md:col-span-2"><textarea className={textareaClass} rows={10} value={form.itemsText} onChange={(event) => setForm((current) => current ? { ...current, itemsText: event.target.value } : current)} placeholder={"Q: How does ExtraHand work?\nA: Customers post work...\n\nQ: ...\nA: ..."} /></Field>
          <Field label="Sort order"><Input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => current ? { ...current, sortOrder: event.target.value } : current)} /></Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" className="accent-amber-600" checked={form.isActive} onChange={(event) => setForm((current) => current ? { ...current, isActive: event.target.checked } : current)} />Active</label>
        </div>
      </FormDialog> : null}
    </section>
  );
}
