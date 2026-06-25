'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useQueryClient } from '@tanstack/react-query';
import {
  getPaymentsOverview,
  listPaymentTransactions,
  listPaymentPayouts,
  listPaymentRefunds,
  listPaymentLedger,
} from '@/lib/api/payments';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showWarn, setShowWarn] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Prefetch only overview metrics at app load (lightweight aggregate query).
  // Individual list pages (transactions, payouts, refunds, ledger) fetch their own data lazily.
  useEffect(() => {
    if (!loading && isAuthenticated && hasPermission('payment.list')) {
      queryClient.prefetchQuery({ queryKey: ['payments', 'overview'], queryFn: getPaymentsOverview });
    }
  }, [loading, isAuthenticated, hasPermission, queryClient]);

  // Session timeout handling (1 hour inactivity, 24 hour hard cap)
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;

    const resetTimers = () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);

      // Warn 10 minutes before timeout
      warningTimer = setTimeout(() => {
        setShowWarn(true);
      }, 50 * 60 * 1000); // 50 minutes

      // Hard timeout after 1 hour
      inactivityTimer = setTimeout(() => {
        setShowWarn(false);
        logout();
        router.push('/login');
      }, 60 * 60 * 1000); // 1 hour
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => {
      document.addEventListener(event, resetTimers, true);
    });

    resetTimers();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimers, true);
      });
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
    };
  }, [logout, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
      <Dialog open={showWarn} onOpenChange={setShowWarn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session ending soon</DialogTitle>
            <DialogDescription>
              You've been inactive. You'll be logged out in about 10 minutes
              unless you stay signed in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowWarn(false);
              }}
            >
              Stay signed in
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowWarn(false);
                logout();
                router.push('/login');
              }}
            >
              Logout now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
