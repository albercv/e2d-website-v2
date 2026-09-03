"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Mail, MessageCircle } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LeadForm } from "@/components/leads/lead-form"
import { LeadSuccess } from "@/components/leads/lead-success"
import { track } from "@/lib/analytics/track"
import { getWhatsAppHref } from "@/lib/contact/whatsapp"
import { SUPPORT_EMAIL, getMailHref } from "@/lib/contact/email"
import type { LeadLocale, SubmittedLead } from "@/lib/leads/lead-form-model"

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Secondary path for visitors who prefer not to fill the form. Kept small so
// the lead form stays the primary action.
function DirectLinks({ locale }: { locale: string }): JSX.Element {
  const t = useTranslations("chat.leadForm")
  const whatsappHref = getWhatsAppHref(t("followUpAnonymous"))
  return (
    <div className="space-y-1 border-t pt-3 text-center text-xs text-muted-foreground">
      <p>{t("orDirect")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#25D366] hover:underline"
            onClick={() => track("whatsapp_click", { link_location: "contact_modal", locale })}>
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
          </a>
        )}
        <a href={getMailHref(t("followUpSubject"))}
          className="inline-flex items-center gap-1 hover:underline"
          onClick={() => track("email_click", { link_location: "contact_modal", locale })}>
          <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  )
}

export function ContactModal({ open, onOpenChange }: ContactModalProps): JSX.Element {
  const tNav = useTranslations("navigation")
  const t = useTranslations("chat.leadForm")
  const locale = useLocale() as LeadLocale
  const [submitted, setSubmitted] = useState<SubmittedLead | null>(null)

  // Track modal open so we can measure intent-to-contact funnel entry, and
  // start every opening on a fresh form.
  useEffect(() => {
    if (!open) return
    setSubmitted(null)
    track("contact_open", { locale })
  }, [open, locale])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tNav("contact")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        {submitted ? (
          <LeadSuccess lead={submitted} locale={locale} formLocation="contact_modal" onClose={() => onOpenChange(false)} />
        ) : (
          <div className="space-y-4">
            <LeadForm locale={locale} formLocation="contact_modal" onSuccess={setSubmitted} />
            <DirectLinks locale={locale} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
