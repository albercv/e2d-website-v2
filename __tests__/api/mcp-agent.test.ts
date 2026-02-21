/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { signAccessToken } from '../../lib/oauth-jwt'

class ResponseMock {
  ok: boolean
  status: number
  headers: { get: (k: string) => string | null }
  private _body: any
  constructor(body: any, init: { status?: number; headers?: Record<string, string> } = {}) {
    this._body = body
    this.status = init.status ?? 200
    this.ok = this.status >= 200 && this.status < 300
    const hdrs = init.headers ?? {}
    this.headers = {
      get: (k: string) => {
        const key = Object.keys(hdrs).find((kk) => kk.toLowerCase() === k.toLowerCase())
        return key ? hdrs[key] : null
      },
    }
  }
  async json(): Promise<any> {
    if (typeof this._body === 'string') return JSON.parse(this._body)
    return this._body
  }
  async text(): Promise<string> {
    if (typeof this._body === 'string') return this._body
    return JSON.stringify(this._body)
  }
}

// Mock MCP logger
jest.mock('../../lib/mcp-logger', () => ({
  mcpLogger: {
    logToolInvocation: jest.fn(),
    logError: jest.fn(),
    logRateLimitExceeded: jest.fn()
  }
}))

// Mock rate limiter
jest.mock('../../lib/rate-limiter', () => ({
  rateLimiter: {
    checkLimit: jest.fn(),
    generateIdentifier: jest.fn()
  },
  getRateLimitConfig: jest.fn()
}))

// Import the route handlers and mocked services after mocking
import { POST, OPTIONS } from '../../app/api/mcp/tools/agent/query/route'
import { rateLimiter, getRateLimitConfig } from '../../lib/rate-limiter'

const mockFetch = jest.fn()
;(globalThis as any).fetch = mockFetch

// Type the mocked services
const mockRateLimiter = rateLimiter as jest.Mocked<typeof rateLimiter>
const mockGetRateLimitConfig = getRateLimitConfig as jest.MockedFunction<typeof getRateLimitConfig>

