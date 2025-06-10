
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/layout/Footer';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicNavbar />
      <main className="flex-grow flex flex-col items-center justify-center p-4 text-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 text-destructive">
              <SearchX size={64} strokeWidth={1.5} />
            </div>
            <CardTitle className="text-3xl font-headline">404 - Page Not Found</CardTitle>
            <CardDescription className="text-lg">
              Oops! The page you&apos;re looking for doesn&apos;t seem to exist.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              It might have been moved, deleted, or perhaps you mistyped the URL.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/">Go to Homepage</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
