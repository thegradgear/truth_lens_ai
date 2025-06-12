
'use server';

/**
 * @fileOverview Detects whether a news article is real or fake using an ML model.
 *
 * - detectFakeNews - A function that handles the fake news detection process.
 * - DetectFakeNewsInput - The input type for the detectFakeNews function.
 * - DetectFakeNewsOutput - The return type for the detectFakeNews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FactCheckResult } from '@/types';


const DetectFakeNewsInputSchema = z.object({
  articleText: z.string().describe('The text content of the news article to be analyzed.'),
});
export type DetectFakeNewsInput = z.infer<typeof DetectFakeNewsInputSchema>;

const FactCheckResultSchema = z.object({
  source: z.string(),
  claimReviewed: z.string(),
  rating: z.string(),
  url: z.string().url().optional(),
});

const DetectFakeNewsOutputSchema = z.object({
  label: z.enum(['Real', 'Fake']).describe('The predicted label for the article (Real or Fake).'),
  confidence: z.number().min(0).max(100).describe('The confidence score of the prediction (0-100).'),
  justification: z.string().optional().describe('Justification for the prediction (not provided by this custom model flow).'),
  factChecks: z.array(FactCheckResultSchema).optional().describe('External fact-checks (not provided by this custom model flow).'),
});
export type DetectFakeNewsOutput = z.infer<typeof DetectFakeNewsOutputSchema>;

export async function detectFakeNews(input: DetectFakeNewsInput): Promise<DetectFakeNewsOutput> {
  return detectFakeNewsFlow(input);
}

const predictFakeNews = ai.defineTool(
  {
    name: 'predictFakeNews',
    description: 'Analyzes the provided news article text and predicts whether it is real or fake using a custom ML model. This tool provides the definitive prediction.',
    inputSchema: z.object({
      articleText: z.string().describe('The text content of the news article to analyze.'),
    }),
    outputSchema: z.object({
      label: z.enum(['Real', 'Fake']).describe('The predicted label for the article (Real or Fake).'),
      confidence: z.number().min(0).max(100).describe('The confidence score of the prediction (0-100).'),
    }),
  },
  async (input) => {
    const apiUrl = process.env.NEXT_PUBLIC_CUSTOM_ML_API_URL;
    if (!apiUrl) {
      console.error("NEXT_PUBLIC_CUSTOM_ML_API_URL is not set. Cannot call custom ML model.");
      throw new Error("Custom ML model endpoint is not configured.");
    }
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: input.articleText }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`ML API request failed with status ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      if (data && typeof data.prediction === 'string' && typeof data.confidence === 'number') {
        const label = data.prediction.toLowerCase() === 'fake' ? 'Fake' : 'Real';
        const confidence = data.confidence * 100;

        return {
          label: label,
          confidence: parseFloat(confidence.toFixed(1)),
        };
      } else {
        console.error('Unexpected response format from ML API:', data);
        throw new Error('Unexpected response format from ML API.');
      }
    } catch (error: any) {
      console.error('Error calling predictFakeNews tool:', error);
      throw new Error(`Failed to get prediction from ML model. Please check the service or try again later.`);
    }
  }
);

const detectFakeNewsFlow = ai.defineFlow(
  {
    name: 'detectFakeNewsFlow',
    inputSchema: DetectFakeNewsInputSchema,
    outputSchema: DetectFakeNewsOutputSchema,
  },
  async (input) => {
    const toolOutput = await predictFakeNews(input);
    if (!toolOutput || toolOutput.label === undefined || toolOutput.confidence === undefined) {
        throw new Error("The ML model tool did not return a valid prediction structure.");
    }
    // This flow does not provide justification or factChecks, so they will be undefined.
    // The schema includes them for type compatibility with LlmDetectFakeNewsOutput.
    return {
      label: toolOutput.label,
      confidence: toolOutput.confidence,
      // justification and factChecks will be implicitly undefined
    };
  }
);
