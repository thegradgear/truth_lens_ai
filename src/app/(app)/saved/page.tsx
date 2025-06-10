
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArticleCard } from '@/components/shared/ArticleCard';
import type { Article, DetectedArticle } from '@/types';
import { fetchUserArticles } from '@/lib/firebase';
import { Loader2, Inbox, Search, FileText, ScanSearch } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';


export default function SavedHistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'generated' | 'detected'>('generated'); // Default to 'generated'
  const [filterResult, setFilterResult] = useState<'all' | 'Real' | 'Fake'>('all');
  const [filterDetectionMethod, setFilterDetectionMethod] = useState<'all' | 'custom' | 'llm'>('all');

  const loadArticles = useCallback(async () => {
    if (user?.uid) {
      setIsLoading(true);
      try {
        const userArticles = await fetchUserArticles(user.uid); 
        setArticles(userArticles as Article[]); 
      } catch (error: any) {
        console.error("Failed to fetch articles:", error);
        toast({
          title: "Error Fetching Articles",
          description: error.message || "Could not load your saved articles. Please try again later.",
          variant: "destructive",
        });
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setArticles([]);
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleFilterTypeChange = (newType: 'generated' | 'detected') => {
    setFilterType(newType);
    // Reset detected-specific filters when changing main type
    setFilterResult('all');
    setFilterDetectionMethod('all');
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterType('generated'); // Reset to default type
    setFilterResult('all');
    setFilterDetectionMethod('all');
  }

  const filteredArticles = useMemo(() => {
    return articles
      .filter(article => {
        // Type filter is now direct
        if (article.type !== filterType) {
          return false;
        }
        if (article.type === 'detected') {
          const detectedArticle = article as DetectedArticle;
          if (filterResult !== 'all' && detectedArticle.result.label !== filterResult) {
            return false;
          }
          if (filterDetectionMethod !== 'all' && detectedArticle.detectionMethod !== filterDetectionMethod) {
            return false;
          }
        }
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (article.type === 'generated') {
            return article.title.toLowerCase().includes(term) ||
                   article.content.toLowerCase().includes(term) ||
                   article.topic.toLowerCase().includes(term) ||
                   article.category.toLowerCase().includes(term) ||
                   article.tone.toLowerCase().includes(term);
          } else if (article.type === 'detected') {
            return article.text.toLowerCase().includes(term);
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [articles, searchTerm, filterType, filterResult, filterDetectionMethod]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your saved articles...</p>
      </div>
    );
  }
  
  if (!user) {
     return (
      <div className="flex flex-col items-center justify-center py-12">
        <Inbox className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">Please Log In</h3>
        <p className="text-muted-foreground">
          Log in to view your saved articles.
        </p>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-headline">Your Saved History</CardTitle>
          <CardDescription>
            Review all the articles you've generated or analyzed with Veritas AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border rounded-lg bg-background space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex space-x-2">
                    <Button
                        variant={filterType === 'generated' ? 'default' : 'outline'}
                        onClick={() => handleFilterTypeChange('generated')}
                        className="flex-1 sm:flex-none"
                    >
                        <FileText className="mr-2 h-4 w-4" /> Generated
                    </Button>
                    <Button
                        variant={filterType === 'detected' ? 'default' : 'outline'}
                        onClick={() => handleFilterTypeChange('detected')}
                        className="flex-1 sm:flex-none"
                    >
                        <ScanSearch className="mr-2 h-4 w-4" /> Detected
                    </Button>
                </div>
                 <div className="relative flex-grow w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search-articles"
                        placeholder="Search articles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
            </div>

            {filterType === 'detected' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t mt-4">
                <div>
                  <Label htmlFor="filter-result">Filter by Result</Label>
                   <Select value={filterResult} onValueChange={(value: 'all' | 'Real' | 'Fake') => setFilterResult(value)}>
                      <SelectTrigger id="filter-result" className="mt-1">
                          <SelectValue placeholder="Filter by result" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Results</SelectItem>
                          <SelectItem value="Real">Real</SelectItem>
                          <SelectItem value="Fake">Fake</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filter-detection-method">Detection Method</Label>
                   <Select value={filterDetectionMethod} onValueChange={(value: 'all' | 'custom' | 'llm') => setFilterDetectionMethod(value)}>
                      <SelectTrigger id="filter-detection-method" className="mt-1">
                          <SelectValue placeholder="Filter by method" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Methods</SelectItem>
                          <SelectItem value="custom">Custom Model (Render API)</SelectItem>
                          <SelectItem value="llm">Genkit AI Model</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No Articles Found</h3>
              <p className="text-muted-foreground">
                {articles.length > 0 ? "Your current filters didn't match any articles." : "You haven't saved any articles yet. Try generating or detecting some!"}
              </p>
              {articles.length > 0 && (
                <Button variant="outline" onClick={clearAllFilters} className="mt-4">
                    Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <ArticleCard key={article.id || article.timestamp} article={article} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ htmlFor, children }: {htmlFor: string, children: React.ReactNode}) {
    return <label htmlFor={htmlFor} className="block text-sm font-medium text-muted-foreground">{children}</label>
}

