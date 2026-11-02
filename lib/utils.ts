import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TaskOverdueFields = {
  status?: string;
  scheduledDate?: string | Date | null;
  scheduledTimeStart?: string | null;
  dateOption?: string;
  assigneeId?: string | null;
  assigneeUid?: string | null;
  partnerId?: string | null;
  partnerUid?: string | null;
  assigneeName?: string | null;
  assignedHelperName?: string | null;
  assignedToName?: string | null;
};

export function isTaskOverdue(task: TaskOverdueFields, now = new Date()): boolean {
  if (task.status !== "open" || !task.scheduledDate || task.dateOption === "flexible") {
    return false;
  }

  const assigneeValues = [
    task.assigneeId,
    task.assigneeUid,
    task.partnerId,
    task.partnerUid,
    task.assigneeName,
    task.assignedHelperName,
    task.assignedToName,
  ];
  if (assigneeValues.some((value) => value && value.trim() && value.toLowerCase() !== "null")) {
    return false;
  }

  const scheduledDate = new Date(task.scheduledDate);
  if (Number.isNaN(scheduledDate.getTime())) return false;

  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(scheduledDate);
  const year = dateParts.find((part) => part.type === "year")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const day = dateParts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return false;

  let hours = 0;
  let minutes = 0;
  if (task.scheduledTimeStart?.trim()) {
    const match = task.scheduledTimeStart.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return false;

    hours = Number(match[1]);
    minutes = Number(match[2]);
    const period = match[3]?.toUpperCase();
    if (minutes > 59 || (period ? hours < 1 || hours > 12 : hours > 23)) return false;
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  }

  const scheduledStart = new Date(
    `${year}-${month}-${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`,
  );
  return scheduledStart <= now;
}



export function formatDate(date: string | Date, formatStr?: string): string {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    // If formatStr is provided, use date-fns format (if available)
    // Otherwise use default formatting
    if (formatStr) {
      // Simple format handling for common cases
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return 'Invalid Date';
  }
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const numericAmount =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? Number(amount)
        : NaN;

  if (!Number.isFinite(numericAmount)) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(0);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numericAmount);
}
