'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminBanner,
  BannerPlacement,
  BannerActionType,
  BannerTone,
  CreateBannerPayload,
  listAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  reorderAdminBanners,
  uploadBannerImage,
} from '@/lib/api/banners';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  Plus,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  ExternalLink,
  Smartphone,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Layers,
  UploadCloud,
  Loader2,
  X,
} from 'lucide-react';

// Comprehensive Customer App Screens List
const SCREEN_GROUPS = [
  {
    label: '🛎️ Core Services & Hubs',
    screens: [
      { value: 'HourlyHelperScreen', label: 'Hourly Helper (Hourly Services)' },
      { value: 'BookNow', label: 'Book Now Hub (Scheduled & Instant)' },
      { value: 'PostWorkScreen', label: 'Post a Task (Post & Compare)' },
      { value: 'BookServicesSearch', label: 'Search All Services' },
    ],
  },
  {
    label: '🧹 Home Cleaning Services',
    screens: [
      { value: 'FullHouseCleaningScreen', label: 'Full House Deep Cleaning' },
      { value: 'BathroomCleaningScreen', label: 'Bathroom Cleaning' },
      { value: 'KitchenCleaningScreen', label: 'Kitchen Cleaning' },
      { value: 'SofaCleaningScreen', label: 'Sofa Cleaning' },
      { value: 'MattressCleaningScreen', label: 'Mattress Cleaning' },
      { value: 'WindowGlassCleaningScreen', label: 'Window & Glass Cleaning' },
    ],
  },
  {
    label: '🔧 Appliance & Repair Services',
    screens: [
      { value: 'ApplianceRepairServiceScreen', label: 'Appliance Repair & Service' },
      { value: 'AcRepairServiceScreen', label: 'AC Repair & Servicing' },
      { value: 'TvElectricalServiceScreen', label: 'Electrician & TV Services' },
      { value: 'PlumbingCategoryScreen', label: 'Plumbing Services' },
      { value: 'PaintingConsultationScreen', label: 'Painting & Waterproofing' },
      { value: 'PackersMoversCategory', label: 'Packers & Movers' },
    ],
  },
  {
    label: '🤝 General Labour & Shifting',
    screens: [
      { value: 'DailyLabourScreen', label: 'Daily Labour' },
      { value: 'PersonalAssistantScreen', label: 'Personal Assistance' },
    ],
  },
  {
    label: '🎁 Rewards, Orders & Support',
    screens: [
      { value: 'ReferralScreen', label: 'Refer & Earn ExtraCoins' },
      { value: 'MyTasks', label: 'My Bookings / Orders' },
      { value: 'NotificationCenter', label: 'Notifications' },
      { value: 'HelpSupport', label: 'Help & Customer Support' },
      { value: 'Profile', label: 'Customer Profile' },
    ],
  },
];

const PRESET_CATEGORIES = [
  { value: 'appliance-repair', label: 'Appliance Repair & Service' },
  { value: 'ac-services', label: 'AC Repair & Service' },
  { value: 'home-cleaning', label: 'Home Cleaning' },
  { value: 'plumbing', label: 'Plumbing Services' },
  { value: 'electrical', label: 'Electrician Services' },
  { value: 'painting', label: 'Painting & Waterproofing' },
  { value: 'fresh', label: 'Fresh Picks & Essentials (ExtraMart)' },
  { value: 'grocery', label: 'Daily Staples & Grocery (ExtraMart)' },
  { value: 'snacks', label: 'Snacks & Beverages (ExtraMart)' },
];

const PRESET_TABS = [
  { value: 'book_now', label: 'Book Now Hub Tab' },
  { value: 'post_task', label: 'Post & Compare Tab' },
  { value: 'quick_commerce', label: 'ExtraMart Tab' },
];

