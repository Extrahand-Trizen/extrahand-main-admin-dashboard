'use client';

import { useAuth } from './useAuth';

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const isSuperAdmin = user?.isSuperAdmin || false;

  const hasPermission = (permission: string): boolean => {
    // Super admin has all permissions
    if (isSuperAdmin) {
      return true;
    }
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (isSuperAdmin) {
      return true;
    }
    return requiredPermissions.some(perm => permissions.includes(perm));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (isSuperAdmin) {
      return true;
    }
    return requiredPermissions.every(perm => permissions.includes(perm));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    isSuperAdmin,
  };
}
