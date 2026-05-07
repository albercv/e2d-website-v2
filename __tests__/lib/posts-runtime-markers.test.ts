// __tests__/lib/posts-runtime-markers.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { getCompiledPost, clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"
import { writeMeta, clearMediaMetaCache } from "@/lib/blog/media-meta"

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
})
