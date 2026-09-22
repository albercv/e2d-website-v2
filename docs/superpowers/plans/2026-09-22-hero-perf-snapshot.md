# Hero Performance (snapshot + gesture-gated 3D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home page paint its hero copy immediately and keep Three.js, framer-motion and the WebGL fluid simulation out of the initial load, showing a static snapshot of the fluid until the visitor's first gesture.

**Architecture:** `HeroSection` renders its copy with a CSS-only fade and delegates the background to a new client component `HeroBackground`, which paints a `<picture>` snapshot (landscape/portrait WebP) and, on the first user gesture while the hero is visible, `React.lazy`-loads `LiquidEther` (Three.js) and crossfades to it. Two pure helpers (`lib/perf/live-background-policy.ts`, `lib/perf/use-first-gesture.ts`) hold the rules. Navigation, cookie banner and services drop their direct `framer-motion` imports (CSS animations / the existing `LazyMotionDiv`), `react-tooltip` is replaced by the existing Radix tooltip, and `gtag.js` moves to `lazyOnload`.

**Tech Stack:** Next.js 14.2 (App Router, React 18.3 + Next's React canary in the app router), TypeScript strict, Tailwind 3.4 + `tailwindcss-animate`, Jest 29 + Testing Library 16 (`next/jest`), `playwright-core` 1.60 + `sharp` for the one-off capture script.

**Spec:** `docs/superpowers/specs/2026-09-22-hero-perf-snapshot-design.md`

## Global Constraints

- Branch `feature/perf-hero-snapshot` (already checked out in this worktree, based on `origin/develop` @ 8176dfe). NEVER `git push`; the user pushes, opens the PR and merges.
- Commit messages: English subject with `feat:`/`fix:`/`refactor:`/`perf:`/`chore:`/`docs:` prefix; body with `Scope:` / `Problem:` / `Solution:` / `Notes:` paragraphs; NO `Co-Authored-By` and NO "Generated with Claude Code" trailers. Commit with `git -c commit.gpgsign=false commit -F -` and a heredoc.
- Code rules (CLAUDE.md): functions ≤ 40 lines, components ≤ 150 lines, files ≤ 300 lines (except the pre-existing `components/LiquidEther.jsx`), TypeScript strict, no `any` without a justified comment, early returns, comments explain *why*.
- Tests live under `__tests__/` and run with `npx jest <path>`; the global coverage threshold is 85 % (`npm run test:coverage`). `next-intl` is globally mocked in `jest.setup.js`: `useTranslations()` returns the key itself (`t("title")` → `"title"`), `useLocale()` → `"es"`, `NextIntlClientProvider` renders children. `IntersectionObserver` and `ResizeObserver` are mocked as no-op classes there too.
- Never run PM2, DB or production-mutating commands. `npm run build:next` in this worktree needs `DATABASE_URL=postgres://e2d:build@127.0.0.1:5436/e2d` exported (page-data collection only checks presence).
- Spanish copy must be orthographically correct; comments in code may be English or Spanish (follow the file you are in).

---

### Task 1: Render the hero copy on first paint

**Files:**
- Modify: `components/sections/hero-section.tsx`
- Test: `__tests__/components/hero-section-ssr.test.tsx`

**Interfaces:**
- Produces: `data-hero-content` attribute on the hero copy wrapper (the capture script in Task 5 hides it) and a `<section>` that Task 6 keeps unchanged apart from the background block.

- [ ] **Step 1: Write the failing SSR test**

```tsx
// __tests__/components/hero-section-ssr.test.tsx
/** @jest-environment node */
import { renderToString } from "react-dom/server"

// The fluid background is WebGL-only; it must never run during SSR tests.
jest.mock("@/components/sections/LiquidEther", () => ({ __esModule: true, default: () => null }))

import { HeroSection } from "@/components/sections/hero-section"

describe("HeroSection server HTML", () => {
  const html = renderToString(<HeroSection />)

  it("contains the H1 with the hero title", () => {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
    expect(h1).not.toBeNull()
    // next-intl is mocked globally: t("title") renders the key.
    expect(h1![1]).toContain("title")
  })

  it("does not hide the copy behind an inline opacity:0 (LCP render delay)", () => {
    const beforeH1 = html.slice(0, html.indexOf("<h1"))
    expect(beforeH1).not.toMatch(/style="[^"]*opacity:\s*0[;"]/)
  })

  it("marks the copy wrapper for the snapshot capture script", () => {
    expect(html).toContain("data-hero-content")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/hero-section-ssr.test.tsx`
Expected: FAIL — "does not hide the copy…" (the `OptimizedMotionDiv` fallback renders `style="opacity:0;transform:translateY(10px)…"`) and "marks the copy wrapper…" fail.

- [ ] **Step 3: Rewrite `hero-section.tsx` without framer-motion around the copy**

Replace the whole file with:

```tsx
"use client"

import { useLocale, useTranslations } from "next-intl"
import { ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useComponentDebugLogger } from "@/lib/component-debug-logger"
import { track } from "@/lib/analytics/track"
import LiquidEther from "./LiquidEther"

const DEMO_MAILTO =
  "mailto:hello@evolve2digital.com?subject=Solicitud de Demo&body=Hola, me gustaría solicitar una demo de sus servicios."

export function HeroSection() {
  const t = useTranslations("hero")
  const locale = useLocale()
  useComponentDebugLogger("HeroSection")

  const openContact = () => {
    track("cta_click", { cta_id: "hero_demo", locale })
    const contactButton = document.querySelector<HTMLButtonElement>("[data-contact-trigger]")
    if (contactButton) {
      contactButton.click()
      return
    }
    window.location.href = DEMO_MAILTO
  }

  const scrollToProjects = () => {
    track("cta_click", { cta_id: "hero_projects", locale })
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* LiquidEther como background (no afecta el layout) */}
      <div className="pointer-events-none absolute inset-0 z-0 h-full opacity-75">
        <LiquidEther
          style={{ width: "100%", height: "100%", position: "relative" }}
          colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
          mouseForce={12}
          cursorSize={90}
          isViscous={true}
          viscous={18}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.35}
          autoIntensity={1.6}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>

      {/* El texto va en el HTML del servidor a opacidad completa: es el elemento LCP.
          Antes lo envolvía framer-motion con opacity:0 hasta hidratar y descargar
          su chunk (2,5 s de render delay en móvil). El fade es solo CSS. */}
      <div data-hero-content className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 text-center py-12">
        <div className="max-w-4xl mx-auto motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">{t("title")}</h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">{t("subtitle")}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white px-8 py-3 text-lg font-semibold"
              onClick={openContact}
            >
              {t("cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="border-[#05b4ba] text-[#05b4ba] hover:bg-[#05b4ba]/10 px-8 py-3 text-lg bg-transparent"
              onClick={scrollToProjects}
            >
              <Play className="mr-2 h-5 w-5" />
              {t("ctaSecondary")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/components/hero-section-ssr.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/sections/hero-section.tsx __tests__/components/hero-section-ssr.test.tsx
git -c commit.gpgsign=false commit -F - <<'MSG'
fix(hero): render hero copy on first paint

Scope: components/sections/hero-section.tsx

Problem: the H1 (the LCP element) was wrapped in OptimizedMotionDiv, whose
fallback renders opacity:0 until React hydrates, framer-motion downloads
and a 0.8 s animation runs. Lighthouse mobile reported a 2.5 s "element
render delay" on the hero title.

Solution: the copy is server-rendered at full opacity and fades in with a
CSS-only animation (tailwindcss-animate, motion-safe only). Dead hover
state and refs removed; CTA handlers extracted for readability.

Notes: the LiquidEther background is untouched here; it moves behind a
snapshot facade in a follow-up commit.
MSG
```

---

### Task 2: Live-background policy (pure rules)

**Files:**
- Create: `lib/perf/live-background-policy.ts`
- Test: `__tests__/lib/live-background-policy.test.ts`

**Interfaces:**
- Produces:
  - `interface BackgroundEnv { reducedMotion: boolean; saveData: boolean; coarsePointer: boolean }`
  - `interface LiquidEtherQuality { iterationsViscous: number; iterationsPoisson: number; resolution: number; maxPixelRatio: number }`
  - `shouldOfferLiveBackground(env: BackgroundEnv): boolean`
  - `getLiveBackgroundQuality(env: BackgroundEnv): LiquidEtherQuality`
  - `readBackgroundEnv(): BackgroundEnv`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/live-background-policy.test.ts
/** @jest-environment jsdom */
import {
  getLiveBackgroundQuality,
  readBackgroundEnv,
  shouldOfferLiveBackground,
  type BackgroundEnv,
} from "@/lib/perf/live-background-policy"

const base: BackgroundEnv = { reducedMotion: false, saveData: false, coarsePointer: false }

describe("shouldOfferLiveBackground", () => {
  it.each<[Partial<BackgroundEnv>, boolean]>([
    [{}, true],
    [{ reducedMotion: true }, false],
    [{ saveData: true }, false],
    [{ coarsePointer: true }, true],
  ])("%o → %s", (overrides, expected) => {
    expect(shouldOfferLiveBackground({ ...base, ...overrides })).toBe(expected)
  })
})

describe("getLiveBackgroundQuality", () => {
  it("keeps the shipped desktop look on fine pointers", () => {
    expect(getLiveBackgroundQuality(base)).toEqual({
      iterationsViscous: 32,
      iterationsPoisson: 32,
      resolution: 0.5,
      maxPixelRatio: 2,
    })
  })

  it("halves the solver iterations and caps the DPR on coarse pointers", () => {
    expect(getLiveBackgroundQuality({ ...base, coarsePointer: true })).toEqual({
      iterationsViscous: 16,
      iterationsPoisson: 16,
      resolution: 0.5,
      maxPixelRatio: 1.5,
    })
  })
})

describe("readBackgroundEnv", () => {
  function mockMatchMedia(matching: string[]): void {
    window.matchMedia = jest.fn((query: string) => ({ matches: matching.includes(query) })) as unknown as typeof window.matchMedia
  }

  afterEach(() => {
    delete (navigator as { connection?: unknown }).connection
  })

  it("reads the media queries and the save-data hint", () => {
    mockMatchMedia(["(prefers-reduced-motion: reduce)", "(pointer: coarse)"])
    Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true })
    expect(readBackgroundEnv()).toEqual({ reducedMotion: true, saveData: true, coarsePointer: true })
  })

  it("defaults every flag to false", () => {
    mockMatchMedia([])
    expect(readBackgroundEnv()).toEqual(base)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/lib/live-background-policy.test.ts`
Expected: FAIL — "Cannot find module '@/lib/perf/live-background-policy'".

- [ ] **Step 3: Implement the module**

```ts
// lib/perf/live-background-policy.ts
// Decides whether the hero may upgrade from its static snapshot to the WebGL
// fluid simulation, and with which quality. Pure functions over a small env
// snapshot so the rules are unit-testable without jsdom media queries.

export interface BackgroundEnv {
  reducedMotion: boolean
  saveData: boolean
  coarsePointer: boolean
}

export interface LiquidEtherQuality {
  iterationsViscous: number
  iterationsPoisson: number
  resolution: number
  maxPixelRatio: number
}

// Desktop keeps the look shipped before the facade. Touch devices get half
// the solver iterations and a lower DPR cap: phones are where the fluid
// saturated the main thread and where Lighthouse measures.
const DESKTOP_QUALITY: LiquidEtherQuality = {
  iterationsViscous: 32,
  iterationsPoisson: 32,
  resolution: 0.5,
  maxPixelRatio: 2,
}

const TOUCH_QUALITY: LiquidEtherQuality = {
  iterationsViscous: 16,
  iterationsPoisson: 16,
  resolution: 0.5,
  maxPixelRatio: 1.5,
}

interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean }
}

export function shouldOfferLiveBackground(env: BackgroundEnv): boolean {
  return !env.reducedMotion && !env.saveData
}

export function getLiveBackgroundQuality(env: BackgroundEnv): LiquidEtherQuality {
  return env.coarsePointer ? TOUCH_QUALITY : DESKTOP_QUALITY
}

function mediaMatches(query: string): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches
}

