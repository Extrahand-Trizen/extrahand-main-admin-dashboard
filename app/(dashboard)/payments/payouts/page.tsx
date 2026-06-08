"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { listPaymentPayouts, updatePaymentPayoutStatus, getUserBankAccounts } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { getUser } from "@/lib/api/users";
import { getTask } from "@/lib/api/tasks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PAGE_SIZE = 10;
const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed", "held"] as const;

type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export default function PaymentPayoutsPage() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [userMap, setUserMap] = useState(new Map<string, string>());
  const [taskMap, setTaskMap] = useState(new Map<string, string>());
  const [bankAccountsDialog, setBankAccountsDialog] = useState<{
    open: boolean;
    helperName: string;
    helperUid: string;
    loading: boolean;
    accounts: any[];
  }>({
    open: false,
    helperName: "",
    helperUid: "",
    loading: false,
    accounts: [],
  });

  const handleShowBankDetails = async (helperUid: string, helperName: string) => {
    setBankAccountsDialog({
      open: true,
      helperName,
      helperUid,
      loading: true,
      accounts: [],
    });
    try {
      const res = await getUserBankAccounts(helperUid);
      setBankAccountsDialog((prev) => ({
        ...prev,
        loading: false,
        accounts: res?.data?.bankAccounts ?? [],
      }));
    } catch (error: any) {
      toast.error("Failed to load bank details");
      setBankAccountsDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment-payouts", page],
    queryFn: () => listPaymentPayouts({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  const canUpdatePayout = isSuperAdmin || hasPermission("payment.update");
  const rows = data?.data || [];
  const total = data?.pagination?.total ?? data?.total ?? rows.length;
  const hasMore = (page * PAGE_SIZE) < total;

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
            // ignore
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
    return () => { mounted = false; };
  }, [rows]);

  const handleStatusChange = async (payoutId: string, nextStatus: string) => {
    try {
      await updatePaymentPayoutStatus(payoutId, nextStatus);
      toast.success("Payout status updated");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update payout status");
    }
  };

  return (
    <div className="space-y-6">
      {!hasPermission("payment.list") && (
        <div className="flex h-64 items-center justify-center text-gray-500">
          You do not have permission to view payouts.
        </div>
      )}
      {hasPermission("payment.list") && (
        <>
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
                  <th className="px-3 py-2 text-left w-36">Date</th>
                  <th className="px-3 py-2 text-left">Payout ID</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Task</th>
                  <th className="px-3 py-2 text-left">Helper</th>
                  <th className="px-3 py-2 text-left">Gross</th>
                  <th className="px-3 py-2 text-left">Net</th>
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Bank Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                      Loading payouts...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                      No payouts found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.payoutId} className="border-t">
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {row.createdAt ? formatDateTime(row.createdAt) : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.payoutId}</td>
                      <td className="px-3 py-2">
                        {row.CustomerUid ? (
                          <Link
                            className="text-blue-600 hover:underline"
                            href={`/users/${encodeURIComponent(row.CustomerUid)}`}
                          >
                            {userMap.get(row.CustomerUid) || row.CustomerUid}
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
                            {taskMap.get(row.taskId) || row.taskId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.performerUid ? (
                          <Link
                            className="text-blue-600 hover:underline"
                            href={`/users/${encodeURIComponent(row.performerUid)}`}
                          >
                            {userMap.get(row.performerUid) || row.performerUid}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">₹{row.amount}</td>
                      <td className="px-3 py-2">₹{row.netAmount}</td>
                      <td className="px-3 py-2">{row.source || "—"}</td>
                      <td className="px-3 py-2">
                        {canUpdatePayout ? (
                          <Select
                            value={row.status}
                            onValueChange={(value) => handleStatusChange(row.payoutId, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder={row.status || "Select status"} />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYOUT_STATUSES.map((statusOption) => (
                                <SelectItem key={statusOption} value={statusOption}>
                                  {statusOption}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          row.status
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.performerUid ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowBankDetails(row.performerUid, userMap.get(row.performerUid) || row.performerUid)}
                          >
                            Show Details
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
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
                disabled={page * PAGE_SIZE >= total || isLoading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Dialog
        open={bankAccountsDialog.open}
        onOpenChange={(open) => setBankAccountsDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Details</DialogTitle>
            <DialogDescription>
              Registered bank account details for helper <strong>{bankAccountsDialog.helperName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {bankAccountsDialog.loading ? (
              <div className="text-center py-4 text-gray-500">Loading bank details...</div>
            ) : bankAccountsDialog.accounts.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No bank accounts registered.</div>
            ) : (
              <div className="space-y-3">
                {bankAccountsDialog.accounts.map((acc: any, index: number) => (
                  <div key={acc.id || index} className="p-3 border rounded-lg bg-gray-50 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">{acc.bankName || "Unknown Bank"}</span>
                      <div className="flex gap-1.5">
                        {acc.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">
                            Default
                          </span>
                        )}
                        {acc.isDecrypted ? (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium">
                            ✓ Decrypted
                          </span>
                        ) : acc.hasEncryptedAccountNumber ? (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium" title="Encryption key not configured in this environment">
                            ⚠ Masked
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm pt-2">
                      <span className="text-gray-500">Account Holder:</span>
                      <span className="text-gray-900 font-medium">{acc.accountHolderName || "—"}</span>
                      <span className="text-gray-500">Account Number:</span>
                      <span className="text-gray-900 font-mono font-medium">
                        {acc.accountNumber || "—"}
                        {!acc.isDecrypted && acc.hasEncryptedAccountNumber && (
                          <span className="ml-1 text-xs text-yellow-600">(masked)</span>
                        )}
                      </span>
                      <span className="text-gray-500">IFSC Code:</span>
                      <span className="text-gray-900 font-mono font-medium">{acc.ifscCode || "—"}</span>
                      <span className="text-gray-500">Verified:</span>
                      <span className={`font-medium ${acc.isVerified ? 'text-green-700' : 'text-gray-500'}`}>
                        {acc.isVerified ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
