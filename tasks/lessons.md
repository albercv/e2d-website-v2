# Lecciones Aprendidas

## 2026-05-05 — Stores persistentes vs árbol del proyecto

**Patrón**: cualquier dato mutable que el runtime escribe (posts MDX, uploads, bbdd SQLite) NO puede vivir dentro del árbol del proyecto. Razón doble:

1. **`next build` regenera `.next/standalone/`** — si `process.cwd()` se usa como base de path bajo PM2, los writes aterrizan en el dir efímero del standalone y se evaporan en el siguiente build. Caso real: BUG-7 (parche parcial con `CONTENT_ROOT` en el lib pero NO en el route handler REST que duplicaba la lógica de write) → BUG-13 (mismo bug latente meses después).
2. **El árbol gitignored es frágil** — `git clean -fdx`, deploy desde otra máquina, snapshot del repo o reset agresivo lo evapora sin red. Sin history y sin backup, cualquier delete (incluso uno servicial del LLM, ver BUG-12) es irrecuperable.

**Patrón a aplicar siempre**:

- Cada store de runtime tiene una env var dedicada apuntando a un dir persistente fuera del proyecto:
  - `MEDIA_UPLOADS_ROOT=/var/lib/e2d-uploads` (BUG-3)
  - `BLOG_POSTS_DIR=/var/lib/e2d-content/posts` (BUG-13)
  - `data/oauth.sqlite` debería seguir el mismo patrón (pendiente).
- La env var se lee vía un único helper `getXxxDir()` exportado desde el lib correspondiente. Cualquier route handler, script o test que necesite el path debe importar ese helper — **prohibido** reconstruir el path con `process.cwd()` o `path.join("content", "posts")`. La duplicación es lo que ocultó BUG-13.
- Si Contentlayer u otra herramienta build-time necesita ver el dir como subpath del proyecto, se resuelve con un symlink (`content/posts -> /var/lib/e2d-content/posts`) — no migrando código. El symlink es zero-config para el código y funciona con fs walk recursivo.
- Tests unitarios deben aislar la env var en `jest.setup.js` (`delete process.env.BLOG_POSTS_DIR`) o un `.env.test` para no quedar atrapados por el `.env` de producción.

**Symlink hazard en walkers custom**:

`fs.readdir(dir, { withFileTypes: true })` devuelve `Dirent` cuyo `isDirectory()` retorna `false` para symlinks que apuntan a directorios. Cualquier walker recursivo que haga `if (entry.isDirectory()) recurse(...)` se salta los symlinks aunque apunten a contenido válido. Síntoma: builds funcionan (otras herramientas como Contentlayer/globby siguen symlinks por defecto), pero el runtime MCP / API custom no ve los ficheros del subárbol simbolizado.

**Patrón correcto** para un walker que pueda toparse con symlinks a dirs persistentes:

```ts
if (entry.isDirectory()) {
  recurse(...)
} else if (entry.isFile() && entry.name.endsWith(".mdx")) {
  pick(...)
} else if (entry.isSymbolicLink()) {
  const s = await fs.stat(full)  // sigue el symlink
  if (s.isDirectory()) recurse(...)
  else if (s.isFile() && full.endsWith(".mdx")) pick(...)
}
```

`fs.stat` (no `lstat`) resuelve el symlink y nos dice si el target es archivo o directorio. Aplicable a cualquier scanner que pueda toparse con `BLOG_POSTS_DIR` / `MEDIA_UPLOADS_ROOT` / etc. via symlink.

## 2026-05-06 — Tests con cleanup blanket sobre dir compartido = land mine en producción (BUG-15)

**Antipatrón concreto**: `__tests__/api/mcp-posts-create.test.ts` resolvía `postsDir = path.resolve(process.cwd(), 'content', 'posts')` y hacía un `afterEach` con `fs.readdirSync(postsDir)` + `fs.unlinkSync` para cada `.mdx`. En el repo principal `content/posts` es un symlink a `/var/lib/e2d-content/posts/` (producción). Resultado: cada `npx jest` borraba TODOS los posts reales sin pasar por `deletePost`, así que sin entrada en `posts-audit.log`. Ferdy y canaries desaparecidos durante semanas sin trazas.

**El subagente en worktree NO destruía nada** — worktrees creados con `git worktree add` tienen su propia copia de `content/posts/` (no symlink, ya que el symlink es untracked en `.gitignore`). Los tests del worktree creaban un dir real local, lo limpiaban, y producción seguía intacta. Solo el repo principal disparaba el bug.

