import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

// Import env here to validate during build
const jiti = createJiti(fileURLToPath(import.meta.url));
await jiti.import("./src/env");

const nextConfig: NextConfig = {
  /* config options here */
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        hostname: "**", // TODO: Change to the correct hostname later
      },
    ],
  },
};

export default nextConfig;