export function readBackgroundEnv(): BackgroundEnv {
  if (typeof window === "undefined") return { reducedMotion: false, saveData: false, coarsePointer: false }
  const nav = navigator as NavigatorWithConnection
  return {
    reducedMotion: mediaMatches("(prefers-reduced-motion: reduce)"),
    saveData: Boolean(nav.connection?.saveData),
    coarsePointer: mediaMatches("(pointer: coarse)"),
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/lib/live-background-policy.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/perf/live-background-policy.ts __tests__/lib/live-background-policy.test.ts
git -c commit.gpgsign=false commit -F - <<'MSG'
feat(perf): live-background policy for the hero fluid

Scope: lib/perf/live-background-policy.ts

Problem: the hero needs one place that decides whether the WebGL fluid
may load at all (never under prefers-reduced-motion or Save-Data) and
which quality it runs at (cheaper on touch devices).

Solution: pure functions over a BackgroundEnv snapshot plus a thin
readBackgroundEnv() that reads matchMedia and navigator.connection.

Notes: consumed by the HeroBackground component in a later commit.
MSG
```

---

### Task 3: `useFirstGesture` hook

**Files:**
- Create: `lib/perf/use-first-gesture.ts`
- Test: `__tests__/lib/use-first-gesture.test.tsx`

**Interfaces:**
- Produces:
  - `FIRST_GESTURE_EVENTS: readonly ["pointermove", "pointerdown", "touchstart", "wheel", "keydown"]`
  - `useFirstGesture(onGesture: () => boolean, enabled: boolean): void` — `onGesture` returns `true` when it consumed the gesture (listeners removed) or `false` to keep waiting.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/lib/use-first-gesture.test.tsx
/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react"
import { FIRST_GESTURE_EVENTS, useFirstGesture } from "@/lib/perf/use-first-gesture"

function fire(type: string): void {
  window.dispatchEvent(new Event(type))
}

describe("useFirstGesture", () => {
  it("covers pointer, touch, wheel and keyboard gestures", () => {
    expect(FIRST_GESTURE_EVENTS).toEqual(["pointermove", "pointerdown", "touchstart", "wheel", "keydown"])
    for (const type of FIRST_GESTURE_EVENTS) {
      const onGesture = jest.fn(() => true)
      const { unmount } = renderHook(() => useFirstGesture(onGesture, true))
      fire(type)
      expect(onGesture).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it("stops listening once the callback consumes a gesture", () => {
    const onGesture = jest.fn(() => true)
    renderHook(() => useFirstGesture(onGesture, true))
    fire("pointermove")
    fire("keydown")
    expect(onGesture).toHaveBeenCalledTimes(1)
  })

  it("keeps listening while the callback declines the gesture", () => {
    const onGesture = jest.fn<boolean, []>().mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderHook(() => useFirstGesture(onGesture, true))
    fire("wheel")
    fire("wheel")
    fire("wheel")
    expect(onGesture).toHaveBeenCalledTimes(2)
  })

  it("does nothing while disabled", () => {
    const onGesture = jest.fn(() => true)
    renderHook(() => useFirstGesture(onGesture, false))
    fire("pointerdown")
    expect(onGesture).not.toHaveBeenCalled()
  })

  it("removes its listeners on unmount", () => {
    const onGesture = jest.fn(() => true)
    const { unmount } = renderHook(() => useFirstGesture(onGesture, true))
    unmount()
    fire("touchstart")
    expect(onGesture).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/lib/use-first-gesture.test.tsx`
Expected: FAIL — "Cannot find module '@/lib/perf/use-first-gesture'".

- [ ] **Step 3: Implement the hook**

```ts
// lib/perf/use-first-gesture.ts
"use client"

import { useEffect, useRef } from "react"

export const FIRST_GESTURE_EVENTS = ["pointermove", "pointerdown", "touchstart", "wheel", "keydown"] as const

// Calls `onGesture` on the visitor's first gesture anywhere on the page.
// The callback returns true when it consumed the gesture (listeners are
// removed) or false to keep waiting, e.g. because the hero is scrolled out
// of view. Gestures made before hydration are lost by design: the next one
// fires, and bots/Lighthouse never gesture at all.
export function useFirstGesture(onGesture: () => boolean, enabled: boolean): void {
  const onGestureRef = useRef(onGesture)
  onGestureRef.current = onGesture

  useEffect(() => {
    if (!enabled) return

    function handle(): void {
      if (onGestureRef.current()) remove()
    }
    function remove(): void {
      for (const type of FIRST_GESTURE_EVENTS) window.removeEventListener(type, handle)
    }
    for (const type of FIRST_GESTURE_EVENTS) window.addEventListener(type, handle, { passive: true })
    return remove
  }, [enabled])
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/lib/use-first-gesture.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/perf/use-first-gesture.ts __tests__/lib/use-first-gesture.test.tsx
git -c commit.gpgsign=false commit -F - <<'MSG'
feat(perf): useFirstGesture hook

Scope: lib/perf/use-first-gesture.ts

Problem: the hero must defer its WebGL fluid until the visitor actually
interacts, so that crawlers and Lighthouse (which never gesture) get the
static page and real visitors get the animation.

Solution: a hook listening once, passively, for pointermove, pointerdown,
touchstart, wheel and keydown on window. The callback can decline a
gesture to keep waiting.

Notes: consumed by HeroBackground in a later commit.
MSG
```

---

### Task 4: `LiquidEther` props (`maxPixelRatio`, `onReady`) and CSS removal

**Files:**
- Modify: `components/LiquidEther.jsx` (props at lines 5-24, pixel ratio at line 88, `loop()` at ~line 947, first `useEffect` deps at ~line 1073, return at line 1143)
- Delete: `components/LiquidEther.css`
- Modify: `tailwind.config.ts` (`content` globs)

**Interfaces:**
- Produces: `LiquidEther` accepts `maxPixelRatio?: number` (default 2) and `onReady?: () => void` (called once after the first rendered frame). Its wrapper `<div>` now carries Tailwind classes instead of `.liquid-ether-container`.

- [ ] **Step 1: Add the props**

In the destructuring at the top of `components/LiquidEther.jsx` add two entries after `autoRampDuration = 0.6`:

```js
  autoRampDuration = 0.6,
  maxPixelRatio = 2,
  onReady
}) {
```

Right after `const resizeRafRef = useRef(null);` add:

```js
  // Kept in a ref so a new callback identity never re-creates the WebGL
  // manager (the main effect depends on the visual props only).
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
```

- [ ] **Step 2: Apply `maxPixelRatio` and fire `onReady`**

Change line 88 from
`this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);`
to
`this.pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);`

Change `loop()` inside `class WebGLManager` to:

```js
      loop() {
        if (!this.running) return; // safety
        this.render();
        if (!this.readyNotified) {
          // First frame is on screen: the facade can crossfade from the snapshot.
          this.readyNotified = true;
          if (typeof onReadyRef.current === 'function') onReadyRef.current();
        }
        rafRef.current = requestAnimationFrame(this._loop);
      }
```

Add `maxPixelRatio` to the dependency array of the first `useEffect` (the one ending with `autoRampDuration` followed by `]);` around line 1090), as the last entry.

- [ ] **Step 3: Replace the CSS file with Tailwind classes**

Remove the line `import './LiquidEther.css';`. Replace the `return` at the end of the component with:

```jsx
  return (
    <div
      ref={mountRef}
      className={`relative h-full w-full overflow-hidden touch-none ${className || ''}`}
      style={style}
    />
  );
```

Delete the file: `git rm components/LiquidEther.css`.

- [ ] **Step 4: Let Tailwind see `.jsx` files**

In `tailwind.config.ts`, change the `content` entry `'./components/**/*.{ts,tsx}'` to `'./components/**/*.{js,jsx,ts,tsx}'` (otherwise `touch-none` on the JSX wrapper is never generated).

- [ ] **Step 5: Verify syntax and the existing tests**

Run: `npx eslint components/LiquidEther.jsx && npx jest __tests__/components/hero-section-ssr.test.tsx`
Expected: eslint exits 0 (warnings allowed, no parse errors); the SSR test still passes.

- [ ] **Step 6: Commit**

```bash
git add components/LiquidEther.jsx tailwind.config.ts
git rm -q components/LiquidEther.css
git -c commit.gpgsign=false commit -F - <<'MSG'
refactor(hero): LiquidEther maxPixelRatio/onReady props, drop its CSS file

Scope: components/LiquidEther.jsx, components/LiquidEther.css, tailwind.config.ts

Problem: the snapshot facade needs to know when the fluid has painted its
first frame (to crossfade) and to cap the device pixel ratio on phones.
The component also shipped a 6-line CSS file that Next emitted as its
own render-blocking stylesheet.

Solution: new optional props maxPixelRatio (default 2, unchanged
behaviour) and onReady (fired once after the first render). The wrapper
uses Tailwind utilities; the Tailwind content glob now includes .jsx.

Notes: no other logic in the file changes.
MSG
```

---

### Task 5: Snapshot assets and their capture script

**Files:**
- Create: `scripts/capture-hero-snapshot.js`
- Create: `public/hero/liquid-ether-landscape.webp`, `public/hero/liquid-ether-portrait.webp` (generated)
- Modify: `package.json`, `package-lock.json` (add devDependency `playwright-core@1.60.0`)
- Test: `__tests__/public/hero-snapshot.test.ts`

**Interfaces:**
- Produces: the two image paths `/hero/liquid-ether-landscape.webp` (1600×900) and `/hero/liquid-ether-portrait.webp` (810×1440) that Task 6 references.

- [ ] **Step 1: Write the failing guard test**

```ts
// __tests__/public/hero-snapshot.test.ts
import { statSync } from "fs"
import { join } from "path"

// The hero paints these on first load with fetchpriority=high: keep them
// small. Regenerate with `node scripts/capture-hero-snapshot.js <url>`.
const MAX_BYTES = 60 * 1024

describe.each(["landscape", "portrait"])("hero snapshot (%s)", (variant) => {
  const file = join(process.cwd(), "public", "hero", `liquid-ether-${variant}.webp`)

  it("exists and stays under the byte budget", () => {
    const { size } = statSync(file)
    expect(size).toBeGreaterThan(1024)
    expect(size).toBeLessThan(MAX_BYTES)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/public/hero-snapshot.test.ts`
Expected: FAIL — `ENOENT` for both files.

- [ ] **Step 3: Add `playwright-core`**

Run: `npm install --save-dev --save-exact playwright-core@1.60.0`
Expected: `package.json` gains `"playwright-core": "1.60.0"` under `devDependencies`; no browser download (the matching Chromium build 1223 is already in `~/.cache/ms-playwright`). Verify with `ls ~/.cache/ms-playwright | grep chromium`.

- [ ] **Step 4: Write the capture script**

```js
#!/usr/bin/env node
// scripts/capture-hero-snapshot.js
//
// Captures the hero's fluid background as static WebP snapshots. The hero
// paints these on first load and only mounts the WebGL simulation after a
// user gesture (components/sections/hero-background.tsx).
//
// Manual tool, NOT part of `npm run build`. Re-run whenever the hero look
// changes (colors, LiquidEther props) and commit the resulting files.
//
// Usage: node scripts/capture-hero-snapshot.js [url]
//   url defaults to http://localhost:3003/es — any deploy works, prod too.
//
// Needs playwright-core (devDependency) and a Chromium build in
// ~/.cache/ms-playwright matching its version (`npx playwright-core install
// chromium` if missing). WebGL runs on SwiftShader, so a headless server
// without a GPU is fine.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sharp = require('sharp');

const url = process.argv[2] || 'http://localhost:3003/es';
const outDir = path.join(process.cwd(), 'public', 'hero');
const MAX_BYTES = 60 * 1024;
const SETTLE_MS = 4000;
const WEBP_QUALITY = 70;

const VARIANTS = [
  { name: 'landscape', width: 1600, height: 900 },
  { name: 'portrait', width: 810, height: 1440 },
];

// Hide everything except the fluid: the fixed nav, the hero copy, the
// snapshot itself (when capturing the new hero) and any fixed overlay
// (cookie banner, chat launcher). The background wrapper is shown at full
// opacity because the page composites the snapshot at 75 % over the same
// dark background, which reproduces the live look exactly.
const CAPTURE_CSS = `
  nav, [data-hero-content], [data-hero-snapshot] { visibility: hidden !important; }
  main > section [data-hero-background], main > section > div.opacity-75 { opacity: 1 !important; }
`;

async function hideFixedElements(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (getComputedStyle(el).position === 'fixed') el.style.visibility = 'hidden';
    }
  });
}

