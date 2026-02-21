import { NextRequest, NextResponse } from "next/server"
import { getPost, searchPosts, type BlogLocale } from "@/lib/blog/posts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type JsonRpcId = string | number | null

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id?: JsonRpcId
  method: string
  params?: unknown
}

interface JsonRpcSuccess {
  jsonrpc: "2.0"
  id: JsonRpcId
  result: unknown
}

interface JsonRpcErrorObject {
  code: number
  message: string
  data?: unknown
}

interface JsonRpcError {
  jsonrpc: "2.0"
  id: JsonRpcId
  error: JsonRpcErrorObject
}

const allowedOrigins = new Set(["https://chatgpt.com", "https://chat.openai.com", "https://platform.openai.com"])

function getCorsHeaders(origin: string | null): Record<string, string> {
  if (origin && allowedOrigins.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
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

function successResponse(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id: id ?? null, result }
}

function errorResponse(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } }
}

function asJsonRpcRequest(input: unknown): JsonRpcRequest | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>
  if (obj.jsonrpc !== "2.0") return null
  if (typeof obj.method !== "string") return null
  return obj as unknown as JsonRpcRequest
}

function toolsList() {
  return {
    tools: [
      {
        name: "posts.search",
        description: "Busca posts del blog por consulta textual (solo lectura).",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", minLength: 2 },
            limit: { type: "integer", minimum: 1, maximum: 10, default: 5 },
          },
          required: ["query"],
        },
      },
      {
        name: "posts.get",
        description: "Obtiene un post del blog por id (slug) (solo lectura).",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", minLength: 1 },
            includeContent: { type: "boolean", default: false },
          },
          required: ["id"],
        },
      },
    ],
  }
}

function parseLocale(value: unknown): BlogLocale | undefined {
  if (value === "es" || value === "en" || value === "it") return value
  return undefined
}

async function handleRpcCall(req: JsonRpcRequest): Promise<JsonRpcSuccess | JsonRpcError> {
  const id = req.id ?? null

  if (req.method === "initialize") {
    return successResponse(id, {
      protocolVersion: "2025-03-26",
      serverInfo: { name: "E2D Blog", version: "1.0.0" },
      capabilities: { tools: {} },
    })
  }

  if (req.method === "tools/list") {
    return successResponse(id, toolsList())
  }

  if (req.method === "tools/call") {
    if (!req.params || typeof req.params !== "object") {
      return errorResponse(id, -32602, "Invalid params")
    }

    const params = req.params as Record<string, unknown>
    const toolName = (params.name ?? params.toolName) as unknown
    const rawArgs = (params.arguments ?? params.args) as unknown

    if (typeof toolName !== "string") {
      return errorResponse(id, -32602, "Invalid params", { field: "name" })
    }

    const args = (rawArgs && typeof rawArgs === "object" ? (rawArgs as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >

    if (toolName === "posts.search") {
      const query = typeof args.query === "string" ? args.query : ""
      const limit = typeof args.limit === "number" ? args.limit : typeof args.limit === "string" ? Number(args.limit) : 5
      const locale = parseLocale(args.locale) ?? "es"

      if (query.trim().length < 2) {
        return errorResponse(id, -32602, "Invalid params", { field: "query" })
      }

      const items = searchPosts({ query, limit: Number.isFinite(limit) ? limit : 5, locale, includeSnippet: true }).map(
        (item) => ({
          id: item.id,
          title: item.title,
          url: item.url,
          excerpt: item.contentSnippet || item.excerpt || "",
        })
      )

      return successResponse(id, {
        content: [{ type: "text", text: JSON.stringify({ items }) }],
      })
    }

    if (toolName === "posts.get") {
      const idValue = typeof args.id === "string" ? args.id : ""
      const includeContent = args.includeContent === true
      const locale = parseLocale(args.locale) ?? "es"

      if (!idValue.trim()) {
        return errorResponse(id, -32602, "Invalid params", { field: "id" })
      }

      const post = getPost({ id: idValue, includeContent, locale })
      if (!post) {
        return errorResponse(id, -32004, "Not found")
      }

      const output = {
        id: post.id,
        title: post.title,
        url: post.url,
        content: includeContent ? post.content || "" : "",
      }

      return successResponse(id, {
        content: [{ type: "text", text: JSON.stringify(output) }],
      })
    }

    return errorResponse(id, -32601, "Method not found")
  }

  return errorResponse(id, -32601, "Method not found")
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
    return NextResponse.json(errorResponse(null, -32700, "Parse error"), { status: 400, headers: cors })
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
    return NextResponse.json(errorResponse(null, -32600, "Invalid Request"), { status: 400, headers: cors })
  }

  const response = await handleRpcCall(rpcRequest)
  return NextResponse.json(response, { status: 200, headers: cors })
}
