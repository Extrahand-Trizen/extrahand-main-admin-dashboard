'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, MapPin, Plus, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  createLocation,
  listLocations,
  searchLocations,
  type LocationRecord,
  type GoogleLocationResult,
} from '@/lib/api/location-pricing';
import {
  listServiceCatalog,
  listBookNowLocationAvailability,
  removeBookNowLocationFromAvailability,
  updateBookNowLocationAvailability,
  type BookNowLocationType,
} from '@/lib/api/services';

const LOCATION_TYPES: Array<{ value: BookNowLocationType | 'all'; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'area', label: 'Area' },
  { value: 'pincode', label: 'Pincode' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
];

function getCityCatalogNames(cityName: string, stateName: string) {
  const name = cityName.trim().replace(/\s+/g, ' ');
  const compactName = name.toLocaleLowerCase('en-IN').replace(/[\s-]+/g, '');
  if (
    /^telangana$/i.test(stateName) &&
    ['mahabubnagar', 'mahbubnagar'].includes(compactName)
  ) {
    return {
      canonicalName: 'Mahabubnagar',
      aliases: ['Mahabubnagar', 'Mahabub Nagar', 'Mahbubnagar', 'Mahbub Nagar'],
    };
  }
  return { canonicalName: name, aliases: [name] };
}

