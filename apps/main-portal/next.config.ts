import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
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
        destination: "https://ssn-coding-club-cms.vercel.app/admin",
        permanent: false,
      },
      {
        source: "/admin/:path*",
        destination: "https://ssn-coding-club-cms.vercel.app/admin/:path*",
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
