import { resolveTargetPath } from "@/components/layout/language-switcher"

describe("resolveTargetPath", () => {
  test("uses context URL when alternate exists for target locale", () => {
    const alternates = { es: "/es/blog/mi-post", en: "/en/blog/my-post", it: "/it/blog/il-mio" }
    expect(resolveTargetPath("/it/blog/il-mio", "es", alternates)).toBe("/es/blog/mi-post")
  })

  test("falls back to naive segment-replace when context is null", () => {
    expect(resolveTargetPath("/es/blog/my-slug", "en", null)).toBe("/en/blog/my-slug")
  })

  test("falls back to naive segment-replace when target locale not in context", () => {
    const alternates = { es: "/es/blog/mi-post" }
    expect(resolveTargetPath("/es/blog/mi-post", "fr", alternates)).toBe("/fr/blog/mi-post")
  })

  test("handles empty pathname gracefully", () => {
    expect(resolveTargetPath("", "en", null)).toBe("/en")
  })
})
