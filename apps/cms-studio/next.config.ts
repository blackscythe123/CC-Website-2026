import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/admin",
        destination: "/admin/index.html",
      },
      {
        source: "/uploads/:path*",
        destination:
          "https://raw.githubusercontent.com/blackscythe123/CC-Website-2026/main/apps/main-portal/public/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
