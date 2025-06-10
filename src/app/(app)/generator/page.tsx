
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateFakeNewsArticle, type GenerateFakeNewsArticleInput, type GenerateFakeNewsArticleOutput } from '@/ai/flows/generate-fake-news-article';
import { generateArticleImage, type GenerateArticleImageInput, type GenerateArticleImageOutput } from '@/ai/flows/generate-article-image-flow';
import { ArticleCard } from '@/components/shared/ArticleCard';
import type { GeneratedArticle } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { saveArticle } from '@/lib/firebase';
import { Loader2, Wand2, Save, ImageIcon, AlertTriangle, RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';

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
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [imageGenerationMessage, setImageGenerationMessage] = useState<string | null>(null);


  const form = useForm<GeneratorFormValues>({
    resolver: zodResolver(generatorFormSchema),
    defaultValues: {
      topic: "",
      category: "",
      tone: "",
    },
  });

  const handleImageGenerationTrigger = async (userProvidedPrompt?: string) => {
    if (!generatedArticle) return;
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null); 
    setImageGenerationMessage(userProvidedPrompt ? "Regenerating image with your prompt..." : "Generating initial image...");

    try {
      const input: GenerateArticleImageInput = {
        topic: generatedArticle.topic,
        category: generatedArticle.category,
        articleSnippet: generatedArticle.content.substring(0, 150), // Provide a snippet
        customPrompt: userProvidedPrompt?.trim() || undefined,
      };
      const result: GenerateArticleImageOutput = await generateArticleImage(input);
      if (result.imageUrl) {
        setGeneratedImageUrl(result.imageUrl);
        setGeneratedArticle(prev => prev ? { ...prev, imageUrl: result.imageUrl } : null);
        toast({
          title: "Image Ready!",
          description: userProvidedPrompt ? "Image regenerated and stored." : "AI-powered header image created and stored.",
        });
      } else {
        throw new Error("AI did not return an image URL after processing.");
      }
    } catch (error: any) {
      console.error("Error generating or storing image:", error);
      toast({
        title: "Image Generation Failed",
        description: error.message || "Could not generate or store the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
      setImageGenerationMessage(null);
    }
  };

  const onSubmitArticle: SubmitHandler<GeneratorFormValues> = async (data) => {
    setIsLoadingArticle(true);
    setGeneratedArticle(null);
    setGeneratedImageUrl(null);
    setCustomImagePrompt(""); 
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
        };
        setGeneratedArticle(newArticle);
        toast({
          title: "Article Generated!",
          description: "The AI has crafted an article. Generating header image next...",
        });
        // Automatically trigger initial image generation
        await handleImageGenerationTrigger(); 
      } else {
        throw new Error("AI did not return an article.");
      }
    } catch (error: any) {
      console.error("Error generating article:", error);
      toast({
        title: "Article Generation Failed",
        description: error.message || "Could not generate the article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingArticle(false);
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
            Craft an AI-generated news article. An image will be automatically generated. You can then regenerate it with custom prompts.
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
                      <Input placeholder="e.g., Discovery of a new planet, A celebrity's unusual pet" {...field} disabled={isLoadingArticle || isSaving || isGeneratingImage} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingArticle || isSaving || isGeneratingImage}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingArticle || isSaving || isGeneratingImage}>
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
              <Button type="submit" className="w-full md:w-auto" disabled={isLoadingArticle || isSaving || isGeneratingImage}>
                {isLoadingArticle ? (
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

      {(isLoadingArticle || imageGenerationMessage) && !generatedArticle && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary"/> 
                {isLoadingArticle ? "Generating Your Article Text..." : imageGenerationMessage}
            </CardTitle>
            <CardDescription>
                {isLoadingArticle ? "The AI is working its magic. Please wait a moment." : "Processing image..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center min-h-[200px]">
            <div className="space-y-2 text-center">
              <p className="text-muted-foreground">This might take a few seconds.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {generatedArticle && !isLoadingArticle && (
        <>
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

          {isGeneratingImage && !generatedImageUrl && (
            <Card className="shadow-md mt-6">
              <CardHeader>
                <CardTitle className="font-headline flex items-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary"/>
                  {imageGenerationMessage || "Processing Image..."}
                </CardTitle>
                <CardDescription>Please wait while the AI creates your image.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center min-h-[150px]">
                <p className="text-muted-foreground">This may take a few moments.</p>
              </CardContent>
            </Card>
          )}

          <ArticleCard 
            article={generatedArticle}
            showSaveButton={false} 
          />
          
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Image & Article Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customImagePrompt" className="text-base">Custom Image Prompt (Optional for Regeneration)</Label>
                <Textarea
                  id="customImagePrompt"
                  placeholder="e.g., A futuristic cityscape at sunset, a close-up of a curious cat"
                  value={customImagePrompt}
                  onChange={(e) => setCustomImagePrompt(e.target.value)}
                  className="mt-1"
                  rows={2}
                  disabled={isGeneratingImage || isLoadingArticle || isSaving}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If you provide a prompt, the AI will use it for regeneration. Otherwise, it will use article details.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => handleImageGenerationTrigger(customImagePrompt)} disabled={isGeneratingImage || isLoadingArticle || isSaving} className="w-full sm:w-auto flex-1">
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" /> {generatedImageUrl ? "Regenerate" : "Generate"} Image
                    </>
                  )}
                </Button>
                <Button onClick={handleSaveArticle} disabled={isSaving || isLoadingArticle || isGeneratingImage || !!generatedArticle.id} className="w-full sm:w-auto flex-1">
                  {isSaving ? (
                       <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                       </>
                  ) : (
                       <>
                          <Save className="mr-2 h-4 w-4" /> {generatedArticle.id ? "Article Saved" : "Save Article"}
                       </>
                  )}
                </Button>
              </div>
            </CardContent>
             {isGeneratingImage && (
                <CardFooter className="flex justify-center items-center text-muted-foreground py-3">
                  <p>{imageGenerationMessage || "Creating and storing image, please wait..."}</p>
                </CardFooter>
              )}
          </Card>
        </>
      )}
    </div>
  );
}
