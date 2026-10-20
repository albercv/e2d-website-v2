# Audit fixes 2026-10-20 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 14 findings of the public audit of evolve2digital.com and e2dprojects.com without changing design or existing behaviour beyond what each finding requires.

**Architecture:** One branch per repo. In e2d-website-v2, every shared fact about the two entities (IDs, URLs, verified profiles, contact anchor) moves to `lib/seo/entities.ts`; JSON-LD of the site layout becomes one `@graph` built by the existing `JsonLdGenerator`; `<html lang>` comes from the `[locale]` root layout (pass-through `app/layout.tsx`, the pattern next-intl documents for Next 14). In projects-hub, the single JSON-LD emitter adopts the same IDs and a Person node.

**Tech Stack:** e2d-website-v2: Next.js 14.2.33 App Router, next-intl 4, TypeScript, Tailwind, Jest 29 (`next/jest`), npm. projects-hub: Next.js 16.2.6, next-intl 4.14.5, React 19, Jest 30, pnpm.

**Spec:** `docs/audit-fixes-2026-10-20/encargo.md` (literal brief). Delivery report: `docs/audit-fixes-2026-10-20/entrega.md` (written last).

## Global Constraints

- Branch e2d: `fix/audit-2026-10-20`, stacked on `feature/legal-pages-i18n` (unpushed; it already translates `/en|it/cookies`). Task branches: `fix/audit-<slug>` cut from `fix/audit-2026-10-20`; the controller merges them back.
- Branch portfolio: `fix/auditoria-identidad-enlaces` from `main` in worktree `/root/projects-hub-b4c230e4590277af/audit-identidad-enlaces`.
- NEVER: `git push`, merge into develop/main, PM2/DB/nginx reload, writes under `/var/lib/e2d-content`, any command inside `/root/e2dProject/e2d-website-v2` or `/root/projects-hub` (production checkouts).
- Commits: English, prefix `feat:`/`fix:`/`refactor:`/`docs:`/`test:`/`chore:`, body sections `Scope:` / `Problem:` / `Solution:` / `Notes:`. NO `Co-Authored-By`, NO "Generated with Claude Code".
- e2d tests: `BLOG_POSTS_DIR=$(mktemp -d) npx jest <paths>`. Pre-existing failures to ignore (no `.env` in worktrees): `__tests__/api/answers.test.ts`, `__tests__/api/mcp-streamable.test.ts`, `__tests__/api/register.test.ts`, `__tests__/components/blog/contact-cta.test.tsx`.
- CLAUDE.md limits: functions ≤ 40 lines, components ≤ 150, new files ≤ 300; no `any` without justifying comment; comments say why; no empty catch.
- IDs (exact): `https://evolve2digital.com#organization`, `https://evolve2digital.com#person`, website `https://evolve2digital.com#website`.
- Verified profiles: Person.sameAs = `["https://github.com/albercv"]` only (GitHub API: login albercv, company "Evolve2digital", owner of the repo). `github.com/albertocarrasco` belongs to "Alberto Carrasco García (libnova)" → wrong person. LinkedIn `es.linkedin.com/in/albercv` and brand profiles (IG/TikTok/LinkedIn `@evolve2digital`) NOT verifiable → not published. Organization.sameAs omitted. No X/Twitter.
- Location: `addressCountry: "ES"`, `addressLocality: "Madrid"` (published as "Domicilio: Madrid, España" in `lib/legal/content/legal-notice/es.ts`). `areaServed: ["ES", "EU"]` on both sites (portfolio already declares it; bio: "empresas de España y el norte de Europa"). No street, no office, no in-person service claims.
- Never invent: prices, deadlines, metrics, percentages, revenue, testimonials, contract rights, support terms, years of experience, education. Only published prices may be linked: `/es/servicios/*` (chatbot pack 1500 €, integración 300 €, consultoría 500/1500/3000 €, dashboard 1500 €).
- Spanish copy: perfect orthography and accents; Alberto writes in first person singular.
- Portfolio URLs from corporate: es → `https://e2dprojects.com/es/`, en → `https://e2dprojects.com/en/`, it → `https://e2dprojects.com/en/` (portfolio has no Italian).
- Corporate URLs from portfolio: es → `https://evolve2digital.com/es`, en → `https://evolve2digital.com/en`.
- Profile URL: `https://evolve2digital.com/es/alberto-carrasco`. New pages are Spanish only: `/en|it/<slug>` → `notFound()` (prerendered 404 — never `redirect()` inside a page, see tasks/lessons.md 2026-09-28).

### Verified fact sheet (the only facts copy may use)

