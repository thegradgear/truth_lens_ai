
"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateFakeNewsArticle, type GenerateFakeNewsArticleInput, type GenerateFakeNewsArticleOutput } from '@/ai/flows/generate-fake-news-article';
import { generateArticleImage, type GenerateArticleImageInput, type GenerateArticleImageOutput } from '@/ai/flows/generate-article-image-flow';
import { ArticleCard } from '@/components/shared/ArticleCard';
import type { GeneratedArticle } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { saveArticle } from '@/lib/firebase';
import { Loader2, Wand2, Save, AlertTriangle, Image as ImageIconLucide, Lightbulb } from 'lucide-react';


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
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageGenerationMessage, setImageGenerationMessage] = useState<string | null>(null);


  const form = useForm<GeneratorFormValues>({
    resolver: zodResolver(generatorFormSchema),
    defaultValues: {
      topic: "",
      category: "",
      tone: "",
    },
  });
  
  const onSubmitArticle: SubmitHandler<GeneratorFormValues> = async (data) => {
    setIsLoadingArticle(true);
    setGeneratedArticle(null);
    setImageGenerationMessage("Generating article text...");

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
      
      const tempArticleDetails: GeneratedArticle = {
        type: 'generated',
        title: `${data.category}: ${data.topic.substring(0,30)}... (${data.tone})`,
        content: articleResult.article,
        topic: data.topic,
        category: data.category,
        tone: data.tone,
        timestamp: new Date().toISOString(),
        userId: user?.uid,
        // imageUrl will be added after image generation
      };
      setGeneratedArticle(tempArticleDetails); // Show text first

      toast({
        title: "Article Text Generated!",
        description: "Now automatically creating a header image...",
      });
      setImageGenerationMessage("Generating header image...");

      // 2. Automatically Generate Image
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
            description: "The AI-powered header image has been generated and stored.",
          });
          setImageGenerationMessage("Image generated successfully!");
        } else {
           toast({
            title: "Image Generation Skipped by AI",
            description: "The AI model did not return an image for this content. Displaying article text only.",
            variant: "default", 
          });
          setImageGenerationMessage("AI did not return an image. Article text is available.");
        }
      } catch (imageError: any) {
        console.error("Error during automatic image generation:", imageError);
        toast({
          title: "Image Generation Failed",
          description: imageError.message || "Could not generate the header image. Displaying article text only.",
          variant: "destructive",
        });
        setImageGenerationMessage(`Image generation failed: ${imageError.message}`);
      }
      
      // 3. Set final state with image for display
      setGeneratedArticle(prev => prev ? { ...prev, imageUrl: finalImageUrl } : null);

    } catch (error: any) { // Catches errors from article text generation
      console.error("Error generating article content:", error);
      toast({
        title: "Article Generation Failed",
        description: error.message || "Could not generate the article. Please try again.",
        variant: "destructive",
      });
      setImageGenerationMessage(null);
    } finally {
      setIsLoadingArticle(false);
      // Message will clear or update based on outcome
      setTimeout(() => { if (!isLoadingArticle) setImageGenerationMessage(null); }, 5000);
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
       <Card className="bg-secondary/70 border-primary/30">
        <CardHeader className="flex flex-row items-start gap-4">
          <Lightbulb className="h-8 w-8 text-primary mt-1 shrink-0" />
          <div>
            <CardTitle className="font-headline text-xl">Understanding AI Generation</CardTitle>
            <CardDescription className="mt-1">
              AI-generated content (text and images) is for illustrative or educational purposes. Always apply critical thinking when reviewing or using AI-created materials.
            </CardDescription>
          </div>
        </CardHeader>
         <CardContent className="flex flex-row items-start gap-4 border-t pt-6">
            <AlertTriangle className="h-8 w-8 text-destructive mt-1 shrink-0" />
            <div>
                <h4 className="font-semibold">Ethical Use Reminder</h4>
                <p className="text-sm text-muted-foreground mt-1">
                Use the generation tools responsibly. Do not create or spread misinformation. Veritas AI is intended for learning and understanding AI capabilities.
                </p>
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-headline flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-primary"/>
            <span className="mr-1">Fake News Generator</span>
            <ImageIconLucide className="h-6 w-6 text-primary opacity-80"/>
          </CardTitle>
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
                      <Input placeholder="e.g., Discovery of a new planet, A celebrity's unusual pet" {...field} disabled={isLoadingArticle || isSaving} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingArticle || isSaving}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingArticle || isSaving}>
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
              <Button type="submit" className="w-full md:w-auto" disabled={isLoadingArticle || isSaving}>
                {isLoadingArticle ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
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

      {isLoadingArticle && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary"/>
                {imageGenerationMessage || "Generating..."}
            </CardTitle>
            <CardDescription>
                The AI is working. This may take a few moments.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center min-h-[150px]">
            <div className="space-y-2 text-center">
              <p className="text-muted-foreground">Please wait patiently.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {generatedArticle && !isLoadingArticle && (
        <>
          {imageGenerationMessage && !generatedArticle.imageUrl && (
             <div className="flex items-start p-3 my-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-300 text-xs">
                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                <span>{imageGenerationMessage} Displaying article text.</span>
              </div>
          )}
           {generatedArticle.imageUrl && (
              <div className="flex items-start p-3 my-4 rounded-md bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700/50 dark:text-green-300 text-xs">
                <ImageIconLucide className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                <span>{imageGenerationMessage || "Article and image generated!"} Review carefully before any use.</span>
              </div>
          )}


          <ArticleCard
            article={generatedArticle}
            showSaveButton={false} 
          />
          
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Save Your Creation</CardTitle>
              <CardDescription>
                {generatedArticle.id ? "This article has been saved to your history." : "Save the generated article and its image to your history."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleSaveArticle} 
                disabled={isSaving || !!generatedArticle.id || isLoadingArticle} 
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
