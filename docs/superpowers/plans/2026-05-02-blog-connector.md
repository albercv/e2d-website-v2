# Blog Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir publicar posts multi-idioma (es/en/it) en el blog desde Claude.ai web vía Custom Connector → MCP server, con rebuild automático tras la creación de los 3 posts.

**Architecture:** El MCP server existente ya expone `posts_create`. Añadimos (1) parámetro `skip_rebuild` en `posts_create` para suprimir rebuild en llamadas intermedias y (2) tool nueva `posts_rebuild` que dispara el endpoint admin de rebuild. Claude.ai web orquesta: `posts_create` ×3 con `skip_rebuild:true` + `posts_rebuild` ×1.

**Tech Stack:** Next.js 14 App Router, TypeScript, Jest, OAuth 2.1 + PKCE (existente), Contentlayer/MDX (existente), PM2.

**Spec:** `docs/superpowers/specs/2026-05-02-blog-connector-design.md`

**Branch:** `feature/blogConnector` (ya activa)

---

## Phase A — `skip_rebuild` en `posts_create`

### Task A1: Tests para `skip_rebuild`

**Files:**
- Modify: `__tests__/api/mcp-posts-create.test.ts` (añadir tests al final del `describe` existente, antes de la línea 198)

- [ ] **Step 1: Añadir mock de `fetch` global y tests para `skip_rebuild`**

Editar el `beforeAll` para añadir vars de rebuild, añadir un `jest.spyOn(global, 'fetch')` y 3 tests nuevos. Tras el último `it(...)` existente (línea 197) y antes del cierre del `describe`, insertar:

```ts
  describe('skip_rebuild parameter', () => {
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

    const validBody = (overrides: any = {}) => ({
      title: 'Skip rebuild test post',
      description: 'Descripción suficiente para skip rebuild',
      locale: 'es',
      content: '# MDX\n\n'.padEnd(60, 'q'),
      ...overrides,
    })

    it('should NOT trigger rebuild when skip_rebuild is true', async () => {
      const req = mkRequest(
        'http://localhost:3000/api/mcp/tools/posts/create',
        validBody({ title: 'Skip rebuild true', skip_rebuild: true })
      )
      const res = await createRoute.POST(req)
      expect([200, 201]).toContain(res.status)
      // Allow microtasks to flush in case fetch was scheduled async
      await new Promise(r => setImmediate(r))
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('SHOULD trigger rebuild when skip_rebuild is omitted', async () => {
      const req = mkRequest(
        'http://localhost:3000/api/mcp/tools/posts/create',
        validBody({ title: 'Skip rebuild omitted' })
      )
      const res = await createRoute.POST(req)
      expect([200, 201]).toContain(res.status)
      await new Promise(r => setImmediate(r))
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:3000/api/admin/rebuild')
    })

    it('should treat skip_rebuild non-boolean values as false', async () => {
      const req = mkRequest(
        'http://localhost:3000/api/mcp/tools/posts/create',
        validBody({ title: 'Skip rebuild string', skip_rebuild: 'true' })
      )
      const res = await createRoute.POST(req)
      expect([200, 201]).toContain(res.status)
      await new Promise(r => setImmediate(r))
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd /root/e2dProject/e2d-website-v2
npx jest __tests__/api/mcp-posts-create.test.ts -t 'skip_rebuild' --runInBand
```

Expected: 3 failures. The 1st (`should NOT trigger rebuild`) **must** fail with `fetchSpy` having been called (current behavior triggers rebuild regardless). The 2nd and 3rd may pass already, but Step 1 is the load-bearing one.

- [ ] **Step 3: Commit failing tests**

```
git add __tests__/api/mcp-posts-create.test.ts
git commit -m "test: add skip_rebuild tests for posts_create"
```

---

### Task A2: Implementar `skip_rebuild` en posts_create

**Files:**
- Modify: `app/api/mcp/tools/posts/create/route.ts:101` (zona de extracción de payload) y `app/api/mcp/tools/posts/create/route.ts:172` (bloque de auto-rebuild)

- [ ] **Step 1: Extraer `skip_rebuild` del payload**

En `app/api/mcp/tools/posts/create/route.ts`, tras la línea 102 (donde se extrae `author`), añadir:

```ts
  const skipRebuild = payloadObj.skip_rebuild === true
```

Mantener la regla del spec: solo `=== true` cuenta. Strings/numbers se tratan como `false`.

- [ ] **Step 2: Saltar el rebuild si `skip_rebuild` es true**

En `app/api/mcp/tools/posts/create/route.ts`, modificar la condición de la línea 172 de:

```ts
  if (process.env.AUTO_REBUILD_AFTER_MCP_CHANGE === 'true' && process.env.ADMIN_REBUILD_URL) {
```

