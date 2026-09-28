import type { LocalizedDocument } from "@/lib/legal/types"
import { legalNoticeEs } from "./es"
import { legalNoticeEn } from "./en"
import { legalNoticeIt } from "./it"

export const legalNoticeDocument: LocalizedDocument = {
  es: legalNoticeEs,
  en: legalNoticeEn,
  it: legalNoticeIt,
}
