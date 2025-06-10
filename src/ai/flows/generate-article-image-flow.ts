
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
    const imagePrompt = `Generate a visually appealing header image suitable for a news article about "${input.topic}" in the "${input.category}" category. The image should be in a style typically seen with online news. Avoid text in the image. Focus on photorealistic or illustrative styles appropriate for news.`;

    let imageDataUri: string | undefined;
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: imagePrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
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
        // It might be useful to still return an error that indicates AI generation was okay but upload failed.
        // However, for the client, if the image isn't usable, it's a failure of this flow.
        throw new Error(`Failed to process and store image: ${errorMessage}`);
    }
  }
);
