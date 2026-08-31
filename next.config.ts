import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points at src/i18n/request.ts by default.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['*.trycloudflare.com', 'trycloudflare.com']
};

export default withNextIntl(nextConfig);
