"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPaymentLedger } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";

export default function PaymentLedgerPage() {
  const { hasPermission } = usePermissions();
  const { data } = useQuery({
    queryKey: ["payment-ledger"],
    queryFn: () => listPaymentLedger({ limit: 100, offset: 0 }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  if (!hasPermission("payment.list")) {
    return <div className="flex items-center justify-center h-64 text-gray-500">You do not have permission to view ledger.</div>;
  }

  const rows = data?.data || [];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Ledger</h1>
      <Card>
        <CardHeader><CardTitle className="text-lg">Ledger Entries</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Transaction ID</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Task</th>
                  <th className="px-3 py-2 text-left">Performer</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No ledger entries found</td></tr>
                ) : rows.map((row, index) => (
                  <tr key={`${row.transactionId}-${index}`} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{row.transactionId}</td>
                    <td className="px-3 py-2">{row.CustomerUid ? <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.CustomerUid)}`}>{row.CustomerUid}</Link> : "—"}</td>
                    <td className="px-3 py-2">{row.taskId ? <Link className="text-blue-600 hover:underline" href={`/tasks/${encodeURIComponent(row.taskId)}`}>{row.taskId}</Link> : "—"}</td>
                    <td className="px-3 py-2">{row.performerUid ? <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.performerUid)}`}>{row.performerUid}</Link> : "—"}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">₹{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
