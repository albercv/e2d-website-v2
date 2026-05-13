# Apollo Tracker Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Apollo.io visitor tracker to every page, disclosed in the marketing cookies section of the existing banner.

**Architecture:** New `ApolloTracker` client component wraps the Apollo inline loader script via `next/script strategy="afterInteractive"`. Mounted in root `app/layout.tsx` alongside `GoogleAnalytics`. Fires unconditionally for all visitors. Marketing cookie description updated in all 3 locales to disclose Apollo.

**Tech Stack:** Next.js 14 App Router, `next/script`, next-intl (es/en/it)

---

## File Map

| File | Action |
|------|--------|
| `components/analytics/apollo-tracker.tsx` | Create — Apollo loader component |
| `app/layout.tsx` | Modify — add import, dns-prefetch, mount component |
| `messages/es.json` | Modify — update `cookies.settings.marketing.description` |
| `messages/en.json` | Modify — update `cookies.settings.marketing.description` |
| `messages/it.json` | Modify — update `cookies.settings.marketing.description` |

---

## Task 1: Create branch

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b feature/apollo-tracker
```

Expected: `Switched to a new branch 'feature/apollo-tracker'`

---

## Task 2: Create ApolloTracker component

**Files:**
- Create: `components/analytics/apollo-tracker.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client"

import Script from "next/script"

declare global {
  interface Window {
    trackingFunctions: {
      onLoad: (opts: { appId: string }) => void
    }
  }
}

export function ApolloTracker() {
  return (
    <Script id="apollo-tracker" strategy="afterInteractive">{`
      (function(){
        var n=Math.random().toString(36).substring(7),o=document.createElement("script");
        o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n;
        o.async=true;o.defer=true;
        o.onload=function(){window.trackingFunctions.onLoad({appId:"6a04409482614e0019067475"})};
        document.head.appendChild(o);
      })();
    `}</Script>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep apollo
```

Expected: no output (no errors in the new file)

---

## Task 3: Mount in root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add import and dns-prefetch, mount component**

In `app/layout.tsx`:

Add import at line 7 (after existing GoogleAnalytics import):
```tsx
import { ApolloTracker } from "@/components/analytics/apollo-tracker"
```

Add dns-prefetch in `<head>` after line 68 (after the googletagmanager dns-prefetch):
```tsx
<link rel="dns-prefetch" href="https://assets.apollo.io" />
```

Add component in `<body>` at line 73 (after `<GoogleAnalytics />`):
```tsx
<ApolloTracker />
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "layout|apollo"
```

Expected: no output

---

## Task 4: Update i18n marketing descriptions

**Files:**
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/it.json`

- [ ] **Step 1: Update Spanish**

In `messages/es.json`, replace:
```json
"description": "Utilizadas para mostrar anuncios relevantes y medir campañas."
```
With:
```json
"description": "Utilizadas para mostrar anuncios relevantes y medir campañas. Incluye Apollo.io para identificación de visitantes."
```

- [ ] **Step 2: Update English**

In `messages/en.json`, replace:
```json
"description": "Used to show relevant ads and measure campaigns."
```
With:
```json
"description": "Used to show relevant ads and measure campaigns. Includes Apollo.io for visitor identification."
```

- [ ] **Step 3: Update Italian**

In `messages/it.json`, replace:
```json
"description": "Utilizzati per mostrare annunci rilevanti e misurare le campagne."
```
With:
```json
"description": "Utilizzati per mostrare annunci rilevanti e misurare le campagne. Include Apollo.io per l'identificazione dei visitatori."
```

---

## Task 5: Commit

- [ ] **Step 1: Stage and commit all changes**

```bash
git add components/analytics/apollo-tracker.tsx app/layout.tsx messages/es.json messages/en.json messages/it.json
git commit -m "feat(analytics): add Apollo.io visitor tracker

Scope: analytics / i18n
Problem: No B2B visitor identification on the site.
Solution: New ApolloTracker component using next/script afterInteractive.
Fires unconditionally for all visitors. Marketing cookie description
updated in es/en/it to disclose Apollo.io.
Notes: appId 6a04409482614e0019067475. No consent gating by design."
```
