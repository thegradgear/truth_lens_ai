
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { detectFakeNews, type DetectFakeNewsInput, type DetectFakeNewsOutput } from '@/ai/flows/detect-fake-news';
import { ArticleCard } from '@/components/shared/ArticleCard';
import type { DetectedArticle } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { saveArticle } from '@/lib/firebase'; // Changed from mockSaveArticle
import { Loader2, ScanSearch, Save } from 'lucide-react';

const detectorFormSchema = z.object({
  articleText: z.string().min(50, { message: "Article text must be at least 50 characters." }).max(5000, {message: "Article text must be at most 5000 characters."}),
});

type DetectorFormValues = z.infer<typeof detectorFormSchema>;

export default function DetectorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [detectionResult, setDetectionResult] = useState<DetectedArticle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<DetectorFormValues>({
    resolver: zodResolver(detectorFormSchema),
    defaultValues: {
      articleText: "",
    },
  });

  const onSubmit: SubmitHandler<DetectorFormValues> = async (data) => {
    setIsLoading(true);
    setDetectionResult(null);
    try {
      const input: DetectFakeNewsInput = {
        articleText: data.articleText,
      };
      const result: DetectFakeNewsOutput = await detectFakeNews(input);
      
      if (result.label && result.confidence !== undefined) {
         const newDetection: DetectedArticle = {
          type: 'detected',
          text: data.articleText,
          result: {
            label: result.label,
            confidence: result.confidence,
          },
          timestamp: new Date().toISOString(), // Client-side timestamp, Firestore will use serverTimestamp
          userId: user?.uid, // Will be added by saveArticle function too
        };
        setDetectionResult(newDetection);
        toast({
          title: "Detection Complete!",
          description: `The article is predicted as ${result.label.toLowerCase()} with ${result.confidence.toFixed(1)}% confidence.`,
        });
      } else {
        throw new Error("AI did not return a valid detection.");
      }
    } catch (error: any) {
      console.error("Error detecting article:", error);
      toast({
        title: "Detection Failed",
        description: error.message || "Could not analyze the article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDetection = async (articleToSave: DetectedArticle) => {
    if (!user?.uid) {
      toast({ title: "Error", description: "You must be logged in to save detections.", variant: "destructive" });
      return;
    }
    if (!articleToSave) return;

    setIsSaving(true);
    try {
      // Prepare data for Firestore, removing client-side id if it exists
      const { id, ...dataToSave } = articleToSave;
      const savedData = await saveArticle(user.uid, dataToSave); 
      toast({ title: "Detection Saved!", description: "The detection result has been saved to your history." });
      setDetectionResult(prev => prev ? {...prev, id: savedData.id } : null); 
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message || "Could not save the detection.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-headline flex items-center"><ScanSearch className="mr-3 h-7 w-7 text-primary"/>Fake News Detector</CardTitle>
          <CardDescription>
            Paste a news article below. Our AI model will analyze its content and predict whether it's likely real or fake.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="articleText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the full text of the news article here..."
                        className="min-h-[200px] resize-y"
                        {...field}
                        disabled={isLoading || isSaving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isSaving}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <ScanSearch className="mr-2 h-4 w-4" /> Analyze Article
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
            <CardTitle className="font-headline flex items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin text-primary"/>Analyzing Article...</CardTitle>
            <CardDescription>Our AI is processing the text. This may take a few moments.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center min-h-[150px]">
            <div className="space-y-2 text-center">
                <p className="text-muted-foreground">Please wait while we check for signs of misinformation.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {detectionResult && (
        <ArticleCard 
          article={detectionResult} 
          onSave={handleSaveDetection} 
          showSaveButton={!detectionResult.id && !isSaving} 
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

