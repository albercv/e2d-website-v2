"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"

// Se renderiza dentro del layout de [locale], que ya aporta <html>, los
// mensajes y el idioma: aquí no hay documento propio. Así un 404 provocado por
// notFound() (p. ej. /en/alberto-carrasco, página solo en español) sale en el
// idioma de la URL. El 404 de URLs sin locale es app/not-found.tsx.
export default function LocaleNotFound() {
  const t = useTranslations("notFound")
  const locale = useLocale()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t("code")}</p>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <Link
        href={`/${locale}`}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {t("home")}
      </Link>
    </main>
  )
}
