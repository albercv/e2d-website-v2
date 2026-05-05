# Media uploads desde el chat de Claude — Implementation Plan

> ⚠️ **OBSOLETO** — reemplazado por [`2026-05-05-media-uploads-with-markers.md`](./2026-05-05-media-uploads-with-markers.md). Este plan implementa la spec del 2026-05-04 (append-to-end), que también está obsoleta. El plan vigente sigue la spec marker-based del 2026-05-05.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un usuario pueda pedirle a Claude "sube fotos al post X", recibir una URL clicable, y subir múltiples imágenes/vídeos (hasta 1 GB cada uno) desde un formulario web autenticado por JWT, con auto-inserción de las referencias en el MDX de todas las traducciones del post.

**Architecture:** El MCP expone un tool nuevo `posts_request_upload` que firma un JWT (`purpose=media-upload`, TTL 15 min) y devuelve una URL `/admin/media-upload?token=…`. El navegador valida el token, hace `fetch` por fichero a `/api/admin/media/upload` (octet-stream, streaming directo a disco vía `pipeline()`), valida MIME/tamaño, escribe en `public/uploads/<translationKey>/`, y luego anexa Markdown/JSX al body de cada MDX hermano. Un campo nuevo `translationKey` en frontmatter agrupa los posts que comparten media.

**Tech Stack:** Next.js 14 App Router, TypeScript, Jest, jsonwebtoken (HS256, mismo `JWT_SECRET` que OAuth), gray-matter, fs streams nativos. Sin librerías extra.

**Spec:** `docs/superpowers/specs/2026-05-04-media-uploads-from-claude-design.md`

**Branch:** `feature/blogConnector` (ya activa).

**Decisiones de spec resueltas en este plan:**
- El endpoint `/api/admin/media/upload` recibe **`Content-Type: application/octet-stream`** (un fichero raw por request) con headers `X-Filename` y `X-Content-Type`. La spec menciona `multipart/form-data` pero el patrón de streaming (`request.body` → `Readable.fromWeb()` → `pipeline()`) es incompatible con parsing multipart. Octet-stream permite streaming real sin buffer en memoria, que es el requisito explícito de la spec.
- Storage: `<CONTENT_ROOT>/public/uploads/<translationKey>/<filename>`. Reusamos la misma var de entorno que `posts-write.ts` para que en producción (PM2 standalone) los ficheros se escriban en el repo real, no en `.next/standalone/`. Para que Next.js los sirva en hot, el deploy debe symlinkear `<standalone>/public/uploads → <repo>/public/uploads` (documentado al final).

---

## Phase A — Campo `translationKey` en posts-runtime y posts-write

Objetivo: que cada `RuntimePost` exponga `translationKey` (default = slug) y se pueda agrupar posts hermanos.

### Task A1: Tests para `translationKey` en runtime reader

**Files:**
- Modify: `__tests__/lib/posts-runtime.test.ts`

- [ ] **Step 1: Añadir tests al final del `describe` existente**

Abre el fichero, identifica el `describe` principal y añade antes de su cierre:

```ts
  describe("translationKey", () => {
    it("lee translationKey del frontmatter cuando está presente", async () => {
      const filePath = path.join(tmpContentDir, "posts", "ferdy-es.mdx")
      await fs.writeFile(filePath, [
        "---",
        "title: Caso Ferdy",
        "description: caso de cliente",
        "date: 2026-05-01",
        "locale: es",
        "slug: caso-ferdy",
        "translationKey: ferdy-2026-05",
        "published: true",
        "---",
        "",
        "Cuerpo del post.",
      ].join("\n"))

      runtimeMod.clearPostsRuntimeCache()
      const posts = await runtimeMod.listPostsFromDisk()
      const post = posts.find((p) => p.slug === "caso-ferdy")
      expect(post?.translationKey).toBe("ferdy-2026-05")
    })

    it("hace fallback a slug cuando translationKey está ausente", async () => {
      const filePath = path.join(tmpContentDir, "posts", "sin-key.mdx")
      await fs.writeFile(filePath, [
        "---",
        "title: Sin key",
        "description: sin translationKey",
        "date: 2026-05-01",
        "locale: es",
        "slug: sin-key",
        "published: true",
        "---",
        "",
        "Cuerpo.",
      ].join("\n"))

      runtimeMod.clearPostsRuntimeCache()
      const posts = await runtimeMod.listPostsFromDisk()
      const post = posts.find((p) => p.slug === "sin-key")
      expect(post?.translationKey).toBe("sin-key")
    })

    it("findPostsByTranslationKey agrupa hermanos", async () => {
      const baseDir = path.join(tmpContentDir, "posts")
      for (const locale of ["es", "en", "it"] as const) {
        await fs.writeFile(path.join(baseDir, `multi-${locale}.mdx`), [
          "---",
          `title: Multi ${locale}`,
          "description: multi locale post",
          "date: 2026-05-01",
          `locale: ${locale}`,
          `slug: multi-${locale}`,
          "translationKey: multi-2026-05",
          "published: true",
          "---",
          "",
          "Body.",
        ].join("\n"))
      }
      runtimeMod.clearPostsRuntimeCache()
      const siblings = await runtimeMod.findPostsByTranslationKey("multi-2026-05")
      expect(siblings.map((p) => p.locale).sort()).toEqual(["en", "es", "it"])
    })
  })
```

Nota: el fichero usa una variable `tmpContentDir` para el sandbox; si el nombre real difiere, ajusta. Verifica con `grep tmpDir __tests__/lib/posts-runtime.test.ts`.

- [ ] **Step 2: Ejecutar tests para verificar que fallan**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/posts-runtime.test.ts -t translationKey`
Expected: 3 FAILS (translationKey undefined; findPostsByTranslationKey is not a function).

### Task A2: Implementar `translationKey` y `findPostsByTranslationKey`

**Files:**
- Modify: `lib/blog/posts-runtime.ts`

- [ ] **Step 1: Añadir campo a la interfaz**

Edita `lib/blog/posts-runtime.ts`. En la interfaz `RuntimePost` (línea 19), añade tras `slug: string`:

```ts
  translationKey: string
```

- [ ] **Step 2: Leer translationKey en `parseFile`**

En `parseFile`, tras la línea que valida `if (!slug || !title || !date || !locale) return null`, antes del `return`:

```ts
  const translationKey = typeof fm.translationKey === "string" && fm.translationKey.trim()
    ? fm.translationKey.trim()
    : slug
```

Y en el objeto retornado, añade `translationKey,` justo después de `slug,`.

- [ ] **Step 3: Exportar `findPostsByTranslationKey`**

Al final del fichero (tras `clearPostsRuntimeCache`), añade:

```ts
export async function findPostsByTranslationKey(key: string): Promise<RuntimePost[]> {
  const all = await listPostsFromDisk()
  return all.filter((p) => p.translationKey === key)
}
```

- [ ] **Step 4: Ejecutar tests**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/posts-runtime.test.ts`
Expected: PASS (todos los tests, incluidos los nuevos 3).

- [ ] **Step 5: Commit**

```bash
git add lib/blog/posts-runtime.ts __tests__/lib/posts-runtime.test.ts
git commit -m "feat(blog): añadir translationKey al runtime reader y findPostsByTranslationKey"
```

### Task A3: `createPost` acepta `translationKey` y lo escribe en frontmatter

**Files:**
- Modify: `__tests__/lib/posts-write.test.ts`
- Modify: `lib/blog/posts-write.ts`

- [ ] **Step 1: Test del nuevo parámetro**

En `__tests__/lib/posts-write.test.ts`, dentro del `describe("createPost", …)`, añade:

