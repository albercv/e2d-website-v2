"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ChangeEvent, FormEvent, RefObject } from "react"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

// Inline fallback constants — duplicated from chat-panel.tsx on purpose. The
// follow-up task that consolidates contact channels will collapse both copies
// into a shared module. Keeping them inline avoids coupling components today.
const SUPPORT_EMAIL = "hello@evolve2digital.com"
const WHATSAPP_HREF = `https://wa.me/34605497639?text=${encodeURIComponent("Hola Alberto, vengo de tu web y me gustaría hablar sobre un proyecto.")}`
const MAIL_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Consulta desde la web E2D")}`

// Same intent vocabulary the lead-extractor uses, so the queue surfaces a
// single canonical set of values.
const INTENT_OPTIONS = ["voicebot", "chatbot", "automation", "web", "crm", "budget", "other"] as const
type IntentOption = (typeof INTENT_OPTIONS)[number]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "validation"; field: "email" | "consent" }
  | { kind: "server" }

interface FormState {
  name: string; email: string; phone: string; company: string
  intent: IntentOption | ""; message: string; consent: boolean
}

function emptyState(prefillIntent?: string): FormState {
  const intent = (INTENT_OPTIONS as readonly string[]).includes(prefillIntent ?? "")
    ? (prefillIntent as IntentOption) : ""
  return { name: "", email: "", phone: "", company: "", intent, message: "", consent: false }
}

function buildPayload(s: FormState, sessionId: string, locale: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    sessionId, email: s.email.trim().toLowerCase(), consent: true, locale,
  }
  if (s.name.trim()) payload.name = s.name.trim()
  if (s.phone.trim()) payload.phone = s.phone.trim()
  if (s.company.trim()) payload.company = s.company.trim()
  if (s.intent) payload.intent = s.intent
  if (s.message.trim()) payload.message = s.message.trim()
  return payload
}

async function postLead(payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch("/api/chat/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (err) {
    console.error("[lead-capture] network error:", (err as Error).message)
    return false
  }
}

export interface LeadCaptureFormProps {
  open: boolean; onClose: () => void; sessionId: string
  locale: "es" | "en" | "it"; prefillIntent?: string
}

type T = ReturnType<typeof useTranslations>

function ServerFallback({ t }: { t: T }): JSX.Element {
  return (
    <div className="mt-1 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
      <p><strong>{t("errorTitle")}</strong>. {t("errorBody")}</p>
      <div className="flex flex-wrap gap-2">
        <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2 py-1 text-white hover:bg-[#25D366]/90">
          WhatsApp
        </a>
        <a href={MAIL_HREF}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-foreground hover:bg-accent">
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  )
}

interface FieldsProps {
  state: FormState
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void
  status: Status
  firstInputRef: RefObject<HTMLInputElement>
  t: T
}

function Fields(p: FieldsProps): JSX.Element {
  const { state, update, status, t } = p
  const emailInvalid = status.kind === "validation" && status.field === "email"
  const consentInvalid = status.kind === "validation" && status.field === "consent"
  return (
    <>
      <Input ref={p.firstInputRef} placeholder={t("name")} value={state.name} autoComplete="name"
        onChange={(e: ChangeEvent<HTMLInputElement>) => update("name", e.target.value)} />
      <Input type="email" placeholder={t("email")} value={state.email} required autoComplete="email"
        aria-invalid={emailInvalid || undefined}
        onChange={(e: ChangeEvent<HTMLInputElement>) => update("email", e.target.value)} />
      {emailInvalid && (
        <p className="text-xs text-destructive">
          {state.email.trim().length === 0 ? t("requiredEmail") : t("invalidEmail")}
        </p>
      )}
      <Input type="tel" placeholder={t("phone")} value={state.phone} autoComplete="tel"
        onChange={(e: ChangeEvent<HTMLInputElement>) => update("phone", e.target.value)} />
      <Input placeholder={t("company")} value={state.company} autoComplete="organization"
        onChange={(e: ChangeEvent<HTMLInputElement>) => update("company", e.target.value)} />
      <select value={state.intent} aria-label={t("intent")}
        onChange={(e) => update("intent", e.target.value as IntentOption | "")}
        className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-[#05b4ba]">
        <option value="">{t("intent")}</option>
        {INTENT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{t(`intentOptions.${opt}`)}</option>
        ))}
      </select>
      <Textarea placeholder={t("message")} value={state.message} rows={3}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => update("message", e.target.value)} />
      <label className="flex items-start gap-2 text-xs leading-snug">
        <Checkbox checked={state.consent} aria-invalid={consentInvalid || undefined}
          onCheckedChange={(v) => update("consent", v === true)} />
        <span>{t("consent")}</span>
      </label>
      {consentInvalid && <p className="text-xs text-destructive">{t("requiredConsent")}</p>}
    </>
  )
}

export function LeadCaptureForm(props: LeadCaptureFormProps): JSX.Element | null {
  const t = useTranslations("chat.leadForm")
  const [state, setState] = useState<FormState>(() => emptyState(props.prefillIntent))
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!props.open) return
    setState(emptyState(props.prefillIntent))
    setStatus({ kind: "idle" })
    const timer = setTimeout(() => firstInputRef.current?.focus(), 30)
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") props.onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey) }
  }, [props.open, props.prefillIntent, props.onClose])

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setState((s) => ({ ...s, [key]: value }))
  }, [])

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    const email = state.email.trim()
    if (email.length === 0 || !EMAIL_RE.test(email)) {
      setStatus({ kind: "validation", field: "email" }); return
    }
    if (state.consent !== true) {
      setStatus({ kind: "validation", field: "consent" }); return
    }
    setStatus({ kind: "submitting" })
    const ok = await postLead(buildPayload(state, props.sessionId, props.locale))
    setStatus(ok ? { kind: "success" } : { kind: "server" })
  }, [props.sessionId, props.locale, state])

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
          {status.kind === "success" ? (
            <div className="space-y-3 text-center">
              <h3 className="text-base font-semibold">{t("successTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("successBody")}</p>
              <Button onClick={props.onClose} className="w-full bg-[#05b4ba] text-white hover:bg-[#05b4ba]/90">
                {t("close")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Fields state={state} update={update} status={status} firstInputRef={firstInputRef} t={t} />
              <Button type="submit" disabled={status.kind === "submitting"}
                className="w-full bg-[#05b4ba] text-white hover:bg-[#05b4ba]/90">
                {status.kind === "submitting" ? t("sending") : t("submit")}
              </Button>
              {status.kind === "server" && <ServerFallback t={t} />}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
