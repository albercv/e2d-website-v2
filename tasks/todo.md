# Tarea Activa

## Bugs cerrados (2026-05-05)

- **BUG-1** — cover selector en form. Cerrado en commit `d15dc4c`. `_meta.json` gana campo opcional top-level `cover`; form añade radio "Use as cover" por fila image; `posts_list_media` y `posts_request_upload` exponen el cover actual al LLM.
- **BUG-2** — nginx upload limits (10M → 1100M + proxy_request_buffering off). Cerrado vía edits de `/etc/nginx/sites-available/evolve2digital` + reload.
- **BUG-3** — uploads invisibles tras build. Cerrado vía `MEDIA_UPLOADS_ROOT` pinned en `ecosystem.config.js` + nginx alias `location /uploads/` + `pm2 delete && pm2 start`.
- **BUG-4** — cerrar migración contentlayer→runtime para sitemap/RSS. Cerrado en commit `355f2cf`. `lib/sitemap-generator.ts` ahora consume `listPostsFromDisk()`, nuevo `app/feed/[locale]/route.ts` dinámico, eliminados los XML estáticos en `public/`.
- **BUG-5** — `posts_validate` no comprobaba existencia física. Cerrado en commit `538e4a6`. `ValidationResult` gana `missingBinaries`, `ok` ahora false si falta cualquier binario referenciado.
- **BUG-7** — posts en path incompatible con runtime reader. Cerrado vía `CONTENT_ROOT=/root/e2dProject/e2d-website-v2` en `ecosystem.config.js` + restauración de los 12 originales en `content/` (walkMdx recursivo los recoge desde ahí + `content/posts/`).
- **BUG-8** — `resolvePostCovers` rompía URLs absolutas legacy. Cerrado en commit `33a1def`. Passthrough en regex `/^(https?:)?\/\//` y prefijo `/`.
- **BUG-6** — `sync-static-files.js` copiaba `_next/static` a `public/_next/static/` (intercepted por runtime → 404). Cerrado: `targetDir` ahora apunta a `.next/standalone/.next/static/` (el `distDir/static` que sirve el standalone). Workaround manual ya no necesario; entrada de memoria del proyecto eliminada.
- **BUG-10** — Logout admin redirigía a `https://localhost:3003/es` porque `req.url` no incluye host real (PM2 detrás de nginx con `trustHostHeader=false`). Cerrado: nuevo helper `getPublicBaseUrl(req)` con prioridad `NEXT_PUBLIC_BASE_URL` > headers proxy `X-Forwarded-Host/Proto` > `req.url`. Verificado: redirect ahora apunta a `https://evolve2digital.com/es`.
- **BUG-14** — `posts_create` reporta éxito pero `posts_get` devuelve 404. Cerrado en commit pendiente.
  - **Síntoma**: tras BUG-13 (BLOG_POSTS_DIR + symlink), `posts_create` escribe correctamente a `/var/lib/e2d-content/posts/<slug>.mdx`, devuelve `{created: true}`, pero `posts_get` y `posts_search` no encuentran el post. Reproducible 100% en MCP live.
  - **Root cause**: `walkMdx` en `lib/blog/posts-runtime.ts` solo recursaba si `Dirent.isDirectory() === true`. Para un symlink a directorio, Node devuelve `isDirectory() = false` y `isSymbolicLink() = true`. El subárbol bajo `content/posts -> /var/lib/e2d-content/posts` quedaba invisible para `listPostsFromDisk()`. Contentlayer (build-time, scanner propio) sí seguía el symlink, así que blog estático funcionaba — pero el runtime MCP no veía nada.
  - **Fix**: `walkMdx` añade rama `else if (entry.isSymbolicLink())` que hace `fs.stat(full)` (resuelve el symlink) y recursa si es directorio o lo añade si es `.mdx`. Tests de regresión en `__tests__/lib/posts-runtime.test.ts` ("recurses into a symlinked subdir of content/").
  - **Verificación**: canary `.mdx` con `published: true` en `/var/lib/e2d-content/posts/` → `curl /feed/es` (route dinámico que usa `listPostsFromDisk` en cada request) → canary aparece en el output. Pre-fix devolvía 4 posts, post-fix 5.
  - **Lección**: `Dirent.isDirectory()` NO sigue symlinks. Cualquier `walk*` que use `withFileTypes: true` debe añadir explícitamente la rama symlink → `fs.stat` + recurso. Aplicable a `lib/blog/media-meta.ts` y futuros walkers que vayan a interactuar con paths externos.

