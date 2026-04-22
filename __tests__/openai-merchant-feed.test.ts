/** @jest-environment node */
import { GET } from '@/app/feeds/openai-merchant.json/route'

describe('GET /feeds/openai-merchant.json', () => {
  test('returns 200 with JSON array and cache headers', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('public, max-age=900')

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(6)
    // sanity checks on first product
    const first = data[0]
    expect(first).toHaveProperty('id', 'agent_base_1500')
    expect(first).toHaveProperty('condition', 'new')
    expect(first).toHaveProperty('availability')
    expect(first).toHaveProperty('price')
  })

  test('returns 500 with error payload when serialization fails', async () => {
    const originalStringify = JSON.stringify
    // Forzar fallo de serialización sólo al serializar arrays (el catch serializa objeto)
    JSON.stringify = function (
      value: unknown,
      replacer?: unknown,
      space?: unknown
    ): string {
      if (Array.isArray(value)) {
        throw new Error('forced stringify error')
      }
      return originalStringify(value as any, replacer as any, space as any)
    }

    const res = await GET()
    expect(res.status).toBe(500)
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
    const payload = await res.json()
    expect(payload).toEqual({ error: 'internal_error' })

    // Restore JSON.stringify
    JSON.stringify = originalStringify
  })
})