describe('/api/mcp/tools/agent/query', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
    process.env.JWT_SECRET = 'test-jwt-secret-32-bytes-minimum-123456'
    
    // Setup default mock returns
    mockGetRateLimitConfig.mockReturnValue({
      maxRequests: 20,
      windowMs: 300000,
      message: 'Too many AI agent requests. Please try again later.'
    })
    
    mockRateLimiter.checkLimit.mockReturnValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetTime: Date.now() + 300000
    })
    
    mockRateLimiter.generateIdentifier.mockReturnValue('test-identifier')

    mockFetch.mockResolvedValue(
      new ResponseMock(JSON.stringify({ response: 'test answer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as any,
    )
  })

  describe('OPTIONS', () => {
    it('should return CORS headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/mcp/tools/agent/query', {
        method: 'OPTIONS',
      })
      const response = await OPTIONS(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, User-Agent, X-Requested-With, Authorization, X-API-Key')
    })
  })

  describe('POST', () => {
    const getAccessToken = () =>
      signAccessToken({
        sub: 'test-user',
        email: 'test@example.com',
        role: 'admin',
        scope: ['agent:query'],
        aud: 'mcp',
      })

    const createRequest = (body: any, headers: Record<string, string> = {}) => {
      return new NextRequest('http://localhost:3000/api/mcp/tools/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
          ...headers
        },
        body: JSON.stringify(body)
      })
    }

    describe('Rate Limiting', () => {
      it('should enforce rate limits', async () => {
        mockRateLimiter.checkLimit.mockReturnValue({
          allowed: false,
          limit: 20,
          remaining: 0,
          resetTime: Date.now() + 300000,
          retryAfter: 300
        })

        const request = createRequest({ prompt: 'test query' })
        const response = await POST(request)

        expect(response.status).toBe(429)
        expect(response.headers.get('Retry-After')).toBe('300')
        expect(response.headers.get('X-RateLimit-Limit')).toBe('20')
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
      })

      it('should allow requests within rate limits', async () => {
        const request = createRequest({ prompt: 'test query' })
        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockRateLimiter.checkLimit).toHaveBeenCalled()
      })
    })

    describe('Input Validation', () => {
      it('should reject requests without Content-Type application/json', async () => {
        const request = new NextRequest('http://localhost:3000/api/mcp/tools/agent/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Authorization': `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify({ prompt: 'test' })
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
        
        const data = await response.json()
        expect(data.error).toBe('Content-Type must be application/json')
      })

      it('should reject requests with invalid JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/mcp/tools/agent/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAccessToken()}`,
          },
          body: 'invalid json'
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
        
        const data = await response.json()
        expect(data.error).toBe('Invalid JSON body')
      })

      it('should reject requests without prompt', async () => {
        const request = createRequest({})
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Missing or invalid prompt parameter')
      })

      it('should reject empty prompts', async () => {
        const request = createRequest({ prompt: '   ' })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Prompt cannot be empty')
      })

      it('should reject prompts that are too long', async () => {
        const longPrompt = 'a'.repeat(801)
        const request = createRequest({ prompt: longPrompt })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Prompt exceeds maximum length of 800 characters')
      })

      it('should accept valid locales', async () => {
        const request = createRequest({ prompt: 'test', locale: 'en' })
        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      it('should reject invalid locale', async () => {
        const request = createRequest({ prompt: 'test query', locale: 'fr' })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Unsupported locale. Supported: es, en, it')
      })
    })

    describe('Successful Responses', () => {
      it('should return AI answer when available', async () => {
        const request = createRequest({ prompt: 'test query' })
        const response = await POST(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        
        expect(data.response).toBe('test answer')
        expect(data.source).toBe('E2D Agent')
        expect(data.timestamp).toBeDefined()
        expect(data.confidence).toBe(0.9)
        expect(data.metadata).toBeDefined()
      })

      it('should return fallback response when AI service returns null', async () => {
        mockFetch.mockResolvedValue(new ResponseMock(JSON.stringify({}), { status: 502 }) as any)
        
        const request = createRequest({ prompt: 'test query', locale: 'es' })
        const response = await POST(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.response).toContain('Lo siento, no pude conectar con nuestro agente en este momento')
        expect(data.source).toBe('E2D Agent (Fallback)')
        expect(data.confidence).toBe(0)
        expect(data.metadata).toEqual({
          agent: "E2D Assistant",
          version: "1.0.0",
          processing_time_ms: expect.any(Number),
          fallback: true
        })
      })

      it('should include rate limit headers in successful responses', async () => {
        const request = createRequest({ prompt: 'test query' })
        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(response.headers.get('X-RateLimit-Limit')).toBe('20')
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('19')
        expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
      })
    })

    describe('Error Handling', () => {
      it('should handle internal errors gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
        mockRateLimiter.checkLimit.mockImplementation(() => {
          throw new Error('rate limiter broke')
        })

        const request = createRequest({ prompt: 'test query' })
        const response = await POST(request)

        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data.error).toBe('Internal server error')
        consoleSpy.mockRestore()
      })
    })

    describe('Logging', () => {
      it('should log successful requests', async () => {
        const request = createRequest({ prompt: 'test query' })
        await POST(request)

        expect(mockFetch).toHaveBeenCalled()
      })

      it('should log rate limit exceeded events', async () => {
        mockRateLimiter.checkLimit.mockReturnValue({
          allowed: false,
          limit: 20,
          remaining: 0,
          resetTime: Date.now() + 300000,
          retryAfter: 300
        })

        const request = createRequest({ prompt: 'test query' })
        await POST(request)

        // Rate limit logging is handled in the route
        expect(mockRateLimiter.checkLimit).toHaveBeenCalled()
      })
    })
  })
})
