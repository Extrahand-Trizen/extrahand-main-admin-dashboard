"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listPaymentRefunds, updateRefundTeamTest } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { toast } from "sonner";

const PAGE_SIZE = 10;

import { PaymentRefund } from '@/types';

function getAssignedHelperUid(...values: Array<string | null | undefined>): string {
  const unassigned = new Set([
    '',
    'pending_assignment',
    'not_assigned',
    'unassigned',
    'null',
    'undefined',
  ]);
  return (
    values
      .map((value) => String(value || '').trim())
      .find((uid) => !unassigned.has(uid.toLowerCase().replace(/[\s-]+/g, '_'))) || ''
  );
}

function formatRefundAmount(value: string | number): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
      }).format(amount)
    : `₹${value}`;
}

function getRefundCustomerName(row: PaymentRefund): string {
  const customerId = row.links?.customerUserId || row.CustomerUid || '';
  const customerName = row.links?.customerName?.trim();
  if (customerName && customerName !== customerId) return customerName;
  return customerId ? 'Customer name unavailable' : 'Customer unavailable';
}

export default function PaymentRefundsPage() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [transactionType, setTransactionType] = useState<'all' | 'real' | 'team'>('all');
  const [environment, setEnvironment] = useState<'production' | 'development'>('production');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);
  
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["payment-refunds", page, transactionType, environment, debouncedSearch],
    queryFn: () => listPaymentRefunds({ q: debouncedSearch, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, transactionType, environment }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  const canUpdateRefund = isSuperAdmin || hasPermission("payment.update");
  const rows = (data?.data as PaymentRefund[]) || [];
  const total = data?.pagination?.total ?? data?.total ?? rows.length;

  const handleToggleTeamTest = async (refundId: string, teamTest: boolean) => {
    try {
      await updateRefundTeamTest(refundId, teamTest);
      toast.success(teamTest ? "Marked as team test" : "Marked as real transaction");
      await refetch();
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Failed to update transaction type';
      toast.error(message);
    }
  };

  if (!hasPermission("payment.list")) {
    return <div className="flex items-center justify-center h-64 text-gray-500">You do not have permission to view refunds.</div>;
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Payments</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">Refunds</h1>
          <p className="mt-1 text-sm text-gray-500">Review refund status, task context, and payment details.</p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-gray-100 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Refund records</CardTitle>
                <p className="mt-1 text-sm text-gray-500">
                  {isLoading ? "Loading records…" : `${total.toLocaleString()} total`}
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 lg:hidden">
                Page {page}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
              <label className="min-w-0 sm:col-span-2 lg:w-72">
                <span className="mb-1 block text-xs font-medium text-gray-500">Search refunds</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Payment ID, refund ID, customer, task, partner"
                    className="pl-9"
                    aria-label="Search refunds by payment ID, refund ID, customer, task, or partner"
                  />
                </div>
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-gray-500">Environment</span>
                <Select value={environment} onValueChange={(value) => { setEnvironment(value as 'production' | 'development'); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-gray-500">Transaction type</span>
                <Select value={transactionType} onValueChange={(value) => { setTransactionType(value as 'all' | 'real' | 'team'); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="real">Real</SelectItem>
                    <SelectItem value="team">Team tests</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => { setSearch(''); setTransactionType('all'); setEnvironment('production'); setPage(1); }}
                  disabled={!search && transactionType === 'all' && environment === 'production'}
                >
                  Reset filters
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <div className="m-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:m-6">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-900">Refunds couldn’t be loaded</p>
                <p className="mt-1 text-sm text-red-800">
                  {error instanceof Error ? error.message : "Please try again."}
                </p>
                <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetch()}>
                  Try again
                </Button>
              </div>
            </div>
          ) : (
          <>
          <div className="space-y-3 p-4 xl:hidden">
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => (
                <div key={`mobile-loading-${index}`} className="space-y-3 rounded-xl border border-gray-200 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-8 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center">
                <p className="font-medium text-gray-900">No refunds found</p>
                <p className="mt-1 text-sm text-gray-500">Try another search or change the environment or transaction type.</p>
              </div>
            ) : rows.map((row) => {
              const helperUid = getAssignedHelperUid(
                row.links?.helperUserId,
                row.performerUid,
              );
              const status = String(row.status || 'unknown').toLowerCase();
              const statusStyle =
                status === 'completed' || status === 'processed'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : status === 'failed'
                    ? 'bg-red-50 text-red-700 ring-red-200'
                    : 'bg-amber-50 text-amber-800 ring-amber-200';
              return (
                <article key={`mobile-${row.refundId}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        className="break-all font-mono text-xs font-semibold text-blue-700 hover:underline"
                        href={`/payments/refunds/${encodeURIComponent(row.refundId)}?environment=${environment}`}
                      >
                        {row.refundId}
                      </Link>
                      <p className="mt-1 break-all font-mono text-[11px] text-gray-500">{row.paymentId}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${statusStyle}`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Customer</p>
                      {row.CustomerUid || row.links?.customerUserId ? (
                        <Link className="mt-1 block truncate font-medium text-gray-800 hover:text-blue-700 hover:underline" href={`/users/${encodeURIComponent(row.links?.customerUserId || row.CustomerUid || '')}`}>
                          {getRefundCustomerName(row)}
                        </Link>
                      ) : <p className="mt-1 text-gray-500">{getRefundCustomerName(row)}</p>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Task</p>
                      {row.taskId || row.links?.taskId ? (
                        <Link className="mt-1 block truncate font-medium text-gray-800 hover:text-blue-700 hover:underline" href={`/tasks/${encodeURIComponent(row.links?.taskId || row.taskId || '')}`}>
                          {row.links?.taskTitle || row.taskId}
                        </Link>
                      ) : <p className="mt-1 text-gray-500">—</p>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Partner</p>
                      {helperUid ? (
                        <Link className="mt-1 block truncate font-medium text-gray-800 hover:text-blue-700 hover:underline" href={`/users/${encodeURIComponent(helperUid)}`}>
                          {row.links?.helperName || helperUid}
                        </Link>
                      ) : <p className="mt-1 font-medium text-gray-700">Not assigned</p>}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Refund amount</p>
                      <p className="mt-1 font-semibold tabular-nums text-gray-900">{formatRefundAmount(row.refundAmount)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    {canUpdateRefund ? (
                      <Select value={row.teamTest ? 'team' : 'real'} onValueChange={(value) => handleToggleTeamTest(row.refundId, value === 'team')}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="real">Real</SelectItem>
                          <SelectItem value="team">Team test</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <span className="text-xs text-gray-500">{row.teamTest ? 'Team test' : 'Real transaction'}</span>}
                    <Link href={`/payments/refunds/${encodeURIComponent(row.refundId)}?environment=${environment}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50">
                      Details <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden xl:block">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[15%]" />
                <col className="w-[21%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3 text-left">Refund / payment</th>
                  <th className="px-3 py-3 text-left">Customer</th>
                  <th className="px-3 py-3 text-left">Task</th>
                  <th className="px-3 py-3 text-left">Partner</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-left">Type / status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={`loading-${index}`}>
                      {Array.from({ length: 6 }, (_, cell) => (
                        <td key={cell} className="px-3 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center">
                      <p className="font-medium text-gray-900">No refunds found</p>
                      <p className="mt-1 text-sm text-gray-500">Try another search or change the environment or transaction type.</p>
                    </td>
                  </tr>
                ) : rows.map((row) => (
                  <tr key={row.refundId} className="transition-colors odd:bg-white even:bg-gray-50/40 hover:bg-blue-50/40">
                    <td className="px-3 py-3">
                      <Link
                        className="block truncate font-mono text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
                        title={row.refundId}
                        href={`/payments/refunds/${encodeURIComponent(row.refundId)}?environment=${environment}`}
                      >
                        {row.refundId}
                      </Link>
                      <p className="mt-1 truncate font-mono text-[11px] text-gray-500" title={row.paymentId}>{row.paymentId}</p>
                    </td>
                    <td className="px-3 py-3">
                      {row.CustomerUid || row.links?.customerUserId ? (
                        <Link
                          className="block truncate font-medium text-gray-800 hover:text-blue-700 hover:underline"
                          title={getRefundCustomerName(row)}
                          href={`/users/${encodeURIComponent(row.links?.customerUserId || row.CustomerUid || '')}`}
                        >
                          {getRefundCustomerName(row)}
                        </Link>
                      ) : (
                        <span className="text-gray-500">{getRefundCustomerName(row)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.taskId || row.links?.taskId ? (
                        <Link
                          className="block truncate font-medium text-gray-800 hover:text-blue-700 hover:underline"
                          title={row.links?.taskTitle || row.taskId || undefined}
                          href={`/tasks/${encodeURIComponent(row.links?.taskId || row.taskId || '')}`}
                        >
                          {row.links?.taskTitle || row.taskId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {getAssignedHelperUid(row.links?.helperUserId, row.performerUid) ? (
                        <Link
                          className="block truncate font-medium text-gray-800 hover:text-blue-700 hover:underline"
                          title={row.links?.helperName || row.performerUid || undefined}
                          href={`/users/${encodeURIComponent(getAssignedHelperUid(row.links?.helperUserId, row.performerUid))}`}
                        >
                          {row.links?.helperName || row.performerUid}
                        </Link>
                      ) : (
                        <span className="text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-gray-900">{formatRefundAmount(row.refundAmount)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {canUpdateRefund ? (
                          <Select
                            value={row.teamTest ? 'team' : 'real'}
                            onValueChange={(value) => handleToggleTeamTest(row.refundId, value === 'team')}
                          >
                            <SelectTrigger className="h-7 w-full min-w-0 px-2 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="real">Real</SelectItem>
                              <SelectItem value="team">Team test</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.teamTest ? "bg-violet-50 text-violet-700" : "bg-gray-100 text-gray-700"
                          }`}>{row.teamTest ? 'Team test' : 'Real'}</span>
                        )}
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                          row.status === "completed" || row.status === "processed"
                            ? "bg-emerald-50 text-emerald-700"
                            : row.status === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-800"
                        }`}>{row.status.replace(/_/g, " ")}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
          )}
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm text-gray-500">
            {isLoading || total === 0
              ? `Page ${page}`
              : `${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button
              variant="outline"
              disabled={page === 1 || isLoading}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page * PAGE_SIZE >= total || isLoading || isError}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
