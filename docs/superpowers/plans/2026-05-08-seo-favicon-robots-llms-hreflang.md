# SEO discoverability fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore SERP favicon, clean up `robots.txt`, expose `llms.txt`/`llms-full.txt` for AI crawlers, and emit `hreflang` in the sitemap of evolve2digital.com.

**Architecture:** Four independent tasks on the existing Next.js 14 App Router. Static asset placement under `app/` (Next auto-route conventions for icons), `MetadataRoute.Robots` rewrite, two new dynamic route handlers under `app/llms.txt/` and `app/llms-full.txt/`, and a small refactor of `lib/sitemap-generator.ts` to forward `alternates.languages`.

**Tech Stack:** Next.js 14 App Router · TypeScript · Jest 29 (jsdom + node) · ImageMagick `convert` (already present at `/usr/bin/convert`) · `gray-matter` + runtime post reader (`lib/blog/posts-runtime.ts`).

**Spec:** `docs/superpowers/specs/2026-05-08-seo-favicon-robots-llms-hreflang-design.md`

**Branch:** `feature/seo-favicon-robots-llms-hreflang` (already created from `develop`, spec already committed at `ba50669`).

---

## File structure

| File | Status | Responsibility |
|---|---|---|
| `app/favicon.ico` | Create | Served at `/favicon.ico` by Next convention. Copy of existing `public/e2dFavicon.ico`. |
| `app/icon.png` | Create | 512×512 PNG icon. Next emits `<link rel="icon">` with correct sizes. |
| `app/apple-icon.png` | Create | 180×180 PNG. Next emits `<link rel="apple-touch-icon">`. |
| `app/layout.tsx` | Modify | Remove manual `<link rel="icon">` and `<link rel="apple-touch-icon">` (now handled by app convention). |
| `app/manifest.ts` | Modify | Point icons array to standardized `/favicon.ico` and `/icon.png`. |
| `app/robots.ts` | Modify | Drop ChatGPT-User contradiction, drop `/*.json$`, add explicit Googlebot, PerplexityBot, Applebot-Extended blocks. |
| `__tests__/app/robots.test.ts` | Create | Snapshot + structural assertions on `robots()` output. |
| `app/llms.txt/route.ts` | Create | GET handler returning llmstxt.org-format index of the site. |
| `app/llms-full.txt/route.ts` | Create | GET handler returning concatenated markdown of published posts. |
| `__tests__/app/llms-txt.test.ts` | Create | Tests for both handlers (status, content-type, structure). |
| `lib/sitemap-generator.ts` | Modify | Forward `alternateLanguages` to `MetadataRoute.Sitemap.alternates.languages`; include current locale + `x-default`. |
| `__tests__/lib/sitemap-generator.test.ts` | Modify | Add hreflang assertions. |

---

## Task 1: Favicon for SERP

**Files:**
- Create: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`
- Modify: `app/layout.tsx:69-71`, `app/manifest.ts:14-32`

**Why TDD doesn't apply here:** This task is static-asset placement plus a small layout edit. Verification is HTTP smoke (curl) + visual inspection. We still commit incrementally.

- [ ] **Step 1: Generate `app/favicon.ico` from existing asset**

```bash
cp public/e2dFavicon.ico app/favicon.ico
file app/favicon.ico
```
Expected: `MS Windows icon resource - 4 icons, 16x16 ... 32x32 ...` and the file exists.

- [ ] **Step 2: Generate `app/icon.png` (512×512) from the logo**

```bash
convert public/e2d_logo.webp -resize 512x512 -background none -gravity center -extent 512x512 app/icon.png
file app/icon.png
```
Expected: `PNG image data, 512 x 512`.

- [ ] **Step 3: Generate `app/apple-icon.png` (180×180)**

```bash
convert public/e2d_logo.webp -resize 180x180 -background '#0a0a0a' -gravity center -extent 180x180 -alpha remove -alpha off app/apple-icon.png
file app/apple-icon.png
```
Expected: `PNG image data, 180 x 180`. Apple requires opaque background — we set `#0a0a0a` to match `theme_color` in `manifest.ts`.

- [ ] **Step 4: Remove manual icon links from `app/layout.tsx`**

In `app/layout.tsx`, lines 69-71 currently are:

