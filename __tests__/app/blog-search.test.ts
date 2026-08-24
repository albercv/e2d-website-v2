/** @jest-environment node */
import { normalizeQuery, searchPosts } from "@/lib/blog/search"
import { buildBlogListUrl } from "@/app/[locale]/blog/pagination"

type P = { title: string; description: string; tags: string[] }
const mk = (over: Partial<P>): P => ({ title: "", description: "", tags: [], ...over })

describe("normalizeQuery", () => {
  it("trims, lowercases and caps length", () => {
    expect(normalizeQuery("  ChatBots ")).toBe("chatbots")
    expect(normalizeQuery(undefined)).toBe("")
    expect(normalizeQuery("a".repeat(500))).toHaveLength(100)
  })
})

describe("searchPosts", () => {
  const posts = [
    mk({ title: "Chatbots para PYMEs", description: "WhatsApp", tags: ["ia"] }),
    mk({ title: "Next.js", description: "App Router y SEO", tags: ["web"] }),
    mk({ title: "Voicebots", description: "", tags: ["IA", "voz"] }),
  ]

  it("returns every post for an empty query", () => {
    expect(searchPosts(posts, "")).toBe(posts)
  })

  it("matches title, description and tags case-insensitively", () => {
    expect(searchPosts(posts, "chatbots")).toHaveLength(1)
    expect(searchPosts(posts, "seo").map((p) => p.title)).toEqual(["Next.js"])
    expect(searchPosts(posts, "IA")).toHaveLength(2)
  })

  it("matches accent-insensitively", () => {
    expect(searchPosts(posts, "pymes")).toHaveLength(1)
    expect(searchPosts([mk({ title: "Automatización" })], "automatizacion")).toHaveLength(1)
  })
})

describe("buildBlogListUrl", () => {
  it("omits page 1 and empty query", () => {
    expect(buildBlogListUrl("es", { page: 1, q: "" })).toBe("/es/blog")
    expect(buildBlogListUrl("es", { page: 2 })).toBe("/es/blog?page=2")
    expect(buildBlogListUrl("en", { page: 3, q: "chat bots" })).toBe("/en/blog?page=3&q=chat+bots")
    expect(buildBlogListUrl("it", { q: "seo" })).toBe("/it/blog?q=seo")
  })
})
