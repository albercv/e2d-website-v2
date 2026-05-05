import { NextRequest, NextResponse } from "next/server"
import { verifyUploadToken } from "@/lib/oauth-jwt"
import { findPostsByTranslationKey } from "@/lib/blog/translation-key"
import { readMeta } from "@/lib/blog/media-meta"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || ""
  const claims = verifyUploadToken(token)
  if (!claims) return NextResponse.json({ error: "invalid_token" }, { status: 401 })

  const siblings = await findPostsByTranslationKey(claims.translationKey)
  const meta = await readMeta(claims.translationKey)
  const existingMedia = Object.entries(meta.files).map(([name, e]) => ({
    name,
    kind: e.kind,
    ext: e.ext,
    alt: e.alt,
    caption: e.caption,
    url: `/uploads/${claims.translationKey}/${name}.${e.ext}`,
  }))
  return NextResponse.json({
    translationKey: claims.translationKey,
    siblings: siblings.map((p) => ({ slug: p.slug, locale: p.locale, title: p.title })),
    existingMedia,
    expiresAt: claims.exp * 1000,
  })
}
