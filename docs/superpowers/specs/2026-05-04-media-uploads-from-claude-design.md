# Subida de fotos y vídeos a posts del blog desde el chat de Claude

**Fecha**: 2026-05-04
**Estado**: aprobado (brainstorming)
**Alcance**: nuevo tool MCP `posts_request_upload`, página `/admin/media-upload`,
endpoint streaming `/api/admin/media/upload`, campo `translationKey` en
frontmatter, extensión de `posts_delete`.

## Problema

Hoy los posts solo pueden contener texto. Para añadir imágenes o vídeos hay
que editar manualmente el MDX y subir los binarios al servidor por SCP.
El connector MCP no tiene ningún mecanismo para adjuntar media. Los vídeos
en chat (base64 sobre tool MCP) están limitados a unos pocos MB, así que
hace falta un canal alternativo.

Adicional: los posts que tienen traducciones (ES/EN/IT) deben compartir las
mismas referencias de media — subir una foto al "caso Ferdy" tiene que
hacerla aparecer en las tres versiones, no solo en la española.

## Solución

Tool MCP que devuelve una URL clicable al usuario; esa URL abre un
formulario en el admin del propio sitio con autenticación por token; el
formulario sube los ficheros vía streaming directo al servidor (cualquier
tamaño) e inserta automáticamente las referencias en el MDX de todos los
posts hermanos (mismo `translationKey`).

## Flujo de uso

1. En la conversación con Claude: *"prepara la subida de fotos para el
   caso Ferdy"*.
2. Claude invoca `posts_request_upload({ slug, locale })`.
3. El tool busca el post → lee su `translationKey` → resuelve la lista de
   posts hermanos → firma un JWT (`purpose=media-upload`, slug, locale,
   translationKey, exp) → devuelve `{ uploadUrl, expiresAt, targets }`.
4. El usuario hace click en la URL → navegador abre
   `/admin/media-upload?token=<jwt>`.
5. La página valida el token, muestra cabecera *"Subiendo a: <título del
   post> (también se aplicará a EN, IT)"*, y un drag-drop con barra de
   progreso por fichero.
6. Al pulsar **Subir**, el navegador envía cada fichero por `fetch` a
   `/api/admin/media/upload` con header `Authorization: Bearer <jwt>`. El
   endpoint stream-escribe a disco, valida MIME, sanitiza filename.
7. Cuando todos los ficheros están en disco, el endpoint reabre cada MDX
   hermano, anexa al final del body un bloque por fichero, y reescribe.
8. La página muestra "✅ N ficheros subidos a 3 posts" y un link de vuelta
   al chat de Claude.
9. El usuario vuelve al chat y le pide a Claude reordenar texto si quiere
   (no reordenar media — eso fuera de scope, ver abajo).

## Componentes

| Componente | Tipo | Función |
|---|---|---|
| `lib/oauth-jwt.ts` | Lib (extensión) | `signUploadToken({slug, locale, translationKey, targets}, ttlSec)` y `verifyUploadToken` |
| `lib/blog/posts-runtime.ts` | Lib (extensión) | Añadir campo `translationKey` a `RuntimePost`; helper `findPostsByTranslationKey(key)` |
| `lib/blog/posts-write.ts` | Lib (extensión) | `appendMediaToBody(filePath, mediaItems)` que reabre, parsea con gray-matter, anexa, reescribe |
| `lib/blog/media-storage.ts` | Lib nuevo | `streamSaveFile(stream, dest, mimeAllowList, sizeLimit?)` con sanitización + dedupe |
| `lib/mcp/rpc-handler.ts` | Lib (extensión) | Tool `posts_request_upload` añadido a la toolsList |
| `app/admin/media-upload/page.tsx` | Page client | UI drag-drop, progress, llamada multi-fichero |
| `app/api/admin/media/upload/route.ts` | API streaming | Recibe multipart, valida JWT, escribe a disco, anexa MDX |
| `posts_create` (tool existente) | Modificado | Acepta `translationKey` opcional; default = slug |
| `posts_delete` (tool existente) | Modificado | Borra también `public/uploads/<translationKey>/` si queda huérfano |
| Script `scripts/migrate-translation-keys.js` | One-shot | Mira los 12 posts legacy y propone agruparlos por contenido similar; el usuario confirma y se escribe |

