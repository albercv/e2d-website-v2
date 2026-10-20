/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import type { Metadata } from "next"
import type { ReactElement } from "react"

// notFound() de Next lanza una excepción especial; aquí basta un error
// reconocible para comprobar que las páginas lo invocan.
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND")
})
jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  usePathname: () => "/es/alberto-carrasco",
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock("@/components/contact/contact-modal", () => ({ ContactModal: () => null }))

import ProfilePage, { generateMetadata as profileMetadata } from "@/app/[locale]/alberto-carrasco/page"
import SoftwarePage, { generateMetadata as softwareMetadata } from "@/app/[locale]/desarrollo-software-madrid/page"
import AutomationPage, { generateMetadata as automationMetadata } from "@/app/[locale]/automatizacion-procesos-ia/page"
import { SpanishOnlyPage } from "@/components/pages/spanish-only-page"
import { useLocaleAlternates } from "@/components/layout/locale-alternates-context"
import { resolveTargetPath } from "@/components/layout/language-switcher"
import { SPANISH_ONLY_PAGES, spanishOnlyUrl } from "@/lib/seo/static-pages"
import { metadata as rootMetadata } from "@/app/layout"
import {
  AREA_SERVED,
  ORGANIZATION_ID,
  PERSON_ID,
  PERSON_PROFILE_URL,
  WEBSITE_ID,
} from "@/lib/seo/entities"

type JsonNode = { "@type"?: string; "@id"?: string; [key: string]: unknown }
type PageProps = { params: Promise<{ locale: string }> }

interface PageModule {
  slug: string
  Page: (props: PageProps) => Promise<ReactElement>
  generateMetadata: () => Metadata
  titleIncludes: string
}

const PAGES: PageModule[] = [
  {
    slug: "alberto-carrasco",
    Page: ProfilePage,
    generateMetadata: profileMetadata,
    titleIncludes: "Alberto Carrasco",
  },
  {
    slug: "desarrollo-software-madrid",
    Page: SoftwarePage,
    generateMetadata: softwareMetadata,
    titleIncludes: "Madrid",
  },
  {
    slug: "automatizacion-procesos-ia",
    Page: AutomationPage,
    generateMetadata: automationMetadata,
    titleIncludes: "Automatización",
  },
]

const params = (locale: string): PageProps["params"] => Promise.resolve({ locale })

function readJsonLd(container: HTMLElement): JsonNode[] {
  const nodes: JsonNode[] = []
  container.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    const data = JSON.parse(script.textContent ?? "{}") as JsonNode & { "@graph"?: JsonNode[] }
    nodes.push(...(data["@graph"] ?? [data]))
  })
  return nodes
}

function hrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("a[href]")).map((a) => a.getAttribute("href") ?? "")
}

beforeEach(() => mockNotFound.mockClear())

