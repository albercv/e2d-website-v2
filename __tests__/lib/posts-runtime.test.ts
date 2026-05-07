/**
 * @jest-environment node
 *
 * Tests para lib/blog/posts-runtime.ts — scanner de posts MDX en disco.
 * Reemplaza la dependencia de Contentlayer build-time para el MCP.
 */

import * as path from "path"
import * as fs from "fs/promises"
import * as os from "os"

let mod: typeof import("../../lib/blog/posts-runtime")
let tmpDir: string

const writeMdx = async (rel: string, body: string) => {
  const full = path.join(tmpDir, "content", rel)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, body, "utf-8")
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "posts-runtime-"))
  process.env.CONTENT_ROOT = tmpDir
  jest.resetModules()
  mod = require("../../lib/blog/posts-runtime")
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe("listPostsFromDisk", () => {
  it("returns empty array when content/ does not exist", async () => {
    const posts = await mod.listPostsFromDisk()
    expect(posts).toEqual([])
  })

  it("reads MDX files from content/ and parses frontmatter", async () => {
    await writeMdx(
      "posts/hola.mdx",
      `---
title: Hola Mundo
description: Una descripcion de prueba suficiente
date: 2026-05-04
locale: es
slug: hola
tags: [test, demo]
author: Alberto Carrasco
published: true
---

# Hola

Este es el contenido del post con varias palabras para wordcount.
`,
    )
    const posts = await mod.listPostsFromDisk()
    expect(posts).toHaveLength(1)
    const post = posts[0]
    expect(post.title).toBe("Hola Mundo")
    expect(post.slug).toBe("hola")
    expect(post.locale).toBe("es")
    expect(post.tags).toEqual(["test", "demo"])
    expect(post.published).toBe(true)
    expect(post.body.raw).toContain("# Hola")
    expect(post.body.raw).not.toContain("title:")
  })

  it("computes wordCount from body", async () => {
    await writeMdx(
      "posts/wc.mdx",
      `---
title: Test
description: Descripcion suficientemente larga para validar
date: 2026-05-04
locale: es
slug: wc
published: true
---

uno dos tres cuatro cinco
`,
    )
    const [post] = await mod.listPostsFromDisk()
    expect(post.wordCount).toBe(5)
  })

  it("computes readingTime", async () => {
    await writeMdx(
      "posts/rt.mdx",
      `---
title: Reading Time
description: Descripcion suficientemente larga para validar
date: 2026-05-04
locale: es
slug: rt
published: true
---

${"palabra ".repeat(300)}
`,
    )
    const [post] = await mod.listPostsFromDisk()
    expect(post.readingTime).toBeDefined()
    expect(post.readingTime.minutes).toBeGreaterThan(0)
  })

  it("detects all three locales", async () => {
    const fm = (locale: string, slug: string) => `---
title: T ${locale}
description: descripcion suficientemente larga para validar el campo
date: 2026-05-04
locale: ${locale}
slug: ${slug}
published: true
---

contenido contenido contenido contenido contenido
`
    await writeMdx("posts/a-es.mdx", fm("es", "a-es"))
    await writeMdx("posts/a-en.mdx", fm("en", "a-en"))
    await writeMdx("posts/a-it.mdx", fm("it", "a-it"))

    const posts = await mod.listPostsFromDisk()
    const locales = posts.map((p) => p.locale).sort()
    expect(locales).toEqual(["en", "es", "it"])
  })

  it("ignores non-mdx files", async () => {
    await writeMdx("posts/skip.txt", "not mdx")
    await writeMdx("posts/skip.json", "{}")
    await writeMdx(
      "posts/keep.mdx",
      `---
title: Keep
description: descripcion suficientemente larga para validar el campo
date: 2026-05-04
locale: es
slug: keep
published: true
---

body body body body body
`,
    )
    const posts = await mod.listPostsFromDisk()
    expect(posts).toHaveLength(1)
    expect(posts[0].slug).toBe("keep")
  })

  it("sets _raw.sourceFilePath relative to content/", async () => {
    await writeMdx(
      "posts/nested.mdx",
      `---
title: Nested
description: descripcion suficientemente larga para validar el campo
date: 2026-05-04
locale: es
slug: nested
published: true
---

body body body
`,
    )
    const [post] = await mod.listPostsFromDisk()
    expect(post._raw.sourceFilePath).toBe("posts/nested.mdx")
  })

  it("treats published:false posts as unpublished", async () => {
    await writeMdx(
      "posts/draft.mdx",
      `---
title: Draft
description: descripcion suficientemente larga para validar el campo
date: 2026-05-04
locale: es
slug: draft
published: false
---

body body body
`,
    )
    const [post] = await mod.listPostsFromDisk()
    expect(post.published).toBe(false)
  })

  it("re-reads when a new file is added (cache invalidates by mtime)", async () => {
    await writeMdx(
      "posts/first.mdx",
      `---
title: First
description: descripcion suficientemente larga para validar el campo
date: 2026-05-04
locale: es
slug: first
published: true
---

body body body
`,
    )
    let posts = await mod.listPostsFromDisk()
    expect(posts).toHaveLength(1)

    // mtime resolution can be 1s on some FS — wait briefly.
    await new Promise((r) => setTimeout(r, 1100))

    await writeMdx(
      "posts/second.mdx",
      `---
title: Second
description: descripcion suficientemente larga para validar el campo
date: 2026-05-04
locale: es
slug: second
published: true
---

body body body
`,
    )
    posts = await mod.listPostsFromDisk()
    expect(posts).toHaveLength(2)
  })

  it("recurses into a symlinked subdir of content/", async () => {
    // Regresión: BLOG_POSTS_DIR vive fuera del proyecto; `content/posts` es un
    // symlink. `Dirent.isDirectory()` devuelve false para symlinks, así que sin
    // la rama isSymbolicLink en walkMdx el subárbol queda invisible y los posts
    // creados por MCP devuelven 404 en posts_get/posts_search.
    const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), "blog-posts-ext-"))
    await fs.writeFile(
      path.join(externalDir, "external.mdx"),
      `---\ntitle: External\ndescription: Description long enough\ndate: 2026-05-05\nlocale: es\nslug: external\npublished: true\n---\n\nbody body body\n`,
      "utf-8",
    )
    await fs.mkdir(path.join(tmpDir, "content"), { recursive: true })
    await fs.symlink(externalDir, path.join(tmpDir, "content", "posts"))
    try {
      const posts = await mod.listPostsFromDisk()
      const slugs = posts.map((p) => p.slug)
      expect(slugs).toContain("external")
    } finally {
      await fs.rm(externalDir, { recursive: true, force: true })
    }
  })
})
