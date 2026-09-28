// Typed content model for the legal pages (privacy, cookies, legal notice,
// prospecting annex). Each document is authored once per locale as plain
// data in lib/legal/content/**, and rendered by components/legal/* — no
// markup lives in the content files, no copy lives in the components.

import type { AppLocale } from "@/lib/seo/hreflang"

/** A piece of inline text: plain string, bold text, or a link. */
export type Inline = string | { strong: string } | { link: string; href: string; external?: boolean }

/** A paragraph/line/value that is either a plain string or a list of inline fragments. */
export type RichText = string | readonly Inline[]

export interface LegalListItem {
  /** Anchor id for the <li>, when the item must be individually linkable. */
  id?: string
  /** Rendered as `<strong>{label}</strong> ` before `text`, when present. */
  label?: string
  text: RichText
}

export type LegalBlock =
  | { kind: "paragraph"; text: RichText }
  // A single paragraph made of several lines joined by <br/> — used for
  // address-like blocks (e.g. the controller's name/company/email/phone).
  | { kind: "lines"; lines: readonly RichText[] }
  | { kind: "list"; items: readonly LegalListItem[] }
  | { kind: "cards"; items: readonly { title: string; text: RichText }[] }
  | { kind: "infoBox"; rows: readonly { label: string; value: RichText }[] }
  | {
      kind: "table"
      columns: readonly string[]
      rows: readonly { header: string; cells: readonly string[] }[]
    }

export interface LegalSection {
  id: string
  /** Omitted for a lead-in section rendered without an <h2> (e.g. the annex intro). */
  title?: string
  blocks: readonly LegalBlock[]
}

export interface LegalDocument {
  title: string
  eyebrow?: string
  backLink?: { href: string; text: string }
  lastUpdatedLabel: string
  lastUpdated: string
  /** Translation disclaimer — present on en/it, absent on es. */
  notice?: string
  sections: readonly LegalSection[]
}

export type LocalizedDocument = Record<AppLocale, LegalDocument>
