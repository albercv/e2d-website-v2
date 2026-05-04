import { NextRequest, NextResponse } from "next/server"
import {
  asJsonRpcRequest,
  errorResponse,
  handleRpcCall,
} from "@/lib/mcp/rpc-handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const allowedOrigins = new Set([
  "https://chatgpt.com",
  "https://chat.openai.com",
  "https://platform.openai.com",
])

function getCorsHeaders(origin: string | null): Record<string, string> {
  if (origin && allowedOrigins.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    }
  }

  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }
}

function enforceOriginAllowlist(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin")
  if (!origin) return null
  if (allowedOrigins.has(origin)) return null

  return NextResponse.json(
    { error: "Origin not allowed" },
    { status: 403, headers: { ...getCorsHeaders(null) } }
  )
}

export async function OPTIONS(request: NextRequest) {
  const denied = enforceOriginAllowlist(request)
  if (denied) return denied

  const origin = request.headers.get("origin")
  return new NextResponse(null, { status: 200, headers: { ...getCorsHeaders(origin) } })
}

export async function GET(request: NextRequest) {
  const denied = enforceOriginAllowlist(request)
  if (denied) return denied

  const origin = request.headers.get("origin")
  return NextResponse.json(
    {
      name: "E2D Blog MCP",
      transport: "streamable-http",
      jsonrpc: "2.0",
      methods: ["initialize", "tools/list", "tools/call"],
    },
    { status: 200, headers: { ...getCorsHeaders(origin) } }
  )
}

export async function POST(request: NextRequest) {
  const denied = enforceOriginAllowlist(request)
  if (denied) return denied

  const origin = request.headers.get("origin")
  const cors = getCorsHeaders(origin)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(errorResponse(null, -32700, "Parse error"), {
      status: 400,
      headers: cors,
    })
  }

  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map(async (item) => {
        const req = asJsonRpcRequest(item)
        if (!req) return errorResponse(null, -32600, "Invalid Request")
        return handleRpcCall(req)
      })
    )
    return NextResponse.json(responses, { status: 200, headers: cors })
  }

  const rpcRequest = asJsonRpcRequest(body)
  if (!rpcRequest) {
    return NextResponse.json(errorResponse(null, -32600, "Invalid Request"), {
      status: 400,
      headers: cors,
    })
  }

  const response = await handleRpcCall(rpcRequest)
  return NextResponse.json(response, { status: 200, headers: cors })
}