A:

```ts
  if (!skipRebuild && process.env.AUTO_REBUILD_AFTER_MCP_CHANGE === 'true' && process.env.ADMIN_REBUILD_URL) {
```

- [ ] **Step 3: Run tests to verify they pass**

```
npx jest __tests__/api/mcp-posts-create.test.ts -t 'skip_rebuild' --runInBand
```

Expected: 3 PASS.

- [ ] **Step 4: Run full create test suite to confirm no regressions**

```
npx jest __tests__/api/mcp-posts-create.test.ts --runInBand
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```
git add app/api/mcp/tools/posts/create/route.ts
git commit -m "feat(mcp): support skip_rebuild on posts_create

Permite suprimir el rebuild automático tras crear un post. Necesario
para encadenar 3 posts_create (es/en/it) y disparar un solo rebuild
al final via posts_rebuild."
```

---

### Task A3: Declarar `skip_rebuild` en el manifest

**Files:**
- Modify: `app/api/mcp/manifest/route.ts:374-385` (input_schema de `posts_create`)

- [ ] **Step 1: Añadir el campo al input_schema**

En `app/api/mcp/manifest/route.ts`, dentro del `input_schema.properties` de `posts_create` (entre `published` y el cierre `}`), añadir:

```ts
        skip_rebuild: { type: 'boolean', default: false, description: 'Si true, no dispara rebuild tras crear. Útil al encadenar varias creaciones seguidas (ej. multi-idioma).' }
```

- [ ] **Step 2: Verificar manualmente la respuesta del manifest**

Sin tests aún (vienen en Phase B). Verificar que TypeScript compila:

```
npx tsc --noEmit -p tsconfig.json
```

Expected: 0 errors. Si hay errores en otros ficheros preexistentes, revisar y reportar; no introducir nuevos.

- [ ] **Step 3: Commit**

```
git add app/api/mcp/manifest/route.ts
git commit -m "feat(mcp): declare skip_rebuild in posts_create input schema"
```

---

## Phase B — Tool nueva `posts_rebuild`

### Task B1: Tests para `posts_rebuild`

**Files:**
- Create: `__tests__/api/mcp-posts-rebuild.test.ts`

- [ ] **Step 1: Crear el fichero de tests**

Crear `__tests__/api/mcp-posts-rebuild.test.ts` con:

```ts
/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { signAccessToken } from '../../lib/oauth-jwt'

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
  createRateLimitMiddleware: jest.fn(() => () => ({
    allowed: allowRate,
    remaining: allowRate ? 2 : 0,
    resetTime: Date.now() + 60_000,
    retryAfter,
  })),
  getRateLimitHeaders: jest.fn((result: any) => ({
    'X-RateLimit-Remaining': String(result.remaining ?? 0),
    'X-RateLimit-Reset': String(Math.ceil((Date.now() + 60_000) / 1000)),
    ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
  })),
}))

let rebuildRoute: any
beforeAll(() => {
  jest.resetModules()
  rebuildRoute = require('../../app/api/mcp/tools/posts/rebuild/route')
})

const mkRequest = (scopes: string[] = ['posts:write'], headers: Record<string, string> = {}) => {
  const token = signAccessToken({
    sub: 'test-user',
    email: 'test@example.com',
    role: 'admin',
    scope: scopes,
    aud: 'mcp',
  })
  return new NextRequest('http://localhost:3000/api/mcp/tools/posts/rebuild', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify({}),
  })
}

