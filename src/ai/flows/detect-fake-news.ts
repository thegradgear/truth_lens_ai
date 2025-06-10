
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

const DetectFakeNewsInputSchema = z.object({
  articleText: z.string().describe('The text content of the news article to be analyzed.'),
});
export type DetectFakeNewsInput = z.infer<typeof DetectFakeNewsInputSchema>;

const DetectFakeNewsOutputSchema = z.object({
  label: z.enum(['Real', 'Fake']).describe('The predicted label for the article (Real or Fake).'),
  confidence: z.number().min(0).max(100).describe('The confidence score of the prediction (0-100).'),
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
    const apiUrl = 'https://fake-news-detection-ml-ofnv.onrender.com/predict';
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
        // Ensure the label is one of the enum values.
        const label = data.prediction.toLowerCase() === 'fake' ? 'Fake' : 'Real';
        const confidence = data.confidence * 100; 

        return {
          label: label,
          confidence: parseFloat(confidence.toFixed(1)), // Ensure one decimal place
        };
      } else {
        console.error('Unexpected response format from ML API:', data);
        throw new Error('Unexpected response format from ML API.');
      }
    } catch (error: any) {
      console.error('Error calling predictFakeNews tool:', error);
      // Don't log full error to user-facing message if it's a network or API structure issue.
      throw new Error(`Failed to get prediction from ML model. Please check the service or try again later.`);
    }
  }
);

const detectFakeNewsPrompt = ai.definePrompt({
  name: 'detectFakeNewsPrompt',
  tools: [predictFakeNews],
  input: {schema: DetectFakeNewsInputSchema},
  output: {schema: DetectFakeNewsOutputSchema},
  prompt: `You are an AI assistant whose ONLY job is to use a specialized tool to determine news credibility.
You will be given the text of a news article.
You MUST use the 'predictFakeNews' tool to get a prediction for this article.
The 'predictFakeNews' tool will output a 'label' (which will be either 'Real' or 'Fake') and a 'confidence' score.
Your final response MUST be a JSON object that DIRECTLY uses the 'label' and 'confidence' values provided by the 'predictFakeNews' tool.
DO NOT add any of your own analysis, interpretation, or modification to the tool's output. Simply return the tool's exact prediction as your own.

Article Text: {{{articleText}}}
`,
});

const detectFakeNewsFlow = ai.defineFlow(
  {
    name: 'detectFakeNewsFlow',
    inputSchema: DetectFakeNewsInputSchema,
    outputSchema: DetectFakeNewsOutputSchema,
  },
  async (input) => {
    const {output} = await detectFakeNewsPrompt(input);
    if (!output) {
        throw new Error("The AI failed to produce an output after using the detection tool.");
    }
    return output;
  }
);