async function assertNotBlank(png, name) {
  const { channels } = await sharp(png).stats();
  if (channels.every((c) => c.stdev < 2)) {
    throw new Error(`${name}: capture is flat — WebGL did not render (check the SwiftShader flags)`);
  }
}

async function captureVariant(browser, variant) {
  const page = await browser.newPage({
    viewport: { width: variant.width, height: variant.height },
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  // First gesture: the new hero mounts the simulation only after one.
  await page.mouse.move(variant.width / 2, variant.height / 2);
  await page.mouse.move(variant.width / 2 + 40, variant.height / 2 + 20);
  await page.locator('main > section canvas').first().waitFor({ state: 'attached', timeout: 20000 });
  await page.waitForTimeout(SETTLE_MS);
  await page.addStyleTag({ content: CAPTURE_CSS });
  await hideFixedElements(page);
  const png = await page.locator('main > section').first().screenshot({ type: 'png' });
  await page.close();

  await assertNotBlank(png, variant.name);
  const webp = await sharp(png).webp({ quality: WEBP_QUALITY }).toBuffer();
  if (webp.length > MAX_BYTES) {
    throw new Error(`${variant.name}: ${(webp.length / 1024).toFixed(1)} KB exceeds the ${MAX_BYTES / 1024} KB budget; lower WEBP_QUALITY`);
  }
  const file = path.join(outDir, `liquid-ether-${variant.name}.webp`);
  fs.writeFileSync(file, webp);
  console.log(`✔ ${path.relative(process.cwd(), file)} ${variant.width}x${variant.height} ${(webp.length / 1024).toFixed(1)} KB`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    for (const variant of VARIANTS) await captureVariant(browser, variant);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`✖ capture failed: ${err.message}`);
  process.exit(1);
});
```

- [ ] **Step 5: Generate the snapshots from production (current hero, simulation always on)**

Run: `node scripts/capture-hero-snapshot.js https://evolve2digital.com/es`
Expected: two `✔` lines with sizes under 60 KB. If the script reports "capture is flat", retry once (SwiftShader warm-up); if it still fails, stop and report — do not commit black images.

- [ ] **Step 6: Look at the images**

Run: `mkdir -p .next/hero-preview && node -e "const s=require('sharp');for(const v of ['landscape','portrait'])s('public/hero/liquid-ether-'+v+'.webp').png().toFile('.next/hero-preview/'+v+'.png').then(()=>console.log('ok',v))"`
Then open `.next/hero-preview/landscape.png` and `.next/hero-preview/portrait.png` with the Read tool (`.next/` is gitignored). Expected: purple/pink fluid blobs on a dark background, no nav bar, no text, no cookie banner.

- [ ] **Step 7: Run the guard test**

Run: `npx jest __tests__/public/hero-snapshot.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add scripts/capture-hero-snapshot.js public/hero/liquid-ether-landscape.webp public/hero/liquid-ether-portrait.webp package.json package-lock.json __tests__/public/hero-snapshot.test.ts
git -c commit.gpgsign=false commit -F - <<'MSG'
feat(hero): static snapshots of the fluid background and their capture script

Scope: scripts/capture-hero-snapshot.js, public/hero/*.webp, package.json

Problem: the hero will show a static image of the fluid until the first
gesture, so it needs a faithful, small snapshot per orientation and a
repeatable way to regenerate it when the look changes.

Solution: a manual Playwright script (playwright-core 1.60.0, SwiftShader
WebGL) that loads a deployed page, lets the auto demo run, hides the nav,
copy and overlays, screenshots the hero at 1600x900 and 810x1440 and
encodes WebP q70 with sharp. A jest guard keeps each file under 60 KB.

Notes: the script is not part of the build; it captured these files from
production. Re-run: node scripts/capture-hero-snapshot.js <url>.
MSG
```

---

### Task 6: `HeroBackground` facade and wiring into `HeroSection`

**Files:**
- Create: `components/sections/hero-background.tsx`
- Modify: `components/sections/hero-section.tsx` (background block from Task 1)
- Modify: `__tests__/components/hero-section-ssr.test.tsx`
- Test: `__tests__/components/hero-background.test.tsx`, `__tests__/components/hero-source-policy.test.ts`

**Interfaces:**
- Consumes: `useFirstGesture` (Task 3), `shouldOfferLiveBackground` / `getLiveBackgroundQuality` / `readBackgroundEnv` / `BackgroundEnv` (Task 2), `LiquidEther` props `maxPixelRatio` and `onReady` (Task 4), snapshot files (Task 5).
- Produces: `export function HeroBackground(): JSX.Element` with no props; attributes `data-hero-background` (wrapper) and `data-hero-snapshot` (`<picture>`).

- [ ] **Step 1: Write the failing component tests**

```tsx
// __tests__/components/hero-background.test.tsx
/** @jest-environment jsdom */
import { act, render, screen } from "@testing-library/react"

// Stand-in for the WebGL component: exposes the props we care about and
// lets a test fire onReady by clicking it.
jest.mock("@/components/sections/LiquidEther", () => ({
  __esModule: true,
  default: (props: { iterationsViscous: number; maxPixelRatio: number; onReady: () => void }) => (
    <canvas
      data-testid="liquid-ether"
      data-iterations={props.iterationsViscous}
      data-max-dpr={props.maxPixelRatio}
      onClick={props.onReady}
    />
  ),
}))

import { HeroBackground } from "@/components/sections/hero-background"

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void
const observers: IOCallback[] = []

beforeEach(() => {
  observers.length = 0
  global.IntersectionObserver = class {
    constructor(cb: IOCallback) {
      observers.push(cb)
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
  setMedia([])
  delete (navigator as { connection?: unknown }).connection
})

function setMedia(matching: string[]): void {
  window.matchMedia = jest.fn((query: string) => ({ matches: matching.includes(query) })) as unknown as typeof window.matchMedia
}

async function flushEffects(): Promise<void> {
  await act(async () => {})
}

function gesture(type = "pointermove"): void {
  act(() => {
    window.dispatchEvent(new Event(type))
  })
}

function setHeroVisible(isIntersecting: boolean): void {
  act(() => {
    observers.forEach((cb) => cb([{ isIntersecting }]))
  })
}

describe("HeroBackground", () => {
  it("renders the snapshot picture and no canvas before any gesture", async () => {
    const { container } = render(<HeroBackground />)
    const img = container.querySelector("picture[data-hero-snapshot] img")
    expect(img).toHaveAttribute("src", "/hero/liquid-ether-landscape.webp")
    expect(img).toHaveAttribute("alt", "")
    expect(container.querySelector("picture source")).toHaveAttribute("media", "(orientation: portrait)")
    expect(container.querySelector("picture source")).toHaveAttribute("srcset", "/hero/liquid-ether-portrait.webp")
    await flushEffects()
    expect(screen.queryByTestId("liquid-ether")).toBeNull()
  })

  it("mounts the fluid after the first gesture and fades the snapshot once it is ready", async () => {
    const { container } = render(<HeroBackground />)
    await flushEffects()
    gesture()
    const canvas = await screen.findByTestId("liquid-ether")
    expect(canvas).toHaveAttribute("data-iterations", "32")
    expect(canvas).toHaveAttribute("data-max-dpr", "2")
    const picture = container.querySelector("picture[data-hero-snapshot]")
    expect(picture).toHaveClass("opacity-100")
    act(() => {
      canvas.click()
    })
    expect(picture).toHaveClass("opacity-0")
  })

  it("uses the reduced quality on coarse pointers", async () => {
    setMedia(["(pointer: coarse)"])
    render(<HeroBackground />)
    await flushEffects()
    gesture("touchstart")
    const canvas = await screen.findByTestId("liquid-ether")
    expect(canvas).toHaveAttribute("data-iterations", "16")
    expect(canvas).toHaveAttribute("data-max-dpr", "1.5")
  })

  it.each([
    ["prefers-reduced-motion", () => setMedia(["(prefers-reduced-motion: reduce)"])],
    ["save-data", () => Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true })],
  ])("never loads the fluid under %s", async (_label, arrange) => {
    arrange()
    render(<HeroBackground />)
    await flushEffects()
    gesture()
    await flushEffects()
    expect(screen.queryByTestId("liquid-ether")).toBeNull()
  })

  it("ignores gestures while the hero is out of view and accepts one once it is back", async () => {
    render(<HeroBackground />)
    await flushEffects()
    setHeroVisible(false)
    gesture("wheel")
    await flushEffects()
    expect(screen.queryByTestId("liquid-ether")).toBeNull()
    setHeroVisible(true)
    gesture("wheel")
    expect(await screen.findByTestId("liquid-ether")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Write the failing source-policy test**

```ts
// __tests__/components/hero-source-policy.test.ts
import { readFileSync } from "fs"
import { join } from "path"

// Regression tripwire: Three.js (180 KiB gz) and framer-motion (50 KiB gz)
// must never come back into the home page's initial bundle through the hero.
const read = (file: string): string => readFileSync(join(process.cwd(), file), "utf8")

describe("hero bundle policy", () => {
  it("hero-section imports neither the fluid, three nor framer-motion statically", () => {
    const src = read("components/sections/hero-section.tsx")
    expect(src).not.toMatch(/from ["'](three|framer-motion|\.\/LiquidEther|@\/components\/sections\/LiquidEther|@\/components\/performance\/motion-optimized)["']/)
  })

  it("hero-background only reaches LiquidEther through a lazy import()", () => {
    const src = read("components/sections/hero-background.tsx")
    expect(src).toMatch(/lazy\(\(\) => import\("@\/components\/sections\/LiquidEther"\)\)/)
    expect(src).not.toMatch(/^import .*LiquidEther/m)
  })

  it("LiquidEther no longer imports a CSS file", () => {
    expect(read("components/LiquidEther.jsx")).not.toMatch(/\.css["']/)
  })
})
```

- [ ] **Step 3: Run both test files to verify they fail**

Run: `npx jest __tests__/components/hero-background.test.tsx __tests__/components/hero-source-policy.test.ts`
Expected: FAIL — "Cannot find module '@/components/sections/hero-background'" and the hero-section static import assertion.

- [ ] **Step 4: Create `HeroBackground`**

```tsx
// components/sections/hero-background.tsx
"use client"

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useFirstGesture } from "@/lib/perf/use-first-gesture"
import {
  getLiveBackgroundQuality,
  readBackgroundEnv,
  shouldOfferLiveBackground,
  type BackgroundEnv,
} from "@/lib/perf/live-background-policy"

// Loaded on demand only: Three.js is 180 KiB gz and must stay out of the
// initial bundle. Lighthouse and crawlers never gesture, so they never
// download it; visitors get the animation on their first move or touch.
const LiquidEtherLazy = lazy(() => import("@/components/sections/LiquidEther"))

// Visual props of the fluid, identical to the look shipped before the facade.
const LIQUID_ETHER_LOOK = {
  colors: ["#5227FF", "#FF9FFC", "#B19EEF"],
  mouseForce: 12,
  cursorSize: 90,
  isViscous: true,
  viscous: 18,
  isBounce: false,
  autoDemo: true,
  autoSpeed: 0.35,
  autoIntensity: 1.6,
  takeoverDuration: 0.25,
  autoResumeDelay: 3000,
  autoRampDuration: 0.6,
}

const LIQUID_ETHER_STYLE = { width: "100%", height: "100%", position: "relative" } as const

type Mode = "static" | "loading" | "live"

export function HeroBackground() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const heroVisibleRef = useRef(true)
  const [mode, setMode] = useState<Mode>("static")
  const [env, setEnv] = useState<BackgroundEnv | null>(null)

  // Media queries are read after hydration only: the server has no viewport
  // and rendering from them would cause a hydration mismatch.
  useEffect(() => {
    setEnv(readBackgroundEnv())
  }, [])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const observer = new IntersectionObserver(([entry]) => {
      heroVisibleRef.current = entry.isIntersecting
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  // A gesture while the hero is scrolled away must not pay for the fluid.
  const handleGesture = useCallback((): boolean => {
    if (!heroVisibleRef.current) return false
    setMode("loading")
    return true
  }, [])

  const offerLive = env !== null && mode === "static" && shouldOfferLiveBackground(env)
  useFirstGesture(handleGesture, offerLive)

  const quality = env ? getLiveBackgroundQuality(env) : null

  return (
    <div ref={wrapperRef} data-hero-background className="pointer-events-none absolute inset-0 z-0 h-full opacity-75">
      <picture
        data-hero-snapshot
        className={cn("absolute inset-0 transition-opacity duration-700", mode === "live" ? "opacity-0" : "opacity-100")}
      >
        <source media="(orientation: portrait)" srcSet="/hero/liquid-ether-portrait.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element -- art direction by orientation; next/image cannot switch sources */}
        <img
          src="/hero/liquid-ether-landscape.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </picture>
      {mode !== "static" && quality && (
        <Suspense fallback={null}>
          <LiquidEtherLazy
            {...LIQUID_ETHER_LOOK}
            {...quality}
            style={LIQUID_ETHER_STYLE}
            onReady={() => setMode("live")}
          />
        </Suspense>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Wire it into `HeroSection`**

In `components/sections/hero-section.tsx`: remove `import LiquidEther from "./LiquidEther"`, add `import { HeroBackground } from "./hero-background"`, and replace the whole background block (the `<div className="pointer-events-none absolute inset-0 z-0 h-full opacity-75">…</div>` with the `<LiquidEther …/>` inside, comment included) with:

```tsx
      <HeroBackground />
```

- [ ] **Step 6: Update the SSR test**

In `__tests__/components/hero-section-ssr.test.tsx` remove the `jest.mock("@/components/sections/LiquidEther", …)` block (the fluid is no longer statically imported) and add:

```tsx
  it("ships the snapshot picture and no canvas in the server HTML", () => {
    expect(html).toContain("data-hero-snapshot")
    expect(html).toContain('src="/hero/liquid-ether-landscape.webp"')
    expect(html).not.toContain("<canvas")
  })
```

- [ ] **Step 7: Run the three test files to verify they pass**

Run: `npx jest __tests__/components/hero-background.test.tsx __tests__/components/hero-source-policy.test.ts __tests__/components/hero-section-ssr.test.tsx`
Expected: PASS (6 + 3 + 4 tests).

- [ ] **Step 8: Commit**

```bash
git add components/sections/hero-background.tsx components/sections/hero-section.tsx __tests__/components/hero-background.test.tsx __tests__/components/hero-source-policy.test.ts __tests__/components/hero-section-ssr.test.tsx
git -c commit.gpgsign=false commit -F - <<'MSG'
feat(hero): static snapshot background with gesture-activated fluid sim

Scope: components/sections/hero-background.tsx, components/sections/hero-section.tsx

Problem: LiquidEther (Three.js, 180 KiB gz) was statically imported by
the hero and started its fluid simulation on mount for every visitor,
including Lighthouse: 40 s of main-thread work on mobile and a chunk
that is never needed before the visitor interacts.

Solution: HeroBackground paints a WebP snapshot of the fluid (portrait
source for phones) with fetchpriority=high and lazy-loads LiquidEther on
the first pointer/touch/wheel/key gesture while the hero is in view,
then crossfades once the first frame is rendered. It never loads under
prefers-reduced-motion or Save-Data and uses half the solver iterations
and a 1.5 DPR cap on coarse pointers.

Notes: source-policy tests keep three and framer-motion out of the hero
for good. Gestures before hydration are intentionally ignored.
MSG
```

---

### Task 7: Navigation mobile menu without framer-motion

**Files:**
- Modify: `components/layout/navigation.tsx` (import at line 8, mobile block at lines 87-123, toggle button at lines 78-82)
- Test: `__tests__/components/navigation.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/navigation.test.tsx
/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"

jest.mock("next/navigation", () => ({ usePathname: () => "/es" }))
jest.mock("@/components/contact/contact-modal", () => ({ ContactModal: () => null }))
jest.mock("@/components/layout/language-switcher", () => ({ LanguageSwitcher: () => <div data-testid="lang" /> }))

import { Navigation } from "@/components/layout/navigation"

describe("Navigation mobile menu", () => {
  it("toggles the mobile links with an accessible button", () => {
    render(<Navigation />)
    const toggle = screen.getByRole("button", { name: "Menu" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    // Desktop links are always in the DOM (hidden by CSS); the mobile copy appears on open.
    expect(screen.getAllByText("services")).toHaveLength(1)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getAllByText("services")).toHaveLength(2)

    fireEvent.click(screen.getAllByText("services")[1])
    expect(screen.getAllByText("services")).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/navigation.test.tsx`
Expected: FAIL — no button named "Menu".

- [ ] **Step 3: Edit `navigation.tsx`**

Delete the line `import { motion, AnimatePresence } from "framer-motion"`.

Replace the mobile toggle button with:

```tsx
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="text-foreground"
              aria-label="Menu"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
```

Replace everything from `{/* Mobile Navigation */}` through the closing `</AnimatePresence>` with:

```tsx
      {/* Mobile Navigation. CSS-only entrance keeps framer-motion (50 KiB gz)
          out of every page's initial bundle; no exit animation by design. */}
      {isOpen && (
        <div className="md:hidden bg-background border-b border-border animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {!isBlog && navItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="text-muted-foreground hover:text-foreground block px-3 py-2 text-base font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t(item.key)}
              </a>
            ))}
            <div className="flex items-center space-x-4 px-3 py-2">
              <LanguageSwitcher />
              <Button
                onClick={() => { setContactOpen(true); setIsOpen(false) }}
                className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white"
                data-contact-trigger
              >
                {t("contact")}
              </Button>
              <Button variant="outline" asChild>
                <a href={`/${locale}/admin`} onClick={() => setIsOpen(false)}>Admin</a>
              </Button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/components/navigation.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/layout/navigation.tsx __tests__/components/navigation.test.tsx
git -c commit.gpgsign=false commit -F - <<'MSG'
refactor(nav): animate the mobile menu with CSS instead of framer-motion

Scope: components/layout/navigation.tsx

Problem: the navigation is mounted on every page and imported motion and
AnimatePresence just for the mobile menu, dragging the 50 KiB gz
framer-motion chunk into every initial bundle.

Solution: the menu keeps its conditional render and enters with a
tailwindcss-animate fade/slide. The toggle gains aria-label and
aria-expanded.

Notes: no exit animation, by design.
MSG
```

---

### Task 8: Cookie banner without framer-motion

**Files:**
- Modify: `components/gdpr/cookie-banner.tsx` (import at line 4, banner block lines 117-154, settings block lines 156-253)
- Test: `__tests__/components/cookie-banner-flow.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/cookie-banner-flow.test.tsx
/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import { CookieBanner } from "@/components/gdpr/cookie-banner"

// next-intl is mocked globally: every t(key) renders the key.
describe("CookieBanner flow (CSS animations, no framer-motion)", () => {
  beforeEach(() => localStorage.clear())

  it("shows the banner on first visit and hides it after accepting all", () => {
    render(<CookieBanner />)
    expect(screen.getByText("title")).toBeInTheDocument()
    fireEvent.click(screen.getByText("acceptAll"))
    expect(screen.queryByText("title")).toBeNull()
    expect(JSON.parse(localStorage.getItem("cookie-consent") ?? "{}")).toMatchObject({ analytics: true, marketing: true })
  })

  it("opens the settings dialog and closes it on save", () => {
    render(<CookieBanner />)
    fireEvent.click(screen.getByText("customize"))
    expect(screen.getByText("settings.title")).toBeInTheDocument()
    fireEvent.click(screen.getByText("settings.save"))
    expect(screen.queryByText("settings.title")).toBeNull()
    expect(localStorage.getItem("cookie-consent")).not.toBeNull()
  })

  it("does not render framer-motion wrappers", () => {
    const { container } = render(<CookieBanner />)
    expect(container.querySelector("[style*='opacity']")).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/cookie-banner-flow.test.tsx`
Expected: FAIL on "does not render framer-motion wrappers" (framer sets inline `opacity`); the two flow tests may already pass.

- [ ] **Step 3: Edit `cookie-banner.tsx`**

Delete `import { motion, AnimatePresence } from "framer-motion"`.

Replace the banner block (`<AnimatePresence>{showBanner && (<motion.div … data-ignore-cls="true">` … `</motion.div>)}</AnimatePresence>`) so that it becomes:

```tsx
      {showBanner && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 animate-in fade-in duration-300"
          data-ignore-cls="true"
        >
          {/* Card and its content: unchanged */}
        </div>
      )}
```

Replace the settings block (`<AnimatePresence>{showSettings && (<motion.div className="fixed inset-0 …"><motion.div className="w-full max-w-2xl">` … `</motion.div></motion.div>)}</AnimatePresence>`) so that it becomes:

```tsx
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Card and its content: unchanged */}
          </div>
        </div>
      )}
```

Keep every child (Card, buttons, toggles, texts) exactly as it is; only the wrappers change.

- [ ] **Step 4: Run the new and the existing banner tests**

Run: `npx jest __tests__/components/cookie-banner-flow.test.tsx __tests__/components/cookie-banner-slim.test.tsx`
Expected: PASS (3 + 2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/gdpr/cookie-banner.tsx __tests__/components/cookie-banner-flow.test.tsx
git -c commit.gpgsign=false commit -F - <<'MSG'
refactor(gdpr): animate the cookie banner with CSS instead of framer-motion

Scope: components/gdpr/cookie-banner.tsx

Problem: the banner is mounted in the locale layout on every page and
imported framer-motion for two opacity fades, keeping its 50 KiB gz
chunk in every initial bundle.

Solution: the banner and the settings overlay keep their conditional
render and enter with tailwindcss-animate fades; the settings card adds
a subtle zoom-in. Consent logic untouched.

Notes: no exit animation, by design.
MSG
```

---

### Task 9: Services section through `LazyMotionDiv` + framer tripwire

**Files:**
- Modify: `components/sections/services-section.tsx` (import at line 4, the two `motion.div` usages at lines 43-52 and 58-117)
- Test: `__tests__/components/services-section.test.tsx`, `__tests__/components/framer-motion-initial-bundle.test.ts`

**Interfaces:**
- Consumes: `LazyMotionDiv` from `components/performance/motion-optimized.tsx` — `(props: ComponentProps<'div'> & { animate?, initial?, transition?, viewport?, whileInView? }) => JSX.Element`; it renders a plain `<div style="opacity:0;transform:translateY(20px)">` until visible, then loads framer-motion.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/components/framer-motion-initial-bundle.test.ts
import { readFileSync } from "fs"
import { join } from "path"

// These components render on the home page's first paint (navigation and
// the cookie banner on every page). A direct framer-motion import drags the
// whole 50 KiB gz chunk into the initial bundle: animate with CSS or go
// through components/performance/motion-optimized.tsx.
const FILES = [
  "components/layout/navigation.tsx",
  "components/gdpr/cookie-banner.tsx",
  "components/sections/services-section.tsx",
  "components/sections/hero-section.tsx",
]

describe.each(FILES)("%s", (file) => {
  it("does not import framer-motion directly", () => {
    const src = readFileSync(join(process.cwd(), file), "utf8")
    expect(src).not.toMatch(/from ["']framer-motion["']/)
  })
})
```

```tsx
// __tests__/components/services-section.test.tsx
/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { ServicesSection } from "@/components/sections/services-section"

describe("ServicesSection", () => {
  it("renders the four services", () => {
    render(<ServicesSection />)
    for (const key of ["web", "erp", "crm", "automation"]) {
      expect(screen.getByText(`${key}.title`)).toBeInTheDocument()
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify the tripwire fails**

Run: `npx jest __tests__/components/framer-motion-initial-bundle.test.ts __tests__/components/services-section.test.tsx`
Expected: the `services-section.tsx` tripwire FAILS; the other three files pass (Tasks 1, 7, 8 done); the services render test passes.

- [ ] **Step 3: Edit `services-section.tsx`**

Replace `import { motion } from "framer-motion"` with `import { LazyMotionDiv } from "@/components/performance/motion-optimized"`. Replace both `<motion.div` … `</motion.div>` pairs with `<LazyMotionDiv` … `</LazyMotionDiv>`, keeping their props (`initial`, `whileInView`, `transition`, `viewport`, `className`, `key`) unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/components/framer-motion-initial-bundle.test.ts __tests__/components/services-section.test.tsx`
Expected: PASS (4 + 1 tests).

- [ ] **Step 5: Commit**

```bash
git add components/sections/services-section.tsx __tests__/components/services-section.test.tsx __tests__/components/framer-motion-initial-bundle.test.ts
git -c commit.gpgsign=false commit -F - <<'MSG'
refactor(perf): keep framer-motion out of the initial bundle

Scope: components/sections/services-section.tsx, __tests__

Problem: the services section imported motion directly, so framer-motion
was part of the home page's initial JavaScript even though the section
sits below the full-height hero.

Solution: the section uses the existing viewport-gated LazyMotionDiv,
which loads framer-motion only when it scrolls into view. A source
tripwire test now forbids direct framer-motion imports in navigation,
cookie banner, services and hero.

Notes: the whileInView animation is unchanged.
MSG
```

---

### Task 10: Radix tooltip instead of `react-tooltip`

**Files:**
- Modify: `components/sections/services-section.tsx` (imports at lines 7 and 11, card block lines 66-115)
- Modify: `package.json`, `package-lock.json` (remove `react-tooltip`)
- Test: `__tests__/components/services-section.test.tsx`

**Interfaces:**
- Consumes: `Tooltip`, `TooltipTrigger`, `TooltipContent` from `components/ui/tooltip.tsx` (Radix; `Tooltip` wraps its own provider and accepts `delayDuration`).

- [ ] **Step 1: Add the failing tooltip test**

Append to `__tests__/components/services-section.test.tsx`, inside the `describe`:

```tsx
  it("shows the service tooltip on focus through the Radix tooltip", async () => {
    render(<ServicesSection />)
    const trigger = screen.getByText("erp.title").closest("[data-slot='tooltip-trigger']")
    expect(trigger).not.toBeNull()
    fireEvent.focus(trigger as Element)
    // Radix renders the content plus a visually hidden copy for screen readers.
    const copies = await screen.findAllByText("erp.tooltip")
    expect(copies.length).toBeGreaterThanOrEqual(1)
  })
```

and change the import line to `import { fireEvent, render, screen } from "@testing-library/react"`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/services-section.test.tsx`
Expected: FAIL — `trigger` is null (no Radix trigger yet).

- [ ] **Step 3: Edit `services-section.tsx`**

Replace `import { Tooltip } from "react-tooltip"` with `import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"` and delete `import 'react-tooltip/dist/react-tooltip.css'`.

Replace the card block inside the `services.map` (from `<Card` through the closing `)}` of the react-tooltip conditional) with:

```tsx
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    {/* Wrapper div: Card is a plain function component and cannot receive the trigger ref. */}
                    <div className="h-full" tabIndex={0}>
                      <Card className="h-full bg-card border-border hover:border-[#05b4ba]/50 transition-colors group cursor-pointer">
                        <CardHeader className="text-center">
                          {service.key === "automation" && (
                            <Badge
                              variant="default"
                              className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white border-none"
                            >
                              + {t("automation.badge")}
                            </Badge>
                          )}
                          <div className="mx-auto mb-4 p-3 rounded-lg bg-muted group-hover:bg-[#05b4ba]/10 transition-colors">
                            <Icon className="h-8 w-8 text-[#05b4ba]" />
                          </div>
                          <CardTitle className="text-xl font-semibold text-foreground">
                            {t(`${service.key}.title`)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                          <CardDescription className="text-muted-foreground mb-6 text-pretty">
                            {t(`${service.key}.description`)}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={8}
                    className="max-w-[280px] rounded-xl border border-[#05b4ba]/30 bg-[#05b4ba]/95 px-4 py-3 text-xs font-medium text-white shadow-xl backdrop-blur"
                  >
                    {t(`${service.key}.tooltip`)}
                  </TooltipContent>
                </Tooltip>
```

Remove the now-unused `data-tooltip-id` / `data-tooltip-content` attributes (they were on the old `<Card>`).

- [ ] **Step 4: Remove the dependency**

Run: `grep -rl "react-tooltip" app components lib --include=*.tsx --include=*.ts` → expected: no output. Then `npm uninstall react-tooltip`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest __tests__/components/services-section.test.tsx __tests__/components/framer-motion-initial-bundle.test.ts`
Expected: PASS (2 + 4 tests).

- [ ] **Step 6: Commit**

```bash
git add components/sections/services-section.tsx __tests__/components/services-section.test.tsx package.json package-lock.json
git -c commit.gpgsign=false commit -F - <<'MSG'
refactor(services): replace react-tooltip with the Radix tooltip

Scope: components/sections/services-section.tsx, package.json

Problem: react-tooltip shipped its own JavaScript and a separate
render-blocking stylesheet on the home page, while the project already
has a Radix tooltip component.

Solution: each service card is the trigger of a Radix tooltip (focusable
wrapper for keyboard users) with the same teal styling; react-tooltip
and its CSS import are gone from the dependency list.

Notes: Radix does not open tooltips on touch, which matches native
behaviour on phones.
MSG
```

---

### Task 11: Load `gtag.js` after window load

**Files:**
- Modify: `components/analytics/google-analytics.tsx` (line 76)
- Test: `__tests__/components/google-analytics.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/google-analytics.test.tsx
/** @jest-environment jsdom */
import { render } from "@testing-library/react"

jest.mock("next/navigation", () => ({ usePathname: () => "/es" }))
jest.mock("next/script", () => ({
  __esModule: true,
  default: ({ src, strategy }: { src?: string; strategy?: string }) => (
    <script data-testid="gtag" data-strategy={strategy} src={src} />
  ),
}))

// The measurement id is read at module load, so the module is required
// inside an isolated registry after the env is set.
function loadGoogleAnalytics(): () => JSX.Element | null {
  let component: (() => JSX.Element | null) | undefined
  jest.isolateModules(() => {
    component = require("@/components/analytics/google-analytics").GoogleAnalytics
  })
  return component as () => JSX.Element | null
}

describe("GoogleAnalytics", () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env, NODE_ENV: "production", NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST" }
    window.dataLayer = []
  })

  afterEach(() => {
    process.env = env
  })

  it("loads gtag.js after window load and queues js/consent/config before it arrives", () => {
    const GoogleAnalytics = loadGoogleAnalytics()
    const { getByTestId } = render(<GoogleAnalytics />)
    expect(getByTestId("gtag")).toHaveAttribute("data-strategy", "lazyOnload")
    expect(getByTestId("gtag")).toHaveAttribute("src", "https://www.googletagmanager.com/gtag/js?id=G-TEST")
    const commands = window.dataLayer.map((args) => Array.from(args as ArrayLike<unknown>)[0])
    expect(commands).toEqual(["js", "consent", "config"])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/google-analytics.test.tsx`
Expected: FAIL — `data-strategy` is `afterInteractive`.

- [ ] **Step 3: Change the strategy**

In `components/analytics/google-analytics.tsx` replace `strategy="afterInteractive"` with `strategy="lazyOnload"` and add above the `<Script`:

```tsx
    // gtag.js is 190 KiB and competed with hydration for the main thread.
    // The stub above queues js/consent/config in dataLayer, so loading the
    // library after window.load loses nothing but the visitors who bounce
    // before the page finishes loading (accepted trade-off, 2026-09-22).
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/components/google-analytics.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/analytics/google-analytics.tsx __tests__/components/google-analytics.test.tsx
git -c commit.gpgsign=false commit -F - <<'MSG'
perf(analytics): load gtag.js after window load

Scope: components/analytics/google-analytics.tsx

Problem: gtag.js (190 KiB, 76 KiB unused) loaded with afterInteractive and
competed with hydration and the LCP paint on mobile.

Solution: strategy lazyOnload. The gtag stub and dataLayer queue are
created in an effect before the script arrives, so the initial page_view
and any earlier track() calls are still delivered.

Notes: visitors who leave before window.load are no longer counted in
GA; accepted by the product owner. Apollo and the OpenAI pixel already
load only after marketing consent and are unchanged.
MSG
```

---

### Task 12: Verification and bookkeeping

**Files:**
- Modify: `tasks/lessons.md` (append), `tasks/todo.md` (tick items; gitignored, not committed)

- [ ] **Step 1: Full test run with coverage**

Run: `npm run test:coverage 2>&1 | tail -40`
Expected: all suites pass; the global thresholds (85 % branches/functions/lines/statements) are met. If a pre-existing suite fails for reasons unrelated to this branch, record its name and the error verbatim in the final report; do not "fix" unrelated tests.

- [ ] **Step 2: Production build with the client-side chunk report**

Run:
```bash
DATABASE_URL=postgres://e2d:build@127.0.0.1:5436/e2d npm run build:next 2>&1 | tail -60
```
Expected: build succeeds. Then run the same chunk report used for the baseline:

```bash
node -e '
const m=require("./.next/app-build-manifest.json");const fs=require("fs");const zlib=require("zlib");
const set=new Set();for(const k of ["/[locale]/layout","/[locale]/page"])for(const f of (m.pages[k]||[]))set.add(f);
let gz=0;const rows=[];
for(const f of set){const b=fs.readFileSync(".next/"+f);const g=zlib.gzipSync(b).length;gz+=g;rows.push([g,f])}
rows.sort((a,b)=>b[0]-a[0]);
for(const [g,f] of rows)console.log((g/1024).toFixed(1).padStart(7)+" KiB gz  "+f.replace("static/",""));
console.log("TOTAL gz:",(gz/1024).toFixed(1),"KiB ·",set.size,"files");'
```
Expected versus the baseline (463.6 KiB gz, 11 JS files): no `threejs-*` and no `framer-motion-*` chunk in the list; total gz at least 230 KiB lower. Record the table in the final report.

- [ ] **Step 3: Confirm the fluid chunk still exists as an async chunk**

Run: `ls .next/static/chunks/ | grep -E "^threejs-"`
Expected: one file (loaded only after the gesture).

- [ ] **Step 4: Append the lesson**

Append to `tasks/lessons.md`:

```markdown
## 2026-09-22 — Facade estática + activación por gesto para componentes WebGL/pesados

**Patrón**: cualquier componente caro (Three.js, simulaciones, vídeo) que no aporte nada hasta que el visitante interactúa se sirve como *facade*: una imagen estática en el HTML del servidor (con `fetchpriority=high` si está above the fold) y un `React.lazy(() => import(...))` que solo se monta tras el primer gesto (`pointermove`/`pointerdown`/`touchstart`/`wheel`/`keydown`) y con el elemento en viewport. Lighthouse y los crawlers nunca gesticulan → nunca descargan el chunk ni ejecutan la simulación; los visitantes reales lo ven al primer movimiento.

**Reglas**:
- El elemento LCP (H1) nunca puede depender de JS para ser visible: nada de `opacity:0` inline a la espera de hidratar o de un chunk de animación. Fade solo CSS (`motion-safe:animate-in fade-in`).
- Un `import` estático de `three`/`framer-motion` en un componente montado en la primera pintura mete todo el chunk en el bundle inicial aunque exista un wrapper lazy en otro sitio. Tripwires de fuente en `__tests__/components/hero-source-policy.test.ts` y `framer-motion-initial-bundle.test.ts`.
- Cada `import './x.css'` en un componente cliente emite un CSS render-blocking aparte en Next 14: para 5 líneas, usar utilidades Tailwind (y recordar que el `content` de Tailwind debe incluir la extensión del fichero).
- Respetar `prefers-reduced-motion` y `navigator.connection.saveData`: esos visitantes se quedan con la imagen.
- Snapshot: capturar con el wrapper a opacidad 1 y mostrarlo a la opacidad original sobre el mismo fondo — el resultado compuesto es idéntico al vivo.
```

- [ ] **Step 5: Commit the lesson**

```bash
git add tasks/lessons.md
git -c commit.gpgsign=false commit -F - <<'MSG'
docs: lesson on static facades with gesture-gated heavy components

Scope: tasks/lessons.md

Problem: the hero performance work surfaced rules (LCP element must not
depend on JS, static imports of heavy libraries in first-paint
components, per-component CSS files, reduced-motion) worth keeping.

Solution: recorded as a lessons entry with the tripwire tests that
enforce them.

Notes: none.
MSG
```

- [ ] **Step 6: Tick `tasks/todo.md`**

Mark items 1-6 done in `tasks/todo.md` and paste the chunk table from Step 2 under "### 0. Baseline" as "Después". This file is gitignored: no commit.

---

### Task 13 (separate PR, after the feature branch): remove dead 3D code and dependencies

**Files:**
- Branch: `git checkout -b chore/remove-dead-3d` from `feature/perf-hero-snapshot` (stacked; merge after the feature PR so the lockfile does not conflict).
- Delete: `components/3d/hero-3d.tsx`, `components/ColorBends.tsx`, `components/ColorBendsBase.tsx`, `components/ColorBends.css`, `components/ui/orb.tsx`, `components/ui/orb-optimized.tsx`, `components/ui/orb-skeleton.tsx`, `styles/orb.css`, `components/visual/threads.tsx`, `components/visual/Threads.css`, `components/performance/motion-lazy.tsx`, `components/ai-agent/ai-agent-button.tsx`, `components/ai-agent/ai-agent-modal.tsx`, `__tests__/hero3d.test.tsx`, `__tests__/hero3d-integration.test.tsx`
- Modify: `components/performance/lazy-components.tsx` (remove `Hero3DComponent`, `Hero3DLazy`, `AIAgentModalLazy`, the `ClientOnly`/`Hero3DFallback`/`ModalFallback` imports if unused), `components/performance/loading-fallbacks.tsx` (remove `Hero3DFallback` and `ModalFallback` if nothing imports them), `__tests__/components/lazy-sections-ssr.test.tsx`, `next.config.mjs` (`optimizePackageImports`: remove `'@react-three/fiber'`, `'@react-three/drei'`, `'ogl'`; `threejs` cacheGroup regex → `/[\\/]node_modules[\\/]three[\\/]/`), `package.json` + lock (`npm uninstall @react-three/fiber @react-three/drei ogl`; keep `three`, LiquidEther uses it).

- [ ] **Step 1: Confirm nothing imports the files**

Run: `grep -rn "hero-3d\|ColorBends\|ui/orb\|orb-skeleton\|orb-optimized\|visual/threads\|motion-lazy\|ai-agent/\|Hero3DLazy\|AIAgentModalLazy\|@react-three\|from \"ogl\"\|from 'ogl'" app components lib --include=*.tsx --include=*.ts --include=*.jsx | grep -v "^components/\(3d\|ai-agent\|visual\|ui/orb\|ColorBends\|performance/lazy-components\|performance/motion-lazy\)"`
Expected: no output (the only hits are inside the files being deleted or in `lazy-components.tsx`, which is edited). Also check `components/ElectricBorder.jsx` is NOT in the list (it is used by `projects-section.tsx` and stays).

- [ ] **Step 2: Update the SSR policy test**

Replace the first `describe` in `__tests__/components/lazy-sections-ssr.test.tsx` with:

```tsx
describe("lazy-components SSR policy", () => {
  const src = readFileSync(join(process.cwd(), "components/performance/lazy-components.tsx"), "utf8")

  it("never disables SSR: every lazy section must server-render for crawlers", () => {
    expect(src).not.toMatch(/ssr:\s*false/)
  })
})
```

- [ ] **Step 3: Delete files, edit `lazy-components.tsx`, `loading-fallbacks.tsx`, `next.config.mjs`, uninstall deps**

Run `git rm` for every file in the delete list, apply the edits, then `npm uninstall @react-three/fiber @react-three/drei ogl`.

- [ ] **Step 4: Verify**

Run: `npx jest __tests__/components/lazy-sections-ssr.test.tsx && npm test 2>&1 | tail -15 && DATABASE_URL=postgres://e2d:build@127.0.0.1:5436/e2d npm run build:next 2>&1 | tail -20`
Expected: tests green, build succeeds, and `grep -c "react-three\|\"ogl\"" package.json` prints 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git -c commit.gpgsign=false commit -F - <<'MSG'
chore: remove unused 3D components and dependencies

Scope: components/3d, ColorBends, orb, threads, ai-agent, motion-lazy, next.config.mjs, package.json

Problem: several 3D/visual components (react-three hero, ColorBends,
orb, threads, AI agent modal) and their dependencies were no longer
rendered anywhere but still had tests, config entries and packages,
confusing bundle analysis and slowing installs.

Solution: delete the dead components, their CSS and tests; drop
@react-three/fiber, @react-three/drei and ogl (three stays: LiquidEther
uses it); tighten the lazy-components SSR policy test to forbid
ssr:false entirely.

Notes: stacked on feature/perf-hero-snapshot; merge after it.
MSG
```

Then `git checkout feature/perf-hero-snapshot`.
