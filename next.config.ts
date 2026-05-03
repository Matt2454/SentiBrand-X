import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Basic Next.js config
  experimental: {
    // Prevent environment variables from being baked into static builds
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  }
};

export default nextConfig;
