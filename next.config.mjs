import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

// Import env here to validate during build
const jiti = createJiti(fileURLToPath(import.meta.url));

// Validate env variables during build
try {
  await jiti.import("./src/env");
} catch (error) {
  console.error("Error validating environment variables:", error);
  process.exit(1);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: "**", // TODO: Change to the correct hostname later
      },
    ],
  },
};

export default nextConfig;