describe('/api/mcp/tools/posts/rebuild', () => {
  let fetchSpy: jest.SpyInstance

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-32-bytes-minimum-123456'
  })

  beforeEach(() => {
    allowRate = true
    retryAfter = undefined
    process.env.E2D_MCP_API_KEY = 'local-dev-mcp-key'
    process.env.ADMIN_REBUILD_URL = 'http://localhost:3000/api/admin/rebuild'
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }) as any
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('OPTIONS returns 200 with CORS headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp/tools/posts/rebuild', { method: 'OPTIONS' })
    const res = await rebuildRoute.OPTIONS(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('rejects request without OAuth token', async () => {
    const req = new NextRequest('http://localhost:3000/api/mcp/tools/posts/rebuild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects token without posts:write scope', async () => {
    const req = mkRequest(['posts:read'])
    const res = await rebuildRoute.POST(req)
    expect([401, 403]).toContain(res.status)
  })

  it('returns 500 when E2D_MCP_API_KEY is missing on server', async () => {
    delete process.env.E2D_MCP_API_KEY
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(500)
    const body = await res.text()
    expect(body).toContain('E2D_MCP_API_KEY')
  })

  it('returns 500 when ADMIN_REBUILD_URL is missing on server', async () => {
    delete process.env.ADMIN_REBUILD_URL
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(500)
    const body = await res.text()
    expect(body).toContain('ADMIN_REBUILD_URL')
  })

  it('returns 502 when admin rebuild endpoint returns 5xx', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('boom', { status: 500 }) as any
    )
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(502)
  })

  it('returns 200 on happy path with rebuilding:true', async () => {
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.rebuilding).toBe(true)
    expect(typeof json.started_at).toBe('string')
    expect(typeof json.processingTime).toBe('number')
  })

  it('calls admin endpoint with correct headers and body', async () => {
    const req = mkRequest()
    await rebuildRoute.POST(req)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/rebuild')
    expect(init.method).toBe('POST')
    expect(init.headers['Authorization']).toBe('Bearer local-dev-mcp-key')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ noRestart: false })
  })

  it('enforces rate limit when exceeded', async () => {
    allowRate = false
    retryAfter = 30
    const req = mkRequest()
    const res = await rebuildRoute.POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })
})
```

- [ ] **Step 2: Run tests to verify they ALL fail**

```
npx jest __tests__/api/mcp-posts-rebuild.test.ts --runInBand
```

Expected: failure to require the module (route file doesn't exist yet) — error like "Cannot find module '../../app/api/mcp/tools/posts/rebuild/route'".

- [ ] **Step 3: Commit failing tests**

```
git add __tests__/api/mcp-posts-rebuild.test.ts
git commit -m "test: add posts_rebuild MCP tool tests (failing)"
```

---

### Task B2: Implementar `posts_rebuild` route handler

**Files:**
- Create: `app/api/mcp/tools/posts/rebuild/route.ts`

- [ ] **Step 1: Crear el route handler**

Crear `app/api/mcp/tools/posts/rebuild/route.ts` con:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'
import { mcpLogger } from '@/lib/mcp-logger'
import { requireOAuthScopes } from '@/lib/mcp-oauth'
import { respondAsMcpOrJson, respondErrorAsMcpOrJson } from '@/lib/mcp-format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOOL_NAME = 'posts_rebuild'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, User-Agent, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS(request: NextRequest) {
  const start = Date.now()
  const ua = request.headers.get('user-agent') || undefined
  const res = new NextResponse(null, { status: 200, headers: { ...corsHeaders } })
  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'OPTIONS', true, Date.now() - start, 200, ua)
  return res
}

export async function POST(request: NextRequest) {
  const start = Date.now()
  const ua = request.headers.get('user-agent') || undefined

  const { error: authError } = requireOAuthScopes(request, ['posts:write'])
  if (authError) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, authError.status || 401, ua)
    return authError
  }

  const rateResult = createRateLimitMiddleware(TOOL_NAME)(request)
  if (!rateResult.allowed) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 429, ua)
    return respondErrorAsMcpOrJson(
      request,
      'Rate limit exceeded',
      429,
      'rate_limit_exceeded',
      { retryAfter: rateResult.retryAfter },
      TOOL_NAME,
      getRateLimitHeaders(rateResult)
    )
  }

  const apiKey = process.env.E2D_MCP_API_KEY
  if (!apiKey) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 500, ua)
    return respondErrorAsMcpOrJson(request, 'Missing E2D_MCP_API_KEY on server', 500, 'server_misconfigured', undefined, TOOL_NAME)
  }

  const adminRebuildUrl = process.env.ADMIN_REBUILD_URL
  if (!adminRebuildUrl) {
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 500, ua)
    return respondErrorAsMcpOrJson(request, 'Missing ADMIN_REBUILD_URL on server', 500, 'server_misconfigured', undefined, TOOL_NAME)
  }

  const startedAt = new Date().toISOString()

  let upstream: Response
  try {
    upstream = await fetch(adminRebuildUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ noRestart: false }),
    })
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 502, ua)
    return respondErrorAsMcpOrJson(request, 'Failed to reach admin rebuild endpoint', 502, 'upstream_unreachable', { details }, TOOL_NAME)
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '')
    mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', false, Date.now() - start, 502, ua)
    return respondErrorAsMcpOrJson(request, 'Admin rebuild endpoint returned error', 502, 'upstream_error', { upstreamStatus: upstream.status, details: text.slice(0, 200) }, TOOL_NAME)
  }

  const elapsed = Date.now() - start
  mcpLogger.logToolInvocation(TOOL_NAME, '/api/mcp/tools/posts/rebuild', 'POST', true, elapsed, 200, ua)

  return respondAsMcpOrJson(
    request,
    {
      tool: TOOL_NAME,
      rebuilding: true,
      started_at: startedAt,
      processingTime: elapsed,
    },
    200,
    TOOL_NAME,
    { 'X-Content-Type': 'mcp-tool-response' }
  )
}
```

