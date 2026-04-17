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

const nextConfig: any = {
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
      { source: '/home', destination: '/' },
      { source: '/discovery', destination: '/' },
      { source: '/calendar', destination: '/' },
      { source: '/calendar/:path*', destination: '/' },
      { source: '/chat', destination: '/' },
      { source: '/me', destination: '/' },
      { source: '/dashboard', destination: '/' },
      
      { source: '/1', destination: '/' },
      { source: '/2', destination: '/login' },
      { source: '/3', destination: '/' }, // mapped to dashboard
      { source: '/5', destination: '/' }, // mapped to discovery
      { source: '/6', destination: '/nebula' },
      { source: '/7', destination: '/' }, // mapped to calendar
      { source: '/8', destination: '/analytics' },
      { source: '/9', destination: '/studio' },
    ];
  },
};

export default withNextIntl(nextConfig);
