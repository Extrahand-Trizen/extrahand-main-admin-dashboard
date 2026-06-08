"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ExternalLink,
  ImageIcon,
  Search,
  XCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  acceptKycReview,
  KycFollowUpStatus,
  KycReviewRow,
  KycReviewStatus,
  rejectKycReview,
  updateKycFollowUp,
} from "@/lib/api/kyc-reviews";
import { listAadhaarFollowUps } from "@/lib/api/aadhaar-followups";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const reviewStatusLabels: Record<KycReviewStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

const reviewStatusClasses: Record<KycReviewStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const followUpLabels: Record<KycFollowUpStatus, string> = {
  none: "Pending",
  follow_up: "Contacted",
  not_interested: "Not Lifted",
  followup_uploaded: "Uploaded",
};

const followUpFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "uploaded", label: "Uploaded" },
  { value: "not_lifted", label: "Not Lifted" },
  { value: "refused", label: "Not Interested" },
] as const;

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

function formatFollowUpStatusLabel(row: KycReviewRow) {
  if (row.followUpStatus && row.followUpStatus !== "none") {
    return followUpLabels[row.followUpStatus] || "-";
  }
  if (row.reviewStatus === "rejected") return "Not Interested";
  return "Pending";
}

function isOperationsRole(role?: string | null) {
  return ["operations_admin", "operation_admin", "operations"].includes(role || "");
}

function isAllReviewsRole(role?: string | null, isSuperAdmin?: boolean) {
  return Boolean(isSuperAdmin || role === "platform_admin");
}

// ─── Pagination Component ────────────────────────────────────────────────────

