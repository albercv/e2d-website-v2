"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics/track"
import {
  buildLeadPayload, emptyLeadFormState, postLead, toSubmittedLead, validateLeadForm,
  type LeadFormError, type LeadFormLocation, type LeadFormState, type LeadLocale, type SubmittedLead,
} from "@/lib/leads/lead-form-model"
import { LeadFormFields } from "./lead-form-fields"
import { LeadServerFallback } from "./lead-server-fallback"

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "validation"; field: LeadFormError }
  | { kind: "server" }

export interface LeadFormProps {
  locale: LeadLocale
  formLocation: LeadFormLocation
  // Chat session to attach the transcript to; absent in the contact modal.
  sessionId?: string | null
  prefillIntent?: string
  onSuccess: (lead: SubmittedLead) => void
}

// The form itself, host-agnostic: the chat dialog and the contact modal
// wrap it with their own chrome and switch to LeadSuccess on onSuccess.
export function LeadForm(props: LeadFormProps): JSX.Element {
  const t = useTranslations("chat.leadForm")
  const [state, setState] = useState<LeadFormState>(() => emptyLeadFormState(props.prefillIntent))
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => firstInputRef.current?.focus(), 30)
    return () => clearTimeout(timer)
  }, [])

  const update = useCallback(<K extends keyof LeadFormState>(key: K, value: LeadFormState[K]): void => {
    setState((s) => ({ ...s, [key]: value }))
  }, [])

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    const field = validateLeadForm(state)
    if (field) {
      setStatus({ kind: "validation", field }); return
    }
    setStatus({ kind: "submitting" })
    const result = await postLead(buildLeadPayload(state, { locale: props.locale, sessionId: props.sessionId ?? undefined }))
    if (!result.ok) {
      setStatus({ kind: "server" }); return
    }
    // Primary conversion. eventId matches the server mirror (keyed by leadId)
    // so OpenAI dedupes the browser and server copies.
    track(
      "generate_lead",
      { form_location: props.formLocation, intent: state.intent || "", locale: props.locale },
      { eventId: `lead_${result.leadId}` },
    )
    props.onSuccess(toSubmittedLead(result.leadId, state))
  }, [props, state])

  const error = status.kind === "validation" ? status.field : null

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="lead-form">
      <LeadFormFields state={state} update={update} error={error} firstInputRef={firstInputRef} t={t} />
      <Button type="submit" disabled={status.kind === "submitting"}
        className="w-full bg-[#05b4ba] text-white hover:bg-[#05b4ba]/90">
        {status.kind === "submitting" ? t("sending") : t("submit")}
      </Button>
      {status.kind === "server" && <LeadServerFallback t={t} locale={props.locale} />}
    </form>
  )
}