- **BUG-15 (closed 2026-05-06)** — Posts desaparecen de `/var/lib/e2d-content/posts/` sin entrada en audit log.
  - **Síntoma**: en sesiones de 2026-05-05 y 2026-05-06 desaparecen canary y posts reales (Ferdy, canary-bug-15-v2). El audit log solo registra los `posts_delete` MCP legítimos. No reproducible vía build aislado.
  - **Diagnóstico**: instalado watchdog `inotifywait` sobre `/var/lib/e2d-content/posts/` (PM2 process `posts-watchdog`, captura snapshots con `ps auxf` por evento DELETE). Tras la primera ejecución de `npx jest --testPathPatterns="..."` la snapshot identificó al culpable: pid de Jest creando y borrando archivos `.mdx` con nombres = slugs de tests (`titulo-valido`, `post-de-prueba-mcp-test`, `skip-rebuild-true`...).
  - **Root cause**: `__tests__/api/mcp-posts-create.test.ts:73` resolvía `postsDir = path.resolve(process.cwd(), 'content', 'posts')`. En el repo principal `content/posts` es un **symlink a `/var/lib/e2d-content/posts/`** (BUG-13). El `afterEach` (líneas 91-99) hacía `fs.readdirSync(postsDir)` + `fs.unlinkSync` por cada `.mdx` encontrado — borraba los del test Y los preexistentes (Ferdy, canaries, etc.) sin pasar por `deletePost`, así que sin audit. El subagente en worktree NO destruía nada porque los worktrees tienen su propio `content/posts/` real (gitignored, no symlink).
  - **Fix**:
    - `__tests__/api/mcp-posts-create.test.ts`: `postsDir` ahora es `fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-create-'))` y se setea `process.env.BLOG_POSTS_DIR = postsDir` en `beforeAll`. `afterAll` hace `fs.rmSync(postsDir, { recursive: true })`. Dir aislado, sin contacto con `/var/lib/`.
    - `jest.config.js` y `jest.config.api.js`: añadido `testPathIgnorePatterns: ['/node_modules/', '/.claude/worktrees/', '/.next/']` para que jest no descubra tests de worktrees viejos que aún tienen el antipatrón.
    - Watchdog `posts-fs-watchdog.sh` + PM2 process `posts-watchdog` queda permanente como red de seguridad. Loguea a `logs/fs-watchdog.log` + snapshots en `logs/fs-watchdog-snapshots/`.
  - **Verificación**: tras el fix, `npx jest __tests__/api/mcp-posts-create.test.ts` pasa (17/18, el 1 fallo era del worktree y ya no aparece tras el ignore patterns) y el watchdog NO registra ningún evento sobre `/var/lib/e2d-content/posts/` durante el run.
  - **Lección**: ver `tasks/lessons.md` — "tests con `readdirSync + unlinkSync` sobre `content/posts` cuando ese path es symlink a producción".

