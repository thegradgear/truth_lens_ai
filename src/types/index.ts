
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface GeneratedArticle {
  id?: string;
  userId?: string;
  type: 'generated';
  title: string; // AI-generated title for the article
  content: string;
  topic: string; // User-provided topic
  category: string;
  tone: string;
  timestamp: string;
  imageUrl?: string;
}

export interface FactCheckResult {
  source: string;
  claimReviewed: string;
  rating: string;
  url?: string;
}

export interface DetectedArticle {
  id?: string;
  userId?: string;
  type: 'detected';
  title?: string; // AI-generated or snippet-based title for the analyzed text
  text: string;
  result: {
    label: 'Real' | 'Fake';
    confidence: number;
  };
  timestamp: string;
  detectionMethod?: 'custom' | 'llm';
  justification?: string; // Added for XAI
  factChecks?: FactCheckResult[]; // Added for external fact-checking
}

export type Article = GeneratedArticle | DetectedArticle;

