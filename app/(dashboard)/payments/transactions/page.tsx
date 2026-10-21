"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listPaymentTransactions,
  updateTransactionTeamTest,
  deletePaymentTransaction,
  enrichPaymentTransactions,
  getUserBankAccounts,
} from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/LoadingSkeleton";


type TransactionType = "all" | "real" | "team";
type HoldStatus = "all" | "held" | "cancelled";
type Environment = "production" | "development";
type DatePreset = "today" | "last7Days" | "last30Days";

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputStart(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T00:00:00`).toISOString();
}

function dateInputEnd(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function calculateProfit(amountPaid: string | null, payoutAmount?: string | null): string | null {
  if (amountPaid == null || payoutAmount == null) return null;

  const totalPaid = Number(amountPaid);
  const payout = Number(payoutAmount);
  if (!Number.isFinite(totalPaid) || !Number.isFinite(payout)) return null;

  return (totalPaid - payout).toFixed(2);
}

export default function PaymentTransactionsPage() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [transactionType, setTransactionType] = useState<TransactionType>("all");
  const [holdStatus, setHoldStatus] = useState<HoldStatus>("all");
  const [environment, setEnvironment] = useState<Environment>("production");
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const applyDatePreset = (preset: DatePreset) => {
    const today = new Date();
    let start: Date;
    const end = today;

    switch (preset) {
      case "today":
        start = today;
        break;
      case "last7Days":
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
        break;
      case "last30Days":
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
        break;
    }

    setFromDate(toDateInputValue(start));
    setToDate(toDateInputValue(end));
    setPage(1);
  };

  const queryStartDate = dateInputStart(fromDate || toDate);
  const queryEndDate = dateInputEnd(toDate || fromDate);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(q.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
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

  const { data, refetch, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ["payment-transactions", searchQuery, transactionType, holdStatus, environment, fromDate, toDate, page],
    queryFn: () =>
      listPaymentTransactions({
        q: searchQuery || undefined,
        transactionType: transactionType !== "all" ? transactionType : undefined,
        holdStatus: holdStatus !== "all" ? holdStatus : undefined,
        environment,
        startDate: queryStartDate,
        endDate: queryEndDate,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: hasPermission("payment.list"),
      placeholderData: (previousData) => previousData,
      retry: false,
  });

  const rows = data?.data || [];

  // Lazy enrichment — loads after the table renders with fallback IDs
  const { data: enrichmentMap } = useQuery({
    queryKey: ["payment-transactions-enrich", rows.map((r) => r.id).sort(), environment],
    queryFn: () =>
      enrichPaymentTransactions({ ids: rows.map((r) => String(r.id)), environment }).then(
        (res) => (res?.data || {}) as Record<string, any>
      ),
    enabled: rows.length > 0,
    retry: false,
    staleTime: 60000,
  });

  // Merge enrichment into rows so existing fallback JSX works unchanged
  const enrichedRows = rows.map((row) => {
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

  const handleToggleTeamTest = async (escrowId: string, teamTest: boolean) => {
    try {
      await updateTransactionTeamTest(escrowId, teamTest);
      toast.success(teamTest ? "Marked as team test" : "Marked as real transaction");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update transaction type");
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deleteTarget) return;
    if (confirmDeleteText !== "delete") {
      toast.error("Please type 'delete' to confirm.");
      return;
    }
    setIsDeleting(true);
    try {
      await deletePaymentTransaction(deleteTarget.id);
      toast.success("Transaction deleted successfully");
      setDeleteTarget(null);
      setConfirmDeleteText("");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!hasPermission("payment.list")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You do not have permission to view payment transactions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pay-ins</h1>
        <p className="mt-2 text-sm text-gray-600">
          Pay-ins rows with Customer, task, and Helper details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex-1">
              <label htmlFor="payment-search" className="mb-1 block text-sm font-medium text-gray-700">Search</label>
              <Input
                id="payment-search"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search hold/order/payment/customer/task..."
              />
            </div>
            <Select value={environment} onValueChange={(value) => { setEnvironment(value as Environment); setPage(1); }}>
              <SelectTrigger className="w-full md:mt-6 md:w-44">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
            <Select value={transactionType} onValueChange={(value) => { setTransactionType(value as TransactionType); setPage(1); }}>
              <SelectTrigger className="w-full md:mt-6 md:w-48">
                <SelectValue placeholder="All transaction types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="real">Real</SelectItem>
                <SelectItem value="team">Team tests</SelectItem>
              </SelectContent>
            </Select>
            <Select value={holdStatus} onValueChange={(value) => { setHoldStatus(value as HoldStatus); setPage(1); }}>
              <SelectTrigger className="w-full md:mt-6 md:w-40">
                <SelectValue placeholder="Hold status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="held">Held</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-52">
              <label htmlFor="payment-from-date" className="mb-1 block text-sm font-medium text-gray-700">From Date</label>
              <Input
                id="payment-from-date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => {
                  const value = e.target.value;
                  setFromDate(value);
                  if (toDate && value > toDate) setToDate(value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-full sm:w-52">
              <label htmlFor="payment-to-date" className="mb-1 block text-sm font-medium text-gray-700">To Date</label>
              <Input
                id="payment-to-date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  const value = e.target.value;
                  setToDate(value);
                  if (fromDate && value < fromDate) setFromDate(value);
                  setPage(1);
                }}
              />
            </div>
            <Button variant="outline" onClick={() => applyDatePreset("today")}>Today</Button>
            <Button variant="outline" onClick={() => applyDatePreset("last7Days")}>Last 7 days</Button>
            <Button variant="outline" onClick={() => applyDatePreset("last30Days")}>Last 30 days</Button>
            <Button variant="outline" onClick={() => {
              setQ("");
              setFromDate("");
              setToDate("");
              setTransactionType("all");
              setHoldStatus("all");
              setEnvironment("production");
              setPage(1);
            }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Pay-ins</CardTitle>
            {isFetching && isPlaceholderData && (
              <span className="text-sm text-gray-500">Updating results…</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <div className="rounded-md border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Task Title</th>
                    <th className="px-3 py-2 text-left">Customer Name</th>
                    <th className="px-3 py-2 text-left">Helper Name</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2 text-left">Actual Work Amount</th>
                    <th className="px-3 py-2 text-left">Payout Amount</th>
                    <th className="px-3 py-2 text-left">Profit</th>
                    <th className="px-3 py-2 text-left">Payment Status</th>
                    <th className="px-3 py-2 text-left">Hold Status</th>
                    <th className="px-3 py-2 text-left">Transaction ID</th>
                    <th className="px-3 py-2 text-left">Transaction Type</th>
                    <th className="px-3 py-2 text-left">Bank Details</th>
                    {(isSuperAdmin || hasPermission("payment.delete")) && (
                      <th className="px-3 py-2 text-left w-24">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={(isSuperAdmin || hasPermission("payment.delete")) ? 14 : 13} className="px-3 py-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    enrichedRows.map((row) => {
                      const profit = calculateProfit(row.amountInRupees, row.payoutAmount);
                      return (
                        <tr key={row.escrowId} className="border-t">
                        <td className="px-3 py-2 text-sm text-gray-700">
                          {row.createdAt ? formatDateTime(row.createdAt) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/tasks/${encodeURIComponent(row.links?.taskId || row.taskId)}`} className="text-blue-600 hover:underline">
                            {(row.links?.taskTitle && row.links.taskTitle !== row.taskId
                              ? row.links.taskTitle
                              : enrichmentMap?.[row.id]?.taskTitle) || row.taskId}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/users/${encodeURIComponent(row.links?.customerUserId || row.posterUid)}`} className="text-blue-600 hover:underline">
                            {(row.links?.customerName && row.links.customerName !== row.posterUid
                              ? row.links.customerName
                              : enrichmentMap?.[row.id]?.customerName) || row.posterUid}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          {(!row.links?.helperUserId || row.links.helperUserId === 'pending_assignment') ? (
                            <span className="text-gray-400 italic text-xs">Pending Assignment</span>
                          ) : (
                            <Link href={`/users/${encodeURIComponent(row.links.helperUserId)}`} className="text-blue-600 hover:underline">
                              {(row.links?.helperName && row.links.helperName !== row.performerUid
                                ? row.links.helperName
                                : enrichmentMap?.[row.id]?.helperName) || row.links.helperUserId}
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">₹{row.amountInRupees ?? "0.00"}</td>
                        <td className="px-3 py-2 font-medium">
                          {row.taskAmount != null ? `₹${row.taskAmount}` : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {row.payoutAmount ? `₹${row.payoutAmount}` : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {profit != null
                            ? `₹${profit}`
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2">{row.paymentStatus || "unknown"}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.escrowId}</td>
                        <td className="px-3 py-2">
                          {hasPermission("payment.update") ? (
                            <Select
                              value={row.teamTest ? "team" : "real"}
                              onValueChange={(value) => 
                                handleToggleTeamTest(row.escrowId, value === "team")
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
                          {row.performerUid && row.performerUid !== 'pending_assignment' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShowBankDetails(row.performerUid, row.links?.helperName || row.performerUid)}
                            >
                              Show Details
                            </Button>
                          ) : (
                            <span className="text-gray-400 italic text-xs">No helper details</span>
                          )}
                        </td>
                        {(isSuperAdmin || hasPermission("payment.delete")) && (
                          <td className="px-3 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 font-medium"
                              onClick={() => setDeleteTarget({ id: row.escrowId, label: row.escrowId })}
                            >
                              Delete
                            </Button>
                          </td>
                        )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, data?.pagination?.total ?? data?.total ?? rows.length)} of {data?.pagination?.total ?? data?.total ?? rows.length}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page === 1 || isFetching} onClick={() => setPage(Math.max(1, page - 1))}>Previous</Button>
            <Button variant="outline" disabled={(page * PAGE_SIZE) >= (data?.pagination?.total ?? data?.total ?? rows.length) || isFetching} onClick={() => setPage(page + 1)}>Next</Button>
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
                Are you sure you want to delete this transaction record from the database?
              </span>
              <span className="block text-sm text-gray-500">
                This will delete the escrow record (<code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-red-600">{deleteTarget?.label}</code>) permanently. Since this is a production database, you must confirm this action.
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
              onClick={handleDeleteTransaction}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
