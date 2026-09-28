import type { LocalizedDocument } from "@/lib/legal/types"
import { cookiesEs } from "./es"

// TODO(feat/translate-legal-pages): en/it temporarily reuse the Spanish copy
// until their real translations land. Behavior for es is unaffected.
export const cookiesDocument: LocalizedDocument = {
  es: cookiesEs,
  en: cookiesEs,
  it: cookiesEs,
}
