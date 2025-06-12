
'use server';
/**
 * @fileOverview A fake news detection flow using a general LLM, with XAI and fact-checking capabilities.
 *
 * - llmDetectFakeNews - A function that handles LLM-based fake news detection.
 * - LlmDetectFakeNewsInput - The input type for the llmDetectFakeNews function.
 * - LlmDetectFakeNewsOutput - The return type for the llmDetectFakeNews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FactCheckResult } from '@/types';

const LlmDetectFakeNewsInputSchema = z.object({
  articleText: z.string().describe('The text content of the news article to be analyzed.'),
});
export type LlmDetectFakeNewsInput = z.infer<typeof LlmDetectFakeNewsInputSchema>;

const FactCheckResultSchema = z.object({
  source: z.string().describe('The source of the fact-check (e.g., Snopes, PolitiFact).'),
  claimReviewed: z.string().describe('A brief summary of the claim that was fact-checked.'),
  rating: z.string().describe('The rating given by the fact-checking source (e.g., False, True, Mixed).'),
  url: z.string().url().optional().describe('A URL to the fact-check article, if available.'),
});

const LlmDetectFakeNewsOutputSchema = z.object({
  label: z.enum(['Real', 'Fake']).describe('The predicted label for the article (Real or Fake).'),
  confidence: z.number().min(0).max(100).describe('The confidence score of the prediction (0-100).'),
  justification: z.string().optional().describe('Bullet-point reasons or highlighted phrases supporting the prediction.'),
  factChecks: z.array(FactCheckResultSchema).optional().describe('Relevant fact-checks from external sources.'),
});
export type LlmDetectFakeNewsOutput = z.infer<typeof LlmDetectFakeNewsOutputSchema>;

// Mock Tool for External Fact-Checking
const externalFactCheckerTool = ai.defineTool(
  {
    name: 'externalFactCheckerTool',
    description: '(MOCK TOOL) Attempts to find external fact-checks for claims in the provided article text. This tool currently returns placeholder data and does not make live API calls.',
    inputSchema: z.object({
      articleText: z.string().describe('The text of the article to check for verifiable claims.'),
    }),
    outputSchema: z.array(FactCheckResultSchema),
  },
  async (input) => {
    // In a real implementation, this would call an external API (e.g., Google Fact Check API)
    // For now, returning mock data.
    console.log("Mock externalFactCheckerTool called with text snippet:", input.articleText.substring(0, 100) + "...");
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Randomly decide if we "find" any mock fact checks
    if (Math.random() > 0.7) {
        return [
            {
                source: "MockCheck.org",
                claimReviewed: "A key claim from the article (mocked)",
                rating: Math.random() > 0.5 ? "Potentially Misleading (Mock)" : "Partially True (Mock)",
                url: "https://example.com/mock-fact-check"
            }
        ];
    }
    return []; // Or return a message like [{ source: "Mock System", claimReviewed: "N/A", rating: "No specific claims found or tool is mock.", url: undefined }]
  }
);


export async function llmDetectFakeNews(input: LlmDetectFakeNewsInput): Promise<LlmDetectFakeNewsOutput> {
  return llmDetectFakeNewsFlow(input);
}

const llmDetectFakeNewsPrompt = ai.definePrompt({
  name: 'llmDetectFakeNewsPrompt',
  tools: [externalFactCheckerTool], // Added mock fact-checking tool
  input: {schema: LlmDetectFakeNewsInputSchema},
  output: {schema: LlmDetectFakeNewsOutputSchema},
  prompt: `You are an AI assistant specializing in fake news detection and analysis.
Analyze the following news article text.
Based on your analysis, determine if the article is 'Real' or 'Fake'.
You MUST provide a confidence score (an integer between 0 and 100) for your prediction.
You MUST provide a brief justification for your prediction in bullet points. Focus on why you made the classification.
If the article contains verifiable claims, consider using the 'externalFactCheckerTool' to find related fact-checks. Include any findings from this tool in the 'factChecks' output field. If the tool returns no results, you can omit the 'factChecks' field or return an empty array.

Article Text:
{{{articleText}}}
`,
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
    if (typeof output.confidence === 'string') {
        output.confidence = parseFloat(output.confidence);
    }
    if (isNaN(output.confidence)) {
        output.confidence = 50;
        console.warn("LLM returned non-numeric confidence, defaulted to 50.");
    }
    output.confidence = Math.max(0, Math.min(100, parseFloat(output.confidence.toFixed(1))));

    // Ensure justification is a string if provided
    if (output.justification && typeof output.justification !== 'string') {
        output.justification = JSON.stringify(output.justification);
    }
    
    return output;
  }
);
