"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LeadForm } from "@/components/leads/lead-form"
import { LeadSuccess } from "@/components/leads/lead-success"
import { track } from "@/lib/analytics/track"
import type { LeadLocale } from "@/lib/leads/lead-form-model"

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactModal({ open, onOpenChange }: ContactModalProps): JSX.Element {
  const tNav = useTranslations("navigation")
  const t = useTranslations("chat.leadForm")
  const locale = useLocale() as LeadLocale
  const [submitted, setSubmitted] = useState(false)

  // Track modal open so we can measure intent-to-contact funnel entry, and
  // start every opening on a fresh form.
  useEffect(() => {
    if (!open) return
    setSubmitted(false)
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
          <LeadSuccess onClose={() => onOpenChange(false)} />
        ) : (
          <LeadForm locale={locale} formLocation="contact_modal" onSuccess={() => setSubmitted(true)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
