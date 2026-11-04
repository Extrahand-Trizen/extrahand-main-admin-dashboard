"use client";

import { useEffect, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const fieldClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:bg-gray-100";
export const textareaClass = `${fieldClass} min-h-24 resize-y`;

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-medium text-gray-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-4 rounded-lg border px-4 py-3 text-sm shadow-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  allowAll = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  allowAll?: boolean;
}) {
  const effectivePageSize = pageSize === 0 ? Math.max(total, 1) : pageSize;
  const pages = Math.max(1, Math.ceil(total / effectivePageSize));
  const safePage = Math.min(page, pages);
  const start = total === 0 ? 0 : (safePage - 1) * effectivePageSize + 1;
  const end = Math.min(total, safePage * effectivePageSize);
  useEffect(() => {
    if (safePage !== page) onPage(safePage);
  }, [onPage, page, safePage]);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
      <span>Showing {start}-{end} of {total}</span>
      <div className="flex items-center gap-2">
        <select
          className={`${fieldClass} h-9 w-auto py-1`}
          aria-label="Rows per page"
          value={pageSize === 0 ? "all" : pageSize}
          onChange={(event) =>
            onPageSize(event.target.value === "all" ? 0 : Number(event.target.value))
          }
        >
          {[10, 25, 50].map((size) => <option key={size} value={size}>{size} / page</option>)}
          {allowAll ? <option value="all">All</option> : null}
        </select>
        <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => onPage(safePage - 1)}>
          Previous
        </Button>
        <span className="whitespace-nowrap">Page {safePage} of {pages}</span>
        <Button variant="outline" size="sm" disabled={safePage >= pages} onClick={() => onPage(safePage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function DataTable({
  headers,
  children,
  colSpan,
  empty,
  loading,
}: {
  headers: string[];
  children: ReactNode;
  colSpan: number;
  empty: string;
  loading: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
          <tr>{headers.map((header) => <th className="px-4 py-3 font-semibold" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {children || (
            <tr>
              <td colSpan={colSpan} className="px-4 py-10 text-center text-gray-500">
                {loading ? "Loading…" : empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FormDialog({
  title,
  onClose,
  onSubmit,
  saving,
  error,
  submitLabel = "Save",
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  error: string | null;
  submitLabel?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-dialog-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between gap-3 border-b pb-3">
          <h3 id="coupon-dialog-title" className="text-lg font-semibold text-gray-900">{title}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          {children}
          {error ? <Notice error>{error}</Notice> : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      className="max-w-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label="Search"
    />
  );
}
