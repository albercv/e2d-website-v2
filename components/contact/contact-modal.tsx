"use client"

import { useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Mail, MessageCircle } from "lucide-react"
import { track } from "@/lib/analytics/track"

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const tNav = useTranslations("navigation")
  const locale = useLocale()

  // Track modal open so we can measure intent-to-contact funnel entry.
  useEffect(() => {
    if (open) track("contact_open", { locale })
  }, [open, locale])

  const whatsappNumberInternational = "34605497639" // +34 605 497 639
  const email = "hello@evolve2digital.com"

  const whatsappHref = `https://wa.me/${whatsappNumberInternational}?text=${encodeURIComponent(
    "Hola Alberto, vengo de tu web y me gustaría hablar sobre un proyecto."
  )}`
  const mailHref = `mailto:${email}?subject=${encodeURIComponent(
    "Consulta desde la web E2D"
  )}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{tNav("contact")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">WhatsApp</p>
            <Button asChild className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("whatsapp_click", { link_location: "contact_modal", locale })}
              >
                <MessageCircle className="h-4 w-4" /> +34 605 497 639
              </a>
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Email</p>
            <Button asChild variant="outline" className="w-full">
              <a
                href={mailHref}
                onClick={() => track("email_click", { link_location: "contact_modal", locale })}
              >
                <Mail className="h-4 w-4" /> {email}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}