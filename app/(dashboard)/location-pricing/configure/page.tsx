'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  listLocations,
  searchLocations,
  ensureGoogleLocation,
  listPricingCategories,
  listPricingSkus,
  listHourlySkus,
  listHourlyPrices,
  createHourlyPrice,
  updateHourlyPrice,
  updateSkuGlobalPrice,
  LocationRecord,
  GoogleLocationResult,
  PricingSku,
  HourlySku,
} from '@/lib/api/location-pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Globe,
  MapPin,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function ConfigurePriceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isSuperAdmin, loading: authLoading } = useAuth();

  const initialTargetScope = (searchParams.get('scope') as 'global' | 'location') || 'location';
  const initialSkuId = searchParams.get('skuId') || '';
  const initialRuleId = searchParams.get('ruleId') || '';
  const initialLocationId = searchParams.get('locationId') || '';

  // Form State
  const [targetScope, setTargetScope] = useState<'global' | 'location'>(initialTargetScope);
  const [pricingScope, setPricingScope] = useState<'fixed' | 'hourly'>('fixed');
  
  // Location selection state
  const [locationSearch, setLocationSearch] = useState('');
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationRecord | null>(null);

  // Category & SKU selection state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [selectedSkuId, setSelectedSkuId] = useState<string>(initialSkuId);
  const [existingRuleId, setExistingRuleId] = useState<string>(initialRuleId);
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocationSearch(locationSearch), 300);
    return () => clearTimeout(timer);
  }, [locationSearch]);

  // Queries
  const categoriesQuery = useQuery({
    queryKey: ['pricingCategories'],
    queryFn: async () => (await listPricingCategories()).data,
  });

  const categories = categoriesQuery.data || [];
  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);
  const subcategories = selectedCategory?.subcategories || [];

  const selectedSubcategory = subcategories.find((sub) => sub.id === selectedSubcategoryId);
  const activeSkuCategoryId = selectedSubcategory?.categoryId || selectedCategoryId;
  const activeSectionId = selectedSubcategory?.sectionId;

  const skusQuery = useQuery({
    queryKey: ['pricingSkus', selectedCategoryId, activeSkuCategoryId, activeSectionId],
    queryFn: async () => {
      if (!activeSkuCategoryId) return [];
      const res = await listPricingSkus(activeSkuCategoryId, activeSectionId);
      return res?.data || [];
    },
    enabled: pricingScope === 'fixed' && Boolean(selectedCategoryId),
  });

  const hourlySkusQuery = useQuery({
    queryKey: ['hourlySkus'],
    queryFn: async () => (await listHourlySkus()).data,
    enabled: pricingScope === 'hourly',
  });

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: async () => (await listLocations({ limit: '100', isActive: 'true' })).data,
  });

  const googleQuery = useQuery({
    queryKey: ['locationSearch', debouncedLocationSearch],
    queryFn: async () => (await searchLocations(debouncedLocationSearch)).data,
    enabled: Boolean(debouncedLocationSearch.trim().length >= 2),
  });

  const hourlyPricesQuery = useQuery({
    queryKey: ['hourlyPrices'],
    queryFn: async () => (await listHourlyPrices()).data,
  });

  // Prepopulate selected location if passed via query param
  useEffect(() => {
    if (initialLocationId && locationsQuery.data) {
      const found = locationsQuery.data.find((loc) => loc._id === initialLocationId);
      if (found) setSelectedLocation(found);
    }
  }, [initialLocationId, locationsQuery.data]);

  // Prepopulate category/sku if passed
  useEffect(() => {
    if (initialSkuId) {
      if (initialSkuId === 'hourly-helper' || initialSkuId.includes('hourly')) {
        setPricingScope('hourly');
        setSelectedSkuId(initialSkuId);
      }
    }
  }, [initialSkuId]);

  const availableSkus: PricingSku[] = pricingScope === 'fixed' ? (skusQuery.data || []) : [];
  const availableHourlySkus: HourlySku[] = pricingScope === 'hourly' ? (hourlySkusQuery.data || []) : [];

  const currentSku = pricingScope === 'fixed'
    ? availableSkus.find((s) => s._id === selectedSkuId)
    : availableHourlySkus.find((s) => s._id === selectedSkuId || s.slug === selectedSkuId);

  const globalBasePrice = currentSku
    ? (pricingScope === 'fixed' ? (currentSku as PricingSku).defaultPrice : (currentSku as HourlySku).offerPrice || (currentSku as HourlySku).basePrice)
    : 0;

  // Find existing rule if location and SKU are selected (robust matching across ObjectIds & strings)
  const activeExistingRule = selectedLocation && selectedSkuId && hourlyPricesQuery.data
    ? hourlyPricesQuery.data.find((rule) => {
        const ruleSku = String(rule.skuId || (typeof rule.sku === 'object' && rule.sku?._id) || '');
        const ruleLoc = String(rule.locationId || (typeof (rule as any).location === 'object' && (rule as any).location?._id) || '');
        return ruleSku === String(selectedSkuId) && ruleLoc === String(selectedLocation._id);
      })
    : null;

  // Auto-select single subcategory if only 1 exists
  useEffect(() => {
    if (pricingScope === 'fixed' && selectedCategoryId) {
      if (subcategories.length === 1 && selectedSubcategoryId !== subcategories[0].id) {
        setSelectedSubcategoryId(subcategories[0].id);
      }
    }
  }, [pricingScope, selectedCategoryId, subcategories, selectedSubcategoryId]);

  // Auto-select single SKU if only 1 package is available
  useEffect(() => {
    if (pricingScope === 'fixed' && availableSkus.length === 1) {
      if (selectedSkuId !== availableSkus[0]._id) {
        setSelectedSkuId(availableSkus[0]._id);
      }
    } else if (pricingScope === 'hourly' && availableHourlySkus.length === 1) {
      if (selectedSkuId !== availableHourlySkus[0]._id) {
        setSelectedSkuId(availableHourlySkus[0]._id);
      }
    }
  }, [pricingScope, availableSkus, availableHourlySkus, selectedSkuId]);

  // Auto-fill price
  useEffect(() => {
    if (targetScope === 'global') {
      if (globalBasePrice > 0) setOfferPrice(String(globalBasePrice));
    } else {
      if (activeExistingRule) {
        setOfferPrice(String(activeExistingRule.offerPrice));
        setExistingRuleId(activeExistingRule._id);
      } else if (globalBasePrice > 0 && !offerPrice) {
        setOfferPrice(String(globalBasePrice));
        setExistingRuleId('');
      }
    }
  }, [targetScope, selectedSkuId, activeExistingRule, globalBasePrice]);

  // Mutations
  const ensureGoogleMutation = useMutation({
    mutationFn: (googleResult: GoogleLocationResult) => ensureGoogleLocation(googleResult),
    onSuccess: (res) => {
      if (res.data) {
        setSelectedLocation(res.data);
        setLocationSearch('');
        queryClient.invalidateQueries({ queryKey: ['locations'] });
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedPrice = Number(offerPrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) throw new Error('Please enter a valid price');
      if (!selectedSkuId) throw new Error('Please select a service package or hourly work type');

      if (targetScope === 'global') {
        return updateSkuGlobalPrice(selectedSkuId, parsedPrice);
      } else {
        if (!selectedLocation) throw new Error('Please select a target location');
        const locType = (['area', 'pincode', 'city'].includes(selectedLocation.type)
          ? selectedLocation.type
          : 'city') as 'area' | 'pincode' | 'city';

        if (existingRuleId || activeExistingRule) {
          const ruleId = existingRuleId || activeExistingRule?._id;
          return updateHourlyPrice(ruleId!, { offerPrice: parsedPrice, isActive: true });
        } else {
          try {
            return await createHourlyPrice({
              skuId: selectedSkuId,
              locationType: locType,
              locationId: selectedLocation._id,
              offerPrice: parsedPrice,
            });
          } catch (err: any) {
            // Fallback catch: If rule already exists in DB, update it instead of failing with 409 Conflict
            if (err?.message?.includes('already exists') || err?.status === 409) {
              const allRulesRes = await listHourlyPrices();
              const existing = (allRulesRes?.data || []).find(
                (r) =>
                  String(r.skuId || (r.sku as any)?._id) === String(selectedSkuId) &&
                  String(r.locationId || (r as any).location?._id) === String(selectedLocation._id)
              );
              if (existing?._id) {
                return updateHourlyPrice(existing._id, { offerPrice: parsedPrice, isActive: true });
              }
            }
            throw err;
          }
        }
      }
    },
    onSuccess: () => {
      setFeedback({
        type: 'success',
        message: targetScope === 'global'
          ? 'Global base price updated successfully!'
          : activeExistingRule || existingRuleId
          ? 'Existing location price override updated successfully!'
          : 'Location price override saved successfully!',
      });
      queryClient.invalidateQueries({ queryKey: ['hourlyPrices'] });
      queryClient.invalidateQueries({ queryKey: ['pricingSkus'] });
      queryClient.invalidateQueries({ queryKey: ['hourlySkus'] });
      setTimeout(() => router.push('/location-pricing'), 900);
    },
    onError: (err: Error) => {
      setFeedback({ type: 'error', message: err.message || 'Failed to save price configuration' });
    },
  });

  if (!authLoading && !isSuperAdmin) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 pb-24 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200/80 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-gray-600 hover:bg-gray-100 border border-gray-200"
            onClick={() => router.push('/location-pricing')}
          >
            <ArrowLeft className="h-4 w-4 mr-1 text-gray-500" /> Back
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">
              Configure Price Rate
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Set master global base rates or assign custom price overrides for specific locations.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="w-fit text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border-amber-300 font-semibold">
          {targetScope === 'global' ? 'Global Default Mode' : 'Location Override Mode'}
        </Badge>
      </div>

      {feedback && (
        <div
          className={cn(
            'p-3 rounded-md text-xs flex items-center justify-between border shadow-2xs',
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Form Inputs */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="border-gray-200/80 shadow-2xs bg-white overflow-visible">
            <CardContent className="p-5 sm:p-6 space-y-6 overflow-visible">
              
              {/* Field 1: Pricing Scope */}
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-bold text-gray-900 block">1. Pricing Scope</Label>
                  <p className="text-[11px] text-gray-500">
                    Choose whether to update the master default rate across all regions or override prices for a specific location.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetScope('global');
                      setSelectedLocation(null);
                    }}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      targetScope === 'global'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-2xs ring-1 ring-amber-500/30'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className={cn("h-4 w-4", targetScope === 'global' ? "text-amber-600" : "text-gray-400")} />
                      <span className="text-xs font-bold">Global Base Price</span>
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-1">Applies everywhere as default catalog price</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('location')}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      targetScope === 'location'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-2xs ring-1 ring-amber-500/30'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className={cn("h-4 w-4", targetScope === 'location' ? "text-amber-600" : "text-gray-400")} />
                      <span className="text-xs font-bold">Location Override</span>
                    </div>
                    <p className="text-[10px] text-gray-500 line-clamp-1">Custom rate for area, pincode, or city</p>
                  </button>
                </div>
              </div>

              {/* Field 2: Target Location (Location Override only) */}
              {targetScope === 'location' && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <div>
                    <Label className="text-xs font-bold text-gray-900 block">2. Target Location</Label>
                    <p className="text-[11px] text-gray-500">
                      Search Google Maps or select from pre-configured active locations in ExtraHand.
                    </p>
                  </div>
              
              {selectedLocation ? (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-md flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-4 w-4 text-amber-700 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {selectedLocation.displayName || selectedLocation.area || selectedLocation.city || selectedLocation.normalizedKey}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize bg-white font-semibold border-amber-300">
                          {selectedLocation.type}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {[selectedLocation.area, selectedLocation.city, selectedLocation.state, selectedLocation.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-amber-800 hover:bg-amber-100 px-2 shrink-0 font-semibold"
                    onClick={() => setSelectedLocation(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      className="pl-8 h-8 text-xs bg-white border-gray-200"
                      placeholder="Search place, area, pincode, or city..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                    />
                  </div>

                  {googleQuery.data && googleQuery.data.length > 0 && (
                    <div className="border border-gray-200 rounded-md bg-white shadow-md max-h-40 overflow-y-auto divide-y divide-gray-100">
                      {googleQuery.data.map((item) => (
                        <button
                          key={item.placeId}
                          type="button"
                          className="w-full text-left p-2 hover:bg-amber-50 text-xs transition-colors flex items-center justify-between"
                          onClick={() => ensureGoogleMutation.mutate(item)}
                        >
                          <div>
                            <p className="font-semibold text-gray-900 text-xs">{item.name}</p>
                            <p className="text-[10px] text-gray-500">{item.address}</p>
                          </div>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">Select</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {locationsQuery.data && locationsQuery.data.length > 0 && (
                    <Select
                      onValueChange={(val) => {
                        const found = locationsQuery.data.find((l) => l._id === val);
                        if (found) setSelectedLocation(found);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-gray-50/60">
                        <SelectValue placeholder="Or select from existing configured locations..." />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-56 overflow-y-auto z-[300] bg-white border border-gray-200 shadow-xl">
                        {locationsQuery.data.map((loc) => (
                          <SelectItem key={loc._id} value={loc._id} className="text-xs">
                            {loc.displayName || loc.area || loc.city || loc.normalizedKey} ({loc.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Service Selection */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div>
              <Label className="text-xs font-bold text-gray-900 block">
                {targetScope === 'location' ? '3. Service Selection' : '2. Service Selection'}
              </Label>
              <p className="text-[11px] text-gray-500">
                Select the service category and package or hourly work model you wish to price.
              </p>
            </div>

            {/* Service Type Switch */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPricingScope('fixed');
                  setSelectedSkuId('');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border',
                  pricingScope === 'fixed'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-700" /> Book Now Fixed Package
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricingScope('hourly');
                  setSelectedSkuId('');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border',
                  pricingScope === 'hourly'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                )}
              >
                <Clock className="h-3.5 w-3.5 text-amber-700" /> Hourly Based Work
              </button>
            </div>

            {/* Book Now Selectors */}
            {pricingScope === 'fixed' ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category Field */}
                  <div>
                    <Label className="text-[11px] font-semibold text-gray-800 mb-0.5 block">Category</Label>
                    <p className="text-[10px] text-gray-400 mb-1">Primary service section</p>
                    <Select
                      value={selectedCategoryId}
                      onValueChange={(val) => {
                        setSelectedCategoryId(val);
                        setSelectedSubcategoryId('');
                        setSelectedSkuId('');
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Select Category..." />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-56 overflow-y-auto z-[300] bg-white border border-gray-200 shadow-xl">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="text-xs">
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory Field */}
                  <div>
                    <Label className="text-[11px] font-semibold text-gray-800 mb-0.5 block">Subcategory</Label>
                    <p className="text-[10px] text-gray-400 mb-1">Filter by sub-group (if applicable)</p>
                    <Select
                      value={selectedSubcategoryId}
                      disabled={!selectedCategoryId || subcategories.length === 0}
                      onValueChange={(val) => {
                        setSelectedSubcategoryId(val);
                        setSelectedSkuId('');
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder={subcategories.length === 0 ? "Direct Packages (No Subcategories)" : "Select Subcategory..."} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-56 overflow-y-auto z-[300] bg-white border border-gray-200 shadow-xl">
                        {subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id} className="text-xs">
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <Label className="text-[11px] font-semibold text-gray-800 block">Service Package (SKU)</Label>
                    {skusQuery.isFetching && (
                      <span className="text-[10px] text-amber-700 flex items-center gap-1 font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" /> Fetching packages...
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mb-1">Target service package to adjust rate</p>
                  <Select
                    value={selectedSkuId}
                    disabled={!selectedCategoryId || skusQuery.isLoading}
                    onValueChange={(val) => setSelectedSkuId(val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder={!selectedCategoryId ? "Select Category First..." : skusQuery.isLoading ? "Loading packages..." : availableSkus.length === 0 ? "No packages found" : "Select Service Package..."} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-56 overflow-y-auto z-[300] bg-white border border-gray-200 shadow-xl">
                      {skusQuery.isLoading ? (
                        <SelectItem disabled value="_loading" className="text-xs text-gray-400">
                          Loading packages...
                        </SelectItem>
                      ) : availableSkus.length === 0 ? (
                        <SelectItem disabled value="_empty" className="text-xs text-gray-400">
                          No packages available under this category
                        </SelectItem>
                      ) : (
                        availableSkus.map((sku) => (
                          <SelectItem key={sku._id} value={sku._id} className="text-xs">
                            {sku.name} (Global Base: ₹{sku.defaultPrice})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <Label className="text-[11px] font-semibold text-gray-800 mb-0.5 block">Hourly Work Type</Label>
                <p className="text-[10px] text-gray-400 mb-1">Select helper hourly task profile</p>
                <Select
                  value={selectedSkuId}
                  onValueChange={(val) => setSelectedSkuId(val)}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Select Hourly Work..." />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-56 overflow-y-auto z-[300] bg-white border border-gray-200 shadow-xl">
                    {availableHourlySkus.map((sku) => (
                      <SelectItem key={sku._id} value={sku._id} className="text-xs">
                        {sku.name} (Global Rate: ₹{sku.offerPrice || sku.basePrice}/hr)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 4. Price Entry */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <div>
              <Label className="text-xs font-bold text-gray-900 block">
                {targetScope === 'location' ? '4. Enter Override Price' : '3. Enter Global Base Price'}
              </Label>
              <p className="text-[11px] text-gray-500">
                {targetScope === 'global'
                  ? 'Set the new master default price in INR for all users across India.'
                  : 'Set the custom price rate in INR for users booking in the selected location.'}
              </p>
            </div>

            {targetScope === 'location' && (activeExistingRule || existingRuleId) && (
              <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-lg text-xs flex items-center justify-between text-amber-950 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Existing location rate set at <strong className="font-bold">₹{activeExistingRule?.offerPrice || offerPrice}</strong>. Saving will update this existing rate.
                  </span>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] shrink-0 font-semibold">
                  Rule Exists
                </Badge>
              </div>
            )}

            <div className="relative max-w-xs">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">₹</span>
              <Input
                type="number"
                min="0"
                step="1"
                className="pl-7 h-10 text-base font-extrabold text-gray-900 bg-white border-gray-300 focus:border-amber-500"
                placeholder="0"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs px-4 border-gray-200 text-gray-700"
              onClick={() => router.push('/location-pricing')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveMutation.isPending || !selectedSkuId || (targetScope === 'location' && !selectedLocation)}
              className="h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-2xs px-5"
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : targetScope === 'global' ? (
                'Update Global Base Price'
              ) : activeExistingRule || existingRuleId ? (
                'Update Location Override'
              ) : (
                'Save Location Override'
              )}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>

    {/* Right Column: Pricing Guidance & Live Rate Summary */}
    <div className="lg:col-span-5 space-y-4">
      <Card className="border-gray-200/80 shadow-2xs bg-gradient-to-b from-amber-50/40 via-white to-white overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
            <div className="p-1.5 bg-amber-100 rounded-md text-amber-800">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">Pricing Summary</h3>
              <p className="text-[10px] text-gray-500">Live preview of current selection</p>
            </div>
          </div>

          {/* Scope Badge */}
          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Selected Scope:</span>
            <span className="font-bold text-gray-900 flex items-center gap-1.5">
              {targetScope === 'global' ? (
                <>
                  <Globe className="h-3.5 w-3.5 text-amber-600" /> Global Base Rate
                </>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5 text-amber-600" /> Location Override
                </>
              )}
            </span>
          </div>

          {/* Location */}
          {targetScope === 'location' && (
            <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Target Location:</span>
              <span className="font-semibold text-gray-900 truncate max-w-[180px] text-right">
                {selectedLocation ? selectedLocation.displayName || selectedLocation.area || selectedLocation.city : 'None Selected'}
              </span>
            </div>
          )}

          {/* Service */}
          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Selected Service:</span>
            <span className="font-semibold text-gray-900 truncate max-w-[180px] text-right">
              {currentSku ? currentSku.name : 'None Selected'}
            </span>
          </div>

          {/* Global Base Rate */}
          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Master Base Price:</span>
            <span className="font-bold text-gray-800">
              {globalBasePrice > 0 ? `₹${globalBasePrice}` : '—'}
            </span>
          </div>

          {/* New Rate */}
          <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200/90 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wide font-extrabold text-amber-900 block">
                {targetScope === 'global' ? 'New Global Rate' : 'New Location Rate'}
              </span>
              <span className="text-lg font-black text-amber-950">
                {offerPrice ? `₹${offerPrice}` : '₹0'}
              </span>
            </div>

            {globalBasePrice > 0 && offerPrice && Number(offerPrice) !== globalBasePrice && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 border",
                  Number(offerPrice) > globalBasePrice
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-blue-50 text-blue-800 border-blue-300"
                )}
              >
                {Number(offerPrice) > globalBasePrice
                  ? `+₹${Number(offerPrice) - globalBasePrice} (+${Math.round(((Number(offerPrice) - globalBasePrice) / globalBasePrice) * 100)}%)`
                  : `-₹${globalBasePrice - Number(offerPrice)} (-${Math.round(((globalBasePrice - Number(offerPrice)) / globalBasePrice) * 100)}%)`}
              </Badge>
            )}
          </div>

          {/* Rules Guidance Note */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1 text-[11px] text-gray-600">
            <p className="font-bold text-gray-800 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" /> Resolution Logic
            </p>
            <p className="text-[10.5px] leading-relaxed text-gray-500">
              Customers booking in <span className="font-semibold text-gray-700">{selectedLocation?.city || selectedLocation?.displayName || 'a specific area'}</span> will receive this custom rate during checkout. If no override is present, ExtraHand falls back to the Global Base Price.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</div>
  );
}

export default function ConfigurePricePage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-500">Loading price configuration...</div>}>
      <ConfigurePriceContent />
    </Suspense>
  );
}
