# SEO discoverability fixes — favicon, robots, llms.txt, hreflang

**Fecha**: 2026-05-08
**Rama**: `feature/seo-favicon-robots-llms-hreflang` (desde `develop`)
**Tipo**: feat + fix mixto

## Contexto y problema

La búsqueda directa de marca (`evolve2digital`) no devuelve la web en Google, ni en las primeras páginas. Sí aparece con `site:evolve2digital.com` (49 URLs ya indexadas tras dar de alta el sitemap nuevo en GSC), pero **el favicon no se muestra en el snippet** y la SERP es pobre. Hay además defectos estructurales que limitan la indexación correcta de la web trilingüe (es/en/it) y la descubribilidad por crawlers IA.

Este spec acota cuatro tareas concretas que atacan causas raíz observadas en producción.

## Causas raíz confirmadas

1. **`/favicon.ico` devuelve 404**. El asset existe como `public/e2dFavicon.ico` (nombre custom) y el `manifest.ts` lo referencia, pero Google busca específicamente `/favicon.ico` en la raíz como fallback obligatorio para SERP, o bien un `<link rel="icon" sizes="…">` ≥48×48 en HTML. Ningún criterio se cumple.
2. **`robots.txt` con reglas contradictorias e innecesariamente restrictivas**:
   - El bloque `ChatGPT-User` permite `/es/blog/` y `/en/blog/` pero a la vez prohíbe `/es/` y `/en/` (líneas 96-112 de `app/robots.ts`).
   - La regla genérica incluye `Disallow: /*.json$`, que afecta a payloads RSC de Next.js y al webmanifest, sin un motivo claro.
   - No hay bloque explícito para `Googlebot`, ni para `PerplexityBot` o `Applebot-Extended`.