**Reglas que sacar de aquí**:

1. **Nunca** resolver paths de tests con `path.resolve(process.cwd(), …)` apuntando a un dir que pueda ser symlink a producción. Para tests que ejercitan write paths, usar `fs.mkdtempSync(path.join(os.tmpdir(), 'prefix-'))` y setear la env var dedicada (`BLOG_POSTS_DIR`, `MEDIA_UPLOADS_ROOT`, etc.) al tmpdir antes de cargar el módulo bajo test.
2. **Nunca** hacer `readdirSync + unlinkSync` masivo en un dir que pueda contener archivos no-test. Los cleanups deben ser dirigidos: el test sabe qué slug creó y borra solo ese. O — mejor — todo el test usa un tmpdir aislado y `rmSync` recursivo sobre el tmpdir entero en `afterAll`.
3. **Cada test que toca filesystem debe tener forense**: si un test hace algo destructivo, debe ser fácil saber qué fue. El watchdog `inotifywait` con snapshots por evento (PM2 process `posts-watchdog`, `scripts/posts-fs-watchdog.sh`) es la red de seguridad — captura PID + comando del proceso destructor en cada `DELETE`. Reusable para `MEDIA_UPLOADS_ROOT` y otros stores persistentes.
4. **`testPathIgnorePatterns` debe incluir `/.claude/worktrees/`**: jest descubre por defecto cualquier `__tests__/**/*.test.ts` bajo `<rootDir>`, incluyendo worktrees de subagentes. Tests viejos en worktrees viejos pueden seguir teniendo antipatrones ya corregidos en la rama actual y van a romper aserciones (o, peor, ejecutar el bug sobre producción).

**Anti-patrones detectados**:

- Duplicar lógica de write entre el lib (con env var correcta) y un route handler REST (con `process.cwd()` legacy). Resultado: la mitad de las llamadas escriben donde toca, la otra mitad las pierde el siguiente build. Solo se ve si el LLM elige sistemáticamente uno u otro endpoint.
- Confiar en `process.cwd()` bajo PM2 standalone. `server.js` hace `process.chdir(__dirname)` antes de iniciar Next, así que el cwd siempre apunta a `.next/standalone/` en producción, sin importar dónde se haga `pm2 start`.
- Audit logs de delete pero no de create: cuando un post desaparece sin entrada de delete en el log, no hay forma de saber si nunca se creó (cwd erróneo) o si lo borró otro path. Añadir audit log a create también ayudaría a diagnosticar bugs como BUG-13 más rápido.

## 2026-05-07 — Jest TEST_PROD_GUARD: cómo correr tests en el servidor de producción

**Contexto**: tras BUG-15 añadimos `jest.setup-prod-guard.js` como `globalSetup` en `jest.config.js` y `jest.config.api.js`. El guard aborta jest si:
- `BLOG_POSTS_DIR` resuelve dentro de `/var/lib/e2d-content/`, **o**
- (sin `BLOG_POSTS_DIR`) `process.cwd()/content/posts` resuelve allí vía symlink.

**Regla**: el guard se activa **sólo** donde existe el symlink físico `content/posts → /var/lib/e2d-content/posts`. El symlink está en `.gitignore`, así que no viene del repo — sólo existe en el servidor de producción. CI, máquinas locales y worktrees recién creados ven `content/posts` como inexistente, el guard sale silencioso, y `npm test` corre transparentemente.

**Para correr tests en el servidor de producción (sólo aquí)**:
```bash
BLOG_POSTS_DIR=$(mktemp -d) npm test
# o para una suite concreta:
BLOG_POSTS_DIR=$(mktemp -d) npx jest __tests__/api/register.test.ts --no-coverage
```

`mktemp -d` crea un directorio único por invocación, el guard valida que no apunta a prod, los tests lo usan vía la lógica de `resolveBlogPostsDir()`. No hace falta limpiar el tmpdir manualmente; tmpfs lo recicla.

**No** modificar el script `"test": "jest"` de `package.json` para auto-mktemp: el comportamiento "aborta si no se setea" es deseable y obligatorio en este servidor — sin la fricción, alguien podría volver a ejecutar tests contra producción por descuido. La fricción aquí es la red de seguridad, no la incomodidad a quitar.

## 2026-05-07 — BUG-16: `next build` borra producción atravesando el symlink content/posts

