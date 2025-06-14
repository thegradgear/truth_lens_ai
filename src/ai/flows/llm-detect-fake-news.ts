
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
  justification: z.string().optional().describe('Bullet-point reasons supporting the prediction (2-3 main points, plain text).'),
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
    try {
        // In a real implementation, this would call an external API (e.g., Google Fact Check API)
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
        return [];
    } catch (toolError: any) {
        console.error("Error in externalFactCheckerTool (mock):", toolError);
        // Even for a mock tool, it's good practice to handle errors.
        // In a real tool, you'd throw an error that the calling flow can handle.
        // For this mock, we'll just return an empty array to simulate failure.
        return []; // Or: throw new Error(`Mock fact-checking tool failed: ${toolError.message}`);
    }
  }
);


export async function llmDetectFakeNews(input: LlmDetectFakeNewsInput): Promise<LlmDetectFakeNewsOutput> {
  try {
    return await llmDetectFakeNewsFlow(input);
  } catch (error: any) {
    console.error("Error in llmDetectFakeNews flow execution:", error);
    throw new Error(`LLM-based detection failed: ${error.message || 'An unexpected error occurred in the LLM detection flow.'}`);
  }
}

const llmDetectFakeNewsPrompt = ai.definePrompt({
  name: 'llmDetectFakeNewsPrompt',
  tools: [externalFactCheckerTool],
  input: {schema: LlmDetectFakeNewsInputSchema},
  output: {schema: LlmDetectFakeNewsOutputSchema},
  prompt: `You are an AI assistant specializing in fake news detection and analysis.
Analyze the following news article text.
Based on your analysis, determine if the article is 'Real' or 'Fake'.
You MUST provide a confidence score (an integer between 0 and 100) for your prediction.
You MUST provide a brief justification for your prediction, consisting of 2 to 3 main bullet points. Each bullet point should be a short sentence. Do NOT use HTML formatting in the justification; provide plain text bullet points, each starting with a hyphen (-) or asterisk (*).
If the article contains verifiable claims, consider using the 'externalFactCheckerTool' to find related fact-checks. Include any findings from this tool in the 'factChecks' output field. If the tool returns no results, you can omit the 'factChecks' field or return an empty array.

Article Text:
{{{articleText}}}
`,
  // Basic safety settings - adjust as needed
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});

const llmDetectFakeNewsFlow = ai.defineFlow(
  {
    name: 'llmDetectFakeNewsFlow',
    inputSchema: LlmDetectFakeNewsInputSchema,
    outputSchema: LlmDetectFakeNewsOutputSchema,
  },
  async (input) => {
    try {
      const {output, candidates} = await llmDetectFakeNewsPrompt(input);
      if (!output) {
        if (candidates && candidates.length > 0) {
            const firstCandidate = candidates[0];
            if (firstCandidate.finishReason === 'SAFETY') {
                console.warn('LLM detection blocked by safety filters for input:', input.articleText.substring(0,100), 'Finish message:', firstCandidate.finishMessage);
                throw new Error("The AI could not analyze this article due to safety content policies. Please try different content.");
            }
             if (firstCandidate.finishReason === 'RECITATION') {
                 console.warn('LLM detection blocked due to recitation policy for input:', input.articleText.substring(0,100), 'Finish message:', firstCandidate.finishMessage);
                throw new Error("The AI could not analyze this article as it might resemble copyrighted material. Please try different content.");
            }
        }
        console.error('LLM detection failed: AI did not return a valid detection structure for input:', input.articleText.substring(0,100));
        throw new Error('The LLM AI model did not return a valid detection response. Please try again later.');
      }

      if (typeof output.confidence === 'string') {
          output.confidence = parseFloat(output.confidence);
      }
      if (isNaN(output.confidence) || output.confidence === undefined || output.confidence === null) {
          console.warn("LLM returned non-numeric or missing confidence, defaulted to 50 for input:", input.articleText.substring(0,100), "Received confidence:", output.confidence);
          output.confidence = 50; // Default confidence if parsing fails or value is invalid
      }
      output.confidence = Math.max(0, Math.min(100, parseFloat(output.confidence.toFixed(1))));

      if (!output.label) {
          console.warn("LLM returned missing label, defaulted to 'Fake' for input:", input.articleText.substring(0,100));
          output.label = 'Fake'; // Default label if missing
      }
      
      // Ensure justification is a string if it exists
      if (output.justification && typeof output.justification !== 'string') {
          console.warn("LLM returned non-string justification, attempting to stringify for input:", input.articleText.substring(0,100));
          output.justification = JSON.stringify(output.justification);
      }
      
      return output;
    } catch (error: any) {
        console.error("Error during LLM detection prompt execution:", error);
         if (error instanceof Error && (error.message.includes("safety content policies") || error.message.includes("copyrighted material") || error.message.includes("AI model did not return a valid detection response"))) {
            throw error; // Re-throw specific errors
        }
        throw new Error(`LLM-based analysis encountered an issue: ${error.message || 'Unknown error'}. Please try again.`);
    }
  }
);

