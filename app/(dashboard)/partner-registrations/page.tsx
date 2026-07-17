"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listUsers, updateUser } from "@/lib/api/users";
import { formatDate } from "@/lib/utils";
import { User } from "@/types";
import Link from "next/link";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  approved: "success",
  pending_review: "warning",
  draft: "secondary",
  rejected: "destructive",
  suspended: "destructive",
};

const PARTNER_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

const PARTNER_CATEGORY_OPTIONS = [
  "Home Services",
  "Delivery & Logistics",
  "Driving",
  "Professional Services",
  "Care Services",
];

const CITY_OPTIONS = [
  { value: "all", label: "All Cities" },
  { value: "Hyderabad", label: "Hyderabad" },
];

const WORK_AREA_OPTIONS = [
  { value: "all", label: "All Work Areas" },
  { value: "Uppal", label: "Uppal" },
  { value: "LB Nagar", label: "LB Nagar" },
  { value: "Secunderabad", label: "Secunderabad" },
  { value: "Ameerpet", label: "Ameerpet" },
  { value: "Kukatpally", label: "Kukatpally" },
  { value: "Madhapur", label: "Madhapur" },
  { value: "Moti Nagar", label: "Moti Nagar" },
  { value: "Gachibowli", label: "Gachibowli" },
];

const getStatusLabel = (status?: string) => {
  return (
    PARTNER_STATUS_OPTIONS.find((option) => option.value === status)?.label ||
    status ||
    "Unknown"
  );
};

const getUserAreaLabel = (user: User) => {
  const locationAddressDetails = user.location?.addressDetails;
  const homeLocationAddressDetails = (user as any).homeLocation?.addressDetails;
  const address = user.location?.address || (user as any).homeLocation?.address || undefined;

  const areaFromDetails =
    locationAddressDetails?.area?.trim() || homeLocationAddressDetails?.area?.trim();
  const city =
    locationAddressDetails?.city?.trim() || homeLocationAddressDetails?.city?.trim();
  const areaFromAddress = address
    ? address
        .split(',')
        .map((part: string) => part.trim())
        .filter((part: string) => Boolean(part))
        .reverse()
        .find((part: string) => city ? !part.toLowerCase().includes(city.toLowerCase()) : true)
    : null;

  if (areaFromDetails && city && areaFromDetails.toLowerCase() === city.toLowerCase()) {
    return city;
  }
  if (areaFromDetails && city) return `${areaFromDetails}, ${city}`;
  if (areaFromDetails) return areaFromDetails;
  if (city) return city;
  if (address) return address;
  return "—";
};

