// __tests__/lib/posts-validate.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { validatePost } from "@/lib/blog/posts-validate"
import { writeMeta, clearMediaMetaCache } from "@/lib/blog/media-meta"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

describe("validatePost", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v-"))
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

  it("flags missing markers and unused media", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
cover: nope
---

[image:fachada]
[video:ghost]
`
    )
    await writeMeta("ferdy-2026", {
      fachada: { ext: "jpg", kind: "image", alt: "F", caption: "" },
      orphan:  { ext: "jpg", kind: "image", alt: "O", caption: "" },
    })
    const out = await validatePost("ferdy", "es")
    expect(out.ok).toBe(false)
    expect(out.missingMarkers.find((m) => m.name === "ghost")?.reason).toBe("not_found")
    expect(out.unusedMedia).toContain("orphan")
    expect(out.coverOk).toBe(false)
  })

  it("ok=true on a clean post", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
cover: fachada
---

[image:fachada]
`
    )
    await writeMeta("ferdy-2026", {
      fachada: { ext: "jpg", kind: "image", alt: "F", caption: "" },
    })
    const out = await validatePost("ferdy", "es")
    expect(out.ok).toBe(true)
    expect(out.missingMarkers).toEqual([])
    expect(out.unusedMedia).toEqual([])
    expect(out.coverOk).toBe(true)
  })
})
