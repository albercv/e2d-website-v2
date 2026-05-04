/**
 * @jest-environment node
 */

const mockGetClientById = jest.fn()
const mockValidateRedirectUri = jest.fn()

jest.mock('../../lib/oauth-db', () => ({
  getClientById: (...args: unknown[]) => mockGetClientById(...args),
  validateRedirectUri: (...args: unknown[]) => mockValidateRedirectUri(...args),
}))

import { NextRequest } from 'next/server'

let route: any
beforeAll(() => {
  jest.resetModules()
  route = require('../../app/authorize/route')
})

beforeEach(() => {
  mockGetClientById.mockReset()
  mockValidateRedirectUri.mockReset()
  mockGetClientById.mockReturnValue({
    client_id: 'e2d_test',
    client_type: 'public',
    redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
    allowed_scopes: ['posts:read'],
  })
  mockValidateRedirectUri.mockReturnValue(true)
  delete process.env.NEXT_PUBLIC_BASE_URL
})

const mkGet = (
  fullUrl: string,
  headers: Record<string, string> = {}
) =>
  new NextRequest(fullUrl, {
    method: 'GET',
    headers,
  })

describe('GET /authorize redirect Location respects public origin', () => {
  it('uses NEXT_PUBLIC_BASE_URL when set (proxy-aware)', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://evolve2digital.com'
    const req = mkGet(
      'http://localhost:3003/authorize?response_type=code&client_id=e2d_test&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback'
    )
    const res = await route.GET(req)
    expect(res.status).toBe(302)
    const location = res.headers.get('location') || ''
    expect(location).toMatch(/^https:\/\/evolve2digital\.com\/authorize\/page\?/)
    expect(location).not.toContain('localhost:3003')
  })

  it('falls back to x-forwarded-host when NEXT_PUBLIC_BASE_URL is missing', async () => {
    const req = mkGet(
      'http://localhost:3003/authorize?response_type=code&client_id=e2d_test&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback',
      { 'x-forwarded-host': 'evolve2digital.com', 'x-forwarded-proto': 'https' }
    )
    const res = await route.GET(req)
    expect(res.status).toBe(302)
    const location = res.headers.get('location') || ''
    expect(location).toMatch(/^https:\/\/evolve2digital\.com\/authorize\/page\?/)
  })

  it('preserves all original query params on the redirect', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://evolve2digital.com'
    const req = mkGet(
      'http://localhost:3003/authorize?response_type=code&client_id=e2d_test&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback&state=xyz&scope=posts%3Aread'
    )
    const res = await route.GET(req)
    const location = new URL(res.headers.get('location') || '')
    expect(location.searchParams.get('client_id')).toBe('e2d_test')
    expect(location.searchParams.get('state')).toBe('xyz')
    expect(location.searchParams.get('scope')).toBe('posts:read')
  })
})
