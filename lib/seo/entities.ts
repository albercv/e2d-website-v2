/**
 * Single source of truth for the two real-world entities the site describes
 * (the company and its owner) and the facts every page must agree on.
 *
 * Why a module of its own: before the 2026-10-20 audit the Organization was
 * published under two different @id values (#org / #organization) and the
 * owner under unverified profiles, so crawlers saw several "companies".
 * JSON-LD, metadata, sitemap and page copy now import these constants instead
 * of re-typing them.
 */

export const SITE_URL = "https://evolve2digital.com"

export const ORGANIZATION_ID = `${SITE_URL}#organization`
export const PERSON_ID = `${SITE_URL}#person`
export const WEBSITE_ID = `${SITE_URL}#website`

export const PERSON_NAME = "Alberto Carrasco"
export const PERSON_PROFILE_PATH = "/es/alberto-carrasco"
export const PERSON_PROFILE_URL = `${SITE_URL}${PERSON_PROFILE_PATH}`

/**
 * Only profiles whose ownership was verified (GitHub API: login albercv,
 * company "Evolve2digital"). LinkedIn and the brand profiles stay out until
 * Alberto confirms them: a wrong sameAs merges the entity with a stranger.
 */
export const PERSON_SAME_AS: readonly string[] = ["https://github.com/albercv"]

/** ISO 3166-1 alpha-2 / UN region codes, as schema.org accepts for areaServed. */
export const AREA_SERVED = ["ES", "EU"] as const

/** Element id of the home contact section; JSON-LD ContactAction targets `#<anchor>`. */
export const CONTACT_ANCHOR = "contact"

export type EntityLocale = "es" | "en" | "it"

/** The portfolio has no Italian version, so Italian visitors get the English one. */
export const PORTFOLIO_URL_BY_LOCALE: Record<EntityLocale, string> = {
  es: "https://e2dprojects.com/es/",
  en: "https://e2dprojects.com/en/",
  it: "https://e2dprojects.com/en/",
}

export function organizationRef(): { "@id": string } {
  return { "@id": ORGANIZATION_ID }
}

export function personRef(): { "@id": string } {
  return { "@id": PERSON_ID }
}
