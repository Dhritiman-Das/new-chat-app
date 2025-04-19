import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
