"use client"

import type { ChangeEvent, RefObject } from "react"
import type { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { INTENT_OPTIONS, type IntentOption, type LeadFormError, type LeadFormState } from "@/lib/leads/lead-form-model"

export type LeadFormT = ReturnType<typeof useTranslations>

interface LeadFormFieldsProps {
  state: LeadFormState
  update: <K extends keyof LeadFormState>(key: K, value: LeadFormState[K]) => void
  error: LeadFormError | null
  firstInputRef: RefObject<HTMLInputElement>
  t: LeadFormT
}

export function LeadFormFields(p: LeadFormFieldsProps): JSX.Element {
  const { state, update, error, t } = p
  const emailInvalid = error === "email"
  const consentInvalid = error === "consent"
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
