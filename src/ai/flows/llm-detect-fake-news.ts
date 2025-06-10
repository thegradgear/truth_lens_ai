
'use server';
/**
 * @fileOverview A fake news detection flow using a general LLM.
 *
 * - llmDetectFakeNews - A function that handles LLM-based fake news detection.
 * - LlmDetectFakeNewsInput - The input type for the llmDetectFakeNews function.
 * - LlmDetectFakeNewsOutput - The return type for the llmDetectFakeNews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Re-using the same schema structure as the other detection flow for consistency
export const LlmDetectFakeNewsInputSchema = z.object({
  articleText: z.string().describe('The text content of the news article to be analyzed.'),
});
export type LlmDetectFakeNewsInput = z.infer<typeof LlmDetectFakeNewsInputSchema>;

export const LlmDetectFakeNewsOutputSchema = z.object({
  label: z.enum(['Real', 'Fake']).describe('The predicted label for the article (Real or Fake).'),
  confidence: z.number().min(0).max(100).describe('The confidence score of the prediction (0-100).'),
});
export type LlmDetectFakeNewsOutput = z.infer<typeof LlmDetectFakeNewsOutputSchema>;

export async function llmDetectFakeNews(input: LlmDetectFakeNewsInput): Promise<LlmDetectFakeNewsOutput> {
  return llmDetectFakeNewsFlow(input);
}

const llmDetectFakeNewsPrompt = ai.definePrompt({
  name: 'llmDetectFakeNewsPrompt',
  input: {schema: LlmDetectFakeNewsInputSchema},
  output: {schema: LlmDetectFakeNewsOutputSchema},
  prompt: `You are an AI assistant specializing in fake news detection.
Analyze the following news article text.
Based on your analysis, determine if the article is 'Real' or 'Fake'.
You MUST provide a confidence score (an integer between 0 and 100) for your prediction.

Article Text:
{{{articleText}}}
`,
  // config: { // Optional: Add safety settings if needed
  //   safetySettings: [
  //     {
  //       category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  //       threshold: 'BLOCK_ONLY_HIGH',
  //     },
  //   ],
  // },
});

const llmDetectFakeNewsFlow = ai.defineFlow(
  {
    name: 'llmDetectFakeNewsFlow',
    inputSchema: LlmDetectFakeNewsInputSchema,
    outputSchema: LlmDetectFakeNewsOutputSchema,
  },
  async (input) => {
    const {output} = await llmDetectFakeNewsPrompt(input);
    if (!output) {
      throw new Error('The LLM did not return a valid detection response.');
    }
    // Ensure confidence is a number, sometimes LLMs might return it as string in complex outputs
    if (typeof output.confidence === 'string') {
        output.confidence = parseFloat(output.confidence);
    }
    if (isNaN(output.confidence)) {
        output.confidence = 50; // Default if parsing fails
        console.warn("LLM returned non-numeric confidence, defaulted to 50.");
    }
    output.confidence = Math.max(0, Math.min(100, output.confidence)); // Clamp to 0-100

    return output;
  }
);
