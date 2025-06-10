
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        // You might want to make this more specific if you know your cloud name
        // e.g., pathname: `/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/**`,
        // But for that to work reliably, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME must be available during build.
        // A more general pattern is often safer unless strictness is paramount.
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