describe.each(PAGES)("Spanish-only page /es/$slug", ({ slug, Page, generateMetadata, titleIncludes }) => {
  const url = `https://evolve2digital.com/es/${slug}`

  it("has its own title, description, canonical and es-only hreflang", () => {
    const meta = generateMetadata()
    expect(String(meta.title)).toContain(titleIncludes)
    expect(String(meta.title).length).toBeLessThanOrEqual(70)
    expect(String(meta.description).length).toBeGreaterThan(80)
    expect(String(meta.description).length).toBeLessThanOrEqual(170)
    expect(meta.alternates?.canonical).toBe(url)
    expect(meta.alternates?.languages).toEqual({ "es-ES": url, "x-default": url })
    expect(meta.robots).toMatchObject({ index: true, follow: true })
    expect(meta.openGraph).toMatchObject({ locale: "es_ES", url })
  })

  it.each(["en", "it"])("answers notFound() for the %s locale instead of redirecting", async (locale) => {
    await expect(Page({ params: params(locale) })).rejects.toThrow("NEXT_NOT_FOUND")
    expect(mockNotFound).toHaveBeenCalledTimes(1)
  })

  it("renders one h1 and no unfinished or forbidden claims", async () => {
    const { container } = render(await Page({ params: params("es") }))
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    const text = container.textContent ?? ""
    expect(text).not.toMatch(/albar[aá]n/i)
    expect(text).not.toMatch(/linkedin/i)
    expect(text).not.toMatch(/\bpymes?\b/i)
    expect(text).not.toMatch(/a[ñn]os de experiencia/i)
  })

  it("links the page to the BreadcrumbList and keeps it out of the site graph", async () => {
    const { container } = render(await Page({ params: params("es") }))
    const nodes = readJsonLd(container)
    const breadcrumb = nodes.find((n) => n["@type"] === "BreadcrumbList")
    expect(breadcrumb).toBeDefined()
    const items = breadcrumb?.itemListElement as Array<{ item: string }>
    expect(items.map((i) => i.item)).toEqual(["https://evolve2digital.com/es", url])
    // The Organization/Person/WebSite nodes live in the layout graph; pages only point at them.
    for (const type of ["Organization", "Person", "WebSite"]) {
      expect(nodes.find((n) => n["@type"] === type)).toBeUndefined()
    }
  })
})

describe("/es/alberto-carrasco", () => {
  const renderProfile = async () => render(await ProfilePage({ params: params("es") }))

  it("publishes a ProfilePage whose mainEntity is the #person node", async () => {
    const { container } = await renderProfile()
    const profile = readJsonLd(container).find((n) => n["@type"] === "ProfilePage")
    expect(profile).toMatchObject({
      "@id": `${PERSON_PROFILE_URL}#webpage`,
      url: PERSON_PROFILE_URL,
      inLanguage: "es-ES",
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": PERSON_ID },
      dateModified: "2026-10-20",
    })
    expect(String(profile?.name)).toContain("Alberto Carrasco")
  })

  it("links the services, the contact section, the confirmed profiles and the portfolio", async () => {
    const { container } = await renderProfile()
    const links = hrefs(container)
    for (const href of [
      "/es/desarrollo-software-madrid",
      "/es/automatizacion-procesos-ia",
      "/es#contact",
      "https://github.com/albercv",
      "https://e2dprojects.com/es/",
      "mailto:hello@evolve2digital.com",
      "/es/legal",
    ]) {
      expect(links).toContain(href)
    }
  })

  it("lists every shipped project with its public link and the case post", async () => {
    const { container } = await renderProfile()
    const links = hrefs(container)
    for (const href of [
      "https://ferdycoachdesamor.com",
      "https://augustore.es",
      "https://abyfoods.fi",
      "https://archetypex.es",
      "https://e2dprojects.com/villacastin/",
      "/es/blog/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy",
      "/es/blog/llevo-meses-sin-abrir-el-editor-de-mi-blog-publico-hablando-con-claude",
    ]) {
      expect(links).toContain(href)
    }
    expect(links.filter((h) => /linkedin|albertocarrasco/i.test(h))).toEqual([])
  })

  it("labels client cases and own projects apart", async () => {
    await renderProfile()
    expect(screen.getAllByText("Caso de cliente").length).toBeGreaterThanOrEqual(4)
    expect(screen.getAllByText("Proyecto propio").length).toBeGreaterThanOrEqual(3)
  })

  it("has no unverified numbers: no years of experience, education or metrics", async () => {
    const { container } = await renderProfile()
    const text = container.textContent ?? ""
    expect(text).not.toMatch(/\d+\s?%/)
    expect(text).not.toMatch(/universidad|máster|grado en|ingeniero/i)
  })
})