- **BUG-13** — Posts desaparecidos tras build (segunda iteración). Cerrado en commit pendiente.
  - **Síntoma**: el usuario reporta "el post de ferdy desaparece cada vez que hacemos build". El audit log (forense de BUG-11) registra UN solo `posts_delete` esta noche (21:48:22). El post se evapora en el siguiente build.
  - **Root cause 1 — duplicación de paths con bug de cwd**: `app/api/mcp/tools/posts/create/route.ts:145` usaba `path.resolve(process.cwd(), 'content', 'posts')`. Bajo PM2 standalone `process.cwd()` = `.next/standalone/`, así que la ruta REST escribía en `.next/standalone/content/posts/<slug>.mdx`, dir que `next build` regenera en cada rebuild → posts borrados. La ruta MCP JSON-RPC (`lib/blog/posts-write.ts`) usaba `getContentRoot()` (CONTENT_ROOT) y funcionaba bien. Bug latente desde BUG-7 (donde se introdujo CONTENT_ROOT solo en el lib, no en el route handler).
  - **Root cause 2 — content/posts en árbol gitignored**: incluso con CONTENT_ROOT corregido, `content/posts/` vive dentro del repo gitignored. Vulnerable a `git clean -fdx`, deploy desde otra máquina, snapshot, o cualquier reset agresivo. Sin git history y sin backup, cualquier delete (intencional o servicial del LLM tipo BUG-12) es irrecuperable.
  - **Fix**:
    - Nueva env var `BLOG_POSTS_DIR=/var/lib/e2d-content/posts` en `.env` (raíz + `.next/standalone/.env`). Helper `getPostsDir()` exportado desde `lib/blog/posts-write.ts` con fallback a `${CONTENT_ROOT}/content/posts` (mantiene tests/dev sin tocar).
    - `app/api/mcp/tools/posts/create/route.ts:145` ahora importa y usa `getPostsDir()` — los dos endpoints aterrizan en el mismo dir físico.
    - `content/posts/` reemplazado por symlink → `/var/lib/e2d-content/posts` para que Contentlayer (build-time) y `posts-runtime` (fs walk) lo vean como subdir de `./content` sin tocar su config.
    - `jest.setup.js`: `delete process.env.BLOG_POSTS_DIR` para que tests con CONTENT_ROOT en tmpDir no se vean atrapados por la env de producción.
    - Test de regresión `posts-write.test.ts`: "escribe a BLOG_POSTS_DIR cuando está seteado, ignorando CONTENT_ROOT".
  - **Verificación**: canary post escrito a `/var/lib/e2d-content/posts/canary-persistence-*.mdx` → `npm run build` → "Generated 13 documents in .contentlayer" (12 legacy + 1 canary, antes era 12) → fichero sigue en disco tras el build → contentlayer cache contiene `posts__canary-...mdx.json`. Suite jest 314/314 verde.
  - **Tarea pendiente** (no bloqueante): backup periódico (cron + rsync) de `/var/lib/e2d-content/posts/` a otro path/host. Sin él, un delete sigue siendo irrecuperable; con él, recuperable hasta el último snapshot.
  - **Lección**: cualquier path de escritura debe pasar por un helper `getXxxDir()` que centralice la resolución. La duplicación entre lib y route handler ocultó este bug durante meses (BUG-7 fue parche parcial). Aplicar misma regla a `MEDIA_UPLOADS_ROOT` y futuros stores.

- **BUG-11** — `npm run build` sin lock: builds solapados rompían el sitio. Cerrado:
  - `app/api/admin/rebuild/route.ts` lee `.build.lock` antes de spawn-ear; si existe (con TTL 30 min de stale-recovery), devuelve 409 Conflict con `{ inProgress, lock, ageSeconds }`. Crea el lock con `{ jobId, startedAt, buildCommand }`.
  - `scripts/rebuild-and-restart.js` borra el lock al final (success o error) + handlers SIGTERM/SIGINT que también lo liberan.
  - El cron `regenerate-seo` NO se solapa con builds porque `npm run seo:regenerate` solo corre `build-ai-indexing-advanced.js` (regenera docs/MCP + report), no `next build`. El solapamiento real venía de `posts_rebuild` MCP rápidos consecutivos del LLM. Cubierto por el lock.
  - Adicional: `lib/blog/posts-write.ts:deletePost` añade audit log a `logs/posts-audit.log` (timestamp, slug, locale, translationKey, cwd, pid). Forense para próximas desapariciones — verificado empíricamente que un build NO borra `content/posts/` (canary survived a `npm run build` directo Y a `posts_rebuild` MCP completo). El destructor es otro: el audit nos dirá cuál la próxima vez.

