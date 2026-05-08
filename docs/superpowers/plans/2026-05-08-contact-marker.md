# `[contact]` MDX marker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `[contact]` marker to the blog MDX pipeline so the LLM can drop a CTA-with-modal anywhere in a post by writing a single token, with no JSX. The marker expands to `<ContactCTA />`, a new client component that wraps the existing `ContactModal` (WhatsApp + email).

**Architecture:** Reuse the existing marker substitution pipeline (`lib/blog/media-markers.ts:expandMarkers`). Add a second regex `CONTACT_RE = /\[contact\]/g` that runs after the media regex and replaces the literal token with the JSX string `<ContactCTA />`. The MDX serializer already supports JSX components — precedent set by `<MediaMissing />`. Register `ContactCTA` in `MDXComponents` so `MDXRemote` picks it up at render time. `posts-validate.ts` is left untouched: its regex only matches `image|video`, so `[contact]` is silently ignored (correct: nothing to validate, no `meta.files` lookup needed).

**Tech Stack:** Next.js 14 App Router, TypeScript, MDX via `next-mdx-remote`, Radix Dialog, next-intl, Jest + Testing Library.

---

## File Map

- **Create:** `components/blog/ContactCTA.tsx` — client component, ~25 lines.
- **Create:** `__tests__/components/blog/contact-cta.test.tsx` — smoke test.
- **Modify:** `components/blog/mdx-components.tsx` — register `ContactCTA` in the export.
- **Modify:** `lib/blog/media-markers.ts` — add `CONTACT_RE` and second `replace` pass inside `expandMarkers`.
- **Modify:** `__tests__/lib/media-markers.test.ts` — add a `describe` block covering `[contact]`.
- **Modify:** `lib/mcp/rpc-handler.ts` — extend the `instructions` string in the `initialize` response to document the new marker.

No changes to `posts-validate.ts`, `posts-runtime.ts`, content/posts MDX, or scripts.

---

## Task 1: Extend `expandMarkers` to substitute `[contact]`

**Why first:** smallest, purely string-level. Test-driven, no React, no providers, no DOM. Establishes the marker before the component exists — fine because tests assert string output, not rendered HTML.

**Files:**
- Modify: `lib/blog/media-markers.ts:4` (regex), `lib/blog/media-markers.ts:101-120` (`expandMarkers`)
- Modify: `__tests__/lib/media-markers.test.ts` (add `describe` block)

- [ ] **Step 1: Write failing tests for `[contact]` substitution**

Append to `__tests__/lib/media-markers.test.ts` after the existing `describe("expandMarkers — body substitution", ...)` block:

```typescript
describe("expandMarkers — [contact] marker", () => {
  it("replaces a [contact] token with <ContactCTA />", () => {
    const out = expandMarkers("Antes [contact] después", META, "ferdy")
    expect(out).toContain("<ContactCTA />")
    expect(out).not.toContain("[contact]")
  })

  it("replaces multiple [contact] tokens in the same body", () => {
    const out = expandMarkers("[contact] y luego [contact]", META, "ferdy")
    expect(out.match(/<ContactCTA \/>/g)?.length).toBe(2)
  })

  it("does not substitute [contact] inside a fenced code block", () => {
    const src = "Texto.\n\n```\n[contact]\n```\n\nMás texto."
    const out = expandMarkers(src, META, "ferdy")
    expect(out).toContain("[contact]")
    expect(out).not.toContain("<ContactCTA />")
  })

  it("does not substitute [contact] inside inline code", () => {
    const out = expandMarkers("Como `[contact]` aquí.", META, "ferdy")
    expect(out).toContain("`[contact]`")
    expect(out).not.toContain("<ContactCTA />")
  })

  it("substitutes media markers and [contact] in the same body", () => {
    const out = expandMarkers("[image:fachada] y [contact]", META, "ferdy")
    expect(out).toContain('src="/uploads/ferdy/fachada.jpg"')
    expect(out).toContain("<ContactCTA />")
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/media-markers.test.ts
```
Expected: 5 new tests fail (`<ContactCTA />` not found in output / `[contact]` still present).

- [ ] **Step 3: Implement `[contact]` substitution**

Edit `lib/blog/media-markers.ts`. After line 4 (`MARKER_RE` declaration), add:

```typescript
const CONTACT_RE = /\[contact\]/g
```

Replace the body of `expandMarkers` (lines 101-120) with:

```typescript
export function expandMarkers(
  body: string,
  meta: MediaMeta,
  translationKey: string
): string {
  const segs = tokenize(body)
  return segs
    .map((seg) => {
      if (seg.type === "code") return seg.value
      const withMedia = seg.value.replace(MARKER_RE, (_full, kindStr: string, name: string) => {
        const kind = kindStr as MediaKind
        const entry = meta.files[name]
        if (!entry) return buildMissing(kind, name, "not_found")
        if (entry.kind !== kind) return buildMissing(kind, name, "kind_mismatch")
        const url = `/uploads/${translationKey}/${name}.${entry.ext}`
        return buildFigure(kind, url, entry.alt, entry.caption)
      })
      return withMedia.replace(CONTACT_RE, "<ContactCTA />")
    })
    .join("")
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/media-markers.test.ts
```
Expected: all tests pass (existing + 5 new).

- [ ] **Step 5: Commit**

```bash
cd /root/e2dProject/e2d-website-v2 && git add lib/blog/media-markers.ts __tests__/lib/media-markers.test.ts && git commit -m "$(cat <<'EOF'
feat(blog): expand [contact] marker to <ContactCTA />

Scope: lib/blog/media-markers.ts + media-markers.test.ts
Problem: bloggers (LLMs writing via MCP) cannot drop a contact CTA
inline without writing JSX, which the LLM tends to skip.
Solution: add a second regex pass in expandMarkers that turns the
[contact] token into the literal JSX string <ContactCTA />. Code blocks
are preserved (tokenize() already splits them). Media markers and
[contact] coexist.
Notes: <ContactCTA /> component itself lands in the next commit;
this commit only owns the substitution rule.
EOF
)"
```

---

## Task 2: Create the `ContactCTA` component

**Files:**
- Create: `components/blog/ContactCTA.tsx`
- Create: `__tests__/components/blog/contact-cta.test.tsx`

- [ ] **Step 1: Write failing smoke test**

Create `__tests__/components/blog/contact-cta.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { ContactCTA } from "@/components/blog/ContactCTA"

const messages = { navigation: { contact: "Contacto" } }

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("ContactCTA", () => {
  it("renders the trigger button", () => {
    renderWithIntl(<ContactCTA />)
    expect(screen.getByRole("button", { name: /contactar/i })).toBeInTheDocument()
  })

  it("opens the contact modal when the button is clicked", async () => {
    const user = userEvent.setup()
    renderWithIntl(<ContactCTA />)
    await user.click(screen.getByRole("button", { name: /contactar/i }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(/whatsapp/i)).toBeInTheDocument()
    expect(screen.getByText(/hello@evolve2digital\.com/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run:
```bash
cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/components/blog/contact-cta.test.tsx
```
Expected: failure with "Cannot find module '@/components/blog/ContactCTA'".

- [ ] **Step 3: Implement the component**

Create `components/blog/ContactCTA.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ContactModal } from "@/components/contact/contact-modal"

