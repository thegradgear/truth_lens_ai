
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GeneratedArticle, DetectedArticle, Article } from '@/types';
import { Bot, CheckCircle, AlertTriangle, Clock, Tag, Type, Save, Loader2, Database, Brain, Eye, Image as ImageIconLucide } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image'; // For displaying Cloudinary images

const MAX_CONTENT_LINES = 6; // For CSS line-clamp

export function ArticleCard({ article, onSave, showSaveButton = false, isSaving = false }: ArticleCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReadMoreButton, setShowReadMoreButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const isGenerated = article.type === 'generated';
  const articleData = article as GeneratedArticle | DetectedArticle;

  const fullText = isGenerated ? (articleData as GeneratedArticle).content : (articleData as DetectedArticle).text;

  useEffect(() => {
    if (contentRef.current) {
      // Check if the content is overflowing (clamped)
      setShowReadMoreButton(contentRef.current.scrollHeight > contentRef.current.clientHeight);
    }
  }, [fullText]); // Re-check when fullText changes

  const handleSaveClick = async () => {
    if (onSave) {
      try {
        await onSave(article);
      } catch (error) {
        console.error("Error during onSave callback:", error);
      }
    }
  };
  
  const resultLabel = articleData.type === 'detected' ? (articleData as DetectedArticle).result.label : '';
  const confidenceScore = articleData.type === 'detected' ? ((articleData as DetectedArticle).result.confidence || 0).toFixed(1) : '';
  const modalTitle = isGenerated ? (articleData as GeneratedArticle).title : 'Full Article Text';

  return (
    <Card className="shadow-lg w-full flex flex-col">
      {isGenerated && (articleData as GeneratedArticle).imageUrl && (
        <div className="relative aspect-video w-full rounded-t-lg overflow-hidden border-b">
          <Image 
            src={(articleData as GeneratedArticle).imageUrl!} 
            alt={`Header for article titled: ${(articleData as GeneratedArticle).title}`} 
            layout="fill" 
            objectFit="cover" 
          />
        </div>
      )}
      <CardHeader>
        {isGenerated ? (
          <>
            <div className="flex items-center justify-between">
                <CardTitle className="font-headline text-xl flex items-center">
                    <Bot className="mr-2 h-6 w-6 text-primary" />
                    {(articleData as GeneratedArticle).title || 'AI Generated Article'}
                </CardTitle>
                <Badge variant="secondary">Generated</Badge>
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center"><Tag className="mr-1 h-3 w-3" /> Topic: {(articleData as GeneratedArticle).topic}</span>
                <span className="flex items-center"><Type className="mr-1 h-3 w-3" /> Category: {(articleData as GeneratedArticle).category}</span>
                <span className="flex items-center"><Type className="mr-1 h-3 w-3" /> Tone: {(articleData as GeneratedArticle).tone}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
                <CardTitle className="font-headline text-xl flex items-center">
                {resultLabel === 'Real' ? 
                    <CheckCircle className="mr-2 h-6 w-6 text-green-500" /> :
                    <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
                }
                Detection Result
                </CardTitle>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Badge variant={resultLabel === 'Real' ? 'default' : 'destructive'}>
                        {resultLabel}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This article is predicted as {resultLabel} by the AI model.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </div>
            <CardDescription>
              Confidence: {confidenceScore}%
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <div
          ref={contentRef}
          className={`line-clamp-${MAX_CONTENT_LINES} overflow-hidden`}
        >
          <p className="whitespace-pre-wrap text-sm text-foreground m-0">
            {fullText}
          </p>
        </div>
        {showReadMoreButton && (
           <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="link" size="sm" className="p-0 h-auto mt-2 text-primary hover:underline">
                <Eye className="mr-1 h-4 w-4"/>Read More
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl w-[90vw] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{modalTitle}</DialogTitle>
                {isGenerated && (
                  <DialogDescription>
                    Topic: {(articleData as GeneratedArticle).topic} | Category: {(articleData as GeneratedArticle).category} | Tone: {(articleData as GeneratedArticle).tone}
                  </DialogDescription>
                )}
                 {!isGenerated && (
                   <DialogDescription>
                      Detected Article Analysis
                  </DialogDescription>
                )}
              </DialogHeader>
              <ScrollArea className="flex-grow rounded-md border p-4 my-4">
                <p className="whitespace-pre-wrap text-sm">
                  {fullText}
                </p>
              </ScrollArea>
              <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
      <CardFooter className="flex flex-col xs:flex-row justify-between items-start xs:items-center border-t pt-4 gap-2">
        <div className="flex flex-col xs:flex-row xs:flex-wrap xs:items-center gap-x-3 gap-y-1 text-xs text-muted-foreground w-full">
          <div className="flex items-center shrink-0">
            <Clock className="mr-1 h-3 w-3" />
            {articleData.timestamp ? format(new Date(articleData.timestamp), "MMM d, yyyy, h:mm a") : 'Processing date...'}
          </div>
          {articleData.type === 'detected' && articleData.detectionMethod && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center mt-1 xs:mt-0 cursor-default">
                    {articleData.detectionMethod === 'custom' ? (
                      <Database className="mr-1 h-3 w-3 text-primary/80 shrink-0" />
                    ) : (
                      <Brain className="mr-1 h-3 w-3 text-primary/80 shrink-0" />
                    )}
                    <span className="truncate">Model: {articleData.detectionMethod === 'custom' ? 'Custom' : 'Genkit AI'}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {articleData.detectionMethod === 'custom'
                      ? 'Detected using your deployed Render API model.'
                      : 'Detected using a Genkit-powered Large Language Model.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {showSaveButton && onSave && (
          <Button onClick={handleSaveClick} size="sm" variant="outline" disabled={isSaving} className="w-full xs:w-auto mt-2 xs:mt-0 shrink-0">
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
      </CardFooter>
    </Card>
  );
}