## Bugs abiertos — feature/mcpblog-images (post deploy 2026-05-05)

### TASK — Catálogo MDX para que Claude.ai escriba posts visualmente trabajados

**Contexto:** los posts generados por Claude.ai vía `posts_create` / `posts_update_body` salen como prosa plana sin elementos destacables. Tras el fix tipográfico básico (commit pendiente), el problema persiste a nivel de contenido: Claude no usa los componentes ricos disponibles en MDX.

**Componentes MDX existentes hoy** (`components/blog/mdx-components.tsx`):
- `<ProsCons pros={[...]} cons={[...]} />` — dos columnas verde/rojo.
- `<Callout type="info|warning|success|error" title="...">...</Callout>` — Alert con icono.
- `<CTAInline text="..." href="..." />` — bloque de llamada a acción brand teal.
- `<CodeBlock language="...">...</CodeBlock>` — bloque de código con label.
- `<Lead>...</Lead>` — primer párrafo destacado (recién añadido).
- `<PullQuote author="...">...</PullQuote>` — cita editorial grande con barra teal.
- `<Figure src="..." alt="..." caption="..." />` — imagen + leyenda centrada.
- `<Stat value="40%" label="aumento de leads" />` — KPI tipo dashboard.
- `[image:slug]` y `[video:slug]` — markers que se expanden a media de `_meta.json`.

**Plan**:

1. **Auditar el catálogo** — ¿qué falta? Candidatos:
   - `<Timeline items={[...]} />` para casos de éxito ordenados temporalmente.
   - `<ComparisonTable headers={[]} rows={[[]]} />` para comparativas.
   - `<TLDR>...</TLDR>` resumen ejecutivo arriba del post.
   - `<Steps>...</Steps>` para procesos numerados con visual.
   - `<Highlight>...</Highlight>` para frases clave inline (tipo marcador).

2. **Documentar el catálogo en formato consumible por LLM** — generar un `docs/mdx-catalogue.md` con:
   - Cada componente, su signatura JSX exacta, ejemplo mínimo y ejemplo de uso real.
   - Reglas de cuándo usar uno vs. otro (Callout vs. PullQuote, etc.).
   - Anti-patrones (nunca dos PullQuote seguidas, etc.).

3. **Exponer el catálogo vía MCP**: nuevo tool `posts_mdx_catalogue` que devuelve el documento. Claude.ai lo consulta antes de generar contenido. O bien, incluir un resumen del catálogo en `instructions` del `initialize` MCP (limitado por longitud).

4. **Validación post-create**: extender `posts_validate` para detectar prosa "plana" — heurísticas tipo "post de >1000 palabras sin un solo componente custom = warning" o "no hay `<Lead>` en los primeros 200 chars".

**Severidad:** media. Bloquea calidad editorial pero no operativa. Aplicar tras smoke real y feedback del flow end-to-end.

---

### TASK — Prompt de sistema para Claude.ai web que opere el MCP correctamente

**Contexto:** durante esta sesión Claude.ai ha cometido errores operativos: posts_rebuild gratuitos antes de las instrucciones nuevas, posts_delete accidentales (cerrado por BUG-12 con `confirm:true`), no usar `posts_update_body` como vía preferida tras subir media, etc. El conector MCP no transmite suficiente "playbook" al LLM.

**Plan**:

