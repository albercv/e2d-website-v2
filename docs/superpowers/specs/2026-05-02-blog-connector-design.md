# Blog Connector — Diseño

**Fecha**: 2026-05-02
**Autor**: Alberto Carrasco (con Claude Code)
**Rama**: `feature/blogConnector`
**Estado**: Aprobado — pendiente de plan de implementación

---

## Objetivo

Permitir que Alberto, desde **Claude.ai web (Max)** con un Custom Connector, redacte un post en chat y, tras revisar las traducciones inline, dé una orden de "publica" que produzca tres posts (es/en/it) en el blog de evolve2digital.com y dispare un rebuild para que aparezcan en la web.

## Contexto

El proyecto ya tiene operativo un servidor MCP completo con OAuth 2.1 + PKCE en producción (`https://evolve2digital.com`), con cinco tools relacionados con posts: `posts.schema`, `posts.search`, `posts.get`, `posts.create`, `posts.delete`. El blog usa Contentlayer/MDX con ficheros en `content/posts/` y locales `es | en | it`.

Lo que **falta** para cubrir el objetivo:

1. **Orquestación multi-idioma sin disparar 3 rebuilds.** El `posts.create` actual dispara un rebuild opcional cuando `AUTO_REBUILD_AFTER_MCP_CHANGE=true`. Con tres llamadas se dispararían tres builds en paralelo.
2. **Una tool MCP que dispare el rebuild explícitamente** desde Claude.ai cuando termine la secuencia de creates.
3. **Configurar las variables de entorno** en el servidor para que el flujo de rebuild esté activo (`AUTO_REBUILD_AFTER_MCP_CHANGE`, `ADMIN_REBUILD_URL`, `RESTART_COMMAND`).

## Fuera de alcance

- Subida de imágenes (`cover`) — Claude.ai web no permite subir ficheros al connector.
- Vínculo cross-locale entre las 3 versiones del mismo post (botón "ver en otro idioma").
- Polling de estado del build (`posts.rebuild_status`) — solo si la opacidad se vuelve un dolor real.
- Mejora del escapado YAML del frontmatter en `posts.create` (limitación preexistente, no introducida aquí).
- Calidad de traducción — responsabilidad de Claude.ai, no del sistema.

## UX (modo confirmación en chat)

```
1. Usuario en Claude.ai:    "Hazme un post sobre X"
2. Claude:                   redacta el post en es (en chat)
3. Usuario:                  "perfecto, publícalo en es/en/it"
4. Claude:                   traduce en + it y muestra los 3 inline
5. Usuario revisa:           "ok publica"
6. Claude → posts.create     ×3 con skip_rebuild=true (es, en, it)
7. Claude → posts.rebuild    ×1 (sin body)
8. Claude al usuario:        "Hecho. URLs … Tarda 1-3 min en estar visible"
9. ~2 min después:           build termina, pm2 reinicia, las 3 URLs sirven 200
```

## Arquitectura

```
┌───────────────────────┐  HTTPS  ┌──────────────────────────────────────────┐
│  Claude.ai web (Max)  │ ──────▶ │   evolve2digital.com  (VPS 76.13.62.189) │
│                       │  443    │                                          │
│  Custom Connector     │         │   nginx (Let's Encrypt) ─▶ Next.js :3003 │
│  → MCP server         │  OAuth  │                                          │
│  → token              │ ◀─────▶ │   Tools MCP:                             │
│    scope posts:write  │         │     posts.schema / search / get / delete │
│                       │         │     posts.create  (+ skip_rebuild)       │
│  Orquesta:            │         │     posts.rebuild  (NUEVA)               │
│   create×3 + rebuild  │         │                                          │
│                       │         │   Rebuild → /api/admin/rebuild           │
│                       │         │   → scripts/rebuild-and-restart.js       │
│                       │         │   → npm run build → pm2 restart e2d      │
└───────────────────────┘         └──────────────────────────────────────────┘
```

## Decisiones de diseño

1. **3 llamadas a `posts.create` + 1 llamada a `posts.rebuild`** en vez de una tool monolítica.
   - Reutiliza la tool existente sin duplicar lógica.
   - Atomicidad estricta no aporta valor en un blog de un autor: si una traducción falla por colisión, prefieres ver el error y reintentar esa una.
   - Un solo rebuild al final.

2. **Parámetro nuevo `skip_rebuild` en `posts.create`** (default `false`) para que las 3 primeras llamadas no disparen rebuild. Sin esto, o haces 3 rebuilds o desactivas globalmente `AUTO_REBUILD_AFTER_MCP_CHANGE` y pierdes el comportamiento por defecto.

