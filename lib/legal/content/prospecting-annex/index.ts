import type { LocalizedDocument } from "@/lib/legal/types"
import { prospectingAnnexEs } from "./es"

// TODO(feat/prospecting-annex-i18n): the annex is still Spanish-only (see
// next.config.mjs redirects() and this page's notFound() guard for en/it).
// en/it alias es here purely so the LocalizedDocument type is satisfied.
export const prospectingAnnexDocument: LocalizedDocument = {
  es: prospectingAnnexEs,
  en: prospectingAnnexEs,
  it: prospectingAnnexEs,
}
