/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { signAccessToken } from '../../lib/oauth-jwt'

// Dynamic mockable posts array
var mockAllPosts: any[] = []

// Mock logger (no-op)
jest.mock('../../lib/mcp-logger', () => ({
  mcpLogger: {
    logToolInvocation: jest.fn(),
    logError: jest.fn(),
    logRateLimitExceeded: jest.fn(),
  },
}))

// Mock rate limiter for MCP (always allow by default; can override per test)
let allowRate = true
let retryAfter: number | undefined = undefined
jest.mock('../../lib/mcp-rate-limiter', () => ({
  createRateLimitMiddleware: jest.fn((toolName: string) => {
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

// Import route handlers dynamically after mocks
let createRoute: any
beforeAll(() => {
  jest.resetModules()
  // Mock the runtime reader (replaces the old contentlayer mock).
  jest.doMock('@/lib/blog/posts-runtime', () => ({
    listPostsFromDisk: jest.fn(async () => mockAllPosts),
    clearPostsRuntimeCache: jest.fn(),
  }))
  createRoute = require('../../app/api/mcp/tools/posts/create/route')
})

const mkRequest = (url: string, body: any, headers: Record<string, string> = {}) => {
  const token = signAccessToken({
    sub: 'test-user',
    email: 'test@example.com',
    role: 'admin',
    scope: ['posts:write'],
    aud: 'mcp',
  })
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe('/api/mcp/tools/posts/create', () => {
  // Aislamos el dir de posts en tmp. Antes este test usaba
  // path.resolve(process.cwd(), 'content', 'posts') — que en el repo principal
  // ES UN SYMLINK a /var/lib/e2d-content/posts/ (producción). El afterEach
  // borraba los .mdx existentes con fs.unlinkSync, sin pasar por deletePost,
  // así que no quedaba traza en posts-audit.log. Causa raíz de BUG-15.
  let postsDir: string

  beforeAll(() => {
    process.env.E2D_MCP_API_KEY = 'local-dev-mcp-key'
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
    process.env.JWT_SECRET = 'test-jwt-secret-32-bytes-minimum-123456'
    postsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-create-'))
    process.env.BLOG_POSTS_DIR = postsDir
  })

  afterAll(() => {
    delete process.env.BLOG_POSTS_DIR
    try {
      fs.rmSync(postsDir, { recursive: true, force: true })
    } catch {}
  })

  beforeEach(() => {
    mockAllPosts.length = 0
    allowRate = true
    retryAfter = undefined
  })

  afterEach(() => {
    // Cleanup any files created during tests
    const files = fs.readdirSync(postsDir)
    for (const f of files) {
      if (f.endsWith('.mdx')) {
        try { fs.unlinkSync(path.resolve(postsDir, f)) } catch {}
      }
    }
  })

  it('OPTIONS should include MCP/CORS headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp/tools/posts/create', { method: 'OPTIONS' })
    const res = await createRoute.OPTIONS(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('should reject missing API key', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp/tools/posts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'a', description: 'b', content: 'c', locale: 'es' }),
    })
    const res = await createRoute.POST(req)
    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toContain('Bearer')
  })

  it('should enforce rate limit when exceeded', async () => {
    allowRate = false
    retryAfter = 30
    const req = mkRequest('http://localhost:3000/api/mcp/tools/posts/create', {
      title: 'Título válido',
      description: 'Descripción válida y suficiente',
      locale: 'es',
      content: '# MDX\n\n'.padEnd(60, 'x'),
    })
    const res = await createRoute.POST(req)
    expect(res.status).toBe(429)
    const text = await res.text()
    expect(text).toContain('Rate limit') // JSON or MCP
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('should validate required fields', async () => {
    const req = mkRequest('http://localhost:3000/api/mcp/tools/posts/create', {
      title: 'ab',
      description: 'short',
      locale: 'fr',
      content: 'too short',
    })
    const res = await createRoute.POST(req)
    expect(res.status).toBe(400)
    const body = await res.text()
    expect(body).toContain('invalid') // error field message
  })

  it('should detect conflict if slug already exists in same locale', async () => {
    mockAllPosts.push({ slug: 'ejemplo-titulo-mcp', locale: 'es' })
    const req = mkRequest('http://localhost:3000/api/mcp/tools/posts/create', {
      title: 'Ejemplo título MCP',
      description: 'Descripción para conflicto',
      locale: 'es',
      content: '# MDX\n\n'.padEnd(60, 'y'),
    })
    const res = await createRoute.POST(req)
    expect(res.status).toBe(409)
    const txt = await res.text()
    expect(txt).toContain('Post already exists')
  })

  it('should create file and return JSON when Accept is not MCP', async () => {
    const req = mkRequest('http://localhost:3000/api/mcp/tools/posts/create', {
      title: 'Post de prueba MCP Test',
      description: 'Descripción de prueba suficiente para JSON',
      locale: 'es',
      content: '# Título\n\n'.padEnd(60, 'z'),
    })
    const res = await createRoute.POST(req)
    expect([200, 201]).toContain(res.status)
    const json = await res.json()
    expect(json.created).toBe(true)
    expect(json.slug).toBe('post-de-prueba-mcp-test')
    // file exists
    const fp = path.resolve(postsDir, `${json.slug}.mdx`)
    expect(fs.existsSync(fp)).toBe(true)
  })

  it('should return MCP formatted response when Accept: application/mcp+json', async () => {
    const req = mkRequest('http://localhost:3000/api/mcp/tools/posts/create', {
      title: 'Otro post de prueba MCP',
      description: 'Descripción suficiente para MCP',
      locale: 'es',
      content: '# Encabezado\n\n'.padEnd(60, 'w'),
    }, {
      Accept: 'application/mcp+json',
    })
    const res = await createRoute.POST(req)
    expect([200, 201]).toContain(res.status)
    const data = await res.json()
    expect(Array.isArray(data.content)).toBe(true)
    expect(data.content[0].type).toBe('text')
    expect(typeof data.content[0].text).toBe('string')
    // ensure file exists
    const slug = 'otro-post-de-prueba-mcp'
    const fp = path.resolve(postsDir, `${slug}.mdx`)
    expect(fs.existsSync(fp)).toBe(true)
  })

  describe('rebuild side-effects', () => {
    let fetchSpy: jest.SpyInstance

    beforeEach(() => {
      process.env.AUTO_REBUILD_AFTER_MCP_CHANGE = 'true'
      process.env.ADMIN_REBUILD_URL = 'http://localhost:3000/api/admin/rebuild'
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(null, { status: 200 }) as any
      )
    })

    afterEach(() => {
      fetchSpy.mockRestore()
      delete process.env.AUTO_REBUILD_AFTER_MCP_CHANGE
      delete process.env.ADMIN_REBUILD_URL
    })

    it('does NOT trigger rebuild on posts_create even when AUTO_REBUILD_AFTER_MCP_CHANGE=true', async () => {
      const req = mkRequest(
        'http://localhost:3000/api/mcp/tools/posts/create',
        {
          title: 'No autorebuild expected',
          description: 'Descripción suficiente para verificar que no hay rebuild',
          locale: 'es',
          content: '# MDX\n\n'.padEnd(60, 'q'),
        }
      )
      const res = await createRoute.POST(req)
      expect([200, 201]).toContain(res.status)
      await new Promise(r => setImmediate(r))
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })
})
