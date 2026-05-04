import { NextRequest, NextResponse } from 'next/server'
import { mcpLogger } from '@/lib/mcp-logger'
import {
  asJsonRpcRequest,
  errorResponse,
  handleRpcCall,
} from '@/lib/mcp/rpc-handler'
import { requireOAuthScopes } from '@/lib/mcp-oauth'

// /sse — endpoint MCP transport para clientes como Claude.ai (Streamable HTTP)
// y ChatGPT custom tools (SSE long-poll).
//
// GET  → stream SSE con server-info + heartbeats (compatibilidad ChatGPT).
// POST → JSON-RPC 2.0 protegido con Bearer (OAuth 2.1), delegado al handler
//        compartido en lib/mcp/rpc-handler.ts.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With, Authorization, X-API-Key',
}

const SSE_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Pragma': 'no-cache',
  'CDN-Cache-Control': 'no-store',
  'Connection': 'keep-alive',
}

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
}

const MCP_CONFIG = {
  version: '1.0.0',
  name: 'Evolve2Digital MCP Server',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com',
}

function buildServerInfo() {
  const baseUrl = MCP_CONFIG.baseUrl
  return {
    mcp: {
      version: MCP_CONFIG.version,
      server: {
        name: MCP_CONFIG.name,
        version: MCP_CONFIG.version,
        baseUrl,
      },
      manifest: `${baseUrl}/api/mcp/manifest`,
      endpoints: {
        tools: `${baseUrl}/api/mcp/tools`,
        health: `${baseUrl}/api/mcp/health`,
      },
      auth: {
        pkce_required: true,
        code_challenge_methods_supported: ['S256'],
        authorization_endpoint: `${baseUrl}/authorize`,
        token_endpoint: `${baseUrl}/token`,
      }
    }
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined

  try {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const openEvent = `event: open\n` +
          `data: ${JSON.stringify({ connected: true, ts: new Date().toISOString() })}\n\n`
        controller.enqueue(encoder.encode(openEvent))

        const infoEvent = `event: server-info\n` +
          `data: ${JSON.stringify(buildServerInfo())}\n\n`
        controller.enqueue(encoder.encode(infoEvent))

        const readyEvent = `event: ready\n` +
          `data: ${JSON.stringify({ status: 'ok', message: 'MCP SSE ready' })}\n\n`
        controller.enqueue(encoder.encode(readyEvent))

        const interval = setInterval(() => {
          const pingEvent = `event: ping\n` + `data: ${Date.now()}\n\n`
          try {
            controller.enqueue(encoder.encode(pingEvent))
          } catch {
            clearInterval(interval)
          }
        }, 15000)

        const onClose = () => {
          clearInterval(interval)
          try {
            const closeEvent = `event: close\n` + `data: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`
            controller.enqueue(encoder.encode(closeEvent))
          } catch {}
          controller.close()
        }

        request.signal.addEventListener('abort', onClose)
      }
    })

    mcpLogger.logManifestRequest('/sse', 'GET', true, Date.now() - startTime, 200, userAgent)
    return new Response(stream, { status: 200, headers: SSE_HEADERS })
  } catch (error) {
    mcpLogger.logError('/sse', 'GET', (error as Error).message, 500, userAgent)
    return new Response('event: error\n' + `data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`, {
      status: 500,
      headers: SSE_HEADERS,
    })
  }
}

export async function POST(request: NextRequest) {
  // Bearer obligatorio. Sin scopes específicos en el handshake (initialize /
  // tools/list); cada tool en el handler enforcer su propio scope.
  const auth = requireOAuthScopes(request, [])
  if (auth.error) return auth.error
  const ctx = { claims: auth.claims }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(errorResponse(null, -32700, 'Parse error'), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map(async (item) => {
        const parsed = asJsonRpcRequest(item)
        if (!parsed) return errorResponse(null, -32600, 'Invalid Request')
        return handleRpcCall(parsed, ctx)
      })
    )
    return NextResponse.json(responses, { status: 200, headers: JSON_HEADERS })
  }

  const rpc = asJsonRpcRequest(body)
  if (!rpc) {
    return NextResponse.json(errorResponse(null, -32600, 'Invalid Request'), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const response = await handleRpcCall(rpc, ctx)
  return NextResponse.json(response, { status: 200, headers: JSON_HEADERS })
}
