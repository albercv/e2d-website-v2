# Diseño — Carga rápida de la home: snapshot del hero + 3D bajo gesto

Fecha: 2026-09-22 · Rama: `feature/perf-hero-snapshot` (desde `develop` @ 8176dfe) · Estado: aprobado en chat.

## 1. Problema

Lighthouse móvil de `https://evolve2digital.com/es` (informe del usuario, 2026-09-22):

| Métrica | Valor | Causa en código |
|---|---|---|
| LCP, "element render delay" del `<h1>` | 2.540 ms | `HeroSection` envuelve el H1 en `OptimizedMotionDiv`, que renderiza `opacity:0` hasta hidratar, descargar `framer-motion` (50 KiB) y animar 0,8 s (`components/performance/motion-optimized.tsx:196`) |
| Trabajo en main thread | 40,8 s ("Other" 39,4 s) | `LiquidEther` (simulación de fluidos WebGL, 32 iteraciones viscosas + 32 Poisson por frame, DPR ≤ 2, antialias) arranca en `useEffect` sin gesto (`components/LiquidEther.jsx:1021`) |
| JS sin usar: chunk `threejs` | 180 KiB (104 sin usar) | `hero-section.tsx:9` importa `LiquidEther` estáticamente → `three` en el bundle inicial |
| JS sin usar: chunk `framer-motion` | 50 KiB (32 sin usar) | `Navigation` (menú móvil), `CookieBanner` (montado en todas las páginas) y `ServicesSection` importan `motion` directamente, saltándose `motion-optimized.tsx` |
| CSS render-blocking | 5 ficheros, 22,8 KiB, 2,7 s acumulados | Next emite un CSS por import: `globals.css` (Tailwind, 15,9 KiB), `LiquidEther.css` (6 líneas), `react-tooltip/dist/react-tooltip.css`, otros |
| Forced reflow | 59 ms | `LiquidEther` lee geometría tras `prepend(canvas)` |
| GTM/gtag | 192 KiB (76 sin usar) | `google-analytics.tsx` carga `gtag.js` con `afterInteractive`, compitiendo con la hidratación. Apollo y el pixel de OpenAI ya van tras consentimiento de marketing |
| Legacy JS | 12 KiB | `polyfill-module` interno de Next 14 (`Array.prototype.at`, `flat`, `Object.fromEntries`…). No accionable |

Idea clave: Lighthouse no hace gestos. Si el 3D solo se carga tras un gesto, la medición nunca descarga Three.js ni ejecuta la simulación, y los visitantes reales siguen viendo el fluido al mover el ratón o tocar la pantalla.

## 2. Objetivos y no-objetivos

Objetivos:
- H1 del hero pintado en el primer frame (LCP sin render delay).
- `three` y `framer-motion` fuera del bundle inicial de la home (y `framer-motion` fuera de todas las páginas).
- Simulación de fluidos solo tras gesto del usuario, nunca con `prefers-reduced-motion` ni `saveData`, con calidad reducida en dispositivos táctiles.
- Menos CSS bloqueante (objetivo ≤ 3 ficheros iniciales).
- `gtag.js` después de `window.load`.

No-objetivos:
- Refactorizar `LiquidEther.jsx` (1.144 líneas, preexistente). Solo se añaden dos props.
- Hacer que el fluido siga el ratón (hoy el wrapper tiene `pointer-events-none`, así que solo corre `autoDemo`; se conserva tal cual).
- `experimental.optimizeCss` (critters): solo se revisa si tras los cambios siguen > 3 CSS iniciales.

## 3. Decisiones tomadas (usuario, 2026-09-22)

1. Móvil/táctil: sí carga el 3D al primer gesto, con calidad reducida.
2. `gtag.js` pasa a `lazyOnload` (se acepta perder en GA a quien rebota antes de `load`).
3. Limpieza de código muerto 3D + dependencias: PR `chore:` aparte.
4. Snapshot con dos variantes: apaisada y vertical (móvil).

## 4. Arquitectura

```
HeroSection ("use client", texto + CTAs)
 ├─ <HeroBackground/>            client, decorativo, z-0
 │    ├─ <picture data-hero-snapshot>   apaisada / vertical, fetchpriority=high   ← siempre en el HTML
 │    └─ <LiquidEtherLazy/>             React.lazy + Suspense, montado solo tras gesto
 │         └─ components/LiquidEther.jsx (+ props maxPixelRatio, onReady)
 ├─ lib/perf/use-first-gesture.ts       hook: primer gesto en window
 └─ lib/perf/live-background-policy.ts  puro: ¿ofrecer 3D? ¿con qué calidad?
```

