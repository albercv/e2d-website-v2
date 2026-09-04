"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics/track"
import { getMailHref } from "@/lib/contact/email"
import { getWhatsAppHref } from "@/lib/contact/whatsapp"
import { openLeadChannelTab, type LeadChannel, type LeadChannelHandle } from "@/lib/leads/lead-channel"
import { buildFormMessage } from "@/lib/leads/lead-form-message"
import {
  buildLeadPayload, emptyLeadFormState, postLead, toSubmittedLead, validateLeadForm,
  type LeadFormError, type LeadFormLocation, type LeadFormState, type LeadLocale, type SubmittedLead,
} from "@/lib/leads/lead-form-model"
import { LeadFormFields, type LeadFormT } from "./lead-form-fields"
import { LeadServerFallback } from "./lead-server-fallback"

type Status =
  | { kind: "idle" }
  | { kind: "submitting"; channel: LeadChannel }
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

// Hands the already-open channel handle its destination href, built from the
// confirmed lead. WhatsApp reuses the popup-safe tab; email just navigates.
function deliverToChannel(channel: LeadChannel, lead: SubmittedLead, t: LeadFormT, handle: LeadChannelHandle): void {
  const message = buildFormMessage(lead, t)
  if (channel === "whatsapp") {
    const href = getWhatsAppHref(message)
    if (href) handle.deliver(href)
    return
  }
  handle.deliver(getMailHref(t("followUpSubject"), message))
}

interface SubmitChannelArgs {
  channel: LeadChannel
  state: LeadFormState
  props: LeadFormProps
  t: LeadFormT
  setStatus: (status: Status) => void
}

// One channel's full flow: validate -> open the tab synchronously (a no-op
// for email, popup-safety for WhatsApp) -> POST the lead -> track -> deliver
// the prefilled message -> hand the confirmed lead to the host.
async function submitLeadViaChannel(args: SubmitChannelArgs): Promise<void> {
  const { channel, state, props, t, setStatus } = args
  const field = validateLeadForm(state)
  if (field) {
    setStatus({ kind: "validation", field })
    return
  }
  const handle = openLeadChannelTab(channel)
  setStatus({ kind: "submitting", channel })
  const result = await postLead(buildLeadPayload(state, { locale: props.locale, sessionId: props.sessionId ?? undefined }))
  if (!result.ok) {
    handle.abort()
    setStatus({ kind: "server" })
    return
  }
  // Primary conversion. eventId matches the server mirror (keyed by leadId)
  // so OpenAI dedupes the browser and server copies.
  track(
    "generate_lead",
    { form_location: props.formLocation, intent: state.intent || "", locale: props.locale, channel },
    { eventId: `lead_${result.leadId}` },
  )
  const lead = toSubmittedLead(result.leadId, state)
  deliverToChannel(channel, lead, t, handle)
  props.onSuccess(lead)
}

interface LeadFormButtonsProps {
  whatsappAvailable: boolean
  submitting: boolean
  submittingChannel: LeadChannel | null
  onSubmit: (channel: LeadChannel) => void
  t: LeadFormT
}

// Two destinations instead of one generic submit: the visitor picks the
// channel up front, and the lead is captured server-side either way.
function LeadFormButtons(p: LeadFormButtonsProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {p.whatsappAvailable && (
        <Button type="button" disabled={p.submitting} onClick={() => p.onSubmit("whatsapp")}
          className="w-full bg-[#25D366] text-white hover:bg-[#25D366]/90">
          {p.submittingChannel === "whatsapp" ? p.t("sending") : p.t("sendWhatsApp")}
        </Button>
      )}
      <Button type="button" variant="outline" disabled={p.submitting} onClick={() => p.onSubmit("email")}
        className="w-full">
        {p.submittingChannel === "email" ? p.t("sending") : p.t("sendEmail")}
      </Button>
    </div>
  )
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

  const submitViaChannel = useCallback(
    (channel: LeadChannel) => submitLeadViaChannel({ channel, state, props, t, setStatus }),
    [props, state, t],
  )

  const error = status.kind === "validation" ? status.field : null
  const submitting = status.kind === "submitting"
  const submittingChannel = status.kind === "submitting" ? status.channel : null
  const whatsappAvailable = getWhatsAppHref() !== null

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-3" data-testid="lead-form">
      <LeadFormFields state={state} update={update} error={error} firstInputRef={firstInputRef} t={t} />
      <LeadFormButtons whatsappAvailable={whatsappAvailable} submitting={submitting} submittingChannel={submittingChannel}
        onSubmit={(channel) => void submitViaChannel(channel)} t={t} />
      {status.kind === "server" && <LeadServerFallback t={t} locale={props.locale} />}
    </form>
  )
}
