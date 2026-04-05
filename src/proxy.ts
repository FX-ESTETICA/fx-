import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['en', 'zh', 'it'];
const defaultLocale = 'en';

// Get the preferred locale from the Accept-Language header
function getLocale(request: NextRequest): string {
  const headers = new Headers(request.headers);
  const acceptLanguage = headers.get('accept-language');
  if (!acceptLanguage) return defaultLocale;

  const languages = new Negotiator({ headers: { 'accept-language': acceptLanguage } }).languages();
  try {
    return match(languages, locales, defaultLocale);
  } catch {
    return defaultLocale;
  }
}

export function proxy(request: NextRequest) {
  // We no longer set or read NEXT_LOCALE cookie. 
  // All language detection is handled statelessly in i18n/request.ts
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|api|favicon.ico|.*\\..*).*)',
  ],
};