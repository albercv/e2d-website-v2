import type { LocalizedDocument } from "@/lib/legal/types"
import { privacyEs } from "./es"
import { privacyEn } from "./en"
import { privacyIt } from "./it"

export const privacyDocument: LocalizedDocument = {
  es: privacyEs,
  en: privacyEn,
  it: privacyIt,
}
