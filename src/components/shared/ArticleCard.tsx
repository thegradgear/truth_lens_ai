
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GeneratedArticle, DetectedArticle, Article, FactCheckResult } from '@/types';
import { Bot, CheckCircle, AlertTriangle, Clock, Tag, Type, Save, Loader2, Database, Brain, Eye, MessageSquareQuote, ExternalLink, ListChecks, FileText, Download, Trash2, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger as DropdownMenuTriggerPrimitive,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import { deleteArticle as deleteArticleFromDb } from '@/lib/firebase';


const MAX_CONTENT_LINES = 6;

// Helper function to process justification for summary display
const getJustificationSummary = (fullJustification?: string): string[] => {
  if (!fullJustification) return [];
  return fullJustification
    .split('\n')
    .map(item => item.trim().replace(/^[-*]\s*/, '').trim())
    .filter(s => s.length > 0)
    .slice(0, 3);
};

export interface ArticleCardProps {
  article: Article;
  onSave?: (articleToSave: Article) => Promise<void>;
  showSaveButton?: boolean;
  isSaving?: boolean;
  onDelete?: (articleId: string) => Promise<void>;
}

export function ArticleCard({ article, onSave, showSaveButton = false, isSaving = false, onDelete }: ArticleCardProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReadMoreButton, setShowReadMoreButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  const isGenerated = article.type === 'generated';
  const articleData = article as GeneratedArticle | DetectedArticle;

  const fullText = isGenerated ? (articleData as GeneratedArticle).content : (articleData as DetectedArticle).text;

  useEffect(() => {
    if (contentRef.current) {
      const timer = setTimeout(() => {
        if (contentRef.current) {
          setShowReadMoreButton(contentRef.current.scrollHeight > contentRef.current.clientHeight);
        }
      }, 100); // Debounce slightly for layout to settle
      return () => clearTimeout(timer);
    }
  }, [fullText, isModalOpen]); // isModalOpen is included because line-clamp changes clientHeight

  const handleSaveClick = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (onSave) {
      try {
        await onSave(article);
      } catch (error) {
        console.error("Error during onSave callback:", error);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user?.uid || !article.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await deleteArticleFromDb(user.uid, article.id);
      await onDelete(article.id);
      toast({
        title: "Article Removed",
        description: "The article has been successfully removed from your history.",
      });
    } catch (error: any) {
      toast({
        title: "Removal Failed",
        description: error.message || "Could not remove the article.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteAlertOpen(false);
    }
  };

  const handleExportMarkdown = () => {
    let markdownContent = "";
    let filename = "veritas-ai-article.md";
    const formattedTimestamp = articleData.timestamp ? format(new Date(articleData.timestamp), "MMMM d, yyyy, h:mm a") : 'N/A';

    if (article.type === 'generated') {
      const genArticle = articleData as GeneratedArticle;
      const safeTopic = genArticle.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) || 'article';
      filename = `veritas-ai-generated-${safeTopic}.md`;
      markdownContent = `
# ${genArticle.title}
${genArticle.imageUrl ? `\n![Header Image for ${genArticle.title.replace(/[^a-zA-Z0-9 ]/g, "")}](${genArticle.imageUrl})\n` : ''}
${genArticle.content}

---
**Details:**
- **Type:** Generated Article
- **Topic:** ${genArticle.topic}
- **Category:** ${genArticle.category}
- **Tone:** ${genArticle.tone}
- **Generated on:** ${formattedTimestamp}
- *Exported from Veritas AI*
`;
    } else if (article.type === 'detected') {
      const detArticle = articleData as DetectedArticle;
      const simpleTitle = detArticle.text.substring(0, 30).replace(/[^a-z0-9]+/g, '-').toLowerCase() || 'analysis';
      filename = `veritas-ai-detection-report-${simpleTitle}.md`;

      let justificationMd = "";
      if (detArticle.justification) {
        justificationMd = `\n- **AI Justification:**\n`;
        detArticle.justification.split('\n').forEach(line => {
          const cleanedLine = line.trim().replace(/^[-*]\s*/, '').trim();
          if (cleanedLine) {
            justificationMd += `  - ${cleanedLine}\n`;
          }
        });
      }

      let factChecksMd = "";
      if (detArticle.factChecks && detArticle.factChecks.length > 0) {
        factChecksMd = "\n- **Fact-Checks (Mock Data):**\n";
        detArticle.factChecks.forEach(fc => {
          factChecksMd += `  - **Source:** ${fc.source}\n`;
          factChecksMd += `    - **Claim Reviewed:** ${fc.claimReviewed.replace(/\n/g, ' ')}\n`;
          factChecksMd += `    - **Rating:** ${fc.rating}\n`;
          if (fc.url) {
            factChecksMd += `    - **Link:** [View Source](${fc.url})\n`;
          }
        });
      }

      markdownContent = `
# Analysis Report: Detected Article

${detArticle.text}

---
**Detection Analysis:**
- **Type:** Detected Article
- **Prediction:** ${detArticle.result.label} (Confidence: ${detArticle.result.confidence.toFixed(1)}%)
- **Detection Method:** ${detArticle.detectionMethod === 'custom' ? 'Custom Model' : 'Genkit AI Model'}
${justificationMd.trim()}
${factChecksMd.trim()}
- **Analyzed on:** ${formattedTimestamp}
- *Exported from Veritas AI*
`;
    }

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

    toast({
      title: "Export Successful",
      description: `${filename} has been downloaded.`,
    });
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    toast({
      title: "Generating PDF...",
      description: "This may take a few moments.",
    });

    const formattedTimestamp = articleData.timestamp ? format(new Date(articleData.timestamp), "MMMM d, yyyy, h:mm a") : 'N/A';
    let filename = "veritas-ai-export.pdf";

    const pdfElement = document.createElement('div');
    pdfElement.style.position = 'absolute';
    pdfElement.style.left = '-9999px';
    pdfElement.style.width = '800px';
    pdfElement.style.padding = '20px';
    pdfElement.style.fontFamily = 'Arial, sans-serif';
    pdfElement.style.fontSize = '12px';
    pdfElement.style.color = '#333';
    pdfElement.style.backgroundColor = '#fff';

    let htmlContent = '';

    if (article.type === 'generated') {
      const genArticle = articleData as GeneratedArticle;
      const safeTopic = genArticle.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) || 'article';
      filename = `veritas-ai-generated-${safeTopic}.pdf`;
      htmlContent = `
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #1a73e8;">${genArticle.title}</h1>
        <p style="font-size: 10px; color: #777; margin-bottom: 15px;">Generated on: ${formattedTimestamp} by Veritas AI</p>
      `;
      if (genArticle.imageUrl) {
        htmlContent += `<img src="${genArticle.imageUrl}" alt="Article Image" style="max-width: 100%; height: auto; margin-bottom: 15px; border: 1px solid #eee;" crossOrigin="anonymous" />`;
      }
      htmlContent += `<div style="white-space: pre-wrap; line-height: 1.6;">${genArticle.content.replace(/\n/g, '<br />')}</div>`;
      htmlContent += `
        <hr style="margin: 20px 0; border-top: 1px solid #ccc;"/>
        <p style="font-size: 11px;"><strong>Topic:</strong> ${genArticle.topic}</p>
        <p style="font-size: 11px;"><strong>Category:</strong> ${genArticle.category}</p>
        <p style="font-size: 11px;"><strong>Tone:</strong> ${genArticle.tone}</p>
      `;
    } else if (article.type === 'detected') {
      const detArticle = articleData as DetectedArticle;
      const simpleTitle = detArticle.text.substring(0, 30).replace(/[^a-z0-9]+/g, '-').toLowerCase() || 'analysis';
      filename = `veritas-ai-detection-report-${simpleTitle}.pdf`;
      htmlContent = `
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #1a73e8;">Analysis Report</h1>
        <p style="font-size: 10px; color: #777; margin-bottom: 15px;">Analyzed on: ${formattedTimestamp} by Veritas AI</p>
        <h2 style="font-size: 16px; margin-top: 20px; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Original Article Text:</h2>
        <div style="white-space: pre-wrap; line-height: 1.6; margin-bottom: 20px; padding: 10px; border: 1px solid #f0f0f0; background-color: #f9f9f9;">${detArticle.text.replace(/\n/g, '<br />')}</div>
        <hr style="margin: 20px 0; border-top: 1px solid #ccc;"/>
        <h2 style="font-size: 16px; margin-top: 20px; margin-bottom: 10px;">Detection Analysis:</h2>
        <p style="font-size: 12px;"><strong>Prediction:</strong> <span style="font-weight: bold; color: ${detArticle.result.label === 'Fake' ? '#d93025' : '#1e8e3e'};">${detArticle.result.label}</span> (Confidence: ${detArticle.result.confidence.toFixed(1)}%)</p>
        <p style="font-size: 12px;"><strong>Detection Method:</strong> ${detArticle.detectionMethod === 'custom' ? 'Custom Model' : 'Genkit AI Model'}</p>
      `;
      if (detArticle.justification) {
        htmlContent += `<h3 style="font-size: 14px; margin-top: 15px; margin-bottom: 5px;">AI Justification:</h3><ul style="list-style-type: disc; padding-left: 20px; font-size: 12px; line-height: 1.5;">`;
        detArticle.justification.split('\n').forEach(line => {
          const cleanedLine = line.trim().replace(/^[-*]\s*/, '').trim();
          if (cleanedLine) htmlContent += `<li>${cleanedLine}</li>`;
        });
        htmlContent += `</ul>`;
      }
      if (detArticle.factChecks && detArticle.factChecks.length > 0) {
        htmlContent += `<h3 style="font-size: 14px; margin-top: 15px; margin-bottom: 5px;">Fact-Checks (Mock Data):</h3>`;
        detArticle.factChecks.forEach(fc => {
          htmlContent += `
            <div style="font-size: 12px; border: 1px solid #e0e0e0; padding: 8px; margin-bottom: 8px; border-radius: 4px;">
              <p><strong>Source:</strong> ${fc.source}</p>
              <p><strong>Claim Reviewed:</strong> ${fc.claimReviewed}</p>
              <p><strong>Rating:</strong> ${fc.rating}</p>
              ${fc.url ? `<p><strong>Link:</strong> <a href="${fc.url}" target="_blank" style="color: #1a73e8; text-decoration: none;">View Source</a></p>` : ''}
            </div>
          `;
        });
      }
    }

    pdfElement.innerHTML = htmlContent;
    document.body.appendChild(pdfElement);

    await new Promise(resolve => setTimeout(resolve, 1000));


    try {
      const canvas = await html2canvas(pdfElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const ratio = canvasWidth / canvasHeight;
      const imgWidthInPdf = pdfWidth - 40;
      const imgHeightInPdf = imgWidthInPdf / ratio;

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

        if (remainingCanvasHeight > 0) {
           position = pdfHeight;
        }
      }

      pdf.save(filename);
      toast({
        title: "PDF Export Successful!",
        description: `${filename} has been downloaded.`,
      });
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "PDF Export Failed",
        description: error.message || "Could not generate PDF. Check console for details.",
        variant: "destructive",
      });
    } finally {
      document.body.removeChild(pdfElement);
      setIsExportingPdf(false);
    }
  };

  const detectedArticleData = article.type === 'detected' ? article as DetectedArticle : null;
  const resultLabel = detectedArticleData?.result.label;
  const confidenceScore = detectedArticleData ? (detectedArticleData.result.confidence || 0).toFixed(1) : '';
  const justification = detectedArticleData?.justification;
  const factChecks = detectedArticleData?.factChecks;
  
  const aiGeneratedTitle = isGenerated ? (articleData as GeneratedArticle).title : null;
  const modalTitle = aiGeneratedTitle || 'Full Article Text & Analysis';


  const justificationSummaryPoints = useMemo(() => getJustificationSummary(justification), [justification]);

  const ActionMenu = () => (
    article.id && onDelete && user?.uid ? (
      <DropdownMenu>
        <DropdownMenuTriggerPrimitive asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Article Options</span>
          </Button>
        </DropdownMenuTriggerPrimitive>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportMarkdown} disabled={isExportingPdf || isDeleting}>
            <Download className="mr-2 h-4 w-4" />
            Export Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPdf} disabled={isExportingPdf || isDeleting}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteAlertOpen(true)}
            disabled={isDeleting}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove from Saved
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null
  );

  return (
    <Card className="shadow-lg w-full flex flex-col overflow-hidden">
      {isGenerated && (articleData as GeneratedArticle).imageUrl && (
        <div
          className="relative aspect-video w-full rounded-t-lg overflow-hidden border-b"
        >
          <Image
            src={(articleData as GeneratedArticle).imageUrl!}
            alt={`Header for article titled: ${aiGeneratedTitle ? aiGeneratedTitle.replace(/[^a-zA-Z0-9 ]/g, "") : 'Generated Article'}`}
            layout="fill"
            objectFit="cover"
          />
        </div>
      )}

      {isGenerated ? (
        <CardHeader className='flex flex-row items-start justify-between'>
            <div className="flex-grow">
                <CardTitle className="font-headline text-xl flex items-center">
                    <Bot className="mr-2 h-6 w-6 text-primary" />
                    {aiGeneratedTitle || 'AI Generated Article'}
                </CardTitle>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="flex items-center"><Tag className="mr-1 h-3 w-3" /> Topic: {(articleData as GeneratedArticle).topic}</span>
                    <span className="flex items-center"><Type className="mr-1 h-3 w-3" /> Category: {(articleData as GeneratedArticle).category}</span>
                    <span className="flex items-center"><MessageSquareQuote className="mr-1 h-3 w-3" /> Tone: {(articleData as GeneratedArticle).tone}</span>
                </div>
            </div>
            <div className="ml-2 shrink-0">
                <ActionMenu />
            </div>
        </CardHeader>
      ) : (
        <CardHeader className='flex flex-row items-start justify-between gap-2'>
            <div className="flex-grow">
                <CardTitle className="font-headline text-xl flex items-center">
                {resultLabel === 'Real' ?
                    <CheckCircle className="mr-2 h-6 w-6 text-green-500" /> :
                    <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
                }
                Detection Result
                </CardTitle>
                <CardDescription>
                    Confidence: {confidenceScore}%
                </CardDescription>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant={resultLabel === 'Real' ? 'success' : 'destructive'}>
                         {resultLabel}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>This article is predicted as {resultLabel} by the AI model.</p>
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <ActionMenu />
            </div>
        </CardHeader>
      )}

      <CardContent className="flex-grow">
        <div
          ref={contentRef}
          className={cn(
            'text-sm text-foreground m-0',
            isModalOpen ? '' : `line-clamp-${MAX_CONTENT_LINES}`
          )}
        >
          <p className="whitespace-pre-wrap">
            {fullText}
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          {showReadMoreButton && !isModalOpen && (
            <DialogTrigger asChild>
              <Button variant="link" size="sm" className="p-0 h-auto mt-2 text-primary hover:underline">
                  <Eye className="mr-1 h-4 w-4"/>Read More / View Analysis
              </Button>
            </DialogTrigger>
          )}
          {isModalOpen && (
            <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl w-[90vw] max-h-[85vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{modalTitle}</DialogTitle>
                {isGenerated && (
                  <DialogDescription>
                    Topic: {(articleData as GeneratedArticle).topic} | Category: {(articleData as GeneratedArticle).category} | Tone: {(articleData as GeneratedArticle).tone}
                  </DialogDescription>
                )}
                 {!isGenerated && (
                   <DialogDescription>
                      AI-Powered Article Analysis. {detectedArticleData?.detectionMethod === 'llm' ? "LLM-based insights." : "Custom model result."}
                  </DialogDescription>
                )}
              </DialogHeader>
              <ScrollArea className="flex-1 min-h-0 rounded-md border p-4">
                <p className="whitespace-pre-wrap text-sm">
                  {fullText}
                </p>
                {!isGenerated && justification && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-md mb-2 flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>AI Justification:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 pl-2 text-muted-foreground">
                      {justification.split('\n').map((item, index) => {
                        const cleanedItem = item.trim().replace(/^[-*]\s*/, '');
                        return cleanedItem.length > 0 && <li key={index}>{cleanedItem}</li>;
                      })}
                    </ul>
                  </div>
                )}
                {!isGenerated && factChecks && factChecks.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-md mb-2 flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>External Fact-Checks (Mock Data):</h4>
                    <div className="space-y-3">
                      {factChecks.map((fc, index) => (
                        <div key={index} className="p-3 border rounded-md bg-secondary/30">
                          <p className="text-sm font-medium">{fc.claimReviewed}</p>
                          <p className="text-xs text-muted-foreground">Source: {fc.source} - Rating: <span className="font-semibold">{fc.rating}</span></p>
                          {fc.url && (
                            <a href={fc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center mt-1">
                              View Source <ExternalLink className="ml-1 h-3 w-3"/>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
              <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>

        {!isModalOpen && !showReadMoreButton && !isGenerated && justificationSummaryPoints.length > 0 && (
          <>
            <Separator className="my-3" />
            <div>
                <h4 className="font-semibold text-sm mb-1 flex items-center"><FileText className="mr-2 h-4 w-4 text-primary/80"/>AI Justification (Summary):</h4>
                <div className="space-y-0.5">
                    {justificationSummaryPoints.map((point, index) => (
                        <p key={index} className="text-xs text-muted-foreground flex items-start">
                           <span className="mr-1.5 mt-0.5">&bull;</span><span className="flex-1">{point}</span>
                        </p>
                    ))}
                </div>
            </div>
          </>
        )}
         {!isModalOpen && !showReadMoreButton && !isGenerated && factChecks && factChecks.length > 0 && (
           <>
            <Separator className="my-3" />
            <div>
                <h4 className="font-semibold text-sm mb-1 flex items-center"><ListChecks className="mr-2 h-4 w-4 text-primary/80"/>Fact-Checks (Mock Summary):</h4>
                 <p className="text-xs text-muted-foreground">
                    {factChecks.length} external source(s) reviewed. Click "Read More" for details.
                </p>
            </div>
           </>
        )}

      </CardContent>
      <CardFooter className="flex flex-col xs:flex-row justify-between items-start xs:items-center border-t pt-4 gap-2">
        <div className="flex flex-col xs:flex-row xs:flex-wrap xs:items-center gap-x-3 gap-y-1 text-xs text-muted-foreground w-full">
          <div className="flex items-center shrink-0">
            <Clock className="mr-1 h-3 w-3" />
            {articleData.timestamp ? format(new Date(articleData.timestamp), "MMM d, yyyy, h:mm a") : 'Processing date...'}
          </div>
          {detectedArticleData?.detectionMethod && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center mt-1 xs:mt-0 cursor-default">
                    {detectedArticleData.detectionMethod === 'custom' ? (
                      <Database className="mr-1 h-3 w-3 text-primary/80 shrink-0" />
                    ) : (
                      <Brain className="mr-1 h-3 w-3 text-primary/80 shrink-0" />
                    )}
                    <span className="truncate">Model: {detectedArticleData.detectionMethod === 'custom' ? 'Custom' : 'Genkit AI'}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {detectedArticleData.detectionMethod === 'custom'
                      ? 'Detected using your deployed Render API model.'
                      : 'Detected using a Genkit-powered Large Language Model.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex flex-col xs:flex-row gap-2 w-full xs:w-auto mt-2 xs:mt-0 shrink-0">
            {showSaveButton && onSave && (
            <Button onClick={(e) => handleSaveClick(e)} size="sm" variant="outline" disabled={isSaving} className="w-full xs:w-auto">
                {isSaving ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                ) : (
                    <>
                        <Save className="mr-2 h-4 w-4" /> Save
                    </>
                )}
            </Button>
            )}

            {!(article.id && onDelete && user?.uid) && (
              <>
                <Button onClick={handleExportPdf} size="sm" variant="outline" className="w-full xs:w-auto" disabled={isExportingPdf}>
                    {isExportingPdf ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...
                        </>
                    ) : (
                        <>
                            <FileText className="mr-2 h-4 w-4" /> Export PDF
                        </>
                    )}
                </Button>
                <Button onClick={handleExportMarkdown} size="sm" variant="outline" className="w-full xs:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Export Markdown
                </Button>
              </>
            )}
        </div>
      </CardFooter>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the article from your saved history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className={buttonVariants({ variant: "destructive" })}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Removing...</> : "Yes, Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}

// const buttonVariants = ({ variant }: { variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined }) => {
//   if (variant === "destructive") return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
//   return "bg-primary text-primary-foreground hover:bg-primary/90";
// };

