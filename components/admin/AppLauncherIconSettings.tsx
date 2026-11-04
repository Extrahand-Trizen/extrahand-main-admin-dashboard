"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activateAppLauncherIcon,
  deleteAppLauncherIcon,
  getAppBrandingSettings,
  uploadAppLauncherIcon,
} from "@/lib/api/admin";

export function AppLauncherIconSettings() {
  const queryClient = useQueryClient();
  const [iconName, setIconName] = useState("");
  const iconInputRef = useRef<HTMLInputElement>(null);
  const brandingQuery = useQuery({
    queryKey: ["app-branding-settings"],
    queryFn: getAppBrandingSettings,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ image, name }: { image: File; name: string }) =>
      uploadAppLauncherIcon(image, name),
    onSuccess: (data) => {
      queryClient.setQueryData(["app-branding-settings"], data);
      setIconName("");
      toast.success("Icon uploaded. It must be included in an app release before installed users can select it.");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to upload launcher icon"),
  });
  const activateMutation = useMutation({
    mutationFn: activateAppLauncherIcon,
    onSuccess: (data) => {
      queryClient.setQueryData(["app-branding-settings"], data);
      toast.success("Active launcher icon updated. Supported installed app versions will apply it on next launch.");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to activate launcher icon"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAppLauncherIcon,
    onSuccess: (data) => {
      queryClient.setQueryData(["app-branding-settings"], data);
      toast.success("Launcher icon deleted");
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["app-branding-settings"] });
      toast.error(error.message || "Failed to delete launcher icon");
    },
  });

  const handleIconSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The icon image must be 5 MB or smaller");
      return;
    }
    uploadMutation.mutate({
      image: file,
      name: iconName.trim() || file.name.replace(/\.[^.]+$/, ""),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-amber-600" />
          Customer App Launcher Icon
        </CardTitle>
        <CardDescription>
          Upload icon artwork and choose the active design. Icons must be bundled in an Android/iOS
          app release before installed versions can switch to them. Switching among bundled icons
          is remote and does not need another release.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {brandingQuery.isError ? (
          <p className="text-sm text-red-600">
            Could not load the current launcher icon: {(brandingQuery.error as Error).message}
          </p>
        ) : (
          <div
            role="img"
            aria-label="Active launcher icon preview"
            className="flex h-32 w-32 items-center justify-center rounded-xl border bg-white bg-contain bg-center bg-no-repeat p-2"
            style={
              brandingQuery.data?.activeIconUrl
                ? { backgroundImage: `url("${brandingQuery.data.activeIconUrl}")` }
                : undefined
            }
          >
            {!brandingQuery.data?.activeIconUrl && (
              <span className="text-center text-xs text-gray-500">
                {brandingQuery.isLoading ? "Loading current icon…" : "Bundled default icon"}
              </span>
            )}
          </div>
        )}
        <div className="max-w-md space-y-2">
          <Label htmlFor="launcher-icon-name">Icon name</Label>
          <Input
            id="launcher-icon-name"
            value={iconName}
            onChange={(event) => setIconName(event.target.value)}
            maxLength={60}
            placeholder="For example, Summer campaign"
          />
          <input
            ref={iconInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleIconSelection}
          />
          <Button
            type="button"
            onClick={() => iconInputRef.current?.click()}
            disabled={uploadMutation.isPending || brandingQuery.isLoading}
          >
            <ImagePlus className="h-4 w-4" />
            {uploadMutation.isPending ? "Uploading…" : "Upload icon"}
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Choose the active icon</p>
          <Button
            type="button"
            variant={brandingQuery.data?.activeIconId === "extrahand-default" ? "default" : "outline"}
            disabled={activateMutation.isPending}
            onClick={() => activateMutation.mutate("extrahand-default")}
          >
            ExtraHand default
            {brandingQuery.data?.activeIconId === "extrahand-default" ? " · Active" : ""}
          </Button>
          {brandingQuery.data?.launcherIcons.map((icon) => (
            <div key={icon.iconId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  role="img"
                  aria-label={icon.name}
                  className="h-12 w-12 shrink-0 rounded-md bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${icon.imageUrl}")` }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{icon.name}</p>
                  <p className="truncate text-xs text-gray-500">{icon.iconId}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={brandingQuery.data?.activeIconId === icon.iconId ? "default" : "outline"}
                  disabled={
                    activateMutation.isPending ||
                    brandingQuery.data?.activeIconId === icon.iconId
                  }
                  onClick={() => activateMutation.mutate(icon.iconId)}
                >
                  {brandingQuery.data?.activeIconId === icon.iconId ? "Active" : "Set active"}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={`Delete ${icon.name}`}
                  title={
                    brandingQuery.data?.activeIconId === icon.iconId
                      ? "Choose another active icon before deleting this one"
                      : `Delete ${icon.name}`
                  }
                  disabled={
                    deleteMutation.isPending ||
                    brandingQuery.data?.activeIconId === icon.iconId ||
                    icon.iconId === "legacy-launcher-icon"
                  }
                  onClick={() => {
                    if (window.confirm(`Delete the uploaded icon "${icon.name}"? This cannot be undone.`)) {
                      deleteMutation.mutate(icon.iconId);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          JPG, PNG or WebP · maximum 5 MB · new uploads need a native release before they are switchable.
          Existing bundled icons switch when the app refreshes its remote configuration. Set{" "}
          <code>EXTRAHAND_API_GATEWAY_URL</code> on the build machine; Android Gradle and Xcode will
          prepare new uploads automatically before native builds. You can also run{" "}
          <code>npm run prepare:launcher-icons</code> manually.
        </p>
      </CardContent>
    </Card>
  );
}