```tsx
        {/* Favicon & App Icons */}
        <link rel="icon" href="/e2dFavicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/e2d_logo.webp" />
```

Replace with nothing (delete the three lines). Next 14 will auto-emit the correct `<link>` tags from the files we just created in `app/`.

- [ ] **Step 5: Update `app/manifest.ts` icons array**

Replace the `icons` array of `app/manifest.ts` with:

```ts
    icons: [
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
```

- [ ] **Step 6: Local build smoke**

```bash
npm run build:next 2>&1 | tail -20
```
Expected: build succeeds, no warnings about missing icon files. (We use `build:next`, not full `build`, to skip pull-content and AI indexing for local validation.)

- [ ] **Step 7: Run dev server and curl-verify icons**

```bash
npm run dev > /tmp/next-dev.log 2>&1 &
sleep 6
curl -sI http://localhost:3003/favicon.ico | head -3
curl -sI http://localhost:3003/icon.png | head -3
curl -sI http://localhost:3003/apple-icon.png | head -3
curl -s http://localhost:3003/es | grep -E 'rel="icon"|rel="apple-touch-icon"' | head -5
kill %1 2>/dev/null
```
Expected:
- All three `curl -I` return `HTTP/1.1 200 OK` and correct `Content-Type` (`image/x-icon`, `image/png`, `image/png`).
- HTML head contains `<link rel="icon" href="/icon.png?…" type="image/png" sizes="512x512"/>` and `<link rel="apple-touch-icon" href="/apple-icon.png?…" type="image/png" sizes="180x180"/>` injected by Next.

If port 3003 is taken, set `PORT=3030 npm run dev` and adjust the curl URL accordingly.

- [ ] **Step 8: Commit**

```bash
git add app/favicon.ico app/icon.png app/apple-icon.png app/layout.tsx app/manifest.ts
git commit -m "$(cat <<'EOF'
feat(seo): expose /favicon.ico, /icon.png and /apple-icon.png for SERP

Scope:
  Static SERP favicon and PWA icons via Next.js 14 app/ convention.

Problem:
  Google requires either /favicon.ico at root or a <link rel="icon"> with
  size >=48x48 to render a favicon in the SERP snippet. The site was
  serving /e2dFavicon.ico (custom path, 404 on /favicon.ico) and an
  apple-touch-icon pointing at a WebP file. Both fail Google's criteria.

Solution:
  Add app/favicon.ico, app/icon.png (512x512) and app/apple-icon.png
  (180x180). Drop the manual <link> tags from app/layout.tsx so Next
  auto-emits correctly sized link tags from the files. Realign manifest.ts
  to the standard paths.

Notes:
  Apple-touch-icon flattened to opaque background (#0a0a0a) per spec.
  Old public/e2dFavicon.ico kept untouched to avoid breaking external
  bookmarks; canonical favicon is now app/favicon.ico.
EOF
)"
```

---

## Task 2: `robots.txt` cleanup

**Files:**
- Modify: `app/robots.ts`
- Test: `__tests__/app/robots.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/robots.test.ts`:

