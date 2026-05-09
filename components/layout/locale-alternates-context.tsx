"use client"

import { createContext, useContext, type ReactNode } from "react"

/**
 * Mapa `{ locale: relativeUrl }` que las páginas con slugs traducidos
 * exponen al árbol cliente para que componentes globales (LanguageSwitcher,
 * footer links, hreflang dinámicos) sepan a qué URL llevar al visitante en
 * otro idioma. Si una página NO traduce su URL (la mayoría — ej: home,
 * servicios, legal), el provider simplemente no se monta y los consumers
 * caen a la lógica por defecto.
 */
export type LocaleAlternates = Partial<Record<string, string>>

const LocaleAlternatesContext = createContext<LocaleAlternates | null>(null)

export function LocaleAlternatesProvider({
  alternates,
  children,
}: {
  alternates: LocaleAlternates
  children: ReactNode
}) {
  return (
    <LocaleAlternatesContext.Provider value={alternates}>
      {children}
    </LocaleAlternatesContext.Provider>
  )
}

/**
 * Devuelve el mapa expuesto por el provider más cercano, o `null` si la
 * página actual no aporta alternates. Quien lo consuma debe tratar el null
 * como "no tengo info, usa fallback".
 */
export function useLocaleAlternates(): LocaleAlternates | null {
  return useContext(LocaleAlternatesContext)
}
