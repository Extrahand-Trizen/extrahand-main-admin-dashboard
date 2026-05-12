'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { acceptInvite } from '@/lib/api/admin';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token') || '';
  const inviteId = searchParams.get('inviteId') || '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasValidParams = useMemo(() => Boolean(token && inviteId), [token, inviteId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidParams) {
      toast.error('Invalid invitation link');
      return;
    }

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      await acceptInvite(inviteId, {
        token,
        password,
        name: name.trim(),
      });

      toast.success('Invitation accepted successfully');
      router.push('/login');
    } catch (error: any) {
      toast.error('Failed to accept invitation', {
        description: error?.message || 'Please verify your invite link and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-amber-50/30 px-4 py-8">
      <Card className="w-full max-w-md border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">Accept Invitation</CardTitle>
          <CardDescription>
            Create your admin account password to activate access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasValidParams ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Invalid or incomplete invite link. Please use the latest invitation email.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={submitting}>
                {submitting ? 'Accepting...' : 'Accept Invitation'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-amber-50/30 px-4 py-8">
          <Card className="w-full max-w-md border-gray-200 shadow-lg">
            <CardContent className="py-8 text-center text-sm text-gray-600">Loading invitation...</CardContent>
          </Card>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
