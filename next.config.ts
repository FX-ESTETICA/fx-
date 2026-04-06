import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const bunnyHost = process.env.NEXT_PUBLIC_CDN_HOST || "";
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : "";
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "places.googleapis.com", pathname: "/**" },
      { protocol: "https", hostname: "api.dicebear.com", pathname: "/**" },
      ...(bunnyHost ? [{ protocol: "https" as const, hostname: bunnyHost, pathname: "/**" }] : []),
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/**" }] : []),
    ],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return [
      { source: '/1', destination: '/' },
      { source: '/2', destination: '/login' },
      { source: '/3', destination: '/dashboard' },
      { source: '/5', destination: '/discovery' },
      { source: '/6', destination: '/nebula' },
      { source: '/7', destination: '/calendar' },
      { source: '/8', destination: '/analytics' },
    ];
  },
};

export default withNextIntl(nextConfig);
