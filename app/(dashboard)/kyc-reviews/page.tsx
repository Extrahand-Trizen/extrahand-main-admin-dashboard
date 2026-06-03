"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, ExternalLink, ImageIcon, Search, XCircle } from "lucide-react";
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
} from "@/lib/api/kyc-reviews";

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
  const [followUpStatus, setFollowUpStatus] =
    useState<Exclude<KycFollowUpStatus, "none">>("follow_up");
  const [followUpDate, setFollowUpDate] = useState("");

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
              <div>
                <p className="text-gray-500">Failure reason</p>
                <p className="font-medium text-gray-900">{row.failureReason || "-"}</p>
              </div>
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
            <div className="grid gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-[220px_180px_1fr]">
              <div className="space-y-2">
                <Label>Rejected stage</Label>
                <Select
                  value={followUpStatus}
                  onValueChange={(value) =>
                    setFollowUpStatus(value as Exclude<KycFollowUpStatus, "none">)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow_up">Follow up</SelectItem>
                    <SelectItem value="not_interested">Not interested</SelectItem>
                    <SelectItem value="followup_uploaded">Follow-up uploaded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Follow-up date</Label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(event) => setFollowUpDate(event.target.value)}
                  disabled={followUpStatus !== "follow_up"}
                />
              </div>
              <div className="space-y-2">
                <Label>Reject note</Label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Add reason or internal note..."
                  className="min-h-[72px]"
                />
              </div>
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

export default function KycReviewsPage() {
  const { user, isSuperAdmin } = useAuth();
  const searchParams = useSearchParams();
  const reviewUserId = searchParams.get("userId");
  const [search, setSearch] = useState("");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [followUpStatus, setFollowUpStatus] = useState("all");
  const [selectedRow, setSelectedRow] = useState<KycReviewRow | null>(null);

  const allowed = isAllReviewsRole(user?.role, isSuperAdmin) || isOperationsRole(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ["kyc-reviews", search, reviewStatus, followUpStatus],
    queryFn: () => listKycReviews({ search, reviewStatus, followUpStatus }),
    enabled: allowed,
    retry: false,
  });

  const rows = useMemo(() => data?.data || [], [data]);

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

      <div className="grid gap-3 lg:grid-cols-[1fr_220px_240px]">
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
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Aadhaar Review List</CardTitle>
          <Badge variant="secondary">
            {rows.length} {rows.length === 1 ? "review" : "reviews"}
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Aadhaar</TableHead>
                    <TableHead>Failure reason</TableHead>
                    <TableHead>Failed on</TableHead>
                    <TableHead>Follow-up status</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.notificationId}-${row.userId}`}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{row.userName}</div>
                        <div className="text-xs text-gray-500">{row.userPhone || row.userEmail || row.userId}</div>
                      </TableCell>
                      <TableCell>{row.aadhaar || "-"}</TableCell>
                      <TableCell className="max-w-[260px] whitespace-normal">
                        {row.failureReason || "-"}
                      </TableCell>
                      <TableCell>{row.failedOn ? formatDate(row.failedOn) : "-"}</TableCell>
                      <TableCell>
                        {row.followUpStatus === "follow_up" && row.followUpDate ? (
                          <span className="text-blue-700">
                            {followUpLabels[row.followUpStatus]} - {formatDate(row.followUpDate)}
                          </span>
                        ) : (
                          followUpLabels[row.followUpStatus]
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-normal">
                        {row.assignedTo.length > 0
                          ? row.assignedTo.map((admin) => admin.name).join(", ")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${reviewStatusClasses[row.reviewStatus]}`}
                        >
                          {reviewStatusLabels[row.reviewStatus]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRow(row)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
