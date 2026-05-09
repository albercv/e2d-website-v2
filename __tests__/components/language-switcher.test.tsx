import { resolveTargetPath } from "@/components/layout/language-switcher"

describe("resolveTargetPath", () => {
  it("usa el alternate del context si existe para el locale destino", () => {
    const out = resolveTargetPath(
      "/it/blog/anthropic-colossus-piu-compute-per-claude",
      "es",
      {
        es: "/es/blog/anthropic-colossus-mas-compute-para-claude",
        en: "/en/blog/anthropic-colossus-more-compute-for-claude",
        it: "/it/blog/anthropic-colossus-piu-compute-per-claude",
      }
    )
    expect(out).toBe("/es/blog/anthropic-colossus-mas-compute-para-claude")
  })

  it("cae al patrón naive (replace segmento) si no hay context", () => {
    const out = resolveTargetPath("/it/servizi/automazione", "es", null)
    expect(out).toBe("/es/servizi/automazione")
  })

  it("cae al naive si el context no cubre el locale destino", () => {
    const out = resolveTargetPath("/it/blog/x", "en", { es: "/es/blog/y" })
    expect(out).toBe("/en/blog/x")
  })

  it("default a /<locale> si el pathname está vacío y no hay context", () => {
    const out = resolveTargetPath("", "it", null)
    expect(out).toBe("/it")
  })
})
