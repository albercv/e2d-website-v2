/** @jest-environment node */
import { expandMarkers } from "@/lib/blog/media-markers"

const meta = {
  version: 1 as const,
  files: { foto: { ext: "png", kind: "image" as const, alt: "una foto", caption: "" } },
}

describe("expandMarkers with dimensions", () => {
  it("emits width/height and lazy srcset when dims provided", () => {
    const out = expandMarkers("[image:foto]", meta, "clave", { foto: { width: 1600, height: 900 } })
    expect(out).toContain('width="1600"')
    expect(out).toContain('height="900"')
    expect(out).toContain('loading="lazy"')
    expect(out).toContain("/_next/image?url=%2Fuploads%2Fclave%2Ffoto.png&w=828&q=75")
    expect(out).toContain("828w")
  })

  it("keeps the plain img when dims are unknown", () => {
    const out = expandMarkers("[image:foto]", meta, "clave")
    expect(out).toContain('src="/uploads/clave/foto.png"')
    expect(out).not.toContain("width=")
  })
})
