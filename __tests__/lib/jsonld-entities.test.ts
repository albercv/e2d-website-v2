/**
 * @jest-environment node
 *
 * Audit 2026-10-20: the site published two Organization ids (#org / #organization),
 * unverified social profiles and a fake modification date. These tests pin one
 * entity id per real-world entity and only evidence-backed profiles.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { JsonLdGenerator, defaultJsonLdConfig } from "@/lib/json-ld-generator"
import { SiteGraphSchema } from "@/components/seo/json-ld"
import {
  CONTACT_ANCHOR,
  ORGANIZATION_ID,
  ORGANIZATION_SAME_AS,
  PERSON_ID,
  PERSON_NAME,
  PERSON_PROFILE_URL,
  PERSON_SAME_AS,
  PORTFOLIO_URL_BY_LOCALE,
  SITE_URL,
  WEBSITE_ID,
  organizationRef,
  personRef,
} from "@/lib/seo/entities"

type Json = Record<string, unknown>

const LOCALES = ["es", "en", "it"] as const
const generator = new JsonLdGenerator(defaultJsonLdConfig)

// Property that points at an entity -> the id it must carry.
const REFERENCE_KEYS: Record<string, string> = {
  founder: PERSON_ID,
  author: PERSON_ID,
  creator: PERSON_ID,
  worksFor: ORGANIZATION_ID,
  publisher: ORGANIZATION_ID,
  provider: ORGANIZATION_ID,
}
const TYPE_IDS: Record<string, string> = { Organization: ORGANIZATION_ID, Person: PERSON_ID }

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Every object found anywhere in the tree, with the key that holds it. */
function walk(value: unknown, key = "", out: Array<{ key: string; node: Json }> = []) {
  if (Array.isArray(value)) value.forEach((item) => walk(item, key, out))
  else if (isObject(value)) {
    out.push({ key, node: value })
    Object.entries(value).forEach(([k, v]) => walk(v, k, out))
  }
  return out
}

function graph(locale: string) {
  return generator.generateSiteGraph(locale) as { "@context": string; "@graph": Json[] }
}

function nodeOfType(locale: string, type: string): Json {
  const found = graph(locale)["@graph"].find((n) => n["@type"] === type)
  if (!found) throw new Error(`no ${type} node in graph`)
  return found
}

