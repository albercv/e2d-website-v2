/** @jest-environment node */
import nextConfig from "../../next.config.mjs"

describe("rss redirect", () => {
  it("301s /rss.xml to the es feed", async () => {
    const redirects = await nextConfig.redirects()
    expect(redirects).toContainEqual({
      source: "/rss.xml",
      destination: "/es/rss.xml",
      permanent: true,
    })
  })
})
