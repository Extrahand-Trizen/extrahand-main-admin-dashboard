"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelHeader } from "./shared";
import {
  deleteFeeCategory,
  listFeeCategories,
  saveFeeCategory,
  type FeeCategory,
  type FeeMode,
} from "@/lib/api/fee-management";

const queryKey = (mode: FeeMode) => ["fee-management", mode];

type CategoryDraft = {
  displayName: string;
  sacCode: string;
  sacHeading: string;
  gstPercent: string;
  platformFeePercent: string;
};

function toDraft(category: FeeCategory): CategoryDraft {
  return {
    displayName: category.displayName || "",
    sacCode: category.sacCode || "",
    sacHeading: category.sacHeading || "",
    gstPercent: String(category.gstPercentage * 100),
    platformFeePercent: category.platformFeePercentage == null
      ? ""
      : String(category.platformFeePercentage * 100),
  };
}

function percentToRate(value: string, label: string, optional = false): number | null {
  if (optional && !value.trim()) return null;
  const percentage = Number(value);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error(`${label} must be between 0 and 100.`);
  }
  return percentage / 100;
}

function FeeCategoryRow({
  category,
  onSave,
  onDelete,
  saving,
  deleting,
}: {
  category: FeeCategory;
  onSave: (category: FeeCategory) => void;
  onDelete: (category: FeeCategory) => void;
  saving: boolean;
  deleting: boolean;
}) {
  const [draft, setDraft] = useState<CategoryDraft>(() => toDraft(category));
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError(null);
      onSave({
        ...category,
        displayName: draft.displayName.trim() || null,
        sacCode: draft.sacCode.trim() || null,
        sacHeading: draft.sacHeading.trim() || null,
        gstPercentage: percentToRate(draft.gstPercent, "GST") ?? 0,
        platformFeePercentage: percentToRate(draft.platformFeePercent, "Platform fee", true),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Invalid fee values.");
    }
  }

  const update = (patch: Partial<CategoryDraft>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <form onSubmit={submit} className="grid min-w-[980px] grid-cols-[1.1fr_1.2fr_0.8fr_1.4fr_0.8fr_0.9fr_auto] items-start gap-3 border-t border-gray-100 px-4 py-3">
      <div className="pt-2">
        <p className="font-mono text-xs font-semibold text-gray-800">{category.categoryKey}</p>
        {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
      </div>
      <Input aria-label={`${category.categoryKey} display name`} value={draft.displayName} onChange={(event) => update({ displayName: event.target.value })} placeholder="Display name" />
      <Input aria-label={`${category.categoryKey} SAC code`} value={draft.sacCode} onChange={(event) => update({ sacCode: event.target.value })} placeholder="SAC code" />
      <Input aria-label={`${category.categoryKey} SAC heading`} value={draft.sacHeading} onChange={(event) => update({ sacHeading: event.target.value })} placeholder="SAC heading" />
      <div className="relative">
        <Input aria-label={`${category.categoryKey} GST percentage`} type="number" min="0" max="100" step="0.01" value={draft.gstPercent} onChange={(event) => update({ gstPercent: event.target.value })} className="pr-7" />
        <span className="absolute right-3 top-2 text-sm text-gray-400">%</span>
      </div>
      <div className="relative">
        <Input aria-label={`${category.categoryKey} platform fee percentage`} type="number" min="0" max="100" step="0.01" value={draft.platformFeePercent} onChange={(event) => update({ platformFeePercent: event.target.value })} placeholder="Inherit" className="pr-7" />
        <span className="absolute right-3 top-2 text-sm text-gray-400">%</span>
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button type="submit" size="sm" disabled={saving || deleting} aria-label={`Save ${category.categoryKey}`}>
          <Save className="mr-1 h-4 w-4" />{saving ? "Saving" : "Save"}
        </Button>
        {category.categoryKey !== "default" && (
          <Button type="button" variant="ghost" size="icon" disabled={saving || deleting} onClick={() => onDelete(category)} aria-label={`Delete ${category.categoryKey}`}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
    </form>
  );
}

export default function FeeSettingsTab() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<FeeMode>("BIDDING");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newCategoryKey, setNewCategoryKey] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newGst, setNewGst] = useState("18");
  const [newPlatformFee, setNewPlatformFee] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const categoriesQuery = useQuery({
    queryKey: queryKey(mode),
    queryFn: () => listFeeCategories(mode),
  });

  const saveMutation = useMutation({
    mutationFn: saveFeeCategory,
    onSuccess: (saved) => {
      queryClient.setQueryData<FeeCategory[]>(queryKey(saved.mode), (current) =>
        [
          ...(current || []).filter((category) => category.categoryKey !== saved.categoryKey),
          saved,
        ].sort((a, b) => a.categoryKey.localeCompare(b.categoryKey)),
      );
      setStatusMessage(`Saved fee settings for ${saved.displayName || saved.categoryKey}.`);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: ({ categoryKey, categoryMode }: { categoryKey: string; categoryMode: FeeMode }) =>
      deleteFeeCategory(categoryKey, categoryMode),
    onSuccess: (_result, { categoryKey, categoryMode }) => {
      queryClient.setQueryData<FeeCategory[]>(queryKey(categoryMode), (current) =>
        (current || []).filter((category) => category.categoryKey !== categoryKey),
      );
      setStatusMessage(`Deleted fee settings for ${categoryKey}.`);
    },
  });

  const visibleCategories = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (categoriesQuery.data || [])
      .filter((category) =>
        !needle || [category.categoryKey, category.displayName, category.sacCode, category.sacHeading]
          .some((value) => value?.toLowerCase().includes(needle)),
      )
      .sort((a, b) => a.categoryKey.localeCompare(b.categoryKey));
  }, [categoriesQuery.data, search]);

  function handleSave(category: FeeCategory) {
    saveMutation.mutate(category);
  }

  function handleDelete(category: FeeCategory) {
    if (category.categoryKey === "default") return;
    if (window.confirm(`Delete fee settings for "${category.displayName || category.categoryKey}" in ${mode === "BOOK_NOW" ? "Book Now" : "Bidding"}?`)) {
      setStatusMessage(null);
      deleteMutation.mutate({ categoryKey: category.categoryKey, categoryMode: mode });
    }
  }

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setStatusMessage(null);
    const categoryKey = newCategoryKey.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(categoryKey)) {
      setFormError("Use a lowercase category key, such as home-cleaning.");
      return;
    }
    if ((categoriesQuery.data || []).some((category) => category.categoryKey === categoryKey)) {
      setFormError("That category key already exists for this booking mode.");
      return;
    }
    try {
      saveMutation.mutate({
        categoryKey,
        mode,
        displayName: newDisplayName.trim() || categoryKey,
        gstPercentage: percentToRate(newGst, "GST") ?? 0,
        platformFeePercentage: percentToRate(newPlatformFee, "Platform fee", true),
      }, {
        onSuccess: () => {
          setShowAdd(false);
          setNewCategoryKey("");
          setNewDisplayName("");
          setNewGst("18");
          setNewPlatformFee("");
        },
        onError: (error) => setFormError(error instanceof Error ? error.message : "Could not add category."),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid fee values.");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <PanelHeader
        title="GST & Platform Fee Settings"
        description="Manage GST and platform-fee rates used by payment calculations. Values are saved as percentages per category."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void categoriesQuery.refetch()} disabled={categoriesQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${categoriesQuery.isFetching ? "animate-spin" : ""}`} />Refresh
            </Button>
            <Button onClick={() => { setFormError(null); setShowAdd((open) => !open); }}>
              <Plus className="mr-2 h-4 w-4" />Add category
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Fee booking mode">
          {(["BIDDING", "BOOK_NOW"] as const).map((value) => (
            <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)} className={`rounded-md px-3 py-2 text-sm font-medium ${mode === value ? "bg-white text-amber-800 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
              {value === "BIDDING" ? "Bidding / Partner payouts" : "Book Now / Customer"}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search category or SAC" className="pl-9" aria-label="Search fee categories" />
        </div>
      </div>

      {showAdd && (
        <form onSubmit={addCategory} className="mb-5 grid gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input value={newCategoryKey} onChange={(event) => setNewCategoryKey(event.target.value)} placeholder="Category key" aria-label="New category key" required />
          <Input value={newDisplayName} onChange={(event) => setNewDisplayName(event.target.value)} placeholder="Display name" aria-label="New category display name" />
          <Input type="number" min="0" max="100" step="0.01" value={newGst} onChange={(event) => setNewGst(event.target.value)} placeholder="GST %" aria-label="New category GST percentage" required />
          <Input type="number" min="0" max="100" step="0.01" value={newPlatformFee} onChange={(event) => setNewPlatformFee(event.target.value)} placeholder="Platform fee % (inherit)" aria-label="New category platform fee percentage" />
          <Button type="submit" disabled={saveMutation.isPending}><Plus className="mr-2 h-4 w-4" />Create</Button>
          {formError && <p className="text-sm text-red-700 sm:col-span-2 lg:col-span-5" role="alert">{formError}</p>}
        </form>
      )}

      {categoriesQuery.isError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{categoriesQuery.error.message}</p>}
      {saveMutation.isError && !showAdd && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{saveMutation.error.message}</p>}
      {deleteMutation.isError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{deleteMutation.error.message}</p>}
      {statusMessage && <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{statusMessage}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <div className="grid min-w-[980px] grid-cols-[1.1fr_1.2fr_0.8fr_1.4fr_0.8fr_0.9fr_auto] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span>Category key</span><span>Name</span><span>SAC code</span><span>SAC heading</span><span>GST</span><span>Platform fee</span><span>Actions</span>
        </div>
        {categoriesQuery.isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">Loading fee categories…</p>
        ) : visibleCategories.length ? visibleCategories.map((category) => (
          <FeeCategoryRow
            key={`${category.mode}:${category.categoryKey}:${category.gstPercentage}:${category.platformFeePercentage ?? "inherit"}:${category.updatedBy ?? ""}`}
            category={category}
            saving={saveMutation.isPending && saveMutation.variables?.categoryKey === category.categoryKey}
            deleting={deleteMutation.isPending && deleteMutation.variables?.categoryKey === category.categoryKey}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )) : (
          <p className="px-4 py-10 text-center text-sm text-gray-500">No fee categories match your search.</p>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Enter rates as percentages (for example, 18 for 18%). A blank platform fee inherits the configured default. Changes are applied by the payment service immediately.
      </p>
    </section>
  );
}
