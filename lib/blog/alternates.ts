// Resolución de URLs alternativas por locale para una vista de detalle del
// blog. Reúne la lógica que antes estaba duplicada (con el bug del slug
// untranslated) entre `generateMetadata.alternates.languages` y el
// `LanguageSwitcher`. Una sola fuente de verdad por translationKey.

import { findPostsByTranslationKey } from "./translation-key"
import type { RuntimeLocale } from "./posts-runtime"

export type BlogLocaleAlternates = Partial<Record<RuntimeLocale, string>>

const SUPPORTED_LOCALES: readonly RuntimeLocale[] = ["es", "en", "it"] as const

/**
 * Devuelve un mapa `{ locale: relativeUrl }` con las URLs hermanas de un post
 * dado por `translationKey`. Para locales sin sibling, cae al índice del blog
 * en ese locale (el LanguageSwitcher prefiere "ir al listado del idioma" antes
 * que "404 silencioso"). Las URLs son relativas (sin baseUrl); quien necesite
 * absolutas las componga arriba.
 */
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

/**
 * Convierte un mapa de URLs relativas en absolutas con `baseUrl` delante.
 * Útil para `metadata.alternates.languages` (que exige URLs absolutas para
 * los hreflang).
 */
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
