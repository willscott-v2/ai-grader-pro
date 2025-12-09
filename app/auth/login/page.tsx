'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/design-system/button';
import { Input } from '@/components/ui/design-system/input';
import { Label } from '@/components/ui/design-system/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/design-system/card';

function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const callbackUrl = `${origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) throw error;
      setStatus('sent');
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <Card variant="glass" padding="lg" className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription className="text-[var(--light-gray)] text-base mt-1">
              We sent you a magic link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-2">
            <p className="text-base text-[var(--light-gray)]">
              Click the link in the email to sign in to your account. You can close this window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
      <div className="mb-8 text-center">
        <div className="logo-container" style={{ margin: '0 auto 20px' }}>
          <a href="https://www.searchinfluence.com" target="_blank" rel="noopener noreferrer">
            <Image src="/search-influence-logo.png" alt="Search Influence" className="si-logo" width={200} height={60} />
          </a>
        </div>
        <h1 className="text-4xl font-extrabold">
          <span className="text-gradient-orange">AI Grader Pro</span>
        </h1>
        <p className="text-[var(--orange-accent)] text-lg font-semibold mt-2">AI Search Readiness Analyzer</p>
      </div>

      <Card variant="glass" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription className="text-[var(--light-gray)] text-base mt-1">
            Sign in with your email to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'sending'}
                variant="glass"
                className="text-lg py-3"
              />
            </div>
            {error && (
              <div className="text-sm text-[var(--error-red)] bg-red-900/20 border border-red-800/30 rounded-md p-3">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 mt-4">
            <Button type="submit" className="w-full" disabled={status === 'sending'} size="lg">
              {status === 'sending' ? 'Sending magic link...' : 'Send magic link'}
            </Button>
            <p className="text-sm text-[var(--light-gray)] text-center">
              No password required. We&apos;ll send you a secure link to sign in.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--dark-blue)] to-[var(--lighter-blue)]">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
