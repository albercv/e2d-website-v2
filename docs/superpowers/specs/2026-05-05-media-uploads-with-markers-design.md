# Media uploads en posts del blog desde el chat de Claude — versión markers

**Fecha**: 2026-05-05
**Estado**: aprobado (brainstorming)
**Reemplaza a**: `2026-05-04-media-uploads-from-claude-design.md` (la spec anterior queda obsoleta — el endpoint de upload ya no escribe MDX y se introduce una convención de markers que el LLM compone).
**Alcance**: nuevos tools MCP `posts_request_upload`, `posts_update_body`, `posts_list_media`, `posts_validate`; modificación de `posts_create` y `posts_delete`; convención de markers `[image:nombre]` / `[video:nombre]` / `cover: nombre`; página `/admin/media-upload`; endpoint streaming `/api/admin/media/upload`; sidecar `_meta.json` por `translationKey`.

## Problema

El connector MCP no tiene mecanismo para adjuntar imágenes ni vídeos a un post. La spec previa (2026-05-04) resolvió la parte de subir binarios pero ataba el upload a *anexar al final del body MDX*, lo que impide que el LLM coloque cada elemento visual en su sitio dentro del texto. Además, no había forma de marcar la portada del post desde el chat ni de subir varios ficheros con metadata por fichero.

Los posts con traducciones (es/en/it) deben compartir las mismas referencias de media — subir una foto al "caso Ferdy" tiene que hacerla aparecer en las tres versiones, no solo en la española. Y los textos en es/en/it pueden tener distinta cantidad de párrafos, así que no sirve un esquema posicional por índice.

## Solución

**Separar la subida del binario de su colocación en el post**:

1. El usuario sube binarios vía un form en `/admin/media-upload` (sin asignar a posiciones). El form guarda los ficheros con un `nombre` slug-normalizado y un sidecar `_meta.json` con alt/caption por fichero.
2. El LLM compone (o re-compone) el body MDX usando markers `[image:nombre]` y `[video:nombre]` allí donde quiere que aparezca cada elemento. Para la portada usa el campo `cover: nombre` en frontmatter.
3. Al renderizar, un pre-procesador en `getCompiledPost()` resuelve los markers contra `_meta.json` y emite las etiquetas HTML/MDX correctas. Si un marker no resuelve, se renderiza un placeholder visible.

El MDX en disco queda con los markers literales — el LLM y un humano lo leen igual, y se desacopla "subo media" de "escribo el post".

## Convención de markers

| Marker | Dónde aparece | Renderiza a |
|---|---|---|
| `[image:<nombre>]` | Inline en body | `<figure><img src="/uploads/<key>/<nombre>.<ext>" alt="…" /><figcaption>…</figcaption></figure>` (figcaption solo si `caption` no está vacío) |
| `[video:<nombre>]` | Inline en body | `<figure><video src="/uploads/<key>/<nombre>.<ext>" controls preload="metadata" aria-label="…"></video><figcaption>…</figcaption></figure>` |
| `cover: <nombre>` | Frontmatter YAML | URL directa al binario en metadata SEO + hero del post; v1 solo imágenes (si `kind:"video"` → validation error) |

`<nombre>` es la slug-key del fichero, **sin extensión ni path**. La extensión y el `kind` los lee el resolver de `_meta.json`.

### Normalización del nombre (`slugifyMediaName`)

Reglas, en este orden:

1. `.toLowerCase()`.
2. NFD + strip diacríticos (acentos, diéresis).
3. `ñ` → `n`, `ç` → `c` (mapeo explícito antes del paso 4 por si NFD no los cubre limpiamente).
4. Cualquier carácter fuera de `[a-z0-9_]` → `_`.
5. Colapsar `_` repetidos a uno.
6. Trim de `_` al principio y al final.
7. Si el resultado es cadena vacía → error (el caller debe pedir un nombre válido).

Ejemplos:
- `tesTimonió; Ferdy` → `testimonio_ferdy`
- `Año Nuevo!!` → `ano_nuevo`
- `__foo--bar__` → `foo_bar`

Helper puro en `lib/blog/posts-write.ts`, exportado y reusado tanto por el form (cliente) como por la validación servidor.

