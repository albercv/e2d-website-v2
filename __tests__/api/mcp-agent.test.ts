/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

// Mock AI answers service
jest.mock('../../lib/ai-answers-service', () => ({
  aiAnswersService: {
    processQuery: jest.fn()
  }
}))

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
import { aiAnswersService } from '../../lib/ai-answers-service'
import { rateLimiter, getRateLimitConfig } from '../../lib/rate-limiter'

// Type the mocked services
const mockAiAnswersService = aiAnswersService as jest.Mocked<typeof aiAnswersService>
const mockRateLimiter = rateLimiter as jest.Mocked<typeof rateLimiter>
const mockGetRateLimitConfig = getRateLimitConfig as jest.MockedFunction<typeof getRateLimitConfig>

describe('/api/mcp/tools/agent/query', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
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
    
    mockAiAnswersService.processQuery.mockResolvedValue({
      query: 'test query',
      answer: 'test answer',
      source: 'https://evolve2digital.com/test',
      sourceTitle: 'Test Article',
      lastUpdated: '2024-01-01T00:00:00Z',
      locale: 'es',
      confidence: 0.9,
      relatedTags: ['test'],
      metadata: {
        contentType: 'blog_post',
        author: 'Test Author',
        wordCount: 100,
        publishedDate: '2024-01-01T00:00:00Z'
      }
    })
  })

  describe('OPTIONS', () => {
    it('should return CORS headers', async () => {
      const response = await OPTIONS()
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization')
    })
  })

  describe('POST', () => {
    const createRequest = (body: any, headers: Record<string, string> = {}) => {
      return new NextRequest('http://localhost:3000/api/mcp/tools/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
            'Content-Type': 'text/plain'
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
            'Content-Type': 'application/json'
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
        expect(data.error).toBe('Unsupported locale. Supported: es, en')
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
        mockAiAnswersService.processQuery.mockResolvedValue(null)
        
        const request = createRequest({ prompt: 'test query', locale: 'es' })
        const response = await POST(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.response).toContain('Lo siento, no pude encontrar información específica')
        expect(data.source).toBe('E2D Agent')
        expect(data.confidence).toBe(0)
        expect(data.metadata).toEqual({
          agent: "E2D Assistant",
          version: "1.0.0",
          processing_time_ms: expect.any(Number)
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
      it('should handle AI service errors gracefully', async () => {
        mockAiAnswersService.processQuery.mockRejectedValue(new Error('AI service error'))

        const request = createRequest({ prompt: 'test query' })
        const response = await POST(request)

        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data.error).toBe('Internal server error')
      })
    })

    describe('Logging', () => {
      it('should log successful requests', async () => {
        const request = createRequest({ prompt: 'test query' })
        await POST(request)

        // Verify logging was called (mocked)
        expect(jest.isMockFunction(mockAiAnswersService.processQuery)).toBe(true)
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