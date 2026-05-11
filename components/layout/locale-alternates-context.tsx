"use client"

import { createContext, useContext, type ReactNode } from "react"

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

export function useLocaleAlternates(): LocaleAlternates | null {
  return useContext(LocaleAlternatesContext)
}
