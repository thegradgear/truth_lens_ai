"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import type React from 'react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      // Store intended path to redirect after login
      // localStorage.setItem('redirectAfterLogin', pathname); // Could be useful
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    // Show a loading skeleton or spinner while checking auth state or redirecting
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Skeleton className="h-12 w-12 rounded-full mb-4" />
        <Skeleton className="h-4 w-[250px] mb-2" />
        <Skeleton className="h-4 w-[200px]" />
        <p className="mt-4 text-muted-foreground">Loading Veritas AI...</p>
      </div>
    );
  }

  return <>{children}</>;
}