- Alberto Carrasco: titular of evolve2digital.com, domicilio Madrid (aviso legal). Developer and founder of Evolve2Digital; "Diseño, programo y despliego personalmente cada proyecto: hablas directamente con quien escribe el código" (portfolio bio). Works with companies in Spain and Northern Europe. Languages ES · EN.
- Stack in his own code: React, Next.js, TypeScript, Node.js, PostgreSQL, Java Spring Boot, Groovy/Grails (GitHub bio), n8n, APIs of OpenAI / Anthropic Claude / Google Gemini / DeepSeek, WhatsApp API, Stripe.
- Client projects with public domain: Ferdy · Coach del desamor — ferdycoachdesamor.com (web a medida: páginas de programas, reserva y pago con Stripe, venta y entrega automática de ebooks, emails transaccionales automáticos, edición de contenidos sin programador; testimonio real en vídeo en el post del caso). August Collection — augustore.es (e-commerce). Åby Foods — abyfoods.fi (web corporativa). Also in portfolio: ArchetypeX — archetypex.es; Casa de Villacastín — e2dprojects.com/villacastin/.
- Client project without public domain: dashboard for a WhatsApp bot (statistics, conversation viewer).
- Own projects (not client cases): evolve2digital.com itself — blog published from Claude through his own MCP connector (post `llevo-meses-sin-abrir-el-editor-de-mi-blog-publico-hablando-con-claude`), site assistant answering from the blog content; e2dprojects.com portfolio.
- Analyses/demos (not client cases): post `automatizaciones-para-empresas-con-ia-dos-casos-reales` analyses two Claude Code skills (SEO audit, video analysis).
- No delivery-note ("albaranes") flow exists anywhere: do not mention one.
- Ferdy case URLs: es `/es/blog/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy`, en `/en/blog/from-fielding-curious-visitors-to-closing-clients-ferdys-website`, it `/it/blog/da-rispondere-ai-curiosi-a-chiudere-clienti-il-sito-di-ferdy`.
- Contact: `hello@evolve2digital.com`; WhatsApp via `getWhatsAppHref()` (`lib/contact/whatsapp.ts`, hidden when `NEXT_PUBLIC_WHATSAPP_NUMBER` unset); form = existing `ContactModal`.

## Review Focus

1. Routes outside `[locale]` (`/admin/*`, `/authorize/page`, `/es/servicios/*`, `/es/legal/devoluciones`, unknown URLs) must still render a full `<html><body>` after `app/layout.tsx` stops rendering it → Task 2 pins each layout and the root `not-found`.
2. `/_next/data/*` and `/api/*` private paths must stay disallowed while `/_next/static/*` and `/_next/image?url=…` (with query) become allowed, for every group and for an unknown bot falling back to `*` → Task 1 effective-rules test.
3. A blog post whose `author` is not "Alberto Carrasco" must not be attached to `#person` → Task 3 test `foreign author is not linked to #person`.
4. FAQ answers must be in the server HTML while closed and keyboard-toggleable, and the FAQPage JSON-LD text must equal the visible text → Task 4 tests.
5. `/en/alberto-carrasco` (and the two service slugs) must answer 404, and the language switcher on the Spanish-only pages must lead to `/en` and `/it`, not to a 404 → Task 8 tests.

---

## Wave 1 (parallel, disjoint files)

### Task 1: Effective robots rules for `/_next/static/` and `/_next/image` (Haiku)

**Files:**
- Modify: `app/robots.ts`, `package.json`, `package-lock.json`
- Test: `__tests__/app/robots-effective.test.ts` (new), keep `__tests__/app/robots.test.ts` green

**Interfaces:** Produces nothing for other tasks.

- [ ] **Step 1:** `npm install --save-exact robots-parser@3.0.1` (must land in `dependencies` as `"robots-parser": "3.0.1"` — the audit-landing session adds the identical line).
- [ ] **Step 2: Write failing test** `__tests__/app/robots-effective.test.ts` (`@jest-environment node`). Serialize with `resolveRobots` from `next/dist/build/webpack/loaders/metadata/resolve-route-data` (the serializer Next itself uses) and evaluate with `robots-parser`:
  - `every group that disallows /_next/ also allows /_next/static/ and /_next/image` (structural, over `robots().rules`).
  - `public assets are allowed for every agent`: for agents `["Googlebot","Bingbot","GPTBot","OAI-SearchBot","Google-Extended","ClaudeBot","ChatGPT-User","PerplexityBot","Applebot-Extended","SomeUnknownBot"]`, `isAllowed` is true for `https://evolve2digital.com/_next/static/chunks/app/page-0123abcd.js`, `https://evolve2digital.com/_next/static/css/0123abcd.css`, `https://evolve2digital.com/_next/image?url=%2Fe2d_logo.webp&w=256&q=75`, `https://evolve2digital.com/es`.
  - `private paths stay blocked`: for the same agents, false for `/_next/data/build-id/es.json`, `/admin/`, `/api/admin/rebuild`, `/private/x`; and false for `/api/chat/x` for `Googlebot`, `Bingbot`, `SomeUnknownBot`.
  - `MCP discovery and training preferences unchanged`: true for `/api/mcp` and `/.well-known/oauth-authorization-server` for GPTBot, ClaudeBot, ChatGPT-User; true for `/es/blog/` for GPTBot and Google-Extended.
