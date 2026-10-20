"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Mail, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContactModal } from "@/components/contact/contact-modal"
import { SUPPORT_EMAIL } from "@/lib/contact/email"
import { getWhatsAppHref } from "@/lib/contact/whatsapp"
import { track } from "@/lib/analytics/track"
import { CONTACT_ANCHOR } from "@/lib/seo/entities"

// Same value on the form button and on both direct links, so GA can compare
// this section against the footer and the modal.
const SECTION_ID = "contact_section"

const DIRECT_LINK_CLASS =
  "inline-flex items-center gap-2 py-2 text-muted-foreground underline-offset-4 transition-colors hover:text-[#05b4ba] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05b4ba]/70 rounded-sm"

function DirectChannels({ locale }: { locale: string }) {
  const t = useTranslations("contactSection")
  // WhatsApp is optional per deploy: no number configured means no link at all.
  const whatsappHref = getWhatsAppHref()

  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-x-8 gap-y-1 text-sm sm:flex-row">
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        onClick={() => track("email_click", { link_location: SECTION_ID, locale })}
        className={DIRECT_LINK_CLASS}
      >
        <Mail className="h-4 w-4 text-[#05b4ba]" aria-hidden />
        {t("emailLabel", { email: SUPPORT_EMAIL })}
      </a>
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("whatsapp_click", { link_location: SECTION_ID, locale })}
          className={DIRECT_LINK_CLASS}
        >
          <MessageCircle className="h-4 w-4 text-[#05b4ba]" aria-hidden />
          {t("whatsappLabel")}
        </a>
      )}
    </div>
  )
}

// Target of the JSON-LD ContactAction (`/<locale>#contact`) and of the
// "/es#contact" links on the service and legal pages. Rendered on the server,
// not lazy, so the id exists in the HTML before any JS runs.
export function ContactSection() {
  const t = useTranslations("contactSection")
  const locale = useLocale()
  const [formOpen, setFormOpen] = useState(false)

  function openForm(): void {
    track("cta_click", { cta_id: SECTION_ID, locale })
    setFormOpen(true)
  }

  return (
    <section id={CONTACT_ANCHOR} aria-labelledby="contact-title" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="contact-title" className="mb-4 text-3xl font-bold text-foreground text-balance sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mb-8 text-lg text-muted-foreground text-pretty">{t("subtitle")}</p>
          <Button size="lg" onClick={openForm} className="bg-[#05b4ba] text-white hover:bg-[#05b4ba]/90">
            {t("openForm")}
          </Button>
          <DirectChannels locale={locale} />
        </div>
      </div>
      <ContactModal open={formOpen} onOpenChange={setFormOpen} />
    </section>
  )
}
