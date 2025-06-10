
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
  return generateArticleImageFlow(input);
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
      imagePromptText = `Generate a visually appealing header image suitable for a news article about "${input.topic}" in the "${input.category}" category.`;
      if (input.articleSnippet) {
        imagePromptText += ` The article starts with: "${input.articleSnippet.substring(0, 200)}...".`;
      }
      imagePromptText += ` The image should be in a style typically seen with online news. Avoid text in the image. Focus on photorealistic or illustrative styles appropriate for news.`;
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
                detailedErrorMsg += ' Image generation may have been blocked due to safety filters.';
            }
            logDetails.candidates.push(candInfo);
          });
        }
        console.error('AI Image Generation Failure:', detailedErrorMsg, 'Details:', JSON.stringify(logDetails, null, 2));
        // This specific error is for when the AI responds, but without an image.
        throw new Error(detailedErrorMsg);
      }
    } catch (error: any) {
      // Log the full error object for server-side debugging, especially for API errors.
      console.error('Full error object during AI image generation attempt:', error);

      // Check if it's the custom error we threw above (AI responded without image)
      if (error instanceof Error && error.message.startsWith('AI image generation did not return a valid media URL.')) {
        // Re-throw our detailed custom error as is. The message already contains AI's textual response.
        throw new Error(error.message);
      }

      // Handle other errors, including external API errors (like 500s from Google)
      let detailedErrorMessage = 'An unexpected error occurred during AI image generation.';
      if (error instanceof Error) {
        detailedErrorMessage = error.message; // This often contains info like "500 Internal Server Error"
      } else if (typeof error === 'string') {
        detailedErrorMessage = error;
      }
      
      // If the error message indicates a Google API error, frame it specifically.
      if (detailedErrorMessage.includes('GoogleGenerativeAI Error') || detailedErrorMessage.includes('googleapis.com')) {
        throw new Error(`AI image generation API request failed: ${detailedErrorMessage}. This may be a temporary issue with the AI service. Please try again later.`);
      }

      // Fallback for other types of unexpected errors during image data generation phase.
      throw new Error(`Failed to generate image data due to an unexpected issue: ${detailedErrorMessage}`);
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