- [ ] **Step 3:** Run, expect the two allow tests to FAIL.
- [ ] **Step 4:** In `app/robots.ts` add `const NEXT_PUBLIC_ASSETS_ALLOW = ["/_next/static/", "/_next/image"]` and spread it into `allow` of every rule (all nine include `/_next/` in disallow). Do not touch disallow lists or add agents.
- [ ] **Step 5:** Run both robots test files → PASS.
- [ ] **Step 6:** Commit `fix: allow public Next.js assets in every robots.txt group`.

### Task 2: `<html lang>` from the real locale (Sonnet)

**Files:**
- Create: `components/layout/html-document.tsx`, `app/admin/layout.tsx`, `app/authorize/layout.tsx`, `app/es/layout.tsx`, `app/not-found.tsx`
- Modify: `app/layout.tsx`, `app/[locale]/layout.tsx`
- Delete: `components/layout/lang-attribute.tsx`, `__tests__/components/lang-attribute.test.tsx`
- Test: `__tests__/app/html-lang.test.tsx` (new)

**Interfaces:**
- Produces: `HtmlDocument({ lang, children }: { lang: string; children: React.ReactNode }): JSX.Element` — renders `<html lang={lang} className="dark">`, the current `<head>` preconnect/dns-prefetch links, `<body>` with the Inter/JetBrains_Mono font variables and classes, `PreloadResources`, `GoogleAnalytics`, `ApolloTracker`, `OpenAIPixel`, then children. Fonts (`next/font/google`) move to this module scope.

- [ ] **Step 1: Write failing tests** in `__tests__/app/html-lang.test.tsx` (`@jest-environment node`, render with `react-dom/server` `renderToStaticMarkup`; mock the four analytics/preload components and `next/font/google` as needed):
  - `HtmlDocument renders <html lang> from its prop` for "es", "en", "it".
  - `locale layout passes the route locale to <html>`: `await LocaleLayout({ children: <p/>, params: { locale: "en" } })` rendered contains `<html lang="en"` (mock `components/seo/json-ld`, `components/gdpr/cookie-banner`, `components/debug/debug-provider`).
  - `root layout does not render <html>`: `RootLayout({ children: <p>x</p> })` returns the children only (markup `<p>x</p>`).
  - `non-locale trees have their own document`: `app/admin/layout`, `app/authorize/layout`, `app/es/layout` and `app/not-found` each render `<html lang="es"`.
- [ ] **Step 2:** Run → FAIL (modules missing).
- [ ] **Step 3:** Implement. `app/layout.tsx` keeps its `metadata` export and returns `children` with a comment explaining next-intl's pass-through root layout. `app/[locale]/layout.tsx` wraps its current tree in `<HtmlDocument lang={locale}>` and drops `LangAttribute`. `app/not-found.tsx`: Spanish 404 inside `HtmlDocument lang="es"` with a link to `/es` (styling from existing Tailwind tokens). Check `app/` for any other top-level folder containing `page.tsx` outside `[locale]` (current list: `admin`, `authorize`, `es`, root `page.tsx` which only redirects) and give each a layout.
- [ ] **Step 4:** Run new test + `__tests__/components/navigation.test.tsx __tests__/components/lazy-sections-ssr.test.tsx` → PASS.
- [ ] **Step 5:** `npx tsc --noEmit -p tsconfig.json` → no new errors in touched files.
- [ ] **Step 6:** Commit `fix: render <html lang> from the route locale`.

### Task 3: Shared entities and one JSON-LD graph (Sonnet)

**Files:**
- Create: `lib/seo/entities.ts`
- Modify: `lib/json-ld-generator.ts`, `components/seo/json-ld.tsx`, `app/[locale]/layout.tsx` (only the three schema lines → one; Task 2 edits the same file in parallel, the controller resolves the merge)
- Delete: `components/seo/person-schema.tsx` (unused)
- Test: `__tests__/lib/jsonld-entities.test.ts` (new)

