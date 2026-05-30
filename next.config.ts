import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
  },
  allowedDevOrigins: ["192.168.1.100"],
};

export default nextConfig;
