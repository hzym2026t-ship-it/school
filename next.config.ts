import type { NextConfig } from "next";

// Every page in this app is behind login and shows per-user data, so pages
// render on each request (Cache Components off).
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
