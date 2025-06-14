
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
import { Loader2, Wand2, Save, AlertTriangle, Image as ImageIconLucide, Lightbulb, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';


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
  const [isExportingPdf, setIsExportingPdf] = useState(false);


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
    setImageGenerationMessage("Generating article text and title...");

    try {
      // 1. Generate Article Text & Title
      const articleInput: GenerateFakeNewsArticleInput = {
        topic: data.topic,
        category: data.category,
        tone: data.tone,
      };
      const articleResult: GenerateFakeNewsArticleOutput = await generateFakeNewsArticle(articleInput);

      if (!articleResult.article || !articleResult.title) {
        throw new Error("AI did not return both an article title and text.");
      }
      
      const tempArticleDetails: GeneratedArticle = {
        type: 'generated',
        title: articleResult.title, 
        content: articleResult.article,
        topic: data.topic,
        category: data.category,
        tone: data.tone,
        timestamp: new Date().toISOString(),
        userId: user?.uid,
      };
      setGeneratedArticle(tempArticleDetails);

      toast({
        title: "Article Text & Title Generated!",
        description: "Now automatically creating a header image...",
      });
      setImageGenerationMessage("Generating header image...");

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
      
      setGeneratedArticle(prev => prev ? { ...prev, imageUrl: finalImageUrl } : null);

    } catch (error: any) { 
      console.error("Error generating article content/title:", error);
      toast({
        title: "Article Generation Failed",
        description: error.message || "Could not generate the article. Please try again.",
        variant: "destructive",
      });
      setImageGenerationMessage(null);
    } finally {
      setIsLoadingArticle(false);
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

  const handleExportMarkdown = () => {
    if (!generatedArticle) return;
    const { title, content, topic, category, tone, timestamp, imageUrl } = generatedArticle;
    const formattedTimestamp = timestamp ? format(new Date(timestamp), "MMMM d, yyyy, h:mm a") : 'N/A';
    const safeTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) || 'article';
    const filename = `veritas-ai-generated-${safeTopic}.md`;

    let markdownContent = `
# ${title}
${imageUrl ? `\n![Header Image for ${title.replace(/[^a-zA-Z0-9 ]/g, "")}](${imageUrl})\n` : ''}
${content}

---
**Details:**
- **Type:** Generated Article
- **Topic:** ${topic}
- **Category:** ${category}
- **Tone:** ${tone}
- **Generated on:** ${formattedTimestamp}
- *Exported from Veritas AI*
`;
    markdownContent = markdownContent.trim().replace(/\n\s*\n\s*\n/g, '\n\n');
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: `${filename} has been downloaded.` });
  };

  const handleExportPdf = async () => {
    if (!generatedArticle) return;
    setIsExportingPdf(true);
    toast({ title: "Generating PDF...", description: "This may take a few moments." });

    const { title, content, topic, category, tone, timestamp, imageUrl } = generatedArticle;
    const formattedTimestamp = timestamp ? format(new Date(timestamp), "MMMM d, yyyy, h:mm a") : 'N/A';
    const safeTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) || 'article';
    const filename = `veritas-ai-generated-${safeTopic}.pdf`;

    const pdfElement = document.createElement('div');
    pdfElement.style.position = 'absolute';
    pdfElement.style.left = '-9999px';
    pdfElement.style.width = '800px';
    pdfElement.style.padding = '20px';
    pdfElement.style.fontFamily = 'Arial, sans-serif';
    pdfElement.style.fontSize = '12px';
    pdfElement.style.color = '#333';
    pdfElement.style.backgroundColor = '#fff';

    let htmlContent = `
      <h1 style="font-size: 24px; margin-bottom: 10px; color: #1a73e8;">${title}</h1>
      <p style="font-size: 10px; color: #777; margin-bottom: 15px;">Generated on: ${formattedTimestamp} by Veritas AI</p>
    `;
    if (imageUrl) {
      htmlContent += `<img src="${imageUrl}" alt="Article Image" style="max-width: 100%; height: auto; margin-bottom: 15px; border: 1px solid #eee;" crossOrigin="anonymous" />`;
    }
    htmlContent += `<div style="white-space: pre-wrap; line-height: 1.6;">${content.replace(/\n/g, '<br />')}</div>`;
    htmlContent += `
      <hr style="margin: 20px 0; border-top: 1px solid #ccc;"/>
      <p style="font-size: 11px;"><strong>Topic:</strong> ${topic}</p>
      <p style="font-size: 11px;"><strong>Category:</strong> ${category}</p>
      <p style="font-size: 11px;"><strong>Tone:</strong> ${tone}</p>
    `;
    
    pdfElement.innerHTML = htmlContent;
    document.body.appendChild(pdfElement);
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const canvas = await html2canvas(pdfElement, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const imgWidthInPdf = pdfWidth - 40;
      let position = 20;
      let remainingCanvasHeight = canvasHeight;
      let pageCanvasStartY = 0;

      while (remainingCanvasHeight > 0) {
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        if (!pageCtx) throw new Error("Could not get 2D context for page canvas");
        const maxContentHeightOnPage = (pdfHeight - 40) * (canvasWidth / imgWidthInPdf);
        const segmentHeightOnCanvas = Math.min(remainingCanvasHeight, maxContentHeightOnPage);
        pageCanvas.width = canvasWidth;
        pageCanvas.height = segmentHeightOnCanvas;
        pageCtx.drawImage(canvas, 0, pageCanvasStartY, canvasWidth, segmentHeightOnCanvas, 0, 0, canvasWidth, segmentHeightOnCanvas);
        const pageImgData = pageCanvas.toDataURL('image/png');
        const segmentImgHeightInPdf = imgWidthInPdf * (segmentHeightOnCanvas / canvasWidth);
        if (position !== 20) {
          pdf.addPage();
          position = 20;
        }
        pdf.addImage(pageImgData, 'PNG', 20, position, imgWidthInPdf, segmentImgHeightInPdf);
        remainingCanvasHeight -= segmentHeightOnCanvas;
        pageCanvasStartY += segmentHeightOnCanvas;
        if (remainingCanvasHeight > 0) position = pdfHeight;
      }
      pdf.save(filename);
      toast({ title: "PDF Export Successful!", description: `${filename} has been downloaded.` });
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({ title: "PDF Export Failed", description: error.message || "Could not generate PDF.", variant: "destructive" });
    } finally {
      document.body.removeChild(pdfElement);
      setIsExportingPdf(false);
    }
  };


  return (
    <div className="space-y-8">
      <Card className="border-primary/30 bg-transparent">
        <CardHeader className="flex flex-row items-start gap-4">
          <Lightbulb className="h-8 w-8 text-primary dark:text-primary-foreground mt-1 shrink-0" />
          <div>
            <CardTitle className="font-headline text-xl">Understanding AI Generation & Ethical Use</CardTitle>
            <CardDescription className="mt-2 space-y-2 dark:text-card-foreground">
                <p>
                AI-generated content (text and images) is for illustrative or educational purposes. Always apply critical thinking when reviewing or using AI-created materials.
                </p>
                <div className="flex items-start gap-2 text-sm text-destructive/90 dark:text-destructive/80 border-t border-destructive/20 pt-3 mt-3">
                  <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                  <p>
                  <strong>Ethical Use Reminder:</strong> Use these generation tools responsibly. Do not create or spread misinformation. Veritas AI is intended for learning and understanding AI capabilities.
                  </p>
                </div>
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-headline flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-primary"/>
            <span className="mr-1">Fake News Generator</span>
            <ImageIconLucide className="h-6 w-6 text-primary opacity-80"/>
          </CardTitle>
          <CardDescription>
            Craft an AI-generated news article and title. A header image will be automatically generated and displayed with the article.
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
                      <Input placeholder="e.g., Discovery of a new planet, A celebrity's unusual pet" {...field} disabled={isLoadingArticle || isSaving || isExportingPdf} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingArticle || isSaving || isExportingPdf}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingArticle || isSaving || isExportingPdf}>
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
              <Button type="submit" className="w-full md:w-auto" disabled={isLoadingArticle || isSaving || isExportingPdf}>
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

          <ArticleCard article={generatedArticle} />
          
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-start">
            <Button 
              onClick={handleSaveArticle} 
              disabled={isSaving || !!generatedArticle.id || isLoadingArticle || isExportingPdf} 
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
            <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto" disabled={isExportingPdf || isLoadingArticle || isSaving}>
                {isExportingPdf ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting PDF...
                    </>
                ) : (
                    <>
                        <FileText className="mr-2 h-4 w-4" /> Export PDF
                    </>
                )}
            </Button>
            <Button onClick={handleExportMarkdown} variant="outline" className="w-full sm:w-auto" disabled={isExportingPdf || isLoadingArticle || isSaving}>
                <Download className="mr-2 h-4 w-4" /> Export Markdown
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
