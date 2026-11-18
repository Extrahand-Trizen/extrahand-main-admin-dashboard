"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUser } from "@/lib/api/users";
import { getPaymentRefund, listPaymentTransactions } from "@/lib/api/payments";
import { getTask, getTaskAssignmentHistory } from "@/lib/api/tasks";
import { usePermissions } from "@/lib/hooks/usePermissions";
import type { PaymentRefundDetails, PaymentTransaction, Task } from "@/types";

type Environment = "production" | "development";

function formatAmount(value?: string | number | null): string {
  if (value == null || value === "") return "Not available";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(amount)
    : "Not available";
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN");
}

function getCancellationReason(
  taskReason?: string | null,
  refundReason?: string | null,
): string | undefined {
  const genericReasons = new Set([
    "cancelled by customer",
    "canceled by customer",
    "cancelled by poster",
    "canceled by poster",
    "cancelled by helper",
    "canceled by helper",
    "cancelled by partner",
    "canceled by partner",
    "cancelled by performer",
    "canceled by performer",
    "customer cancelled",
    "customer canceled",
    "poster cancelled",
    "poster canceled",
    "no reason provided",
  ]);
  return [taskReason, refundReason]
    .map((reason) => reason?.trim())
    .find(
      (reason): reason is string =>
        reason !== undefined &&
        reason.length > 0 &&
        !genericReasons.has(reason.toLowerCase()),
    );
}

function getAssignedUid(...values: unknown[]): string {
  const unassignedValues = new Set([
    "",
    "pending_assignment",
    "not_assigned",
    "unassigned",
    "null",
    "undefined",
  ]);
  return (
    values
      .map((value) => String(value ?? "").trim())
      .find(
        (value) =>
          !unassignedValues.has(value.toLowerCase().replace(/[\s-]+/g, "_")),
      ) || ""
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-gray-900">
        {children == null || children === "" ? "Not recorded" : children}
      </dd>
    </div>
  );
}

