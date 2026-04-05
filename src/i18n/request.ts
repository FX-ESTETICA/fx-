import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

export const locales = ['en', 'zh', 'it'];
export const defaultLocale = 'en';

export default getRequestConfig(async () => {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  
  let locale = defaultLocale;
  
  if (acceptLanguage) {
    try {
      const languages = new Negotiator({ headers: { 'accept-language': acceptLanguage } }).languages();
      locale = match(languages, locales, defaultLocale);
    } catch {
      locale = defaultLocale;
    }
  }

  // Double check if the locale is actually supported
  if (!locales.includes(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
