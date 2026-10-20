/** @jest-environment node */
import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

// Estos componentes cargan scripts de terceros o dependen del navegador; el
// test solo comprueba el documento que los envuelve, no su comportamiento.
jest.mock("@/components/performance/preload-resources", () => ({ PreloadResources: () => null }))
jest.mock("@/components/analytics/google-analytics", () => ({ GoogleAnalytics: () => null }))
jest.mock("@/components/analytics/apollo-tracker", () => ({ ApolloTracker: () => null }))
jest.mock("@/components/analytics/openai-pixel", () => ({ OpenAIPixel: () => null }))
jest.mock("@/components/gdpr/cookie-banner", () => ({ CookieBanner: () => null }))
jest.mock("@/components/debug/debug-provider", () => ({ DebugProvider: () => null }))
// Se listan todos los nombres que ha exportado o exportará el módulo de schemas
// para que el mock siga valiendo cuando el layout cambie de uno a otro.
jest.mock("@/components/seo/json-ld", () => ({
  OrganizationSchema: () => null,
  ServiceSchema: () => null,
  WebsiteSchema: () => null,
  SiteGraphSchema: () => null,
  BreadcrumbSchema: () => null,
  BlogPostSchema: () => null,
}))

import { HtmlDocument } from "@/components/layout/html-document"
import RootLayout from "@/app/layout"
import LocaleLayout from "@/app/[locale]/layout"
import AdminLayout from "@/app/admin/layout"
import AuthorizeLayout from "@/app/authorize/layout"
import EsLayout from "@/app/es/layout"
import NotFound from "@/app/not-found"

const render = (node: ReactElement) => renderToStaticMarkup(node)

describe("HtmlDocument", () => {
  it.each(["es", "en", "it"])("renders <html lang> from its prop (%s)", (lang) => {
    const html = render(
      <HtmlDocument lang={lang}>
        <p>x</p>
      </HtmlDocument>,
    )
    expect(html).toContain(`<html lang="${lang}"`)
    expect(html).toContain("<body")
    expect(html).toContain("<p>x</p>")
  })

  it("keeps the dark class and the preconnect hints in <head>", () => {
    const html = render(<HtmlDocument lang="es">{null}</HtmlDocument>)
    expect(html).toContain('class="dark"')
    expect(html).toContain('rel="preconnect" href="https://fonts.googleapis.com"')
    expect(html).toContain('rel="dns-prefetch" href="https://bzrcdn.openai.com"')
  })
})

describe("root layout", () => {
  it("does not render <html>, it only passes children through", () => {
    expect(render(RootLayout({ children: <p>x</p> }) as ReactElement)).toBe("<p>x</p>")
  })
})

describe("locale layout", () => {
  it.each(["es", "en", "it"])("passes the route locale to <html> (%s)", async (locale) => {
    const tree = await LocaleLayout({ children: <p>x</p>, params: { locale } })
    const html = render(tree)
    expect(html).toContain(`<html lang="${locale}"`)
    expect(html).toContain("<p>x</p>")
  })
})

describe("non-locale trees have their own document", () => {
  const cases: Array<[string, ReactElement]> = [
    ["app/admin/layout", AdminLayout({ children: <p>x</p> })],
    ["app/authorize/layout", AuthorizeLayout({ children: <p>x</p> })],
    ["app/es/layout", EsLayout({ children: <p>x</p> })],
    ["app/not-found", NotFound()],
  ]

  it.each(cases)('%s renders <html lang="es">', (_name, tree) => {
    expect(render(tree)).toContain('<html lang="es"')
  })

  it("not-found links back to the Spanish home", () => {
    expect(render(NotFound())).toContain('href="/es"')
  })
})
