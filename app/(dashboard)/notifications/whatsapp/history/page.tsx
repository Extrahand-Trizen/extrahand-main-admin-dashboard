"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, History, Loader2, RefreshCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatDateTime } from "@/lib/utils";
import {
  listWhatsAppCampaignHistory,
  listWhatsAppCampaignRecipients,
  type WhatsAppApplication,
  type WhatsAppCampaignHistoryItem,
} from "@/lib/api/whatsapp-notifications";

const PAGE_SIZE = 20;
const HISTORY_QUERY_KEY = ["whatsapp-campaign-history"];

function appName(app: WhatsAppApplication): string {
  if (app === "customer_app") return "Customer App";
  if (app === "helper_app") return "Partner App";
  return "Seller App";
}

function campaignStatus(status: WhatsAppCampaignHistoryItem["status"]) {
  if (status === "preparing") return { label: "Preparing", variant: "warning" as const };
  if (status === "sending") return { label: "Sending", variant: "warning" as const };
  if (status === "sent") return { label: "Queued", variant: "success" as const };
  if (status === "failed") return { label: "Failed", variant: "destructive" as const };
  return { label: "Completed with errors", variant: "secondary" as const };
}

export default function WhatsAppNotificationHistoryPage() {
  const router = useRouter();
  const { isSuperAdmin, user, loading: authLoading } = useAuth();
  const isOperationsAdmin = ["operations_admin", "operation_admin", "operations"].includes(user?.role || "");
  const canAccess = isSuperAdmin || isOperationsAdmin;
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WhatsAppCampaignHistoryItem | null>(null);
  const [recipientPage, setRecipientPage] = useState(1);

  const historyQuery = useQuery({
    queryKey: [...HISTORY_QUERY_KEY, page],
    queryFn: () => listWhatsAppCampaignHistory({ page, limit: PAGE_SIZE }),
    enabled: canAccess && !authLoading,
    refetchInterval: (query) =>
      query.state.data?.data?.some((campaign) => campaign.status === "sending" || campaign.status === "preparing") ? 10000 : false,
  });
  const recipientsQuery = useQuery({
    queryKey: ["whatsapp-campaign-recipients", selected?.id, recipientPage],
    queryFn: () =>
      listWhatsAppCampaignRecipients({
        campaignId: selected!.id,
        page: recipientPage,
        limit: 50,
      }),
    enabled: canAccess && !authLoading && Boolean(selected),
  });

  if (!authLoading && !canAccess) {
    router.replace("/dashboard");
    return null;
  }
  if (authLoading || !canAccess) {
    return <div className="p-8 text-sm text-gray-500">Checking access...</div>;
  }

  const rows = historyQuery.data?.data || [];
  const total = historyQuery.data?.pagination?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const recipientRows = recipientsQuery.data?.data || [];
  const recipientTotal = recipientsQuery.data?.pagination?.total || 0;
  const recipientTotalPages = Math.max(1, Math.ceil(recipientTotal / 50));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Notification History</h1>
          <p className="mt-2 text-sm text-gray-600">
            Campaigns sent through approved Trizen Dialog templates, including recipient-level results.
          </p>
        </div>
        <Button asChild>
          <Link href="/notifications/whatsapp">
            <Send />
            Send WhatsApp notification
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-amber-600" />
              Sent campaigns
            </CardTitle>
            <CardDescription>{total.toLocaleString("en-IN")} campaign{total === 1 ? "" : "s"}</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => historyQuery.refetch()}
            disabled={historyQuery.isFetching}
            aria-label="Refresh WhatsApp history"
          >
            <RefreshCw className={historyQuery.isFetching ? "animate-spin" : undefined} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Partner filters</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading WhatsApp history...
                    </TableCell>
                  </TableRow>
                ) : historyQuery.isError || !historyQuery.data ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-red-600">
                      Couldn&apos;t load WhatsApp campaign history.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-500">
                      No WhatsApp campaigns have been sent yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((campaign) => {
                    const status = campaignStatus(campaign.status);
                    const counts = campaign.recipientStatuses;
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell className="whitespace-nowrap">{appName(campaign.app)}</TableCell>
                        <TableCell className="max-w-[240px]">
                          <p className="truncate font-medium text-gray-900" title={campaign.templateName}>
                            {campaign.templateName}
                          </p>
                          <p className="text-xs text-gray-500">{campaign.templateCategory} · {campaign.templateLanguage}</p>
                        </TableCell>
                        <TableCell className="max-w-[260px] text-xs text-gray-600">
                          {campaign.app === "helper_app"
                            ? `${campaign.categories.join(", ")} · ${campaign.cities.join(", ")}`
                            : campaign.app === "customer_app" && campaign.cities.length > 0
                              ? campaign.cities.join(", ")
                              : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {campaign.recipientCount.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(campaign.createdAt)}
                        </TableCell>
                        <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="text-xs text-gray-600">
                            <span className="text-green-700">{(counts.queued || 0).toLocaleString("en-IN")} queued</span>
                            {" · "}
                            <span className="text-red-700">{(counts.failed || 0).toLocaleString("en-IN")} failed</span>
                            {" · "}
                            <span>{(counts.suppressed || 0).toLocaleString("en-IN")} suppressed</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-1"
                            onClick={() => {
                              setSelected(campaign);
                              setRecipientPage(1);
                            }}
                          >
                            <Eye />
                            Details
                          </Button>
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
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                  Previous
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Campaign recipients</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.templateName} · ${appName(selected.app)} · ${selected.recipientCount.toLocaleString("en-IN")} recipients`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient UID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Message ID</TableHead>
                  <TableHead>Last error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipientsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500">Loading recipients...</TableCell></TableRow>
                ) : recipientsQuery.isError ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-red-600">Couldn&apos;t load recipient results.</TableCell></TableRow>
                ) : recipientRows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-gray-500">No recipient results.</TableCell></TableRow>
                ) : recipientRows.map((recipient) => (
                  <TableRow key={recipient.uid}>
                    <TableCell className="font-mono text-xs">{recipient.uid}</TableCell>
                    <TableCell><Badge variant={recipient.status === "queued" ? "success" : recipient.status === "failed" ? "destructive" : recipient.status === "suppressed" ? "secondary" : "warning"}>{recipient.status}</Badge></TableCell>
                    <TableCell>{recipient.attemptCount}</TableCell>
                    <TableCell className="max-w-[140px] truncate font-mono text-xs">{recipient.providerEventId || "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-red-700" title={recipient.lastError || ""}>{recipient.lastError || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {recipientTotal > 50 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Page {recipientPage} of {recipientTotalPages}</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={recipientPage === 1} onClick={() => setRecipientPage((value) => value - 1)}>Previous</Button>
                <Button type="button" variant="outline" size="sm" disabled={recipientPage >= recipientTotalPages} onClick={() => setRecipientPage((value) => value + 1)}>Next</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
