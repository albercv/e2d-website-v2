"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { MessageCircle } from "lucide-react"
import { ContactModal } from "./contact-modal"

export function FloatingContactButton() {
  const [isOpen, setIsOpen] = useState(false)
  const tNav = useTranslations("navigation")
  const label = tNav("contact")

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={label}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#05b4ba] text-white shadow-lg transition-all duration-300 hover:bg-[#05b4ba]/90 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#05b4ba]"
        >
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[#05b4ba] opacity-20 motion-safe:animate-ping" />
        </button>
      </div>
      <ContactModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
