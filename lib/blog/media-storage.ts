// lib/blog/media-storage.ts
import * as fs from "fs"
import * as fsp from "fs/promises"
import * as path from "path"
import { Transform } from "stream"
import { pipeline } from "stream/promises"
import type { Readable } from "stream"
import { slugifyMediaName } from "./media-naming"
import type { MediaKind } from "./media-meta"

export class MediaStorageError extends Error {
  constructor(public code: "mime" | "name" | "exists" | "io", message: string) {
    super(message)
    this.name = "MediaStorageError"
  }
}

export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const

export type AllowedMime = (typeof ALLOWED_MIME)[number]

const MIME_TO_EXT: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
}

const MIME_TO_KIND: Record<AllowedMime, MediaKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
}

function isAllowed(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime)
}

export function extForMime(mime: string): string {
  if (!isAllowed(mime)) {
    throw new MediaStorageError("mime", `mime not allowed: ${mime}`)
  }
  return MIME_TO_EXT[mime]
}

function getRoot(): string {
  return process.env.MEDIA_UPLOADS_ROOT || path.join(process.cwd(), "public", "uploads")
}

export interface SaveMediaInput {
  translationKey: string
  name: string
  mime: string
  stream: Readable
}

export interface SaveMediaResult {
  name: string
  ext: string
  kind: MediaKind
  size: number
}

export async function saveMediaFile(input: SaveMediaInput): Promise<SaveMediaResult> {
  if (!isAllowed(input.mime)) {
    throw new MediaStorageError("mime", `mime not allowed: ${input.mime}`)
  }
  const slugged = slugifyMediaName(input.name)
  if (slugged !== input.name) {
    throw new MediaStorageError(
      "name",
      `name "${input.name}" is not normalized (expected "${slugged}")`
    )
  }
  const ext = MIME_TO_EXT[input.mime]
  const kind = MIME_TO_KIND[input.mime]
  const dir = path.join(getRoot(), input.translationKey)
  await fsp.mkdir(dir, { recursive: true })

  // Refuse if any existing file shares the same basename (any extension).
  const existing = await fsp.readdir(dir).catch(() => [] as string[])
  for (const f of existing) {
    if (f === "_meta.json" || f === ".lock") continue
    const base = f.replace(/\.[^.]+$/, "")
    if (base === input.name) {
      throw new MediaStorageError(
        "exists",
        `file ${input.name} already exists in ${input.translationKey}`
      )
    }
  }

  const dest = path.join(dir, `${input.name}.${ext}`)
  let size = 0
  const counter = new Transform({
    transform(chunk: Buffer, _enc: BufferEncoding, cb: (e?: Error | null) => void) {
      size += chunk.length
      this.push(chunk)
      cb()
    },
  })
  await pipeline(input.stream, counter, fs.createWriteStream(dest))
  return { name: input.name, ext, kind, size }
}
