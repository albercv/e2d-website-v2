// app/api/admin/media/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { Readable } from "stream"
import { verifyUploadToken } from "@/lib/oauth-jwt"
import { saveMediaFile, MediaStorageError, ALLOWED_MIME } from "@/lib/blog/media-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const MAX_BYTES = Number(process.env.MEDIA_UPLOAD_MAX_BYTES || 1_073_741_824) // 1 GB

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || ""
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return NextResponse.json({ error: "missing_token" }, { status: 401 })
  const claims = verifyUploadToken(m[1])
  if (!claims) return NextResponse.json({ error: "invalid_token" }, { status: 401 })

  const mime = (req.headers.get("content-type") || "").split(";")[0].trim()
  if (!(ALLOWED_MIME as readonly string[]).includes(mime)) {
    return NextResponse.json({ error: "mime_not_allowed", mime }, { status: 415 })
  }

  const declaredSize = Number(req.headers.get("content-length") || 0)
  if (declaredSize > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", limit: MAX_BYTES }, { status: 413 })
  }

  const name = (req.headers.get("x-media-name") || "").trim()
  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 })

  if (!req.body) return NextResponse.json({ error: "missing_body" }, { status: 400 })
  const stream = Readable.fromWeb(req.body as unknown as import("stream/web").ReadableStream)

  try {
    const result = await saveMediaFile({
      translationKey: claims.translationKey,
      name,
      mime,
      stream,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof MediaStorageError) {
      const status =
        err.code === "mime"
          ? 415
          : err.code === "name"
            ? 400
            : err.code === "exists"
              ? 409
              : 500
      return NextResponse.json({ error: err.code, message: err.message }, { status })
    }
    return NextResponse.json({ error: "io_error", message: String(err) }, { status: 500 })
  }
}
