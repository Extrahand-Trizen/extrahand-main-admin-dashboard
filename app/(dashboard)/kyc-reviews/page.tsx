"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, ExternalLink, ImageIcon, Search, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
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
  listKycReviews,
  rejectKycReview,
  claimKycReview,
  getKycReviewDocuments,
} from "@/lib/api/kyc-reviews";

const reviewStatusLabels: Record<KycReviewStatus | "failed", string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  failed: "Failed",
};

const reviewStatusClasses: Record<KycReviewStatus | "failed", string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

function KycImage({ url, label }: { url: string; label: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative h-72 w-full bg-gray-50 flex items-center justify-center rounded-b-lg overflow-hidden">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      )}
      {error ? (
        <div className="flex h-72 w-full flex-col items-center justify-center gap-2 bg-gray-100 text-sm text-gray-400">
          <ImageIcon className="h-8 w-8 opacity-40" />
          <p>Image unavailable — click to open in new tab</p>
        </div>
      ) : (
        <img
          src={url}
          alt={label}
          className={`h-72 w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

function getDisplayReviewStatus(row: KycReviewRow): KycReviewStatus | "failed" {
  if (row.reviewStatus === "rejected") return "rejected";
  if (row.isAadhaarVerified) return "accepted";
  const aadhaarStatus = String(row.aadhaar || "").toLowerCase();
  if (/(failed|failure|rejected|not verified|not_verified)/.test(aadhaarStatus)) {
    return "failed";
  }
  if (row.failureReason && row.reviewStatus !== "accepted" && !row.isAadhaarVerified) {
    return "failed";
  }
  return row.reviewStatus || "pending";
}

const followUpLabels: Record<KycFollowUpStatus, string> = {
  none: "-",
  follow_up: "Follow up",
  not_interested: "Not interested",
  followup_uploaded: "Follow-up uploaded",
};

function isOperationsRole(role?: string | null) {
  return ["operations_admin", "operation_admin", "operations"].includes(role || "");
}

function isAllReviewsRole(role?: string | null, isSuperAdmin?: boolean) {
  return Boolean(isSuperAdmin || role === "platform_admin");
}

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
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [followUpStatus, setFollowUpStatus] =
    useState<KycFollowUpStatus>("none");
  const [followUpDate, setFollowUpDate] = useState("");

  const { data: docsRes, isLoading: loadingDocs } = useQuery({
    queryKey: ["kyc-review-documents", row?.userId, row?.sessionId, row?.verificationId],
    queryFn: () => getKycReviewDocuments(row!.userId, row!.sessionId || "", row!.verificationId || ""),
    enabled: open && !!row,
    staleTime: 5 * 60 * 1000, // Cache URL strings for 5 minutes so browser can cache image files
    gcTime: 10 * 60 * 1000,
  });
  const documents = docsRes?.data || [];

  useEffect(() => {
    if (!open) {
      setConfirmAccept(false);
      setReason("");
      setFollowUpDate("");
      setFollowUpStatus("none");
    }
  }, [open, row?.userId]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["kyc-reviews"] });

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
  const canReject = !isVerified && row?.reviewStatus !== "accepted";
  const canAccept = !isVerified && followUpStatus !== "follow_up";

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
              {/* Show "Uploaded by" for manual uploads, "Failure reason" otherwise */}
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
              {loadingDocs ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-72 w-full animate-pulse bg-gray-100" />
                  <Skeleton className="h-72 w-full animate-pulse bg-gray-100" />
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                  No Aadhaar images found for this KYC session.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {documents.map((document) => (
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
                      <KycImage url={document.url} label={document.label} />
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
                <Label>Rejected stage</Label>
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
                    <SelectItem value="follow_up">Follow up</SelectItem>
                    <SelectItem value="not_interested">Not interested</SelectItem>
                    <SelectItem value="followup_uploaded">Follow-up uploaded</SelectItem>
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
                <Label>Reject note</Label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Add reason or internal note..."
                  className="min-h-[72px]"
                />
              </div>
            </>
            ) : null}

            {canAccept && confirmAccept ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                By accepting, you confirm that the Aadhaar photos match the user and meet
                ExtraHand verification standards. This will mark the user as Aadhaar verified
                and close this review.
              </div>
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
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          ) : null}
          <Button
            onClick={() => {
              if (!confirmAccept) {
                setConfirmAccept(true);
                return;
              }
              acceptMutation.mutate();
            }}
            disabled={loading || !row || !canAccept}
          >
            <Check className="mr-2 h-4 w-4" />
            {isVerified ? "Already verified" : confirmAccept ? "Confirm Accept" : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function KycReviewsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const searchParams = useSearchParams();
  const reviewUserId = searchParams.get("userId");
  const [search, setSearch] = useState("");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [followUpStatus, setFollowUpStatus] = useState("all");
  const [claimStatus, setClaimStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedRow, setSelectedRow] = useState<KycReviewRow | null>(null);

  const allowed = isAllReviewsRole(user?.role, isSuperAdmin) || isOperationsRole(user?.role);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, reviewStatus, followUpStatus, claimStatus, sortOrder]);

  const { data, isLoading } = useQuery({
    queryKey: ["kyc-reviews", search, reviewStatus, followUpStatus, claimStatus, sortOrder, page, limit],
    queryFn: () => listKycReviews({ search, reviewStatus, followUpStatus, claimStatus, includeVerified: true, sortOrder, page, limit }),
    enabled: allowed,
    retry: false,
  });

  const rows = useMemo(() => data?.data || [], [data]);
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 };

  useEffect(() => {
    if (!reviewUserId || isLoading || rows.length === 0) return;
    const match = rows.find((row) => row.userId === reviewUserId);
    if (match) {
      setSelectedRow(match);
    }
  }, [reviewUserId, rows, isLoading]);

  if (!allowed) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">
          KYC Reviews is available only for operations admins and super admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">KYC Reviews</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review Aadhaar verification photos and update follow-up stages
        </p>
      </div>

      <div className={`grid gap-3 ${isSuperAdmin ? "lg:grid-cols-[1fr_160px_160px_160px_140px]" : "lg:grid-cols-[1fr_180px_200px_160px]"}`}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone, Aadhaar status..."
            className="h-11 pl-9"
          />
        </div>
        <Select value={reviewStatus} onValueChange={setReviewStatus}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Review status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={followUpStatus} onValueChange={setFollowUpStatus}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Follow-up status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Follow-ups</SelectItem>
            <SelectItem value="follow_up">Follow up</SelectItem>
            <SelectItem value="not_interested">Not interested</SelectItem>
            <SelectItem value="followup_uploaded">Follow-up uploaded</SelectItem>
          </SelectContent>
        </Select>
        {isSuperAdmin && (
          <Select value={claimStatus} onValueChange={setClaimStatus}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Claim status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Claims</SelectItem>
              <SelectItem value="claimed">Claimed</SelectItem>
              <SelectItem value="unclaimed">Unclaimed</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as "latest" | "oldest")}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Sort order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Aadhaar Review List</CardTitle>
          <Badge variant="secondary">
            {pagination.total} {pagination.total === 1 ? "review" : "reviews"}
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
                      <TableHead>Aadhaar</TableHead>
                      <TableHead>Failure reason / Uploaded by</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Follow-up status</TableHead>
                      {isSuperAdmin && <TableHead>Claimed by</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const displayReviewStatus = getDisplayReviewStatus(row);
                      return (
                      <TableRow
                        key={`${row.notificationId}-${row.userId}`}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => router.push(`/users/${encodeURIComponent(row.userId)}`)}
                      >
                        <TableCell>
                          <div className="font-medium text-gray-900">{row.userName}</div>
                          <div className="text-xs text-gray-500">{row.userPhone || row.userEmail || row.userId}</div>
                        </TableCell>
                        <TableCell>{row.aadhaar || "-"}</TableCell>
                        <TableCell className="max-w-[240px] whitespace-normal">
                          {row.isManualUpload ? (
                            <div>
                              <span className="text-xs text-indigo-600 font-medium">
                                {row.uploadedBy?.name || "Admin"}
                              </span>
                              {row.uploadedBy?.email && (
                                <p className="text-xs text-gray-400 truncate">
                                  {row.uploadedBy.email}
                                </p>
                              )}
                            </div>
                          ) : (
                            row.failureReason || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {row.isManualUpload
                            ? (row.uploadedAt ? formatDate(row.uploadedAt) : "-")
                            : (row.failedOn ? formatDate(row.failedOn) : "-")}
                        </TableCell>
                        <TableCell>
                          {row.followUpStatus === "follow_up" && row.followUpDate ? (
                            <span className="text-blue-700">
                              {followUpLabels[row.followUpStatus]} - {formatDate(row.followUpDate)}
                            </span>
                          ) : (
                            followUpLabels[row.followUpStatus]
                          )}
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            {row.claimedBy ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">
                                  {row.claimedBy.userId === user?.userId ? "You" : row.claimedBy.name}
                                </span>
                                <span className="text-xs text-gray-400">{row.claimedBy.email}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Unclaimed</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <span
                            className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${reviewStatusClasses[displayReviewStatus]}`}
                          >
                            {reviewStatusLabels[displayReviewStatus]}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {isSuperAdmin ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRow(row);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Review
                            </Button>
                          ) : !row.claimedBy ? (
                            isOperationsRole(user?.role) ? (
                              <Button
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await claimKycReview(row.userId, row.sessionId);
                                    toast.success("KYC review claimed successfully");
                                    queryClient.invalidateQueries({ queryKey: ["kyc-reviews"] });
                                  } catch (error: any) {
                                    toast.error(error.message || "Failed to claim review");
                                  }
                                }}
                              >
                                Claim
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Unclaimed</span>
                            )
                          ) : row.claimedBy.userId === user?.userId ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link href="/kyc-reviews/my-claims">
                                My Claims →
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-500 font-medium">
                              Claimed by {row.claimedBy.name}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Rows per page</p>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => {
                      setLimit(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={limit.toString()} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, pagination.total)} of{" "}
                    {pagination.total} reviews
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
                    <div className="text-sm text-gray-600 px-2 font-medium">
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
              </div>
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
