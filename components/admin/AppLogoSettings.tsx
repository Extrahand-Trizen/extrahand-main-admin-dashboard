"use client";

import { useRef, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAppBrandingSettings,
  resetAppBrandingLogo,
  uploadAppBrandingLogo,
} from "@/lib/api/admin";

export function AppLogoSettings() {
  const queryClient = useQueryClient();
  const appLogoInputRef = useRef<HTMLInputElement>(null);
  const appBrandingQuery = useQuery({
    queryKey: ["app-branding-settings"],
    queryFn: getAppBrandingSettings,
  });

  const appLogoMutation = useMutation({
    mutationFn: uploadAppBrandingLogo,
    onSuccess: (data) => {
      queryClient.setQueryData(["app-branding-settings"], data);
      toast.success("Customer app logo updated");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to upload app logo"),
  });

  const resetAppLogoMutation = useMutation({
    mutationFn: resetAppBrandingLogo,
    onSuccess: (data) => {
      queryClient.setQueryData(["app-branding-settings"], data);
      toast.success("Customer app logo reset to the bundled default");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to reset app logo"),
  });

  const handleAppLogoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The logo image must be 5 MB or smaller");
      return;
    }
    appLogoMutation.mutate(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-amber-600" />
          Customer App Logo
        </CardTitle>
        <CardDescription>
          Change the logo shown inside the customer app. This does not change the phone&apos;s
          launcher icon. Active apps refresh the logo within a few minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {appBrandingQuery.isError ? (
          <p className="text-sm text-red-600">
            Could not load the current app logo: {(appBrandingQuery.error as Error).message}
          </p>
        ) : (
          <div
            role="img"
            aria-label={
              appBrandingQuery.data?.logoUrl
                ? "Current customer app logo"
                : "The bundled default customer app logo is active"
            }
            className="flex h-32 w-64 items-center justify-center rounded-lg border bg-white bg-contain bg-center bg-no-repeat p-4"
            style={
              appBrandingQuery.data?.logoUrl
                ? { backgroundImage: `url("${appBrandingQuery.data.logoUrl}")` }
                : undefined
            }
          >
            {!appBrandingQuery.data?.logoUrl && (
              <span className="text-center text-sm text-gray-500">
                {appBrandingQuery.isLoading
                  ? "Loading current logo…"
                  : "Bundled default logo is active"}
              </span>
            )}
          </div>
        )}
        <input
          ref={appLogoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAppLogoSelection}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => appLogoInputRef.current?.click()}
            disabled={appLogoMutation.isPending || appBrandingQuery.isLoading}
          >
            <ImagePlus className="h-4 w-4" />
            {appLogoMutation.isPending ? "Uploading…" : "Upload logo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => resetAppLogoMutation.mutate()}
            disabled={!appBrandingQuery.data?.logoUrl || resetAppLogoMutation.isPending}
          >
            <RotateCcw className="h-4 w-4" />
            {resetAppLogoMutation.isPending ? "Resetting…" : "Reset to default"}
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          JPG, PNG or WebP · maximum 5 MB · changes do not require a customer app release.
        </p>
      </CardContent>
    </Card>
  );
}
