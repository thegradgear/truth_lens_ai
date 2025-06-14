
'use server';

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageToCloudinary(
  imageDataUri: string,
  articleTopic?: string
): Promise<string> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Cloudinary environment variables are not fully configured.");
    throw new Error("Cloudinary service is not configured. Cannot upload image. Please contact support.");
  }

  try {
    const publicIdSuffix = articleTopic ? articleTopic.toLowerCase().replace(/[^a-z0-9_]+/g, '_').substring(0, 30) : 'article';
    const timestamp = Date.now();
    const public_id = `veritas_ai_articles/${publicIdSuffix}_${timestamp}`;

    const result = await cloudinary.uploader.upload(imageDataUri, {
      public_id: public_id,
      folder: 'veritas_ai_articles', 
      overwrite: true,
      resource_type: 'image',
    });

    if (!result || !result.secure_url) {
        console.error('Cloudinary upload result missing secure_url:', result);
        throw new Error('Image uploaded, but Cloudinary did not return a valid URL. Please try again or contact support.');
    }
    return result.secure_url;
  } catch (error: any) {
    console.error('Error uploading image to Cloudinary:', JSON.stringify(error, null, 2));
    let errorMessage = 'Failed to upload image to Cloudinary.';
    if (error.message) {
      errorMessage += ` Details: ${error.message}`;
    } else if (error.error && error.error.message) { // Cloudinary often nests error messages
      errorMessage += ` Details: ${error.error.message}`;
    } else {
      errorMessage += ' An unknown error occurred with the image storage service.';
    }
    // Avoid exposing too much technical detail from Cloudinary error objects to the client
    // but provide a hint if it's a common issue.
    if (errorMessage.includes('Rate limit exceeded') || (error.http_code && error.http_code === 429)) {
        throw new Error('Image upload service is busy. Please try again in a few moments.');
    }
    if (errorMessage.includes('Invalid image file') || (error.http_code && error.http_code === 400)) {
        throw new Error('The generated image data was invalid for upload. The AI might have produced a corrupted image. Please try generating again.');
    }
    throw new Error(errorMessage);
  }
}

