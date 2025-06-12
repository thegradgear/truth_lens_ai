
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScanText, BotMessageSquare, UserCheck, ShieldCheck, BrainCircuit, ListChecks, Image as ImageIcon, Puzzle } from 'lucide-react';

const features = [
  {
    icon: <ScanText className="h-10 w-10 text-primary" />,
    title: "Dual AI News Detection",
    description: "Analyze articles using our custom ML model or an advanced Genkit AI model (with XAI & mock fact-checking) to get a confidence score on authenticity.",
  },
  {
    icon: <BotMessageSquare className="h-10 w-10 text-primary" />,
    title: "AI Article & Image Generator",
    description: "Explore AI's creative potential. Generate articles on various topics, categories, and tones, complete with an automatically AI-generated header image.",
  },
  {
    icon: <Puzzle className="h-10 w-10 text-primary" />,
    title: "Interactive 'Guess Real or Fake' Game",
    description: "Test and improve your media literacy skills in an engaging gamified environment by guessing if AI-presented articles are real or fake.",
  },
  {
    icon: <UserCheck className="h-10 w-10 text-primary" />,
    title: "User Authentication & Profile",
    description: "Secure sign-up, login, and profile management to protect your data and history.",
  },
  {
    icon: <ListChecks className="h-10 w-10 text-primary" />,
    title: "Saved History",
    description: "Keep track of all your generated articles (with images) and detected articles (with analysis), accessible anytime.",
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary" />,
    title: "Ethical AI Focus",
    description: "We are committed to responsible AI development and promoting media literacy through transparent tools.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24 bg-primary/5">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Powerful Features at Your Fingertips</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Veritas AI offers a suite of tools to help you navigate the complex world of information, including AI-driven content generation, analysis, and interactive learning.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
              <CardHeader className="items-center text-center pt-6">
                <div className="p-3 rounded-full bg-primary/10 mb-3">
                  {feature.icon}
                </div>
                <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex-grow">
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

