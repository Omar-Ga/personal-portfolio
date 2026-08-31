import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware replacements for the Next.js navigation primitives.
 * Importing `Link` / `useRouter` from here automatically preserves the
 * active locale prefix, so the language switcher and any internal links
 * never drop the user out of their chosen language.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
