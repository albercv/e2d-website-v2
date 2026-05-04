# Tarea Activa

## Phase G — Write tools en JSON-RPC handler (control total desde Claude.ai)

**Diagnóstico (2026-05-04 06:10 UTC, post-F):** Conector OAuth funciona, pero `tools/list` solo expone `posts_search` y `posts_get`. Las herramientas REST (`/api/mcp/tools/posts/{create,delete,rebuild}`) no están enrutadas en el handler MCP, así que Claude.ai no puede crear/borrar posts ni disparar rebuild.

**Decisiones del usuario (2026-05-04 06:13 UTC):**
- Las 3 tools (`create`, `delete`, `rebuild`) — control total.
- `posts_rebuild` async con jobId (opción b.i). REUSO `/api/admin/rebuild` que YA hace spawn detached + jobId + 202.

### Subtareas

- [ ] G1 — `lib/blog/posts-write.ts`: extraer `slugify`, `createPost`, `deletePost`, `triggerRebuild` (helper que llama a `/api/admin/rebuild` con `E2D_MCP_API_KEY`). TDD.
- [ ] G2 — `handleRpcCall(req, ctx?)`: añadir `ctx = { claims | null }`. Helper `requireScope(claims, scope, id)` devuelve -32000 con `{ required }` si no.
- [ ] G3 — Añadir `posts_create`, `posts_delete`, `posts_rebuild` al handler (tools/list + tools/call). Reusar lib.
- [ ] G4 — `/sse` pasa `{ claims: auth.claims }`. `/mcp` pasa `{ claims: null }` (sin bearer, ChatGPT verá los 5 tools pero solo podrá llamar a los read). Actualizar test existente a 5 tools.
- [ ] G5 — Tests TDD: scope insuficiente, conflict 409, jobId returned.
- [ ] G6 — Build + pm2 restart + smoke test desde Claude.ai (crear post, verificar URL en evolve2digital.com).

### Out-of-scope (siguiente fase)

- `appointments.create` y `agent.query` en MCP (hoy solo REST).
- Persistencia de jobId entre reinicios PM2 (hoy en memoria del child).

---

## Phase F — `/sse` MCP transport fix (POST 405 root cause)

**Rama:** `feature/blogConnector`
**Diagnóstico (2026-05-04 05:30 UTC):** Tras todos los fixes de OAuth, Claude.ai sigue devolviendo "Authorization with the MCP server failed". Logs nginx muestran `POST /sse → 405 Method Not Allowed` repetido. La causa real **no era OAuth**: el endpoint `/sse` solo implementa `GET` (SSE stream) y `OPTIONS`. Claude.ai usa transporte "Streamable HTTP" (POST con JSON-RPC al endpoint MCP), y al recibir 405 muestra el error genérico de auth.

### Subtareas

- [ ] F1 — Crear `lib/mcp/rpc-handler.ts` con la lógica JSON-RPC pura extraída de `app/mcp/route.ts` (no-React, no-Next, sin CORS). Exporta `handleRpcCall`, `asJsonRpcRequest`, `toolsList`, helpers `successResponse`/`errorResponse`. Tests primero (TDD).
- [ ] F2 — Refactor `app/mcp/route.ts` para usar el handler compartido. **Mantener el origin allowlist intacto** (los tests existentes en `__tests__/api/mcp-streamable.test.ts` lo verifican; ChatGPT depende de él).
- [ ] F3 — Añadir `POST` a `app/sse/route.ts`:
    - Validar bearer con `requireOAuthScopes(req, [])` de `lib/mcp-oauth.ts` (devuelve 401 con `WWW-Authenticate: Bearer` si falta/inválido).
    - Parse JSON-RPC body (single + batch) con `asJsonRpcRequest`.
    - Delegar a `handleRpcCall` y devolver inline (`Content-Type: application/json`).
    - CORS abierto (Claude.ai como cliente OAuth-autenticado, sin restricción de origin).
- [ ] F4 — Tests Jest para POST /sse:
    - 401 con `WWW-Authenticate` cuando falta el bearer.
    - 401 cuando el bearer es inválido.
    - 200 + JSON-RPC `initialize` con bearer válido (firmado con `JWT_SECRET` de test).
    - 200 + `tools/list` con los mismos 2 tools que /mcp.
    - 200 + `tools/call posts_search` devuelve items.
