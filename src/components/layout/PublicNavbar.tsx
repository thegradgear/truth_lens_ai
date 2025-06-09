
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { LogIn, UserPlus, Info, Zap, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet'; // Added SheetTitle
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

const navLinksConfig = [
  { href: '#features', label: 'Features', icon: Zap, desktopOnly: false },
  { href: '#about', label: 'About', icon: Info, desktopOnly: false },
  { href: '/login', label: 'Sign In', icon: LogIn, desktopOnly: false, variant: 'ghost' as const },
  { href: '/signup', label: 'Sign Up', icon: UserPlus, desktopOnly: false, variant: 'default' as const },
];

export function PublicNavbar() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isSheetOpen) {
      setIsSheetOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const desktopNavLinks = navLinksConfig.map((link) => (
    <Button
      key={`${link.href}-desktop`}
      variant={link.variant || 'ghost'}
      asChild
      className={link.variant === 'default' ? "px-3 sm:px-4" : "px-2 sm:px-3"}
    >
      <Link href={link.href}>
        <link.icon className="mr-1 sm:mr-2 h-4 w-4" />
        {link.label}
      </Link>
    </Button>
  ));

  const mobileNavLinks = navLinksConfig.map((link) => (
    <SheetClose asChild key={`${link.href}-mobile`}>
      <Button
        variant="ghost" 
        asChild
        className="w-full justify-start text-base py-3"
        onClick={() => setIsSheetOpen(false)}
      >
        <Link href={link.href}>
          <link.icon className="mr-2 h-5 w-5" />
          {link.label}
        </Link>
      </Button>
    </SheetClose>
  ));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Logo />

        <nav className="ml-auto hidden items-center space-x-1 md:flex md:space-x-2">
          {desktopNavLinks}
        </nav>

        <div className="ml-auto md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 pt-6">
              <SheetTitle className="sr-only">Mobile Navigation Menu</SheetTitle>
              <div className="px-4 mb-6">
                <Logo />
              </div>
              <nav className="flex flex-col space-y-1 px-2">
                {mobileNavLinks}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

