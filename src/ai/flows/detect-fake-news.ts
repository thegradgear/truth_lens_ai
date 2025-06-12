
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
      throw new Error("Custom ML model endpoint is not configured. Please set NEXT_PUBLIC_CUSTOM_ML_API_URL.");
    }

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: input.articleText }),
      });

      if (!response.ok) {
        let errorBody = 'Could not retrieve error body from ML API response.';
        try {
          errorBody = await response.text();
        } catch (e) {
          console.warn("Failed to read error body as text from ML API response after non-ok status.");
        }
        console.error(`Custom ML API request failed with status ${response.status}. Body: ${errorBody.substring(0, 500)}...`);
        throw new Error(`The custom ML model service responded with an error (status ${response.status}). Please check the service configuration or logs.`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError: any) {
        console.error('Failed to parse JSON response from ML API:', jsonError);
        let responseText = 'Could not retrieve raw text from ML API response.';
        try {
            // Re-use the response object if available, or try to get text from a new one if it was consumed
            if (response && typeof response.text === 'function') {
                 responseText = await response.text(); // This might fail if response body already read or not text
            }
        } catch (textReadError) {
            console.warn("Failed to read response text after JSON parsing error.");
        }
        console.error('Raw ML API response snippet (if available):', responseText.substring(0, 500) + '...');
        throw new Error('The custom ML model service returned an invalid response format (expected JSON).');
      }
      

      if (data && typeof data.prediction === 'string' && typeof data.confidence === 'number') {
        const label = data.prediction.toLowerCase() === 'fake' ? 'Fake' : 'Real';
        const confidence = data.confidence * 100;

        return {
          label: label,
          confidence: parseFloat(confidence.toFixed(1)),
        };
      } else {
        console.error('Unexpected response data structure from ML API:', data);
        throw new Error('The custom ML model service returned an unexpected data structure after successful fetch.');
      }
    } catch (error: any) {
      console.error('Full error caught in predictFakeNews tool:', error); 
      
      let errorMessage = "Failed to communicate with or process response from the custom ML model.";
      if (error instanceof Error) {
        // Check if it's one of our specific errors thrown above and re-throw it directly.
        if (error.message.startsWith('The custom ML model service responded with an error') ||
            error.message.startsWith('Custom ML model endpoint is not configured') ||
            error.message.startsWith('The custom ML model service returned an invalid response format') ||
            error.message.startsWith('The custom ML model service returned an unexpected data structure')) {
          throw error; 
        }
        errorMessage += ` Details: ${error.message}`;
      } else if (typeof error === 'string') {
        errorMessage += ` Details: ${error}`;
      } else {
        errorMessage += " An unknown error structure was caught during the operation."
      }
      // Ensure a new Error object is always thrown for generic/unexpected cases.
      throw new Error(errorMessage);
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
    return {
      label: toolOutput.label,
      confidence: toolOutput.confidence,
    };
  }
);

