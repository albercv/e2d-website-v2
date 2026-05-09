"use client"

import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Mail, MessageCircle } from "lucide-react"

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WHATSAPP_NUMBER_INTERNATIONAL = "34605497639" // +34 605 497 639
const WHATSAPP_NUMBER_DISPLAY = "+34 605 497 639"
const EMAIL = "hello@evolve2digital.com"

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const tNav = useTranslations("navigation")
  const tModal = useTranslations("contact.modal")

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER_INTERNATIONAL}?text=${encodeURIComponent(
    tModal("whatsappMessage")
  )}`
  const mailHref = `mailto:${EMAIL}?subject=${encodeURIComponent(tModal("emailSubject"))}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{tNav("contact")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{tModal("whatsappLabel")}</p>
            <Button asChild className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> {WHATSAPP_NUMBER_DISPLAY}
              </a>
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{tModal("emailLabel")}</p>
            <Button asChild variant="outline" className="w-full">
              <a href={mailHref}>
                <Mail className="h-4 w-4" /> {EMAIL}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
