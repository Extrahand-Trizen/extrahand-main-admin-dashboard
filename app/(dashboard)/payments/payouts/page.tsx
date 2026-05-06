"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPaymentPayouts } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";

export default function PaymentPayoutsPage() {
  const { hasPermission } = usePermissions();
  const { data } = useQuery({
    queryKey: ["payment-payouts"],
    queryFn: () => listPaymentPayouts({ limit: 100, offset: 0 }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  if (!hasPermission("payment.list")) {
    return <div className="flex items-center justify-center h-64 text-gray-500">You do not have permission to view payouts.</div>;
  }

  const rows = data?.data || [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Payout Rows</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Payout ID</th>
                  <th className="px-3 py-2 text-left">Poster</th>
                  <th className="px-3 py-2 text-left">Task</th>
                  <th className="px-3 py-2 text-left">Performer</th>
                  <th className="px-3 py-2 text-left">Gross</th>
                  <th className="px-3 py-2 text-left">Net</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No payouts found</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.payoutId} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{row.payoutId}</td>
                    <td className="px-3 py-2">{row.posterUid ? <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.posterUid)}`}>{row.posterUid}</Link> : "—"}</td>
                    <td className="px-3 py-2">{row.taskId ? <Link className="text-blue-600 hover:underline" href={`/tasks/${encodeURIComponent(row.taskId)}`}>{row.taskId}</Link> : "—"}</td>
                    <td className="px-3 py-2"><Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.performerUid)}`}>{row.performerUid}</Link></td>
                    <td className="px-3 py-2">₹{row.amount}</td>
                    <td className="px-3 py-2">₹{row.netAmount}</td>
                    <td className="px-3 py-2">{row.status}</td>
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
