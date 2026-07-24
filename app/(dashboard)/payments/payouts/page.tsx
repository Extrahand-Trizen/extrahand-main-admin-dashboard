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
import { listPaymentPayouts, updatePaymentPayoutStatus, updatePayoutTeamTest, getUserBankAccounts, deletePaymentPayout, enrichPaymentPayouts } from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/LoadingSkeleton";

const PAGE_SIZE = 10;
const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed", "held"] as const;

type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export default function PaymentPayoutsPage() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [transactionType, setTransactionType] = useState<'all' | 'real' | 'team'>('all');
  const [environment, setEnvironment] = useState<'production' | 'development'>('production');
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePayout = async () => {
    if (!deleteTarget) return;
    if (confirmDeleteText !== "delete") {
      toast.error("Please type 'delete' to confirm.");
      return;
    }
    setIsDeleting(true);
    try {
      await deletePaymentPayout(deleteTarget.id);
      toast.success("Payout deleted successfully");
      setDeleteTarget(null);
      setConfirmDeleteText("");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete payout");
    } finally {
      setIsDeleting(false);
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment-payouts", page, transactionType, environment],
    queryFn: () => listPaymentPayouts({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, transactionType, environment }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  const canUpdatePayout = isSuperAdmin || hasPermission("payment.update");
  const rows = data?.data || [];
  const total = data?.pagination?.total ?? data?.total ?? rows.length;
  const hasMore = (page * PAGE_SIZE) < total;

  // Lazy enrichment — loads after the table renders with fallback IDs
  const { data: enrichmentMap } = useQuery({
    queryKey: ["payment-payouts-enrich", rows.map((r: any) => r.id).sort(), environment],
    queryFn: () =>
      enrichPaymentPayouts({ ids: rows.map((r: any) => r.id), environment }).then(
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



  const handleStatusChange = async (payoutId: string, nextStatus: string) => {
    try {
      await updatePaymentPayoutStatus(payoutId, nextStatus, environment);
      toast.success("Payout status updated");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update payout status");
    }
  };

  const handleToggleTeamTest = async (payoutId: string, teamTest: boolean) => {
    try {
      await updatePayoutTeamTest(payoutId, teamTest);
      toast.success(teamTest ? "Marked as team test" : "Marked as real transaction");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update transaction type");
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
            <Button variant="outline" onClick={() => { setTransactionType('all'); setEnvironment('production'); setPage(1); }}>Reset</Button>
          </div>
          <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Payout Rows</CardTitle>
          <span className="text-sm text-gray-500">
            Showing {rows.length} of {total}
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
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
                    <th className="px-3 py-2 text-left">Transaction Type</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Bank Details</th>
                    {(isSuperAdmin || hasPermission("payment.delete")) && (
                      <th className="px-3 py-2 text-left w-24">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={(isSuperAdmin || hasPermission("payment.delete")) ? 12 : 11} className="px-3 py-8 text-center text-gray-500">
                        No payouts found
                      </td>
                    </tr>
                  ) : (
                    enrichedRows.map((row: any) => (
                      <tr key={row.payoutId} className="border-t">
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {row.createdAt ? formatDateTime(row.createdAt) : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.payoutId}</td>
                      <td className="px-3 py-2">
                        {row.CustomerUid ? (
                          <Link
                            className="text-blue-600 hover:underline"
                            href={`/users/${encodeURIComponent(row.links?.customerUserId || row.CustomerUid)}`}
                          >
                            {enrichmentMap?.[row.id] !== undefined ? (enrichmentMap[row.id]?.customerName ?? "Account Deleted") : row.CustomerUid}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.taskId ? (
                          <Link
                            className="text-blue-600 hover:underline"
                            href={`/tasks/${encodeURIComponent(row.links?.taskId || row.taskId)}`}
                          >
                            {enrichmentMap?.[row.id] !== undefined ? (enrichmentMap[row.id]?.taskTitle ?? "Task Deleted") : row.taskId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.performerUid ? (
                          <Link
                            className="text-blue-600 hover:underline"
                            href={`/users/${encodeURIComponent(row.links?.helperUserId || row.performerUid)}`}
                          >
                            {enrichmentMap?.[row.id] !== undefined ? (enrichmentMap[row.id]?.helperName ?? "Account Deleted") : row.performerUid}
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
                            value={row.teamTest ? "team" : "real"}
                            onValueChange={(value) => 
                              handleToggleTeamTest(row.payoutId, value === "team")
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
                            onClick={() => handleShowBankDetails(row.performerUid, row.links?.helperName || row.performerUid)}
                          >
                            Show Details
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                      {(isSuperAdmin || hasPermission("payment.delete")) && (
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 font-medium"
                            onClick={() => setDeleteTarget({ id: row.payoutId, label: row.payoutId })}
                          >
                            Delete
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page === 1 || isLoading} onClick={() => setPage(Math.max(1, page - 1))}>Previous</Button>
            <Button variant="outline" disabled={page * PAGE_SIZE >= total || isLoading} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
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
                        {acc.accountNumber || acc.accountNumberMasked || "—"}
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

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setConfirmDeleteText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <span className="block font-semibold text-gray-900">
                Are you sure you want to delete this payout record from the database?
              </span>
              <span className="block text-sm text-gray-500">
                This will delete the payout record (<code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-red-600">{deleteTarget?.label}</code>) permanently. Since this is a production database, you must confirm this action.
              </span>
              <span className="block text-sm font-semibold text-gray-900">
                Please type <span className="underline select-none">delete</span> to proceed:
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={confirmDeleteText}
              onChange={(e) => setConfirmDeleteText(e.target.value)}
              placeholder="type delete"
              className="font-mono text-center"
            />
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setConfirmDeleteText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmDeleteText !== "delete" || isDeleting}
              onClick={handleDeletePayout}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
