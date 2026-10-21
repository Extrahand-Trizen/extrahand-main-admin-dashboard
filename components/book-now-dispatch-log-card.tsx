"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ListFilter, ShieldCheck, ShieldX } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Task, DispatchAreaLog, DispatchCandidateLog } from "@/types";

interface BookNowDispatchLogCardProps {
  task: Task;
}

const GENDER_ICON: Record<string, string> = { male: "♂", female: "♀" };
const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", any: "Any" };
const STAGES = [
  {
    key: "preferred",
    label: "Preferred / hired partners",
    description: "This group gets the first opportunity to accept the work.",
  },
  {
    key: "area_rule",
    label: "Area-rule partners",
    description: "Offered the work only if the preferred-partner stage ends without an assignment.",
  },
  {
    key: "all",
    label: "Other eligible partners",
    description: "Offered the work only if the preferred and area-rule stages end without an assignment.",
  },
] as const;

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function stageStatusLabel(status?: string): string {
  if (!status) return "Not started";
  return status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function responseLabel(candidate: DispatchCandidateLog): string {
  if (!candidate.notifiedAt) return "Not notified";
  switch (candidate.responseStatus) {
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "timed_out":
      return "Timed Out";
    case "closed":
      return "Closed - assigned to another partner";
    default:
      return "Pending";
  }
}

function responseClass(candidate: DispatchCandidateLog): string {
  switch (candidate.responseStatus) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
      return "bg-red-50 text-red-700";
    case "timed_out":
      return "bg-amber-50 text-amber-700";
    case "closed":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

function stageCandidates(area: DispatchAreaLog, stage: string): DispatchCandidateLog[] {
  return (area.candidates || []).filter((candidate) => candidate.dispatchStage === stage);
}

function AreaCandidates({
  area,
  candidates,
}: {
  area: DispatchAreaLog;
  candidates: DispatchCandidateLog[];
}) {
  const counts = {
    eligible: candidates.filter((candidate) => candidate.status !== "ineligible").length,
    notified: candidates.filter((candidate) => Boolean(candidate.notifiedAt)).length,
    accepted: candidates.filter((candidate) => candidate.responseStatus === "accepted").length,
    rejected: candidates.filter((candidate) => candidate.responseStatus === "rejected").length,
    timedOut: candidates.filter((candidate) => candidate.responseStatus === "timed_out").length,
  };

  return (
    <div className="pl-3.5 border-l-[3px] border-amber-500">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-gray-900">
          {area.area}
          {area.isJobArea || area.distanceKm === 0 ? (
            <span className="text-gray-500 font-normal ml-1">(job area)</span>
          ) : null}
        </span>
        <span className="text-xs text-gray-500 font-medium">
          {area.distanceKm === 0 ? "0 km" : `${area.distanceKm.toFixed(1)} km from work location`}
        </span>
      </div>
      <div className="mt-2 space-y-2">
        {candidates.map((candidate, index) => {
          const ineligible = candidate.status === "ineligible";
          const reason = candidate.reasons?.filter(Boolean).join(", ") || candidate.details;
          const genderFailed = candidate.genderCheckResult === "failed";
          const genderPassed = candidate.genderCheckResult === "passed";

          return (
            <div key={`${candidate.partnerUid || candidate.partnerId || candidate.name}-${index}`} className="rounded-md border border-gray-100 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm text-gray-900">{candidate.name}</span>
                <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${ineligible ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {ineligible ? "Ineligible" : "Eligible"}
                </span>
                {candidate.gender && (
                  <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                    genderFailed
                      ? "border-red-200 bg-red-50 text-red-700"
                      : genderPassed
                        ? candidate.gender === "female"
                          ? "border-pink-200 bg-pink-50 text-pink-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                  }`}>
                    {GENDER_ICON[candidate.gender] ?? "?"} {GENDER_LABEL[candidate.gender] ?? candidate.gender}
                    {genderFailed ? <ShieldX className="h-2.5 w-2.5" /> : null}
                    {genderPassed ? <ShieldCheck className="h-2.5 w-2.5" /> : null}
                  </span>
                )}
                <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${responseClass(candidate)}`}>
                  {responseLabel(candidate)}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                <span>{candidate.distanceKm == null ? "Distance unavailable" : `${candidate.distanceKm.toFixed(1)} km from work location`}</span>
                {candidate.shiftTiming ? <span> · Shift: {candidate.shiftTiming}</span> : null}
                <span> · Notified: {formatDateTime(candidate.notifiedAt)}</span>
                {candidate.respondedAt ? <span> · Responded: {formatDateTime(candidate.respondedAt)}</span> : null}
              </div>
              {reason ? <p className="mt-1 text-xs text-gray-600">{reason}</p> : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {counts.eligible} eligible · {counts.notified} notified · {counts.accepted} accepted · {counts.rejected} rejected · {counts.timedOut} timed out
      </p>
    </div>
  );
}

export function BookNowDispatchLogCard({ task }: BookNowDispatchLogCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const dispatchLogs = task.dispatchLogs || [];
  const progress = task.dispatchProgress;
  const isAssigned = Boolean(task.assigneeId || task.assigneeName || task.assignedHelperName);
  const preferredGender = task.preferredHelperGender;
  const isHourlyTask = task.categorySlug === "hourly-helper" ||
    task.categorySlug === "hourly-based" ||
    task.budgetType === "hourly";
  const hasStrictGenderCheck = isHourlyTask && preferredGender && preferredGender !== "any";
  const currentStage = progress?.stages.find((stage) => stage.stage === progress.currentStage);

  return (
    <Card className="mt-4 overflow-hidden border border-gray-200 shadow-sm">
      <CardHeader
        className="py-3 px-4 bg-gray-50/70 cursor-pointer hover:bg-gray-100/70 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">Dispatch log</span>
          </div>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
            aria-label={isOpen ? "Collapse dispatch log" : "Expand dispatch log"}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="p-4 pt-3 space-y-5">
          {isHourlyTask && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border ${
              hasStrictGenderCheck
                ? preferredGender === "female"
                  ? "bg-pink-50 border-pink-200 text-pink-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-gray-50 border-gray-200 text-gray-600"
            }`}>
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {hasStrictGenderCheck
                  ? <>Strict gender check active — customer requested <strong>{GENDER_LABEL[preferredGender!] ?? preferredGender}</strong> helper only.</>
                  : preferredGender === "any" || !preferredGender
                    ? "No gender preference — any otherwise eligible partner can be assigned."
                    : `Gender preference: ${GENDER_LABEL[preferredGender] ?? preferredGender}`}
              </span>
            </div>
          )}

          {progress ? (
            <section className="rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Dispatch progress</p>
                  <p className="text-xs text-gray-600">
                    Current stage: {progress.currentStage === "assigned" ? "Assigned" : progress.currentStage === "closed" ? "Closed" : STAGES.find((stage) => stage.key === progress.currentStage)?.label || "Not started"}
                    {currentStage ? ` · ${stageStatusLabel(currentStage.status)}` : ""}
                  </p>
                </div>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                  {progress.acceptanceWindowMinutes}-minute acceptance window
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {progress.stages.map((stage) => (
                  <div key={stage.stage} className="rounded-md bg-gray-50 p-2">
                    <p className="text-xs font-medium text-gray-800">
                      {stage.stage === "preferred" ? "Preferred / hired" : stage.stage === "area_rule" ? "Same-area partners" : "Remaining eligible"}
                    </p>
                    <p className="text-[11px] text-gray-600">
                      {stageStatusLabel(stage.status)} · {stage.eligibleCount} eligible · {stage.notifiedCount} notified
                    </p>
                    {stage.stage !== "all" ? (
                      <p className="text-[11px] text-gray-500">
                        {stage.acceptedCount} accepted · {stage.rejectedCount} rejected · {stage.timedOutCount} timed out
                      </p>
                    ) : null}
                    {stage.expiresAt ? (
                      <p className="text-[11px] text-gray-500">Window ends {formatDateTime(stage.expiresAt)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              {progress.currentStage !== "assigned" && progress.currentStage !== "closed" && currentStage?.status === "in_progress" ? (
                <p className="text-xs text-gray-600">
                  Acceptance deadline: {formatDateTime(currentStage.expiresAt)}
                </p>
              ) : null}
              {isAssigned || progress.currentStage === "assigned" ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                  Assigned to {progress.assignedPartnerName || task.assignedHelperName || task.assigneeName || "partner"}{progress.assignedAt ? ` at ${formatDateTime(progress.assignedAt)}` : ""}. Further dispatch stopped.
                </p>
              ) : null}
              <p className={`text-xs ${
                progress.supportEscalation.status === "escalated" ? "font-semibold text-amber-800" : "text-gray-600"
              }`}>
                {progress.supportEscalation.status === "escalated"
                  ? `Support escalation: escalated at ${formatDateTime(progress.supportEscalation.escalatedAt)}`
                  : progress.supportEscalation.status === "stopped"
                    ? "Support escalation stopped because a partner was assigned."
                    : `Support escalation pending; due ${formatDateTime(progress.supportEscalation.dueAt)} if still unassigned.`}
              </p>
            </section>
          ) : (
            <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
              No persisted dispatch progress is available for this work.
            </p>
          )}

          {STAGES.map((stage) => {
            const stageProgress = progress?.stages.find((item) => item.stage === stage.key);
            const seenPartnerIds = new Set<string>();
            const areaRows = dispatchLogs
              .map((area) => ({
                area,
                candidates: stageCandidates(area, stage.key).filter((candidate) => {
                  const partnerId = candidate.partnerUid || candidate.partnerId;
                  if (!partnerId) return true;
                  if (seenPartnerIds.has(partnerId)) return false;
                  seenPartnerIds.add(partnerId);
                  return true;
                }),
              }))
              .filter((row) => row.candidates.length > 0);

            return (
              <section key={stage.key} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{stage.label}</h3>
                  <span className="text-xs text-gray-500">
                    {stageStatusLabel(stageProgress?.status)}
                    {stageProgress?.startedAt ? ` · Started ${formatDateTime(stageProgress.startedAt)}` : ""}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{stage.description}</p>
                {areaRows.length ? (
                  areaRows.map(({ area, candidates }) => (
                    <AreaCandidates key={`${stage.key}-${area.area}`} area={area} candidates={candidates} />
                  ))
                ) : (
                  <p className="text-xs text-gray-500">
                    {!progress
                      ? "Dispatch has not started for this stage."
                      : stageProgress?.eligibleCount
                      ? "Partner-level dispatch records are not available for this stage."
                      : "No eligible partner records for this stage."}
                  </p>
                )}
              </section>
            );
          })}

          {!dispatchLogs.length && !progress ? (
            <p className="text-xs text-gray-500">No backend dispatch data has been recorded.</p>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}

export default BookNowDispatchLogCard;