```ts
    it("escribe translationKey en frontmatter cuando se proporciona", async () => {
      const result = await mod.createPost({
        title: "Post con clave",
        description: "Post con translationKey explícito para testing.",
        content: "# Body\n\nMas de cincuenta caracteres para pasar la validacion del minimo de longitud.",
        locale: "es",
        translationKey: "shared-key-2026",
      })
      const raw = await fs.readFile(result.path, "utf-8")
      expect(raw).toMatch(/translationKey: 'shared-key-2026'/)
    })

    it("omite translationKey en frontmatter si no se proporciona", async () => {
      const result = await mod.createPost({
        title: "Post sin clave",
        description: "Post sin translationKey — debe usar fallback al slug en runtime.",
        content: "# Body\n\nMas de cincuenta caracteres para pasar la validacion del minimo de longitud.",
        locale: "es",
      })
      const raw = await fs.readFile(result.path, "utf-8")
      expect(raw).not.toMatch(/translationKey:/)
    })
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/posts-write.test.ts -t translationKey`
Expected: 1 FAIL (el primer test — el campo no se escribe).

- [ ] **Step 3: Implementar**

En `lib/blog/posts-write.ts`, en la interfaz `CreatePostInput`, añade:

```ts
  translationKey?: string
```

En `createPost`, tras la línea `const author = input.author || "Alberto Carrasco"`, añade:

```ts
  const translationKey = typeof input.translationKey === "string" ? input.translationKey.trim() : ""
```

Y en el array `frontmatterLines`, justo antes de la línea `tags.length ? …`, añade:

```ts
    ...(translationKey ? [`translationKey: ${yamlQuote(translationKey)}`] : []),
```

- [ ] **Step 4: Verificar tests**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/posts-write.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Exponer en MCP `posts_create`**

En `lib/mcp/rpc-handler.ts`, en el `inputSchema` de `posts_create` (línea ~144), añade dentro de `properties`:

```ts
            translationKey: {
              type: "string",
              description: "Clave compartida con posts hermanos (otras locales). Si se omite, default = slug.",
            },
```

Y en el `if (toolName === "posts_create")` (línea ~289), dentro del `await createPost({…})`, añade:

```ts
          translationKey: typeof args.translationKey === "string" ? args.translationKey : undefined,
```

- [ ] **Step 6: Test del wiring MCP**

En `__tests__/lib/mcp-rpc-handler.test.ts`, dentro del bloque que ya prueba `posts_create`, añade un test:

```ts
    it("posts_create acepta translationKey y lo escribe", async () => {
      const res = await handleRpcCall(
        { jsonrpc: "2.0", id: 1, method: "tools/call", params: {
          name: "posts_create",
          arguments: {
            title: "MCP con clave",
            description: "Descripcion suficiente para validar.",
            content: "# Body\n\nMas de cincuenta caracteres para pasar la validacion del minimo.",
            locale: "es",
            translationKey: "mcp-shared",
          },
        } },
        { claims: { sub: "u", email: "a@b.c", role: "admin", scope: ["posts:write"], iss: "x", aud: "y", iat: 0, exp: 9e9 } }
      )
      expect("error" in res).toBe(false)
      const created = JSON.parse((res as any).result.content[0].text)
      const raw = await fs.readFile(created.path, "utf-8")
      expect(raw).toMatch(/translationKey: 'mcp-shared'/)
    })
```

- [ ] **Step 7: Tests verdes**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/posts-write.test.ts __tests__/lib/mcp-rpc-handler.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/blog/posts-write.ts lib/mcp/rpc-handler.ts __tests__/lib/posts-write.test.ts __tests__/lib/mcp-rpc-handler.test.ts
git commit -m "feat(blog): translationKey opcional en createPost y posts_create MCP"
```

---

## Phase B — Lib de almacenamiento en streaming (`lib/blog/media-storage.ts`)

Objetivo: función pura que escribe un stream a disco bajo `public/uploads/<key>/`, con MIME whitelist, dedupe, sanitización.

### Task B1: Tests RED para `media-storage`

**Files:**
- Create: `__tests__/lib/media-storage.test.ts`

- [ ] **Step 1: Crear el fichero de tests**

Contenido completo:

```ts
/**
 * @jest-environment node
 */
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"
import { Readable } from "stream"

let mod: typeof import("../../lib/blog/media-storage")
let tmpDir: string
let originalCwd: string

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "media-storage-"))
  originalCwd = process.cwd()
  process.chdir(tmpDir)
  process.env.CONTENT_ROOT = tmpDir
  process.env.NEXT_PUBLIC_BASE_URL = "https://evolve2digital.com"
  jest.resetModules()
  mod = require("../../lib/blog/media-storage")
})

