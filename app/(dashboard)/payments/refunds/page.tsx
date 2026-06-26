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
import { listPaymentRefunds, updateRefundTeamTest, enrichPaymentRefunds } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function PaymentRefundsPage() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [transactionType, setTransactionType] = useState<'all' | 'real' | 'team'>('all');
  const [environment, setEnvironment] = useState<'production' | 'development'>('production');
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment-refunds", page, transactionType, environment],
    queryFn: () => listPaymentRefunds({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, transactionType, environment }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  const canUpdateRefund = isSuperAdmin || hasPermission("payment.update");
  const rows = data?.data || [];
  const total = data?.pagination?.total ?? data?.total ?? rows.length;

  // Lazy enrichment — loads after the table renders with fallback IDs
  const { data: enrichmentMap } = useQuery({
    queryKey: ["payment-refunds-enrich", rows.map((r: any) => r.id).sort()],
    queryFn: () =>
      enrichPaymentRefunds({ ids: rows.map((r: any) => r.id) }).then(
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
      teamTest: e.teamTest ?? row.teamTest,
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Refunds</h1>
      <div className="flex gap-2 items-center">
        <Select value={environment} onValueChange={(value) => { setEnvironment(value as 'production' | 'development'); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>
        <Select value={transactionType} onValueChange={(value) => { setTransactionType(value as 'all' | 'real' | 'team'); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="real">Real</SelectItem>
            <SelectItem value="team">Team tests</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setTransactionType('all'); setEnvironment('production'); setPage(1); }}>
          Reset
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Refund Rows</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Refund ID</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Task</th>
                  <th className="px-3 py-2 text-left">Performer</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Transaction Type</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No refunds found</td></tr>
                ) : enrichedRows.map((row: any) => (
                  <tr key={row.refundId} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{row.refundId}</td>
                    <td className="px-3 py-2">{row.CustomerUid ? <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.links?.customerUserId || row.CustomerUid)}`}>{row.links?.customerName || row.CustomerUid}</Link> : "—"}</td>
                    <td className="px-3 py-2">{row.taskId ? <Link className="text-blue-600 hover:underline" href={`/tasks/${encodeURIComponent(row.links?.taskId || row.taskId)}`}>{row.links?.taskTitle || row.taskId}</Link> : "—"}</td>
                    <td className="px-3 py-2">{row.performerUid ? <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.links?.helperUserId || row.performerUid)}`}>{row.links?.helperName || row.performerUid}</Link> : "—"}</td>
                    <td className="px-3 py-2">₹{row.refundAmount}</td>
                    <td className="px-3 py-2">
                      {canUpdateRefund ? (
                        <Select
                          value={row.teamTest ? 'team' : 'real'}
                          onValueChange={(value) => handleToggleTeamTest(row.refundId, value === 'team')}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="real">Real</SelectItem>
                            <SelectItem value="team">Team test</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-gray-500">{row.teamTest ? 'Team test' : 'Real'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page === 1 || isLoading}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page * PAGE_SIZE >= total || isLoading}
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