```ts
/**
 * @jest-environment node
 */
import robots from "../../app/robots"

describe("robots() metadata route", () => {
  const out = robots()
  const rules = Array.isArray(out.rules) ? out.rules : [out.rules]
  const byAgent = (agent: string) =>
    rules.find(r => {
      const ua = Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]
      return ua.includes(agent)
    })

  it("declares the canonical sitemap and host", () => {
    expect(out.sitemap).toBe("https://evolve2digital.com/sitemap.xml")
    expect(out.host).toBe("https://evolve2digital.com")
  })

  it("has an explicit Googlebot rule that allows the public site", () => {
    const r = byAgent("Googlebot")
    expect(r).toBeDefined()
    const allow = Array.isArray(r!.allow) ? r!.allow : [r!.allow]
    const disallow = Array.isArray(r!.disallow) ? r!.disallow : [r!.disallow ?? ""]
    expect(allow).toContain("/")
    expect(disallow).toEqual(expect.arrayContaining(["/api/", "/admin/"]))
    expect(disallow).not.toContain("/*.json$")
  })

  it("does not contain the ChatGPT-User contradiction (allow blog while disallow locale)", () => {
    const r = byAgent("ChatGPT-User")
    if (!r) return // it's allowed to drop the bot entirely
    const allow = Array.isArray(r.allow) ? r.allow : [r.allow]
    const disallow = Array.isArray(r.disallow) ? r.disallow : [r.disallow ?? ""]
    const conflicts = allow.filter(a =>
      disallow.some(d => a && d && a.startsWith(d))
    )
    expect(conflicts).toEqual([])
  })

  it("does not block JSON files generically", () => {
    const generic = byAgent("*")
    const disallow = Array.isArray(generic!.disallow)
      ? generic!.disallow
      : [generic!.disallow ?? ""]
    expect(disallow).not.toContain("/*.json$")
  })

  it("declares PerplexityBot and Applebot-Extended", () => {
    expect(byAgent("PerplexityBot")).toBeDefined()
    expect(byAgent("Applebot-Extended")).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test, verify failures**

```bash
npx jest __tests__/app/robots.test.ts -v
```
Expected: at least 3 failures: `Googlebot` rule absent, `ChatGPT-User` conflict present, `PerplexityBot`/`Applebot-Extended` absent.

- [ ] **Step 3: Rewrite `app/robots.ts`**

Replace the entire contents of `app/robots.ts` with:

```ts
import type { MetadataRoute } from "next"

const BASE_URL = "https://evolve2digital.com"

const COMMON_DISALLOW = [
  "/api/",
  "/admin/",
  "/_next/",
  "/private/",
]

