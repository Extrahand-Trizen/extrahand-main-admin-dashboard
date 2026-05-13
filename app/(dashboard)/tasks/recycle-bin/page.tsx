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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listDeletedTasks, restoreTask } from "@/lib/api/tasks";
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
      toast.success("Task restored successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to restore task");
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
            <p className="mt-1 text-sm text-gray-600">Deleted tasks (restorable)</p>
          </div>
        </div>
        <Badge variant="secondary">{pagination.total} deleted</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search deleted tasks..."
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
            Deleted Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data || error || tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No deleted tasks found</div>
          ) : (
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
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
                    return (
                      <TableRow key={taskIdentifier || `${task.title}-${task.createdAt}`}>
                        <TableCell>
                          <div className="font-medium text-gray-900">{task.title}</div>
                          <div className="text-xs text-gray-500">{taskIdentifier}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{task.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {formatDate((task as any).deletedAt || task.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!taskIdentifier) {
                                toast.error("Task identifier missing");
                                return;
                              }
                              restoreMutation.mutate(taskIdentifier);
                            }}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
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
    </div>
  );
}

