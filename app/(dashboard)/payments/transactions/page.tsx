"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function PaymentTransactionsPage() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [q, setQ] = useState("");
  const [transactionType, setTransactionType] = useState<TransactionType>("all");
  const [holdStatus, setHoldStatus] = useState<HoldStatus>("all");
  const [environment, setEnvironment] = useState<Environment>("production");
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, refetch, isLoading, isFetching } = useQuery({
    queryKey: ["payment-transactions", q, transactionType, holdStatus, environment, page],
    queryFn: () =>
      listPaymentTransactions({
        q: q || undefined,
        transactionType: transactionType !== "all" ? transactionType : undefined,
        holdStatus: holdStatus !== "all" ? holdStatus : undefined,
        environment,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  const rows = data?.data || [];

  // Lazy enrichment — loads after the table renders with fallback IDs
  const { data: enrichmentMap } = useQuery({
    queryKey: ["payment-transactions-enrich", rows.map((r) => r.id).sort()],
    queryFn: () =>
      enrichPaymentTransactions({ ids: rows.map((r) => String(r.id)) }).then(
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
          <CardTitle className="text-lg">Search</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search hold/order/payment/user/task..."
          />
          <Select value={environment} onValueChange={(value) => { setEnvironment(value as Environment); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="development">Development</SelectItem>
            </SelectContent>
          </Select>
          <Select value={transactionType} onValueChange={(value) => setTransactionType(value as TransactionType)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All transaction types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="real">Real</SelectItem>
              <SelectItem value="team">Team tests</SelectItem>
            </SelectContent>
          </Select>
          <Select value={holdStatus} onValueChange={(value) => setHoldStatus(value as HoldStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Hold status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="held">Held</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {
            setQ("");
            setTransactionType("all");
            setHoldStatus("all");
            setEnvironment("production");
            setPage(1);
          }}>Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Pay-ins</CardTitle>
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
                    <th className="px-3 py-2 text-left">Payout Amount</th>
                    <th className="px-3 py-2 text-left">Payment Status</th>
                    <th className="px-3 py-2 text-left">Hold Status</th>
                    <th className="px-3 py-2 text-left">Transaction ID</th>
                    <th className="px-3 py-2 text-left">Transaction Type</th>
                    {(isSuperAdmin || hasPermission("payment.delete")) && (
                      <th className="px-3 py-2 text-left w-24">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={(isSuperAdmin || hasPermission("payment.delete")) ? 11 : 10} className="px-3 py-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    enrichedRows.map((row) => (
                      <tr key={row.escrowId} className="border-t">
                        <td className="px-3 py-2 text-sm text-gray-700">
                          {row.createdAt ? formatDateTime(row.createdAt) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/tasks/${encodeURIComponent(row.links?.taskId || row.taskId)}`} className="text-blue-600 hover:underline">
                            {row.links?.taskTitle || row.taskId}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/users/${encodeURIComponent(row.links?.customerUserId || row.posterUid)}`} className="text-blue-600 hover:underline">
                            {row.links?.customerName || row.posterUid}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          {(!row.links?.helperUserId || row.links.helperUserId === 'pending_assignment') ? (
                            <span className="text-gray-400 italic text-xs">Pending Assignment</span>
                          ) : (
                            <Link href={`/users/${encodeURIComponent(row.links.helperUserId)}`} className="text-blue-600 hover:underline">
                              {row.links.helperName || row.links.helperUserId}
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">₹{row.amountInRupees ?? "0.00"}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {row.payoutAmount ? `₹${row.payoutAmount}` : <span className="text-gray-400 text-xs">—</span>}
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
                    ))
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
