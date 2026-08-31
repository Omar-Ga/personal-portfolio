import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import LenisProvider from "@/components/providers/LenisProvider";
import { routing, localeDirection, type Locale } from "@/i18n/routing";

/** Pre-render one static shell per locale. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description")
  };
}

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for this locale segment.
  setRequestLocale(locale);

  return (
    // `dir` stays LTR so the GSAP horizontal-scroll track, xPercent marquees and
    // slanted archive columns keep their authored direction. Arabic text flow is
    // handled per text-block via the `html[lang="ar"]` rules in globals.css.
    <html
      lang={locale}
      dir="ltr"
      data-locale={locale}
      data-text-dir={localeDirection[locale as Locale]}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <NextIntlClientProvider>
          <LenisProvider>{children}</LenisProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
