import type { NextConfig } from "next";

const bunnyHost = process.env.NEXT_PUBLIC_CDN_HOST || "";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      ...(bunnyHost ? [{ protocol: "https" as const, hostname: bunnyHost, pathname: "/**" }] : []),
    ],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return [
      { source: '/1', destination: '/' },
      { source: '/2', destination: '/login' },
      { source: '/3', destination: '/dashboard' },
      { source: '/4', destination: '/booking' },
      { source: '/5', destination: '/discovery' },
      { source: '/6', destination: '/nebula' },
      { source: '/7', destination: '/calendar' },
      { source: '/8', destination: '/analytics' },
    ];
  },
};

export default nextConfig;
