import type { Metadata } from "next"
import { SITE_URL } from "./entities"
import { buildHreflangLanguages } from "./hreflang"

/**
 * Pages that exist only in Spanish. They publish no /en or /it translation, so
 * their hreflang set is just es-ES + x-default and the other locales answer
 * 404 (see `ensureSpanishLocale`).
 */
export type SpanishOnlySlug =
  | "alberto-carrasco"
  | "desarrollo-software-madrid"
  | "automatizacion-procesos-ia"

export interface SpanishOnlyPageInfo {
  slug: SpanishOnlySlug
  /** Drives the sitemap priority and the AI metadata of the entry. */
  kind: "profile" | "service"
  /** Date the content last changed, not the build date: sitemap lastmod must be truthful. */
  lastModified: string
  /** Short link text for the footer and llms.txt. */
  label: string
  /** One-line description for llms.txt. */
  summary: string
}

export const SPANISH_ONLY_PAGES: readonly SpanishOnlyPageInfo[] = [
  {
    slug: "alberto-carrasco",
    kind: "profile",
    lastModified: "2026-10-20",
    label: "Alberto Carrasco",
    summary:
      "Perfil profesional de Alberto Carrasco, desarrollador y fundador de Evolve2Digital: especialidades, tecnologías, proyectos y contacto.",
  },
  {
    slug: "desarrollo-software-madrid",
    kind: "service",
    lastModified: "2026-10-20",
    label: "Desarrollo de software en Madrid",
    summary:
      "Desarrollo de software a medida para empresas de la Comunidad de Madrid y del resto de España, en remoto: problemas que resuelve, proceso, integraciones, presupuesto y mantenimiento.",
  },
  {
    slug: "automatizacion-procesos-ia",
    kind: "service",
    lastModified: "2026-10-20",
    label: "Automatización de procesos con IA",
    summary:
      "Automatización de procesos con IA: procesos concretos, herramientas conectables, datos necesarios, intervención humana, límites y mantenimiento, con ejemplos etiquetados como caso de cliente, proyecto propio o demostración.",
  },
]

export function spanishOnlyPath(slug: SpanishOnlySlug): string {
  return `/es/${slug}`
}

export function spanishOnlyUrl(slug: SpanishOnlySlug): string {
  return `${SITE_URL}${spanishOnlyPath(slug)}`
}

export function spanishOnlyMetadata({
  slug,
  title,
  description,
}: {
  slug: SpanishOnlySlug
  title: string
  description: string
}): Metadata {
  const url = spanishOnlyUrl(slug)

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: buildHreflangLanguages({ es: url }),
    },
    openGraph: {
      type: "website",
      locale: "es_ES",
      url,
      siteName: "E2D - Evolve2Digital",
      title,
      description,
      images: [{ url: `${SITE_URL}/og-head.jpg`, width: 1200, height: 630, alt: "Evolve2Digital" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og-head.jpg`],
    },
    robots: { index: true, follow: true },
  }
}
