/**
 * Lectura y compilación de posts MDX en runtime, sin Contentlayer.
 *
 * Reemplaza completamente la dependencia de `@/.contentlayer/generated.allPosts`:
 *   - MCP (search, get, create-conflict-check, delete-lookup): listPostsFromDisk()
 *   - Blog público (/[locale]/blog y /[locale]/blog/[slug]): getCompiledPost()
 *     que serializa el body MDX vía next-mdx-remote/serialize y lo entrega al
 *     componente <BlogPost> que lo renderiza con <MDXRemote>.
 *
 * Esto elimina el ciclo "create → rebuild → static HTML" del path público:
 * un post nuevo o borrado se refleja en el blog en la siguiente request.
 */

import * as fs from "fs/promises"
import * as path from "path"
import matter from "gray-matter"
import { readingTime } from "reading-time-estimator"
import type { MDXRemoteSerializeResult } from "next-mdx-remote"

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
  cover?: string
  translationKey: string
  url: string
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
    } else if (entry.isSymbolicLink()) {
      // Caso BLOG_POSTS_DIR: `content/posts` es symlink a un dir persistente
      // fuera del proyecto. `Dirent.isDirectory()` devuelve false para symlinks
      // (no resuelve), así que sin esta rama el subárbol queda invisible para
      // posts-runtime y `posts_get`/`posts_search` devuelven 404 aunque el
      // .mdx esté en disco. `fs.stat` resuelve el symlink y nos dice qué es.
      try {
        const s = await fs.stat(full)
        if (s.isDirectory()) {
          out.push(...(await walkMdx(full)))
        } else if (s.isFile() && full.endsWith(".mdx")) {
          out.push(full)
        }
      } catch {
        // Symlink roto: lo ignoramos sin propagar.
      }
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
    cover: typeof fm.cover === "string" ? fm.cover : undefined,
    translationKey:
      typeof fm.translationKey === "string" && fm.translationKey.trim().length > 0
        ? fm.translationKey
        : slug,
    url: `/${locale}/blog/${slug}`,
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

// Reemplaza el `cover` slug-key (lo que escribe la LLM en frontmatter) por la
// URL pública resuelta (`/uploads/<key>/<name>.<ext>`). Si el cover no existe
// en _meta.json, devuelve undefined. Centraliza la resolución para BlogCard,
// generateMetadata (OG/Twitter) y cualquier otro consumidor público que muestre
// la portada — sin esto cada componente reimplementa el path resolver con su
// propio sesgo y se pasa por alto en componentes nuevos (BUG histórico).
export async function resolvePostCovers(posts: RuntimePost[]): Promise<RuntimePost[]> {
  const { readMeta } = await import("./media-meta")
  const { resolveCover } = await import("./media-markers")
  return Promise.all(
    posts.map(async (post) => {
      if (!post.cover) return post
      // Legacy: URL absoluta (https://, http://, //) o path absoluto (/x.png)
      // precede a la convención de markers. Devolver tal cual; el resolver de
      // _meta.json solo aplica a slug-keys (lowercase ASCII + _-).
      if (/^(https?:)?\/\//.test(post.cover) || post.cover.startsWith("/")) return post
      const meta = await readMeta(post.translationKey)
      const cover = resolveCover(post.cover, meta, post.translationKey)
      return { ...post, cover: cover.ok ? cover.url : undefined }
    })
  )
}

export interface CompiledPost extends RuntimePost {
  compiled: MDXRemoteSerializeResult
}

export async function getCompiledPost(
  slug: string,
  locale: RuntimeLocale
): Promise<CompiledPost | null> {
  const all = await listPostsFromDisk()
  const post = all.find((p) => p.slug === slug && p.locale === locale && p.published)
  if (!post) return null
  const { readMeta } = await import("./media-meta")
  const { expandMarkers, resolveCover } = await import("./media-markers")
  const meta = await readMeta(post.translationKey)
  const expandedBody = expandMarkers(post.body.raw, meta, post.translationKey)
  const cover = resolveCover(post.cover, meta, post.translationKey)
  // Lazy import: next-mdx-remote/serialize es ESM puro y Jest peta al cargarlo
  // en tests que no compilan MDX. Importar dentro de la función mantiene el
  // módulo cargable bajo CommonJS y solo paga el coste cuando es necesario.
  const { serialize } = await import("next-mdx-remote/serialize")
  // blockJS: false permite expresiones JS en props JSX (ej: <ProsCons
  // pros={[...]} cons={[...]} />). El default `blockJS: true` está pensado
  // para MDX de origen no confiable; aquí el contenido es nuestro y vive
  // en content/ del repo.
  const compiled = await serialize(expandedBody, {
    parseFrontmatter: false,
    blockJS: false,
  })
  return {
    ...post,
    cover: cover.ok ? cover.url : undefined,
    compiled,
  }
}
