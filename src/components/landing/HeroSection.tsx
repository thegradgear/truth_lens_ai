
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline">
              Unmask Truth. Understand Bias.
              <span className="block text-primary">With Veritas AI.</span>
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Empower yourself with cutting-edge AI tools to detect fake news, generate articles with images, and test your media literacy in our interactive game. Navigate the information age with confidence.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="shadow-lg hover:shadow-primary/30 transition-shadow">
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">
                  Explore Features
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl group">
             <Image
              src="https://placehold.co/1200x675.png"
              alt="AI analyzing news"
              layout="fill"
              objectFit="cover"
              className="transform group-hover:scale-105 transition-transform duration-500 ease-in-out"
              data-ai-hint="AI news analysis"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-xl font-semibold">Advanced AI Engine</h3>
                <p className="text-sm">Constantly learning & improving.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

