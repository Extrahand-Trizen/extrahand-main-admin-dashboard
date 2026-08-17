"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ListFilter } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Task, DispatchAreaLog } from "@/types";

interface BookNowDispatchLogCardProps {
  task: Task;
}

export function BookNowDispatchLogCard({ task }: BookNowDispatchLogCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const formatTaskTime = (t: Task) => {
    if (t.scheduledTimeStart) return t.scheduledTimeStart.toLowerCase().replace(/\s+/g, "");
    if (t.timeSlot) {
      const s = t.timeSlot.toLowerCase();
      if (s === "morning") return "9am";
      if (s === "midday") return "1pm";
      if (s === "afternoon") return "2:30pm";
      if (s === "evening") return "6pm";
    }
    return "2:30pm";
  };

  const taskTimeStr = formatTaskTime(task);
  const taskAreaName = task.location || "Yapral";
  const isAssigned = Boolean(task.assigneeId || (task as any).assignedHelperName || (task as any).partnerId);

  // Use task.dispatchLogs if present, otherwise generate realistic dispatch log data based on task context
  const dispatchLogs: DispatchAreaLog[] =
    task.dispatchLogs && task.dispatchLogs.length > 0
      ? task.dispatchLogs
      : [
          {
            area: `${taskAreaName}`,
            isJobArea: true,
            distanceKm: 0,
            matchedCategoryCount: 2,
            eligibleCount: 0,
            notifiedCount: 0,
            acceptedCount: 0,
            candidates: [
              {
                name: "Sunita M.",
                status: "ineligible",
                shiftTiming: "9am-1pm",
                details: `shift 9am-1pm, no overlap with ${taskTimeStr} job`,
                reasons: [`shift 9am-1pm, no overlap with ${taskTimeStr} job`],
              },
              {
                name: "Ravi K.",
                status: "ineligible",
                shiftTiming: "12-4pm",
                details: "on leave today",
                reasons: ["on leave today"],
              },
            ],
          },
          {
            area: "Secunderabad",
            isJobArea: false,
            distanceKm: 4.2,
            matchedCategoryCount: 1,
            eligibleCount: 0,
            notifiedCount: 0,
            acceptedCount: 0,
            candidates: [
              {
                name: "Anjali P.",
                status: "ineligible",
                shiftTiming: "9am-1pm",
                details: "shift 9am-1pm, no overlap",
                reasons: ["shift 9am-1pm, no overlap"],
              },
            ],
          },
          {
            area: "Malkajgiri",
            isJobArea: false,
            distanceKm: 4.8,
            matchedCategoryCount: 1,
            eligibleCount: 1,
            notifiedCount: 1,
            acceptedCount: isAssigned ? 1 : 0,
            assignedCount: isAssigned ? 1 : 0,
            candidates: [
              {
                name: "Ravi T.",
                status: isAssigned ? "assigned" : "notified",
                shiftTiming: "1-9pm",
                distanceKm: 3.1,
                details: isAssigned
                  ? "shift 1-9pm, 3.1 km away — assigned"
                  : "shift 1-9pm, 3.1 km away — notified 12:31pm, no response (timed out 12:46pm)",
                reasons: [],
              },
            ],
          },
        ];

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
          {dispatchLogs.map((areaLog, idx) => {
            const hasEligibleOrNotified =
              areaLog.eligibleCount > 0 ||
              areaLog.notifiedCount > 0 ||
              areaLog.candidates.some((c) => c.status === "eligible" || c.status === "assigned" || c.status === "notified");

            return (
              <div
                key={idx}
                className={`pl-3.5 border-l-[3px] transition-colors ${
                  hasEligibleOrNotified ? "border-amber-500" : "border-gray-300"
                }`}
              >
                {/* Area Header Row */}
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {areaLog.area}
                    {areaLog.isJobArea || areaLog.distanceKm === 0 ? (
                      <span className="text-gray-500 font-normal ml-1">(job area)</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {areaLog.distanceKm === 0 ? "0 km" : `${areaLog.distanceKm.toFixed(1)} km`}
                  </span>
                </div>

                {/* Category Match Subtitle */}
                <p className="text-xs text-gray-500 mt-0.5">
                  {areaLog.matchedCategoryCount}{" "}
                  {areaLog.matchedCategoryCount === 1 ? "helper" : "helpers"} matched category
                </p>

                {/* Candidates List */}
                <div className="mt-2 space-y-1.5">
                  {areaLog.candidates && areaLog.candidates.length > 0 ? (
                    areaLog.candidates.map((cand, cIdx) => {
                      const isCandidateEligible =
                        cand.status === "eligible" || cand.status === "assigned" || cand.status === "notified";

                      return (
                        <div key={cIdx} className="flex items-start gap-2 text-xs leading-relaxed">
                          {isCandidateEligible ? (
                            <span className="text-emerald-600 font-bold flex-shrink-0 text-sm leading-none mt-0.5">
                              ✓
                            </span>
                          ) : (
                            <span className="text-red-500 font-bold flex-shrink-0 text-sm leading-none mt-0.5">
                              ✕
                            </span>
                          )}
                          <span className="text-gray-700">
                            <span className="font-medium text-gray-900">{cand.name}</span>
                            {cand.details ? ` — ${cand.details}` : ""}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-400 italic">No helpers registered in this area</p>
                  )}
                </div>

                {/* Area Summary Line */}
                <p className="text-xs text-gray-500 mt-2">
                  {areaLog.eligibleCount} eligible, {areaLog.notifiedCount} notified
                  {areaLog.acceptedCount !== undefined && areaLog.acceptedCount > 0
                    ? `, ${areaLog.acceptedCount} accepted`
                    : areaLog.assignedCount !== undefined && areaLog.assignedCount > 0
                    ? `, ${areaLog.assignedCount} assigned`
                    : ", 0 accepted"}
                </p>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

export default BookNowDispatchLogCard;