## Modelo de datos

**Frontmatter de Post** (campo nuevo, opcional):

```yaml
translationKey: ferdy-2026-05  # mismo en es/en/it; default = slug si ausente
```

`RuntimePost.translationKey: string` (con fallback a `slug` cuando el
frontmatter no lo trae). `findPostsByTranslationKey(key)` devuelve todos
los posts con ese valor (típicamente 1-3).

## Endpoint de upload

`POST /api/admin/media/upload`

- Headers:
  - `Authorization: Bearer <jwt>` — token con `purpose=media-upload`
  - `Content-Type: multipart/form-data`
- Body: un único campo `file` por request (cliente itera por fichero
  para tener progreso individual).
- Validación:
  - Token: firma OK, no expirado, `purpose=media-upload`. 401 si no.
  - MIME whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`,
    `video/mp4`, `video/quicktime` (`.mov`), `video/webm`. Cualquier otro → 415.
  - Tamaño máximo por fichero: **1 GB**. Por encima → 413.
  - Filename: `path.basename(input)` → slugify → ext del mime → dedupe con
    counter (`foto.jpg`, `foto-2.jpg`).
- Streaming: usa `request.body` (Web Stream) → `Readable.fromWeb()` →
  `pipeline()` → `fs.createWriteStream()`. No buffer en memoria.
- Destino: `public/uploads/<translationKey>/<filename>`.
- Tras escribir todos los ficheros del request: por cada post target, abre
  `<contentRoot>/content/posts/<slug>.mdx` (o legacy paths), parsea con
  gray-matter, anexa al body un bloque por fichero, reescribe.
- Respuesta: `{ ok: true, files: [{ name, size, url }], updatedPosts: [...] }`.

## Inserción en MDX

Por cada fichero subido, append al final del body (línea en blanco antes):

- **Imagen**: `![<alt>](/uploads/<translationKey>/<filename>)`
  - `alt` = filename sin extensión por defecto. Se puede sobrescribir si
    el formulario expone un input por fichero (no en v1, ver abajo).
- **Vídeo**: `<video src="/uploads/<translationKey>/<filename>" controls preload="metadata"></video>`

Misma cadena para los 3 posts hermanos. Reescribe cada MDX con el
frontmatter intacto.

## Seguridad

- **Token**: JWT firmado con `JWT_SECRET` (compartido con resto de auth
  OAuth). Payload: `{ purpose: "media-upload", slug, locale,
  translationKey, exp }`. TTL 15 min.
- **Token único por sesión de subida**: válido para múltiples ficheros
  durante su TTL.
- **Sin token o expirado** → 401.
- **MIME whitelist** estricta: `image/jpeg`, `image/png`, `image/webp`,
  `image/gif`, `video/mp4`, `video/quicktime`, `video/webm`.
- **Límite por fichero**: 1 GB (configurable vía env `MEDIA_UPLOAD_MAX_BYTES`).
- **Sin path traversal**: `path.basename()` antes de unir; rechaza si el
  filename contiene `/` o `\`.
- **nginx**: subir `client_max_body_size` a `1100M` (1 GB + margen) o
  usar `proxy_request_buffering off` para streaming pass-through. Cambio
  en la config de nginx, no en el repo. Documentar en el plan.
- **Disco**: sin cuota propia v1. Si llega a importar, monitorizamos
  `public/uploads/` con `du -sh`.
- **Visibilidad**: los ficheros se sirven públicamente (es un blog). La
  seguridad está en quién puede subirlos, no en quién puede leerlos.

## Storage

- Disco: `public/uploads/<translationKey>/<filename>`.
- URL pública: `/uploads/<translationKey>/<filename>`.
- `.gitignore`: añadir `public/uploads/`.
- Borrado: `posts_delete` borra el `.mdx` del slug solicitado. Si era el
  último post con ese `translationKey`, borra también el directorio
  `public/uploads/<translationKey>/`. Si quedan hermanos, mantiene el
  directorio (siguen referenciando los ficheros).

## Tests

Nuevos:

- `__tests__/lib/media-storage.test.ts`:
  1. Escribe stream a disco, devuelve URL correcta.
  2. Rechaza MIME no permitido (415).
  3. Sanitiza filename con caracteres raros.
  4. Dedupe correcto cuando el filename ya existe.
- `__tests__/lib/posts-runtime.test.ts` (extender):
  1. Lee `translationKey` del frontmatter.
  2. Fallback a slug si ausente.
  3. `findPostsByTranslationKey` agrupa posts hermanos.
- `__tests__/lib/posts-write.test.ts` (extender):
  1. `appendMediaToBody` añade imagen al final del body con frontmatter intacto.
  2. `appendMediaToBody` con vídeo usa el tag `<video>`.
  3. `posts_delete` borra `public/uploads/<key>/` si era el último hermano.
- `__tests__/api/media-upload.test.ts`:
  1. POST sin token → 401.
  2. POST con token expirado → 401.
  3. POST con token válido + imagen → 200, fichero en disco, MDX actualizados.
  4. POST con MIME prohibido → 415.
- `__tests__/lib/mcp-rpc-handler.test.ts` (extender):
  1. `posts_request_upload` resuelve target list desde slug+locale.
  2. Devuelve URL con token válido y caducidad correcta.

Existentes: `posts_create` test añade caso de `translationKey`.

## Verificación end-to-end

1. `npx jest` — todo verde.
2. `next build` — limpio.
3. Smoke test en producción tras deploy:
   - Llamar a `posts_request_upload({slug:'caso-ferdy', locale:'es'})` desde Claude → recibir URL.
   - Abrir URL → ver formulario con cabecera del post.
   - Subir una imagen pequeña + un vídeo de 10-50 MB.
   - Volver al chat → `posts_get({id:'caso-ferdy', locale:'es', includeContent:true})` muestra las nuevas referencias en el body.
   - Verificar lo mismo para EN e IT (si existen hermanos).
   - Lanzar `posts_rebuild` → verificar que `evolve2digital.com/es/blog/caso-ferdy-...` carga las imágenes/vídeos.

## Tareas de deploy fuera del repo

- Subir `client_max_body_size` en nginx a `1100M` (o usar
  `proxy_request_buffering off`).
- Verificar espacio en disco del servidor; documentar comando de
  monitorización.

## Fuera de alcance v1

- **Resumable uploads** (tus.io). Si una subida grande se corta, hay que
  reempezar.
- **Compresión/transcoding automático**. El usuario sube ya con su bitrate.
- **Generación de thumbnails**.
- **`posts_update_body`** para reordenar/mover media desde el chat. Si
  hace falta mover algo, abrir `/admin/edit?file=...`. El riesgo de dar
  edición libre del MDX a Claude es destruir contenido escrito a mano.
- **Galería separada** o biblioteca cross-post. Las uploads son por-post.
- **Borrado individual de un fichero subido**. Si se quiere quitar uno, se
  edita el MDX a mano y se borra el binario por SSH. Posible v2.
- **Cuotas de disco** y limpieza automática de huérfanos.

## Riesgos

- **Subidas largas se cortan**: 1 GB en wifi puede tardar varios minutos.
  Si la conexión se corta, el fichero parcial queda en disco y el MDX no
  se actualiza. Se puede mitigar con `try { stream pipeline } finally {
  fs.unlink si error }` pero no resuelve el reintento. Aceptable v1; los
  vídeos largos pueden subirse desde cable.
- **MDX append rompe diseños complejos**: si el body termina en medio de
  un componente JSX cerrado abierto, el append puede generar MDX inválido.
  Mitigación: el endpoint valida la salida con `gray-matter` + parseo
  básico antes de escribir; si falla, devuelve 500 sin tocar nada.
- **Migración de los 12 posts legacy**: agrupar por `translationKey`
  manual al principio. Script propone, humano confirma.
