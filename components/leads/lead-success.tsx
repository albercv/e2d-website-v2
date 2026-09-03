"use client"

import { useTranslations } from "next-intl"
import { Mail, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics/track"
import { getWhatsAppHref } from "@/lib/contact/whatsapp"
import { getMailHref } from "@/lib/contact/email"
import type { LeadFormLocation, SubmittedLead } from "@/lib/leads/lead-form-model"
import type { LeadFormT } from "./lead-form-fields"

export interface LeadSuccessProps {
  lead: SubmittedLead
  locale: string
  formLocation: LeadFormLocation
  onClose: () => void
}

// Follow-up text the visitor can send right away, prefilled with what they
// just typed so they do not repeat themselves.
function buildFollowUp(lead: SubmittedLead, t: LeadFormT): string {
  const who = lead.company ? `${lead.name} (${lead.company})` : lead.name
  const intro = who ? t("followUp", { who }) : t("followUpAnonymous")
  return lead.message ? `${intro}\n\n${lead.message}` : intro
}

export function LeadSuccess({ lead, locale, formLocation, onClose }: LeadSuccessProps): JSX.Element {
  const t = useTranslations("chat.leadForm")
  const followUp = buildFollowUp(lead, t)
  const whatsappHref = getWhatsAppHref(followUp)
  const mailHref = getMailHref(t("followUpSubject"), followUp)
  // A follow-up click is not a new conversion: the lead is already counted.
  const trackChannel = (channel: "whatsapp" | "email") =>
    track("lead_channel_continue", { channel, form_location: formLocation, locale })

  return (
    <div className="space-y-3 text-center">
      <h3 className="text-base font-semibold">{t("successTitle")}</h3>
      <p className="text-sm text-muted-foreground">{t("successFollowUp")}</p>
      <div className="flex flex-col gap-2">
        {whatsappHref && (
          <Button asChild className="w-full bg-[#25D366] text-white hover:bg-[#25D366]/90">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => trackChannel("whatsapp")}>
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> {t("continueWhatsApp")}
            </a>
          </Button>
        )}
        <Button asChild variant="outline" className="w-full">
          <a href={mailHref} onClick={() => trackChannel("email")}>
            <Mail className="h-4 w-4" aria-hidden="true" /> {t("continueEmail")}
          </a>
        </Button>
      </div>
      <Button variant="ghost" onClick={onClose} className="w-full">
        {t("close")}
      </Button>
    </div>
  )
}
