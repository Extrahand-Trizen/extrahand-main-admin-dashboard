"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Settings, Wrench, Users, GripVertical, CheckCircle2, ArrowUp, ArrowDown, MessageCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppLogoSettings } from "@/components/admin/AppLogoSettings";
import {
  getAadhaarRoundRobinTeamSettings,
  getTaskPostedEmailSettings,
  getRoundRobinTeamSettings,
  getWhatsAppNotificationSettings,
  listInvites,
  listUsers,
  AdminInvite,
  AdminUser,
  RoundRobinMember,
  RoundRobinTeamSettingsData,
  TaskPostedEmailSettings,
  updateAadhaarRoundRobinTeamSettings,
  updateRoundRobinTeamSettings,
  updateTaskPostedEmailSettings,
  updateWhatsAppNotificationSettings,
} from "@/lib/api/admin";

type RoundRobinTeamEditorProps = {
  queryKey: string;
  title: string;
  description: string;
  getSettings: () => Promise<RoundRobinTeamSettingsData>;
  updateSettings: (emails: string[]) => Promise<RoundRobinTeamSettingsData>;
};

function RoundRobinTeamEditor({
  queryKey,
  title,
  description,
  getSettings,
  updateSettings,
}: RoundRobinTeamEditorProps) {
  const queryClient = useQueryClient();
  const [teamMembersOverride, setTeamMembersOverride] = useState<RoundRobinMember[] | null>(null);
  const [selectedNewAdminEmail, setSelectedNewAdminEmail] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const teamQuery = useQuery({
    queryKey: [queryKey],
    queryFn: getSettings,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const teamMembers = teamMembersOverride ?? teamQuery.data?.teamMembers ?? [];

  const saveMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      await updateSettings(emails);
      const savedSettings = await getSettings();
      const savedEmails = savedSettings.teamMembers.map((member) => member.email.trim().toLowerCase());
      const requestedEmails = emails.map((email) => email.trim().toLowerCase());
      if (
        savedEmails.length !== requestedEmails.length ||
        savedEmails.some((email, index) => email !== requestedEmails[index])
      ) {
        throw new Error(`The ${title.toLowerCase()} order was not saved correctly. Please try again.`);
      }
      return savedSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([queryKey], data);
      setTeamMembersOverride(data.teamMembers);
      toast.success(`${title} assignment order saved`);
    },
    onError: (error: Error) => {
      toast.error(error.message || `Failed to save ${title.toLowerCase()} assignment order`);
    },
  });

  const availableOpsAdminsToAdd = (teamQuery.data?.availableOpsAdmins || []).filter(
    (admin) => !teamMembers.some((member) => member.email.toLowerCase() === admin.email.toLowerCase()),
  );

  const moveMember = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= teamMembers.length) return;
    const updated = [...teamMembers];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setTeamMembersOverride(updated);
  };

  const removeMember = (indexToRemove: number) => {
    if (teamMembers.length <= 1) {
      toast.error("At least one member is required in the round-robin order");
      return;
    }
    setTeamMembersOverride(teamMembers.filter((_, index) => index !== indexToRemove));
  };

  const addTeamMember = () => {
    const adminToAdd = availableOpsAdminsToAdd.find(
      (admin) => admin.email.toLowerCase() === selectedNewAdminEmail.toLowerCase(),
    );
    if (!adminToAdd) return;

    saveMutation.mutate([...teamMembers.map((member) => member.email), adminToAdd.email]);
    setSelectedNewAdminEmail("");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Badge variant="secondary" className="w-fit bg-gray-900 text-white hover:bg-gray-800">
          Round-robin
        </Badge>
      </div>

      {teamQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading team assignment order...</p>
      ) : teamQuery.isError ? (
        <p role="alert" className="text-sm text-red-600">
          Failed to load {title.toLowerCase()} settings.
        </p>
      ) : (
        <div className="space-y-2">
          {teamMembers.map((member, index) => (
            <div
              key={member.email}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(event) => event.preventDefault()}
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
                <div className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing" title="Drag to reorder">
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
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-gray-800" disabled={index === 0} onClick={() => moveMember(index, index - 1)} title="Move up">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-gray-800" disabled={index === teamMembers.length - 1} onClick={() => moveMember(index, index + 1)} title="Move down">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => removeMember(index)} title="Remove from round-robin">
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
        Drag members or use the arrow buttons to change the order for {title.toLowerCase()}.
      </p>

      <div className="space-y-3 border-t pt-5">
        <div>
          <Label>Add Operational Admin</Label>
          <p className="text-sm text-gray-500">Select an active operational admin to add to this round-robin cycle.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={selectedNewAdminEmail}
            onChange={(event) => setSelectedNewAdminEmail(event.target.value)}
            disabled={teamQuery.isLoading || teamQuery.isError || availableOpsAdminsToAdd.length === 0}
          >
            <option value="">Select an operational admin</option>
            {availableOpsAdminsToAdd.map((admin) => (
              <option key={admin.userId || admin.email} value={admin.email}>
                {admin.name} ({admin.email})
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={addTeamMember} disabled={!selectedNewAdminEmail || saveMutation.isPending} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Add & save member"}
          </Button>
        </div>
        {availableOpsAdminsToAdd.length === 0 && !teamQuery.isLoading && !teamQuery.isError && (
          <p className="text-xs text-gray-500">All eligible operational admins are currently in this round-robin order.</p>
        )}
      </div>

      <div className="flex justify-end border-t pt-5">
        <Button
          onClick={() => saveMutation.mutate(teamMembers.map((member) => member.email))}
          disabled={saveMutation.isPending || teamQuery.isLoading || teamQuery.isError || teamMembers.length === 0}
        >
          {saveMutation.isPending ? "Saving..." : `Save ${title.toLowerCase()} order`}
        </Button>
      </div>
    </section>
  );
}

export default function AdminSettingsPage() {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<TaskPostedEmailSettings>({ recipients: [], excludedPhones: [] });
    const [selectedAdminEmail, setSelectedAdminEmail] = useState("");
    const [customEmail, setCustomEmail] = useState("");
    const [phoneInput, setPhoneInput] = useState("");

    const settingsQuery = useQuery({
      queryKey: ["task-posted-email-settings"],
      queryFn: getTaskPostedEmailSettings,
    });
    const adminsQuery = useQuery({
      queryKey: ["task-posted-email-admin-users"],
      queryFn: async () => {
        const [firstUsersPage, firstInvitesPage] = await Promise.all([
          listUsers({ page: 1, limit: 100, status: "active" }),
          listInvites({ page: 1, limit: 100, status: "accepted" }),
        ]);
        if (!firstUsersPage || !firstInvitesPage) {
          throw new Error("Failed to load admin users and accepted invitations");
        }

        const userPageNumbers = Array.from(
          { length: Math.max(0, firstUsersPage.pagination.pages - 1) },
          (_, index) => index + 2,
        );
        const invitePageNumbers = Array.from(
          { length: Math.max(0, firstInvitesPage.pagination.pages - 1) },
          (_, index) => index + 2,
        );
        const [userPages, invitePages] = await Promise.all([
          Promise.all(userPageNumbers.map((page) => listUsers({ page, limit: 100, status: "active" }))),
          Promise.all(invitePageNumbers.map((page) => listInvites({ page, limit: 100, status: "accepted" }))),
        ]);
        if (userPages.some((page) => !page) || invitePages.some((page) => !page)) {
          throw new Error("Failed to load all admin users and accepted invitations");
        }

        return {
          users: [firstUsersPage, ...userPages].flatMap((page) => page?.users ?? []),
          acceptedInvites: [firstInvitesPage, ...invitePages].flatMap((page) => page?.invites ?? []),
        };
      },
    });
    const whatsappSettingsQuery = useQuery({
      queryKey: ["whatsapp-notification-settings"],
      queryFn: getWhatsAppNotificationSettings,
    });
    useEffect(() => {
      if (settingsQuery.data) setSettings(settingsQuery.data);
    }, [settingsQuery.data]);

    const saveMutation = useMutation({
      mutationFn: updateTaskPostedEmailSettings,
      onSuccess: (data) => {
        setSettings(data);
        queryClient.setQueryData(["task-posted-email-settings"], data);
        toast.success("Work-posted email settings saved");
      },
      onError: (error: any) => toast.error(error?.message || "Failed to save settings"),
    });

    const whatsappSettingsMutation = useMutation({
      mutationFn: updateWhatsAppNotificationSettings,
      onSuccess: (data) => {
        queryClient.setQueryData(["whatsapp-notification-settings"], data);
        toast.success(
          data.enabled
            ? "Automatic WhatsApp notifications enabled"
            : "Automatic WhatsApp notifications disabled",
        );
      },
      onError: (error: any) =>
        toast.error(error?.message || "Failed to update WhatsApp notifications"),
    });

    const recipientCandidates = new Map<string, Pick<AdminUser, "userId" | "email" | "name">>();
    (adminsQuery.data?.acceptedInvites || []).forEach((invite: AdminInvite) => {
      const email = invite.email.trim().toLowerCase();
      recipientCandidates.set(email, { userId: invite.inviteId, email, name: email });
    });
    (adminsQuery.data?.users || []).forEach((admin: AdminUser) => {
      recipientCandidates.set(admin.email.trim().toLowerCase(), admin);
    });
    const availableAdmins = Array.from(recipientCandidates.values()).filter(
      (admin) => !settings.recipients.some((email) => email.toLowerCase() === admin.email.toLowerCase()),
    );

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

        <AppLogoSettings />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-amber-600" />
              WhatsApp Notifications
            </CardTitle>
            <CardDescription>
              Automatically notify eligible partners as each work-dispatch stage opens.
              Push notifications are not affected by this setting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="font-medium text-gray-900">
                  {whatsappSettingsQuery.data?.enabled ? "Enabled" : "Disabled"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {whatsappSettingsQuery.data?.enabled
                    ? "Eligible partners receive a WhatsApp message when their dispatch stage begins."
                    : "No new automatic WhatsApp messages will be sent."}
                </p>
              </div>
              <Switch
                checked={whatsappSettingsQuery.data?.enabled ?? false}
                onCheckedChange={(enabled) => whatsappSettingsMutation.mutate(enabled)}
                disabled={
                  whatsappSettingsQuery.isLoading ||
                  whatsappSettingsQuery.isError ||
                  whatsappSettingsMutation.isPending
                }
                aria-label="Enable automatic WhatsApp notifications"
              />
            </div>
            {whatsappSettingsQuery.isError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                Failed to load WhatsApp notification settings.
              </p>
            )}
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
                <p className="text-sm text-gray-500">Select from active admin users and admins who accepted an invitation.</p>
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
                <p className="text-sm text-gray-500">These customer numbers suppress task-posted emails and identify team-posted work. For team-posted Book Now work, only eligible partner accounts with a matching phone number receive notifications; other qualified partners remain visible in dispatch logs only.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} placeholder="Customer or test-partner phone number" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addPhone(); } }} />
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Support Team Assignment
            </CardTitle>
            <CardDescription>
              Configure separate round-robin teams for Works and Aadhaar follow-ups.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <RoundRobinTeamEditor
              queryKey="works-round-robin-team-settings"
              title="Works Team Assignment"
              description="Only work assignments use this team and order."
              getSettings={getRoundRobinTeamSettings}
              updateSettings={updateRoundRobinTeamSettings}
            />
            <RoundRobinTeamEditor
              queryKey="aadhaar-round-robin-team-settings"
              title="Aadhaar Follow-up Team Assignment"
              description="Controls Aadhaar follow-up round-robin assignments independently of Works."
              getSettings={getAadhaarRoundRobinTeamSettings}
              updateSettings={updateAadhaarRoundRobinTeamSettings}
            />
          </CardContent>
        </Card>
      </div>
    );
}
