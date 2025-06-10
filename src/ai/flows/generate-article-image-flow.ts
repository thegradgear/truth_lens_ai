
'use server';
/**
 * @fileOverview Generates a header image for a news article using AI.
 *
 * - generateArticleImage - A function that handles image generation.
 * - GenerateArticleImageInput - The input type for the function.
 * - GenerateArticleImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateArticleImageInputSchema = z.object({
  topic: z.string().describe('The main topic of the news article.'),
  category: z.string().describe('The category of the news article (e.g., Technology, Politics).'),
});
export type GenerateArticleImageInput = z.infer<typeof GenerateArticleImageInputSchema>;

const GenerateArticleImageOutputSchema = z.object({
  imageDataUri: z.string().describe('The generated image as a data URI.'),
});
export type GenerateArticleImageOutput = z.infer<typeof GenerateArticleImageOutputSchema>;

export async function generateArticleImage(
  input: GenerateArticleImageInput
): Promise<GenerateArticleImageOutput> {
  return generateArticleImageFlow(input);
}

// This flow does not need a separate prompt object if the prompt is simple and directly used in ai.generate.
const generateArticleImageFlow = ai.defineFlow(
  {
    name: 'generateArticleImageFlow',
    inputSchema: GenerateArticleImageInputSchema,
    outputSchema: GenerateArticleImageOutputSchema,
  },
  async (input) => {
    const prompt = `Generate a visually appealing header image suitable for a news article about "${input.topic}" in the "${input.category}" category. The image should be in a style typically seen with online news. Avoid text in the image. Focus on photorealistic or illustrative styles appropriate for news.`;

    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Crucial: Only this model supports image generation currently
        prompt: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // Must include both TEXT and IMAGE
          // Optional: Adjust safety settings if needed, though default should be okay for news images
          // safetySettings: [
          //   {
          //     category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          //     threshold: 'BLOCK_LOW_AND_ABOVE',
          //   },
          // ],
        },
      });

      if (media && media.url) {
        return { imageDataUri: media.url };
      } else {
        throw new Error('Image generation did not return a valid media URL.');
      }
    } catch (error) {
      console.error('Error generating article image:', error);
      // Provide a more specific error message if possible
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
      throw new Error(`Failed to generate image: ${errorMessage}`);
    }
  }
);