const PUBLIC_ALLOW = [
  "/",
  "/es/",
  "/en/",
  "/it/",
  "/es/blog/",
  "/en/blog/",
  "/it/blog/",
  "/es/docs/",
  "/en/docs/",
  "/sitemap.xml",
  "/rss.xml",
  "/llms.txt",
  "/llms-full.txt",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...COMMON_DISALLOW, "/admin/login", "/admin/edit/*", "/admin/new"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [...COMMON_DISALLOW],
      },
      {
        userAgent: "Bingbot",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "GPTBot",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "Google-Extended",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "ClaudeBot",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "PerplexityBot",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: PUBLIC_ALLOW,
        disallow: [...COMMON_DISALLOW, "/api/chat/*"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npx jest __tests__/app/robots.test.ts -v
```
Expected: all 5 tests PASS.

- [ ] **Step 5: Manual smoke**

```bash
npm run build:next > /tmp/build.log 2>&1 && tail -5 /tmp/build.log
```
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/robots.ts __tests__/app/robots.test.ts
git commit -m "$(cat <<'EOF'
fix(seo): rewrite robots.ts removing contradictions and blockers

Scope:
  app/robots.ts and its first test file.

Problem:
  Two issues affecting crawlability:
    - ChatGPT-User block allowed /es/blog/ but disallowed /es/, which is
      contradictory and rejects the blog index.
    - The generic rule disallowed /*.json$, which can affect Next.js RSC
      payloads and any structured-data JSON we may want crawled.
  No explicit Googlebot rule; PerplexityBot and Applebot-Extended were
  absent.

Solution:
  Single source of truth for allow/disallow lists at the top of the file.
  Explicit Googlebot block. New PerplexityBot and Applebot-Extended rules
  matching the AI-public allow list. ChatGPT-User now coherent (allow
  public locales, disallow only api/admin). New /llms.txt and
  /llms-full.txt entries are explicitly allowed for discoverability.

Notes:
  Snapshot-style assertions cover the contradictions test, sitemap/host
  declaration, and presence of new agents.
EOF
)"
```

---

## Task 3: `llms.txt` and `llms-full.txt`

**Files:**
- Create: `app/llms.txt/route.ts`
- Create: `app/llms-full.txt/route.ts`
- Test: `__tests__/app/llms-txt.test.ts`

The `llms.txt` standard (https://llmstxt.org/) is a single markdown file at the root with title, description, and curated section lists. `llms-full.txt` is the full markdown body of the documentation, intended for direct LLM ingestion.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/app/llms-txt.test.ts`:

```ts
/**
 * @jest-environment node
 */
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

let tmp: string

const writeMdx = (rel: string, body: string) => {
  const full = path.join(tmp, "content", rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, body, "utf-8")
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "llms-txt-"))
  fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
  process.env.CONTENT_ROOT = tmp
  jest.resetModules()
  const runtime = require("../../lib/blog/posts-runtime")
  runtime.clearPostsRuntimeCache()
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
  delete process.env.CONTENT_ROOT
})

describe("GET /llms.txt", () => {
  it("returns text/plain with site title, description and a Blog section listing published posts", async () => {
    writeMdx("posts/draft.mdx", `---
title: Draft post
description: should not appear
date: 2026-05-01
locale: es
slug: draft
published: false
---
body`)
    writeMdx("posts/published.mdx", `---
title: Published post
description: a real post
date: 2026-05-02
locale: es
slug: published
published: true
---
body`)

    const { GET } = require("../../app/llms.txt/route")
    const res: Response = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/plain")

    const body = await res.text()
    expect(body).toMatch(/^# E2D — Evolve2Digital/m)
    expect(body).toContain("## Blog")
    expect(body).toContain("/es/blog/published")
    expect(body).not.toContain("/es/blog/draft")
  })
})

describe("GET /llms-full.txt", () => {
  it("returns the full markdown body of published posts and skips drafts", async () => {
    writeMdx("posts/draft.mdx", `---
title: Draft
date: 2026-05-01
locale: es
slug: draft
published: false
---
DRAFT_BODY`)
    writeMdx("posts/p1.mdx", `---
title: First
date: 2026-05-05
locale: es
slug: first
published: true
---
FIRST_BODY`)
    writeMdx("posts/p2.mdx", `---
title: Second
date: 2026-05-04
locale: es
slug: second
published: true
---
SECOND_BODY`)

    const { GET } = require("../../app/llms-full.txt/route")
    const res: Response = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/plain")

    const body = await res.text()
    expect(body).toContain("FIRST_BODY")
    expect(body).toContain("SECOND_BODY")
    expect(body).not.toContain("DRAFT_BODY")
    // Newest first (date desc)
    expect(body.indexOf("FIRST_BODY")).toBeLessThan(body.indexOf("SECOND_BODY"))
    // Each entry preceded by a metadata header
    expect(body).toMatch(/^# First/m)
    expect(body).toContain("https://evolve2digital.com/es/blog/first")
  })
})
```

- [ ] **Step 2: Run tests, verify failures**

```bash
npx jest __tests__/app/llms-txt.test.ts -v
```
Expected: both tests FAIL with `Cannot find module '../../app/llms.txt/route'` and `... '../../app/llms-full.txt/route'`.

- [ ] **Step 3: Implement `app/llms.txt/route.ts`**

Create `app/llms.txt/route.ts`:

```ts
import { listPostsFromDisk } from "@/lib/blog/posts-runtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_URL = "https://evolve2digital.com"

const HEADER = `# E2D — Evolve2Digital

> Automatización empresarial con IA: agentes de voz, chatbots WhatsApp y workflows que liberan horas a equipos de PYMEs y mid-market en clínicas, inmobiliarias y asesorías.

E2D es una boutique de implementación. Construimos automatizaciones a medida con un loop corto: medimos el tiempo perdido en una tarea, prototipamos en días, desplegamos y monitorizamos.

`

const STATIC_SECTIONS = `## Sitio principal

- [Inicio (es)](${BASE_URL}/es): página principal en español
- [Home (en)](${BASE_URL}/en): English landing page
- [Home (it)](${BASE_URL}/it): pagina principale in italiano

## Documentación

- [Principios](${BASE_URL}/es/docs/principles)
- [Arquitectura](${BASE_URL}/es/docs/architecture)
- [Seguridad](${BASE_URL}/es/docs/security)
- [Performance](${BASE_URL}/es/docs/performance)
- [Despliegue](${BASE_URL}/es/docs/deployment)
- [GDPR](${BASE_URL}/es/docs/gdpr)

`

export async function GET(): Promise<Response> {
  const posts = await listPostsFromDisk()
  const published = posts
    .filter(p => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const blogLines = published
    .map(p => {
      const title = p.title.replace(/\]/g, "")
      const desc = p.description ? `: ${p.description}` : ""
      return `- [${title}](${BASE_URL}${p.url})${desc}`
    })
    .join("\n")

  const blogSection = `## Blog\n\n${blogLines || "_(sin posts publicados aún)_"}\n`

  const body = HEADER + STATIC_SECTIONS + blogSection

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=600, stale-while-revalidate=3600",
    },
  })
}
```

- [ ] **Step 4: Implement `app/llms-full.txt/route.ts`**

Create `app/llms-full.txt/route.ts`:

```ts
import { listPostsFromDisk } from "@/lib/blog/posts-runtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_URL = "https://evolve2digital.com"
const MAX_BYTES = 500_000 // safety guard; truncates older posts past this size

