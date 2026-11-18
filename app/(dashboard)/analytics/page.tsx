'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Users, UserCheck, Briefcase, XCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCardSkeleton } from '@/components/LoadingSkeleton';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { getLocationCatalog } from '@/lib/api/locations';
import {
  getAnalyticsOverview,
  getTaskCancellationAnalytics,
  getTaskCategoryBreakdown,
  getTaskCategoryPerformance,
} from '@/lib/api/analytics';

export default function AnalyticsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [selectedCity, setSelectedCity] = useState('all');

  const { data: locationCatalogData } = useQuery({
    queryKey: ['location-catalog'],
    queryFn: getLocationCatalog,
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const catalogCities = locationCatalogData?.data?.cities ?? [];
  const analyticsCities = catalogCities.some(
    (city) => city.name.trim().toLowerCase() === 'rajagopalpet',
  )
    ? catalogCities
    : [...catalogCities, { id: 'rajagopalpet', name: 'Rajagopalpet', enabled: true }];
  const cityOptions = analyticsCities
    .filter((city) => city.enabled !== false)
    .map((city) => city.name.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const handleCardClick = (title: string) => {
    if (title === 'Total Customers') {
      sessionStorage.setItem('users_filters', JSON.stringify({
        search: '',
        statusFilter: 'all',
        roleFilter: 'customer',
        aadhaarFilter: 'all',
        certifiedFilter: 'all',
        categoryFilter: 'all',
        cityFilter: selectedCity,
        areaFilter: 'all',
        createdFrom: '',
        createdTo: '',
        page: 1,
        limit: 20
      }));
      router.push('/users');
    } else if (title === 'Total Partners') {
      sessionStorage.setItem('users_filters', JSON.stringify({
        search: '',
        statusFilter: 'all',
        roleFilter: 'partner',
        aadhaarFilter: 'all',
        certifiedFilter: 'all',
        categoryFilter: 'all',
        cityFilter: selectedCity,
        areaFilter: 'all',
        createdFrom: '',
        createdTo: '',
        page: 1,
        limit: 20
      }));
      router.push('/users');
    } else if (title === 'Open Works') {
      sessionStorage.setItem('tasks_filters', JSON.stringify({
        search: '',
        statusFilter: 'open',
        postedByFilter: 'customer',
        categoryFilter: 'all',
        followUpFilter: 'all',
        assignedToFilter: 'all',
        deadlineSortOrder: 'desc',
        page: 1,
        limit: 20
      }));
      router.push('/tasks');
    } else if (title === 'Total Works') {
      sessionStorage.setItem('tasks_filters', JSON.stringify({
        search: '',
        statusFilter: 'all',
        postedByFilter: 'customer',
        categoryFilter: 'all',
        followUpFilter: 'all',
        assignedToFilter: 'all',
        deadlineSortOrder: 'desc',
        page: 1,
        limit: 20
      }));
      router.push('/tasks');
    } else if (title === 'Cancelled Works') {
      sessionStorage.setItem('tasks_filters', JSON.stringify({
        search: '',
        statusFilter: 'cancelled',
        postedByFilter: 'customer',
        categoryFilter: 'all',
        followUpFilter: 'all',
        assignedToFilter: 'all',
        deadlineSortOrder: 'desc',
        page: 1,
        limit: 20
      }));
      router.push('/tasks');
    } else if (title === 'Completed Works') {
      sessionStorage.setItem('tasks_filters', JSON.stringify({
        search: '',
        statusFilter: 'completed',
        postedByFilter: 'customer',
        categoryFilter: 'all',
        followUpFilter: 'all',
        assignedToFilter: 'all',
        deadlineSortOrder: 'desc',
        page: 1,
        limit: 20
      }));
      router.push('/tasks');
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview', selectedCity],
    queryFn: () => getAnalyticsOverview(selectedCity),
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const { data: categoryBreakdownData } = useQuery({
    queryKey: ['analytics', 'task-category-breakdown', selectedCity],
    queryFn: () => getTaskCategoryBreakdown('30d', selectedCity),
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const { data: categoryPerformanceData } = useQuery({
    queryKey: ['analytics', 'task-category-performance', selectedCity],
    queryFn: () => getTaskCategoryPerformance('30d', selectedCity),
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const { data: cancellationData } = useQuery({
    queryKey: ['analytics', 'task-cancellations', selectedCity],
    queryFn: () => getTaskCancellationAnalytics('30d', selectedCity),
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  if (!hasPermission('analytics.view')) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">You do not have permission to view analytics.</p>
      </div>
    );
  }

  const analytics = data?.data;
  const categoryBreakdown = categoryBreakdownData?.data;
  const categoryPerformance = categoryPerformanceData?.data;
  const cancellations = cancellationData?.data;
  const cards = [
    {
      title: 'Total Customers',
      value: analytics?.Customers.totalRegistered ?? 0,
      subtitle: 'Registered customers',
      icon: Users,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Total Partners',
      value: analytics?.Helpers.totalRegistered ?? 0,
      subtitle: 'Registered partners',
      icon: UserCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Open Works',
      value: analytics?.tasks.open ?? 0,
      subtitle: 'Currently open',
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Total Works',
      value: analytics?.tasks.total ?? 0,
      subtitle: `${analytics?.tasks.open ?? 0} open`,
      icon: Briefcase,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
    },
    {
      title: 'Cancelled Works',
      value: analytics?.tasks.cancelled ?? 0,
      subtitle: 'Customer cancelled',
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Completed Works',
      value: analytics?.tasks.completed ?? 0,
      subtitle: 'Successfully finished',
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">
            Platform growth overview for Customers, Partners, and works.
          </p>
        </div>
        <div className="w-full md:w-56">
          <label htmlFor="analytics-city" className="mb-1 block text-sm font-medium text-gray-700">
            City
          </label>
          <select
            id="analytics-city"
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900"
          >
            <option value="all">All cities</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="cursor-pointer hover:border-gray-400 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => handleCardClick(card.title)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
                <div className={`${card.bg} rounded-lg p-2`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <StatsCardSkeleton />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gray-900">
                      {card.value.toLocaleString()}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{card.subtitle}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">City Comparison</CardTitle>
          <CardDescription>Compare key work and partner metrics across supported cities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...(analytics?.cityComparison || [])]
            .filter((row) => row.worksPosted > 0)
            .sort((a, b) => b.worksPosted - a.worksPosted || a.city.localeCompare(b.city))
            .map((row) => (
            <div key={row.city} className="rounded-lg border p-4">
              <p className="text-sm font-medium text-gray-800">{row.city}</p>
              <div className="mt-2 grid gap-1 text-sm text-gray-600 md:grid-cols-3">
                <p>Customers: {row.customers.toLocaleString()}</p>
                <p>Partners: {row.partners.toLocaleString()}</p>
                <p>Works posted: {row.worksPosted.toLocaleString()}</p>
                <p>Completion: {row.completionRate}%</p>
                <p>Cancellation: {row.cancellationRate}%</p>
                <p>Open works: {row.openWorks.toLocaleString()}</p>
                <p>Completed works: {row.completedWorks.toLocaleString()}</p>
                <p>Cancelled works: {row.cancelledWorks.toLocaleString()}</p>
                <p>Partners per work: {row.partnersPerWork}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Demand by Category (Last 30 days)</CardTitle>
          <CardDescription>
            Track which categories Customers are targeting most.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(categoryBreakdown?.categories || []).length === 0 ? (
            <p className="text-sm text-gray-500">No category demand data available yet.</p>
          ) : (
            (categoryBreakdown?.categories || []).slice(0, 12).map((category) => (
              <div key={category.category} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">{category.category}</p>
                  <p className="text-sm font-semibold text-gray-900">{category.count}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Category Performance (Last 30 days)</CardTitle>
          <CardDescription>
            Monitor completion, fulfillment, and cancellation rates by category.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Overall completion rate</p>
              <p className="text-lg font-semibold text-gray-900">
                {categoryPerformance?.totals.completionRate ?? 0}%
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Overall cancellation rate</p>
              <p className="text-lg font-semibold text-gray-900">
                {categoryPerformance?.totals.cancellationRate ?? 0}%
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Cancelled works</p>
              <p className="text-lg font-semibold text-gray-900">
                {categoryPerformance?.totals.cancelled ?? 0}
              </p>
            </div>
          </div>

          {(categoryPerformance?.categories || []).length === 0 ? (
            <p className="text-sm text-gray-500">No category performance data available yet.</p>
          ) : (
            <div className="space-y-3">
              {(categoryPerformance?.categories || []).slice(0, 10).map((row) => (
                <div key={`perf-${row.category}`} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">{row.category}</p>
                    <p className="text-xs text-gray-500">Posted: {row.posted}</p>
                  </div>
                  <div className="mt-2 grid gap-1 md:grid-cols-3">
                    <p className="text-xs text-gray-600">Completed: {row.completed}</p>
                    <p className="text-xs text-gray-600">Active: {row.active}</p>
                    <p className="text-xs text-gray-600">Cancelled: {row.cancelled}</p>
                    <p className="text-xs text-gray-600">Completion: {row.completionRate}%</p>
                    <p className="text-xs text-gray-600">Fulfillment: {row.fulfillmentRate}%</p>
                    <p className="text-xs text-gray-600">Cancellation: {row.cancellationRate}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Cancellation Analytics (Last 30 days)</CardTitle>
          <CardDescription>
            Track cancellation levels and whether they occur before or after assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Cancellation rate</p>
              <p className="text-lg font-semibold text-gray-900">
                {cancellations?.totals.cancellationRate ?? 0}%
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Cancelled works</p>
              <p className="text-lg font-semibold text-gray-900">
                {cancellations?.totals.cancelledTasks ?? 0}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Before assignment</p>
              <p className="text-lg font-semibold text-gray-900">
                {cancellations?.totals.cancelledBeforeAssignment ?? 0}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">After assignment</p>
              <p className="text-lg font-semibold text-gray-900">
                {cancellations?.totals.cancelledAfterAssignment ?? 0}
              </p>
            </div>
          </div>

          {(cancellations?.categories || []).length === 0 ? (
            <p className="text-sm text-gray-500">No cancellation-by-category data available yet.</p>
          ) : (
            <div className="space-y-2">
              {(cancellations?.categories || []).slice(0, 10).map((row) => (
                <div
                  key={`cancel-${row.category}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <p className="text-sm font-medium text-gray-800">{row.category}</p>
                  <p className="text-xs text-gray-600">
                    {row.cancelledTasks}/{row.totalTasks} ({row.cancellationRate}%)
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
