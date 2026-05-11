import { buildBlogAlternates, toAbsoluteAlternates } from "@/lib/blog/alternates"

jest.mock("@/lib/blog/translation-key", () => ({
  findPostsByTranslationKey: jest.fn(),
}))

import { findPostsByTranslationKey } from "@/lib/blog/translation-key"
const mockFind = findPostsByTranslationKey as jest.MockedFunction<typeof findPostsByTranslationKey>

const makePost = (locale: "es" | "en" | "it", slug: string) => ({
  locale,
  slug,
  translationKey: "tk",
  title: slug,
  description: "",
  date: "2026-01-01",
  published: true,
  url: `/${locale}/blog/${slug}`,
  tags: [],
  author: "",
  cover: null,
})

describe("buildBlogAlternates", () => {
  afterEach(() => jest.clearAllMocks())

  test("returns per-locale relative URLs when all siblings exist", async () => {
    mockFind.mockResolvedValue([
      makePost("es", "mi-post"),
      makePost("en", "my-post"),
      makePost("it", "il-mio-post"),
    ])
    const result = await buildBlogAlternates("tk")
    expect(result).toEqual({
      es: "/es/blog/mi-post",
      en: "/en/blog/my-post",
      it: "/it/blog/il-mio-post",
    })
  })

  test("falls back to blog index for locales without a sibling", async () => {
    mockFind.mockResolvedValue([makePost("es", "mi-post")])
    const result = await buildBlogAlternates("tk")
    expect(result.es).toBe("/es/blog/mi-post")
    expect(result.en).toBe("/en/blog")
    expect(result.it).toBe("/it/blog")
  })

  test("falls back to all blog indices when no siblings found", async () => {
    mockFind.mockResolvedValue([])
    const result = await buildBlogAlternates("tk")
    expect(result).toEqual({ es: "/es/blog", en: "/en/blog", it: "/it/blog" })
  })
})

describe("toAbsoluteAlternates", () => {
  test("prepends baseUrl to every relative URL", () => {
    const result = toAbsoluteAlternates(
      { es: "/es/blog/mi-post", en: "/en/blog/my-post" },
      "https://evolve2digital.com"
    )
    expect(result).toEqual({
      es: "https://evolve2digital.com/es/blog/mi-post",
      en: "https://evolve2digital.com/en/blog/my-post",
    })
  })
})
