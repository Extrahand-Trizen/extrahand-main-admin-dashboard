"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, ImagePlus, Loader2, Search, Send, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn, formatDateTime } from "@/lib/utils";
import { listUsers } from "@/lib/api/users";
import {
  BROADCAST_APP_OPTIONS,
  MAX_SELECTED_RECIPIENTS,
  clearNotificationBroadcasts,
  sendNotificationBroadcast,
  uploadNotificationImage,
  type BroadcastApp,
  type BroadcastRecipientType,
} from "@/lib/api/notifications";
import {
  APP_ICONS,
  NOTIFICATION_HISTORY_QUERY_KEY,
  appLabel,
  toRecipient,
  type SelectedRecipient,
} from "@/components/notifications/shared";

const MAX_TITLE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 500;

/** `YYYY-MM-DDTHH:mm` in local time, for `<input type="datetime-local">`. */
function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function SendNotificationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const canLoad = isSuperAdmin && !authLoading;

  // Send form
  const [sendApp, setSendApp] = useState<BroadcastApp | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recipients
  const [recipientType, setRecipientType] = useState<BroadcastRecipientType>("all");
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserSearch(userSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Clear section
  const [clearApp, setClearApp] = useState<BroadcastApp | "">("");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const sendAppRole = BROADCAST_APP_OPTIONS.find((option) => option.value === sendApp)?.userRole;
  const userSearchQuery = useQuery({
    queryKey: ["notification-recipient-search", sendAppRole, debouncedUserSearch],
    queryFn: () => listUsers({ role: sendAppRole, search: debouncedUserSearch, limit: 8 }),
    enabled: canLoad && recipientType === "selected" && Boolean(sendAppRole) && debouncedUserSearch.length >= 2,
    retry: 1,
  });
  const selectedIds = new Set(selectedRecipients.map((recipient) => recipient.userId));
  const searchResults = (userSearchQuery.data?.data || [])
    .map(toRecipient)
    .filter((recipient): recipient is SelectedRecipient => Boolean(recipient));

  const resetSendForm = () => {
    setTitle("");
    setMessage("");
    setImageUrl("");
    setDeliveryMode("now");
    setScheduledAt("");
    setRecipientType("all");
    setSelectedRecipients([]);
    setUserSearch("");
  };

  const selectSendApp = (app: BroadcastApp) => {
    if (app !== sendApp) {
      setSelectedRecipients([]);
      setUserSearch("");
    }
    setSendApp(app);
  };

  const addRecipient = (recipient: SelectedRecipient) => {
    if (selectedIds.has(recipient.userId)) return;
    if (selectedRecipients.length >= MAX_SELECTED_RECIPIENTS) {
      toast.error(`You can select up to ${MAX_SELECTED_RECIPIENTS} users`);
      return;
    }
    setSelectedRecipients((current) => [...current, recipient]);
  };

  const uploadMutation = useMutation({
    mutationFn: uploadNotificationImage,
    onSuccess: (url) => {
      setImageUrl(url);
      toast.success("Image uploaded");
    },
    onError: (error: Error) => toast.error(error.message || "Image upload failed"),
  });

  const sendMutation = useMutation({
    mutationFn: sendNotificationBroadcast,
    onSuccess: (result) => {
      toast.success(result?.message || "Notification sent", {
        action: { label: "View history", onClick: () => router.push("/notifications/history") },
      });
      resetSendForm();
      setConfirmSendOpen(false);
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_HISTORY_QUERY_KEY] });
    },
    onError: (error: Error) => {
      setConfirmSendOpen(false);
      toast.error(error.message || "Failed to send notification");
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearNotificationBroadcasts,
    onSuccess: (result, app) => {
      const count = result?.data?.deletedCount ?? 0;
      toast.success(`Cleared ${count} notification${count === 1 ? "" : "s"} from ${appLabel(app)} users`);
      setConfirmClearOpen(false);
      setClearApp("");
    },
    onError: (error: Error) => {
      setConfirmClearOpen(false);
      toast.error(error.message || "Failed to clear notifications");
    },
  });

  const handleImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG or WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleSendSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!sendApp) {
      toast.error("Select an app");
      return;
    }
    if (recipientType === "selected" && selectedRecipients.length === 0) {
      toast.error("Select at least one user");
      return;
    }
    if (!title.trim() || !message.trim()) {
      toast.error("Enter a title and a message");
      return;
    }
    if (imageUrl.trim() && !/^https?:\/\//i.test(imageUrl.trim())) {
      toast.error("Image URL must start with http:// or https://");
      return;
    }
    if (deliveryMode === "schedule") {
      const date = new Date(scheduledAt);
      if (!scheduledAt || Number.isNaN(date.getTime())) {
        toast.error("Choose a schedule date & time");
        return;
      }
      if (date.getTime() <= Date.now()) {
        toast.error("Schedule date & time must be in the future");
        return;
      }
    }
    setConfirmSendOpen(true);
  };

  const confirmSend = () => {
    if (!sendApp) return;
    sendMutation.mutate({
      app: sendApp,
      title: title.trim(),
      message: message.trim(),
      imageUrl: imageUrl.trim() || undefined,
      scheduledAt: deliveryMode === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
      recipientType,
      userIds: recipientType === "selected" ? selectedRecipients.map((recipient) => recipient.userId) : undefined,
    });
  };

  if (!authLoading && !isSuperAdmin) {
    router.replace("/dashboard");
    return null;
  }

  if (authLoading || !isSuperAdmin) {
    return <div className="p-8 text-sm text-gray-500">Checking access...</div>;
  }

  const sendAppLabel = appLabel(sendApp);
  const isScheduling = deliveryMode === "schedule";
  const audienceLabel =
    recipientType === "selected"
      ? `${selectedRecipients.length} selected ${sendAppLabel} user${selectedRecipients.length === 1 ? "" : "s"}`
      : `all ${sendAppLabel} users`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send Notification</h1>
          <p className="mt-2 text-sm text-gray-600">
            Send announcements to users of the Customer, Partner or Seller app, and clear them when they are no longer needed.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/notifications/history">
            <History />
            View history
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Send Notification */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-amber-600" />
              New Notification
            </CardTitle>
            <CardDescription>Select app → choose recipients → enter notification → send.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSendSubmit}>
              <section className="space-y-3">
                <Label>1. App</Label>
                <div role="radiogroup" aria-label="App" className="grid gap-3 sm:grid-cols-3">
                  {BROADCAST_APP_OPTIONS.map((option) => {
                    const Icon = APP_ICONS[option.value];
                    const selected = sendApp === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => selectSendApp(option.value)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-4 text-left text-sm font-medium transition-colors",
                          selected
                            ? "border-yellow-500 bg-yellow-50 text-yellow-800 ring-1 ring-yellow-500"
                            : "border-gray-200 text-gray-700 hover:border-yellow-300 hover:bg-yellow-50/50"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", selected ? "text-yellow-600" : "text-gray-400")} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4 border-t pt-5">
                <Label className="block">2. Recipients</Label>
                <div role="radiogroup" aria-label="Recipients" className="flex gap-2 sm:w-1/2">
                  {(["all", "selected"] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={recipientType === type}
                      variant={recipientType === type ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setRecipientType(type)}
                    >
                      {type === "all" ? "All Users" : "Selected Users"}
                    </Button>
                  ))}
                </div>

                {recipientType === "all" ? (
                  <p className="text-sm text-gray-600">
                    {sendApp ? `Every ${sendAppLabel} user will receive this notification.` : "Select an app to choose who receives it."}
                  </p>
                ) : !sendApp ? (
                  <p className="text-sm text-gray-600">Select an app first to search its users.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        placeholder={`Search ${sendAppLabel} users by name, phone or email`}
                        className="pl-9"
                        aria-label="Search users"
                      />
                    </div>

                    {debouncedUserSearch.length >= 2 && (
                      <div className="max-h-56 overflow-y-auto rounded-lg border">
                        {userSearchQuery.isFetching ? (
                          <div className="flex items-center gap-2 p-3 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Searching...
                          </div>
                        ) : userSearchQuery.isError || !userSearchQuery.data ? (
                          <div className="flex items-center justify-between gap-3 p-3 text-sm text-red-600">
                            <span>Couldn&apos;t search users. The user service may be unavailable.</span>
                            <Button type="button" size="sm" variant="outline" onClick={() => userSearchQuery.refetch()}>
                              Retry
                            </Button>
                          </div>
                        ) : searchResults.length === 0 ? (
                          <p className="p-3 text-sm text-gray-500">No {sendAppLabel} users match &quot;{debouncedUserSearch}&quot;.</p>
                        ) : (
                          searchResults.map((recipient) => {
                            const alreadySelected = selectedIds.has(recipient.userId);
                            return (
                              <div
                                key={recipient.userId}
                                className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-gray-900">{recipient.name}</p>
                                  {recipient.contact && <p className="truncate text-xs text-gray-500">{recipient.contact}</p>}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={alreadySelected}
                                  onClick={() => addRecipient(recipient)}
                                >
                                  <UserPlus />
                                  {alreadySelected ? "Added" : "Add"}
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {selectedRecipients.length} of {MAX_SELECTED_RECIPIENTS} users selected
                        </span>
                        {selectedRecipients.length > 0 && (
                          <button
                            type="button"
                            className="text-xs text-gray-500 hover:text-gray-800"
                            onClick={() => setSelectedRecipients([])}
                          >
                            Clear selection
                          </button>
                        )}
                      </div>
                      {selectedRecipients.length > 0 ? (
                        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                          {selectedRecipients.map((recipient) => (
                            <span
                              key={recipient.userId}
                              className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 py-1 pl-3 pr-1 text-xs text-yellow-800"
                            >
                              {recipient.name}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedRecipients((current) => current.filter((item) => item.userId !== recipient.userId))
                                }
                                className="rounded-full p-0.5 hover:bg-yellow-100"
                                aria-label={`Remove ${recipient.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Search above and add the users who should receive this notification.</p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-4 border-t pt-5">
                <Label className="block">3. Notification</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notification-title">Notification Title</Label>
                    <span className="text-xs text-gray-400">{title.length}/{MAX_TITLE_LENGTH}</span>
                  </div>
                  <Input
                    id="notification-title"
                    value={title}
                    maxLength={MAX_TITLE_LENGTH}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Service update"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notification-message">Notification Message</Label>
                    <span className="text-xs text-gray-400">{message.length}/{MAX_MESSAGE_LENGTH}</span>
                  </div>
                  <Textarea
                    id="notification-message"
                    value={message}
                    maxLength={MAX_MESSAGE_LENGTH}
                    rows={4}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="What should users know?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-image">
                    Image <span className="font-normal text-gray-400">(optional)</span>
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="notification-image"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      placeholder="Paste an image URL or upload one"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageSelected}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                    >
                      {uploadMutation.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                      Upload
                    </Button>
                  </div>
                  {imageUrl.trim() && /^https?:\/\//i.test(imageUrl.trim()) && (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl.trim()} alt="Notification image preview" className="h-24 rounded-md border object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute -right-2 -top-2 rounded-full border bg-white p-1 text-gray-500 shadow-sm hover:text-gray-800"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">JPG, PNG or WebP, up to 5MB. Shown on the notification card where the device supports it.</p>
                </div>
              </section>

              <section className="space-y-4 border-t pt-5">
                <Label className="block">4. Delivery</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Send</Label>
                    <div role="radiogroup" aria-label="Send" className="flex gap-2">
                      {(["now", "schedule"] as const).map((mode) => (
                        <Button
                          key={mode}
                          type="button"
                          role="radio"
                          aria-checked={deliveryMode === mode}
                          variant={deliveryMode === mode ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => setDeliveryMode(mode)}
                        >
                          {mode === "now" ? "Send Now" : "Schedule"}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {isScheduling && (
                    <div className="space-y-2">
                      <Label htmlFor="notification-schedule">Schedule Date & Time</Label>
                      <Input
                        id="notification-schedule"
                        type="datetime-local"
                        value={scheduledAt}
                        min={toLocalInputValue(new Date())}
                        onChange={(event) => setScheduledAt(event.target.value)}
                      />
                    </div>
                  )}
                </div>
              </section>

              <div className="flex justify-end border-t pt-5">
                <Button type="submit" disabled={sendMutation.isPending || uploadMutation.isPending}>
                  {sendMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                  {isScheduling ? "Schedule Notification" : "Send Notification"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Clear Notifications — kept apart from sending to avoid accidental actions */}
        <Card className="h-fit border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              Clear Notifications
            </CardTitle>
            <CardDescription>
              Remove notifications sent from this page from every user&apos;s inbox in the selected app. Order, payment and other system notifications are not affected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select App</Label>
              <Select value={clearApp} onValueChange={(value) => setClearApp(value as BroadcastApp)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an app" />
                </SelectTrigger>
                <SelectContent>
                  {BROADCAST_APP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={!clearApp || clearMutation.isPending}
              onClick={() => setConfirmClearOpen(true)}
            >
              {clearMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Clear All Notifications
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirm send */}
      <AlertDialog open={confirmSendOpen} onOpenChange={(open) => !sendMutation.isPending && setConfirmSendOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isScheduling ? `Schedule for ${audienceLabel}?` : `Send to ${audienceLabel}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isScheduling && scheduledAt
                ? `"${title.trim()}" will be sent on ${formatDateTime(new Date(scheduledAt))} as a push notification and an inbox message to ${audienceLabel}.`
                : `"${title.trim()}" will be sent now as a push notification and an inbox message to ${audienceLabel}. Push notifications can't be recalled once delivered.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmSend();
              }}
            >
              {sendMutation.isPending && <Loader2 className="animate-spin" />}
              {isScheduling ? "Schedule" : recipientType === "selected" ? "Send to selected users" : "Send to all users"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm clear */}
      <AlertDialog open={confirmClearOpen} onOpenChange={(open) => !clearMutation.isPending && setConfirmClearOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">
              Clear all notifications for {clearApp ? appLabel(clearApp) : "this app"} users?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This will remove every notification sent from this page from the inbox of <strong>all {clearApp ? appLabel(clearApp) : ""} users</strong>.
                </p>
                <p>Order, payment, OTP and other system notifications are not affected. Push notifications already shown on users&apos; phones can&apos;t be recalled.</p>
                <p className="font-medium text-red-700">This can&apos;t be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearMutation.isPending}>Keep notifications</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={!clearApp || clearMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (clearApp) clearMutation.mutate(clearApp);
              }}
            >
              {clearMutation.isPending && <Loader2 className="animate-spin" />}
              Yes, clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
