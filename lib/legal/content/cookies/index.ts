import type { LocalizedDocument } from "@/lib/legal/types"
import { cookiesEs } from "./es"
import { cookiesEn } from "./en"
import { cookiesIt } from "./it"

export const cookiesDocument: LocalizedDocument = {
  es: cookiesEs,
  en: cookiesEn,
  it: cookiesIt,
}