- [ ] **Step 2: Añadir entrada `posts_rebuild` al rate-limiter config**

En `lib/mcp-rate-limiter.ts`, dentro de `RATE_LIMIT_CONFIGS` (línea 29 en adelante), añadir junto a las otras entradas:

```ts
  'posts_rebuild': {
    maxRequests: 3,
    windowMs: 60_000,
    skipSuccessfulGET: false,
  },
```

(Verificar la estructura del `RateLimitConfig` mirando entradas existentes; los nombres de campos pueden variar — `maxRequests`/`windowMs` son los nombres usados según la línea 181 de la lectura previa).

- [ ] **Step 3: Run rebuild tests**

```
npx jest __tests__/api/mcp-posts-rebuild.test.ts --runInBand
```

Expected: all PASS (9 tests).

- [ ] **Step 4: Run full test suite to ensure no regressions**

```
npx jest --runInBand
```

Expected: all PASS. Si algún test preexistente falla, parar y reportar antes de continuar.

- [ ] **Step 5: Commit**

```
git add app/api/mcp/tools/posts/rebuild/route.ts lib/mcp-rate-limiter.ts
git commit -m "feat(mcp): add posts_rebuild tool

Tool MCP nueva que dispara /api/admin/rebuild para regenerar el
sitio tras crear posts. Protegida con OAuth scope posts:write y
rate-limit 3/min. Diseñada para llamarse una vez después de una
secuencia de posts_create con skip_rebuild:true."
```

---

### Task B3: Registrar `posts_rebuild` en el manifest

**Files:**
- Modify: `app/api/mcp/manifest/route.ts` (añadir entrada nueva tras `posts_delete`, antes de la siguiente sección)

- [ ] **Step 1: Localizar dónde insertar la entrada**

Encontrar el cierre de la entrada `posts_delete` en el objeto `MCP_TOOLS`:

```
grep -n "'posts_delete'" /root/e2dProject/e2d-website-v2/app/api/mcp/manifest/route.ts
```

La entrada `posts_delete` empieza en la línea 458 según la lectura previa. Localizar su cierre `}` y `,` (probablemente alrededor de la línea 555 — confirmar).

- [ ] **Step 2: Añadir la entrada `posts_rebuild`**

Tras el cierre de la entrada `posts_delete` (incluida la coma), insertar:

```ts
  'posts_rebuild': {
    name: 'posts_rebuild',
    description: 'Dispara un rebuild + restart del sitio para que los posts recién creados (vía posts_create con skip_rebuild:true) sean visibles en producción. Requiere OAuth2 (Bearer JWT) con scope posts:write. Llamada típicamente una vez después de varios posts_create. El rebuild es asíncrono (1-3 min); este tool devuelve 200 inmediatamente.',
    category: 'content',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    output_schema: {
      type: 'object',
      properties: {
        rebuilding: { type: 'boolean' },
        started_at: { type: 'string', format: 'date-time' },
        processingTime: { type: 'number' }
      }
    },
    endpoint: `${MCP_CONFIG.baseUrl}/api/mcp/tools/posts/rebuild`,
    method: 'POST',
    auth: {
      type: 'oauth2',
      description: 'OAuth 2.1 + PKCE bearer tokens',
      pkce: true,
      code_challenge_method: 'S256',
      authorization_endpoint: `${MCP_CONFIG.baseUrl}/authorize`,
      token_endpoint: `${MCP_CONFIG.baseUrl}/token`,
      resource: `${MCP_CONFIG.baseUrl}/sse`,
      scopes: ['posts:write']
    },
    rateLimit: {
      requests: 3,
      window: '1m',
      description: '3 requests per minute per IP'
    }
  },
```

- [ ] **Step 3: Verificar TypeScript compila**

```
npx tsc --noEmit -p tsconfig.json
```

Expected: 0 errors.

- [ ] **Step 4: Verificar el manifest en runtime con un quick local check**

Arrancar el dev server brevemente y comprobar que la tool aparece:

```
npx next dev -p 3099 > /tmp/next-dev.log 2>&1 &
DEV_PID=$!
sleep 8
curl -sS http://localhost:3099/api/mcp/manifest | jq '.tools | map(select(.name == "posts_rebuild")) | length'
kill $DEV_PID
```

Expected: `1`.

- [ ] **Step 5: Commit**

```
git add app/api/mcp/manifest/route.ts
git commit -m "feat(mcp): register posts_rebuild in manifest"
```

---

### Task B4: Tests del manifest

