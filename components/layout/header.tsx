'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Menu, ChevronDown, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect, useMemo, useState } from 'react';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications';
import { AdminNotification } from '@/types';
import { formatDateTime } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  const displayRole = (role?: string) => {
    if (!role) return '';
    return role.replace(/_/g, ' ');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const unreadBadgeCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const loadNotifications = async () => {
    setIsNotifLoading(true);
    try {
      const response = await getNotifications(15);
      if (response?.success && Array.isArray(response.data)) {
        setNotifications(response.data);
        setUnreadCount(response.unreadCount ?? response.data.filter((item) => !item.isRead).length);
      }
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setIsNotifLoading(false);
    }
  };

  const handleNotificationClick = async (notification: AdminNotification) => {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
    }

    const isAadhaarNotification =
      notification.type === 'aadhaar_verification_failed' ||
      notification.type === 'aadhaar_verification_under_review';

    if (isAadhaarNotification) {
      const userId = notification.kycUserId?.trim();
      if (userId) {
        router.push(`/kyc-reviews?userId=${encodeURIComponent(userId)}`);
      } else if (notification.linkUrl?.includes('/kyc-reviews')) {
        router.push(notification.linkUrl);
      }
    } else if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }

    setIsNotifOpen(false);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    loadNotifications();
  };

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 45_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (isNotifOpen) {
      loadNotifications();
    }
  }, [isNotifOpen]);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Hamburger menu button for mobile */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {/* <div className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/logo.png"
            alt="ExtraHand Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <h2 className="text-sm sm:text-base font-semibold text-gray-800">
            Main Admin Dashboard
          </h2>
        </div> */}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {user && (
          <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full p-0 hover:bg-gray-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {(unreadCount || unreadBadgeCount) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                    {Math.min(unreadCount || unreadBadgeCount, 99)}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Button
                  variant="ghost"
                  className="h-7 px-2 text-xs text-gray-500 hover:text-gray-900"
                  onClick={handleMarkAllRead}
                  disabled={unreadBadgeCount === 0}
                >
                  Mark all read
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                {isNotifLoading && (
                  <div className="px-3 py-4 text-sm text-gray-500">Loading notifications...</div>
                )}
                {!isNotifLoading && notifications.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-500">
                    No notifications yet.
                  </div>
                )}
                {!isNotifLoading &&
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className="cursor-pointer gap-2"
                    >
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center justify-between">
                          <span
                            className={
                              notification.isRead
                                ? 'text-sm text-gray-700'
                                : 'text-sm font-semibold text-gray-900'
                            }
                          >
                            {notification.title}
                          </span>
                          {!notification.isRead && (
                            <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 line-clamp-2">
                          {notification.message}
                        </span>
                        <span className="mt-1 text-[11px] text-gray-400">
                          {formatDateTime(notification.createdAt)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-auto py-2 px-3 hover:bg-gray-100"
              >
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <div className="flex flex-col items-end">
                    <span className="font-medium text-gray-900">{user.name}</span>
                    <span className="text-xs text-gray-500">{displayRole(user.role)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-medium text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  {user.isSuperAdmin && (
                    <span className="text-xs text-yellow-600 font-medium">
                      Super Admin
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