export default function RefundDetailsPage() {
  const params = useParams<{ refundId: string }>();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();
  const refundId = params.refundId;
  const environment: Environment =
    searchParams.get("environment") === "development" ? "development" : "production";

  const refundQuery = useQuery({
    queryKey: ["payment-refund-details", refundId, environment],
    queryFn: () => getPaymentRefund(refundId, environment),
    enabled: Boolean(refundId) && hasPermission("payment.list"),
    retry: false,
  });
  const details = refundQuery.data?.data as PaymentRefundDetails | undefined;
  const refund = details?.refund;
  const taskId = refund?.taskId || refund?.escrow?.taskId || "";

  const taskQuery = useQuery({
    queryKey: ["refund-task", taskId],
    queryFn: () => getTask(taskId),
    enabled: Boolean(taskId) && hasPermission("task.view"),
    retry: false,
  });
  const task = taskQuery.data?.data as Task | undefined;

  const assignmentQuery = useQuery({
    queryKey: ["refund-task-assignment-history", taskId],
    queryFn: () => getTaskAssignmentHistory(taskId),
    enabled: Boolean(taskId) && hasPermission("task.view"),
    retry: false,
  });
  const assignment = assignmentQuery.data?.data;

  const transactionQuery = useQuery({
    queryKey: ["refund-task-transaction", taskId, environment],
    queryFn: () => listPaymentTransactions({ q: taskId, limit: 20, environment }),
    enabled: Boolean(taskId) && hasPermission("payment.list"),
    retry: false,
  });
  const transaction = transactionQuery.data?.data?.find(
    (row: PaymentTransaction) => String(row.taskId) === String(taskId)
  );

  const posterId =
    refund?.escrow?.posterUid ||
    task?.customerUid ||
    task?.customerId ||
    task?.CustomerId ||
    task?.requesterId ||
    "";
  const helperId = getAssignedUid(
    refund?.escrow?.performerUid,
    transaction?.performerUid,
    assignment?.helperUid,
    task?.dispatchProgress?.assignedPartnerUid,
    task?.assigneeUid,
    task?.partnerUid,
    task?.assigneeId,
    task?.partnerId,
  );
  const assignedByUid = assignment?.assignedByUid || "";

  const posterQuery = useQuery({
    queryKey: ["refund-task-poster", posterId],
    queryFn: () => getUser(posterId),
    enabled: Boolean(posterId) && hasPermission("user.view"),
    retry: false,
  });
  const helperQuery = useQuery({
    queryKey: ["refund-task-helper", helperId],
    queryFn: () => getUser(helperId),
    enabled: Boolean(helperId) && hasPermission("user.view"),
    retry: false,
  });
  const assignedByQuery = useQuery({
    queryKey: ["refund-task-assigned-by", assignedByUid],
    queryFn: () => getUser(assignedByUid),
    enabled:
      Boolean(assignedByUid) &&
      !["system", "partner_offer"].includes(assignedByUid) &&
      hasPermission("user.view"),
    retry: false,
  });
  const cancelledById = task?.cancelledById || "";
  const cancellationActorQuery = useQuery({
    queryKey: ["refund-cancellation-actor", cancelledById],
    queryFn: () => getUser(cancelledById),
    enabled:
      !refund?.cancelledBy &&
      Boolean(cancelledById) &&
      hasPermission("user.view"),
    retry: false,
  });

  if (!hasPermission("payment.list")) {
    return <div className="p-8 text-center text-gray-500">You do not have permission to view refunds.</div>;
  }

  const backHref = `/payments/refunds?environment=${environment}`;
  if (refundQuery.isLoading) {
    return (
      <div className="space-y-5" aria-label="Loading refund details">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-36 animate-pulse rounded-xl border bg-gray-100" />
        <div className="grid gap-5 lg:grid-cols-[1.55fr_0.85fr]">
          <div className="h-72 animate-pulse rounded-xl border bg-gray-100" />
          <div className="h-72 animate-pulse rounded-xl border bg-gray-100" />
        </div>
      </div>
    );
  }
  if (refundQuery.isError || !refund) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href={backHref}>
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />All refunds</Button>
        </Link>
        <Card className="border-red-200">
          <CardContent className="flex items-start gap-3 p-5">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-gray-900">Couldn’t load this refund</p>
              <p className="mt-1 text-sm text-gray-600">
                {refundQuery.error instanceof Error
                  ? refundQuery.error.message
                  : "Refund details are unavailable."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fee = refund.cancellationFee == null
    ? Number(refund.toOtherParty || 0) + Number(refund.toPlatform || 0)
    : Number(refund.cancellationFee);
  const events = details.timeline || [];
  const processedEvent = events.find((event) => event.eventType === "refund.processed");
  const failedEvent = events.find((event) => event.eventType === "refund.failed");
  const normalizedRefundStatus = String(refund.status).toLowerCase();
  const providerStatus = String(refund.providerStatus || "").toLowerCase();
  const terminalStatus = ["completed", "processed", "success", "failed"].includes(normalizedRefundStatus)
    ? normalizedRefundStatus
    : providerStatus;
  const isCredited =
    !failedEvent &&
    (Boolean(processedEvent) || ["completed", "processed", "success"].includes(terminalStatus));
  const isFailed = Boolean(failedEvent) || (!isCredited && terminalStatus === "failed");
  const terminalEvent = processedEvent || failedEvent;
  const terminalAt =
    terminalEvent?.occurredAt ||
    (isCredited || isFailed
      ? refund.providerProcessedAt || refund.completedAt || refund.updatedAt
      : undefined);
  const timelineSteps: Array<{
    label: string;
    occurredAt?: string | Date | null;
    state: "complete" | "current" | "pending" | "failed";
  }> = [
    {
      label: "Refund initiated",
      occurredAt:
        events.find((event) => event.eventType === "refund.created")?.occurredAt ||
        refund.createdAt,
      state: "complete",
    },
    {
      label: "Processing",
      occurredAt: terminalAt,
      state: isCredited || isFailed ? "complete" : "current",
    },
    {
      label: isFailed ? "Refund failed" : "Credited",
      occurredAt: terminalAt,
      state: isFailed ? "failed" : isCredited ? "complete" : "pending",
    },
  ];
  const poster = posterQuery.data?.data;
  const helper = helperQuery.data?.data;
  const assignedBy = assignedByQuery.data?.data;
  const posterName =
    poster?.name ||
    poster?.fullName ||
    task?.customerName ||
    transaction?.links?.customerName ||
    posterId ||
    "Not recorded";
  const taskPartnerName =
    task?.dispatchProgress?.assignedPartnerUid === helperId
      ? task.dispatchProgress.assignedPartnerName
      : [task?.assigneeUid, task?.partnerUid, task?.assigneeId, task?.partnerId].some(
            (uid) => uid && String(uid) === helperId,
          )
        ? task?.assigneeName ||
          task?.assignedHelperName ||
          task?.assignedToName
        : undefined;
  const helperName =
    helper?.name ||
    helper?.fullName ||
    (transaction?.performerUid === helperId ? transaction.links?.helperName : undefined) ||
    taskPartnerName ||
    helperId ||
    "Not assigned";
  const cancellationActor = cancellationActorQuery.data?.data;
  const cancelledByName =
    refund.cancelledBy === "poster"
      ? posterName
      : refund.cancelledBy === "performer"
        ? helperName
        : cancellationActor?.name ||
          cancellationActor?.fullName ||
          (cancelledById === posterId
            ? posterName
            : cancelledById === helperId
              ? helperName
              : "Not recorded");
  const cancellationReason = getCancellationReason(
    task?.cancellationReason,
    refund.reason,
  );
  const assignedByName =
    assignedByUid === "system"
      ? "System"
      : assignedByUid === "partner_offer"
        ? "Partner offer"
        : assignedBy?.name || assignedBy?.fullName || assignedByUid || "Not recorded";
  const refundStatus = normalizedRefundStatus.replace(/_/g, " ");
  const statusClass =
    ["completed", "processed", "success"].includes(normalizedRefundStatus)
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : normalizedRefundStatus === "failed"
        ? "bg-red-50 text-red-700 ring-red-200"
        : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All refunds
      </Link>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                Refund
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                {environment}
              </span>
            </div>
            <h1 className="truncate text-xl font-semibold tracking-tight text-gray-950 sm:text-2xl">
              {task?.title || "Refund details"}
            </h1>
            <p className="mt-1 break-all font-mono text-xs text-gray-500">{refund.refundId}</p>
          </div>
          <div className="flex items-center justify-between gap-5 sm:justify-end">
            <div className="sm:text-right">
              <p className="text-xs font-medium text-gray-500">Refund amount</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-gray-950">
                {formatAmount(refund.refundAmount)}
              </p>
            </div>
            <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass}`}>
              {refundStatus}
            </span>
          </div>
        </div>

        <div className="grid divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-3 px-5 py-4 sm:px-7">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Refund created</p>
              <p className="mt-0.5 text-sm font-medium text-gray-800">{formatDate(refund.createdAt)}</p>
            </div>
          </div>
          <div className="px-5 py-4 sm:px-7">
            <p className="text-xs text-gray-500">Customer</p>
            <p className="mt-0.5 truncate text-sm font-medium text-gray-800">{posterName}</p>
          </div>
          <div className="px-5 py-4 sm:px-7">
            <p className="text-xs text-gray-500">Task ID</p>
            <p className="mt-0.5 truncate font-mono text-sm text-gray-800">{taskId || "Not linked"}</p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <CardTitle className="text-base">Task & assignment</CardTitle>
              <CardDescription>Work details and people involved</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
            {!hasPermission("task.view") ? (
              <p className="text-sm text-gray-500">Task details require task-view permission.</p>
            ) : taskQuery.isLoading ? (
              <div className="space-y-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
              </div>
            ) : taskQuery.isError ? (
              <p className="text-sm text-red-600">
                {taskQuery.error instanceof Error ? taskQuery.error.message : "Could not load task details."}
              </p>
            ) : task ? (
              <>
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {task.categoryLabel || task.category ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {task.categoryLabel || task.category}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-700">
                      {task.status?.replace(/_/g, " ") || "Status unavailable"}
                    </span>
                    {task.postedBy === "team" ? (
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                        Posted by ExtraHand
                      </span>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {task.description || "No task description recorded."}
                  </p>
                </div>
                <div className="grid gap-x-6 gap-y-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                  <Field label={task.postedBy === "team" ? "Customer" : "Posted by"}>
                    {posterName}
                  </Field>
                  <Field label="Assigned helper / partner">
                    {helperId ? helperName : "Not assigned"}
                  </Field>
                  <Field label="Assigned by">
                    {assignmentQuery.isError
                      ? "Assignment history unavailable"
                      : assignmentQuery.isLoading
                        ? "Loading…"
                        : assignedByName}
                  </Field>
                  <Field label="Assignment mode">{assignment?.assignmentMode || "Not recorded"}</Field>
                  <Field label="Assigned on">{formatDate(assignment?.assignedAt || task.assignedAt)}</Field>
                  <Field label="Operations owner">{task.assignedTo?.name || "Not assigned"}</Field>
                  <Field label="Task ID">{task.taskId || taskId}</Field>
                </div>
                {task.cancellationReason ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Task cancellation note
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-amber-950">
                      {task.cancellationReason}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-gray-500">
                {taskId ? "Task details were not found." : "This refund has no linked task."}
              </p>
            )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <CardTitle className="text-base">Customer’s cancellation reason</CardTitle>
              <CardDescription>Reason saved with the refund request or task</CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {cancellationReason ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{cancellationReason}</p>
              ) : (
                <p className="text-sm text-gray-500">No specific cancellation reason was recorded for this refund or task.</p>
              )}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <Field label="Cancelled by">
                  {cancelledByName}
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <CardTitle className="text-base">Payment breakdown</CardTitle>
              <CardDescription>Amounts associated with this work and refund</CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <dl className="divide-y divide-gray-100">
                {[
                  ["Task budget", task ? formatAmount(task.budget) : "Not available"],
                  ["Amount paid", formatAmount(transaction?.amountInRupees)],
                  ["Customer tax (GST)", formatAmount(transaction?.customerTaxAmount)],
                ].map(([label, amount]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <dt className="text-gray-600">{label}</dt>
                    <dd className="text-right font-medium tabular-nums text-gray-900">{amount}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-gray-600">Cancellation fee</dt>
                  <dd className="text-right font-medium tabular-nums text-gray-900">
                    {fee > 0 ? formatAmount(fee) : "None"}
                  </dd>
                </div>
                {fee > 0 ? (
                  <>
                    <div className="flex items-center justify-between gap-4 py-2 pl-3 text-sm">
                      <dt className="text-gray-500">Helper / partner share</dt>
                      <dd className="text-right tabular-nums text-gray-700">{formatAmount(refund.toOtherParty)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2 pl-3 text-sm">
                      <dt className="text-gray-500">Platform share</dt>
                      <dd className="text-right tabular-nums text-gray-700">{formatAmount(refund.toPlatform)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-3">
                <span className="text-sm font-semibold text-gray-800">Refund amount</span>
                <span className="text-lg font-semibold tabular-nums text-gray-950">
                  {formatAmount(refund.refundAmount)}
                </span>
              </div>
              {transactionQuery.isError ? (
                <p className="mt-3 text-xs text-amber-700">Some payment amounts could not be loaded.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <CardTitle className="text-base">Razorpay timeline</CardTitle>
              <CardDescription>Initiation date and latest Razorpay refund status</CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <ol className="space-y-0">
                {timelineSteps.map((step, index) => (
                  <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < timelineSteps.length - 1 ? (
                      <span className="absolute left-[13px] top-7 h-[calc(100%-12px)] w-px bg-gray-200" />
                    ) : null}
                    <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      step.state === "failed"
                        ? "bg-red-50 text-red-600"
                        : step.state === "complete"
                          ? "bg-emerald-50 text-emerald-600"
                          : step.state === "current"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-gray-100 text-gray-400"
                    }`}>
                      {step.state === "failed" ? (
                        <X className="h-4 w-4" />
                      ) : step.state === "complete" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={`text-sm font-medium ${
                        step.state === "pending" ? "text-gray-500" : "text-gray-900"
                      }`}>
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {step.occurredAt ? formatDate(step.occurredAt) : "Pending"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <CardTitle className="text-base">Reference IDs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <Field label="Payment ID">{refund.paymentId}</Field>
              <Field label="Razorpay refund ID">{refund.razorpayRefundId}</Field>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
