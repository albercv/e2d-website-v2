/** @jest-environment node */
import nextConfig from "../../next.config.mjs"

// The annex is Spanish-only. The en/it redirect must live in next.config
// (not in the page): Next 14 prerenders /en and /it at build time and caches
// a page-level redirect() as a 307 without a Location header.
describe("prospecting annex locale redirect", () => {
  it("temporarily redirects /en and /it to the es annex", async () => {
    const redirects = await nextConfig.redirects?.()
    expect(redirects).toContainEqual({
      source: "/:locale(en|it)/privacy/prospeccion",
      destination: "/es/privacy/prospeccion",
      permanent: false,
    })
  })
})
