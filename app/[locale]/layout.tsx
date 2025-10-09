import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { I18nProvider } from '@/lib/i18n/provider';
import { getMessages } from '@/lib/i18n/getMessages';
import type { Locale } from '@/lib/i18n/locales';
import ApiWarmer from '@/components/ApiWarmer';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const messages = await getMessages(params.locale);
  return {
    title: messages.meta?.title ?? 'GameGrid',
    description: messages.meta?.description ?? 'Create your game preference grid',
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
      <Analytics />
      <ApiWarmer />
      <body className={inter.className}>
        <I18nProvider locale={params.locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

