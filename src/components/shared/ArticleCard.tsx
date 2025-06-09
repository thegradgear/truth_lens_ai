
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GeneratedArticle, DetectedArticle, Article } from '@/types';
import { Bot, CheckCircle, AlertTriangle, Clock, Tag, Type, Save, Loader2 } from 'lucide-react'; // Added Loader2
import { format } from 'date-fns';

interface ArticleCardProps {
  article: Article;
  onSave?: (article: Article) => Promise<void> | void; // Optional save handler, can be async
  showSaveButton?: boolean;
  isSaving?: boolean; // To show loading state on save button
}

export function ArticleCard({ article, onSave, showSaveButton = false, isSaving = false }: ArticleCardProps) {
  const isGenerated = article.type === 'generated';
  const articleData = article as GeneratedArticle | DetectedArticle;

  const handleSaveClick = async () => {
    if (onSave) {
      try {
        await onSave(article);
      } catch (error) {
        console.error("Error during onSave callback:", error);
        // Optionally, show a toast or error message here if onSave itself throws
      }
    }
  };

  return (
    <Card className="shadow-lg w-full flex flex-col">
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
                {(articleData as DetectedArticle).result.label === 'Real' ? 
                    <CheckCircle className="mr-2 h-6 w-6 text-green-500" /> :
                    <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
                }
                Detection Result
                </CardTitle>
                <Badge variant={ (articleData as DetectedArticle).result.label === 'Real' ? 'default' : 'destructive'} className="bg-opacity-80">
                    {(articleData as DetectedArticle).result.label}
                </Badge>
            </div>
            <CardDescription>
              Confidence: {((articleData as DetectedArticle).result.confidence || 0).toFixed(1)}%
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="prose prose-sm max-w-none dark:prose-invert text-foreground overflow-auto max-h-96 p-2 rounded bg-muted/30">
          <p className="whitespace-pre-wrap">
            {isGenerated ? (articleData as GeneratedArticle).content : (articleData as DetectedArticle).text}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center border-t pt-4">
        <div className="text-xs text-muted-foreground flex items-center">
          <Clock className="mr-1 h-3 w-3" /> 
          {articleData.timestamp ? format(new Date(articleData.timestamp), "MMM d, yyyy 'at' h:mm a") : 'Processing date...'}
        </div>
        {showSaveButton && onSave && (
          <Button onClick={handleSaveClick} size="sm" variant="outline" disabled={isSaving}>
            {isSaving ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" /> Save to History
                </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

