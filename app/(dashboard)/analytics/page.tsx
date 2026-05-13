'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, UserCheck, Briefcase, CircleDot, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCardSkeleton } from '@/components/LoadingSkeleton';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  getAnalyticsOverview,
  getCustomerAnalytics,
  getCustomerVerificationComparison,
  getTaskCancellationAnalytics,
  getTaskCategoryBreakdown,
  getTaskCategoryPerformance,
} from '@/lib/api/analytics';

export default function AnalyticsPage() {
  const { hasPermission } = usePermissions();
  const [CustomerIdInput, setCustomerIdInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: getAnalyticsOverview,
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const { data: comparisonData } = useQuery({
    queryKey: ['analytics', 'verification-comparison'],
    queryFn: () => getCustomerVerificationComparison('30d'),
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const { data: CustomerAnalyticsData, isFetching: isCustomerLoading } = useQuery({
    queryKey: ['analytics', 'Customer', selectedCustomerId],
    queryFn: () => getCustomerAnalytics(selectedCustomerId, '30d'),
    enabled: hasPermission('analytics.view') && Boolean(selectedCustomerId),
    retry: false,
  });

  const { data: categoryBreakdownData } = useQuery({
    queryKey: ['analytics', 'task-category-breakdown'],
    queryFn: () => getTaskCategoryBreakdown('30d'),
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const { data: categoryPerformanceData } = useQuery({
    queryKey: ['analytics', 'task-category-performance'],
    queryFn: () => getTaskCategoryPerformance('30d'),
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const { data: cancellationData } = useQuery({
    queryKey: ['analytics', 'task-cancellations'],
    queryFn: () => getTaskCancellationAnalytics('30d'),
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
  const comparison = comparisonData?.data;
  const CustomerAnalytics = CustomerAnalyticsData?.data;
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
      title: 'Total Helpers',
      value: analytics?.Helpers.totalRegistered ?? 0,
      subtitle: 'Registered helpers',
      icon: UserCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Open Tasks',
      value: analytics?.tasks.open ?? 0,
      subtitle: 'Currently open',
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Total Tasks',
      value: analytics?.tasks.total ?? 0,
      subtitle: `${analytics?.tasks.open ?? 0} open`,
      icon: Briefcase,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
    },
    {
      title: 'In Progress Tasks',
      value: analytics?.tasks.inProgress ?? 0,
      subtitle: 'Currently active',
      icon: CircleDot,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Completed Tasks',
      value: analytics?.tasks.completed ?? 0,
      subtitle: 'Successfully finished',
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-sm text-gray-600">
          Platform growth overview for Customers, Helpers, and tasks.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
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
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-yellow-600" />
            Metrics snapshot
          </CardTitle>
          <CardDescription>
            {analytics?.generatedAt
              ? `Last updated: ${new Date(analytics.generatedAt).toLocaleString()}`
              : 'No analytics data available yet.'}
          </CardDescription>
          {analytics?.partial?.taskServiceUnavailable && (
            <CardDescription className="text-yellow-600">
              Task service is currently unavailable. User counts are shown; task counts may be 0 temporarily.
            </CardDescription>
          )}
        </CardHeader>
        {(analytics?.Helpers?.categoryCounts || []).length > 0 && (
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Helpers by category (from skills)
              </p>
              <p className="text-xs text-gray-500">
                Total helpers: {analytics?.Helpers?.categorySummary?.totalHelpers ?? 0} | Categorized: {analytics?.Helpers?.categorySummary?.categorizedHelpers ?? 0} | Uncategorized: {analytics?.Helpers?.categorySummary?.uncategorizedHelpers ?? 0}
              </p>
              <div className="space-y-2">
                {(analytics?.Helpers?.categoryCounts || []).map((row) => (
                  <div
                    key={`helper-category-${row.category}`}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <p className="text-sm text-gray-800 capitalize">{row.category}</p>
                    <p className="text-sm font-semibold text-gray-900">{row.helperCount}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verified vs Unverified Customers (Last 30 days)</CardTitle>
          <CardDescription>Compares task posting and bidding behavior by verification status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-700">Verified</p>
            <p className="mt-2 text-sm text-gray-600">Customers: {comparison?.verified.CustomerCount ?? 0}</p>
            <p className="text-sm text-gray-600">Tasks: {comparison?.verified.taskCount ?? 0}</p>
            <p className="text-sm text-gray-600">Bids: {comparison?.verified.bidCount ?? 0}</p>
            <p className="text-sm text-gray-600">Avg tasks/Customer: {comparison?.verified.avgTasksPerCustomer ?? 0}</p>
            <p className="text-sm text-gray-600">Avg bids/task: {comparison?.verified.avgBidsPerTask ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-700">Unverified</p>
            <p className="mt-2 text-sm text-gray-600">Customers: {comparison?.unverified.CustomerCount ?? 0}</p>
            <p className="text-sm text-gray-600">Tasks: {comparison?.unverified.taskCount ?? 0}</p>
            <p className="text-sm text-gray-600">Bids: {comparison?.unverified.bidCount ?? 0}</p>
            <p className="text-sm text-gray-600">Avg tasks/Customer: {comparison?.unverified.avgTasksPerCustomer ?? 0}</p>
            <p className="text-sm text-gray-600">Avg bids/task: {comparison?.unverified.avgBidsPerTask ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Demand by Category (Last 30 days)</CardTitle>
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
          <CardTitle className="text-base">Task Category Performance (Last 30 days)</CardTitle>
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
              <p className="text-xs text-gray-500">Cancelled tasks</p>
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
          <CardTitle className="text-base">Task Cancellation Analytics (Last 30 days)</CardTitle>
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
              <p className="text-xs text-gray-500">Cancelled tasks</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Customer Analytics</CardTitle>
          <CardDescription>Enter Customer profile ObjectId (`requesterId`) to inspect task and bid signals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste requesterId"
              value={CustomerIdInput}
              onChange={(e) => setCustomerIdInput(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => setSelectedCustomerId(CustomerIdInput.trim())}
              disabled={!CustomerIdInput.trim()}
            >
              Load
            </Button>
          </div>

          {selectedCustomerId && (
            <div className="rounded-lg border p-4">
              {isCustomerLoading ? (
                <p className="text-sm text-gray-500">Loading Customer analytics...</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">{CustomerAnalytics?.profile.name || 'Unknown Customer'}</p>
                  <p className="mt-2 text-sm text-gray-600">
                    Verification: {CustomerAnalytics?.profile.isVerified ? 'Verified' : 'Unverified'}
                  </p>
                  <p className="text-sm text-gray-600">Posted tasks: {CustomerAnalytics?.metrics.postedTasks ?? 0}</p>
                  <p className="text-sm text-gray-600">Total bids: {CustomerAnalytics?.metrics.totalBids ?? 0}</p>
                  <p className="text-sm text-gray-600">Genuine tasks: {CustomerAnalytics?.metrics.genuineTaskCount ?? 0}</p>
                  <p className="mt-2 text-sm font-medium text-gray-700">Top categories</p>
                  <div className="mt-1 space-y-1">
                    {(CustomerAnalytics?.metrics.categories || []).slice(0, 5).map((item) => (
                      <p className="text-sm text-gray-600" key={item.category}>
                        {item.category}: {item.count}
                      </p>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
