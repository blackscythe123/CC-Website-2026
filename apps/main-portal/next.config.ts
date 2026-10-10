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
};

export default nextConfig;
