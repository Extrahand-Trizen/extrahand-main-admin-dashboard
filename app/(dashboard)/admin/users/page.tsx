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
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileText,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import {
  listUsers,
  updateUser,
  deleteUser,
  AdminUser,
  getAdminUserAssignmentsSummary,
  transferAndDeleteAdminUser,
  AssignmentsSummary,
  TransferAndDeleteResult,
} from "@/lib/api/admin";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePermissions } from "@/lib/hooks/usePermissions";

// ─── Delete Flow Step Type ──────────────────────────────────────────────────
type DeleteStep =
  | "idle"
  | "checking"          // Step 1: loading spinner while fetching summary
  | "transfer_needed"   // Step 2: show transfer dialog (has assignments)
  | "transferring"      // Step 2b: transfer in progress
  | "transfer_done"     // Step 3: transfer complete, show final delete confirm
  | "no_transfer"       // Step 3 (direct): no assignments, show simple delete confirm
  | "deleting";         // Final deletion in progress

interface DeleteFlowState {
  user: AdminUser | null;
  step: DeleteStep;
  summary: AssignmentsSummary | null;
  transferResult: TransferAndDeleteResult | null;
}

// ─── Component ──────────────────────────────────────────────────────────────
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

  // Delete flow state
  const [deleteFlow, setDeleteFlow] = useState<DeleteFlowState>({
    user: null,
    step: "idle",
    summary: null,
    transferResult: null,
  });

  // ── Fetch Users ─────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => listUsers({ page, limit: 10, search }),
    placeholderData: (previousData) => previousData,
  });

  // ── Update Status Mutation ───────────────────────────────────────────────
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

  // ── Shift Role Mutation ──────────────────────────────────────────────────
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

  // ── Simple Delete Mutation (no assignments case) ─────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Admin user deleted successfully");
      setDeleteFlow({ user: null, step: "idle", summary: null, transferResult: null });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete admin user");
      setDeleteFlow((d) => ({ ...d, step: d.summary?.hasAssignments ? "transfer_done" : "no_transfer" }));
    },
  });


  // ── Delete Flow Handlers ─────────────────────────────────────────────────

  /** Step 1: Triggered when "Delete User" is clicked from dropdown */
  const handleDeleteClick = async (user: AdminUser) => {
    setDeleteFlow({ user, step: "checking", summary: null, transferResult: null });
    try {
      const summary = await getAdminUserAssignmentsSummary(user.userId);
      if (summary.hasAssignments) {
        setDeleteFlow({ user, step: "transfer_needed", summary, transferResult: null });
      } else {
        setDeleteFlow({ user, step: "no_transfer", summary, transferResult: null });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to check assignments");
      setDeleteFlow({ user: null, step: "idle", summary: null, transferResult: null });
    }
  };

  /** Step 2: User clicks "Transfer & Proceed" */
  const handleTransferAndProceed = async () => {
    if (!deleteFlow.user) return;
    setDeleteFlow((d) => ({ ...d, step: "transferring" }));
    try {
      const result = await transferAndDeleteAdminUser(deleteFlow.user.userId);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Admin user deleted and assignments redistributed successfully");
      setDeleteFlow({ user: null, step: "idle", summary: null, transferResult: null });
    } catch (err: any) {
      const msg = err?.message || "Failed to transfer and delete";
      toast.error(msg);
      setDeleteFlow((d) => ({ ...d, step: "transfer_needed" }));
    }
  };

  /** Step 3: Final delete (no-transfer path only) */
  const handleFinalDelete = () => {
    if (!deleteFlow.user) return;
    setDeleteFlow((d) => ({ ...d, step: "deleting" }));
    deleteMutation.mutate(deleteFlow.user.userId);
  };

  const closeDeleteFlow = () => {
    if (deleteFlow.step === "transferring" || deleteFlow.step === "deleting") return;
    setDeleteFlow({ user: null, step: "idle", summary: null, transferResult: null });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const primaryRoleLabel = (user: AdminUser) => {
    if (user.isSuperAdmin) return "Super Admin";
    const role = user.dashboardAccess?.[0]?.role;
    return role ? role.replace(/_/g, " ") : "Admin";
  };

  const isDeleteFlowOpen = deleteFlow.step !== "idle";
  const isDeleteFlowBusy = deleteFlow.step === "checking" || deleteFlow.step === "transferring" || deleteFlow.step === "deleting";

  // ── Render ───────────────────────────────────────────────────────────────
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
                                className="text-amber-600 focus:text-amber-600"
                                onClick={() =>
                                  handleStatusChange(user.userId, user.status)
                                }
                                disabled={user.isSuperAdmin}
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
                                  onClick={() => handleDeleteClick(user)}
                                  disabled={user.isSuperAdmin}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete User
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

      {/* ─── Shift Role Dialog ──────────────────────────────────────────── */}
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

      {/* ─── Delete Flow Dialog ─────────────────────────────────────────── */}
      <Dialog open={isDeleteFlowOpen} onOpenChange={(open) => { if (!open) closeDeleteFlow(); }}>
        <DialogContent className="max-w-lg">

          {/* ── Step 1: Checking assignments ── */}
          {deleteFlow.step === "checking" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  Checking Assignments...
                </DialogTitle>
                <DialogDescription>
                  Checking if <span className="font-semibold text-foreground">{deleteFlow.user?.name}</span> has any assigned works or Aadhaar follow-ups before deletion.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            </>
          )}

          {/* ── Step 2: Transfer Needed ── */}
          {(deleteFlow.step === "transfer_needed" || deleteFlow.step === "transferring") && deleteFlow.summary && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-600">
                  <ArrowRightLeft className="h-5 w-5" />
                  Transfer Assignments Before Deletion
                </DialogTitle>
                <DialogDescription>
                  <span className="font-semibold text-foreground">{deleteFlow.user?.name}</span> currently has active assignments that must be transferred to other operations admins before this account can be deleted.
                </DialogDescription>
              </DialogHeader>

              {/* Assignment counts */}
              <div className="space-y-3 my-2">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Current Assignments of {deleteFlow.user?.name}:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Task Assignments</p>
                        <p className="text-lg font-bold text-foreground">{deleteFlow.summary.taskAssignmentCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                      <CreditCard className="h-4 w-4 text-purple-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Aadhaar Follow-ups</p>
                        <p className="text-lg font-bold text-foreground">{deleteFlow.summary.aadhaarAssignmentCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipients */}
                {deleteFlow.summary.remainingActiveOpsAdmins.length > 0 ? (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="h-4 w-4" /> Will be redistributed equally to:
                    </p>
                    <div className="space-y-1.5">
                      {deleteFlow.summary.remainingActiveOpsAdmins.map((admin) => (
                        <div key={admin.userId} className="flex items-center gap-2 text-sm">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{admin.name}</span>
                          <span className="text-muted-foreground text-xs">({admin.email})</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      {deleteFlow.summary.totalAssignments} total assignments will be split equally (round-robin) among {deleteFlow.summary.remainingActiveOpsAdmins.length} active admin{deleteFlow.summary.remainingActiveOpsAdmins.length > 1 ? "s" : ""}.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">
                      <strong>Cannot delete:</strong> There are no other active operations admins to transfer this user's assignments to. Please add another operations admin first.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={closeDeleteFlow}
                  disabled={deleteFlow.step === "transferring"}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleTransferAndProceed}
                  disabled={
                    deleteFlow.step === "transferring" ||
                    deleteFlow.summary.remainingActiveOpsAdmins.length === 0
                  }
                >
                  {deleteFlow.step === "transferring" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transferring & Deleting...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Transfer & Delete Account
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Step 3 (no-transfer path): Simple final confirm ── */}
          {(deleteFlow.step === "no_transfer" || deleteFlow.step === "deleting") && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Delete Admin Account
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2 my-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-700">
                    <p>You are about to permanently delete the account for:</p>
                    <p className="font-bold mt-1">{deleteFlow.user?.name}</p>
                    <p className="text-xs text-red-600">{deleteFlow.user?.email}</p>
                    <p className="mt-2">This user has no assigned works or Aadhaar follow-ups. The account will be deleted immediately and cannot be recovered.</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={closeDeleteFlow}
                  disabled={deleteFlow.step === "deleting"}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleFinalDelete}
                  disabled={deleteFlow.step === "deleting"}
                >
                  {deleteFlow.step === "deleting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}
