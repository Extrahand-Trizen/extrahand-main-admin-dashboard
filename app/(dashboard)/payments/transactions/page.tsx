"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
} from "@/lib/api/payments";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

type TransactionType = "all" | "real" | "team";
type HoldStatus = "all" | "held" | "cancelled";

export default function PaymentTransactionsPage() {
  const { hasPermission } = usePermissions();
  const [q, setQ] = useState("");
  const [transactionType, setTransactionType] = useState<TransactionType>("all");
  const [holdStatus, setHoldStatus] = useState<HoldStatus>("all");
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["payment-transactions", q, transactionType, holdStatus, page],
    queryFn: () =>
      listPaymentTransactions({
        q: q || undefined,
        transactionType: transactionType !== "all" ? transactionType : undefined,
        holdStatus: holdStatus !== "all" ? holdStatus : undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: hasPermission("payment.list"),
    retry: false,
  });

  const rows = data?.data || [];

  const handleToggleTeamTest = async (escrowId: string, teamTest: boolean) => {
    try {
      await updateTransactionTeamTest(escrowId, teamTest);
      toast.success(teamTest ? "Marked as team test" : "Marked as real transaction");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update transaction type");
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
          }}>Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Pay-ins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left w-36">Date</th>
                  <th className="px-3 py-2 text-left">Task Title</th>
                  <th className="px-3 py-2 text-left">Customer Name</th>
                  <th className="px-3 py-2 text-left">Helper Name</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Payment Status</th>
                  <th className="px-3 py-2 text-left">Hold Status</th>
                  <th className="px-3 py-2 text-left">Transaction ID</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
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
                        <Link href={`/users/${encodeURIComponent(row.links?.helperUserId || row.performerUid)}`} className="text-blue-600 hover:underline">
                          {row.links?.helperName || row.performerUid}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-medium">₹{row.amountInRupees ?? "0.00"}</td>
                      <td className="px-3 py-2">{row.paymentStatus || "unknown"}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.escrowId}</td>
                      <td className="px-3 py-2">
                        {hasPermission("payment.update") ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => handleToggleTeamTest(row.escrowId, !row.teamTest)}
                              >
                                {row.teamTest ? "Mark as real" : "Mark as team test"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-gray-500">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
