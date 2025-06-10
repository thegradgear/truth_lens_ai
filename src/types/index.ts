
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface GeneratedArticle {
  id?: string;
  userId?: string;
  type: 'generated';
  title: string;
  content: string;
  topic: string;
  category: string;
  tone: string;
  timestamp: string; 
  imageDataUri?: string; // Optional: For storing the generated image URI
}

export interface DetectedArticle {
  id?: string;
  userId?: string;
  type: 'detected';
  text: string;
  result: {
    label: 'Real' | 'Fake';
    confidence: number;
  };
  timestamp: string;
  detectionMethod?: 'custom' | 'llm'; 
}

export type Article = GeneratedArticle | DetectedArticle;