### 4.1 `HeroSection` (`components/sections/hero-section.tsx`)

- Sustituir `OptimizedMotionDiv` por `<div className="max-w-4xl mx-auto motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">` (`tailwindcss-animate`, ya instalado). El H1 está en el HTML del servidor sin `opacity:0` inline; con `prefers-reduced-motion` no hay fade.
- El `<div>` de contenido lleva `data-hero-content` (lo usa el script de captura para ocultarlo).
- Quitar `isHovering`, `heroSectionRef`, `renderCount` (sin uso). Quitar el import de `LiquidEther` y `motion-optimized`.
- El bloque de fondo (`pointer-events-none absolute inset-0 z-0 h-full opacity-75`) pasa a `HeroBackground`.

### 4.2 `HeroBackground` (`components/sections/hero-background.tsx`, nuevo, "use client", ≤ 150 líneas)

Estado: `mode: "static" | "loading" | "live"`.

Render:
```tsx
<div className="pointer-events-none absolute inset-0 z-0 h-full opacity-75" ref={wrapperRef}>
  <picture data-hero-snapshot className={cn("absolute inset-0 transition-opacity duration-700", mode === "live" ? "opacity-0" : "opacity-100")}>
    <source media="(orientation: portrait)" srcSet="/hero/liquid-ether-portrait.webp" />
    {/* eslint-disable-next-line @next/next/no-img-element -- art direction por orientación; next/image no la soporta */}
    <img src="/hero/liquid-ether-landscape.webp" alt="" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
  </picture>
  {mode !== "static" && (
    <LiquidEtherLazy {...LIQUID_ETHER_LOOK} {...quality} onReady={() => setMode("live")} style={{ width: "100%", height: "100%", position: "relative" }} />
  )}
</div>
```

- `LiquidEtherLazy = lazy(() => import("@/components/sections/LiquidEther"))` dentro de `<Suspense fallback={null}>`. No hace falta `next/dynamic` con `ssr:false`: el elemento solo se renderiza tras un gesto, es decir, siempre en cliente.
- `LIQUID_ETHER_LOOK` = las props visuales actuales de `hero-section.tsx` (colors, mouseForce 12, cursorSize 90, isViscous, viscous 18, isBounce false, autoDemo true, autoSpeed 0.35, autoIntensity 1.6, takeoverDuration 0.25, autoResumeDelay 3000, autoRampDuration 0.6).
- `quality` = `getLiveBackgroundQuality(env)` (ver 4.4).
- Visibilidad: `IntersectionObserver` sobre `wrapperRef` → `heroVisibleRef`. Un gesto solo cuenta si el hero está intersectando; si no, se sigue escuchando.
- `useFirstGesture(handleGesture, enabled)` con `enabled = mode === "static" && shouldOfferLiveBackground(env)`. `handleGesture` devuelve `true` (consumido) si el hero es visible → `setMode("loading")`; `false` en caso contrario (seguir escuchando).
- `env` se lee una vez en `useEffect` (`readBackgroundEnv()`), nunca en render (evita mismatch de hidratación).
- El `<picture>` se queda montado con `opacity-0` tras el crossfade (barato, sin parpadeo si el canvas tarda un frame).

### 4.3 `useFirstGesture` (`lib/perf/use-first-gesture.ts`, nuevo)

```ts
export const FIRST_GESTURE_EVENTS = ["pointermove", "pointerdown", "touchstart", "wheel", "keydown"] as const
export function useFirstGesture(onGesture: () => boolean, enabled: boolean): void
```
- Registra los cinco eventos en `window` con `{ passive: true }`.
- Al primer evento llama a `onGesture()`; si devuelve `true` retira todos los listeners. Si devuelve `false`, sigue escuchando.
- Limpia en unmount o cuando `enabled` pasa a `false`.
- Gestos anteriores a la hidratación se pierden (aceptado: el siguiente gesto dispara).

### 4.4 Política (`lib/perf/live-background-policy.ts`, nuevo, puro)

```ts
export interface BackgroundEnv { reducedMotion: boolean; saveData: boolean; coarsePointer: boolean }
export interface LiquidEtherQuality { iterationsViscous: number; iterationsPoisson: number; resolution: number; maxPixelRatio: number }
export function shouldOfferLiveBackground(env: BackgroundEnv): boolean   // !reducedMotion && !saveData
export function getLiveBackgroundQuality(env: BackgroundEnv): LiquidEtherQuality
// desktop: { 32, 32, 0.5, 2 } (valores actuales) · coarsePointer: { 16, 16, 0.5, 1.5 }
export function readBackgroundEnv(): BackgroundEnv
// matchMedia("(prefers-reduced-motion: reduce)"), navigator.connection?.saveData, matchMedia("(pointer: coarse)")
```

