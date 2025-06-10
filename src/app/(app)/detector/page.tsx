
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { detectFakeNews, type DetectFakeNewsInput, type DetectFakeNewsOutput } from '@/ai/flows/detect-fake-news';
import { llmDetectFakeNews, type LlmDetectFakeNewsInput, type LlmDetectFakeNewsOutput } from '@/ai/flows/llm-detect-fake-news';
import { ArticleCard } from '@/components/shared/ArticleCard';
import type { DetectedArticle } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { saveArticle } from '@/lib/firebase';
import { Loader2, ScanSearch, Save, Brain, Database } from 'lucide-react';

const detectorFormSchema = z.object({
  articleText: z.string().min(50, { message: "Article text must be at least 50 characters." }).max(5000, {message: "Article text must be at most 5000 characters."}),
  detectionMethod: z.enum(['custom', 'llm'], { required_error: "Please select a detection method." }),
});

type DetectorFormValues = z.infer<typeof detectorFormSchema>;

export default function DetectorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [detectionResult, setDetectionResult] = useState<DetectedArticle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMethodForDisplay, setSelectedMethodForDisplay] = useState<'custom' | 'llm'>('custom');


  const form = useForm<DetectorFormValues>({
    resolver: zodResolver(detectorFormSchema),
    defaultValues: {
      articleText: "",
      detectionMethod: "custom",
    },
  });

  const onSubmit: SubmitHandler<DetectorFormValues> = async (data) => {
    setIsLoading(true);
    setDetectionResult(null);
    setSelectedMethodForDisplay(data.detectionMethod);

    try {
      let result: DetectFakeNewsOutput | LlmDetectFakeNewsOutput;
      const modelName = data.detectionMethod === 'custom' ? "Your Custom Model" : "Genkit AI Model";

      if (data.detectionMethod === 'custom') {
        const input: DetectFakeNewsInput = { articleText: data.articleText };
        result = await detectFakeNews(input);
      } else {
        const input: LlmDetectFakeNewsInput = { articleText: data.articleText };
        result = await llmDetectFakeNews(input);
      }
      
      if (result.label && result.confidence !== undefined) {
         const newDetection: DetectedArticle = {
          type: 'detected',
          text: data.articleText,
          result: {
            label: result.label,
            confidence: result.confidence,
          },
          timestamp: new Date().toISOString(),
          userId: user?.uid,
          detectionMethod: data.detectionMethod, // Store which method was used
        };
        setDetectionResult(newDetection);
        toast({
          title: "Detection Complete!",
          description: `Using ${modelName}, the article is predicted as ${result.label.toLowerCase()} with ${result.confidence.toFixed(1)}% confidence.`,
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
            Paste a news article below. Choose your preferred AI model to analyze its content and predict whether it's likely real or fake.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="detectionMethod"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base">Choose Detection Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col sm:flex-row gap-4"
                        disabled={isLoading || isSaving}
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-md flex-1 hover:bg-accent/50 has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:text-accent-foreground transition-colors">
                          <FormControl>
                            <RadioGroupItem value="custom" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex items-center w-full">
                            <Database className="mr-2 h-5 w-5 text-primary/80"/> Your Custom Model (Render API)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-md flex-1 hover:bg-accent/50 has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:text-accent-foreground transition-colors">
                          <FormControl>
                            <RadioGroupItem value="llm" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex items-center w-full">
                            <Brain className="mr-2 h-5 w-5 text-primary/80" /> Genkit AI Model (LLM-based)
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            <CardDescription>
                Our AI ({selectedMethodForDisplay === 'custom' ? 'Your Custom Model' : 'Genkit AI Model'}) is processing the text. This may take a few moments.
            </CardDescription>
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
          // You could pass the detection method to ArticleCard if you want to display it there
          // detectionMethodUsed={selectedMethodForDisplay} 
        />
      )}
    </div>
  );
}
