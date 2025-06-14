
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Target, Users } from 'lucide-react';
import Image from 'next/image';

export function AboutSection() {
  return (
    <section id="about" className="py-16 md:py-24 bg-background">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">About Truth Lens AI</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Dedicated to fostering media literacy and critical thinking in the digital age.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          <Card className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="items-center">
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                <Lightbulb className="h-8 w-8" />
              </div>
              <CardTitle className="font-headline text-xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground flex-grow">
              To provide accessible and powerful AI tools that help users discern truth from misinformation, understand the nuances of AI-generated content, and enhance media literacy through interactive experiences.
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="items-center">
               <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                <Target className="h-8 w-8" />
              </div>
              <CardTitle className="font-headline text-xl">Our Vision</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground flex-grow">
              A world where individuals are equipped to critically evaluate information, fostering a more informed and resilient society against the tide of disinformation.
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-1 flex flex-col">
            <CardHeader className="items-center">
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                <Users className="h-8 w-8" />
              </div>
              <CardTitle className="font-headline text-xl">Our Team</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground flex-grow">
              Composed of passionate AI researchers, developers, and designers committed to ethical AI and empowering users with knowledge.
            </CardContent>
          </Card>
        </div>
        <div className="mt-16 grid md:grid-cols-2 gap-8 items-center">
            <div>
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl font-headline mb-4">Why Truth Lens AI?</h3>
                <p className="text-muted-foreground mb-4">
                    In an era of information overload, distinguishing credible news from fabricated stories is more challenging than ever. Truth Lens AI leverages state-of-the-art artificial intelligence to provide you with tools for critical analysis, creative exploration, and skill development.
                </p>
                <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-primary mr-2 mt-1 shrink-0" />
                        <span><strong>Advanced Detection:</strong> Utilize our Truth Lens model and a Genkit-powered LLM (with XAI & mock fact-checking) to analyze news articles.</span>
                    </li>
                    <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-primary mr-2 mt-1 shrink-0" />
                        <span><strong>Ethical Generation:</strong> Explore how AI can craft narratives and accompanying visuals for educational and creative purposes.</span>
                    </li>
                     <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-primary mr-2 mt-1 shrink-0" />
                        <span><strong>Interactive Learning:</strong> Sharpen your media literacy skills with our engaging 'Guess Real or Fake' game.</span>
                    </li>
                    <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-primary mr-2 mt-1 shrink-0" />
                        <span><strong>User-Focused:</strong> Designed with simplicity and ease-of-use in mind for everyone.</span>
                    </li>
                </ul>
            </div>
            <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg">
                 <Image
                    src="https://placehold.co/600x600.png"
                    alt="Team working on AI"
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="team collaboration"
                />
            </div>
        </div>
      </div>
    </section>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
