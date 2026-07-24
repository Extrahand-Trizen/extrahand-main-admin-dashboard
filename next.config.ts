import type { NextConfig } from "next";
import path from "path";

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
  // Set Turbopack root to this directory to resolve RSC manifest lookup issues
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
