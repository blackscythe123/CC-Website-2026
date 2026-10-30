import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@coding-club/scrapbook-ui", "@coding-club/content-schema"],
};

export default nextConfig;
