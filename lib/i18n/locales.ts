export type Locale =
  | 'zh-CN'
  | 'zh-TW'
  | 'en'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'it'
  | 'ru'
  | 'nl'
  | 'pl'
  | 'tr';

export const locales: Locale[] = [
  'zh-CN',
  'zh-TW',
  'en',
  'ja',
  'ko',
  'fr',
  'de',
  'es',
  'pt',
  'it',
  'ru',
  'nl',
  'pl',
  'tr',
];

export const defaultLocale: Locale = 'zh-CN';

// Map common language tags to our supported locales
const langMap: Record<string, Locale> = {
  'zh-CN': 'zh-CN',
  'zh': 'zh-CN',
  'zh-Hans': 'zh-CN',
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-TW',
  'zh-Hant': 'zh-TW',
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  ja: 'ja',
  'ja-JP': 'ja',
  ko: 'ko',
  'ko-KR': 'ko',
  fr: 'fr',
  'fr-FR': 'fr',
  de: 'de',
  'de-DE': 'de',
  es: 'es',
  'es-ES': 'es',
  pt: 'pt',
  'pt-PT': 'pt',
  'pt-BR': 'pt',
  it: 'it',
  'it-IT': 'it',
  ru: 'ru',
  'ru-RU': 'ru',
  nl: 'nl',
  'nl-NL': 'nl',
  pl: 'pl',
  'pl-PL': 'pl',
  tr: 'tr',
  'tr-TR': 'tr',
};

export function normalizeLocale(tag: string): Locale {
  const exact = locales.find((l) => l.toLowerCase() === tag.toLowerCase());
  if (exact) return exact;
  if ((langMap as any)[tag]) return (langMap as any)[tag];
  const base = tag.split('-')[0];
  if ((langMap as any)[base]) return (langMap as any)[base];
  return defaultLocale;
}

