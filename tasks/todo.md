# Tarea Activa

## Bugs abiertos — feature/mcpblog-images (post deploy 2026-05-05)

### BUG-4 — Cerrar la migración contentlayer→runtime y dejar `posts_rebuild` sin uso operativo

**Objetivo:** que el flujo diario (crear/editar/borrar posts + subir media) NO necesite rebuild. Los rebuilds quedarían reservados para SEO nocturno automático (cron) o cambios de código MCP (deploy humano).

**Contexto / por qué hoy se necesita rebuild:**
- La migración contentlayer→runtime cubrió el render del post (`lib/blog/posts-runtime.ts` lee `.mdx` en cada request) pero **NO** los generadores de SEO.
- `lib/sitemap-generator.ts:13` sigue importando `allPosts` desde `.contentlayer/generated/index.mjs` (build-time).
- `public/sitemap.xml` y `public/rss-{es,en,it}.xml` existen como ficheros estáticos, generados por `scripts/build-ai-indexing-advanced.js`. Como Next.js sirve `public/` antes que las routes dinámicas, `app/sitemap.ts` está sombreado y nunca se ejecuta en producción.
- Resultado: cada vez que aparece o cambia un post, sitemap/RSS quedan stale hasta el siguiente `npm run build` — y por eso `posts_rebuild` sigue siendo necesario en el flujo diario.

**Plan de resolución (4 cambios, ~2-3h con tests):**

1. **Refactor `lib/sitemap-generator.ts`:**
   - Reemplazar `import { allPosts } from '.contentlayer/...'` por `await listPostsFromDisk()` desde `lib/blog/posts-runtime.ts`.
   - Adaptar el shape del objeto post (los campos que use `allPosts` que no estén en `RuntimePost` se mapean o se omiten).
   - Tests: `__tests__/lib/sitemap-generator.test.ts` con un fixture en disco vía `CONTENT_ROOT` tmp dir, asserting que el sitemap incluye el post recién creado sin pasar por contentlayer.
   - Verificar que la función ya NO sea sync (al pasar a `listPostsFromDisk` se vuelve async). Esto obliga a cambiar `app/sitemap.ts` para `export default async function sitemap()`. Compatible con Next 14.

2. **Hacer lo mismo con RSS:**
   - Localizar el generador RSS (probablemente en `scripts/build-ai-indexing-advanced.js` o un módulo similar).
   - Crear `app/feed/[locale]/route.ts` que genere XML al vuelo: lee `listPostsFromDisk()`, filtra por locale, devuelve `Content-Type: application/rss+xml`.
   - Tests para los tres locales con fixture de posts.

3. **Borrar los static que sombrean las routes dinámicas:**
   - Eliminar `public/sitemap.xml`, `public/rss-es.xml`, `public/rss-en.xml`, `public/rss-it.xml`.
   - Añadir esos paths al `.gitignore` (algunos ya están). Garantizar que `scripts/build-ai-indexing-advanced.js` deje de generarlos.
   - Resto de `public/build-report-advanced.json`: ese sí se mantiene como build artifact, ignorado.

4. **Limpiar `scripts/build-ai-indexing-advanced.js`:**
   - Quitar las funciones que regeneran sitemap/RSS.
   - Mantener solo la regeneración de `docs/mcp-*.md` (esos dependen del código del handler MCP, no del contenido).
   - Renombrar el script si pierde casi toda su lógica de "indexing" (a evaluar).

**Tras esos cambios:**
- `posts_create` / `posts_update_body` / `posts_delete` / subidas de media → cero rebuild necesario, todo es runtime.
- `posts_rebuild` queda como pure escape hatch para regenerar `docs/mcp-*.md` tras un cambio de código MCP — el LLM no debería invocarlo nunca.
- Considerar **retirar `posts_rebuild` del `tools/list` MCP** después del refactor (la ruta REST `/api/admin/rebuild` se queda para uso interno o cron).

**Cron nocturno para SEO (opcional, post-refactor):**
- Si tras la migración hay índices/reportes que no son del request path pero sí útiles (p.ej. un report de SEO score), hacer un cron a las 03:00 UTC que dispare `npm run build:ai-indexing:advanced` solo para regenerar `docs/mcp-*.md` y `public/build-report-advanced.json`.
- NO meter `next build` en el cron — el código solo se rebuildea en deploy humano.

**Severidad:** alta a medio plazo, baja a corto. Hoy el rebuild "funciona" pero contamina logs, gasta CPU, induce a Claude.ai a llamadas redundantes y mantiene viva una dependencia (contentlayer) que se suponía retirada.

**Owner / siguiente paso:** decisión del usuario sobre cuándo abordarlo. Cuando se aborde, abrir rama `feature/runtime-sitemap-rss` desde `develop` y aplicar los 4 cambios encadenados con TDD.

---

### BUG-1 — La form `/admin/media-upload` no permite marcar una imagen como cover/hero
- **Síntoma:** el usuario sube imágenes pero no encuentra dónde decir "esta es la portada del post". Tiene que volver al chat de Claude y decirlo a mano (o editar el .mdx manualmente).
- **Causa:** la spec/plan de F1 solo definió Name/Alt/Caption por fila; no hay un radio/checkbox "Use as cover" ni un selector único en la batch. El campo `cover` vive solo en el frontmatter del post (lo escribe `posts_create` o, hoy, edición manual).
- **Workaround temporal:** el cover se está añadiendo a mano al frontmatter (`cover: ferdy_hero` en `de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy.mdx`).
- **Propuestas:**
  1. Añadir un radio "Cover" exclusivo a `MediaUploadForm.tsx` que se incluye en el body del commit. Extender `/api/admin/media/upload/commit` y `_meta.json` con un campo opcional `cover: <name>` por translationKey, o devolverlo al cliente para que el cliente llame además a un nuevo `posts_set_cover` MCP tool.
  2. Más simple: tras el commit, mostrar al usuario un bloque copiable estilo `posts_update_body({...})` o `cover: <name>` que pueda pegar en el chat para que Claude lo aplique.
