"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Users,
  UserCheck,
  Plus,
  Building2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatDateTime } from "@/lib/utils";
import {
  listHourlyAvailabilities,
  toggleHourlyAvailability,
  searchLocations,
  ensureGoogleLocation,
  type HourlyAvailabilityItem,
  type LocationType,
  type GoogleLocationResult,
} from "@/lib/api/location-pricing";

const AVAILABILITY_QUERY_KEY = "hourly-helper-availabilities";
const ITEMS_PER_PAGE = 10;

export default function HourlyHelperAvailabilityPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Add Location Modal state (Google Place search)
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [googleSearchInput, setGoogleSearchInput] = useState("");
  const [debouncedGoogleSearch, setDebouncedGoogleSearch] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [initialStatus, setInitialStatus] = useState<boolean>(true);

  // Target item for enable/disable confirmation modal
  const [targetItem, setTargetItem] = useState<{
    item: HourlyAvailabilityItem;
    nextState: boolean;
  } | null>(null);

  // Debounce Google location search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGoogleSearch(googleSearchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [googleSearchInput]);

  // Google Places search query
  const googleSearchQuery = useQuery({
    queryKey: ["hourly-helper-google-search", debouncedGoogleSearch],
    queryFn: () => searchLocations(debouncedGoogleSearch),
    enabled: addModalOpen && debouncedGoogleSearch.length >= 2,
    staleTime: 30000,
  });

  // Query location availabilities from backend
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [AVAILABILITY_QUERY_KEY, searchTerm, typeFilter, statusFilter],
    queryFn: async () => {
      const typeParam = typeFilter === "all" ? undefined : typeFilter;
      const isEnabledParam =
        statusFilter === "all" ? undefined : statusFilter === "enabled";
      const res = await listHourlyAvailabilities({
        search: searchTerm || undefined,
        type: typeParam,
        isEnabled: isEnabledParam,
      });
      return res.data || [];
    },
  });

  // Toggle availability mutation
  const toggleMutation = useMutation({
    mutationFn: async ({
      type,
      id,
      isEnabled,
    }: {
      type: LocationType;
      id: string;
      isEnabled: boolean;
    }) => {
      return toggleHourlyAvailability(type, id, isEnabled);
    },
    onSuccess: (res, variables) => {
      toast.success(
        `Hourly Helper is now ${variables.isEnabled ? "ENABLED" : "DISABLED"} for ${
          targetItem?.item.displayName || "location"
        }`
      );
      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY] });
      setTargetItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update location availability");
    },
  });

  // Handle Google place selection & canonical location provisioning
  const handleSelectGooglePlace = async (result: GoogleLocationResult) => {
    try {
      setIsProvisioning(true);
      const res = await ensureGoogleLocation(result);
      if (!res.data) throw new Error("Could not resolve location details");

      const locationRecord = res.data;
      const locType = locationRecord.type as LocationType;
      const locId = locationRecord._id;

      // Set availability status in DB
      await toggleHourlyAvailability(locType, locId, initialStatus);

      toast.success(
        `Added ${locationRecord.displayName} (${locType}) and set Hourly Helper to ${
          initialStatus ? "ENABLED" : "DISABLED"
        }`
      );

      queryClient.invalidateQueries({ queryKey: [AVAILABILITY_QUERY_KEY] });
      setAddModalOpen(false);
      setGoogleSearchInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add location");
    } finally {
      setIsProvisioning(false);
    }
  };

  const locations = data || [];

  // Filtered and paginated locations
  const filteredLocations = useMemo(() => {
    return locations.filter((item) => {
      if (
        typeFilter !== "all" &&
        item.locationType.toLowerCase() !== typeFilter.toLowerCase()
      ) {
        return false;
      }
      if (statusFilter === "enabled" && !item.isEnabled) return false;
      if (statusFilter === "disabled" && item.isEnabled) return false;
      return true;
    });
  }, [locations, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredLocations.length / ITEMS_PER_PAGE) || 1;
  const paginatedLocations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLocations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLocations, currentPage]);

  const counts = useMemo(() => {
    let enabled = 0;
    let disabled = 0;
    let withActiveHelpers = 0;
    locations.forEach((l) => {
      if (l.isEnabled) enabled++;
      else disabled++;
      if (l.eligibleHelperCount > 0) withActiveHelpers++;
    });
    return { total: locations.length, enabled, disabled, withActiveHelpers };
  }, [locations]);

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Hourly Helper Availability
            </h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Operations Control
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage Hourly Helper availability independently for each location based on real-time partner coverage.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="default"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Location
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info Callout Banner */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-semibold">Location Search & Availability Controls:</p>
            <p>
              Use <strong>+ Add Location</strong> to search any location via Google Maps (e.g., Yousufguda, Madhapur, Gachibowli) and add it directly to Hourly Helper control.
            </p>
            <p className="text-amber-700 font-medium">
              ✓ Customer Android app requires NO changes — disabled locations automatically return the native "Coming Soon" contract.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-gray-500">
              Monitored Locations
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-gray-900">{counts.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-blue-600">
              Locations with Active Helpers
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-700">{counts.withActiveHelpers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-emerald-600">
              Enabled Locations
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700">{counts.enabled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-rose-600">
              Disabled Locations
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-700">{counts.disabled}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search location name (e.g. Yousufguda, Madhapur, Gachibowli)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">Type:</span>
                <Select
                  value={typeFilter}
                  onValueChange={(val) => {
                    setTypeFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-32 text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="pincode">Pincode</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-600">Status:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-32 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm || typeFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className="h-9 text-xs text-gray-500 hover:text-gray-900"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              <p className="mt-2 text-sm">Loading location availability settings...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-semibold text-gray-900">
                Failed to load location availability settings
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : paginatedLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
              <MapPin className="h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-900">No locations found</p>
              <p className="text-xs text-gray-500">
                Click "+ Add Location" above to search and add any area (e.g. Yousufguda).
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-gray-700">Location Name</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Type</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Eligible Helpers</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Parent Location</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Hourly Helper Status</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Setting Rule</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Last Updated</TableHead>
                  <TableHead className="text-right text-xs font-bold text-gray-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLocations.map((item) => (
                  <TableRow key={item._id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.displayName}</p>
                          <p className="text-xs text-gray-500 font-mono">{item.canonicalName}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize text-xs font-medium",
                          item.locationType === "city" && "bg-blue-50 text-blue-700 border-blue-200",
                          item.locationType === "area" && "bg-purple-50 text-purple-700 border-purple-200",
                          item.locationType === "pincode" && "bg-amber-50 text-amber-700 border-amber-200",
                          item.locationType === "state" && "bg-slate-50 text-slate-700 border-slate-200"
                        )}
                      >
                        {item.locationType}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {item.eligibleHelperCount > 0 ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit font-medium">
                          <UserCheck className="h-3 w-3" />
                          {item.eligibleHelperCount} {item.eligibleHelperCount === 1 ? "Helper" : "Helpers"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          0 Helpers
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-gray-600">
                      {item.parentDisplayName || "—"}
                    </TableCell>

                    <TableCell>
                      {item.isEnabled ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          Disabled
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs">
                      {item.isExplicit ? (
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Explicit Override
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Default (Inherited)</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-gray-500">
                      {item.updatedAt ? (
                        <div>
                          <p>{formatDateTime(item.updatedAt)}</p>
                          {item.updatedBy && <p className="text-[10px] text-gray-400">By {item.updatedBy}</p>}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {item.isEnabled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTargetItem({ item, nextState: false })}
                          className="h-8 text-xs font-semibold text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          Disable Helper
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTargetItem({ item, nextState: true })}
                          className="h-8 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                        >
                          Enable Helper
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {!isLoading && !isError && filteredLocations.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredLocations.length)}
                </span>{" "}
                of <span className="font-medium">{filteredLocations.length}</span> locations
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-xs font-medium text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Location Search Modal (Google Places) */}
      <Dialog open={addModalOpen} onOpenChange={(open) => !open && setAddModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" />
              Add Location for Hourly Helper Control
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Type any area, neighborhood, pincode, or city (e.g. Yousufguda, Madhapur, Gachibowli, Ameerpet) to search via Google Maps.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Search Location (Google Maps):</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Type area or location name (e.g. Yousufguda)..."
                  value={googleSearchInput}
                  onChange={(e) => setGoogleSearchInput(e.target.value)}
                  className="pl-9 text-sm"
                  autoFocus
                />
                {googleSearchQuery.isFetching && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-amber-600" />
                )}
              </div>
            </div>

            {/* Initial Availability Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Initial Status:</label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant={initialStatus ? "default" : "outline"}
                  onClick={() => setInitialStatus(true)}
                  className={cn("h-8 text-xs flex-1", initialStatus && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Enabled
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={!initialStatus ? "destructive" : "outline"}
                  onClick={() => setInitialStatus(false)}
                  className="h-8 text-xs flex-1"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Disabled
                </Button>
              </div>
            </div>

            {/* Google Search Results Dropdown List */}
            {debouncedGoogleSearch.length >= 2 && (
              <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-sm space-y-1">
                {googleSearchQuery.isLoading ? (
                  <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                    Searching Google Maps...
                  </div>
                ) : (googleSearchQuery.data?.data || []).length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500">
                    No location results found. Try a different search term.
                  </div>
                ) : (
                  (googleSearchQuery.data?.data || []).map((result) => (
                    <button
                      key={result.placeId}
                      type="button"
                      disabled={isProvisioning}
                      onClick={() => handleSelectGooglePlace(result)}
                      className="w-full text-left p-2.5 rounded-md hover:bg-amber-50/80 transition-colors flex items-start gap-2.5 border border-transparent hover:border-amber-200"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{result.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{result.address}</p>
                      </div>
                      {isProvisioning && <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)} disabled={isProvisioning}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={Boolean(targetItem)} onOpenChange={(open) => !open && setTargetItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert
                className={cn(
                  "h-5 w-5",
                  targetItem?.nextState ? "text-emerald-600" : "text-rose-600"
                )}
              />
              Confirm {targetItem?.nextState ? "Enable" : "Disable"} Hourly Helper
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 text-sm text-gray-600">
              <p>
                Target Location:{" "}
                <strong className="text-gray-900">
                  {targetItem?.item.displayName} ({targetItem?.item.locationType})
                </strong>
              </p>

              {targetItem?.nextState ? (
                <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-900 border border-emerald-200">
                  <p className="font-semibold">Enabling Hourly Helper:</p>
                  <p className="mt-1">
                    New hourly bookings will become available in this location, subject to active helper availability ({targetItem.item.eligibleHelperCount} active helpers in this location).
                  </p>
                </div>
              ) : (
                <div className="rounded-md bg-rose-50 p-3 text-xs text-rose-900 border border-rose-200">
                  <p className="font-semibold">Disabling Hourly Helper:</p>
                  <p className="mt-1">
                    New customer hourly bookings in this location will be immediately blocked ("Coming Soon" response).
                  </p>
                  <p className="mt-1 font-medium">
                    ✓ Customer Android app requires NO changes. Existing hourly prices, partner work areas, confirmed bookings, and ongoing work remain 100% preserved.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={toggleMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              disabled={toggleMutation.isPending}
              variant={targetItem?.nextState ? "default" : "destructive"}
              onClick={() => {
                if (!targetItem) return;
                toggleMutation.mutate({
                  type: targetItem.item.locationType,
                  id: targetItem.item.locationId,
                  isEnabled: targetItem.nextState,
                });
              }}
              className={cn(
                targetItem?.nextState &&
                  "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              )}
            >
              {toggleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {targetItem?.nextState ? "Confirm Enable" : "Confirm Disable"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
