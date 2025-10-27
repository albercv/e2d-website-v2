import { NextRequest, NextResponse } from "next/server"

const WEBHOOK_URL = "https://api.evolve2digital.com/webhook/userMessage"

function getAuthHeader() {
  const user = process.env.E2D_CHAT_USER
  const pass = process.env.E2D_CHAT_PASSWORD
  if (!user || !pass) return undefined
  const token = Buffer.from(`${user}:${pass}`).toString("base64")
  return `Basic ${token}`
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get("action") || "sendMessage"
    const body = await request.json().catch(() => ({}))

    // @n8n/chat defaults
    const chatInput = body?.chatInput ?? body?.message ?? body?.text ?? ""
    const sessionId = body?.sessionId ?? body?.session_id ?? body?.session ?? ""

    const payload = {
      messageType: "USER-CHAT",
      userMessage: String(chatInput ?? ""),
      sessionId: String(sessionId ?? ""),
      action, // optional: forward action for debugging
      metadata: body?.metadata ?? {},
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    const auth = getAuthHeader()
    if (auth) headers["Authorization"] = auth

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    const data = await res.text()

    // Try to return JSON if possible; otherwise pass text
    try {
      const json = JSON.parse(data)
      return NextResponse.json(json, { status: res.status })
    } catch {
      return new NextResponse(data, {
        status: res.status,
        headers: { "Content-Type": res.headers.get("Content-Type") || "text/plain" },
      })
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        error: true,
        message: err?.message || "Proxy error",
      },
      { status: 500 },
    )
  }
}

// We disable previous session loading by setting loadPreviousSession=false in the widget.
export async function GET() {
  return NextResponse.json({ messages: [] }, { status: 200 })
}