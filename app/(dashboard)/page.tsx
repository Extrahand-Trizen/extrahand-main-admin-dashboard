'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, MessageSquare, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listUsers } from '@/lib/api/users';
import { listTasks } from '@/lib/api/tasks';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { StatsCardSkeleton } from '@/components/LoadingSkeleton';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  openTasks: number;
}

export default function DashboardPage() {
  const { hasPermission } = usePermissions();

  // Fetch users data
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => listUsers({ limit: 1 }),
    enabled: hasPermission('user.list'),
  });

  // Fetch tasks data
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: () => listTasks({ limit: 1 }),
    enabled: hasPermission('task.list'),
  });

  // Calculate stats
  const stats: DashboardStats = {
    totalUsers: usersData?.pagination?.total || 0,
    activeUsers:
      usersData?.data?.filter((u: any) => u.status === "active").length ||
      0,
    totalTasks: tasksData?.pagination?.total || 0,
    openTasks:
      tasksData?.data?.filter((t: any) => t.status === "open").length || 0,
  };

  const isLoading = usersLoading || tasksLoading;

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      subtitle: `${stats.activeUsers} active`,
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/users',
      permission: 'user.list',
    },
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      subtitle: `${stats.openTasks} open`,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/tasks',
      permission: 'task.list',
    },
    {
      title: 'Disputes',
      value: 0,
      subtitle: 'Coming soon',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      href: '#',
      permission: null,
    },
  ];

  const quickActions = [
    {
      title: 'View All Users',
      description: 'Manage users and their accounts',
      href: '/users',
      icon: Users,
      permission: 'user.list',
    },
    {
      title: 'View All Tasks',
      description: 'Monitor and manage tasks',
      href: '/tasks',
      icon: Briefcase,
      permission: 'task.list',
    },
    {
      title: 'Support Tickets',
      description: 'Handle customer support requests',
      href: '/support/tickets',
      icon: MessageSquare,
      permission: 'support.ticket.list',
    },
    {
      title: 'Support Articles',
      description: 'Manage knowledge base articles',
      href: '/support/articles',
      icon: MessageSquare,
      permission: 'content.list',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of your platform operations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          if (card.permission && !hasPermission(card.permission)) {
            return null;
          }

          const Icon = card.icon;
          const isClickable = card.href !== '#';
          const cardClassName = `transition-all duration-200 ${
            isClickable
              ? 'hover:shadow-md hover:border-amber-300 cursor-pointer'
              : ''
          }`;

          const content = (
            <Card className={cardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {card.title}
                  </CardTitle>
                  <div className={`${card.bg} p-2 rounded-lg`}>
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
                      <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                    </>
                  )}
                </CardContent>
            </Card>
          );

          if (isClickable) {
            return (
              <Link key={card.title} href={card.href} className="block">
                {content}
              </Link>
            );
          }

          return (
            <div key={card.title} className="block">
              {content}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions
            .filter((action) => !action.permission || hasPermission(action.permission))
            .map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <Card className="transition-all duration-200 hover:shadow-md hover:border-amber-300 cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className={`bg-amber-50 p-3 rounded-lg`}>
                          <Icon className="h-6 w-6 text-amber-600" />
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <CardTitle className="text-base font-semibold mt-4">
                        {action.title}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {action.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Feed</CardTitle>
            <CardDescription>
              Recent platform activities and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Activity feed coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
