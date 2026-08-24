"use client"

import { useEffect } from "react"

// The root layout can't know the [locale] param without opting the whole app
// into dynamic rendering, so it ships a static lang="es" and this component
// corrects the attribute for en/it once hydrated.
export function LangAttribute({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return null
}
