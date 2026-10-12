"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search,
  MoreVertical,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Briefcase,
  Send,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listTasks, deleteTask, requestTaskDelete } from "@/lib/api/tasks";
import { getUser, listUsers } from "@/lib/api/users";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "@/lib/category-options";
import { toast } from "sonner";
import { Task } from "@/types";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/LoadingSkeleton";

const TASK_TIME_ZONE = "Asia/Kolkata";

const getDateString = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TASK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
};

const addDaysToDateString = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

const getTaskScheduleDateString = (scheduledDate: string | Date | undefined | null) => {
  if (!scheduledDate) return null;
  const date = new Date(scheduledDate);
  if (isNaN(date.getTime())) return null;
  return getDateString(date);
};

const getTaskIdentifier = (task: Partial<Task> & { _id?: string; id?: string }) =>
  task.taskId || task._id || task.id || "";

const getTaskCustomerId = (
  task: Partial<Task> & {
    CustomerId?: string;
    requesterId?: string;
    requesterProfileId?: string;
  },
) => String(task.CustomerId || task.customerId || task.requesterId || task.requesterProfileId || "").trim();

const statusColors: Record<string, string> = {
  open: "success",
  overdue: "destructive",
  in_progress: "warning",
  completed: "default",
  cancelled: "destructive",
};

const getDisplayStatus = (task: Task) => {
  if (task.status === "open" && task.scheduledDate && task.dateOption !== "flexible") {
    if (new Date(task.scheduledDate) < new Date()) {
      return "overdue";
    }
  }
  return task.status;
};

