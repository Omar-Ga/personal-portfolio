import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Locale negotiation. Next.js 16 renamed the `middleware` file convention to
 * `proxy`; next-intl's factory is unchanged and still exported as
 * `next-intl/middleware`.
 *
 * Redirects `/` to the visitor's preferred locale and rewrites `/ar/...` onto
 * the `[locale]` segment. English stays on unprefixed URLs
 * (`localePrefix: 'as-needed'`).
 */
export default createMiddleware(routing);

export const config = {
  /**
   * Run locale negotiation on page routes only. Explicitly skips:
   *  - `/api/*`      (the Gemini ephemeral-token route must stay locale-free)
   *  - `/_next/*`    Next.js internals
   *  - `/worklets/*` audio worklets loaded by the voice assistant
   *  - anything containing a dot (static files: videos, images, favicon)
   */
  matcher: '/((?!api|_next|_vercel|worklets|.*\\..*).*)'
};
