/**
 * @jest-environment node
 *
 * Verifica que `buildBlogAlternates` resuelve correctamente las URLs hermanas
 * para un translationKey dado, cayendo al índice del blog del locale cuando
 * un sibling no existe. La fixture vive en el tmpdir aislado por el
 * `jest.global-setup.js` (BLOG_POSTS_DIR/CONTENT_ROOT ya seteados).
 */
import * as fs from "fs"
import * as path from "path"

const dir = (): string => {
  const v = process["env"]["BLOG_POSTS_DIR"]
  if (!v) throw new Error("jest.global-setup did not seed BLOG_POSTS_DIR")
  return v
}

function writePost(slug: string, locale: "es" | "en" | "it", translationKey: string) {
  const fm = [
    "---",
    `title: '${slug}'`,
    `description: 'descripcion suficientemente larga para los tests del helper'`,
    `date: 2026-05-09`,
    `locale: ${locale}`,
    `slug: ${slug}`,
    `tags: []`,
    `author: 'Test'`,
    `published: true`,
    `translationKey: ${translationKey}`,
    "---",
    "",
    "Body lorem ipsum suficiente para superar la validación mínima del runtime reader.",
    "",
  ].join("\n")
  fs.writeFileSync(path.join(dir(), `${slug}.mdx`), fm, "utf8")
}

describe("buildBlogAlternates", () => {
  beforeEach(() => {
    fs.mkdirSync(dir(), { recursive: true })
    for (const f of fs.readdirSync(dir())) {
      fs.rmSync(path.join(dir(), f), { recursive: true, force: true })
    }
  })

  it("devuelve la URL del sibling por cada locale presente", async () => {
    writePost("anthropic-colossus-mas-compute-para-claude", "es", "anthropic-colossus")
    writePost("anthropic-colossus-more-compute-for-claude", "en", "anthropic-colossus")
    writePost("anthropic-colossus-piu-compute-per-claude", "it", "anthropic-colossus")

    jest.resetModules()
    const { buildBlogAlternates } = await import("@/lib/blog/alternates")
    const out = await buildBlogAlternates("anthropic-colossus")

    expect(out).toEqual({
      es: "/es/blog/anthropic-colossus-mas-compute-para-claude",
      en: "/en/blog/anthropic-colossus-more-compute-for-claude",
      it: "/it/blog/anthropic-colossus-piu-compute-per-claude",
    })
  })

  it("cae al índice de blog del locale cuando el sibling no existe", async () => {
    writePost("post-solo-es", "es", "shared-key")
    writePost("post-solo-it", "it", "shared-key")
    // sin sibling en/

    jest.resetModules()
    const { buildBlogAlternates } = await import("@/lib/blog/alternates")
    const out = await buildBlogAlternates("shared-key")

    expect(out).toEqual({
      es: "/es/blog/post-solo-es",
      en: "/en/blog",
      it: "/it/blog/post-solo-it",
    })
  })

  it("cae a los tres índices cuando el translationKey no existe", async () => {
    writePost("post-otro", "es", "otra-clave")

    jest.resetModules()
    const { buildBlogAlternates } = await import("@/lib/blog/alternates")
    const out = await buildBlogAlternates("clave-inexistente")

    expect(out).toEqual({
      es: "/es/blog",
      en: "/en/blog",
      it: "/it/blog",
    })
  })
})

describe("toAbsoluteAlternates", () => {
  it("anteponer baseUrl a las URLs relativas", async () => {
    const { toAbsoluteAlternates } = await import("@/lib/blog/alternates")
    const abs = toAbsoluteAlternates(
      { es: "/es/blog/x", en: "/en/blog/y", it: "/it/blog/z" },
      "https://evolve2digital.com"
    )
    expect(abs).toEqual({
      es: "https://evolve2digital.com/es/blog/x",
      en: "https://evolve2digital.com/en/blog/y",
      it: "https://evolve2digital.com/it/blog/z",
    })
  })

  it("ignora entradas vacías o undefined", async () => {
    const { toAbsoluteAlternates } = await import("@/lib/blog/alternates")
    const abs = toAbsoluteAlternates({ es: "/es/blog/x", en: undefined }, "https://e.com")
    expect(abs).toEqual({ es: "https://e.com/es/blog/x" })
  })
})
