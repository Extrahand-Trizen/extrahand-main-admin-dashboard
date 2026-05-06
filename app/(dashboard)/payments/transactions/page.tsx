"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listPaymentTransactions } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";

export default function PaymentTransactionsPage() {
  const { hasPermission } = usePermissions();
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["payment-transactions", q],
    queryFn: () => listPaymentTransactions({ q: q || undefined, limit: 100, offset: 0 }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  if (!hasPermission("payment.list")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You do not have permission to view payment transactions.</p>
      </div>
    );
  }

  const rows = data?.data || [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Transactions</h1>
        <p className="mt-2 text-sm text-gray-600">
          Payment rows with Customer, task, and Helper details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search hold/order/payment/user/task..."
          />
          <Button variant="outline" onClick={() => setQ("")}>Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Transaction Hold ID</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Payment Status</th>
                  <th className="px-3 py-2 text-left">Hold Status</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Task</th>
                  <th className="px-3 py-2 text-left">Helper</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No transactions found</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.escrowId} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.escrowId}</td>
                      <td className="px-3 py-2 font-medium">₹{row.amountInRupees ?? "0.00"}</td>
                      <td className="px-3 py-2">{row.paymentStatus || "unknown"}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2">
                        <Link href={`/users/${encodeURIComponent(row.links?.customerUserId || row.posterUid)}`} className="text-blue-600 hover:underline">
                          {row.links?.customerName || row.posterUid}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/tasks/${encodeURIComponent(row.links?.taskId || row.taskId)}`} className="text-blue-600 hover:underline">
                          {row.links?.taskTitle || row.taskId}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/users/${encodeURIComponent(row.links?.helperUserId || row.performerUid)}`} className="text-blue-600 hover:underline">
                          {row.links?.helperName || row.performerUid}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
