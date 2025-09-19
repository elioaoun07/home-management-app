// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ don't fail Vercel builds on ESLint
  },
};

export default nextConfig;
