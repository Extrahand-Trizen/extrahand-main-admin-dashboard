"use client";
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Settings, Wrench } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTaskPostedEmailSettings,
  listUsers,
  TaskPostedEmailSettings,
  updateTaskPostedEmailSettings,
} from "@/lib/api/admin";

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
      queryFn: () => listUsers({ limit: 100, dashboardType: "main_admin", status: "active" }),
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

    const adminUsers = adminsQuery.data?.users || [];
    const availableAdmins = adminUsers.filter((admin) => !settings.recipients.includes(admin.email));

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
      </div>
    );
}
