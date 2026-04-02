"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  User,
  FileText,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
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
  getTaskApplications,
  updateApplicationStatus,
} from "@/lib/api/tasks";
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

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const taskId = params.taskId as string;
  const isEditMode = searchParams.get("edit") === "true";

  const [deleteDialog, setDeleteDialog] = useState<{
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
    enabled: !!taskId && hasPermission("task.view"),
  });

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ["task-applications", taskId, applicationsPage],
    queryFn: () =>
      getTaskApplications(taskId, { page: applicationsPage, limit: 10 }),
    enabled: !!taskId && hasPermission("task.application.list"),
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

  const confirmDelete = () => {
    if (!deleteDialog.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    deleteMutation.mutate({ taskId, reason: deleteDialog.reason });
  };

  const handleApplicationStatusChange = (
    applicationId: string,
    status: string,
  ) => {
    updateApplicationStatusMutation.mutate({ applicationId, status });
  };

  const task = taskData?.data;
  const applications = applicationsData?.data || [];
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
            <p className="mt-1 text-sm text-gray-600">Task ID: {task.taskId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("task.update") && (
            <Button variant="outline" asChild>
              <Link href={`/tasks/${taskId}?edit=true`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {hasPermission("task.delete") && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
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
                      {task.location}
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
                <CardTitle>Applications</CardTitle>
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
                            <TableHead>Tasker</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">
                              Proposed Amount
                            </TableHead>
                            <TableHead className="hidden lg:table-cell">
                              Applied
                            </TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.map((app: any) => (
                            <TableRow key={app.applicationId}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-medium text-sm">
                                    {app.taskerId?.charAt(0).toUpperCase() ||
                                      "T"}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {app.taskerId || "Unknown"}
                                  </span>
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
                              <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                                {formatDate(app.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                {hasPermission("task.application.update") && (
                                  <Select
                                    value={app.status}
                                    onValueChange={(status) =>
                                      handleApplicationStatusChange(
                                        app.applicationId,
                                        status,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">
                                        Pending
                                      </SelectItem>
                                      <SelectItem value="accepted">
                                        Accept
                                      </SelectItem>
                                      <SelectItem value="rejected">
                                        Reject
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
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
                  Poster ID
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {task.posterId}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">
                  Budget
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
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
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot
              be undone.
              <span className="block mt-2 text-red-600">
                This action requires a reason.
              </span>
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
    </div>
  );
}
