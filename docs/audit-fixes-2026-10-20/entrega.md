# Entrega — correcciones de la auditoría pública del 20/10/2026

Encargo literal: [encargo.md](encargo.md) · Plan: [../superpowers/plans/2026-10-20-audit-fixes.md](../superpowers/plans/2026-10-20-audit-fixes.md)

## Entornos y alcance de lo comprobado

| Entorno | Qué se comprobó |
|---|---|
| **Local (jest)** | Suite completa en `fix/audit-2026-10-20`: 116 de 120 suites y 1013 de 1022 tests en verde. Fallan las 4 suites que ya fallaban antes de empezar, por falta de `.env` o de `.contentlayer` en el worktree: `api/answers`, `api/mcp-streamable`, `api/register` y `components/blog/contact-cta`. |
| **Local (build + servidor)** | `next build` correcto (con `DATABASE_URL` ficticia y `NEXT_PUBLIC_WHATSAPP_NUMBER=34605497639`). Servidor standalone en `127.0.0.1:3091`. 97 comprobaciones HTTP sobre el HTML servido y 10 de navegador con Playwright/Chromium, todas en verde (detalle por tarea abajo). |
| **Previsualización** | No hay entorno de previsualización: no se ha comprobado nada ahí. |
| **Producción** | **Nada desplegado.** El 20/10 solo se capturó la línea base en producción: `lang="es"` en `/en` e `/it`, encabezado en español en `/en/cookies` e `/it/cookies`, ningún `id="contact"`, `Disallow: /_next/` sin excepciones, `/docs` en el sitemap y 404 en las tres rutas nuevas. |

No se atribuye ninguna mejora de ranking, indexación ni de recomendaciones en ChatGPT: nada de eso se ha medido.

## Ramas

- **evolve2digital.com**: `fix/audit-2026-10-20` (repo `e2d-website-v2`), **apilada sobre `feature/legal-pages-i18n`**. Esa rama es local y no tiene push; ya traducía las páginas legales y de cookies. Hay que fusionarla antes, o a la vez.
- **e2dprojects.com**: `fix/auditoria-identidad-enlaces` (repo `projects-hub`, desde `main` 5e2e80b), en el worktree `/root/projects-hub-b4c230e4590277af/audit-identidad-enlaces`. El repo no tiene remoto.
- **Coordinación**: la sesión «Motor de auditoría web para IA» (`feature/audit-ia-landing`) añade la misma línea `"robots-parser": "3.0.1"` en `package.json`. Si se fusionan las dos, hay que regenerar `package-lock.json` con `npm install`. También tocará `contact-modal.tsx`, que esta rama no modifica.

## Tabla por tarea

