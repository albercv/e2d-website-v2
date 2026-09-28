import type { LocalizedDocument } from "@/lib/legal/types"
import { legalNoticeEs } from "./es"

// TODO(feat/translate-legal-pages): en/it temporarily reuse the Spanish copy
// until their real translations land. Behavior for es is unaffected.
export const legalNoticeDocument: LocalizedDocument = {
  es: legalNoticeEs,
  en: legalNoticeEs,
  it: legalNoticeEs,
}
