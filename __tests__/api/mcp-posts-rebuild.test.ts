/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { signAccessToken } from '../../lib/oauth-jwt'

jest.mock('../../lib/mcp-logger', () => ({
  mcpLogger: {
    logToolInvocation: jest.fn(),
    logError: jest.fn(),
    logRateLimitExceeded: jest.fn(),
  },
}))

let allowRate = true
let retryAfter: number | undefined = undefined
jest.mock('../../lib/mcp-rate-limiter', () => ({
  createRateLimitMiddleware: jest.fn(() => () => ({
    allowed: allowRate,
    remaining: allowRate ? 2 : 0,
    resetTime: Date.now() + 60_000,
    retryAfter,
  })),
  getRateLimitHeaders: jest.fn((result: any) => ({
    'X-RateLimit-Remaining': String(result.remaining ?? 0),
    'X-RateLimit-Reset': String(Math.ceil((Date.now() + 60_000) / 1000)),
    ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
  })),
}))

let rebuildRoute: any
beforeAll(() => {
  jest.resetModules()
  rebuildRoute = require('../../app/api/mcp/tools/posts/rebuild/route')
})

const mkRequest = (scopes: string[] = ['posts:write'], headers: Record<string, string> = {}) => {
  const token = signAccessToken({
    sub: 'test-user',
    email: 'test@example.com',
    role: 'admin',
    scope: scopes,
    aud: 'mcp',
  })
  return new NextRequest('http://localhost:3000/api/mcp/tools/posts/rebuild', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify({}),
  })
}

describe('/api/mcp/tools/posts/rebuild', () => {
  let fetchSpy: jest.SpyInstance

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-32-bytes-minimum-123456'
  })

  beforeEach(() => {
    allowRate = true
    retryAfter = undefined
    process.env.E2D_MCP_API_KEY = 'local-dev-mcp-key'
    process.env.ADMIN_REBUILD_URL = 'http://localhost:3000/api/admin/rebuild'
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }) as any
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('OPTIONS returns 200 with CORS headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp/tools/posts/rebuild', { method: 'OPTIONS' })
    const res = await rebuildRoute.OPTIONS(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('rejects request without OAuth token', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp/tools/posts/rebuild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects token without posts:write scope', async () => {
    const req = mkRequest(['posts:read'])
    const res = await rebuildRoute.POST(req)
    expect([401, 403]).toContain(res.status)
  })

  it('returns 500 when E2D_MCP_API_KEY is missing on server', async () => {
    delete process.env.E2D_MCP_API_KEY
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(500)
    const body = await res.text()
    expect(body).toContain('E2D_MCP_API_KEY')
  })

  it('returns 500 when ADMIN_REBUILD_URL is missing on server', async () => {
    delete process.env.ADMIN_REBUILD_URL
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(500)
    const body = await res.text()
    expect(body).toContain('ADMIN_REBUILD_URL')
  })

  it('returns 502 when admin rebuild endpoint returns 5xx', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('boom', { status: 500 }) as any
    )
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(502)
  })

  it('returns 200 on happy path with rebuilding:true', async () => {
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.rebuilding).toBe(true)
    expect(typeof json.started_at).toBe('string')
    expect(typeof json.processingTime).toBe('number')
  })

  it('calls admin endpoint with correct headers and body', async () => {
    const req = mkRequest()
    await rebuildRoute.POST(req)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/rebuild')
    expect(init.method).toBe('POST')
    expect(init.headers['Authorization']).toBe('Bearer local-dev-mcp-key')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ noRestart: false })
  })

  it('enforces rate limit when exceeded', async () => {
    allowRate = false
    retryAfter = 30
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })
})
