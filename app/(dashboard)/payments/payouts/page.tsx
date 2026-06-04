"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listPaymentPayouts } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 200;

export default function PaymentPayoutsPage() {
  const { hasPermission } = usePermissions();
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["payment-payouts", offset],
    queryFn: () => listPaymentPayouts({ limit: PAGE_SIZE, offset }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  if (!hasPermission("payment.list")) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        You do not have permission to view payouts.
      </div>
    );
  }

  const rows = data?.data || [];
  const total = data?.total ?? rows.length;
  const hasMore = offset + rows.length < total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
        <p className="mt-2 text-sm text-gray-600">
          All payout records including manual and automated transfers
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Payout Rows</CardTitle>
          <span className="text-sm text-gray-500">
            Showing {rows.length} of {total}
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Payout ID</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Task</th>
                  <th className="px-3 py-2 text-left">Performer</th>
                  <th className="px-3 py-2 text-left">Gross</th>
                  <th className="px-3 py-2 text-left">Net</th>
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                      Loading payouts...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                      No payouts found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.payoutId} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.payoutId}</td>
                      <td className="px-3 py-2">
                        {row.CustomerUid ? (
                          <Link
                            className="text-blue-600 hover:underline"
                            href={`/users/${encodeURIComponent(row.CustomerUid)}`}
                          >
                            {row.CustomerUid}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.taskId ? (
                          <Link
                            className="text-blue-600 hover:underline"
                            href={`/tasks/${encodeURIComponent(row.taskId)}`}
                          >
                            {row.taskId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          className="text-blue-600 hover:underline"
                          href={`/users/${encodeURIComponent(row.performerUid)}`}
                        >
                          {row.performerUid}
                        </Link>
                      </td>
                      <td className="px-3 py-2">₹{row.amount}</td>
                      <td className="px-3 py-2">₹{row.netAmount}</td>
                      <td className="px-3 py-2">{row.source || "—"}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2">
                        {row.createdAt ? formatDateTime(row.createdAt) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={offset === 0 || isLoading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              {offset + 1}–{offset + rows.length} of {total}
            </span>
            <Button
              variant="outline"
              disabled={!hasMore || isLoading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