export default function BannerManagementPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePlacement, setActivePlacement] = useState<BannerPlacement>('book_services');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminBanner | null>(null);

  // Form State
  const [formPlacement, setFormPlacement] = useState<BannerPlacement>('book_services');
  const [formTag, setFormTag] = useState('');
  const [formEyebrow, setFormEyebrow] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formActionType, setFormActionType] = useState<BannerActionType>('screen');
  const [formActionValue, setFormActionValue] = useState('HourlyHelperScreen');
  const [formCustomScreen, setFormCustomScreen] = useState('');
  const [formCtaLabel, setFormCtaLabel] = useState('Book Now');
  const [formBgColor, setFormBgColor] = useState('#F7F5F2');
  const [formTone, setFormTone] = useState<BannerTone>('light');
  const [formIsActive, setFormIsActive] = useState(true);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Queries
  const { data: bannersResponse, isLoading } = useQuery({
    queryKey: ['adminBanners', activePlacement],
    queryFn: () => listAdminBanners(activePlacement),
  });

  const banners = bannersResponse?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateBannerPayload) => createAdminBanner(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateBannerPayload> }) =>
      updateAdminBanner(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      setDeleteConfirmId(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderAdminBanners(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
    },
  });

  function resetForm() {
    setEditingBanner(null);
    setFormPlacement(activePlacement);
    setFormTag('');
    setFormEyebrow('');
    setFormTitle('');
    setFormSubtitle('');
    setFormImageUrl('');
    setFormActionType('screen');
    setFormActionValue('HourlyHelperScreen');
    setFormCustomScreen('');
    setFormCtaLabel('Book Now');
    setFormBgColor('#F7F5F2');
    setFormTone('light');
    setFormIsActive(true);
    setUploadError(null);
  }

  function openCreateDialog() {
    resetForm();
    setFormPlacement(activePlacement);
    if (activePlacement === 'extramart') {
      setFormActionType('category');
      setFormActionValue('fresh');
      setFormCtaLabel('Shop Now');
      setFormBgColor('#ECFDF5');
    }
    setDialogOpen(true);
  }

  function openEditDialog(banner: AdminBanner) {
    setEditingBanner(banner);
    setFormPlacement(banner.placement);
    setFormTag(banner.tag || '');
    setFormEyebrow(banner.eyebrow || '');
    setFormTitle(banner.title || '');
    setFormSubtitle(banner.subtitle || '');
    setFormImageUrl(banner.imageUrl || '');
    setFormActionType(banner.actionType || 'none');

    // Check if screen is in preset list or custom
    const isKnownScreen = SCREEN_GROUPS.some((g) =>
      g.screens.some((s) => s.value === banner.actionValue)
    );
    if (banner.actionType === 'screen') {
      if (isKnownScreen) {
        setFormActionValue(banner.actionValue || 'HourlyHelperScreen');
        setFormCustomScreen('');
      } else {
        setFormActionValue('_custom');
        setFormCustomScreen(banner.actionValue || '');
      }
    } else {
      setFormActionValue(banner.actionValue || '');
      setFormCustomScreen('');
    }

    setFormCtaLabel(banner.ctaLabel || '');
    setFormBgColor(banner.backgroundColor || '#F7F5F2');
    setFormTone(banner.tone || 'light');
    setFormIsActive(banner.isActive);
    setUploadError(null);
    setDialogOpen(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const res = await uploadBannerImage(file);
      if (res?.data?.url) {
        setFormImageUrl(res.data.url);
      } else {
        setUploadError('Failed to get uploaded image URL from MinIO.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'MinIO image upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleSave() {
    if (!formTitle.trim() && !formImageUrl.trim()) {
      alert('Please provide either a Banner Title or an Image URL.');
      return;
    }

    let finalActionValue = formActionValue;
    if (formActionType === 'screen' && formActionValue === '_custom') {
      finalActionValue = formCustomScreen.trim();
    }

    const payload: CreateBannerPayload = {
      placement: formPlacement,
      tag: formTag.trim(),
      eyebrow: formEyebrow.trim(),
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
      imageUrl: formImageUrl.trim(),
      actionType: formActionType,
      actionValue: formActionType !== 'none' ? finalActionValue.trim() : '',
      ctaLabel: formCtaLabel.trim(),
      backgroundColor: formBgColor,
      tone: formTone,
      isActive: formIsActive,
    };

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner._id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function toggleActive(banner: AdminBanner) {
    updateMutation.mutate({
      id: banner._id,
      payload: { isActive: !banner.isActive },
    });
  }

  function moveBanner(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const newBanners = [...banners];
    const [moved] = newBanners.splice(index, 1);
    newBanners.splice(targetIndex, 0, moved);

    const orderedIds = newBanners.map((b) => b._id);
    reorderMutation.mutate(orderedIds);
  }

  const activeCount = banners.filter((b) => b.isActive).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-amber-600" />
            Banner Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage carousel banners for Book Services and ExtraMart. Upload images to MinIO or use color styles, and link to any mobile screen or category.
          </p>
        </div>

        <Button
          onClick={openCreateDialog}
          className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Banner
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activePlacement}
        onValueChange={(val) => setActivePlacement(val as BannerPlacement)}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-4">
          <TabsList className="bg-gray-100 p-1">
            <TabsTrigger
              value="book_services"
              className="data-[state=active]:bg-white data-[state=active]:text-amber-800 data-[state=active]:shadow-sm px-5 py-2 text-xs font-semibold"
            >
              🛎️ Book Services Banners
            </TabsTrigger>
            <TabsTrigger
              value="extramart"
              className="data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm px-5 py-2 text-xs font-semibold"
            >
              🛒 ExtraMart Banners
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeCount} Active
            </span>
            <span>•</span>
            <span>{banners.length} Total Banners</span>
          </div>
        </div>

        <TabsContent value={activePlacement} className="mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse border border-gray-200" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <Card className="text-center py-16 border-dashed">
              <CardContent className="space-y-4">
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">No banners configured yet</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                    Add promotional hero banners to engage customers on the{' '}
                    {activePlacement === 'book_services' ? 'Book Services' : 'ExtraMart'} screen.
                  </p>
                </div>
                <Button onClick={openCreateDialog} variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-50">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Banner
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map((banner, index) => {
                const hasImg = Boolean(banner.imageUrl);
                const hasCopy = Boolean(
                  banner.tag?.trim() ||
                  banner.eyebrow?.trim() ||
                  banner.title?.trim() ||
                  banner.subtitle?.trim() ||
                  banner.ctaLabel?.trim()
                );
                const isDarkTone = banner.tone === 'dark';
                return (
                  <Card
                    key={banner._id}
                    className={`overflow-hidden transition-all duration-200 border-2 ${
                      banner.isActive
                        ? 'border-gray-200 hover:border-amber-300 shadow-sm'
                        : 'border-gray-200 bg-gray-50/70 opacity-75'
                    }`}
                  >
                    {/* Banner Mobile Preview Simulation */}
                    <div
                      className="relative w-full aspect-[16/9] overflow-hidden flex flex-col justify-center items-center p-3 border-b"
                      style={{ backgroundColor: banner.backgroundColor || '#F7F5F2' }}
                    >
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white tracking-wide">
                          #{index + 1}
                        </span>
                        {banner.isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-[10px] font-bold text-white flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Live
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-gray-600/90 text-[10px] font-bold text-white flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Hidden
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[9px] font-semibold text-amber-800">
                          {hasCopy ? 'Split Card (Image 3)' : 'Full Graphic (Image 2)'}
                        </span>
                      </div>

                      {/* Content Layout */}
                      {hasCopy ? (
                        // Image 3 style: Split Card with Pure White Left Content
                        <div className="w-full h-full bg-white rounded-xl border border-amber-200 overflow-hidden flex shadow-sm mt-5">
                          <div className="flex-[3] p-2.5 bg-white flex flex-col justify-center min-w-0">
                            {banner.tag ? (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 text-[9px] font-bold w-max mb-1">
                                <span>⚡</span>
                                <span>{banner.tag}</span>
                              </div>
                            ) : null}
                            {banner.eyebrow ? (
                              <p className="text-[8px] font-bold text-amber-800 uppercase tracking-wider line-clamp-1 mb-0.5">
                                {banner.eyebrow}
                              </p>
                            ) : null}
                            {banner.title ? (
                              <p className="font-extrabold text-xs text-gray-900 leading-tight line-clamp-2">
                                {banner.title}
                              </p>
                            ) : null}
                            {banner.subtitle ? (
                              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 leading-snug">
                                {banner.subtitle}
                              </p>
                            ) : null}
                            {banner.ctaLabel ? (
                              <div className="mt-1.5">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[9px] font-bold">
                                  {banner.ctaLabel} →
                                </span>
                              </div>
                            ) : null}
                          </div>
                          {hasImg ? (
                            <div className="flex-[2] relative bg-amber-50 overflow-hidden">
                              <img
                                src={banner.imageUrl}
                                alt="Banner art"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : hasImg ? (
                        // Image 2 style: Full Graphic Banner
                        <img
                          src={banner.imageUrl}
                          alt="Full Banner"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 text-xs">
                          <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                          <span>Empty Banner</span>
                        </div>
                      )}
                    </div>

                    {/* Card Details & Controls */}
                    <CardContent className="p-4 space-y-3">
                      {/* Destination Pill */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-gray-400 font-medium">On Tap:</span>
                        <span className="font-semibold text-gray-800 flex items-center gap-1 max-w-[200px] truncate">
                          {banner.actionType === 'screen' ? (
                            <>
                              <Smartphone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">{banner.actionValue || 'Screen'}</span>
                            </>
                          ) : banner.actionType === 'category' ? (
                            <>
                              <FolderOpen className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <span className="truncate">{banner.actionValue || 'Category'}</span>
                            </>
                          ) : banner.actionType === 'tab' ? (
                            <>
                              <Layers className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">
                                {banner.actionValue === 'book_now' ? 'Book Now Tab' : banner.actionValue || 'Tab'}
                              </span>
                            </>
                          ) : banner.actionType === 'url' ? (
                            <>
                              <ExternalLink className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              <span className="truncate">External URL</span>
                            </>
                          ) : (
                            <span className="text-gray-400">None (Display Only)</span>
                          )}
                        </span>
                      </div>

                      {/* Reordering & Action Buttons */}
                      <div className="flex items-center justify-between border-t pt-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            disabled={index === 0}
                            onClick={() => moveBanner(index, 'up')}
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            disabled={index === banners.length - 1}
                            onClick={() => moveBanner(index, 'down')}
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant={banner.isActive ? 'outline' : 'secondary'}
                            className={`h-8 text-xs font-semibold gap-1.5 ${
                              banner.isActive
                                ? 'text-gray-600 hover:text-gray-800 border-gray-300'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            onClick={() => toggleActive(banner)}
                            title={banner.isActive ? 'Hide from mobile app' : 'Publish to mobile app'}
                          >
                            {banner.isActive ? (
                              <>
                                <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                                <span>Hide</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Publish</span>
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-gray-700 hover:text-gray-900"
                            onClick={() => openEditDialog(banner)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                            onClick={() => setDeleteConfirmId(banner._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / Edit Banner Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              {editingBanner ? 'Edit Banner' : 'Create New Banner'}
            </DialogTitle>
            <DialogDescription>
              Configure banner content, optional image (upload to MinIO or provide a link), and tap navigation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Target Placement */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Placement Screen</Label>
              <Select
                value={formPlacement}
                onValueChange={(val) => setFormPlacement(val as BannerPlacement)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="book_services" className="text-xs">
                    🛎️ Book Services (Customer Home Hero)
                  </SelectItem>
                  <SelectItem value="extramart" className="text-xs">
                    🛒 ExtraMart (Quick Commerce Home)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Badge / Tag & Eyebrow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Badge / Pill Tag (Optional)</Label>
                <Input
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value)}
                  placeholder="e.g. ⚡ 8 mins delivery, Special Offer"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Text Below Tag / Eyebrow (Optional)</Label>
                <Input
                  value={formEyebrow}
                  onChange={(e) => setFormEyebrow(e.target.value)}
                  placeholder="e.g. FRESH PICKS & ESSENTIALS"
                  className="text-xs h-9 uppercase"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Banner Title / Heading (Optional)</Label>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                  Leave blank for Full-Bleed Graphic Image
                </span>
              </div>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Book Now offer — ₹100 off your first service"
                className="text-xs h-9"
              />
              <p className="text-[11px] text-gray-500">
                💡 <strong>Style rule:</strong> If Title, Subtitle, and Button are left blank, the mobile app renders the banner as a clean <strong>Full-Bleed Graphic Image</strong>. If fields are added, it renders as a <strong>Split Card</strong> (Text on left, Image on right).
              </p>
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subtitle / Promo Description (Optional)</Label>
              <Input
                value={formSubtitle}
                onChange={(e) => setFormSubtitle(e.target.value)}
                placeholder="e.g. Verified helper at your doorstep in minutes."
                className="text-xs h-9"
              />
            </div>

            {/* Image Section (Optional + MinIO Upload) */}
            <div className="p-3 bg-gray-50 rounded-lg border space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-gray-900">
                    <ImageIcon className="h-4 w-4 text-amber-600" /> Banner Image (Optional)
                  </Label>
                  <p className="text-[11px] text-gray-500">
                    Add an image or leave blank for a styled typography card. You can upload directly to MinIO.
                  </p>
                </div>

                {formImageUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1 flex items-center gap-1"
                    onClick={() => setFormImageUrl('')}
                  >
                    <X className="h-3.5 w-3.5" /> Remove Image
                  </Button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://... (MinIO image URL or web image)"
                  className="text-xs h-9 bg-white flex-1"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-3 text-xs bg-white border-amber-300 text-amber-800 hover:bg-amber-50 shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5 text-amber-600" /> Upload to MinIO
                    </>
                  )}
                </Button>
              </div>

              {uploadError ? (
                <p className="text-xs text-red-600 font-medium">{uploadError}</p>
              ) : null}
            </div>

            {/* Tap Action / Navigation Destination */}
            <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-200/80 space-y-3">
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-amber-800" />
                <Label className="text-xs font-bold text-gray-900">
                  Tap Action (Where does tapping this banner navigate?)
                </Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-gray-700">Action Type</Label>
                  <Select
                    value={formActionType}
                    onValueChange={(val) => {
                      const nextType = val as BannerActionType;
                      setFormActionType(nextType);
                      if (nextType === 'screen') setFormActionValue('HourlyHelperScreen');
                      else if (nextType === 'category') setFormActionValue(PRESET_CATEGORIES[0].value);
                      else if (nextType === 'tab') setFormActionValue(PRESET_TABS[0].value);
                      else if (nextType === 'none') setFormActionValue('');
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="screen" className="text-xs">
                        📱 Navigate to App Screen
                      </SelectItem>
                      <SelectItem value="category" className="text-xs">
                        📁 Open Service Category
                      </SelectItem>
                      <SelectItem value="tab" className="text-xs">
                        📑 Switch Home / Hub Tab
                      </SelectItem>
                      <SelectItem value="url" className="text-xs">
                        🌐 Open Web Link (URL)
                      </SelectItem>
                      <SelectItem value="none" className="text-xs">
                        🚫 No Action (View Only)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-gray-700">Target Screen / Route</Label>
                  {formActionType === 'screen' ? (
                    <Select
                      value={formActionValue}
                      onValueChange={(val) => {
                        setFormActionValue(val);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Select screen..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {SCREEN_GROUPS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                              {group.label}
                            </SelectLabel>
                            {group.screens.map((s) => (
                              <SelectItem key={s.value} value={s.value} className="text-xs pl-4">
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                        <SelectGroup>
                          <SelectLabel className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            Other
                          </SelectLabel>
                          <SelectItem value="_custom" className="text-xs pl-4 font-semibold text-amber-700">
                            ✏️ Custom Route Name...
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : formActionType === 'category' ? (
                    <Select value={formActionValue} onValueChange={setFormActionValue}>
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value} className="text-xs">
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : formActionType === 'tab' ? (
                    <Select value={formActionValue} onValueChange={setFormActionValue}>
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Select tab..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_TABS.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : formActionType === 'url' ? (
                    <Input
                      value={formActionValue}
                      onChange={(e) => setFormActionValue(e.target.value)}
                      placeholder="https://yourlink.com"
                      className="text-xs h-9 bg-white"
                    />
                  ) : (
                    <Input
                      disabled
                      value="None"
                      className="text-xs h-9 bg-gray-100 text-gray-400"
                    />
                  )}
                </div>
              </div>

              {/* Custom Screen Route Input */}
              {formActionType === 'screen' && formActionValue === '_custom' ? (
                <div className="space-y-1 pt-1">
                  <Label className="text-[11px] font-medium text-amber-900">Enter Custom Route Name</Label>
                  <Input
                    value={formCustomScreen}
                    onChange={(e) => setFormCustomScreen(e.target.value)}
                    placeholder="e.g. MyCustomScreen"
                    className="text-xs h-9 bg-white"
                  />
                </div>
              ) : null}
            </div>

            {/* CTA Label & Styling */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Button Label (CTA) (Optional)</Label>
                <Input
                  value={formCtaLabel}
                  onChange={(e) => setFormCtaLabel(e.target.value)}
                  placeholder="e.g. Book Now, Shop"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Background Fill</Label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={formBgColor}
                    onChange={(e) => setFormBgColor(e.target.value)}
                    className="h-9 w-9 rounded border cursor-pointer p-0.5"
                  />
                  <Input
                    value={formBgColor}
                    onChange={(e) => setFormBgColor(e.target.value)}
                    className="text-xs h-9 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Text Tone</Label>
                <Select value={formTone} onValueChange={(val) => setFormTone(val as BannerTone)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light" className="text-xs">
                      Light Tone (Default)
                    </SelectItem>
                    <SelectItem value="dark" className="text-xs">
                      Dark Tone
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Toggle Switch */}
            <div
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                formIsActive
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-gray-900">Active on Mobile App</p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                      formIsActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {formIsActive ? '● Live' : '○ Hidden'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {formIsActive
                    ? 'Currently published and visible in the customer mobile app carousel.'
                    : 'Currently hidden from customers on the mobile app.'}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-gray-700">
                  {formIsActive ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>

            {/* Live Mobile Banner Preview Inside Dialog */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-gray-700">
                  <Eye className="h-3.5 w-3.5" /> Live Mobile Banner Preview
                </Label>
                <span className="text-[10px] font-semibold text-gray-500">
                  {formTag.trim() || formEyebrow.trim() || formTitle.trim() || formSubtitle.trim() || formCtaLabel.trim()
                    ? 'Format: Split Card (Image 3)'
                    : formImageUrl
                    ? 'Format: Full-Bleed Graphic (Image 2)'
                    : 'Awaiting content'}
                </span>
              </div>
              <div
                className="relative w-full aspect-[16/9] rounded-xl overflow-hidden flex flex-col justify-center items-center p-3 border shadow-inner"
                style={{ backgroundColor: formBgColor }}
              >
                {/* Check if user provided Tag, Eyebrow, Title, Subtitle, or CTA Button */}
                {Boolean(formTag.trim() || formEyebrow.trim() || formTitle.trim() || formSubtitle.trim() || formCtaLabel.trim()) ? (
                  // Image 3 style: Split Card with Pure White Left Content + Image on Right
                  <div className="w-full h-full bg-white rounded-xl border border-amber-200 overflow-hidden flex shadow-sm">
                    <div className="flex-[3] p-3 bg-white flex flex-col justify-center min-w-0">
                      {formTag.trim() ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-950 text-[10px] font-bold w-max mb-1">
                          <span>⚡</span>
                          <span>{formTag}</span>
                        </div>
                      ) : null}
                      {formEyebrow.trim() ? (
                        <p className="text-[9px] font-bold text-amber-800 uppercase tracking-wider mb-1 line-clamp-1">
                          {formEyebrow}
                        </p>
                      ) : null}
                      {formTitle.trim() ? (
                        <p className="font-extrabold text-xs text-gray-900 leading-tight">
                          {formTitle}
                        </p>
                      ) : null}
                      {formSubtitle.trim() ? (
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                          {formSubtitle}
                        </p>
                      ) : null}
                      {formCtaLabel.trim() ? (
                        <div className="mt-2">
                          <span className="inline-block px-2.5 py-1 rounded-full bg-amber-400 text-stone-900 text-[10px] font-bold shadow-sm">
                            {formCtaLabel} →
                          </span>
                        </div>
                      ) : null}
                    </div>
                    {formImageUrl ? (
                      <div className="flex-[2] relative bg-amber-50 overflow-hidden">
                        <img
                          src={formImageUrl}
                          alt="Banner art"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : formImageUrl ? (
                  // Image 2 style: Full-Bleed Graphic Image Banner (No text overlay)
                  <img
                    src={formImageUrl}
                    alt="Full Graphic Banner"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 text-xs">
                    <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                    <span>Upload an image or enter title/subtitle</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || isUploading}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingBanner
                ? 'Save Changes'
                : 'Create Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Banner
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this banner? It will no longer appear in the mobile app.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