describe.each([
  ["desarrollo-software-madrid", SoftwarePage],
  ["automatizacion-procesos-ia", AutomationPage],
] as const)("service page /es/%s", (slug, Page) => {
  const url = `https://evolve2digital.com/es/${slug}`
  const other =
    slug === "desarrollo-software-madrid" ? "/es/automatizacion-procesos-ia" : "/es/desarrollo-software-madrid"
  const renderPage = async () => render(await Page({ params: params("es") }))

  it("publishes a Service provided by the #organization node, linked from its WebPage", async () => {
    const { container } = await renderPage()
    const nodes = readJsonLd(container)
    const service = nodes.find((n) => n["@type"] === "Service")
    const webPage = nodes.find((n) => n["@type"] === "WebPage")
    expect(service).toMatchObject({
      "@id": `${url}#service`,
      url,
      provider: { "@id": ORGANIZATION_ID },
    })
    expect(String(service?.name).length).toBeGreaterThan(10)
    expect(String(service?.description).length).toBeGreaterThan(40)
    expect(webPage).toMatchObject({
      "@id": `${url}#webpage`,
      url,
      inLanguage: "es-ES",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": `${url}#service` },
      dateModified: "2026-10-20",
    })
  })

  it("links the other service, the profile, the contact section and a published price page", async () => {
    const { container } = await renderPage()
    const links = hrefs(container)
    expect(links).toContain(other)
    expect(links).toContain("/es/alberto-carrasco")
    expect(links).toContain("/es#contact")
    expect(links.filter((h) => h.startsWith("/es/servicios/")).length).toBeGreaterThanOrEqual(1)
  })

  it("does not state any price: figures live only in the published price pages", async () => {
    const { container } = await renderPage()
    expect(container.textContent ?? "").not.toMatch(/\d[\d.,]*\s?(€|euros?)|€\s?\d/i)
  })
})

describe("/es/desarrollo-software-madrid", () => {
  const renderPage = async () => render(await SoftwarePage({ params: params("es") }))

  it("covers the sections the brief asks for", async () => {
    await renderPage()
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    for (const topic of [/Problemas/, /Tipos de proyecto/, /Cómo trabajo/, /Integraciones/, /presupuesto/, /Ejemplos/, /Mantenimiento/]) {
      expect(headings.some((h) => topic.test(h ?? ""))).toBe(true)
    }
  })

  it("serves Madrid as a service area, not as an office", async () => {
    const { container } = await renderPage()
    const service = readJsonLd(container).find((n) => n["@type"] === "Service")
    expect(service?.areaServed).toEqual([{ "@type": "AdministrativeArea", name: "Comunidad de Madrid" }, "ES"])
    const json = JSON.stringify(readJsonLd(container))
    expect(json).not.toMatch(/PostalAddress|"address"|streetAddress|LocalBusiness/)

    const text = container.textContent ?? ""
    expect(text).toContain("Comunidad de Madrid")
    expect(text).toMatch(/en remoto/)
    expect(text).not.toMatch(/oficina|presencial|reuniones en persona|sede/i)
    expect(text).not.toMatch(/Alcobendas|Getafe|Leganés|Móstoles|Alcalá de Henares|Pozuelo|Las Rozas|Fuenlabrada|Torrejón/)
  })

  it("names every published price page and links the client examples", async () => {
    const { container } = await renderPage()
    const links = hrefs(container)
    for (const href of [
      "/es/servicios/agente-ia-chatbot",
      "/es/servicios/consultoria-proyecto-pequeno",
      "/es/servicios/consultoria-proyecto-mediano",
      "/es/servicios/consultoria-proyecto-grande",
      "https://ferdycoachdesamor.com",
      "https://augustore.es",
      "https://abyfoods.fi",
    ]) {
      expect(links).toContain(href)
    }
  })
})