3. **`posts.rebuild` como tool MCP nueva**, protegida con scope `posts:write` (mismo que create). Internamente hace `POST` a `/api/admin/rebuild` con `Authorization: Bearer ${E2D_MCP_API_KEY}` y `body:{noRestart:false}`. Devuelve 200 inmediato — no espera al build.

4. **No-rollback ante fallo parcial.** Si 2 de 3 creates tienen éxito y el tercero falla, los dos buenos se quedan en disco. El blog ya tiene posts que existen solo en algunos idiomas, así que el estado es válido. Claude reporta el fallo y ofrece reintentar el que faltó.

5. **Idempotencia por slug+locale.** Reintentar la misma operación es seguro: o crea (201) o devuelve 409 con `{slug, locale}`. Claude trata el 409 como "ya hecho, sigo".

6. **Rebuild fire-and-forget (v1).** No esperamos a que `pm2 restart e2d` complete porque el restart mata la conexión HTTP. Si el build falla, no se notifica automáticamente; mitigación operacional vía `build.log` y `pm2 logs e2d`.

## Componentes

### Modificar

**`app/api/mcp/tools/posts/create/route.ts`** (~5 líneas):
- Leer `payloadObj.skip_rebuild === true` del body.
- En el bloque de auto-rebuild (líneas ~172-186 actuales), saltarlo si `skip_rebuild` es `true`.
- Sin cambios en validación, slug, ni respuesta.

**`app/api/mcp/manifest/route.ts`** (~25 líneas):
- En `input_schema` de `posts.create`, añadir `skip_rebuild: { type: 'boolean', default: false, description: '...' }`.
- Añadir entrada nueva `posts.rebuild` con auth `oauth2` scope `posts:write`, `method: 'POST'`, `endpoint: …/api/mcp/tools/posts/rebuild`, `rateLimit: { requests: 3, window: '1m' }`.

### Crear

**`app/api/mcp/tools/posts/rebuild/route.ts`** (~120 líneas):
- Patrón idéntico a `posts.create`: CORS, OPTIONS, OAuth `posts:write`, rate-limit, `mcpLogger`, `respondAsMcpOrJson` / `respondErrorAsMcpOrJson`.
- POST sin body (o body `{}` ignorado).
- `fetch(process.env.ADMIN_REBUILD_URL, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':\`Bearer \${process.env.E2D_MCP_API_KEY}\` }, body: JSON.stringify({ noRestart:false }) })`.
- Si falta `E2D_MCP_API_KEY` o `ADMIN_REBUILD_URL` en el entorno → 500 con mensaje claro.
- Si admin endpoint devuelve 5xx → 502 propagando el error.
- Happy path → 200 `{ rebuilding:true, started_at:ISO, processingTime:ms }`.

**`__tests__/api/mcp-posts-rebuild.test.ts`** (~80 líneas) — ver tabla en sección de tests.

### Configurar (servidor, no commit)

`/root/e2dProject/e2d-website-v2/.env`:
```
AUTO_REBUILD_AFTER_MCP_CHANGE=true
ADMIN_REBUILD_URL=https://evolve2digital.com/api/admin/rebuild
RESTART_COMMAND=pm2 restart e2d
```

Las 3 ya las consume el código existente (`posts/create/route.ts`, `admin/rebuild/route.ts`, `scripts/rebuild-and-restart.js`). `E2D_MCP_API_KEY` ya está en `.env`.

### NO se toca

- `contentlayer.config.ts` (schema actual ya soporta el caso).
- Sistema OAuth (ya funciona, mergeado en `mcpIntegration2`).
- Estructura de `content/`.
- nginx, SSL, DNS.

## Manejo de errores

| Fallo | Estado tras el fallo | Comportamiento |
|---|---|---|
| 401/403 OAuth | Nada escrito | Connector reautentica; si no, usuario reconecta |
| 400 validación (title/content/locale) | Nada escrito | Claude reporta campo problemático |
| 409 slug colisión | Esa locale no se escribe | Claude muestra conflicto; usuario decide (cambiar título / borrar viejo / saltar locale). No reintento automático |
| 1 de 3 creates falla | 2 ficheros en disco, 1 no | No-rollback. Claude reporta y ofrece reintentar solo el que falló |
| 500 disk write | Nada de esa locale | Igual que el anterior |
| `posts.rebuild` 5xx | 3 MDX en disco, build no disparado | Claude reporta "creados pero rebuild falló — `pm2 restart e2d` manual o reintenta `posts.rebuild`" |
| `npm run build` falla async | 3 MDX en disco, sitio sigue con build vieja | No detectado por v1; verificación manual vía `build.log` |
| Rate limit 429 | Nada esa llamada | Claude respeta `Retry-After` |
| Conector pierde sesión mid-flow | Posibles ficheros parciales | Reintentar es seguro: 409 marca los completos, los faltantes se crean |

## Tests

