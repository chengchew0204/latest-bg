import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Remove experimental optimizeCss to fix Vercel build issue
  // experimental: {
  //   optimizeCss: true,
  // },
};

export default nextConfig;