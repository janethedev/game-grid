import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { I18nProvider } from '@/lib/i18n/provider';
import { getMessages } from '@/lib/i18n/getMessages';
import { locales, type Locale } from '@/lib/i18n/locales';
import ApiWarmer from '@/components/ApiWarmer';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const { locale } = params;
  const messages = await getMessages(locale);

  // Build hreflang alternates for all supported locales and a canonical
  const languageAlternates: Record<string, string> = {};
  for (const l of locales) {
    languageAlternates[l] = `/${l}`;
  }
  // Provide x-default to help Google understand the default locale
  languageAlternates['x-default'] = '/';

  return {
    title: messages.meta?.title ?? 'GameGrid',
    description: messages.meta?.description ?? 'Create your game preference grid',
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: 'website',
      title: messages.meta?.title ?? 'GameGrid',
      description: messages.meta?.description ?? 'Create your game preference grid',
      url: `/${locale}`,
      siteName: messages.global?.main_title ?? 'GameGrid',
      locale,
      alternateLocale: locales.filter((l) => l !== locale),
    },
    twitter: {
      card: 'summary',
      title: messages.meta?.title ?? 'GameGrid',
      description: messages.meta?.description ?? 'Create your game preference grid',
    },
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates,
    },
    verification: {
      google: 'swtOMxSQC6Dfn-w4YtMQ3OFH4SZz00Blcd6FI0qMgJc',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const messages = await getMessages(params.locale);
  return (
    <html lang={params.locale}>
      <body className={inter.className}>
        <Analytics />
        <ApiWarmer />
        <I18nProvider locale={params.locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
