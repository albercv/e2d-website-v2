"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { ContactModal } from "@/components/contact/contact-modal"
import { track } from "@/lib/analytics/track"

export function ContactCTA() {
  const [open, setOpen] = useState(false)
  const locale = useLocale()

  function handleOpen(): void {
    track("cta_click", { cta_id: "blog_contact", locale })
    setOpen(true)
  }

  return (
    <div className="my-8 p-6 bg-[#05b4ba]/10 border border-[#05b4ba]/20 rounded-lg text-center not-prose">
      <p className="text-lg font-medium text-foreground mb-4">
        ¿Hablamos de tu proyecto?
      </p>
      <Button
        onClick={handleOpen}
        className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white"
      >
        Contactar
      </Button>
      <ContactModal open={open} onOpenChange={setOpen} />
    </div>
  )
}
