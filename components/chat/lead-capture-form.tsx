"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"

import { LeadForm } from "@/components/leads/lead-form"
import { LeadSuccess } from "@/components/leads/lead-success"
import type { LeadLocale } from "@/lib/leads/lead-form-model"

export interface LeadCaptureFormProps {
  open: boolean; onClose: () => void; sessionId: string
  locale: LeadLocale; prefillIntent?: string
}

// Chat-panel host for the shared lead form: its own overlay (it must sit
// above the chat panel) plus the switch to the follow-up view on success.
export function LeadCaptureForm(props: LeadCaptureFormProps): JSX.Element | null {
  const { open, onClose } = props
  const t = useTranslations("chat.leadForm")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubmitted(false)
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!props.open) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={t("title")}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b bg-[#05b4ba] px-4 py-3 text-white">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{t("title")}</h2>
            <p className="truncate text-xs text-white/80">{t("subtitle")}</p>
          </div>
          <button type="button" onClick={props.onClose} aria-label={t("close")}
            className="rounded-full p-1.5 text-white/90 hover:bg-white/15">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
          {submitted ? (
            <LeadSuccess onClose={props.onClose} />
          ) : (
            <LeadForm locale={props.locale} formLocation="chat" sessionId={props.sessionId}
              prefillIntent={props.prefillIntent} onSuccess={() => setSubmitted(true)} />
          )}
        </div>
      </div>
    </div>
  )
}
