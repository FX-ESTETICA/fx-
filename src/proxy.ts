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
  // Check if there is any supported locale in the pathname
  // const { pathname } = request.nextUrl;
  
  // Check if NEXT_LOCALE cookie exists
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  
  if (cookieLocale && locales.includes(cookieLocale)) {
    return NextResponse.next();
  }

  // If no cookie, detect from Accept-Language
  const detectedLocale = getLocale(request);
  
  const response = NextResponse.next();
  response.cookies.set('NEXT_LOCALE', detectedLocale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: 'lax',
  });
  
  return response;
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|api|favicon.ico|.*\\..*).*)',
  ],
};