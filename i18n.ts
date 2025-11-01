import { getRequestConfig } from "next-intl/server"

// Can be imported from a shared config
export const locales = ["es", "en", "it"]
export const defaultLocale = "es"
export const localePrefix = "always"

export default getRequestConfig(async ({ locale }) => {
  const activeLocale = locales.includes(locale as any) ? (locale as string) : defaultLocale

  return {
    locale: activeLocale,
    messages: (await import(`./messages/${activeLocale}.json`)).default,
  }
})
