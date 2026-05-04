/**
 * Lectura de posts MDX en runtime, sin Contentlayer.
 *
 * Reemplaza la dependencia de `@/.contentlayer/generated.allPosts` para los
 * caminos de uso del MCP (search, get, create-conflict-check, delete-lookup).
 * Así `posts_create` y `posts_delete` reflejan cambios sin necesidad de
 * `next build` + restart.
 *
 * El blog público sigue usando Contentlayer para HTML pre-compilado.
 */

import * as fs from "fs/promises"
import * as path from "path"
import matter from "gray-matter"
import { readingTime } from "reading-time-estimator"

export type RuntimeLocale = "es" | "en" | "it"

export interface RuntimePost {
  slug: string
  locale: RuntimeLocale
  title: string
  description?: string
  tags?: string[]
  author?: string
  date: string
  published: boolean
  body: { raw: string }
  wordCount: number
  readingTime: ReturnType<typeof readingTime>
  _raw: { sourceFilePath: string }
}

function getContentRoot(): string {
  return process.env.CONTENT_ROOT || process.cwd()
}

function getContentDir(): string {
  return path.resolve(getContentRoot(), "content")
}

interface CacheEntry {
  fingerprint: string
  posts: RuntimePost[]
}

const cache = new Map<string, CacheEntry>()

async function walkMdx(root: string): Promise<string[]> {
  const out: string[] = []
  let entries: import("fs").Dirent[]
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(root, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await walkMdx(full)))
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      out.push(full)
    }
  }
  return out
}

async function fingerprint(files: string[]): Promise<string> {
  const parts: string[] = []
  for (const file of files) {
    try {
      const s = await fs.stat(file)
      parts.push(`${file}:${s.mtimeMs}:${s.size}`)
    } catch {
      // skip — file vanished mid-walk
    }
  }
  return parts.sort().join("|")
}

function isLocale(value: unknown): value is RuntimeLocale {
  return value === "es" || value === "en" || value === "it"
}

function parseFile(filePath: string, contentDir: string, raw: string): RuntimePost | null {
  const parsed = matter(raw)
  const fm = parsed.data as Record<string, unknown>
  const body = parsed.content
  const slug = typeof fm.slug === "string" ? fm.slug : null
  const title = typeof fm.title === "string" ? fm.title : null
  const date = typeof fm.date === "string" ? fm.date : (fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : null)
  const locale = isLocale(fm.locale) ? fm.locale : null
  if (!slug || !title || !date || !locale) return null

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length
  const sourceFilePath = path.relative(contentDir, filePath).split(path.sep).join("/")

  return {
    slug,
    locale,
    title,
    description: typeof fm.description === "string" ? fm.description : undefined,
    tags: Array.isArray(fm.tags) ? fm.tags.filter((t): t is string => typeof t === "string") : undefined,
    author: typeof fm.author === "string" ? fm.author : undefined,
    date,
    published: fm.published !== false,
    body: { raw: body },
    wordCount,
    readingTime: readingTime(body, 200),
    _raw: { sourceFilePath },
  }
}

export async function listPostsFromDisk(): Promise<RuntimePost[]> {
  const contentDir = getContentDir()
  const files = await walkMdx(contentDir)
  if (files.length === 0) return []

  const fp = await fingerprint(files)
  const cached = cache.get(contentDir)
  if (cached && cached.fingerprint === fp) {
    return cached.posts
  }

  const posts: RuntimePost[] = []
  for (const file of files) {
    const raw = await fs.readFile(file, "utf-8")
    const post = parseFile(file, contentDir, raw)
    if (post) posts.push(post)
  }

  cache.set(contentDir, { fingerprint: fp, posts })
  return posts
}

export function clearPostsRuntimeCache(): void {
  cache.clear()
}
