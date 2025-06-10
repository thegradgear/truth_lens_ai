
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { Info, Zap, Menu, LogIn, UserPlus } from 'lucide-react'; // UserPlus and LogIn might still be used for mobile if we keep icons there, or can be removed if icons are gone from mobile too.
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet'; 
import { Separator } from '@/components/ui/separator';
import { ThemeToggle, ThemeToggleSidebar } from '@/components/shared/ThemeToggle';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';

const navLinksConfig = [
  { href: '/#features', label: 'Features' },
  { href: '/#about', label: 'About' },
];

const authLinksConfig = [
 { href: '/login', label: 'Login', variant: 'ghost' as const }, // Changed "Sign In" to "Login"
 { href: '/signup', label: 'Sign Up', variant: 'default' as const },
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
      key={`${link.href}-desktop-main`}
      variant={'ghost'}
      asChild
      className={"px-2 sm:px-3"}
    >
      <Link href={link.href}>
        {/* Icon removed */}
        {link.label}
      </Link>
    </Button>
  ));

  const desktopAuthLinks = authLinksConfig.map((link) => (
     <Button
      key={`${link.href}-desktop-auth`}
      variant={link.variant || 'ghost'}
      asChild
      className={link.variant === 'default' ? "px-3 sm:px-4" : "px-2 sm:px-3"}
    >
      <Link href={link.href}>
        {/* Icon removed */}
        {link.label}
      </Link>
    </Button>
  ));

  // Decide if mobile links should also lose icons. For now, let's keep them for better visual cues in a compact list.
  // If icons are to be removed from mobile as well, delete the <link.icon> part below too.
  // For now, I will retain icons for mobile links as it's common practice. If you want them removed, let me know.
  const mobileNavLinks = navLinksConfig.map((link) => (
    <SheetClose asChild key={`${link.href}-mobile-main`}>
      <Button
        variant="ghost" 
        asChild
        className="w-full justify-start text-base py-3"
        onClick={() => setIsSheetOpen(false)}
      >
        <Link href={link.href}>
          {link.href === '/#features' ? <Zap className="mr-2 h-5 w-5" /> : <Info className="mr-2 h-5 w-5" />}
          {link.label}
        </Link>
      </Button>
    </SheetClose>
  ));

  const mobileAuthLinks = authLinksConfig.map((link) => (
    <SheetClose asChild key={`${link.href}-mobile-auth`}>
      <Button
        variant="ghost"
        asChild
        className="w-full justify-start text-base py-3"
        onClick={() => setIsSheetOpen(false)}
      >
        <Link href={link.href}>
          {link.href === '/login' ? <LogIn className="mr-2 h-5 w-5" /> : <UserPlus className="mr-2 h-5 w-5" />}
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
          <div className="h-6 w-px bg-border mx-2"></div> {/* Vertical Separator */}
          <div className="hidden md:block">
            <ThemeToggle align="end" />
          </div>
          {desktopAuthLinks}
        </nav>

        <div className="ml-auto flex items-center md:hidden">
           {/* ThemeToggle for mobile, usually placed in sidebar, but if needed here for some reason */}
          {/* <ThemeToggle />  */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="ml-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 pt-6 flex flex-col">
              <SheetTitle className="sr-only">Mobile Navigation Menu</SheetTitle>
              <div className="px-4 mb-4">
                <Logo />
              </div>
              <nav className="flex flex-col space-y-1 px-2 flex-grow">
                {mobileNavLinks}
                <Separator className="my-2" />
                {mobileAuthLinks}
              </nav>
              <Separator className="my-2" />
              <div className="pb-4">
                <ThemeToggleSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
