"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  IndianRupee,
  User,
  FileText,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Edit,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTask,
  deleteTask,
  requestTaskDelete,
  getTaskApplications,
  updateApplicationStatus,
} from "@/lib/api/tasks";
import {
  addTaskCallNote,
  getTaskCall,
  TaskCallStatus,
  updateTaskCallStatus,
} from "@/lib/api/task-calls";
import { getUser } from "@/lib/api/users";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
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
import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formatLocationDisplay = (location: unknown): string => {
  if (!location) return "Not specified";
  if (typeof location === "string") return location;
  if (typeof location === "object") {
    const loc = location as {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    return (
      loc.address ||
      [loc.city, loc.state, loc.country].filter(Boolean).join(", ") ||
      "Location available"
    );
  }
  return "Location available";
};

const extractCustomerProfileId = (task: any): string => {
  const raw =
    task?.CustomerId ||
    task?.customerId ||
    task?.requesterId ||
    task?.requesterProfileId ||
    "";
  return String(raw).trim();
};

const extractHelperProfileId = (application: any): string => {
  const raw = application?.HelperId || application?.helperId || application?.applicantId || "";
  return String(raw).trim();
};

const taskCallStatusLabels: Record<TaskCallStatus, string> = {
  not_updated: "Not updated",
  genuine: "Genuine",
  not_genuine: "Not genuine",
  call_not_lifted: "Call not lifted",
  follow_up: "Follow up",
};

const taskCallStatusClasses: Record<TaskCallStatus, string> = {
  not_updated: "bg-amber-50 text-amber-700 border-amber-200",
  genuine: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_genuine: "bg-red-50 text-red-700 border-red-200",
  call_not_lifted: "bg-gray-100 text-gray-700 border-gray-200",
  follow_up: "bg-blue-50 text-blue-700 border-blue-200",
};

const isOperationsRole = (role?: string | null) =>
  ["operations_admin", "operation_admin", "operations"].includes(role || "");

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const { user } = useAuth();
  const taskId = params.taskId as string;
  const isValidTaskId = Boolean(taskId && taskId !== "undefined" && taskId !== "null");
  const canManageTaskCalls = isOperationsRole(user?.role);

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
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [stageDialog, setStageDialog] = useState<{
    open: boolean;
    status: TaskCallStatus;
    followUpDate: string;
  }>({
    open: false,
    status: "not_updated",
    followUpDate: "",
  });
  const [noteDialog, setNoteDialog] = useState({
    open: false,
    note: "",
  });

  const {
    data: taskData,
    isLoading: taskLoading,
    error: taskError,
  } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
    enabled: isValidTaskId && hasPermission("task.view"),
  });

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ["task-applications", taskId, applicationsPage],
    queryFn: () =>
      getTaskApplications(taskId, { page: applicationsPage, limit: 10 }),
    enabled:
      isValidTaskId &&
      hasPermission("task.view") &&
      hasPermission("task.application.list"),
  });

  const { data: taskCallData, isLoading: taskCallLoading } = useQuery({
    queryKey: ["task-call", taskId],
    queryFn: () => getTaskCall(taskId),
    enabled: isValidTaskId && canManageTaskCalls,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      deleteTask(taskId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted successfully");
      router.push("/tasks");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete task");
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      requestTaskDelete(taskId, reason),
    onSuccess: () => {
      toast.success("Delete request sent to Super Admin");
      setDeleteRequestDialog({ open: false, reason: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send delete request");
    },
  });

  const updateApplicationStatusMutation = useMutation({
    mutationFn: ({
      applicationId,
      status,
    }: {
      applicationId: string;
      status: string;
    }) => updateApplicationStatus(taskId, applicationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["task-applications", taskId],
      });
      toast.success("Application status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update application status");
    },
  });

  const updateTaskCallStatusMutation = useMutation({
    mutationFn: ({
      status,
      followUpDate,
    }: {
      status: TaskCallStatus;
      followUpDate?: string;
    }) => updateTaskCallStatus(taskId, status, followUpDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-call", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-calls"] });
      toast.success("Task call stage updated");
      setStageDialog({ open: false, status: "not_updated", followUpDate: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update task call stage");
    },
  });

  const addTaskCallNoteMutation = useMutation({
    mutationFn: (note: string) => addTaskCallNote(taskId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-call", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-calls"] });
      toast.success("Note added");
      setNoteDialog({ open: false, note: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add note");
    },
  });

  const handleDelete = () => {
    setDeleteDialog({ open: true, reason: "" });
  };

  const handleRequestDelete = () => {
    setDeleteRequestDialog({ open: true, reason: "" });
  };

  const confirmDelete = () => {
    if (!isValidTaskId) {
      toast.error("Invalid task id");
      return;
    }
    if (!deleteDialog.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    deleteMutation.mutate({ taskId, reason: deleteDialog.reason });
  };

  const confirmDeleteRequest = () => {
    if (!isValidTaskId) {
      toast.error("Invalid task id");
      return;
    }
    if (!deleteRequestDialog.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    deleteRequestMutation.mutate({ taskId, reason: deleteRequestDialog.reason });
  };

  const handleApplicationStatusChange = (
    applicationId: string,
    status: string,
  ) => {
    updateApplicationStatusMutation.mutate({ applicationId, status });
  };

  const openStageDialog = () => {
    const existingStatus = taskCallData?.data?.status || "not_updated";
    const existingDate = taskCallData?.data?.followUpDate
      ? new Date(taskCallData.data.followUpDate).toISOString().slice(0, 10)
      : "";
    setStageDialog({
      open: true,
      status: existingStatus,
      followUpDate: existingDate,
    });
  };

  const confirmStageUpdate = () => {
    if (stageDialog.status === "follow_up" && !stageDialog.followUpDate) {
      toast.error("Follow-up date is required");
      return;
    }
    updateTaskCallStatusMutation.mutate({
      status: stageDialog.status,
      followUpDate:
        stageDialog.status === "follow_up" ? stageDialog.followUpDate : undefined,
    });
  };

  const confirmNote = () => {
    if (!noteDialog.note.trim()) {
      toast.error("Note is required");
      return;
    }
    addTaskCallNoteMutation.mutate(noteDialog.note.trim());
  };

  const task = taskData?.data;
  const taskCall = taskCallData?.data;
  const applications = applicationsData?.data || [];
  const customerProfileId = extractCustomerProfileId(task);
  const uniqueHelperProfileIds = Array.from(
    new Set(
      applications
        .map((app: any) => extractHelperProfileId(app))
        .filter((id: string) => Boolean(id)),
    ),
  );

  const { data: customerDetails } = useQuery({
    queryKey: ["user-from-task-customer", customerProfileId],
    queryFn: () => getUser(customerProfileId),
    enabled:
      Boolean(customerProfileId) &&
      hasPermission("user.view") &&
      hasPermission("task.view"),
    retry: false,
  });

  const helperDetailQueries = useQueries({
    queries: uniqueHelperProfileIds.map((profileId) => ({
      queryKey: ["user-from-task-helper", profileId],
      queryFn: () => getUser(profileId),
      enabled: hasPermission("user.view") && hasPermission("task.view"),
      retry: false,
    })),
  });

  const helperDetailsByProfileId = new Map<string, any>();
  uniqueHelperProfileIds.forEach((profileId, index) => {
    const payload = helperDetailQueries[index]?.data?.data;
    if (payload) helperDetailsByProfileId.set(profileId, payload);
  });
  const applicationsPagination = applicationsData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  };

  const statusColors: Record<string, string> = {
    open: "success",
    in_progress: "warning",
    completed: "default",
    cancelled: "destructive",
  };

  const applicationStatusColors: Record<string, string> = {
    pending: "secondary",
    accepted: "success",
    rejected: "destructive",
  };

  if (!hasPermission("task.view")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          You don't have permission to view task details.
        </p>
      </div>
    );
  }

  if (!isValidTaskId) {
    return (
      <div className="space-y-6">
        <Link href="/tasks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              Invalid task id. Please open task details from the list again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (taskLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="space-y-6">
        <Link href="/tasks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              Failed to load task details. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Task ID: {task.taskId || (task as any)._id || taskId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManageTaskCalls && (
            <>
              <Button variant="outline" onClick={openStageDialog}>
                <Edit className="mr-2 h-4 w-4" />
                Move Stage
              </Button>
              <Button
                variant="outline"
                onClick={() => setNoteDialog({ open: true, note: "" })}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </>
          )}
          {/* Task editing disabled for all roles */}
          {isSuperAdmin && hasPermission("task.delete") && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          {!isSuperAdmin && hasPermission("task.delete") && (
            <Button variant="outline" onClick={handleRequestDelete}>
              <Send className="mr-2 h-4 w-4" />
              Request Task Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>Complete task information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Status
                  </Label>
                  <div className="mt-1">
                    <Badge variant={statusColors[task.status] as any}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Category
                  </Label>
                  <div className="mt-1">
                    {task.category ? (
                      <Badge variant="outline">{task.category}</Badge>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Not specified
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Budget
                  </Label>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {formatCurrency(task.budget)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Deadline
                  </Label>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {task.dateOption === "flexible" || !task.dateOption || !task.scheduledDate ? (
                      <span className="text-gray-500">Flexible</span>
                    ) : (
                      <span className="capitalize">
                        {task.dateOption === "on-date" ? "On " : task.dateOption === "before-date" ? "Before " : ""}
                        {formatDate(task.scheduledDate)}
                        {task.timeSlot ? ` (${task.timeSlot})` : ""}
                      </span>
                    )}
                  </div>
                </div>
                {task.location && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Location
                    </Label>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {formatLocationDisplay(task.location)}
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {formatDateTime(task.createdAt)}</span>
                </div>
                {task.updatedAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <Calendar className="h-4 w-4" />
                    <span>Last Updated: {formatDateTime(task.updatedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Applications */}
          {hasPermission("task.application.list") && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Applications</CardTitle>
                  <Badge variant="secondary">
                    {applicationsPagination.total || 0}{" "}
                    {(applicationsPagination.total || 0) === 1
                      ? "application"
                      : "applications"}
                  </Badge>
                </div>
                <CardDescription>
                  Task applications and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No applications yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border border-gray-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Helper</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">
                              Proposed Amount
                            </TableHead>
                            <TableHead className="text-right">
                              Applied
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.map((app: any) => {
                          const proposedAmount =
                            app.proposedAmount ??
                            app.proposed_amount ??
                            app.proposedBudget?.amount;
                          return (
                            <TableRow key={app.applicationId}>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-medium text-sm">
                                      {(
                                        helperDetailsByProfileId.get(
                                          extractHelperProfileId(app),
                                        )?.name ||
                                        app.helperName ||
                                        app.HelperName ||
                                        extractHelperProfileId(app) ||
                                        "H"
                                      )
                                        ?.charAt(0)
                                        .toUpperCase()}
                                    </div>
                                    {hasPermission("user.view") &&
                                    extractHelperProfileId(app) ? (
                                      <Link
                                        href={`/users/${encodeURIComponent(extractHelperProfileId(app))}`}
                                        className="text-sm font-medium text-blue-700 hover:underline"
                                      >
                                        {helperDetailsByProfileId.get(
                                          extractHelperProfileId(app),
                                        )?.name || "View helper details"}
                                      </Link>
                                    ) : (
                                      <span className="text-sm font-medium text-gray-900">
                                        {helperDetailsByProfileId.get(
                                          extractHelperProfileId(app),
                                        )?.name ||
                                          app.helperName ||
                                          app.HelperName ||
                                          extractHelperProfileId(app) ||
                                          "Unknown"}
                                      </span>
                                    )}
                                  </div>
                                  {proposedAmount !== undefined ? (
                                    <p className="text-xs text-gray-500 md:hidden">
                                      Proposed: {formatCurrency(proposedAmount)}
                                    </p>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    applicationStatusColors[app.status] as any
                                  }
                                >
                                  {app.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {proposedAmount !== undefined ? (
                                  <span className="text-sm font-medium">
                                    {formatCurrency(proposedAmount)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm text-gray-500">
                                {formatDate(app.createdAt)}
                              </TableCell>
                            </TableRow>
                          );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {applicationsPagination.pages > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Showing {(applicationsPage - 1) * 10 + 1} to{" "}
                          {Math.min(
                            applicationsPage * 10,
                            applicationsPagination.total,
                          )}{" "}
                          of {applicationsPagination.total} applications
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setApplicationsPage(applicationsPage - 1)
                            }
                            disabled={applicationsPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="text-sm text-gray-600 px-2">
                            Page {applicationsPage} of{" "}
                            {applicationsPagination.pages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setApplicationsPage(applicationsPage + 1)
                            }
                            disabled={
                              applicationsPage >= applicationsPagination.pages
                            }
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Customer ID
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  {hasPermission("user.view") && customerProfileId ? (
                    <Link
                      href={`/users/${encodeURIComponent(customerProfileId)}`}
                      className="text-sm font-medium text-blue-700 hover:underline"
                    >
                      {customerDetails?.data?.name || "View customer details"}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {customerDetails?.data?.name || customerProfileId || "N/A"}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Budget
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(task.budget)}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Deadline
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">
                    {task.dateOption === "flexible" || !task.dateOption || !task.scheduledDate ? (
                      <span className="text-gray-500 font-normal">Flexible</span>
                    ) : (
                      <span className="capitalize">
                        {task.dateOption === "on-date" ? "On " : task.dateOption === "before-date" ? "Before " : ""}
                        {formatDate(task.scheduledDate)}
                        {task.timeSlot ? ` (${task.timeSlot})` : ""}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {canManageTaskCalls && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">Onboarder Verification</CardTitle>
                  {!taskCallLoading && (
                    <span
                      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${
                        taskCallStatusClasses[taskCall?.status || "not_updated"]
                      }`}
                    >
                      {taskCallStatusLabels[taskCall?.status || "not_updated"]}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {taskCallLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">
                        Call status
                      </Label>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {taskCallStatusLabels[taskCall?.status || "not_updated"]}
                      </p>
                    </div>
                    {taskCall?.followUpDate && (
                      <div>
                        <Label className="text-xs font-medium text-gray-500">
                          Follow-up date
                        </Label>
                        <p className="mt-1 text-sm font-medium text-blue-700">
                          {formatDate(taskCall.followUpDate)}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs font-medium text-gray-500">
                        Internal notes
                      </Label>
                      {taskCall?.notes?.length ? (
                        <div className="mt-2 space-y-3">
                          {taskCall.notes.map((item, index) => (
                            <div
                              key={`${item.createdAt}-${index}`}
                              className="rounded-md border border-gray-200 bg-gray-50 p-3"
                            >
                              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                {item.note}
                              </p>
                              <p className="mt-2 text-xs text-gray-500">
                                {item.createdBy?.name || "Operations"} ·{" "}
                                {formatDateTime(item.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-500">No notes added.</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Task Call Stage Dialog */}
      <Dialog
        open={stageDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setStageDialog({ open: false, status: "not_updated", followUpDate: "" });
          } else {
            setStageDialog((dialog) => ({ ...dialog, open: true }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Stage</DialogTitle>
            <DialogDescription>
              Update the verification call outcome for this posted task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={stageDialog.status}
                onValueChange={(value) =>
                  setStageDialog((dialog) => ({
                    ...dialog,
                    status: value as TaskCallStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_updated">Not Updated</SelectItem>
                  <SelectItem value="genuine">Genuine</SelectItem>
                  <SelectItem value="not_genuine">Not Genuine</SelectItem>
                  <SelectItem value="call_not_lifted">Call Not Lifted</SelectItem>
                  <SelectItem value="follow_up">Follow Up / Callback</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {stageDialog.status === "follow_up" && (
              <div className="space-y-2">
                <Label htmlFor="follow-up-date">Follow-up date *</Label>
                <input
                  id="follow-up-date"
                  type="date"
                  value={stageDialog.followUpDate}
                  onChange={(event) =>
                    setStageDialog((dialog) => ({
                      ...dialog,
                      followUpDate: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setStageDialog({ open: false, status: "not_updated", followUpDate: "" })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStageUpdate}
              disabled={updateTaskCallStatusMutation.isPending}
            >
              Save Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Call Note Dialog */}
      <Dialog
        open={noteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setNoteDialog({ open: false, note: "" });
          } else {
            setNoteDialog((dialog) => ({ ...dialog, open: true }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Internal Note</DialogTitle>
            <DialogDescription>
              Save a note for operations follow-up on this task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="task-call-note">Note</Label>
            <Textarea
              id="task-call-note"
              placeholder="Enter your note..."
              value={noteDialog.note}
              onChange={(event) =>
                setNoteDialog({ ...noteDialog, note: event.target.value })
              }
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialog({ open: false, note: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmNote}
              disabled={!noteDialog.note.trim() || addTaskCallNoteMutation.isPending}
            >
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, reason: "" });
          } else {
            setDeleteDialog((d) => ({ ...d, open: true }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot
              be undone. Please enter a reason below (required for audit).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Reason *</Label>
            <Textarea
              id="delete-reason"
              placeholder="Enter the reason for deleting this task..."
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
          } else {
            setDeleteRequestDialog((d) => ({ ...d, open: true }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Task Deletion</DialogTitle>
            <DialogDescription>
              This will send a delete request to Super Admin for "{task.title}".
              Please enter a reason below (required).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-request-reason">Reason *</Label>
            <Textarea
              id="delete-request-reason"
              placeholder="Enter the reason for requesting deletion..."
              value={deleteRequestDialog.reason}
              onChange={(e) =>
                setDeleteRequestDialog({
                  ...deleteRequestDialog,
                  reason: e.target.value,
                })
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
