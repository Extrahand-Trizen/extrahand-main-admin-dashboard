import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'extrahandimages-api.apps.extrahand.in',
      },
    ],
  },
};

export default nextConfig;
