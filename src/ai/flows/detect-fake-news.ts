
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
    description: 'Analyzes the provided news article text and predicts whether it is real or fake using a custom ML model.',
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
        const label = data.prediction === 'Fake' ? 'Fake' : 'Real';
        const confidence = data.confidence * 100; // Convert 0-1 scale to 0-100

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
      throw new Error(`Failed to get prediction from ML model: ${error.message}`);
    }
  }
);

const detectFakeNewsPrompt = ai.definePrompt({
  name: 'detectFakeNewsPrompt',
  tools: [predictFakeNews],
  input: {schema: DetectFakeNewsInputSchema},
  output: {schema: DetectFakeNewsOutputSchema},
  prompt: `You are an AI assistant designed to help users determine the credibility of news articles.

The user will provide you with the text of a news article. Your task is to analyze the article and determine whether it is likely to be real or fake.

To do this, use the 'predictFakeNews' tool, which calls a machine learning model to analyze the article and provide a prediction.

Article Text: {{{articleText}}}

Based on the tool's prediction, return the label (Real or Fake) and the confidence score.
`,
});

const detectFakeNewsFlow = ai.defineFlow(
  {
    name: 'detectFakeNewsFlow',
    inputSchema: DetectFakeNewsInputSchema,
    outputSchema: DetectFakeNewsOutputSchema,
  },
  async (input) => {
    // The Genkit flow will automatically call the tool if the LLM decides it's necessary based on the prompt.
    // The `detectFakeNewsPrompt` is constructed in a way that it should always use the tool.
    const {output} = await detectFakeNewsPrompt(input);

    // Genkit handles the tool execution and injects the result back into the LLM to formulate the final output.
    // So, `output` here should be the direct structured output we want.
    if (!output) {
        throw new Error("The AI failed to produce an output after using the detection tool.");
    }
    return output;
  }
);

