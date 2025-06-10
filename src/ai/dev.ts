
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-fake-news-article.ts';
import '@/ai/flows/detect-fake-news.ts';
import '@/ai/flows/llm-detect-fake-news.ts';
import '@/ai/flows/generate-article-image-flow.ts'; // Added new image generation flow