**Interfaces:**
- Produces in `lib/seo/entities.ts`:
  `SITE_URL = "https://evolve2digital.com"`, `ORGANIZATION_ID`, `PERSON_ID`, `WEBSITE_ID`, `PERSON_NAME = "Alberto Carrasco"`, `PERSON_PROFILE_PATH = "/es/alberto-carrasco"`, `PERSON_PROFILE_URL`, `PERSON_SAME_AS: readonly string[] = ["https://github.com/albercv"]`, `AREA_SERVED = ["ES", "EU"] as const`, `CONTACT_ANCHOR = "contact"`, `PORTFOLIO_URL_BY_LOCALE: Record<"es"|"en"|"it", string>`, `organizationRef(): { "@id": string }`, `personRef(): { "@id": string }`.
- Produces in generator: `JsonLdGenerator#generateSiteGraph(locale: string): { "@context": string; "@graph": object[] }` (Organization, Person, WebSite, Service catalogue as nodes without their own `@context`); `components/seo/json-ld.tsx` exports `SiteGraphSchema({ locale })`, `BreadcrumbSchema`, `BlogPostSchema` (Organization/Service/Website schema components removed).

- [ ] **Step 1: Write failing tests** `__tests__/lib/jsonld-entities.test.ts` (node env), for each locale es/en/it over `generateSiteGraph(locale)`:
  - `every Organization node or reference uses ORGANIZATION_ID` and `every Person node or reference uses PERSON_ID` (walk the object; any object with `@type` Organization/Person or referenced from `founder|worksFor|publisher|provider|author|creator` must carry the right `@id`).
  - `no unverified profile is published`: serialized graph contains none of `albertocarrasco`, `twitter.com`, `x.com/`, `linkedin.com`; Person.sameAs equals `PERSON_SAME_AS`; Organization has no `sameAs` key.
  - `old identifiers are gone`: serialized graph matches neither `#org"` nor `/#organization`.
  - `location is a locality, coverage is areaServed`: Organization.address equals `{ "@type": "PostalAddress", addressCountry: "ES", addressLocality: "Madrid" }`; `areaServed` equals `["ES","EU"]`; no `serviceArea`; no `alumniOf` on Person.
  - `contact action points at the home contact section`: Organization.potentialAction.target === `https://evolve2digital.com/${locale}#contact`.
  - `website search uses the blog q param`: urlTemplate === `https://evolve2digital.com/${locale}/blog?q={search_term_string}`.
  - `no fabricated modification dates`: no `dateModified` inside Organization.hasPart.
  - Blog: `generateBlogPostSchema` with author "Alberto Carrasco" → `author["@id"] === PERSON_ID`, `author.url === PERSON_PROFILE_URL`, `publisher["@id"] === ORGANIZATION_ID`; **`foreign author is not linked to #person`**: author "Otra Persona" → author has no `@id`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `lib/seo/entities.ts` and refactor `defaultJsonLdConfig`/generator to read from it: remove `albertocarrasco` profiles, Organization `sameAs`, `serviceArea`, Person `alumniOf` (no evidence — listed as pending data), `hasPart[].dateModified`; founder → `personRef()` plus `name`; Person `url`/`mainEntityOfPage` → `PERSON_PROFILE_URL`, `worksFor` → `organizationRef()`; WebSite gets `@id: WEBSITE_ID`, `publisher: organizationRef()`, search `?q=`; Service `provider: organizationRef()`; BlogPosting author gets `@id`/profile url only when `post.author === PERSON_NAME`. `SiteGraphSchema` renders one `<script type="application/ld+json">`; layout uses it instead of the three components.
- [ ] **Step 4:** Run new test + `grep -rn "albertocarrasco\|#org\"" app components lib` → test PASS, grep empty.
- [ ] **Step 5:** Commit `fix: unify JSON-LD entity ids and publish only verified profiles`.

### Task 4: FAQ from one verified source, accessible accordion (Sonnet)

**Files:**
- Modify: `lib/faq/faq-data.ts`, `components/sections/faq-section.tsx`
- Test: `__tests__/components/faq-section.test.tsx` (new)

**Interfaces:** Consumes `SITE_URL` from Task 3 only as a literal (`https://evolve2digital.com`) to avoid cross-task dependency; `FAQ_DATA` keeps its exported shape.