const getScheduledTimeMinutes = (time: string | undefined | null) => {
  if (!time) return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const followUpStatusLabels: Record<string, string> = {
  not_updated: "Not updated",
  genuine: "Genuine",
  not_genuine: "Not genuine",
  call_not_lifted: "Call not lifted",
  follow_up: "Follow up",
};

const followUpStatusColors: Record<string, string> = {
  not_updated: "secondary",
  genuine: "success",
  not_genuine: "destructive",
  call_not_lifted: "warning",
  follow_up: "default",
};

export default function TasksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const [search, setSearch] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<string>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [postedByFilter, setPostedByFilter] = useState<string>("all");
  const [workDateFilter, setWorkDateFilter] = useState<string>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [scheduledTimeSortOrder, setScheduledTimeSortOrder] = useState<'asc' | 'desc'>("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    reason: string;
  }>({
    open: false,
    reason: "",
  });
  const [deleteRequestDialog, setDeleteRequestDialog] = useState<{
    open: boolean;
    reason: string;
  }>({
    open: false,
    reason: "",
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("tasks_filters");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.search !== undefined) setSearch(parsed.search);
        if (parsed.workTypeFilter !== undefined) setWorkTypeFilter(parsed.workTypeFilter);
        if (parsed.statusFilter !== undefined) setStatusFilter(parsed.statusFilter);
        if (parsed.categoryFilter !== undefined) setCategoryFilter(parsed.categoryFilter);
        if (parsed.followUpFilter !== undefined) setFollowUpFilter(parsed.followUpFilter);
        if (parsed.paymentTypeFilter !== undefined) setPaymentTypeFilter(parsed.paymentTypeFilter);
        if (parsed.assignedToFilter !== undefined) setAssignedToFilter(parsed.assignedToFilter);
        if (parsed.postedByFilter !== undefined) setPostedByFilter(parsed.postedByFilter);
        if (parsed.workDateFilter !== undefined) setWorkDateFilter(parsed.workDateFilter);
        if (parsed.customDateFrom !== undefined) setCustomDateFrom(parsed.customDateFrom);
        if (parsed.customDateTo !== undefined) setCustomDateTo(parsed.customDateTo);
        if (parsed.scheduledTimeSortOrder !== undefined) setScheduledTimeSortOrder(parsed.scheduledTimeSortOrder);
        else if (parsed.deadlineSortOrder !== undefined) setScheduledTimeSortOrder(parsed.deadlineSortOrder);
        if (parsed.page !== undefined) setPage(parsed.page);
        if (parsed.limit !== undefined) setLimit(parsed.limit);
      }
    } catch (e) {
      console.error("Error loading filters from sessionStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Save filters on state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      sessionStorage.setItem("tasks_filters", JSON.stringify({
        search,
        workTypeFilter,
        statusFilter,
        categoryFilter,
        followUpFilter,
        paymentTypeFilter,
        assignedToFilter,
        postedByFilter,
        workDateFilter,
        customDateFrom,
        customDateTo,
        scheduledTimeSortOrder,
        page,
        limit
      }));
    } catch (e) {
      console.error("Error saving filters to sessionStorage", e);
    }
  }, [search, workTypeFilter, statusFilter, categoryFilter, followUpFilter, paymentTypeFilter, assignedToFilter, postedByFilter, workDateFilter, customDateFrom, customDateTo, scheduledTimeSortOrder, page, limit, isLoaded]);

  const handleClearFilters = () => {
    setSearch("");
    setWorkTypeFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setFollowUpFilter("all");
    setPaymentTypeFilter("all");
    setAssignedToFilter("all");
    setPostedByFilter("all");
    setWorkDateFilter("all");
    setCustomDateFrom("");
    setCustomDateTo("");
    setScheduledTimeSortOrder("desc");
    setPage(1);
    try {
      sessionStorage.removeItem("tasks_filters");
    } catch (e) {
      console.error("Error clearing filters from sessionStorage", e);
    }
  };

  const hasActiveFilters = Boolean(
    search ||
    workTypeFilter !== "all" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    followUpFilter !== "all" ||
    paymentTypeFilter !== "all" ||
    assignedToFilter !== "all" ||
    postedByFilter !== "all" ||
    workDateFilter !== "all" ||
    customDateFrom ||
    customDateTo ||
    scheduledTimeSortOrder !== "desc"
  );

  const workDateRange = useMemo(() => {
    if (workDateFilter === "custom") {
      return { from: customDateFrom || undefined, to: customDateTo || undefined };
    }
    if (workDateFilter === "all") return { from: undefined, to: undefined };

    const today = getDateString(new Date());
    const offset = workDateFilter === "tomorrow" ? 1 : workDateFilter === "yesterday" ? -1 : 0;
    const value = addDaysToDateString(today, offset);
    return { from: value, to: value };
  }, [workDateFilter, customDateFrom, customDateTo]);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "tasks",
      search,
      workTypeFilter,
      statusFilter,
      categoryFilter,
      followUpFilter,
      paymentTypeFilter,
      assignedToFilter,
      postedByFilter,
      workDateFilter,
      workDateRange.from,
      workDateRange.to,
      scheduledTimeSortOrder,
      page,
      limit,
    ],
    queryFn: () =>
      listTasks({
        search: search || undefined,
        bookingSource: workTypeFilter,
        status: statusFilter !== "all" ? statusFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        followUpStatus:
          followUpFilter !== "all" ? followUpFilter : undefined,
        paymentType: paymentTypeFilter !== "all" ? paymentTypeFilter : undefined,
        assignedTo: assignedToFilter !== "all" ? assignedToFilter : undefined,
        postedBy: postedByFilter !== "all" ? postedByFilter as "customer" | "team" : undefined,
        scheduledDateFrom: workDateRange.from,
        scheduledDateTo: workDateRange.to,
        sortBy: "scheduledDate",
        sortOrder: scheduledTimeSortOrder,
        page,
        limit,
      }),
    enabled: hasPermission("task.list") && isLoaded,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      deleteTask(taskId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Works deleted successfully");
      setDeleteDialog({ open: false, reason: "" });
      setSelectedTask(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete works");
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      requestTaskDelete(taskId, reason),
    onSuccess: () => {
      toast.success("Delete request sent to Super Admin");
      setDeleteRequestDialog({ open: false, reason: "" });
      setSelectedTask(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send delete request");
    },
  });

  const handleDelete = (task: Task) => {
    setSelectedTask(task);
    setDeleteDialog({ open: true, reason: "" });
  };

  const handleRequestDelete = (task: Task) => {
    setSelectedTask(task);
    setDeleteRequestDialog({ open: true, reason: "" });
  };

  const confirmDelete = () => {
    if (!selectedTask || !deleteDialog.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const taskIdentifier = getTaskIdentifier(
      selectedTask as Partial<Task> & { _id?: string; id?: string },
    );
    if (!taskIdentifier) {
      toast.error("Works identifier missing. Please refresh and try again.");
      return;
    }
    deleteMutation.mutate({
      taskId: taskIdentifier,
      reason: deleteDialog.reason,
    });
  };

  const confirmDeleteRequest = () => {
    if (!selectedTask || !deleteRequestDialog.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const taskIdentifier = getTaskIdentifier(
      selectedTask as Partial<Task> & { _id?: string; id?: string },
    );
    if (!taskIdentifier) {
      toast.error("Works identifier missing. Please refresh and try again.");
      return;
    }
    deleteRequestMutation.mutate({
      taskId: taskIdentifier,
      reason: deleteRequestDialog.reason,
    });
  };

  const tasks = data?.data || [];

  // Client-side filters (work date by schedule time, payment type) — applied on top of the server result.
  const clientFilteredTasks = useMemo(() => {
    let list = tasks;

    // Filter by work date using the task's schedule date/time (scheduledDate)
    if (workDateFilter !== "all" && (workDateRange.from || workDateRange.to)) {
      list = (list as any[]).filter((task) => {
        if (!task.scheduledDate) return false;
        const taskScheduleDateStr = getTaskScheduleDateString(task.scheduledDate);
        if (!taskScheduleDateStr) return false;
        if (workDateRange.from && taskScheduleDateStr < workDateRange.from) return false;
        if (workDateRange.to && taskScheduleDateStr > workDateRange.to) return false;
        return true;
      });
    }

    const filteredList = paymentTypeFilter === 'all' ? list : (list as any[]).filter((task) => {
      // If task has isFreeCoupon enriched from server:
      if (typeof task.isFreeCoupon === 'boolean') {
        if (paymentTypeFilter === 'free_coupon') return task.isFreeCoupon;
        if (paymentTypeFilter === 'paid') return !task.isFreeCoupon;
        return true;
      }
      // Fallback if isFreeCoupon not directly present:
      const slug = String(task.categorySlug || '').trim().toLowerCase();
      const cat = String(task.category || '').trim().toLowerCase();
      const label = String(task.categoryLabel || '').trim().toLowerCase();
      const title = String(task.title || '').trim().toLowerCase();
      const bType = String(task.budgetType || task.budget?.type || '').trim().toLowerCase();
      const isHourly =
        slug === 'hourly-helper' ||
        slug === 'hourly-based' ||
        cat === 'hourly-helper' ||
        cat === 'hourly-based' ||
        label === 'hourly based' ||
        label === 'hourly helper' ||
        title.startsWith('helper ·') ||
        title.startsWith('helper -') ||
        title.includes('helper') ||
        bType === 'hourly' ||
        Boolean(task.hourlyHelper);

      const paymentAmount = typeof task.paymentAmount === 'number'
        ? task.paymentAmount
        : Number(task.budget ?? 0);

      const isFree = isHourly && paymentAmount === 0;
      if (paymentTypeFilter === 'free_coupon') return isFree;
      if (paymentTypeFilter === 'paid') return !isFree;
      return true;
    });

    return [...filteredList].sort((firstTask, secondTask) => {
      const firstDate = firstTask.scheduledDate ? new Date(firstTask.scheduledDate).getTime() : null;
      const secondDate = secondTask.scheduledDate ? new Date(secondTask.scheduledDate).getTime() : null;
      if (firstDate !== secondDate) {
        if (firstDate === null) return 1;
        if (secondDate === null) return -1;
        return (firstDate - secondDate) * (scheduledTimeSortOrder === "asc" ? 1 : -1);
      }

      const firstTime = getScheduledTimeMinutes(firstTask.scheduledTimeStart);
      const secondTime = getScheduledTimeMinutes(secondTask.scheduledTimeStart);
      if (firstTime === secondTime) return 0;
      if (firstTime === null) return 1;
      if (secondTime === null) return -1;
      return (firstTime - secondTime) * (scheduledTimeSortOrder === "asc" ? 1 : -1);
    });
  }, [tasks, workDateFilter, workDateRange.from, workDateRange.to, paymentTypeFilter, scheduledTimeSortOrder]);

  const uniqueCustomerProfileIds = useMemo(() => {
    return Array.from(
      new Set(
        clientFilteredTasks
          .map((task: any) => getTaskCustomerId(task))
          .filter(Boolean)
      )
    );
  }, [clientFilteredTasks]);

  const customerQueries = useQueries({
    queries: uniqueCustomerProfileIds.map((customerId) => ({
      queryKey: ["user-from-task-customer", customerId],
      queryFn: () => getUser(customerId),
      enabled: hasPermission("user.view"),
      retry: false,
    })),
  });

  const customerDetailsById = new Map(
    uniqueCustomerProfileIds.map((customerId, index) => [
      customerId,
      customerQueries[index]?.data?.data,
    ]),
  );
  const loadingCustomerIds = new Set(
    uniqueCustomerProfileIds.filter((_, index) => customerQueries[index]?.isLoading),
  );

  const uniqueHelperProfileIds = useMemo(() => {
    return Array.from(
      new Set(
        clientFilteredTasks
          .map((task: any) => task.assigneeId)
          .filter(Boolean)
      )
    ) as string[];
  }, [clientFilteredTasks]);

  const { data: batchUsersData, isLoading: isBatchLoading } = useQuery({
    queryKey: ["users-batch", uniqueHelperProfileIds.join(',')],
    queryFn: () => listUsers({ uids: uniqueHelperProfileIds.join(','), limit: uniqueHelperProfileIds.length || 1 }),
    enabled: uniqueHelperProfileIds.length > 0,
    retry: false,
  });

  const helperDetailsByProfileId = useMemo(() => {
    const map = new Map<string, any>();
    if (batchUsersData?.data && Array.isArray(batchUsersData.data)) {
      batchUsersData.data.forEach((user: any) => {
        if (user.uid) map.set(user.uid, user);
        if (user._id) map.set(user._id, user);
        if (user.profileId) map.set(user.profileId, user);
        if (user.userId) map.set(user.userId, user);
      });
    }
    return map;
  }, [batchUsersData]);

  const pagination = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  };

  const canRequestDelete = useMemo(() => {
    if (!hasPermission("task.list")) return false;
    if (isSuperAdmin) return false;
    return hasPermission("task.delete");
  }, [hasPermission, isSuperAdmin]);

  if (!hasPermission("task.list")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          You don't have permission to view works.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Works</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and monitor platform works
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/tasks/delete-requests">Delete Requests</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tasks/recycle-bin">Recycle Bin</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search works..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workType">Work Type</Label>
              <Select
                value={workTypeFilter}
                onValueChange={(value) => {
                  setWorkTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="workType">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="posted_task">Posted Task</SelectItem>
                  <SelectItem value="book_now">Book Now</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORY_OPTIONS.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="followUpStatus">Follow-up status</Label>
              <Select
                value={followUpFilter}
                onValueChange={(value) => {
                  setFollowUpFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="followUpStatus">
                  <SelectValue placeholder="All follow-up statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Follow-up Statuses</SelectItem>
                  <SelectItem value="not_updated">Not updated</SelectItem>
                  <SelectItem value="genuine">Genuine</SelectItem>
                  <SelectItem value="not_genuine">Not genuine</SelectItem>
                  <SelectItem value="call_not_lifted">Call not lifted</SelectItem>
                  <SelectItem value="follow_up">Follow up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select
                value={paymentTypeFilter}
                onValueChange={(value) => {
                  setPaymentTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="paymentType">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="free_coupon">Free (Coupon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select
                value={assignedToFilter}
                onValueChange={(value) => {
                  setAssignedToFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="assignedTo">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="durgamshiva">durgamshiva</SelectItem>
                  <SelectItem value="tadembharath">tadembharath</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postedBy">Posted By</Label>
              <Select
                value={postedByFilter}
                onValueChange={(value) => {
                  setPostedByFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="postedBy">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workDate">Work Date</Label>
              <Select
                value={workDateFilter}
                onValueChange={(value) => {
                  setWorkDateFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="workDate">
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {workDateFilter === "custom" && (
              <div className="min-w-0 space-y-2 sm:col-span-2 xl:col-span-2">
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs text-gray-500">From</span>
                    <div className="relative">
                      <Input
                        aria-label="From date"
                        type="date"
                        value={customDateFrom}
                        onClick={(event) => event.currentTarget.showPicker?.()}
                        onChange={(e) => {
                          setCustomDateFrom(e.target.value);
                          setPage(1);
                        }}
                        className="date-input-no-native-icon pr-9"
                      />
                      <Calendar className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs text-gray-500">To</span>
                    <div className="relative">
                      <Input
                        aria-label="To date"
                        type="date"
                        value={customDateTo}
                        onClick={(event) => event.currentTarget.showPicker?.()}
                        onChange={(e) => {
                          setCustomDateTo(e.target.value);
                          setPage(1);
                        }}
                        className="date-input-no-native-icon pr-9"
                      />
                      <Calendar className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="scheduledTimeSort">Scheduled time</Label>
              <Select
                value={scheduledTimeSortOrder}
                onValueChange={(value) => {
                  setScheduledTimeSortOrder(value as 'asc' | 'desc');
                  setPage(1);
                }}
              >
                <SelectTrigger id="scheduledTimeSort">
                  <SelectValue placeholder="Latest scheduled time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Latest to earliest</SelectItem>
                  <SelectItem value="asc">Earliest to latest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className="h-10 w-full gap-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <RotateCcw className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Works List</CardTitle>
            <Badge variant="secondary">
              {paymentTypeFilter !== 'all' || workDateFilter !== 'all' ? clientFilteredTasks.length : pagination.total} works
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data || error || clientFilteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No works found</div>
          ) : (
            <>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">
                        Works
                      </TableHead>
                      <TableHead className="sm:hidden">Details</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Customer
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Category
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Status
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        Follow-up
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Assigned To
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        Assigned Ops Admin
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Budget
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Deadline / Schedule
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(clientFilteredTasks as Task[]).map((task) => {
                      const taskIdentifier = getTaskIdentifier(
                        task as Partial<Task> & { _id?: string; id?: string },
                      );
                      const customerId = getTaskCustomerId(task);
                      return (
                      <TableRow 
                        key={taskIdentifier || `${task.title}-${task.createdAt}`}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          if (taskIdentifier) {
                            router.push(`/tasks/${taskIdentifier}`);
                          }
                        }}
                      >
                        <TableCell>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700">
                                <Briefcase className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate">
                                  {task.title}
                                </div>
                                <div className="text-sm text-gray-500 truncate line-clamp-1">
                                  {task.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:hidden">
                              <Badge variant={statusColors[getDisplayStatus(task)] as any}>
                                {getDisplayStatus(task)}
                              </Badge>
                              <Badge
                                variant={
                                  followUpStatusColors[
                                    task.taskCallStatus || "not_updated"
                                  ] as any
                                }
                              >
                                {
                                  followUpStatusLabels[
                                    task.taskCallStatus || "not_updated"
                                  ]
                                }
                              </Badge>
                              {task.category && (
                                <Badge variant="outline">{task.category}</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {customerId ? (
                            customerDetailsById.get(customerId) ? (
                              <Link
                                href={`/users/${customerId}`}
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {customerDetailsById.get(customerId)?.name ||
                                  customerDetailsById.get(customerId)?.fullName ||
                                  customerId}
                              </Link>
                            ) : loadingCustomerIds.has(customerId) ? (
                              <span className="text-gray-500">Loading...</span>
                            ) : (
                              <Link
                                href={`/users/${customerId}`}
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {customerId}
                              </Link>
                            )
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {task.category && (
                            <Badge variant="outline">{task.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={statusColors[getDisplayStatus(task)] as any}>
                            {getDisplayStatus(task)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="space-y-1">
                            <Badge
                              variant={
                                followUpStatusColors[
                                  task.taskCallStatus || "not_updated"
                                ] as any
                              }
                            >
                              {
                                followUpStatusLabels[
                                  task.taskCallStatus || "not_updated"
                                ]
                              }
                            </Badge>
                            {task.taskCallStatus === "follow_up" &&
                              task.taskCallFollowUpDate && (
                                <div className="text-xs text-gray-500">
                                  {formatDate(task.taskCallFollowUpDate)}
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {task.assigneeId ? (
                            helperDetailsByProfileId.has(task.assigneeId) ? (
                              <Link
                                href={`/users/${task.assigneeId}`}
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline capitalize"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isBatchLoading ? (
                                  task.assigneeName || "Loading..."
                                ) : (
                                  helperDetailsByProfileId.get(task.assigneeId)?.name ||
                                  helperDetailsByProfileId.get(task.assigneeId)?.fullName ||
                                  "Account Deleted"
                                )}
                              </Link>
                            ) : (
                              <span className="font-medium text-gray-700 capitalize">
                                Account Deleted
                              </span>
                            )
                          ) : (
                            <span className="text-amber-600 font-medium italic hover:underline">
                              Assign Helper
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {task.assignedTo?.name ? (
                            <span className="font-medium text-gray-900 capitalize">
                              {task.assignedTo.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm font-medium">
                          <div>
                            <span>{formatCurrency(task.budget)}</span>
                            {task.isFreeCoupon && (
                              <div className="text-[11px] font-normal text-emerald-600">
                                Free{task.couponCode ? ` (${task.couponCode})` : ' (Coupon)'}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {task.bookingSource === "book_now" ? (
                            <div className="flex flex-col gap-0.5 text-xs text-gray-700">
                              {task.scheduledDate && (
                                <span className="font-semibold text-blue-700">
                                  {formatDate(task.scheduledDate)}
                                </span>
                              )}
                              {(task.scheduledTimeStart || task.scheduledTimeEnd) && (
                                <span>
                                  {task.scheduledTimeStart || "?"} - {task.scheduledTimeEnd || "?"}
                                </span>
                              )}
                              {task.estimatedDuration && (
                                <span className="text-gray-500 italic">
                                  {task.estimatedDuration} mins
                                </span>
                              )}
                            </div>
                          ) : task.dateOption === "flexible" || !task.dateOption || !task.scheduledDate ? (
                            <span className="text-gray-400">Flexible</span>
                          ) : (
                            <span className="capitalize text-gray-700">
                              {task.dateOption === "on-date" ? "On " : task.dateOption === "before-date" ? "Before " : ""}
                              {formatDate(task.scheduledDate)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={taskIdentifier ? `/tasks/${taskIdentifier}` : "/tasks"}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {isSuperAdmin && hasPermission("task.delete") && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(task)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Works
                                </DropdownMenuItem>
                              )}
                              {canRequestDelete && (
                                <DropdownMenuItem onClick={() => handleRequestDelete(task)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Request Works Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
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
                    {pagination.total} works
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
                    <div className="text-sm text-gray-600 px-2">
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, reason: "" });
            setSelectedTask(null);
          } else {
            setDeleteDialog((d) => ({ ...d, open: true }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Works</DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <>
                  Are you sure you want to delete "{selectedTask.title}"? This
                  action cannot be undone. Please enter a reason below (required
                  for audit).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Reason *</Label>
            <Textarea
              id="delete-reason"
              placeholder="Enter the reason for deleting this works..."
              value={deleteDialog.reason}
              onChange={(e) =>
                setDeleteDialog({ ...deleteDialog, reason: e.target.value })
              }
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, reason: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!deleteDialog.reason.trim()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Request Dialog */}
      <Dialog
        open={deleteRequestDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRequestDialog({ open: false, reason: "" });
            setSelectedTask(null);
          } else {
            setDeleteRequestDialog((d) => ({ ...d, open: true }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Works Deletion</DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <>
                  This will send a delete request to Super Admin for "{selectedTask.title}".
                  Please enter a reason below (required).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-request-reason">Reason *</Label>
            <Textarea
              id="delete-request-reason"
              placeholder="Enter the reason for requesting deletion..."
              value={deleteRequestDialog.reason}
              onChange={(e) =>
                setDeleteRequestDialog({ ...deleteRequestDialog, reason: e.target.value })
              }
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteRequestDialog({ open: false, reason: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteRequest}
              disabled={!deleteRequestDialog.reason.trim()}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
