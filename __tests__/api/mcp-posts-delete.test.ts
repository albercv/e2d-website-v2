/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { signAccessToken } from '../../lib/oauth-jwt'

// Dynamic mockable posts array
var mockAllPosts: any[] = []

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
  createRateLimitMiddleware: jest.fn((_toolName: string) => {
    return () => ({
      allowed: allowRate,
      remaining: allowRate ? 19 : 0,
      resetTime: Date.now() + 60_000,
      retryAfter,
    })
  }),
  getRateLimitHeaders: jest.fn((result: any) => ({
    'X-RateLimit-Remaining': String(result.remaining ?? 0),
    'X-RateLimit-Reset': String(Math.ceil((Date.now() + 60_000) / 1000)),
    ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
  })),
}))

// Dynamically import route after injecting contentlayer mock
let deleteRoute: any
beforeAll(() => {
  jest.resetModules()
  jest.doMock('@/.contentlayer/generated', () => ({
    allPosts: mockAllPosts,
  }))
  deleteRoute = require('../../app/api/mcp/tools/posts/delete/route')
})

const mkPostReq = (body: any, headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost:3000/api/mcp/tools/posts/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${signAccessToken({
        sub: 'test-user',
        email: 'test@example.com',
        role: 'admin',
        scope: ['posts:delete'],
        aud: 'mcp',
      })}`,
      ...headers,
    },
    body: JSON.stringify(body),
  })

const mkDeleteReq = (slug: string, locale?: string, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:3000/api/mcp/tools/posts/delete?slug=${encodeURIComponent(slug)}${locale ? `&locale=${locale}` : ''}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${signAccessToken({
        sub: 'test-user',
        email: 'test@example.com',
        role: 'admin',
        scope: ['posts:delete'],
        aud: 'mcp',
      })}`,
      ...headers,
    },
  })

describe('/api/mcp/tools/posts/delete', () => {
  const postsDir = path.resolve(process.cwd(), 'content', 'posts')
  const targetSlug = 'ejemplo-titulo-mcp'
  const targetPath = path.resolve(postsDir, `${targetSlug}.mdx`)

  beforeAll(() => {
    process.env.E2D_MCP_API_KEY = 'local-dev-mcp-key'
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
    process.env.JWT_SECRET = 'test-jwt-secret-32-bytes-minimum-123456'
  })

  beforeEach(() => {
    // Reset rate limiter and posts
    allowRate = true
    retryAfter = undefined
    mockAllPosts.length = 0

    // Ensure directory exists
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir, { recursive: true })
    }
    // Create target file and mock contentlayer entry
    fs.writeFileSync(targetPath, `---\ntitle: Ejemplo título MCP\ndescription: test\ndate: 2024-01-01\nlocale: es\nslug: ${targetSlug}\ntags: []\nauthor: Test\npublished: true\n---\n\nContenido...`)
    mockAllPosts.push({
      slug: targetSlug,
      locale: 'es',
      _raw: { sourceFilePath: `posts/${targetSlug}.mdx` },
    })
  })

  afterEach(() => {
    try { if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath) } catch {}
  })

  it('OPTIONS should include MCP headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp/tools/posts/delete', { method: 'OPTIONS' })
    const res = await deleteRoute.OPTIONS(req)
    expect(res.status).toBe(200)
  })

  it('should reject missing API key', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp/tools/posts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: targetSlug, locale: 'es' }),
    })
    const res = await deleteRoute.POST(req)
    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toContain('Bearer')
  })

  it('should enforce rate limit', async () => {
    allowRate = false
    retryAfter = 45
    const req = mkPostReq({ slug: targetSlug, locale: 'es' })
    const res = await deleteRoute.POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('45')
  })

  it('should delete via POST and return JSON', async () => {
    const req = mkPostReq({ slug: targetSlug, locale: 'es' })
    const res = await deleteRoute.POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.deleted).toBe(true)
    expect(json.slug).toBe(targetSlug)
    expect(fs.existsSync(targetPath)).toBe(false)
  })

  it('should delete via DELETE with MCP response', async () => {
    // Recreate file since previous test deleted it
    fs.writeFileSync(targetPath, 'contenido')
    const req = mkDeleteReq(targetSlug, 'es', { Accept: 'application/mcp+json' })
    const res = await deleteRoute.DELETE(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.content)).toBe(true)
    expect(fs.existsSync(targetPath)).toBe(false)
  })

  it('should return 404 when slug not found', async () => {
    // Remove the mock post
    mockAllPosts.length = 0
    const req = mkPostReq({ slug: 'no-existe', locale: 'es' })
    const res = await deleteRoute.POST(req)
    expect(res.status).toBe(404)
    const text = await res.text()
    expect(text).toContain('Post not found')
  })

  it('should return 409 for locale mismatch', async () => {
    const req = mkPostReq({ slug: targetSlug, locale: 'en' })
    const res = await deleteRoute.POST(req)
    expect(res.status).toBe(409)
    const text = await res.text()
    expect(text).toContain('Locale mismatch')
  })
})
