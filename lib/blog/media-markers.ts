// lib/blog/media-markers.ts
import type { MediaMeta, MediaKind } from "./media-meta"

const MARKER_RE = /\[(image|video):([a-z0-9_]+)\]/g
const CONTACT_RE = /\[contact\]/g

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Emite <img> plano cuando no hay dims resueltas (comportamiento histórico,
// byte-idéntico) o, si las hay, una versión con width/height intrínsecos +
// srcset optimizado vía /_next/image, para evitar CLS y servir tamaños
// responsive en vez del fichero original sin comprimir.
function buildImageTag(url: string, altE: string, dims?: { width: number; height: number }): string {
  if (!dims) return `<img src="${url}" alt="${altE}" />`
  const enc = encodeURIComponent(url)
  const widths = [640, 828, 1200]
  const srcset = widths.map((w) => `/_next/image?url=${enc}&w=${w}&q=75 ${w}w`).join(", ")
  return (
    `<img src="/_next/image?url=${enc}&w=828&q=75" srcset="${srcset}" ` +
    `sizes="(max-width: 768px) 100vw, 720px" width="${dims.width}" height="${dims.height}" ` +
    `alt="${altE}" loading="lazy" decoding="async" />`
  )
}

function buildFigure(
  kind: MediaKind,
  url: string,
  alt: string,
  caption: string,
  dims?: { width: number; height: number }
): string {
  const altE = escapeHtml(alt)
  const capE = escapeHtml(caption)
  const captionTag = capE ? `<figcaption>${capE}</figcaption>` : ""
  if (kind === "image") {
    return `<figure>${buildImageTag(url, altE, dims)}${captionTag}</figure>`
  }
  return `<figure><video src="${url}" controls preload="metadata" aria-label="${altE}"></video>${captionTag}</figure>`
}

function buildMissing(
  kind: MediaKind,
  name: string,
  reason: "not_found" | "kind_mismatch"
): string {
  return `<MediaMissing kind="${kind}" name="${escapeHtml(name)}" reason="${reason}" />`
}

export interface Segment {
  type: "code" | "text"
  value: string
}

/**
 * Splits the input into "code" segments (fenced + inline) and "text" segments.
 * Markers are only substituted in "text" segments.
 */
export function tokenize(input: string): Segment[] {
  const out: Segment[] = []
  let i = 0
  let buf = ""

  const flushText = () => {
    if (buf.length > 0) {
      out.push({ type: "text", value: buf })
      buf = ""
    }
  }

  while (i < input.length) {
    // Fenced code block: opening fence at line start
    if ((i === 0 || input[i - 1] === "\n") && input.startsWith("```", i)) {
      flushText()
      const close = input.indexOf("\n```", i + 3)
      if (close === -1) {
        // unterminated fence — treat the rest as code
        out.push({ type: "code", value: input.slice(i) })
        return out
      }
      const end = close + 4 // include closing ```
      out.push({ type: "code", value: input.slice(i, end) })
      i = end
      continue
    }

    // Inline code: backtick run, find matching run of the same length
    if (input[i] === "`") {
      let runLen = 0
      while (input[i + runLen] === "`") runLen++
      const open = "`".repeat(runLen)
      const close = input.indexOf(open, i + runLen)
      if (close === -1) {
        // unterminated — treat as text
        buf += input.slice(i, i + runLen)
        i += runLen
        continue
      }
      flushText()
      const end = close + runLen
      out.push({ type: "code", value: input.slice(i, end) })
      i = end
      continue
    }

    buf += input[i]
    i++
  }

  flushText()
  return out
}

export function expandMarkers(
  body: string,
  meta: MediaMeta,
  translationKey: string,
  dims?: Record<string, { width: number; height: number }>
): string {
  const segs = tokenize(body)
  return segs
    .map((seg) => {
      if (seg.type === "code") return seg.value
      const withMedia = seg.value.replace(MARKER_RE, (_full, kindStr: string, name: string) => {
        const kind = kindStr as MediaKind
        const entry = meta.files[name]
        if (!entry) return buildMissing(kind, name, "not_found")
        if (entry.kind !== kind) return buildMissing(kind, name, "kind_mismatch")
        const url = `/uploads/${translationKey}/${name}.${entry.ext}`
        return buildFigure(kind, url, entry.alt, entry.caption, dims?.[name])
      })
      return withMedia.replace(CONTACT_RE, "<ContactCTA />")
    })
    .join("")
}

export type CoverResolution =
  | { ok: true; url: string }
  | { ok: false; reason: "absent" | "not_found" | "kind_mismatch" }

/**
 * Resolves the cover image URL for a post. Resolution order:
 *  1. meta.cover (set explicitly via the upload form) — takes precedence
 *  2. frontmatter `cover` field passed as `cover` arg
 * If neither is set, returns absent. The resolved name must exist in
 * `meta.files` with `kind: "image"` to succeed.
 */
export function resolveCover(
  cover: string | undefined,
  meta: MediaMeta,
  translationKey: string
): CoverResolution {
  const name = meta.cover || cover
  if (!name) return { ok: false, reason: "absent" }
  const entry = meta.files[name]
  if (!entry) return { ok: false, reason: "not_found" }
  if (entry.kind !== "image") return { ok: false, reason: "kind_mismatch" }
  return { ok: true, url: `/uploads/${translationKey}/${name}.${entry.ext}` }
}
