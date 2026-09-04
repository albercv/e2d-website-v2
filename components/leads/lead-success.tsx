"use client"

import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

export interface LeadSuccessProps {
  onClose: () => void
}

// Plain confirmation: the lead is already saved server-side and LeadForm
// already opened the visitor's chosen channel with the prefilled message
// before switching to this view, so there is nothing left to choose here.
export function LeadSuccess({ onClose }: LeadSuccessProps): JSX.Element {
  const t = useTranslations("chat.leadForm")
  return (
    <div className="space-y-3 text-center">
      <h3 className="text-base font-semibold">{t("successTitle")}</h3>
      <p className="text-sm text-muted-foreground">{t("successFollowUp")}</p>
      <Button variant="ghost" onClick={onClose} className="w-full">
        {t("close")}
      </Button>
    </div>
  )
}