- **Severidad:** UX, no bloqueante. El flujo funciona end-to-end pasando por el LLM.

### BUG-2 — Vídeos > 10 MB rechazados por nginx con 413
- **Síntoma:** subidas de vídeo desde la form fallan / no se ven en producción.
- **Causa:** `/etc/nginx/sites-available/evolve2digital` tiene `client_max_body_size 10M;`. La spec exige 1100M y `proxy_request_buffering off;` para streaming.
- **Acción:** editar el server block de evolve2digital, recargar nginx (`nginx -t && systemctl reload nginx`). NO requiere redeploy del Next.

### BUG-3 — Uploads aceptados (HTTP 200) pero invisibles: arquitectura de storage incompatible con Next standalone

**Estado:** causa raíz identificada (forensics 2026-05-05 16:30 UTC). Pendiente de implementar fix.

**Síntoma:** logs nginx muestran `POST /api/admin/media/upload → 200` y `POST /api/admin/media/upload/commit → 200` el 2026-05-05 12:38 y 12:44, pero ningún fichero aparece en `/root/e2dProject/e2d-website-v2/public/uploads/` y la URL `/uploads/<key>/<name>.<ext>` da 404.

**Causa raíz (dos problemas encadenados):**

1. **El standalone server NO sirve el `public/` del repo.** PM2 ejecuta `node .next/standalone/server.js`. Ese server solo sirve estáticos desde `.next/standalone/public/`, NO desde `/root/e2dProject/e2d-website-v2/public/`. Aunque hoy `process.cwd()` apunta al root del proyecto, `scripts/sync-static-files.js` copia `public/` → `.next/standalone/public/` solo en build-time. Cualquier upload posterior a un build queda fuera del path servido.

2. **Cada `next build` purga `.next/standalone/`.** La evidencia: el `mtime` del `public/` fuente es `May 4 21:10` — anterior al primer upload (12:38), prueba de que el write nunca tocó el `public/` fuente. Probablemente el `process.cwd()` del PM2 al momento del upload era `.next/standalone/` (PM2 cachea cwd del primer spawn y `pm2 restart` sin `--update-env` no lo refresca; el log 12:51 muestra explícitamente el aviso `Use --update-env to update environment variables`). Los binarios aterrizaron en `.next/standalone/public/uploads/<key>/`. El `npm run build` lanzado por el `posts_rebuild` 13 minutos después limpió `.next/standalone/` y los borró. Desde entonces ha habido 60+ rebuilds más.

**Por qué el route devuelve 200:** `saveMediaFile` ejecuta `pipeline(stream, transform, createWriteStream(path))` y el path resuelve, mkdir-p funciona, write succeed. Devuelve éxito honestamente. El bug no está en el route handler; está en que el path resuelto es volátil.

**Plan de fix (3 cambios encadenados, ~1h con tests):**

1. **Crear directorio persistente fuera de `.next/`:**
   ```bash
   sudo mkdir -p /var/lib/e2d-uploads
   sudo chown $(whoami):$(whoami) /var/lib/e2d-uploads
   ```
   (O un path equivalente fuera del repo. NO usar `public/` del repo — es vulnerable a sync-static-files.)

2. **Pin `MEDIA_UPLOADS_ROOT` en `.env`:**
   ```
   MEDIA_UPLOADS_ROOT=/var/lib/e2d-uploads
   ```
   Esto fija el path absoluto y aísla del cwd. Tras esto, `pm2 restart e2d --update-env` para que PM2 cargue la variable.

3. **Servir los uploads sin pasar por el `public/` del standalone.** Tres opciones, en orden de preferencia:
   - **(a) nginx alias (cleanest):** añadir al server block:
     ```nginx
     location /uploads/ {
       alias /var/lib/e2d-uploads/;
       try_files $uri =404;
       expires 30d;
       add_header Cache-Control "public, immutable";
     }
     ```
     Bypass total de Next.js para estáticos. Más rápido, sin riesgo. **Recomendada.**
   - **(b) Symlink en post-build:** modificar `scripts/sync-static-files.js` para que tras copiar `public/` haga `ln -sfn /var/lib/e2d-uploads .next/standalone/public/uploads`. Requiere que el sync corra en cada build (ya lo hace).
   - **(c) Route dinámica de Next:** crear `app/uploads/[key]/[name]/route.ts` que stream-ee el fichero desde `MEDIA_UPLOADS_ROOT`. Funciona pero peor performance que (a) y mete a Node en el camino crítico de servir media.

**Experimento de confirmación (si quieres certeza 100% antes del fix):**
```bash
# 1. Pedir token con posts_request_upload desde Claude.ai
# 2. Subir un fichero diminuto:
curl -s -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: image/png" -H "X-Media-Name: probe_$(date +%s)" \
  --data-binary @/tmp/1px.png \
  https://evolve2digital.com/api/admin/media/upload
# 3. Inmediatamente, sin rebuild:
find /root/e2dProject/e2d-website-v2 -name "probe_*.png" 2>/dev/null
# 4. Si aparece bajo .next/standalone/public/uploads/, hipótesis confirmada.
```

**Severidad:** crítica — feature media inutilizable hasta resolver. Ninguno de los uploads del usuario se preservan tras el primer rebuild.

**Owner / siguiente paso:** humano. La opción (a) es la recomendada — un cambio en nginx config, un `mkdir`, una línea en `.env`, `pm2 restart e2d --update-env`. Sin código nuevo.

---

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
