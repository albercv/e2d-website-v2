# GA4 not firing — debugging report (handoff)

**Date:** 2026-05-22
**Branch:** `feature/google-meassurement`
**Measurement ID:** `G-MRBEMWLB6V`
**Status:** RESOLVED — fix verified in production 2026-05-22, GA4 receiving events. See UPDATE 3.

---

## UPDATE 2026-05-22 (late)

Phone test was run (mobile data, wifi off) AND on wifi → **no data reached GA4
in either case.**

This eliminates:
- **Candidate A (dev browser extension only)** — the phone has no such
  extension, yet still no data.
- **Internal Traffic IP filter** — phone on 4G uses a random carrier IP, not
  the office IP, so an IP-based filter cannot explain it.

Remaining cause is broader — one of:
1. **gtag.js never actually transmits** `g/collect` (a real bug hitting every
   visitor), or
2. **The data stream `G-MRBEMWLB6V` is wrong / inactive** — hits are sent but
   land in a property/stream nobody is looking at, or a dead stream.

CONFOUND TO RESOLVE FIRST: it is unconfirmed whether the phone test clicked
**"Aceptar todo"** on the cookie banner. If not, consent stayed `denied`,
GA4 sent only cookieless pings, and GA4 Realtime may not surface those.
Redo the phone test and explicitly click "Aceptar todo" before judging.

The single unanswered question that splits cause 1 from cause 2:
**does `g/collect` leave the browser at all?** Every Network check so far was
confounded (extension, or capture timing).

### UPDATE 2 — LEADING HYPOTHESIS: wrong measurement ID

Two more facts from the user:
- Tried **3 different browsers** — all fail. Not a browser issue.
- The user has **another project that DOES receive GA4 data** — so the GA4
  platform and the user's GA4 account both work.