**Files:**
- Create: `__tests__/api/mcp-manifest.test.ts`

- [ ] **Step 1: Crear el fichero de tests**

```ts
/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

jest.mock('../../lib/mcp-logger', () => ({
  mcpLogger: {
    logToolInvocation: jest.fn(),
    logError: jest.fn(),
    logRateLimitExceeded: jest.fn(),
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
  return res.json()
}

describe('/api/mcp/manifest', () => {
  it('exposes posts_rebuild with posts:write scope', async () => {
    const data = await getManifest()
    const tools = Array.isArray(data.tools) ? data.tools : Object.values(data.tools || {})
    const rebuild = tools.find((t: any) => t.name === 'posts_rebuild')
    expect(rebuild).toBeDefined()
    expect(rebuild.method).toBe('POST')
    expect(rebuild.auth.scopes).toContain('posts:write')
    expect(rebuild.endpoint).toContain('/api/mcp/tools/posts/rebuild')
  })

  it('declares skip_rebuild in posts_create input_schema', async () => {
    const data = await getManifest()
    const tools = Array.isArray(data.tools) ? data.tools : Object.values(data.tools || {})
    const create = tools.find((t: any) => t.name === 'posts_create')
    expect(create).toBeDefined()
    expect(create.input_schema.properties.skip_rebuild).toBeDefined()
    expect(create.input_schema.properties.skip_rebuild.type).toBe('boolean')
    expect(create.input_schema.properties.skip_rebuild.default).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests**

```
npx jest __tests__/api/mcp-manifest.test.ts --runInBand
```

Expected: 2 PASS. Si las assertions de shape (`Array.isArray` vs object) fallan, ajustar el extractor `tools` mirando la respuesta real (línea 679/771 del manifest exporta `tools: Object.values(MCP_TOOLS)` — debería ser un array).

- [ ] **Step 3: Commit**

```
git add __tests__/api/mcp-manifest.test.ts
git commit -m "test: add manifest assertions for posts_rebuild and skip_rebuild"
```

---

## Phase C — Operaciones y documentación

### Task C1: Configurar variables de entorno en el servidor

**Files:**
- Modify (NO commit, en producción): `/root/e2dProject/e2d-website-v2/.env`

⚠️ **Este task no se commitea.** `.env` está en `.gitignore`. Se ejecuta directamente en el servidor.

- [ ] **Step 1: Verificar variables ya presentes**

```
grep -E "^(E2D_MCP_API_KEY|AUTO_REBUILD_AFTER_MCP_CHANGE|ADMIN_REBUILD_URL|RESTART_COMMAND)=" /root/e2dProject/e2d-website-v2/.env || echo "(some or all missing)"
```

`E2D_MCP_API_KEY` debe existir ya. Si las otras 3 faltan, pasar al Step 2.

- [ ] **Step 2: Añadir las 3 variables**

Editar `.env` y añadir al final (si no existen):

```
AUTO_REBUILD_AFTER_MCP_CHANGE=true
ADMIN_REBUILD_URL=https://evolve2digital.com/api/admin/rebuild
RESTART_COMMAND=pm2 restart e2d
```

- [ ] **Step 3: Reiniciar PM2 para que recoja las nuevas variables**

```
pm2 restart e2d --update-env
pm2 logs e2d --lines 30 --nostream
```

Expected: arranque limpio sin errores. Servicio respondiendo.

- [ ] **Step 4: Verificar el servicio sigue OK**

```
curl -sI https://evolve2digital.com/ | head -3
```

Expected: HTTP/2 200.

---

### Task C2: Actualizar documentación MCP

**Files:**
- Modify: `docs/mcp-changelog.md`
- Modify: `docs/mcp-usage.md`
- Modify: `docs/mcp-examples.md`

Estos ficheros ya tienen cambios sin commitear (status `M` al inicio de la sesión). Conservar lo que el usuario ya editó y añadir lo nuevo.

- [ ] **Step 1: Leer los 3 ficheros para ver dónde insertar**

```
wc -l docs/mcp-changelog.md docs/mcp-usage.md docs/mcp-examples.md
```

Leer los 3 con la herramienta `Read` para ver qué hay y dónde insertar.

- [ ] **Step 2: Añadir entrada en `mcp-changelog.md`**

Añadir al inicio (tras el header) una entrada nueva:

```markdown
## 2026-05-02