- [ ] F5 — `npm test`: todo verde (los tests previos de /mcp deben seguir pasando).
- [ ] F6 — `npm run build` y `pm2 restart e2d`. Smoke test:
    - `curl -X POST https://evolve2digital.com/sse` (sin bearer) → 401 con `WWW-Authenticate`.
    - `curl -X POST .../sse -H "Authorization: Bearer <token>"` con body `initialize` → 200 + JSON-RPC.
- [ ] F7 — Re-test desde Claude.ai web UI. Verificar tokens emitidos + ausencia de POST /sse → 405 en nginx logs.

### Out-of-scope (follow-up)

Exponer `posts_create`, `posts_delete`, `posts_rebuild`, `appointments.create`, `agent.query` vía `tools/list` JSON-RPC (hoy solo están como REST en `/api/mcp/tools/*`). Para esta sesión basta con que el handshake MCP funcione; la creación de posts via Claude.ai requiere ese trabajo aparte.

---

## Blog Connector — Claude.ai web → MCP → blog (multi-idioma)

**Rama:** `feature/blogConnector`
**Spec:** `docs/superpowers/specs/2026-05-02-blog-connector-design.md` (commit `e759edb`)
**Plan:** `docs/superpowers/plans/2026-05-02-blog-connector.md` (commit `a6c2578`)

### Estado: PLAN ESCRITO Y APROBADO — pendiente de ejecutar.

Última decisión (2026-05-02): elegida ejecución **Subagent-Driven** (`superpowers:subagent-driven-development`). No se ha despachado ningún subagent todavía. Pausa pedida por el usuario antes del Task A1.

### Cómo continuar en una sesión futura

1. Leer este fichero + el plan en `docs/superpowers/plans/2026-05-02-blog-connector.md`.
2. Confirmar con el usuario si sigue queriendo ejecución subagent-driven o cambia a inline.
3. Decidir worktree sí/no (sigue en el directorio principal por ahora).
4. Despachar implementer subagent para **Task A1** (tests para `skip_rebuild` en `posts_create`).
5. Tras cada task: spec-reviewer + code-quality-reviewer antes de pasar al siguiente.

### Tasks de código (8) — las hace el driver con subagents

- [ ] A1 — Tests para `skip_rebuild`
- [ ] A2 — Implementar `skip_rebuild` en posts_create
- [ ] A3 — Declarar `skip_rebuild` en el manifest
- [ ] B1 — Tests para `posts_rebuild`
- [ ] B2 — Implementar `posts_rebuild` route handler
- [ ] B3 — Registrar `posts_rebuild` en el manifest
- [ ] B4 — Tests del manifest
- [ ] C2 — Actualizar documentación MCP

### Tasks manuales (5) — las hace Alberto

- [x] C1 — `.env` configurado en servidor (commit no requerido)
- [ ] D1 — Sanity check de infraestructura en producción (curl + manifest público)
- [ ] D2 — OAuth manual E2E con curl (aísla backend antes de tocar Claude.ai)
- [ ] D3 — Smoke test desde Claude.ai web (Custom Connector) — **bloqueado por DCR (Phase E)**
- [ ] D4 — Verificación de fallo controlado (409 colisión)

### Phase E — DCR (RFC 7591) — desbloquear connector de Claude.ai

Diagnóstico (2026-05-03 18:00 UTC): Claude.ai falla en `/authorize` con `Invalid client_id` porque `POST /register` devuelve 501. Sin DCR, Claude.ai no puede registrarse y como fallback usa el email del user como client_id. Necesitamos implementar Dynamic Client Registration.

Decisiones tomadas:
- Cliente público + PKCE (sin `client_secret`).
- Validación estricta de `redirect_uris`: solo `https://claude.ai/*`, `http://localhost:*`, `http://127.0.0.1:*`.
- Persistencia sin TTL, columna `disabled` para revocar manualmente.

- [ ] E1 — `lib/oauth-db.ts`: añadir columna `disabled` (idempotent ALTER), `generateClientId()`, `createClient()`. Tests primero.
- [ ] E2 — `app/register/route.ts`: implementar DCR (POST + OPTIONS CORS). Tests primero.
- [ ] E3 — Build, deploy, verificar en producción con curl. Después seguir con D3.

### Cambios sin commitear (preexistentes, no relacionados con el plan)

```
M docs/mcp-changelog.md
M docs/mcp-examples.md
M docs/mcp-usage.md
M public/build-report-advanced.json
```

Estos venían de antes. Decisión tomada en el plan: la Task C2 los integra junto con las entradas nuevas de `posts_rebuild` y `skip_rebuild`. **No tocarlos antes de C2.**
