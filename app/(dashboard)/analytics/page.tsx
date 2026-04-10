'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, UserCheck, Briefcase, CircleDot, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCardSkeleton } from '@/components/LoadingSkeleton';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { getAnalyticsOverview } from '@/lib/api/analytics';

export default function AnalyticsPage() {
  const { hasPermission } = usePermissions();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: getAnalyticsOverview,
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
    </div>
  );
}
