/**
 * @jest-environment node
 *
 * Structural parity between the es/en/it versions of every legal document.
 * The translations must mirror the Spanish source exactly in shape (same
 * section ids/order, same block kinds/order, same list/card/row/column
 * counts, same anchor ids) — only the copy differs.
 *
 * The prospecting annex is not covered yet: it is still Spanish-only (see
 * lib/legal/content/prospecting-annex/index.ts) until it is translated.
 */
import { privacyDocument } from "@/lib/legal/content/privacy"
import { cookiesDocument } from "@/lib/legal/content/cookies"
import { legalNoticeDocument } from "@/lib/legal/content/legal-notice"
import type { LegalBlock, LegalDocument, LocalizedDocument, RichText } from "@/lib/legal/types"

const DOCUMENTS: Record<string, LocalizedDocument> = {
  privacy: privacyDocument,
  cookies: cookiesDocument,
  "legal-notice": legalNoticeDocument,
}

const OTHER_LOCALES = ["en", "it"] as const

function blockShape(block: LegalBlock) {
  switch (block.kind) {
    case "paragraph":
      return { kind: block.kind }
    case "lines":
      return { kind: block.kind, count: block.lines.length }
    case "list":
      return {
        kind: block.kind,
        items: block.items.map((item) => ({ id: item.id ?? null, hasLabel: Boolean(item.label) })),
      }
    case "cards":
      return { kind: block.kind, count: block.items.length }
    case "infoBox":
      return { kind: block.kind, count: block.rows.length }
    case "table":
      return { kind: block.kind, columns: block.columns.length, rows: block.rows.length }
  }
}

function documentShape(doc: LegalDocument) {
  return {
    hasBackLink: Boolean(doc.backLink),
    hasEyebrow: Boolean(doc.eyebrow),
    hasNotice: Boolean(doc.notice),
    sections: doc.sections.map((section) => ({
      id: section.id,
      hasTitle: section.title !== undefined,
      blocks: section.blocks.map(blockShape),
    })),
  }
}

function flattenRichText(value: RichText, out: string[]) {
  if (typeof value === "string") {
    out.push(value)
    return
  }
  for (const fragment of value) {
    if (typeof fragment === "string") out.push(fragment)
    else if ("strong" in fragment) out.push(fragment.strong)
    else out.push(fragment.link)
  }
}

/** Every user-visible string in a document, in document order. */
function collectStrings(doc: LegalDocument): string[] {
  const out: string[] = [doc.title, doc.lastUpdatedLabel, doc.lastUpdated]
  if (doc.eyebrow) out.push(doc.eyebrow)
  if (doc.backLink) out.push(doc.backLink.text)
  if (doc.notice) out.push(doc.notice)

  for (const section of doc.sections) {
    if (section.title) out.push(section.title)
    for (const block of section.blocks) collectBlockStrings(block, out)
  }
  return out
}

function collectBlockStrings(block: LegalBlock, out: string[]) {
  switch (block.kind) {
    case "paragraph":
      flattenRichText(block.text, out)
      return
    case "lines":
      block.lines.forEach((line) => flattenRichText(line, out))
      return
    case "list":
      block.items.forEach((item) => {
        if (item.label) out.push(item.label)
        flattenRichText(item.text, out)
      })
      return
    case "cards":
      block.items.forEach((item) => {
        out.push(item.title)
        flattenRichText(item.text, out)
      })
      return
    case "infoBox":
      block.rows.forEach((row) => {
        out.push(row.label)
        flattenRichText(row.value, out)
      })
      return
    case "table":
      out.push(...block.columns)
      block.rows.forEach((row) => out.push(row.header, ...row.cells))
  }
}

interface LinkRef {
  href: string
}

function collectFromRichText(value: RichText, out: LinkRef[]) {
  if (typeof value === "string") return
  for (const fragment of value) {
    if (typeof fragment === "object" && "href" in fragment) out.push({ href: fragment.href })
  }
}

/** Every link href in a document, in document order (back link first). */
function collectLinks(doc: LegalDocument): LinkRef[] {
  const out: LinkRef[] = []
  if (doc.backLink) out.push({ href: doc.backLink.href })

  for (const section of doc.sections) {
    for (const block of section.blocks) {
      switch (block.kind) {
        case "paragraph":
          collectFromRichText(block.text, out)
          break
        case "lines":
          block.lines.forEach((line) => collectFromRichText(line, out))
          break
        case "list":
          block.items.forEach((item) => collectFromRichText(item.text, out))
          break
        case "cards":
          block.items.forEach((item) => collectFromRichText(item.text, out))
          break
        case "infoBox":
          block.rows.forEach((row) => collectFromRichText(row.value, out))
          break
        case "table":
          break
      }
    }
  }
  return out
}

// Proper names that legitimately keep Spanish spelling in every locale
// (see the translation brief's glossary) and must not trip the leftover check.
const ALLOWED_SPANISH_PHRASES = [
  "Agencia Española de Protección de Datos",
  "autónomo",
  "Lista Robinson",
]

// Substrings that only ever occur in untranslated Spanish prose. Each is
// padded with spaces (or is a suffix) so it doesn't false-positive on
// unrelated English/Italian words.
const SPANISH_LEFTOVER_MARKERS = [" los ", " las ", " datos ", "ción ", " está ", " día ", " días ", " años "]

describe.each(Object.entries(DOCUMENTS))("legal content parity — %s", (_name, localized) => {
  const esShape = documentShape(localized.es)

  it("es has no translation notice", () => {
    expect(localized.es.notice).toBeUndefined()
  })

  it.each(OTHER_LOCALES)("%s mirrors the es document shape and adds the notice", (locale) => {
    expect(documentShape(localized[locale])).toEqual({ ...esShape, hasNotice: true })
  })

  it.each(OTHER_LOCALES)("%s has no empty strings", (locale) => {
    const strings = collectStrings(localized[locale])
    expect(strings.length).toBeGreaterThan(0)
    for (const value of strings) {
      expect(value.trim().length).toBeGreaterThan(0)
    }
  })

  it.each(OTHER_LOCALES)("%s link hrefs match es except the locale segment", (locale) => {
    const esLinks = collectLinks(localized.es)
    const localeLinks = collectLinks(localized[locale])
    expect(localeLinks).toHaveLength(esLinks.length)

    esLinks.forEach((esLink, index) => {
      const expected = esLink.href.startsWith("/es/")
        ? esLink.href.replace("/es/", `/${locale}/`)
        : esLink.href
      expect(localeLinks[index].href).toBe(expected)
    })
  })

  it.each(OTHER_LOCALES)("%s has no untranslated Spanish leftovers", (locale) => {
    let text = ` ${collectStrings(localized[locale]).join(" \n ")} `
    for (const phrase of ALLOWED_SPANISH_PHRASES) {
      text = text.split(phrase).join("")
    }
    for (const marker of SPANISH_LEFTOVER_MARKERS) {
      expect(text).not.toContain(marker)
    }
  })
})