export async function GET(): Promise<Response> {
  const posts = await listPostsFromDisk()
  const published = posts
    .filter(p => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const chunks: string[] = []
  let bytes = 0

  for (const p of published) {
    const meta = `# ${p.title}\n\n` +
      `URL: ${BASE_URL}${p.url}\n` +
      `Locale: ${p.locale}\n` +
      `Date: ${p.date}\n` +
      (p.tags?.length ? `Tags: ${p.tags.join(", ")}\n` : "") +
      `\n`
    const piece = meta + (p.body?.raw ?? "") + "\n\n---\n\n"
    const size = Buffer.byteLength(piece, "utf-8")
    if (bytes + size > MAX_BYTES && chunks.length > 0) break
    chunks.push(piece)
    bytes += size
  }

  const body = chunks.join("")

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=600, stale-while-revalidate=3600",
    },
  })
}
```

Note: `RuntimePost.body` is `{ raw: string }` (verified at `lib/blog/posts-runtime.ts:36`). The route reads `p.body.raw` to get the post body without the frontmatter.

- [ ] **Step 5: Run tests, verify pass**

```bash
npx jest __tests__/app/llms-txt.test.ts -v
```
Expected: both test cases PASS. If `body` field assumption is wrong, inspect `RuntimePost` and adjust the property name in `app/llms-full.txt/route.ts`, then rerun.

- [ ] **Step 6: Smoke against dev server**

```bash
npm run dev > /tmp/next-dev.log 2>&1 &
sleep 6
curl -sI http://localhost:3003/llms.txt | head -3
curl -s http://localhost:3003/llms.txt | head -20
curl -sI http://localhost:3003/llms-full.txt | head -3
kill %1 2>/dev/null
```
Expected: 200 + `text/plain` + visible markdown structure.

- [ ] **Step 7: Commit**

```bash
git add app/llms.txt/route.ts app/llms-full.txt/route.ts __tests__/app/llms-txt.test.ts
git commit -m "$(cat <<'EOF'
feat(seo): expose /llms.txt and /llms-full.txt for AI crawlers

Scope:
  Two new dynamic route handlers under app/ plus their tests.

Problem:
  AI ingestion pipelines (Anthropic, OpenAI, Perplexity, Applebot) follow
  the emerging llmstxt.org convention to discover what content a site
  wants ingested and in what shape. evolve2digital.com had no such file.

Solution:
  /llms.txt: curated index with site description, locales, docs and an
  auto-generated Blog section sorted by date desc, drafts excluded.
  /llms-full.txt: concatenated markdown body of published posts with
  per-post header and a 500KB safety cap (newest posts win).

Notes:
  Both endpoints are no-rebuild: posts are read at request time via
  listPostsFromDisk(). Cache-Control set to 10 min public + SWR 1h.
