import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Enable experimental features for better SSR
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;