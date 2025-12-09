'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/design-system/button';
import { Card } from '@/components/ui/design-system/card';

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    router.refresh();
  };

  if (!user) {
    return (
      <Button
        asChild
        variant="secondary"
        size="sm"
      >
        <a href="/auth/login">Sign in</a>
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        size="sm"
      >
        <div className="w-8 h-8 rounded-full bg-[var(--orange-accent)] flex items-center justify-center text-white font-medium">
          {user.email?.[0].toUpperCase()}
        </div>
        <span className="max-w-[150px] truncate text-white">{user.email}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <Card variant="solid" padding="none" className="absolute right-0 mt-2 w-56 shadow-lg z-20">
            <div className="p-3 border-b border-[var(--border-gray)]">
              <p className="text-sm font-medium truncate">
                {user.email}
              </p>
            </div>
            <div className="p-1">
              <a
                href="/dashboard"
                className="block w-full text-left px-3 py-2 text-sm hover:bg-[var(--background-gray)] rounded-md transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </a>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-[var(--background-gray)] rounded-md transition-colors"
              >
                Sign out
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
