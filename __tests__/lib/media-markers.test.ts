// __tests__/lib/media-markers.test.ts
import { expandMarkers, resolveCover } from "@/lib/blog/media-markers"
import type { MediaMeta } from "@/lib/blog/media-meta"

const META: MediaMeta = {
  version: 1,
  files: {
    fachada:          { ext: "jpg", kind: "image", alt: "Fachada", caption: "" },
    testimonio_ferdy: { ext: "mp4", kind: "video", alt: "Testimonio", caption: "Junio 2026" },
    poster:           { ext: "mp4", kind: "video", alt: "P", caption: "" },
  },
}

describe("expandMarkers — body substitution", () => {
  it("renders an image marker as <figure><img/></figure>", () => {
    const out = expandMarkers("Antes [image:fachada] después", META, "ferdy")
    expect(out).toContain('src="/uploads/ferdy/fachada.jpg"')
    expect(out).toContain('alt="Fachada"')
    expect(out).toContain("<figure>")
    expect(out).not.toContain("<figcaption>")
  })

  it("renders a video marker with caption as <figure><video/><figcaption/></figure>", () => {
    const out = expandMarkers("[video:testimonio_ferdy]", META, "ferdy")
    expect(out).toContain('src="/uploads/ferdy/testimonio_ferdy.mp4"')
    expect(out).toContain("controls")
    expect(out).toContain('aria-label="Testimonio"')
    expect(out).toContain("<figcaption>Junio 2026</figcaption>")
  })

  it("renders <MediaMissing reason=not_found /> when name is unknown", () => {
    const out = expandMarkers("[image:unknown]", META, "ferdy")
    expect(out).toContain('<MediaMissing kind="image" name="unknown" reason="not_found" />')
  })

  it("renders <MediaMissing reason=kind_mismatch /> when kind disagrees", () => {
    const out = expandMarkers("[image:testimonio_ferdy]", META, "ferdy")
    expect(out).toContain('<MediaMissing kind="image" name="testimonio_ferdy" reason="kind_mismatch" />')
  })

  it("does not substitute markers inside fenced code blocks", () => {
    const src = "Texto.\n\n```\n[image:fachada]\n```\n\nMás texto."
    const out = expandMarkers(src, META, "ferdy")
    expect(out).toContain("[image:fachada]")
    expect(out).not.toContain('src="/uploads/ferdy/fachada.jpg"')
  })

  it("does not substitute markers inside inline code", () => {
    const out = expandMarkers("Como `[image:fachada]` aquí.", META, "ferdy")
    expect(out).toContain("`[image:fachada]`")
    expect(out).not.toContain('src="/uploads/ferdy/fachada.jpg"')
  })

  it("escapes special HTML characters in alt and caption", () => {
    const meta: MediaMeta = {
      version: 1,
      files: {
        x: { ext: "jpg", kind: "image", alt: 'A & B "c"', caption: "<script>" },
      },
    }
    const out = expandMarkers("[image:x]", meta, "k")
    expect(out).toContain("A &amp; B &quot;c&quot;")
    expect(out).toContain("&lt;script&gt;")
  })

  it("substitutes multiple markers in one body", () => {
    const out = expandMarkers("[image:fachada] y [video:testimonio_ferdy]", META, "ferdy")
    expect(out.match(/<figure>/g)?.length).toBe(2)
  })
})

describe("resolveCover", () => {
  it("returns the URL for a known image cover", () => {
    expect(resolveCover("fachada", META, "ferdy")).toEqual({
      ok: true,
      url: "/uploads/ferdy/fachada.jpg",
    })
  })
  it("returns null for missing cover name", () => {
    expect(resolveCover("nope", META, "ferdy")).toEqual({ ok: false, reason: "not_found" })
  })
  it("returns null for video cover (v1 images only)", () => {
    expect(resolveCover("testimonio_ferdy", META, "ferdy")).toEqual({
      ok: false,
      reason: "kind_mismatch",
    })
  })
  it("returns null when cover is undefined", () => {
    expect(resolveCover(undefined, META, "ferdy")).toEqual({ ok: false, reason: "absent" })
  })

  it("uses meta.cover when present, ignoring the frontmatter cover arg", () => {
    const metaWithCover: MediaMeta = { ...META, cover: "fachada" }
    // Frontmatter says "poster" (a video — would fail), but meta.cover wins.
    expect(resolveCover("poster", metaWithCover, "ferdy")).toEqual({
      ok: true,
      url: "/uploads/ferdy/fachada.jpg",
    })
  })

  it("falls back to the frontmatter cover when meta.cover is absent", () => {
    expect(resolveCover("fachada", META, "ferdy")).toEqual({
      ok: true,
      url: "/uploads/ferdy/fachada.jpg",
    })
  })

  it("uses meta.cover even when no frontmatter cover is supplied", () => {
    const metaWithCover: MediaMeta = { ...META, cover: "fachada" }
    expect(resolveCover(undefined, metaWithCover, "ferdy")).toEqual({
      ok: true,
      url: "/uploads/ferdy/fachada.jpg",
    })
  })

  it("returns kind_mismatch when meta.cover points to a video", () => {
    const metaWithCover: MediaMeta = { ...META, cover: "poster" }
    expect(resolveCover(undefined, metaWithCover, "ferdy")).toEqual({
      ok: false,
      reason: "kind_mismatch",
    })
  })

  it("returns not_found when meta.cover points to an unknown name", () => {
    const metaWithCover: MediaMeta = { ...META, cover: "ghost" }
    expect(resolveCover("fachada", metaWithCover, "ferdy")).toEqual({
      ok: false,
      reason: "not_found",
    })
  })
})
