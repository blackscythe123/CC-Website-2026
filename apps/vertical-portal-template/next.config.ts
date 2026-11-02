import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@coding-club/content-schema"],
  // CMS Studio commits images to apps/main-portal/public/uploads and writes
  // root-relative /uploads/... links, which this portal does not host itself.
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination:
          "https://raw.githubusercontent.com/blackscythe123/CC-Website-2026/main/apps/main-portal/public/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
