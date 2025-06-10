
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-fake-news-article.ts';
import '@/ai/flows/detect-fake-news.ts';
import '@/ai/flows/llm-detect-fake-news.ts'; // Added new flow