EOF
)"
```

---

## Task 4: `hreflang` in sitemap

**Files:**
- Modify: `lib/sitemap-generator.ts:93-98` and `lib/sitemap-generator.ts:272-282`
- Test: `__tests__/lib/sitemap-generator.test.ts` (extend existing file)

- [ ] **Step 1: Add failing tests**

Append to `__tests__/lib/sitemap-generator.test.ts` (inside the existing top-level `describe("generateAISitemap (runtime, async)", ...)`):

```ts
  it("emits alternates.languages with all locales for the homepage", async () => {
    const entries = await mod.generateAISitemap()
    const home = entries.find(e => e.url === "https://evolve2digital.com/es")
    expect(home).toBeDefined()
    const langs = (home as any).alternates?.languages as Record<string, string>
    expect(langs).toBeDefined()
    expect(langs.es).toBe("https://evolve2digital.com/es")
    expect(langs.en).toBe("https://evolve2digital.com/en")
    expect(langs.it).toBe("https://evolve2digital.com/it")
    expect(langs["x-default"]).toBe("https://evolve2digital.com/es")
  })

  it("emits alternates.languages for blog index pages", async () => {
    const entries = await mod.generateAISitemap()
    const blog = entries.find(e => e.url === "https://evolve2digital.com/en/blog")
    expect(blog).toBeDefined()
    const langs = (blog as any).alternates?.languages as Record<string, string>
    expect(langs?.es).toBe("https://evolve2digital.com/es/blog")
    expect(langs?.en).toBe("https://evolve2digital.com/en/blog")
    expect(langs?.it).toBe("https://evolve2digital.com/it/blog")
    expect(langs?.["x-default"]).toBe("https://evolve2digital.com/es/blog")
  })

  it("emits alternates.languages for blog posts", async () => {
    writeMdx(
      "posts/llm.mdx",
      `---
title: LLM
date: 2026-05-01
locale: es
slug: llm
published: true
---
body`
    )
    const entries = await mod.generateAISitemap()
    const post = entries.find(e =>
      e.url === "https://evolve2digital.com/es/blog/llm"
    )
    expect(post).toBeDefined()
    const langs = (post as any).alternates?.languages as Record<string, string>
    expect(langs?.es).toBe("https://evolve2digital.com/es/blog/llm")
    expect(langs?.en).toBe("https://evolve2digital.com/en/blog/llm")
    expect(langs?.it).toBe("https://evolve2digital.com/it/blog/llm")
    expect(langs?.["x-default"]).toBe("https://evolve2digital.com/es/blog/llm")
  })
```

- [ ] **Step 2: Run tests, verify failure**

```bash
npx jest __tests__/lib/sitemap-generator.test.ts -v
```
Expected: 3 new tests FAIL because `alternates` is `undefined` on every entry.

- [ ] **Step 3: Update `lib/sitemap-generator.ts` to forward alternates**

Replace the body of `generateAlternateLanguages` (lines 272-282) with:

```ts
  private generateAlternateLanguages(path: string, _currentLocale: string): { [key: string]: string } {
    const alternates: { [key: string]: string } = {}

    this.config.supportedLocales.forEach(locale => {
      alternates[locale] = `${this.config.baseUrl}/${locale}${path}`
    })

    // x-default points to Spanish, the primary locale for E2D.
    alternates["x-default"] = `${this.config.baseUrl}/es${path}`

    return alternates
  }
```

Then update the conversion to `MetadataRoute.Sitemap` (lines 93-98) of `generateSitemap()` to:

```ts
    return sortedEntries.map(entry => ({
      url: entry.url,
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: entry.alternateLanguages
        ? { languages: entry.alternateLanguages }
        : undefined,
    }))
  }
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npx jest __tests__/lib/sitemap-generator.test.ts -v
```
Expected: all tests (existing + 3 new) PASS.

- [ ] **Step 5: Smoke against dev server, confirm XML emits xhtml:link**

```bash
npm run dev > /tmp/next-dev.log 2>&1 &
sleep 6
curl -s http://localhost:3003/sitemap.xml | grep -E 'xhtml:link|hreflang' | head -10
kill %1 2>/dev/null
```
Expected: lines like `<xhtml:link rel="alternate" hreflang="es" href="https://evolve2digital.com/es"/>` for every locale + `hreflang="x-default"`.

- [ ] **Step 6: Commit**

```bash
git add lib/sitemap-generator.ts __tests__/lib/sitemap-generator.test.ts
git commit -m "$(cat <<'EOF'
fix(seo): emit hreflang in sitemap for trilingual content

Scope:
  lib/sitemap-generator.ts and its test suite.

Problem:
  generateSitemap computed alternateLanguages for every entry but the
  conversion to MetadataRoute.Sitemap dropped the field, so the rendered
  XML had no <xhtml:link rel="alternate"> tags. Google therefore had no
  signal that /es/, /en/ and /it/ are translations of each other and
  treated them as partial duplicates.

Solution:
  generateAlternateLanguages now includes the current locale in the map
  (Next requires the entry to declare every locale, not just "the others")
  and adds an x-default pointing to the Spanish version. The map is
  forwarded to MetadataRoute.Sitemap.alternates.languages, which Next 14
  renders as <xhtml:link rel="alternate" hreflang="..."> per spec.

