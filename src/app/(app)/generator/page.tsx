
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
import { Loader2, Wand2, Save, ImageIcon, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

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
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null); // Stores Cloudinary URL
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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
    setGeneratedImageUrl(null); // Reset image when generating new article text
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
          timestamp: new Date().toISOString(),
          userId: user?.uid,
          // imageUrl will be added after image generation
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

  const handleGenerateImage = async () => {
    if (!generatedArticle) return;
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null); // Reset previous image URL
    try {
      const input: GenerateArticleImageInput = {
        topic: generatedArticle.topic,
        category: generatedArticle.category,
      };
      const result: GenerateArticleImageOutput = await generateArticleImage(input);
      if (result.imageUrl) {
        setGeneratedImageUrl(result.imageUrl);
        // Update the article state to include the new imageUrl
        setGeneratedArticle(prev => prev ? { ...prev, imageUrl: result.imageUrl } : null);
        toast({
          title: "Image Generated & Stored!",
          description: "An AI-powered header image has been created and stored in Cloudinary.",
        });
      } else {
        throw new Error("AI did not return an image URL after processing.");
      }
    } catch (error: any) {
      console.error("Error generating or storing image:", error);
      toast({
        title: "Image Generation/Storage Failed",
        description: error.message || "Could not generate or store the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
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
      // The generatedArticle state already includes imageUrl if it was generated
      const { id, ...dataToSave } = generatedArticle; 
      const savedData = await saveArticle(user.uid, dataToSave); 
      toast({ title: "Article Saved!", description: "The article (with image, if generated) has been saved." });
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
            Craft an AI-generated news article. Specify the topic, category, and desired tone, then optionally generate an image.
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
                      <Input placeholder="e.g., Discovery of a new planet, A celebrity's unusual pet" {...field} disabled={isLoading || isSaving || isGeneratingImage} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isSaving || isGeneratingImage}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isSaving || isGeneratingImage}>
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
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isSaving || isGeneratingImage}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Article Text...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Generate Article Text
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
            <CardTitle className="font-headline flex items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin text-primary"/>Generating Your Article Text...</CardTitle>
            <CardDescription>The AI is working its magic. Please wait a moment.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center min-h-[200px]">
            <div className="space-y-2 text-center">
              <p className="text-muted-foreground">This might take a few seconds.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {generatedArticle && !isLoading && (
        <>
         {/* Display generated image first if available */}
          {generatedImageUrl && (
            <Card className="shadow-md mt-6">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Generated Header Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video w-full max-w-2xl mx-auto rounded-md overflow-hidden border shadow">
                  <Image src={generatedImageUrl} alt="AI Generated Article Header" layout="fill" objectFit="cover" />
                </div>
                 <div className="flex items-start p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-300 text-xs mt-3">
                    <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                    <span>This image is AI-generated and stored on Cloudinary. Review carefully before use.</span>
                 </div>
              </CardContent>
            </Card>
          )}

          <ArticleCard 
            article={generatedArticle} // This will now contain imageUrl if generated
            // onSave not needed here as ArticleCard save button is for detected, this page has its own save button
            showSaveButton={false} 
          />
          
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Article Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:flex sm:flex-row sm:space-y-0 sm:space-x-4">
              <Button onClick={handleGenerateImage} disabled={isGeneratingImage || isLoading || isSaving} className="w-full sm:w-auto">
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Image...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" /> {generatedImageUrl ? "Regenerate" : "Generate"} Header Image
                  </>
                )}
              </Button>
              <Button onClick={handleSaveArticle} disabled={isSaving || isLoading || isGeneratingImage || !!generatedArticle.id} className="w-full sm:w-auto">
                {isSaving ? (
                     <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                     </>
                ) : (
                     <>
                        <Save className="mr-2 h-4 w-4" /> {generatedArticle.id ? "Saved" : "Save Article"}
                     </>
                )}
              </Button>
            </CardContent>
             {isGeneratingImage && (
                <CardFooter className="flex justify-center items-center text-muted-foreground">
                  <p>Creating and storing image, please wait...</p>
                </CardFooter>
              )}
          </Card>
        </>
      )}
    </div>
  );
}

      