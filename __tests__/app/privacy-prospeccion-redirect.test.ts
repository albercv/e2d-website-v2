/** @jest-environment node */
import nextConfig from "../../next.config.mjs"

// The prospecting annex now exists in es/en/it (see
// lib/legal/content/prospecting-annex/*), so the temporary en/it -> es
// redirect that used to live here must be gone.
describe("prospecting annex locale redirect", () => {
  it("no longer redirects the annex to the Spanish version", async () => {
    const redirects = await nextConfig.redirects?.()
    const annexRedirect = redirects?.find((r: { source: string }) => r.source.includes("privacy/prospeccion"))
    expect(annexRedirect).toBeUndefined()
  })
})
