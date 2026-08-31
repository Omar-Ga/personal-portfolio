import { defineRouting } from 'next-intl/routing';

/**
 * Central locale definition for the site.
 *
 * `localePrefix: 'as-needed'` keeps the default English site on clean root URLs
 * (`/`, not `/en`) while Arabic lives under `/ar`. Adding a new language only
 * requires appending its code here plus a matching `messages/<code>/` folder.
 */
export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});

export type Locale = (typeof routing.locales)[number];

/** Text direction per locale — consumed by the root layout and the `dir` CSS hooks. */
export const localeDirection: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl'
};

/** Native label for each locale, used by the language switcher. */
export const localeLabels: Record<Locale, { native: string; short: string }> = {
  en: { native: 'English', short: 'EN' },
  ar: { native: 'العربية', short: 'ع' }
};
