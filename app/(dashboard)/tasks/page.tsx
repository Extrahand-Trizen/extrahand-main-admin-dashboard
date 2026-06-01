"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "@/lib/category-options";
import { toast } from "sonner";
import { Task } from "@/types";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/LoadingSkeleton";

const getTaskIdentifier = (task: Partial<Task> & { _id?: string; id?: string }) =>
  task.taskId || task._id || task.id || "";

const statusColors: Record<string, string> = {
  open: "success",
  in_progress: "warning",
  completed: "default",
  cancelled: "destructive",
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
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
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

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "tasks",
      search,
      statusFilter,
      categoryFilter,
      followUpFilter,
      assignedToFilter,
      page,
      limit,
    ],
    queryFn: () =>
      listTasks({
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        followUpStatus:
          followUpFilter !== "all" ? followUpFilter : undefined,
        assignedTo: assignedToFilter !== "all" ? assignedToFilter : undefined,
        page,
        limit,
      }),
    enabled: hasPermission("task.list"),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      deleteTask(taskId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted successfully");
      setDeleteDialog({ open: false, reason: "" });
      setSelectedTask(null);
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
      toast.error("Task identifier missing. Please refresh and try again.");
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
      toast.error("Task identifier missing. Please refresh and try again.");
      return;
    }
    deleteRequestMutation.mutate({
      taskId: taskIdentifier,
      reason: deleteRequestDialog.reason,
    });
  };

  const tasks = data?.data || [];
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
          You don't have permission to view tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and monitor platform tasks
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
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search tasks..."
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
                  <SelectItem value="santhosh reddy">santhosh reddy</SelectItem>
                  <SelectItem value="durgamshiva">durgamshiva</SelectItem>
                  <SelectItem value="tadembharath">tadembharath</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Tasks List</CardTitle>
            <Badge variant="secondary">
              {pagination.total} {pagination.total === 1 ? "task" : "tasks"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data || error || tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No works found</div>
          ) : (
            <>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">
                        Task
                      </TableHead>
                      <TableHead className="sm:hidden">Details</TableHead>
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
                      <TableHead className="hidden lg:table-cell">
                        Budget
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Created
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const taskIdentifier = getTaskIdentifier(
                        task as Partial<Task> & { _id?: string; id?: string },
                      );
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
                              <Badge variant={statusColors[task.status] as any}>
                                {task.status}
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
                        <TableCell className="hidden md:table-cell">
                          {task.category && (
                            <Badge variant="outline">{task.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={statusColors[task.status] as any}>
                            {task.status}
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
                          {task.assignedTo ? (
                            <span className="font-medium text-gray-800 capitalize">
                              {task.assignedTo.name}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm font-medium">
                          {formatCurrency(task.budget)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {formatDate(task.createdAt)}
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
                                  Delete Task
                                </DropdownMenuItem>
                              )}
                              {canRequestDelete && (
                                <DropdownMenuItem onClick={() => handleRequestDelete(task)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Request Task Delete
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
                    {pagination.total} tasks
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
            <DialogTitle>Delete Task</DialogTitle>
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
              placeholder="Enter the reason for deleting this work..."
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
            <DialogTitle>Request Task Deletion</DialogTitle>
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
