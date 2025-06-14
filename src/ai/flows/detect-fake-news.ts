
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
  justification: z.string().optional().describe('Justification for the prediction (not provided by this model flow).'),
  factChecks: z.array(FactCheckResultSchema).optional().describe('External fact-checks (not provided by this model flow).'),
});
export type DetectFakeNewsOutput = z.infer<typeof DetectFakeNewsOutputSchema>;

export async function detectFakeNews(input: DetectFakeNewsInput): Promise<DetectFakeNewsOutput> {
  try {
    return await detectFakeNewsFlow(input);
  } catch (error: any) {
    console.error("Error in detectFakeNews flow execution:", error);
    throw new Error(`Failed to detect news authenticity: ${error.message || 'An unexpected error occurred in the detection flow.'}`);
  }
}

const predictFakeNews = ai.defineTool(
  {
    name: 'predictFakeNews',
    description: 'Analyzes the provided news article text and predicts whether it is real or fake using the Truth Lens model. This tool provides the definitive prediction.',
    inputSchema: z.object({
      articleText: z.string().describe('The text content of the news article to analyze.'),
    }),
    outputSchema: z.object({
      label: z.enum(['Real', 'Fake']).describe('The predicted label for the article (Real or Fake).'),
      confidence: z.number().min(0).max(100).describe('The confidence score of the prediction (0-100).'),
    }),
  },
  async (input) => {
    const apiUrl = process.env.NEXT_PUBLIC_CUSTOM_ML_API_URL; // Keep env var name for infrastructure stability
    if (!apiUrl) {
      console.error("The environment variable NEXT_PUBLIC_CUSTOM_ML_API_URL (for the Truth Lens model) is not set. Cannot call Truth Lens model.");
      throw new Error("Truth Lens model endpoint is not configured (via NEXT_PUBLIC_CUSTOM_ML_API_URL). Please contact support or check the application settings.");
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
        console.error(`Truth Lens ML API request failed with status ${response.status}. Body: ${errorBody.substring(0, 500)}...`);
        throw new Error(`The Truth Lens model service responded with an error (status ${response.status}). It might be temporarily unavailable or misconfigured.`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError: any) {
        console.error('Failed to parse JSON response from Truth Lens ML API:', jsonError);
        let responseText = 'Could not retrieve raw text from Truth Lens ML API response.';
        try {
            if (response && typeof response.text === 'function') {
                 responseText = await response.text();
            }
        } catch (textReadError) {
            console.warn("Failed to read response text after JSON parsing error.");
        }
        console.error('Raw Truth Lens ML API response snippet (if available):', responseText.substring(0, 500) + '...');
        throw new Error('The Truth Lens model service returned an invalid response format (expected JSON). Please report this issue.');
      }
      

      if (data && typeof data.prediction === 'string' && typeof data.confidence === 'number') {
        const label = data.prediction.toLowerCase() === 'fake' ? 'Fake' : 'Real';
        const confidence = data.confidence * 100;

        return {
          label: label,
          confidence: parseFloat(confidence.toFixed(1)),
        };
      } else {
        console.error('Unexpected response data structure from Truth Lens ML API:', data);
        throw new Error('The Truth Lens model service returned an unexpected data structure. Please report this issue.');
      }
    } catch (error: any) {
      console.error('Full error caught in predictFakeNews tool:', error); 
      
      if (error instanceof Error) {
        // Re-throw specific, user-friendly errors directly.
        if (error.message.startsWith('The Truth Lens model service responded with an error') ||
            error.message.startsWith('Truth Lens model endpoint is not configured') ||
            error.message.startsWith('The Truth Lens model service returned an invalid response format') ||
            error.message.startsWith('The Truth Lens model service returned an unexpected data structure')) {
          throw error; 
        }
        // Handle generic fetch errors (e.g., network down, DNS issues)
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') { // Common in browsers for network errors
             throw new Error("Network connection failed: Could not reach the Truth Lens model service. Please check your internet connection or if the service is running.");
        }
        throw new Error(`Error communicating with the Truth Lens model: ${error.message}. Please try again or contact support if the issue persists.`);
      } else if (typeof error === 'string') {
        throw new Error(`An issue occurred with the Truth Lens model: ${error}`);
      }
      // Fallback for unknown error structures
      throw new Error("An unexpected issue occurred while using the Truth Lens model. Please try again.");
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
    try {
      const toolOutput = await predictFakeNews(input);
      if (!toolOutput || toolOutput.label === undefined || toolOutput.confidence === undefined) {
          console.error('Invalid prediction structure from predictFakeNews tool:', toolOutput);
          throw new Error("The ML model tool did not return a valid prediction. Please report this issue.");
      }
      return {
        label: toolOutput.label,
        confidence: toolOutput.confidence,
      };
    } catch (error: any) {
        console.error("Error during detectFakeNewsFlow execution, calling predictFakeNews tool:", error);
        // Propagate the error from the tool, or a generic one if it's not an Error instance
        if (error instanceof Error) {
            throw error; // Re-throw the specific error from the tool
        }
        throw new Error("An unexpected error occurred while analyzing the article with the Truth Lens model.");
    }
  }
);
