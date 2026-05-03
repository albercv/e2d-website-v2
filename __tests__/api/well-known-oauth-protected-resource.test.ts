/**
 * @jest-environment node
 */

let route: any
beforeAll(() => {
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
  jest.resetModules()
  route = require('../../app/.well-known/oauth-protected-resource/route')
})

describe('/.well-known/oauth-protected-resource (RFC 9728)', () => {
  it('responds 200 with application/json', async () => {
    const res = await route.GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
  })

  it('exposes CORS so MCP clients can fetch the metadata', async () => {
    const res = await route.GET()
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('declares the resource identifier from NEXT_PUBLIC_BASE_URL', async () => {
    const res = await route.GET()
    const body = await res.json()
    expect(body.resource).toBe('http://localhost:3000')
  })

  it('lists the authorization server (same origin)', async () => {
    const res = await route.GET()
    const body = await res.json()
    expect(Array.isArray(body.authorization_servers)).toBe(true)
    expect(body.authorization_servers).toContain('http://localhost:3000')
  })

  it('declares bearer header as supported token delivery', async () => {
    const res = await route.GET()
    const body = await res.json()
    expect(body.bearer_methods_supported).toEqual(['header'])
  })

  it('lists every MCP scope the resource recognizes', async () => {
    const res = await route.GET()
    const body = await res.json()
    expect(body.scopes_supported).toEqual(
      expect.arrayContaining([
        'posts:read',
        'search:read',
        'fetch:read',
        'appointments:create',
        'agent:query',
        'posts:write',
        'posts:delete',
      ])
    )
  })

  it('falls back to https://evolve2digital.com when NEXT_PUBLIC_BASE_URL is missing', async () => {
    const original = process.env.NEXT_PUBLIC_BASE_URL
    delete process.env.NEXT_PUBLIC_BASE_URL
    jest.resetModules()
    const fresh = require('../../app/.well-known/oauth-protected-resource/route')
    const res = await fresh.GET()
    const body = await res.json()
    expect(body.resource).toBe('https://evolve2digital.com')
    expect(body.authorization_servers).toContain('https://evolve2digital.com')
    process.env.NEXT_PUBLIC_BASE_URL = original
  })
})
