"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Calendar,
  MessageSquare,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getTicket, updateTicketStatus } from "@/lib/api/support";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { replyToTicket } from "@/lib/api/support";

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const ticketId = params.ticketId as string;

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    status: "new" | "read" | "replied" | "closed" | null;
  }>({
    open: false,
    status: null,
  });
  const [replyMessage, setReplyMessage] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicket(ticketId),
    enabled: !!ticketId && hasPermission("support.ticket.view"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: "new" | "read" | "replied" | "closed") =>
      updateTicketStatus(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket status updated successfully");
      setStatusDialog({ open: false, status: null });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update ticket status");
    },
  });

  const replyMutation = useMutation({
    mutationFn: (message: string) => replyToTicket(ticketId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setReplyMessage("");
      toast.success("Reply sent to the customer");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send reply");
    },
  });

  const handleStatusChange = (
    status: "new" | "read" | "replied" | "closed",
  ) => {
    setStatusDialog({ open: true, status });
  };

  const confirmStatusChange = () => {
    if (!statusDialog.status) return;
    updateStatusMutation.mutate(statusDialog.status);
  };

  const ticket = data?.data;

  const statusColors: Record<string, string> = {
    new: "secondary",
    read: "warning",
    replied: "success",
    closed: "default",
  };

  if (!hasPermission("support.ticket.view")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          You don't have permission to view ticket details.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>

      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <Link href="/support/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              Failed to load ticket details. Please try again.
            </div>
          </CardContent>
        </Card>

      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/support/tickets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {ticket.subject}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Ticket ID: {ticket._id}
            </p>
          </div>
        </div>
        {hasPermission("support.ticket.update") && (
          <div className="flex items-center gap-2">
            <Select
              value={ticket.status}
              onValueChange={(value: any) => handleStatusChange(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Message */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Message</CardTitle>
                <Badge variant={statusColors[ticket.status] as any}>
                  {ticket.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {ticket.message}
                </p>
              </div>
            </CardContent>
          </Card>
          {ticket.source !== "Support Service" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Support Replies
                </CardTitle>
                <CardDescription>
                  Replies are visible to the customer in the Customer App.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.replies?.length ? (
                  <div className="space-y-3">
                    {ticket.replies.map((reply, index) => (
                      <div
                        key={`${reply.createdAt}-${index}`}
                        className="rounded-lg border bg-gray-50 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                          <span>{reply.repliedBy || "Support Team"}</span>
                          <span>{formatDateTime(reply.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-gray-900">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No replies have been sent yet.</p>
                )}

                {hasPermission("support.ticket.update") && (
                  <div className="space-y-3 border-t pt-4">
                    <Label htmlFor="ticket-reply">Send a reply</Label>
                    <Textarea
                      id="ticket-reply"
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value.slice(0, 2000))}
                      placeholder="Write a response for the customer..."
                      rows={5}
                      maxLength={2000}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => replyMutation.mutate(replyMessage.trim())}
                        disabled={!replyMessage.trim() || replyMutation.isPending}
                      >
                        {replyMutation.isPending ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Name
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {ticket.name}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Email
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {ticket.email || "Not provided"}
                  </span>
                </div>
              </div>
              {ticket.userUid && (
                <div>
                  <Label className="text-xs font-medium text-gray-500">
                    Customer UID
                  </Label>
                  <div className="mt-1 break-all text-sm text-gray-900">
                    {ticket.userUid}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Created
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {formatDateTime(ticket.createdAt)}
                  </span>
                </div>
              </div>
              {ticket.updatedAt && (
                <div>
                  <Label className="text-xs font-medium text-gray-500">
                    Last Updated
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {formatDateTime(ticket.updatedAt)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {(ticket.issueType || ticket.pageContext || ticket.taskId || ticket.paymentId || ticket.refundId || ticket.source || ticket.platform) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.issueType && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Category</Label>
                    <div className="mt-1 text-sm capitalize text-gray-900">
                      {ticket.issueType}
                    </div>
                  </div>
                )}
                {ticket.pageContext && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Reported from</Label>
                    <div className="mt-1 text-sm text-gray-900">{ticket.pageContext}</div>
                  </div>
                )}
                {ticket.taskId && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Work ID</Label>
                    <div className="mt-1 break-all text-sm text-gray-900">{ticket.taskId}</div>
                  </div>
                )}
                {ticket.paymentId && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Payment ID</Label>
                    <div className="mt-1 break-all text-sm text-gray-900">{ticket.paymentId}</div>
                  </div>
                )}
                {ticket.refundId && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Refund ID</Label>
                    <div className="mt-1 break-all text-sm text-gray-900">{ticket.refundId}</div>
                  </div>
                )}
                {ticket.platform && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Platform</Label>
                    <div className="mt-1 text-sm capitalize text-gray-900">{ticket.platform}</div>
                  </div>
                )}
                {ticket.source && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Source</Label>
                    <div className="mt-1 text-sm text-gray-900">
                      {ticket.source === "extrahand-mobile-app"
                        ? "Customer App"
                        : ticket.source}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* System Information */}
          {(ticket.ipAddress || ticket.userAgent) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.ipAddress && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">
                      IP Address
                    </Label>
                    <div className="mt-1 text-sm text-gray-900">
                      {ticket.ipAddress}
                    </div>
                  </div>
                )}
                {ticket.userAgent && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">
                      User Agent
                    </Label>
                    <div className="mt-1 text-xs text-gray-600 break-words">
                      {ticket.userAgent}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog({ ...statusDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this ticket as "
              {statusDialog.status}"?
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
