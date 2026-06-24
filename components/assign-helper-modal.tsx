"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api/client";
import { assignHelper } from "@/lib/api/tasks";
import { toast } from "sonner";
import { ApiResponse, User as UserType } from "@/types";

interface AssignHelperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  onAssigned: () => void;
}

export default function AssignHelperModal({
  open,
  onOpenChange,
  taskId,
  onAssigned,
}: AssignHelperModalProps) {
  const [search, setSearch] = useState("");
  const [selectedHelper, setSelectedHelper] = useState<UserType | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState(false);

  const { data: helpersData, isLoading: searching } = useQuery({
    queryKey: ["helpers-search", search],
    queryFn: () =>
      apiRequest<ApiResponse<UserType[]>>(
        `/api/v1/users/helpers/search?q=${encodeURIComponent(search)}`
      ),
    enabled: search.trim().length >= 2,
  });

  const helpers = helpersData?.data || [];

  const handleSelect = (helper: UserType) => {
    setSelectedHelper(helper);
  };

  const handleAssign = useCallback(async () => {
    if (!selectedHelper) return;
    setAssigning(true);
    try {
      const helperUid = selectedHelper.uid || selectedHelper.userId;
      const helperProfileId = selectedHelper.userId;
      await assignHelper(taskId, helperUid, helperProfileId);
      setAssigned(true);
      toast.success(`Helper "${selectedHelper.name}" assigned successfully`);
      onAssigned();
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Failed to assign helper");
    } finally {
      setAssigning(false);
    }
  }, [selectedHelper, taskId, onAssigned, onOpenChange]);

  const handleClose = () => {
    if (assigning) return;
    setSearch("");
    setSelectedHelper(null);
    setAssigned(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Helper</DialogTitle>
          <DialogDescription>
            Search for a helper by name or phone number and assign them to this Book Now task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedHelper(null);
                setAssigned(false);
              }}
              className="pl-9"
              autoFocus
            />
          </div>

          {search.trim().length >= 2 && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {searching ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : helpers.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No helpers found
                </div>
              ) : (
                helpers.map((helper: UserType) => {
                  const isSelected =
                    selectedHelper?.userId === helper.userId;
                  return (
                    <button
                      key={helper.userId}
                      type="button"
                      onClick={() => handleSelect(helper)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-medium text-sm shrink-0">
                        {helper.name?.charAt(0)?.toUpperCase() || "H"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {helper.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {helper.phone || helper.email || "No contact"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {helper.status === "active" && (
                          <Badge
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 bg-emerald-50"
                          >
                            Active
                          </Badge>
                        )}
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {assigned && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Helper assigned successfully
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={assigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedHelper || assigning || assigned}
          >
            {assigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : assigned ? (
              "Assigned"
            ) : (
              "Assign Helper"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
