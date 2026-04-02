'use client';

import Image from 'next/image';
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
import { LogOut, User, Menu, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-auto py-2 px-3 hover:bg-gray-100"
              >
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <div className="flex flex-col items-end">
                    <span className="font-medium text-gray-900">{user.name}</span>
                    <span className="text-xs text-gray-500">{user.role}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-medium text-sm">
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
                    <span className="text-xs text-amber-600 font-medium">
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
