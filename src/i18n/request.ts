import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

/**
 * Every section of the site owns its own JSON file so translations stay
 * reviewable and merge-conflict free. They are stitched back together here
 * into a single namespaced message object, e.g. `hero.json` becomes the
 * `hero` namespace consumed via `useTranslations('hero')`.
 *
 * To add a new section: drop `messages/<locale>/<name>.json` in every locale
 * folder and add `<name>` to this list.
 */
export const NAMESPACES = [
  'meta',
  'nav',
  'boot',
  'hero',
  'services',
  'story',
  'projects',
  'archive',
  'contact',
  'voice',
  'common'
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const loaded = await Promise.all(
    NAMESPACES.map(
      async (namespace) =>
        [
          namespace,
          (await import(`../../messages/${locale}/${namespace}.json`)).default
        ] as const
    )
  );

  return {
    locale,
    messages: Object.fromEntries(loaded)
  };
});
