/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

jest.mock('../../lib/mcp-logger', () => ({
  mcpLogger: {
    logToolInvocation: jest.fn(),
    logError: jest.fn(),
    logRateLimitExceeded: jest.fn(),
    logManifestRequest: jest.fn(),
  },
}))

jest.mock('../../lib/mcp-rate-limiter', () => ({
  createRateLimitMiddleware: jest.fn(() => () => ({
    allowed: true,
    remaining: 99,
    resetTime: Date.now() + 60_000,
  })),
  getRateLimitHeaders: jest.fn(() => ({})),
}))

let manifestRoute: any
beforeAll(() => {
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
  jest.resetModules()
  manifestRoute = require('../../app/api/mcp/manifest/route')
})

const mkGet = () => new NextRequest('http://localhost:3000/api/mcp/manifest', { method: 'GET' })

async function getManifest(): Promise<any> {
  const res = await manifestRoute.GET(mkGet())
  expect(res.status).toBe(200)
  const data = await res.json()
  // Response is { mcp: { tools: [...], ... } }
  const tools = data.mcp?.tools ?? data.tools
  return Array.isArray(tools) ? tools : Object.values(tools || {})
}

describe('/api/mcp/manifest', () => {
  it('exposes posts.rebuild with posts:write scope', async () => {
    const tools = await getManifest()
    const rebuild = tools.find((t: any) => t.name === 'posts.rebuild')
    expect(rebuild).toBeDefined()
    expect(rebuild.method).toBe('POST')
    expect(rebuild.auth.scopes).toContain('posts:write')
    expect(rebuild.endpoint).toContain('/api/mcp/tools/posts/rebuild')
  })

  it('declares skip_rebuild in posts.create input_schema', async () => {
    const tools = await getManifest()
    const create = tools.find((t: any) => t.name === 'posts.create')
    expect(create).toBeDefined()
    expect(create.input_schema.properties.skip_rebuild).toBeDefined()
    expect(create.input_schema.properties.skip_rebuild.type).toBe('boolean')
    expect(create.input_schema.properties.skip_rebuild.default).toBe(false)
  })
})
