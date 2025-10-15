import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, normalizeLocale } from './lib/i18n/locales';

const LOCALE_COOKIE = 'NEXT_LOCALE';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore next internal assets and api routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.match(/\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  // If path already includes a supported locale, continue
  const pathLocale = pathname.split('/')[1];
  if (locales.includes(pathLocale as any)) {
    return NextResponse.next();
  }

  // Determine locale from cookie or Accept-Language
  let finalLocale = request.cookies.get(LOCALE_COOKIE)?.value as any;
  if (!finalLocale || !locales.includes(finalLocale)) {
    const accept = request.headers.get('accept-language') || '';
    const lang = accept.split(',')[0] || '';
    finalLocale = normalizeLocale(lang);
  }

  const response = NextResponse.redirect(
    new URL(`/${finalLocale}${pathname}`, request.url),
    308
  );
  // Signal language-based variations for caches and crawlers
  response.headers.set('Vary', 'Accept-Language');
  response.cookies.set(LOCALE_COOKIE, finalLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  matcher: [
    // Match all paths except those starting with a locale, Next internals, or file extensions
    '/((?!_next/|api/|assets/|.*\..*).*)',
  ],
};
