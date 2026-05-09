// next-intl está mockeado globalmente en jest.setup.js de manera que
// `useTranslations` devuelve la propia key (útil para tests que solo
// comprueban estructura). Esta suite necesita resolver de verdad las claves
// contra los `messages/{es,en,it}.json` para verificar que cada locale
// pinta el copy correspondiente al CTA `[contact]` y al modal de contacto.
// Un mock por archivo, "smart": el provider guarda `locale` + `messages`
// en variables module-scope y `useTranslations(ns)` los resuelve.

let currentLocale = "es"
let currentMessages: Record<string, unknown> = {}

jest.mock("next-intl", () => {
  const React = require("react")
  return {
    useLocale: () => currentLocale,
    useTranslations: (namespace?: string) => (key: string) => {
      const fullPath = namespace ? `${namespace}.${key}` : key
      return (
        fullPath
          .split(".")
          .reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), currentMessages) ?? fullPath
      )
    },
    useFormatter: () => ({
      dateTime: (v: unknown) => String(v),
      number: (v: unknown) => String(v),
      relativeTime: (v: unknown) => String(v),
      list: (v: unknown) => String(v),
    }),
    NextIntlClientProvider: ({ children, locale, messages }: { children: React.ReactNode; locale: string; messages: Record<string, unknown> }) => {
      currentLocale = locale
      currentMessages = messages
      return React.createElement(React.Fragment, null, children)
    },
  }
})

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { ContactCTA } from "@/components/blog/ContactCTA"
import esMessages from "@/messages/es.json"
import enMessages from "@/messages/en.json"
import itMessages from "@/messages/it.json"

type Locale = "es" | "en" | "it"

const messagesByLocale: Record<Locale, typeof esMessages> = {
  es: esMessages,
  en: enMessages,
  it: itMessages,
}

function renderWithIntl(locale: Locale) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale] as never}>
      <ContactCTA />
    </NextIntlClientProvider>
  )
}

describe("ContactCTA — i18n", () => {
  describe.each<Locale>(["es", "en", "it"])("locale=%s", (locale) => {
    const m = messagesByLocale[locale] as { blog: { contactCta: { heading: string; button: string } } }
    const heading = m.blog.contactCta.heading
    const button = m.blog.contactCta.button

    it("renders the localised heading and button", () => {
      renderWithIntl(locale)
      expect(screen.getByText(heading)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: button })).toBeInTheDocument()
    })

    it("opens the contact modal showing the localised contacts", async () => {
      const user = userEvent.setup()
      renderWithIntl(locale)
      await user.click(screen.getByRole("button", { name: button }))
      const dialog = await screen.findByRole("dialog")
      expect(dialog).toBeInTheDocument()

      const modalMessages = messagesByLocale[locale] as {
        contact: { modal: { whatsappLabel: string; emailLabel: string } }
      }
      expect(screen.getByText(modalMessages.contact.modal.whatsappLabel)).toBeInTheDocument()
      expect(screen.getByText(modalMessages.contact.modal.emailLabel)).toBeInTheDocument()
      expect(screen.getByText(/hello@evolve2digital\.com/i)).toBeInTheDocument()
    })

    it("encodes the localised whatsapp message and email subject in href attributes", async () => {
      const user = userEvent.setup()
      renderWithIntl(locale)
      await user.click(screen.getByRole("button", { name: button }))
      await screen.findByRole("dialog")

      const modal = messagesByLocale[locale] as {
        contact: { modal: { whatsappMessage: string; emailSubject: string } }
      }
      const wa = screen.getByRole("link", { name: /\+34 605 497 639/i })
      expect(wa.getAttribute("href")).toContain(encodeURIComponent(modal.contact.modal.whatsappMessage))
      const mail = screen.getByRole("link", { name: /hello@evolve2digital\.com/i })
      expect(mail.getAttribute("href")).toContain(encodeURIComponent(modal.contact.modal.emailSubject))
    })
  })
})
