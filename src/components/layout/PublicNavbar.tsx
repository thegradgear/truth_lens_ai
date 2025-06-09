
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { LogIn, UserPlus, Info, Zap } from 'lucide-react'; // Added Info and Zap for icons

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Logo />
        <nav className="ml-auto flex items-center space-x-1 md:space-x-2">
          <Button variant="ghost" asChild className="px-2 sm:px-3">
            <Link href="#features">
              <Zap className="mr-1 sm:mr-2 h-4 w-4" />
              Features
            </Link>
          </Button>
          <Button variant="ghost" asChild className="px-2 sm:px-3">
            <Link href="#about">
              <Info className="mr-1 sm:mr-2 h-4 w-4" />
              About
            </Link>
          </Button>
          <Button variant="ghost" asChild className="px-2 sm:px-3">
            <Link href="/login">
              <LogIn className="mr-1 sm:mr-2 h-4 w-4" />
              Sign In
            </Link>
          </Button>
          <Button asChild className="px-3 sm:px-4">
            <Link href="/signup">
              <UserPlus className="mr-1 sm:mr-2 h-4 w-4" />
              Sign Up
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
