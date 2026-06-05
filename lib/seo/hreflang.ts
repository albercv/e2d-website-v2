// Helper compartido para alternates hreflang.
//
// Decisión (audit SEO, fase 2b): formato REGIONAL (es-ES/en-US/it-IT) en head
// y sitemap, unificado para que Google no reciba dos señales distintas para la
// misma URL. Siempre se añade `x-default` apuntando al locale primario (es).

export type AppLocale = "es" | "en" | "it"

/** Mapeo locale → código hreflang regional. */
export const LOCALE_HREFLANG: Record<AppLocale, string> = {
  es: "es-ES",
  en: "en-US",
  it: "it-IT",
}

/**
 * Construye el objeto `languages` (clave hreflang regional → URL) a partir de
 * un mapa {es,en,it}->url, omitiendo locales sin URL y añadiendo `x-default`.
 *
 * x-default = la URL de `xDefaultLocale` (es por defecto); si ese locale no
 * está presente, cae al primer locale disponible (orden de inserción).
 */
export function buildHreflangLanguages(
  urlByLocale: Partial<Record<AppLocale, string>>,
  xDefaultLocale: AppLocale = "es"
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [loc, url] of Object.entries(urlByLocale)) {
    if (url) out[LOCALE_HREFLANG[loc as AppLocale]] = url
  }
  const xDefault = urlByLocale[xDefaultLocale] ?? Object.values(urlByLocale).find(Boolean)
  if (xDefault) out["x-default"] = xDefault
  return out
}

/**
 * Renombra las claves de locale (es/en/it) de un mapa ya construido a su código
 * hreflang regional, preservando `x-default` y cualquier otra clave no-locale.
 * Útil cuando el x-default ya viene calculado (p. ej. el sitemap, que tiene su
 * propia lógica de fallback alfabético).
 */
export function toRegionalHreflangKeys(
  langs: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, url] of Object.entries(langs)) {
    out[LOCALE_HREFLANG[key as AppLocale] ?? key] = url
  }
  return out
}
