"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, ArrowLeft, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listDeletedTasks, permanentlyDeleteTask, restoreTask } from "@/lib/api/tasks";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { Task } from "@/types";

const getTaskIdentifier = (task: Partial<Task> & { _id?: string; id?: string }) =>
  task.taskId || task._id || task.id || "";

export default function RecycleBinPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [emptyRecycleBinDialogOpen, setEmptyRecycleBinDialogOpen] = useState(false);
  const [emptyRecycleBinConfirmation, setEmptyRecycleBinConfirmation] = useState("");
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<{
    open: boolean;
    reason: string;
  }>({
    open: false,
    reason: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", "recycle-bin", page, limit, search],
    queryFn: () =>
      listDeletedTasks({
        page,
        limit,
        search: search || undefined,
      }),
    enabled: isSuperAdmin && hasPermission("task.list"),
    retry: false,
  });

  const restoreMutation = useMutation({
    mutationFn: (taskId: string) => restoreTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "recycle-bin"] });
      toast.success("Works restored successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to restore works");
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason?: string }) =>
      permanentlyDeleteTask(taskId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "recycle-bin"] });
      toast.success("Works permanently deleted");
      setPermanentDeleteDialog({ open: false, reason: "" });
      setSelectedTask(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to permanently delete works");
    },
  });

  const emptyRecycleBinMutation = useMutation({
    mutationFn: async () => {
      const deletedTasks: Task[] = [];
      let currentPage = 1;
      let totalPages = 1;
      const pageLimit = 100;

      do {
        const response = await listDeletedTasks({
          page: currentPage,
          limit: pageLimit,
        });
        if (!response.success || !Array.isArray(response.data) || !response.pagination) {
          throw new Error(response.error || "Failed to load all deleted works");
        }
        deletedTasks.push(...response.data);
        totalPages = response.pagination.pages;
        currentPage += 1;
      } while (currentPage <= totalPages);

      const taskIds = Array.from(
        new Set(
          deletedTasks
            .map((task) =>
              getTaskIdentifier(task as Partial<Task> & { _id?: string; id?: string }),
            )
            .filter(Boolean),
        ),
      );
      if (
        deletedTasks.some(
          (task) =>
            !getTaskIdentifier(task as Partial<Task> & { _id?: string; id?: string }),
        )
      ) {
        throw new Error("Some deleted works are missing identifiers. Nothing was deleted.");
      }

      let deletedCount = 0;
      const failures: string[] = [];
      for (const taskId of taskIds) {
        try {
          await permanentlyDeleteTask(taskId, "Recycle bin emptied by Super Admin");
          deletedCount += 1;
        } catch (deleteError) {
          failures.push(
            deleteError instanceof Error ? deleteError.message : String(deleteError),
          );
        }
      }

      return { total: taskIds.length, deletedCount, failures };
    },
    onSuccess: ({ total, deletedCount, failures }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEmptyRecycleBinDialogOpen(false);
      setEmptyRecycleBinConfirmation("");
      setPage(1);
      setSearch("");
      if (failures.length > 0) {
        toast.error(
          `Permanently deleted ${deletedCount} of ${total} works. ${failures.length} could not be deleted. ${failures[0]}`,
        );
      } else if (total === 0) {
        toast.info("The recycle bin is already empty.");
      } else {
        toast.success(`Recycle bin emptied. ${deletedCount} works permanently deleted.`);
      }
    },
    onError: (mutationError: Error) => {
      toast.error(mutationError.message || "Failed to empty recycle bin");
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Super Admin access required.</p>
      </div>
    );
  }

  const tasks = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recycle Bin</h1>
            <p className="mt-1 text-sm text-gray-600">Deleted works (restorable)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{pagination.total} deleted</Badge>
          <Button
            variant="destructive"
            onClick={() => {
              setEmptyRecycleBinConfirmation("");
              setEmptyRecycleBinDialogOpen(true);
            }}
            disabled={
              emptyRecycleBinMutation.isPending ||
              restoreMutation.isPending ||
              permanentDeleteMutation.isPending
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {emptyRecycleBinMutation.isPending ? "Emptying..." : "Empty Recycle Bin"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search deleted works..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-gray-600" />
            Deleted Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data || error || tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No deleted works found</div>
          ) : (
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Works</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Deleted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const taskIdentifier = getTaskIdentifier(
                      task as Partial<Task> & { _id?: string; id?: string },
                    );
                    const taskWithPoster = task as Task & {
                      CustomerId?: string;
                      userName?: string;
                      requesterName?: string;
                    };
                    const customerId = task.customerId || taskWithPoster.CustomerId;
                    const customerName =
                      task.customerName ||
                      taskWithPoster.userName ||
                      taskWithPoster.requesterName ||
                      customerId ||
                      "Unknown";
                    return (
                      <TableRow key={taskIdentifier || `${task.title}-${task.createdAt}`}>
                        <TableCell>
                          <div className="font-medium text-gray-900">{task.title}</div>
                          <div className="text-xs text-gray-500">{taskIdentifier}</div>
                        </TableCell>
                        <TableCell>
                          {customerId ? (
                            <Link
                              href={`/users/${customerId}`}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {customerName}
                            </Link>
                          ) : (
                            <span className="text-gray-500">{customerName}</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{task.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {formatDate((task as any).deletedAt || task.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (!taskIdentifier) {
                                  toast.error("Works identifier missing");
                                  return;
                                }
                                restoreMutation.mutate(taskIdentifier);
                              }}
                              disabled={
                                restoreMutation.isPending ||
                                permanentDeleteMutation.isPending ||
                                emptyRecycleBinMutation.isPending
                              }
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (!taskIdentifier) {
                                  toast.error("Works identifier missing");
                                  return;
                                }
                                setSelectedTask(task as Task);
                                setPermanentDeleteDialog({ open: true, reason: "" });
                              }}
                              disabled={
                                permanentDeleteMutation.isPending ||
                                restoreMutation.isPending ||
                                emptyRecycleBinMutation.isPending
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={emptyRecycleBinDialogOpen}
        onOpenChange={(open) => {
          if (!open && !emptyRecycleBinMutation.isPending) {
            setEmptyRecycleBinDialogOpen(false);
            setEmptyRecycleBinConfirmation("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Empty Recycle Bin Permanently?</DialogTitle>
            <DialogDescription>
              This permanently deletes every work in the recycle bin, including works not shown by the current search. This action cannot be undone. Type EMPTY to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="empty-recycle-bin-confirmation">Confirmation *</Label>
            <Input
              id="empty-recycle-bin-confirmation"
              value={emptyRecycleBinConfirmation}
              onChange={(event) => setEmptyRecycleBinConfirmation(event.target.value)}
              placeholder="Type EMPTY"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEmptyRecycleBinDialogOpen(false);
                setEmptyRecycleBinConfirmation("");
              }}
              disabled={emptyRecycleBinMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => emptyRecycleBinMutation.mutate()}
              disabled={
                emptyRecycleBinConfirmation !== "EMPTY" ||
                emptyRecycleBinMutation.isPending
              }
            >
              {emptyRecycleBinMutation.isPending ? "Deleting..." : "Delete All Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={permanentDeleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setPermanentDeleteDialog({ open: false, reason: "" });
            setSelectedTask(null);
          } else {
            setPermanentDeleteDialog((d) => ({ ...d, open: true }));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete permanently</DialogTitle>
            <DialogDescription>
              {selectedTask ? (
                <>This will permanently delete "{selectedTask.title}".</>
              ) : (
                <>This will permanently delete the selected works.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="permanent-delete-reason">Reason (optional)</Label>
            <Textarea
              id="permanent-delete-reason"
              placeholder="Add a reason for the permanent delete..."
              value={permanentDeleteDialog.reason}
              onChange={(e) =>
                setPermanentDeleteDialog({
                  ...permanentDeleteDialog,
                  reason: e.target.value,
                })
              }
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermanentDeleteDialog({ open: false, reason: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!selectedTask || permanentDeleteMutation.isPending}
              onClick={() => {
                if (!selectedTask) {
                  return;
                }
                const taskIdentifier = getTaskIdentifier(
                  selectedTask as Partial<Task> & { _id?: string; id?: string },
                );
                if (!taskIdentifier) {
                  toast.error("Works identifier missing");
                  return;
                }
                const reason = permanentDeleteDialog.reason.trim();
                permanentDeleteMutation.mutate({
                  taskId: taskIdentifier,
                  reason: reason || undefined,
                });
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
