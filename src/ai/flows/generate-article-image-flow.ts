
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
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: imagePromptText,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
           safetySettings: [ // Added safety settings to be less restrictive for creative content
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      if (media && media.url) {
        imageDataUri = media.url;
      } else {
        throw new Error('AI image generation did not return a valid media URL.');
      }
    } catch (error) {
      console.error('Error generating AI image data URI:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during AI image data URI generation.';
      throw new Error(`Failed to generate image data: ${errorMessage}`);
    }

    // Upload to Cloudinary
    try {
      const cloudinaryUrl = await uploadImageToCloudinary(imageDataUri, input.topic);
      return { imageUrl: cloudinaryUrl };
    } catch (uploadError) {
        console.error('Error uploading image to Cloudinary from flow:', uploadError);
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'An unknown error occurred during image upload to Cloudinary.';
        throw new Error(`Failed to process and store image: ${errorMessage}`);
    }
  }
);
