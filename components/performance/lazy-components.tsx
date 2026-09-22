"use client"

import dynamic from "next/dynamic"
import { SectionFallback } from "./loading-fallbacks"
import { useLocale } from "next-intl"

// Lazy load complex sections
export const ProjectsSectionLazy = dynamic(
  () => import("@/components/sections/projects-section").then((mod) => ({ default: mod.ProjectsSection })),
  {
    loading: () => <SectionFallback message="Cargando proyectos..." />,
  },
)

export const AboutSectionLazy = dynamic(
  () => import("@/components/sections/about-section").then((mod) => ({ default: mod.AboutSection })),
  {
    loading: () => <SectionFallback message="Cargando información..." />,
  },
)

export const ProcessSectionLazy = dynamic(
  () => import("@/components/sections/process-section").then((mod) => ({ default: mod.ProcessSection })),
  {
    loading: () => <SectionFallback message="Cargando proceso..." />,
  },
)

// Lazy load FaqSection
export const FaqSectionLazy = dynamic(
  () => import("@/components/sections/faq-section").then((mod) => ({ default: mod.FaqSection })),
  {
    loading: () => <SectionFallback message="..." />,
  },
)

// New: Lazy load AdaptSection
export const AdaptSectionLazy = dynamic(
  () => import("@/components/sections/adapt-section").then((mod) => ({ default: mod.AdaptSection })),
  {
    loading: () => <AdaptLoadingFallback />,
   },
)

// Locale-aware fallback for Adapt section
const AdaptLoadingFallback = () => {
  const locale = useLocale()
  const messages = {
    es: "Cargando método A.D.A.P.T...",
    en: "Loading A.D.A.P.T. Method...",
    it: "Caricamento metodo A.D.A.P.T...",
  }
  const msg = messages[(locale as keyof typeof messages) ?? "es"] ?? messages.es
  return <SectionFallback message={msg} />
}
