
'use server';
/**
 * @fileOverview Generates a header image for a news article using AI and uploads it to Cloudinary.
 *
 * - generateArticleImage - A function that handles image generation and upload.
 * - GenerateArticleImageInput - The input type for the function.
 * - GenerateArticleImageOutput - The return type for the function (Cloudinary URL).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { uploadImageToCloudinary } from '@/services/cloudinaryService';

const GenerateArticleImageInputSchema = z.object({
  topic: z.string().describe('The main topic of the news article.'),
  category: z.string().describe('The category of the news article (e.g., Technology, Politics).'),
  articleSnippet: z.string().optional().describe('A short snippet from the article content for better image context.'),
  customPrompt: z.string().optional().describe('A custom prompt provided by the user for image regeneration.'),
});
export type GenerateArticleImageInput = z.infer<typeof GenerateArticleImageInputSchema>;

const GenerateArticleImageOutputSchema = z.object({
  imageUrl: z.string().describe('The Cloudinary URL of the generated and uploaded image.'),
});
export type GenerateArticleImageOutput = z.infer<typeof GenerateArticleImageOutputSchema>;

export async function generateArticleImage(
  input: GenerateArticleImageInput
): Promise<GenerateArticleImageOutput> {
  try {
    return await generateArticleImageFlow(input);
  } catch (error: any) {
    console.error("Error in generateArticleImage flow execution:", error);
    // Ensure a user-friendly message is thrown, using the specific one if available.
    const message = error.message || 'An unexpected error occurred during image generation and upload.';
    if (message.startsWith('AI image generation') || message.startsWith('Failed to store generated image') || message.startsWith('Cloudinary service is not configured')) {
      throw new Error(message); // Propagate already user-friendly messages
    }
    throw new Error(`Image generation process failed: ${message}`);
  }
}

const generateArticleImageFlow = ai.defineFlow(
  {
    name: 'generateArticleImageFlow',
    inputSchema: GenerateArticleImageInputSchema,
    outputSchema: GenerateArticleImageOutputSchema,
  },
  async (input) => {
    let imagePromptText: string;

    if (input.customPrompt && input.customPrompt.trim() !== '') {
      imagePromptText = input.customPrompt;
    } else {
      imagePromptText = `Create a high-quality, visually compelling image that directly represents the core essence of the topic: "${input.topic}".`;
      imagePromptText += ` This image is intended as a header for a news article in the "${input.category}" category.`;
      if (input.articleSnippet) {
        imagePromptText += ` For thematic context, the article begins with: "${input.articleSnippet.substring(0, 150)}...".`;
      }
      imagePromptText += ` CRITICAL: The image MUST NOT contain any text, words, letters, numbers, captions, headlines, logos, or watermarks. Focus entirely on a purely visual depiction of the topic: "${input.topic}". Aim for a photorealistic or clear illustrative style suitable for news.`;
    }

    let imageDataUri: string | undefined;
    try {
      const genResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: imagePromptText,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
           safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      if (genResponse.media && genResponse.media.url) {
        imageDataUri = genResponse.media.url;
      } else {
        let detailedErrorMsg = 'AI image generation did not return a valid media URL.';
        let logDetails: any = {
            promptUsed: imagePromptText,
            responseText: genResponse.text,
            candidates: [],
        };

        if (genResponse.text) {
          detailedErrorMsg += ` Model text response: "${genResponse.text}".`;
        }
        if (genResponse.candidates && genResponse.candidates.length > 0) {
          genResponse.candidates.forEach(candidate => {
            let candInfo: any = { index: candidate.index };
            if (candidate.finishReason) {
              candInfo.finishReason = candidate.finishReason;
              detailedErrorMsg += ` Candidate finish reason: ${candidate.finishReason}.`;
            }
            if (candidate.finishMessage) {
              candInfo.finishMessage = candidate.finishMessage;
              detailedErrorMsg += ` Finish message: "${candidate.finishMessage}".`;
            }
            if (candidate.finishReason === 'SAFETY' && !candidate.media?.url) {
                detailedErrorMsg += ' Image generation may have been blocked due to safety filters. Try a different prompt.';
            }
            logDetails.candidates.push(candInfo);
          });
        }
        console.error('AI Image Generation Failure:', detailedErrorMsg, 'Details:', JSON.stringify(logDetails, null, 2));
        throw new Error(detailedErrorMsg);
      }
    } catch (error: any) {
      console.error('Full error object during AI image generation attempt:', error);
      if (error instanceof Error && error.message.startsWith('AI image generation did not return a valid media URL.')) {
        throw error;
      }
      let detailedErrorMessage = 'An unexpected error occurred during AI image generation.';
      if (error instanceof Error) {
        detailedErrorMessage = error.message;
      } else if (typeof error === 'string') {
        detailedErrorMessage = error;
      }
      
      if (detailedErrorMessage.includes('GoogleGenerativeAI Error') || detailedErrorMessage.includes('googleapis.com')) {
        // Extract a more specific message if it's a known API error format
        const match = detailedErrorMessage.match(/\[(\d{3}) [^\]]+\] (.*)/); // e.g. [500 Internal Server Error] The service is temporarily unavailable.
        if (match && match[2]) {
             throw new Error(`AI image generation API request failed: ${match[2]}. This may be a temporary issue with the AI service. Please try again later.`);
        }
        throw new Error(`AI image generation API request failed: ${detailedErrorMessage}. This may be a temporary issue with the AI service. Please try again later.`);
      }
      // Fallback for other types of unexpected errors during image data generation phase.
      throw new Error(`Failed to generate image data due to an unexpected issue: ${detailedErrorMessage}. Try modifying your prompt or try again later.`);
    }

    // Upload to Cloudinary
    try {
      const cloudinaryUrl = await uploadImageToCloudinary(imageDataUri, input.topic);
      return { imageUrl: cloudinaryUrl };
    } catch (uploadError) {
        console.error('Error uploading image to Cloudinary from flow:', uploadError);
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'An unknown error occurred during image upload to Cloudinary.';
        // This error is specific to the Cloudinary upload step.
        throw new Error(`Failed to store generated image: ${errorMessage}`);
    }
  }
);