afterAll(async () => {
  process.chdir(originalCwd)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

function makeStream(buf: Buffer | string): Readable {
  return Readable.from([Buffer.isBuffer(buf) ? buf : Buffer.from(buf)])
}

describe("lib/blog/media-storage", () => {
  it("escribe el stream a disco bajo public/uploads/<key>/ y devuelve url pública", async () => {
    const result = await mod.streamSaveFile({
      stream: makeStream("hola"),
      translationKey: "ferdy-2026-05",
      filename: "Foto Original.JPG",
      contentType: "image/jpeg",
    })
    expect(result.url).toBe("/uploads/ferdy-2026-05/foto-original.jpg")
    expect(result.size).toBe(4)
    const onDisk = await fs.readFile(path.join(tmpDir, "public/uploads/ferdy-2026-05/foto-original.jpg"))
    expect(onDisk.toString()).toBe("hola")
  })

  it("rechaza MIME no permitido con error code unsupported_mime", async () => {
    await expect(
      mod.streamSaveFile({
        stream: makeStream("x"),
        translationKey: "k",
        filename: "evil.exe",
        contentType: "application/x-msdownload",
      })
    ).rejects.toMatchObject({ code: "unsupported_mime", status: 415 })
  })

  it("rechaza filename con path traversal", async () => {
    await expect(
      mod.streamSaveFile({
        stream: makeStream("x"),
        translationKey: "k",
        filename: "../../etc/passwd",
        contentType: "image/png",
      })
    ).rejects.toMatchObject({ code: "invalid_filename", status: 400 })
  })

  it("dedupe: si filename ya existe, añade sufijo numérico", async () => {
    const first = await mod.streamSaveFile({
      stream: makeStream("a"),
      translationKey: "dup",
      filename: "foto.png",
      contentType: "image/png",
    })
    const second = await mod.streamSaveFile({
      stream: makeStream("b"),
      translationKey: "dup",
      filename: "foto.png",
      contentType: "image/png",
    })
    expect(first.url).toBe("/uploads/dup/foto.png")
    expect(second.url).toBe("/uploads/dup/foto-2.png")
  })

  it("respeta tamaño máximo (sizeLimit) y borra el fichero parcial", async () => {
    const big = Buffer.alloc(100, 0x41)
    await expect(
      mod.streamSaveFile({
        stream: makeStream(big),
        translationKey: "size",
        filename: "big.png",
        contentType: "image/png",
        sizeLimit: 50,
      })
    ).rejects.toMatchObject({ code: "too_large", status: 413 })
    const exists = await fs
      .access(path.join(tmpDir, "public/uploads/size/big.png"))
      .then(() => true)
      .catch(() => false)
    expect(exists).toBe(false)
  })

  it("ALLOWED_MIME_TYPES contiene los 7 tipos del spec", () => {
    expect(mod.ALLOWED_MIME_TYPES).toEqual(
      expect.arrayContaining([
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/quicktime", "video/webm",
      ])
    )
  })
})
```

- [ ] **Step 2: Verificar que falla por módulo inexistente**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/media-storage.test.ts`
Expected: FAIL ("Cannot find module '../../lib/blog/media-storage'").

### Task B2: Implementar `lib/blog/media-storage.ts`

**Files:**
- Create: `lib/blog/media-storage.ts`

- [ ] **Step 1: Crear el módulo**

```ts
/**
 * Streaming de uploads de media a disco bajo public/uploads/<translationKey>/.
 *
 * Uso:
 *   await streamSaveFile({ stream, translationKey, filename, contentType, sizeLimit })
 *
 * El stream se escribe directamente a disco vía pipeline() — no se buffer en
 * memoria. MIME whitelist y dedupe automáticos.
 */

import * as fs from "fs"
import * as fsp from "fs/promises"
import * as path from "path"
import { pipeline } from "stream/promises"
import { Readable, Transform } from "stream"

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const

export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number]

export class MediaStorageError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "MediaStorageError"
  }
}

export interface StreamSaveInput {
  stream: Readable
  translationKey: string
  filename: string
  contentType: string
  sizeLimit?: number
}

export interface StreamSaveResult {
  url: string
  size: number
  diskPath: string
  filename: string
}

function getContentRoot(): string {
  return process.env.CONTENT_ROOT || process.cwd()
}

export function sanitizeFilename(input: string): string {
  const base = path.basename(input).trim()
  if (base !== input.trim() || base.includes("/") || base.includes("\\") || base.includes("..")) {
    throw new MediaStorageError("invalid_filename", 400, "Filename contiene path traversal o separadores", { input })
  }
  const dot = base.lastIndexOf(".")
  const namePart = dot > 0 ? base.slice(0, dot) : base
  const extPart = dot > 0 ? base.slice(dot + 1).toLowerCase() : ""
  const slug = namePart
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "file"
  return extPart ? `${slug}.${extPart}` : slug
}

function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
}

async function pickDedupedPath(dir: string, filename: string): Promise<{ filename: string; full: string }> {
  const dot = filename.lastIndexOf(".")
  const stem = dot > 0 ? filename.slice(0, dot) : filename
  const ext = dot > 0 ? filename.slice(dot) : ""
  let candidate = filename
  let i = 2
  while (true) {
    const full = path.join(dir, candidate)
    const exists = await fsp.access(full).then(() => true).catch(() => false)
    if (!exists) return { filename: candidate, full }
    candidate = `${stem}-${i}${ext}`
    i += 1
    if (i > 9999) {
      throw new MediaStorageError("dedupe_exhausted", 500, "Demasiados ficheros con el mismo nombre")
    }
  }
}

function makeSizeGuard(limit: number, getBytesWritten: () => number) {
  let total = 0
  return new Transform({
    transform(chunk, _enc, cb) {
      total += chunk.length
      if (total > limit) {
        cb(new MediaStorageError("too_large", 413, "Fichero supera el tamaño máximo", { limit, received: total }))
        return
      }
      cb(null, chunk)
    },
    flush(cb) {
      getBytesWritten()
      cb()
    },
  })
}

export async function streamSaveFile(input: StreamSaveInput): Promise<StreamSaveResult> {
  if (!isAllowedMime(input.contentType)) {
    throw new MediaStorageError("unsupported_mime", 415, "Content-Type no permitido", {
      received: input.contentType,
      allowed: ALLOWED_MIME_TYPES,
    })
  }
  const safeKey = sanitizeFilename(input.translationKey)
  const safeName = sanitizeFilename(input.filename)
  const dir = path.resolve(getContentRoot(), "public", "uploads", safeKey)
  await fsp.mkdir(dir, { recursive: true })
  const { filename, full } = await pickDedupedPath(dir, safeName)

  let bytes = 0
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      bytes += chunk.length
      cb(null, chunk)
    },
  })
  const out = fs.createWriteStream(full)

  try {
    if (input.sizeLimit && input.sizeLimit > 0) {
      const guard = makeSizeGuard(input.sizeLimit, () => bytes)
      await pipeline(input.stream, guard, counter, out)
    } else {
      await pipeline(input.stream, counter, out)
    }
  } catch (err) {
    await fsp.unlink(full).catch(() => {})
    if (err instanceof MediaStorageError) throw err
    throw new MediaStorageError("write_failed", 500, "Error escribiendo el fichero", {
      details: err instanceof Error ? err.message : String(err),
    })
  }

  return {
    url: `/uploads/${safeKey}/${filename}`,
    size: bytes,
    diskPath: full,
    filename,
  }
}

export function isMediaStorageError(err: unknown): err is MediaStorageError {
  return err instanceof MediaStorageError
}
```

- [ ] **Step 2: Tests verdes**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/media-storage.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 3: Commit**

```bash
git add lib/blog/media-storage.ts __tests__/lib/media-storage.test.ts
git commit -m "feat(blog): lib media-storage con streaming, MIME whitelist y dedupe"
```

---

## Phase C — `appendMediaToBody` en posts-write

### Task C1: Tests RED

**Files:**
- Modify: `__tests__/lib/posts-write.test.ts`

- [ ] **Step 1: Añadir un nuevo `describe` dentro del describe principal**

```ts
  describe("appendMediaToBody", () => {
    it("añade markdown de imagen al final del body, frontmatter intacto", async () => {
      const filePath = path.join(tmpDir, "content/posts/append-img.mdx")
      await fs.writeFile(filePath, [
        "---",
        "title: Append img",
        "description: testing append",
        "date: 2026-05-01",
        "locale: es",
        "slug: append-img",
        "published: true",
        "---",
        "",
        "Body original.",
        "",
      ].join("\n"))

      await mod.appendMediaToBody(filePath, [
        { url: "/uploads/k/foto.jpg", contentType: "image/jpeg", filename: "foto.jpg" },
      ])

      const raw = await fs.readFile(filePath, "utf-8")
      expect(raw).toMatch(/^---\ntitle: Append img\n/)
      expect(raw).toMatch(/Body original\./)
      expect(raw).toMatch(/!\[foto\]\(\/uploads\/k\/foto\.jpg\)/)
    })

    it("usa <video> para mime video/*", async () => {
      const filePath = path.join(tmpDir, "content/posts/append-vid.mdx")
      await fs.writeFile(filePath, [
        "---",
        "title: Append vid",
        "description: testing append video",
        "date: 2026-05-01",
        "locale: es",
        "slug: append-vid",
        "published: true",
        "---",
        "",
        "Original.",
        "",
      ].join("\n"))

      await mod.appendMediaToBody(filePath, [
        { url: "/uploads/k/clip.mp4", contentType: "video/mp4", filename: "clip.mp4" },
      ])
      const raw = await fs.readFile(filePath, "utf-8")
      expect(raw).toMatch(/<video src="\/uploads\/k\/clip\.mp4" controls preload="metadata"><\/video>/)
    })

    it("añade múltiples ítems en orden con líneas en blanco entre ellos", async () => {
      const filePath = path.join(tmpDir, "content/posts/append-multi.mdx")
      await fs.writeFile(filePath, [
        "---",
        "title: Multi",
        "description: testing multi append",
        "date: 2026-05-01",
        "locale: es",
        "slug: append-multi",
        "published: true",
        "---",
        "",
        "Body.",
        "",
      ].join("\n"))

      await mod.appendMediaToBody(filePath, [
        { url: "/uploads/k/a.png", contentType: "image/png", filename: "a.png" },
        { url: "/uploads/k/b.png", contentType: "image/png", filename: "b.png" },
      ])
      const raw = await fs.readFile(filePath, "utf-8")
      const idxA = raw.indexOf("/uploads/k/a.png")
      const idxB = raw.indexOf("/uploads/k/b.png")
      expect(idxA).toBeGreaterThan(0)
      expect(idxB).toBeGreaterThan(idxA)
    })
  })
```

- [ ] **Step 2: Verificar fallo**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/posts-write.test.ts -t appendMediaToBody`
Expected: FAIL ("appendMediaToBody is not a function").

### Task C2: Implementar `appendMediaToBody`

**Files:**
- Modify: `lib/blog/posts-write.ts`

- [ ] **Step 1: Importar gray-matter**

Al principio del fichero (con los demás imports), añade:

```ts
import matter from "gray-matter"
```

- [ ] **Step 2: Añadir tipos y función**

Tras `export function isPostsWriteError`, añade:

```ts
export interface MediaItem {
  url: string
  contentType: string
  filename: string
}

function renderMediaBlock(item: MediaItem): string {
  if (item.contentType.startsWith("video/")) {
    return `<video src="${item.url}" controls preload="metadata"></video>`
  }
  const dot = item.filename.lastIndexOf(".")
  const alt = dot > 0 ? item.filename.slice(0, dot) : item.filename
  return `![${alt}](${item.url})`
}

export async function appendMediaToBody(filePath: string, items: MediaItem[]): Promise<void> {
  if (items.length === 0) return
  const raw = await fs.readFile(filePath, { encoding: "utf-8" })
  const parsed = matter(raw)
  const body = parsed.content.replace(/\s+$/, "")
  const blocks = items.map(renderMediaBlock).join("\n\n")
  const newBody = `${body}\n\n${blocks}\n`
  const out = matter.stringify(newBody, parsed.data)
  await fs.writeFile(filePath, out, { encoding: "utf-8" })
}
```

- [ ] **Step 3: Tests verdes**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/posts-write.test.ts`
Expected: PASS (todos).

- [ ] **Step 4: Commit**

```bash
git add lib/blog/posts-write.ts __tests__/lib/posts-write.test.ts
git commit -m "feat(blog): appendMediaToBody escribe imágenes/vídeos al final del MDX"
```

---

## Phase D — JWT upload token

### Task D1: Tests + helpers `signUploadToken` / `verifyUploadToken`

**Files:**
- Create: `__tests__/lib/oauth-jwt-upload.test.ts`
- Modify: `lib/oauth-jwt.ts`

- [ ] **Step 1: Test RED**

Crea `__tests__/lib/oauth-jwt-upload.test.ts`:

```ts
/**
 * @jest-environment node
 */
const SECRET = "test-secret-must-be-at-least-32-bytes-long-for-jwt"

beforeAll(() => {
  process.env.JWT_SECRET = SECRET
  process.env.NEXT_PUBLIC_BASE_URL = "https://evolve2digital.com"
})

describe("upload token (oauth-jwt)", () => {
  it("sign + verify round-trip con payload de media-upload", () => {
    const mod = require("../../lib/oauth-jwt")
    const token = mod.signUploadToken(
      {
        slug: "caso-ferdy",
        locale: "es",
        translationKey: "ferdy-2026-05",
        targets: ["caso-ferdy:es", "ferdy-case:en"],
      },
      900
    )
    const claims = mod.verifyUploadToken(token)
    expect(claims).toMatchObject({
      purpose: "media-upload",
      slug: "caso-ferdy",
      locale: "es",
      translationKey: "ferdy-2026-05",
      targets: ["caso-ferdy:es", "ferdy-case:en"],
    })
    expect(claims.exp).toBeGreaterThan(claims.iat)
  })

  it("verify rechaza un access-token normal (purpose distinto)", () => {
    const mod = require("../../lib/oauth-jwt")
    const access = mod.signAccessToken({ sub: "u", email: "a@b.c", role: "admin", scope: ["x"], aud: "https://evolve2digital.com" })
    expect(mod.verifyUploadToken(access)).toBeNull()
  })

  it("verify devuelve null si el token está expirado", () => {
    const mod = require("../../lib/oauth-jwt")
    const token = mod.signUploadToken(
      { slug: "x", locale: "es", translationKey: "x", targets: [] },
      -10
    )
    expect(mod.verifyUploadToken(token)).toBeNull()
  })
})
```

- [ ] **Step 2: Verificar fallo**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/oauth-jwt-upload.test.ts`
Expected: FAIL ("signUploadToken is not a function").

- [ ] **Step 3: Añadir helpers a `lib/oauth-jwt.ts`**

Al final del fichero:

```ts
export type UploadTokenClaims = {
  purpose: "media-upload"
  slug: string
  locale: "es" | "en" | "it"
  translationKey: string
  targets: string[]
  iss: string
  iat: number
  exp: number
}

export function signUploadToken(
  payload: { slug: string; locale: "es" | "en" | "it"; translationKey: string; targets: string[] },
  ttlSeconds = 900
): string {
  const issuer = getIssuer()
  const iat = now()
  const exp = iat + ttlSeconds
  const claims: UploadTokenClaims = {
    purpose: "media-upload",
    slug: payload.slug,
    locale: payload.locale,
    translationKey: payload.translationKey,
    targets: payload.targets,
    iss: issuer,
    iat,
    exp,
  }
  return jwt.sign(claims, getJwtSecret(), { algorithm: "HS256" })
}

export function verifyUploadToken(token: string): UploadTokenClaims | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as UploadTokenClaims
    if (!decoded || typeof decoded !== "object") return null
    if (decoded.purpose !== "media-upload") return null
    if (!decoded.slug || !decoded.locale || !decoded.translationKey) return null
    if (decoded.iss !== getIssuer()) return null
    return decoded
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Tests verdes**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/oauth-jwt-upload.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/oauth-jwt.ts __tests__/lib/oauth-jwt-upload.test.ts
git commit -m "feat(auth): signUploadToken/verifyUploadToken para flujo de media uploads"
```

---

## Phase E — Tool MCP `posts_request_upload`

### Task E1: Tests RED

**Files:**
- Modify: `__tests__/lib/mcp-rpc-handler.test.ts`

- [ ] **Step 1: Añadir bloque de tests**

Dentro del `describe` principal, añade:

```ts
  describe("posts_request_upload", () => {
    beforeEach(async () => {
      // sembrar caso-ferdy con translationKey y un hermano EN
      const baseDir = path.join(tmpDir, "content/posts")
      await fs.mkdir(baseDir, { recursive: true })
      await fs.writeFile(path.join(baseDir, "caso-ferdy.mdx"), [
        "---",
        "title: Caso Ferdy",
        "description: caso de cliente para upload",
        "date: 2026-05-01",
        "locale: es",
        "slug: caso-ferdy",
        "translationKey: ferdy-2026-05",
        "published: true",
        "---",
        "",
        "Body es.",
      ].join("\n"))
      await fs.writeFile(path.join(baseDir, "ferdy-case.mdx"), [
        "---",
        "title: Ferdy Case",
        "description: client case for upload",
        "date: 2026-05-01",
        "locale: en",
        "slug: ferdy-case",
        "translationKey: ferdy-2026-05",
        "published: true",
        "---",
        "",
        "Body en.",
      ].join("\n"))
      runtimeMod.clearPostsRuntimeCache()
    })

    it("devuelve uploadUrl con JWT y lista de targets (es+en)", async () => {
      const res = await handleRpcCall(
        { jsonrpc: "2.0", id: 1, method: "tools/call", params: {
          name: "posts_request_upload",
          arguments: { slug: "caso-ferdy", locale: "es" },
        } },
        { claims: { sub: "u", email: "a@b.c", role: "admin", scope: ["posts:write"], iss: "x", aud: "y", iat: 0, exp: 9e9 } }
      )
      expect("error" in res).toBe(false)
      const out = JSON.parse((res as any).result.content[0].text)
      expect(out.uploadUrl).toMatch(/^https?:\/\/.+\/admin\/media-upload\?token=.+/)
      expect(out.targets.map((t: any) => t.locale).sort()).toEqual(["en", "es"])
      expect(typeof out.expiresAt).toBe("string")
    })

    it("falla con not_found si el slug no existe", async () => {
      const res = await handleRpcCall(
        { jsonrpc: "2.0", id: 2, method: "tools/call", params: {
          name: "posts_request_upload",
          arguments: { slug: "no-existe", locale: "es" },
        } },
        { claims: { sub: "u", email: "a@b.c", role: "admin", scope: ["posts:write"], iss: "x", aud: "y", iat: 0, exp: 9e9 } }
      )
      expect("error" in res).toBe(true)
    })

    it("falla con insufficient_scope sin posts:write", async () => {
      const res = await handleRpcCall(
        { jsonrpc: "2.0", id: 3, method: "tools/call", params: {
          name: "posts_request_upload",
          arguments: { slug: "caso-ferdy", locale: "es" },
        } },
        { claims: { sub: "u", email: "a@b.c", role: "admin", scope: [], iss: "x", aud: "y", iat: 0, exp: 9e9 } }
      )
      expect("error" in res).toBe(true)
      expect((res as any).error.message).toBe("insufficient_scope")
    })

    it("aparece en tools/list", async () => {
      const res = await handleRpcCall(
        { jsonrpc: "2.0", id: 4, method: "tools/list" },
        { claims: null }
      )
      const tools = (res as any).result.tools
      expect(tools.find((t: any) => t.name === "posts_request_upload")).toBeTruthy()
    })
  })
```

Asegúrate de que `runtimeMod` está importado en el setup del fichero (igual que en posts-write.test.ts). Si no, añade en el `beforeAll`:

```ts
runtimeMod = require("../../lib/blog/posts-runtime")
```

y la declaración `let runtimeMod: typeof import("../../lib/blog/posts-runtime")` arriba.

- [ ] **Step 2: Verificar fallo**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/mcp-rpc-handler.test.ts -t posts_request_upload`
Expected: FAIL.

### Task E2: Implementar el tool

**Files:**
- Modify: `lib/mcp/rpc-handler.ts`

- [ ] **Step 1: Imports**

Al principio del fichero, añade:

```ts
import { findPostsByTranslationKey } from "@/lib/blog/posts-runtime"
import { signUploadToken } from "@/lib/oauth-jwt"
```

- [ ] **Step 2: Añadir definición del tool a `toolsList()`**

Dentro del array `tools`, tras `posts_rebuild` y antes del cierre `]`, añade:

```ts
      {
        name: "posts_request_upload",
        description:
          "Devuelve una URL clicable para que el usuario suba fotos/vídeos al post desde el navegador (requiere scope posts:write). El usuario hace click → autentica con JWT → sube ficheros vía streaming → se anexan automáticamente al MDX de todos los posts hermanos (mismo translationKey).",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
          },
          required: ["slug", "locale"],
        },
      },
```

- [ ] **Step 3: Handler**

Dentro del `if (req.method === "tools/call")`, antes del último `return errorResponse(id, -32601, "Method not found")`, añade:

```ts
    if (toolName === "posts_request_upload") {
      const scopeErr = requireScope(ctx, "posts:write", id)
      if (scopeErr) return scopeErr

      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      if (!slug.trim() || !locale) {
        return errorResponse(id, -32602, "Invalid params", { fields: ["slug", "locale"] })
      }

      const post = await getPost({ id: slug, locale, includeContent: false })
      if (!post) {
        return errorResponse(id, -32004, "not_found", { slug, locale })
      }

      const { findPostsByTranslationKey: findSiblings } = await import("@/lib/blog/posts-runtime")
      const allSiblings = await findSiblings((post as any).translationKey || slug)
      const siblings = allSiblings.length > 0
        ? allSiblings
        : [{ slug: post.id, locale: locale as "es" | "en" | "it", translationKey: slug, title: post.title }]

      const targets = siblings.map((s) => ({
        slug: s.slug,
        locale: s.locale,
        title: (s as any).title,
      }))

      const ttl = 15 * 60
      const token = signUploadToken(
        {
          slug,
          locale,
          translationKey: (siblings[0] as any).translationKey || slug,
          targets: targets.map((t) => `${t.slug}:${t.locale}`),
        },
        ttl
      )
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://evolve2digital.com"
      const uploadUrl = `${baseUrl}/admin/media-upload?token=${encodeURIComponent(token)}`
      const expiresAt = new Date((Math.floor(Date.now() / 1000) + ttl) * 1000).toISOString()

      return successResponse(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify({ uploadUrl, expiresAt, targets }),
          },
        ],
      })
    }
```

Nota: `getPost` actualmente devuelve `{ id, title, url, content? }`; el campo `translationKey` no está. Resolución: en `lib/blog/posts.ts` (función `getPost`/`searchPosts`) añadimos `translationKey` al output. Ver siguiente step.

- [ ] **Step 4: Exponer translationKey en `lib/blog/posts.ts`**

Run: `grep -n "export.*function.*getPost\|export.*function.*searchPosts" lib/blog/posts.ts` para localizar las funciones. En la interfaz `Post` (o tipo de retorno de `getPost`), añade `translationKey: string`. En la implementación, copia el campo desde el `RuntimePost`. Mismo para `searchPosts` si su tipo lo expone.

Si `getPost` ya devuelve un objeto sin tipar fuertemente, simplemente añade `translationKey: post.translationKey` en el return.

- [ ] **Step 5: Tests verdes**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/mcp-rpc-handler.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/mcp/rpc-handler.ts lib/blog/posts.ts __tests__/lib/mcp-rpc-handler.test.ts
git commit -m "feat(mcp): tool posts_request_upload firma JWT y devuelve URL al admin"
```

---

## Phase F — Endpoint `/api/admin/media/upload`

### Task F1: Tests RED

**Files:**
- Create: `__tests__/api/media-upload.test.ts`

- [ ] **Step 1: Crear tests**

```ts
/**
 * @jest-environment node
 */
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"
import { Readable } from "stream"

const SECRET = "test-secret-must-be-at-least-32-bytes-long-for-jwt"

let tmpDir: string
let originalCwd: string
let mod: typeof import("../../app/api/admin/media/upload/route")
let jwtMod: typeof import("../../lib/oauth-jwt")
let runtimeMod: typeof import("../../lib/blog/posts-runtime")

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "media-upload-route-"))
  await fs.mkdir(path.join(tmpDir, "content/posts"), { recursive: true })
  // sembrar 2 hermanos
  for (const [locale, slug] of [["es", "caso-ferdy"], ["en", "ferdy-case"]] as const) {
    await fs.writeFile(path.join(tmpDir, "content/posts", `${slug}.mdx`), [
      "---",
      `title: Caso ${locale}`,
      "description: caso de cliente para upload",
      "date: 2026-05-01",
      `locale: ${locale}`,
      `slug: ${slug}`,
      "translationKey: ferdy-2026-05",
      "published: true",
      "---",
      "",
      `Body ${locale}.`,
    ].join("\n"))
  }
  originalCwd = process.cwd()
  process.chdir(tmpDir)
  process.env.JWT_SECRET = SECRET
  process.env.CONTENT_ROOT = tmpDir
  process.env.NEXT_PUBLIC_BASE_URL = "https://evolve2digital.com"
  jest.resetModules()
  mod = require("../../app/api/admin/media/upload/route")
  jwtMod = require("../../lib/oauth-jwt")
  runtimeMod = require("../../lib/blog/posts-runtime")
})

