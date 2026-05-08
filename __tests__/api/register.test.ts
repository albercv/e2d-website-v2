/**
 * @jest-environment node
 */

const mockCreateClient = jest.fn()
const mockGenerateClientId = jest.fn()

jest.mock('../../lib/oauth-db', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
  generateClientId: () => mockGenerateClientId(),
}))

import { NextRequest } from 'next/server'

let route: any
beforeAll(() => {
  jest.resetModules()
  route = require('../../app/register/route')
})

beforeEach(() => {
  mockCreateClient.mockReset()
  mockGenerateClientId.mockReset()
  mockGenerateClientId.mockReturnValue('e2d_dcrtest_abcdef0123456789')
})

const mkPost = (body: unknown) =>
  new NextRequest('http://localhost:3000/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const READONLY_DEFAULT_SCOPES = ['posts:read', 'search:read', 'fetch:read']

const ALL_KNOWN_SCOPES = [
  'posts:read',
  'search:read',
  'fetch:read',
  'appointments:create',
  'agent:query',
  'posts:write',
  'posts:delete',
]

describe('POST /register (RFC 7591 Dynamic Client Registration)', () => {
  it('returns 201 and persists the client when redirect_uri is claude.ai', async () => {
    const res = await route.POST(
      mkPost({
        client_name: 'Claude.ai Web',
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.client_id).toBe('e2d_dcrtest_abcdef0123456789')
    expect(body.redirect_uris).toEqual(['https://claude.ai/api/mcp/auth_callback'])
    expect(body.token_endpoint_auth_method).toBe('none')
    expect(body.grant_types).toEqual(expect.arrayContaining(['authorization_code']))
    expect(body.response_types).toEqual(['code'])
    expect(typeof body.client_id_issued_at).toBe('number')
    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    // Default scopes for dynamic registration are readonly only.
    expect(mockCreateClient).toHaveBeenCalledWith({
      client_id: 'e2d_dcrtest_abcdef0123456789',
      client_type: 'public',
      redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      allowed_scopes: READONLY_DEFAULT_SCOPES,
    })
  })

  it('returns 201 for ChatGPT custom-connector redirect (chatgpt.com/connector/oauth/...)', async () => {
    const res = await route.POST(
      mkPost({
        client_name: 'ChatGPT Connector',
        redirect_uris: ['https://chatgpt.com/connector/oauth/abc123'],
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.client_id).toBe('e2d_dcrtest_abcdef0123456789')
    expect(body.redirect_uris).toEqual(['https://chatgpt.com/connector/oauth/abc123'])
    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({
        redirect_uris: ['https://chatgpt.com/connector/oauth/abc123'],
        allowed_scopes: READONLY_DEFAULT_SCOPES,
      })
    )
  })

  it('returns 201 for ChatGPT platform redirect (connector_platform_oauth_redirect)', async () => {
    const res = await route.POST(
      mkPost({
        client_name: 'ChatGPT Platform',
        redirect_uris: ['https://chatgpt.com/connector_platform_oauth_redirect'],
      })
    )
    expect(res.status).toBe(201)
  })

  it('returns 201 for chat.openai.com legacy redirect', async () => {
    const res = await route.POST(
      mkPost({ redirect_uris: ['https://chat.openai.com/aip/connector/cb'] })
    )
    expect(res.status).toBe(201)
  })

  it('exposes every documented scope in the response (discovery)', async () => {
    const res = await route.POST(
      mkPost({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] })
    )
    const body = await res.json()
    const scopes = String(body.scope).split(' ')
    for (const s of ALL_KNOWN_SCOPES) {
      expect(scopes).toContain(s)
    }
  })

  it('rejects http://localhost (no longer in the strict allowlist)', async () => {
    // Local-dev clients are seeded statically (see lib/oauth-db.ts seedClients);
    // dynamic registration is reserved for documented MCP hosts only.
    const res = await route.POST(
      mkPost({ redirect_uris: ['http://localhost:3000/oauth/callback'] })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_redirect_uri')
  })

  it('rejects redirect_uri outside the allowlist with 400', async () => {
    const res = await route.POST(
      mkPost({ redirect_uris: ['https://evil.example.com/cb'] })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_redirect_uri')
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('rejects subdomain spoofing (claude.ai.attacker.com)', async () => {
    const res = await route.POST(
      mkPost({
        redirect_uris: ['https://claude.ai.attacker.com/api/mcp/auth_callback'],
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_redirect_uri')
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('rejects http (non-localhost) with 400', async () => {
    const res = await route.POST(
      mkPost({ redirect_uris: ['http://claude.ai/api/mcp/auth_callback'] })
    )
    expect(res.status).toBe(400)
  })

  it('rejects redirect_uri that contains a fragment', async () => {
    const res = await route.POST(
      mkPost({ redirect_uris: ['https://claude.ai/cb#fragment'] })
    )
    expect(res.status).toBe(400)
  })

  it('rejects redirect_uri that contains userinfo', async () => {
    const res = await route.POST(
      mkPost({ redirect_uris: ['https://user:pw@claude.ai/cb'] })
    )
    expect(res.status).toBe(400)
  })

  it('rejects when redirect_uris is missing', async () => {
    const res = await route.POST(mkPost({ client_name: 'broken' }))
    expect(res.status).toBe(400)
  })

  it('rejects when redirect_uris is an empty array', async () => {
    const res = await route.POST(mkPost({ redirect_uris: [] }))
    expect(res.status).toBe(400)
  })

  it('rejects when ANY redirect_uri is invalid (all-or-nothing)', async () => {
    const res = await route.POST(
      mkPost({
        redirect_uris: [
          'https://claude.ai/api/mcp/auth_callback',
          'https://evil.example.com/cb',
        ],
      })
    )
    expect(res.status).toBe(400)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON body with 400', async () => {
    const req = new NextRequest('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await route.POST(req)
    expect(res.status).toBe(400)
  })

  it('exposes CORS so cross-origin browsers (Claude.ai, ChatGPT) can register', async () => {
    const res = await route.POST(
      mkPost({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] })
    )
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('OPTIONS returns 204 with CORS preflight headers', async () => {
    const res = await route.OPTIONS()
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('access-control-allow-methods')).toMatch(/POST/)
  })
})
