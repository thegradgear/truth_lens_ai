
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateFakeNewsArticle, type GenerateFakeNewsArticleInput, type GenerateFakeNewsArticleOutput } from '@/ai/flows/generate-fake-news-article';
import { generateArticleImage, type GenerateArticleImageInput, type GenerateArticleImageOutput } from '@/ai/flows/generate-article-image-flow';
import { ArticleCard } from '@/components/shared/ArticleCard';
import type { GeneratedArticle } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { saveArticle } from '@/lib/firebase';
import { Loader2, Wand2, Save, AlertTriangle } from 'lucide-react';
// Image component from 'next/image' is not directly used here anymore, but ArticleCard uses it.
// Label component removed as it's not directly used.

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
  const [isLoading, setIsLoading] = useState(false); // Consolidated loading state
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<GeneratorFormValues>({
    resolver: zodResolver(generatorFormSchema),
    defaultValues: {
      topic: "",
      category: "",
      tone: "",
    },
  });

  const onSubmitArticle: SubmitHandler<GeneratorFormValues> = async (data) => {
    setIsLoading(true);
    setGeneratedArticle(null);

    try {
      // 1. Generate Article Text
      const articleInput: GenerateFakeNewsArticleInput = {
        topic: data.topic,
        category: data.category,
        tone: data.tone,
      };
      const articleResult: GenerateFakeNewsArticleOutput = await generateFakeNewsArticle(articleInput);

      if (!articleResult.article) {
        throw new Error("AI did not return an article text.");
      }

      const tempArticleDetails = {
        topic: data.topic,
        category: data.category,
        tone: data.tone,
        content: articleResult.article,
      };

      toast({
        title: "Article Text Generated!",
        description: "Now automatically creating a header image...",
      });

      // 2. Generate Image
      let finalImageUrl: string | undefined = undefined;
      try {
        const imageGenInput: GenerateArticleImageInput = {
          topic: tempArticleDetails.topic,
          category: tempArticleDetails.category,
          articleSnippet: tempArticleDetails.content.substring(0, 200),
        };
        const imageResult: GenerateArticleImageOutput = await generateArticleImage(imageGenInput);
        if (imageResult.imageUrl) {
          finalImageUrl = imageResult.imageUrl;
          toast({
            title: "Header Image Created!",
            description: "The AI-powered header image has been generated.",
          });
        } else {
          // Image generation succeeded in the flow, but no URL was returned (e.g. safety block)
           toast({
            title: "Image Generation Skipped by AI",
            description: "The AI model did not return an image for this content. Displaying article text only.",
            variant: "default", 
          });
        }
      } catch (imageError: any) {
        console.error("Error during automatic image generation:", imageError);
        toast({
          title: "Image Generation Failed",
          description: imageError.message || "Could not generate the header image.",
          variant: "destructive",
        });
        // Proceed with article text only
      }
      
      // 3. Set final state for display
      const newArticle: GeneratedArticle = {
        type: 'generated',
        title: `${data.category}: ${data.topic.substring(0,30)}... (${data.tone})`,
        content: tempArticleDetails.content,
        topic: data.topic,
        category: data.category,
        tone: data.tone,
        timestamp: new Date().toISOString(),
        userId: user?.uid,
        imageUrl: finalImageUrl,
      };
      setGeneratedArticle(newArticle);

    } catch (error: any) { // Catches errors from article text generation
      console.error("Error generating article content:", error);
      toast({
        title: "Article Generation Failed",
        description: error.message || "Could not generate the article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveArticle = async () => {
    if (!user?.uid) {
      toast({ title: "Error", description: "You must be logged in to save articles.", variant: "destructive" });
      return;
    }
    if (!generatedArticle) return;

    setIsSaving(true);
    try {
      const articleToSave = { ...generatedArticle }; 
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
            Craft an AI-generated news article. A header image will be automatically generated and displayed with the article.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitArticle)} className="space-y-6">
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Article & Image...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Generate Article & Image
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && !generatedArticle && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary"/>
                Generating Your Article & Image...
            </CardTitle>
            <CardDescription>
                The AI is working. This may take a few moments.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center min-h-[200px]">
            <div className="space-y-2 text-center">
              <p className="text-muted-foreground">Please wait patiently.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {generatedArticle && !isLoading && (
        <>
          {generatedArticle.imageUrl && (
              <div className="flex items-start p-3 my-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-300 text-xs">
                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                <span>The header image displayed with the article is AI-generated and stored on Cloudinary. Review carefully before any use.</span>
              </div>
          )}
          {!generatedArticle.imageUrl && (
             <div className="flex items-start p-3 my-4 rounded-md bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300 text-xs">
                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                <span>Article text is ready. An image could not be generated for this content.</span>
              </div>
          )}

          <ArticleCard
            article={generatedArticle}
            showSaveButton={false} // Save button is handled separately below
          />
          
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Save Your Article</CardTitle>
              <CardDescription>
                {generatedArticle.id ? "This article has been saved to your history." : "Save the generated article and its image to your history."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleSaveArticle} 
                disabled={isSaving || !!generatedArticle.id} 
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                   <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                   </>
                ) : (
                   <>
                      <Save className="mr-2 h-4 w-4" /> {generatedArticle.id ? "Article Saved" : "Save Article & Image"}
                   </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
