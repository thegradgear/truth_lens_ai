
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, CheckCircle, Search, Users, CalendarDays, MessageSquareWarning, Smile, ExternalLink, Info } from 'lucide-react';

const tips = [
  {
    title: "Check the Source",
    content: "Is the website or author reputable? Look for an 'About Us' page, contact information, and professional design. Be wary of unfamiliar URLs or sites that mimic well-known news outlets.",
    icon: <Info className="h-5 w-5 text-primary" />
  },
  {
    title: "Read Beyond the Headline",
    content: "Headlines can be sensational or misleading. Always read the full article to understand the complete story and context before forming an opinion or sharing.",
    icon: <Search className="h-5 w-5 text-primary" />
  },
  {
    title: "Verify with Multiple Sources",
    content: "Are other reputable news organizations reporting the same information? Corroborating a story with multiple independent sources increases its credibility.",
    icon: <Users className="h-5 w-5 text-primary" />
  },
  {
    title: "Look for Evidence & Author Credibility",
    content: "Does the article cite credible sources, data, or named experts? Is the author a real person with relevant expertise? Anonymous sources or lack of evidence are red flags.",
    icon: <CheckCircle className="h-5 w-5 text-primary" />
  },
  {
    title: "Check the Date",
    content: "Is the information current, or is it an old story being presented as new? Outdated information can be misleading, especially if used out of context.",
    icon: <CalendarDays className="h-5 w-5 text-primary" />
  },
  {
    title: "Watch for Emotional Language & Bias",
    content: "Fake news often uses emotionally charged language to provoke a reaction. Be aware of overly biased reporting or content that seems designed to make you angry or fearful.",
    icon: <MessageSquareWarning className="h-5 w-5 text-primary" />
  },
  {
    title: "Identify Satire",
    content: "Some websites publish satirical content that, while humorous, can be mistaken for real news. Check if the source is known for satire (e.g., The Onion).",
    icon: <Smile className="h-5 w-5 text-primary" />
  },
  {
    title: "Use Fact-Checking Websites",
    content: "Utilize independent fact-checking resources like Snopes, PolitiFact, AP Fact Check, or Reuters Fact Check to verify claims.",
    icon: <ExternalLink className="h-5 w-5 text-primary" />
  }
];

export function MediaLiteracyTipsCard() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-headline flex items-center">
          <AlertCircle className="mr-3 h-6 w-6 text-primary" />
          Media Literacy: Spotting Misinformation
        </CardTitle>
        <CardDescription>
          Enhance your critical thinking skills with these tips to identify misleading content online.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {tips.map((tip, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="text-base hover:no-underline">
                <div className="flex items-center text-left">
                  {tip.icon}
                  <span className="ml-3">{tip.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pl-10 text-sm">
                {tip.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