export default function BookNowAvailabilityPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState<BookNowLocationType | 'all'>('all');
  const [catalogId, setCatalogId] = useState('');
  const [status, setStatus] = useState<'all' | 'enabled' | 'disabled' | 'mixed'>('all');
  const [addCityOpen, setAddCityOpen] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityStateId, setNewCityStateId] = useState('');
  const [addAreaOpen, setAddAreaOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [debouncedAreaSearch, setDebouncedAreaSearch] = useState('');
  const [selectedAreaResult, setSelectedAreaResult] = useState<GoogleLocationResult | null>(null);
  const [locationToRemove, setLocationToRemove] = useState<{
    locationType: BookNowLocationType;
    locationId: string;
    displayName: string;
  } | null>(null);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedAreaSearch(newAreaName.trim()), 250);
    return () => clearTimeout(timeout);
  }, [newAreaName]);
  const serviceCatalogQuery = useQuery({
    queryKey: ['book-now-availability-service-catalog'],
    queryFn: listServiceCatalog,
    staleTime: 5 * 60_000,
  });
  const statesQuery = useQuery({
    queryKey: ['book-now-availability-states'],
    queryFn: async () => {
      const response = await listLocations({ type: 'state', isActive: 'true' });
      if (!response?.success || !Array.isArray(response.data)) {
        throw new Error(response?.error || 'Failed to load states');
      }
      return response.data.filter((state) => state.isActive);
    },
    staleTime: 5 * 60_000,
  });
  const query = useQuery({
    queryKey: ['book-now-location-availability', debouncedSearch, type, catalogId],
    queryFn: () =>
      listBookNowLocationAvailability({
        search: debouncedSearch,
        type,
        catalogId: catalogId || undefined,
      }),
    staleTime: 30_000,
  });
  const areaSearchQuery = useQuery({
    queryKey: ['book-now-area-place-search', debouncedAreaSearch],
    queryFn: () => searchLocations(debouncedAreaSearch),
    enabled: addAreaOpen && !selectedAreaResult && debouncedAreaSearch.length >= 2,
    staleTime: 30_000,
  });
  const mutation = useMutation({
    mutationFn: updateBookNowLocationAvailability,
    onSuccess: async (result) => {
      toast.success(
        `${result.locationType} ${catalogId ? 'service ' : ''}availability updated`,
      );
      await queryClient.invalidateQueries({ queryKey: ['book-now-location-availability'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update availability'),
  });
  const removeLocationMutation = useMutation({
    mutationFn: () => {
      if (!locationToRemove) throw new Error('Select a location to remove');
      return removeBookNowLocationFromAvailability(
        locationToRemove.locationType,
        locationToRemove.locationId,
      );
    },
    onSuccess: async () => {
      toast.success('Location marked unavailable and removed from Book Now');
      setLocationToRemove(null);
      await queryClient.invalidateQueries({ queryKey: ['book-now-location-availability'] });
    },
    onError: (error: Error) =>
      toast.error(error.message || 'Failed to remove location from Book Now'),
  });
  const createCityMutation = useMutation({
    mutationFn: async ({ name, stateId }: { name: string; stateId: string }) => {
      const state = (statesQuery.data || []).find((item) => item._id === stateId);
      if (!state) throw new Error('Select a valid state');
      const names = getCityCatalogNames(name, state.displayName || state.canonicalName || '');
      const created = await createLocation('city', {
        stateId,
        canonicalName: names.canonicalName,
        displayName: names.canonicalName,
        aliases: names.aliases,
      });
      if (!created?.success || !created.data?._id) {
        throw new Error(created?.error || 'Failed to add city');
      }

      try {
        await updateBookNowLocationAvailability({
          locationType: 'city',
          locationId: created.data._id,
          isEnabled: false,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`City was added, but its availability could not be set. Refresh and configure it manually. ${detail}`);
      }

      return created.data;
    },
    onSuccess: async (city) => {
      const cityName = city.displayName || city.canonicalName || 'City';
      toast.success(`${cityName} added as unavailable`);
      setAddCityOpen(false);
      setNewCityName('');
      setNewCityStateId('');
      setSearch(cityName);
      setType('city');
      setCatalogId('');
      setStatus('all');
      await queryClient.invalidateQueries({ queryKey: ['book-now-location-availability'] });
    },
    onError: async (error: Error) => {
      toast.error(error.message || 'Failed to add city');
      await queryClient.invalidateQueries({ queryKey: ['book-now-location-availability'] });
    },
  });
  const createAreaMutation = useMutation({
    mutationFn: async (result: GoogleLocationResult) => {
      const name = result.name.trim();
      if (!name) throw new Error('Select a valid area from the location suggestions');
      const created = await createLocation('area', {
        canonicalName: name,
        displayName: name,
        aliases: [name, result.address].filter(Boolean),
        provider: 'google',
        providerPlaceId: result.placeId,
        formattedAddress: result.formattedAddress || result.address,
      });
      if (!created?.success || !created.data?._id) {
        throw new Error(created?.error || 'Failed to add area');
      }

      try {
        await updateBookNowLocationAvailability({
          locationType: 'area',
          locationId: created.data._id,
          isEnabled: false,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Area was added, but its availability could not be set. Refresh and configure it manually. ${detail}`);
      }

      return created.data;
    },
    onSuccess: async (area) => {
      toast.success(`${area.displayName || area.canonicalName || 'Area'} added as unavailable`);
      setAddAreaOpen(false);
      setNewAreaName('');
      setSelectedAreaResult(null);
      await queryClient.invalidateQueries({ queryKey: ['book-now-location-availability'] });
    },
    onError: async (error: Error) => {
      toast.error(error.message || 'Failed to add area');
      await queryClient.invalidateQueries({ queryKey: ['book-now-location-availability'] });
    },
  });
  const allLocations = query.data || [];
  const locations = allLocations.filter((location) =>
    status === 'all' || location.availabilityMode === status,
  );
  const enabledCount = allLocations.filter((location) => location.availabilityMode === 'enabled').length;
  const disabledCount = allLocations.filter((location) => location.availabilityMode === 'disabled').length;
  const mixedCount = allLocations.filter((location) => location.availabilityMode === 'mixed').length;
  const areaSuggestions = areaSearchQuery.data?.data || [];
  const selectedCategory = serviceCatalogQuery.data?.find(
    (category) => category.slug === catalogId,
  );
  const availableStates = statesQuery.data || [];
  const selectedCityStateId =
    newCityStateId ||
    availableStates.find((state) => /^telangana$/i.test(state.displayName || state.canonicalName || ''))?._id ||
    '';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-amber-600" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Book Now Availability</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Enable or disable Book Now bookings by area, pincode, city, or state.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddCityOpen(true)}
            disabled={statesQuery.isLoading || statesQuery.isError || availableStates.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add city
          </Button>
          <Button size="sm" onClick={() => setAddAreaOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add area
          </Button>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="p-4 text-sm text-amber-950">
          Location rules apply from most specific to broadest: area, pincode, city, then state.
          Listed locations without an explicit rule keep their current defaults. Addresses that do not match a listed location are unavailable.
          The all-services switch is a master control; service-category rules can further disable an individual category.
          {serviceCatalogQuery.isError ? (
            <p role="alert" className="mt-2 text-rose-700">
              Could not load service categories. Refresh the page and try again.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Locations shown</CardDescription>
            <CardTitle className="text-2xl">{allLocations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-emerald-700">Available</CardDescription>
            <CardTitle className="text-2xl text-emerald-700">{enabledCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-rose-700">Unavailable</CardDescription>
            <CardTitle className="text-2xl text-rose-700">{disabledCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-amber-700">Varies by pincode</CardDescription>
            <CardTitle className="text-2xl text-amber-700">{mixedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search areas, pincodes, cities, or states"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={type} onValueChange={(value) => setType(value as BookNowLocationType | 'all')}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LOCATION_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={catalogId || 'all'}
            onValueChange={(value) => setCatalogId(value === 'all' ? '' : value)}
            disabled={serviceCatalogQuery.isLoading || serviceCatalogQuery.isError}
          >
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services (master)</SelectItem>
              {(serviceCatalogQuery.data || [])
                .filter((category) => category.isActive)
                .map((category) => (
                  <SelectItem key={category.slug} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="enabled">Available</SelectItem>
              <SelectItem value="disabled">Unavailable</SelectItem>
              <SelectItem value="mixed">Varies by pincode</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              Loading locations…
            </div>
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <p className="text-sm font-semibold text-gray-900">Could not load Book Now availability.</p>
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Try again</Button>
            </div>
          ) : locations.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">No matching locations found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    {selectedCategory ? `${selectedCategory.name} availability` : 'Book Now'}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={`${location.locationType}:${location.locationId}`}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{location.displayName}</div>
                      {location.parentDisplayName ? (
                        <div className="text-xs text-gray-500">{location.parentDisplayName}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize">{location.locationType}</TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {location.isExplicit
                        ? catalogId
                          ? 'Service category override'
                          : 'Location override'
                        : location.availabilityMode === 'mixed'
                          ? 'Varies by pincode'
                        : location.inheritedFrom
                          ? `Inherited from ${location.inheritedFrom}`
                          : 'Default (available)'}
                      {location.updatedAt ? (
                        <div className="mt-1 text-gray-400">
                          Updated {new Date(location.updatedAt).toLocaleDateString()}
                          {location.updatedBy ? ` by ${location.updatedBy}` : ''}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge className={location.availabilityMode === 'mixed'
                        ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50'
                        : location.isEnabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50'
                          : 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-50'}>
                        {location.availabilityMode === 'mixed'
                          ? <MapPin className="mr-1 h-3 w-3" />
                          : location.isEnabled
                          ? <CheckCircle2 className="mr-1 h-3 w-3" />
                          : <XCircle className="mr-1 h-3 w-3" />}
                        {location.availabilityMode === 'mixed'
                          ? 'Varies'
                          : location.isEnabled
                            ? 'Available'
                            : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {location.availabilityMode === 'mixed' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({
                              locationType: location.locationType,
                              locationId: location.locationId,
                              isEnabled: true,
                              catalogId: catalogId || undefined,
                            })}
                          >
                            {catalogId ? 'Enable category' : 'Enable all'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-700"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({
                              locationType: location.locationType,
                              locationId: location.locationId,
                              isEnabled: false,
                              catalogId: catalogId || undefined,
                            })}
                          >
                            {catalogId ? 'Disable category' : 'Disable all'}
                          </Button>
                        </div>
                      ) : (
                        <Switch
                          checked={location.isEnabled}
                          disabled={mutation.isPending}
                          aria-label={`Set Book Now ${location.displayName} ${location.isEnabled ? 'unavailable' : 'available'}`}
                          onCheckedChange={(isEnabled) => mutation.mutate({
                            locationType: location.locationType,
                            locationId: location.locationId,
                            isEnabled,
                            catalogId: catalogId || undefined,
                          })}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        aria-label={`Remove ${location.displayName} from Book Now`}
                        title="Mark unavailable and remove from Book Now"
                        disabled={removeLocationMutation.isPending || mutation.isPending}
                        onClick={() => setLocationToRemove({
                          locationType: location.locationType,
                          locationId: location.locationId,
                          displayName: location.displayName,
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(locationToRemove)}
        onOpenChange={(open) => {
          if (!open && !removeLocationMutation.isPending) setLocationToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove location from Book Now?</AlertDialogTitle>
            <AlertDialogDescription>
              {locationToRemove?.displayName} will be marked unavailable for all Book Now services and removed from this screen. The location remains available to other platform features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeLocationMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={removeLocationMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                removeLocationMutation.mutate();
              }}
            >
              {removeLocationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Mark unavailable and remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={addCityOpen}
        onOpenChange={(open) => {
          setAddCityOpen(open);
          if (!open && !createCityMutation.isPending) {
            setNewCityName('');
            setNewCityStateId('');
          }
        }}
      >
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (newCityName.trim() && selectedCityStateId) {
                createCityMutation.mutate({
                  name: newCityName.trim(),
                  stateId: selectedCityStateId,
                });
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Add Book Now city</DialogTitle>
              <DialogDescription>
                Add a city to the location catalog. New cities start as unavailable; enable Book Now after adding it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="book-now-city-name">City name</Label>
                <Input
                  id="book-now-city-name"
                  className="mt-2"
                  placeholder="e.g. Mahabub Nagar"
                  value={newCityName}
                  onChange={(event) => setNewCityName(event.target.value)}
                  maxLength={120}
                  autoFocus
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="book-now-city-state">State</Label>
                <Select
                  value={selectedCityStateId}
                  onValueChange={setNewCityStateId}
                  disabled={statesQuery.isLoading || statesQuery.isError}
                >
                  <SelectTrigger id="book-now-city-state" className="mt-2">
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStates.map((state: LocationRecord) => (
                      <SelectItem key={state._id} value={state._id}>
                        {state.displayName || state.canonicalName || state._id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {statesQuery.isError ? (
                  <p role="alert" className="mt-2 text-xs text-rose-600">
                    Could not load states. Refresh the page and try again.
                  </p>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddCityOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !newCityName.trim() ||
                  !selectedCityStateId ||
                  createCityMutation.isPending
                }
              >
                {createCityMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Add unavailable city
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addAreaOpen} onOpenChange={setAddAreaOpen}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (selectedAreaResult) createAreaMutation.mutate(selectedAreaResult);
            }}
          >
            <DialogHeader>
              <DialogTitle>Add Book Now area</DialogTitle>
              <DialogDescription>
                Search for and select a Google Maps area. New areas start as unavailable.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="book-now-area-name">Search area</Label>
              <div className="relative">
                <Input
                  id="book-now-area-name"
                  className="mt-2"
                  placeholder="Type an area, e.g. Madhapur"
                  value={newAreaName}
                  onChange={(event) => {
                    setNewAreaName(event.target.value);
                    setSelectedAreaResult(null);
                  }}
                  maxLength={120}
                  autoFocus
                  autoComplete="off"
                />
                {selectedAreaResult ? (
                  <p className="mt-2 text-xs text-emerald-700">
                    Selected area: {selectedAreaResult.name} · Book Now location type: area
                  </p>
                ) : null}
                {!selectedAreaResult && debouncedAreaSearch.length >= 2 ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border bg-white shadow-lg">
                    {areaSearchQuery.isFetching ? (
                      <p className="px-3 py-2 text-sm text-gray-500">Searching locations…</p>
                    ) : areaSearchQuery.isError ? (
                      <p className="px-3 py-2 text-sm text-rose-600">
                        Could not fetch location suggestions. Check the Maps configuration and try again.
                      </p>
                    ) : areaSuggestions.length ? (
                      areaSuggestions.map((result) => (
                        <button
                          key={result.placeId}
                          type="button"
                          className="block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-amber-50"
                          onClick={() => {
                            setSelectedAreaResult(result);
                            setNewAreaName(result.name);
                          }}
                        >
                          <span className="block text-sm font-medium text-gray-900">{result.name}</span>
                          <span className="block text-xs text-gray-500">{result.address}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-gray-500">No matching locations found.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddAreaOpen(false);
                  setSelectedAreaResult(null);
                  setNewAreaName('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedAreaResult || createAreaMutation.isPending}>
                {createAreaMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add unavailable area
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
