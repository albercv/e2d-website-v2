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

// The full form as a message, so the visitor can send it through the channel
// they prefer without retyping. Empty optionals are skipped.
function buildFormMessage(lead: SubmittedLead, t: LeadFormT): string {
  const rows: Array<[string, string]> = [
    [t("name"), lead.name],
    [t("company"), lead.company],
    [t("email"), lead.email],
    [t("phone"), lead.phone],
    [t("intent"), lead.intent ? t(`intentOptions.${lead.intent}`) : ""],
    [t("message"), lead.message],
  ]
  const lines = rows.filter(([, value]) => value.length > 0).map(([label, value]) => `${label}: ${value}`)
  return [t("followUpIntro"), "", ...lines].join("\n")
}

export function LeadSuccess({ lead, locale, formLocation, onClose }: LeadSuccessProps): JSX.Element {
  const t = useTranslations("chat.leadForm")
  const formMessage = buildFormMessage(lead, t)
  const whatsappHref = getWhatsAppHref(formMessage)
  const mailHref = getMailHref(t("followUpSubject"), formMessage)
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
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> {t("sendWhatsApp")}
            </a>
          </Button>
        )}
        <Button asChild variant="outline" className="w-full">
          <a href={mailHref} onClick={() => trackChannel("email")}>
            <Mail className="h-4 w-4" aria-hidden="true" /> {t("sendEmail")}
          </a>
        </Button>
      </div>
      <Button variant="ghost" onClick={onClose} className="w-full">
        {t("close")}
      </Button>
    </div>
  )
}
