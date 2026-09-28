import type { ReactNode } from "react"

// Shared classes so every annex section (and the recipients table) reuses the
// exact prose styling the main privacy policy page already uses — avoids
// each section file re-declaring the same Tailwind strings (DRY).
export const ANNEX_PARAGRAPH_CLASS = "text-muted-foreground leading-relaxed"
export const ANNEX_LIST_CLASS = "list-disc pl-6 space-y-2 text-muted-foreground"

interface AnnexSectionProps {
  id: string
  title: string
  children: ReactNode
}

/** One `<h2>` + body block of the annex, addressable via its own anchor id. */
export function AnnexSection({ id, title, children }: AnnexSectionProps) {
  return (
    <section id={id} className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      {children}
    </section>
  )
}

// The privacy contact address appears twice in the source text (Responsable,
// Derechos). Centralized here so both mailto links stay in sync.
export const ANNEX_CONTACT_EMAIL = "hello@evolve2digital.com"

export function AnnexMailto() {
  return <a href={`mailto:${ANNEX_CONTACT_EMAIL}`}>{ANNEX_CONTACT_EMAIL}</a>
}
