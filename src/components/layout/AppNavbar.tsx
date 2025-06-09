
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  PenTool,
  ScanText,
  Bookmark,
  LogOut,
  UserCircle,
  Menu,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/generator', label: 'Generator', icon: PenTool },
  { href: '/detector', label: 'Detector', icon: ScanText },
  { href: '/saved', label: 'Saved History', icon: Bookmark },
];

export function AppNavbar() {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          asChild
          className={cn(
            'justify-start w-full text-left',
            pathname === item.href && 'bg-accent text-accent-foreground',
            mobile ? 'text-base py-3' : 'text-sm'
          )}
        >
          <Link href={item.href}>
            <item.icon className={cn("mr-2 h-4 w-4", mobile && "h-5 w-5")} />
            {item.label}
          </Link>
        </Button>
      ))}
    </>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Left side: Logo */}
        <div className="flex items-center">
          <Logo /> {/* Ensure Logo is always visible */}
        </div>

        {/* Middle: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-2">
          <NavLinks />
        </nav>

        {/* Right side: User Avatar/Login & Mobile Menu Trigger */}
        <div className="flex items-center space-x-3"> {/* Adjusted space-x for profile and menu trigger */}
          {/* User Avatar / Login Button */}
          {loading ? (
             <Avatar className="h-9 w-9">
                <AvatarFallback>...</AvatarFallback>
              </Avatar>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}

          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-4"> {/* Changed side to "right" */}
                <div className="mb-6">
                  <Logo /> {/* Logo inside the sheet */}
                </div>
                <nav className="flex flex-col space-y-2">
                  <NavLinks mobile />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
