import { findPostsByTranslationKey } from "./translation-key"
import type { RuntimeLocale } from "./posts-runtime"

export type BlogLocaleAlternates = Partial<Record<RuntimeLocale, string>>

const SUPPORTED_LOCALES: readonly RuntimeLocale[] = ["es", "en", "it"] as const

export async function buildBlogAlternates(
  translationKey: string
): Promise<BlogLocaleAlternates> {
  const siblings = await findPostsByTranslationKey(translationKey)
  const bySlug = new Map<RuntimeLocale, string>()
  for (const post of siblings) {
    bySlug.set(post.locale, post.slug)
  }

  const out: BlogLocaleAlternates = {}
  for (const locale of SUPPORTED_LOCALES) {
    const slug = bySlug.get(locale)
    out[locale] = slug ? `/${locale}/blog/${slug}` : `/${locale}/blog`
  }
  return out
}

export function toAbsoluteAlternates(
  alternates: BlogLocaleAlternates,
  baseUrl: string
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [locale, relative] of Object.entries(alternates)) {
    if (relative) out[locale] = `${baseUrl}${relative}`
  }
  return out
}
