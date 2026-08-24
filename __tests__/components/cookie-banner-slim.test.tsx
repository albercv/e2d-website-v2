/** @jest-environment jsdom */
import { render } from "@testing-library/react"
import { CookieBanner } from "@/components/gdpr/cookie-banner"
import { NextIntlClientProvider } from "next-intl"
import es from "@/messages/es.json"

function renderBanner() {
  localStorage.clear()
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <CookieBanner />
    </NextIntlClientProvider>
  )
}

describe("cookie banner mobile footprint", () => {
  it("clamps the description on small screens", () => {
    const { container } = renderBanner()
    const desc = container.querySelector("p")
    expect(desc?.className).toContain("line-clamp-2")
  })

  it("uses compact padding on mobile", () => {
    const { container } = renderBanner()
    expect(container.innerHTML).toContain("p-3")
  })
})