Notes:
  Three new tests cover homepage, blog index, and a blog post. Existing
  tests untouched.
EOF
)"
```

---

## Task 5: Final verification and PR

- [ ] **Step 1: Run the full test suite**

```bash
npx jest 2>&1 | tail -25
```
Expected: all suites pass. If a pre-existing failure surfaces, capture it but do NOT fix in this PR.

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | tail -20
```
Expected: no new errors introduced.

- [ ] **Step 3: Validate the sitemap XML once a dev server is running**

```bash
npm run dev > /tmp/next-dev.log 2>&1 &
sleep 6
curl -s http://localhost:3003/sitemap.xml > public/sitemap.xml.tmp
node -e "const {validateSitemapFile} = require('./lib/xml-validator'); validateSitemapFile('./public/sitemap.xml.tmp').then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(r.valid ? 0 : 1) })"
rm public/sitemap.xml.tmp
kill %1 2>/dev/null
```
Expected: `valid: true`.

- [ ] **Step 4: Push the branch**

```bash
git push -u origin feature/seo-favicon-robots-llms-hreflang
```

- [ ] **Step 5: Open PR to develop**

```bash
gh pr create --base develop --title "feat(seo): favicon, robots, llms.txt, hreflang" --body "$(cat <<'EOF'
## Summary
- /favicon.ico, /icon.png and /apple-icon.png exposed via Next 14 app conventions so Google renders a SERP favicon
- robots.ts cleaned: no contradictions, explicit Googlebot, new PerplexityBot and Applebot-Extended rules, /llms.txt and /llms-full.txt allowed
- /llms.txt and /llms-full.txt added, content built at request time from listPostsFromDisk
- Sitemap now emits alternates.languages so Next renders <xhtml:link rel="alternate" hreflang="..."> for the trilingual site, plus x-default

## Test plan
- [ ] `npx jest` green locally (favicon-not-tested, robots, llms-txt, sitemap-generator)
- [ ] `curl https://evolve2digital.com/favicon.ico` returns 200 after deploy
- [ ] `curl https://evolve2digital.com/llms.txt` and `/llms-full.txt` return text/plain after deploy
- [ ] `curl https://evolve2digital.com/sitemap.xml | grep xhtml:link` shows hreflang entries after deploy
- [ ] In GSC, request reindex of /es and a sample post; check favicon visible in URL Inspection preview

Spec: docs/superpowers/specs/2026-05-08-seo-favicon-robots-llms-hreflang-design.md
EOF
)"
```

- [ ] **Step 6: Post-merge production verification (manual, after merge to develop and deploy)**

```bash
curl -sI https://evolve2digital.com/favicon.ico | head -3
curl -sI https://evolve2digital.com/icon.png | head -3
curl -sI https://evolve2digital.com/apple-icon.png | head -3
curl -sI https://evolve2digital.com/llms.txt | head -3
curl -sI https://evolve2digital.com/llms-full.txt | head -3
curl -s https://evolve2digital.com/sitemap.xml | grep -E 'xhtml:link|hreflang' | head -5
curl -s https://evolve2digital.com/robots.txt | grep -E '^User-Agent|Sitemap'
```
Expected: 200s on all assets, hreflang lines present, robots lists Googlebot/PerplexityBot/Applebot-Extended.

In GSC:
1. URL Inspection → `https://evolve2digital.com/es` → "Request indexing".
2. Sitemaps → confirm `https://evolve2digital.com/sitemap.xml` shows "Success".
3. Wait 2-7 days for SERP favicon refresh; recheck `evolve2digital` brand search.

---

## Self-review notes

- Spec coverage: T1 covers favicon section, T2 covers robots section, T3 covers llms.txt section, T4 covers hreflang section, T5 covers verification plan.
- All steps contain concrete code, paths, and expected outputs.
- Type and method names consistent: `generateAlternateLanguages`, `listPostsFromDisk`, `RuntimePost.body`, `MetadataRoute.Robots`, `MetadataRoute.Sitemap`.
- `RuntimePost.body` shape verified at `lib/blog/posts-runtime.ts:36` — it is `{ raw: string }`. Route reads `p.body.raw`.
