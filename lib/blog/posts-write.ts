/**
 * Lógica pura de escritura de posts MDX.
 *
 * Compartida entre los handlers REST (`app/api/mcp/tools/posts/*`) y el
 * handler MCP JSON-RPC (`lib/mcp/rpc-handler.ts`).
 */

import * as fs from "fs/promises"
import * as path from "path"
import matter from "gray-matter"
import { clearPostsRuntimeCache, listPostsFromDisk } from "@/lib/blog/posts-runtime"

/**
 * Raíz del repo donde vive `content/`. PM2 corre desde `.next/standalone/`,
 * así que `process.cwd()` apunta al standalone y los posts se perderían en
 * el próximo deploy. Usamos `CONTENT_ROOT` env var para apuntar al repo real.
 * Fallback: `process.cwd()` (dev local + tests).
 */
function getContentRoot(): string {
  return process.env.CONTENT_ROOT || process.cwd()
}

export type Locale = "es" | "en" | "it"
const SUPPORTED_LOCALES: readonly Locale[] = ["es", "en", "it"] as const

export class PostsWriteError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "PostsWriteError"
  }
}

function yamlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function isValidLocale(locale: unknown): locale is Locale {
  return typeof locale === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

export interface CreatePostInput {
  title: string
  description: string
  content: string
  locale?: Locale
  tags?: string[]
  date?: string
  author?: string
  published?: boolean
  cover?: string
  translationKey?: string
}

export interface CreatePostResult {
  slug: string
  locale: Locale
  url: string
  path: string
}

export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  const title = (input.title || "").trim()
  const description = (input.description || "").trim()
  const content = (input.content || "").trim()
  const locale = input.locale ?? "es"
  const tags = Array.isArray(input.tags) ? input.tags.filter((t) => typeof t === "string") : []
  const date = input.date || new Date().toISOString().slice(0, 10)
  const published = input.published !== false
  const author = input.author || "Alberto Carrasco"

  if (title.length < 3) {
    throw new PostsWriteError("invalid_params", 400, "title is required and must be at least 3 characters", { field: "title" })
  }
  if (description.length < 10) {
    throw new PostsWriteError("invalid_params", 400, "description is required and must be at least 10 characters", { field: "description" })
  }
  if (!isValidLocale(locale)) {
    throw new PostsWriteError("unsupported_locale", 400, "Unsupported locale", { supported: SUPPORTED_LOCALES })
  }
  if (content.length < 50) {
    throw new PostsWriteError("invalid_params", 400, "content is required and must be at least 50 characters", { field: "content" })
  }

  const slug = slugify(title)

  const existing = await listPostsFromDisk()
  const conflict = existing.find(
    (p) => p.locale === locale && p.slug.toLowerCase() === slug
  )
  if (conflict) {
    throw new PostsWriteError("conflict", 409, "Post already exists", { slug, locale })
  }

  const frontmatterLines: string[] = [
    "---",
    `title: ${yamlQuote(title.replace(/\n/g, " ").trim())}`,
    `description: ${yamlQuote(description.replace(/\n/g, " ").trim())}`,
    `date: ${date}`,
    `locale: ${locale}`,
    `slug: ${slug}`,
    tags.length ? `tags: [${tags.map((t) => yamlQuote(t)).join(", ")}]` : "tags: []",
    `author: ${yamlQuote(author)}`,
    `published: ${published ? "true" : "false"}`,
    ...(input.cover ? [`cover: ${input.cover}`] : []),
    ...(input.translationKey ? [`translationKey: ${input.translationKey}`] : []),
    "---",
  ]
  const mdx = frontmatterLines.join("\n") + "\n\n" + content + "\n"

  const postsDir = path.resolve(getContentRoot(), "content", "posts")
  const filePath = path.resolve(postsDir, `${slug}.mdx`)

  try {
    await fs.mkdir(postsDir, { recursive: true })
    await fs.writeFile(filePath, mdx, { encoding: "utf-8" })
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new PostsWriteError("internal_error", 500, "Failed to write file", { details })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://evolve2digital.com"
  return {
    slug,
    locale,
    url: `${baseUrl}/${locale}/blog/${slug}`,
    path: filePath,
  }
}

export interface DeletePostInput {
  slug: string
  locale: Locale
  /**
   * Confirmation flag — debe ser `true` para que el delete proceda. Sin él,
   * deletePost rechaza con 400. Diseñado para evitar deletes accidentales del
   * LLM (Claude.ai recibió 409 sobre posts_create y "ayudó" haciendo delete +
   * recreate, perdiendo /var/lib/e2d-uploads/<key>/ con todos los binarios).
   */
  confirm?: boolean
  /**
   * Si true, además de borrar el .mdx también borra `MEDIA_UPLOADS_ROOT/<key>/`
   * cuando es el último sibling i18n del translationKey. Si false (default),
   * el dir de uploads se preserva — la media puede ser recuperada manualmente
   * o reutilizada si se recrea el post con el mismo translationKey.
   */
  cleanupMedia?: boolean
}

export interface DeletePostResult {
  slug: string
  locale: Locale
  path: string
  mediaCleanedUp: boolean
}

export async function deletePost(input: DeletePostInput): Promise<DeletePostResult> {
  const slug = (input.slug || "").trim()
  const locale = input.locale

  if (!slug) {
    throw new PostsWriteError("invalid_params", 400, "slug is required", { field: "slug" })
  }
  if (!isValidLocale(locale)) {
    throw new PostsWriteError("unsupported_locale", 400, "locale is required and must be one of es,en,it", { supported: SUPPORTED_LOCALES })
  }
  if (input.confirm !== true) {
    throw new PostsWriteError(
      "confirm_required",
      400,
      "posts_delete requiere confirm:true explícito para evitar deletes accidentales. Pasa { confirm: true } en el body.",
      { hint: "Si quieres también borrar la media subida, añade cleanupMedia: true" }
    )
  }

  const existing = await listPostsFromDisk()
  const target = existing.find(
    (p) => p.slug.toLowerCase() === slug.toLowerCase()
  )
  if (!target) {
    throw new PostsWriteError("not_found", 404, "Post not found", { slug, locale })
  }
  if (target.locale !== locale) {
    throw new PostsWriteError("conflict", 409, "Locale mismatch for slug", {
      expectedLocale: target.locale,
      providedLocale: locale,
    })
  }

  const filePath = path.resolve(getContentRoot(), "content", target._raw.sourceFilePath)

  // Audit log: forense para entender quién borra posts. Contexto histórico —
  // tras BUG-7/BUG-11 hubo desapariciones recurrentes de posts que NO eran
  // causadas por el build (verified empíricamente con canary). El log nos
  // dirá quién llamó a deletePost y desde dónde la próxima vez.
  try {
    const auditDir = path.join(getContentRoot(), "logs")
    await fs.mkdir(auditDir, { recursive: true })
    const entry = `${new Date().toISOString()}\tDELETE\t${slug}\t${locale}\ttranslationKey=${target.translationKey}\tcleanupMedia=${input.cleanupMedia === true}\tcwd=${process.cwd()}\tpid=${process.pid}\n`
    await fs.appendFile(path.join(auditDir, "posts-audit.log"), entry, "utf-8")
  } catch {
    /* no bloquear el delete por un fallo de logging */
  }

  try {
    await fs.unlink(filePath)
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new PostsWriteError("internal_error", 500, "Failed to delete file", { details })
  }

  // Cleanup opcional de uploads. Solo si cleanupMedia:true Y es el último
  // sibling i18n del translationKey. Default false: la media se preserva
  // ante un delete (los binarios pesan y son caros — el usuario puede tener
  // motivos para borrar el .mdx pero conservar las fotos para reuse).
  let mediaCleanedUp = false
  if (input.cleanupMedia === true) {
    clearPostsRuntimeCache()
    const { findPostsByTranslationKey } = await import("./translation-key")
    const remaining = await findPostsByTranslationKey(target.translationKey)
    if (remaining.length === 0) {
      const { deleteMetaForKey } = await import("./media-meta")
      await deleteMetaForKey(target.translationKey)
      mediaCleanedUp = true
    }
  } else {
    // Aún limpiamos cache para que el siguiente listPostsFromDisk vea estado fresco.
    clearPostsRuntimeCache()
  }

  return { slug, locale, path: filePath, mediaCleanedUp }
}

export interface RebuildResult {
  accepted: boolean
  jobId: string
  logPath?: string
  message?: string
  buildCommand?: string
  restartCommand?: string | null
}

export async function triggerRebuild(): Promise<RebuildResult> {
  const apiKey = process.env.E2D_MCP_API_KEY
  if (!apiKey) {
    throw new PostsWriteError("server_misconfigured", 500, "Missing E2D_MCP_API_KEY on server")
  }
  const adminRebuildUrl = process.env.ADMIN_REBUILD_URL
  if (!adminRebuildUrl) {
    throw new PostsWriteError("server_misconfigured", 500, "Missing ADMIN_REBUILD_URL on server")
  }

  let upstream: Response
  try {
    upstream = await fetch(adminRebuildUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ noRestart: false }),
    })
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new PostsWriteError("upstream_unreachable", 502, "Failed to reach admin rebuild endpoint", { details })
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "")
    throw new PostsWriteError("upstream_error", 502, "Admin rebuild endpoint returned error", {
      upstreamStatus: upstream.status,
      details: text.slice(0, 200),
    })
  }

  const json = (await upstream.json().catch(() => ({}))) as Record<string, unknown>
  return {
    accepted: json.accepted === true,
    jobId: typeof json.jobId === "string" ? json.jobId : String(Date.now()),
    logPath: typeof json.logPath === "string" ? json.logPath : undefined,
    message: typeof json.message === "string" ? json.message : undefined,
    buildCommand: typeof json.buildCommand === "string" ? json.buildCommand : undefined,
    restartCommand:
      typeof json.restartCommand === "string"
        ? json.restartCommand
        : json.restartCommand === null
          ? null
          : undefined,
  }
}