- **Nueva tool**: `posts_rebuild` — dispara rebuild+restart del sitio. Scope `posts:write`. Rate-limit 3/min. Devuelve 200 inmediato; el build es asíncrono (1-3 min).
- **`posts_create`**: nuevo parámetro opcional `skip_rebuild` (default `false`). Si `true`, no dispara rebuild automático tras crear el post. Útil para encadenar varias creaciones (ej. multi-idioma) y disparar un solo rebuild al final via `posts_rebuild`.
```

- [ ] **Step 3: Añadir sección en `mcp-usage.md`**

Añadir una sección "Flujo multi-idioma" tras la sección donde se documenta `posts_create`:

```markdown
### Flujo multi-idioma desde Claude.ai

Para publicar un post en es/en/it desde Claude.ai web (Custom Connector):

1. Llamar `posts_create` 3 veces (una por idioma) con `skip_rebuild: true`. Esto crea los 3 ficheros MDX sin disparar rebuild.
2. Llamar `posts_rebuild` una sola vez al final. Dispara el build+restart asíncrono.

El build tarda 1-3 minutos. Tras completarse, las 3 URLs `/es/blog/<slug>`, `/en/blog/<slug>`, `/it/blog/<slug>` servirán los nuevos posts.

Si una de las 3 creaciones falla (p.ej. 409 por colisión de slug), las otras 2 se conservan en disco. Reintenta solo la que falló y luego `posts_rebuild`.
```

- [ ] **Step 4: Añadir ejemplo en `mcp-examples.md`**

Añadir una sección "Publicar un post en 3 idiomas":

````markdown
### Publicar un post en es/en/it

Secuencia de 4 llamadas. Las 3 primeras crean los ficheros sin rebuild; la última dispara el build.

```http
POST /api/mcp/tools/posts/create
Authorization: Bearer <token con scope posts:write>
Content-Type: application/json

{
  "title": "Mi post en español",
  "description": "Descripción en español",
  "locale": "es",
  "content": "# Encabezado\n\nContenido en MDX...",
  "tags": ["devops", "automatización"],
  "skip_rebuild": true
}
```

Respuesta 201:
```json
{ "created": true, "slug": "mi-post-en-espanol", "locale": "es", "url": "https://evolve2digital.com/es/blog/mi-post-en-espanol" }
```

Repetir para `locale:"en"` y `locale:"it"` con el contenido traducido (slugs distintos).

Tras los 3, disparar el rebuild:

```http
POST /api/mcp/tools/posts/rebuild
Authorization: Bearer <token con scope posts:write>
Content-Type: application/json

{}
```

Respuesta 200:
```json
{ "rebuilding": true, "started_at": "2026-05-02T14:00:00.000Z", "processingTime": 42 }
```

Esperar 1-3 minutos para que el build termine.
````

- [ ] **Step 5: Commit**

```
git add docs/mcp-changelog.md docs/mcp-usage.md docs/mcp-examples.md
git commit -m "docs: document posts_rebuild and skip_rebuild flow

Cubre el flujo multi-idioma para publicar desde Claude.ai web
con 3x posts_create + 1x posts_rebuild."
```

---

## Phase D — Verificación

### Task D1: Sanity check de infraestructura en producción

**Files:** ninguno (solo curl).

Pre-requisito: Phase A, B y C completadas y desplegadas a producción (build + pm2 restart). El propio `posts_rebuild` puede usarse para esto si el código ya está en producción tras un primer despliegue manual. Para el primer despliegue, ejecutar manualmente:

- [ ] **Step 1: Build y reinicio**

```
cd /root/e2dProject/e2d-website-v2
npm run build
pm2 restart e2d --update-env
pm2 logs e2d --lines 30 --nostream
```

Expected: build OK, pm2 muestra "online".

- [ ] **Step 2: Verificar discovery endpoints públicos**

```
curl -sS https://evolve2digital.com/.well-known/oauth-authorization-server | jq -r '.code_challenge_methods_supported'
```

Expected: `["S256"]` o similar.

```
curl -sS https://evolve2digital.com/.well-known/oauth-protected-resource | jq -r '.resource'
```

Expected: una URL conteniendo `evolve2digital.com`.

- [ ] **Step 3: Verificar que `posts_rebuild` está en el manifest público**

```
curl -sS https://evolve2digital.com/api/mcp/manifest | jq '.tools | map(.name)'
```

Expected: la lista incluye `"posts_rebuild"` y `"posts_create"`.

```
curl -sS https://evolve2digital.com/api/mcp/manifest | jq '.tools[] | select(.name == "posts_create") | .input_schema.properties.skip_rebuild'
```

Expected: objeto con `type: "boolean"`.

---

### Task D2: OAuth manual end-to-end (sin Claude.ai aún)

**Files:** ninguno (solo curl + browser).

Esta verificación aísla el backend antes de meter Claude.ai en la ecuación. Si esto funciona, cualquier fallo en Claude.ai será de UX/conector, no de backend.

- [ ] **Step 1: Iniciar OAuth flow en el navegador**

Construir URL de autorización con PKCE. Generar verifier+challenge:

```
VERIFIER=$(openssl rand -base64 64 | tr -d '=+/' | tr -d '\n' | head -c 64)
CHALLENGE=$(printf "%s" "$VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr -d '=' | tr '/+' '_-')
echo "verifier=$VERIFIER"
echo "challenge=$CHALLENGE"
```

Construir URL:
```
https://evolve2digital.com/authorize?response_type=code&client_id=<dynamic-client>&redirect_uri=<callback>&code_challenge=$CHALLENGE&code_challenge_method=S256&scope=posts:write
```

(Si la dynamic client registration está implementada, usar `POST /register` primero. Mirar `app/api/oauth/register` o equivalente.)

Abrir en el navegador, login con admin, consent, capturar `code` del callback.

- [ ] **Step 2: Intercambiar code por access_token**

```
curl -sS -X POST https://evolve2digital.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=<CODE>&redirect_uri=<REDIRECT>&client_id=<CLIENT>&code_verifier=$VERIFIER" | jq .
```

Expected: JSON con `access_token`, `token_type:"Bearer"`, `scope` incluyendo `posts:write`.

- [ ] **Step 3: Crear post de prueba con skip_rebuild**

```
TOKEN=<access_token de paso 2>
curl -sS -X POST https://evolve2digital.com/api/mcp/tools/posts/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MCP smoke test 2026-05-02",
    "description": "Post de prueba para verificar el conector",
    "locale": "es",
    "content": "# Smoke test\n\nEste es un post de prueba.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "tags": ["smoke-test"],
    "skip_rebuild": true
  }' | jq .
