import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
    dangerouslyAllowSVG: true,
  },
  allowedDevOrigins: ["192.168.1.100"],
  rewrites: async () => ({
    fallback: [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL ?? "http://localhost:8080"}/:path*`,
      },
    ],
  }),
};

export default nextConfig;
