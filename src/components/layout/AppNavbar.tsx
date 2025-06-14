
"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
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
import { ThemeToggle, ThemeToggleSidebar } from '@/components/shared/ThemeToggle';
import {
  LayoutDashboard,
  PenTool,
  ScanText,
  Bookmark,
  LogOut,
  UserCircle,
  Menu,
  Puzzle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/generator', label: 'Generator', icon: PenTool },
  { href: '/detector', label: 'Detector', icon: ScanText },
  { href: '/playgame', label: 'Play Game', icon: Puzzle },
  { href: '/saved', label: 'Saved History', icon: Bookmark },
];

const userMenuItems = [
    { href: '/profile', label: 'Profile', icon: UserCircle },
];

export function AppNavbar() {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  React.useEffect(() => {
    if (isSheetOpen) {
      setIsSheetOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);


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
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const linkButton = (
          <Button
            key={item.href} // Added key here
            variant={isActive ? "default" : "ghost"}
            asChild
            className={cn(
              'justify-start w-full text-left', // Default for mobile/sidebar
              mobile ? 'text-base py-3' : 'text-sm', // Mobile specific styles
              !mobile && 'w-auto px-3' // Desktop specific styles
            )}
          >
            <Link href={item.href}>
              <item.icon className={cn("mr-2 h-4 w-4", mobile && "h-5 w-5")} />
              {item.label}
            </Link>
          </Button>
        );
        if (mobile) {
          return <SheetClose asChild key={`${item.href}-mobile`}>{linkButton}</SheetClose>;
        }
        return linkButton; // Directly return for desktop
      })}
    </>
  );

  const UserMenuItems = ({ mobile = false }: { mobile?: boolean}) => (
    <>
      {userMenuItems.map((item) => {
        const isActive = pathname === item.href;
        const menuItemContent = (
          <>
            <item.icon className={cn("mr-2 h-4 w-4", mobile && "h-5 w-5")} />
            {item.label}
          </>
        );

        if (mobile) {
          return (
            <SheetClose asChild key={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                asChild
                className={cn(
                    'justify-start w-full text-left text-base py-3'
                )}
              >
                <Link href={item.href}>{menuItemContent}</Link>
              </Button>
            </SheetClose>
          );
        } else {
          return (
            <DropdownMenuItem asChild key={item.href}>
              <Link href={item.href} className={cn(isActive && 'bg-primary/10 text-primary')}>
                {menuItemContent}
              </Link>
            </DropdownMenuItem>
          );
        }
      })}
    </>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center mr-auto md:mr-6">
          <Logo />
        </div>

        {/* Navigation for large screens (lg and up) */}
        <nav className="hidden lg:flex items-center space-x-1 mx-auto">
          <NavLinks />
        </nav>
        
        <div className="flex items-center space-x-2 md:space-x-3 ml-auto">
           {/* ThemeToggle visible on lg and up here */}
          <div className="hidden lg:block">
            <ThemeToggle align="end"/>
          </div>
          
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
                <UserMenuItems />
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

          {/* Hamburger menu for screens smaller than lg (i.e., sm and md) */}
          <div className="lg:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0 pt-4 flex flex-col">
                <SheetTitle className="sr-only">Main Menu</SheetTitle>
                <div className="px-4 mb-4">
                  <Logo />
                </div>
                <nav className="flex flex-col space-y-1 px-2 flex-grow">
                  <NavLinks mobile />
                  {userMenuItems.length > 0 && user && <Separator className="my-2" />}
                  {user && <UserMenuItems mobile /> }
                   { user && <Separator className="my-2" />}
                   {user && (
                    <SheetClose asChild>
                        <Button
                            variant="ghost"
                            onClick={signOut}
                            className="justify-start w-full text-left text-base py-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                            <LogOut className="mr-2 h-5 w-5" />
                            Sign Out
                        </Button>
                    </SheetClose>
                   )}
                </nav>
                <Separator className="my-2" />
                <div className="pb-4">
                    <ThemeToggleSidebar />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

