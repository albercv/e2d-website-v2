/** @jest-environment node */
import { paginatePosts, POSTS_PER_PAGE } from "@/app/[locale]/blog/pagination"

const mk = (n: number) => ({ slug: `p${n}` }) as never

describe("paginatePosts", () => {
  const posts = Array.from({ length: 30 }, (_, i) => mk(i))

  it("slices page 1 by default", () => {
    const { pagePosts, totalPages, page } = paginatePosts(posts, undefined)
    expect(pagePosts).toHaveLength(POSTS_PER_PAGE)
    expect(totalPages).toBe(3)
    expect(page).toBe(1)
  })

  it("clamps out-of-range pages", () => {
    expect(paginatePosts(posts, "99").page).toBe(3)
    expect(paginatePosts(posts, "0").page).toBe(1)
    expect(paginatePosts(posts, "abc").page).toBe(1)
  })
})
