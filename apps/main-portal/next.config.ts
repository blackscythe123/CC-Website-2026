import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@coding-club/scrapbook-ui"],
  turbopack: {
    rules: {
      "*.css": {
        // Preserve native CSS Module exports (JoinUs imports its scoped class map).
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Tells Vercel and Next.js to trace content files from the root of the monorepo
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "https://cc-cms-studio.vercel.app/admin",
        permanent: false,
      },
      {
        source: "/admin/:path*",
        destination: "https://cc-cms-studio.vercel.app/admin/:path*",
        permanent: false,
      },
      {
        source: "/blog/club",
        destination: "/blog",
        permanent: false,
      },
      {
        source: "/blog/:vertical",
        destination: "/verticals/:vertical",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
