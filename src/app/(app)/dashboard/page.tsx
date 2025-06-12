
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PenTool, ScanText, Bookmark, Lightbulb, AlertTriangle, Image as ImageIconLucide } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { MediaLiteracyTipsCard } from '@/components/dashboard/MediaLiteracyTipsCard';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <Card className="shadow-lg bg-gradient-to-r from-primary/10 to-accent/10">
        <CardHeader>
          <CardTitle className="text-3xl md:text-4xl font-headline">
            Welcome to Veritas AI, {user?.displayName || user?.email || 'User'}!
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your central hub for generating and detecting news articles with the power of AI.
            Navigate the information landscape with greater clarity and insight.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-2 gap-6 items-center">
                <div>
                    <p className="mb-6 text-muted-foreground">
                        Ready to dive in? Choose an action below to get started, or explore your saved history.
                        Veritas AI is designed to help you understand how AI perceives and creates textual and visual information.
                    </p>
                     <div className="flex flex-col sm:flex-row gap-4">
                        <Button asChild size="lg" className="flex-1 h-12">
                            <Link href="/generator">
                            <PenTool className="mr-2 h-5 w-5" /> Generate Article & Image
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="flex-1 h-12">
                            <Link href="/detector">
                            <ScanText className="mr-2 h-5 w-5" /> Detect Article
                            </Link>
                        </Button>
                    </div>
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden shadow-md">
                    <Image 
                        src="https://placehold.co/600x338.png" 
                        alt="AI Dashboard Illustration" 
                        layout="fill" 
                        objectFit="cover"
                        data-ai-hint="AI dashboard"
                    />
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">News Generator</CardTitle>
            <div className="flex items-center text-muted-foreground">
              <PenTool className="h-5 w-5 mr-1" />
              <ImageIconLucide className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">Create & Explore</div>
            <p className="text-xs text-muted-foreground mt-1">
              Generate articles and their header images on various topics. Understand AI's creative capabilities.
            </p>
            <Button variant="link" asChild className="px-0 mt-2">
              <Link href="/generator">Go to Generator &rarr;</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fake News Detector</CardTitle>
            <ScanText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">Analyze & Verify</div>
            <p className="text-xs text-muted-foreground mt-1">
              Paste any news article to assess its authenticity using our AI model.
            </p>
            <Button variant="link" asChild className="px-0 mt-2">
              <Link href="/detector">Go to Detector &rarr;</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved History</CardTitle>
            <Bookmark className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">Your Archive</div>
            <p className="text-xs text-muted-foreground mt-1">
              Access all your previously generated articles (with images) and detected articles.
            </p>
            <Button variant="link" asChild className="px-0 mt-2">
              <Link href="/saved">View History &rarr;</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <MediaLiteracyTipsCard />

    </div>
  );
}