export function ContactCTA() {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-8 p-6 bg-[#05b4ba]/10 border border-[#05b4ba]/20 rounded-lg text-center not-prose">
      <p className="text-lg font-medium text-foreground mb-4">
        ¿Hablamos de tu proyecto?
      </p>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white"
      >
        Contactar
      </Button>
      <ContactModal open={open} onOpenChange={setOpen} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests, verify pass**

Run:
```bash
cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/components/blog/contact-cta.test.tsx
```
Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
cd /root/e2dProject/e2d-website-v2 && git add components/blog/ContactCTA.tsx __tests__/components/blog/contact-cta.test.tsx && git commit -m "$(cat <<'EOF'
feat(blog): add ContactCTA MDX component

Scope: components/blog/ContactCTA.tsx + smoke test
Problem: blog posts need an in-flow CTA that triggers the same
WhatsApp/email modal that lives in the navigation bar.
Solution: thin client component (button + Radix Dialog state) that
embeds the existing ContactModal. No props — copy is fixed for now;
add params later only if a post needs different wording.
Notes: ContactModal already handles i18n via useTranslations and
NextIntlClientProvider wraps the whole app, so the component works
identically when mounted by MDXRemote inside a post.
EOF
)"
```

---

## Task 3: Register `ContactCTA` in the MDX components map

**Files:**
- Modify: `components/blog/mdx-components.tsx:1-7` (imports), `components/blog/mdx-components.tsx:176-187` (export)

- [ ] **Step 1: Add the import**

Edit `components/blog/mdx-components.tsx`. Below the existing `MediaMissing` import (line 7), add:

```typescript
import { ContactCTA } from "./ContactCTA"
```

- [ ] **Step 2: Register the component**

Edit `components/blog/mdx-components.tsx`. In the `MDXComponents` export, after the line `MediaMissing,` (line 186), add:

```typescript
  ContactCTA,
```

The block should look like:

```typescript
export const MDXComponents: MDXComponentsType = {
  // Custom components
  ProsCons: ProsConsComponent,
  Callout: CalloutComponent,
  CTAInline: CTAInlineComponent,
  CodeBlock: CodeBlockComponent,
  Lead: LeadComponent,
  PullQuote: PullQuoteComponent,
  Figure: FigureComponent,
  Stat: StatComponent,
  MediaMissing,
  ContactCTA,
  ...
```

- [ ] **Step 3: Type-check and run the full test suite**

Run:
```bash
cd /root/e2dProject/e2d-website-v2 && npx tsc --noEmit && npx jest
```
Expected: tsc returns 0 (modulo the pre-existing unrelated errors documented in tasks/todo.md, S117); jest passes the same count it passed before plus the new tests added in Tasks 1 and 2.

- [ ] **Step 4: Commit**

```bash
cd /root/e2dProject/e2d-website-v2 && git add components/blog/mdx-components.tsx && git commit -m "$(cat <<'EOF'
feat(blog): wire ContactCTA into MDX components map

Scope: components/blog/mdx-components.tsx
Problem: MDXRemote needs to know how to render <ContactCTA /> when
the marker expander emits it.
Solution: register ContactCTA alongside the other custom components.
Notes: completes the [contact] marker chain — expander emits the
JSX, MDXRemote resolves it via this map, the component renders.
EOF
)"
```

---

## Task 4: Document the marker in the MCP server `instructions`

**Why:** The `instructions` string is what Claude.ai (and any other MCP client) reads at session-start. Updating it means every connector consumer learns about `[contact]` automatically, no per-Project custom instructions needed.

**Files:**
- Modify: `lib/mcp/rpc-handler.ts:336-344`

- [ ] **Step 1: Update the `instructions` string**

Edit `lib/mcp/rpc-handler.ts` lines 336-344. Replace the current first paragraph:

```typescript
      instructions:
        "Blog del sitio Evolve2Digital. Soporta media inline vía markers en MDX: " +
        "`[image:nombre]` y `[video:nombre]` en el body, y `cover: nombre` en frontmatter. " +
        "Los nombres son slug-keys (lowercase, ASCII, `_` separador) que apuntan a ficheros " +
        "ya subidos. Para listar lo disponible llama a `posts_list_media`. Para subir nueva " +
        "media llama primero a `posts_request_upload`, que devuelve una URL para que el " +
        "usuario complete la subida vía form. Después usa `posts_create` o `posts_update_body` " +
        "con los markers ya escritos. `posts_validate` hace pre-flight de markers rotos.\n\n" +
```

With:

```typescript
      instructions:
        "Blog del sitio Evolve2Digital. Soporta media inline vía markers en MDX: " +
        "`[image:nombre]` y `[video:nombre]` en el body, y `cover: nombre` en frontmatter. " +
        "Los nombres son slug-keys (lowercase, ASCII, `_` separador) que apuntan a ficheros " +
        "ya subidos. Para listar lo disponible llama a `posts_list_media`. Para subir nueva " +
        "media llama primero a `posts_request_upload`, que devuelve una URL para que el " +
        "usuario complete la subida vía form. Después usa `posts_create` o `posts_update_body` " +
        "con los markers ya escritos. `posts_validate` hace pre-flight de markers rotos.\n\n" +
        "CTA DE CONTACTO — el marker `[contact]` (sin slug, sin parámetros) renderiza un " +
        "bloque CTA con botón que abre un modal con WhatsApp y email. Úsalo en el cierre " +
        "de posts donde quieras invitar al lector a contactar. Una sola línea, en su propio " +
        "párrafo. No requiere subida previa ni aparece en `posts_list_media`. Dentro de " +
        "fenced code blocks o inline code se preserva tal cual.\n\n" +
```

- [ ] **Step 2: Run RPC handler tests**

Run:
```bash
cd /root/e2dProject/e2d-website-v2 && npx jest __tests__/lib/mcp-rpc-handler.test.ts
```
Expected: pass. The instructions string is plain text, not asserted exhaustively in tests; this confirms no regression.

- [ ] **Step 3: Commit**

```bash
cd /root/e2dProject/e2d-website-v2 && git add lib/mcp/rpc-handler.ts && git commit -m "$(cat <<'EOF'
docs(mcp): announce [contact] marker in initialize instructions

Scope: lib/mcp/rpc-handler.ts
Problem: MCP clients (Claude.ai, ChatGPT connectors) only learn what
the server tells them at initialize. New marker is invisible to the
LLM unless we document it there.
Solution: append a CTA paragraph to the instructions string. Plain
text, no schema change.
Notes: covered by no automated assertion — the string is informative,
not contractual. Manual visual check in Task 5.
EOF
)"
```

---

## Task 5: Manual end-to-end verification

**Why:** The marker → component chain spans server (expander), build (MDX serialize), client (React render). Unit tests cover each piece in isolation; this task confirms the chain works against live PM2.

**Files:** none modified. Procedure only.

- [ ] **Step 1: Reload the app under PM2**

Run:
```bash
cd /root/e2dProject/e2d-website-v2 && pm2 restart e2d && pm2 logs e2d --lines 30 --nostream
```
Expected: process restarts cleanly, no startup error in the last 30 log lines.

- [ ] **Step 2: Insert a `[contact]` marker into a draft post**

Pick an existing test post (suggestion: create a throwaway slug `canary-contact-marker`). Use the MCP tool `posts_create` with body content like:

```
Este es un test del marker.

