"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  MoreVertical,
  Ban,
  UserX,
  UserCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import {
  listUsers,
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
} from "@/lib/api/users";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { User } from "@/types";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/LoadingSkeleton";

const statusColors: Record<string, string> = {
  active: "success",
  suspended: "warning",
  banned: "destructive",
  inactive: "secondary",
};

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "ban" | "unban" | "suspend" | "unsuspend" | null;
    reason: string;
  }>({
    open: false,
    action: null,
    reason: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["users", search, statusFilter, roleFilter, page, limit],
    queryFn: () =>
      listUsers({
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        page,
        limit,
      }),
    enabled: hasPermission("user.list"),
    retry: false,
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      banUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User banned successfully");
      setActionDialog({ open: false, action: null, reason: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to ban user");
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User unbanned successfully");
      setActionDialog({ open: false, action: null, reason: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unban user");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      suspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User suspended successfully");
      setActionDialog({ open: false, action: null, reason: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to suspend user");
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: (userId: string) => unsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User unsuspended successfully");
      setActionDialog({ open: false, action: null, reason: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unsuspend user");
    },
  });

  const handleAction = (
    user: User,
    action: "ban" | "unban" | "suspend" | "unsuspend",
  ) => {
    setSelectedUser(user);
    setActionDialog({ open: true, action, reason: "" });
  };

  const confirmAction = () => {
    if (!selectedUser || !actionDialog.action) return;

    const requiresReason =
      actionDialog.action === "ban" || actionDialog.action === "suspend";
    if (requiresReason && !actionDialog.reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    switch (actionDialog.action) {
      case "ban":
        banMutation.mutate({
          userId: selectedUser.userId,
          reason: actionDialog.reason,
        });
        break;
      case "unban":
        unbanMutation.mutate(selectedUser.userId);
        break;
      case "suspend":
        suspendMutation.mutate({
          userId: selectedUser.userId,
          reason: actionDialog.reason,
        });
        break;
      case "unsuspend":
        unsuspendMutation.mutate(selectedUser.userId);
        break;
    }
  };

  const users = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  };

  if (!hasPermission("user.list")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          You don't have permission to view users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage platform users and their accounts
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="tasker">Tasker</SelectItem>
                  <SelectItem value="poster">Poster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Users List</CardTitle>
            <Badge variant="secondary">
              {pagination.total} {pagination.total === 1 ? "user" : "users"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data || error || users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">
                        User
                      </TableHead>
                      <TableHead className="sm:hidden">Details</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Role
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Status
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Created
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-medium">
                                {user.name?.charAt(0).toUpperCase() ||
                                  user.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate">
                                  {user.name || "No name"}
                                </div>
                                <div className="text-sm text-gray-500 truncate">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:hidden">
                              <Badge variant={statusColors[user.status] as any}>
                                {user.status}
                              </Badge>
                              <Badge variant="outline">{user.role}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={statusColors[user.status] as any}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/users/${user.userId}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {user.status === "banned" &&
                                hasPermission("user.unban") && (
                                  <DropdownMenuItem
                                    onClick={() => handleAction(user, "unban")}
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Unban User
                                  </DropdownMenuItem>
                                )}
                              {user.status !== "banned" &&
                                hasPermission("user.ban") && (
                                  <DropdownMenuItem
                                    onClick={() => handleAction(user, "ban")}
                                    className="text-red-600"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Ban User
                                  </DropdownMenuItem>
                                )}
                              {user.status === "suspended" &&
                                hasPermission("user.unsuspend") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleAction(user, "unsuspend")
                                    }
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Unsuspend User
                                  </DropdownMenuItem>
                                )}
                              {user.status !== "suspended" &&
                                hasPermission("user.suspend") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleAction(user, "suspend")
                                    }
                                    className="text-yellow-600"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Suspend User
                                  </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
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
                    {pagination.total} users
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

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "ban" && "Ban User"}
              {actionDialog.action === "unban" && "Unban User"}
              {actionDialog.action === "suspend" && "Suspend User"}
              {actionDialog.action === "unsuspend" && "Unsuspend User"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Are you sure you want to {actionDialog.action}{" "}
                  {selectedUser.name || selectedUser.email}?
                  {(actionDialog.action === "ban" ||
                    actionDialog.action === "suspend") && (
                    <span className="block mt-2 text-red-600">
                      This action requires a reason.
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {(actionDialog.action === "ban" ||
            actionDialog.action === "suspend") && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for this action..."
                value={actionDialog.reason}
                onChange={(e) =>
                  setActionDialog({ ...actionDialog, reason: e.target.value })
                }
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, action: null, reason: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant={
                actionDialog.action === "ban" ? "destructive" : "default"
              }
              onClick={confirmAction}
              disabled={
                (actionDialog.action === "ban" ||
                  actionDialog.action === "suspend") &&
                !actionDialog.reason.trim()
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
