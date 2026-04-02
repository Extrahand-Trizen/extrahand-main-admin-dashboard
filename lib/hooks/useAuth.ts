'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminUser } from '@/types';
import { verifyToken, refreshToken as refreshTokenApi } from '@/lib/api/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Only access localStorage on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Verify token
      const response = await verifyToken();
      if (response && response.success && response.data) {
        // Token is valid, but we need to get user info
        // For now, decode token to get user info
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          setUser({
            userId: payload.userId,
            email: payload.email,
            name: payload.name || payload.email,
            dashboardType: payload.dashboardType,
            role: payload.role,
            isSuperAdmin: payload.isSuperAdmin || false,
            permissions: payload.permissions || [],
          });
        } catch (error) {
          console.error('Failed to decode token:', error);
          // Try to decode token anyway if verify endpoint fails
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            setUser({
              userId: payload.userId,
              email: payload.email,
              name: payload.name || payload.email,
              dashboardType: payload.dashboardType,
              role: payload.role,
              isSuperAdmin: payload.isSuperAdmin || false,
              permissions: payload.permissions || [],
            });
          } catch (decodeError) {
            console.error('Failed to decode token:', decodeError);
            setUser(null);
          }
        }
      } else {
        // Token invalid or endpoint not found, try to refresh or decode token
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          setUser({
            userId: payload.userId,
            email: payload.email,
            name: payload.name || payload.email,
            dashboardType: payload.dashboardType,
            role: payload.role,
            isSuperAdmin: payload.isSuperAdmin || false,
            permissions: payload.permissions || [],
          });
        } catch (decodeError) {
          await attemptRefresh();
        }
      }
    } catch (error: any) {
      console.error('Auth check failed:', error);
      // If it's a 404 or network error, try to decode token from localStorage
      if (error?.message?.includes('404') || error?.message?.includes('Failed to fetch')) {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          setUser({
            userId: payload.userId,
            email: payload.email,
            name: payload.name || payload.email,
            dashboardType: payload.dashboardType,
            role: payload.role,
            isSuperAdmin: payload.isSuperAdmin || false,
            permissions: payload.permissions || [],
          });
        } catch (decodeError) {
          // If decode fails, try refresh
          await attemptRefresh();
        }
      } else {
        await attemptRefresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const attemptRefresh = async (): Promise<boolean> => {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      clearAuth();
      return false;
    }

    try {
      const response = await refreshTokenApi(refreshTokenValue);
      if (response.success && response.data) {
        localStorage.setItem('accessToken', response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        // Decode new token to get user info
        try {
          const payload = JSON.parse(atob(response.data.accessToken.split('.')[1]));
          setUser({
            userId: payload.userId,
            email: payload.email,
            name: payload.name || payload.email,
            dashboardType: payload.dashboardType,
            role: payload.role,
            isSuperAdmin: payload.isSuperAdmin || false,
            permissions: payload.permissions || [],
          });
        } catch (error) {
          console.error('Failed to decode refreshed token:', error);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    clearAuth();
    return false;
  };

  const clearAuth = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const logout = async () => {
    clearAuth();
    router.replace('/login');
  };

  const getAccessToken = (): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('accessToken');
  };

  return {
    user: mounted ? user : null, // Don't return user until mounted to prevent hydration mismatch
    loading: !mounted || loading,
    isAuthenticated: mounted && !!user,
    role: mounted ? (user?.role || null) : null,
    isSuperAdmin: mounted ? (user?.isSuperAdmin || false) : false,
    permissions: mounted ? (user?.permissions || []) : [],
    logout,
    getAccessToken,
    refreshToken: attemptRefresh,
  };
}