function Pagination({
  page,
  pages,
  total,
  limit,
  onPage,
  onLimit,
}: {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* left: count + page size */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>
          {total === 0 ? "No results" : `${start}–${end} of ${total}`}
        </span>
        <span className="hidden sm:inline text-slate-300">|</span>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Rows per page</span>
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              onLimit(Number(v));
              onPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[68px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* right: nav buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPage(1)}
          disabled={page === 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* page number pills */}
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          let p: number;
          if (pages <= 5) {
            p = i + 1;
          } else if (page <= 3) {
            p = i + 1;
          } else if (page >= pages - 2) {
            p = pages - 4 + i;
          } else {
            p = page - 2 + i;
          }
          return (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPage(page + 1)}
          disabled={page === pages || pages === 0}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPage(pages)}
          disabled={page === pages || pages === 0}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Review Dialog ───────────────────────────────────────────────────────────

function ReviewDialog({
  row,
  open,
  onOpenChange,
}: {
  row: KycReviewRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [followUpStatus, setFollowUpStatus] =
    useState<KycFollowUpStatus>("none");
  const [followUpDate, setFollowUpDate] = useState("");

  useEffect(() => {
    if (!open || !row) {
      setReason("");
      setFollowUpStatus("none");
      setFollowUpDate("");
      return;
    }

    setFollowUpStatus(row.followUpStatus || "none");
    setFollowUpDate(row.followUpDate || "");
    setReason("");
  }, [open, row?.userId]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["aadhaar-followups"] });

  const acceptMutation = useMutation({
    mutationFn: () => {
      if (!row) throw new Error("No review selected");
      return acceptKycReview(row);
    },
    onSuccess: () => {
      toast.success("Aadhaar accepted");
      invalidate();
      onOpenChange(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to accept Aadhaar"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!row) throw new Error("No review selected");
      if (followUpStatus === "follow_up" && !followUpDate) {
        throw new Error("Follow-up date is required");
      }
      return rejectKycReview({
        ...row,
        reason,
        followUpStatus,
        followUpDate,
      });
    },
    onSuccess: () => {
      toast.success("Aadhaar rejected");
      invalidate();
      onOpenChange(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to reject Aadhaar"),
  });

  const loading = acceptMutation.isPending || rejectMutation.isPending;
  const isVerified = Boolean(row?.isAadhaarVerified);
  const effectiveReviewStatus: KycReviewStatus = row?.isAadhaarVerified
    ? "accepted"
    : row?.reviewStatus || "pending";
  const canReject = !isVerified && row?.reviewStatus !== "accepted";
  const canAccept = !isVerified;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aadhaar Review</DialogTitle>
          <DialogDescription>
            {row?.userName || "User"} {row?.userPhone ? `- ${row.userPhone}` : ""}
          </DialogDescription>
        </DialogHeader>

        {row && (
          <div className="space-y-5">
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-gray-500">Aadhaar</p>
                <p className="font-medium text-gray-900">{row.aadhaar || "-"}</p>
              </div>
              {row.isManualUpload ? (
                <div>
                  <p className="text-gray-500">Uploaded by</p>
                  <p className="font-medium text-gray-900">
                    {row.uploadedBy?.name || "-"}
                  </p>
                  {row.uploadedBy?.email && (
                    <p className="text-xs text-gray-400">{row.uploadedBy.email}</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-500">Failure reason</p>
                  <p className="font-medium text-gray-900">{row.failureReason || "-"}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Last updated</p>
                <p className="font-medium text-gray-900">
                  {row.aadhaarUpdatedAt ? formatDateTime(row.aadhaarUpdatedAt) : "-"}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Aadhaar photos</h3>
                <Button asChild variant="outline" size="sm">
                  <Link href={row.profileUrl}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open profile
                  </Link>
                </Button>
              </div>
              {row.documents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                  No Aadhaar images found for this KYC session.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {row.documents.map((document) => (
                    <a
                      key={document.url}
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
                        <span className="text-sm font-medium text-gray-700">{document.label}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </span>
                      </div>
                      <div className="relative">
                        <img
                          src={document.url}
                          alt={document.label}
                          className="h-72 w-full object-contain"
                          onError={(e) => {
                            const img = e.currentTarget;
                            img.style.display = "none";
                            const placeholder = img.nextElementSibling as HTMLElement | null;
                            if (placeholder) placeholder.style.display = "flex";
                          }}
                        />
                        <div
                          className="hidden h-72 w-full flex-col items-center justify-center gap-2 bg-gray-100 text-sm text-gray-400"
                          aria-label="Image failed to load"
                        >
                          <ImageIcon className="h-8 w-8 opacity-40" />
                          <p>Image unavailable — click to open in new tab</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {isVerified ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Aadhaar is already verified for this user. Reject is not allowed.
              </div>
            ) : null}

            {canReject ? (
            <>
              <div className="space-y-2">
                <Label>Follow-up status</Label>
                <Select
                  value={followUpStatus}
                  onValueChange={(value) =>
                    setFollowUpStatus(value as KycFollowUpStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pending</SelectItem>
                    <SelectItem value="follow_up">Contacted</SelectItem>
                    <SelectItem value="not_interested">Not Lifted</SelectItem>
                    <SelectItem value="followup_uploaded">Uploaded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {followUpStatus === "follow_up" && (
                <div className="space-y-2">
                  <Label>Follow-up date</Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(event) => setFollowUpDate(event.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Add reason or internal note..."
                  className="min-h-[72px]"
                />
              </div>
            </>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          {canReject ? (
          <Button
            variant="outline"
            onClick={() => rejectMutation.mutate()}
            disabled={loading || !row}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Save
          </Button>
          ) : null}
          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={loading || !row || !canAccept}
          >
            <Check className="mr-2 h-4 w-4" />
            {isVerified ? "Already verified" : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AadhaarFollowUpsPage() {
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();
  const searchParams = useSearchParams();
  const reviewUserId = searchParams.get("userId");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedRow, setSelectedRow] = useState<KycReviewRow | null>(null);

  const queryClient = useQueryClient();

  // Reset to page 1 when filters change
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };
  const handleSortOrder = (v: "newest" | "oldest") => { setSortOrder(v); setPage(1); };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const updateStatusMutation = useMutation({
    mutationFn: (variables: {
      row: KycReviewRow;
      followUpStatus: KycFollowUpStatus;
      reviewStatus: KycReviewStatus;
    }) =>
      updateKycFollowUp({
        userId: variables.row.userId,
        sessionId: variables.row.sessionId,
        verificationId: variables.row.verificationId,
        followUpStatus: variables.followUpStatus,
        reviewStatus: variables.reviewStatus,
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["aadhaar-followups"] });
      const previousData = queryClient.getQueriesData({ queryKey: ["aadhaar-followups"] });

      queryClient.setQueriesData(
        { queryKey: ["aadhaar-followups"] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((r: KycReviewRow) => {
              if (r.userId !== variables.row.userId) return r;
              return {
                ...r,
                followUpStatus: variables.followUpStatus,
                reviewStatus: variables.reviewStatus,
              };
            }),
          };
        }
      );

      return { previousData };
    },
    onSuccess: (_, variables) => {
      let label = "Pending";
      if (variables.followUpStatus !== "none") {
        label = followUpLabels[variables.followUpStatus];
      } else if (variables.reviewStatus === "rejected") {
        label = "Not Interested";
      }
      toast.success(`Follow-up status updated to ${label}`);
    },
    onError: (error: any, _variables, context: any) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey as any, data);
        }
      }
      toast.error(error.message || "Failed to update follow-up status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["aadhaar-followups"] });
    },
  });

  const allowed = isAllReviewsRole(user?.role, isSuperAdmin) || isOperationsRole(user?.role);

  // Build server-side query params
  const kycReviewQuery = useMemo(() => {
    const params: {
      search?: string;
      reviewStatus?: string;
      followUpStatus?: string;
      page: number;
      limit: number;
      sortOrder: "newest" | "oldest";
      assignedTo?: string;
    } = { page, limit, sortOrder };

    if (search) params.search = search;

    switch (statusFilter) {
      case "pending":
        params.reviewStatus = "pending";
        params.followUpStatus = "none";
        break;
      case "contacted":
        params.followUpStatus = "follow_up";
        break;
      case "uploaded":
        params.followUpStatus = "followup_uploaded";
        break;
      case "not_lifted":
        params.followUpStatus = "not_interested";
        break;
      case "refused":
        params.reviewStatus = "rejected";
        break;
      default:
        break;
    }

    return params;
  }, [search, statusFilter, page, limit, sortOrder]);

  const { data, isLoading } = useQuery({
    queryKey: ["aadhaar-followups", search, statusFilter, page, limit, sortOrder],
    queryFn: () => listAadhaarFollowUps(kycReviewQuery),
    enabled: allowed,
    retry: false,
    placeholderData: (prev) => prev, // keep previous page data while fetching next
  });

  const rows = useMemo(() => data?.data || [], [data]);
  const pagination = data?.pagination;

  // Collect assignee options from ALL loaded rows for the filter dropdown


  useEffect(() => {
    if (!reviewUserId || isLoading || rows.length === 0) return;
    const match = rows.find((row) => row.userId === reviewUserId);
    if (match) setSelectedRow(match);
  }, [reviewUserId, rows, isLoading]);

  if (!allowed) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">
          Aadhaar follow-ups are available only for operations admins and super admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Aadhaar Follow-ups</h1>
        <p className="mt-2 text-sm text-gray-600">
          Helpers registered but Aadhaar not verified. Operations admins see only their assigned users; super admins see all follow-up cases.
        </p>
      </div>

      {/* Filters */}
      <div
        className={
          isSuperAdmin
            ? "grid gap-3 lg:grid-cols-[1fr_220px_220px_220px]"
            : "grid gap-3 lg:grid-cols-[1fr_220px_220px]"
        }
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search by name, phone, assigned admin..."
            className="h-11 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {followUpFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={handleSortOrder}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Aadhaar Follow-up Queue</CardTitle>
          <Badge variant="secondary">
            {pagination ? (
              <>
                {pagination.total} {pagination.total === 1 ? "helper" : "helpers"}
              </>
            ) : (
              <>{rows.length} {rows.length === 1 ? "review" : "reviews"}</>
            )}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No KYC reviews found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Registered on</TableHead>
                      <TableHead>Assigned to</TableHead>
                      <TableHead>Follow-up status</TableHead>
                      <TableHead>Follow-up date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={`${row.notificationId}-${row.userId}`}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => router.push(`/users/${encodeURIComponent(row.userId)}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 ring-1 ring-slate-100">
                              <AvatarFallback>
                                {row.userName?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {row.userName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {row.userEmail || row.userPhone || row.userId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{row.userPhone || "-"}</TableCell>
                        <TableCell>{row.registeredAt ? formatDate(row.registeredAt) : "-"}</TableCell>
                        <TableCell className="max-w-[220px] whitespace-normal">
                          {row.assignedTo.length > 0
                            ? row.assignedTo.map((admin) => admin.name).join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                disabled={updateStatusMutation.isPending}
                                className="inline-flex items-center gap-1.5 text-left text-sm font-semibold text-slate-900 hover:text-slate-700 focus:outline-none transition-colors duration-150 py-1 px-2 hover:bg-slate-100 rounded-md border border-transparent hover:border-slate-200"
                              >
                                <span>{formatFollowUpStatusLabel(row)}</span>
                                {updateStatusMutation.isPending &&
                                updateStatusMutation.variables?.row.userId === row.userId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                )}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="w-40 bg-white border border-slate-200 shadow-md rounded-md p-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({
                                    row,
                                    followUpStatus: "none",
                                    reviewStatus: "pending",
                                  });
                                }}
                                className="flex items-center px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer rounded"
                              >
                                Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({
                                    row,
                                    followUpStatus: "follow_up",
                                    reviewStatus: "rejected",
                                  });
                                }}
                                className="flex items-center px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer rounded"
                              >
                                Contacted
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({
                                    row,
                                    followUpStatus: "followup_uploaded",
                                    reviewStatus: "rejected",
                                  });
                                }}
                                className="flex items-center px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer rounded"
                              >
                                Uploaded
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({
                                    row,
                                    followUpStatus: "not_interested",
                                    reviewStatus: "rejected",
                                  });
                                }}
                                className="flex items-center px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer rounded"
                              >
                                Not Lifted
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({
                                    row,
                                    followUpStatus: "none",
                                    reviewStatus: "rejected",
                                  });
                                }}
                                className="flex items-center px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer rounded"
                              >
                                Not Interested
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>{row.followUpDate ? formatDate(row.followUpDate) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 0 && (
                <Pagination
                  page={pagination.page}
                  pages={pagination.pages}
                  total={pagination.total}
                  limit={limit}
                  onPage={setPage}
                  onLimit={(l) => { setLimit(l); setPage(1); }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ReviewDialog
        row={selectedRow}
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
      />
    </div>
  );
}
