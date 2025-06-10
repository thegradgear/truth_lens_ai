
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
    throw new Error("Cloudinary service is not configured. Cannot upload image.");
  }

  try {
    // Generate a somewhat unique public_id using the topic and a timestamp
    const publicIdSuffix = articleTopic ? articleTopic.toLowerCase().replace(/[^a-z0-9_]+/g, '_').substring(0, 30) : 'article';
    const timestamp = Date.now();
    const public_id = `veritas_ai_articles/${publicIdSuffix}_${timestamp}`;

    const result = await cloudinary.uploader.upload(imageDataUri, {
      public_id: public_id,
      folder: 'veritas_ai_articles', // Optional: specify a folder in Cloudinary
      overwrite: true,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary.');
  }
}