- [ ] **Step 1: Verify current accordion** before changing it: it works by mouse; record that the trigger is a `div` (not focusable, no `aria-expanded`) and closed answers are not in the DOM. Write this finding in the commit `Problem:`.
- [ ] **Step 2: Write failing tests** (jsdom, wrap in `NextIntlClientProvider` locale es/en/it like `__tests__/components/navigation.test.tsx`):
  - `renders one button per question with aria-expanded=false and aria-controls pointing at its answer`.
  - `closed answers are in the DOM` (text of every `FAQ_DATA.es.items[i].answer` present).
  - `click and Enter toggle the answer` (`userEvent.click`, then focus + `{Enter}` toggles `aria-expanded`).
  - `FAQPage JSON-LD equals the visible content`: parse the `application/ld+json` script; `mainEntity[i].name/acceptedAnswer.text` equal `FAQ_DATA[locale].items[i]`; `@id === "https://evolve2digital.com/<locale>#faq"`.
  - `content has no external rankings or third-party prices`: no item text matches `/Góbalo|Sortlist|Q2BSTUDIO|8\.000|45 y 85|€8,000/`.
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4: Rewrite `FAQ_DATA`** es/en/it with exactly these six questions (es wording; translate faithfully to en/it): ¿Quién desarrolla mi proyecto? · ¿Puedes integrar mis herramientas actuales? · ¿Cómo se calcula el presupuesto? · ¿Qué código y documentación se entregan? · ¿Qué mantenimiento necesita la solución? · ¿Dónde puedo ver ejemplos? Answers in first person, only from the fact sheet: who = Alberto personally; integrations = possible when the tool offers an API, webhooks or export, reviewed before quoting, examples CRM/ERP/databases/n8n/payments/WhatsApp; budget = depends on scope, integrations, data and maintenance, cerrado por escrito antes de empezar, reference prices published at `/es/servicios/*` (name them generically, no new figures); code & docs = what is delivered (repository access, documentation, ownership) is set in writing in each proposal — no promises; maintenance = dependencies, third-party API changes, monitoring; terms agreed per project — no support promises; examples = projects section, portfolio e2dprojects.com, Ferdy case post. Keep `sectionTitle`/`sectionSubtitle` meaning.
- [ ] **Step 5: Accordion:** trigger becomes `<button type="button" aria-expanded aria-controls id>` inside an `<h3>`; answer region `role="region" aria-labelledby` always rendered, collapsed with CSS `grid-template-rows: 0fr ↔ 1fr` + `visibility` transition (replace the AnimatePresence mount/unmount); keep current colours, borders, numbers and icons; single-open behaviour unchanged. Add `@id` to FAQPage.
- [ ] **Step 6:** Run new test + `__tests__/components/lazy-sections-ssr.test.tsx` → PASS.
- [ ] **Step 7:** Commit `fix: rewrite FAQ with verifiable answers and an accessible accordion`.

### Task 5: Internal docs out of search results (Haiku)

**Files:**
- Modify: `app/[locale]/docs/page.tsx`, `app/[locale]/docs/[slug]/page.tsx`, `lib/sitemap-generator.ts`, `app/llms.txt/route.ts` (and `app/llms-full.txt/route.ts` if it lists `/docs`)
- Test: update `__tests__/app/docs-stub-noindex.test.ts`, `__tests__/lib/sitemap-generator.docs-real.test.ts`, `__tests__/app/llms-txt.test.ts` if they assert docs

Decision (documented intent): `components/docs/docs-overview.tsx` says "documentación interna técnica… No aparece en la navegación pública" → public but out of results. Access stays public (no auth change); privacy decision left to Alberto.

- [ ] **Step 1: Update tests first:** every docs URL (index and all slugs, all locales) returns `robots: { index: false, follow: true }`; sitemap contains no URL with `/docs`; robots still allows `/es/docs/` for `*` (so crawlers can read the directive); `llms.txt` contains no `/docs/`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: docs index + slug metadata `robots: { index: false, follow: true }`; remove the docs-index push from `generateStaticPages` and `generateDocumentationPages` (and its call); remove the "Documentación" block from llms routes.
- [ ] **Step 4:** Run the touched tests + `__tests__/lib/sitemap-generator*.test.ts` → PASS.
- [ ] **Step 5:** Commit `fix: keep internal docs public but out of search results`.

### Task P1: Portfolio identity, links and IDs (Sonnet, repo projects-hub)

**Files (in `/root/projects-hub-b4c230e4590277af/audit-identidad-enlaces`):**
- Create: `lib/entities.ts`, `docs/ops/2026-10-20-redireccion-www.md` (content given by controller in the dispatch)
- Modify: `app/[locale]/page.tsx` (move `buildJsonLd` to `lib/jsonld.ts` if needed to test it), `app/[locale]/layout.tsx` (authors), `components/about-section.tsx`, `components/projects-section.tsx`, `messages/es.json`, `messages/en.json`
- Test: `__tests__/lib/jsonld.test.ts`, `__tests__/components/about-section.test.tsx`, `__tests__/components/projects-section.test.tsx` (new or extended)

