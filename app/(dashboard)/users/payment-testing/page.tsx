'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, TestTube2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { listUsers, updateUser } from '@/lib/api/users';
import type { User } from '@/types';

const QUERY_KEY = 'payment-testing-users';

export default function PaymentTestingPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('user.update');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const query = useQuery({
    queryKey: [QUERY_KEY, debouncedSearch],
    queryFn: async () => {
      const response = await listUsers(
        debouncedSearch.length >= 2
          ? { search: debouncedSearch, page: 1, limit: 25 }
          : { isPaymentTester: true, page: 1, limit: 25 },
      );
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.error || 'Failed to search users');
      }
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ user, enabled }: { user: User; enabled: boolean }) => {
      const userId = user.uid || user.userId;
      if (!userId) throw new Error('User ID is missing');
      const response = await updateUser(userId, { isPaymentTester: enabled });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update payment testing status');
      }
      return { userId, enabled };
    },
    onSuccess: async ({ userId, enabled }) => {
      toast.success(`Payment testing ${enabled ? 'enabled' : 'disabled'}`);
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update payment testing status'),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <div className="flex items-center gap-2">
          <TestTube2 className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payment Testing</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Enable or disable payment test mode for individual user accounts.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="p-4 text-sm text-amber-950">
          Payment test mode is controlled per user. Only enable it for accounts used to test payments.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment testing users</CardTitle>
          <CardDescription>
            Enabled testers are shown below. Search by name, email, phone number, or user ID to find another account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search users"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              {debouncedSearch.length >= 2 ? 'Searching users…' : 'Loading enabled testers…'}
            </div>
          ) : query.isError ? (
            <div className="p-10 text-center text-sm text-rose-700">
              {query.error instanceof Error ? query.error.message : 'Could not search users.'}
            </div>
          ) : query.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Payment testing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((user) => {
                  const enabled = user.isPaymentTester === true;
                  return (
                    <TableRow key={user.uid || user.userId}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{user.name || 'Unnamed user'}</div>
                        <div className="text-xs text-gray-500">{user.email || 'No email'}</div>
                      </TableCell>
                      <TableCell>{user.phone || '—'}</TableCell>
                      <TableCell className="max-w-56 truncate font-mono text-xs">{user.uid || user.userId}</TableCell>
                      <TableCell>
                        <Badge variant={enabled ? 'default' : 'secondary'}>
                          {enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={enabled}
                          disabled={!canUpdate || mutation.isPending}
                          aria-label={`${enabled ? 'Disable' : 'Enable'} payment testing for ${user.name || user.userId}`}
                          onCheckedChange={(nextEnabled) => mutation.mutate({ user, enabled: nextEnabled })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center text-sm text-gray-500">
              {debouncedSearch.length >= 2 ? 'No matching users found.' : 'No payment testers are enabled yet.'}
            </div>
          )}
        </CardContent>
      </Card>

      {!canUpdate ? (
        <p className="text-sm text-amber-800">You have view access only. Ask an administrator for user update permission to change this setting.</p>
      ) : null}
    </div>
  );
}
