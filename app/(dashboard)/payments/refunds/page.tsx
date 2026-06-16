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
import { listPaymentRefunds, updateRefundTeamTest } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function PaymentRefundsPage() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [transactionType, setTransactionType] = useState<'all' | 'real' | 'team'>('all');
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment-refunds", page, transactionType],
    queryFn: () => listPaymentRefunds({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, transactionType }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  const canUpdateRefund = isSuperAdmin || hasPermission("payment.update");
  const rows = data?.data || [];
  const total = data?.pagination?.total ?? data?.total ?? rows.length;
  const hasMore = (page * PAGE_SIZE) < total;

  const handleToggleTeamTest = async (refundId: string, teamTest: boolean) => {
    try {
      await updateRefundTeamTest(refundId, teamTest);
      toast.success(teamTest ? "Marked as team test" : "Marked as real transaction");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update transaction type");
    }
  };

  if (!hasPermission("payment.list")) {
    return <div className="flex items-center justify-center h-64 text-gray-500">You do not have permission to view refunds.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Refunds</h1>
      <div className="flex gap-2 items-center">
        <Select value={transactionType} onValueChange={(value: any) => { setTransactionType(value); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="real">Real</SelectItem>
            <SelectItem value="team">Team tests</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setTransactionType('all'); setPage(1); }}>Reset</Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Refund Rows</CardTitle>
          <span className="text-sm text-gray-500">
            Showing {rows.length} of {total}
          </span>
        </CardHeader>
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
                {isLoading ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Loading refunds...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No refunds found</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.refundId} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{row.refundId}</td>
                    <td className="px-3 py-2">{row.CustomerUid ? <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.CustomerUid)}`}>{row.CustomerUid}</Link> : "—"}</td>
                    <td className="px-3 py-2">{row.taskId ? <Link className="text-blue-600 hover:underline" href={`/tasks/${encodeURIComponent(row.taskId)}`}>{row.taskId}</Link> : "—"}</td>
                    <td className="px-3 py-2">{row.performerUid ? <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.performerUid)}`}>{row.performerUid}</Link> : "—"}</td>
                    <td className="px-3 py-2">₹{row.refundAmount}</td>
                    <td className="px-3 py-2">
                      {canUpdateRefund ? (
                        <Select
                          value={row.teamTest ? "team" : "real"}
                          onValueChange={(value) => 
                            handleToggleTeamTest(row.refundId, value === "team")
                          }
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
                        <span className="text-gray-500">{row.teamTest ? "Team test" : "Real"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
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
                disabled={page === 1 || isLoading}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Previous
              </button>
              <button
                className="btn btn-outline"
                disabled={!hasMore || isLoading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