3. **No existen `llms.txt` ni `llms-full.txt`** (ambas devuelven 404). El estándar emergente de [llmstxt.org](https://llmstxt.org/) es la vía idiomática para declarar a crawlers IA qué contenido ingestar y en qué formato.
4. **El sitemap descarta los `hreflang`**. `lib/sitemap-generator.ts:272-282` calcula `alternateLanguages` para cada URL, pero la conversión a `MetadataRoute.Sitemap` de las líneas 93-98 sólo emite `{url, lastModified, changeFrequency, priority}` y los descarta. Resultado: web trilingüe sin señal hreflang en el sitemap, lo que confunde a Google sobre qué versión mostrar a cada idioma.

Fuera de alcance de este spec (apuntado para futuros): redirecciones 301 desde slugs antiguos, auditoría de `generateMetadata` página a página, JSON-LD avanzado, monitorización en CI.

## Tareas

### T1 — Favicon en SERP

**Archivos**:
- `app/icon.png` (nuevo, 512×512, derivado del logo actual)
- `app/apple-icon.png` (nuevo, 180×180)
- `public/favicon.ico` (nuevo, ICO multi-tamaño 16/32/48; puede ser copia del existente `e2dFavicon.ico` con el nombre estándar)
- `app/layout.tsx` (revisar `metadata.icons` si existe; si está pisando con rutas custom, eliminarlo y dejar que Next 14 sirva los iconos via convención de archivos)
- `app/manifest.ts` (alinear referencias para que apunten a `/favicon.ico` y los iconos PNG nuevos)

**Criterio de éxito**:
- `curl -I https://evolve2digital.com/favicon.ico` → 200, content-type `image/x-icon` o `image/vnd.microsoft.icon`.
- `curl -I https://evolve2digital.com/icon.png` → 200, ≥192×192.
- HTML de `/es` contiene `<link rel="icon" …>` apuntando a recursos accesibles.
- Validar con [Google Rich Results favicon tester](https://www.google.com/s2/favicons?domain=evolve2digital.com&sz=64).

### T2 — `robots.txt` limpio y coherente

**Archivos**:
- `app/robots.ts`

**Cambios**:
- Eliminar bloque `ChatGPT-User` contradictorio. Si se quiere mantener especificidad para ChatGPT, dejar sólo `Allow: /` con los mismos disallow base.
- Quitar `Disallow: /*.json$` del bloque genérico.
- Añadir bloque explícito `User-Agent: Googlebot` (mismo allow/disallow que la regla `*` pero declarado, para no heredar reglas IA por confusión).
- Añadir bloques `User-Agent: PerplexityBot` y `User-Agent: Applebot-Extended` con allow al contenido público y disallow de `/api/`, `/admin/`.
- Mantener `Sitemap` y `Host` al final.

**Criterio de éxito**:
- `curl -s https://evolve2digital.com/robots.txt` no contiene contradicciones (no se permite y prohíbe a la vez la misma ruta para el mismo agente).
- Probado con [Google robots.txt Tester](https://support.google.com/webmasters/answer/6062598) que `/es/`, `/es/blog/...`, `/sitemap.xml` son `Allowed` para Googlebot.

### T3 — `llms.txt` + `llms-full.txt`

**Archivos** (nuevos):
- `app/llms.txt/route.ts` — handler GET que genera el fichero según especificación llmstxt.org. Estructura: `# E2D — Evolve2Digital` + descripción + secciones `## Blog`, `## Documentación`, `## Servicios`, cada una con lista markdown de URLs. Build dinámico a partir de `listPostsFromDisk()` y rutas estáticas conocidas.
- `app/llms-full.txt/route.ts` — handler GET que sirve el cuerpo completo en markdown de los posts publicados (filtrado a `published: true`, ordenado por fecha desc) precedido de un encabezado con metadata mínima (título, fecha, locale, URL). Cuidar el tamaño: limitar a últimos N posts si crece mucho (decisión: empezamos sin límite, monitoreamos).
- `app/robots.ts` — añadir `Sitemap` extra apuntando opcionalmente a `/llms.txt` no procede (no es sitemap), pero sí dejar comentario en código indicando su existencia.

**Criterio de éxito**:
- `curl -s https://evolve2digital.com/llms.txt` → 200, content-type `text/plain; charset=utf-8`, formato válido llmstxt.
- `curl -s https://evolve2digital.com/llms-full.txt` → 200, content-type `text/plain; charset=utf-8`, contiene cuerpo de al menos 5 posts conocidos.
- Tests unitarios en `__tests__/app/llms-txt.test.ts` cubriendo: estructura, content-type, exclusión de drafts, multi-locale.

### T4 — `hreflang` en sitemap

**Archivos**:
- `lib/sitemap-generator.ts`
- `__tests__/lib/sitemap-generator.test.ts` (extender)

**Cambios**:
- En `generateSitemap()` (líneas 93-98), reemplazar el map plano por la forma con `alternates`:
  ```ts
  return sortedEntries.map(entry => ({
    url: entry.url,
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    alternates: entry.alternateLanguages
      ? { languages: entry.alternateLanguages }
      : undefined,
  }))
  ```
- Verificar que `alternateLanguages` incluye también la URL de la propia locale (Next requiere que la entrada incluya todas las lenguas, no sólo "las otras"). Esto exige ajustar `generateAlternateLanguages()` para que NO excluya `currentLocale` cuando se usa para hreflang.
- Añadir un `x-default` apuntando a la versión española (homepage por defecto).

**Criterio de éxito**:
- `curl -s https://evolve2digital.com/sitemap.xml | grep xhtml:link` muestra entradas `<xhtml:link rel="alternate" hreflang="es" href="…"/>` para cada URL multi-locale, incluyendo `hreflang="x-default"`.
- Tests verifican: cada entry con alternates emite todas las locales + x-default; entries sin alternates (legales si las hay) no emiten hreflang.
- `npm run validate:sitemap` pasa sin errores.

## Plan de verificación post-deploy

1. `pm2 restart e2d` y revisar `pm2 logs e2d` por 30s.
2. Curls a `/favicon.ico`, `/icon.png`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`.
3. `npm run validate:sitemap` en producción.
4. En GSC:
   - Reenviar sitemap si hay alguna alerta nueva.
   - Inspeccionar URL de `/es` y de un post → confirmar favicon visible en preview de SERP.
   - Pedir re-rastreo de la home y del sitemap.
5. Validar `llms.txt` con un crawler manual (curl) y opcionalmente preguntar a un LLM con browsing si ve la web declarada.

## Git flow

- Rama: `feature/seo-favicon-robots-llms-hreflang` (ya creada desde `develop`).
- Commits separados por tarea con prefijos del proyecto (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- Cuerpo de commit estructurado en inglés (Scope / Problem / Solution / Notes), sin Co-Authored-By.
- PR a `develop` cuando los 4 tareas estén verdes en local + lint + tests.

## Riesgos

- **`/favicon.ico` cacheado por Google con un 404 previo**. Mitigación: arreglar y pedir re-indexación manual en GSC; aceptar que el snippet tarde días en actualizarse.
- **`llms-full.txt` puede crecer**. Mitigación: monitorear tamaño; introducir límite de posts si supera 500KB.
- **Cambio en `generateAlternateLanguages` afecta consumidores existentes**. Mitigación: mantener firma compatible; cubrir con tests previos a tocar.