Therefore the bug is **specific to this project**. The only project-specific
GA variable is the measurement ID. `.env` contains:
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-MRBEMWLB6V
```
(single `.env`, no `.env.local` / `.env.production` override.)

**Leading hypothesis (DISPROVEN — see UPDATE 3):** `G-MRBEMWLB6V` wrong/stale.
The user checked GA4 Admin → Data Streams: the e2d web stream's Measurement ID
**is exactly `G-MRBEMWLB6V`**. The id is correct. Hypothesis dead.

---

## UPDATE 3 — ROOT CAUSE FOUND + FIXED

The id is correct, so the bug is in the code. It was visible in the **very
first console dump** of the session:

```
dataLayer: (8) [Array(2), Array(3), Array(3), Array(3), {…}, {…}, Array(3), Array(2)]
```

Chrome labels every gtag command entry `Array(n)`. The real gtag function
produces `Arguments(n)` objects, not arrays.

**Root cause —** `components/analytics/google-analytics.tsx`, the gtag stub:
```js
window.gtag = (...args: unknown[]) => {
  window.dataLayer.push(args)        // args is a plain Array
}
```
gtag.js only treats a dataLayer entry as an API command when the pushed value
is an **`arguments` object**. A plain array is ignored. So `js`, `consent`,
`config` and every `event` landed in dataLayer but were **never processed** —
no measurement initialised, zero `g/collect` hits. This also explains why
`google_tag_data.ics` showed no consent commands recorded (only `implicit`):
gtag.js never consumed the `consent default` / `consent update` calls.

The canonical Google snippet is `function gtag(){dataLayer.push(arguments)}` —
it uses `arguments` deliberately, for exactly this reason. The user's other
working project uses that canonical form.

**Origin:** the `fix/ga4-consent-mode-tracking` subagent rewrote this file and
"modernised" the gtag stub into an arrow function with rest params. Rest
params produce an Array, which silently broke all hit transmission.

**Fix applied** (on `feature/google-meassurement`):
```js
window.gtag = function gtag() {
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments)
}
```

**Remaining steps:**
1. `tsc` / lint check the file.
2. Full `next build` + redeploy (production — dev mode disables GA via the
   NODE_ENV gate).
3. Verify: DevTools Network → `g/collect?v=2&tid=G-MRBEMWLB6V` fires (204);
   GA4 Realtime shows the visit after clicking "Aceptar todo".

---

### (superseded) earlier next-steps

**FIRST action next session (zero console):**
1. GA4 → **Admin → Data Streams** of the e2d property → read the web stream's
   **Measurement ID**. Compare char-by-char to `G-MRBEMWLB6V`. Any mismatch =
   the bug.
2. If `G-MRBEMWLB6V` appears in no property at all → bogus id.
3. Open the **other, working project's** GA4 Realtime — if `evolve2digital.com`
   URLs show up there, e2d is pointed at the wrong project's stream.

If the id is wrong: fix `.env`, then **full `next build` + redeploy** —
`NEXT_PUBLIC_*` is inlined at build time, a `pm2 restart` alone will NOT pick
up the change.

---

## Symptom

GA4 Realtime shows no traffic. Investigating whether the site fails to send
hits, or GA4 drops them server-side.

---

## Confirmed facts (evidence)

| # | Test | Result | Meaning |
|---|------|--------|---------|
| 1 | `typeof gtag` + `dataLayer` dump | gtag = function; dataLayer has `js`, `consent default`, `config G-MRBEMWLB6V`, `event page_view`, `gtm.dom`, `gtm.load`, `consent update`, manual events | Init sequence correct, in right order |
| 2 | `dataLayer.push.toString()` | hooked (not native) | gtag.js processor owns dataLayer |
| 3 | `Object.keys(google_tag_manager)` | includes `G-MRBEMWLB6V` **and `tcf`** | gtag.js container initialized; **TCF mode detected** |
| 4 | gtag.js `<script>` `type` attr | `""` (executable) | Not blocked by a consent-gate type swap |
| 5 | `config` object | `{page_title, page_location}` | Clean, no `transport_url` / `send_page_view:false` |
| 6 | `fetch()` to `google-analytics.com/g/collect` | **HTTP 204** | Endpoint reachable. No CSP block, no adblock at network layer |
| 7 | `__tcfapi` getTCData callback | **never fires** ("TCF stub hangs") | A dead IAB TCF stub is present in the dev's normal browser profile |
| 8 | `typeof __tcfapi` in **Incognito** (extensions off) | `undefined` | The `__tcfapi` stub is **NOT** injected by the site — it's a browser extension |
| 9 | 3rd-party scripts in Incognito | only `assets.apollo.io/.../tracker.iife.js` + `googletagmanager.com/gtag/js` | Site loads no CMP, no Funding Choices, no TCF code |
| 10 | Network tab, filter `collect`, Incognito | nothing seen | **INCONCLUSIVE** — Network panel capture timing not verified (panel may have opened after the page_view ping) |

---

## Site code reviewed — CLEAN

- `components/analytics/google-analytics.tsx` — textbook Google Consent Mode (advanced).
  gtag stub → `consent default` (all denied, `wait_for_update:500`) → `config`.
  Gated on `NODE_ENV==='production' && GA_MEASUREMENT_ID`.
- `components/gdpr/cookie-banner.tsx` — `applyConsentToGtag()` fires `consent update`
  granted/denied on Accept / Reject / Save. Correct.
- `grep` for `__tcfapi` / `tcf` / `cmp` across `app components lib public` — **no match**.
- No CMP / consent library in `package.json`.

Conclusion: the GA + consent code in the repo is not the bug.

---

## Ruled out

- CSP / network block — `fetch` to collect endpoint returned 204.
- gtag.js not loading — it loads and initializes the `G-MRBEMWLB6V` container.
- Consent Mode wiring in the site code — correct; `consent update` granted is in dataLayer.
- A site-injected TCF/CMP — Incognito proves the site loads none.
- Script consent-gating via `type="text/plain"` — script type is executable.

---

## Two remaining candidates (ranked)

### A. Dev environment only — CONFIRMED real, may be the whole story
The dev's **normal browser profile has an extension** (Consent-O-Matic /
"I don't care about cookies" / similar privacy extension) that injects a dead
`__tcfapi` stub. gtag.js detects TCF, waits for a consent string that never
arrives, and **buffers every hit forever** — on the dev's machine only.
Real visitors without that extension are unaffected.

If the site has near-zero traffic, the dev was the only "visitor", so Realtime
looked globally empty when it was just the poisoned dev sessions.

### B. GA4 server-side reporting filter
GA4's dashboard config does NOT stop the browser sending `/g/collect` — it
discards hits *after* receiving them. If hits go out (204) but Realtime is
empty, suspect:
- **Internal Traffic data filter set to `Active`** dropping the dev/office IP
  (GA4 Admin → Data Settings → Data Filters). Most common cause.
- Wrong property / data stream being viewed vs. `G-MRBEMWLB6V`.
- `debug_mode` hits → only visible in DebugView, not Realtime.

### Open gap
The Incognito Network check (#10) was inconclusive — never verified whether
gtag.js in a clean environment actually emits `g/collect`. That single fact
splits A from B.

---

## NEXT DAY — do these, in order

### Step 1 — One clean Network observation (decisive — does gtag.js transmit?)
This is the question everything hinges on. Do it carefully, once.
1. Incognito (extensions off).
2. **Open DevTools → Network tab BEFORE loading the page.**
3. Enable **Preserve log** + **Disable cache**. Filter box: `collect`.
   Request-type category must be **All** (not JS/XHR — hides beacons).
4. Load `evolve2digital.com/es`. **Click "Aceptar todo"** on the cookie banner.
5. Wait ~8s, then click an internal nav link (forces a batch flush).

- `g/collect?v=2&tid=G-MRBEMWLB6V` **appears** (status 204) → gtag.js transmits
  fine. Cause = GA4 property/stream side → go to Step 2.
- **No `g/collect` at all** → real client bug, gtag.js not transmitting despite
  clean code. Investigate: re-dump `window.dataLayer` + `google_tag_manager`
  keys in that Incognito tab; check whether `config` actually ran; check the
  GA4 advanced-consent transport.

### Step 2 — Verify the data stream is real (GA4 UI, no console)
**Admin → Data Streams** → confirm `G-MRBEMWLB6V` is a live Web stream and
note which **property** it belongs to. Open Realtime FOR THAT property — easy
to be looking at the wrong property. A brand-new property still shows Realtime
instantly; only standard reports lag 24-48h.

### Step 3 — GA4 UI checks (no browser console)
1. **Admin → Data Settings → Data Filters** — is there an `Internal Traffic`
   filter in state **Active**? If it matches the office/home IP it silently
   drops all those hits. Switch to `Testing` or remove.
2. **Admin → Data Streams** — confirm `G-MRBEMWLB6V` belongs to the property
   being viewed, and the stream is active.
3. Check **Realtime** AND **Admin → DebugView** — different views.

---

## Console snippets used (reuse, don't re-derive)

```js
// full state dump
console.log('gtag type:', typeof window.gtag);
console.log('dataLayer:', window.dataLayer);
console.log('push hooked?', !/\[native code\]/.test(window.dataLayer.push.toString()));
console.log('GTM containers:', Object.keys(window.google_tag_manager||{}));
console.log('config obj:', window.dataLayer.find(x=>x[0]==='config')?.[2]);

// endpoint reachability (bypasses gtag entirely)
fetch('https://www.google-analytics.com/g/collect?v=2&tid=G-MRBEMWLB6V&cid=12345&en=page_view',
  {method:'POST',keepalive:true})
  .then(r=>console.log('GA collect status:',r.status))
  .catch(e=>console.log('GA BLOCKED:',e.message));

// TCF stub probe
console.log('__tcfapi:', typeof window.__tcfapi);
window.__tcfapi && window.__tcfapi('getTCData',2,(d,ok)=>console.log('tcf cb ok:',ok,d));
```

---

## Notes / known non-bugs

- Cookie banner defaults `analytics:false`. Until a visitor clicks Accept,
  `analytics_storage` stays `denied` → GA4 sends only cookieless modeled pings.
  Correct GDPR behavior; means Realtime under-counts vs. total visits.
- `performance.getEntriesByType('resource')` does NOT capture `sendBeacon`
  (GA4's default transport) — do not use it to judge whether hits were sent.
  Use the Network tab.
