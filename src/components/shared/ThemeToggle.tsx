
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";


export function ThemeToggle({ className }: { className?: string; align?: "center" | "end" | "start" | undefined }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder or null until mounted to avoid hydration mismatch
    return <div className={cn("h-10 w-10", className)} />; // Or your preferred placeholder size
  }

  const isDarkMode = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  const tooltipText = isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode";

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={className}
            aria-label={tooltipText}
          >
            {isDarkMode ? (
              <Moon className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <Sun className="h-[1.2rem] w-[1.2rem]" />
            )}
            <span className="sr-only">{tooltipText}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ThemeToggleSidebar() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-full px-2" > <div className="h-full w-full bg-muted rounded-md animate-pulse"></div></div>; // Placeholder for sidebar
  }
  
  const isDarkMode = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  return (
    <div className="w-full px-2">
        <Button variant="outline" className="w-full justify-start" onClick={toggleTheme}>
            {isDarkMode ? (
                <Moon className="mr-2 h-4 w-4" />
            ) : (
                <Sun className="mr-2 h-4 w-4" />
            )}
            <span>{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
        </Button>
    </div>
  );
}
