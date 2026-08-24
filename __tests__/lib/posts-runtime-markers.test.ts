// __tests__/lib/posts-runtime-markers.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { getCompiledPost, clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"
import { writeMeta, clearMediaMetaCache } from "@/lib/blog/media-meta"
import { readImageDimensions } from "@/lib/blog/media-dimensions"

// jest.spyOn can't redefine this module's exports under the SWC/next-jest
// transform ("Cannot redefine property"), so we wrap the real implementation
// in a jest.fn via jest.mock instead — behavior stays identical (real fs
// reads), we just get call tracking for the prefilter assertion below.
jest.mock("@/lib/blog/media-dimensions", () => {
  const actual = jest.requireActual("@/lib/blog/media-dimensions")
  return { __esModule: true, readImageDimensions: jest.fn(actual.readImageDimensions) }
})

describe("getCompiledPost — marker substitution", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gcp-"))
    fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
    fs.mkdirSync(path.join(tmp, "uploads"), { recursive: true })
    process.env.CONTENT_ROOT = tmp
    process.env.MEDIA_UPLOADS_ROOT = path.join(tmp, "uploads")
    clearPostsRuntimeCache()
    clearMediaMetaCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.CONTENT_ROOT
    delete process.env.MEDIA_UPLOADS_ROOT
  })

  it("substitutes markers in the compiled body", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
---

Texto introductorio.

[image:fachada]

Cierre.
`
    )
    fs.mkdirSync(path.join(tmp, "uploads", "ferdy-2026"), { recursive: true })
    fs.writeFileSync(path.join(tmp, "uploads", "ferdy-2026", "fachada.jpg"), "x")
    await writeMeta("ferdy-2026", {
      fachada: { ext: "jpg", kind: "image", alt: "Fachada", caption: "" },
    })

    const compiled = await getCompiledPost("ferdy", "es")
    expect(compiled).not.toBeNull()
    // The serialized MDX is in compiled.compiled.compiledSource — we just check
    // that an <img> tag with the resolved URL appears somewhere in it.
    const src = compiled!.compiled.compiledSource
    expect(src).toContain("/uploads/ferdy-2026/fachada.jpg")
  })

  it("falls back to MediaMissing when the marker is unresolved", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
---

[image:nope]
`
    )
    const compiled = await getCompiledPost("ferdy", "es")
    expect(compiled!.compiled.compiledSource).toContain("MediaMissing")
  })

  it("does not probe orphan images in _meta.json that are never referenced in the body", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
---

[image:fachada]
`
    )
    fs.mkdirSync(path.join(tmp, "uploads", "ferdy-2026"), { recursive: true })
    fs.writeFileSync(path.join(tmp, "uploads", "ferdy-2026", "fachada.jpg"), "x")
    await writeMeta("ferdy-2026", {
      fachada: { ext: "jpg", kind: "image", alt: "Fachada", caption: "" },
      // Orphan: present in _meta.json, never placed in the body, and its
      // file doesn't even exist on disk. Probing it would be wasted work
      // on every request and — pre-fix — could error the request too.
      orphan: { ext: "png", kind: "image", alt: "Orphan", caption: "" },
    })

    const mockedRead = readImageDimensions as jest.Mock
    mockedRead.mockClear()
    const compiled = await getCompiledPost("ferdy", "es")
    expect(compiled).not.toBeNull()
    expect(mockedRead).toHaveBeenCalledTimes(1)
    expect(mockedRead).toHaveBeenCalledWith(path.join(tmp, "uploads", "ferdy-2026", "fachada.jpg"))
  })
})
