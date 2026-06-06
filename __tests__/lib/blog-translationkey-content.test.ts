/**
 * Regression guard against the hreflang bug shipped (and missed) in the
 * May 2026 SEO phase: the unit tests for buildBlogAlternates mocked
 * findPostsByTranslationKey, so they passed while the REAL committed posts
 * lacked a `translationKey` frontmatter field. Every multi-locale seed post
 * fell back to its own slug as translationKey, so siblings never grouped and
 * the blog post hreflang collapsed to `/${locale}/blog` in production.
 *
 * This suite reads the actual committed content/ tree (no mocks) and asserts
 * the four trilingual seed groups resolve real cross-locale slugs.
 *
 * Scope note: production also serves MCP-authored posts from the
 * content/posts -> /var/lib/e2d-content/posts symlink (not in git, absent on
 * CI). Those use the convention "EN/IT carry translationKey = ES slug, ES
 * post leaves it blank". We don't assert over them — they vary and aren't
 * checked into the repo — but the general no-fallback test below still covers
 * any ≥2-locale group the walker happens to see.
 */
import path from "path"
import { listPostsFromDisk } from "@/lib/blog/posts-runtime"
import { buildBlogAlternates } from "@/lib/blog/alternates"

// jest.setup-env.js isolates CONTENT_ROOT to an empty tmpdir (anti-BUG-15
// prod-volume guard). This suite asserts the integrity of the REAL committed
// content/ tree, so point CONTENT_ROOT at the repo root for its duration.
const REPO_ROOT = path.resolve(__dirname, "..", "..")
const PREV_CONTENT_ROOT = process.env.CONTENT_ROOT

beforeAll(() => {
  process.env.CONTENT_ROOT = REPO_ROOT
})

afterAll(() => {
  if (PREV_CONTENT_ROOT === undefined) delete process.env.CONTENT_ROOT
  else process.env.CONTENT_ROOT = PREV_CONTENT_ROOT
})

// The four trilingual seed posts committed to the repo. Pinning the keys (not
// the slugs) catches removal/typo of any single sibling's translationKey: the
// affected locale drops out of the group and resolves to the bare index.
const SEED_KEYS = [
  "microservices-architecture",
  "devops-automation",
  "agile-development",
  "cloud-native-development",
]

describe("blog translationKey wiring (committed content)", () => {
  test.each(SEED_KEYS)(
    "seed group %s resolves real es/en/it sibling slugs, no /blog fallback",
    async (key) => {
      const alternates = await buildBlogAlternates(key)
      for (const locale of ["es", "en", "it"] as const) {
        expect(alternates[locale]).toMatch(
          new RegExp(`^/${locale}/blog/.+`)
        )
        // The bare index fallback is the exact failure mode we guard against.
        expect(alternates[locale]).not.toBe(`/${locale}/blog`)
      }
    }
  )

  test("every published ≥2-locale group resolves real sibling slugs", async () => {
    const posts = (await listPostsFromDisk()).filter((p) => p.published)
    const groups = new Map<string, typeof posts>()
    for (const p of posts) {
      const arr = groups.get(p.translationKey) ?? []
      arr.push(p)
      groups.set(p.translationKey, arr)
    }

    for (const [key, siblings] of groups) {
      if (siblings.length < 2) continue // single-locale posts can't cross-link
      const alternates = await buildBlogAlternates(key)
      for (const sib of siblings) {
        expect(alternates[sib.locale]).toBe(
          `/${sib.locale}/blog/${sib.slug}`
        )
      }
    }
  })
})
