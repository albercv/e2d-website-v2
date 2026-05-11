/**
 * @jest-environment node
 *
 * Tests for correct hreflang generation using translationKey sibling lookup.
 * Bug: generateAlternateLanguages reused the same slug for all locales, emitting
 * cross-locale URLs that 404 in Google Search Console.
 * Fix: blog post alternates must use the real slug of each sibling, not the
 * slug of the current post.
 */

import * as fs from "fs"
import * as path from "path"
import * as os from "os"

let tmp: string
let mod: typeof import("../../lib/sitemap-generator")

const writeMdx = (rel: string, body: string) => {
  const full = path.join(tmp, "content", rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, body, "utf-8")
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sitemap-hreflang-"))
  fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
  process.env.CONTENT_ROOT = tmp
  jest.resetModules()
  const runtime = require("../../lib/blog/posts-runtime")
  runtime.clearPostsRuntimeCache()
  mod = require("../../lib/sitemap-generator")
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
  delete process.env.CONTENT_ROOT
})

describe("hreflang alternates for blog posts", () => {
  it("uses the real sibling slug per locale when all three locales exist", async () => {
    // Three translations of the same post — all share translationKey but have
    // language-specific slugs, which is how this blog works.
    writeMdx(
      "posts/arquitectura-microservicios-sistemas-escalables.mdx",
      `---
title: Arquitectura de Microservicios
description: desc
date: 2026-01-15
locale: es
slug: arquitectura-microservicios-sistemas-escalables
translationKey: microservices-architecture
published: true
---
body`
    )
    writeMdx(
      "posts/microservices-architecture-scalable-systems.mdx",
      `---
title: Microservices Architecture
description: desc
date: 2026-01-15
locale: en
slug: microservices-architecture-scalable-systems
translationKey: microservices-architecture
published: true
---
body`
    )
    writeMdx(
      "posts/architettura-microservizi-sistemi-scalabili.mdx",
      `---
title: Architettura a Microservizi
description: desc
date: 2026-01-15
locale: it
slug: architettura-microservizi-sistemi-scalabili
translationKey: microservices-architecture
published: true
---
body`
    )

    const sitemap = await mod.generateAISitemap()
    const esEntry = sitemap.find(
      (e: any) => e.url === "https://evolve2digital.com/es/blog/arquitectura-microservicios-sistemas-escalables"
    )

    expect(esEntry).toBeDefined()
    const langs = (esEntry as any).alternates?.languages as Record<string, string>
    expect(langs).toBeDefined()

    // Each locale must use its own real slug, not the ES slug
    expect(langs.es).toBe("https://evolve2digital.com/es/blog/arquitectura-microservicios-sistemas-escalables")
    expect(langs.en).toBe("https://evolve2digital.com/en/blog/microservices-architecture-scalable-systems")
    expect(langs.it).toBe("https://evolve2digital.com/it/blog/architettura-microservizi-sistemi-scalabili")
    expect(langs["x-default"]).toBe("https://evolve2digital.com/es/blog/arquitectura-microservicios-sistemas-escalables")
  })

  it("omits a locale from alternates when no sibling exists for that locale", async () => {
    // ES and EN exist, IT does not — IT must be absent from alternates
    writeMdx(
      "posts/desarrollo-cloud-native-guia-empresarial.mdx",
      `---
title: Desarrollo Cloud Native
description: desc
date: 2026-02-10
locale: es
slug: desarrollo-cloud-native-guia-empresarial
translationKey: cloud-native-guide
published: true
---
body`
    )
    writeMdx(
      "posts/cloud-native-development-enterprise-guide.mdx",
      `---
title: Cloud Native Development
description: desc
date: 2026-02-10
locale: en
slug: cloud-native-development-enterprise-guide
translationKey: cloud-native-guide
published: true
---
body`
    )

    const sitemap = await mod.generateAISitemap()
    const esEntry = sitemap.find(
      (e: any) => e.url === "https://evolve2digital.com/es/blog/desarrollo-cloud-native-guia-empresarial"
    )
    expect(esEntry).toBeDefined()
    const langs = (esEntry as any).alternates?.languages as Record<string, string>

    expect(langs.es).toBe("https://evolve2digital.com/es/blog/desarrollo-cloud-native-guia-empresarial")
    expect(langs.en).toBe("https://evolve2digital.com/en/blog/cloud-native-development-enterprise-guide")
    // IT sibling absent → must NOT be fabricated with ES or EN slug
    expect(langs.it).toBeUndefined()
  })

  it("EN sibling entry also uses correct alternate slugs", async () => {
    // The EN entry of the same group must emit ES slug (not EN slug) for hreflang="es"
    writeMdx(
      "posts/agile-es.mdx",
      `---
title: Desarrollo Ágil
description: desc
date: 2026-03-01
locale: es
slug: desarrollo-agil-transformacion-empresarial
translationKey: agile-development
published: true
---
body`
    )
    writeMdx(
      "posts/agile-en.mdx",
      `---
title: Agile Development
description: desc
date: 2026-03-01
locale: en
slug: agile-development-business-transformation
translationKey: agile-development
published: true
---
body`
    )

    const sitemap = await mod.generateAISitemap()
    const enEntry = sitemap.find(
      (e: any) => e.url === "https://evolve2digital.com/en/blog/agile-development-business-transformation"
    )
    expect(enEntry).toBeDefined()
    const langs = (enEntry as any).alternates?.languages as Record<string, string>

    // EN entry must reference the ES sibling slug, not its own slug for hreflang="es"
    expect(langs.es).toBe("https://evolve2digital.com/es/blog/desarrollo-agil-transformacion-empresarial")
    expect(langs.en).toBe("https://evolve2digital.com/en/blog/agile-development-business-transformation")
    expect(langs.it).toBeUndefined()
    expect(langs["x-default"]).toBe("https://evolve2digital.com/es/blog/desarrollo-agil-transformacion-empresarial")
  })

  it("x-default falls back to first locale alphabetically when ES sibling is absent", async () => {
    // No ES sibling — x-default should be EN (first alphabetically)
    writeMdx(
      "posts/en-only.mdx",
      `---
title: EN Only Post
description: desc
date: 2026-04-01
locale: en
slug: en-only-post
translationKey: en-only-group
published: true
---
body`
    )
    writeMdx(
      "posts/it-only.mdx",
      `---
title: IT Only Post
description: desc
date: 2026-04-01
locale: it
slug: it-only-post
translationKey: en-only-group
published: true
---
body`
    )

    const sitemap = await mod.generateAISitemap()
    const enEntry = sitemap.find(
      (e: any) => e.url === "https://evolve2digital.com/en/blog/en-only-post"
    )
    expect(enEntry).toBeDefined()
    const langs = (enEntry as any).alternates?.languages as Record<string, string>

    expect(langs.es).toBeUndefined()
    expect(langs.en).toBe("https://evolve2digital.com/en/blog/en-only-post")
    expect(langs.it).toBe("https://evolve2digital.com/it/blog/it-only-post")
    // x-default = EN (first alphabetically among available locales, no ES)
    expect(langs["x-default"]).toBe("https://evolve2digital.com/en/blog/en-only-post")
  })

  it("post with no translationKey siblings emits only its own locale in alternates", async () => {
    // Standalone post — no siblings. Should NOT fabricate /en/blog/solo or /it/blog/solo.
    writeMdx(
      "posts/solo.mdx",
      `---
title: Solo Post
description: desc
date: 2026-05-01
locale: es
slug: solo-post
translationKey: solo-unique-key
published: true
---
body`
    )

    const sitemap = await mod.generateAISitemap()
    const entry = sitemap.find(
      (e: any) => e.url === "https://evolve2digital.com/es/blog/solo-post"
    )
    expect(entry).toBeDefined()
    const langs = (entry as any).alternates?.languages as Record<string, string>

    expect(langs.es).toBe("https://evolve2digital.com/es/blog/solo-post")
    // No EN or IT siblings exist → must NOT appear in alternates
    expect(langs.en).toBeUndefined()
    expect(langs.it).toBeUndefined()
    expect(langs["x-default"]).toBe("https://evolve2digital.com/es/blog/solo-post")
  })
})