1. **Definir el playbook del editor de blog** (operativo, no de marketing):
   - Antes de crear: `posts_search` para verificar que el slug no existe (evitar 409).
   - Para añadir media: `posts_request_upload` → URL al usuario → esperar confirmación → `posts_list_media` → escribir markers con nombres reales.
   - Para actualizar texto sin tocar media: `posts_update_body` (NO delete + create).
   - Para borrar: SIEMPRE confirmar con el usuario antes y usar `confirm:true` + decisión explícita sobre `cleanupMedia`.
   - Después de `posts_update_body`: opcionalmente `posts_rebuild` UNA vez para refrescar SEO. Tras `posts_create` / `posts_delete`, NO (ya rebuildean solos).
   - Usar `posts_validate` antes de publicar.

2. **Definir el playbook editorial** (calidad de contenido):
   - Empezar por `<Lead>` enganchando.
   - Usar `<PullQuote>` para citas reales del cliente.
   - Usar `<Stat>` para resultados cuantificables.
   - Usar `<Callout>` para advertencias o información secundaria.
   - Markers `[image:X]` para fotos, `[video:X]` para vídeos demo.
   - Frontmatter `cover: <slug-key>` apunta a la imagen hero (slug-key, no URL).

3. **Implementación**: el campo `instructions` de la respuesta `initialize` MCP (ya tocado en commit `df290f5` para REBUILD) puede crecer para incluir el playbook completo. Limitación: longitud — Claude.ai puede truncarlo. Alternativa: nuevo tool `blog_playbook` que el LLM llama al inicio de la conversación.

4. **Iteración basada en uso real**: instrumentar el flow para detectar patrones de error (ej: `posts_create` que recibe 409 seguido de `posts_delete + posts_create` sería un anti-patrón a documentar). El audit log de deletes ya está; añadir uno equivalente para creates/updates.

**Severidad:** media. La calidad operativa del LLM influye directamente en la UX del usuario humano. Aplicar tras catálogo MDX (orden lógico: el playbook referencia el catálogo).

---

### BUG-9 — `__tests__/api/answers.test.ts` mockea `@/.contentlayer/generated` que ya no se usa

**Síntoma:** el test fallaba 404 cuando se borraban los `.mdx` de `content/` — su mock está obsoleto.

**Causa:** el test fue escrito para la era contentlayer cuando `lib/ai-answers-service.ts` importaba `allPosts` de `@/.contentlayer/generated`. Tras la migración runtime el servicio importa `listPostsFromDisk` de `@/lib/blog/posts-runtime`, así que el mock no surte efecto y el test ejecuta el reader real contra `process.cwd()/content/`. Con los originales presentes pasa; con `content/` vacío devuelve [] y la query "desarrollo web" da 404.

**Fix:** sustituir el mock por un setup tmpdir con `CONTENT_ROOT` y fixtures escritas a disco (mirror del patrón en `__tests__/lib/posts-runtime-resolve-covers.test.ts`). Tres tests más, escenario aislado, no depende del repo state.

**Severidad:** baja. Hoy pasa porque los originales están en `content/`. Falla solo si el dir queda vacío. Hay valor en arreglarlo igualmente para que el test no dependa del repo state.

---

### BUG-8 — `resolvePostCovers` rompe los covers absolutos (URLs http) de los posts legacy

**Síntoma reportado el 2026-05-05 ~20:30 UTC:** Tras BUG-7 los posts originales aparecen en el listado pero **sin imagen de portada**. Solo el de Ferdy se ve.

**Diagnóstico:** los 12 posts legacy tienen `cover: "https://images.unsplash.com/..."` (URL absoluta de Unsplash). El nuevo `resolvePostCovers` (commit `700a3c9`) trata TODOS los `cover` como slug-keys de la nueva convención, los pasa por `resolveCover(post.cover, meta, key)` que busca `meta.files["https://..."]` — no existe — y devuelve `undefined`. BlogCard recibe `cover: undefined` y omite el `<Image>`.

**Fix:** en `resolvePostCovers`, si `post.cover` arranca con `http://`, `https://` o `/`, **passthrough** sin tocar. Solo aplica resolución a slug-keys (lowercase, ASCII, `_-`). El bug es de un par de líneas:

