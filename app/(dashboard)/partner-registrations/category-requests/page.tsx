'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Clock3, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import {
  listPartnerCategoryRequests,
  PartnerCategoryRequest,
  PartnerCategoryRequestStatus,
  PartnerCategoryRequestStatusFilter,
  reviewPartnerCategoryRequest,
} from '@/lib/api/partner-category-requests';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getPartnerCategoryLabel,
  PARTNER_CATEGORY_SKILLS,
} from '@/lib/constants/partner-categories';

const statusVariant: Record<PartnerCategoryRequestStatus, 'warning' | 'success' | 'destructive'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
};

const statusLabels: Record<PartnerCategoryRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const statusFilters: Array<{ value: PartnerCategoryRequestStatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const PAGE_SIZE = 25;

export default function PartnerCategoryRequestsPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [requestedCategory, setRequestedCategory] = useState('all');
  const [currentCategory, setCurrentCategory] = useState('all');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<PartnerCategoryRequestStatusFilter>('pending');
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<{
    request: PartnerCategoryRequest;
    status: Exclude<PartnerCategoryRequestStatus, 'pending'>;
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const requestsQuery = useQuery({
    queryKey: [
      'partner-category-requests',
      status,
      page,
      search,
      requestedCategory,
      currentCategory,
      city,
    ],
    queryFn: () =>
      listPartnerCategoryRequests({
        status,
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        requestedCategory: requestedCategory === 'all' ? undefined : requestedCategory,
        currentCategory: currentCategory === 'all' ? undefined : currentCategory,
        city: city.trim() || undefined,
      }),
    enabled: hasPermission('user.list'),
    retry: false,
  });

  const countsQuery = useQuery({
    queryKey: ['partner-category-requests', 'counts'],
    queryFn: async () => {
      const [pending, approved, rejected] = await Promise.all(
        (['pending', 'approved', 'rejected'] as const).map((requestStatus) =>
          listPartnerCategoryRequests({ status: requestStatus, page: 1, limit: 1 }),
        ),
      );
      return {
        pending: pending.pagination?.total ?? 0,
        approved: approved.pagination?.total ?? 0,
        rejected: rejected.pagination?.total ?? 0,
      };
    },
    enabled: hasPermission('user.list'),
    retry: false,
  });

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!reviewing) throw new Error('No category request selected');
      return reviewPartnerCategoryRequest(reviewing.request.requestId, reviewing.status, reviewNotes);
    },
    onSuccess: () => {
      toast.success(`Category request ${reviewing?.status}`);
      queryClient.invalidateQueries({ queryKey: ['partner-category-requests'] });
      setReviewing(null);
      setReviewNotes('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category request');
    },
  });

  const requests = requestsQuery.data?.data ?? [];
  const pagination = requestsQuery.data?.pagination ?? {
    page,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  };

  const updateFilter = (update: () => void) => {
    update();
    setPage(1);
  };

  const openReview = (
    request: PartnerCategoryRequest,
    reviewStatus: Exclude<PartnerCategoryRequestStatus, 'pending'>,
  ) => {
    setReviewing({ request, status: reviewStatus });
    setReviewNotes('');
  };

  if (!hasPermission('user.list')) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">You don&apos;t have permission to review partner category requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Partner Category Requests</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review requests from partners to add a service category.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(['pending', 'approved', 'rejected'] as const).map((requestStatus) => {
          const Icon = requestStatus === 'pending' ? Clock3 : requestStatus === 'approved' ? Check : X;
          const accent =
            requestStatus === 'pending'
              ? 'text-amber-600 bg-amber-50'
              : requestStatus === 'approved'
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-red-600 bg-red-50';
          return (
            <Card key={requestStatus}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm font-medium capitalize text-gray-500">{requestStatus} requests</p>
                  {countsQuery.isError ? (
                    <p className="mt-1 text-sm text-red-600">Unavailable</p>
                  ) : (
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {countsQuery.isLoading ? '—' : countsQuery.data?.[requestStatus] ?? 0}
                    </p>
                  )}
                </div>
                <span className={`rounded-full p-3 ${accent}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="request-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="request-search"
                  value={search}
                  onChange={(event) => updateFilter(() => setSearch(event.target.value))}
                  placeholder="Name, phone, or email"
                  className="pl-9"
                />
              </div>
            </div>
            {countsQuery.isError && (
              <p role="alert" className="text-sm text-red-600">
                Could not load request summary: {countsQuery.error instanceof Error ? countsQuery.error.message : 'Unknown error'}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="request-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  updateFilter(() => setStatus(value as PartnerCategoryRequestStatusFilter))
                }
              >
                <SelectTrigger id="request-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requested-category">Requested category</Label>
              <Input
                id="requested-category"
                value={requestedCategory === 'all' ? '' : requestedCategory}
                onChange={(event) =>
                  updateFilter(() => setRequestedCategory(event.target.value || 'all'))
                }
                placeholder="Filter by requested category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-category">Current category</Label>
              <Input
                id="current-category"
                value={currentCategory === 'all' ? '' : currentCategory}
                onChange={(event) =>
                  updateFilter(() => setCurrentCategory(event.target.value || 'all'))
                }
                placeholder="Filter by current category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-city">City</Label>
              <Input
                id="request-city"
                value={city}
                onChange={(event) => updateFilter(() => setCity(event.target.value))}
                placeholder="Filter by city"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">Requests</CardTitle>
            <Badge variant="secondary">
              {pagination.total} {pagination.total === 1 ? 'request' : 'requests'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {requestsQuery.isLoading ? (
            <TableSkeleton rows={5} />
          ) : requestsQuery.isError ? (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm text-red-600">
                {requestsQuery.error instanceof Error
                  ? requestsQuery.error.message
                  : 'Failed to load category requests.'}
              </p>
              <Button variant="outline" onClick={() => requestsQuery.refetch()}>Try again</Button>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No category requests found.</div>
          ) : (
            <>
              <div className="rounded-md border border-gray-200">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[15%] px-2">Partner</TableHead>
                      <TableHead className="w-[10%] px-2">Current categories</TableHead>
                      <TableHead className="w-[15%] px-2">Requested category</TableHead>
                      <TableHead className="w-[12%] px-2">Work areas</TableHead>
                      <TableHead className="w-[8%] px-2">City</TableHead>
                      <TableHead className="w-[11%] px-2">Requested</TableHead>
                      <TableHead className="w-[7%] px-2">Status</TableHead>
                      <TableHead className="w-[22%] px-2 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.requestId}>
                        <TableCell className="break-words px-2">
                          <Link
                            href={`/users/${encodeURIComponent(request.uid)}`}
                            className="font-medium text-gray-900 hover:text-yellow-700 hover:underline"
                          >
                            {request.partnerName || request.name || '—'}
                          </Link>
                        </TableCell>
                        <TableCell className="break-words px-2">
                          {request.currentCategories?.length
                            ? request.currentCategories.map(getPartnerCategoryLabel).join(', ')
                            : '—'}
                        </TableCell>
                        <TableCell className="break-words px-2">
                          <p className="font-medium">
                            {request.requestedCategory
                              ? getPartnerCategoryLabel(request.requestedCategory)
                              : '—'}
                          </p>
                          {request.requestedSkills?.length ? (
                            <p className="mt-1 text-xs leading-5 text-gray-500">
                              Skills:{' '}
                              {request.requestedSkills
                                .map(
                                  (skillId) =>
                                    PARTNER_CATEGORY_SKILLS[request.requestedCategory]?.[skillId] ??
                                    skillId,
                                )
                                .join(', ')}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="break-words px-2">
                          {request.workAreas?.length ? request.workAreas.join(', ') : '—'}
                        </TableCell>
                        <TableCell className="break-words px-2">{request.city || '—'}</TableCell>
                        <TableCell className="break-words px-2">
                          {request.requestedAt ? formatDateTime(request.requestedAt) : '—'}
                        </TableCell>
                        <TableCell className="px-2">
                          <Badge variant={statusVariant[request.status]}>{statusLabels[request.status]}</Badge>
                          {request.reviewNotes && (
                            <p className="mt-1 max-w-48 text-xs text-gray-500" title={request.reviewNotes}>
                              {request.reviewNotes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="px-2 text-right">
                          {request.status === 'pending' ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-700 hover:bg-emerald-50"
                                onClick={() => openReview(request, 'approved')}
                              >
                                <Check className="mr-1 h-4 w-4" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 hover:bg-red-50"
                                onClick={() => openReview(request, 'rejected')}
                              >
                                <X className="mr-1 h-4 w-4" /> Reject
                              </Button>
                            </div>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                <span>
                  {pagination.total === 0
                    ? 'No requests'
                    : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, pagination.total)} of ${pagination.total}`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || requestsQuery.isFetching}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <span>Page {page} of {pagination.pages || 1}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.pages || requestsQuery.isFetching}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(reviewing)}
        onOpenChange={(open) => {
          if (!open && !reviewMutation.isPending) setReviewing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewing?.status === 'approved' ? 'Approve category request' : 'Reject category request'}
            </DialogTitle>
            <DialogDescription>
              {reviewing?.request.partnerName || reviewing?.request.name} requested to add{' '}
              {reviewing
                ? getPartnerCategoryLabel(reviewing.request.requestedCategory)
                : 'this category'}.
              {reviewing?.status === 'approved'
                ? ' Approving will add this category and the partner’s selected skills to their profile.'
                : ' Rejecting will decline this request.'}
            </DialogDescription>
          </DialogHeader>
          {reviewing &&
          reviewing.request.requestedSkills?.length ? (
            <div className="space-y-2 rounded-md bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">
                Skills selected by the partner
              </p>
              <ul className="grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
                {reviewing.request.requestedSkills.map((skillId) => (
                  <li key={skillId}>
                    • {PARTNER_CATEGORY_SKILLS[reviewing.request.requestedCategory]?.[skillId] ?? skillId}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="review-notes">Review note (optional)</Label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Add context for this decision"
              maxLength={1000}
              disabled={reviewMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={reviewMutation.isPending}
              onClick={() => setReviewing(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={reviewMutation.isPending}
              className={reviewing?.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => reviewMutation.mutate()}
            >
              {reviewMutation.isPending
                ? 'Saving…'
                : reviewing?.status === 'approved'
                  ? 'Confirm approval'
                  : 'Confirm rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
