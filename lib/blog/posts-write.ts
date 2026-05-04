/**
 * Lógica pura de escritura de posts MDX.
 *
 * Compartida entre los handlers REST (`app/api/mcp/tools/posts/*`) y el
 * handler MCP JSON-RPC (`lib/mcp/rpc-handler.ts`).
 */

import * as fs from "fs/promises"
import * as path from "path"
import { listPostsFromDisk } from "@/lib/blog/posts-runtime"

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
    `title: ${title.replace(/:\n/g, " ").trim()}`,
    `description: ${description.replace(/:\n/g, " ").trim()}`,
    `date: ${date}`,
    `locale: ${locale}`,
    `slug: ${slug}`,
    tags.length ? `tags: [${tags.map((t) => `'${t}'`).join(", ")}]` : "tags: []",
    `author: ${author}`,
    `published: ${published ? "true" : "false"}`,
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
}

export interface DeletePostResult {
  slug: string
  locale: Locale
  path: string
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

  try {
    await fs.unlink(filePath)
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new PostsWriteError("internal_error", 500, "Failed to delete file", { details })
  }

  return { slug, locale, path: filePath }
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

export function isPostsWriteError(err: unknown): err is PostsWriteError {
  return err instanceof PostsWriteError
}
