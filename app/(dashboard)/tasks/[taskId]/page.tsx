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
import { getUser } from "@/lib/api/users";
import { usePermissions } from "@/lib/hooks/usePermissions";
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

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const taskId = params.taskId as string;
  const isValidTaskId = Boolean(taskId && taskId !== "undefined" && taskId !== "null");

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

  const task = taskData?.data;
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
                          {applications.map((app: any) => (
                            <TableRow key={app.applicationId}>
                              <TableCell>
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
                                {app.proposedAmount ? (
                                  <span className="text-sm font-medium">
                                    {formatCurrency(app.proposedAmount)}
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
                          ))}
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
            </CardContent>
          </Card>
        </div>
      </div>

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
