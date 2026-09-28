import type { LocalizedDocument } from "@/lib/legal/types"
import { privacyEs } from "./es"

// TODO(feat/translate-legal-pages): en/it temporarily reuse the Spanish copy
// until their real translations land. Behavior for es is unaffected.
export const privacyDocument: LocalizedDocument = {
  es: privacyEs,
  en: privacyEs,
  it: privacyEs,
}
