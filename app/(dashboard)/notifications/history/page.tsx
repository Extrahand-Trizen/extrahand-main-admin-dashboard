"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Eye, Loader2, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatDateTime } from "@/lib/utils";
import { listUsers } from "@/lib/api/users";
import {
  BROADCAST_APP_OPTIONS,
  cancelNotificationBroadcast,
  listNotificationBroadcasts,
  type BroadcastApp,
  type NotificationBroadcast,
} from "@/lib/api/notifications";
import {
  APP_ICONS,
  NOTIFICATION_HISTORY_QUERY_KEY,
  STATUS_BADGES,
  appLabel,
  recipientCount,
  recipientSummary,
  toRecipient,
  type SelectedRecipient,
} from "@/components/notifications/shared";

const PAGE_SIZE = 20;
const RECIPIENT_PREVIEW_LIMIT = 50;

export default function NotificationHistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const canLoad = isSuperAdmin && !authLoading;

  const [historyApp, setHistoryApp] = useState<BroadcastApp | "all">("all");
  const [page, setPage] = useState(0);
  const [viewing, setViewing] = useState<NotificationBroadcast | null>(null);
  const [cancelTarget, setCancelTarget] = useState<NotificationBroadcast | null>(null);

  const historyQuery = useQuery({
    queryKey: [NOTIFICATION_HISTORY_QUERY_KEY, historyApp, page],
    queryFn: () => listNotificationBroadcasts({ app: historyApp, limit: PAGE_SIZE, skip: page * PAGE_SIZE }),
    enabled: canLoad,
    refetchInterval: (query) =>
      query.state.data?.data?.some((row) => row.status === "sending" || row.status === "scheduled") ? 10000 : false,
  });

  const viewingUserIds = viewing?.recipientType === "selected" ? viewing.userIds.slice(0, RECIPIENT_PREVIEW_LIMIT) : [];
  const viewingUsersQuery = useQuery({
    queryKey: ["notification-recipient-names", viewing?.id],
    queryFn: () => listUsers({ uids: viewingUserIds.join(","), limit: RECIPIENT_PREVIEW_LIMIT }),
    enabled: canLoad && viewingUserIds.length > 0,
  });
  const viewingUserIdSet = new Set(viewingUserIds);
  const viewingRecipients = (viewingUsersQuery.data?.data || [])
    .map(toRecipient)
    .filter((recipient): recipient is SelectedRecipient => recipient !== null && viewingUserIdSet.has(recipient.userId));

  const cancelMutation = useMutation({
    mutationFn: cancelNotificationBroadcast,
    onSuccess: () => {
      toast.success("Scheduled notification cancelled");
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_HISTORY_QUERY_KEY] });
    },
    onError: (error: Error) => {
      setCancelTarget(null);
      toast.error(error.message || "Failed to cancel notification");
    },
  });

  if (!authLoading && !isSuperAdmin) {
    router.replace("/dashboard");
    return null;
  }

  if (authLoading || !isSuperAdmin) {
    return <div className="p-8 text-sm text-gray-500">Checking access...</div>;
  }

  const rows = historyQuery.data?.data || [];
  const total = historyQuery.data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notification History</h1>
          <p className="mt-2 text-sm text-gray-600">
            Every notification sent or scheduled from the Operations Portal, with its delivery status.
          </p>
        </div>
        <Button asChild>
          <Link href="/notifications/send">
            <Send />
            Send notification
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-amber-600" />
              Sent &amp; Scheduled
            </CardTitle>
            <CardDescription>{total.toLocaleString("en-IN")} notification{total === 1 ? "" : "s"}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={historyApp}
              onValueChange={(value) => {
                setHistoryApp(value as BroadcastApp | "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-44" aria-label="Filter by app">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All apps</SelectItem>
                {BROADCAST_APP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => historyQuery.refetch()}
              disabled={historyQuery.isFetching}
              aria-label="Refresh history"
            >
              <RefreshCw className={historyQuery.isFetching ? "animate-spin" : undefined} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Recipient Count</TableHead>
                  <TableHead>Sent Date &amp; Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading notifications...
                    </TableCell>
                  </TableRow>
                ) : historyQuery.isError || !historyQuery.data ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-red-600">
                      Couldn&apos;t load notification history. Check that the notification service is reachable.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-500">
                      No notifications yet.{" "}
                      <Link href="/notifications/send" className="font-medium text-yellow-700 hover:underline">
                        Send the first one
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const Icon = APP_ICONS[row.app];
                    const badge = STATUS_BADGES[row.status];
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 text-sm">
                            {Icon && <Icon className="h-4 w-4 text-gray-400" />}
                            {appLabel(row.app)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate font-medium" title={row.title}>
                          {row.title}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate text-gray-600" title={row.message}>
                          {row.message}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div>{recipientCount(row).toLocaleString("en-IN")}</div>
                          <div className="text-xs text-gray-500">
                            {row.recipientType === "selected" ? "Selected users" : "All users"}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(row.sendAt)}
                          {row.status === "scheduled" && <div className="text-xs text-gray-500">Scheduled</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge?.variant}>{badge?.label || row.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setViewing(row)}>
                              <Eye />
                              View
                            </Button>
                            {row.status === "scheduled" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setCancelTarget(row)}
                              >
                                <X />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel scheduled */}
      <AlertDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && !cancelMutation.isPending && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel scheduled notification?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget
                ? `"${cancelTarget.title}" was scheduled for ${formatDateTime(cancelTarget.sendAt)} to ${recipientSummary(cancelTarget)} of the ${appLabel(cancelTarget.app)}. It will not be sent.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Keep scheduled</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
              }}
            >
              {cancelMutation.isPending && <Loader2 className="animate-spin" />}
              Cancel notification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details */}
      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.title}</DialogTitle>
                <DialogDescription>
                  {appLabel(viewing.app)} · {recipientSummary(viewing)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <p className="whitespace-pre-wrap text-gray-700">{viewing.message}</p>
                {viewing.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewing.imageUrl} alt="Notification image" className="max-h-48 rounded-md border object-cover" />
                )}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-gray-50 p-3">
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    <Badge variant={STATUS_BADGES[viewing.status]?.variant}>
                      {STATUS_BADGES[viewing.status]?.label || viewing.status}
                    </Badge>
                  </dd>
                  <dt className="text-gray-500">{viewing.status === "scheduled" ? "Scheduled for" : "Sent"}</dt>
                  <dd>{formatDateTime(viewing.sendAt)}</dd>
                  <dt className="text-gray-500">Recipients</dt>
                  <dd>{recipientCount(viewing).toLocaleString("en-IN")}</dd>
                  <dt className="text-gray-500">Push delivered</dt>
                  <dd>
                    {viewing.deliveredCount.toLocaleString("en-IN")} device{viewing.deliveredCount === 1 ? "" : "s"}
                    {viewing.failedCount > 0 && (
                      <span className="text-red-600"> · {viewing.failedCount.toLocaleString("en-IN")} failed</span>
                    )}
                  </dd>
                  <dt className="text-gray-500">Created by</dt>
                  <dd className="truncate">{viewing.createdBy || "—"}</dd>
                  <dt className="text-gray-500">Created</dt>
                  <dd>{formatDateTime(viewing.createdAt)}</dd>
                </dl>

                {viewing.recipientType === "selected" && (
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">Selected users</p>
                    {viewingUsersQuery.isLoading ? (
                      <p className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading users...
                      </p>
                    ) : viewingRecipients.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {viewingRecipients.map((recipient) => (
                          <span
                            key={recipient.userId}
                            className="rounded-full border bg-white px-3 py-1 text-xs text-gray-700"
                            title={recipient.contact}
                          >
                            {recipient.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">{viewing.userIds.length.toLocaleString("en-IN")} users</p>
                    )}
                    {viewing.userIds.length > RECIPIENT_PREVIEW_LIMIT && (
                      <p className="text-xs text-gray-500">
                        and {(viewing.userIds.length - RECIPIENT_PREVIEW_LIMIT).toLocaleString("en-IN")} more
                      </p>
                    )}
                  </div>
                )}

                {viewing.failureReason && (
                  <p className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{viewing.failureReason}</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
