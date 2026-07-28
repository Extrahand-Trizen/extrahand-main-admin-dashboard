import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML/CSS/JS for MinIO / CDN hosting (upload the `out/` folder)
  output: "export",
  trailingSlash: true,
  // Absolute /_next paths for custom-domain root hosting
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "extrahandimages-api.apps.extrahand.in",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
