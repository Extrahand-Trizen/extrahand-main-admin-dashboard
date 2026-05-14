"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  MoreHorizontal,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { listUsers, updateUser, deleteUser, AdminUser } from "@/lib/api/admin";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePermissions } from "@/lib/hooks/usePermissions";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { isSuperAdmin } = usePermissions();
  const [shiftRoleDialog, setShiftRoleDialog] = useState<{
    open: boolean;
    user: AdminUser | null;
    role: string;
  }>({ open: false, user: null, role: "" });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({ open: false, user: null });

  // Fetch Users
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => listUsers({ page, limit: 10, search }),
    placeholderData: (previousData) => previousData,
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: "active" | "suspended";
    }) => updateUser(userId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Admin status updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update status");
    },
  });

  const handleStatusChange = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    updateStatusMutation.mutate({ userId, status: newStatus });
  };

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUser(userId, { role } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated successfully");
      setShiftRoleDialog({ open: false, user: null, role: "" });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update role");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Admin user removed successfully");
      setDeleteDialog({ open: false, user: null });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to remove admin user");
    },
  });

  const primaryRoleLabel = (user: AdminUser) => {
    if (user.isSuperAdmin) return "Super Admin";
    const role = user.dashboardAccess?.[0]?.role;
    return role ? role.replace(/_/g, " ") : "Admin";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Users</h1>
          <p className="text-muted-foreground">
            Manage administrators and their access across the platform.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No admin users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.users.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isSuperAdmin ? "default" : "outline"}
                          className={user.isSuperAdmin ? "bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200" : ""}
                        >
                          {primaryRoleLabel(user)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "active" ? "default" : "destructive"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <UserCog className="mr-2 h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setShiftRoleDialog({
                                      open: true,
                                      user,
                                      role: user.dashboardAccess?.[0]?.role || "",
                                    })
                                  }
                                >
                                  Shift Role
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            {user.status === "active" ? (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() =>
                                  handleStatusChange(user.userId, user.status)
                                }
                                disabled={user.isSuperAdmin} // Prevent suspending super admins easily
                              >
                                <ShieldAlert className="mr-2 h-4 w-4" /> Suspend
                                User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600 focus:text-green-600"
                                onClick={() =>
                                  handleStatusChange(user.userId, user.status)
                                }
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />{" "}
                                Activate User
                              </DropdownMenuItem>
                            )}
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setDeleteDialog({ open: true, user })}
                                  disabled={user.isSuperAdmin}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove Role
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={shiftRoleDialog.open}
        onOpenChange={(open) =>
          setShiftRoleDialog((d) => ({ ...d, open, user: open ? d.user : null }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shift Role</DialogTitle>
            <DialogDescription>
              Update the role for this admin user. (Super Admin only)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={shiftRoleDialog.role}
              onValueChange={(value) =>
                setShiftRoleDialog((d) => ({ ...d, role: value }))
              }
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">super admin</SelectItem>
                <SelectItem value="operations_admin">operations admin</SelectItem>
                <SelectItem value="support_admin">support admin</SelectItem>
                <SelectItem value="payments_admin">payments admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShiftRoleDialog({ open: false, user: null, role: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!shiftRoleDialog.user?.userId || !shiftRoleDialog.role) {
                  toast.error("Role is required");
                  return;
                }
                updateRoleMutation.mutate({
                  userId: shiftRoleDialog.user.userId,
                  role: shiftRoleDialog.role,
                });
              }}
              disabled={!shiftRoleDialog.role || updateRoleMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((d) => ({ ...d, open, user: open ? d.user : null }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Admin Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the administrative role for{" "}
              <span className="font-semibold text-gray-900">
                {deleteDialog.user?.name}
              </span>
              ? This will revoke their access to the administration portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, user: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog.user?.userId) {
                  deleteMutation.mutate(deleteDialog.user.userId);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remove Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
