/** @jest-environment jsdom */
import { render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom"

const redirectMock = jest.fn()
jest.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}))

import Page, { metadata } from "@/app/[locale]/privacy/prospeccion/page"

describe("Anexo de prospección comercial — render (locale es)", () => {
  beforeEach(() => {
    redirectMock.mockClear()
  })

  it("renders the h1 and the annex eyebrow/back link", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Prospección comercial de empresas y profesionales",
      })
    ).toBeInTheDocument()
    expect(screen.getByText("Anexo a la política de privacidad")).toBeInTheDocument()
    const backLink = screen.getByRole("link", { name: /Política de privacidad/i })
    expect(backLink).toHaveAttribute("href", "/es/privacy")
  })

  it("renders the responsable's NIF", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText(/51095475D/)).toBeInTheDocument()
  })

  it("renders both mailto links to hello@evolve2digital.com", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    const mailLinks = screen.getAllByRole("link", { name: "hello@evolve2digital.com" })
    expect(mailLinks).toHaveLength(2)
    for (const link of mailLinks) {
      expect(link).toHaveAttribute("href", "mailto:hello@evolve2digital.com")
    }
  })

  it("renders the AEPD link opening in a new tab", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    const aepdLink = screen.getByRole("link", { name: "www.aepd.es" })
    expect(aepdLink).toHaveAttribute("href", "https://www.aepd.es")
    expect(aepdLink).toHaveAttribute("target", "_blank")
    expect(aepdLink.getAttribute("rel")).toEqual(expect.stringContaining("noopener"))
  })

  it("renders the recipients table with 4 body rows", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    const table = screen.getByRole("table")
    const rowHeaders = within(table).getAllByRole("rowheader")
    expect(rowHeaders).toHaveLength(4)
    expect(rowHeaders.map((el) => el.textContent)).toEqual([
      "Apify",
      "Google",
      "Anthropic, a través de su API (cuando se active esta fase)",
      "Anthropic, a través de la suscripción Claude (cuando se active esta fase)",
    ])
  })

  it("renders the contact section wording", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(screen.getByText(/les enviamos un único email/)).toBeInTheDocument()
  })

  it("exposes deep-link anchors for oposicion and derechos", async () => {
    const { container } = render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(container.querySelector("#oposicion")).not.toBeNull()
    expect(container.querySelector("#derechos")).not.toBeNull()
  })

  it("does not redirect for locale es", async () => {
    render(await Page({ params: Promise.resolve({ locale: "es" }) }))
    expect(redirectMock).not.toHaveBeenCalled()
  })
})

describe("Anexo de prospección comercial — redirect for non-es locales", () => {
  beforeEach(() => {
    redirectMock.mockClear()
  })

  it("redirects en to /es/privacy/prospeccion", async () => {
    await Page({ params: Promise.resolve({ locale: "en" }) })
    expect(redirectMock).toHaveBeenCalledWith("/es/privacy/prospeccion")
  })

  it("redirects it to /es/privacy/prospeccion", async () => {
    await Page({ params: Promise.resolve({ locale: "it" }) })
    expect(redirectMock).toHaveBeenCalledWith("/es/privacy/prospeccion")
  })
})

describe("Anexo de prospección comercial — metadata", () => {
  it("es: canonical, hreflang and robots index true", () => {
    const meta = metadata
    expect(meta.alternates?.canonical).toBe("https://evolve2digital.com/es/privacy/prospeccion")
    expect(meta.robots).toMatchObject({ index: true, follow: true })
    expect(meta.title).toBe("Anexo de privacidad: prospección comercial | E2D - Evolve2Digital")
  })
})