export default function PartnerRegistrationsPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [workAreaFilter, setWorkAreaFilter] = useState("all");
  const [submittedFrom, setSubmittedFrom] = useState("");
  const [submittedTo, setSubmittedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!selectedPartner) {
        throw new Error('No partner selected');
      }
      return updateUser(selectedPartner.userId, { partnerProfile: { status: 'approved' } });
    },
    onSuccess: () => {
      toast.success('Partner approved');
      queryClient.invalidateQueries({ queryKey: ['partner-registrations'] });
      setReviewModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to approve partner');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!selectedPartner) {
        throw new Error('No partner selected');
      }
      return updateUser(selectedPartner.userId, { partnerProfile: { status: 'rejected' } });
    },
    onSuccess: () => {
      toast.success('Partner rejected');
      queryClient.invalidateQueries({ queryKey: ['partner-registrations'] });
      setReviewModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to reject partner');
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "partner-registrations",
      search,
      statusFilter,
      categoryFilter,
      cityFilter,
      workAreaFilter,
      submittedFrom,
      submittedTo,
      page,
      limit,
    ],
    queryFn: () =>
      listUsers({
        search: search || undefined,
        role: "partner",
        status: statusFilter !== "all" ? statusFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        city: cityFilter !== "all" ? cityFilter : undefined,
        workArea: workAreaFilter !== "all" ? workAreaFilter : undefined,
        createdFrom: submittedFrom || undefined,
        createdTo: submittedTo || undefined,
        page,
        limit,
        includeSummary: true,
      }),
    enabled: hasPermission("user.list") && isLoaded,
    retry: false,
  });

  const users = data?.data || [];
  const pagination =
    data?.pagination ||
    ({ page, limit, total: 0, pages: 1 } as const);
  const summary = data?.summary || {};

  const dynamicPartnerCategories = Array.from(
    new Set(
      users.flatMap((user) => user.partnerProfile?.categories || []),
    ),
  );

  const handleReviewClick = (user: User) => {
    setSelectedPartner(user);
    setReviewModalOpen(true);
  };

  if (!hasPermission("user.list")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">
          You don't have permission to view partner registrations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Partner Registrations</h1>
        <p className="mt-2 text-sm text-gray-600">
          View all partner registrants and filter by approval status, category and work area.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 xl:grid-cols-5">
            <div className="space-y-2 sm:col-span-2 md:col-span-2 xl:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, email or phone"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Registration status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PARTNER_CATEGORY_OPTIONS.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select
                value={cityFilter}
                onValueChange={(value) => {
                  setCityFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="city">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  {CITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="workArea">Work area</Label>
              <Select
                value={workAreaFilter}
                onValueChange={(value) => {
                  setWorkAreaFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="workArea">
                  <SelectValue placeholder="All Work Areas" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_AREA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="submittedFrom">Submitted From</Label>
              <Input
                id="submittedFrom"
                type="date"
                value={submittedFrom}
                onChange={(e) => {
                  setSubmittedFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="submittedTo">Submitted To</Label>
              <Input
                id="submittedTo"
                type="date"
                value={submittedTo}
                onChange={(e) => {
                  setSubmittedTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setCityFilter("all");
                  setWorkAreaFilter("all");
                  setSubmittedFrom("");
                  setSubmittedTo("");
                  setPage(1);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        {PARTNER_STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
          <Card key={option.value}>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">{option.label}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Number(summary[option.value] || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Partner registrations</CardTitle>
            <Badge variant="secondary">
              {pagination.total} {pagination.total === 1 ? "registration" : "registrations"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data || error || users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No partner registrations found</div>
          ) : (
            <>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Categories</TableHead>
                      <TableHead className="hidden lg:table-cell">Work areas</TableHead>
                      <TableHead className="hidden xl:table-cell">Location</TableHead>
                      <TableHead className="hidden xl:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.userId}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => router.push(`/users/${encodeURIComponent(user.userId)}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                              {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {user.name || "No name"}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={statusColors[user.partnerProfile?.status || 'draft'] as any}>
                            {getStatusLabel(user.partnerProfile?.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {user.partnerProfile?.categories?.join(', ') || '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {user.partnerProfile?.workAreas?.join(', ') || '—'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-gray-500">
                          {getUserAreaLabel(user)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReviewClick(user)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Rows per page</p>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => {
                      setLimit(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8" style={{ minWidth: 70 }}>
                      <SelectValue placeholder={limit.toString()} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-sm text-gray-600">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} registrations
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm text-gray-600 px-2">
                      Page {page} of {pagination.pages}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= pagination.pages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(pagination.pages)} disabled={page >= pagination.pages}>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Partner Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">
                  {selectedPartner?.name || "Partner"}
                </DialogTitle>
                {selectedPartner?.phone && (
                  <p className="text-sm text-gray-600">
                    📞 {selectedPartner.phone}
                  </p>
                )}
                {selectedPartner?.email && (
                  <p className="text-sm text-gray-600">
                    ✉️ {selectedPartner.email}
                  </p>
                )}
              </div>
              {selectedPartner?.partnerProfile?.status && (
                <Badge className="ml-4" variant={statusColors[selectedPartner.partnerProfile.status] as any}>
                  {getStatusLabel(selectedPartner.partnerProfile.status)}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedPartner && (
            <div className="space-y-6">
              {/* Identity & Basic Details */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>👤</span> Identity & Basic Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium">{selectedPartner.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedPartner.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selectedPartner.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="font-medium capitalize">
                      {(selectedPartner.partnerProfile as any)?.gender || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium">
                      {(selectedPartner.partnerProfile as any)?.dob
                        ? new Date(
                            (selectedPartner.partnerProfile as any).dob
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Business Name</p>
                    <p className="font-medium">
                      {selectedPartner.partnerProfile?.businessName || "—"}
                    </p>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className={selectedPartner.isAadhaarVerified ? "text-green-600" : "text-gray-400"}>
                      {selectedPartner.isAadhaarVerified ? "✓" : "✗"}
                    </span>
                    <span className="text-sm">
                      Aadhaar Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={selectedPartner.isVerified ? "text-green-600" : "text-gray-400"}>
                      {selectedPartner.isVerified ? "✓" : "✗"}
                    </span>
                    <span className="text-sm">
                      Email Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={selectedPartner.isPANVerified ? "text-green-600" : "text-gray-400"}>
                      {selectedPartner.isPANVerified ? "✓" : "✗"}
                    </span>
                    <span className="text-sm">
                      PAN Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={selectedPartner.isBankVerified ? "text-green-600" : "text-gray-400"}>
                      {selectedPartner.isBankVerified ? "✓" : "✗"}
                    </span>
                    <span className="text-sm">
                      Bank Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Work Areas */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📍</span> Location & Work Areas
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Base City</p>
                    <p className="font-medium">
                      {selectedPartner.location?.addressDetails?.city || "—"}
                    </p>
                  </div>

                  {selectedPartner.partnerProfile?.workAreas && selectedPartner.partnerProfile.workAreas.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Selected Work Areas</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPartner.partnerProfile.workAreas.map((area) => (
                          <Badge key={area} variant="outline">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPartner.location?.address && (
                    <div>
                      <p className="text-sm text-gray-600">Full Address</p>
                      <p className="text-sm font-medium">{selectedPartner.location.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile & Skills */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>⭐</span> Profile & Skills
                </h3>

                {selectedPartner.partnerProfile?.categories && selectedPartner.partnerProfile.categories.length > 0 && (
                  <div className="space-y-4">
                    {selectedPartner.partnerProfile.categories.map((category) => {
                      const categoryKey = category;
                      const partnerData = selectedPartner.partnerProfile as any;
                      const skills = partnerData?.skills?.[categoryKey] || [];
                      const experience = partnerData?.experience?.[categoryKey] || "—";
                      const workPlace = partnerData?.workPlace?.[categoryKey] || "—";

                      return (
                        <div key={category} className="bg-gray-50 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold capitalize">
                              {category.replace(/_/g, " ")}
                            </p>
                            <Badge variant="secondary">{skills.length || 0} skills</Badge>
                          </div>

                          {/* Skills */}
                          {skills.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-600 mb-1">Skills:</p>
                              <div className="flex flex-wrap gap-1">
                                {skills.map((skill: string) => (
                                  <Badge key={skill} variant="outline" className="text-xs">
                                    {skill.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Experience */}
                          {experience && experience !== "—" && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Experience:</span> {experience.replace(/_/g, " ")}
                              </p>
                            </div>
                          )}

                          {/* Workplace */}
                          {workPlace && workPlace !== "—" && (
                            <div>
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Workplace:</span> {workPlace}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Documents & Proofs */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📄</span> Documents & Proofs
                </h3>

                {/* Experience Proofs */}
                {(selectedPartner.partnerProfile as any)?.experienceProofs && (
                  <div className="space-y-3">
                    {Object.entries((selectedPartner.partnerProfile as any).experienceProofs).map(
                      ([category, proofs]: [string, any]) => {
                        if (!Array.isArray(proofs) || proofs.length === 0) return null;
                        return (
                          <div key={category}>
                            <p className="font-medium text-sm mb-2">
                              {category.replace(/_/g, " ")} - Experience Proof
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {proofs.map((proof: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={proof}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group block w-32 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
                                >
                                  <div className="h-20 w-full bg-gray-100 overflow-hidden">
                                    <img
                                      src={proof}
                                      alt={`Proof ${idx + 1}`}
                                      className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                                    />
                                  </div>
                                  <div className="px-2 py-2 text-center text-xs text-gray-700">
                                    View Proof {idx + 1}
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {/* License & RC */}
                {((selectedPartner.partnerProfile as any)?.dlFront ||
                  (selectedPartner.partnerProfile as any)?.dlBack ||
                  (selectedPartner.partnerProfile as any)?.rc) && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="font-medium text-sm mb-2">Vehicle Documents</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedPartner.partnerProfile as any)?.dlFront && (
                        <a
                          href={(selectedPartner.partnerProfile as any).dlFront}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                        >
                          DL Front
                        </a>
                      )}
                      {(selectedPartner.partnerProfile as any)?.dlBack && (
                        <a
                          href={(selectedPartner.partnerProfile as any).dlBack}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                        >
                          DL Back
                        </a>
                      )}
                      {(selectedPartner.partnerProfile as any)?.rc && (
                        <a
                          href={(selectedPartner.partnerProfile as any).rc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                        >
                          RC Book
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Account Information */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🔐</span> Account Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Account Status</p>
                    <p className="font-medium capitalize">{selectedPartner.status || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium">{formatDate(selectedPartner.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="font-medium text-xs text-gray-500 break-all font-mono">
                      {selectedPartner.userId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Registration Status</p>
                    <p className="font-medium text-sm">
                      {(selectedPartner.partnerProfile as any)?.onboardingCompleted ? "✓ Completed" : "In Progress"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setReviewModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  disabled={!selectedPartner || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate()}
                >
                  Reject
                </Button>
                <Button
                  variant="secondary"
                  disabled={!selectedPartner || approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setReviewModalOpen(false);
                    router.push(`/users/${encodeURIComponent(selectedPartner.userId)}`);
                  }}
                >
                  View Full Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
