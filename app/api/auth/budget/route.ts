import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const INPUT_SCHEMA = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    company: z.string().trim().max(100).optional().or(z.literal("")),
    budget: z.string().trim().max(50).optional().or(z.literal("")),
    message: z.string().trim().min(10).max(2000),
  })
  .strict()

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64urlToBuffer(b64url: string): Buffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : ""
  return Buffer.from(b64 + pad, "base64")
}

function decodeJson<T>(b64url: string): T | null {
  try {
    const buf = base64urlToBuffer(b64url)
    return JSON.parse(buf.toString("utf8")) as T
  } catch {
    return null
  }
}

function verifyAdminSessionToken(token: string, secret: string): boolean {
  const parts = token.split(".")
  if (parts.length !== 3) return false
  const [headerB64, payloadB64, signatureB64] = parts

  const data = `${headerB64}.${payloadB64}`
  const expected = crypto.createHmac("sha256", secret).update(data).digest()
  const expectedB64 = base64url(expected)
  const expectedBuf = Buffer.from(expectedB64)
  const providedBuf = Buffer.from(signatureB64)
  if (expectedBuf.length !== providedBuf.length) return false
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) return false

  const payload = decodeJson<unknown>(payloadB64)
  if (!payload) return false
  if (typeof payload !== "object" || payload === null) return false
  const payloadObj = payload as Record<string, unknown>
  const now = Math.floor(Date.now() / 1000)
  const exp = payloadObj.exp
  if (typeof exp === "number" && exp < now) return false
  return true
}

function getRequiredEnv(name: string): string | null {
  const v = process.env[name]
  if (!v || v.trim().length === 0) return null
  return v
}

function getBudgetWebhookTimeoutMs(): number {
  const raw = process.env.E2D_BUDGET_WEBHOOK_TIMEOUT_MS
  const parsed = raw ? Number(raw) : NaN
  const candidate = Number.isFinite(parsed) ? parsed : 30_000
  const bounded = Math.max(5_000, Math.min(120_000, Math.floor(candidate)))
  return bounded
}

function getChatAuthHeader(): string | undefined {
  const user = process.env.E2D_CHAT_USER
  const pass = process.env.E2D_CHAT_PASSWORD
  if (!user || !pass) return undefined
  const token = Buffer.from(`${user}:${pass}`).toString("base64")
  return `Basic ${token}`
}

function createSessionId(): string {
  const randomUUID = (crypto as unknown as { randomUUID?: () => string }).randomUUID
  if (typeof randomUUID === "function") return randomUUID()
  return crypto.randomBytes(16).toString("hex")
}

function normalizeOptional(value: string | undefined): string | undefined {
  const v = (value || "").trim()
  return v.length > 0 ? v : undefined
}

async function readUpstreamData(res: Response): Promise<{ contentType: string | null; data: unknown }> {
  const contentType = res.headers.get("content-type")
  const raw = await res.text()
  const looksJson = raw.trim().startsWith("{") || raw.trim().startsWith("[")
  if (contentType?.includes("application/json") || looksJson) {
    try {
      return { contentType, data: JSON.parse(raw) }
    } catch {
      return { contentType, data: raw }
    }
  }
  return { contentType, data: raw }
}

export async function POST(request: NextRequest) {
  const secret = getRequiredEnv("ADMIN_SESSION_SECRET")
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Falta ADMIN_SESSION_SECRET" },
      { status: 500 },
    )
  }

  const token = request.cookies.get("admin_session")?.value
  if (!token || !verifyAdminSessionToken(token, secret)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 })
  }

  const startedAt = Date.now()
  const body = await request.json().catch(() => null)
  const parsed = INPUT_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Parámetros inválidos" },
      { status: 400 },
    )
  }

  const upstreamUrl =
    process.env.E2D_BUDGET_WEBHOOK_URL ||
    process.env.E2D_BUDGET_WEBHOOK_TEST_URL ||
    "https://api.evolve2digital.com/webhook/budget"

  const sessionId = createSessionId()

  const payload = {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: normalizeOptional(parsed.data.phone),
    company: normalizeOptional(parsed.data.company),
    budget: normalizeOptional(parsed.data.budget),
    message: parsed.data.message,
    sessionId,
    source: "admin",
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getBudgetWebhookTimeoutMs())

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
    }

    const auth = getChatAuthHeader()
    if (auth) headers.Authorization = auth

    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const upstreamData = await readUpstreamData(upstreamRes)
    const durationMs = Date.now() - startedAt

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        durationMs,
        upstream: {
          url: upstreamUrl,
          status: upstreamRes.status,
          ok: upstreamRes.ok,
          contentType: upstreamData.contentType,
          data: upstreamData.data,
        },
      },
      { status: 200 },
    )
  } catch (err) {
    const durationMs = Date.now() - startedAt
    const message = err instanceof Error && err.name === "AbortError" ? "Timeout llamando al webhook" : "Error llamando al webhook"
    return NextResponse.json(
      {
        ok: false,
        error: message,
        timestamp: new Date().toISOString(),
        durationMs,
        upstream: {
          url: upstreamUrl,
        },
      },
      { status: 502 },
    )
  } finally {
    clearTimeout(timeout)
  }
}