```

Expected: `{"created":true, "slug":"mcp-smoke-test-2026-05-02", "locale":"es", "url":"..."}`.

Verificar el fichero existe en disco:
```
ls -la /root/e2dProject/e2d-website-v2/content/posts/mcp-smoke-test-2026-05-02.mdx
```

- [ ] **Step 4: Disparar rebuild**

```
curl -sS -X POST https://evolve2digital.com/api/mcp/tools/posts/rebuild \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

Expected: `{"rebuilding":true, "started_at":"...", "processingTime": <num>}`.

Tail del build log:
```
tail -f /root/e2dProject/e2d-website-v2/build.log
```

Expected: líneas mostrando `npm run build` arrancando y completando, luego `pm2 restart`.

- [ ] **Step 5: Verificar URL pública tras 2-3 min**

```
sleep 180
curl -sI https://evolve2digital.com/es/blog/mcp-smoke-test-2026-05-02 | head -3
```

Expected: `HTTP/2 200`.

- [ ] **Step 6: Cleanup**

```
curl -sS -X POST https://evolve2digital.com/api/mcp/tools/posts/delete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"mcp-smoke-test-2026-05-02","locale":"es"}' | jq .
```

Y disparar otro rebuild para que desaparezca de la web.

Si el OAuth dinámico no está implementado y este task se complica, anotar el bloqueo en `tasks/lessons.md` y pasar directamente al D3 — Claude.ai puede manejar el OAuth flow internamente.

---

### Task D3: Smoke test desde Claude.ai web

**Files:** ninguno (interactivo en Claude.ai).

- [ ] **Step 1: Añadir el Custom Connector**

En Claude.ai web (Settings → Connectors → Add Custom Connector), introducir la URL del MCP. Probar primero con la URL del manifest (`https://evolve2digital.com/api/mcp/manifest`) o `/sse` según lo que pida la UI de Claude.ai.

- [ ] **Step 2: Autorizar**

Claude.ai abre popup OAuth → login con admin de e2d → consent (debe pedir `posts:write` entre los scopes) → vuelta.

- [ ] **Step 3: Verificar tools visibles**

En un chat nuevo: "lista las tools que tienes del conector e2d".

Expected: respuesta menciona `posts_search`, `posts_get`, `posts_create`, `posts_delete`, `posts_schema`, `posts_rebuild`.

- [ ] **Step 4: Smoke test multi-idioma**

Iniciar tail de logs en otro terminal:
```
tail -f /root/e2dProject/e2d-website-v2/logs/mcp-*.log
tail -f /root/e2dProject/e2d-website-v2/build.log
```

En el chat de Claude.ai:
> "Crea un post breve sobre 'Cómo usar MCP en producción' en es/en/it. Slug-friendly: 'MCP Smoke Test 2026-05-02'. Solo 2 párrafos. Cuando los 3 estén listos en chat te digo de publicar."

Tras revisar las 3 versiones inline:
> "ok publica los 3 y dispara el rebuild"

