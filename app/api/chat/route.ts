import { NextRequest, NextResponse } from "next/server"

type Locale = "es" | "en" | "it"

const SUPPORTED_LOCALES: readonly Locale[] = ["es", "en", "it"] as const

const MESSAGES: Record<Locale, string> = {
  es: "El chat IA está temporalmente fuera de servicio. Contáctanos por WhatsApp o email.",
  en: "The AI chat is temporarily unavailable. Contact us via WhatsApp or email.",
  it: "La chat IA è temporaneamente non disponibile. Contattaci via WhatsApp o email.",
}

const CONTACT = {
  whatsapp: "https://wa.me/34605497639",
  email: "hello@evolve2digital.com",
} as const

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null
  const tags = header.split(",").map((tag) => tag.trim().split(";")[0]?.toLowerCase() ?? "")
  for (const tag of tags) {
    const primary = tag.split("-")[0]
    if (isLocale(primary)) return primary
  }
  return null
}

async function safeParseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const data = (await request.json()) as unknown
    if (data && typeof data === "object") return data as Record<string, unknown>
    return {}
  } catch {
    return {}
  }
}

function resolveLocale(body: Record<string, unknown>, request: NextRequest): Locale {
  const metadata = body.metadata
  if (metadata && typeof metadata === "object") {
    const candidate = (metadata as Record<string, unknown>).locale
    if (isLocale(candidate)) return candidate
  }
  const fromHeader = parseAcceptLanguage(request.headers.get("accept-language"))
  if (fromHeader) return fromHeader
  return "es"
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await safeParseJson(request)
  const locale = resolveLocale(body, request)
  return NextResponse.json(
    {
      error: "chat_unavailable",
      message: MESSAGES[locale],
      contact: CONTACT,
    },
    { status: 503 }
  )
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ messages: [] }, { status: 200 })
}
