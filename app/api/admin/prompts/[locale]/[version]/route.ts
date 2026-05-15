/**
 * Admin: activate a specific version for a locale.
 *
 *   POST /api/admin/prompts/{locale}/{version}  → { activated: true }
 *
 * Idempotent: re-activating the current active version is a no-op that
 * still invalidates the cache and re-warms it.
 *
 * Auth: inherited from the `admin_session` middleware.
 */

import { NextResponse } from "next/server"

import { activateVersion } from "@/lib/chat/prompt-store"
import type { Locale } from "@/lib/chat/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LOCALES: readonly Locale[] = ["es", "en", "it"]

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

function parseVersion(raw: string): number | null {
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ locale: string; version: string }> },
): Promise<NextResponse> {
  const { locale, version: rawVersion } = await context.params
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "unknown_locale" }, { status: 400 })
  }
  const version = parseVersion(rawVersion)
  if (version === null) {
    return NextResponse.json({ error: "bad_version" }, { status: 400 })
  }
  try {
    await activateVersion(locale, version)
    return NextResponse.json({ activated: true, locale, version })
  } catch (err) {
    const message = (err as Error).message
    if (message.includes("not found")) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    console.error("[admin/prompts/activate] failed:", message)
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 })
  }
}
