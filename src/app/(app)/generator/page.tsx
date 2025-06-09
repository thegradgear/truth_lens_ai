
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Textarea } from '@/components/ui/textarea'; // Not used for generated article display, ArticleCard handles it
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateFakeNewsArticle, type GenerateFakeNewsArticleInput, type GenerateFakeNewsArticleOutput } from '@/ai/flows/generate-fake-news-article';
import { ArticleCard } from '@/components/shared/ArticleCard';
import type { GeneratedArticle } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { saveArticle } from '@/lib/firebase'; // Changed from mockSaveArticle
import { Loader2, Wand2, Save } from 'lucide-react';

const generatorFormSchema = z.object({
  topic: z.string().min(5, { message: "Topic must be at least 5 characters." }).max(100, { message: "Topic must be at most 100 characters."}),
  category: z.string().min(1, { message: "Please select a category." }),
  tone: z.string().min(1, { message: "Please select a tone." }),
});

type GeneratorFormValues = z.infer<typeof generatorFormSchema>;

const categories = ["Politics", "Technology", "Entertainment", "Sports", "Science", "Health", "Business", "World News", "Lifestyle", "Satire"];
const tones = ["Neutral", "Formal", "Informal", "Humorous", "Serious", "Optimistic", "Pessimistic", "Sarcastic", "Sensationalist", "Scholarly"];

export default function GeneratorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<GeneratorFormValues>({
    resolver: zodResolver(generatorFormSchema),
    defaultValues: {
      topic: "",
      category: "",
      tone: "",
    },
  });

  const onSubmit: SubmitHandler<GeneratorFormValues> = async (data) => {
    setIsLoading(true);
    setGeneratedArticle(null);
    try {
      const input: GenerateFakeNewsArticleInput = {
        topic: data.topic,
        category: data.category,
        tone: data.tone,
      };
      const result: GenerateFakeNewsArticleOutput = await generateFakeNewsArticle(input);
      
      if (result.article) {
        const newArticle: GeneratedArticle = {
          type: 'generated',
          title: `${data.category}: ${data.topic.substring(0,30)}... (${data.tone})`, 
          content: result.article,
          topic: data.topic,
          category: data.category,
          tone: data.tone,
          timestamp: new Date().toISOString(), // Client-side timestamp, Firestore will use serverTimestamp
          userId: user?.uid, 
        };
        setGeneratedArticle(newArticle);
        toast({
          title: "Article Generated!",
          description: "The AI has crafted an article based on your inputs.",
        });
      } else {
        throw new Error("AI did not return an article.");
      }
    } catch (error: any) {
      console.error("Error generating article:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate the article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveArticle = async (articleToSave: GeneratedArticle) => {
    if (!user?.uid) {
      toast({ title: "Error", description: "You must be logged in to save articles.", variant: "destructive" });
      return;
    }
    if (!articleToSave) return;

    setIsSaving(true);
    try {
      // Prepare data for Firestore, removing client-side id if it exists
      const { id, ...dataToSave } = articleToSave;
      const savedData = await saveArticle(user.uid, dataToSave);
      toast({ title: "Article Saved!", description: "The article has been saved to your history." });
      setGeneratedArticle(prev => prev ? {...prev, id: savedData.id} : null); 
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message || "Could not save the article.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-headline flex items-center"><Wand2 className="mr-3 h-7 w-7 text-primary"/>Fake News Generator</CardTitle>
          <CardDescription>
            Craft an AI-generated news article. Specify the topic, category, and desired tone, and let our AI weave a narrative.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Discovery of a new planet, A celebrity's unusual pet" {...field} disabled={isLoading || isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isSaving}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isSaving}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a tone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tones.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isSaving}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Generate Article
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin text-primary"/>Generating Your Article...</CardTitle>
            <CardDescription>The AI is working its magic. Please wait a moment.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center min-h-[200px]">
            <div className="space-y-2 text-center">
              <p className="text-muted-foreground">This might take a few seconds.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {generatedArticle && (
         <ArticleCard 
            article={generatedArticle} 
            onSave={handleSaveArticle} 
            showSaveButton={!generatedArticle.id && !isSaving}
            isSaving={isSaving}
        />
      )}
    </div>
  );
}

