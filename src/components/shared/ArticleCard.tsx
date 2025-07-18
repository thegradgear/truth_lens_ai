
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button'; // Ensured buttonVariants is imported
import type { GeneratedArticle, DetectedArticle, Article } from '@/types';
import { Bot, CheckCircle, AlertTriangle, Clock, Tag, Type, Save, Loader2, Database, Brain, MessageSquareQuote, ExternalLink, ListChecks, FileText, Download, Trash2, MoreVertical, Maximize } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionDetail,
  DialogHeader as DialogHeaderDetail,
  DialogTitle as DialogTitleDetail,
  DialogFooter as DialogFooterDetail,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import { deleteArticle as deleteArticleFromDb } from '@/lib/firebase';
import { cn } from "@/lib/utils";


export interface ArticleCardProps {
  article: Article;
  onDelete?: (articleId: string) => Promise<void>;
}

export function ArticleCard({ article, onDelete }: ArticleCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const isGenerated = article.type === 'generated';
  const articleData = article as GeneratedArticle | DetectedArticle;

  const fullText = isGenerated ? (articleData as GeneratedArticle).content : (articleData as DetectedArticle).text;

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
    let filename = "truth-lens-ai-article.md";
    const formattedTimestamp = articleData.timestamp ? format(new Date(articleData.timestamp), "MMMM d, yyyy, h:mm a") : 'N/A';

    if (article.type === 'generated') {
      const genArticle = articleData as GeneratedArticle;
      const safeTopic = genArticle.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) || 'article';
      filename = `truth-lens-ai-generated-${safeTopic}.md`;
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
- *Exported from Truth Lens AI*
`;
    } else if (article.type === 'detected') {
      const detArticle = articleData as DetectedArticle;
      const titleForFile = detArticle.title ? detArticle.title.substring(0,30).replace(/[^a-z0-9]+/g, '-').toLowerCase() : 'analysis';
      filename = `truth-lens-ai-detection-${titleForFile}.md`;

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
# ${detArticle.title || 'Analysis Report: Detected Article'}

**Full Article Text Analyzed:**
${detArticle.text}

---
**Detection Analysis:**
- **Type:** Detected Article
- **Prediction:** ${detArticle.result.label} (Confidence: ${detArticle.result.confidence.toFixed(1)}%)
- **Detection Method:** ${detArticle.detectionMethod === 'custom' ? 'Truth Lens Model' : 'Genkit AI Model'}
${justificationMd.trim()}
${factChecksMd.trim()}
- **Analyzed on:** ${formattedTimestamp}
- *Exported from Truth Lens AI*
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
    let filename = "truth-lens-ai-export.pdf";

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
      filename = `truth-lens-ai-generated-${safeTopic}.pdf`;
      htmlContent = `
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #1a73e8;">${genArticle.title}</h1>
        <p style="font-size: 10px; color: #777; margin-bottom: 15px;">Generated on: ${formattedTimestamp} by Truth Lens AI</p>
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
      const titleForFile = detArticle.title ? detArticle.title.substring(0,30).replace(/[^a-z0-9]+/g, '-').toLowerCase() : 'analysis';
      filename = `truth-lens-ai-detection-${titleForFile}.pdf`;
      htmlContent = `
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #1a73e8;">${detArticle.title || 'Analysis Report'}</h1>
        <p style="font-size: 10px; color: #777; margin-bottom: 15px;">Analyzed on: ${formattedTimestamp} by Truth Lens AI</p>
        <h2 style="font-size: 16px; margin-top: 20px; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Original Article Text:</h2>
        <div style="white-space: pre-wrap; line-height: 1.6; margin-bottom: 20px; padding: 10px; border: 1px solid #f0f0f0; background-color: #f9f9f9;">${detArticle.text.replace(/\n/g, '<br />')}</div>
        <hr style="margin: 20px 0; border-top: 1px solid #ccc;"/>
        <h2 style="font-size: 16px; margin-top: 20px; margin-bottom: 10px;">Detection Analysis:</h2>
        <p style="font-size: 12px;"><strong>Prediction:</strong> <span style="font-weight: bold; color: ${detArticle.result.label === 'Fake' ? '#d93025' : '#1e8e3e'};">${detArticle.result.label}</span> (Confidence: ${detArticle.result.confidence.toFixed(1)}%)</p>
        <p style="font-size: 12px;"><strong>Detection Method:</strong> ${detArticle.detectionMethod === 'custom' ? 'Truth Lens Model' : 'Genkit AI Model'}</p>
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
              ${fc.url ? `<p><strong>Link:</strong> <a href="${fc.url}" target="_blank" rel="noopener noreferrer" style="color: #1a73e8; text-decoration: none;">View Source</a></p>` : ''}
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
      const imgWidthInPdf = pdfWidth - 40;

      let position = 20;
      let remainingCanvasHeight = canvasHeight;
      let pageCanvasStartY = 0;

      while (remainingCanvasHeight > 0) {
        const maxContentHeightOnPage = (pdfHeight - 40) * (canvasWidth / imgWidthInPdf);
        const segmentHeightOnCanvas = Math.min(remainingCanvasHeight, maxContentHeightOnPage);

        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        if (!pageCtx) throw new Error("Could not get 2D context for page canvas");

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

  const cardTitleText = isGenerated
    ? (articleData as GeneratedArticle).title
    : (detectedArticleData?.title || "Analysis Report");

  const ActionMenu = () => (
    article.id && onDelete && user?.uid ? (
      <DropdownMenu>
        <DropdownMenuTriggerPrimitive asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
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
    <>
    <Card className="shadow-lg w-full flex flex-col overflow-hidden">
      {isGenerated && (articleData as GeneratedArticle).imageUrl && (
        <div
          className="relative aspect-video w-full rounded-t-lg overflow-hidden border-b"
        >
          <Image
            src={(articleData as GeneratedArticle).imageUrl!}
            alt={`Header for article titled: ${cardTitleText.replace(/[^a-zA-Z0-9 ]/g, "")}`}
            layout="fill"
            objectFit="cover"
          />
        </div>
      )}

      <CardHeader>
         <div className="flex items-start justify-between w-full gap-2">
            <CardTitle className="font-headline text-xl flex items-center flex-grow min-w-0">
              {isGenerated ? (
                <Bot className="mr-2 h-6 w-6 text-primary shrink-0" />
              ) : (
                resultLabel === 'Real' ?
                <CheckCircle className="mr-2 h-6 w-6 text-green-500 shrink-0" /> :
                <AlertTriangle className="mr-2 h-6 w-6 text-destructive shrink-0" />
              )}
              <span className="truncate">{cardTitleText}</span>
            </CardTitle>
            
            <div className="flex items-center space-x-1 shrink-0">
              {!isGenerated && detectedArticleData && (
                  <TooltipProvider delayDuration={0}>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Badge
                                  variant={resultLabel === 'Real' ? 'success' : 'destructive'}
                                  className="whitespace-nowrap"
                              >
                                  {resultLabel}
                              </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>This article is predicted as {resultLabel} by the AI model.</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              )}
              {article.id && onDelete && user?.uid && <ActionMenu />}
            </div>
        </div>
        {!isGenerated && detectedArticleData && (
          <CardDescription className="mt-1">
            Confidence: {confidenceScore}%
          </CardDescription>
        )}
        {isGenerated && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <span className="flex items-center"><Tag className="mr-1 h-3 w-3" /> Topic: {(articleData as GeneratedArticle).topic}</span>
            <span className="flex items-center"><Type className="mr-1 h-3 w-3" /> Category: {(articleData as GeneratedArticle).category}</span>
            <span className="flex items-center"><MessageSquareQuote className="mr-1 h-3 w-3" /> Tone: {(articleData as GeneratedArticle).tone}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-grow space-y-3">
        <div className="text-sm text-foreground m-0">
            <p className="whitespace-pre-wrap line-clamp-4">
                {fullText}
            </p>
        </div>

        {!isGenerated && justification && (
          <>
            <Separator />
            <div>
                <h4 className="font-semibold text-sm mb-1 flex items-center"><FileText className="mr-2 h-4 w-4 text-primary"/>AI Justification:</h4>
                <ul className="list-disc list-inside text-xs space-y-1 pl-2 text-muted-foreground line-clamp-3">
                {justification.split('\n').map((item, index) => {
                    const cleanedItem = item.trim().replace(/^[-*]\s*/, '');
                    return cleanedItem.length > 0 && <li key={index}>{cleanedItem}</li>;
                })}
                </ul>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t pt-3 pb-3 gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center shrink-0">
            <Clock className="mr-1 h-3 w-3" />
            {articleData.timestamp ? format(new Date(articleData.timestamp), "MMM d, yy, h:mm a") : 'Processing date...'}
          </div>
          {detectedArticleData?.detectionMethod && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center cursor-default">
                    {detectedArticleData.detectionMethod === 'custom' ? (
                      <Database className="mr-1 h-3 w-3 text-primary/80 shrink-0" />
                    ) : (
                      <Brain className="mr-1 h-3 w-3 text-primary/80 shrink-0" />
                    )}
                    <span className="truncate">Model: {detectedArticleData.detectionMethod === 'custom' ? 'Truth Lens' : 'Genkit AI'}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {detectedArticleData.detectionMethod === 'custom'
                      ? 'Detected using the Truth Lens model (Render API).'
                      : 'Detected using a Genkit-powered Large Language Model.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(true)} className="ml-auto">
            <Maximize className="mr-2 h-3 w-3" /> View Full Article
        </Button>
      </CardFooter>
    </Card>

    <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl w-[90vw] max-h-[90vh]">
            <DialogHeaderDetail>
                <DialogTitleDetail className="text-2xl font-headline flex items-center">
                 {isGenerated ? (
                    <Bot className="mr-3 h-7 w-7 text-primary shrink-0" />
                  ) : (
                    resultLabel === 'Real' ?
                    <CheckCircle className="mr-3 h-7 w-7 text-green-500 shrink-0" /> :
                    <AlertTriangle className="mr-3 h-7 w-7 text-destructive shrink-0" />
                  )}
                  {cardTitleText}
                </DialogTitleDetail>
                <DialogDescriptionDetail className="text-xs text-muted-foreground pt-1">
                  {isGenerated ? "Generated Article Details" : "Detected Article Analysis"}
                   {' - '}
                  {articleData.timestamp ? format(new Date(articleData.timestamp), "MMMM d, yyyy, h:mm a") : 'Timestamp not available'}
                </DialogDescriptionDetail>
            </DialogHeaderDetail>

            <ScrollArea className="max-h-[calc(90vh-12rem)] pr-5">
                <div className="space-y-4 py-4">
                    {isGenerated && (articleData as GeneratedArticle).imageUrl && (
                        <div className="relative aspect-video w-full rounded-md overflow-hidden border mb-4">
                        <Image
                            src={(articleData as GeneratedArticle).imageUrl!}
                            alt={`Header for: ${cardTitleText}`}
                            layout="fill"
                            objectFit="cover"
                        />
                        </div>
                    )}

                    {isGenerated && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4 p-3 border rounded-md bg-secondary/20">
                            <div><span className="font-semibold text-primary">Topic:</span> {(articleData as GeneratedArticle).topic}</div>
                            <div><span className="font-semibold text-primary">Category:</span> {(articleData as GeneratedArticle).category}</div>
                            <div><span className="font-semibold text-primary">Tone:</span> {(articleData as GeneratedArticle).tone}</div>
                        </div>
                    )}

                    {!isGenerated && detectedArticleData && (
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4 p-3 border rounded-md bg-secondary/20">
                            <div><span className="font-semibold text-primary">Prediction:</span> <span className={cn(resultLabel === 'Fake' ? 'text-destructive' : 'text-green-600', "font-bold")}>{resultLabel}</span></div>
                            <div><span className="font-semibold text-primary">Confidence:</span> {confidenceScore}%</div>
                            <div><span className="font-semibold text-primary">Model:</span> {detectedArticleData.detectionMethod === 'custom' ? 'Truth Lens' : 'Genkit AI'}</div>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold text-lg mb-2 text-primary border-b pb-1">Full Article Text:</h4>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{fullText}</p>
                    </div>

                    {!isGenerated && justification && (
                        <div className="mt-4">
                            <h4 className="font-semibold text-lg mb-2 text-primary border-b pb-1">AI Justification:</h4>
                            <ul className="list-disc list-inside text-sm space-y-1 pl-3 text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {justification.split('\n').map((item, index) => {
                                const cleanedItem = item.trim().replace(/^[-*]\s*/, '');
                                return cleanedItem.length > 0 && <li key={index}>{cleanedItem}</li>;
                            })}
                            </ul>
                        </div>
                    )}

                    {!isGenerated && factChecks && factChecks.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-semibold text-lg mb-2 text-primary border-b pb-1">External Fact-Checks (Mock Data):</h4>
                            <div className="space-y-3">
                            {factChecks.map((fc, index) => (
                                <div key={index} className="p-3 border rounded-md bg-muted/50">
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
                </div>
            </ScrollArea>

            <DialogFooterDetail className="pt-4">
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
            </DialogFooterDetail>
        </DialogContent>
    </Dialog>


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
    </>
  );
}
