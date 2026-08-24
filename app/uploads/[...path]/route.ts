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
  const target = path.resolve(root, ...params.path)
  if (!target.startsWith(path.resolve(root) + path.sep)) {
    return new Response("Bad request", { status: 400 })
  }

  const type = CONTENT_TYPES[path.extname(target).toLowerCase()]
  if (!type) return new Response("Unsupported type", { status: 415 })

  try {
    const data = await fs.readFile(target)
    return new Response(data, {
      status: 200,
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
