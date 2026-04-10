'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart3,
  Settings,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useState } from 'react';

const navigation: Array<{
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}> = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    permission: 'user.list',
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: Briefcase,
    permission: 'task.list',
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    permission: 'analytics.view',
  },
];

// Super Admin section items
const superAdminItems = [
  { name: 'Admin Users', href: '/admin/users', icon: Shield },
  { name: 'Invites', href: '/admin/invites', icon: Users },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isSuperAdmin } = useAuth();
  const { hasPermission } = usePermissions();
  const [superAdminSectionOpen, setSuperAdminSectionOpen] = useState(
    pathname?.startsWith('/admin')
  );

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const isAdminPath = pathname?.startsWith('/admin');

  // Filter navigation items based on permissions
  const filteredNavigation = navigation.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white shadow-lg transition-transform duration-300 lg:relative lg:translate-x-0 lg:shadow-sm',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 bg-gradient-to-r from-yellow-50 to-yellow-100">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ExtraHand Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <p className="text-xs font-medium text-gray-700 leading-tight">
                Main Admin Dashboard
              </p>
            </div>
          </div>
          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
          {/* Regular Navigation Items */}
          {filteredNavigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-yellow-50 text-yellow-700 border-l-4 border-yellow-500 shadow-sm'
                    : 'text-gray-600 hover:bg-yellow-50/50 hover:text-yellow-600'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-yellow-600' : 'text-gray-400'
                  )}
                />
                {item.name}
              </Link>
            );
          })}

          {/* Super Admin Section (Collapsible) */}
          {isSuperAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setSuperAdminSectionOpen(!superAdminSectionOpen)}
                className={cn(
                  'flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isAdminPath
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'text-gray-600 hover:bg-yellow-50/50 hover:text-yellow-600'
                )}
              >
                <div className="flex items-center gap-3">
                  <Shield
                    className={cn(
                      'h-5 w-5',
                      isAdminPath ? 'text-yellow-600' : 'text-gray-400'
                    )}
                  />
                  <span>Super Admin</span>
                </div>
                {superAdminSectionOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {superAdminSectionOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {superAdminItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname?.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={handleLinkClick}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-yellow-50 text-yellow-700 border-l-4 border-yellow-500 shadow-sm'
                            : 'text-gray-600 hover:bg-yellow-50/50 hover:text-yellow-600'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-4 w-4 ml-2',
                            isActive ? 'text-yellow-600' : 'text-gray-400'
                          )}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </>
  );
}
