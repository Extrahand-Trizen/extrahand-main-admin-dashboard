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
import { assignHelper, assignPartner } from "@/lib/api/tasks";
import { getUser } from "@/lib/api/users";
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
  const [assignmentRole, setAssignmentRole] = useState<'helper' | 'partner' | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [partnerProfileStatus, setPartnerProfileStatus] = useState<string | null>(null);
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

  const handleSelect = async (helper: UserType) => {
    setSelectedHelper(helper);
    setAssignmentRole(null);
    setPartnerProfileStatus(null);
    setLoadingProfile(true);
    try {
      const helperId = helper.userId || helper._id || (helper as any).uid;
      if (helperId) {
        const res = await getUser(helperId);
        if (res?.success && res?.data) {
          const status = res.data.partnerProfile?.status || "not_applied";
          setPartnerProfileStatus(status);
        } else {
          setPartnerProfileStatus("not_applied");
        }
      } else {
        setPartnerProfileStatus("not_applied");
      }
    } catch (err: any) {
      console.error("Failed to load user profile status:", err);
      setPartnerProfileStatus("not_applied");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAssign = useCallback(async () => {
    if (!selectedHelper || !assignmentRole) return;
    setAssigning(true);
    try {
      const helperUid = selectedHelper.uid || selectedHelper.userId;
      const helperProfileId = selectedHelper._id || selectedHelper.profileId || selectedHelper.userId;
      const helperName = selectedHelper.name;

      if (assignmentRole === 'partner') {
        if (partnerProfileStatus !== 'approved') {
          toast.error("Cannot assign as partner: partner profile not approved");
          return;
        }
        await assignPartner(taskId, helperUid, helperProfileId, helperName);
        toast.success(`Partner "${selectedHelper.name}" assigned successfully`);
      } else {
        await assignHelper(taskId, helperUid, helperProfileId, helperName);
        toast.success(`Helper "${selectedHelper.name}" assigned successfully`);
      }

      setAssigned(true);
      onAssigned();
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || `Failed to assign ${assignmentRole}`);
    } finally {
      setAssigning(false);
    }
  }, [selectedHelper, assignmentRole, partnerProfileStatus, taskId, onAssigned, onOpenChange]);

  const handleClose = () => {
    if (assigning) return;
    setSearch("");
    setSelectedHelper(null);
    setAssignmentRole(null);
    setPartnerProfileStatus(null);
    setAssigned(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign User</DialogTitle>
          <DialogDescription>
            Search for a user, then choose whether to assign them as a helper or a partner.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedHelper ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedHelper(null);
                    setAssignmentRole(null);
                    setPartnerProfileStatus(null);
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
                      No users found
                    </div>
                  ) : (
                    helpers.map((helper: UserType) => {
                      return (
                        <button
                          key={helper.userId}
                          type="button"
                          onClick={() => handleSelect(helper)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border text-left border-gray-200 hover:bg-gray-50 transition-colors"
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
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-medium text-sm">
                    {selectedHelper.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedHelper.name}</p>
                    <p className="text-xs text-gray-500">{selectedHelper.phone || selectedHelper.email || "No contact"}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedHelper(null);
                    setAssignmentRole(null);
                    setPartnerProfileStatus(null);
                    setAssigned(false);
                  }}
                  disabled={assigning}
                >
                  Change
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Assignment Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!assigning) setAssignmentRole('helper');
                    }}
                    className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all ${
                      assignmentRole === 'helper'
                        ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    disabled={assigning}
                  >
                    <span className="text-sm font-semibold text-gray-900">Helper</span>
                    <span className="text-xs text-gray-500 mt-1">
                      Shows in Helper Screen (My Work)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!assigning) setAssignmentRole('partner');
                    }}
                    className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all ${
                      assignmentRole === 'partner'
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    disabled={assigning}
                  >
                    <span className="text-sm font-semibold text-gray-900">Partner</span>
                    <span className="text-xs text-gray-500 mt-1">
                      Shows in Partner Screen (Book Now)
                    </span>
                  </button>
                </div>
              </div>

              {loadingProfile && (
                <div className="flex items-center justify-center py-4 gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  Checking partner verification status...
                </div>
              )}

              {!loadingProfile && assignmentRole === 'partner' && partnerProfileStatus && (
                <div className="mt-2 animate-in fade-in duration-200">
                  {partnerProfileStatus === 'approved' ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-semibold">Approved Partner:</span> This user is an approved partner and can be assigned.
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-base">⚠️</span>
                        Partner profile not approved
                      </div>
                      <p className="text-xs text-rose-700">
                        Current partner status: <span className="font-mono bg-rose-100 px-1 py-0.5 rounded text-[11px]">{partnerProfileStatus}</span>. 
                        To assign as a partner, their profile must be approved.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {assigned && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Assigned successfully
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={assigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              !selectedHelper || 
              !assignmentRole || 
              (assignmentRole === 'partner' && partnerProfileStatus !== 'approved') || 
              assigning || 
              assigned
            }
          >
            {assigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : assigned ? (
              "Assigned"
            ) : assignmentRole === 'partner' ? (
              "Assign Partner"
            ) : (
              "Assign Helper"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