```ts
export async function resolvePostCovers(posts: RuntimePost[]): Promise<RuntimePost[]> {
  const { readMeta } = await import("./media-meta")
  const { resolveCover } = await import("./media-markers")
  return Promise.all(
    posts.map(async (post) => {
      if (!post.cover) return post
      // Legacy: URL absoluta o path absoluto (precede a la convención de markers).
      // Pasamos sin transformar; el componente ya sabe servirlo.
      if (/^(https?:)?\/\//.test(post.cover) || post.cover.startsWith("/")) return post
      const meta = await readMeta(post.translationKey)
      const cover = resolveCover(post.cover, meta, post.translationKey)
      return { ...post, cover: cover.ok ? cover.url : undefined }
    })
  )
}
```

**Tests a añadir:**
- Cover absoluto `https://...` → devuelto tal cual.
- Cover absoluto `/path/local.png` → devuelto tal cual.
- Cover slug-key `hero` con meta → URL resuelta (ya cubierto).
- Cover slug-key `nope` sin meta → `undefined` (ya cubierto).

**Severidad:** alta — todos los posts no creados por MCP carecen de imagen en el grid del blog hasta el fix.

---

### BUG-7 — Posts (originales y dinámicos) viviendo en paths incompatibles con el runtime reader

**Síntoma reportado por el usuario el 2026-05-05 ~20:10 UTC:** "no se ve ninguna foto en ningún post y ha desaparecido el post que habíamos creado, ¿cada vez que hacemos build se borran los posts nuevos?"

**Diagnóstico — dos problemas anidados:**

1. **Los 12 posts originales del proyecto vivían en `content/*.mdx`**, no en `content/posts/`. La migración contentlayer→runtime cambió la fuente de verdad del reader a `content/posts/`, pero nadie movió los `.mdx` de su sitio anterior. Resultado: el blog list por la ruta runtime mostraba 0 posts (el sitio funcionaba aún por el path contentlayer en build-time).

2. **`getContentRoot()` devuelve `process.cwd()`** = `.next/standalone/` (efecto del `process.chdir(__dirname)` del server.js). Así que `posts-runtime` lee de `.next/standalone/content/posts/`. Cada `next build` regenera `.next/standalone/` desde cero — borrando cualquier post creado dinámicamente vía `posts_create` del MCP. El de Ferdy creado por el usuario fue víctima exactamente de esto: el último build de recovery lo eliminó.

**Acciones aplicadas el 2026-05-05 20:14 UTC:**
- Movidos los 12 `.mdx` originales de `content/` a `content/posts/` para que el reader runtime los vea.
- Recreado `de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy.mdx` desde el contenido conservado en el contexto de la sesión, con `cover: hero` y `translationKey` fijado al slug.
- `ecosystem.config.js` añade `CONTENT_ROOT: '/root/e2dProject/e2d-website-v2'` al `env_production`. Así el reader lee del project root, no del standalone, y los `.mdx` sobreviven a builds.
- `pm2 delete e2d && pm2 start ecosystem.config.js --env production` para que la nueva env entre en vigor (PM2 cachea env_production al primer registro; un simple restart no la actualiza).

**Verificación end-to-end superada:**
- `GET /es/blog` lista los 5 posts en español (los 4 originales + Ferdy).
- `GET /es/blog/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy` carga 200.
- Cover sirve `/uploads/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy/hero.png` 200.

**Lo que NO está resuelto y queda como follow-up:**
- `posts_create` del MCP escribe a `<getContentRoot()>/content/posts/<slug>.mdx`. Con `CONTENT_ROOT` ya pinned al project root, los nuevos posts SÍ persisten entre builds. Confirmar con un smoke real tras el próximo `posts_create`.
- El de Ferdy original tenía un commit con `cover: ferdy_hero` (commit `df290f5` lo intentó, pero `content/posts/` está gitignored). La recreación usa `cover: hero` porque es el nombre real subido a `_meta.json`. Si el usuario tenía notas o cambios extra en el body, se han perdido — el contenido recreado proviene del system-reminder que capturamos en sesión.

