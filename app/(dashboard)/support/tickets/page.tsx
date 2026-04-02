"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  MoreVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { listTickets, updateTicketStatus } from "@/lib/api/support";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { SupportTicket } from "@/types";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/LoadingSkeleton";

const statusColors: Record<string, string> = {
  new: "secondary",
  read: "warning",
  replied: "success",
  closed: "default",
};

const statusIcons: Record<string, any> = {
  new: Clock,
  read: Eye,
  replied: CheckCircle,
  closed: XCircle,
};

export default function SupportTicketsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    status: "new" | "read" | "replied" | "closed" | null;
  }>({
    open: false,
    status: null,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", search, statusFilter, page, limit],
    queryFn: () =>
      listTickets({
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit,
      }),
    enabled: hasPermission("support.ticket.list"),
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: "new" | "read" | "replied" | "closed";
    }) => updateTicketStatus(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket status updated successfully");
      setStatusDialog({ open: false, status: null });
      setSelectedTicket(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update ticket status");
    },
  });

  const handleStatusChange = (
    ticket: SupportTicket,
    status: "new" | "read" | "replied" | "closed",
  ) => {
    setSelectedTicket(ticket);
    setStatusDialog({ open: true, status });
  };

  const confirmStatusChange = () => {
    if (!selectedTicket || !statusDialog.status) return;
    updateStatusMutation.mutate({
      ticketId: selectedTicket._id,
      status: statusDialog.status,
    });
  };

  const tickets = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  };

  if (!hasPermission("support.ticket.list")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          You don't have permission to view support tickets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage customer support requests and inquiries
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or subject..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Tickets List</CardTitle>
            <Badge variant="secondary">
              {pagination.total} {pagination.total === 1 ? "ticket" : "tickets"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Failed to load tickets. Please try again.
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tickets found
            </div>
          ) : (
            <>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">
                        Ticket
                      </TableHead>
                      <TableHead className="sm:hidden">Details</TableHead>
                      <TableHead className="hidden md:table-cell">
                        From
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Status
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Created
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => {
                      const StatusIcon =
                        statusIcons[ticket.status] || MessageSquare;
                      return (
                        <TableRow key={ticket._id}>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700">
                                  <MessageSquare className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate">
                                    {ticket.subject}
                                  </div>
                                  <div className="text-sm text-gray-500 truncate line-clamp-1">
                                    {ticket.message}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:hidden">
                                <Badge
                                  variant={statusColors[ticket.status] as any}
                                >
                                  {ticket.status}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {ticket.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {ticket.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant={statusColors[ticket.status] as any}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                            {formatDate(ticket.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/support/tickets/${ticket._id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                {hasPermission("support.ticket.update") && (
                                  <>
                                    {ticket.status !== "new" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusChange(ticket, "new")
                                        }
                                      >
                                        <Clock className="mr-2 h-4 w-4" />
                                        Mark as New
                                      </DropdownMenuItem>
                                    )}
                                    {ticket.status !== "read" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusChange(ticket, "read")
                                        }
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Mark as Read
                                      </DropdownMenuItem>
                                    )}
                                    {ticket.status !== "replied" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusChange(ticket, "replied")
                                        }
                                      >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Mark as Replied
                                      </DropdownMenuItem>
                                    )}
                                    {ticket.status !== "closed" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusChange(ticket, "closed")
                                        }
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Close Ticket
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, pagination.total)} of{" "}
                    {pagination.total} tickets
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm text-gray-600 px-2">
                      Page {page} of {pagination.pages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.pages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(pagination.pages)}
                      disabled={page >= pagination.pages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog({ ...statusDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
            <DialogDescription>
              {selectedTicket && statusDialog.status && (
                <>
                  Are you sure you want to mark this ticket as "
                  {statusDialog.status}"?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialog({ open: false, status: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
