// __tests__/lib/posts-runtime-resolve-covers.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import {
  listPostsFromDisk,
  resolvePostCovers,
  clearPostsRuntimeCache,
} from "@/lib/blog/posts-runtime"
import { writeMeta, clearMediaMetaCache } from "@/lib/blog/media-meta"

describe("resolvePostCovers", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rpc-"))
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

  it("replaces a slug-key cover with the resolved /uploads/ URL", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
cover: hero
---

body
`
    )
    fs.mkdirSync(path.join(tmp, "uploads", "ferdy-2026"), { recursive: true })
    fs.writeFileSync(path.join(tmp, "uploads", "ferdy-2026", "hero.png"), "x")
    await writeMeta("ferdy-2026", {
      hero: { ext: "png", kind: "image", alt: "", caption: "" },
    })

    const all = await listPostsFromDisk()
    const [resolved] = await resolvePostCovers(all)

    expect(resolved.cover).toBe("/uploads/ferdy-2026/hero.png")
  })

  it("returns cover undefined when the slug-key is missing in _meta.json", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
cover: ghost
---

body
`
    )

    const all = await listPostsFromDisk()
    const [resolved] = await resolvePostCovers(all)

    expect(resolved.cover).toBeUndefined()
  })

  it("leaves posts without cover untouched", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "no-cover.mdx"),
      `---
slug: no-cover
title: Post sin portada
date: 2026-05-05
locale: es
translationKey: no-cover
---

body
`
    )

    const all = await listPostsFromDisk()
    const [resolved] = await resolvePostCovers(all)

    expect(resolved.cover).toBeUndefined()
  })

  it("passes through absolute https:// covers untouched", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "legacy.mdx"),
      `---
slug: legacy
title: Post legacy con cover Unsplash
date: 2024-01-20
locale: en
translationKey: legacy
cover: "https://images.unsplash.com/photo-x"
---

body
`
    )
    const all = await listPostsFromDisk()
    const [resolved] = await resolvePostCovers(all)
    expect(resolved.cover).toBe("https://images.unsplash.com/photo-x")
  })

  it("passes through absolute / paths untouched", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "abs.mdx"),
      `---
slug: abs
title: Cover ruta absoluta local
date: 2024-01-20
locale: en
translationKey: abs
cover: "/placeholder.svg"
---

body
`
    )
    const all = await listPostsFromDisk()
    const [resolved] = await resolvePostCovers(all)
    expect(resolved.cover).toBe("/placeholder.svg")
  })
})