### 4.5 `LiquidEther.jsx` (cambios mínimos)

- Nueva prop `maxPixelRatio = 2`: `this.pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio)` (línea 88).
- Nueva prop `onReady`: se llama una sola vez tras el primer `render()` en `loop()` (es decir, cuando ya hay un frame pintado). Se guarda en ref para no re-crear el WebGLManager si cambia la referencia.
- Quitar `import './LiquidEther.css'`; el wrapper usa las utilidades `relative h-full w-full overflow-hidden touch-none` (+ `className`). Borrar `components/LiquidEther.css`. Añadir `.jsx` al `content` de `tailwind.config.ts` para que Tailwind genere esas clases.
- El resto del fichero no se toca.

### 4.6 Snapshot y script de captura

Assets (commiteados): `public/hero/liquid-ether-landscape.webp` (1600×900) y `public/hero/liquid-ether-portrait.webp` (810×1440). Objetivo ≤ 40 KB cada uno; test guardián a < 60 KB.

`scripts/capture-hero-snapshot.js` (CommonJS como el resto de `scripts/`; manual, fuera de `npm run build`):
- Dependencia: `playwright-core@1.60.0` en `devDependencies` (reutiliza `~/.cache/ms-playwright/chromium-1223`, ya instalado por el Playwright de Python 1.60.0 del host; no descarga navegadores).
- Uso: `node scripts/capture-hero-snapshot.js [url]` (por defecto `http://localhost:3003/es`). Sirve contra prod actual o contra la rama nueva.
- Por cada variante `{ name, width, height }`: `chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] })`, `deviceScaleFactor: 1`, `goto(url, { waitUntil: "networkidle" })`, `mouse.move` (dispara el gesto en la rama nueva), `waitForSelector("main > section canvas")`, `waitForTimeout(4000)` (deja correr `autoDemo`), oculta `nav`, `[data-hero-content]`, `[data-hero-snapshot]` y todo elemento con `position: fixed` (`visibility: hidden`), `locator("main > section").first().screenshot({ type: "png" })`, `sharp(png).webp({ quality: 70 })` → fichero. Imprime tamaño en KB.
- Falla con mensaje claro si no aparece el canvas (WebGL no disponible) o si el fichero supera 60 KB.
- Verificación humana: abrir los dos WebP y comprobar que se ve el fluido (no negro).

### 4.7 `framer-motion` fuera del bundle inicial

- `components/layout/navigation.tsx`: quitar `motion`/`AnimatePresence`. Menú móvil sigue con render condicional (`isOpen && …`) y clase `animate-in fade-in slide-in-from-top-2 duration-200`. Sin animación de salida (aceptado; mantiene a11y: nada oculto pero enfocable).
- `components/gdpr/cookie-banner.tsx`: igual — render condicional + `animate-in fade-in duration-300` en banner y en el overlay de ajustes. Conservar `data-ignore-cls`.
- `components/sections/services-section.tsx`: `motion.div` → `LazyMotionDiv` de `motion-optimized.tsx` (misma API `initial/whileInView/viewport/transition`; carga `framer-motion` solo cuando la sección entra en viewport).

### 4.8 Tooltip de servicios

- `react-tooltip` → `components/ui/tooltip` (Radix, ya existe). `<TooltipProvider delayDuration={200}>` en la sección; por servicio: `<Tooltip><TooltipTrigger asChild><Card …/></TooltipTrigger><TooltipContent side="top" sideOffset={8} className="max-w-[280px] rounded-xl border border-[#05b4ba]/30 bg-[#05b4ba]/95 px-4 py-3 text-xs font-medium text-white shadow-xl backdrop-blur">{t(`${key}.tooltip`)}</TooltipContent></Tooltip>`.
- Quitar `data-tooltip-*`, el import de `react-tooltip` y su CSS. Quitar `react-tooltip` de `package.json` (único uso).

### 4.9 Analytics

- `components/analytics/google-analytics.tsx`: `<Script strategy="lazyOnload" …/>`. El stub `window.gtag` y la cola `dataLayer` se crean en `useEffect` antes de que cargue el script, así el `page_view` inicial y los `track()` previos se procesan cuando `gtag.js` llega.
- Apollo y pixel OpenAI: sin cambios (ya van tras consentimiento de marketing).

## 5. Tests (Jest, cobertura global ≥ 85 %)

