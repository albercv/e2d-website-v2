import { isAllowedResource } from '../../lib/oauth-resource'

const BASE = 'https://evolve2digital.com'

describe('isAllowedResource', () => {
  it('accepts the SSE endpoint (legacy strict clients)', () => {
    expect(isAllowedResource('https://evolve2digital.com/sse', BASE)).toBe(true)
  })

  it('accepts the bare base URL (RFC 8707 canonical issuer)', () => {
    expect(isAllowedResource('https://evolve2digital.com', BASE)).toBe(true)
  })

  it('accepts the base URL with trailing slash (Claude.ai web)', () => {
    expect(isAllowedResource('https://evolve2digital.com/', BASE)).toBe(true)
  })

  it('rejects a foreign origin', () => {
    expect(isAllowedResource('https://evil.example.com/sse', BASE)).toBe(false)
  })

  it('rejects http (downgrade attack)', () => {
    expect(isAllowedResource('http://evolve2digital.com/', BASE)).toBe(false)
  })

  it('rejects empty / missing values', () => {
    expect(isAllowedResource('', BASE)).toBe(false)
    expect(isAllowedResource(undefined, BASE)).toBe(false)
    expect(isAllowedResource(null, BASE)).toBe(false)
  })

  it('rejects values with extra path segments beyond the allowlist', () => {
    expect(isAllowedResource('https://evolve2digital.com/api/mcp', BASE)).toBe(false)
  })
})