- [ ] **Step 5: Verificar tool calls**

En `logs/mcp-*.log` deben aparecer:
- 3 entradas `posts_create` con éxito y `skip_rebuild:true` (revisar el body si está logueado)
- 1 entrada `posts_rebuild` con éxito

En `build.log`: una entrada de build arrancando.

- [ ] **Step 6: Verificar las 3 URLs tras 2-3 min**

```
sleep 180
for L in es en it; do
  curl -sI "https://evolve2digital.com/$L/blog/mcp-smoke-test-2026-05-02" | head -1
done
```

Expected: 3× HTTP/2 200.

- [ ] **Step 7: Cleanup**

Pedir a Claude.ai:
> "borra los 3 posts de smoke test y dispara otro rebuild"

Verificar tras otros 2-3 min que las 3 URLs devuelven 404.

---

### Task D4: Verificación de fallo controlado (409 colisión)

**Files:** ninguno.

- [ ] **Step 1: Crear un post de prueba**

En Claude.ai:
> "Crea un post 'Test colisión' solo en es."

Esperar al rebuild para que el slug quede registrado.

- [ ] **Step 2: Intentar crear el mismo post otra vez**

> "Crea otra vez el post 'Test colisión' en es."

Expected: Claude reporta en chat que la creación falló con 409 / "Post already exists" / similar, de forma legible.

- [ ] **Step 3: Cleanup**

Pedir a Claude que borre el post + rebuild.

- [ ] **Step 4: Anotar lo aprendido**

Añadir a `/root/e2dProject/e2d-website-v2/tasks/lessons.md` cualquier patrón:
- ¿Claude.ai re-autenticó automáticamente cuando el token expiró?
- ¿La UX del 409 en chat fue clara?
- ¿El tiempo de rebuild fue aceptable?
- ¿Hubo alguna sorpresa en la UI del Custom Connector?

```
git add tasks/lessons.md
git commit -m "docs: log lessons from blog-connector verification"
```

---

## Final wrap-up

- [ ] **Step 1: Tests verdes**

```
cd /root/e2dProject/e2d-website-v2
npx jest --runInBand
```

Expected: all PASS.

- [ ] **Step 2: Coverage check**

```
npx jest --coverage --runInBand --collectCoverageFrom='app/api/mcp/tools/posts/rebuild/route.ts' --collectCoverageFrom='app/api/mcp/tools/posts/create/route.ts'
```

Expected: ≥85% en cada uno.

- [ ] **Step 3: Limpiar `tasks/todo.md`**

Editar `tasks/todo.md` y marcar la tarea cerrada o vaciarla:

```markdown
# Tarea Activa

_Sin tarea activa. Última tarea cerrada: feature/blogConnector → conector MCP para Claude.ai web (2026-05-02)._
```

- [ ] **Step 4: Push y PR**

```
git push -u origin feature/blogConnector
gh pr create --base develop --title "feat: blog connector for Claude.ai web" --body "$(cat <<'EOF'
## Summary
- New MCP tool `posts_rebuild` (scope `posts:write`, rate-limit 3/min)
- New optional `skip_rebuild` param on `posts_create`
- Enables multi-locale publishing flow from Claude.ai web Custom Connector

## Test plan
- [x] Unit tests pass (posts_create extended, posts_rebuild new, manifest assertions)
- [x] Coverage ≥85% on changed files
- [x] Manual OAuth + curl E2E in production
- [x] Smoke test from Claude.ai web (3 posts in es/en/it visible)
- [x] 409 collision reported clearly in chat

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (post-write)

**Spec coverage:**
- ✅ `skip_rebuild` en posts_create → Phase A (3 tasks)
- ✅ `posts_rebuild` tool → Phase B (4 tasks)
- ✅ `.env` config → Task C1
- ✅ Manifest entry → Task B3
- ✅ Tests con cobertura ≥85% → Phase A/B + final wrap-up
- ✅ Verificación E2E (sanity, OAuth manual, Claude.ai, 409) → Phase D
- ✅ Docs MCP → Task C2
- ✅ `tasks/lessons.md` → Task D4

**Placeholder scan:** ningún TBD/TODO. Steps muestran código completo. Comandos exactos.

**Type consistency:** `skipRebuild` (camelCase, JS variable) vs `skip_rebuild` (snake_case, JSON field) usados consistentemente. `posts_rebuild` como nombre de tool en código + manifest + docs + tests.

**Notas operacionales:**
- Task C1 (`.env`) y D1-D4 (verificación) requieren acceso al servidor en producción y a Claude.ai. No son automatizables por subagent. Subagent puede dejar todo el código + docs listos hasta D1; D1-D4 los ejecuta el humano (Alberto).
