import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Image optimization settings
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