describe("/es/automatizacion-procesos-ia", () => {
  const renderPage = async () => render(await AutomationPage({ params: params("es") }))

  it("serves the whole of Spain and the EU as area, like the rest of the site", async () => {
    const { container } = await renderPage()
    const service = readJsonLd(container).find((n) => n["@type"] === "Service")
    expect(service?.areaServed).toEqual([...AREA_SERVED])
  })

  it("covers processes, tools, data, human intervention, limits and maintenance", async () => {
    await renderPage()
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    for (const topic of [/Procesos/, /Herramientas/, /datos/i, /intervención|persona/i, /Límites/, /Mantenimiento/]) {
      expect(headings.some((h) => topic.test(h ?? ""))).toBe(true)
    }
  })

  it("labels every example as client case, own project or demonstration", async () => {
    await renderPage()
    expect(screen.getAllByText("Caso de cliente").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("Proyecto propio").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("Demostración").length).toBeGreaterThanOrEqual(1)
  })

  it("puts each example under the label that matches the fact sheet", async () => {
    const { container } = await renderPage()
    const cardWith = (href: string) => container.querySelector(`a[href="${href}"]`)?.closest("article")
    expect(cardWith("https://ferdycoachdesamor.com")).toHaveTextContent("Caso de cliente")
    expect(cardWith("/es/blog/llevo-meses-sin-abrir-el-editor-de-mi-blog-publico-hablando-con-claude")).toHaveTextContent(
      "Proyecto propio",
    )
    const demo = cardWith("/es/blog/automatizaciones-para-empresas-con-ia-dos-casos-reales")
    expect(demo).toHaveTextContent("Demostración")
    expect(demo).not.toHaveTextContent("Caso de cliente")
  })

  it("names the connectable tools and the limits of automation", async () => {
    const { container } = await renderPage()
    const text = container.textContent ?? ""
    for (const tool of ["CRM", "ERP", "n8n", "WhatsApp", "Stripe"]) {
      expect(text).toContain(tool)
    }
    expect(text).toMatch(/proveedores/)
    expect(text).toMatch(/APIs de terceros/)
  })
})

describe("SpanishOnlyPage shell", () => {
  function AlternatesProbe() {
    const alternates = useLocaleAlternates()
    return <output data-testid="alternates">{JSON.stringify(alternates)}</output>
  }

  it("sends the language switcher to the home of en and it, never to a missing translation", () => {
    render(
      <SpanishOnlyPage slug="alberto-carrasco">
        <AlternatesProbe />
      </SpanishOnlyPage>,
    )
    const alternates = JSON.parse(screen.getByTestId("alternates").textContent ?? "{}")
    expect(alternates).toEqual({ es: "/es/alberto-carrasco", en: "/en", it: "/it" })
    expect(resolveTargetPath("/es/alberto-carrasco", "en", alternates)).toBe("/en")
    expect(resolveTargetPath("/es/alberto-carrasco", "it", alternates)).toBe("/it")
    expect(resolveTargetPath("/es/alberto-carrasco", "es", alternates)).toBe("/es/alberto-carrasco")
  })

  it("wraps the content in a main landmark between navigation and footer", () => {
    render(
      <SpanishOnlyPage slug="alberto-carrasco">
        <p>contenido</p>
      </SpanishOnlyPage>,
    )
    expect(screen.getByRole("main")).toHaveTextContent("contenido")
    expect(screen.getByRole("navigation")).toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
  })
})

describe("SPANISH_ONLY_PAGES and shared constants", () => {
  it("dates every page with the content date, not the build date", () => {
    for (const page of SPANISH_ONLY_PAGES) {
      expect(page.lastModified).toBe("2026-10-20")
    }
  })

  it("keeps the profile URL identical to the one the #person node publishes", () => {
    expect(spanishOnlyUrl("alberto-carrasco")).toBe(PERSON_PROFILE_URL)
    expect(PERSON_PROFILE_URL).toBe("https://evolve2digital.com/es/alberto-carrasco")
  })

  it("points the root metadata author at the profile page", () => {
    expect(rootMetadata.authors).toEqual([{ name: "Alberto Carrasco", url: PERSON_PROFILE_URL }])
  })

  it("keeps ids stable for the nodes the pages reference", () => {
    expect(ORGANIZATION_ID).toBe("https://evolve2digital.com#organization")
    expect(PERSON_ID).toBe("https://evolve2digital.com#person")
  })
})
