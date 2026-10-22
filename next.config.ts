import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points at src/i18n/request.ts by default.
const withNextIntl = createNextIntlPlugin();

// Everything in /public is served by Next with `max-age=0`, so every repeat
// visit revalidated every image/video. These are content-addressed by path
// and rarely change; a day of freshness plus a week of stale-while-revalidate
// keeps swaps (same-path replacements) visible within a day.
const staticAssetCache = [
  { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/images/:path*', headers: staticAssetCache },
      { source: '/:file(.+\\.(?:webm|mp4|webp))', headers: staticAssetCache },
    ];
  },
  allowedDevOrigins: ['*.trycloudflare.com', 'trycloudflare.com'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Optimised variants are cheap to keep; the default is only 4h.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: ['three', 'gsap', '@google/genai'],
  },
};

export default withNextIntl(nextConfig);
