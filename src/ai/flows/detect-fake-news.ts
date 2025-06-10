
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
  // Directly call the flow which now directly uses the tool's output
  return detectFakeNewsFlow(input);
}

const predictFakeNews = ai.defineTool(
  {
    name: 'predictFakeNews',
    description: 'Analyzes the provided news article text and predicts whether it is real or fake using a custom ML model. This tool provides the definitive prediction.',
    inputSchema: z.object({
      articleText: z.string().describe('The text content of the news article to analyze.'),
    }),
    // Output schema of the tool itself
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
        const label = data.prediction.toLowerCase() === 'fake' ? 'Fake' : 'Real';
        // Assuming data.confidence is a value between 0 and 1 from your API
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
      throw new Error(`Failed to get prediction from ML model. Please check the service or try again later.`);
    }
  }
);

// The prompt is no longer used by the main flow for generating the final response.
// It's kept here as it might be useful for other purposes or if LLM interaction is reintroduced later.
// const detectFakeNewsPrompt = ai.definePrompt({
//   name: 'detectFakeNewsPrompt',
//   tools: [predictFakeNews],
//   input: {schema: DetectFakeNewsInputSchema},
//   output: {schema: DetectFakeNewsOutputSchema},
//   prompt: `You are an AI assistant whose ONLY job is to use a specialized tool to determine news credibility.
// You will be given the text of a news article.
// You MUST use the 'predictFakeNews' tool to get a prediction for this article.
// The 'predictFakeNews' tool will output a 'label' (which will be either 'Real' or 'Fake') and a 'confidence' score.
// Your final response MUST be a JSON object that DIRECTLY uses the 'label' and 'confidence' values provided by the 'predictFakeNews' tool.
// DO NOT add any of your own analysis, interpretation, or modification to the tool's output. Simply return the tool's exact prediction as your own.

// Article Text: {{{articleText}}}
// `,
// });

const detectFakeNewsFlow = ai.defineFlow(
  {
    name: 'detectFakeNewsFlow',
    inputSchema: DetectFakeNewsInputSchema,
    outputSchema: DetectFakeNewsOutputSchema, // The flow's output schema still matches the tool's
  },
  async (input) => {
    // Directly call the tool and return its output.
    // The tool's outputSchema is compatible with DetectFakeNewsOutputSchema.
    const toolOutput = await predictFakeNews(input);
    if (!toolOutput || toolOutput.label === undefined || toolOutput.confidence === undefined) {
        throw new Error("The ML model tool did not return a valid prediction structure.");
    }
    return toolOutput;
  }
);
