"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import { listTaskCalls, TaskCallStatus } from "@/lib/api/task-calls";

const statusLabels: Record<TaskCallStatus, string> = {
  not_updated: "Not updated",
  genuine: "Genuine",
  not_genuine: "Not genuine",
  call_not_lifted: "Call not lifted",
  follow_up: "Follow up",
};

const statusClasses: Record<TaskCallStatus, string> = {
  not_updated: "bg-amber-50 text-amber-700 border-amber-200",
  genuine: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_genuine: "bg-red-50 text-red-700 border-red-200",
  call_not_lifted: "bg-gray-100 text-gray-700 border-gray-200",
  follow_up: "bg-blue-50 text-blue-700 border-blue-200",
};

function isOperationsRole(role?: string | null) {
  return ["operations_admin", "operation_admin", "operations"].includes(role || "");
}

export default function TaskCallsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const allowed = isOperationsRole(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ["task-calls", search, status],
    queryFn: () => listTaskCalls({ search, status, limit: 100 }),
    enabled: allowed,
    retry: false,
  });

  if (!allowed) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">
          My Task Calls is available only for operations admins.
        </p>
      </div>
    );
  }

  const rows = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Task Calls</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track and update verification calls for user posted tasks
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_280px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone, or task..."
            className="h-11 pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_updated">Not Updated</SelectItem>
            <SelectItem value="genuine">Genuine</SelectItem>
            <SelectItem value="not_genuine">Not Genuine</SelectItem>
            <SelectItem value="call_not_lifted">Call Not Lifted</SelectItem>
            <SelectItem value="follow_up">Follow Up / Callback</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Task Calls List</CardTitle>
          <Badge variant="secondary">
            {rows.length} {rows.length === 1 ? "call" : "calls"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No task calls found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Notified On</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Callback Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.notificationId}-${row.taskId}`}>
                      <TableCell className="font-medium">{row.userName}</TableCell>
                      <TableCell>{row.phone || "-"}</TableCell>
                      <TableCell className="max-w-[180px] whitespace-normal">
                        {row.taskTitle}
                      </TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{formatDate(row.notifiedOn)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusClasses[row.status]}`}
                        >
                          {statusLabels[row.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.followUpDate ? (
                          <span className="text-sm text-blue-700">
                            {formatDate(row.followUpDate)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/tasks/${encodeURIComponent(row.taskId)}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
