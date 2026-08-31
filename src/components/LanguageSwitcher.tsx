"use client";

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, localeLabels, type Locale } from '@/i18n/routing';
import styles from './LanguageSwitcher.module.css';

interface LanguageSwitcherProps {
  /** `inline` suits the vertical sidebar; `bar` suits the mobile drawer. */
  variant?: 'inline' | 'bar';
  className?: string;
}

export default function LanguageSwitcher({
  variant = 'inline',
  className = ''
}: LanguageSwitcherProps) {
  const t = useTranslations('nav.language');
  const activeLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (locale: Locale) => {
    if (locale === activeLocale) return;
    // `pathname` from @/i18n/navigation is already locale-stripped, so this
    // swaps the prefix while keeping the visitor on the same page.
    router.replace(pathname, { locale });
  };

  return (
    <div
      className={`${styles.switcher} ${styles[variant]} ${className}`}
      role="group"
      aria-label={t('label')}
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'true' : undefined}
            aria-label={t('switchTo', { language: localeLabels[locale].native })}
            onClick={() => switchTo(locale)}
          >
            {localeLabels[locale].short}
          </button>
        );
      })}
    </div>
  );
}