afterAll(async () => {
  process.chdir(originalCwd)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  runtimeMod.clearPostsRuntimeCache()
})

function makeReq(opts: { token?: string; body: Buffer; contentType?: string; filename?: string }): Request {
  const headers = new Headers()
  if (opts.token) headers.set("authorization", `Bearer ${opts.token}`)
  headers.set("content-type", opts.contentType || "application/octet-stream")
  if (opts.filename) headers.set("x-filename", opts.filename)
  if (opts.contentType) headers.set("x-content-type", opts.contentType)
  const stream = Readable.from([opts.body])
  // @ts-expect-error — Web Stream from Node Readable
  return new Request("https://test.local/api/admin/media/upload", {
    method: "POST",
    headers,
    body: Readable.toWeb(stream),
    duplex: "half",
  } as any)
}

describe("/api/admin/media/upload", () => {
  it("401 sin token", async () => {
    const res = await mod.POST(makeReq({ body: Buffer.from("x"), contentType: "image/png", filename: "a.png" }))
    expect(res.status).toBe(401)
  })

  it("401 con token expirado", async () => {
    const token = jwtMod.signUploadToken(
      { slug: "caso-ferdy", locale: "es", translationKey: "ferdy-2026-05", targets: ["caso-ferdy:es", "ferdy-case:en"] },
      -1
    )
    const res = await mod.POST(makeReq({ token, body: Buffer.from("x"), contentType: "image/png", filename: "a.png" }))
    expect(res.status).toBe(401)
  })

  it("415 con MIME prohibido", async () => {
    const token = jwtMod.signUploadToken(
      { slug: "caso-ferdy", locale: "es", translationKey: "ferdy-2026-05", targets: ["caso-ferdy:es", "ferdy-case:en"] },
      900
    )
    const res = await mod.POST(makeReq({ token, body: Buffer.from("x"), contentType: "application/x-msdownload", filename: "evil.exe" }))
    expect(res.status).toBe(415)
  })

  it("200 con token válido + imagen → fichero en disco + MDX hermanos actualizados", async () => {
    const token = jwtMod.signUploadToken(
      { slug: "caso-ferdy", locale: "es", translationKey: "ferdy-2026-05", targets: ["caso-ferdy:es", "ferdy-case:en"] },
      900
    )
    const body = Buffer.from("PNGDATA")
    const res = await mod.POST(makeReq({ token, body, contentType: "image/png", filename: "foto.png" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.file.url).toBe("/uploads/ferdy-2026-05/foto.png")
    // disco
    const onDisk = await fs.readFile(path.join(tmpDir, "public/uploads/ferdy-2026-05/foto.png"))
    expect(onDisk.equals(body)).toBe(true)
    // ambos MDX actualizados
    const es = await fs.readFile(path.join(tmpDir, "content/posts/caso-ferdy.mdx"), "utf-8")
    const en = await fs.readFile(path.join(tmpDir, "content/posts/ferdy-case.mdx"), "utf-8")
    expect(es).toMatch(/!\[foto\]\(\/uploads\/ferdy-2026-05\/foto\.png\)/)
    expect(en).toMatch(/!\[foto\]\(\/uploads\/ferdy-2026-05\/foto\.png\)/)
  })
})
```

- [ ] **Step 2: Verificar fallo**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/api/media-upload.test.ts`
Expected: FAIL ("Cannot find module …/route").

### Task F2: Implementar la route

**Files:**
- Create: `app/api/admin/media/upload/route.ts`

- [ ] **Step 1: Crear el handler**

```ts
/**
 * Endpoint streaming para subida de media desde /admin/media-upload.
 * Valida JWT (purpose=media-upload), hace stream a disco, y anexa al MDX
 * de todos los posts hermanos (mismo translationKey).
 *
 * Content-Type esperado: application/octet-stream con headers
 *   X-Filename, X-Content-Type, Authorization: Bearer <jwt>.
 */

import { Readable } from "stream"
import * as path from "path"
import { NextResponse } from "next/server"
import { verifyUploadToken } from "@/lib/oauth-jwt"
import { streamSaveFile, isMediaStorageError } from "@/lib/blog/media-storage"
import { findPostsByTranslationKey } from "@/lib/blog/posts-runtime"
import { appendMediaToBody, type MediaItem } from "@/lib/blog/posts-write"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_MAX_BYTES = 1024 * 1024 * 1024 // 1 GB

function getContentRoot(): string {
  return process.env.CONTENT_ROOT || process.cwd()
}

function getMaxBytes(): number {
  const env = process.env.MEDIA_UPLOAD_MAX_BYTES
  const n = env ? Number(env) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES
}

export async function POST(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""
  const claims = token ? verifyUploadToken(token) : null
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const filename = req.headers.get("x-filename") || ""
  const contentType = req.headers.get("x-content-type") || req.headers.get("content-type") || ""
  if (!filename) {
    return NextResponse.json({ error: "missing_filename" }, { status: 400 })
  }
  if (!req.body) {
    return NextResponse.json({ error: "missing_body" }, { status: 400 })
  }

  const nodeStream = Readable.fromWeb(req.body as any)
  let saved
  try {
    saved = await streamSaveFile({
      stream: nodeStream,
      translationKey: claims.translationKey,
      filename,
      contentType,
      sizeLimit: getMaxBytes(),
    })
  } catch (err) {
    if (isMediaStorageError(err)) {
      return NextResponse.json({ error: err.code, details: err.details }, { status: err.status })
    }
    return NextResponse.json({ error: "internal_error", details: String(err) }, { status: 500 })
  }

  const siblings = await findPostsByTranslationKey(claims.translationKey)
  const item: MediaItem = { url: saved.url, contentType, filename: saved.filename }
  const updated: string[] = []
  for (const sib of siblings) {
    const filePath = path.resolve(getContentRoot(), "content", sib._raw.sourceFilePath)
    try {
      await appendMediaToBody(filePath, [item])
      updated.push(`${sib.slug}:${sib.locale}`)
    } catch (err) {
      // El fichero ya está en disco; reportamos el sibling fallido sin abortar
      // los demás. El cliente puede reintentar editando a mano si hace falta.
    }
  }

  return NextResponse.json({
    ok: true,
    file: { url: saved.url, size: saved.size, filename: saved.filename },
    updatedPosts: updated,
  })
}
```

- [ ] **Step 2: Tests verdes**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/api/media-upload.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/media/upload/route.ts __tests__/api/media-upload.test.ts
git commit -m "feat(api): endpoint streaming /api/admin/media/upload con JWT y append MDX"
```

---

## Phase G — Página `/admin/media-upload`

### Task G1: Crear la página cliente

**Files:**
- Create: `app/admin/media-upload/page.tsx`

- [ ] **Step 1: Página con drag-drop, progreso por fichero y validación de token**

```tsx
"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

interface FileEntry {
  file: File
  id: string
  status: "pending" | "uploading" | "done" | "error"
  progress: number
  error?: string
  url?: string
}

interface TargetSummary {
  slug: string
  locale: string
  title: string
}

function decodeTokenPayload(token: string): { translationKey?: string; slug?: string; locale?: string; targets?: string[]; exp?: number } | null {
  try {
    const part = token.split(".")[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function MediaUploadInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const payload = useMemo(() => decodeTokenPayload(token), [token])
  const [files, setFiles] = useState<FileEntry[]>([])
  const [busy, setBusy] = useState(false)

  const expired = !payload || (payload.exp && payload.exp * 1000 < Date.now())
  const targets: TargetSummary[] = []
  if (payload?.targets) {
    for (const t of payload.targets) {
      const [slug, locale] = t.split(":")
      if (slug && locale) targets.push({ slug, locale, title: slug })
    }
  }

  function onPick(picked: FileList | null) {
    if (!picked) return
    const next: FileEntry[] = Array.from(picked).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      status: "pending",
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...next])
  }

  async function uploadOne(entry: FileEntry): Promise<FileEntry> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/admin/media/upload")
      xhr.setRequestHeader("authorization", `Bearer ${token}`)
      xhr.setRequestHeader("x-filename", entry.file.name)
      xhr.setRequestHeader("x-content-type", entry.file.type || "application/octet-stream")
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          setFiles((cur) => cur.map((f) => (f.id === entry.id ? { ...f, status: "uploading", progress: pct } : f)))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const body = JSON.parse(xhr.responseText || "{}")
          resolve({ ...entry, status: "done", progress: 100, url: body?.file?.url })
        } else {
          const body = (() => { try { return JSON.parse(xhr.responseText) } catch { return {} } })()
          resolve({ ...entry, status: "error", error: body?.error || `HTTP ${xhr.status}` })
        }
      }
      xhr.onerror = () => resolve({ ...entry, status: "error", error: "network_error" })
      xhr.send(entry.file)
    })
  }

  async function uploadAll() {
    setBusy(true)
    for (const entry of files) {
      if (entry.status === "done") continue
      const updated = await uploadOne(entry)
      setFiles((cur) => cur.map((f) => (f.id === updated.id ? updated : f)))
    }
    setBusy(false)
  }

  if (expired) {
    return (
      <main className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">Enlace caducado</h1>
        <p>El enlace de subida ha expirado. Vuelve al chat de Claude y pide otro.</p>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Subir media al post</h1>
        <p className="text-sm text-muted-foreground">
          Subiendo a: <strong>{payload?.slug}</strong> ({payload?.locale}). Se aplicará a {targets.length} post(s):{" "}
          {targets.map((t) => `${t.slug} (${t.locale})`).join(", ")}.
        </p>
      </header>

      <label
        htmlFor="picker"
        className="block border-2 border-dashed rounded-md p-8 text-center cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onPick(e.dataTransfer.files)
        }}
      >
        Arrastra ficheros o haz click para seleccionar
        <input
          id="picker"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
      </label>

      <ul className="space-y-2">
        {files.map((f) => (
          <li key={f.id} className="border rounded p-2">
            <div className="flex justify-between text-sm">
              <span>{f.file.name}</span>
              <span>
                {f.status === "done" ? "✅" : f.status === "error" ? `❌ ${f.error}` : `${f.progress}%`}
              </span>
            </div>
            {f.status === "uploading" && (
              <div className="w-full bg-muted h-1 rounded">
                <div className="h-1 bg-primary rounded" style={{ width: `${f.progress}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <Button onClick={uploadAll} disabled={busy || files.length === 0}>
        {busy ? "Subiendo..." : "Subir"}
      </Button>

      {files.length > 0 && files.every((f) => f.status === "done") && (
        <p className="text-sm text-green-600">
          ✅ {files.length} fichero(s) subido(s) a {targets.length} post(s). Vuelve al chat de Claude.
        </p>
      )}
    </main>
  )
}

export default function MediaUploadPage() {
  return (
    <Suspense fallback={<main className="max-w-xl mx-auto p-8">Cargando…</main>}>
      <MediaUploadInner />
    </Suspense>
  )
}
```

- [ ] **Step 2: Smoke check (build)**

Run: `cd /root/e2dProject/e2d-website-v2 && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "media-upload|app/admin/media" | head -20`
Expected: 0 errors atribuibles a la nueva página.

- [ ] **Step 3: Commit**

```bash
git add app/admin/media-upload/page.tsx
git commit -m "feat(admin): página /admin/media-upload con drag-drop y progreso"
```

---

## Phase H — `posts_delete` limpia uploads huérfanos

### Task H1: Test RED + implementación

**Files:**
- Modify: `__tests__/lib/posts-write.test.ts`
- Modify: `lib/blog/posts-write.ts`

- [ ] **Step 1: Test**

En el `describe("deletePost", …)`, añade:

```ts
    it("borra public/uploads/<key>/ si era el último hermano", async () => {
      const baseDir = path.join(tmpDir, "content/posts")
      await fs.writeFile(path.join(baseDir, "lonely.mdx"), [
        "---",
        "title: Solo",
        "description: ultimo hermano del grupo",
        "date: 2026-05-01",
        "locale: es",
        "slug: lonely",
        "translationKey: lonely-key",
        "published: true",
        "---",
        "",
        "Body.",
      ].join("\n"))
      const uploadsDir = path.join(tmpDir, "public/uploads/lonely-key")
      await fs.mkdir(uploadsDir, { recursive: true })
      await fs.writeFile(path.join(uploadsDir, "x.png"), "data")
      runtimeMod.clearPostsRuntimeCache()

      await mod.deletePost({ slug: "lonely", locale: "es" })

      const exists = await fs.access(uploadsDir).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    })

    it("conserva public/uploads/<key>/ si quedan hermanos", async () => {
      const baseDir = path.join(tmpDir, "content/posts")
      await fs.writeFile(path.join(baseDir, "twin-es.mdx"), [
        "---",
        "title: Twin ES",
        "description: gemelo es",
        "date: 2026-05-01",
        "locale: es",
        "slug: twin-es",
        "translationKey: twin-key",
        "published: true",
        "---",
        "",
        "Body.",
      ].join("\n"))
      await fs.writeFile(path.join(baseDir, "twin-en.mdx"), [
        "---",
        "title: Twin EN",
        "description: gemelo en",
        "date: 2026-05-01",
        "locale: en",
        "slug: twin-en",
        "translationKey: twin-key",
        "published: true",
        "---",
        "",
        "Body.",
      ].join("\n"))
      const uploadsDir = path.join(tmpDir, "public/uploads/twin-key")
      await fs.mkdir(uploadsDir, { recursive: true })
      await fs.writeFile(path.join(uploadsDir, "x.png"), "data")
      runtimeMod.clearPostsRuntimeCache()

      await mod.deletePost({ slug: "twin-es", locale: "es" })

      const exists = await fs.access(uploadsDir).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })
```

- [ ] **Step 2: Verificar fallo**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/posts-write.test.ts -t "uploads"`
Expected: FAIL (el directorio sigue existiendo tras delete).

- [ ] **Step 3: Implementar limpieza en `deletePost`**

En `lib/blog/posts-write.ts`, justo antes del `return { slug, locale, path: filePath }` final de `deletePost`, añade:

```ts
  // Limpiar uploads huérfanos: si tras borrar el target, ningún hermano
  // referencia el translationKey, eliminamos el directorio compartido.
  try {
    const remaining = await listPostsFromDisk()
    const stillHasSiblings = remaining.some((p) => p.translationKey === target.translationKey)
    if (!stillHasSiblings) {
      const uploadsDir = path.resolve(getContentRoot(), "public", "uploads", target.translationKey)
      await fs.rm(uploadsDir, { recursive: true, force: true })
    }
  } catch {
    // limpieza best-effort; no fallamos el delete principal
  }
```

Necesitas también limpiar la cache del runtime tras el unlink para que el `listPostsFromDisk` siguiente no devuelva el target borrado. Justo tras `await fs.unlink(filePath)`:

```ts
  const { clearPostsRuntimeCache } = await import("@/lib/blog/posts-runtime")
  clearPostsRuntimeCache()
```

- [ ] **Step 4: Tests verdes**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/posts-write.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/blog/posts-write.ts __tests__/lib/posts-write.test.ts
git commit -m "feat(blog): posts_delete limpia public/uploads/<key> si era el último hermano"
```

---

## Phase I — Plumbing: gitignore, script de migración, doc nginx

### Task I1: gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Añadir línea**

Edita `.gitignore`. Tras la sección de `# next.js`, añade:

```
# uploads de media subidos vía /admin/media-upload — runtime, no commitear
/public/uploads/
```

- [ ] **Step 2: Verificar**

Run: `cd /root/e2dProject/e2d-website-v2 && git check-ignore public/uploads/foo.png`
Expected: `public/uploads/foo.png` (la ruta se imprime → está ignorada).

### Task I2: Script `scripts/migrate-translation-keys.js`

**Files:**
- Create: `scripts/migrate-translation-keys.js`

- [ ] **Step 1: Crear el script interactivo**

```js
#!/usr/bin/env node
/**
 * Migración one-shot: asigna `translationKey` a los posts MDX legacy.
 *
 * Lee todos los .mdx bajo content/, agrupa por similitud de slug-stem
 * (sin sufijos de locale), y propone al usuario un translationKey por grupo.
 * Tras confirmar, reescribe cada fichero añadiendo el campo al frontmatter.
 *
 * Uso:
 *   node scripts/migrate-translation-keys.js              # dry-run
 *   node scripts/migrate-translation-keys.js --apply      # escribe cambios
 */

const fs = require("fs")
const path = require("path")
const matter = require("gray-matter")
const readline = require("readline")

const APPLY = process.argv.includes("--apply")
const ROOT = path.resolve(process.cwd(), "content")

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.isFile() && entry.name.endsWith(".mdx")) out.push(full)
  }
  return out
}

function stem(slug) {
  // Quita sufijos de locale típicos: -es, -en, -it, -empresarial, -enterprise…
  return slug
    .replace(/-(es|en|it)$/, "")
    .replace(/-(empresarial|enterprise|aziendale|business)$/, "")
}

async function main() {
  const files = walk(ROOT)
  const items = files.map((file) => {
    const raw = fs.readFileSync(file, "utf-8")
    const fm = matter(raw)
    return { file, slug: fm.data.slug || path.basename(file, ".mdx"), locale: fm.data.locale, hasKey: !!fm.data.translationKey, raw, fm }
  })

  const groups = new Map()
  for (const it of items) {
    if (it.hasKey) continue
    const key = stem(it.slug)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(it)
  }

  console.log("Grupos propuestos:")
  for (const [key, group] of groups) {
    console.log(`  ${key}  ←  ${group.map((g) => `${g.slug}(${g.locale})`).join(", ")}`)
  }

  if (!APPLY) {
    console.log("\nDry-run. Pasa --apply para escribir.")
    return
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  for (const [key, group] of groups) {
    const ans = await new Promise((res) => rl.question(`Escribir translationKey="${key}" en ${group.length} fichero(s)? [Y/n] `, res))
    if (ans.trim().toLowerCase() === "n") {
      console.log("  saltado.")
      continue
    }
    for (const it of group) {
      it.fm.data.translationKey = key
      const out = matter.stringify(it.fm.content, it.fm.data)
      fs.writeFileSync(it.file, out, "utf-8")
      console.log(`  escrito: ${path.relative(process.cwd(), it.file)}`)
    }
  }
  rl.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Hacer ejecutable y dry-run**

Run: `cd /root/e2dProject/e2d-website-v2 && chmod +x scripts/migrate-translation-keys.js && node scripts/migrate-translation-keys.js`
Expected: lista de grupos en stdout, sin escribir nada.

- [ ] **Step 3: Documentar nginx + commit**

**Files (modify):** `docs/OPERATIONAL_PROCEDURES.md`

Añade una sección al final:

```markdown
## Subida de media (1 GB) — config nginx

Ruta: `/api/admin/media/upload`

Para que nginx no rechace cuerpos grandes, en el server block del sitio:

    client_max_body_size 1100M;
    proxy_request_buffering off;

Aplica con `nginx -t && systemctl reload nginx`. Sin esto, subidas >1 MB
devuelven 413 antes de llegar al endpoint.

Adicionalmente, en producción standalone (PM2), `public/` se sirve desde
`<repo>/public/`. Verifica que el symlink/montaje a `<standalone>/public`
incluye `uploads/`:

    ln -s /root/e2dProject/e2d-website-v2/public/uploads \
       /root/e2dProject/e2d-website-v2/.next/standalone/public/uploads

Si falla, los ficheros subidos no se sirven hasta el siguiente rebuild.
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore scripts/migrate-translation-keys.js docs/OPERATIONAL_PROCEDURES.md
git commit -m "chore(blog): gitignore uploads, script migración translationKey, doc nginx"
```

---

## Phase J — Verificación end-to-end

### Task J1: Suite completa + build

- [ ] **Step 1: Jest**

Run: `cd /root/e2dProject/e2d-website-v2 && npx jest`
Expected: PASS (215+ tests; los nuevos suben el total).

- [ ] **Step 2: TypeScript**

Run: `cd /root/e2dProject/e2d-website-v2 && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "node_modules" | head -30`
Expected: 0 nuevos errores en ficheros tocados (los pre-existentes pueden quedar; ver memoria S82/551).

- [ ] **Step 3: Build de Next**

Run: `cd /root/e2dProject/e2d-website-v2 && timeout 600 npx next build 2>&1 | tail -30`
Expected: build limpio.

### Task J2: Smoke test en producción

Tras `pm2 restart e2d`:

- [ ] **Step 1**: Migrar legacy posts si es la primera ejecución (Task I2) en el repo de prod.
- [ ] **Step 2**: Crear post de prueba `caso-ferdy` (es) con `translationKey: ferdy-2026-05` vía `posts_create` desde el chat.
- [ ] **Step 3**: Llamar `posts_request_upload({slug:'caso-ferdy', locale:'es'})` desde el chat → debe devolver `uploadUrl` clicable.
- [ ] **Step 4**: Abrir la URL → ver cabecera con título y lista de targets.
- [ ] **Step 5**: Subir 1 imagen pequeña (<1 MB) y 1 vídeo (10-50 MB) → ambos llegan a `public/uploads/ferdy-2026-05/`.
- [ ] **Step 6**: Volver al chat → `posts_get({id:'caso-ferdy', locale:'es', includeContent:true})` muestra los nuevos `![…](…)` y `<video …>` en el body.
- [ ] **Step 7**: `posts_rebuild` → tras 2-3 min, abrir `evolve2digital.com/es/blog/caso-ferdy` y comprobar que la imagen y el vídeo cargan.
- [ ] **Step 8**: Probar caducidad: esperar 16 min y reusar la URL → mostrar pantalla "Enlace caducado".
- [ ] **Step 9**: Probar MIME prohibido: subir un `.exe` renombrado → 415.

---

## Auto-review post-plan (no implementar)

**Cobertura del spec → tareas:**
- `posts_request_upload` MCP tool → Phase E.
- `/admin/media-upload` page → Phase G.
- `/api/admin/media/upload` streaming endpoint → Phase F.
- `translationKey` frontmatter + runtime + write → Phase A.
- `signUploadToken/verifyUploadToken` → Phase D.
- `streamSaveFile` con MIME whitelist + dedupe + sanitize → Phase B.
- `appendMediaToBody` (image markdown / video tag, frontmatter intacto) → Phase C.
- `posts_delete` limpia uploads huérfanos → Phase H.
- gitignore `public/uploads/` → Phase I (Task I1).
- Script de migración legacy → Phase I (Task I2).
- Doc nginx `client_max_body_size` y symlink standalone/public → Phase I (Task I3).
- Smoke test e2e → Phase J.

**Tests del spec → tareas:**
- `media-storage.test.ts` (4 casos) → Phase B (cubre los 4 + 2 extras).
- `posts-runtime.test.ts` (3 casos translationKey) → Phase A1.
- `posts-write.test.ts` (3 casos appendMediaToBody + 2 cleanup) → Phases C, H.
- `media-upload.test.ts` (4 casos) → Phase F1.
- `mcp-rpc-handler.test.ts` (2 casos request_upload) → Phase E1 (cubre los 2 + 2 extras).
- `posts-create translationKey` → Phase A3.

Sin placeholders. Sin "implementar luego". Cada step tiene código completo o comando exacto.
