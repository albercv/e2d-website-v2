import { notFound } from "next/navigation"
import type { AppLocale } from "@/lib/seo/hreflang"
import type { LegalDocument, LocalizedDocument } from "./types"

/** Resolves a locale to its `LegalDocument`, 404-ing on an unsupported locale. */
export function getLegalDocument(localized: LocalizedDocument, locale: string): LegalDocument {
  const document = localized[locale as AppLocale]
  if (!document) notFound()
  return document
}
