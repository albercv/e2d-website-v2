import { WEBSITE_ID, organizationRef, personRef } from "./entities"
import { SPANISH_ONLY_PAGES, spanishOnlyUrl, type SpanishOnlySlug } from "./static-pages"

export type JsonLdNode = Record<string, unknown>

const IN_LANGUAGE = "es-ES"

function contentDate(slug: SpanishOnlySlug): string | undefined {
  return SPANISH_ONLY_PAGES.find((page) => page.slug === slug)?.lastModified
}

/**
 * Nodes of a Spanish-only page. They only point at the entities the layout
 * graph already defines (@id references): redefining Organization or Person
 * here is what created duplicate entities before the 2026-10-20 audit.
 */
export function profilePageNode({ slug, name }: { slug: SpanishOnlySlug; name: string }): JsonLdNode {
  const url = spanishOnlyUrl(slug)
  return {
    "@type": "ProfilePage",
    "@id": `${url}#webpage`,
    url,
    name,
    inLanguage: IN_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: personRef(),
    dateModified: contentDate(slug),
  }
}

interface ServicePageInput {
  slug: SpanishOnlySlug
  name: string
  description: string
  serviceType: string
  areaServed: readonly unknown[]
}

export function servicePageNodes(input: ServicePageInput): JsonLdNode[] {
  const url = spanishOnlyUrl(input.slug)
  const webPage: JsonLdNode = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: IN_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": `${url}#service` },
    dateModified: contentDate(input.slug),
  }
  const service: JsonLdNode = {
    "@type": "Service",
    "@id": `${url}#service`,
    name: input.name,
    description: input.description,
    url,
    serviceType: input.serviceType,
    provider: organizationRef(),
    areaServed: [...input.areaServed],
  }
  return [webPage, service]
}

export function pageBreadcrumb(slug: SpanishOnlySlug, name: string): Array<{ name: string; url: string }> {
  return [
    { name: "Inicio", url: "/es" },
    { name, url: spanishOnlyUrl(slug) },
  ]
}
