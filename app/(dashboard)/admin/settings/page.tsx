"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Settings, Wrench } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Operational controls and platform configuration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            Settings Console
          </CardTitle>
          <CardDescription>
            This page is now available and ready for settings modules.
          </CardDescription>
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
    </div>
  );
}