**Interfaces:** `lib/entities.ts`: `ORGANIZATION_ID = "https://evolve2digital.com#organization"`, `PERSON_ID = "https://evolve2digital.com#person"`, `PERSON_PROFILE_URL = "https://evolve2digital.com/es/alberto-carrasco"`, `PERSON_SAME_AS = ["https://github.com/albercv"]`, `CORPORATE_URL_BY_LOCALE = { es: "https://evolve2digital.com/es", en: "https://evolve2digital.com/en" }`.

- [ ] **Step 0:** Read `node_modules/next/dist/docs/` sections relevant to App Router metadata and i18n (AGENTS.md rule). `pnpm install --frozen-lockfile` in the worktree.
- [ ] **Step 1: Failing tests:** JSON-LD graph for es/en: Organization `@id === ORGANIZATION_ID`, `founder: { "@id": PERSON_ID }`; a Person node `{ @id: PERSON_ID, name: "Alberto Carrasco", url: PERSON_PROFILE_URL, worksFor: { @id: ORGANIZATION_ID }, sameAs: PERSON_SAME_AS }`; WebSite `author: { @id: PERSON_ID }`, `publisher: { @id: ORGANIZATION_ID }`; project items `creator: { @id: ORGANIZATION_ID }`; serialized graph has no `/#org`. About section (es) contains text "Soy Alberto Carrasco, desarrollador de software y fundador de Evolve2Digital. e2dProjects es mi portfolio de proyectos." with an `<a href="https://evolve2digital.com/es">Evolve2Digital</a>`; en contains "I'm Alberto Carrasco, a software developer and the founder of Evolve2Digital. e2dProjects is my project portfolio." with href `https://evolve2digital.com/en`. Projects section: every project renders `<a href={p.href}>` with its domain text (external ones `target="_blank" rel="noopener noreferrer"`), and clicking that link does not open the modal.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with `t.rich` for the bio link (keep the rest of bio1 after the two sentences); domain `<span>` becomes `<a>` with `onClick={e => e.stopPropagation()}`; layout `authors: [{ name: "Alberto Carrasco", url: PERSON_PROFILE_URL }]`, `creator: "Alberto Carrasco"`.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm build` (in the worktree only) → green.
- [ ] **Step 5:** Commit(s) `fix: ...` per concern (ids, bio link, project links, docs).

## Wave 2 (after Wave 1 is merged into `fix/audit-2026-10-20`)

### Task 6: Real `#contact` section on the home page (Sonnet)

**Files:**
- Create: `components/sections/contact-section.tsx`
- Modify: `app/[locale]/page.tsx`, `messages/{es,en,it}.json` (new namespace `contactSection` inserted right after `cookies`), `app/es/servicios/*/page.tsx` and `app/es/legal/devoluciones/page.tsx` (`/es#contacto` → `/es#contact`)
- Test: `__tests__/components/contact-section.test.tsx`

**Interfaces:** Consumes `CONTACT_ANCHOR` from `lib/seo/entities.ts`. Reuses `ContactModal` unchanged (the audit-landing session will edit it later — do not touch it).

- [ ] **Step 1: Failing tests:** section has `id={CONTACT_ANCHOR}` and a heading; `mailto:hello@evolve2digital.com` link; WhatsApp link present with `NEXT_PUBLIC_WHATSAPP_NUMBER=34600000000` and absent when unset; "open form" button opens the dialog (LeadForm visible); es/en/it labels come from messages; no `#contacto` left: `grep -rn "#contacto" app components` empty (assert in test via fs read of the 7 files).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement a small client section styled like the existing sections (container, heading sizes, `#05b4ba` accent), tracking clicks like the footer (`track("email_click"|"whatsapp_click", { link_location: "contact_section", locale })` — extend the `link_location` union in `lib/analytics/track.ts` if it is typed). Render it at the end of `<main>` in the home page, server-rendered (not lazy).
- [ ] **Step 4:** Tests PASS (+ `__tests__/components/footer-track.test.tsx`).
- [ ] **Step 5:** Commit `fix: add a real contact section behind the JSON-LD ContactAction`.

### Task 7: Navigable project links and portfolio link (Sonnet)

**Files:**
- Modify: `components/sections/projects-section.tsx`, `messages/{es,en,it}.json` (`projects` namespace only)
- Test: `__tests__/components/projects-section.test.tsx`