describe.each(LOCALES)("generateSiteGraph(%s)", (locale) => {
  it("is one @graph with Organization, Person, WebSite and Service, no nested @context", () => {
    const g = graph(locale)
    expect(g["@context"]).toBe("https://schema.org")
    expect(g["@graph"].map((n) => n["@type"])).toEqual(["Organization", "Person", "WebSite", "Service"])
    g["@graph"].forEach((n) => expect(n).not.toHaveProperty("@context"))
  })

  it("every Organization node or reference uses ORGANIZATION_ID", () => {
    const refs = walk(graph(locale)["@graph"])
    const orgs = refs.filter(({ key, node }) => node["@type"] === "Organization" || REFERENCE_KEYS[key] === ORGANIZATION_ID)
    expect(orgs.length).toBeGreaterThan(0)
    orgs.forEach(({ node }) => expect(node["@id"]).toBe(ORGANIZATION_ID))
  })

  it("every Person node or reference uses PERSON_ID", () => {
    const refs = walk(graph(locale)["@graph"])
    const people = refs.filter(({ key, node }) => node["@type"] === "Person" || REFERENCE_KEYS[key] === PERSON_ID)
    expect(people.length).toBeGreaterThan(0)
    people.forEach(({ node }) => expect(node["@id"]).toBe(PERSON_ID))
  })

  it("typed entity nodes always carry the id of their type", () => {
    walk(graph(locale)["@graph"])
      .filter(({ node }) => typeof node["@type"] === "string" && node["@type"] in TYPE_IDS)
      .forEach(({ node }) => expect(node["@id"]).toBe(TYPE_IDS[node["@type"] as string]))
  })

  it("no unverified profile is published", () => {
    const serialized = JSON.stringify(graph(locale))
    for (const forbidden of ["albertocarrasco", "twitter.com", "es.linkedin.com"]) {
      expect(serialized).not.toContain(forbidden)
    }
    const personSameAs = nodeOfType(locale, "Person").sameAs as string[]
    const orgSameAs = nodeOfType(locale, "Organization").sameAs as string[]
    expect(personSameAs).toEqual(PERSON_SAME_AS)
    expect(orgSameAs).toEqual(ORGANIZATION_SAME_AS)
    PERSON_SAME_AS.forEach((url) => expect(orgSameAs).not.toContain(url))
    ORGANIZATION_SAME_AS.forEach((url) => expect(personSameAs).not.toContain(url))
  })

  it("old identifiers are gone", () => {
    const serialized = JSON.stringify(graph(locale))
    expect(serialized).not.toMatch(/#org"/)
    expect(serialized).not.toMatch(/\/#organization/)
  })

  it("location is a locality, coverage is areaServed", () => {
    const org = nodeOfType(locale, "Organization")
    expect(org.address).toEqual({ "@type": "PostalAddress", addressCountry: "ES", addressLocality: "Madrid" })
    expect(org.areaServed).toEqual(["ES", "EU"])
    expect(nodeOfType(locale, "Service").areaServed).toEqual(["ES", "EU"])
    expect(org).not.toHaveProperty("serviceArea")
    expect(nodeOfType(locale, "Person")).not.toHaveProperty("alumniOf")
  })

  it("contact action points at the home contact section", () => {
    const org = nodeOfType(locale, "Organization") as { potentialAction: { target: string } }
    expect(org.potentialAction.target).toBe(`https://evolve2digital.com/${locale}#contact`)
    expect(CONTACT_ANCHOR).toBe("contact")
  })

  it("website search uses the blog q param", () => {
    const site = nodeOfType(locale, "WebSite") as { potentialAction: { target: { urlTemplate: string } } }
    expect(site.potentialAction.target.urlTemplate).toBe(
      `https://evolve2digital.com/${locale}/blog?q={search_term_string}`
    )
  })

  it("no fabricated modification dates", () => {
    const org = nodeOfType(locale, "Organization") as { hasPart: Json[] }
    expect(org.hasPart.length).toBeGreaterThan(0)
    org.hasPart.forEach((part) => expect(part).not.toHaveProperty("dateModified"))
  })

  it("Person profile, WebSite and founder point at the shared entities", () => {
    const person = nodeOfType(locale, "Person")
    expect(person.url).toBe(PERSON_PROFILE_URL)
    expect(person.mainEntityOfPage).toBe(PERSON_PROFILE_URL)
    expect(person.worksFor).toMatchObject(organizationRef())
    const site = nodeOfType(locale, "WebSite")
    expect(site["@id"]).toBe(WEBSITE_ID)
    expect(site.publisher).toEqual(organizationRef())
    expect(nodeOfType(locale, "Organization").founder).toMatchObject(personRef())
    expect(nodeOfType(locale, "Service").provider).toEqual(organizationRef())
  })
})

describe("shared entity constants", () => {
  it("expose the decided ids and URLs", () => {
    expect(SITE_URL).toBe("https://evolve2digital.com")
    expect(ORGANIZATION_ID).toBe("https://evolve2digital.com#organization")
    expect(PERSON_ID).toBe("https://evolve2digital.com#person")
    expect(WEBSITE_ID).toBe("https://evolve2digital.com#website")
    expect(PERSON_PROFILE_URL).toBe("https://evolve2digital.com/es/alberto-carrasco")
    expect(PERSON_SAME_AS).toEqual(["https://github.com/albercv", "https://www.linkedin.com/in/albercv/"])
    expect(ORGANIZATION_SAME_AS).toEqual([
      "https://www.instagram.com/evolve2digital/",
      "https://www.tiktok.com/@evolve2digital",
      "https://x.com/evolve2digital_",
    ])
    expect(PORTFOLIO_URL_BY_LOCALE).toEqual({
      es: "https://e2dprojects.com/es/",
      en: "https://e2dprojects.com/en/",
      it: "https://e2dprojects.com/en/",
    })
    expect(organizationRef()).toEqual({ "@id": ORGANIZATION_ID })
    expect(personRef()).toEqual({ "@id": PERSON_ID })
  })
})

describe("BlogPosting author", () => {
  const basePost = {
    title: "Título",
    description: "Descripción",
    datePublished: "2026-01-01",
    url: "/es/blog/post",
    locale: "es",
  }

  it("links Alberto Carrasco to #person and the post publisher to #organization", () => {
    const schema = generator.generateBlogPostSchema({ ...basePost, author: "Alberto Carrasco" }) as {
      author: Json
      publisher: Json
    }
    expect(schema.author["@id"]).toBe(PERSON_ID)
    expect(schema.author.url).toBe(PERSON_PROFILE_URL)
    expect(schema.publisher["@id"]).toBe(ORGANIZATION_ID)
  })

  it("foreign author is not linked to #person", () => {
    const schema = generator.generateBlogPostSchema({ ...basePost, author: "Otra Persona" }) as { author: Json }
    expect(schema.author).not.toHaveProperty("@id")
    expect(schema.author).not.toHaveProperty("url")
    expect(schema.author.name).toBe("Otra Persona")
    expect(PERSON_NAME).toBe("Alberto Carrasco")
  })
})

describe("SiteGraphSchema", () => {
  it("renders one ld+json script carrying the whole graph", () => {
    const html = renderToStaticMarkup(SiteGraphSchema({ locale: "es" }))
    expect(html.match(/application\/ld\+json/g)).toHaveLength(1)
    const json = html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "")
    expect(JSON.parse(json)).toEqual(JSON.parse(JSON.stringify(graph("es"))))
  })
})
