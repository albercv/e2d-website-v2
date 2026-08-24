import { promises as fs } from "fs"
import path from "path"

// Serves /uploads/* from the media volume so the Next image optimizer can
// resolve relative urls. In prod nginx answers direct /uploads hits first;
// this route only sees the optimizer's internal fetches (and dev traffic).
const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
}

function uploadsRoot(): string {
  return process.env.MEDIA_UPLOADS_ROOT || path.join(process.cwd(), "public", "uploads")
}

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const root = uploadsRoot()
  const resolvedRoot = path.resolve(root)
  const target = path.resolve(root, ...params.path)
  // Cheap string check first — fast-fail before touching the filesystem.
  if (!target.startsWith(resolvedRoot + path.sep)) {
    return new Response("Bad request", { status: 400 })
  }

  const type = CONTENT_TYPES[path.extname(target).toLowerCase()]
  if (!type) return new Response("Unsupported type", { status: 415 })

  // Re-verify containment against the real (symlink-resolved) path: the string
  // check above only catches literal ".." segments, not a symlink inside the
  // root that points outside it.
  let realRoot: string
  let realTarget: string
  try {
    realRoot = await fs.realpath(resolvedRoot)
    realTarget = await fs.realpath(target)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ENOENT" || code === "ENOTDIR") {
      return new Response("Not found", { status: 404 })
    }
    console.error("uploads route realpath error", { code, path: target })
    return new Response("Internal error", { status: 500 })
  }
  if (!realTarget.startsWith(realRoot + path.sep)) {
    return new Response("Bad request", { status: 400 })
  }

  try {
    const data = await fs.readFile(realTarget)
    return new Response(data, {
      status: 200,
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=31536000, immutable",
      },
    })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ENOENT" || code === "ENOTDIR") {
      return new Response("Not found", { status: 404 })
    }
    console.error("uploads route read error", { code, path: realTarget })
    return new Response("Internal error", { status: 500 })
  }
}