**Interfaces:** Consumes `PORTFOLIO_URL_BY_LOCALE`.

- [ ] **Step 1: Failing tests** (es/en/it): cards link `https://abyfoods.fi`, `https://augustore.es`, `https://ferdycoachdesamor.com` (`target="_blank" rel="noopener noreferrer"`); the Ferdy card also links its case post for the locale (fact sheet URLs); the WhatsApp dashboard card has no external link; a section-level link to `PORTFOLIO_URL_BY_LOCALE[locale]` with localized text naming e2dProjects.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement as plain `<a>` elements (no click handlers), keep card layout; new message keys `projects.visitSite`, `projects.readCase`, `projects.portfolioCta`.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat: link project cards and the portfolio from the projects block`.

### Task 10: Truthful modification dates + revised Ferdy case (Sonnet)

**Files:**
- Modify: `lib/blog/posts-runtime.ts` (parse optional frontmatter `updated`), `lib/json-ld-generator.ts` (`fromContentlayerPost` → `dateModified: post.updated ?? post.date`), `lib/sitemap-generator.ts` (blog `lastModified: updated ?? date`), the blog post page/metadata if it emits `modifiedTime`
- Create: `docs/audit-fixes-2026-10-20/ferdy/{es,en,it}.mdx`, `docs/audit-fixes-2026-10-20/ferdy/README.md`
- Test: extend `__tests__/lib/posts-runtime.test.ts`, `__tests__/lib/sitemap-generator.test.ts`

- [ ] **Step 1: Failing tests:** a post with `updated: 2026-10-20` exposes `updated`, sitemap `lastModified` is 2026-10-20 and BlogPosting `dateModified` is `2026-10-20`; a post without it keeps `date` for both.
- [ ] **Step 2–4:** Implement minimal parsing (string, ignore invalid dates), run → PASS, commit `feat: honour an optional updated date in blog frontmatter`.
- [ ] **Step 5: Revised case texts.** Read (read-only) `/var/lib/e2d-content/posts/{de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy,from-fielding-curious-visitors-to-closing-clients-ferdys-website,da-rispondere-ai-curiosi-a-chiudere-clienti-il-sito-di-ferdy}.mdx`. Write full replacements keeping frontmatter keys/values byte-identical (slug, locale, translationKey, date, cover, tags, published) plus `updated: 2026-10-20`, and the `[video:testimonio]` marker and the existing quote verbatim. Body changes only: remove "pocas semanas en producción" and "volveremos en 3 meses"; remove the unsourced agency comparison (8.000–15.000 €, 3–5 meses); split into "Funciones entregadas" (fact sheet list), "Lo que observa Ferdy" (the existing qualitative observations, labelled as his observation, not a measurement) and "Resultados medidos" ("A 20 de octubre de 2026 no hay métricas medidas publicables…" + list of the metrics pending from Ferdy/analytics). Keep author's own claims (plazo 1 mes, desde 3.000 €). README: what changed, data pending, and exact apply steps for Alberto (backup copy, replace via MCP `posts_update_body` per locale plus manual `updated:` line, refresh `logs/ferdy-baseline.*`). Never write to `/var/lib/e2d-content`.
- [ ] **Step 6:** Commit `docs: revised Ferdy case ready to publish`.

## Wave 3 (after Tasks 3, 5, 6 are merged)

### Task 8: Professional profile page `/es/alberto-carrasco` (Sonnet)

**Files:**
- Create: `app/[locale]/alberto-carrasco/page.tsx`, `components/pages/spanish-only-page.tsx` (shared shell: Navigation, `LocaleAlternatesProvider` with `{ es: "/es/<slug>", en: "/en", it: "/it" }`, main, Footer), `components/pages/profile/*.tsx`, `lib/seo/static-pages.ts`
- Modify: `app/layout.tsx` (metadata `authors: [{ name: "Alberto Carrasco", url: PERSON_PROFILE_URL }]`), `lib/sitemap-generator.ts`, `app/llms.txt/route.ts`, `components/blog/blog-post.tsx` (author name links to the profile when author is Alberto), `components/sections/about-section.tsx` (link to profile; en/it label says it is in Spanish, `hrefLang="es"`), `components/layout/footer.tsx` (es only: profile + service links)
- Test: `__tests__/app/spanish-only-pages.test.tsx`, extend `__tests__/lib/sitemap-generator.test.ts`

**Interfaces:**
- Produces `lib/seo/static-pages.ts`: `export const SPANISH_ONLY_PAGES: { slug: "alberto-carrasco" | "desarrollo-software-madrid" | "automatizacion-procesos-ia"; lastModified: string }[]` (lastModified `"2026-10-20"` = content date, not build date) and `spanishOnlyMetadata({ slug, title, description }): Metadata` (canonical `https://evolve2digital.com/es/<slug>`, `languages: buildHreflangLanguages({ es: url })`, OG `es_ES`, robots index).
- Produces `SpanishOnlyPage({ slug, children })` shell.

- [ ] **Step 1: Failing tests:** `generateMetadata` canonical/hreflang/title/description per slug; page with `params.locale = "en"` calls `notFound()`; ProfilePage JSON-LD `mainEntity: { "@id": PERSON_ID }`, `url`, `inLanguage: "es-ES"`; page contains links to `/es/desarrollo-software-madrid`, `/es/automatizacion-procesos-ia`, `/es#contact`, `https://github.com/albercv`, `https://e2dprojects.com/es/`; sitemap contains the profile URL with `lastModified` 2026-10-20 and alternates `{ "es-ES", "x-default" }` only.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Content** (Spanish, first person, fact sheet only): who I am and my relation with Evolve2Digital; specialties; verifiable experience (stack + shipped projects with links, own projects clearly labelled as own); confirmed profiles (GitHub only); contact (link to `/es#contact`, email). No years, no education, no LinkedIn.
- [ ] **Step 4:** PASS; also run Task 2/3 tests. **Step 5:** Commit `feat: add Alberto Carrasco profile page linked to #person`.

### Task 9: Service pages `/es/desarrollo-software-madrid` and `/es/automatizacion-procesos-ia` (Sonnet)

**Files:**
- Create: `app/[locale]/desarrollo-software-madrid/page.tsx`, `app/[locale]/automatizacion-procesos-ia/page.tsx`, `components/pages/software/*.tsx`, `components/pages/automation/*.tsx`
- Modify: `lib/seo/static-pages.ts` (already lists them), `lib/sitemap-generator.ts` (entries appear only now), `app/llms.txt/route.ts`, `components/sections/services-section.tsx` (es only: "Más información" links to the two pages)
- Test: extend `__tests__/app/spanish-only-pages.test.tsx`

**Interfaces:** Consumes `SpanishOnlyPage`, `spanishOnlyMetadata`, `ORGANIZATION_ID`.

- [ ] **Step 1: Failing tests:** same metadata/404/sitemap assertions as Task 8 for both slugs; Service JSON-LD `provider: { "@id": ORGANIZATION_ID }`; Madrid page `areaServed` includes `{ "@type": "AdministrativeArea", "name": "Comunidad de Madrid" }` and no `address`/`PostalAddress`; each page links the other, the profile, `/es#contact` and at least one `/es/servicios/*` price page; automation page text contains the three labels "Caso de cliente", "Proyecto propio", "Demostración" and does not contain "albarán".
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Content.** Software page: problems it solves, project types, process, integrations, budget criteria (factors + link to published prices, no new figures), examples (fact sheet), maintenance; Madrid framing = "trabajo desde Madrid con empresas de la Comunidad de Madrid y del resto de España, en remoto"; no office, no in-person promise, no municipality list. Automation page: concrete processes (lead capture and qualification, transactional emails, bookings/payments, assistant over own content, publishing), connectable tools, data needed, human-in-the-loop, limits, maintenance; each example labelled Caso de cliente / Proyecto propio / Demostración per fact sheet.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat: add software development and AI automation service pages`.

## Wave 4: Verification and delivery (controller)

- [ ] Full jest run; `npx tsc --noEmit`; `npm run lint`.
- [ ] `npx next build` in the worktree; `PORT=3091 node .next/standalone/server.js` (copy `.next/static` like `scripts/sync-static-files.js`), then curl: `<html lang>` for `/es`, `/en`, `/it`, `/en/cookies`, `/it/blog`, `/es/alberto-carrasco`; 404 for `/en/alberto-carrasco`; `/admin/login` and `/es/servicios/agente-ia-chatbot` render `<html lang="es">`; `/es#contact` HTML has `id="contact"`; JSON-LD extracted from home/blog/profile pages has only the two entity IDs; `robots.txt` evaluated with robots-parser; `sitemap.xml` has no `/docs` and has the three pages.
- [ ] Portfolio: `pnpm build && pnpm start` on a free port in its worktree; curl `/es/` and `/en/` for name, links and IDs.
- [ ] Write `docs/audit-fixes-2026-10-20/entrega.md` (table per task, local vs production, pending data and access) and `nginx` instructions; final code review subagent over both branches.