export interface UpdatePostBodyInput {
  slug: string
  locale: Locale
  content: string
}

export async function updatePostBody(input: UpdatePostBodyInput): Promise<void> {
  const slug = (input.slug || "").trim()
  const locale = input.locale
  const content = typeof input.content === "string" ? input.content : ""

  if (!slug) {
    throw new PostsWriteError("invalid_params", 400, "slug is required", { field: "slug" })
  }
  if (!isValidLocale(locale)) {
    throw new PostsWriteError("unsupported_locale", 400, "locale is required and must be one of es,en,it", { supported: SUPPORTED_LOCALES })
  }
  if (!content) {
    throw new PostsWriteError("invalid_params", 400, "content is required", { field: "content" })
  }

  const all = await listPostsFromDisk()
  const post = all.find((p) => p.slug === slug && p.locale === locale)
  if (!post) {
    throw new PostsWriteError("not_found", 404, `Post ${slug}/${locale} not found`, { slug, locale })
  }

  const filePath = path.join(getContentRoot(), "content", post._raw.sourceFilePath)
  let raw: string
  try {
    raw = await fs.readFile(filePath, "utf-8")
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new PostsWriteError("internal_error", 500, "Failed to read file", { details })
  }
  const parsed = matter(raw)
  const next = matter.stringify(content, parsed.data)
  try {
    await fs.writeFile(filePath, next, { encoding: "utf-8" })
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new PostsWriteError("internal_error", 500, "Failed to write file", { details })
  }
  clearPostsRuntimeCache()
}

export function isPostsWriteError(err: unknown): err is PostsWriteError {
  return err instanceof PostsWriteError
}
