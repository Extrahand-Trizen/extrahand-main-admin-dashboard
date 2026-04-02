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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, RefreshCw, XCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  listInvites,
  createInvite,
  resendInvite,
  cancelInvite,
  DashboardType,
} from "@/lib/api/admin";
import { formatDate } from "@/lib/utils"; // Assuming this utility exists

export default function AdminInvitesPage() {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch Invites
  const { data, isLoading } = useQuery({
    queryKey: ["admin-invites", page],
    queryFn: () => listInvites({ page, limit: 10 }),
  });

  // Create Invite Mutation
  const createMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
      setIsCreateOpen(false);
      toast.success("Invitation sent successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to send invitation");
    },
  });

  // Resend Mutation
  const resendMutation = useMutation({
    mutationFn: resendInvite,
    onSuccess: () => {
      toast.success("Invitation resent successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to resend invitation");
    },
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: cancelInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invites"] });
      toast.success("Invitation cancelled");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to cancel invitation");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      email: formData.get("email") as string,
      dashboardType: formData.get("dashboardType") as DashboardType,
      role: formData.get("role") as string,
      customMessage: formData.get("customMessage") as string,
    });
  };

  const getRoleOptions = (dashboardType: string) => {
    switch (dashboardType) {
      case "main_admin":
        return ["platform_admin", "operations", "support", "trust"]; // Based on permissions.ts
      case "payment_admin":
        return ["payment_manager", "payment_viewer"]; // Placeholder roles
      case "content_admin":
        return ["content_manager", "editor", "moderator"]; // Placeholder roles
      case "leads_onboarding":
        return ["onboarding_manager", "verifier"]; // Placeholder roles
      default:
        return ["admin", "viewer"];
    }
  };

  const [selectedDashboard, setSelectedDashboard] =
    useState<string>("main_admin");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Admin Invitations
          </h1>
          <p className="text-muted-foreground">
            Invite new administrators to access specific dashboards.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite New Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Admin Invitation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="admin@extrahand.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dashboardType">Dashboard</Label>
                  <Select
                    name="dashboardType"
                    defaultValue="main_admin"
                    onValueChange={setSelectedDashboard}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Dashboard" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main_admin">Main Admin</SelectItem>
                      <SelectItem value="payment_admin">
                        Payment Admin
                      </SelectItem>
                      <SelectItem value="content_admin">
                        Content Admin
                      </SelectItem>
                      <SelectItem value="leads_onboarding">
                        Leads Onboarding
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRoleOptions(selectedDashboard).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.replace("_", " ").toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customMessage">Message (Optional)</Label>
                <Textarea
                  id="customMessage"
                  name="customMessage"
                  placeholder="Welcome to the team..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Invite
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitation History</CardTitle>
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
                  <TableHead>Email</TableHead>
                  <TableHead>Dashboard</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent By</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.invites.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No invitations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.invites.map((invite) => (
                    <TableRow key={invite.inviteId}>
                      <TableCell className="font-medium">
                        {invite.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{invite.dashboardType}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {invite.role.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invite.status === "accepted"
                              ? "default"
                              : invite.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {invite.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{invite.invitedByName}</TableCell>
                      <TableCell>{formatDate(invite.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {invite.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Resend Invite"
                              onClick={() =>
                                resendMutation.mutate(invite.inviteId)
                              }
                              disabled={resendMutation.isPending}
                            >
                              <RefreshCw
                                className={`h-4 w-4 ${resendMutation.isPending ? "animate-spin" : ""}`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cancel Invite"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() =>
                                cancelMutation.mutate(invite.inviteId)
                              }
                              disabled={cancelMutation.isPending}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