**Síntoma**: a los ~2 min de lanzar `npm run build`, todos los `.mdx` de `/var/lib/e2d-content/posts/` desaparecen — incluido el post real de un cliente (Ferdy). El blog público sigue sirviendo si quedaba algo en caché, pero las próximas requests dan 404.

**Atribución (capturada por la vigilancia desplegada el 2026-05-06)**:
- `auditd` con regla `e2d_posts`: `syscall=87 (unlink)`, `comm="libuv-worker"`, `exe="/usr/bin/node"`, `ppid=748739`, `pid=748748`, proctitle = `node /root/e2dProject/e2d-website-v2/node_modules/.bin/next build`, target inode 1054409, path nominal `/root/e2dProject/e2d-website-v2/.next/standalone/content/posts/de-atender-...-ferdy.mdx`. La regla disparó porque el inode 1054409 está dentro del directorio vigilado, aunque el syscall use el path del symlink.
- `posts-watchdog` (inotifywait): registró el DELETE en tiempo real con timestamp UTC.
- `ferdy-tripwire` (PM2, 180 s): disparó 4 dumps consecutivos durante la ausencia con `ps auxf`, `ausearch`, `journalctl`.

**Causa raíz**: `next.config.mjs` tiene `output: 'standalone'`. next-tracer escanea las dependencias y copia `content/` al directorio `.next/standalone/`. Como `content/posts` es un symlink a `/var/lib/e2d-content/posts/` (necesario por diseño para que `posts-runtime.ts:walkMdx` descubra los posts persistentes — ver línea 70 del comment), el tracer atraviesa el symlink y trata el target como contenido del proyecto. Cuando el build ejecuta el cleanup pre-copy de `.next/standalone/content/posts/` (que de un build previo era a su vez un symlink heredado), el `rm -rf` recursivo del cleanup atraviesa el symlink y borra todo en el target — producción real.

**Esto NO es BUG-13/14 reaparecido**: BUG-13/14 arregló `walkMdx` (lectura runtime) para seguir symlinks bien. BUG-16 ocurre en una capa distinta — el pipeline interno de next-tracer y el cleanup del standalone, donde `walkMdx` no participa. La fix de BUG-13/14 es necesaria pero no suficiente.

**Reglas que sacar de aquí**:

1. **`outputFileTracingExcludes` para cualquier path que sea un symlink hacia un volumen persistente fuera del repo**. En este caso `'*': ['content/posts/**', 'content/posts']`. Sin esto, cualquier `next build` con `output: 'standalone'` que vea un symlink de directorio lo va a copiar atravesándolo, y los cleanups posteriores son una mina.
2. **Mismo patrón se aplica a `MEDIA_UPLOADS_ROOT` si en algún momento se symlinkea desde dentro del repo**. Hoy no es el caso (el media handler usa el path absoluto via env var, no symlink), pero si alguien añadiera `public/uploads → /var/lib/e2d-uploads` por conveniencia, repetiría exactamente la trampa.
3. **El reader del blog (`posts-runtime.ts`) lee del symlink por diseño** — el comment de la línea 70 lo documenta. No tocarlo. El writer (`posts-write.ts`) ya usa `BLOG_POSTS_DIR` directamente, así que puedes quitar el symlink del repo SI Y SOLO SI antes refactorizas el reader para que también use `BLOG_POSTS_DIR` o un path absoluto. Hasta entonces, el symlink debe quedarse y la fix vive en la config de Next, no en el repo.
4. **PM2 no carga `.env` automáticamente**. Las env vars que el runtime necesita deben estar en `ecosystem.config.js > apps[].env_production`. `.env` solo lo leen scripts puntuales que invoquen `dotenv.config()` manualmente. Caso real: `BLOG_POSTS_DIR` estaba en `.env` pero el runtime de PM2 no la veía porque no estaba en `env_production`. Auditarlo: `cat /proc/$PID/environ | tr '\0' '\n' | grep VAR_NAME`.
5. **`pm2 reload --update-env` no relee `ecosystem.config.js`**. Solo refresca las vars del shell padre. Para tomar cambios en el ecosystem hay que usar `pm2 startOrReload ecosystem.config.js --env production --update-env --only <name>`.

**La vigilancia desplegada el 6/may funcionó perfecto**: el watchdog detectó, el tripwire dumpeó contexto en 180 s, y auditd dio atribución kernel-level (PID + exe + syscall + cwd) sin race con `ps`. Sin esa stack habríamos vuelto a perder horas haciendo arqueología. Mantener auditd activo, el tripwire en PM2, y los baselines copiados a `logs/ferdy-baseline.{txt,mdx}`.
