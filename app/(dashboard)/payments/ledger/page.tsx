"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listPaymentLedger, enrichPaymentLedger } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDateTime } from "@/lib/utils";

export default function PaymentLedgerPage() {
  const { hasPermission } = usePermissions();
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [environment, setEnvironment] = useState<'production' | 'development'>('production');

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["payment-ledger", page, environment],
    queryFn: () => listPaymentLedger({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, environment }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  const rows = data?.data || [];
  const total = data?.pagination?.total ?? data?.total ?? rows.length;

  // Lazy enrichment — loads after the table renders with fallback IDs
  const { data: enrichmentMap } = useQuery({
    queryKey: ["payment-ledger-enrich", rows.map((r: any) => r.id).sort()],
    queryFn: () =>
      enrichPaymentLedger({ ids: rows.map((r: any) => r.id) }).then(
        (res) => (res?.data || {}) as Record<string, any>
      ),
    enabled: rows.length > 0,
    retry: false,
    staleTime: 60000,
  });

  // Merge enrichment into rows so existing fallback JSX works unchanged
  const enrichedRows = rows.map((row: any) => {
    const e = enrichmentMap?.[row.id];
    if (!e) return row;
    return {
      ...row,
      links: {
        ...row.links,
        customerUserId: e.customerUserId || row.links?.customerUserId,
        helperUserId: e.helperUserId || row.links?.helperUserId,
        customerName: e.customerName || row.links?.customerName,
        helperName: e.helperName || row.links?.helperName,
        taskTitle: e.taskTitle || row.links?.taskTitle,
      },
    };
  });



  return (
    <div className="space-y-6">
      {!hasPermission("payment.list") && (
        <div className="flex items-center justify-center h-64 text-gray-500">You do not have permission to view ledger.</div>
      )}
      {hasPermission("payment.list") && (
        <>
          <h1 className="text-3xl font-bold text-gray-900">Ledger</h1>
          <div className="flex gap-2 items-center">
            <Select value={environment} onValueChange={(value: any) => { setEnvironment(value); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setEnvironment('production'); setPage(1); }}>Reset</Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Ledger Entries</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left w-36">Date</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Task</th>
                  <th className="px-3 py-2 text-left">Helper</th>
                  <th className="px-3 py-2 text-left">Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No ledger entries found</td></tr>
                ) : enrichedRows.map((row: any, index: number) => (
                  <tr key={`${row.transactionId}-${index}`} className="border-t">
                    <td className="px-3 py-2 text-sm text-gray-700">{row.createdAt ? formatDateTime(row.createdAt) : '—'}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2 font-medium">₹{row.amount}</td>
                    <td className="px-3 py-2">{row.CustomerUid ? (
                      <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.links?.customerUserId || row.CustomerUid)}`}>
                        {row.links?.customerName || row.CustomerUid}
                      </Link>
                    ) : '—'}</td>
                    <td className="px-3 py-2">{row.taskId ? (
                      <Link className="text-blue-600 hover:underline" href={`/tasks/${encodeURIComponent(row.links?.taskId || row.taskId)}`}>
                        {row.links?.taskTitle || row.taskId}
                      </Link>
                    ) : '—'}</td>
                    <td className="px-3 py-2">{row.performerUid ? (
                      <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.links?.helperUserId || row.performerUid)}`}>
                        {row.links?.helperName || row.performerUid}
                      </Link>
                    ) : '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.transactionId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-outline"
                disabled={page === 1 || isFetching}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Previous
              </button>
              <button
                className="btn btn-outline"
                disabled={page * PAGE_SIZE >= total || isFetching}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
