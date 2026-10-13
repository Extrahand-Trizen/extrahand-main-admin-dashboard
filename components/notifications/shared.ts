import { Briefcase, Store, Users } from "lucide-react";
import type { BadgeProps } from "@/components/ui/badge";
import type { User } from "@/types";
import {
  BROADCAST_APP_OPTIONS,
  type BroadcastApp,
  type BroadcastStatus,
  type NotificationBroadcast,
} from "@/lib/api/notifications";

export const NOTIFICATION_HISTORY_QUERY_KEY = "notification-broadcasts";

export const APP_ICONS: Record<BroadcastApp, React.ComponentType<{ className?: string }>> = {
  customer_app: Users,
  helper_app: Briefcase,
  seller_app: Store,
};

export const STATUS_BADGES: Record<BroadcastStatus, { label: string; variant: BadgeProps["variant"] }> = {
  scheduled: { label: "Scheduled", variant: "outline" },
  sending: { label: "Sending", variant: "warning" },
  sent: { label: "Sent", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export type SelectedRecipient = { userId: string; name: string; contact: string };

export function appLabel(app: BroadcastApp | null | undefined): string {
  return BROADCAST_APP_OPTIONS.find((option) => option.value === app)?.label || "Unknown app";
}

export function toRecipient(user: User): SelectedRecipient | null {
  const userId = user.userId || user.uid;
  if (!userId) return null;
  return {
    userId,
    name: user.name || user.fullName || "Unnamed user",
    contact: user.phone || user.email || "",
  };
}

/** Selected broadcasts must count stored IDs, not the worker's later audienceSize. */
export function recipientCount(row: NotificationBroadcast): number {
  if (row.recipientType === "selected" && Array.isArray(row.userIds) && row.userIds.length > 0) {
    return row.userIds.length;
  }
  return row.recipientCount ?? 0;
}

export function recipientSummary(row: NotificationBroadcast): string {
  const count = recipientCount(row);
  return row.recipientType === "selected"
    ? `${count.toLocaleString("en-IN")} selected user${count === 1 ? "" : "s"}`
    : "All Users";
}