[contact]

Fin del test.
```

`published: false` so it doesn't appear in feeds.

- [ ] **Step 3: Render the post and confirm the CTA**

Open in a browser:
```
https://evolve2digital.com/es/blog/canary-contact-marker
```
(or via `curl -s … | grep ContactCTA` if you only need to confirm the JSX reached the client bundle).

Expected:
- A teal-bordered CTA block appears where `[contact]` was written.
- Clicking the "Contactar" button opens the dialog with WhatsApp (+34 605 497 639) and email (hello@evolve2digital.com).
- The button inside the dialog points to `wa.me/34605497639` and `mailto:hello@evolve2digital.com`.

- [ ] **Step 4: Verify code-block preservation in a real post**

Update the test post body via `posts_update_body` to include a fenced block:

````
Antes.

```
[contact]
```

Después.
````

Reload the page. Expected: literal `[contact]` text inside the code block; no CTA rendered there. (Optional: place a real `[contact]` outside the fence to confirm it still expands.)

- [ ] **Step 5: Cleanup**

Delete the canary post via `posts_delete` (with `confirm: true`). Confirm `posts_get` returns 404 afterwards.

- [ ] **Step 6: Update `tasks/todo.md` and `tasks/lessons.md`**

Mark the `[contact]` marker work done in `tasks/todo.md`. If anything surprised you during the manual check, log a one-liner in `tasks/lessons.md` (e.g., MDXRemote import collision, ssr/client mismatch, etc.). If nothing surprised, no lessons entry is needed.

---

## Out of Scope (intentional YAGNI)

- **Customizable CTA text via marker params** (e.g. `[contact:text="Hablamos?"]`). Skip until a real post needs different wording.
- **Tracking / analytics on click.** Plain link is fine; can wrap with an analytics handler later if engagement becomes a question.
- **Validation of `[contact]` in `posts_validate`.** No external resource to check — the marker is self-contained. The current regex (`image|video` only) ignores it correctly.
- **Multiple CTA variants** (book-a-call, download-a-pdf, etc.). One CTA, one marker. Add variants only when a second concrete need appears.
