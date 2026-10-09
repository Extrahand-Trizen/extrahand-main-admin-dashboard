"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Settings, Wrench, Users, GripVertical, CheckCircle2, ArrowUp, ArrowDown } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTaskPostedEmailSettings,
  getRoundRobinTeamSettings,
  listUsers,
  RoundRobinMember,
  TaskPostedEmailSettings,
  updateRoundRobinTeamSettings,
  updateTaskPostedEmailSettings,
} from "@/lib/api/admin";

export default function AdminSettingsPage() {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<TaskPostedEmailSettings>({ recipients: [], excludedPhones: [] });
    const [selectedAdminEmail, setSelectedAdminEmail] = useState("");
    const [customEmail, setCustomEmail] = useState("");
    const [phoneInput, setPhoneInput] = useState("");

    // Round-robin support team assignment state
    const [teamMembers, setTeamMembers] = useState<RoundRobinMember[]>([]);
    const [selectedNewAdminEmail, setSelectedNewAdminEmail] = useState("");
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const settingsQuery = useQuery({
      queryKey: ["task-posted-email-settings"],
      queryFn: getTaskPostedEmailSettings,
    });
    const adminsQuery = useQuery({
      queryKey: ["task-posted-email-admin-users"],
      queryFn: () => listUsers({ limit: 100, dashboardType: "main_admin", status: "active" }),
    });
    const roundRobinQuery = useQuery({
      queryKey: ["round-robin-team-settings"],
      queryFn: getRoundRobinTeamSettings,
    });

    useEffect(() => {
      if (settingsQuery.data) setSettings(settingsQuery.data);
    }, [settingsQuery.data]);

    useEffect(() => {
      if (roundRobinQuery.data?.teamMembers) {
        setTeamMembers(roundRobinQuery.data.teamMembers);
      }
    }, [roundRobinQuery.data]);

    const saveRoundRobinMutation = useMutation({
      mutationFn: (emails: string[]) => updateRoundRobinTeamSettings(emails),
      onSuccess: (data) => {
        if (data?.teamMembers) setTeamMembers(data.teamMembers);
        queryClient.invalidateQueries({ queryKey: ["round-robin-team-settings"] });
        toast.success("Support team assignment order saved");
      },
      onError: (error: any) => {
        toast.error(error?.message || "Failed to save team assignment order");
      },
    });

    const saveMutation = useMutation({
      mutationFn: updateTaskPostedEmailSettings,
      onSuccess: (data) => {
        setSettings(data);
        queryClient.setQueryData(["task-posted-email-settings"], data);
        toast.success("Work-posted email settings saved");
      },
      onError: (error: any) => toast.error(error?.message || "Failed to save settings"),
    });

    const adminUsers = adminsQuery.data?.users || [];
    const availableAdmins = adminUsers.filter((admin) => !settings.recipients.includes(admin.email));

    const availableOpsAdminsToAdd = (roundRobinQuery.data?.availableOpsAdmins || []).filter(
      (admin) => !teamMembers.some((m) => m.email.toLowerCase() === admin.email.toLowerCase()),
    );

    const moveMember = (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= teamMembers.length) return;
      const updated = [...teamMembers];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      setTeamMembers(updated);
    };

    const removeMember = (indexToRemove: number) => {
      if (teamMembers.length <= 1) {
        toast.error("At least one member is required in the round-robin order");
        return;
      }
      setTeamMembers(teamMembers.filter((_, idx) => idx !== indexToRemove));
    };

    const addTeamMember = () => {
      if (!selectedNewAdminEmail) return;
      const adminToAdd =
        roundRobinQuery.data?.availableOpsAdmins?.find(
          (a) => a.email.toLowerCase() === selectedNewAdminEmail.toLowerCase(),
        ) ||
        adminUsers.find(
          (a) => a.email.toLowerCase() === selectedNewAdminEmail.toLowerCase(),
        );

      if (!adminToAdd) return;
      setTeamMembers([
        ...teamMembers,
        {
          userId: adminToAdd.userId,
          name: adminToAdd.name,
          email: adminToAdd.email,
        },
      ]);
      setSelectedNewAdminEmail("");
    };

    const addRecipient = () => {
      if (!selectedAdminEmail) return;
      setSettings((current) => ({
        ...current,
        recipients: [...current.recipients, selectedAdminEmail],
      }));
      setSelectedAdminEmail("");
    };

    const addCustomEmail = () => {
      const email = customEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Enter a valid email address");
        return;
      }
      if (settings.recipients.includes(email)) {
        toast.error("This email is already a recipient");
        return;
      }
      setSettings((current) => ({
        ...current,
        recipients: [...current.recipients, email],
      }));
      setCustomEmail("");
    };

    const addPhone = () => {
      const phone = phoneInput.trim();
      if (!phone) return;
      if (settings.excludedPhones.includes(phone)) {
        toast.error("This phone number is already excluded");
        return;
      }
      setSettings((current) => ({
        ...current,
        excludedPhones: [...current.excludedPhones, phone],
      }));
      setPhoneInput("");
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          <p className="mt-2 text-sm text-gray-600">Operational controls and platform configuration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-amber-600" />
              Settings Console
            </CardTitle>
            <CardDescription>Configure who receives work-posted email alerts and which customers are excluded.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Shield className="h-4 w-4 text-gray-500" />
                Access Control Rules
              </div>
              <Badge variant="secondary">Configured in Admin Users</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Wrench className="h-4 w-4 text-gray-500" />
                Feature Settings
              </div>
              <Badge variant="outline">Coming soon</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-amber-600" />Work Posted Email Notification</CardTitle>
            <CardDescription>New Post Work and Book Now alerts are sent to these recipients unless the customer phone is excluded below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <div>
                <Label>Recipients</Label>
                <p className="text-sm text-gray-500">Select recipients from active main-admin users.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
                  value={selectedAdminEmail}
                  onChange={(event) => setSelectedAdminEmail(event.target.value)}
                  disabled={adminsQuery.isLoading || availableAdmins.length === 0}
                >
                  <option value="">Select an admin user</option>
                  {availableAdmins.map((admin) => <option key={admin.userId} value={admin.email}>{admin.name} ({admin.email})</option>)}
                </select>
                <Button type="button" variant="outline" onClick={addRecipient} disabled={!selectedAdminEmail}><Plus />Add recipient</Button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  value={customEmail}
                  onChange={(event) => setCustomEmail(event.target.value)}
                  placeholder="Enter custom email address"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomEmail();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addCustomEmail} disabled={!customEmail.trim()}><Plus />Add custom email</Button>
              </div>
              <div className="space-y-2">
                {settings.recipients.map((email) => (
                  <div key={email} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>{email}</span>
                    <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${email}`} onClick={() => setSettings((current) => ({ ...current, recipients: current.recipients.filter((item) => item !== email) }))}><Trash2 className="text-red-600" /></Button>
                  </div>
                ))}
                {!settings.recipients.length && <p className="text-sm text-amber-700">No recipients selected.</p>}
              </div>
            </section>

            <section className="space-y-3 border-t pt-5">
              <div>
                <Label>Exclusions</Label>
                <p className="text-sm text-gray-500">Works from these customer phone numbers will not trigger an email.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} placeholder="Customer phone number" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addPhone(); } }} />
                <Button type="button" variant="outline" onClick={addPhone} disabled={!phoneInput.trim()}><Plus />Add exclusion</Button>
              </div>
              <div className="space-y-2">
                {settings.excludedPhones.map((phone) => (
                  <div key={phone} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>{phone}</span>
                    <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${phone}`} onClick={() => setSettings((current) => ({ ...current, excludedPhones: current.excludedPhones.filter((item) => item !== phone) }))}><Trash2 className="text-red-600" /></Button>
                  </div>
                ))}
                {!settings.excludedPhones.length && <p className="text-sm text-gray-500">No phone exclusions configured.</p>}
              </div>
            </section>

            <div className="flex justify-end border-t pt-5">
              <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending || settingsQuery.isLoading}>
                {saveMutation.isPending ? "Saving..." : "Save notification settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Team Assignment (Round-robin) - Hidden as requested */}
        {/*
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Support Team Assignment
            </CardTitle>
            <CardDescription>
              Manage the team members who receive new Aadhaar and Works follow-ups in cyclic order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Team Members &amp; Assignment Order
              </h3>
              <Badge variant="secondary" className="bg-gray-900 text-white hover:bg-gray-800">
                Round-robin
              </Badge>
            </div>

            {roundRobinQuery.isLoading ? (
              <p className="text-sm text-gray-500">Loading team assignment order...</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member, index) => (
                  <div
                    key={member.email}
                    draggable
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedIndex !== null && draggedIndex !== index) {
                        moveMember(draggedIndex, index);
                        setDraggedIndex(null);
                      }
                    }}
                    className={`flex items-center justify-between rounded-lg border bg-white p-3 text-sm transition-all shadow-sm ${
                      draggedIndex === index ? "opacity-50 border-amber-400" : "hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mr-2" />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-500 hover:text-gray-800"
                        disabled={index === 0}
                        onClick={() => moveMember(index, index - 1)}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-500 hover:text-gray-800"
                        disabled={index === teamMembers.length - 1}
                        onClick={() => moveMember(index, index + 1)}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        onClick={() => removeMember(index)}
                        title="Remove from round-robin"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {teamMembers.length === 0 && (
                  <p className="text-sm text-amber-700">No members configured in round-robin order.</p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Drag members or use arrow buttons to change the order used for both follow-up types.
            </p>

            <section className="space-y-3 border-t pt-5">
              <div>
                <Label>Add Operational Admin</Label>
                <p className="text-sm text-gray-500">
                  Select an active operational admin to add to the round-robin cycle.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
                  value={selectedNewAdminEmail}
                  onChange={(e) => setSelectedNewAdminEmail(e.target.value)}
                  disabled={roundRobinQuery.isLoading || availableOpsAdminsToAdd.length === 0}
                >
                  <option value="">Select an operational admin</option>
                  {availableOpsAdminsToAdd.map((admin) => (
                    <option key={admin.userId || admin.email} value={admin.email}>
                      {admin.name} ({admin.email})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTeamMember}
                  disabled={!selectedNewAdminEmail}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add member
                </Button>
              </div>
              {availableOpsAdminsToAdd.length === 0 && (
                <p className="text-xs text-gray-500">
                  All eligible operational admins are currently in the round-robin order.
                </p>
              )}
            </section>

            <div className="flex justify-end border-t pt-5">
              <Button
                onClick={() => saveRoundRobinMutation.mutate(teamMembers.map((m) => m.email))}
                disabled={
                  saveRoundRobinMutation.isPending ||
                  roundRobinQuery.isLoading ||
                  teamMembers.length === 0
                }
              >
                {saveRoundRobinMutation.isPending ? "Saving..." : "Save team assignment order"}
              </Button>
            </div>
          </CardContent>
        </Card>
        */}
      </div>
    );
}
