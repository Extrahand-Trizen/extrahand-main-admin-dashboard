"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  approveTaskDeleteRequest,
  listTaskDeleteRequests,
  rejectTaskDeleteRequest,
} from "@/lib/api/tasks";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/LoadingSkeleton";

export default function DeleteRequestsPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState<{
    open: boolean;
    requestId: string;
    action: "approve" | "reject";
    note: string;
  }>({ open: false, requestId: "", action: "approve", note: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", "delete-requests", page, limit, search],
    queryFn: () =>
      listTaskDeleteRequests({
        page,
        limit,
        status: "pending",
        search: search || undefined,
      }),
    enabled: isSuperAdmin,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: ({ requestId, note }: { requestId: string; note?: string }) =>
      approveTaskDeleteRequest(requestId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "delete-requests"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Delete request approved");
      setDecision({ open: false, requestId: "", action: "approve", note: "" });
    },
    onError: (e: any) => toast.error(e.message || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, note }: { requestId: string; note?: string }) =>
      rejectTaskDeleteRequest(requestId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "delete-requests"] });
      toast.success("Delete request rejected");
      setDecision({ open: false, requestId: "", action: "approve", note: "" });
    },
    onError: (e: any) => toast.error(e.message || "Failed to reject"),
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Super Admin access required.</p>
      </div>
    );
  }

  const payload = data as any;
  const requests = payload?.data?.requests || [];
  const pagination = payload?.data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Delete Requests</h1>
            <p className="mt-1 text-sm text-gray-600">Pending work deletion approvals</p>
          </div>
        </div>
        <Badge variant="secondary">{pagination.total} pending</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by workId or requester..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data || error || requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No pending requests</div>
          ) : (
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="hidden md:table-cell">Requested By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r: any) => (
                    <TableRow key={r.requestId}>
                      <TableCell className="font-mono text-xs">{r.taskId}</TableCell>
                      <TableCell className="text-sm">{r.reason}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {r.requestedBy?.name || "Unknown"} ({r.requestedBy?.email || "—"})
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              setDecision({
                                open: true,
                                requestId: r.requestId,
                                action: "approve",
                                note: "",
                              })
                            }
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setDecision({
                                open: true,
                                requestId: r.requestId,
                                action: "reject",
                                note: "",
                              })
                            }
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={decision.open}
        onOpenChange={(open) =>
          setDecision((d) => ({ ...d, open, note: open ? d.note : "" }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision.action === "approve" ? "Approve delete request" : "Reject delete request"}
            </DialogTitle>
            <DialogDescription>
              Add an optional note for audit/history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decision-note">Note (optional)</Label>
            <Textarea
              id="decision-note"
              value={decision.note}
              onChange={(e) => setDecision((d) => ({ ...d, note: e.target.value }))}
              rows={3}
              placeholder="Add a note..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision({ open: false, requestId: "", action: "approve", note: "" })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!decision.requestId) return;
                if (decision.action === "approve") {
                  approveMutation.mutate({ requestId: decision.requestId, note: decision.note });
                } else {
                  rejectMutation.mutate({ requestId: decision.requestId, note: decision.note });
                }
              }}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