**Severidad:** crítica — sin esto, cualquier build borra todo post creado por el LLM. Mismo patrón que BUG-3 (cwd inestable + dirs efímeros del standalone).

---

### BUG-5 — `posts_validate` no comprueba existencia física de los binarios

**Síntoma reportado por el usuario el 2026-05-05:** `posts_validate` devuelve `{ ok: true, missingMarkers: [], unusedMedia: [], coverOk: true }` para un post cuyos `[video:testimonio]` y `cover: hero` referencian binarios que NO existen en disco (caso real: estaban en `.next/standalone/public/uploads/` y se borraron en un build, pero `_meta.json` se preservó). La tool **oculta el bug principal** (BUG-3) al dar luz verde.

**Causa:** `lib/blog/posts-validate.ts:validatePost` solo comprueba consistencia entre los markers del body y `_meta.json`. No verifica que `<MEDIA_UPLOADS_ROOT>/<key>/<name>.<ext>` exista realmente.

**Fix propuesto:** en `validatePost`, después de validar la coherencia metadata-markers, hacer un loop por `meta.files` y comprobar `fs.existsSync()` de cada binario. Añadir al ValidationResult un nuevo campo:
```ts
missingBinaries: Array<{ name: string; expectedPath: string }>
```
Y considerar `ok: false` si `missingBinaries.length > 0`.

**Tests a añadir:**
- post con `_meta.json` correcto pero binarios borrados → `ok: false`, `missingBinaries` lo reporta.
- post con `_meta.json` correcto + binarios presentes → `ok: true`, `missingBinaries: []`.

**Severidad:** media. No bloquea el flujo (BUG-3 lo bloquea más fuerte) pero rompe el contrato implícito de "validate antes de publicar". Aplicar tras cerrar BUG-3.

---

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

**Causa raíz (TRES problemas encadenados — confirmado 2026-05-05 19:10 UTC con `/proc/<pid>/cwd` y `/proc/<pid>/environ`):**

1. **Smoking gun: `.next/standalone/server.js:6` ejecuta `process.chdir(__dirname)`.** PM2 declara `cwd: /root/e2dProject/e2d-website-v2` en `ecosystem.config.js` y arranca el server con ese cwd, **pero el server lo cambia inmediatamente** a `/root/e2dProject/e2d-website-v2/.next/standalone/`. Confirmado en runtime: `/proc/2773723/cwd → /root/e2dProject/e2d-website-v2/.next/standalone`. Resultado: el fallback `path.join(process.cwd(), "public", "uploads")` resuelve a `/root/e2dProject/e2d-website-v2/.next/standalone/public/uploads/` — ahí están los uploads del usuario AHORA mismo (11MB confirmados: hero.png 4.5MB + testimonio.mp4 5.6MB + _meta.json).

2. **`.env` no llega al proceso.** `ecosystem.config.js:env_production` solo declara `NODE_ENV`, `PORT`, `HOSTNAME`. Node standalone NO lee `.env` automáticamente (solo Next dev/build). Resultado: aunque el `.env` tenga `MEDIA_UPLOADS_ROOT=/var/lib/e2d-uploads`, `process.env.MEDIA_UPLOADS_ROOT` en el handler es `undefined` → fallback al path volátil. Confirmado: `cat /proc/2773723/environ | grep MEDIA` devuelve vacío.

3. **El standalone server NO sirve el `public/` del repo.** Sirve estáticos solo desde `.next/standalone/public/`. Cualquier upload aterrizado fuera de ese árbol no es servible vía `/uploads/...` aunque el binario exista.

