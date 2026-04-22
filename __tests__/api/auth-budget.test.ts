/** @jest-environment node */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/auth/budget/route"
import crypto from "crypto"

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function makeAdminToken(secret: string, expSecondsFromNow = 3600) {
  const header = { alg: "HS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub: "admin@test", iat: now, exp: now + expSecondsFromNow }
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)))
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)))
  const data = `${headerB64}.${payloadB64}`
  const signature = crypto.createHmac("sha256", secret).update(data).digest()
  return `${data}.${base64url(signature)}`
}

describe("/api/auth/budget", () => {
  const originalEnv = process.env
  const originalFetch = global.fetch
  const originalSetTimeout = global.setTimeout

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
    global.setTimeout = originalSetTimeout
    jest.clearAllMocks()
  })

  it("uses E2D_BUDGET_WEBHOOK_TIMEOUT_MS when configured", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret"
    process.env.E2D_BUDGET_WEBHOOK_URL = "https://example.com/webhook/budget"
    process.env.E2D_BUDGET_WEBHOOK_TIMEOUT_MS = "45000"
    const token = makeAdminToken(process.env.ADMIN_SESSION_SECRET)

    const setTimeoutSpy = jest.fn((fn: () => void, ms?: number) => {
      if (typeof ms === "number") expect(ms).toBe(45_000)
      return originalSetTimeout(fn, 0)
    }) as unknown as typeof global.setTimeout
    global.setTimeout = setTimeoutSpy

    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify([{ output: "ok" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }) as any

    const req = new NextRequest("http://localhost:3000/api/auth/budget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `admin_session=${token}`,
      },
      body: JSON.stringify({
        name: "Nombre",
        email: "test@example.com",
        message: "mensaje suficientemente largo",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
  })

  it("returns 500 if ADMIN_SESSION_SECRET is missing", async () => {
    delete process.env.ADMIN_SESSION_SECRET
    const req = new NextRequest("http://localhost:3000/api/auth/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A", email: "a@a.com", message: "mensaje suficientemente largo" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it("returns 401 if admin_session cookie is missing", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret"
    const req = new NextRequest("http://localhost:3000/api/auth/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nombre", email: "a@a.com", message: "mensaje suficientemente largo" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid body", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret"
    const token = makeAdminToken(process.env.ADMIN_SESSION_SECRET)
    const req = new NextRequest("http://localhost:3000/api/auth/budget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `admin_session=${token}`,
      },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("proxies to upstream and returns structured response", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret"
    process.env.E2D_BUDGET_WEBHOOK_URL = "https://example.com/webhook/budget"
    process.env.E2D_CHAT_USER = "test-user"
    process.env.E2D_CHAT_PASSWORD = "test-pass"
    const token = makeAdminToken(process.env.ADMIN_SESSION_SECRET)

    global.fetch = jest.fn(async () => {
      return new Response(JSON.stringify({ received: true }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    }) as any

    const req = new NextRequest("http://localhost:3000/api/auth/budget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `admin_session=${token}`,
      },
      body: JSON.stringify({
        name: "Nombre",
        email: "test@example.com",
        phone: "123",
        company: "ACME",
        budget: "1000-2000",
        message: "mensaje suficientemente largo",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.upstream.url).toBe("https://example.com/webhook/budget")
    expect(json.upstream.status).toBe(201)
    expect(json.upstream.data).toEqual({ received: true })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = (global.fetch as any).mock.calls[0]
    expect(calledUrl).toBe("https://example.com/webhook/budget")
    expect(init.method).toBe("POST")

    const expectedAuth = `Basic ${Buffer.from("test-user:test-pass").toString("base64")}`
    const initHeaders = init.headers as unknown
    const authHeader =
      initHeaders instanceof Headers
        ? initHeaders.get("Authorization")
        : typeof initHeaders === "object" && initHeaders !== null
          ? (initHeaders as Record<string, unknown>).Authorization
          : undefined
    expect(authHeader).toBe(expectedAuth)

    const sent = JSON.parse(init.body)
    expect(sent).toMatchObject({
      name: "Nombre",
      email: "test@example.com",
      phone: "123",
      company: "ACME",
      budget: "1000-2000",
      message: "mensaje suficientemente largo",
      sessionId: expect.any(String),
      source: "admin",
    })
  })

  it("returns 502 when upstream throws", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret"
    process.env.E2D_BUDGET_WEBHOOK_URL = "https://example.com/webhook/budget"
    const token = makeAdminToken(process.env.ADMIN_SESSION_SECRET)

    global.fetch = jest.fn(async () => {
      throw new Error("network")
    }) as any

    const req = new NextRequest("http://localhost:3000/api/auth/budget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `admin_session=${token}`,
      },
      body: JSON.stringify({
        name: "Nombre",
        email: "test@example.com",
        message: "mensaje suficientemente largo",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.ok).toBe(false)
    expect(json.upstream.url).toBe("https://example.com/webhook/budget")
  })
})
