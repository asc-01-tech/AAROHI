import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Allow local network and phone access in development
    allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.13', '*.local'],

    // Enable standalone only in production build environments if needed
    ...(process.env.BUILD_STANDALONE === 'true' ? { output: 'standalone' } : {}),

    // Optimize images: avif + webp, no dangerous domains needed (all emojis/SVG)
    images: {
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [390, 640, 750, 828, 1080, 1200],
      minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year for immutable images
    },

    // Explicitly allow firebase-admin and native modules on server
    serverExternalPackages: [
      'firebase-admin',
      '@google/genai',
      'twilio',
      'nodemailer',
    ],

    turbopack: {},

    // Experimental features
    experimental: {
    },
  };

  export default nextConfig;
