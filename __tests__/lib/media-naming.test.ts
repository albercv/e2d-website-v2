// __tests__/lib/media-naming.test.ts
import { slugifyMediaName, SlugifyError } from "@/lib/blog/media-naming"

describe("slugifyMediaName", () => {
  it("lowercases", () => {
    expect(slugifyMediaName("Foo")).toBe("foo")
  })
  it("strips diacritics (NFD)", () => {
    expect(slugifyMediaName("testimonió")).toBe("testimonio")
  })
  it("maps ñ to n and ç to c", () => {
    expect(slugifyMediaName("año")).toBe("ano")
    expect(slugifyMediaName("français")).toBe("francais")
  })
  it("replaces non [a-z0-9_] with underscore", () => {
    expect(slugifyMediaName("foo-bar baz!")).toBe("foo_bar_baz")
  })
  it("collapses repeated underscores", () => {
    expect(slugifyMediaName("foo___bar")).toBe("foo_bar")
  })
  it("trims leading and trailing underscores", () => {
    expect(slugifyMediaName("__foo--bar__")).toBe("foo_bar")
  })
  it("handles full example from spec", () => {
    expect(slugifyMediaName("tesTimonió; Ferdy")).toBe("testimonio_ferdy")
    expect(slugifyMediaName("Año Nuevo!!")).toBe("ano_nuevo")
  })
  it("throws on empty result", () => {
    expect(() => slugifyMediaName("???")).toThrow(SlugifyError)
    expect(() => slugifyMediaName("")).toThrow(SlugifyError)
  })
  it("is idempotent", () => {
    const once = slugifyMediaName("Año Nuevo!!")
    expect(slugifyMediaName(once)).toBe(once)
  })
})
