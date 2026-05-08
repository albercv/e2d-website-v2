"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ContactModal } from "@/components/contact/contact-modal"

export function ContactCTA() {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-8 p-6 bg-[#05b4ba]/10 border border-[#05b4ba]/20 rounded-lg text-center not-prose">
      <p className="text-lg font-medium text-foreground mb-4">
        ¿Hablamos de tu proyecto?
      </p>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white"
      >
        Contactar
      </Button>
      <ContactModal open={open} onOpenChange={setOpen} />
    </div>
  )
}