## Storage layout

```
public/uploads/<translationKey>/
  <nombre>.<ext>      # binario, ext del MIME real
  _meta.json          # metadata por fichero (alt, caption, kind, ext)
```

`_meta.json`:

```json
{
  "version": 1,
  "files": {
    "fachada":          { "ext": "jpg", "kind": "image", "alt": "Fachada del local",          "caption": "" },
    "testimonio_ferdy": { "ext": "mp4", "kind": "video", "alt": "Ferdy contando su experiencia", "caption": "Junio 2026" }
  }
}
```

- Una sola escritura del JSON por submit del form (todos los ficheros del batch en un commit atómico vía `write tmp + rename`).
- `kind` y `ext` redundantes pero hace el resolver O(1).
- Nombres únicos por `translationKey` (no se permite `fachada.jpg` y `fachada.mp4` coexistiendo).
- `.gitignore`: añadir `public/uploads/`.

## Render-time expansion

En `lib/blog/posts-runtime.ts`, `getCompiledPost(slug, locale)` añade un paso antes de `next-mdx-remote/serialize`:

1. Leer `_meta.json` del `translationKey` del post (cachear en memoria con invalidación por mtime; v1 puede hacerse sin caché).
2. Tokenizar el body MDX siendo consciente de fenced code blocks (` ``` … ``` `) e inline code (`` `…` `). **No sustituir markers dentro de código** — para que el LLM pueda escribir ejemplos de la convención sin que se expandan.
3. Por cada `[image:<n>]` y `[video:<n>]` fuera de código:
   - Si `<n>` está en `_meta.files` y el `kind` coincide → emitir `<figure>` con `<img>`/`<video>` (alt y caption tomados del meta; caption ausente o vacío → no `<figcaption>`).
   - Si `<n>` no existe **o** el `kind` no coincide → emitir `<MediaMissing kind="image|video" name="<n>" reason="not_found|kind_mismatch" />`. Log warning servidor.
4. Resolver `cover` del frontmatter igual que un marker, sin prefijo: lookup por nombre, validar `kind:"image"`. Si falta o es vídeo → `cover: null` (la página gestiona ausencia como hoy).
5. Pasar el MDX ya sustituido al serialize.

Componente `<MediaMissing>` (nuevo, en `components/blog/MediaMissing.tsx`): bloque con fondo gris claro, label `⚠️ media missing: <name>` (incluye `reason` solo en dev, oculto en prod para no asustar al visitante), sin romper el layout. Registrado en el `components` map que se pasa a `<MDXRemote>`.

## Tools MCP

### Modificados

| Tool | Cambios |
|---|---|
| `posts_create` | + `cover?: string` (nombre de marker, sin extensión). + `translationKey?: string` (default = slug; permite agrupar hermanos i18n). El `content` puede contener markers — no se valida contra disco al crear. |
| `posts_delete` | Si era el último post hermano del `translationKey`, borra `public/uploads/<key>/` entero (binarios + `_meta.json`). |

### Nuevos

`posts_request_upload({ slug, locale })`:
- Resuelve `translationKey` del post.
- Firma JWT `{ purpose: "media-upload", translationKey, exp }` (TTL 15 min).
- Devuelve `{ uploadUrl: "<base>/admin/media-upload?token=<jwt>", expiresAt, translationKey, existingMedia: [{name, kind, ext, alt, caption, url}, ...] }`.
- Scope MCP: `posts:write`.

`posts_update_body({ slug, locale, content })`:
- Reescribe el body completo del MDX manteniendo el frontmatter intacto.
- No hace merge — sobrescribe. Confiable porque el LLM es el único productor de prosa en este flujo.
- Scope MCP: `posts:write`.
- Recovery: el `.mdx` está en git; rollback con `git checkout HEAD~1 content/posts/<slug>.mdx`.

`posts_list_media({ slug, locale })`:
- Lee `_meta.json` del `translationKey` correspondiente.
- Devuelve `{ translationKey, files: [{name, kind, ext, alt, caption, url}] }`.
- Si `_meta.json` no existe → `files: []`.
- Scope MCP: `posts:read` (solo lectura).

`posts_validate({ slug, locale })`:
- Pre-flight check sin side effects.
- Lee el `.mdx`, parsea markers, compara con `_meta.json`.
- Devuelve `{ ok: boolean, missingMarkers: [{kind, name, reason}], unusedMedia: [name, ...], coverOk: boolean }`.
- Scope MCP: `posts:read`.

## Cómo el LLM aprende la convención

Dos canales, ambos vivos en cada conexión MCP:

**1. Campo `instructions` en la respuesta de `initialize`** (hoy no se usa; añadir):

> *"Blog del sitio Evolve2Digital. Soporta media inline vía markers en MDX: `[image:nombre]` y `[video:nombre]` en el body, y `cover: nombre` en frontmatter. Los nombres son slug-keys (lowercase, ASCII, `_` separador) que apuntan a ficheros ya subidos. Para listar lo disponible llama a `posts_list_media`. Para subir nueva media llama primero a `posts_request_upload`, que devuelve una URL para que el usuario complete la subida vía form. Después usa `posts_create` o `posts_update_body` con los markers ya escritos. `posts_validate` hace pre-flight de markers rotos."*

**2. Campo `description` enriquecido en cada tool nuevo o modificado**, en español, con un ejemplo cuando aporte (un `[image:foo]`/`cover` ejemplo en `posts_create`/`posts_update_body`).

## Endpoint de upload

`POST /api/admin/media/upload` — recibe **un único fichero por request** (cliente itera).

- Headers:
  - `Authorization: Bearer <jwt>` con `purpose=media-upload`.
  - `Content-Type: multipart/form-data` o `application/octet-stream`.
  - `X-Media-Name: <slug>` — nombre slugificado del fichero, único en el batch.
  - `X-Media-Alt: <texto>` — opcional.
  - `X-Media-Caption: <texto>` — opcional.
- Validación servidor:
  - JWT válido + no expirado + `purpose=media-upload`. 401 si no.
  - MIME whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/quicktime`, `video/webm`. 415 si no.
  - Tamaño máximo: 1 GB (`MEDIA_UPLOAD_MAX_BYTES` env, default `1073741824`). 413 si no.
  - `X-Media-Name`: aplicar `slugifyMediaName` y comparar con el header — si difiere, 400 ("nombre no normalizado").
  - Sin path traversal (`path.basename` antes de unir).
- Streaming: `request.body` (Web Stream) → `Readable.fromWeb()` → `pipeline()` → `fs.createWriteStream()`. No buffer en memoria.
- Destino: `public/uploads/<translationKey>/<name>.<ext>`. Ext derivada del MIME (no del filename original).
- Respuesta: `{ ok: true, name, kind, ext, size }`. **No** se toca `_meta.json` aquí.

`POST /api/admin/media/upload/commit` — escribe `_meta.json` atómicamente al final del batch.

- Headers: `Authorization: Bearer <jwt>` (mismo JWT).
- Body JSON: `{ files: [{name, alt, caption}, ...] }` — solo los del batch actual.
- Servidor:
  - Lee `_meta.json` existente (si lo hay).
  - Para cada entrada del batch, busca el binario correspondiente en disco para inferir `kind` y `ext`. Si no existe binario para una entrada → 400.
  - Mergea con el JSON existente (sobreescribe entradas con el mismo nombre — sería raro porque la validación previa lo bloquea, pero defensivo).
  - Toma lock por `translationKey` (`public/uploads/<key>/.lock` con `O_EXCL`) durante el merge+write para evitar races con otro batch concurrente. Lock con TTL 30 s.
  - Escribe `<key>/.meta.json.tmp` y rename a `_meta.json`.
- Respuesta: `{ ok: true, files: [{name, kind, ext, alt, caption, url}, ...] }`.

## Form `/admin/media-upload`

Página client component, protegida por JWT (no por cookie de admin — la URL viene del LLM).

- Leer token de query (`?token=<jwt>`), `GET /api/admin/media/token-info` lo verifica server-side y devuelve `{translationKey, slugs:["caso-ferdy"], locales:["es","en","it"], existingMedia: [...]}` para mostrar contexto.
- Cabecera: *"Subiendo a: caso-ferdy (translationKey: ferdy-2026-05). 3 posts hermanos: es, en, it."* + lista *"Ya hay subidos: fachada, mesa"* (si aplica).
- Drag-drop multi-fichero. Por cada fichero añadido, una fila:
  - Preview thumbnail.
  - Input **Nombre** (auto-rellenado con `slugifyMediaName(filename)`, editable, validación on blur con el helper). Validar único en el batch + único respecto a `existingMedia`.
  - Input **Alt** (opcional).
  - Input **Caption** (opcional).
  - Botón eliminar fila.
- Botón único **"Subir todo"**:
  - Cliente itera `fetch /api/admin/media/upload` por fichero, mostrando barra de progreso por fila.
  - Al terminar todos con éxito, `fetch /api/admin/media/upload/commit` con el batch completo.
  - Si algún fichero falla → cliente cancela el resto, muestra error, **no** llama a `commit`. Los binarios subidos antes del fallo quedan huérfanos (limpiables con `posts_validate` + acción manual; aceptable v1).
- Tras commit OK: pantalla *"✅ N ficheros subidos: fachada, mesa, terraza, testimonio_ferdy"* + botón *"Volver al chat"*.

## Seguridad

- JWT con `purpose=media-upload`, `translationKey`, `exp` (TTL 15 min). Firmado con `JWT_SECRET`.
- MIME whitelist estricta (ver arriba).
- Tamaño máximo 1 GB por fichero.
- Sin path traversal: `path.basename` siempre.
- nginx: `client_max_body_size 1100M` (1 GB + margen).
- Disco: sin cuota propia v1; monitorizar `du -sh public/uploads/`.
- Visibilidad: ficheros públicos (es un blog). La seguridad está en quién puede subirlos, no en quién puede leerlos.

## Tests

Nuevos:

- `__tests__/lib/posts-write.test.ts` (extender):
  1. `slugifyMediaName` cumple las 7 reglas con casos límite (acentos, ñ, ç, mayúsculas, símbolos, dobles separadores, vacío).
- `__tests__/lib/media-storage.test.ts`:
  1. Stream a disco devuelve URL correcta.
  2. Rechaza MIME no permitido (415).
  3. Rechaza nombre no normalizado (400).
  4. Dedupe (segundo upload con mismo nombre → conflict 409).
- `__tests__/lib/posts-runtime.test.ts` (extender):
  1. Marker `[image:foo]` con entry en `_meta.json` → `<figure><img>...</figure>`.
  2. Marker `[video:foo]` con `kind:"image"` en meta → `<MediaMissing reason="kind_mismatch">`.
  3. Marker no resuelto → `<MediaMissing reason="not_found">`.
  4. Marker dentro de fenced code block NO se sustituye.
  5. Marker dentro de inline code NO se sustituye.
  6. `cover` en frontmatter resuelve a URL si imagen, `null` si vídeo o ausente.
- `__tests__/api/media-upload.test.ts`:
  1. POST sin token → 401.
  2. POST con token expirado → 401.
  3. POST con MIME prohibido → 415.
  4. POST con nombre no normalizado → 400.
  5. POST OK escribe binario.
  6. `/commit` OK escribe `_meta.json` mergeado.
  7. `/commit` sin binario previo → 400.
  8. Lock concurrente: dos `/commit` simultáneos al mismo `translationKey` → uno espera al otro.
- `__tests__/lib/mcp-rpc-handler.test.ts` (extender):
  1. `initialize` devuelve `instructions` no vacío.
  2. `posts_request_upload` resuelve target list desde slug+locale; URL con token válido.
  3. `posts_request_upload` incluye `existingMedia` cuando hay `_meta.json`.
  4. `posts_update_body` reescribe el body sin tocar frontmatter.
  5. `posts_list_media` con `translationKey` sin `_meta.json` devuelve `files: []`.
  6. `posts_validate` lista `missingMarkers` y `unusedMedia` correctamente.

Cambios:

- Tests de `appendMediaToBody` → eliminados (la función desaparece).

## Verificación end-to-end

1. `npx jest` — todo verde.
2. `next build` — limpio.
3. Smoke en producción tras deploy:
   - `posts_request_upload({slug:"caso-ferdy", locale:"es"})` → URL recibida.
   - Abrir URL → form con cabecera correcta + lista existente.
   - Añadir 1 imagen y 1 vídeo, rellenar nombres + alt + caption, Submit.
   - Verificar binarios en `public/uploads/<key>/` y `_meta.json` actualizado.
   - `posts_list_media({slug, locale})` muestra los nuevos ficheros.
   - `posts_create` / `posts_update_body` con markers que referencian los ficheros.
   - `posts_validate` → ok.
   - `posts_rebuild` → blog público renderiza imagen + vídeo + cover correctamente.
   - Verificar idéntico en es/en/it (mismo `translationKey`, mismos binarios, mismas etiquetas resueltas).

## Tareas de deploy fuera del repo

- Subir `client_max_body_size` en nginx a `1100M` (o `proxy_request_buffering off`).
- Verificar espacio libre en disco del servidor; documentar comando de monitorización.

## Migración de posts legacy

Igual que en la spec original: 12 posts legacy sin `translationKey`. Script `scripts/migrate-translation-keys.js` propone agrupaciones por contenido similar; el usuario confirma; se escribe el frontmatter. Sin cambios respecto a la spec previa.

## Fuera de alcance v1

- **Edición de metadata** de un fichero ya subido (alt, caption, rename) desde el form. Se edita `_meta.json` por SSH si urge. Posible v2 con `?edit=1`.
- **Borrado individual** de un fichero del post sin borrar el post. SSH + edición manual hasta v2.
- **Resumable uploads** (tus.io). Si una subida grande se corta, hay que reempezar.
- **Compresión / transcoding automático**. El usuario sube ya con su bitrate.
- **Generación de thumbnails / posters de vídeo**.
- **Generación automática de `alt`** con un VLM.
- **Cuotas de disco** y limpieza automática de huérfanos.
- **Galería separada** o biblioteca cross-post. Las uploads son por `translationKey`.

## Riesgos

- **Subidas largas se cortan**: 1 GB en wifi puede tardar varios minutos. Si se corta, el binario parcial queda en disco y el `_meta.json` no se actualiza (porque el batch no llega a `commit`). v1 deja el binario huérfano; `posts_validate` lo lista en `unusedMedia` y se borra a mano por SSH. v2 podría añadir endpoint de limpieza si pasa con frecuencia.
- **Marker en code block sustituido por error**: si el parser falla en distinguir fenced/inline code, el LLM no puede escribir ejemplos de la convención en posts. Mitigación: tests específicos.
- **`posts_update_body` destruye contenido**: el LLM rescribe mal el body, contenido escrito a mano antes se pierde. Mitigación: `.mdx` en git → `git checkout` recovers. v2 podría devolver un diff antes de aplicar.
- **Carrera de batch upload simultáneo**: dos navegadores commit al mismo `translationKey` a la vez. Mitigación: lockfile `O_EXCL` con TTL 30 s en el commit.
- **Mismatch `kind`**: el LLM escribe `[image:foo]` pero `foo` está como vídeo. Mitigación: `<MediaMissing reason="kind_mismatch">` visible + `posts_validate` lo lista.
- **MDX append legacy**: `appendMediaToBody` se elimina; si algún caller no migrado lo invoca, fallará el build. Mitigación: grep `appendMediaToBody` antes de mergear y migrar/borrar todos los usos.

## Cambios incompatibles vs spec 2026-05-04

- Eliminar `appendMediaToBody` y todos sus tests.
- El endpoint `/api/admin/media/upload` ya **no toca MDX**; solo escribe binarios. La escritura del MDX queda 100% en el flow del LLM (`posts_create` / `posts_update_body`).
- JWT más estrecho: solo `purpose + translationKey + exp` (sin `slug/locale/targets/files`).
- Se añaden 4 tools MCP nuevos (`posts_request_upload`, `posts_update_body`, `posts_list_media`, `posts_validate`).
- Sidecar `_meta.json` por `translationKey` — no existía en la spec previa.
- Componente `<MediaMissing>` — nuevo.
- Pre-procesador de markers en `getCompiledPost` — no existía.
