"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  Ban,
  UserX,
  UserCheck,
  MapPin,
  Star,
  Briefcase,
  DollarSign,
  Award,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  CreditCard,
  User,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getUser,
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
} from "@/lib/api/users";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const userId = params.userId as string;

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "ban" | "unban" | "suspend" | "unsuspend" | null;
    reason: string;
  }>({
    open: false,
    action: null,
    reason: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId),
    enabled: !!userId && hasPermission("user.view"),
    retry: false,
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      banUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User banned successfully");
      setActionDialog({ open: false, action: null, reason: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to ban user");
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User unbanned successfully");
      setActionDialog({ open: false, action: null, reason: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unban user");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      suspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User suspended successfully");
      setActionDialog({ open: false, action: null, reason: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to suspend user");
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: (userId: string) => unsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User unsuspended successfully");
      setActionDialog({ open: false, action: null, reason: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unsuspend user");
    },
  });

  const handleAction = (action: "ban" | "unban" | "suspend" | "unsuspend") => {
    setActionDialog({ open: true, action, reason: "" });
  };

  const confirmAction = () => {
    if (!actionDialog.action) return;

    const requiresReason =
      actionDialog.action === "ban" || actionDialog.action === "suspend";
    if (requiresReason && !actionDialog.reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    switch (actionDialog.action) {
      case "ban":
        banMutation.mutate({ userId, reason: actionDialog.reason });
        break;
      case "unban":
        unbanMutation.mutate(userId);
        break;
      case "suspend":
        suspendMutation.mutate({ userId, reason: actionDialog.reason });
        break;
      case "unsuspend":
        unsuspendMutation.mutate(userId);
        break;
    }
  };

  const user = data?.data;

  const statusColors: Record<string, string> = {
    active: "success",
    suspended: "warning",
    banned: "destructive",
    inactive: "secondary",
  };

  if (!hasPermission("user.view")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          You don't have permission to view user details.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              Failed to load user details. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.name}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-700 font-semibold text-lg">
                {user.name?.charAt(0).toUpperCase() ||
                  user.email.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.name || "User Details"}
              </h1>
              <p className="mt-1 text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {user.status === "banned" && hasPermission("user.unban") && (
            <Button variant="outline" onClick={() => handleAction("unban")}>
              <UserCheck className="mr-2 h-4 w-4" />
              Unban
            </Button>
          )}
          {user.status !== "banned" && hasPermission("user.ban") && (
            <Button variant="destructive" onClick={() => handleAction("ban")}>
              <Ban className="mr-2 h-4 w-4" />
              Ban
            </Button>
          )}
          {user.status === "suspended" && hasPermission("user.unsuspend") && (
            <Button variant="outline" onClick={() => handleAction("unsuspend")}>
              <UserCheck className="mr-2 h-4 w-4" />
              Unsuspend
            </Button>
          )}
          {user.status !== "suspended" && hasPermission("user.suspend") && (
            <Button
              variant="outline"
              onClick={() => handleAction("suspend")}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              <UserX className="mr-2 h-4 w-4" />
              Suspend
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          {user.userType === "business" && (
            <TabsTrigger value="business">Business</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Account and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">User ID:</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {user.userId || user.uid}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Phone:</span>
                    <span className="text-gray-900">{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Role:</span>
                  <Badge variant="outline">
                    {user.roles?.join(", ") || user.role || "N/A"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">User Type:</span>
                  <Badge variant="outline">
                    {user.userType || "individual"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={statusColors[user.status] as any}>
                    {user.status}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Created:</span>
                  <span className="text-gray-900">
                    {formatDateTime(user.createdAt)}
                  </span>
                </div>
                {user.updatedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="text-gray-900">
                      {formatDateTime(user.updatedAt)}
                    </span>
                  </div>
                )}
                {user.lastActive && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Last Active:</span>
                    <span className="text-gray-900">
                      {formatDateTime(user.lastActive)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Statistics</CardTitle>
                <CardDescription>Key performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.rating !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-gray-600">Rating</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {user.rating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-500">/ 5.0</span>
                    </div>
                  </div>
                )}
                {user.totalReviews !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Total Reviews
                      </span>
                    </div>
                    <span className="text-lg font-semibold">
                      {user.totalReviews}
                    </span>
                  </div>
                )}
                {user.totalTasks !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Total Tasks</span>
                    </div>
                    <span className="text-lg font-semibold">
                      {user.totalTasks}
                    </span>
                  </div>
                )}
                {user.completedTasks !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">
                        Completed Tasks
                      </span>
                    </div>
                    <span className="text-lg font-semibold">
                      {user.completedTasks}
                    </span>
                  </div>
                )}
                {user.postedTasks !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">
                        Posted Tasks
                      </span>
                    </div>
                    <span className="text-lg font-semibold">
                      {user.postedTasks}
                    </span>
                  </div>
                )}
                {user.earnedAmount !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">
                        Total Earned
                      </span>
                    </div>
                    <span className="text-lg font-semibold">
                      {formatCurrency(user.earnedAmount)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Verification Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
              <CardDescription>Account verification details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-xs text-gray-500">Verification</p>
                  </div>
                  {user.isVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-xs text-gray-500">Verification</p>
                  </div>
                  {user.phoneVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Aadhaar</p>
                    <p className="text-xs text-gray-500">KYC</p>
                  </div>
                  {user.isAadhaarVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-700">PAN</p>
                    <p className="text-xs text-gray-500">KYC</p>
                  </div>
                  {user.isPANVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Bank</p>
                    <p className="text-xs text-gray-500">Account</p>
                  </div>
                  {user.isBankVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Face</p>
                    <p className="text-xs text-gray-500">Verification</p>
                  </div>
                  {user.isFaceVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Admin</p>
                    <p className="text-xs text-gray-500">Verified</p>
                  </div>
                  {user.isAdminVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Tier</p>
                    <p className="text-xs text-gray-500">
                      {user.verificationBadge || "None"}
                    </p>
                  </div>
                  {user.verificationTier !== undefined && (
                    <Badge variant="outline">
                      Tier {user.verificationTier}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Skills */}
            {user.skills && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Expertise</CardTitle>
                  <CardDescription>
                    User's skills and certifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user.skills.primaryCategory && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Primary Category
                      </Label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">
                        {user.skills.primaryCategory.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}
                  {user.skills.list && user.skills.list.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Skills List
                      </Label>
                      <div className="space-y-3">
                        {user.skills.list.map((skill, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm text-gray-900">
                                {skill.name}
                              </span>
                              {skill.verified && (
                                <Badge variant="success" className="text-xs">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            {skill.category && (
                              <p className="text-xs text-gray-600 mb-1">
                                Category: {skill.category}
                              </p>
                            )}
                            {skill.yearsOfExperience !== undefined && (
                              <p className="text-xs text-gray-600 mb-1">
                                Experience: {skill.yearsOfExperience} years
                              </p>
                            )}
                            {skill.certified && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                  <Award className="h-3 w-3 mr-1" />
                                  Certified
                                </Badge>
                                {skill.certificates &&
                                  skill.certificates.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {skill.certificates.map(
                                        (cert, certIndex) => (
                                          <div
                                            key={certIndex}
                                            className="text-xs text-gray-600 pl-2 border-l-2 border-amber-300"
                                          >
                                            <p className="font-medium">
                                              {cert.title}
                                            </p>
                                            <p>Issued by: {cert.issuedBy}</p>
                                            <p>
                                              Date:{" "}
                                              {formatDate(cert.issuedDate)}
                                            </p>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {user.skills.updatedAt && (
                    <p className="text-xs text-gray-500">
                      Last updated: {formatDate(user.skills.updatedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Location & Addresses */}
            <Card>
              <CardHeader>
                <CardTitle>Location & Addresses</CardTitle>
                <CardDescription>
                  User's location and saved addresses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.location && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Primary Location
                    </Label>
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                      {user.location.address && (
                        <div className="flex items-start gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">
                              {user.location.address}
                            </p>
                            {user.location.addressDetails && (
                              <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                                {user.location.addressDetails.doorNo && (
                                  <p>{user.location.addressDetails.doorNo}</p>
                                )}
                                {user.location.addressDetails.area && (
                                  <p>{user.location.addressDetails.area}</p>
                                )}
                                {user.location.addressDetails.city && (
                                  <p>
                                    {user.location.addressDetails.city}
                                    {user.location.addressDetails.state &&
                                      `, ${user.location.addressDetails.state}`}
                                  </p>
                                )}
                                {user.location.addressDetails.pinCode && (
                                  <p>
                                    PIN: {user.location.addressDetails.pinCode}
                                  </p>
                                )}
                                {user.location.addressDetails.country && (
                                  <p>{user.location.addressDetails.country}</p>
                                )}
                              </div>
                            )}
                            {user.location.coordinates && (
                              <p className="text-xs text-gray-500 mt-1">
                                Coordinates:{" "}
                                {user.location.coordinates[1].toFixed(6)},{" "}
                                {user.location.coordinates[0].toFixed(6)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {!user.location.address && user.location.coordinates && (
                        <p className="text-sm text-gray-600">
                          Coordinates: {user.location.coordinates[1].toFixed(6)}
                          , {user.location.coordinates[0].toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {user.savedAddresses && user.savedAddresses.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Saved Addresses ({user.savedAddresses.length})
                    </Label>
                    <div className="space-y-2">
                      {user.savedAddresses.map((address, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline">{address.label}</Badge>
                            {address.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 mt-1">
                            {address.address}
                          </p>
                          {address.addressDetails && (
                            <div className="mt-1 text-xs text-gray-600">
                              {address.addressDetails.doorNo && (
                                <p>{address.addressDetails.doorNo}</p>
                              )}
                              {address.addressDetails.area && (
                                <p>{address.addressDetails.area}</p>
                              )}
                              {address.city && address.state && (
                                <p>
                                  {address.city}, {address.state}
                                </p>
                              )}
                              {address.addressDetails.pinCode && (
                                <p>PIN: {address.addressDetails.pinCode}</p>
                              )}
                            </div>
                          )}
                          {address.name && (
                            <p className="text-xs text-gray-500 mt-1">
                              Contact: {address.name}
                              {address.phone && ` - ${address.phone}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!user.location &&
                  (!user.savedAddresses ||
                    user.savedAddresses.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No location or addresses available
                    </p>
                  )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* KYC Verification */}
            <Card>
              <CardHeader>
                <CardTitle>KYC Verification</CardTitle>
                <CardDescription>
                  Identity and document verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Aadhaar */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-sm">Aadhaar</span>
                    </div>
                    {user.isAadhaarVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Not Verified</Badge>
                    )}
                  </div>
                  {user.isAadhaarVerified && (
                    <div className="mt-2 space-y-1 text-sm">
                      {user.maskedAadhaar && (
                        <p className="text-gray-600">
                          <span className="font-medium">Number:</span>{" "}
                          {user.maskedAadhaar}
                        </p>
                      )}
                      {user.aadhaarVerifiedAt && (
                        <p className="text-gray-600">
                          <span className="font-medium">Verified:</span>{" "}
                          {formatDateTime(user.aadhaarVerifiedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* PAN */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-sm">PAN</span>
                    </div>
                    {user.isPANVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Not Verified</Badge>
                    )}
                  </div>
                  {user.isPANVerified && (
                    <div className="mt-2 space-y-1 text-sm">
                      {user.maskedPan && (
                        <p className="text-gray-600">
                          <span className="font-medium">Number:</span>{" "}
                          {user.maskedPan}
                        </p>
                      )}
                      {user.panVerifiedAt && (
                        <p className="text-gray-600">
                          <span className="font-medium">Verified:</span>{" "}
                          {formatDateTime(user.panVerifiedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Face Verification */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-sm">
                        Face Verification
                      </span>
                    </div>
                    {user.isFaceVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Not Verified</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Verification */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Verification</CardTitle>
                <CardDescription>
                  Bank account and payment methods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bank Account */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-sm">Bank Account</span>
                    </div>
                    {user.isBankVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Not Verified</Badge>
                    )}
                  </div>
                  {user.isBankVerified && (
                    <div className="mt-2 space-y-1 text-sm">
                      {user.maskedBankAccount && (
                        <p className="text-gray-600">
                          <span className="font-medium">Account:</span>{" "}
                          {user.maskedBankAccount}
                        </p>
                      )}
                      {user.bankAccount && (
                        <div className="space-y-1">
                          {user.bankAccount.accountHolderName && (
                            <p className="text-gray-600">
                              <span className="font-medium">Holder:</span>{" "}
                              {user.bankAccount.accountHolderName}
                            </p>
                          )}
                          {user.bankAccount.bankName && (
                            <p className="text-gray-600">
                              <span className="font-medium">Bank:</span>{" "}
                              {user.bankAccount.bankName}
                            </p>
                          )}
                          {user.bankAccount.ifsc && (
                            <p className="text-gray-600">
                              <span className="font-medium">IFSC:</span>{" "}
                              {user.bankAccount.ifsc}
                            </p>
                          )}
                        </div>
                      )}
                      {user.bankVerifiedAt && (
                        <p className="text-gray-600">
                          <span className="font-medium">Verified:</span>{" "}
                          {formatDateTime(user.bankVerifiedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Verification Tier & Badge */}
                <div className="p-4 rounded-lg border">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        Verification Tier
                      </span>
                      {user.verificationTier !== undefined ? (
                        <Badge variant="outline">
                          Tier {user.verificationTier}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Set</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        Verification Badge
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {user.verificationBadge || "None"}
                      </Badge>
                    </div>
                    {user.lastVerifiedAt && (
                      <p className="text-xs text-gray-500">
                        Last verified: {formatDateTime(user.lastVerifiedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Role Verifications */}
                {user.roleVerifications && (
                  <div className="p-4 rounded-lg border">
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Role-Specific Verifications
                    </Label>
                    <div className="space-y-3">
                      {user.roleVerifications.tasker && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Tasker</span>
                            {user.roleVerifications.tasker.canAcceptTasks ? (
                              <Badge variant="success">Can Accept Tasks</Badge>
                            ) : (
                              <Badge variant="secondary">Cannot Accept</Badge>
                            )}
                          </div>
                          {user.roleVerifications.tasker.requirements && (
                            <div className="mt-2 space-y-1 text-xs text-gray-600">
                              <p>
                                Aadhaar:{" "}
                                {user.roleVerifications.tasker.requirements
                                  .aadhaar ? (
                                  <CheckCircle2 className="inline h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="inline h-3 w-3 text-gray-400" />
                                )}
                              </p>
                              <p>
                                PAN:{" "}
                                {user.roleVerifications.tasker.requirements
                                  .pan ? (
                                  <CheckCircle2 className="inline h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="inline h-3 w-3 text-gray-400" />
                                )}
                              </p>
                              <p>
                                Bank:{" "}
                                {user.roleVerifications.tasker.requirements
                                  .bank ? (
                                  <CheckCircle2 className="inline h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="inline h-3 w-3 text-gray-400" />
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {user.roleVerifications.poster && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Poster</span>
                            {user.roleVerifications.poster.canPostTasks ? (
                              <Badge variant="success">Can Post Tasks</Badge>
                            ) : (
                              <Badge variant="secondary">Cannot Post</Badge>
                            )}
                          </div>
                          {user.roleVerifications.poster.requirements && (
                            <div className="mt-2 space-y-1 text-xs text-gray-600">
                              <p>
                                Aadhaar:{" "}
                                {user.roleVerifications.poster.requirements
                                  .aadhaar ? (
                                  <CheckCircle2 className="inline h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="inline h-3 w-3 text-gray-400" />
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Rating & Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Rating & Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  {user.rating !== undefined ? (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
                        <span className="text-3xl font-bold">
                          {user.rating.toFixed(1)}
                        </span>
                        <span className="text-gray-500">/ 5.0</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Based on {user.totalReviews || 0} reviews
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No rating available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Task Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Task Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {user.totalTasks !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Tasks</span>
                      <span className="text-lg font-semibold">
                        {user.totalTasks}
                      </span>
                    </div>
                  )}
                  {user.completedTasks !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completed</span>
                      <span className="text-lg font-semibold text-green-600">
                        {user.completedTasks}
                      </span>
                    </div>
                  )}
                  {user.postedTasks !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Posted</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {user.postedTasks}
                      </span>
                    </div>
                  )}
                  {user.totalTasks !== undefined &&
                    user.completedTasks !== undefined && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Completion Rate
                          </span>
                          <span className="text-lg font-semibold">
                            {user.totalTasks > 0
                              ? (
                                  (user.completedTasks / user.totalTasks) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Earnings */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                {user.earnedAmount !== undefined ? (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {formatCurrency(user.earnedAmount)}
                    </div>
                    <p className="text-sm text-gray-600">Total earnings</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center">
                    No earnings data
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business Tab */}
        {user.userType === "business" && user.business && (
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>
                  Business information and details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Business Name
                      </Label>
                      <p className="mt-1 text-sm text-gray-900">
                        {user.business.name}
                      </p>
                    </div>
                    {user.business.type && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Business Type
                        </Label>
                        <p className="mt-1 text-sm text-gray-900">
                          {user.business.type}
                        </p>
                      </div>
                    )}
                    {user.business.category && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Category
                        </Label>
                        <p className="mt-1 text-sm text-gray-900">
                          {user.business.category}
                        </p>
                      </div>
                    )}
                    {user.business.description && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Description
                        </Label>
                        <p className="mt-1 text-sm text-gray-900">
                          {user.business.description}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {user.business.contactPerson && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Contact Person
                        </Label>
                        <p className="mt-1 text-sm text-gray-900">
                          {user.business.contactPerson}
                        </p>
                        {user.business.contactPersonDesignation && (
                          <p className="mt-0.5 text-xs text-gray-600">
                            {user.business.contactPersonDesignation}
                          </p>
                        )}
                      </div>
                    )}
                    {user.business.businessEmail && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Business Email
                        </Label>
                        <p className="mt-1 text-sm text-gray-900">
                          {user.business.businessEmail}
                        </p>
                      </div>
                    )}
                    {user.business.businessPhone && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Business Phone
                        </Label>
                        <p className="mt-1 text-sm text-gray-900">
                          {user.business.businessPhone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {user.business.registeredAddress && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Registered Address
                    </Label>
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <p className="text-sm text-gray-900">
                        {user.business.registeredAddress.street}
                      </p>
                      <p className="text-sm text-gray-900">
                        {user.business.registeredAddress.city}
                        {user.business.registeredAddress.state &&
                          `, ${user.business.registeredAddress.state}`}
                      </p>
                      {user.business.registeredAddress.pincode && (
                        <p className="text-sm text-gray-900">
                          PIN: {user.business.registeredAddress.pincode}
                        </p>
                      )}
                      {user.business.registeredAddress.country && (
                        <p className="text-sm text-gray-900">
                          {user.business.registeredAddress.country}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  {user.business.pan && (
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          Business PAN
                        </span>
                        {user.business.pan.isPANVerified ? (
                          <Badge variant="success">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Not Verified</Badge>
                        )}
                      </div>
                      {user.business.pan.maskedPAN && (
                        <p className="text-sm text-gray-600 mt-1">
                          {user.business.pan.maskedPAN}
                        </p>
                      )}
                      {user.business.pan.verifiedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Verified:{" "}
                          {formatDateTime(user.business.pan.verifiedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {user.business.bankAccount && (
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          Business Bank Account
                        </span>
                        {user.business.bankAccount.isBankVerified ? (
                          <Badge variant="success">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Not Verified</Badge>
                        )}
                      </div>
                      {user.business.bankAccount.maskedAccount && (
                        <p className="text-sm text-gray-600 mt-1">
                          {user.business.bankAccount.maskedAccount}
                        </p>
                      )}
                      {user.business.bankAccount.verifiedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Verified:{" "}
                          {formatDateTime(user.business.bankAccount.verifiedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {user.business.gstNumber && (
                    <div className="p-4 rounded-lg border">
                      <span className="font-medium text-sm">GST Number</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {user.business.gstNumber}
                      </p>
                    </div>
                  )}

                  {user.business.registrationNumber && (
                    <div className="p-4 rounded-lg border">
                      <span className="font-medium text-sm">
                        Registration Number
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {user.business.registrationNumber}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "ban" && "Ban User"}
              {actionDialog.action === "unban" && "Unban User"}
              {actionDialog.action === "suspend" && "Suspend User"}
              {actionDialog.action === "unsuspend" && "Unsuspend User"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionDialog.action}{" "}
              {user.name || user.email}?
              {(actionDialog.action === "ban" ||
                actionDialog.action === "suspend") && (
                <span className="block mt-2 text-red-600">
                  This action requires a reason.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {(actionDialog.action === "ban" ||
            actionDialog.action === "suspend") && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for this action..."
                value={actionDialog.reason}
                onChange={(e) =>
                  setActionDialog({ ...actionDialog, reason: e.target.value })
                }
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, action: null, reason: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant={
                actionDialog.action === "ban" ? "destructive" : "default"
              }
              onClick={confirmAction}
              disabled={
                (actionDialog.action === "ban" ||
                  actionDialog.action === "suspend") &&
                !actionDialog.reason.trim()
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
