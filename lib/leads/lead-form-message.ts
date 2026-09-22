// The full form as a plain-text message, so the visitor's chosen channel
// (WhatsApp or email) is prefilled without retyping. Kept out of any
// component so LeadForm and future hosts can share it, and it's trivial to
// unit test without rendering. Empty optionals are skipped.

import type { SubmittedLead } from "./lead-form-model"

export function buildFormMessage(lead: SubmittedLead, t: (key: string) => string): string {
  const rows: Array<[string, string]> = [
    [t("name"), lead.name],
    [t("company"), lead.company],
    [t("email"), lead.email],
    [t("phone"), lead.phone],
    [t("labelIntent"), lead.intent ? t(`intentOptions.${lead.intent}`) : ""],
    [t("labelMessage"), lead.message],
  ]
  const lines = rows.filter(([, value]) => value.length > 0).map(([label, value]) => `${label}: ${value}`)
  return [t("followUpIntro"), "", ...lines].join("\n")
}
