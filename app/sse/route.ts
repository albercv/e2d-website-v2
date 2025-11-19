import { NextRequest } from 'next/server'
import { mcpLogger } from '@/lib/mcp-logger'

// SSE endpoint for MCP server connectivity
// ChatGPT Custom Tools require an SSE URL. This endpoint keeps a
// long-lived connection open and emits initial server info plus heartbeats.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With, Authorization, X-API-Key',
}

const SSE_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
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
        // Initial open event
        const openEvent = `event: open\n` +
          `data: ${JSON.stringify({ connected: true, ts: new Date().toISOString() })}\n\n`
        controller.enqueue(encoder.encode(openEvent))

        // Send server info (including manifest pointer and auth endpoints)
        const infoEvent = `event: server-info\n` +
          `data: ${JSON.stringify(buildServerInfo())}\n\n`
        controller.enqueue(encoder.encode(infoEvent))

        // Optional: emit a small ready event for clients listening for it
        const readyEvent = `event: ready\n` +
          `data: ${JSON.stringify({ status: 'ok', message: 'MCP SSE ready' })}\n\n`
        controller.enqueue(encoder.encode(readyEvent))

        // Heartbeats to keep the connection alive
        const interval = setInterval(() => {
          const pingEvent = `event: ping\n` + `data: ${Date.now()}\n\n`
          try {
            controller.enqueue(encoder.encode(pingEvent))
          } catch {
            // If enqueue fails, clear interval
            clearInterval(interval)
          }
        }, 15000)

        // Close handling
        const onClose = () => {
          clearInterval(interval)
          try {
            const closeEvent = `event: close\n` + `data: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`
            controller.enqueue(encoder.encode(closeEvent))
          } catch {}
          controller.close()
        }

        // Abort when client disconnects
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