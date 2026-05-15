/**
 * Admin: list all versions for a single locale.
 *
 *   GET /api/admin/prompts/{locale}  → { versions: PromptVersion[] }
 *
 * Auth: inherited from the `admin_session` middleware.
 */

import { NextResponse } from "next/server"

import { listVersions, type PromptVersion } from "@/lib/chat/prompt-store"
import type { Locale } from "@/lib/chat/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LOCALES: readonly Locale[] = ["es", "en", "it"]

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

interface ListResponse {
  versions: PromptVersion[]
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ locale: string }> },
): Promise<NextResponse> {
  const { locale } = await context.params
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "unknown_locale" }, { status: 400 })
  }
  try {
    const versions = await listVersions(locale)
    const body: ListResponse = { versions }
    return NextResponse.json(body)
  } catch (err) {
    console.error("[admin/prompts/locale] list failed:", (err as Error).message)
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 })
  }
}
