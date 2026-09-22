"use client"

import { track } from "@/lib/analytics/track"
import { getWhatsAppHref } from "@/lib/contact/whatsapp"
import { SUPPORT_EMAIL, getMailHref } from "@/lib/contact/email"
import type { LeadFormT } from "./lead-form-fields"

interface LeadServerFallbackProps {
  t: LeadFormT
  locale: string
}

// Shown when the lead could not be persisted: the visitor must still have a
// way out, so the direct channels appear inline under the form.
export function LeadServerFallback({ t, locale }: LeadServerFallbackProps): JSX.Element {
  const whatsappHref = getWhatsAppHref(t("followUpAnonymous"))
  return (
    <div className="mt-1 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
      <p><strong>{t("errorTitle")}</strong>. {t("errorBody")}</p>
      <div className="flex flex-wrap gap-2">
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2 py-1 text-white hover:bg-[#25D366]/90"
            onClick={() => track("whatsapp_click", { link_location: "lead_form_fallback", locale })}>
            WhatsApp
          </a>
        )}
        <a href={getMailHref(t("followUpSubject"))}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-foreground hover:bg-accent"
          onClick={() => track("email_click", { link_location: "lead_form_fallback", locale })}>
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  )
}