| # | Estado | Archivos principales | Cambio realizado | Verificación y resultado | Dependencias pendientes |
|---|---|---|---|---|---|
| 1 robots.txt | **Implementada** | `app/robots.ts`, `__tests__/app/robots-effective.test.ts`, `__tests__/app/robots.test.ts`, `package.json` | Se añaden `Allow: /_next/static/` y `Allow: /_next/image` a los nueve grupos, sin hashes. Disallow, grupos y preferencias de entrenamiento no cambian. | Test que serializa con `resolveRobots` de Next y evalúa con `robots-parser` 3.0.1 (precedencia por la regla más larga), sobre 10 agentes, incluidos OAI-SearchBot y un bot desconocido. Local: el `robots.txt` servido se evaluó también con robots-parser: estáticos e imágenes permitidos, `/_next/data/` y `/admin/` bloqueados. | Desplegar. |
| 2 Perfiles de identidad | **Implementada** | `lib/seo/entities.ts`, `lib/json-ld-generator.ts`, `components/seo/json-ld.tsx`, `components/pages/profile/profile-method.tsx` (portfolio: `lib/entities.ts`, `lib/jsonld.ts`) | Se retiran `github.com/albertocarrasco` (la API de GitHub muestra a «Alberto Carrasco García», de libnova: otra persona), `linkedin.com/in/albertocarrasco` y `twitter.com/albertocarrasco`. Perfiles confirmados por Alberto el 20/10/2026: `Person.sameAs` = `https://github.com/albercv` (además, la API indica company «Evolve2digital» y es el dueño del repo) y `https://www.linkedin.com/in/albercv/`. `Organization.sameAs` = `https://www.instagram.com/evolve2digital/`, `https://www.tiktok.com/@evolve2digital` y `https://x.com/evolve2digital_`. Las listas son idénticas en los dos sitios. No se publica `alumniOf` (UPM), por falta de evidencia. | `jsonld-entities.test.ts` (es/en/it: listas exactas, sin perfiles cruzados entre persona y marca) y `jsonld.test.ts` del portfolio. En el HTML local no aparece ningún perfil antiguo en 17 páginas. | Confirmar la formación. Google Business Profile descartado por ahora (ver «Datos pendientes»). |
| 3 IDs de entidades | **Implementada** (ambos sitios) | e2d: `lib/seo/entities.ts`, generador y `SiteGraphSchema` (un único `@graph`). Portfolio: `lib/entities.ts`, `lib/jsonld.ts` | `#organization` y `#person` en Organization, `founder`, `publisher`, `provider`, `author` y `worksFor`. El autor de un post solo se enlaza a `#person` si es «Alberto Carrasco». En el portfolio, WebSite.`author` es la persona, `publisher` es la organización y los proyectos tienen `creator` = organización. Se eliminan los bloques duplicados (Organization, Service y WebSite sueltos). | Local: en todo el HTML solo aparecen los dos `@id`. Portfolio: `pnpm test` (288 tests), `pnpm build` y el HTML construido no contiene `/#org`. | Desplegar ambos. |
| 4 Portfolio ↔ corporativa | **Implementada** | Portfolio: `components/about-section.tsx`, `components/projects-section.tsx`, `messages/{es,en}.json`. e2d: `components/sections/projects-section.tsx`, `messages/*` | Portfolio: «Soy Alberto Carrasco, desarrollador de software y fundador de [Evolve2Digital](https://evolve2digital.com/es)…» (en: `/en`). El dominio de cada tarjeta es un `<a href>` real y el modal se conserva. Corporativa: enlaces a abyfoods.fi, augustore.es y ferdycoachdesamor.com, al caso de Ferdy y al portfolio (`/es/`; en e it enlazan a `/en/` porque no hay versión italiana). | Portfolio: los tests y el HTML construido contienen nombre y enlaces. Corporativa: el HTML local de `/es`, `/en` e `/it` contiene todos los `href`, sin manejadores de clic. | Desplegar ambos. |
| 5 `<html lang>` | **Implementada** | `app/layout.tsx` (de paso), `components/layout/html-document.tsx`, `app/[locale]/layout.tsx`, `app/{admin,authorize,es}/layout.tsx`, `app/not-found.tsx` | Es el patrón de next-intl para Next 14.2: `<html lang={locale}>` sale del layout `[locale]`. Se elimina el parche de cliente `LangAttribute`. No hay `<html>` anidados. | Local: `lang` correcto en el HTML inicial de 17 rutas (portadas, cookies, blog, legal, privacy, servicios, admin y docs). Con Playwright, `lang` sigue igual tras hidratar. | Desplegar. |
| 6 Cookies en/it | **Ya resuelta** en `feature/legal-pages-i18n` y **completada** aquí | `lib/legal/content/cookies/{es,en,it}.ts` (rama base) y `components/legal/legal-document.tsx` | Contenido, encabezados, título, descripción, canonical y hreflang ya iban traducidos en la rama base. Aquí se añade el `lang` (tarea 5) y la navegación con selector de idioma, que no existía en las páginas legales. | Local: `/en/cookies` tiene h1 «Cookies Policy», `lang="en"`, canonical y `hreflang it-IT`. El selector de idioma lleva de `/en/cookies` a `/it/cookies` (Playwright). | Las traducciones en/it **no tienen revisión editorial humana** y llevan el aviso de que prevalece la versión española. Fusionar `feature/legal-pages-i18n`. |
| 7 Destino de contacto | **Implementada** | `components/sections/contact-section.tsx`, `app/[locale]/page.tsx`, `messages/*`, 7 páginas `app/es/**` | Sección real `id="contact"`, renderizada en el servidor, con botón al `ContactModal` existente (sin duplicar el formulario), `mailto:` y WhatsApp. Los 7 enlaces rotos `/es#contacto` pasan a `/es#contact`. | Local: `id="contact"`, `mailto` y `wa.me` en el HTML de `/es`, `/en` e `/it`. Con Playwright, `/es#contact` lleva a la sección y el botón abre el modal. | Desplegar. WhatsApp depende de `NEXT_PUBLIC_WHATSAPP_NUMBER` en producción. |
| 8 Ubicación | **Implementada** | `lib/seo/entities.ts` y el generador | `addressLocality: "Madrid"`: el aviso legal publica «Domicilio: Madrid, España». Se mantiene `addressCountry: "ES"` y no se publica calle. `areaServed: ["ES","EU"]` en ambos sitios. Se elimina `serviceArea`. | Test de entidades y comprobación en el HTML local. | Ninguna. |
| 9 Perfil y servicios | **Implementada** (copy: **pendiente de revisión editorial**) | `app/[locale]/{alberto-carrasco,desarrollo-software-madrid,automatizacion-procesos-ia}/page.tsx`, `components/pages/**`, `lib/seo/static-pages.ts`, sitemap, `llms.txt`, footer, about, autor del blog | Solo en español: en/it dan 404. Perfil con `ProfilePage` → `#person`. Páginas de servicio con `Service` → `#organization`. En Madrid, «trabajo desde Madrid, en remoto», sin oficina ni atención presencial. Los ejemplos van etiquetados como Caso de cliente, Proyecto propio o Demostración, sin albaranes. Precios: solo enlaces a `/es/servicios/*`. Se reutilizan las rutas `/es/servicios/*`, porque son fichas de precio y no equivalentes. | Local: 200, `lang="es"`, canonical propio, hreflang `es-ES`/`x-default`, en el sitemap con `lastmod` 2026-10-20. `/en/...` e `/it/...` dan 404 (estado correcto; el cuerpo es el *shell* de error de Next 14, sin `lang` y con el texto pintado en cliente, igual que ya pasaba en `/en/admin`). | Alberto revisa el texto (sobre todo problemas y tipos de proyecto, datos, intervención humana y límites). También: ¿ArchetypeX y Villacastín son de clientes? Ahora figuran como «En mi portfolio». |
| 10 FAQ | **Implementada** | `lib/faq/faq-data.ts`, `components/sections/faq-section.tsx` | Seis preguntas del encargo en primera persona, sin rankings, precios ajenos ni promesas. La interfaz y `FAQPage` salen de la misma fuente. Antes del cambio se comprobó que el acordeón funcionaba con ratón, pero no con teclado (un `div` sin `aria-expanded`) y que las respuestas cerradas no estaban en el DOM. Ahora es un `<button aria-expanded>` y las respuestas siempre están en el HTML. | Tests (24) y local: botones y respuestas en el HTML, que coinciden con el JSON-LD. Con Playwright, clic y Enter abren y cierran. | Revisión editorial de las traducciones en/it. |
| 11 Caso Ferdy | **Pendiente de dato** (texto listo, sin publicar) | `docs/audit-fixes-2026-10-20/ferdy/{es,en,it}.mdx` + `README.md`. Código: `lib/blog/post-dates.ts`, `posts-runtime`, sitemap, JSON-LD, OG | Texto revisado: sin «pocas semanas» ni «volveremos en 3 meses», sin la comparativa de precios de agencias. Tres apartados: Funciones entregadas, Lo que observa Ferdy y Resultados medidos («no hay métricas publicables a 20/10/2026»). Se mantienen la URL y el testimonio real. Nuevo campo opcional `updated` en el frontmatter, que alimenta `dateModified`, el `lastmod` del sitemap y `og:modified_time`. | Tests del campo `updated`. Frontmatter idéntico al original salvo `updated: 2026-10-20`. | El post vive en el volumen de producción, no en git: **lo publica Alberto** con los pasos del README. Pendiente de Ferdy o la analítica: métricas reales. `description` en es/it todavía promete «números». |
| 12 `/docs` | **Implementada** (privacidad: **decisión pendiente**) | `app/[locale]/docs/**`, `lib/sitemap-generator.ts`, `app/llms.txt/route.ts` | La intención documentada es «documentación interna… no aparece en la navegación pública». Se aplica `noindex, follow` a todas las páginas de docs y se retiran del sitemap y de `llms.txt`. Robots sigue permitiendo leer la directiva. No se toca el acceso. | Local: meta `noindex` en `/es/docs` y sin `/docs` en el sitemap. | Alberto decide si debe ser privada; si es así, necesita autenticación, no `robots`. |
| 13 Host del portfolio | **Pendiente de acceso** | `docs/audit-fixes-2026-10-20/nginx-www-e2dprojects.md` (copia en `projects-hub/docs/ops/`) | Instrucción nginx concreta: bloque `www` con `301 https://e2dprojects.com$request_uri`, se quita `www` del bloque principal y el puerto 80 redirige en un solo salto. El certificado ya cubre `www`. | Comprobado el estado actual (`www` responde 200) y los SAN del certificado. No se aplicó porque es infraestructura de producción. | Alberto aplica, ejecuta `nginx -t`, recarga y verifica con los `curl` del documento y `certbot renew --dry-run`. |
| 14 Validación final | **Implementada** (en local) | `docs/audit-fixes-2026-10-20/entrega.md` | Grafos, canonical, hreflang, sitemap (sin `/docs`, con las 3 páginas nuevas y fechas reales), robots, enlaces, contacto y acordeón. | Build y 97 comprobaciones HTTP + 10 de navegador en verde. `tsc` y lint: ningún error nuevo (los restantes ya existían). | Repetir la verificación en producción tras desplegar (comandos abajo). |

## Datos pendientes de Alberto

1. ~~Perfiles~~: confirmados el 20/10/2026 y publicados. Google Business Profile: **descartado por ahora** (decisión de Alberto, 20/10/2026; el perfil existe pero su chincheta aparece en el mar y no hay enlace de compartir a mano). Si se recupera, recordar que Google solo lo admite para negocios con contacto presencial con clientes (en su local o en el del cliente); un negocio que solo trabaja en remoto no es elegible. Si existe o se crea legítimamente, su enlace va en `ORGANIZATION_SAME_AS` (en `lib/seo/entities.ts` y `lib/entities.ts` del portfolio). El pie del portfolio menciona «LinkedIn @evolve2digital»: no se ha recibido ninguna página de empresa de LinkedIn, así que conviene revisar ese texto.
2. Formación: el `alumniOf` (UPM) se ha retirado del marcado hasta que se confirme.
3. Métricas del caso Ferdy, y si se publica el texto revisado (ver `ferdy/README.md`).
4. Si `/docs` debe ser privada.
5. Una URL inexistente bajo `/en` o `/it` (p. ej. `/en/typo`) muestra el 404 raíz en español: el `not-found` raíz no conoce el idioma. Es opcional resolverlo con una cabecera del middleware.
6. Revisión editorial de: FAQ (en/it), las tres páginas nuevas y las páginas legales en/it.
7. Datos que siguen publicados sin evidencia en el repo y que conviene confirmar: `foundingDate: 2023` y `numberOfEmployees: 1-10` (Organization), y `knowsAbout` con «Python» y «bases de datos vectoriales» (Person, el mismo texto que la sección «Sobre mí» de la web).

## Publicación (lo ejecuta Alberto, siguiendo el flujo del proyecto)

e2d-website-v2 (una PR por rama a `develop`, en este orden):

```bash
git push -u origin feature/legal-pages-i18n
```

```bash
git push -u origin fix/audit-2026-10-20
```

Después, el despliegue habitual (build, `pm2 restart e2d`, `pm2 logs e2d`) y, a continuación, un rebuild **Incremental** del índice RAG en `/admin/embeddings`: el asistente indexa la FAQ (`lib/rag/sources.ts`) y, sin rebuild, seguiría citando las respuestas antiguas (rankings y precios ajenos). Para verificar en producción:

```bash
for p in es en it en/cookies it/cookies es/alberto-carrasco; do curl -s https://evolve2digital.com/$p | grep -o '<html lang="[a-z]*"' | head -1; done
```

```bash
curl -s https://evolve2digital.com/robots.txt | grep -c "Allow: /_next/static/"
```

```bash
curl -s https://evolve2digital.com/es | grep -c 'id="contact"'
```

projects-hub (no tiene remoto: se fusiona en local y se despliega con `deploy.sh`):

```bash
git -C /root/projects-hub log --oneline main..fix/auditoria-identidad-enlaces
```

En el portfolio, el nodo Organization usa ahora el mismo `name` y `alternateName` que la corporativa (`E2D - Evolve2Digital` / `E2D`). Solo el portfolio publica `telephone`; la corporativa lo omitió a propósito en su día.