### Unit / Integration (Jest, cobertura ≥85% en código nuevo/modificado)

**`__tests__/api/mcp-posts-rebuild.test.ts`** (nuevo, sigue convención de los hermanos `mcp-posts-create.test.ts`, `mcp-posts-delete.test.ts`):
- 401 sin token OAuth.
- 403 con token sin `posts:write`.
- 500 si `E2D_MCP_API_KEY` no seteado.
- 502 si admin endpoint devuelve 5xx.
- 200 happy path: response shape correcto y `fetch` mock invocado con headers y body esperados.
- 429 al superar rate-limit (3/min).
- `mcpLogger.logToolInvocation` invocado en cada caso.

**`__tests__/api/mcp-posts-create.test.ts`** (extender el existente):
- `skip_rebuild:true` con `AUTO_REBUILD_AFTER_MCP_CHANGE=true` → 201 + **no** fetch a `ADMIN_REBUILD_URL`.
- `skip_rebuild:false` o ausente → comportamiento actual preservado.
- `skip_rebuild:"true"` (string) → tratado como `false` (solo `=== true`).

**`__tests__/api/mcp-manifest.test.ts`** (nuevo, no existe aún):
- `posts.rebuild` presente con `auth.scopes:['posts:write']`.
- `posts.create.input_schema.properties.skip_rebuild` declarado.

### Verificación E2E manual (en producción)

**Fase 1 — sanity**:
```
curl -sS https://evolve2digital.com/.well-known/oauth-authorization-server | jq .
curl -sS https://evolve2digital.com/.well-known/oauth-protected-resource | jq .
curl -sS https://evolve2digital.com/api/mcp/manifest | jq '.tools | keys'
# debe incluir "posts.rebuild"
```

**Fase 2 — OAuth manual** (`scripts/test-mcp-oauth.sh`, no commit):
1. PKCE authorize → login admin → callback.
2. Token exchange → `access_token` con `posts:write`.
3. POST `/api/mcp/tools/posts/create` con post de prueba (`skip_rebuild:true`) → 201.
4. POST `/api/mcp/tools/posts/delete` → cleanup.

Si pasa, problema en Claude.ai (si lo hay) será de UX/conector, no del backend.

**Fase 3 — Claude.ai web**:
1. Settings → Connectors → Add Custom Connector → URL del MCP.
2. Autorizar con admin → consent → vuelta.
3. "Lista las tools del conector e2d" → debe ver create, search, get, delete, schema, **rebuild**.
4. Smoke test: pedir post de prueba en es/en/it con título identificable (`"MCP smoke test 2026-05-02"`).
5. Tras "ok publica":
   - Logs MCP (`tail -f logs/mcp-*.log`) muestran 3 `posts.create` con `skip_rebuild:true`.
   - Logs muestran 1 `posts.rebuild`.
   - `tail -f build.log` muestra build arrancando.
   - `pm2 logs e2d --lines 50` muestra restart limpio.
6. Tras 2-3 min: `curl -sI https://evolve2digital.com/{es,en,it}/blog/mcp-smoke-test-2026-05-02` → 200.
7. Cleanup: pedir a Claude `posts.delete` para los 3.

**Fase 4 — fallo controlado**:
- Pedir a Claude crear post con título idéntico a uno existente → 409 → Claude lo reporta legible en chat.

## Documentación

Sumar a los cambios sin commitear (`docs/mcp-changelog.md`, `docs/mcp-usage.md`, `docs/mcp-examples.md`):

- **`mcp-usage.md`**: sección "Flujo multi-idioma desde Claude.ai" + uso de `skip_rebuild` y `posts.rebuild`.
- **`mcp-examples.md`**: ejemplo concreto de los 4 calls en orden.
- **`mcp-changelog.md`**: entrada `2026-05-02`: `posts.rebuild` (nuevo) + `posts.create.skip_rebuild` (nuevo).

`scripts/generate-mcp-docs.js` ya existe; si genera docs automáticamente desde el manifest, parte se actualizará al ejecutarlo.

## Definición de "hecho"

- [ ] Tests verdes con cobertura ≥85% en código nuevo/modificado.
- [ ] `https://evolve2digital.com/api/mcp/manifest` lista `posts.rebuild`.
- [ ] Smoke test desde Claude.ai web crea 3 posts visibles en `/{es,en,it}/blog/...`.
- [ ] Caso 409 reportado de forma comprensible en chat.
- [ ] Docs MCP actualizados.
- [ ] `tasks/lessons.md` con cualquier patrón aprendido durante la verificación.

## Limitaciones aceptadas

- Frontmatter escaping frágil en `posts.create` (preexistente).
- Build async opaco — sin polling de estado en v1.
- Cover image gestionado a mano por el autor tras la creación.
- Sin vínculo cross-locale; cada post es independiente.
