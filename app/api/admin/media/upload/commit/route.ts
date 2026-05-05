// app/api/admin/media/upload/commit/route.ts
import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"
import { verifyUploadToken } from "@/lib/oauth-jwt"
import { writeMeta, type MediaMetaEntry, type MediaKind } from "@/lib/blog/media-meta"
import { ALLOWED_MIME } from "@/lib/blog/media-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface BatchEntry {
  name: string
  alt?: string
  caption?: string
}

const KIND_BY_EXT: Record<string, MediaKind> = {
  jpg: "image",
  png: "image",
  webp: "image",
  gif: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
}

function getRoot(): string {
  return process.env.MEDIA_UPLOADS_ROOT || path.join(process.cwd(), "public", "uploads")
}

async function findFile(dir: string, name: string): Promise<{ ext: string; kind: MediaKind } | null> {
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return null
  }
  for (const e of entries) {
    if (e === "_meta.json" || e === ".lock") continue
    const m = e.match(/^(.+)\.([^.]+)$/)
    if (!m) continue
    if (m[1] !== name) continue
    const ext = m[2]
    const kind = KIND_BY_EXT[ext]
    if (!kind) continue
    return { ext, kind }
  }
  return null
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || ""
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return NextResponse.json({ error: "missing_token" }, { status: 401 })
  const claims = verifyUploadToken(m[1])
  if (!claims) return NextResponse.json({ error: "invalid_token" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { files?: BatchEntry[] } | null
  if (!body || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "missing_files" }, { status: 400 })
  }

  const dir = path.join(getRoot(), claims.translationKey)
  const newEntries: Record<string, MediaMetaEntry> = {}
  const out: Array<{ name: string; url: string; ext: string; kind: MediaKind; alt: string; caption: string }> = []

  for (const f of body.files) {
    if (!f || typeof f.name !== "string") {
      return NextResponse.json({ error: "bad_entry" }, { status: 400 })
    }
    const found = await findFile(dir, f.name)
    if (!found) {
      return NextResponse.json({ error: "binary_missing", name: f.name }, { status: 400 })
    }
    const entry: MediaMetaEntry = {
      ext: found.ext,
      kind: found.kind,
      alt: f.alt || "",
      caption: f.caption || "",
    }
    newEntries[f.name] = entry
    out.push({
      name: f.name,
      ext: entry.ext,
      kind: entry.kind,
      alt: entry.alt,
      caption: entry.caption,
      url: `/uploads/${claims.translationKey}/${f.name}.${entry.ext}`,
    })
  }

  await writeMeta(claims.translationKey, newEntries)
  return NextResponse.json({ ok: true, files: out })
}
// Note: ALLOWED_MIME is imported only to keep the route's surface coherent
// with /upload — it's not used here directly.
void ALLOWED_MIME