| Test | Qué demuestra |
|---|---|
| `__tests__/components/hero-section-ssr.test.tsx` (node env) | `renderToString(<HeroSection/>)` contiene el título ES y el `<h1>` no está dentro de un elemento con `opacity:0`; el HTML contiene `<picture data-hero-snapshot` y no contiene `<canvas` |
| `__tests__/components/hero-source-policy.test.ts` | Tripwire de fuente: `hero-section.tsx` y `hero-background.tsx` no importan `three`, `LiquidEther` (salvo vía `lazy(() => import(...))`) ni `framer-motion` estáticamente; `LiquidEther.jsx` no importa CSS |
| `__tests__/components/hero-background.test.tsx` | Sin gesto: no llama al import dinámico. Tras `pointermove` con hero visible (IO mockeado): monta `LiquidEther` (mock) con la calidad desktop; `onReady` → `<picture>` con `opacity-0`. Con `pointer: coarse`: calidad reducida. Con `reduced-motion` o `saveData`: nunca importa aunque haya gesto. Gesto con hero no visible: no importa y sigue escuchando |
| `__tests__/lib/use-first-gesture.test.tsx` | Registra los 5 eventos; consumido → retira listeners; no consumido → sigue; limpia en unmount |
| `__tests__/lib/live-background-policy.test.ts` | Tabla de casos de `shouldOfferLiveBackground` y `getLiveBackgroundQuality` |
| `__tests__/components/framer-motion-initial-bundle.test.ts` | Tripwire: `navigation.tsx`, `cookie-banner.tsx`, `services-section.tsx` no importan `framer-motion` directamente |
| `__tests__/components/navigation.test.tsx` / `cookie-banner-flow.test.tsx` | El menú móvil abre/cierra; el banner sigue mostrando y guardando consentimiento (comportamiento, sin framer) |
| `__tests__/components/services-section.test.tsx` | Renderiza los 4 servicios y el tooltip Radix muestra el texto al hacer hover/focus |
| `__tests__/public/hero-snapshot.test.ts` | Los dos WebP existen y pesan < 60 KB |
| `__tests__/components/google-analytics.test.tsx` | El `<Script>` usa `lazyOnload`; el stub `gtag` encola `config` antes de cargar |

`LiquidEther.jsx` no se testea unitariamente (WebGL); se mockea en los tests de `HeroBackground`.

## 6. Verificación end-to-end

1. `npm test` verde, cobertura ≥ 85 %.
2. `npm run build:next`: en `/[locale]` desaparecen `threejs` y `framer-motion` del First Load JS; ≤ 3 CSS iniciales. Comparar con el baseline anotado en `tasks/todo.md`.
3. Deploy a test (usuario). PSI móvil: objetivo LCP < 2,5 s, TBT < 300 ms, sin `threejs` en la lista de JS sin usar.
4. Manual en navegador: imagen al cargar; 3D al mover el ratón / tocar; sin 3D con `prefers-reduced-motion`; menú móvil, banner de cookies y tooltips funcionan.
5. `pm2 logs e2d` sin errores tras el deploy.
6. Actualizar `tasks/lessons.md` con el patrón "facade + gesto".

## 7. Commits (rama `feature/perf-hero-snapshot`, PR a `develop`)

1. `docs: hero performance design (snapshot + gesture-gated 3D)`
2. `fix(hero): render hero copy on first paint`
3. `feat(hero): static snapshot background with gesture-activated fluid sim`
4. `refactor(perf): keep framer-motion out of the initial bundle`
5. `refactor(services): replace react-tooltip with the Radix tooltip`
6. `perf(analytics): load gtag.js after window load`

PR aparte, rama `chore/remove-dead-3d` apilada sobre `feature/perf-hero-snapshot` (se mergea después, evita conflicto de lockfile): `chore: remove unused 3D components and dependencies` — `components/3d/hero-3d.tsx`, `Hero3DLazy` + `Hero3DFallback`, `ColorBends*.{tsx,css}`, `ui/orb*.tsx`, `styles/orb.css`, `visual/threads.tsx` + `Threads.css`, `performance/motion-lazy.tsx`, `ai-agent/*` + `AIAgentModalLazy`, tests `__tests__/hero3d*.test.tsx`, ajustar `lazy-sections-ssr.test.tsx`; deps `@react-three/fiber`, `@react-three/drei`, `ogl` (NO `three`: lo usa `LiquidEther`); entradas de `optimizePackageImports`.

Cuerpo de commit: Scope / Problem / Solution / Notes. Sin trailers de atribución. Claude no hace push: el usuario pushea, abre PR y mergea tras probar.
