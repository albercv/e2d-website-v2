# Apollo Tracker Integration — Design Spec

**Date:** 2026-05-13  
**Branch:** `feature/apollo-tracker`  
**Status:** Approved

---

## Goal

Add Apollo.io website visitor tracker to e2d-website-v2. Fires for all visitors unconditionally (no consent gating). Apollo is disclosed in the marketing cookies section of the existing cookie banner.

---

## Architecture

### New component

**`components/analytics/apollo-tracker.tsx`**

- `"use client"` directive
- Uses `next/script` with `strategy="afterInteractive"` (fires after hydration, non-blocking)
- Inline script recreates Apollo's dynamic loader with cache-buster `?nocache=<random>`
- Calls `window.trackingFunctions.onLoad({ appId: "6a04409482614e0019067475" })` on script load
- Declares `window.trackingFunctions` TypeScript global

### Mount point

**`app/layout.tsx`** — add `<ApolloTracker />` alongside existing `<GoogleAnalytics />`. Root layout ensures it fires on every page across all locales.

---

## i18n Updates

Update `cookies.settings.marketing.description` in all three locale files to mention Apollo:

| Locale | File |
|--------|------|
| `es` | `messages/es.json` |
| `en` | `messages/en.json` |
| `it` | `messages/it.json` |

Apollo fires unconditionally — the banner mention is for transparency, not gating.

---

## Data Flow

```
Browser hydration complete
  → next/script afterInteractive fires
  → inline IIFE creates <script src="assets.apollo.io/...?nocache=<random>">
  → tracker.iife.js loads from Apollo CDN
  → onLoad: window.trackingFunctions.onLoad({ appId: "6a04409482614e0019067475" })
  → Apollo identifies visitor, sends data to apollo.io
```

No localStorage. No cookies set by this component. No server-side calls.

---

## Files Changed

| File | Change |
|------|--------|
| `components/analytics/apollo-tracker.tsx` | New — Apollo loader component |
| `app/layout.tsx` | Add `<ApolloTracker />` import + mount |
| `messages/es.json` | Update `cookies.settings.marketing.description` |
| `messages/en.json` | Update `cookies.settings.marketing.description` |
| `messages/it.json` | Update `cookies.settings.marketing.description` |

---

## Out of Scope

- Consent gating for Apollo (decided: always fires)
- Apollo event tracking calls beyond initial `onLoad`
- Changes to cookie banner logic or `CookiePreferences` type
- New tests (component has no branching logic)
