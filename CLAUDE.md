# CLAUDE.md — E2D (Evolve2Digital) Website

> Instrucciones para Claude Code. Leer al inicio de cada sesión. No borrar ni mover.

---

## Visión General del Proyecto

Plataforma web corporativa de Evolve2Digital. Next.js 14 full-stack con App Router, TypeScript, Tailwind CSS, next-intl (es/en/it), Contentlayer/MDX para blog, SQLite para OAuth, y una capa MCP/OAuth 2.1 para integración con asistentes IA.

Monolito modular: un único deploy con fronteras internas claras por dominio. No hay backend separado — los route handlers de Next.js actúan como BFF.

---

## ⚠️ SERVICIOS QUE NO EXISTEN EN ESTE ENTORNO

Los siguientes servicios estaban en n8n/Raspberry Pi a través de api.evolve2digital.com y HAN SIDO ELIMINADOS. No llamar a estas URLs. No asumir que funcionan:

- E2D_CHAT_WEBHOOK_URL → el chat proxy hacia n8n está muerto
- Webhook de presupuesto → /api/admin/budget apuntaba a https://api.evolve2digital.com/webhook/budget, no existe
- Agente IA externo → agent.query delegaba a un webhook externo, no existe

Estos servicios se van a reimplementar como código propio en este servidor. Hasta que existan, las rutas que los usan deben devolver errores controlados, no llamadas a URLs muertas.

---

## Stack

- Framework: Next.js 14, App Router, React 18, TypeScript 5
- UI: Tailwind CSS, Radix UI, Framer Motion, Three.js
- i18n: next-intl — locales: es, en, it
- Contenido: Contentlayer2, MDX, gray-matter
- Auth admin: JWT HS256, cookies HTTP-only
- OAuth MCP: OAuth 2.1 + PKCE, SQLite (better-sqlite3) en data/oauth.sqlite
- Testing: Jest, Testing Library, cobertura mínima 85%
- Servidor: PM2, Node.js v22, sin Vercel

---

## Estructura

- app/ — rutas y API handlers (BFF)
- components/ — UI por dominio (ui/, blog/, admin/, docs/, seo/)
- lib/ — servicios server-side y utilidades
- content/ — posts MDX
- scripts/ — build automation (pull-content, ai-indexing)
- data/ — oauth.sqlite (no borrar, no commitear)
- tasks/ — gestión de tareas activas y lecciones aprendidas

---

## Variables de Entorno

Todas en .env. Nunca en código fuente.

Variables activas:
- NODE_ENV, PORT
- ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, E2D_ADMIN_USERS
- MCP_ADMIN_PASSWORD, E2D_MCP_API_KEY
- JWT_SECRET, OAUTH_DEBUG
- CRON_SECRET
- NEXT_PUBLIC_BASE_URL
- E2D_CHAT_WEBHOOK_URL — ⚠️ servicio muerto, no usar
- E2D_CHAT_USER, E2D_CHAT_PASSWORD — ⚠️ servicio muerto, no usar

---

## Dos Sistemas de Auth — No Mezclar

1. Admin: credenciales env → cookie admin_session JWT. Protege /admin y /api/admin.
2. MCP/OAuth: OAuth 2.1 + PKCE → bearer token → scopes por endpoint. Protege /api/mcp y /sse.

---

## Principios de Código

- Server Components por defecto. "use client" solo para interactividad real.
- SOLID — los cinco, siempre.
- DRY — ningún bloque de lógica repetido sin abstraer.
- Funciones: 40 líneas máx. Componentes: 150 líneas máx. Archivos: 300 líneas máx.
- TypeScript estricto: any prohibido sin comentario justificado.
- Early returns sobre nesting. Máx 2 niveles dentro de una función.
- Comentarios explican por qué, no qué.
- Catch blocks nunca vacíos. console.log como único error handling prohibido.

---

## Workflow

### 1. Plan primero
- Para cualquier tarea no trivial (3+ pasos o decisión arquitectural): entrar en modo plan.
- Escribir el plan en tasks/todo.md con items chequeables antes de tocar código.
- Confirmar antes de implementar.

### 2. Loop de mejora
- Tras cualquier corrección: actualizar tasks/lessons.md con el patrón aprendido.
- Revisar tasks/lessons.md al inicio de cada sesión.

### 3. Verificación antes de cerrar
- Nunca marcar tarea completa sin demostrar que funciona.
- Revisar logs de PM2 después de cualquier cambio que afecte runtime.

### 4. Git
- Prefijos: feat: · fix: · refactor: · docs: · chore:
- No mezclar cambios funcionales y de formato en el mismo commit.
- Rama de trabajo: develop

---

## Persistencia y Estado

- Archivos: blog MDX en content/, documentación en docs/
- SQLite: data/oauth.sqlite — stateful, no mover, hacer backup antes de cambios
- Cookies: admin_session, NEXT_LOCALE, cookies PKCE temporales
- localStorage: sessionId del chat (cliente)
- Memoria de proceso: checkout provisional usa Map — no sobrevive reinicios de PM2

---

## Build

El build tiene 3 fases secuenciales (ver package.json scripts):
1. pull-content — sincroniza contenido externo
2. next build — compilación
3. build-ai-indexing-advanced — regenera índices SEO/AI

Tras cualquier deploy: pm2 restart e2d y revisar pm2 logs e2d.

---

_Actualizar este archivo cuando cambien convenciones, estructura o contexto del proyecto._