**Consecuencia operativa:** los uploads aterrizan en `.next/standalone/public/uploads/` (efímero — cada `next build` lo borra), `posts_list_media` los enumera leyendo `_meta.json` desde el mismo path efímero, pero la URL pública `/uploads/.../*.png` da 404 porque... espera, en realidad el standalone sí los sirve (están bajo `.next/standalone/public/`). El 404 reportado por el usuario debe venir de un build intermedio que purgó el dir. Tras el rescate del 19:13, los ficheros quedan a salvo en `/var/lib/e2d-uploads/<translationKey>/` pero **siguen sin servirse vía `/uploads/...`** porque Next mira en `.next/standalone/public/uploads/`. De ahí la necesidad del nginx alias.

**Por qué el route devuelve 200:** `saveMediaFile` ejecuta `pipeline(stream, transform, createWriteStream(path))` y el path resuelve, mkdir-p funciona, write succeed. Devuelve éxito honestamente. El bug no está en el route handler; está en que el path resuelto es volátil.

**Estado actual (2026-05-05 19:13 UTC) — pasos que YA están aplicados:**
- ✓ `/var/lib/e2d-uploads/` creado.
- ✓ `.env` tiene `MEDIA_UPLOADS_ROOT=/var/lib/e2d-uploads` (pero NO llega al proceso).
- ✓ nginx tiene `client_max_body_size 1100M` y `proxy_request_buffering off` (BUG-2 cerrado).
- ✓ Uploads del usuario rescatados a `/var/lib/e2d-uploads/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy/` (hero.png + testimonio.mp4 + _meta.json — 11MB). Salvos del próximo build.
- ✓ `ecosystem.config.js:env_production` añade `MEDIA_UPLOADS_ROOT: '/var/lib/e2d-uploads'` (commit pendiente — el fichero está en `.gitignore`).

**Plan de fix — pasos que FALTAN (acciones humanas):**

1. **Aplicar el cambio de `ecosystem.config.js` en runtime:**
   ```bash
   pm2 restart e2d --update-env
   ```
   El flag `--update-env` re-lee la sección `env_production`. Verifica con:
   ```bash
   cat /proc/$(pm2 pid e2d)/environ | tr '\0' '\n' | grep MEDIA_UPLOADS_ROOT
   # Debe mostrar: MEDIA_UPLOADS_ROOT=/var/lib/e2d-uploads
   ```

2. **Añadir el `location /uploads/` alias en nginx** — sin esto, Next sigue sirviendo `/uploads/...` desde `.next/standalone/public/uploads/` (vacío tras un build) y el alias NO se aplica:
   ```nginx
   # Dentro del server { listen 443 ssl; ... }, ANTES del location /
   location /uploads/ {
     alias /var/lib/e2d-uploads/;
     try_files $uri =404;
     expires 30d;
     add_header Cache-Control "public, immutable";
   }
   ```
   Luego:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Verificación end-to-end (sin redeploy de código):**
   ```bash
   # El cover de Ferdy debería servirse ya
   curl -sI https://evolve2digital.com/uploads/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy/hero.png | head -3
   # Esperado: 200 OK + Content-Type: image/png

   # Recargar el post en el navegador — el cover y el [video:testimonio] aparecen.
   ```

4. **(Futuro upload de prueba para confirmar persistencia)**: subir un fichero pequeño vía la form, comprobar que aterriza en `/var/lib/e2d-uploads/` (no en `.next/standalone/`):
   ```bash
   ls -la /var/lib/e2d-uploads/<translationKey>/
   ```

**Alternativas evaluadas (descartadas):**
- **Symlink en post-build:** `ln -sfn /var/lib/e2d-uploads .next/standalone/public/uploads` en `scripts/sync-static-files.js`. Funciona pero acopla persistencia con build-pipeline; menos limpio que el alias.
- **Route dinámica `app/uploads/[key]/[name]/route.ts`** que stream-ee desde `MEDIA_UPLOADS_ROOT`. Peor performance, mete a Node en camino crítico de servir media estática.

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
