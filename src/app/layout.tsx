
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Truth Lens AI - Fake News Detection & Generation',
  description: 'Explore AI with Truth Lens AI: Detect fake news, generate articles & images, and test your skills with our interactive game. Built with Next.js, Firebase, and Genkit.',
  icons: {
    icon: '/favicon.ico', // Assuming a favicon might be added later
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Note: The Inter font is now handled by next/font below.
            The existing Google Fonts links for Inter can be removed if only Inter is used.
            However, if other fonts were linked here, they should be preserved or managed via next/font.
            For this project, we stick to the next/font approach for Inter.
        */}
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased', inter.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
