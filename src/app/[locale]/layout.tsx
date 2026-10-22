import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Outfit, Readex_Pro } from "next/font/google";
import "../globals.css";
import LenisProvider from "@/components/providers/LenisProvider";
import { routing, localeDirection, type Locale } from "@/i18n/routing";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap"
});

// Arabic-only face: don't preload it for every visitor. The browser still
// fetches it on demand (unicode-range) as soon as Arabic glyphs are rendered,
// so /ar is unaffected while /en saves a render-blocking-priority font request.
const readexPro = Readex_Pro({
  subsets: ["arabic"],
  variable: "--font-readex",
  display: "swap",
  preload: false
});

/** Pre-render one static shell per locale. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** `viewport-fit=cover` lets the page paint under notches; the CSS then pads
 *  fixed UI with `env(safe-area-inset-*)` (see --safe-* in globals.css). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

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
      className={`${outfit.variable} ${readexPro.variable}`}
      suppressHydrationWarning
    >
      <body className={`${outfit.variable} ${readexPro.variable}`} suppressHydrationWarning>
        <NextIntlClientProvider>
          <LenisProvider>{children}</LenisProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
