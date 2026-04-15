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
  getPosterAnalytics,
  getPosterVerificationComparison,
  getTaskCategoryBreakdown,
} from '@/lib/api/analytics';

export default function AnalyticsPage() {
  const { hasPermission } = usePermissions();
  const [posterIdInput, setPosterIdInput] = useState('');
  const [selectedPosterId, setSelectedPosterId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: getAnalyticsOverview,
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const { data: comparisonData } = useQuery({
    queryKey: ['analytics', 'verification-comparison'],
    queryFn: () => getPosterVerificationComparison('30d'),
    enabled: hasPermission('analytics.view'),
    retry: false,
  });

  const { data: posterAnalyticsData, isFetching: isPosterLoading } = useQuery({
    queryKey: ['analytics', 'poster', selectedPosterId],
    queryFn: () => getPosterAnalytics(selectedPosterId, '30d'),
    enabled: hasPermission('analytics.view') && Boolean(selectedPosterId),
    retry: false,
  });

  const { data: categoryBreakdownData } = useQuery({
    queryKey: ['analytics', 'task-category-breakdown'],
    queryFn: () => getTaskCategoryBreakdown('30d'),
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
  const posterAnalytics = posterAnalyticsData?.data;
  const categoryBreakdown = categoryBreakdownData?.data;
  const cards = [
    {
      title: 'Total Posters',
      value: analytics?.posters.totalRegistered ?? 0,
      subtitle: 'Registered posters',
      icon: Users,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Total Taskers',
      value: analytics?.taskers.totalRegistered ?? 0,
      subtitle: 'Registered taskers',
      icon: UserCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Total Tasks',
      value: analytics?.tasks.total ?? 0,
      subtitle: `${analytics?.tasks.open ?? 0} open`,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
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
          Platform growth overview for posters, taskers, and tasks.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verified vs Unverified Posters (Last 30 days)</CardTitle>
          <CardDescription>Compares task posting and bidding behavior by verification status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-700">Verified</p>
            <p className="mt-2 text-sm text-gray-600">Posters: {comparison?.verified.posterCount ?? 0}</p>
            <p className="text-sm text-gray-600">Tasks: {comparison?.verified.taskCount ?? 0}</p>
            <p className="text-sm text-gray-600">Bids: {comparison?.verified.bidCount ?? 0}</p>
            <p className="text-sm text-gray-600">Avg tasks/poster: {comparison?.verified.avgTasksPerPoster ?? 0}</p>
            <p className="text-sm text-gray-600">Avg bids/task: {comparison?.verified.avgBidsPerTask ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-gray-700">Unverified</p>
            <p className="mt-2 text-sm text-gray-600">Posters: {comparison?.unverified.posterCount ?? 0}</p>
            <p className="text-sm text-gray-600">Tasks: {comparison?.unverified.taskCount ?? 0}</p>
            <p className="text-sm text-gray-600">Bids: {comparison?.unverified.bidCount ?? 0}</p>
            <p className="text-sm text-gray-600">Avg tasks/poster: {comparison?.unverified.avgTasksPerPoster ?? 0}</p>
            <p className="text-sm text-gray-600">Avg bids/task: {comparison?.unverified.avgBidsPerTask ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Demand by Category (Last 30 days)</CardTitle>
          <CardDescription>
            Track which categories and subcategories posters are targeting most.
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
                {(category.subcategories || []).length > 0 && (
                  <div className="mt-2 grid gap-1 md:grid-cols-2">
                    {category.subcategories.slice(0, 6).map((sub) => (
                      <p key={`${category.category}-${sub.subcategory}`} className="text-xs text-gray-600">
                        {sub.subcategory}: {sub.count}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-poster Analytics</CardTitle>
          <CardDescription>Enter poster profile ObjectId (`requesterId`) to inspect task and bid signals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste requesterId"
              value={posterIdInput}
              onChange={(e) => setPosterIdInput(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => setSelectedPosterId(posterIdInput.trim())}
              disabled={!posterIdInput.trim()}
            >
              Load
            </Button>
          </div>

          {selectedPosterId && (
            <div className="rounded-lg border p-4">
              {isPosterLoading ? (
                <p className="text-sm text-gray-500">Loading poster analytics...</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">{posterAnalytics?.profile.name || 'Unknown Poster'}</p>
                  <p className="mt-2 text-sm text-gray-600">
                    Verification: {posterAnalytics?.profile.isVerified ? 'Verified' : 'Unverified'}
                  </p>
                  <p className="text-sm text-gray-600">Posted tasks: {posterAnalytics?.metrics.postedTasks ?? 0}</p>
                  <p className="text-sm text-gray-600">Total bids: {posterAnalytics?.metrics.totalBids ?? 0}</p>
                  <p className="text-sm text-gray-600">Genuine tasks: {posterAnalytics?.metrics.genuineTaskCount ?? 0}</p>
                  <p className="mt-2 text-sm font-medium text-gray-700">Top categories</p>
                  <div className="mt-1 space-y-1">
                    {(posterAnalytics?.metrics.categories || []).slice(0, 5).map((item) => (
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
