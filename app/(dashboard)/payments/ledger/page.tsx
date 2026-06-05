"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPaymentLedger } from "@/lib/api/payments";
import { getUser } from "@/lib/api/users";
import { getTask } from "@/lib/api/tasks";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDateTime } from "@/lib/utils";

export default function PaymentLedgerPage() {
  const { hasPermission } = usePermissions();
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [userMap, setUserMap] = useState(new Map<string, string>());
  const [taskMap, setTaskMap] = useState(new Map<string, string>());

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["payment-ledger", page],
    queryFn: () => listPaymentLedger({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  const rows = data?.data || [];
  const total = data?.pagination?.total ?? data?.total ?? rows.length;

  useEffect(() => {
    let mounted = true;
    async function loadLookups() {
      const customerIds = new Set<string>();
      const performerIds = new Set<string>();
      const taskIds = new Set<string>();

      rows.forEach((r: any) => {
        if (r.CustomerUid) customerIds.add(r.CustomerUid);
        if (r.performerUid) performerIds.add(r.performerUid);
        if (r.taskId) taskIds.add(r.taskId);
      });

      const userIds = Array.from(new Set([...customerIds, ...performerIds]));
      const nextUserMap = new Map<string, string>();
      await Promise.all(
        userIds.map(async (uid) => {
          try {
            const res = await getUser(uid);
            if (res?.data?.name) nextUserMap.set(uid, res.data.name);
          } catch (e) {
            // ignore lookup errors
          }
        }),
      );

      const nextTaskMap = new Map<string, string>();
      await Promise.all(
        Array.from(taskIds).map(async (tid) => {
          try {
            const res = await getTask(tid);
            if (res?.data?.title) nextTaskMap.set(tid, res.data.title);
          } catch (e) {
            // ignore
          }
        }),
      );

      if (mounted) {
        setUserMap(nextUserMap);
        setTaskMap(nextTaskMap);
      }
    }

    if (rows.length > 0) loadLookups();
    return () => {
      mounted = false;
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      {!hasPermission("payment.list") && (
        <div className="flex items-center justify-center h-64 text-gray-500">You do not have permission to view ledger.</div>
      )}
      {hasPermission("payment.list") && (
        <>
          <h1 className="text-3xl font-bold text-gray-900">Ledger</h1>
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
                ) : rows.map((row: any, index: number) => (
                  <tr key={`${row.transactionId}-${index}`} className="border-t">
                    <td className="px-3 py-2 text-sm text-gray-700">{row.createdAt ? formatDateTime(row.createdAt) : '—'}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2 font-medium">₹{row.amount}</td>
                    <td className="px-3 py-2">{row.CustomerUid ? (
                      <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.CustomerUid)}`}>
                        {userMap.get(row.CustomerUid) || row.CustomerUid}
                      </Link>
                    ) : '—'}</td>
                    <td className="px-3 py-2">{row.taskId ? (
                      <Link className="text-blue-600 hover:underline" href={`/tasks/${encodeURIComponent(row.taskId)}`}>
                        {taskMap.get(row.taskId) || row.taskId}
                      </Link>
                    ) : '—'}</td>
                    <td className="px-3 py-2">{row.performerUid ? (
                      <Link className="text-blue-600 hover:underline" href={`/users/${encodeURIComponent(row.performerUid)}`}>
                        {userMap.get(row.performerUid) || row.performerUid}
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
